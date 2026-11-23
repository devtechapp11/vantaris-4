// Rapid Pair Match: terms and what they equal, one set per chapter.
// A session draws four pairs from its chapter.
export const PAIRS: Record<string, [string, string][]> = {
  statements: [
    ['Cash from operations', 'NI + D&A − ΔNWC'],
    ['Free cash flow', 'CFO − CapEx'],
    ['Gross margin', '(Revenue − COGS) ÷ Revenue'],
    ['Retained earnings, end', 'Opening + NI − dividends'],
    ['Net working capital', 'Receivables + inventory − payables'],
    ['EBITDA', 'EBIT + D&A'],
  ],
  dcf: [
    ['Terminal value (Gordon)', 'FCF₁ ÷ (WACC − g)'],
    ['Discount factor, year n', '1 ÷ (1 + WACC)ⁿ'],
    ['Cost of equity (CAPM)', 'rf + β × ERP'],
    ['After-tax cost of debt', 'rd × (1 − t)'],
    ['Enterprise value', 'PV(FCF) + PV(TV)'],
    ['Unlevered FCF', 'EBIT × (1 − t) + D&A − CapEx − ΔNWC'],
  ],
  comps: [
    ['EV / EBITDA', 'Enterprise value ÷ EBITDA'],
    ['P / E', 'Share price ÷ EPS'],
    ['Enterprise value', 'Equity + debt − cash'],
    ['Implied equity value', 'Implied EV − net debt'],
    ['EV / Sales', 'Enterprise value ÷ revenue'],
    ['PEG ratio', 'P/E ÷ EPS growth (%)'],
  ],
  precedents: [
    ['Control premium', 'Offer ÷ unaffected price − 1'],
    ['Transaction EV', 'Offer equity + net debt assumed'],
    ['LTM EBITDA', 'Last twelve months EBITDA'],
    ['Synergy value', 'Run-rate synergies × multiple'],
    ['Offer per share', 'Equity offer ÷ diluted shares'],
    ['Implied EV / EBITDA', 'Deal EV ÷ LTM EBITDA'],
  ],
  lbo: [
    ['MOIC', 'Exit equity ÷ equity invested'],
    ['IRR (one exit)', 'MOIC^(1/n) − 1'],
    ['Exit EV', 'Exit EBITDA × exit multiple'],
    ['Exit equity', 'Exit EV − remaining net debt'],
    ['Equity cheque', 'Total uses − debt raised'],
    ['Leverage', 'Debt ÷ EBITDA'],
  ],
  ma: [
    ['Exchange ratio', 'Offer per share ÷ acquirer price'],
    ['Pro forma EPS', 'Combined NI ÷ combined shares'],
    ['Cost of debt (after tax)', 'Rate × (1 − t)'],
    ['Cost of stock', '1 ÷ acquirer P/E'],
    ['Target earnings yield', '1 ÷ P/E paid'],
    ['Accretion', 'Pro forma EPS ÷ standalone EPS − 1'],
  ],
  restructuring: [
    ['Recovery rate', 'Value received ÷ claim'],
    ['Fulcrum security', 'First class partly covered'],
    ['Interest coverage', '(EBITDA − CapEx) ÷ cash interest'],
    ['Absolute priority', 'Senior paid in full before junior'],
    ['Distressed EV', 'Normalised EBITDA × multiple'],
    ['DIP financing', 'Super-senior loan in Chapter 11'],
  ],
  structuring: [
    ['Sources', 'Debt + equity + rollover'],
    ['Uses', 'Purchase price + fees + cash to B/S'],
    ['Earn-out', 'Price paid only if targets are hit'],
    ['Seller note', 'Part of the price paid later by the buyer'],
    ['Rollover', 'Seller reinvests in the new company'],
    ['Cash-free, debt-free', 'Price adjusted for net debt at close'],
  ],
};

/** Four pairs for a chapter, the right column shuffled (deterministic for a seed). */
export function drawPairs(chapter: string, seed: number) {
  let a = seed >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const shuffle = <T,>(arr: T[]) => {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const pool = PAIRS[chapter] ?? PAIRS.statements;
  const pairs = shuffle(pool).slice(0, 4);
  return { left: pairs.map((p) => p[0]), right: shuffle(pairs.map((p) => p[1])), answer: Object.fromEntries(pairs) as Record<string, string> };
}
