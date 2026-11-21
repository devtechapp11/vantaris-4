// Market Blitz: sixty seconds of micro-decisions. Half technical true/false,
// half mental maths with one right answer and one near miss.

const TF = [
  ['A higher WACC raises a DCF valuation.', false],
  ['Adding back D&A raises operating cash flow above net income.', true],
  ['P/E pairs equity value with net income.', true],
  ['Cash is subtracted when bridging from equity value to EV.', true],
  ['A rise in receivables increases cash from operations.', false],
  ['Precedent multiples usually include a control premium.', true],
  ['Paying down debt in an LBO raises the equity value at exit.', true],
  ['2.0x in five years is roughly a 15% IRR.', true],
  ['Buying a higher-P/E target with lower-P/E stock is accretive.', false],
  ['Interest expense sits above EBIT on the income statement.', false],
  ['Under US GAAP, goodwill is amortised by public companies.', false],
  ['Secured lenders are paid before unsecured noteholders.', true],
  ['Raising long-term growth raises the terminal value.', true],
  ['Unlevered free cash flow is calculated after interest.', false],
  ['More leverage on the same exit raises the sponsor’s MOIC.', true],
  ['EBITDA is calculated after depreciation.', false],
  ['An earn-out shifts forecast risk to the seller.', true],
  ['Building inventory consumes cash.', true],
  ['Minority interest is added when bridging equity value to EV.', true],
  ['CapEx is an investing cash flow.', true],
  ['Beta captures company-specific risk.', false],
  ['Interest is tax-deductible, so debt is cheaper after tax.', true],
  ['The fulcrum security often ends up owning the reorganised company.', true],
  ['A fixed exchange ratio locks the seller’s dollar value.', false],
  ['EV/Revenue is useful when EBITDA is negative.', true],
  ['Deferred revenue is an asset.', false],
  ['A rise in payables is a source of cash.', true],
  ['LTM means the last twelve months.', true],
  ['A DCF discounts levered cash flows at WACC.', false],
  ['Dividends paid reduce enterprise value one-for-one.', false],
];

const M = (v) => `$${Math.round(v).toLocaleString('en-US')}M`;
const X = (v) => `${v.toFixed(1)}x`;

const CALC = [
  (r) => {
    const e = r.pick([30, 40, 45, 60, 75]);
    const m = r.pick([6, 7.5, 8, 9, 10, 12]);
    return [`EBITDA ${M(e)} at ${X(m)}. EV?`, M(e * m), M(e * (m + r.pick([1, -1]) * 0.5))];
  },
  (r) => {
    const e = r.pick([40, 50, 75, 80]);
    const m = r.pick([6, 8, 9, 11]);
    return [`EV ${M(e * m)}, EBITDA ${M(e)}. Multiple?`, X(m), X(m + r.pick([1, -1]))];
  },
  (r) => {
    const rev = r.pick([200, 300, 400, 500]);
    const p = r.pick([10, 12, 15, 20, 25]);
    return [`EBITDA ${M((rev * p) / 100)} on revenue ${M(rev)}. Margin?`, `${p}%`, `${p + r.pick([2, 3, -2])}%`];
  },
  (r) => {
    const inv = r.pick([100, 200, 250]);
    const m = r.pick([2, 2.5, 3]);
    return [`Equity in ${M(inv)}, out ${M(inv * m)}. MOIC?`, X(m), X(m + 0.5)];
  },
  (r) => {
    const eps = r.pick([2, 2.5, 4]);
    const pe = r.pick([12, 15, 16, 20]);
    return [`EPS $${eps.toFixed(2)} at ${X(pe)} P/E. Price?`, `$${(eps * pe).toFixed(0)}`, `$${(eps * (pe - 2)).toFixed(0)}`];
  },
  (r) => {
    const base = r.pick([200, 400, 500]);
    const g = r.pick([10, 15, 20, 25]);
    return [`Revenue ${M(base)} → ${M(base * (1 + g / 100))}. Growth?`, `${g}%`, `${g + 5}%`];
  },
  (r) => {
    const i = r.pick([40, 60, 80]);
    return [`Interest ${M(i)}, 25% tax. After-tax cost?`, M(i * 0.75), M(i * 0.25)];
  },
  (r) => {
    const ev = r.pick([800, 1000, 1200]);
    const nd = r.pick([200, 300]);
    return [`EV ${M(ev)}, net debt ${M(nd)}. Equity value?`, M(ev - nd), M(ev + nd)];
  },
];

/** One micro-decision: { prompt, options: [a, b], answer: 0 | 1 }. */
export function nextBlitz(r) {
  if (r.bool()) {
    const [claim, truth] = r.pick(TF);
    return { kind: 'tf', prompt: claim, options: ['True', 'False'], answer: truth ? 0 : 1 };
  }
  const [prompt, right, wrong] = r.pick(CALC)(r);
  const flip = r.bool();
  return { kind: 'calc', prompt, options: flip ? [wrong, right] : [right, wrong], answer: flip ? 1 : 0 };
}

/** Seconds allowed per decision: the clock tightens as the run grows. */
export const windowFor = (run) => Math.max(2.2, 5 - run * 0.3);

export const BLITZ_SECONDS = 60;
