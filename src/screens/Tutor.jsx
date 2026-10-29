import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUp, BookOpen, Lightbulb, Sigma } from 'lucide-react';
import { api } from '../lib/api';
import { useApp } from '../app/AppContext';
import { Sheet } from '../components/chrome';
import Mascot from '../components/Mascot';

const PROMPTS = [
  { text: 'Give me a hint', Icon: Lightbulb },
  { text: 'What formula do I need?', Icon: Sigma },
  { text: 'Explain the concept', Icon: BookOpen },
];

export default function Tutor({ open, onClose, problem, submitted }) {
  const { me, refreshMe } = useApp();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(me?.tutor?.remaining ?? null);
  const listRef = useRef(null);

  useEffect(() => setMessages([]), [problem.id]);
  useEffect(() => {
    if (open) setRemaining(me?.tutor?.remaining ?? null);
  }, [open, me?.tutor?.remaining]);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const send = async (text) => {
    const clean = text.trim();
    if (!clean || busy) return;
    const next = [...messages, { role: 'user', text: clean }];
    setMessages(next);
    setDraft('');
    setBusy(true);
    try {
      const res = await api.askTutor(problem.id, next.slice(-12));
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

  const unlimited = (me?.tier?.tutor_daily_limit ?? 0) >= 300;

  return (
    <Sheet open={open} onClose={onClose} tall>
      {(titleId) => (
        <>
          <div className="row" style={{ padding: '4px 60px 12px 20px', borderBottom: '0.5px solid var(--line-strong)' }}>
            <Mascot mood={busy ? 'think' : 'idle'} size={40} />
            <div className="grow">
              <h2 id={titleId} className="t-headline">Tutor</h2>
              <p className="t-cap ellipsis">
                {problem.title} · {unlimited ? 'unlimited messages' : remaining != null ? `${remaining} messages left today` : ''}
              </p>
            </div>
          </div>

          <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="bubble bubble--ai">
              {submitted
                ? 'Ask me anything about the solution: why a step works, where a trap was, or how this shows up in interviews.'
                : 'Ask for a hint, the formula, or the idea behind this problem. I won’t give away the answer before you submit.'}
            </div>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                className={`bubble ${m.role === 'user' ? 'bubble--me' : 'bubble--ai'}`}
                style={m.error ? { color: 'var(--neg)' } : undefined}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                {m.text}
              </motion.div>
            ))}
            {busy && (
              <div className="bubble bubble--ai row-8" aria-label="Tutor is typing">
                {[0, 1, 2].map((i) => (
                  <motion.span key={i} style={{ width: 7, height: 7, borderRadius: 4, background: 'var(--fg-3)', display: 'block' }}
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
                ))}
              </div>
            )}
          </div>

          {messages.length < 2 && !busy && (
            <div style={{ display: 'flex', gap: 8, padding: '0 16px 10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {PROMPTS.map(({ text, Icon }) => (
                <button key={text} type="button" className="chip chip--ghost" style={{ height: 36, padding: '0 12px', fontSize: 13.5, color: 'var(--fg)', background: 'var(--surface)' }} onClick={() => send(text)}>
                  <Icon size={14} className="c-accent" aria-hidden="true" /> {text}
                </button>
              ))}
            </div>
          )}

          <form className="composer" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
            <label htmlFor="tutor-input" className="sr-only">Message the tutor</label>
            <textarea
              id="tutor-input"
              rows={1}
              value={draft}
              maxLength={1200}
              placeholder={remaining === 0 && !unlimited ? 'No messages left today' : 'Ask about this deal'}
              disabled={remaining === 0 && !unlimited}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send(draft);
                }
              }}
            />
            <button className="send" disabled={!draft.trim() || busy} aria-label="Send">
              <ArrowUp size={20} strokeWidth={2.6} aria-hidden="true" />
            </button>
          </form>
        </>
      )}
    </Sheet>
  );
}
