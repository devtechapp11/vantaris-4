import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../lib/api';
import { sfx } from '../lib/sfx/engine';
import { haptic } from '../lib/haptics';
import { midasTouch } from '../lib/midas/midasTouch';
import { valeBus } from '../components/vale/valeBus';
import ThermalReceipt from '../components/receipt/ThermalReceipt';
import McqCard from '../exercise/engine/McqCard';
import { FIRST_DEAL, FIRST_DEAL_BRIEF, FIRST_DEAL_TICKET } from './firstDeal';
import type { SubmitResponse } from '../lib/exercises/schema';
import '../exercise/engine/engine.css';
import './firstDeal.css';

type Api = {
  getSession: () => Promise<unknown>;
  signInAnonymously: () => Promise<void>;
  submitFirstDeal?: (req: unknown) => Promise<SubmitResponse | null>;
  creditDemo: (xp: number) => Promise<{ credited: number } | null>;
};
const a = api as unknown as Api;

const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

/** The landing's answer, handed to /start, which closes it on the server once the guest exists. */
export const PENDING_KEY = 'vt.firstDeal.pending';

type Sound = (fn: (s: typeof sfx) => void) => void;
type Props = {
  reduced: boolean;
  /** /start: sign in as a guest and let the server grade (real XP). The landing: graded here, no account, no XP. */
  guest: boolean;
  /** The landing routes sound through its SOUND pill (off by default). */
  sound?: Sound;
  onClosed: (xp: number, choice: string) => void;
};

/**
 * Grades the first deal. As a guest (/start): signs in anonymously if needed,
 * then submit-answer with the seeded key — the XP is the server's. Otherwise,
 * or while the function isn't deployed, the answer is checked against the
 * ticket's public value and any XP goes through the capped demo credit.
 */
export async function gradeFirstDeal(choice: string, guest: boolean, ids = { session: uuid(), attempt: uuid() }) {
  let res: SubmitResponse | null = null;
  let signedIn = guest && Boolean(await a.getSession().catch(() => null));
  if (guest && !signedIn) {
    try {
      await a.signInAnonymously();
      signedIn = true;
    } catch {
      signedIn = false; // guest desks are off on this project: the deal still plays, without XP
    }
  }
  if (signedIn) {
    try {
      res = (await a.submitFirstDeal?.({ sessionId: ids.session, exerciseId: FIRST_DEAL.id, answer: { kind: 'mcq', choiceId: choice }, attemptId: ids.attempt })) ?? null;
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
  return v;
}

/**
 * The first deal (landing act 3 and /start): fixed content, no AI latency.
 * The key lives on the server; the local fallback grades against the
 * ticket's value, which the player sees right after anyway.
 */
export default function FirstDealCard({ reduced, guest, sound = (fn) => fn(sfx), onClosed }: Props) {
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
    const v = await gradeFirstDeal(choice, guest, { session: session.current, attempt: attempt.current });
    setVerdict(v);
    setBusy(false);
    const el = card.current?.querySelector<HTMLElement>(`[data-choice-id="${choice}"]`);
    if (v.correct) {
      if (el) midasTouch(el, point.current?.x, point.current?.y);
      sound((x) => {
        x.correct(1);
        x.printFeed();
      });
      haptic('correct');
      valeBus.correct(1);
    } else {
      sound((x) => x.wrong());
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
    if (!guest) return undefined; // the landing scrolls with the keys
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
              onPrinted={() => sound((x) => x.stamp())}
              print={!reduced}
            />
          ) : (
            <p className="st-verdict"><X size={16} aria-hidden="true" /> Not quite. The answer is {FIRST_DEAL_TICKET.value}.</p>
          )}
          <p className="st-brief"><b>{FIRST_DEAL_BRIEF.title}.</b> {FIRST_DEAL_BRIEF.takeaway}</p>
          <button type="button" className="btn btn--primary btn--lg st-cta" onClick={() => onClosed(verdict.xp, choice ?? '')} autoFocus={guest}>Keep going</button>
        </div>
      )}
    </div>
  );
}

