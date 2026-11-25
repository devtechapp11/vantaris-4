// Landing page copy: a pitch, one idea per screen. Titles ≤ 7 words, lines ≤ 20.

export const PITCH = {
  hook: 'Move · Vale is awake',
  hookTouch: 'Tap Vale',
  promise: ['Don’t study finance.', 'Do it.'],
  promiseLine: 'Real DCF, LBO and M&A deals, priced against the clock. Five minutes a day.',
  deal: { title: 'Close a live deal.', line: 'Three deals, no sign-up. Save your desk and the XP comes with you.' },
  membership: { title: 'Start free. Go Pro.', line: 'Three deals a week, free for as long as you like.' },
  final: { title: 'Your desk is open.', cta: 'Start free' },
};

// Points thresholds mirror level_for_points() in supabase/sql/schema.core.sql.
export const LADDER = [
  { level: 'Analyst', points: 0, line: 'Read the statements. Value the business.' },
  { level: 'Associate', points: 251, line: 'Comps, precedents and your first LBO.' },
  { level: 'VP', points: 501, line: 'Accretion, dilution and distressed capital.' },
  { level: 'MD', points: 751, line: 'Structure the deal. Own the room.' },
];
