import { useRef, type HTMLAttributes, type ReactNode } from 'react';
import SpecularBorder from './SpecularBorder';
import { usePointerLight } from './usePointerLight';
import './fx.css';

type Props = HTMLAttributes<HTMLElement> & { as?: 'div' | 'section' | 'article' | 'li' | 'aside'; children?: ReactNode; pad?: boolean };

/** A graphite card with a specular border and a faint platinum halo that follows the pointer. */
export default function SpecularCard({ as = 'div', className = '', pad = true, children, ...rest }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  usePointerLight(ref);
  const Tag = as as 'div';
  return (
    <Tag ref={ref} className={`fx-card ${pad ? 'fx-card--pad' : ''} ${className}`} {...rest}>
      <SpecularBorder />
      {children}
    </Tag>
  );
}
