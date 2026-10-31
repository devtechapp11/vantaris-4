import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUp, BookOpen, Lightbulb, Sigma, X } from 'lucide-react';
import { api } from '../lib/api';
import { useApp } from '../app/AppContext';
import { useMedia, BREAKPOINT } from '../app/useDevice';
import { Sheet } from '../components/chrome';
import Mascot from '../components/Mascot';
import { RichText } from '../components/Formula';
import { spring } from '../design/tokens';
import './Tutor.css';

const PROMPTS = [
  { text: 'Give me a hint', Icon: Lightbulb },
  { text: 'What formula do I need?', Icon: Sigma },
  { text: 'Explain the concept', Icon: BookOpen },
];

/** Vale's expression for a reply. */
function moodFor(m) {
  if (!m) return 'welcome';
  if (m.error) return 'wrong';
  const t = m.text.toLowerCase();
  if (/the answer is|exactly|well done|that's right|correct/.test(t)) return 'correct';
  if (/hint|nudge|start with|try |formula|relationship|=/.test(t)) return 'think';
  return 'welcome';
}

const bubble = {
  initial: { opacity: 0, y: 14, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: spring.snappy },
};

/**
 * AI tutor. Opens as a floating panel above Vale's button on desktop and as a
 * full-height sheet on phones. `prompt` (e.g. from the hint button) is sent
 * automatically when the panel opens.
 */
export default function Tutor({ open, onClose, problem, submitted, prompt, onPromptUsed }) {
  const wide = useMedia(BREAKPOINT.tablet);
  const body = (titleId) => <Chat titleId={titleId} problem={problem} submitted={submitted} prompt={open ? prompt : null} onPromptUsed={onPromptUsed} onClose={onClose} wide={wide} />;
  if (!wide) {
    return <Sheet open={open} onClose={onClose} tall>{(titleId) => body(titleId)}</Sheet>;
  }
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="tutor-panel glass"
          role="dialog"
          aria-modal="false"
          aria-labelledby="tutor-title"
          initial={{ opacity: 0, scale: 0.85, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 16 }}
          transition={spring.snappy}
          style={{ originX: 1, originY: 1 }}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
        >
          {body('tutor-title')}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Messages live per problem for the session, so closing the panel doesn't lose them.
const threads = new Map();

function Chat({ titleId, problem, submitted, prompt, onPromptUsed, onClose, wide }) {
  const { me, refreshMe } = useApp();
  const reduce = useReducedMotion();
  const [messages, setMessagesState] = useState(() => threads.get(problem.id) ?? []);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(me?.tutor?.remaining ?? null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const sentPrompt = useRef(null);

  const setMessages = (fn) => setMessagesState((prev) => {
    const next = typeof fn === 'function' ? fn(prev) : fn;
    threads.set(problem.id, next);
    return next;
  });

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }, [messages, busy, reduce]);

  const unlimited = (me?.tier?.tutor_daily_limit ?? 0) >= 300;
  const out = remaining === 0 && !unlimited;

  const send = async (text) => {
    const clean = text.trim();
    if (!clean || busy || out) return;
    const next = [...messages, { role: 'user', text: clean }];
    setMessages(next);
    setDraft('');
    setBusy(true);
    try {
      const res = await api.askTutor(problem.id, next.slice(-12).map(({ role, text: t }) => ({ role, text: t })));
      setMessages((m) => [...m, { role: 'tutor', text: res.reply }]);
      setRemaining(res.remaining);
    } catch (err) {
      setMessages((m) => [...m, { role: 'tutor', text: err.message, error: true }]);
      if (err.remaining === 0) setRemaining(0);
    } finally {
      setBusy(false);
      refreshMe().catch(() => {});
    }
  };

  // Auto-send a prompt handed over by the hint button, once.
  const sendRef = useRef(send);
  const usedRef = useRef(onPromptUsed);
  useEffect(() => {
    sendRef.current = send;
    usedRef.current = onPromptUsed;
  });
  useEffect(() => {
    if (!prompt || sentPrompt.current === prompt) return;
    sentPrompt.current = prompt;
    usedRef.current?.();
    sendRef.current(prompt);
  }, [prompt]);

  const lastTutor = [...messages].reverse().find((m) => m.role === 'tutor');
  const headMood = busy ? 'think' : moodFor(lastTutor);

  return (
    <div className="chat">
      <header className="chat-head">
        <span className="chat-avatar"><Mascot mood={headMood} size={44} decorative /></span>
        <div className="grow stack-4" style={{ minWidth: 0 }}>
          <h2 id={titleId} className="t-headline">Vale <span className="chip chip--strong chat-badge">AI tutor</span></h2>
          <p className="t-cap ellipsis">
            {problem.title} · {unlimited ? 'unlimited messages' : remaining != null ? `${remaining} messages left today` : ''}
          </p>
        </div>
        {wide && <button type="button" className="icon-btn" onClick={onClose} aria-label="Close tutor"><X size={18} /></button>}
      </header>

      <div ref={listRef} className="chat-list" aria-live="polite">
        <Message m={{ role: 'tutor', text: submitted
          ? 'Ask me anything about the solution: why a step works, where the trap was, or how this comes up in interviews.'
          : 'Ask for a hint, the formula, or the idea behind this deal. I won’t give away the answer before you submit.' }} />
        {messages.map((m, i) => <Message key={i} m={m} />)}
        <AnimatePresence>
          {busy && (
            <motion.div className="msg msg--ai" {...bubble} exit={{ opacity: 0, y: 6 }} aria-label="Vale is typing">
              <span className="msg-avatar"><Mascot mood="think" size={30} decorative /></span>
              <span className="bubble bubble--ai typing">
                {[0, 1, 2].map((i) => (
                  <motion.i key={i} animate={reduce ? undefined : { y: [0, -6, 0] }} transition={{ duration: 0.75, repeat: Infinity, delay: i * 0.14, ease: 'easeInOut' }} />
                ))}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {messages.length < 2 && !busy && !out && (
        <div className="chat-prompts">
          {PROMPTS.map(({ text, Icon }) => (
            <button key={text} type="button" className="chip chat-prompt" onClick={() => send(text)}>
              <Icon size={14} className="c-fg" aria-hidden="true" /> {text}
            </button>
          ))}
        </div>
      )}

      <form className="composer" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
        <label htmlFor="tutor-input" className="sr-only">Message Vale</label>
        <textarea
          id="tutor-input"
          ref={inputRef}
          rows={1}
          value={draft}
          maxLength={1200}
          placeholder={out ? 'No messages left today' : 'Ask Vale about this deal'}
          disabled={out}
          onChange={(e) => {
            setDraft(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(140, e.target.scrollHeight)}px`;
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(draft);
            }
          }}
        />
        <motion.button className="send" disabled={!draft.trim() || busy || out} aria-label="Send" whileTap={{ scale: 0.9 }}>
          <ArrowUp size={20} strokeWidth={2.6} aria-hidden="true" />
        </motion.button>
      </form>
    </div>
  );
}

function Message({ m }) {
  if (m.role === 'user') {
    return (
      <motion.div className="msg msg--me" {...bubble}>
        <span className="bubble bubble--me">{m.text}</span>
      </motion.div>
    );
  }
  return (
    <motion.div className="msg msg--ai" {...bubble}>
      <span className="msg-avatar"><Mascot mood={moodFor(m)} size={30} decorative /></span>
      <span className={`bubble bubble--ai ${m.error ? 'bubble--error' : ''}`}><RichText text={m.text} /></span>
    </motion.div>
  );
}

/** Vale's 56px button in the bottom-right corner: opens the tutor. */
export function TutorFab({ onClick, locked, hidden }) {
  return (
    <AnimatePresence>
      {!hidden && (
        <motion.button
          type="button"
          className="vale-fab glass"
          onClick={onClick}
          aria-label={locked ? 'Vale, the AI tutor, available with Pro' : 'Ask Vale, the AI tutor'}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          transition={spring.bouncy}
        >
          <span className="vale-fab-ring" aria-hidden="true" />
          <Mascot mood="welcome" size={40} decorative />
          <span className="vale-fab-tip" aria-hidden="true">{locked ? 'Vale · Pro' : 'Ask Vale'}</span>
          {locked && <span className="vale-fab-lock" aria-hidden="true">PRO</span>}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
