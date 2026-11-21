import { motion } from 'motion/react';
import { Award, BookOpen, CircleCheck, Clock, Flame, Lock, Trophy, Zap } from 'lucide-react';
import { group, item } from '../design/motion';
import { stagger } from '../design/tokens';

export const BADGE_ICON = { 'first-deal': CircleCheck, 'hat-trick': Zap, 'on-fire': Flame, 'fast-hands': Clock, 'module-clear': BookOpen, associate: Trophy };

/**
 * Achievements as medals: earned ones in polished platinum, the rest as dark
 * silhouettes with the condition to unlock them. `compact` is the dashboard strip.
 */
export default function Badges({ achievements = [], compact = false }) {
  return (
    <motion.ol
      className={`medals ${compact ? 'medals--strip' : ''}`}
      variants={group(stagger.children)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
    >
      {achievements.map((a) => {
        const Icon = BADGE_ICON[a.id] ?? Award;
        return (
          <motion.li key={a.id} variants={item} className={`medal ${a.earned ? 'is-earned' : 'is-locked'}`} title={compact ? `${a.name}: ${a.earned ? 'earned' : a.detail}` : undefined}>
            <span className="medal-disc" aria-hidden="true">
              <Icon size={compact ? 18 : 20} strokeWidth={1.6} />
              {!a.earned && <span className="medal-lock"><Lock size={9} strokeWidth={2.2} /></span>}
            </span>
            <span className={compact ? 'sr-only' : 'medal-text'}>
              <span className="t-label c-fg">{a.name}</span>
              <span className="t-cap">{a.earned ? 'Earned' : a.detail}</span>
            </span>
          </motion.li>
        );
      })}
    </motion.ol>
  );
}
