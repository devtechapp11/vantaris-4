// One error type for everything the UI shows. `code` drives behaviour
// (open a paywall, send to sign-in), `message` is safe to show as-is.
export class ApiError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.code = code;
    Object.assign(this, extra);
  }
}

const MESSAGES = {
  NOT_AUTHENTICATED: 'Your session has ended. Sign in again.',
  UNAUTHENTICATED: 'Your session has ended. Sign in again.',
  QUOTA_REACHED: "You've used this week's free problems.",
  LEVEL_LOCKED: 'This module is part of a higher plan.',
  NOT_FOUND: 'That problem does not exist.',
  NOT_OPENED: 'Open the problem before answering.',
  INVALID_CHOICE: 'Choose one of the answers.',
  INVALID_NAME: 'Enter a name between 1 and 40 characters.',
  INVALID_GOAL: 'Choose one of the goals.',
  INVALID_TIMEZONE: 'Your time zone was not recognised.',
  NETWORK: 'You seem to be offline. Check your connection and try again.',
};

const KNOWN = Object.keys(MESSAGES);

// Map a Supabase/PostgREST error (from our SQL functions) to an ApiError.
export function fromSupabase(error) {
  if (!error) return null;
  const raw = `${error.message ?? ''}`;
  const code = KNOWN.find((k) => raw.includes(k));
  if (code) return new ApiError(code, MESSAGES[code], { detail: error.details ?? error.detail });
  if (/Failed to fetch|NetworkError|Load failed/i.test(raw)) return new ApiError('NETWORK', MESSAGES.NETWORK);
  if (/JWT|token/i.test(raw)) return new ApiError('UNAUTHENTICATED', MESSAGES.UNAUTHENTICATED);
  return new ApiError('UNKNOWN', 'Something went wrong. Try again in a moment.');
}

// Map Supabase Auth errors to wording that doesn't reveal whether an account exists.
export function fromAuth(error) {
  const raw = `${error?.message ?? ''}`;
  if (/invalid login credentials/i.test(raw)) return new ApiError('BAD_CREDENTIALS', 'That email and password don’t match.');
  if (/email not confirmed/i.test(raw)) return new ApiError('EMAIL_NOT_CONFIRMED', 'Confirm your email first. We sent you a link when you signed up.');
  if (/rate limit|too many|security purposes/i.test(raw)) return new ApiError('RATE_LIMITED', 'Too many attempts. Wait a minute and try again.');
  if (/password/i.test(raw) && /(weak|short|least|character|pwned|leaked)/i.test(raw)) {
    return new ApiError('WEAK_PASSWORD', 'Choose a stronger password: at least 8 characters with letters and numbers, not one used on other sites.');
  }
  if (/same.*password|different from the old/i.test(raw)) return new ApiError('SAME_PASSWORD', 'Choose a password you haven’t used here before.');
  if (/captcha/i.test(raw)) return new ApiError('CAPTCHA', 'Complete the security check and try again.');
  if (/Failed to fetch|NetworkError|Load failed/i.test(raw)) return new ApiError('NETWORK', MESSAGES.NETWORK);
  return new ApiError('AUTH', 'We couldn’t complete that. Check your details and try again.');
}
