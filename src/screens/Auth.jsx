import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, MailCheck, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { useApp } from '../app/AppContext';
import { SOCIAL_PROOF_MIN, usePublicStats } from '../app/usePublic';
import { Spinner } from '../components/bits';
import { FloatingField, PasswordField } from '../components/ui';
import Logo from '../components/Logo';
import Mascot from '../components/Mascot';
import { duration, ease, spring } from '../design/tokens';
import { number } from '../lib/format';
import { track } from '../lib/analytics';
import './Auth.css';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function passwordIssues(pw) {
  const issues = [];
  if (pw.length < 8) issues.push('at least 8 characters');
  if (!/[a-zA-Z]/.test(pw)) issues.push('a letter');
  if (!/[0-9]/.test(pw)) issues.push('a number');
  return issues;
}

const COPY = {
  signin: { title: 'Welcome back', sub: 'Pick up your streak where you left it.', mood: 'welcome' },
  signup: { title: 'Open your desk', sub: 'Three free deals a week. Upgrade whenever you want more.', mood: 'welcome' },
  forgot: { title: 'Reset your password', sub: 'We’ll email you a link to choose a new one.', mood: 'think' },
};

const formMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.out } },
  exit: { opacity: 0, y: -8, transition: { duration: duration.fast } },
};

/** Sign in, sign up and forgot password share one split-screen layout. */
export default function AuthScreen() {
  const { pathname } = useLocation();
  const mode = pathname === '/signup' ? 'signup' : pathname === '/forgot' ? 'forgot' : 'signin';
  const [sentTo, setSentTo] = useState(null);
  const copy = COPY[mode];

  return (
    <AuthLayout mood={sentTo ? 'correct' : copy.mood}>
      {sentTo ? (
        <CheckInbox email={sentTo} />
      ) : (
        <motion.div layout className="auth-panel" transition={spring.snappy}>
          {mode !== 'forgot' && (
            <div className="auth-tabs" role="tablist" aria-label="Account">
              {[['signin', 'Sign in', '/signin'], ['signup', 'Create account', '/signup']].map(([m, label, to]) => (
                <Link key={m} to={to} replace role="tab" aria-selected={mode === m} className="auth-tab">
                  {mode === m && <motion.span layoutId="auth-tab" className="auth-tab-pill" transition={spring.snappy} />}
                  <span className="auth-tab-label">{label}</span>
                </Link>
              ))}
            </div>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={mode} className="stack-24" {...formMotion}>
              <header className="stack-8">
                <h1 className="t-h1">{copy.title}</h1>
                <p className="t-body">{copy.sub}</p>
              </header>
              {mode === 'signup' && <SignUpForm onSent={setSentTo} />}
              {mode === 'signin' && <SignInForm />}
              {mode === 'forgot' && <ForgotForm />}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AuthLayout>
  );
}

function AuthLayout({ children, mood }) {
  const stats = usePublicStats();
  return (
    <motion.main className="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: duration.slow }}>
      <section className="auth-left">
        <div className="auth-top">
          <Link to="/welcome" className="nav-back" aria-label="Back to the home page"><ArrowLeft size={18} aria-hidden="true" /> Home</Link>
          <Logo size={26} />
        </div>
        <div className="auth-mobile-vale" aria-hidden="true"><Mascot mood={mood} size={112} decorative /></div>
        <div className="auth-center">{children}</div>
        <p className="t-cap center row-8 auth-trust">
          <ShieldCheck size={14} aria-hidden="true" /> Passwords are encrypted and never visible to us.
        </p>
      </section>
      <aside className="auth-right" aria-hidden="true">
        <div className="auth-stage">
          <div className="auth-stage-vale">
            <Mascot mood={mood} size={340} decorative />
          </div>
          <div className="auth-quote">
            <p className="t-display auth-quote-line text-chrome">Don’t study finance. Do finance.</p>
            <SocialProof stats={stats} />
          </div>
        </div>
      </aside>
    </motion.main>
  );
}

/** "Join 2,341 future dealmakers" once the community is big enough to say so. */
export function SocialProof({ stats }) {
  const players = stats?.players ?? 0;
  return (
    <div className="row social-proof">
      <span className="avatar-stack" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => <span key={i} className="avatar proof-dot" />)}
      </span>
      <span className="t-foot">
        {players >= SOCIAL_PROOF_MIN ? <>Join <b className="c-fg fig">{number(players)}</b> future dealmakers</> : 'Join the next class of future dealmakers'}
      </span>
    </div>
  );
}

function SignUpForm({ onSent }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [trap, setTrap] = useState(''); // honeypot: people never see or fill it
  const [touched, setTouched] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const stats = usePublicStats();

  // Forgiving validation: a field only complains after you leave it (or press submit).
  const issues = {
    name: name.trim() ? null : 'Enter your first name.',
    email: EMAIL.test(email.trim()) ? null : 'Enter a valid email, like you@example.com.',
    password: passwordIssues(password).length ? `Needs ${passwordIssues(password).join(', ')}.` : null,
    agree: agree ? null : 'Please accept the Terms and Privacy Policy to continue.',
  };
  const show = (k) => (touched[k] ? issues[k] : null);
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setTouched({ name: true, email: true, password: true, agree: true });
    if (Object.values(issues).some(Boolean)) return;
    if (trap) return onSent(email.trim().toLowerCase()); // bots get a quiet fake success
    setBusy(true);
    try {
      track('signup');
      const { needsConfirmation } = await api.signUp({ email: email.trim().toLowerCase(), password, displayName: name.trim() });
      if (needsConfirmation) onSent(email.trim().toLowerCase());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack-16" onSubmit={submit} noValidate>
      <FloatingField label="First name" value={name} onChange={(e) => setName(e.target.value)} onBlur={blur('name')} error={show('name')} autoComplete="given-name" maxLength={40} required />
      <FloatingField label="Email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={blur('email')} error={show('email')} autoComplete="email" autoCapitalize="none" spellCheck="false" required />
      <PasswordField value={password} onChange={setPassword} onBlur={blur('password')} invalid={show('password')} autoComplete="new-password" showMeter />
      <div className="hp" aria-hidden="true">
        <label htmlFor="su-company">Company</label>
        <input id="su-company" name="company" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
      </div>
      <div className="stack-4">
        <label className="consent">
          <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setTouched((t) => ({ ...t, agree: true })); }} aria-invalid={show('agree') ? 'true' : undefined} aria-describedby={show('agree') ? 'su-agree-err' : undefined} />
          <span>I agree to the <Link to="/terms" target="_blank">Terms</Link> and <Link to="/privacy" target="_blank">Privacy Policy</Link>. If I am under 18, a parent or guardian agrees too.</span>
        </label>
        {show('agree') && <span id="su-agree-err" className="field-error" role="alert">{show('agree')}</span>}
      </div>
      <FormError error={error} />
      <button className="btn btn--primary" disabled={busy}>{busy ? <Spinner /> : 'Create free account'}</button>
      <SocialProof stats={stats} />
    </form>
  );
}

function SignInForm() {
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
    <form className="stack-16" onSubmit={submit} noValidate>
      <FloatingField label="Email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoCapitalize="none" spellCheck="false" required />
      <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />
      <div className="between">
        <span />
        <Link to="/forgot" replace className="link t-foot">Forgot password?</Link>
      </div>
      <FormError error={error} />
      <button className="btn btn--primary" disabled={busy}>{busy ? <Spinner /> : 'Sign in'}</button>
    </form>
  );
}

function ForgotForm() {
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
  if (sent) {
    return (
      <div className="stack-16">
        <div className="alert alert--info" role="status">
          If an account exists for {email.trim()}, a reset link is on its way. Open it on this device.
        </div>
        <Link to="/signin" replace className="btn btn--secondary">Back to sign in</Link>
      </div>
    );
  }
  return (
    <form className="stack-16" onSubmit={submit} noValidate>
      <FloatingField label="Email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoCapitalize="none" spellCheck="false" required />
      <FormError error={error} />
      <button className="btn btn--primary" disabled={busy}>{busy ? <Spinner /> : 'Send reset link'}</button>
      <Link to="/signin" replace className="btn btn--ghost">Back to sign in</Link>
    </form>
  );
}

function FormError({ error }) {
  return (
    <AnimatePresence initial={false}>
      {error && (
        <motion.div
          key={error}
          className="alert"
          role="alert"
          initial={{ opacity: 0, height: 0, x: 0 }}
          animate={{ opacity: 1, height: 'auto', x: [0, -4, 4, -4, 0] }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: duration.slow }}
        >
          {error}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CheckInbox({ email }) {
  const [cooldown, setCooldown] = useState(60);
  const [note, setNote] = useState(null);
  useEffect(() => {
    if (cooldown <= 0) return undefined;
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
    <motion.div className="auth-panel stack-16 center center-x" {...formMotion}>
      <span className="inbox-icon"><MailCheck size={30} aria-hidden="true" /></span>
      <h1 className="t-h1">Check your inbox</h1>
      <p className="t-body">
        We sent a confirmation link to <b className="c-fg">{email}</b>. Open it on this device to finish creating your account.
      </p>
      <button type="button" className="btn btn--secondary btn--md" onClick={resend} disabled={cooldown > 0}>
        {cooldown > 0 ? <>Resend in <span className="fig">{cooldown}s</span></> : 'Resend email'}
      </button>
      {note && <p className="t-foot" role="status">{note}</p>}
      <Link to="/signin" className="btn btn--ghost">Go to sign in</Link>
    </motion.div>
  );
}

export function ResetPassword() {
  const navigate = useNavigate();
  const { session, showToast } = useApp();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

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
    <AuthLayout mood={session === null ? 'wrong' : 'think'}>
      <div className="auth-panel stack-24">
        {session === null ? (
          <>
            <header className="stack-8">
              <h1 className="t-h1">This link has expired</h1>
              <p className="t-body">Reset links work once and for one hour. Request a new one and open it on this device.</p>
            </header>
            <Link to="/forgot" className="btn btn--primary">Request a new link</Link>
          </>
        ) : (
          <>
            <header className="stack-8">
              <h1 className="t-h1">Choose a new password</h1>
              <p className="t-body">You’ll stay signed in on this device.</p>
            </header>
            <form className="stack-16" onSubmit={submit} noValidate>
              <PasswordField value={password} onChange={setPassword} autoComplete="new-password" label="New password" showMeter />
              <PasswordField value={confirm} onChange={setConfirm} autoComplete="new-password" label="Confirm new password" />
              <FormError error={error} />
              <button className="btn btn--primary" disabled={busy}>{busy ? <Spinner /> : 'Save password'}</button>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
