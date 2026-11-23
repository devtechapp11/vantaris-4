import { CHAPTERS } from './path.js';

export type Brief = { id: string; rule: string; trap: string; realWorld: string; formula?: string };

/** One brief per chapter: the rule, the classic trap, and where it shows up on a real deal. */
export const CHAPTER_BRIEFS: Record<string, Brief> = {
  statements: {
    id: 'statements', formula: 'CFO = NI + D&A − ΔNWC',
    rule: 'Start from net income, add back non-cash charges, then take out the cash tied up in working capital.',
    trap: 'Adding CapEx or dividends to CFO. Those are investing and financing flows, not operating ones.',
    realWorld: 'In diligence, a buyer’s first question on a profitable target is why cash from operations lags net income.',
  },
  dcf: {
    id: 'dcf', formula: 'TV = FCF₁ ÷ (WACC − g)',
    rule: 'Discount each cash flow at WACC; terminal value captures everything after the forecast.',
    trap: 'Discounting the terminal value from year N+1 instead of year N, or using g close to WACC.',
    realWorld: 'Fairness opinions show the DCF range as a WACC × g grid because one point estimate means nothing.',
  },
  comps: {
    id: 'comps', formula: 'EV = EBITDA × peer multiple',
    rule: 'Pair numerators and denominators that belong to the same investors: EV with EBITDA, equity with net income.',
    trap: 'Applying an EV/EBITDA multiple and calling the result the equity value.',
    realWorld: 'A coverage banker refreshes the comps sheet the morning of every pitch: the median moves with the market.',
  },
  precedents: {
    id: 'precedents', formula: 'Premium = offer ÷ unaffected price − 1',
    rule: 'Precedent multiples include a control premium: buyers pay for the whole company and its synergies.',
    trap: 'Measuring the premium from a price that already moved on deal rumours.',
    realWorld: 'Boards ask for a 30-day unaffected VWAP precisely so a leak cannot inflate the premium.',
  },
  lbo: {
    id: 'lbo', formula: 'IRR = MOIC^(1/n) − 1',
    rule: 'Returns come from three levers: buying cheap, growing EBITDA and paying down debt.',
    trap: 'Reading MOIC without the holding period: 2.0x in 3 years and in 7 years are different deals.',
    realWorld: 'Sponsors underwrite to a 20–25% IRR base case and check what exit multiple breaks the deal.',
  },
  ma: {
    id: 'ma', formula: 'Accretive if cost of paper < target earnings yield',
    rule: 'Compare what you pay with to what you buy: after-tax debt rate, 1 ÷ your P/E, against 1 ÷ the P/E you pay.',
    trap: 'Forgetting the tax shield on debt, or the new shares issued in a stock deal.',
    realWorld: 'Every merger announcement deck has a slide on EPS accretion in year one and year two.',
  },
  restructuring: {
    id: 'restructuring', formula: 'Recovery = value left ÷ claim',
    rule: 'Value pours down the waterfall: secured, senior unsecured, subordinated, then equity.',
    trap: 'Pro-rating recoveries across classes instead of filling each class in order.',
    realWorld: 'The first class only partly covered is the fulcrum: in a Chapter 11 it usually ends up owning the company.',
  },
  structuring: {
    id: 'structuring', formula: 'Sources = Uses',
    rule: 'Structure bridges price and value: earn-outs, seller notes and rollovers move risk, not just cash.',
    trap: 'Leaving fees and the cash to fund the balance sheet out of the uses column.',
    realWorld: 'When buyer and seller disagree on next year’s EBITDA, an earn-out lets both be right.',
  },
};

const dayIndex = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);

/** The brief of the day, from the chapters already opened (the first one before any star). */
export function briefOfTheDay(stars: Record<string, number>): Brief {
  const open = CHAPTERS.filter((_c, i) => i === 0 || (stars[CHAPTERS[i - 1].id] ?? 0) >= 1);
  const c = open[dayIndex() % open.length] ?? CHAPTERS[0];
  return CHAPTER_BRIEFS[c.id];
}
