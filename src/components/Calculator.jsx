import { useImperativeHandle, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Calculator as CalcIcon, ChevronDown, CornerDownLeft, Delete, RotateCcw } from 'lucide-react';
import { evaluate, formatResult } from '../lib/calc';
import { spring } from '../design/tokens';

const KEYS = ['(', ')', '^', '÷', '×', '−', '+', '%'];

/**
 * Scratch calculator for deal math. Tap a figure in the deal terms to drop it
 * in (via the `insert` handle), type freely, press Enter to keep a result on the tape.
 */
export default function Calculator({ defaultOpen = true, ref }) {
  const [expr, setExpr] = useState('');
  const [tape, setTape] = useState([]);
  const [open, setOpen] = useState(defaultOpen);
  const input = useRef(null);
  const value = evaluate(expr);
  const shown = formatResult(value);

  const focus = () => requestAnimationFrame(() => input.current?.focus());
  // A figure from the deal terms: keep it apart from the previous figure (you add the operator).
  const insert = (token) => {
    setOpen(true);
    setExpr((e) => (e && !/[\s(+\-−×÷*/^]$/.test(e) ? `${e} ${token}` : `${e}${token}`));
    focus();
  };
  const press = (key) => {
    setExpr((e) => `${e}${['(', ')', '^', '%'].includes(key) ? key : ` ${key} `}`);
    focus();
  };
  useImperativeHandle(ref, () => ({ insert }), []);

  const commit = () => {
    if (value == null) return;
    setTape((t) => [{ expr, value, id: Date.now() }, ...t].slice(0, 5));
    setExpr(String(+value.toPrecision(10)));
  };

  return (
    <section className={`calc ${open ? 'is-open' : ''}`} aria-label="Deal calculator">
      <button type="button" className="calc-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="row-8"><CalcIcon size={16} className="c-fg" aria-hidden="true" /><span className="t-label c-fg">Deal calculator</span></span>
        <span className="row-8">
          {!open && shown && <span className="fig t-cap c-fg">{shown.alt ?? shown.main}</span>}
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={spring.snappy}><ChevronDown size={16} aria-hidden="true" /></motion.span>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="calc-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring.snappy}
          >
            <div className="calc-inner">
              <div className="calc-screen">
                <label htmlFor="calc-input" className="sr-only">Expression</label>
                <input
                  id="calc-input"
                  ref={input}
                  className="calc-input fig"
                  value={expr}
                  onChange={(e) => setExpr(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); commit(); }
                    if (e.key === 'Escape') setExpr('');
                    e.stopPropagation();
                  }}
                  placeholder="e.g. (450M ÷ 160M)^(1/5) − 1"
                  inputMode="decimal"
                  autoComplete="off"
                  spellCheck="false"
                />
                <div className="calc-result" aria-live="polite">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={shown ? shown.main : expr ? 'err' : 'empty'}
                      className={`fig ${shown ? 'calc-value' : 'c-3'}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.14 }}
                    >
                      {shown ? `= ${shown.main}` : expr ? '…' : '= 0'}
                    </motion.span>
                  </AnimatePresence>
                  {shown?.alt && <span className="fig calc-alt">{shown.alt}</span>}
                </div>
              </div>
              <div className="calc-keys">
                {KEYS.map((k) => (
                  <button key={k} type="button" className="calc-key fig" onClick={() => press(k)}>{k}</button>
                ))}
                <button type="button" className="calc-key" onClick={() => setExpr((e) => e.trimEnd().slice(0, -1))} aria-label="Delete last character"><Delete size={15} /></button>
                <button type="button" className="calc-key" onClick={() => setExpr('')} aria-label="Clear"><RotateCcw size={14} /></button>
                <button type="button" className="calc-key calc-key--eq" onClick={commit} aria-label="Keep result"><CornerDownLeft size={15} /></button>
              </div>
              {tape.length > 0 && (
                <ol className="calc-tape" aria-label="Recent results">
                  {tape.map((t) => (
                    <li key={t.id}>
                      <button type="button" onClick={() => insert(String(+t.value.toPrecision(10)))} title="Use this result">
                        <span className="t-cap ellipsis fig">{t.expr}</span>
                        <span className="fig c-fg">{formatResult(t.value).alt ?? formatResult(t.value).main}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
              <p className="t-cap">Tap any figure in the deal terms to use it. Understands M, B, K, x and %.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
