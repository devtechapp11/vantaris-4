import { useEffect } from 'react';
import { motion, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { springs } from '../../motion/springs';
import './fx.css';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** One wheel of the counter: rolls vertically to its digit on a spring. */
function Wheel({ digit }: { digit: number }) {
  const reduce = useReducedMotion();
  const spring = useSpring(digit, springs.soft);
  useEffect(() => {
    if (reduce) spring.jump(digit);
    else spring.set(digit);
  }, [digit, reduce, spring]);
  const y = useTransform(spring, (v) => `${-v}em`);
  return (
    <span className="fx-wheel" aria-hidden="true">
      <motion.span className="fx-wheel-strip" style={{ y }}>
        {DIGITS.map((d) => <span key={d}>{d}</span>)}
      </motion.span>
    </span>
  );
}

type Props = {
  value: number;
  format?: (v: number) => string;
  prefix?: string;
  suffix?: string;
  className?: string;
};

const defaultFormat = (v: number) => Math.round(v).toLocaleString('en-US');

/**
 * A number in tabular mono figures that changes like a mechanical counter:
 * only the wheels whose digit changes roll. Wheels are keyed from the right,
 * so units stay units when the number grows a digit.
 */
export default function AnimatedNumber({ value, format = defaultFormat, prefix = '', suffix = '', className = '' }: Props) {
  const text = format(value);
  const chars = [...text];
  return (
    <span className={`fx-number fig-mono ${className}`} role="text" aria-label={`${prefix}${text}${suffix}`}>
      {prefix && <span aria-hidden="true">{prefix}</span>}
      {chars.map((ch, i) => {
        const key = chars.length - i;
        return /\d/.test(ch) ? <Wheel key={`d${key}`} digit={Number(ch)} /> : <span key={`s${key}`} aria-hidden="true">{ch}</span>;
      })}
      {suffix && <span aria-hidden="true">{suffix}</span>}
    </span>
  );
}
