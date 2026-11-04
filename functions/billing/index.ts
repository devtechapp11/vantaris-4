// Vantaris · billing
// Razorpay subscriptions: start a checkout, verify a payment, cancel, delete account.
//
// POST JSON with an "action":
//   { action: "create-subscription", plan_id: "pro_monthly" }
//   { action: "verify-payment", razorpay_payment_id, razorpay_subscription_id, razorpay_signature }
//   { action: "cancel-subscription" }
//   { action: "delete-account", confirm: "DELETE" }
// Every request must carry the player's session: Authorization: Bearer <access token>
// (supabase.functions.invoke adds it automatically).
//
// Secrets (Supabase → Edge Functions → Secrets):
//   RAZORPAY_KEY_ID       rzp_test_… or rzp_live_…   (the mode follows this key)
//   RAZORPAY_KEY_SECRET   the matching secret — never put this in the frontend
//   ALLOWED_ORIGINS       https://vantaris.finance,https://www.vantaris.finance,http://localhost:5173
// SUPABASE_URL and the service key are provided by Supabase automatically.

import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

// ---------- config ----------------------------------------------------------
const RAZORPAY_API = 'https://api.razorpay.com/v1';
const MAX_BODY_BYTES = 16 * 1024;
const CHECKOUTS_PER_HOUR = 10;

function secret(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new HttpError(500, 'SERVER_MISCONFIGURED', `Missing secret ${name}`);
  return value;
}

function serviceKey(): string {
  const json = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (json) {
    try {
      const parsed = JSON.parse(json);
      if (typeof parsed?.default === 'string') return parsed.default;
    } catch { /* fall through to legacy key */ }
  }
  return secret('SUPABASE_SERVICE_ROLE_KEY');
}

function razorpayKeys() {
  const keyId = secret('RAZORPAY_KEY_ID');
  const keySecret = secret('RAZORPAY_KEY_SECRET');
  if (!/^rzp_(test|live)_[A-Za-z0-9]+$/.test(keyId)) {
    throw new HttpError(500, 'SERVER_MISCONFIGURED', 'RAZORPAY_KEY_ID has an unexpected format');
  }
  return { keyId, keySecret, live: keyId.startsWith('rzp_live_') };
}

// ---------- http helpers ----------------------------------------------------
export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

function allowedOrigin(req: Request): string | null {
  const origin = req.headers.get('origin');
  if (!origin) return null;
  const list = (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173')
    .split(',').map((s) => s.trim()).filter(Boolean);
  return list.includes(origin) ? origin : null;
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = allowedOrigin(req);
  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    throw new HttpError(413, 'TOO_LARGE', 'Request body is too large');
  }
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch { /* handled below */ }
  throw new HttpError(400, 'BAD_REQUEST', 'Body must be a JSON object');
}

function str(body: Record<string, unknown>, key: string, pattern: RegExp): string {
  const value = body[key];
  if (typeof value !== 'string' || !pattern.test(value)) {
    throw new HttpError(400, 'BAD_REQUEST', `Invalid ${key}`);
  }
  return value;
}

// ---------- crypto ----------------------------------------------------------
const encoder = new TextEncoder();

function hexToBytes(hex: string) {
  if (!/^[0-9a-f]{64}$/i.test(hex)) return null;
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Constant-time check that `signatureHex` is HMAC-SHA256(message, secret). */
export async function verifyHmacSha256(secretKey: string, message: string, signatureHex: string): Promise<boolean> {
  const signature = hexToBytes(signatureHex);
  if (!signature || !secretKey) return false;
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  return crypto.subtle.verify('HMAC', key, signature, encoder.encode(message));
}

// ---------- razorpay --------------------------------------------------------
type RazorpayKeys = ReturnType<typeof razorpayKeys>;

async function razorpay<T = Record<string, unknown>>(
  keys: RazorpayKeys, path: string, init: { method?: string; body?: unknown } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${RAZORPAY_API}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Authorization: `Basic ${btoa(`${keys.keyId}:${keys.keySecret}`)}`,
        'Content-Type': 'application/json',
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(12_000),
    });
  } catch (err) {
    console.error('razorpay network error', path, String(err));
    throw new HttpError(502, 'PAYMENT_PROVIDER_UNAVAILABLE', 'Razorpay did not respond. Try again in a moment.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const description = data?.error?.description ?? `Razorpay error ${res.status}`;
    console.error('razorpay error', path, res.status, data?.error?.code, description);
    throw new HttpError(res.status >= 500 ? 502 : 400, 'PAYMENT_PROVIDER_ERROR', description);
  }
  return data as T;
}

type PlanRow = {
  id: string; tier: string; interval: 'monthly' | 'yearly'; amount: number; currency: string;
  razorpay_plan_id_test: string | null; razorpay_plan_id_live: string | null; active: boolean;
};

const TIER_NAMES: Record<string, string> = { core: 'Core', pro: 'Pro', elite: 'Elite' };

/** Returns the Razorpay plan for this price, creating it if missing or if the price changed. */
async function ensureRazorpayPlan(db: SupabaseClient, keys: RazorpayKeys, plan: PlanRow): Promise<string> {
  const column = keys.live ? 'razorpay_plan_id_live' : 'razorpay_plan_id_test';
  const current = plan[column];

  if (current) {
    try {
      const existing = await razorpay<{ period: string; interval: number; item: { amount: number; currency: string } }>(
        keys, `/plans/${encodeURIComponent(current)}`);
      if (existing.period === plan.interval && existing.interval === 1 &&
          existing.item?.amount === plan.amount && existing.item?.currency === plan.currency) {
        return current;
      }
      console.log('plan price changed, creating a new Razorpay plan', plan.id);
    } catch (err) {
      if (!(err instanceof HttpError) || err.status !== 400) throw err;
      console.log('stored Razorpay plan not found, creating a new one', plan.id);
    }
  }

  const tierName = TIER_NAMES[plan.tier] ?? plan.tier;
  const created = await razorpay<{ id: string }>(keys, '/plans', {
    method: 'POST',
    body: {
      period: plan.interval,
      interval: 1,
      item: {
        name: `Vantaris ${tierName} (${plan.interval})`,
        amount: plan.amount,
        currency: plan.currency,
        description: `Vantaris ${tierName}, billed ${plan.interval}`,
      },
      notes: { plan: plan.id, app: 'vantaris' },
    },
  });

  // Save it unless another request saved one first (then use theirs).
  let update = db.from('plans').update({ [column]: created.id }).eq('id', plan.id);
  update = current ? update.eq(column, current) : update.is(column, null);
  const { data: saved, error } = await update.select('id').maybeSingle();
  if (error) throw error;
  if (saved) return created.id;

  const { data: again, error: rereadError } = await db.from('plans').select(column).eq('id', plan.id).single();
  if (rereadError) throw rereadError;
  return (again as Record<string, string>)[column];
}

// ---------- actions -----------------------------------------------------------
const LIVE_ACCESS = new Set(['authenticated', 'active', 'pending']);

type SubscriptionRow = {
  id: string; user_id: string | null; plan_id: string; tier: string; status: string;
  razorpay_subscription_id: string; livemode: boolean; created_at: string;
};

async function liveSubscriptions(db: SupabaseClient, userId: string): Promise<SubscriptionRow[]> {
  const { data, error } = await db.rpc('live_subscriptions', { p_user: userId });
  if (error) throw error;
  return (data ?? []) as SubscriptionRow[];
}

async function createSubscription(db: SupabaseClient, user: User, body: Record<string, unknown>) {
  const keys = razorpayKeys();
  const planId = str(body, 'plan_id', /^[a-z_]{3,40}$/);

  const { data: plan, error: planError } = await db.from('plans').select('*').eq('id', planId).eq('active', true).maybeSingle();
  if (planError) throw planError;
  if (!plan) throw new HttpError(404, 'PLAN_NOT_FOUND', 'That plan is not available');

  const live = await liveSubscriptions(db, user.id);
  if (live.some((s) => LIVE_ACCESS.has(s.status))) {
    throw new HttpError(409, 'ALREADY_SUBSCRIBED', 'You already have an active plan. Cancel it first to switch plans.');
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await db.from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).gte('created_at', hourAgo);
  if (countError) throw countError;
  if ((count ?? 0) >= CHECKOUTS_PER_HOUR) {
    throw new HttpError(429, 'RATE_LIMITED', 'Too many checkout attempts. Try again in an hour.');
  }

  const { data: profile } = await db.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
  const checkout = (subscriptionId: string) => ({
    key_id: keys.keyId,
    subscription_id: subscriptionId,
    livemode: keys.live,
    plan: { id: plan.id, tier: plan.tier, interval: plan.interval, amount: plan.amount, currency: plan.currency },
    prefill: { email: user.email ?? '', name: profile?.display_name ?? '' },
  });

  // Reuse an unpaid checkout for the same plan from the last 30 minutes,
  // so a double tap or a second tab never creates two subscriptions.
  const halfHourAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: recent } = await db.from('subscriptions').select('razorpay_subscription_id')
    .eq('user_id', user.id).eq('plan_id', plan.id).eq('status', 'created').eq('livemode', keys.live)
    .gte('created_at', halfHourAgo).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (recent) {
    const fresh = await razorpay<{ status: string }>(keys, `/subscriptions/${recent.razorpay_subscription_id}`);
    if (fresh.status === 'created') return checkout(recent.razorpay_subscription_id);
  }

  const razorpayPlanId = await ensureRazorpayPlan(db, keys, plan as PlanRow);
  const subscription = await razorpay<Record<string, unknown> & { id: string }>(keys, '/subscriptions', {
    method: 'POST',
    body: {
      plan_id: razorpayPlanId,
      total_count: plan.interval === 'yearly' ? 10 : 120,
      quantity: 1,
      customer_notify: true,
      notes: { app: 'vantaris', user_id: user.id, plan: plan.id },
    },
  });

  const { error: applyError } = await db.rpc('apply_razorpay_subscription', {
    p_entity: subscription, p_livemode: keys.live, p_event_at: null, p_user: user.id, p_plan_id: plan.id,
  });
  if (applyError) throw applyError;

  return checkout(subscription.id);
}

async function verifyPayment(db: SupabaseClient, user: User, body: Record<string, unknown>) {
  const keys = razorpayKeys();
  const paymentId = str(body, 'razorpay_payment_id', /^pay_[A-Za-z0-9]{6,40}$/);
  const subscriptionId = str(body, 'razorpay_subscription_id', /^sub_[A-Za-z0-9]{6,40}$/);
  const signature = str(body, 'razorpay_signature', /^[0-9a-fA-F]{64}$/);

  // The subscription must be one we created for this player.
  const { data: row, error } = await db.from('subscriptions').select('user_id, livemode')
    .eq('razorpay_subscription_id', subscriptionId).maybeSingle();
  if (error) throw error;
  if (!row || row.user_id !== user.id) throw new HttpError(404, 'NOT_FOUND', 'Subscription not found');

  // Razorpay signs "<payment_id>|<subscription_id>" with the key secret.
  const valid = await verifyHmacSha256(keys.keySecret, `${paymentId}|${subscriptionId}`, signature);
  if (!valid) {
    console.warn('invalid payment signature', user.id, subscriptionId);
    throw new HttpError(400, 'INVALID_SIGNATURE', 'Payment could not be verified');
  }

  // Never trust the browser for state: read both objects from Razorpay.
  const [subscription, payment] = await Promise.all([
    razorpay<Record<string, unknown> & { id: string; status: string }>(keys, `/subscriptions/${subscriptionId}`),
    razorpay<Record<string, unknown> & { status: string }>(keys, `/payments/${paymentId}`),
  ]);
  if (subscription.id !== subscriptionId) throw new HttpError(400, 'MISMATCH', 'Payment could not be verified');

  const { error: subError } = await db.rpc('apply_razorpay_subscription', {
    p_entity: subscription, p_livemode: keys.live, p_event_at: null,
  });
  if (subError) throw subError;

  const { error: payError } = await db.rpc('apply_razorpay_payment', {
    p_entity: payment, p_livemode: keys.live, p_razorpay_subscription_id: subscriptionId,
  });
  if (payError) throw payError;

  if (!['authorized', 'captured'].includes(payment.status)) {
    throw new HttpError(402, 'PAYMENT_NOT_COMPLETED', 'The payment did not go through. You have not been charged.');
  }
  return { ok: true, status: subscription.status };
}

async function cancelSubscription(db: SupabaseClient, user: User) {
  const keys = razorpayKeys();
  const sub = (await liveSubscriptions(db, user.id)).find((s) => LIVE_ACCESS.has(s.status));
  if (!sub) throw new HttpError(404, 'NO_SUBSCRIPTION', 'You have no active plan to cancel');

  const updated = await razorpay<Record<string, unknown>>(keys, `/subscriptions/${sub.razorpay_subscription_id}/cancel`, {
    method: 'POST', body: { cancel_at_cycle_end: 1 },
  });
  const { error } = await db.rpc('apply_razorpay_subscription', {
    p_entity: updated, p_livemode: sub.livemode, p_event_at: null, p_cancel_at_cycle_end: true,
  });
  if (error) throw error;
  return { ok: true };
}

async function deleteAccount(db: SupabaseClient, user: User, body: Record<string, unknown>) {
  if (body.confirm !== 'DELETE') throw new HttpError(400, 'CONFIRMATION_REQUIRED', 'Type DELETE to confirm');

  const subs = await liveSubscriptions(db, user.id);
  if (subs.length) {
    const keys = razorpayKeys();
    for (const sub of subs) {
      try {
        const updated = await razorpay<Record<string, unknown>>(keys, `/subscriptions/${sub.razorpay_subscription_id}/cancel`, {
          method: 'POST', body: { cancel_at_cycle_end: 0 },
        });
        await db.rpc('apply_razorpay_subscription', { p_entity: updated, p_livemode: sub.livemode, p_event_at: null });
      } catch (err) {
        console.error('could not cancel before delete', sub.razorpay_subscription_id, String(err));
        throw new HttpError(502, 'CANCEL_FAILED',
          'We could not cancel your subscription with Razorpay, so nothing was deleted. Try again in a moment.');
      }
    }
  }

  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) throw error;
  return { ok: true };
}

// ---------- entry point -------------------------------------------------------
export async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, 405, { error: 'METHOD_NOT_ALLOWED' });

  try {
    const db = createClient(secret('SUPABASE_URL'), serviceKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const token = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue');
    const { data: auth, error: authError } = await db.auth.getUser(token);
    if (authError || !auth?.user) throw new HttpError(401, 'UNAUTHENTICATED', 'Your session has expired. Sign in again.');

    const body = await readJson(req);
    switch (body.action) {
      case 'create-subscription': return json(req, 200, await createSubscription(db, auth.user, body));
      case 'verify-payment':      return json(req, 200, await verifyPayment(db, auth.user, body));
      case 'cancel-subscription': return json(req, 200, await cancelSubscription(db, auth.user));
      case 'delete-account':      return json(req, 200, await deleteAccount(db, auth.user, body));
      default: throw new HttpError(400, 'UNKNOWN_ACTION', 'Unknown action');
    }
  } catch (err) {
    if (err instanceof HttpError) {
      if (err.status >= 500) console.error(err.code, err.message);
      return json(req, err.status, { error: err.code, message: err.message });
    }
    console.error('billing failure', err);
    return json(req, 500, { error: 'INTERNAL', message: 'Something went wrong on our side. Try again in a moment.' });
  }
}

if (!Deno.env.get('VANTARIS_TEST')) Deno.serve(handle);
