import { useEffect, useState } from 'react';
import { START_KEYS, get } from '../onboarding/keys';

/**
 * The in-app reminder: plain facts, never guilt. Shown only when today's
 * lesson hasn't happened yet. Freezes in reserve are said as they are; one
 * covers a single missed day, by itself.
 */
export default function StreakNote({ streak, activeToday, freezes }: { streak: number; activeToday: boolean; freezes: number | null }) {
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const id = window.setInterval(() => setHour(new Date().getHours()), 10 * 60_000);
    return () => window.clearInterval(id);
  }, []);
  if (activeToday) return null;
  const goal = get(START_KEYS.goal);
  const lead = streak > 0 ? `Your streak is at ${streak}. One lesson keeps it.` : goal ? `Today's goal: ${goal} minutes. One lesson covers it.` : null;
  if (!lead) return null;
  const freeze = freezes && streak > 0 ? ` ${freezes} ${freezes === 1 ? 'freeze' : 'freezes'} in reserve: a missed day is covered automatically.` : '';
  return (
    <p className={`streak-note ${hour >= 18 ? 'is-evening' : ''}`} role="status">
      {lead}<span className="streak-note-sub">{freeze}</span>
    </p>
  );
}
