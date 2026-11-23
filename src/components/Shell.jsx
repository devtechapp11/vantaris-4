import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Route, Trophy, Vault, Zap } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { prefetchProps } from '../app/routes';
import { springs } from '../motion/springs';
import { sound } from '../lib/sound';
import { haptic } from '../app/prefs';
import { VMark } from './Logo';
import VantarisWordmark from './VantarisWordmark';
import { Avatar, TierBadge } from './bits';

// Four pillars, the same on the phone tab bar and the desktop rail. Path holds
// both the guided route and free training (the deal library) behind one switch.
export const TABS = [
  { to: '/', label: 'Path', Icon: Route, match: (p) => p === '/' || p.startsWith('/practice') },
  { to: '/blitz', label: 'Blitz', Icon: Zap },
  { to: '/profile', label: 'Vault', Icon: Vault },
  { to: '/ranking', label: 'Rank', Icon: Trophy },
];
/** A felt click and a light tick when the tab changes. */
const tabFeedback = () => {
  sound.tap();
  haptic(6);
};
const isOn = (tab, path) => (tab.match ? tab.match(path) : path === tab.to || path.startsWith(`${tab.to}/`));

/** Bottom tab bar on phones (below 768 px). */
export function TabBar() {
  const { pathname } = useLocation();
  return (
    <nav className="tabbar glass" aria-label="Main">
      <div className="tabbar-inner">
        {TABS.map((tab) => {
          const { to, label, Icon } = tab;
          const on = isOn(tab, pathname);
          return (
            <motion.span key={to} className="tab-cell" whileTap={{ scale: 0.96 }}>
              <Link to={to} className={`tab ${on ? 'active' : ''}`} aria-current={on ? 'page' : undefined} onClick={() => !on && tabFeedback()} {...prefetchProps(to)}>
                {on && <motion.span layoutId="tab-mark" className="tab-mark" transition={springs.snappy} />}
                {on && <motion.span layoutId="tab-pill" className="tab-pill" transition={springs.snappy} />}
                <Icon size={22} aria-hidden="true" />
                <span className="tab-label">{label}</span>
              </Link>
            </motion.span>
          );
        })}
      </div>
    </nav>
  );
}

/** Left rail from 768 px (icons only until 1280 px): brand, navigation, the player's card and an upgrade nudge. */
export function Sidebar() {
  const { me } = useApp();
  const { pathname } = useLocation();
  const profile = me?.profile;
  const free = me?.tier?.id === 'free';
  return (
    <aside className="sidebar" aria-label="Main">
      <Link to="/" className="sidebar-brand" aria-label="Vantaris home">
        <VMark size={30} />
        <VantarisWordmark height={13} className="side-word" />
      </Link>
      <nav className="sidebar-nav">
        {TABS.map((tab) => {
          const { to, label, Icon } = tab;
          const on = isOn(tab, pathname);
          return (
            <Link key={to} to={to} className={`side-link ${on ? 'active' : ''}`} aria-current={on ? 'page' : undefined} aria-label={label} onClick={() => !on && tabFeedback()} {...prefetchProps(to)}>
              {on && <motion.span layoutId="side-pill" className="side-pill" transition={springs.snappy} />}
              <Icon size={20} aria-hidden="true" />
              <span className="side-label">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="side-foot">
        {free && (
          <Link to="/plans" className="side-upgrade">
            <span className="t-label c-fg">Go Pro</span>
            <span className="t-cap">Unlimited deals, VP modules and Vale, your AI tutor.</span>
          </Link>
        )}
        {profile && (
          <Link to="/profile" className="side-me">
            <Avatar name={profile.display_name} variant="me" />
            <span className="grow stack-4">
              <span className="t-label c-fg ellipsis">{profile.display_name}</span>
              <span className="row-8"><TierBadge level={profile.level} />{profile.streak > 0 && <span className="t-cap fig">{profile.streak}d</span>}</span>
            </span>
          </Link>
        )}
      </div>
    </aside>
  );
}
