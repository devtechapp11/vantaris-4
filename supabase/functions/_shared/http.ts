// HTTP helpers shared by the exercise functions (same rules as tutor/billing).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export function secret(name: string): string {
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
    } catch { /* fall through */ }
  }
  return secret('SUPABASE_SERVICE_ROLE_KEY');
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  const list = (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173').split(',').map((s) => s.trim());
  return {
    ...(origin && list.includes(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

export function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/** The service client and the signed-in player, or a 401. */
export async function authed(req: Request): Promise<{ db: SupabaseClient; user: string }> {
  const db = createClient(secret('SUPABASE_URL'), serviceKey(), { auth: { persistSession: false, autoRefreshToken: false } });
  const token = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue');
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, 'UNAUTHENTICATED', 'Your session has expired. Sign in again.');
  return { db, user: data.user.id };
}

export async function body(req: Request, max = 4096): Promise<Record<string, unknown>> {
  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > max) throw new HttpError(413, 'TOO_LARGE', 'Request is too large');
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  } catch { /* below */ }
  throw new HttpError(400, 'BAD_REQUEST', 'Body must be a JSON object');
}

export function fail(req: Request, err: unknown, where: string): Response {
  if (err instanceof HttpError) {
    if (err.status >= 500) console.error(err.code, err.message);
    return json(req, err.status, { error: err.code, message: err.message });
  }
  console.error(`${where} failure`, err);
  return json(req, 500, { error: 'INTERNAL', message: 'Something went wrong on our side. Try again in a moment.' });
}
