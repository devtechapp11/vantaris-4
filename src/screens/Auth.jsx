import { useEffect, useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, MailCheck, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { NavBar, Page } from '../components/chrome';
import { Spinner } from '../components/bits';
import { useApp } from '../app/AppContext';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function passwordIssues(pw) {
  const issues = [];
  if (pw.length < 8) issues.push('at least 8 characters');
  if (!/[a-zA-Z]/.test(pw)) issues.push('a letter');
  if (!/[0-9]/.test(pw)) issues.push('a number');
  return issues;
}

function strength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) s++;
  return s;
}

export function PasswordField({ id, value, onChange, autoComplete, label = 'Password', showMeter = false, invalid }) {
  const [show, setShow] = useState(false);
  const s = strength(value);
  const tones = ['var(--neg)', 'var(--warn)', 'var(--brass)', 'var(--pos)'];
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <input
          id={id} className="input" type={show ? 'text' : 'password'} value={value}
          onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete}
          aria-invalid={invalid ? 'true' : undefined} maxLength={72} required
        />
        <button type="button" className="icon-btn" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {showMeter && (
        <>
          <div className="meter" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => <i key={i} style={{ background: value && i < Math.max(1, s) ? tones[Math.max(0, s - 1)] : undefined }} />)}
          </div>
          <span className="hint">At least 8 characters with a letter and a number. Longer is stronger.</span>
        </>
      )}
    </div>
  );
}

export function SignUp() {
  const id = useId();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [sentTo, setSentTo] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Enter your first name.');
    if (!EMAIL.test(email.trim())) return setError('Enter a valid email address.');
    const issues = passwordIssues(password);
    if (issues.length) return setError(`Your password needs ${issues.join(', ')}.`);
    setBusy(true);
    try {
      const { needsConfirmation } = await api.signUp({ email: email.trim().toLowerCase(), password, displayName: name.trim() });
      if (needsConfirmation) setSentTo(email.trim().toLowerCase());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) return <CheckInbox email={sentTo} />;

  return (
    <>
      <NavBar back="Back" to="/welcome" />
      <Page className="screen screen--bare" pushed>
        <header className="stack-4" style={{ paddingTop: 8 }}>
          <h1 className="t-large">Create your account</h1>
          <p className="t-body">Three free problems a week. Upgrade whenever you want more.</p>
        </header>
        <form className="stack-16" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor={`${id}-n`}>First name</label>
            <input id={`${id}-n`} className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={40} required />
          </div>
          <div className="field">
            <label htmlFor={`${id}-e`}>Email</label>
            <input id={`${id}-e`} className="input" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoCapitalize="none" spellCheck="false" required />
          </div>
          <PasswordField id={`${id}-p`} value={password} onChange={setPassword} autoComplete="new-password" showMeter />
          {error && <div className="alert" role="alert">{error}</div>}
          <button className="btn btn--accent" disabled={busy}>{busy ? <Spinner /> : 'Create account'}</button>
          <p className="t-foot center">
            Already have an account? <Link to="/signin" className="c-accent">Sign in</Link>
          </p>
          <p className="t-cap center row-8" style={{ justifyContent: 'center' }}>
            <ShieldCheck size={14} aria-hidden="true" /> Passwords are encrypted and never visible to us.
          </p>
        </form>
      </Page>
    </>
  );
}

function CheckInbox({ email }) {
  const [cooldown, setCooldown] = useState(60);
  const [note, setNote] = useState(null);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);
  const resend = async () => {
    setNote(null);
    try {
      await api.resendConfirmation(email);
      setNote('Sent again. It can take a minute to arrive.');
      setCooldown(60);
    } catch (err) {
      setNote(err.message);
    }
  };
  return (
    <Page className="screen screen--bare" pushed>
      <div className="stack-16 center" style={{ alignItems: 'center', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 80px)' }}>
        <span className="avatar avatar--lg avatar--me"><MailCheck size={32} aria-hidden="true" /></span>
        <h1 className="t-title">Check your inbox</h1>
        <p className="t-body" style={{ maxWidth: 360 }}>
          We sent a confirmation link to <b className="c-fg">{email}</b>. Open it on this device to finish creating your account.
        </p>
        <button type="button" className="btn btn--gray btn--md" style={{ maxWidth: 280 }} onClick={resend} disabled={cooldown > 0}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
        </button>
        {note && <p className="t-foot" role="status">{note}</p>}
        <Link to="/signin" className="btn btn--plain">Go to sign in</Link>
      </div>
    </Page>
  );
}

export function SignIn() {
  const id = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!EMAIL.test(email.trim()) || !password) return setError('Enter your email and password.');
    setBusy(true);
    try {
      await api.signIn({ email: email.trim().toLowerCase(), password });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <>
      <NavBar back="Back" to="/welcome" />
      <Page className="screen screen--bare" pushed>
        <header className="stack-4" style={{ paddingTop: 8 }}>
          <h1 className="t-large">Welcome back</h1>
          <p className="t-body">Pick up your streak where you left it.</p>
        </header>
        <form className="stack-16" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor={`${id}-e`}>Email</label>
            <input id={`${id}-e`} className="input" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoCapitalize="none" spellCheck="false" required />
          </div>
          <PasswordField id={`${id}-p`} value={password} onChange={setPassword} autoComplete="current-password" />
          {error && <div className="alert" role="alert">{error}</div>}
          <button className="btn btn--accent" disabled={busy}>{busy ? <Spinner /> : 'Sign in'}</button>
          <div className="between" style={{ justifyContent: 'center', gap: 20 }}>
            <Link to="/forgot" className="t-foot c-accent">Forgot password?</Link>
            <Link to="/signup" className="t-foot c-accent">Create an account</Link>
          </div>
        </form>
      </Page>
    </>
  );
}

export function Forgot() {
  const id = useId();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!EMAIL.test(email.trim())) return setError('Enter a valid email address.');
    setBusy(true);
    try {
      await api.sendPasswordReset(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <NavBar back="Sign in" to="/signin" />
      <Page className="screen screen--bare" pushed>
        <header className="stack-4" style={{ paddingTop: 8 }}>
          <h1 className="t-large">Reset your password</h1>
          <p className="t-body">We’ll email you a link to choose a new one.</p>
        </header>
        {sent ? (
          <div className="alert alert--info" role="status">
            If an account exists for {email.trim()}, a reset link is on its way. Open it on this device.
          </div>
        ) : (
          <form className="stack-16" onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor={`${id}-e`}>Email</label>
              <input id={`${id}-e`} className="input" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoCapitalize="none" spellCheck="false" required />
            </div>
            {error && <div className="alert" role="alert">{error}</div>}
            <button className="btn btn--accent" disabled={busy}>{busy ? <Spinner /> : 'Send reset link'}</button>
          </form>
        )}
      </Page>
    </>
  );
}

export function ResetPassword() {
  const id = useId();
  const navigate = useNavigate();
  const { session, showToast } = useApp();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (session === null) {
    return (
      <Page className="screen screen--bare" pushed>
        <div className="stack-16" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 60px)' }}>
          <h1 className="t-title">This link has expired</h1>
          <p className="t-body">Reset links work once and for one hour. Request a new one and open it on this device.</p>
          <Link to="/forgot" className="btn btn--accent">Request a new link</Link>
        </div>
      </Page>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    const issues = passwordIssues(password);
    if (issues.length) return setError(`Your password needs ${issues.join(', ')}.`);
    if (password !== confirm) return setError('The two passwords don’t match.');
    setBusy(true);
    try {
      await api.updatePassword(password);
      showToast('Password updated', 'success');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Page className="screen screen--bare" pushed>
      <header className="stack-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 28px)' }}>
        <h1 className="t-large">Choose a new password</h1>
        <p className="t-body">You’ll stay signed in on this device.</p>
      </header>
      <form className="stack-16" onSubmit={submit} noValidate>
        <PasswordField id={`${id}-p`} value={password} onChange={setPassword} autoComplete="new-password" label="New password" showMeter />
        <PasswordField id={`${id}-c`} value={confirm} onChange={setConfirm} autoComplete="new-password" label="Confirm new password" />
        {error && <div className="alert" role="alert">{error}</div>}
        <button className="btn btn--accent" disabled={busy}>{busy ? <Spinner /> : 'Save password'}</button>
      </form>
    </Page>
  );
}
