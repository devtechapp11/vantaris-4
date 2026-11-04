import { useId, useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { Eye, EyeOff } from 'lucide-react';
import { group, inView, item } from '../design/motion';
import { ease } from '../design/tokens';

/**
 * Text input with a label that floats up on focus or once it has a value.
 * Pass `placeholder` to keep the label up and show example text instead.
 * A string `error` is shown under the field and announced.
 */
export function FloatingField({ label, id: idProp, action, hint, error, placeholder, className = '', ...input }) {
  const auto = useId();
  const id = idProp ?? auto;
  const msg = typeof error === 'string' && error ? error : null;
  const described = [msg && `${id}-err`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`ffield ${action ? 'ffield--action' : ''} ${placeholder ? 'ffield--ph' : ''} ${className}`}>
      <div className="ffield-box">
        <input
          id={id}
          className="ffield-input"
          placeholder={placeholder ?? ' '}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={described}
          {...input}
        />
        <label className="ffield-label" htmlFor={id}>{label}</label>
        {action}
      </div>
      {msg && <span id={`${id}-err`} className="field-error" role="alert">{msg}</span>}
      {hint && <span id={`${id}-hint`} className="hint">{hint}</span>}
    </div>
  );
}

/** Password field with show/hide and an optional strength meter. */
export function PasswordField({ value, onChange, label = 'Password', showMeter = false, invalid, ...rest }) {
  const [show, setShow] = useState(false);
  const s = strength(value);
  const words = ['Too short', 'Weak', 'Fair', 'Strong', 'Excellent'];
  return (
    <div className="stack-8">
      <FloatingField
        label={label}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={72}
        required
        error={invalid}
        action={
          <button type="button" className="ffield-action" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        }
        {...rest}
      />
      {showMeter && (
        <div className="strength">
          <div className="strength-track" aria-hidden="true">
            <div className="strength-fill" style={{ '--p': `${value ? Math.max(8, (s / 4) * 100) : 0}%` }} />
          </div>
          <div className="between">
            <span className="t-cap">At least 8 characters with a letter and a number.</span>
            <span className={`t-cap ${s >= 3 ? 'c-fg' : ''}`} aria-live="polite">
              {value ? words[s] : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function strength(pw = '') {
  if (pw.length < 8) return 0;
  let s = 1;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}

/** Custom switch (role="switch"). */
export function Toggle({ checked, onChange, label, id }) {
  return (
    <button type="button" id={id} role="switch" aria-checked={checked} aria-label={label} className="toggle" onClick={() => onChange(!checked)}>
      <span className="toggle-thumb" />
    </button>
  );
}

/** Fades and slides children up as they enter the viewport. Children with `item` variants stagger. */
export function Reveal({ children, as = 'div', className, style, gap, delay = 0, amount, ...rest }) {
  const Tag = motion[as] ?? motion.div;
  const vp = amount ? { ...inView.viewport, amount } : inView.viewport;
  return (
    <Tag className={className} style={style} initial="hidden" whileInView="show" viewport={vp} variants={gap != null ? group(gap, delay) : item} {...rest}>
      {children}
    </Tag>
  );
}

/** Surface that tilts up to 3° toward the pointer (never on touch). */
export function TiltCard({ children, className = '', max = 3, style, ...rest }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 200, damping: 24 });
  const sy = useSpring(py, { stiffness: 200, damping: 24 });
  const lim = Math.min(3, max);
  const rotateY = useTransform(sx, [0, 1], [-lim, lim]);
  const rotateX = useTransform(sy, [0, 1], [lim, -lim]);
  const frame = useRef(0);

  const move = (e) => {
    if (reduce || e.pointerType !== 'mouse') return;
    const { clientX, clientY } = e;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      px.set((clientX - r.left) / r.width);
      py.set((clientY - r.top) / r.height);
    });
  };
  const reset = () => {
    cancelAnimationFrame(frame.current);
    px.set(0.5);
    py.set(0.5);
  };
  return (
    <div style={{ perspective: 900, ...style }} {...rest}>
      <motion.div
        ref={ref}
        className={`tilt ${className}`}
        onPointerMove={move}
        onPointerLeave={reset}
        style={{ rotateX: reduce ? 0 : rotateX, rotateY: reduce ? 0 : rotateY, transformStyle: 'preserve-3d', height: '100%' }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/** Progress bar that fills from `from` to `value` (0–1). */
export function ProgressBar({ value, from = 0, size, label, delay = 0.2 }) {
  const reduce = useReducedMotion();
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div
      className={`bar ${size === 'sm' ? 'bar--sm' : ''}`}
      role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} aria-label={label}
    >
      <motion.i
        initial={reduce ? false : { scaleX: Math.max(0, Math.min(1, from)) }}
        animate={{ scaleX: v }}
        transition={{ duration: 0.9, delay: reduce ? 0 : delay, ease: ease.out }}
      />
    </div>
  );
}

/** Stat: animated value over a small label. */
export function StatTile({ label, children, className = '' }) {
  return (
    <motion.div variants={item} className={`stat ${className}`}>
      <div className="stat-value">{children}</div>
      <div className="t-cap">{label}</div>
    </motion.div>
  );
}
