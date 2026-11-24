import type { ReactNode } from 'react';
import AnimatedNumber from './AnimatedNumber';
import './glass.css';

type Props = {
  eyebrow: string;
  value: number;
  unit?: string;
  delta?: string;
  decimals?: number;
  size?: 'lg' | 'sm';
  className?: string;
  children?: ReactNode;
};

const fixed = (d: number) => (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

/** Smoked-glass card with an inner glow from below, for one monumental figure. */
export default function GlassStat({ eyebrow, value, unit, delta, decimals = 0, size = 'lg', className = '', children }: Props) {
  return (
    <section className={`glass-stat ${className}`}>
      <p className="glass__eyebrow">{eyebrow}</p>
      <p className={`glass__figure ${size === 'sm' ? 'glass__figure--sm' : ''}`}>
        <AnimatedNumber value={value} format={fixed(decimals)} />
        {unit && <span className="glass__unit">{unit}</span>}
      </p>
      {delta && <p className="glass__delta">{delta}</p>}
      {children && <div className="glass__body">{children}</div>}
    </section>
  );
}
