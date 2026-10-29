import { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Award, BookOpen, Clock, CreditCard, Flame, LogOut, Pencil, Trash2, Trophy, Zap, CircleCheck } from 'lucide-react';
import { api } from '../lib/api';
import { useApp } from '../app/AppContext';
import { LargeTitle, Page, Sheet } from '../components/chrome';
import { Avatar, Chevron, LevelBadge, PlanChip, Skeleton, Spinner, TIER_LABEL } from '../components/bits';
import { Radar } from '../components/charts';
import MemberCard from '../components/MemberCard';
import { BRAND, IS_DEMO } from '../lib/config';
import { longDate, money, number, percent } from '../lib/format';

const days = (n) => `${n} ${n === 1 ? 'day' : 'days'}`;
const BADGE_ICON = { 'first-deal': CircleCheck, 'hat-trick': Zap, 'on-fire': Flame, 'fast-hands': Clock, 'module-clear': BookOpen, associate: Trophy };

export default function Profile() {
  const { me, openPaywall, refreshMe, showToast } = useApp();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(null); // 'edit' | 'cancel' | 'delete'

  if (!me) return <Page><Skeleton height={120} /><Skeleton height={160} /><Skeleton height={300} /></Page>;
  const { profile, tier, subscription: sub } = me;
  const elite = tier.id === 'elite';

  const stats = [
    ['Vantaris score', number(profile.points)],
    ['Accuracy', percent(profile.accuracy)],
    ['Streak', days(profile.streak)],
    ['Best streak', days(profile.streak_best)],
  ];

  return (
    <Page>
      <LargeTitle title="Profile" />

      <div className="row" style={{ gap: 16 }}>
        <Avatar name={profile.display_name} variant={elite ? 'gold' : 'me'} size="lg" />
        <div className="grow stack-4">
          <h2 className="t-title" style={{ fontSize: 26 }}>{profile.display_name}</h2>
          <div className="row-8 wrap">
            <LevelBadge level={profile.level} />
            <PlanChip tier={tier.id} />
            {profile.school && <span className="t-foot ellipsis">{profile.school}</span>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {stats.map(([label, value]) => (
          <div key={label} className="card" style={{ padding: 16 }}>
            <div className="fig" style={{ fontSize: 24, fontWeight: 600 }}>{value}</div>
            <div className="t-foot">{label}</div>
          </div>
        ))}
      </div>

      <section className="stack-8">
        <div className="section-head"><h2>Skills map</h2><span className="t-foot">Problems solved per module</span></div>
        <div className="card" style={{ padding: '8px 4px' }}><Radar skills={me.skills} /></div>
      </section>

      <section className="stack-8">
        <div className="section-head"><h2>Member card</h2>{!elite && <span className="t-foot">Elite</span>}</div>
        <MemberCard name={profile.display_name} level={profile.level} score={profile.points} locked={!elite} onLockedClick={() => openPaywall('eliteCard')} />
        {elite && <p className="t-foot center">Drag to tilt your card</p>}
      </section>

      <section className="stack-8">
        <div className="section-head"><h2>Achievements</h2><span className="t-foot fig">{me.achievements.filter((a) => a.earned).length}/{me.achievements.length}</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          {me.achievements.map((a) => {
            const Icon = BADGE_ICON[a.id] ?? Award;
            return (
              <div key={a.id} className="card stack-8 center" style={{ padding: '16px 8px', alignItems: 'center', opacity: a.earned ? 1 : 0.55 }}>
                <span style={{ width: 44, height: 44, borderRadius: 22, display: 'grid', placeItems: 'center', background: a.earned ? 'linear-gradient(160deg, var(--brass-bright), var(--brass))' : 'var(--surface-2)', color: a.earned ? '#1E1606' : 'var(--fg-3)' }}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="t-label c-fg" style={{ fontSize: 13 }}>{a.name}</span>
                <span className="t-cap">{a.earned ? 'Earned' : a.detail}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <p className="group-label">Plan</p>
        <div className="group">
          <div className="cell">
            <span className="grow cell-title">{TIER_LABEL[tier.id]}{sub && tier.id !== 'free' ? ` · ${sub.interval === 'yearly' ? 'yearly' : 'monthly'}` : ''}</span>
            <span className="cell-value fig">{sub && tier.id !== 'free' ? `${money(sub.amount, sub.currency)}/${sub.interval === 'yearly' ? 'yr' : 'mo'}` : '3 problems a week'}</span>
          </div>
          {sub && tier.id !== 'free' && (
            <>
              <div className="cell">
                <span className="grow cell-title">{sub.cancel_at_cycle_end ? 'Access until' : sub.status === 'pending' ? 'Payment retrying' : 'Renews on'}</span>
                <span className="cell-value">{longDate(sub.current_end)}</span>
              </div>
              {sub.payment_method?.card_last4 && (
                <div className="cell">
                  <CreditCard size={18} className="c-3" aria-hidden="true" />
                  <span className="grow cell-title">{sub.payment_method.card_network ?? 'Card'} ending {sub.payment_method.card_last4}</span>
                </div>
              )}
              {!sub.livemode && <div className="cell"><span className="grow cell-sub">Test mode: no real money was charged.</span></div>}
            </>
          )}
          <Link to="/plans" className="cell cell--accent">
            <span className="grow cell-title">{tier.id === 'free' ? 'See plans' : 'Compare plans'}</span>
            <Chevron />
          </Link>
          {sub && tier.id !== 'free' && !sub.cancel_at_cycle_end && (
            <button type="button" className="cell cell--danger" onClick={() => setSheet('cancel')}>
              <span className="grow cell-title">Cancel subscription</span>
            </button>
          )}
        </div>
        {sub?.status === 'pending' && <p className="group-note">Your last renewal didn’t go through. Razorpay is retrying; update your payment method from the link in their email.</p>}
      </section>

      <section>
        <p className="group-label">Account</p>
        <div className="group">
          <button type="button" className="cell" onClick={() => setSheet('edit')}>
            <Pencil size={18} className="c-3" aria-hidden="true" />
            <span className="grow cell-title">Edit name and school</span>
            <Chevron />
          </button>
          <button type="button" className="cell" onClick={() => api.signOut().then(() => navigate('/welcome', { replace: true }))}>
            <LogOut size={18} className="c-3" aria-hidden="true" />
            <span className="grow cell-title">Sign out</span>
          </button>
          <button type="button" className="cell cell--danger" onClick={() => setSheet('delete')}>
            <Trash2 size={18} className="c-neg" aria-hidden="true" />
            <span className="grow cell-title">Delete account</span>
          </button>
        </div>
      </section>

      {IS_DEMO && api.demo && <PreviewControls onChange={() => refreshMe().then(() => showToast('Preview updated', 'success'))} />}

      <p className="t-cap center">{BRAND.name} · Payments by Razorpay · {BRAND.support}</p>

      <EditSheet key={sheet === 'edit' ? 'edit-open' : 'edit'} open={sheet === 'edit'} onClose={() => setSheet(null)} />
      <CancelSheet open={sheet === 'cancel'} onClose={() => setSheet(null)} sub={sub} />
      <DeleteSheet key={sheet === 'delete' ? 'del-open' : 'del'} open={sheet === 'delete'} onClose={() => setSheet(null)} hasSub={Boolean(sub && tier.id !== 'free')} />
    </Page>
  );
}

function EditSheet({ open, onClose }) {
  const id = useId();
  const { me, setMe, showToast } = useApp();
  const [name, setName] = useState(me.profile.display_name);
  const [school, setSchool] = useState(me.profile.school ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setMe(await api.saveProfile({ displayName: name, school }));
      showToast('Profile saved', 'success');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose}>
      {(titleId) => (
        <form className="sheet-body" onSubmit={save}>
          <h2 id={titleId} className="t-title-2">Edit profile</h2>
          <div className="field">
            <label htmlFor={`${id}-n`}>First name</label>
            <input id={`${id}-n`} className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required />
          </div>
          <div className="field">
            <label htmlFor={`${id}-s`}>School</label>
            <input id={`${id}-s`} className="input" value={school} onChange={(e) => setSchool(e.target.value)} maxLength={80} />
            <span className="hint">Shown next to your name on the leaderboard. Leave empty to hide it.</span>
          </div>
          {error && <div className="alert" role="alert">{error}</div>}
          <button className="btn btn--accent" disabled={busy}>{busy ? <Spinner /> : 'Save changes'}</button>
        </form>
      )}
    </Sheet>
  );
}

function CancelSheet({ open, onClose, sub }) {
  const { refreshMe, showToast } = useApp();
  const [busy, setBusy] = useState(false);
  const cancel = async () => {
    setBusy(true);
    try {
      await api.cancelSubscription();
      await refreshMe();
      showToast('Subscription cancelled. You keep access until the end of the period.', 'success');
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose}>
      {(titleId) => (
        <div className="sheet-body">
          <h2 id={titleId} className="t-title-2">Cancel your subscription?</h2>
          <p className="t-callout">
            You won’t be charged again. You keep {TIER_LABEL[sub?.tier]} until {longDate(sub?.current_end)}, then move to the free plan. Your progress stays.
          </p>
          <div className="stack-8">
            <button type="button" className="btn btn--accent" onClick={onClose}>Keep my plan</button>
            <button type="button" className="btn btn--gray" style={{ color: 'var(--neg)' }} onClick={cancel} disabled={busy}>
              {busy ? <Spinner /> : 'Cancel subscription'}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function DeleteSheet({ open, onClose, hasSub }) {
  const id = useId();
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const del = async () => {
    setBusy(true);
    try {
      await api.deleteAccount();
      await api.signOut();
      showToast('Your account was deleted', 'success');
      navigate('/welcome', { replace: true });
    } catch (err) {
      showToast(err.message, 'error');
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose}>
      {(titleId) => (
        <div className="sheet-body">
          <h2 id={titleId} className="t-title-2">Delete your account</h2>
          <p className="t-callout">
            This permanently deletes your profile, progress and ranking.{hasSub ? ' Your subscription is cancelled right away and won’t renew.' : ''} Payment receipts are kept for accounting, without your name.
          </p>
          <div className="field">
            <label htmlFor={`${id}-c`}>Type DELETE to confirm</label>
            <input id={`${id}-c`} className="input" value={text} onChange={(e) => setText(e.target.value)} autoCapitalize="characters" autoComplete="off" />
          </div>
          <button type="button" className="btn" style={{ background: 'var(--neg)', color: '#fff' }} disabled={text !== 'DELETE' || busy} onClick={del}>
            {busy ? <Spinner /> : 'Delete my account'}
          </button>
        </div>
      )}
    </Sheet>
  );
}

function PreviewControls({ onChange }) {
  const { me } = useApp();
  const run = (fn) => () => {
    fn();
    onChange();
  };
  return (
    <section>
      <p className="group-label">Preview controls (not in the real app)</p>
      <div className="card stack-12">
        <div className="row-8 wrap">
          {['free', 'core', 'pro', 'elite'].map((t) => (
            <button key={t} type="button" className={`btn btn--sm ${me.tier.id === t ? 'btn--accent' : 'btn--gray'}`} onClick={run(() => api.demo.setTier(t))}>
              {TIER_LABEL[t]}
            </button>
          ))}
        </div>
        <div className="row-8 wrap">
          <button type="button" className="btn btn--sm btn--gray" onClick={run(() => api.demo.loadSample())}>Load sample progress</button>
          <button type="button" className="btn btn--sm btn--gray" onClick={run(() => api.demo.resetWeek())}>Reset weekly quota</button>
          <button type="button" className="btn btn--sm btn--gray" onClick={run(() => api.demo.reset())}>Erase progress</button>
        </div>
      </div>
    </section>
  );
}
