import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Dumbbell, Route } from 'lucide-react';
import { prefetchProps } from '../app/routes';
import { spring } from '../design/tokens';

const MODES = [
  { value: 'guided', to: '/', label: 'Guided path', Icon: Route },
  { value: 'free', to: '/practice', label: 'Free training', Icon: Dumbbell },
];

/** One switch between the guided Deal Path and free training, instead of two tabs. */
export default function PathSwitch({ value }) {
  const navigate = useNavigate();
  return (
    <div className="pswitch glass" role="tablist" aria-label="Training mode">
      {MODES.map(({ value: v, to, label, Icon }) => {
        const on = v === value;
        return (
          <motion.button
            key={v}
            type="button"
            role="tab"
            aria-selected={on}
            className={`pswitch-opt ${on ? 'is-on' : ''}`}
            onClick={() => !on && navigate(to)}
            whileTap={{ scale: 0.96 }}
            {...prefetchProps(to)}
          >
            {on && <motion.span layoutId="pswitch-thumb" className="pswitch-thumb" transition={spring.snappy} />}
            <Icon size={17} aria-hidden="true" />
            <span>{label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
