// Deterministic finance: pure functions, no I/O. Rates are decimals (0.08 = 8%).
// Shared by the app, the unit tests and the Edge Functions (copied to
// supabase/functions/_shared by scripts/sync-shared.mjs).

const finite = (name: string, v: number) => {
  if (!Number.isFinite(v)) throw new RangeError(`${name} must be a finite number`);
  return v;
};

/* ---------- Valuation by multiple and the equity bridge ---------- */
export const evFromMultiple = (metric: number, multiple: number) => finite('metric', metric) * finite('multiple', multiple);

/** Equity value = EV − debt + cash − minorities − preferred. */
export const equityFromEv = (ev: number, debt: number, cash: number, minorities = 0, preferred = 0) => ev - debt + cash - minorities - preferred;

/** EV = equity + debt − cash + minorities + preferred. */
export const evFromEquity = (equity: number, debt: number, cash: number, minorities = 0, preferred = 0) => equity + debt - cash + minorities + preferred;

export const perShare = (equity: number, shares: number) => {
  if (shares <= 0) throw new RangeError('shares must be positive');
  return equity / shares;
};

/* ---------- Cost of capital ---------- */
export const costOfEquity = (riskFree: number, beta: number, erp: number) => riskFree + beta * erp;

export function wacc({ equity, debt, costEquity, costDebt, tax }: { equity: number; debt: number; costEquity: number; costDebt: number; tax: number }) {
  const v = equity + debt;
  if (v <= 0) throw new RangeError('capital must be positive');
  return (equity / v) * costEquity + (debt / v) * costDebt * (1 - tax);
}

/* ---------- Discounting and terminal value ---------- */
export const discountFactor = (rate: number, years: number) => 1 / (1 + rate) ** years;
export const presentValue = (cash: number, rate: number, years: number) => cash * discountFactor(rate, years);

/** Gordon growth: next year's cash flow over (r − g). */
export function gordon(nextCash: number, rate: number, growth: number) {
  if (rate <= growth) throw new RangeError('rate must exceed growth');
  return nextCash / (rate - growth);
}

export const exitMultipleValue = (finalMetric: number, multiple: number) => finalMetric * multiple;

/** A DCF: cash flows for years 1..N, plus a terminal value at year N. */
export function dcf(cashFlows: number[], rate: number, terminal: number) {
  const n = cashFlows.length;
  const pvFlows = cashFlows.reduce((s, c, i) => s + presentValue(c, rate, i + 1), 0);
  const pvTerminal = presentValue(terminal, rate, n);
  return { pvFlows, pvTerminal, ev: pvFlows + pvTerminal };
}

/* ---------- LBO returns ---------- */
export const moic = (exitEquity: number, entryEquity: number) => {
  if (entryEquity <= 0) throw new RangeError('entry equity must be positive');
  return exitEquity / entryEquity;
};
export const irrFromMoic = (multiple: number, years: number) => multiple ** (1 / years) - 1;

/** IRR of dated cash flows (year 0 first) by bisection; null if no sign change. */
export function irr(flows: number[], lo = -0.99, hi = 10) {
  const npv = (r: number) => flows.reduce((s, c, t) => s + c / (1 + r) ** t, 0);
  let a = lo;
  let b = hi;
  let fa = npv(a);
  if (fa * npv(b) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const m = (a + b) / 2;
    const fm = npv(m);
    if (Math.abs(fm) < 1e-10) return m;
    if (fa * fm < 0) b = m;
    else {
      a = m;
      fa = fm;
    }
  }
  return (a + b) / 2;
}

/** A simple LBO: buy at a multiple with some leverage, grow EBITDA, repay debt, exit. */
export function lbo(p: { entryEbitda: number; entryMultiple: number; leverage: number; exitEbitda: number; exitMultiple: number; years: number; debtRepaid: number }) {
  const entryEv = p.entryEbitda * p.entryMultiple;
  const debt = p.entryEbitda * p.leverage;
  const equityIn = entryEv - debt;
  const exitEv = p.exitEbitda * p.exitMultiple;
  const exitEquity = exitEv - (debt - p.debtRepaid);
  const m = moic(exitEquity, equityIn);
  return { entryEv, debt, equityIn, exitEv, exitEquity, moic: m, irr: irrFromMoic(m, p.years) };
}

/* ---------- M&A accretion / dilution ---------- */
export function accretion(p: { acquirerNi: number; acquirerShares: number; targetNi: number; newShares: number; newDebt: number; rate: number; tax: number; synergies?: number }) {
  const standalone = p.acquirerNi / p.acquirerShares;
  const afterTaxInterest = p.newDebt * p.rate * (1 - p.tax);
  const synergies = (p.synergies ?? 0) * (1 - p.tax);
  const proFormaNi = p.acquirerNi + p.targetNi - afterTaxInterest + synergies;
  const proForma = proFormaNi / (p.acquirerShares + p.newShares);
  return { standalone, proForma, change: proForma / standalone - 1 };
}

/* ---------- The three statements ---------- */
export const cashFromOperations = (netIncome: number, da: number, nwcIncrease: number) => netIncome + da - nwcIncrease;
export const freeCashFlow = (cfo: number, capex: number) => cfo - capex;
export const retainedEarnings = (opening: number, netIncome: number, dividends: number) => opening + netIncome - dividends;
/** Unlevered FCF from EBIT. */
export const unleveredFcf = (ebit: number, tax: number, da: number, capex: number, nwcIncrease: number) => ebit * (1 - tax) + da - capex - nwcIncrease;
