// Vantaris · razorpay-webhook
// Receives Razorpay events and keeps subscriptions and payments in sync.
// This is the source of truth for renewals, failed charges and cancellations.
//
// Razorpay Dashboard → Settings → Webhooks → Add:
//   URL:     https://<project-ref>.supabase.co/functions/v1/razorpay-webhook
//   Secret:  a long random string (same value as RAZORPAY_WEBHOOK_SECRET below)
//   Events:  subscription.authenticated, subscription.activated, subscription.charged,
//            subscription.pending, subscription.halted, subscription.cancelled,
//            subscription.completed, subscription.paused, subscription.resumed,
//            subscription.updated, payment.failed, payment.captured
//
// Secrets: RAZORPAY_WEBHOOK_SECRET, RAZORPAY_KEY_ID (for test/live mode).
// "Verify JWT" must be OFF for this function: Razorpay can't sign in.
// Every request is instead authenticated by its HMAC signature.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const MAX_BODY_BYTES = 1_000_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function secret(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing secret ${name}`);
  return value;
}

function serviceKey(): string {
  const json = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (json) {
    try {
      const parsed = JSON.parse(json);
      if (typeof parsed?.default === 'string') return parsed.default;
    } catch { /* fall through */ }
  }
  return secret('SUPABASE_SERVICE_ROLE_KEY');
}

const encoder = new TextEncoder();

/** Constant-time HMAC-SHA256 check over the exact bytes received. */
export async function verifyHmacSha256(secretKey: string, message: string | ArrayBuffer, signatureHex: string): Promise<boolean> {
  if (!secretKey || !/^[0-9a-f]{64}$/i.test(signatureHex)) return false;
  const signature = new Uint8Array(32);
  for (let i = 0; i < 32; i++) signature[i] = parseInt(signatureHex.slice(i * 2, i * 2 + 2), 16);
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const data = typeof message === 'string' ? encoder.encode(message) : message;
  return crypto.subtle.verify('HMAC', key, signature, data);
}

function respond(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

type RazorpayEvent = {
  event?: string;
  created_at?: number;
  payload?: {
    subscription?: { entity?: Record<string, unknown> & { id?: string; notes?: Record<string, unknown> } };
    payment?: { entity?: Record<string, unknown> & { id?: string } };
  };
};

/** Errors caused by the event's content: retrying won't help, so don't make Razorpay retry. */
class PermanentError extends Error {}

function isPermanentDbError(error: { code?: string } | null): boolean {
  const code = error?.code ?? '';
  return code.startsWith('22') || code.startsWith('P0') || code === '23503';
}

async function rpc(db: SupabaseClient, fn: string, args: Record<string, unknown>) {
  const { error } = await db.rpc(fn, args);
  if (error) {
    if (isPermanentDbError(error)) throw new PermanentError(`${fn}: ${error.message}`);
    throw new Error(`${fn}: ${error.message}`);
  }
}

export async function applyEvent(db: SupabaseClient, evt: RazorpayEvent, livemode: boolean): Promise<string> {
  const name = evt.event ?? '';
  const eventAt = typeof evt.created_at === 'number' ? new Date(evt.created_at * 1000).toISOString() : null;
  const sub = evt.payload?.subscription?.entity;
  const pay = evt.payload?.payment?.entity;

  if (name.startsWith('subscription.') && sub?.id) {
    const { data: known, error } = await db.from('subscriptions').select('id')
      .eq('razorpay_subscription_id', sub.id).maybeSingle();
    if (error) throw new Error(error.message);

    let user: string | null = null;
    let plan: string | null = null;
    if (!known) {
      // Not created by our checkout yet (or created elsewhere). Accept it only
      // if it carries our notes and the player still exists.
      const notes = sub.notes ?? {};
      if (notes.app !== 'vantaris' || typeof notes.user_id !== 'string' || !UUID.test(notes.user_id) ||
          typeof notes.plan !== 'string') {
        return 'ignored: subscription not created by Vantaris';
      }
      const { data: profile } = await db.from('profiles').select('id').eq('id', notes.user_id).maybeSingle();
      if (!profile) return 'ignored: player no longer exists';
      user = notes.user_id;
      plan = notes.plan;
    }

    await rpc(db, 'apply_razorpay_subscription', {
      p_entity: sub, p_livemode: livemode, p_event_at: eventAt, p_user: user, p_plan_id: plan,
    });
    if (pay?.id) {
      await rpc(db, 'apply_razorpay_payment', {
        p_entity: pay, p_livemode: livemode, p_razorpay_subscription_id: sub.id,
      });
    }
    return `applied ${name}`;
  }

  if (name.startsWith('payment.') && pay?.id) {
    // Only update payments we already know about (subscription payments
    // arrive with their subscription event).
    const { data: known, error } = await db.from('payments').select('razorpay_subscription_id')
      .eq('razorpay_payment_id', pay.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!known) return 'ignored: unknown payment';
    await rpc(db, 'apply_razorpay_payment', {
      p_entity: pay, p_livemode: livemode, p_razorpay_subscription_id: known.razorpay_subscription_id,
    });
    return `applied ${name}`;
  }

  return `ignored: ${name || 'no event name'}`;
}

export async function handle(req: Request, db?: SupabaseClient): Promise<Response> {
  if (req.method !== 'POST') return respond(405, { error: 'METHOD_NOT_ALLOWED' });

  const length = Number(req.headers.get('content-length') ?? '0');
  if (length > MAX_BODY_BYTES) return respond(413, { error: 'TOO_LARGE' });

  const bytes = await req.arrayBuffer();
  if (bytes.byteLength > MAX_BODY_BYTES) return respond(413, { error: 'TOO_LARGE' });

  // 1. Authenticate: the signature must match the raw body exactly.
  let webhookSecret: string;
  try {
    webhookSecret = secret('RAZORPAY_WEBHOOK_SECRET');
  } catch (err) {
    console.error(String(err));
    return respond(500, { error: 'SERVER_MISCONFIGURED' });
  }
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  if (!(await verifyHmacSha256(webhookSecret, bytes, signature))) {
    console.warn('webhook rejected: bad signature');
    return respond(401, { error: 'INVALID_SIGNATURE' });
  }

  let evt: RazorpayEvent;
  try {
    evt = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return respond(400, { error: 'BAD_JSON' });
  }

  const livemode = (Deno.env.get('RAZORPAY_KEY_ID') ?? '').startsWith('rzp_live_');
  db ??= createClient(secret('SUPABASE_URL'), serviceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 2. Idempotency: Razorpay may deliver the same event more than once.
  const headerId = req.headers.get('x-razorpay-event-id');
  const eventId = headerId && /^[A-Za-z0-9_.:-]{1,100}$/.test(headerId)
    ? headerId
    : `${evt.event}:${evt.created_at}:${evt.payload?.subscription?.entity?.id ?? evt.payload?.payment?.entity?.id ?? 'none'}`;

  const { error: insertError } = await db.from('webhook_events')
    .insert({ id: eventId, event: evt.event ?? 'unknown', payload: evt });
  if (insertError) {
    if (insertError.code !== '23505') {
      console.error('webhook store failed', insertError.message);
      return respond(500, { error: 'STORE_FAILED' });
    }
    const { data: seen } = await db.from('webhook_events').select('processed_at, attempts').eq('id', eventId).maybeSingle();
    if (seen?.processed_at) return respond(200, { ok: true, duplicate: true });
    await db.from('webhook_events').update({ attempts: (seen?.attempts ?? 1) + 1 }).eq('id', eventId);
  }

  // 3. Apply. Transient failures return 500 so Razorpay retries; bad data is
  //    recorded and acknowledged so the webhook doesn't get disabled.
  try {
    const outcome = await applyEvent(db, evt, livemode);
    await db.from('webhook_events').update({ processed_at: new Date().toISOString(), error: null }).eq('id', eventId);
    return respond(200, { ok: true, outcome });
  } catch (err) {
    const message = String(err instanceof Error ? err.message : err).slice(0, 500);
    if (err instanceof PermanentError) {
      console.error('webhook event rejected', eventId, message);
      await db.from('webhook_events').update({ processed_at: new Date().toISOString(), error: message }).eq('id', eventId);
      return respond(200, { ok: false, error: 'REJECTED' });
    }
    console.error('webhook processing failed', eventId, message);
    await db.from('webhook_events').update({ error: message }).eq('id', eventId);
    return respond(500, { error: 'PROCESSING_FAILED' });
  }
}

if (!Deno.env.get('VANTARIS_TEST')) Deno.serve((req) => handle(req));
