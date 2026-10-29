import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Copy } from 'lucide-react';

// Syntax highlighting for financial formulas: figures, operators, functions, variables.
const TOKEN = /(\$?\d[\d,]*(?:\.\d+)?\s?(?:bn|[kmbx%]\b|%)?)|([=+\-−–×÷*/^()<>≈])|([A-Za-z][\w.]*(?=\s*\())|([A-Za-zΔ][\w'’/&.]*)|(\s+)|(.)/g;

export function highlight(text) {
  const out = [];
  let m;
  let i = 0;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(text))) {
    const [all, num, op, fn, word] = m;
    const cls = num ? 'tk-num' : op ? 'tk-op' : fn ? 'tk-fn' : word ? 'tk-var' : null;
    out.push(cls ? <span key={i++} className={cls}>{all}</span> : all);
  }
  return out;
}

export function CopyButton({ text, label = 'Copy formula' }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <button type="button" className="copy-btn" onClick={copy} aria-label={done ? 'Copied' : label}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={done ? 'y' : 'n'} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
          {done ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
        </motion.span>
      </AnimatePresence>
      <span>{done ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

/** A formula or code block with highlighting and a copy button. */
export function FormulaBlock({ text, label = 'Formula' }) {
  return (
    <figure className="formula">
      <figcaption className="formula-head">
        <span className="t-cap">{label}</span>
        <CopyButton text={text} />
      </figcaption>
      <pre className="formula-body fig"><code>{highlight(text)}</code></pre>
    </figure>
  );
}

const looksLikeFormula = (line) => line.length < 160 && /=/.test(line) && /[A-Za-z]/.test(line) && /[+\-−×÷*/^()]|\d/.test(line) && !/[.?!]\s*$/.test(line.trim());

function inline(text, keyBase) {
  // **bold** and `code`
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, i) => {
    if (part.startsWith('**')) return <strong key={`${keyBase}-${i}`}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`')) return <code key={`${keyBase}-${i}`} className="inline-code fig">{highlight(part.slice(1, -1))}</code>;
    return part;
  });
}

/** Renders a tutor reply: paragraphs, ``` code fences and formula lines as highlighted blocks. */
export function RichText({ text }) {
  const blocks = [];
  const fence = /```[\w-]*\n?([\s\S]*?)```/g;
  let last = 0;
  let m;
  while ((m = fence.exec(text))) {
    if (m.index > last) blocks.push({ t: 'text', v: text.slice(last, m.index) });
    blocks.push({ t: 'code', v: m[1].trim() });
    last = m.index + m[0].length;
  }
  if (last < text.length) blocks.push({ t: 'text', v: text.slice(last) });

  const out = [];
  blocks.forEach((b, bi) => {
    if (b.t === 'code') {
      out.push(<FormulaBlock key={`c${bi}`} text={b.v} label="Formula" />);
      return;
    }
    b.v.split(/\n{2,}/).forEach((para, pi) => {
      const lines = para.split('\n').filter((l) => l.trim());
      if (!lines.length) return;
      if (lines.every(looksLikeFormula)) {
        out.push(<FormulaBlock key={`f${bi}-${pi}`} text={lines.join('\n')} />);
        return;
      }
      out.push(
        <p key={`p${bi}-${pi}`} className="rt-p">
          {lines.map((l, li) => (
            <span key={li}>{li > 0 && <br />}{inline(l, `${bi}-${pi}-${li}`)}</span>
          ))}
        </p>,
      );
    });
  });
  return <div className="rt">{out}</div>;
}
