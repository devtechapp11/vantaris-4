import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { api } from '../lib/api';
import { useApp } from '../app/AppContext';
import { useMeta } from '../app/useMeta';
import { usePrefs } from '../app/prefs';
import { timeZone } from '../lib/format';
import { sfx } from '../lib/sfx/engine';
import { haptic } from '../lib/haptics';
import { midasTouch } from '../lib/midas/midasTouch';
import { valeBus } from '../components/vale/valeBus';
import ThermalReceipt from '../components/receipt/ThermalReceipt';
import McqCard from '../exercise/engine/McqCard';
import LessonShell from '../exercise/engine/LessonShell';
import ValeSeat from '../path/ValeSeat';
import SaveDesk from '../onboarding/SaveDesk';
import { loadState, reduce, saveState, type Desk, type GoalMinutes, type OnboardingEvent, type OnboardingState, type Profile } from '../onboarding/machine';
import { FIRST_DEAL, FIRST_DEAL_BRIEF, FIRST_DEAL_TICKET } from '../onboarding/firstDeal';
import { START_KEYS, put } from '../onboarding/keys';
import { DESK_LABEL, DESK_WIDTH } from '../vale/outfits/outfitRegistry';
import type { SubmitResponse } from '../lib/exercises/schema';
import './Start.css';

type Api = {
  getSession: () => Promise<unknown>;
  signInAnonymously: () => Promise<void>;
  isAnonymous: () => Promise<boolean>;
  submitFirstDeal?: (req: unknown) => Promise<SubmitResponse | null>;
  creditDemo: (xp: number) => Promise<{ credited: number } | null>;
  saveProfile: (o: Record<string, unknown>) => Promise<unknown>;
};
const a = api as unknown as Api;

const PROFILES: { id: Profile; label: string }[] = [
  { id: 'school', label: 'High school' },
  { id: 'university', label: 'University' },
  { id: 'finance', label: 'Working in finance' },
  { id: 'curious', label: 'Just curious' },
];
const DESK_ORDER: Desk[] = ['analyst', 'associate', 'vp', 'md'];
const GOALS: { id: GoalMinutes; label: string }[] = [
  { id: 5, label: 'Casual' },
  { id: 10, label: 'Regular' },
  { id: 15, label: 'Serious' },
];
/** « High school » only calibrates the difficulty of the first lessons. */
const DIFFICULTY: Record<Profile, number> = { school: 1, curious: 1, university: 2, finance: 3 };

const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);


/**
 * /start: awaken → first deal → ambition → commitment → lesson 1 → save.
 * The player becomes a guest (anonymous sign-in) on their first answer, so
 * every XP is the server's; linking Google or an email keeps the same user.
 */
export default function Start() {
  (useMeta as (o: { title: string }) => void)({ title: 'Your first deal' });
  const navigate = useNavigate();
  const { me, refreshMe, showToast } = useApp() as unknown as {
    me: { profile: { points: number; onboarded: boolean } } | null;
    refreshMe: () => Promise<unknown>;
    showToast: (m: string, t?: string) => void;
  };
  const prefs = usePrefs() as { reduceMotion?: boolean };
  const reduced = Boolean(useReducedMotion() || prefs.reduceMotion);
  const [s, setS] = useState<OnboardingState>(loadState);
  const send = useCallback((e: OnboardingEvent) => {
    setS((prev) => {
      const next = reduce(prev, e);
      saveState(next);
      return next;
    });
  }, []);

  // Guests only see « Save your desk »; an account that already exists skips it.
  const [guest, setGuest] = useState<boolean | null>(null);
  useEffect(() => {
    a.isAnonymous().then(setGuest).catch(() => setGuest(false));
  }, [s.step]);

  const finish = useCallback(async () => {
    try {
      await a.saveProfile({ completeOnboarding: true, timezone: timeZone() });
    } catch {
      /* the server retries on the next profile save; never strand the player here */
    }
    put(START_KEYS.plansCard, '1');
    try {
      sessionStorage.removeItem('vt.onboarding.v1');
    } catch {
      /* nothing persisted */
    }
    await refreshMe().catch(() => {});
    navigate('/', { replace: true });
  }, [navigate, refreshMe]);

  useEffect(() => {
    if (s.step === 'done') finish();
  }, [s.step, finish]);

  return (
    <main className={`st st--${s.step}`} id="main">
      <AnimatePresence mode="wait" initial={false}>
        <motion.section
          key={s.step === 'aim' ? `aim-${s.profile ? 'desk' : 'who'}` : s.step}
          className="st-step"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
          transition={{ duration: reduced ? 0.15 : 0.32 }}
        >
          {s.step === 'awaken' && <Awaken reduced={reduced} onDone={() => send({ type: 'AWAKENED', now: Date.now() })} />}
          {s.step === 'deal' && <FirstDeal reduced={reduced} onClosed={(xp) => send({ type: 'DEAL_CLOSED', xp })} />}
          {s.step === 'aim' && !s.profile && (
            <Choice
              title="Who's playing?"
              items={PROFILES.map((p) => ({ id: p.id, label: p.label }))}
              onPick={(id) => {
                put(START_KEYS.profile, id);
                send({ type: 'PICK_PROFILE', profile: id as Profile });
              }}
            />
          )}
          {s.step === 'aim' && s.profile && (
            <Choice
              title="Which desk are you aiming for?"
              items={DESK_ORDER.map((d) => ({ id: d, label: DESK_LABEL[d].toUpperCase(), stretch: DESK_WIDTH[d] }))}
              desk
              onPick={(id) => send({ type: 'PICK_DESK', desk: id as Desk })}
            />
          )}
          {s.step === 'commit' && (
            <Commit
              desk={s.desk}
              reduced={reduced}
              onCommit={(goal) => {
                put(START_KEYS.goal, String(goal));
                send({ type: 'COMMIT', goal });
              }}
            />
          )}
          {s.step === 'lesson' && (
            <div className="st-lesson">
              <LessonShell
                skill="statements"
                title="The three statements"
                difficulty={DIFFICULTY[s.profile]}
                onExit={() => send({ type: 'LESSON_DONE', xp: 0 })}
                onDone={(xp) => {
                  refreshMe().catch(() => {});
                  send({ type: 'LESSON_DONE', xp });
                }}
              />
            </div>
          )}
          {s.step === 'save' && (
            guest === false ? (
              <AutoDone onDone={() => send({ type: 'SAVED' })} />
            ) : (
              <div className="st-save">
                <ValeSeat outfit={s.desk} reduced={reduced} size={120} />
                <h1 className="st-h1">Save your desk</h1>
                <p className="st-p">Your <b className="fig-mono">{me?.profile.points ?? s.lessonXp}</b> XP and your streak are yours. Make them permanent.</p>
                <SaveDesk
                  onSaved={async () => {
                    await a.saveProfile({ completeOnboarding: true, timezone: timeZone() }).catch(() => {});
                    put(START_KEYS.plansCard, '1');
                  }}
                  onLater={() => send({ type: 'SKIP_SAVE' })}
                  onContinue={() => send({ type: 'SAVED' })}
                />
                {guest === null && <p className="st-note" aria-live="polite">…</p>}
              </div>
            )
          )}
          {s.step === 'done' && <p className="st-note" role="status">Opening your desk…</p>}
        </motion.section>
      </AnimatePresence>
      {s.step !== 'awaken' && s.step !== 'lesson' && s.step !== 'done' && (
        <button
          type="button"
          className="st-exit"
          aria-label="Leave"
          onClick={() => {
            if (me?.profile.onboarded) navigate('/');
            else showToast('Your first deal takes 15 seconds. Lesson 1 takes two minutes.');
          }}
        >
          <X size={18} aria-hidden="true" />
        </button>
      )}
    </main>
  );
}

function AutoDone({ onDone }: { onDone: () => void }) {
  useEffect(() => onDone(), [onDone]);
  return null;
}

/** 1 · Vale wakes up in the dark (≤ 3 s, any tap skips). */
function Awaken({ reduced, onDone }: { reduced: boolean; onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, reduced ? 900 : 2600);
    return () => clearTimeout(t);
  }, [onDone, reduced]);
  return (
    <button type="button" className={`st-awaken ${reduced ? 'is-still' : ''}`} onClick={onDone} aria-label="Start">
      <ValeSeat outfit={null} reduced={reduced} size={typeof window !== 'undefined' && window.innerWidth >= 768 ? 320 : 220} />
    </button>
  );
}

/** 2 · The first deal: fixed content, graded by the server (key seeded there). */
function FirstDeal({ reduced, onClosed }: { reduced: boolean; onClosed: (xp: number) => void }) {
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState<{ correct: boolean; revealId?: string; xp: number } | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const point = useRef<{ x: number; y: number } | null>(null);
  const attempt = useRef(uuid());
  const session = useRef(uuid());

  const check = async () => {
    if (!choice || busy) return;
    setBusy(true);
    let res: SubmitResponse | null = null;
    let signedIn = Boolean(await a.getSession().catch(() => null));
    if (!signedIn) {
      try {
        await a.signInAnonymously();
        signedIn = true;
      } catch {
        signedIn = false; // guest desks are off on this project: the deal still plays, without XP
      }
    }
    if (signedIn) {
      try {
        res = (await a.submitFirstDeal?.({ sessionId: session.current, exerciseId: FIRST_DEAL.id, answer: { kind: 'mcq', choiceId: choice }, attemptId: attempt.current })) ?? null;
      } catch {
        res = null;
      }
    }
    let v: { correct: boolean; revealId?: string; xp: number };
    if (res) {
      v = { correct: res.correct, revealId: res.revealId, xp: res.xpAwarded };
    } else {
      // Edge Function not deployed yet: the answer is the ticket's public value; XP goes through the capped demo credit.
      const right = FIRST_DEAL.kind === 'mcq' ? FIRST_DEAL.choices.find((c) => c.label === FIRST_DEAL_TICKET.value)?.id : undefined;
      const correct = choice === right;
      const credit = correct && signedIn ? await a.creditDemo(10).catch(() => null) : null;
      v = { correct, revealId: right, xp: credit?.credited ?? 0 };
    }
    setVerdict(v);
    setBusy(false);
    const el = card.current?.querySelector<HTMLElement>(`[data-choice-id="${choice}"]`);
    if (v.correct) {
      if (el) midasTouch(el, point.current?.x, point.current?.y);
      sfx.correct(1);
      haptic('correct');
      valeBus.correct(1);
    } else {
      sfx.wrong();
      haptic('wrong');
      valeBus.wrong(card.current?.querySelector(`[data-choice-id="${v.revealId}"]`) ?? null);
    }
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (verdict) return;
      const n = Number(e.key);
      if (FIRST_DEAL.kind === 'mcq' && n >= 1 && n <= FIRST_DEAL.choices.length) {
        point.current = null;
        setChoice(FIRST_DEAL.choices[n - 1].id);
      }
      if (e.key === 'Enter' && choice) check();
    };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  });

  if (FIRST_DEAL.kind !== 'mcq') return null;
  return (
    <div className="st-deal" onPointerDown={(e) => (point.current = { x: e.clientX, y: e.clientY })}>
      <p className="st-kicker">Deal #{FIRST_DEAL_TICKET.number} · 15 seconds</p>
      <McqCard ref={card} ex={FIRST_DEAL} value={choice} onChange={setChoice} verdict={verdict} />
      {!verdict ? (
        <button type="button" className="btn btn--primary btn--lg st-cta" disabled={!choice || busy} onClick={check}>
          {busy ? 'Checking…' : 'Check'}
        </button>
      ) : (
        <div className="st-after" aria-live="polite">
          {verdict.correct ? (
            <ThermalReceipt
              heading={`DEAL #${FIRST_DEAL_TICKET.number}`}
              meta={FIRST_DEAL_BRIEF.title}
              lines={[
                { label: 'Type', value: FIRST_DEAL_TICKET.type },
                { label: 'Value', value: FIRST_DEAL_TICKET.value },
                { label: 'XP credited', value: `+${verdict.xp}`, strong: true },
              ]}
              stamp={FIRST_DEAL_TICKET.status}
              onPrinted={() => sfx.stamp()}
              print={!reduced}
            />
          ) : (
            <p className="st-verdict"><X size={16} aria-hidden="true" /> Not quite. The answer is {FIRST_DEAL_TICKET.value}.</p>
          )}
          <p className="st-brief"><b>{FIRST_DEAL_BRIEF.title}.</b> {FIRST_DEAL_BRIEF.takeaway}</p>
          <button type="button" className="btn btn--primary btn--lg st-cta" onClick={() => onClosed(verdict.xp)} autoFocus>Keep going</button>
        </div>
      )}
    </div>
  );
}

/** 3 · One tap, it moves on by itself. Desks are written at their own width. */
function Choice({ title, items, onPick, desk = false }: { title: string; items: { id: string; label: string; stretch?: string }[]; onPick: (id: string) => void; desk?: boolean }) {
  return (
    <div className="st-choice">
      <h1 className="st-h1">{title}</h1>
      <div className={`st-options ${desk ? 'st-options--desk' : ''}`}>
        {items.map((it, i) => (
          <button
            key={it.id}
            type="button"
            className="st-option"
            style={it.stretch ? { fontStretch: it.stretch } : undefined}
            onClick={() => {
              sfx.press();
              haptic('tap');
              onPick(it.id);
            }}
            autoFocus={i === 0}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 4 · The daily goal, sealed by Vale with a metal stamp. */
function Commit({ desk, reduced, onCommit }: { desk: Desk; reduced: boolean; onCommit: (g: GoalMinutes) => void }) {
  const [goal, setGoal] = useState<GoalMinutes | null>(null);
  const [sealed, setSealed] = useState(false);
  const commit = () => {
    if (!goal || sealed) return;
    setSealed(true);
    sfx.stamp();
    haptic('promotion');
    valeBus.react('delight');
    window.setTimeout(() => onCommit(goal), reduced ? 300 : 1100);
  };
  return (
    <div className="st-commit">
      <ValeSeat outfit={desk} reduced={reduced} size={120} />
      <h1 className="st-h1">Pick your daily goal</h1>
      <div className="st-goals" role="radiogroup" aria-label="Daily goal">
        {GOALS.map((g) => (
          <button key={g.id} type="button" role="radio" aria-checked={goal === g.id} className={`st-goal ${goal === g.id ? 'is-on' : ''}`} onClick={() => setGoal(g.id)} disabled={sealed}>
            <span className="st-goal-min fig-mono">{g.id} min</span>
            <span className="st-goal-label">{g.label}</span>
            {goal === g.id && <Check size={16} aria-hidden="true" className="st-goal-tick" />}
          </button>
        ))}
      </div>
      <div className="st-seal-wrap">
        <button type="button" className="btn btn--primary btn--lg st-cta" disabled={!goal || sealed} onClick={commit}>Commit to my goal</button>
        {sealed && <span className={`st-seal ${reduced ? 'is-still' : ''}`} aria-live="polite">COMMITTED · {goal} MIN</span>}
      </div>
    </div>
  );
}
