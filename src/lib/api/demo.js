// Preview backend. Runs the same rules as supabase/schema.sql in the browser
// so the app can be clicked through without a server. Only included in
// `npm run build:preview`; the real build never contains this file or the answers.
import content from '../../../scripts/content.json';
import { ApiError } from '../errors';

const KEY = 'vantaris-preview-v1';
const USER_ID = 'preview-user';
const LEVELS = ['Analyst', 'Associate', 'VP', 'MD'];
const SHORT = { statements: 'Statements', dcf: 'DCF', comps: 'Comps', precedents: 'Precedents', lbo: 'LBO', ma: 'M&A', restructuring: 'Restructuring', structuring: 'Structuring' };

const TIERS = [
  { id: 'free', name: 'Free', rank: 0, weekly_problem_limit: 3, max_level: 'Analyst', full_walkthroughs: false, tutor_daily_limit: 0,
    tagline: 'Try the format', features: ['3 problems a week', 'Analyst modules', 'First two solution steps'] },
  { id: 'core', name: 'Core', rank: 1, weekly_problem_limit: null, max_level: 'Associate', full_walkthroughs: true, tutor_daily_limit: 0,
    tagline: 'Practice every day', features: ['Unlimited problems', 'Analyst and Associate modules', 'Full step-by-step solutions'] },
  { id: 'pro', name: 'Pro', rank: 2, weekly_problem_limit: null, max_level: 'VP', full_walkthroughs: true, tutor_daily_limit: 40,
    tagline: 'Learn with a tutor', features: ['Everything in Core', 'AI tutor, 40 messages a day', 'VP modules: M&A and restructuring'] },
  { id: 'elite', name: 'Elite', rank: 3, weekly_problem_limit: null, max_level: 'MD', full_walkthroughs: true, tutor_daily_limit: 300,
    tagline: 'Interview-ready', features: ['Everything in Pro', 'Unlimited AI tutor', 'MD module: deal structuring', 'Elite member card'] },
];
const PLANS = [
  { id: 'core_monthly', tier: 'core', interval: 'monthly', amount: 49900, currency: 'INR', sort: 1 },
  { id: 'core_yearly', tier: 'core', interval: 'yearly', amount: 499000, currency: 'INR', sort: 2 },
  { id: 'pro_monthly', tier: 'pro', interval: 'monthly', amount: 99900, currency: 'INR', sort: 3 },
  { id: 'pro_yearly', tier: 'pro', interval: 'yearly', amount: 999000, currency: 'INR', sort: 4 },
  { id: 'elite_monthly', tier: 'elite', interval: 'monthly', amount: 199900, currency: 'INR', sort: 5 },
  { id: 'elite_yearly', tier: 'elite', interval: 'yearly', amount: 1999000, currency: 'INR', sort: 6 },
];

// Example players for the preview leaderboard (week, month, all-time points).
const PLAYERS = [
  ['Rowan A.', 'Northfield Academy', 412, 1480, 3010], ['Ines T.', 'Harbor College', 388, 1402, 2860],
  ['Kai M.', 'Westmere School', 351, 1290, 2604], ['Noor S.', 'Linden Institute', 334, 1205, 2470],
  ['Eli B.', 'Calder High', 301, 1122, 2302], ['Mara K.', 'Ashgrove College', 276, 1015, 2110],
  ['Theo L.', 'Brightwater School', 254, 948, 1987], ['Zara P.', 'Elmstead Academy', 221, 870, 1730],
  ['Jun H.', 'Kingsmere College', 198, 760, 1588], ['Sami R.', 'Ravenhill School', 160, 610, 1290],
  ['Ada O.', 'Stonebridge Institute', 133, 512, 1044], ['Lea D.', 'Oakhaven School', 97, 388, 802],
  ['Ravi N.', 'Northfield Academy', 64, 251, 560], ['Finn W.', 'Harbor College', 38, 140, 310],
];

const MODULES = content.modules.map((m, i) => ({ id: m.id, name: m.name, short: SHORT[m.id] ?? m.name, level: m.tier, blurb: m.blurb, sort: i + 1 }));
const PROBLEMS = content.problems.map((p, i) => ({ ...p, module_id: p.module, sort: i }));
const byId = Object.fromEntries(PROBLEMS.map((p) => [p.id, p]));
const moduleOf = (p) => MODULES.find((m) => m.id === p.module_id);
const lvl = (name) => LEVELS.indexOf(name);

// ---------- persistence ----------
function blank() {
  return { account: null, signedIn: false, profile: null, attempts: {}, ledger: [], sub: null, tutor: { date: null, used: 0 } };
}
let state = blank();
try {
  const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
  if (saved && typeof saved === 'object') state = { ...blank(), ...saved };
} catch {
  /* storage unavailable: start fresh */
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

const listeners = new Set();
const session = () => (state.signedIn && state.account ? { user: { id: USER_ID, email: state.account.email } } : null);
function emit(event) {
  const s = session();
  listeners.forEach((cb) => cb(event, s));
}

const wait = (ms = 220) => new Promise((r) => setTimeout(r, ms + Math.random() * 120));

// ---------- rules (mirrors the SQL) ----------
const localDate = (d = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
const addDays = (iso, n) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return localDate(d);
};
const weekStart = (iso = localDate()) => {
  const d = new Date(`${iso}T12:00:00`);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return localDate(d);
};
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function levelFor(points) {
  if (points >= 751) return 'MD';
  if (points >= 501) return 'VP';
  if (points >= 251) return 'Associate';
  return 'Analyst';
}
const floorOf = (l) => ({ Analyst: 0, Associate: 251, VP: 501, MD: 751 })[l];

function tier() {
  const s = state.sub;
  const live = s && ['active', 'authenticated', 'pending'].includes(s.status) && (!s.current_end || new Date(s.current_end) > Date.now());
  return TIERS.find((t) => t.id === (live ? s.tier : 'free'));
}

function requireUser() {
  if (!session()) throw new ApiError('NOT_AUTHENTICATED', 'Your session has ended. Sign in again.');
  if (!state.profile) {
    state.profile = {
      display_name: state.account?.display_name || 'Analyst', school: null, goal: null, onboarded: false,
      points: 0, solved: 0, attempted: 0, streak: 0, streak_best: 0, last_active_on: null, created_at: new Date().toISOString(),
    };
  }
}

function statusOf(a) {
  if (!a) return 'new';
  if (a.submitted_at) return a.correct ? 'correct' : 'wrong';
  return 'opened';
}

function resultPayload(a, p, full) {
  const label = (id) => p.options.find((o) => o.id === id)?.label ?? null;
  return {
    choice: a.choice, correct: a.correct, points: a.points, time_ratio: a.time_ratio, submitted_at: a.submitted_at,
    answer: p.answer, answer_label: label(p.answer), choice_label: label(a.choice),
    steps: full ? p.steps : p.steps.slice(0, 2), steps_total: p.steps.length,
    steps_locked: !full && p.steps.length > 2, concept: p.concept, formula: p.formula,
  };
}

function shuffled(p) {
  return [...p.options].sort((a, b) => hash(USER_ID + p.id + a.id) - hash(USER_ID + p.id + b.id));
}

function me() {
  requireUser();
  const pr = state.profile;
  const t = tier();
  const today = localDate();
  const wk = weekStart(today);
  const used = Object.values(state.attempts).filter((a) => a.week_start === wk).length;
  const level = levelFor(pr.points);
  const next = LEVELS[lvl(level) + 1] ?? null;
  const accessible = PROBLEMS.filter((p) => lvl(moduleOf(p).level) <= lvl(t.max_level));
  const finishedBefore = (p) => {
    const a = state.attempts[p.id];
    return a?.submitted_at && localDate(a.submitted_at) < today;
  };
  const daily = [...accessible].sort((a, b) => (finishedBefore(a) - finishedBefore(b)) || (hash(a.id + today) - hash(b.id + today)))[0];
  const tutorUsed = state.tutor.date === today ? state.tutor.used : 0;
  const correctIds = new Set(Object.entries(state.attempts).filter(([, a]) => a.correct).map(([id]) => id));

  return {
    profile: {
      id: USER_ID, display_name: pr.display_name, school: pr.school, goal: pr.goal, timezone: 'UTC', onboarded: pr.onboarded,
      points: pr.points, level, level_floor: floorOf(level), next_level: next, next_level_at: next ? floorOf(next) : null,
      solved: pr.solved, attempted: pr.attempted, accuracy: pr.attempted ? Math.round((pr.solved / pr.attempted) * 1000) / 1000 : null,
      streak: pr.last_active_on && pr.last_active_on >= addDays(today, -1) ? pr.streak : 0,
      streak_best: pr.streak_best, active_today: pr.last_active_on === today, created_at: pr.created_at,
    },
    tier: { id: t.id, name: t.name, rank: t.rank, max_level: t.max_level, full_walkthroughs: t.full_walkthroughs,
      weekly_problem_limit: t.weekly_problem_limit, tutor_daily_limit: t.tutor_daily_limit },
    quota: { limit: t.weekly_problem_limit, used, remaining: t.weekly_problem_limit == null ? null : Math.max(t.weekly_problem_limit - used, 0),
      resets_at: new Date(`${addDays(wk, 7)}T00:00:00`).toISOString() },
    tutor: { limit: t.tutor_daily_limit, used: tutorUsed, remaining: Math.max(t.tutor_daily_limit - tutorUsed, 0) },
    daily: daily && {
      id: daily.id, title: daily.title, kind: daily.kind, difficulty: daily.difficulty, minutes: daily.minutes,
      module_id: daily.module_id, module_name: moduleOf(daily).name, level: moduleOf(daily).level,
      status: statusOf(state.attempts[daily.id]), points: state.attempts[daily.id]?.points ?? 0,
    },
    week: Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i - 6);
      return { date, points: state.ledger.filter((l) => l.local_date === date).reduce((s, l) => s + l.amount, 0) };
    }),
    continue: accessible
      .filter((p) => !state.attempts[p.id]?.submitted_at && p.id !== daily?.id)
      .sort((a, b) => (Boolean(state.attempts[b.id]) - Boolean(state.attempts[a.id])) || (moduleOf(a).sort - moduleOf(b).sort) || (a.sort - b.sort))
      .slice(0, 3)
      .map((p) => ({ id: p.id, title: p.title, kind: p.kind, difficulty: p.difficulty, minutes: p.minutes, module_name: moduleOf(p).name, level: moduleOf(p).level, opened: Boolean(state.attempts[p.id]) })),
    recent: Object.entries(state.attempts)
      .filter(([, a]) => a.submitted_at)
      .sort((x, y) => y[1].submitted_at.localeCompare(x[1].submitted_at))
      .slice(0, 5)
      .map(([id, a]) => ({ id, title: byId[id].title, kind: byId[id].kind, module_name: moduleOf(byId[id]).name, correct: a.correct, points: a.points, submitted_at: a.submitted_at })),
    skills: MODULES.map((m) => {
      const list = PROBLEMS.filter((p) => p.module_id === m.id);
      return { module_id: m.id, name: m.name, short: m.short, level: m.level, total: list.length, solved: list.filter((p) => correctIds.has(p.id)).length };
    }),
    achievements: [
      { id: 'first-deal', name: 'First deal', detail: 'Solve your first problem', earned: pr.solved >= 1 },
      { id: 'hat-trick', name: 'Hat trick', detail: 'Solve three problems', earned: pr.solved >= 3 },
      { id: 'on-fire', name: 'On fire', detail: 'Practice three days in a row', earned: pr.streak_best >= 3 },
      { id: 'fast-hands', name: 'Fast hands', detail: 'Solve one in under half the time', earned: Object.values(state.attempts).some((a) => a.correct && a.time_ratio > 0.5) },
      { id: 'module-clear', name: 'Module cleared', detail: 'Solve every problem in a module', earned: MODULES.some((m) => PROBLEMS.filter((p) => p.module_id === m.id).every((p) => correctIds.has(p.id))) },
      { id: 'associate', name: 'Associate', detail: 'Reach 251 points', earned: pr.points >= 251 },
    ],
    subscription: state.sub && state.sub.status !== 'created' ? {
      status: state.sub.status, tier: state.sub.tier, plan_id: state.sub.plan_id,
      interval: PLANS.find((p) => p.id === state.sub.plan_id)?.interval, amount: PLANS.find((p) => p.id === state.sub.plan_id)?.amount,
      currency: 'INR', current_end: state.sub.current_end, cancel_at_cycle_end: state.sub.cancel_at_cycle_end, livemode: false,
      payment_method: { method: 'card', card_network: 'Visa', card_last4: '4242', bank: null, wallet: null },
    } : null,
  };
}

// ---------- tutor (rule-based in the preview; Gemini in the live app) ----------
const GLOSSARY = [
  [/ebitda/i, 'EBITDA is earnings before interest, taxes, depreciation and amortization: operating profit before accounting charges and financing choices. That is why it is the standard base for valuation multiples.'],
  [/wacc/i, 'WACC is the blended return lenders and shareholders require. Weight the cost of equity and the after-tax cost of debt by their share of total capital.'],
  [/irr/i, 'IRR is the annual compounded return. With one entry and one exit and no dividends: IRR = (exit value ÷ entry value)^(1 / years) − 1.'],
  [/moic/i, 'MOIC is exit equity divided by equity invested. It ignores time, which is why investors read it together with IRR.'],
  [/terminal/i, 'Terminal value captures everything after the projection period. With the perpetuity method it is next year’s cash flow divided by (WACC − growth).'],
  [/enterprise value|\bev\b/i, 'Enterprise value is the value of the whole business to all capital providers: equity value plus debt minus cash.'],
  [/accret|dilut/i, 'A deal is accretive if the buyer’s EPS goes up and dilutive if it goes down. In all-stock deals, compare the buyer’s P/E with the P/E it pays.'],
];
function tutorReply(p, text, hintIndex, submitted) {
  const s = text.toLowerCase();
  if (!submitted && /answer|solution|which one|tell me|just give/.test(s)) {
    return `I won't give the answer away before you submit, since working it out is what makes it stick. Here's the next nudge: ${p.hints[Math.min(hintIndex, p.hints.length - 1)]}`;
  }
  if (submitted && /answer|solution|steps|why/.test(s)) {
    return `The answer is ${p.options.find((o) => o.id === p.answer)?.label}.\n\n${p.steps.map(([a, b]) => `${a}: ${b}`).join('\n')}`;
  }
  if (/hint|stuck|start|help|where/.test(s)) {
    const i = Math.min(hintIndex, p.hints.length - 1);
    return `Hint ${i + 1} of ${p.hints.length}: ${p.hints[i]}${i < p.hints.length - 1 ? '\n\nAsk again for the next one.' : '\n\nThat was the last hint. You have everything you need.'}`;
  }
  if (/formula|equation|calc|compute/.test(s)) return `The relationship you need:\n\n${p.formula}\n\nPlug in the deal terms one at a time and watch the units.`;
  const term = GLOSSARY.find(([re]) => re.test(s));
  if (term) return term[1];
  if (/concept|explain|mean|understand/.test(s)) return `Here's the idea behind this one. ${p.concept}`;
  return `Good question. For ${p.title}, focus on this: ${p.hints[Math.min(hintIndex, p.hints.length - 1)]}`;
}

// ---------- API ----------
export const api = {
  mode: 'demo',

  async getSession() {
    return session();
  },
  onAuthChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  async signUp({ email, password, displayName }) {
    await wait(500);
    state = { ...blank(), account: { email, password, display_name: displayName }, signedIn: true };
    requireUser();
    save();
    emit('SIGNED_IN');
    return { needsConfirmation: false };
  },
  async signIn({ email, password }) {
    await wait(400);
    if (!state.account || state.account.email !== email || state.account.password !== password) {
      throw new ApiError('BAD_CREDENTIALS', 'That email and password don’t match.');
    }
    state.signedIn = true;
    save();
    emit('SIGNED_IN');
  },
  async signOut() {
    state.signedIn = false;
    save();
    emit('SIGNED_OUT');
  },
  async sendPasswordReset() { await wait(400); },
  async resendConfirmation() { await wait(300); },
  async updatePassword(password) {
    await wait(300);
    if (state.account) state.account.password = password;
    save();
  },

  async getMe() {
    await wait(120);
    return me();
  },
  async saveProfile({ displayName, school, goal, completeOnboarding } = {}) {
    await wait(250);
    requireUser();
    const clean = (v, n) => (v ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, n);
    if (displayName != null) {
      if (!clean(displayName, 40)) throw new ApiError('INVALID_NAME', 'Enter a name between 1 and 40 characters.');
      state.profile.display_name = clean(displayName, 40);
    }
    if (school != null) state.profile.school = clean(school, 80) || null;
    if (goal != null) state.profile.goal = goal;
    if (completeOnboarding) state.profile.onboarded = true;
    save();
    return me();
  },
  async getCatalog() {
    await wait(150);
    requireUser();
    const t = tier();
    return {
      tier: t.id,
      modules: MODULES.map((m) => ({
        id: m.id, name: m.name, short: m.short, level: m.level, blurb: m.blurb,
        locked: lvl(m.level) > lvl(t.max_level),
        unlock_tier: TIERS.find((x) => lvl(x.max_level) >= lvl(m.level)).id,
        problems: PROBLEMS.filter((p) => p.module_id === m.id).map((p) => ({
          id: p.id, title: p.title, kind: p.kind, difficulty: p.difficulty, minutes: p.minutes,
          status: statusOf(state.attempts[p.id]), points: state.attempts[p.id]?.points ?? 0,
        })),
      })),
    };
  },
  async openProblem(id) {
    await wait(200);
    requireUser();
    const p = byId[id];
    if (!p) throw new ApiError('NOT_FOUND', 'That problem does not exist.');
    const m = moduleOf(p);
    const t = tier();
    let a = state.attempts[id];
    if (!a) {
      if (lvl(m.level) > lvl(t.max_level)) throw new ApiError('LEVEL_LOCKED', 'This module is part of a higher plan.', { detail: m.level });
      const wk = weekStart();
      if (t.weekly_problem_limit != null && Object.values(state.attempts).filter((x) => x.week_start === wk).length >= t.weekly_problem_limit) {
        throw new ApiError('QUOTA_REACHED', "You've used this week's free problems.");
      }
      a = state.attempts[id] = { opened_at: new Date().toISOString(), week_start: wk, submitted_at: null, choice: null, correct: null, points: 0, time_ratio: null };
      save();
    } else if (!a.submitted_at && lvl(m.level) > lvl(t.max_level)) {
      throw new ApiError('LEVEL_LOCKED', 'This module is part of a higher plan.', { detail: m.level });
    }
    return {
      problem: { id: p.id, module_id: m.id, module_name: m.name, level: m.level, difficulty: p.difficulty, minutes: p.minutes,
        title: p.title, kind: p.kind, scenario: p.scenario, data: p.data, question: p.question, options: shuffled(p) },
      opened_at: a.opened_at, server_now: new Date().toISOString(),
      result: a.submitted_at ? resultPayload(a, p, t.full_walkthroughs) : null,
    };
  },
  async submitAnswer(id, choice) {
    await wait(350);
    requireUser();
    const p = byId[id];
    const a = state.attempts[id];
    if (!a) throw new ApiError('NOT_OPENED', 'Open the problem before answering.');
    const t = tier();
    if (a.submitted_at) return { already_submitted: true, result: resultPayload(a, p, t.full_walkthroughs), me: me() };
    if (!p.options.some((o) => o.id === choice)) throw new ApiError('INVALID_CHOICE', 'Choose one of the answers.');
    const ratio = Math.max(0, Math.min(1, 1 - (Date.now() - new Date(a.opened_at).getTime()) / 1000 / (p.minutes * 60)));
    const correct = choice === p.answer;
    const points = correct ? Math.round(10 * p.difficulty * (1 + 0.5 * ratio)) : 0;
    Object.assign(a, { submitted_at: new Date().toISOString(), choice, correct, points, time_ratio: Math.round(ratio * 1000) / 1000 });
    const pr = state.profile;
    const today = localDate();
    const before = levelFor(pr.points);
    const streak = pr.last_active_on === today ? Math.max(pr.streak, 1) : pr.last_active_on === addDays(today, -1) ? pr.streak + 1 : 1;
    Object.assign(pr, { points: pr.points + points, attempted: pr.attempted + 1, solved: pr.solved + (correct ? 1 : 0), streak, streak_best: Math.max(pr.streak_best, streak), last_active_on: today });
    if (points) state.ledger.push({ amount: points, local_date: today, at: a.submitted_at });
    save();
    const after = levelFor(pr.points);
    return { already_submitted: false, result: resultPayload(a, p, t.full_walkthroughs), level_up: lvl(after) > lvl(before) ? after : null, me: me() };
  },
  async getLeaderboard(scope) {
    await wait(200);
    requireUser();
    const col = { week: 2, month: 3, all: 4 }[scope];
    if (!col) throw new ApiError('INVALID_SCOPE', 'Unknown range');
    const now = new Date();
    const since = scope === 'week' ? weekStart() : scope === 'month' ? `${localDate().slice(0, 8)}01` : null;
    const myPts = scope === 'all' ? state.profile.points : state.ledger.filter((l) => l.local_date >= since).reduce((s, l) => s + l.amount, 0);
    const rows = PLAYERS.map((r) => ({ name: r[0], school: r[1], points: r[col], level: levelFor(r[4]), is_me: false }));
    if (myPts > 0) rows.push({ name: state.profile.display_name, school: state.profile.school, points: myPts, level: levelFor(state.profile.points), is_me: true });
    rows.sort((a, b) => b.points - a.points);
    let rank = 0;
    rows.forEach((r, i) => { rank = i > 0 && rows[i - 1].points === r.points ? rank : i + 1; r.rank = rank; });
    const mine = rows.find((r) => r.is_me);
    return {
      scope, since: now.toISOString(), rows,
      me: mine ?? { rank: null, name: state.profile.display_name, school: state.profile.school, points: 0, level: levelFor(state.profile.points), is_me: true },
      players: rows.length,
    };
  },
  // Sample figures for the preview only. The live app reads real counts from get_public_stats().
  async getPublicStats() {
    await wait(120);
    return { deals_solved: 12847, players: 2341, problems: PROBLEMS.length, modules: MODULES.length };
  },
  async getPublicModules() {
    await wait(100);
    return MODULES.map(({ id, name, short, level, blurb, sort }) => ({ id, name, short, level, blurb, sort }));
  },
  async getPlans() {
    await wait(120);
    return { tiers: TIERS, plans: PLANS };
  },

  async startCheckout(planId) {
    await wait(500);
    requireUser();
    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) throw new ApiError('PLAN_NOT_FOUND', 'That plan is not available');
    if (tier().id !== 'free') throw new ApiError('ALREADY_SUBSCRIBED', 'You already have an active plan. Cancel it first to switch plans.');
    return { demo: true, subscription_id: `sub_preview${Date.now()}`, plan, prefill: { email: state.account.email, name: state.profile.display_name } };
  },
  async confirmPayment({ plan }) {
    await wait(900);
    const end = new Date();
    if (plan.interval === 'yearly') end.setFullYear(end.getFullYear() + 1);
    else end.setMonth(end.getMonth() + 1);
    state.sub = { tier: plan.tier, plan_id: plan.id, status: 'active', current_end: end.toISOString(), cancel_at_cycle_end: false };
    save();
    return { ok: true, status: 'active' };
  },
  async cancelSubscription() {
    await wait(500);
    if (!state.sub || tier().id === 'free') throw new ApiError('NO_SUBSCRIPTION', 'You have no active plan to cancel');
    state.sub.cancel_at_cycle_end = true;
    save();
    return { ok: true };
  },
  async deleteAccount() {
    await wait(500);
    state = blank();
    save();
    emit('SIGNED_OUT');
    return { ok: true };
  },

  async askTutor(problemId, messages) {
    await wait(700);
    requireUser();
    const t = tier();
    if (!t.tutor_daily_limit) throw new ApiError('PLAN', 'The AI tutor comes with Pro and Elite.');
    const today = localDate();
    if (state.tutor.date !== today) state.tutor = { date: today, used: 0 };
    if (state.tutor.used >= t.tutor_daily_limit) throw new ApiError('LIMIT', 'You have used today’s tutor messages. They come back tomorrow.', { remaining: 0 });
    state.tutor.used += 1;
    save();
    const p = byId[problemId];
    const asked = messages.filter((m) => m.role === 'user');
    const hintsAsked = asked.filter((m) => /hint|stuck|start|help|where|answer|tell me/i.test(m.text)).length - 1;
    return {
      reply: tutorReply(p, asked[asked.length - 1].text, Math.max(0, hintsAsked), Boolean(state.attempts[problemId]?.submitted_at)),
      remaining: t.tutor_daily_limit - state.tutor.used,
    };
  },

  // Preview-only controls (shown on the Profile screen in the preview build).
  demo: {
    setTier(id) {
      if (id === 'free') state.sub = null;
      else {
        const end = new Date();
        end.setMonth(end.getMonth() + 1);
        state.sub = { tier: id, plan_id: `${id}_monthly`, status: 'active', current_end: end.toISOString(), cancel_at_cycle_end: false };
      }
      save();
    },
    resetWeek() {
      Object.values(state.attempts).forEach((a) => { a.week_start = '2000-01-03'; });
      save();
    },
    loadSample() {
      requireUser();
      const today = localDate();
      const sample = [['forge', 'b', 4], ['halcyon', 'c', 4], ['corbel', 'b', 3], ['veridian', 'a', 2], ['atlas', 'b', 1], ['northwind', 'b', 0]];
      sample.forEach(([id, choice, daysAgo]) => {
        const p = byId[id];
        const at = new Date(Date.now() - daysAgo * 86400000).toISOString();
        const correct = choice === p.answer;
        const points = correct ? Math.round(10 * p.difficulty * 1.3) : 0;
        state.attempts[id] = { opened_at: at, week_start: '2000-01-03', submitted_at: at, choice, correct, points, time_ratio: 0.6 };
        if (points) state.ledger.push({ amount: points, local_date: addDays(today, -daysAgo), at });
      });
      const pr = state.profile;
      pr.points = state.ledger.reduce((s, l) => s + l.amount, 0) + 180;
      pr.attempted = sample.length + 9;
      pr.solved = sample.filter(([id, c]) => byId[id].answer === c).length + 8;
      pr.streak = 5;
      pr.streak_best = 6;
      pr.last_active_on = today;
      save();
    },
    reset() {
      const account = state.account;
      state = { ...blank(), account, signedIn: true };
      requireUser();
      state.profile.onboarded = true;
      save();
    },
  },
};
