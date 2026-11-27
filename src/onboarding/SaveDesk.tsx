import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

type Api = {
  linkGoogle: () => Promise<void>;
  linkEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};
const a = api as unknown as Api;

type Props = {
  /** Called once the desk is linked (email sent) — or right before the Google redirect. */
  onSaved: () => Promise<void> | void;
  /** « Later »: hidden where saving is required (upgrading). */
  onLater?: () => void;
  /** After the confirmation email is sent. */
  onContinue?: () => void;
};

/**
 * Turns a guest desk into an account: Google (linkIdentity) or email
 * (updateUser + confirmation). Same user id, so the XP and the streak stay.
 */
export default function SaveDesk({ onSaved, onLater, onContinue }: Props) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'pick' | 'email' | 'sent'>('pick');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taken, setTaken] = useState(false);

  const fail = (e: unknown) => {
    const err = e as { code?: string; message?: string };
    if (err?.code === 'IDENTITY_TAKEN') setTaken(true);
    else setError(err?.message ?? 'That did not work. Try again.');
  };

  const google = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSaved();
      await a.linkGoogle();
    } catch (e) {
      fail(e);
      setBusy(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Enter a valid email address.');
    setBusy(true);
    setError(null);
    try {
      await a.linkEmail(email.trim());
      setMode('sent');
      await onSaved();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  if (taken) {
    return (
      <div className="sd" role="alert">
        <p className="sd-note">This account already has a desk. Sign in to it instead. The progress on this guest desk will not be merged.</p>
        <button
          type="button"
          className="btn btn--primary btn--lg"
          onClick={async () => {
            await a.signOut();
            navigate('/signin');
          }}
        >
          Sign in to my existing account
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => setTaken(false)}>Back</button>
      </div>
    );
  }

  if (mode === 'sent') {
    return (
      <div className="sd" role="status">
        <p className="sd-note">Check your inbox to confirm <b>{email.trim()}</b>. Your desk is already saved here.</p>
        {onContinue && <button type="button" className="btn btn--primary btn--lg sd-btn" onClick={onContinue} autoFocus>Continue</button>}
      </div>
    );
  }

  return (
    <div className="sd">
      {mode === 'pick' ? (
        <>
          <button type="button" className="btn btn--primary btn--lg sd-btn" onClick={google} disabled={busy}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3zM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22zM6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14zM12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1z" /></svg>
            Continue with Google
          </button>
          <button type="button" className="btn btn--secondary btn--lg sd-btn" onClick={() => setMode('email')} disabled={busy}>Use email</button>
        </>
      ) : (
        <form className="sd-form" onSubmit={submit} noValidate>
          <label className="sd-label" htmlFor="sd-email">Email</label>
          <input id="sd-email" className="sd-input" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          <button type="submit" className="btn btn--primary btn--lg sd-btn" disabled={busy}>Save my desk</button>
          <button type="button" className="btn btn--ghost" onClick={() => setMode('pick')}>Back</button>
        </form>
      )}
      {error && <p className="sd-error" role="alert">{error}</p>}
      {onLater && mode === 'pick' && <button type="button" className="btn btn--ghost sd-later" onClick={onLater} disabled={busy}>Later</button>}
    </div>
  );
}
