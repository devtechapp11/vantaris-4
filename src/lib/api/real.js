// Live backend: Supabase Auth + the SQL functions in supabase/schema.sql +
// the Edge Functions in supabase/functions. The browser only ever holds the
// public anon key; every rule is enforced on the server.
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';
import { ApiError, fromAuth, fromSupabase } from '../errors';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Fail loudly in development instead of sending requests to nowhere.
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw fromSupabase(error);
  return data;
}

async function invoke(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (!error) return data;

  let payload = null;
  try {
    payload = await error.context?.json?.();
  } catch {
    /* no JSON body */
  }
  if (payload?.error) {
    throw new ApiError(payload.error, payload.message ?? 'Something went wrong. Try again in a moment.', {
      remaining: payload.remaining ?? null,
    });
  }
  if (error.name === 'FunctionsFetchError' || error.name === 'FunctionsRelayError') {
    throw new ApiError('NETWORK', 'We couldn’t reach the server. Check your connection and try again.');
  }
  throw new ApiError('UNKNOWN', 'Something went wrong. Try again in a moment.');
}

const redirectTo = (path) => `${window.location.origin}${path}`;

export const api = {
  mode: 'live',

  // ----- auth -----
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session ?? null;
  },
  onAuthChange(callback) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));
    return () => data.subscription.unsubscribe();
  },
  async signUp({ email, password, displayName }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName }, emailRedirectTo: redirectTo('/') },
    });
    if (error) throw fromAuth(error);
    return { needsConfirmation: !data.session };
  },
  async signIn({ email, password }) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw fromAuth(error);
  },
  async signOut() {
    await supabase.auth.signOut();
  },
  async sendPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectTo('/reset-password') });
    // Only surface rate limits, so the form never reveals whether an account exists.
    if (error && /rate|security purposes|too many/i.test(error.message)) throw fromAuth(error);
  },
  async resendConfirmation(email) {
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectTo('/') } });
    if (error) throw fromAuth(error);
  },
  async updatePassword(password) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw fromAuth(error);
  },

  // ----- game -----
  getMe: () => rpc('get_me'),
  saveProfile: ({ displayName, school, goal, timezone, completeOnboarding } = {}) =>
    rpc('save_profile', {
      p_display_name: displayName ?? null,
      p_school: school ?? null,
      p_goal: goal ?? null,
      p_timezone: timezone ?? null,
      p_complete_onboarding: Boolean(completeOnboarding),
    }),
  getCatalog: () => rpc('get_catalog'),
  openProblem: (id) => rpc('open_problem', { p_problem_id: id }),
  submitAnswer: (id, choice) => rpc('submit_answer', { p_problem_id: id, p_choice: choice }),
  getLeaderboard: (scope) => rpc('get_leaderboard', { p_scope: scope, p_limit: 50 }),

  // Public (no sign-in needed): landing page and sign-up screen.
  async getPublicStats() {
    const { data, error } = await supabase.rpc('get_public_stats');
    if (error) throw fromSupabase(error);
    return data;
  },
  async getPublicModules() {
    const { data, error } = await supabase.from('modules').select('id,name,short,level,blurb,sort').order('sort');
    if (error) throw fromSupabase(error);
    return data;
  },

  async getPlans() {
    const [tiers, plans] = await Promise.all([
      supabase.from('tiers').select('id,name,rank,weekly_problem_limit,max_level,full_walkthroughs,tutor_daily_limit,tagline,features').order('rank'),
      supabase.from('plans').select('id,tier,interval,amount,currency,sort').eq('active', true).order('sort'),
    ]);
    if (tiers.error) throw fromSupabase(tiers.error);
    if (plans.error) throw fromSupabase(plans.error);
    return { tiers: tiers.data, plans: plans.data };
  },

  // ----- billing (Edge Function: billing) -----
  startCheckout: (planId) => invoke('billing', { action: 'create-subscription', plan_id: planId }),
  confirmPayment: (response) =>
    invoke('billing', {
      action: 'verify-payment',
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_subscription_id: response.razorpay_subscription_id,
      razorpay_signature: response.razorpay_signature,
    }),
  cancelSubscription: () => invoke('billing', { action: 'cancel-subscription' }),
  deleteAccount: () => invoke('billing', { action: 'delete-account', confirm: 'DELETE' }),

  // ----- AI tutor (Edge Function: tutor) -----
  askTutor: (problemId, messages) => invoke('tutor', { problem_id: problemId, messages }),
};
