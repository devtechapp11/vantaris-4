// The career ladder. Points thresholds mirror level_for_points() in
// supabase/sql/schema.core.sql.
export const CAREER = [
  { level: 'Analyst', name: 'Analyst', floor: 0 },
  { level: 'Associate', name: 'Associate', floor: 251 },
  { level: 'VP', name: 'Vice President', floor: 501 },
  { level: 'MD', name: 'Managing Director', floor: 751 },
];

/** "VP" → "Vice President". */
export const careerName = (level) => CAREER.find((c) => c.level === level)?.name ?? level;
