import { useEffect, useId } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, animate, motion, useDragControls, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { ChevronLeft, X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { useMedia, BREAKPOINT } from '../app/useDevice';
import { page, item } from '../design/motion';
import { duration, ease, spring } from '../design/tokens';

/**
 * Screen wrapper. Enters with a crossfade and a 20px rise, exits with a fade
 * and a slight shrink (route changes run through AnimatePresence in App), and
 * staggers any <Item> children by 50ms.
 */
export function Page({ children, className = 'screen', wide = false, as = 'main', ...rest }) {
  const Tag = as === 'div' ? motion.div : motion.main;
  return (
    <Tag id="main" tabIndex={-1} className={`${className} ${wide ? 'screen--wide' : ''}`} variants={page} initial="hidden" animate="show" exit="exit" {...rest}>
      {children}
    </Tag>
  );
}

/** A staggered child of <Page> (or of any parent using the `page`/`group` variants). */
export function Item({ children, as = 'div', className, style, ...rest }) {
  const Tag = motion[as] ?? motion.div;
  return (
    <Tag variants={item} className={className} style={style} {...rest}>
      {children}
    </Tag>
  );
}

export function LargeTitle({ eyebrow, title, right, children }) {
  return (
    <Item as="header" className="top">
      {eyebrow && <p className="t-eyebrow">{eyebrow}</p>}
      <div className="top-line">
        <h1 className="t-h1">{title}</h1>
        {right}
      </div>
      {children}
    </Item>
  );
}

export function NavBar({ back = 'Back', to, title, right }) {
  const navigate = useNavigate();
  const location = useLocation();
  // A real "back" (history pop) restores the previous page's scroll position;
  // fall back to `to` when this page was opened directly.
  const goBack = () => {
    if (location.key !== 'default') navigate(-1);
    else navigate(to ?? '/');
  };
  return (
    <div className="navbar glass">
      <div className="navbar-inner">
        <div>
          <button type="button" className="nav-back" onClick={goBack}>
            <ChevronLeft size={22} strokeWidth={2.4} aria-hidden="true" />
            {back}
          </button>
        </div>
        <div className="nav-title">{title}</div>
        <div>{right}</div>
      </div>
    </div>
  );
}

/** Bottom sheet on phones (drag down to close), centred dialog on larger screens. */
export function Sheet({ open, onClose, children, tall = false, label }) {
  const reduce = useReducedMotion();
  const wide = useMedia(BREAKPOINT.tablet);
  const id = useId();
  const controls = useDragControls();
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const motionProps = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : wide
      ? { initial: { opacity: 0, y: 24, scale: 0.97 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 16, scale: 0.98 } }
      : { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            className="sheet-scrim"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration.base }}
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={label ? undefined : `${id}-t`}
            aria-label={label}
            className={`sheet glass ${tall ? "sheet--tall" : ""}`}
            {...motionProps}
            transition={spring.snappy}
            drag={reduce || wide ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            dragListener={false}
            dragControls={controls}
            dragSnapToOrigin
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose?.();
            }}
          >
            <div className="sheet-grab" onPointerDown={(e) => !reduce && !wide && controls.start(e)} aria-hidden="true">
              <i />
            </div>
            <button type="button" className="icon-btn sheet-close" onClick={onClose} aria-label="Close">
              <X size={18} aria-hidden="true" />
            </button>
            {typeof children === 'function' ? children(`${id}-t`) : children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function Toast() {
  const { toast } = useApp();
  const Icon = toast?.kind === 'success' ? CheckCircle2 : toast?.kind === 'error' ? AlertCircle : Info;
  return (
    <div className="toast-wrap" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className="toast glass"
            data-kind={toast.kind}
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={spring.snappy}
          >
            <Icon size={18} aria-hidden="true" />
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Segmented({ value, onChange, options, label }) {
  const id = useId();
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {value === o.value && <motion.span layoutId={`seg-${id}`} className="seg-thumb" transition={spring.snappy} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Number that counts up to `to` (instantly when reduced motion is on). */
export function CountUp({ to, from = 0, duration: d = duration.count, delay = 0, className = 'fig', format }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(from);
  const text = useTransform(mv, (v) => (format ? format(v) : Math.round(v).toLocaleString('en-US')));
  useEffect(() => {
    const c = animate(mv, to ?? 0, { duration: reduce ? 0 : d, delay: reduce ? 0 : delay, ease: ease.out });
    return () => c.stop();
  }, [to, d, delay, reduce, mv]);
  return <motion.span className={className}>{text}</motion.span>;
}

/** Pull-to-refresh indicator: a thin ring that fills as you pull, then spins. */
export function PullIndicator({ pull, busy }) {
  if (!pull && !busy) return null;
  const c = 2 * Math.PI * 9;
  return (
    <div className="ptr glass" style={{ opacity: Math.min(1, pull * 1.4), transform: `translate(-50%, ${pull * 56}px)` }} role="status" aria-label={busy ? 'Refreshing' : undefined}>
      <svg width="22" height="22" viewBox="0 0 22 22" className={busy ? 'spin' : ''} aria-hidden="true">
        <circle cx="11" cy="11" r="9" fill="none" stroke="var(--aluminium-dark)" strokeWidth="1.5" />
        <circle cx="11" cy="11" r="9" fill="none" stroke="var(--platinum)" strokeWidth="1.5" strokeDasharray={c} strokeDashoffset={c * (1 - (busy ? 0.3 : pull))} transform="rotate(-90 11 11)" />
      </svg>
    </div>
  );
}

