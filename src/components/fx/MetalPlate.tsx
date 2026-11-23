import type { HTMLAttributes, ReactNode } from 'react';
import './fx.css';

type Props = HTMLAttributes<HTMLElement> & {
  as?: 'span' | 'div' | 'p' | 'strong';
  children?: ReactNode;
  /** platinum: earned · steel: not yet reached · glass: locked behind a plan */
  tone?: 'platinum' | 'steel' | 'glass';
  size?: 'sm' | 'md' | 'lg';
};

/** A brushed metal plate with engraved lettering: desk plaques, combo badges, rank. */
export default function MetalPlate({ as = 'span', tone = 'platinum', size = 'md', className = '', children, ...rest }: Props) {
  const Tag = as as 'span';
  return (
    <Tag className={`fx-plate fx-plate--${tone} fx-plate--${size} ${className}`} {...rest}>
      <span className="fx-plate-text">{children}</span>
    </Tag>
  );
}
