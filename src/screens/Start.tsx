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
import { valeBus } from '../components/vale/valeBus';
import LessonShell from '../exercise/engine/LessonShell';
import ValeSeat from '../path/ValeSeat';
import SaveDesk from '../onboarding/SaveDesk';
import { loadState, reduce, saveState, type Desk, type GoalMinutes, type OnboardingEvent, type OnboardingState, type Profile } from '../onboarding/machine';
import FirstDealCard, { PENDING_KEY, gradeFirstDeal } from '../onboarding/FirstDealCard';
import { START_KEYS, put } from '../onboarding/keys';
import { DESK_LABEL, DESK_WIDTH } from '../vale/outfits/outfitRegistry';
import './Start.css';

type Api = {
  isAnonymous: () => Promise<boolean>;
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
  // The landing's act 3 already played the deal: close it here, as a guest, for the real XP.
  const [pending] = useState(() => {
    try {
      return sessionStorage.getItem(PENDING_KEY);
    } catch {
      return null;
    }
  });
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
          {s.step === 'deal' && (pending ? (
            <ClosePending choice={pending} onClosed={(xp) => send({ type: 'DEAL_CLOSED', xp })} />
          ) : (
            <FirstDealCard reduced={reduced} guest onClosed={(xp) => send({ type: 'DEAL_CLOSED', xp })} />
          ))}
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

/** The deal answered on the landing: sign in as a guest and close it on the server, then move on. */
function ClosePending({ choice, onClosed }: { choice: string; onClosed: (xp: number) => void }) {
  const done = useRef(onClosed);
  useEffect(() => {
    done.current = onClosed;
  });
  useEffect(() => {
    let live = true;
    gradeFirstDeal(choice, true).then((v) => {
      try {
        sessionStorage.removeItem(PENDING_KEY);
      } catch {
        /* nothing stored */
      }
      if (live) done.current(v.xp);
    });
    return () => {
      live = false;
    };
  }, [choice]);
  return <p className="st-note" role="status">Closing your first deal…</p>;
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
