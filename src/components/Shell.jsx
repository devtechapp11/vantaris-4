import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Route, Trophy, Vault, Zap } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { prefetchProps } from '../app/routes';
import { spring } from '../design/tokens';
import Logo from './Logo';
import { Avatar, TierBadge } from './bits';

// Four pillars, the same on the phone tab bar and the desktop rail. Path holds
// both the guided route and free training (the deal library) behind one switch.
export const TABS = [
  { to: '/', label: 'Path', Icon: Route, match: (p) => p === '/' || p.startsWith('/practice') },
  { to: '/blitz', label: 'Blitz', Icon: Zap },
  { to: '/profile', label: 'Vault', Icon: Vault },
  { to: '/ranking', label: 'Rank', Icon: Trophy },
];
const isOn = (tab, path) => (tab.match ? tab.match(path) : path === tab.to || path.startsWith(`${tab.to}/`));

/** Bottom tab bar on phones and tablets. */
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
              <Link to={to} className={`tab ${on ? 'active' : ''}`} aria-current={on ? 'page' : undefined} {...prefetchProps(to)}>
                {on && <motion.span layoutId="tab-mark" className="tab-mark" transition={spring.snappy} />}
                {on && <motion.span layoutId="tab-pill" className="tab-pill" transition={spring.snappy} />}
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

/** Left rail on desktop: brand, navigation, the player's card and an upgrade nudge. */
export function Sidebar() {
  const { me } = useApp();
  const { pathname } = useLocation();
  const profile = me?.profile;
  const free = me?.tier?.id === 'free';
  return (
    <aside className="sidebar" aria-label="Main">
      <Link to="/" className="sidebar-brand" aria-label="Vantaris home"><Logo size={30} /></Link>
      <nav className="sidebar-nav">
        {TABS.map((tab) => {
          const { to, label, Icon } = tab;
          const on = isOn(tab, pathname);
          return (
            <Link key={to} to={to} className={`side-link ${on ? 'active' : ''}`} aria-current={on ? 'page' : undefined} {...prefetchProps(to)}>
              {on && <motion.span layoutId="side-pill" className="side-pill" transition={spring.snappy} />}
              <Icon size={20} aria-hidden="true" />
              {label}
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
