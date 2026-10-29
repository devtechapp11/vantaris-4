// Landing page copy. Edit freely; the layout adapts to the number of items.

export const FEATURES = [
  { icon: 'briefcase', title: 'Real deal simulations', body: 'DCF, LBO, comps and M&A problems shaped like the deals interviewers actually ask about.' },
  { icon: 'trending', title: 'Analyst to MD', body: 'Earn points on every first-time solve, climb four tiers and unlock harder modules as you go.' },
  { icon: 'sparkles', title: 'Vale, your AI tutor', body: 'Ask for a hint, the formula or the idea behind a step. Vale never spoils the answer before you submit.' },
  { icon: 'timer', title: 'Beat the clock', body: 'Answer inside the time and earn up to a 50% speed bonus. Daily streaks keep you sharp.' },
  { icon: 'trophy', title: 'Leaderboard', body: 'See where you rank this week, this month and all time against other future dealmakers.' },
  { icon: 'steps', title: 'Every step, explained', body: 'After each deal, a step-by-step walkthrough shows how a banker gets to the number.' },
];

// Points thresholds mirror level_for_points() in supabase/sql/schema.core.sql.
export const LADDER = [
  { level: 'Analyst', points: 0, line: 'Build the statements, value the business.' },
  { level: 'Associate', points: 251, line: 'Comps, precedents and your first LBO.' },
  { level: 'VP', points: 501, line: 'M&A, accretion/dilution and restructuring.' },
  { level: 'MD', points: 751, line: 'Structure the deal. Own the room.' },
];

export const TICKER = [
  ['EV / EBITDA', '9.0x'], ['IRR', '23.0%'], ['WACC', '8.4%'], ['MOIC', '2.8x'], ['Premium', '25%'],
  ['TV growth', '3.0%'], ['Accretion', '+4.2%'], ['Net debt', '$110M'], ['FCF yield', '6.1%'], ['P/E', '18.5x'],
];

// A made-up deal for the product preview (not one of the real problems).
// Exit EV 8.0x × $70M = $560M; exit equity $560M − $110M = $450M;
// MOIC 450 / 160 = 2.81x; IRR = 2.8125^(1/5) − 1 = 23.0%.
export const SAMPLE_DEAL = {
  title: 'Northwind Logistics',
  kind: 'LBO returns',
  terms: [
    ['Entry EV', '$400M · 8.0x'],
    ['Sponsor equity', '$160M'],
    ['EBITDA, year 5', '$70M'],
    ['Exit multiple', '8.0x'],
    ['Net debt at exit', '$110M'],
  ],
  question: 'What IRR does the sponsor earn over five years?',
  options: ['18.6%', '23.0%', '26.4%', '29.9%'],
  pick: 1,
  hint: 'Start with exit equity, then compound back over five years.',
};

// SAMPLE quotes for the preview build only. The live build hides this section
// while any entry is still marked `sample: true`. Replace them with real quotes
// you have permission to publish (first name + school is plenty), and remove
// the `sample` flag.
export const TESTIMONIALS = [
  { quote: 'The speed bonus turned LBO math into a habit. I do one deal on the train every morning.', name: 'Sample student', role: 'Finance, year 2', sample: true },
  { quote: 'Vale explains the “why” behind each step without giving the answer away. That is exactly how I wanted to learn.', name: 'Sample student', role: 'Economics, year 3', sample: true },
  { quote: 'Watching my rank climb from Analyst to VP kept me practicing through recruiting season.', name: 'Sample student', role: 'Commerce, year 1', sample: true },
  { quote: 'The walkthroughs read like an associate marking up my model. Short, precise, no fluff.', name: 'Sample student', role: 'MBA candidate', sample: true },
];
