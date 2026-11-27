/** Kept after onboarding: the daily goal (in-app reminders), the profile (difficulty) and the one-time plans card. */
export const START_KEYS = { goal: 'vt.goal.minutes', profile: 'vt.profile', plansCard: 'vt.plansCard' } as const;

export const put = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode: the defaults apply */
  }
};

export const get = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
