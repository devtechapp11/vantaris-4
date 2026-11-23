import * as f from './core.ts';
import { seeded, type Rng } from './rng.ts';

// Parametrised exercises: the code draws realistic numbers, computes the exact
// answer and builds the wrong options from classic mistakes. A writer (Gemini,
// server side) may only re-tell the story around these numbers.

export type Brief = { rule: string; trap: string; realWorld: string; formula?: string };
export type Exercise = {
  template: string;
  skill: string;
  difficulty: number;
  params: Record<string, number>;
  answer: number;
  options: string[];
  answerIndex: number;
  /** Figures that must appear, verbatim, in any narrative written for this exercise. */
  numbers: string[];
  data: [string, string][];
  question: string;
  prompt: string;
  brief: Brief;
};

const num = (v: number, d = 0) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
export const M = (v: number, d = 0) => `${v < 0 ? '−' : ''}$${num(Math.abs(v), d)}M`;
export const PCT = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
export const X = (v: number, d = 1) => `${v.toFixed(d)}x`;
export const USD = (v: number) => `$${v.toFixed(2)}`;

/** The right answer and up to three distinct wrong ones, shuffled. */
function options(r: Rng, fmt: (v: number) => string, answer: number, wrongs: number[]) {
  const right = fmt(answer);
  const seen = new Set([right]);
  const out: string[] = [];
  for (const w of wrongs) {
    const s = fmt(w);
    if (Number.isFinite(w) && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
    if (out.length === 3) break;
  }
  let k = 1;
  while (out.length < 3 && k < 400) {
    const step = Math.max(Math.abs(answer) * 0.12, 0.005) * Math.ceil(k / 2);
    const s = fmt(answer + (k % 2 ? step : -step));
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
    k += 1;
  }
  if (out.length < 3) throw new RangeError('could not build distinct options');
  const all = r.shuffle([right, ...out]);
  return { options: all, answerIndex: all.indexOf(right) };
}

type Make = (r: Rng, d: number) => Omit<Exercise, 'template' | 'difficulty'>;

const TEMPLATES: Record<string, Make> = {
  /* Comps: EV from a peer multiple, then down the bridge to equity per share */
  'comps.bridge': (r, d) => {
    const ebitda = r.pick([40, 60, 80, 120, 150]);
    const mult = r.pick([7, 8, 9, 10, 11]);
    const debt = r.pick([100, 150, 200, 250]);
    const cash = r.pick([20, 30, 50, 80]);
    const minorities = d >= 3 ? r.pick([10, 20, 30]) : 0;
    const shares = r.pick([20, 25, 40, 50]);
    const ev = f.evFromMultiple(ebitda, mult);
    const eq = f.equityFromEv(ev, debt, cash, minorities);
    const answer = f.perShare(eq, shares);
    const wrongs = [f.perShare(ev, shares), f.perShare(ev - debt - cash - minorities, shares), f.perShare(ev + debt - cash, shares), f.perShare(ev - debt + cash, shares)];
    const data: [string, string][] = [['EBITDA', M(ebitda)], ['Peer EV/EBITDA', X(mult)], ['Debt', M(debt)], ['Cash', M(cash)], ...(minorities ? [['Minority interest', M(minorities)] as [string, string]] : []), ['Diluted shares', `${shares}M`]];
    return {
      skill: 'comps', params: { ebitda, mult, debt, cash, minorities, shares }, answer, data,
      ...options(r, USD, answer, wrongs),
      numbers: [M(ebitda), X(mult), M(debt), M(cash), `${shares}M`],
      question: 'What is the implied value per share?',
      prompt: `A listed peer set trades at ${X(mult)} EBITDA. Your target earns ${M(ebitda)} of EBITDA, carries ${M(debt)} of debt and ${M(cash)} of cash${minorities ? `, with ${M(minorities)} of minority interest` : ''}, on ${shares}M diluted shares.`,
      brief: { formula: 'Equity = EV − debt + cash', rule: 'Value the whole firm with the multiple, then walk down the bridge to what shareholders own.', trap: 'Dividing enterprise value by the share count: debt holders get paid first.', realWorld: 'Every pitch book football field shows this bridge under the trading comps bar.' },
    };
  },

  /* DCF: Gordon growth terminal value */
  'dcf.gordon': (r) => {
    const fcf = r.pick([20, 25, 30, 40, 50]);
    const wacc = r.pick([0.08, 0.09, 0.1, 0.11]);
    const g = r.pick([0.02, 0.025, 0.03]);
    const answer = f.gordon(fcf, wacc, g);
    const wrongs = [fcf / wacc, fcf / (wacc + g), (fcf * (1 + g)) / (wacc - g), fcf / (wacc - g) / (1 + wacc)];
    return {
      skill: 'dcf', params: { fcf, wacc, g }, answer, data: [['Next year FCF', M(fcf)], ['WACC', PCT(wacc)], ['Perpetual growth', PCT(g)]],
      ...options(r, (v) => M(v), answer, wrongs),
      numbers: [M(fcf), PCT(wacc), PCT(g)],
      question: 'What is the terminal value?',
      prompt: `A mature business will generate ${M(fcf)} of free cash flow next year, growing ${PCT(g)} a year forever. Its WACC is ${PCT(wacc)}.`,
      brief: { formula: 'TV = FCF₁ ÷ (WACC − g)', rule: 'A growing perpetuity is next year’s cash flow over the spread between the discount rate and growth.', trap: 'Growing the cash flow twice: FCF₁ is already next year’s number.', realWorld: 'Terminal value is often 60–80% of a DCF, so bankers stress the WACC − g spread first.' },
    };
  },

  /* WACC */
  'dcf.wacc': (r) => {
    const e = r.pick([600, 700, 800]);
    const dbt = 1000 - e;
    const ke = r.pick([0.1, 0.11, 0.12]);
    const kd = r.pick([0.05, 0.06, 0.07]);
    const t = 0.25;
    const answer = f.wacc({ equity: e, debt: dbt, costEquity: ke, costDebt: kd, tax: t });
    const wrongs = [(e / 1000) * ke + (dbt / 1000) * kd, (ke + kd * (1 - t)) / 2, (dbt / 1000) * ke + (e / 1000) * kd * (1 - t)];
    return {
      skill: 'dcf', params: { e, dbt, ke, kd, t }, answer, data: [['Equity value', M(e)], ['Debt', M(dbt)], ['Cost of equity', PCT(ke)], ['Pre-tax cost of debt', PCT(kd)], ['Tax rate', '25%']],
      ...options(r, (v) => PCT(v, 2), answer, wrongs),
      numbers: [M(e), M(dbt), PCT(ke), PCT(kd)],
      question: 'What is the WACC?',
      prompt: `The company is funded with ${M(e)} of equity and ${M(dbt)} of debt. Shareholders want ${PCT(ke)}, lenders charge ${PCT(kd)} before tax, and the tax rate is 25%.`,
      brief: { formula: 'WACC = E/V·kₑ + D/V·k_d·(1 − t)', rule: 'Weight each investor’s required return by their share of total capital.', trap: 'Forgetting the tax shield on debt, or weighting by book instead of market values.', realWorld: 'Valuation committees argue about beta and the equity risk premium far more than about the formula.' },
    };
  },

  /* LBO: IRR from entry, growth and paydown */
  'lbo.irr': (r) => {
    const entryEbitda = r.pick([50, 80, 100]);
    const entryMultiple = r.pick([8, 9, 10]);
    const leverage = r.pick([4, 5, 6]);
    const growth = r.pick([1.3, 1.4, 1.5]);
    const years = 5;
    const exitMultiple = entryMultiple;
    const debtRepaid = Math.round(entryEbitda * leverage * r.pick([0.3, 0.4, 0.5]));
    const p = { entryEbitda, entryMultiple, leverage, exitEbitda: Math.round(entryEbitda * growth), exitMultiple, years, debtRepaid };
    const deal = f.lbo(p);
    const answer = deal.irr;
    const wrongs = [f.irrFromMoic(deal.exitEv / deal.entryEv, years), (deal.moic - 1) / years, f.irrFromMoic((deal.exitEv - deal.debt) / deal.equityIn, years)];
    return {
      skill: 'lbo', params: p, answer,
      data: [['Entry EBITDA', M(entryEbitda)], ['Entry multiple', X(entryMultiple, 0)], ['Debt', `${leverage}.0x EBITDA`], ['Exit EBITDA (year 5)', M(p.exitEbitda)], ['Exit multiple', X(exitMultiple, 0)], ['Debt repaid', M(debtRepaid)]],
      ...options(r, (v) => PCT(v), answer, wrongs),
      numbers: [M(entryEbitda), X(entryMultiple, 0), M(p.exitEbitda), M(debtRepaid)],
      question: 'What is the sponsor’s IRR over five years?',
      prompt: `A sponsor buys a business earning ${M(entryEbitda)} of EBITDA at ${X(entryMultiple, 0)}, funded with ${leverage}.0x debt. Five years later EBITDA is ${M(p.exitEbitda)}, ${M(debtRepaid)} of debt has been repaid, and it sells at the same multiple.`,
      brief: { formula: 'IRR = MOIC^(1/n) − 1', rule: 'Equity returns come from EBITDA growth, multiple change and debt paydown.', trap: 'Computing the return on the whole enterprise value instead of the equity cheque.', realWorld: 'Investment committees ask for the IRR bridge: how much came from each lever.' },
    };
  },

  /* M&A accretion / dilution */
  'ma.accretion': (r) => {
    const acquirerNi = r.pick([200, 300, 400]);
    const acquirerShares = r.pick([100, 150, 200]);
    const targetNi = r.pick([30, 40, 60]);
    const price = r.pick([500, 600, 800]);
    const stock = r.next() < 0.5;
    const sharePrice = (acquirerNi / acquirerShares) * r.pick([12, 15, 18]);
    const newShares = stock ? price / sharePrice : 0;
    const rate = r.pick([0.05, 0.06, 0.07]);
    const p = { acquirerNi, acquirerShares, targetNi, newShares, newDebt: stock ? 0 : price, rate, tax: 0.25 };
    const res = f.accretion(p);
    const answer = res.change;
    const noTax = f.accretion({ ...p, tax: 0 }).change;
    const noShares = f.accretion({ ...p, newShares: 0 }).change;
    const wrongs = [noTax, noShares, -answer, (acquirerNi + targetNi) / acquirerShares / (acquirerNi / acquirerShares) - 1];
    const sp = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(1)}%`;
    return {
      skill: 'ma', params: { ...p, price, sharePrice: Math.round(sharePrice * 100) / 100 }, answer,
      data: [['Acquirer net income', M(acquirerNi)], ['Acquirer shares', `${acquirerShares}M`], ['Acquirer share price', USD(sharePrice)], ['Target net income', M(targetNi)], ['Purchase price', M(price)], ['Paid in', stock ? 'New shares' : `Debt at ${PCT(rate)}`]],
      ...options(r, sp, answer, wrongs),
      numbers: [M(acquirerNi), M(targetNi), M(price)],
      question: 'Year-one EPS accretion (dilution)?',
      prompt: `An acquirer earning ${M(acquirerNi)} on ${acquirerShares}M shares buys a target earning ${M(targetNi)} for ${M(price)}, paid ${stock ? `in new shares issued at ${USD(sharePrice)}` : `with new debt at ${PCT(rate)}`}. Tax rate 25%, no synergies.`,
      brief: { formula: 'Accretive if cost of paper < target earnings yield', rule: 'Compare what you pay with to what you buy: after-tax interest, or 1 ÷ your P/E, against 1 ÷ the P/E paid.', trap: 'Forgetting the new shares in a stock deal, or the tax shield on debt.', realWorld: 'Merger announcements lead with year-one and year-two EPS accretion.' },
    };
  },

  /* Three statements: cash from operations */
  'statements.cfo': (r) => {
    const ni = r.pick([60, 80, 100, 120]);
    const da = r.pick([15, 20, 30]);
    const nwc = r.pick([10, 15, 25]);
    const capex = r.pick([20, 30, 40]);
    const answer = f.cashFromOperations(ni, da, nwc);
    const wrongs = [ni + da + nwc, ni - da - nwc, f.freeCashFlow(answer, capex), ni + da];
    return {
      skill: 'statements', params: { ni, da, nwc, capex }, answer,
      data: [['Net income', M(ni)], ['D&A', M(da)], ['Increase in working capital', M(nwc)], ['CapEx', M(capex)]],
      ...options(r, (v) => M(v), answer, wrongs),
      numbers: [M(ni), M(da), M(nwc), M(capex)],
      question: 'What is cash from operations?',
      prompt: `A manufacturer reports ${M(ni)} of net income and ${M(da)} of D&A. Working capital rose by ${M(nwc)} and it spent ${M(capex)} on new equipment.`,
      brief: { formula: 'CFO = NI + D&A − ΔNWC', rule: 'Add back non-cash charges and take out the cash tied up in working capital.', trap: 'Subtracting CapEx: it is an investing flow, not an operating one.', realWorld: 'Lenders look at CFO before EBITDA when a covenant is close.' },
    };
  },

  /* Precedents: control premium */
  'precedents.premium': (r) => {
    const unaffected = r.pick([20, 24, 30, 36, 40]);
    const premium = r.pick([0.25, 0.3, 0.35, 0.4]);
    const offer = unaffected * (1 + premium);
    const rumour = unaffected * r.pick([1.08, 1.1, 1.12]);
    const answer = offer / unaffected - 1;
    const wrongs = [offer / rumour - 1, (offer - unaffected) / offer, premium * 0.8];
    return {
      skill: 'precedents', params: { unaffected, offer: Math.round(offer * 100) / 100, rumour: Math.round(rumour * 100) / 100 }, answer,
      data: [['Unaffected price (30-day VWAP)', USD(unaffected)], ['Price after rumours', USD(rumour)], ['Offer per share', USD(offer)]],
      ...options(r, (v) => PCT(v), answer, wrongs),
      numbers: [USD(unaffected), USD(rumour), USD(offer)],
      question: 'What control premium does the offer represent?',
      prompt: `A buyer offers ${USD(offer)} per share. The stock traded at ${USD(unaffected)} (30-day VWAP) before rumours lifted it to ${USD(rumour)}.`,
      brief: { formula: 'Premium = offer ÷ unaffected − 1', rule: 'Measure the premium against the price before the deal leaked.', trap: 'Using the post-rumour price: it shrinks the premium the board is paid.', realWorld: 'Fairness opinions state the premium to the unaffected price, the 30-day VWAP and the 52-week high.' },
    };
  },
};

export const TEMPLATE_IDS = Object.keys(TEMPLATES);
export const templatesFor = (skill: string) => TEMPLATE_IDS.filter((id) => id.startsWith(`${skill}.`));

/** Build one exercise from a template id, a seed and a difficulty (1–5). */
export function makeExercise(template: string, seed: number, difficulty = 2): Exercise {
  const make = TEMPLATES[template];
  if (!make) throw new RangeError(`unknown template ${template}`);
  const d = Math.max(1, Math.min(5, Math.round(difficulty)));
  return { template, difficulty: d, ...make(seeded(seed), d) };
}

/** True when every required figure appears verbatim in a text (narrative check). */
export const mentionsAll = (text: string, numbers: string[]) => numbers.every((n) => text.includes(n));
