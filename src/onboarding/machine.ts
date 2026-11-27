/**
 * Onboarding : machine à états minimale (aucune lib). Persistée en sessionStorage pour survivre à un refresh.
 * awaken → deal → aim → commit → lesson → save → done
 * L'utilisateur est ANONYME (Supabase signInAnonymously) dès sa première réponse : l'XP est réelle,
 * validée serveur, et conservée quand il lie son compte (linkIdentity / updateUser) — même user id.
 */
export type Profile = 'school' | 'university' | 'finance' | 'curious'
export type Desk = 'analyst' | 'associate' | 'vp' | 'md'
export type GoalMinutes = 5 | 10 | 15

export type OnboardingState =
  | { step: 'awaken' }
  | { step: 'deal'; startedAt: number }
  | { step: 'aim'; firstDealXp: number; profile?: Profile }
  | { step: 'commit'; firstDealXp: number; profile: Profile; desk: Desk }
  | { step: 'lesson'; profile: Profile; desk: Desk; goal: GoalMinutes }
  | { step: 'save'; profile: Profile; desk: Desk; goal: GoalMinutes; lessonXp: number }
  | { step: 'done' }

export type OnboardingEvent =
  | { type: 'AWAKENED'; now: number }
  | { type: 'DEAL_CLOSED'; xp: number }
  | { type: 'PICK_PROFILE'; profile: Profile }
  | { type: 'PICK_DESK'; desk: Desk }
  | { type: 'COMMIT'; goal: GoalMinutes }
  | { type: 'LESSON_DONE'; xp: number }
  | { type: 'SAVED' }
  | { type: 'SKIP_SAVE' }

export function reduce(s: OnboardingState, e: OnboardingEvent): OnboardingState {
  switch (s.step) {
    case 'awaken':
      return e.type === 'AWAKENED' ? { step: 'deal', startedAt: e.now } : s
    case 'deal':
      return e.type === 'DEAL_CLOSED' ? { step: 'aim', firstDealXp: e.xp } : s
    case 'aim':
      if (e.type === 'PICK_PROFILE') return { ...s, profile: e.profile }
      if (e.type === 'PICK_DESK' && s.profile)
        return { step: 'commit', firstDealXp: s.firstDealXp, profile: s.profile, desk: e.desk }
      return s
    case 'commit':
      return e.type === 'COMMIT' ? { step: 'lesson', profile: s.profile, desk: s.desk, goal: e.goal } : s
    case 'lesson':
      return e.type === 'LESSON_DONE'
        ? { step: 'save', profile: s.profile, desk: s.desk, goal: s.goal, lessonXp: e.xp }
        : s
    case 'save':
      return e.type === 'SAVED' || e.type === 'SKIP_SAVE' ? { step: 'done' } : s
    case 'done':
      return s
  }
}

const KEY = 'vt.onboarding.v1'

export function loadState(): OnboardingState {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as OnboardingState) : { step: 'awaken' }
  } catch {
    return { step: 'awaken' }
  }
}

export function saveState(s: OnboardingState) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* navigation privée : on continue sans persistance */
  }
}
