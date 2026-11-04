import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Accessibility, Award, Box, BookOpen, Check, CircleCheck, Clock, Cookie, CreditCard, FileText, Flame, LogOut, Mail, PartyPopper, Pencil, Shield, Trash2, Trophy, Vibrate, X, Zap,
} from 'lucide-react';
import { api } from '../lib/api';
import { useApp } from '../app/AppContext';
import { resetConsent } from '../app/consent';
import { setPref, usePrefs } from '../app/prefs';
import { CountUp, Item, LargeTitle, Page, Segmented, Sheet } from '../components/chrome';
import { Avatar, Chevron, PlanChip, Skeleton, Spinner, TIER_LABEL, TierBadge } from '../components/bits';
import { ActivityChart, Radar } from '../components/charts';
import { FloatingField, ProgressBar, Toggle } from '../components/ui';
import MemberCard from '../components/MemberCard';
import { group, item } from '../design/motion';
import { stagger } from '../design/tokens';
import { BRAND, IS_DEMO } from '../lib/config';
import { longDate, money, number, relative } from '../lib/format';
import './Profile.css';
import { useMeta } from '../app/useMeta';

const BADGE_ICON = { 'first-deal': CircleCheck, 'hat-trick': Zap, 'on-fire': Flame, 'fast-hands': Clock, 'module-clear': BookOpen, associate: Trophy };

const SETTINGS = [
  { key: 'haptics', label: 'Haptic feedback', detail: 'A light tap on answers and level-ups (phones that support it).', Icon: Vibrate },
  { key: 'celebrations', label: 'Celebrations', detail: 'A short burst when you close a deal or get promoted.', Icon: PartyPopper },
  { key: 'effects3d', label: '3D graphics', detail: 'The chrome mascot in 3D on capable devices.', Icon: Box },
  { key: 'reduceMotion', label: 'Reduce motion', detail: 'Calmer transitions and no looping animations, on top of your system setting.', Icon: Accessibility },
];

const TABS = [
  { value: 'progress', label: 'Progress' },
  { value: 'settings', label: 'Settings' },
];

export default function Profile() {
  useMeta({ title: 'Profile' });
  const { me, openPaywall, refreshMe, showToast } = useApp();
  const navigate = useNavigate();
  const prefs = usePrefs();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'settings' ? 'settings' : 'progress';
  const [sheet, setSheet] = useState(null); // 'edit' | 'cancel' | 'delete'

  if (!me) return <Page wide><Skeleton height={160} /><Skeleton height={44} /><Skeleton height={300} /></Page>;
  const { profile, tier, subscription: sub } = me;
  const elite = tier.id === 'elite';
  const paid = Boolean(sub && tier.id !== 'free');
  const span = profile.next_level_at != null ? profile.next_level_at - profile.level_floor : 1;
  const progress = profile.next_level_at != null ? (profile.points - profile.level_floor) / span : 1;
  const earned = me.achievements.filter((a) => a.earned).length;

  return (
    <Page wide>
      <LargeTitle title="Profile" eyebrow={profile.school || 'Your desk'} />

      <Item className="pf-id">
        <div className="row-16">
          <Avatar name={profile.display_name} variant="me" />
          <div className="stack-4 grow">
            <h2 className="t-h3">{profile.display_name}</h2>
            <div className="row-8 wrap">
              <TierBadge level={profile.level} />
              <PlanChip tier={tier.id} />
              <span className="t-cap">Since {longDate(profile.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="stack-8">
          <div className="between">
            <span className="t-label">{profile.next_level ? <>Progress to <span className="c-fg">{profile.next_level}</span></> : 'Top of the ladder'}</span>
            <span className="t-cap"><span className="fig c-fg">{number(profile.points)}</span> pts{profile.next_level_at != null && <> · <span className="fig">{profile.next_level_at - profile.points}</span> to go</>}</span>
          </div>
          <ProgressBar value={progress} size="sm" label={`Progress to ${profile.next_level ?? 'the top'}`} />
        </div>
      </Item>

      <Item className="pf-tabs">
        <Segmented value={tab} onChange={(v) => setParams(v === 'settings' ? { tab: v } : {}, { replace: true })} options={TABS} label="Profile sections" />
      </Item>

      {tab === 'progress' ? (
        <>
          <Item as="dl" className="pf-stats" aria-label="Your record">
            <div><dt>Solved</dt><dd className="fig"><CountUp to={profile.solved} /><span className="unit">of {profile.attempted}</span></dd></div>
            <div><dt>Accuracy</dt><dd className="fig">{profile.accuracy != null ? <CountUp to={Math.round(profile.accuracy * 100)} format={(v) => `${Math.round(v)}%`} /> : '—'}</dd></div>
            <div><dt>Best streak</dt><dd className="fig"><CountUp to={profile.streak_best} /><span className="unit">days</span></dd></div>
          </Item>

          <Item as="section" className="stack-12" aria-labelledby="act">
            <div className="section-head">
              <h2 id="act">This week</h2>
              <span className="t-foot"><span className="fig c-fg">{number(me.week.reduce((s, d) => s + d.points, 0))}</span> pts</span>
            </div>
            <ActivityChart week={me.week} />
          </Item>

          <Item as="section" className="stack-12" aria-labelledby="rec">
            <div className="section-head"><h2 id="rec">Recent deals</h2><Link to="/practice" className="link t-foot">All deals</Link></div>
            {me.recent.length ? (
              <div className="group">
                {me.recent.map((r) => (
                  <button key={r.id} type="button" className="cell" onClick={() => navigate(`/practice/${r.id}`)}>
                    <span className={`pstat ${r.correct ? 'pstat--correct' : 'pstat--wrong'}`} aria-label={r.correct ? 'Correct' : 'Incorrect'}>
                      {r.correct ? <Check size={14} strokeWidth={2} /> : <X size={14} strokeWidth={2} />}
                    </span>
                    <span className="grow">
                      <span className="cell-title" style={{ display: 'block' }}>{r.title}</span>
                      <span className="cell-sub">{r.kind} · {relative(r.submitted_at)}</span>
                    </span>
                    <span className={`fig ${r.points ? 'c-pos' : 'c-3'}`}>{r.points ? `+${r.points}` : '0'}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="t-callout">Your closed deals land here.</p>
            )}
          </Item>

          <div className="pf-two">
            <Item as="section" className="stack-12" aria-labelledby="skills">
              <div className="section-head"><h2 id="skills">Skills</h2><span className="t-foot">Solved per module</span></div>
              <Radar skills={me.skills} />
            </Item>
            <Item as="section" className="stack-12" aria-labelledby="ach">
              <div className="section-head"><h2 id="ach">Achievements</h2><span className="t-foot fig">{earned}/{me.achievements.length}</span></div>
              <Achievements achievements={me.achievements} />
            </Item>
          </div>

          <Item as="section" className="stack-12" aria-labelledby="card">
            <div className="section-head"><h2 id="card">Member card</h2>{!elite && <span className="t-foot">Elite</span>}</div>
            <MemberCard name={profile.display_name} level={profile.level} score={profile.points} locked={!elite} onLockedClick={() => openPaywall('eliteCard')} />
          </Item>
        </>
      ) : (
        <>
          <Item as="section" className="stack-12" aria-labelledby="plan">
            <div className="section-head"><h2 id="plan">Plan</h2></div>
            <div className="pf-sub stack-12">
              <div className="between">
                <span className="t-h3">{TIER_LABEL[tier.id]}</span>
                <span className="fig t-headline">{paid ? `${money(sub.amount, sub.currency)}/${sub.interval === 'yearly' ? 'yr' : 'mo'}` : '₹0'}</span>
              </div>
              {paid ? (
                <div className="stack-8">
                  <div className="between t-callout"><span>{sub.cancel_at_cycle_end ? 'Access until' : sub.status === 'pending' ? 'Payment retrying' : 'Renews on'}</span><span className="c-fg">{longDate(sub.current_end)}</span></div>
                  {sub.payment_method?.card_last4 && (
                    <div className="between t-callout"><span className="row-8"><CreditCard size={16} aria-hidden="true" /> Payment</span><span className="c-fg">{sub.payment_method.card_network ?? 'Card'} ending {sub.payment_method.card_last4}</span></div>
                  )}
                  {!sub.livemode && <p className="t-cap">Test mode: no real money was charged.</p>}
                  {sub.status === 'pending' && <p className="alert">Your last renewal didn’t go through. Razorpay is retrying; update your payment method from the link in their email.</p>}
                </div>
              ) : (
                <p className="t-callout">Three deals a week and the Analyst desk.</p>
              )}
              <div className="row-8 wrap">
                <Link to="/plans" className={`btn ${paid ? 'btn--secondary' : 'btn--primary'} btn--md btn--auto`}>{paid ? 'Compare plans' : 'See plans'}</Link>
                {paid && !sub.cancel_at_cycle_end && <button type="button" className="btn btn--ghost btn--md btn--auto" onClick={() => setSheet('cancel')}>Cancel subscription</button>}
              </div>
            </div>
          </Item>

          <Item as="section" className="stack-12" aria-labelledby="prefs">
            <div className="section-head"><h2 id="prefs">Preferences</h2></div>
            <div className="group">
              {SETTINGS.map(({ key, label, detail, Icon }) => (
                <div key={key} className="cell setting">
                  <Icon size={18} className="c-3" aria-hidden="true" />
                  <label className="grow" htmlFor={`pref-${key}`}>
                    <span className="cell-title" style={{ display: 'block' }}>{label}</span>
                    <span className="cell-sub">{detail}</span>
                  </label>
                  <Toggle id={`pref-${key}`} checked={prefs[key]} onChange={(v) => setPref(key, v)} label={label} />
                </div>
              ))}
            </div>
          </Item>

          <Item as="section" className="stack-12" aria-labelledby="acct">
            <div className="section-head"><h2 id="acct">Account</h2></div>
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
                <Trash2 size={18} aria-hidden="true" />
                <span className="grow cell-title">Delete account</span>
              </button>
            </div>
          </Item>

          <Item as="section" className="stack-12" aria-labelledby="legal">
            <div className="section-head"><h2 id="legal">Privacy and legal</h2></div>
            <div className="group">
              <button type="button" className="cell" onClick={resetConsent}>
                <Cookie size={18} className="c-3" aria-hidden="true" />
                <span className="grow cell-title">Cookie settings</span>
                <Chevron />
              </button>
              <Link to="/privacy" className="cell"><Shield size={18} className="c-3" aria-hidden="true" /><span className="grow cell-title">Privacy policy</span><Chevron /></Link>
              <Link to="/terms" className="cell"><FileText size={18} className="c-3" aria-hidden="true" /><span className="grow cell-title">Terms of service</span><Chevron /></Link>
              <Link to="/contact" className="cell"><Mail size={18} className="c-3" aria-hidden="true" /><span className="grow cell-title">Contact and grievances</span><Chevron /></Link>
            </div>
          </Item>

          {IS_DEMO && api.demo && <PreviewControls onChange={() => refreshMe().then(() => showToast('Preview updated', 'success'))} />}
          <Item as="p" className="t-cap center">{BRAND.name} · Payments by Razorpay · {BRAND.support}</Item>
        </>
      )}

      <EditSheet key={sheet === 'edit' ? 'edit-open' : 'edit'} open={sheet === 'edit'} onClose={() => setSheet(null)} />
      <CancelSheet open={sheet === 'cancel'} onClose={() => setSheet(null)} sub={sub} />
      <DeleteSheet key={sheet === 'delete' ? 'del-open' : 'del'} open={sheet === 'delete'} onClose={() => setSheet(null)} hasSub={paid} />
    </Page>
  );
}

function Achievements({ achievements }) {
  return (
    <motion.ol className="badges" variants={group(stagger.children)} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
      {achievements.map((a) => {
        const Icon = BADGE_ICON[a.id] ?? Award;
        return (
          <motion.li key={a.id} variants={item} className={`badge ${a.earned ? 'is-earned' : ''}`}>
            <span className="badge-mark"><Icon size={18} strokeWidth={1.5} aria-hidden="true" /></span>
            <span className="grow stack-4">
              <span className="t-label c-fg">{a.name}</span>
              <span className="t-cap">{a.earned ? 'Earned' : a.detail}</span>
            </span>
          </motion.li>
        );
      })}
    </motion.ol>
  );
}

function EditSheet({ open, onClose }) {
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
          <h2 id={titleId} className="t-h3">Edit profile</h2>
          <FloatingField label="First name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required />
          <FloatingField label="School (optional)" placeholder="Your school" value={school} onChange={(e) => setSchool(e.target.value)} maxLength={80} hint="Shown next to your name on the leaderboard. Leave empty to hide it." />
          {error && <div className="alert" role="alert">{error}</div>}
          <button className="btn btn--primary" disabled={busy}>{busy ? <Spinner /> : 'Save changes'}</button>
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
          <h2 id={titleId} className="t-h3">Cancel your subscription?</h2>
          <p className="t-callout">
            You won’t be charged again. You keep {TIER_LABEL[sub?.tier]} until {longDate(sub?.current_end)}, then move to the free plan. Your progress stays.
          </p>
          <div className="stack-8">
            <button type="button" className="btn btn--primary" onClick={onClose}>Keep my plan</button>
            <button type="button" className="btn btn--danger" onClick={cancel} disabled={busy}>
              {busy ? <Spinner /> : 'Cancel subscription'}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function DeleteSheet({ open, onClose, hasSub }) {
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
          <h2 id={titleId} className="t-h3">Delete your account</h2>
          <p className="t-callout">
            This permanently deletes your profile, progress and ranking.{hasSub ? ' Your subscription is cancelled right away and won’t renew.' : ''} Payment receipts are kept for accounting, without your name.
          </p>
          <FloatingField label="Type DELETE to confirm" value={text} onChange={(e) => setText(e.target.value)} autoCapitalize="characters" autoComplete="off" />
          <button type="button" className="btn btn--danger-solid" disabled={text !== 'DELETE' || busy} onClick={del}>
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
    <Item as="section" className="stack-8">
      <p className="group-label">Preview controls (not in the real app)</p>
      <div className="card stack-12">
        <div className="row-8 wrap">
          {['free', 'core', 'pro', 'elite'].map((t) => (
            <button key={t} type="button" className={`btn btn--sm ${me.tier.id === t ? 'btn--primary' : 'btn--secondary'}`} onClick={run(() => api.demo.setTier(t))}>
              {TIER_LABEL[t]}
            </button>
          ))}
        </div>
        <div className="row-8 wrap">
          <button type="button" className="btn btn--sm btn--secondary" onClick={run(() => api.demo.loadSample())}>Load sample progress</button>
          <button type="button" className="btn btn--sm btn--secondary" onClick={run(() => api.demo.resetWeek())}>Reset weekly quota</button>
          <button type="button" className="btn btn--sm btn--secondary" onClick={run(() => api.demo.reset())}>Erase progress</button>
        </div>
      </div>
    </Item>
  );
}
