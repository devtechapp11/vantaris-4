import { Link, NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import { House, LayoutGrid, Trophy, CircleUserRound } from 'lucide-react';
import { useApp } from '../app/AppContext';
import { prefetchProps } from '../app/routes';
import { spring } from '../design/tokens';
import Logo from './Logo';
import { Avatar, TierBadge } from './bits';

export const TABS = [
  { to: '/', label: 'Home', Icon: House, end: true },
  { to: '/practice', label: 'Deals', Icon: LayoutGrid },
  { to: '/ranking', label: 'Rank', Icon: Trophy },
  { to: '/profile', label: 'Profile', Icon: CircleUserRound },
];

/** Bottom tab bar on phones and tablets. */
export function TabBar() {
  return (
    <nav className="tabbar glass" aria-label="Main">
      <div className="tabbar-inner">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="tab" {...prefetchProps(to)}>
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="tab-mark" className="tab-mark" transition={spring.snappy} />}
                <Icon size={22} aria-hidden="true" />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

/** Left rail on desktop: brand, navigation, the player's card and an upgrade nudge. */
export function Sidebar() {
  const { me } = useApp();
  const profile = me?.profile;
  const free = me?.tier?.id === 'free';
  return (
    <aside className="sidebar" aria-label="Main">
      <Link to="/" className="sidebar-brand" aria-label="Vantaris home"><Logo size={30} /></Link>
      <nav className="sidebar-nav">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="side-link" {...prefetchProps(to)}>
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="side-pill" className="side-pill" transition={spring.snappy} />}
                <Icon size={20} aria-hidden="true" />
                {label}
              </>
            )}
          </NavLink>
        ))}
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
