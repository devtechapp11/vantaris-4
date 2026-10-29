import { useEffect, useId } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, animate, motion, useDragControls, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { ChevronLeft, House, LayoutList, Trophy, CircleUserRound, X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useApp } from '../app/AppContext';

const spring = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 };

/** Screen wrapper: tab screens fade in, pushed screens slide in from the right. */
export function Page({ children, pushed = false, className = 'screen' }) {
  const reduce = useReducedMotion();
  return (
    <motion.main
      className={className}
      initial={reduce ? { opacity: 0 } : pushed ? { opacity: 0, x: 28 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.main>
  );
}

export function LargeTitle({ eyebrow, title, right, children }) {
  return (
    <header className="top">
      {eyebrow && <p className="t-foot">{eyebrow}</p>}
      <div className="top-line">
        <h1 className="t-large">{title}</h1>
        {right}
      </div>
      {children}
    </header>
  );
}

export function NavBar({ back = 'Back', to, title, right }) {
  const navigate = useNavigate();
  const goBack = () => {
    if (to) navigate(to);
    else if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };
  return (
    <div className="navbar">
      <div className="navbar-inner">
        <div>
          <button type="button" className="nav-back" onClick={goBack}>
            <ChevronLeft size={24} strokeWidth={2.4} aria-hidden="true" />
            {back}
          </button>
        </div>
        <div className="nav-title">{title}</div>
        <div>{right}</div>
      </div>
    </div>
  );
}

const TABS = [
  { to: '/', label: 'Home', Icon: House, end: true },
  { to: '/practice', label: 'Practice', Icon: LayoutList },
  { to: '/ranking', label: 'Ranking', Icon: Trophy },
  { to: '/profile', label: 'Profile', Icon: CircleUserRound },
];

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      <div className="tabbar-inner">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="tab">
            {({ isActive }) => (
              <>
                <Icon size={24} strokeWidth={isActive ? 2.4 : 1.8} aria-hidden="true" />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

/** iOS-style bottom sheet. Drag down or tap outside to close. */
export function Sheet({ open, onClose, children, tall = false, label }) {
  const reduce = useReducedMotion();
  const id = useId();
  const controls = useDragControls();
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

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
            transition={{ duration: 0.22 }}
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={label ? undefined : `${id}-t`}
            aria-label={label}
            className={`sheet ${tall ? 'sheet--tall' : ''}`}
            initial={reduce ? { opacity: 0 } : { y: '100%' }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: '100%' }}
            transition={spring}
            drag={reduce ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            dragListener={false}
            dragControls={controls}
            dragSnapToOrigin
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose?.();
            }}
          >
            <div className="sheet-grab" onPointerDown={(e) => !reduce && controls.start(e)} aria-hidden="true">
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
            className="toast"
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={spring}
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
          {value === o.value && <motion.span layoutId={`seg-${id}`} className="seg-thumb" transition={spring} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Number that counts up to `to` (instantly when reduced motion is on). */
export function CountUp({ to, from = 0, duration = 0.9, className = 'fig' }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(from);
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString('en-US'));
  useEffect(() => {
    const c = animate(mv, to, { duration: reduce ? 0 : duration, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [to, duration, reduce, mv]);
  return <motion.span className={className}>{text}</motion.span>;
}
