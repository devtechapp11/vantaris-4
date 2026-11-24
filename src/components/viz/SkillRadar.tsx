import { useId } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import './viz.css';

export type Skill = { id: string; label: string; value: number; trainable?: boolean };

type Props = { skills: Skill[]; trainHref?: (id: string) => string; caption?: string };

/** Mastery per chapter on a radar (0..1 per axis), with the weakest open one one tap away. */
export default function SkillRadar({ skills, trainHref, caption }: Props) {
  const cleanId = useId().replace(/:/g, '');
  const n = skills.length;
  const R = 92;
  const c = 120;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return [c + Math.cos(a) * R * v, c + Math.sin(a) * R * v] as const;
  };
  const poly = (v: (i: number) => number) => skills.map((_, i) => pt(i, v(i)).join(',')).join(' ');
  const weakest = skills.filter((s) => s.trainable !== false).sort((a, b) => a.value - b.value)[0];
  return (
    <figure className="radar">
      <svg viewBox="-56 0 352 240" role="img" aria-labelledby={`${cleanId}-t`}>
        <title id={`${cleanId}-t`}>{`Mastery by chapter: ${skills.map((s) => `${s.label} ${Math.round(s.value * 100)}%`).join(', ')}`}</title>
        <defs>
          <radialGradient id={`${cleanId}-fill`} cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#F8FAFC" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#8FA3B8" stopOpacity="0.1" />
          </radialGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((k) => <polygon key={k} points={poly(() => k)} className="radar__ring" />)}
        {skills.map((s, i) => {
          const [x, y] = pt(i, 1);
          return <line key={s.id} x1={c} y1={c} x2={x} y2={y} className="radar__axis" />;
        })}
        <polygon points={poly((i) => Math.max(0.03, skills[i].value))} fill={`url(#${cleanId}-fill)`} className="radar__shape" />
        {skills.map((s, i) => {
          const [x, y] = pt(i, Math.max(0.03, s.value));
          return <circle key={s.id} cx={x} cy={y} r={s.id === weakest?.id ? 4 : 2.6} className={s.id === weakest?.id ? 'radar__dot is-weak' : 'radar__dot'} />;
        })}
        {skills.map((s, i) => {
          const [x, y] = pt(i, 1.17);
          return <text key={s.id} x={x} y={y} textAnchor={Math.abs(x - c) < 8 ? 'middle' : x > c ? 'start' : 'end'} dominantBaseline="middle" className="radar__label">{s.label}</text>;
        })}
      </svg>
      {(caption || (weakest && trainHref)) && (
        <figcaption className="radar__foot">
          {caption && <span className="t-cap">{caption}</span>}
          {weakest && trainHref && (
            <Link to={trainHref(weakest.id)} className="btn btn--secondary btn--sm radar__train">
              Train weakest · {weakest.label} <ArrowRight size={14} aria-hidden="true" />
            </Link>
          )}
        </figcaption>
      )}
    </figure>
  );
}
