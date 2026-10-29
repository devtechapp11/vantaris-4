const HOT_AT = 3;

/** 🔥 that flickers once the streak reaches three days. */
export default function StreakFlame({ streak = 0, compact = false, size }) {
  const hot = streak >= HOT_AT;
  const cls = `flame ${hot ? 'flame--hot' : streak === 0 ? 'flame--cold' : ''}`;
  if (compact) {
    return (
      <span className="row-4 t-cap fig" aria-label={`${streak}-day streak`} style={{ color: hot ? 'var(--warn)' : 'var(--fg-3)' }}>
        <span className={cls} aria-hidden="true">🔥</span>{streak}
      </span>
    );
  }
  return <span className={cls} aria-hidden="true" style={{ fontSize: size }}>🔥</span>;
}
