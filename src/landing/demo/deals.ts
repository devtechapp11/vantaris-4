/**
 * The three demo deals played on the landing page before any sign-up, from the
 * simplest valuation to a first LBO return. Every number is checked below.
 */
export type DemoDeal = {
  id: string;
  kind: string;
  q: string;
  options: string[];
  answer: number;
  why: string;
  /** The figures printed on the deal ticket. */
  ticket: [label: string, value: string][];
};

export const DEMO_DEALS: DemoDeal[] = [
  {
    id: 'ev-multiple',
    kind: 'Trading multiple',
    q: 'EBITDA is $50M. Comparable companies trade at 8.0x. What is the business worth?',
    options: ['$58M', '$400M', '$450M', '$6.3M'],
    answer: 1,
    // 50 × 8.0 = 400
    why: 'Enterprise value = EBITDA × multiple = $50M × 8.0 = $400M.',
    ticket: [['EBITDA', '$50.0M'], ['Multiple', '8.0x'], ['EV', '$400.0M']],
  },
  {
    id: 'dcf-perpetuity',
    kind: 'DCF · growing perpetuity',
    q: 'Next year’s free cash flow is $30M, growing 3% a year forever. WACC is 8%. What is the enterprise value?',
    options: ['$375M', '$600M', '$273M', '$1.0B'],
    answer: 1,
    // 30 / (0.08 − 0.03) = 600 · traps: 30/0.08 = 375, 30/0.11 = 273, 30/0.03 = 1,000
    why: 'EV = FCF ÷ (WACC − g) = $30M ÷ (8% − 3%) = $600M.',
    ticket: [['FCF (y+1)', '$30.0M'], ['Growth', '3.0%'], ['WACC', '8.0%'], ['EV', '$600.0M']],
  },
  {
    id: 'lbo-irr',
    kind: 'LBO · sponsor return',
    q: 'A sponsor invests $200M of equity and takes out $600M five years later. What is the IRR?',
    options: ['14.9%', '20.0%', '24.6%', '40.0%'],
    answer: 2,
    // MOIC 3.0x; 3^(1/5) − 1 = 24.57% · traps: 2^(1/5) − 1 = 14.9%, 200% ÷ 5 = 40%
    why: 'MOIC = $600M ÷ $200M = 3.0x. IRR = 3.0^(1/5) − 1 ≈ 24.6%, not 200% ÷ 5.',
    ticket: [['Equity in', '$200.0M'], ['Equity out', '$600.0M'], ['MOIC', '3.0x'], ['IRR', '24.6%']],
  },
];

/** XP as a real deal scores it: 10 points, up to +50% for speed on a one-minute clock. */
export const xpFor = (seconds: number) => Math.round(10 * (1 + 0.5 * Math.max(0, 1 - seconds / 60)));

export function gradeFor(right: number) {
  if (right >= 3) return 'Analyst+';
  if (right === 2) return 'Analyst';
  if (right === 1) return 'Analyst in training';
  return 'Fresh desk';
}
