// Deal Path sessions. Six question templates per chapter, on a flow curve:
//   1–2  Intuition and mechanism: a slider to feel the lever, or two cases side by side
//   3–4  Structure and logic: assemble the formula, or reason a step through
//   5–6  Deal case: a real institutional calculation with realistic numbers
// Every template is parametric: make(rng) draws new numbers, so a missed
// question comes back as a fresh variant, never the same one twice.

/* ---------- helpers ---------- */
export function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    bool: () => next() < 0.5,
    shuffle: (arr) => {
      const out = [...arr];
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}

const num = (v, d = 0) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const M = (v, d = 0) => `${v < 0 ? '−' : ''}$${num(Math.abs(v), d)}M`;
const BN = (v) => `$${(v / 1000).toFixed(2)}bn`;
const PCT = (v, d = 1) => `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(d)}%`;
const SPCT = (v, d = 1) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(d)}%`;
const X = (v, d = 1) => `${v.toFixed(d)}x`;
const USD = (v) => `$${v.toFixed(2)}`;

/** Multiple choice: the right answer plus distinct distractors, shuffled. */
function mc(r, correct, wrongs) {
  const uniq = [correct, ...wrongs.filter((w, i, all) => w !== correct && all.indexOf(w) === i)].slice(0, 4);
  const options = r.shuffle(uniq);
  return { options, answer: options.indexOf(correct) };
}

/* ---------- 1. The three statements ---------- */
const statements = [
  {
    id: 'statements.da-shield', stage: 'Intuition',
    make(r) {
      const E = r.pick([80, 100, 120]);
      const D = r.pick([20, 40]);
      const cfo = (d) => E * 0.75 + 0.25 * d;
      return {
        type: 'slider',
        prompt: `EBITDA is ${M(E)}, tax rate 25%, no interest, no working-capital change. Drag D&A until cash from operations reaches ${M(cfo(D))}.`,
        min: 0, max: 60, step: 5, start: 0,
        format: (v) => `D&A ${M(v)}`,
        readouts: (v) => [['Net income', M((E - v) * 0.75, 1)], ['Cash from operations', M(cfo(v), 1)]],
        answer: D,
        hint: 'D&A is a receipt you can show the taxman without spending a cent this year.',
        explain: `Net income falls by D&A × (1 − t), but cash rises by D&A × t: the charge is non-cash, the tax saving is real. CFO = ${M(E)} × 0.75 + 0.25 × D&A = ${M(cfo(D))}, so D&A = ${M(D)}.`,
      };
    },
  },
  {
    id: 'statements.earnings-quality', stage: 'Mechanism',
    make(r) {
      const k = r.pick([1, 1.2, 1.5]);
      const v = (x) => M(Math.round(x * k));
      const weak = [['Revenue', v(500)], ['Net income', v(60)], ['Cash from operations', v(25)], ['Change in receivables', `+${v(45)}`]];
      const strong = [['Revenue', v(500)], ['Net income', v(45)], ['Cash from operations', v(58)], ['Change in receivables', `+${v(4)}`]];
      const flip = r.bool();
      return {
        type: 'compare',
        prompt: 'Same sector, same revenue. Whose earnings would you underwrite?',
        a: { name: 'Company A', rows: flip ? strong : weak },
        b: { name: 'Company B', rows: flip ? weak : strong },
        answer: flip ? 'a' : 'b',
        hint: 'A sale isn’t money until the client pays. Follow the cash, not the headline.',
        explain: `The higher-profit company collected only ${v(25)} of its ${v(60)}: ${v(45)} is stuck in receivables. The other turns more than 100% of its net income into cash. Cash conversion (CFO ÷ net income) is the first quality-of-earnings test.`,
      };
    },
  },
  {
    id: 'statements.cfo-build', stage: 'Structure',
    make(r) {
      return {
        type: 'build',
        prompt: 'Assemble cash from operations, indirect method.',
        parts: ['CFO = ', 0, ' + ', 1, ' − ', 2],
        tokens: r.shuffle(['Net income', 'D&A', 'Increase in NWC', 'CapEx', 'Dividends paid']),
        answer: ['Net income', 'D&A', 'Increase in NWC'],
        commute: [[0, 1]],
        hint: 'The cash flow statement has three doors: operating, investing, financing. Only the operating door is open here.',
        explain: 'Start from net income, add back non-cash charges (D&A), then subtract the cash tied up in working capital. CapEx is an investing flow and dividends a financing flow: neither belongs in CFO.',
      };
    },
  },
  {
    id: 'statements.da-walk', stage: 'Logic',
    make(r) {
      const D = r.pick([10, 20, 40]);
      const t = r.pick([0.25, 0.3]);
      const { options, answer } = mc(r, `Cash rises by ${M(D * t, 1)}`, [`Cash falls by ${M(D * (1 - t), 1)}`, `Cash falls by ${M(D, 1)}`, 'No change: D&A is non-cash']);
      return {
        type: 'choice',
        prompt: `Depreciation rises by ${M(D)} at a ${Math.round(t * 100)}% tax rate. Walk it through the three statements: what happens to cash?`,
        options, answer,
        hint: 'Non-cash doesn’t mean no cash effect. Who do you pay less?',
        explain: `Income statement: pre-tax income −${M(D)}, tax −${M(D * t, 1)}, net income −${M(D * (1 - t), 1)}. Cash flow: start from net income (−${M(D * (1 - t), 1)}) and add back D&A (+${M(D)}): cash +${M(D * t, 1)}. Balance sheet: PP&E −${M(D)}, cash +${M(D * t, 1)}, equity −${M(D * (1 - t), 1)}. It balances.`,
      };
    },
  },
  {
    id: 'statements.net-income', stage: 'Deal case',
    make(r) {
      const R = r.pick([200, 240, 320, 400]);
      const cogs = R * r.pick([0.55, 0.6]);
      const sga = R * r.pick([0.12, 0.15]);
      const da = R * r.pick([0.05, 0.075]);
      const int = r.pick([5, 8, 12]);
      const ebit = R - cogs - sga - da;
      const ni = (ebit - int) * 0.75;
      const f = (v) => M(v, 2);
      const { options, answer } = mc(r, f(ni), [f(ebit * 0.75), f((ebit + da - int) * 0.75), f(ebit - int), f(ni + da), f((ebit - int) * 0.7)]);
      return {
        type: 'choice',
        prompt: 'Build this company’s net income for the year.',
        data: [['Revenue', M(R)], ['COGS', M(cogs, 1)], ['SG&A', M(sga, 1)], ['D&A', M(da, 1)], ['Interest expense', M(int)], ['Tax rate', '25%']],
        options, answer,
        hint: 'Walk down the P&L like a staircase: gross profit, EBITDA, EBIT, pre-tax income, then tax.',
        explain: `EBIT = ${M(R)} − ${M(cogs, 1)} − ${M(sga, 1)} − ${M(da, 1)} = ${f(ebit)}. Pre-tax income = EBIT − interest = ${f(ebit - int)}. Net income = ${f(ebit - int)} × 0.75 = ${f(ni)}.`,
      };
    },
  },
  {
    id: 'statements.cfo-wc', stage: 'Deal case',
    make(r) {
      const ni = r.pick([40, 55, 70]);
      const da = r.pick([10, 15, 20]);
      const ar = r.pick([8, 12]);
      const inv = r.pick([5, 6]);
      const ap = r.pick([4, 7]);
      const cfo = ni + da - ar - inv + ap;
      const { options, answer } = mc(r, M(cfo), [M(ni + da + ar + inv - ap), M(ni + da - ar - inv - ap), M(ni - ar - inv + ap)]);
      return {
        type: 'choice',
        prompt: 'Cash from operations for the year?',
        data: [['Net income', M(ni)], ['D&A', M(da)], ['Increase in receivables', M(ar)], ['Increase in inventory', M(inv)], ['Increase in payables', M(ap)]],
        options, answer,
        hint: 'An asset that grows ate cash. A liability that grows lent you cash.',
        explain: `CFO = ${M(ni)} + ${M(da)} (non-cash) − ${M(ar)} (receivables) − ${M(inv)} (inventory) + ${M(ap)} (payables) = ${M(cfo)}.`,
      };
    },
  },
];

/* ---------- 2. DCF and WACC ---------- */
const dcf = [
  {
    id: 'dcf.pv', stage: 'Intuition',
    make(r) {
      const rate = r.pick([6, 8, 10, 12]);
      const pv = (x) => 100 / (1 + x / 100) ** 5;
      return {
        type: 'slider',
        prompt: `A ${M(100)} cash flow lands in five years. Drag the discount rate until it is worth ${M(pv(rate), 1)} today.`,
        min: 4, max: 14, step: 1, start: 4,
        format: (v) => `Discount rate ${v}%`,
        readouts: (v) => [['Discount factor', (1 / (1 + v / 100) ** 5).toFixed(3)], ['Present value', M(pv(v), 1)]],
        answer: rate,
        hint: 'The rate is the toll you charge for waiting. A higher toll shrinks the same promise.',
        explain: `PV = 100 ÷ (1 + r)^5. At ${rate}%, ${(1 + rate / 100).toFixed(2)}^5 = ${((1 + rate / 100) ** 5).toFixed(3)}, so PV = ${M(pv(rate), 1)}. Raise the rate and the same cash is worth less today.`,
      };
    },
  },
  {
    id: 'dcf.timing', stage: 'Mechanism',
    make(r) {
      const k = r.pick([1, 2, 5]);
      const front = [60, 30, 10].map((x) => x * k);
      const back = [10, 30, 60].map((x) => x * k);
      const pv = (cf) => cf.reduce((s, c, i) => s + c / 1.1 ** (i + 1), 0);
      const rows = (cf) => cf.map((c, i) => [`Year ${i + 1}`, M(c)]);
      const flip = r.bool();
      return {
        type: 'compare',
        prompt: `Two projects, ${M(100 * k)} of cash each in total, discounted at 10%. Which is worth more today?`,
        a: { name: 'Project A', rows: rows(flip ? front : back) },
        b: { name: 'Project B', rows: rows(flip ? back : front) },
        answer: flip ? 'a' : 'b',
        hint: 'A bird in the hand: the sooner the cash arrives, the less it is discounted.',
        explain: `Front-loaded: PV = ${M(pv(front), 1)}. Back-loaded: PV = ${M(pv(back), 1)}. Same total, but every year of waiting costs 10%.`,
      };
    },
  },
  {
    id: 'dcf.wacc-build', stage: 'Structure',
    make(r) {
      return {
        type: 'build',
        prompt: 'Assemble the weighted average cost of capital.',
        parts: ['WACC = E/V × ', 0, ' + D/V × ', 1, ' × ', 2],
        tokens: r.shuffle(['Cost of equity', 'Cost of debt', '(1 − tax rate)', '(1 + g)', 'Risk-free rate']),
        answer: ['Cost of equity', 'Cost of debt', '(1 − tax rate)'],
        commute: [[1, 2]],
        hint: 'Two investors share the company. Each expects their own return, weighted by their stake.',
        explain: 'Each source of capital is weighted by its share of total value. Debt is cheaper after tax because interest is deductible: hence the (1 − t).',
      };
    },
  },
  {
    id: 'dcf.gordon-g', stage: 'Logic',
    make(r) {
      const W = r.pick([8, 9, 10]);
      const up = ((1.03 / (W - 3)) / (1.02 / (W - 2)) - 1) * 100;
      const { options, answer } = mc(r, `About +${Math.round(up)}%`, ['About +1%', `About +${Math.round(up * 2.5)}%`, 'About −5%']);
      return {
        type: 'choice',
        prompt: `WACC is ${W}%. Long-term growth moves from 2% to 3%. The Gordon growth terminal value rises by…`,
        options, answer,
        hint: 'Watch the gap between WACC and g. It sits in the denominator, and small denominators bite.',
        explain: `TV = FCF × (1 + g) ÷ (WACC − g). The numerator barely moves (1.02 → 1.03, +1%), but the denominator shrinks from ${W - 2}% to ${W - 3}%: TV rises about ${Math.round(up)}%.`,
      };
    },
  },
  {
    id: 'dcf.wacc-case', stage: 'Deal case',
    make(r) {
      const E = r.pick([600, 700]);
      const D = 1000 - E;
      const Re = r.pick([10, 11, 12]);
      const Rd = r.pick([5, 6, 7]);
      const w = (E * Re + D * Rd * 0.75) / 1000;
      const { options, answer } = mc(r, PCT(w, 2), [PCT((E * Re + D * Rd) / 1000, 2), PCT((D * Re + E * Rd * 0.75) / 1000, 2), PCT((E * Re) / 1000, 2)]);
      return {
        type: 'choice',
        prompt: 'What is the WACC?',
        data: [['Equity value (market)', M(E)], ['Debt (market)', M(D)], ['Cost of equity', PCT(Re, 1)], ['Pre-tax cost of debt', PCT(Rd, 1)], ['Tax rate', '25%']],
        options, answer,
        hint: 'Weights from market values, and don’t forget who gets a tax break.',
        explain: `WACC = ${E / 10}% × ${Re}% + ${D / 10}% × ${Rd}% × (1 − 25%) = ${PCT((E * Re) / 1000, 2)} + ${PCT((D * Rd * 0.75) / 1000, 2)} = ${PCT(w, 2)}.`,
      };
    },
  },
  {
    id: 'dcf.terminal', stage: 'Deal case',
    make(r) {
      const F = r.pick([80, 100, 120]);
      const g = r.pick([2, 2.5, 3]);
      const W = r.pick([8, 9, 10]);
      const tv = (F * (1 + g / 100)) / ((W - g) / 100);
      const { options, answer } = mc(r, M(tv), [M(F / ((W - g) / 100)), M((F * (1 + g / 100)) / (W / 100)), M((F * (1 + g / 100)) / ((W + g) / 100))]);
      return {
        type: 'choice',
        prompt: 'Terminal value at the end of year 5, Gordon growth method?',
        data: [['Year-5 unlevered FCF', M(F)], ['Long-term growth', PCT(g, 1)], ['WACC', PCT(W, 1)]],
        options, answer,
        hint: 'The terminal value is next year’s cash flow, capitalised at the spread between WACC and growth.',
        explain: `TV = FCF × (1 + g) ÷ (WACC − g) = ${M(F)} × ${(1 + g / 100).toFixed(3)} ÷ ${PCT(W - g, 1)} = ${M(tv)}.`,
      };
    },
  },
];

/* ---------- 3. Trading comparables ---------- */
const comps = [
  {
    id: 'comps.multiple', stage: 'Intuition',
    make(r) {
      const E = r.pick([50, 60, 80]);
      const m = r.pick([7, 8.5, 9, 10.5, 12]);
      return {
        type: 'slider',
        prompt: `EBITDA is ${M(E)}. Drag the EV/EBITDA multiple until enterprise value reaches ${M(E * m)}.`,
        min: 4, max: 16, step: 0.5, start: 4,
        format: (v) => `EV/EBITDA ${X(v)}`,
        readouts: (v) => [['Enterprise value', M(E * v)]],
        answer: m,
        hint: 'A multiple is a price tag per dollar of EBITDA.',
        explain: `EV = EBITDA × multiple, so the multiple = ${M(E * m)} ÷ ${M(E)} = ${X(m)}.`,
      };
    },
  },
  {
    id: 'comps.cheaper', stage: 'Mechanism',
    make(r) {
      const [hi, lo] = r.pick([[9, 8], [11, 9.5], [7.5, 6.5]]);
      const pricey = [['Enterprise value', M(100 * hi)], ['EBITDA', M(100)]];
      const cheap = [['Enterprise value', M(150 * lo)], ['EBITDA', M(150)]];
      const flip = r.bool();
      return {
        type: 'compare',
        prompt: 'Two peers in the same sector. Which trades cheaper on EV/EBITDA?',
        a: { name: 'Peer A', rows: flip ? cheap : pricey },
        b: { name: 'Peer B', rows: flip ? pricey : cheap },
        answer: flip ? 'a' : 'b',
        hint: 'Ignore the size of the price tag. Divide it by what you get.',
        explain: `${M(100 * hi)} ÷ ${M(100)} = ${X(hi)}; ${M(150 * lo)} ÷ ${M(150)} = ${X(lo)}. The bigger EV is the cheaper company.`,
      };
    },
  },
  {
    id: 'comps.bridge', stage: 'Structure',
    make(r) {
      return {
        type: 'build',
        prompt: 'Bridge from enterprise value to equity value.',
        parts: ['Equity value = EV − ', 0, ' − ', 1, ' + ', 2],
        tokens: r.shuffle(['Total debt', 'Minority interest', 'Cash', 'Goodwill', 'Revenue']),
        answer: ['Total debt', 'Minority interest', 'Cash'],
        commute: [[0, 1]],
        hint: 'EV is the whole house. Your equity is what’s left once the mortgage and the co-owners are paid, plus the cash in the drawer.',
        explain: 'EV belongs to every capital provider. Take out what lenders (debt) and minority holders own, add back the cash, and what remains is the shareholders’ equity value.',
      };
    },
  },
  {
    id: 'comps.mismatch', stage: 'Logic',
    make(r) {
      const v = r.bool();
      const ratio = v ? 'EV ÷ net income' : 'Equity value ÷ EBITDA';
      const right = v
        ? 'Mismatch: net income is after interest, so it belongs to shareholders only. Pair it with equity value (P/E).'
        : 'Mismatch: EBITDA is before interest, so it belongs to every capital provider. Pair it with EV.';
      const { options, answer } = mc(r, right, [
        'Nothing: any value over any profit line works if you use it consistently.',
        'It should be divided by revenue instead.',
        'It only fails for companies with negative cash.',
      ]);
      return {
        type: 'choice',
        prompt: `Your analyst valued the peer set on ${ratio}. What’s wrong?`,
        options, answer,
        hint: 'Ask: who gets paid out of this profit line, and who owns this value?',
        explain: 'A multiple must match its numerator and denominator to the same investors. EV (all capital) ↔ EBITDA or EBIT (before interest). Equity value (shareholders) ↔ net income (after interest).',
      };
    },
  },
  {
    id: 'comps.price', stage: 'Deal case',
    make(r) {
      const set = r.pick([{ m: [7.5, 8, 9, 11, 12.5], med: 9 }, { m: [6.5, 7, 8, 8.5, 12], med: 8 }]);
      const mean = set.m.reduce((a, b) => a + b, 0) / set.m.length;
      const E = r.pick([60, 80, 100]);
      const ND = r.pick([80, 120, 150]);
      const S = r.pick([40, 50]);
      const p = (mult, nd) => (mult * E - nd) / S;
      const { options, answer } = mc(r, USD(p(set.med, ND)), [USD(p(mean, ND)), USD(p(set.med, 0)), USD(p(set.med, -ND))]);
      return {
        type: 'choice',
        prompt: 'Implied share price from the median peer EV/EBITDA?',
        data: [['Peer EV/EBITDA', set.m.map((x) => X(x)).join(' · ')], ['Target EBITDA', M(E)], ['Net debt', M(ND)], ['Diluted shares', `${S}M`]],
        options, answer,
        hint: 'Median multiple → EV → equity value → per share. Watch the bridge.',
        explain: `Median = ${X(set.med)} (the mean, ${X(mean, 2)}, is pulled up by the outlier). EV = ${X(set.med)} × ${M(E)} = ${M(set.med * E)}. Equity = EV − net debt = ${M(set.med * E - ND)}. Per share = ÷ ${S}M = ${USD(p(set.med, ND))}.`,
      };
    },
  },
  {
    id: 'comps.pe', stage: 'Deal case',
    make(r) {
      const NI = r.pick([40, 48, 60]);
      const PE = r.pick([14, 16, 18]);
      const S = r.pick([20, 25, 30]);
      const EB = NI * 2;
      const { options, answer } = mc(r, USD((NI * PE) / S), [USD((EB * PE) / S), USD(NI / S), USD((NI * PE) / S / 2)]);
      return {
        type: 'choice',
        prompt: 'Implied share price on the peer median P/E?',
        data: [['EBITDA', M(EB)], ['Net income', M(NI)], ['Diluted shares', `${S}M`], ['Peer median P/E', X(PE)]],
        options, answer,
        hint: 'P/E is equity value over net income. Which line belongs to shareholders?',
        explain: `Equity value = ${X(PE)} × ${M(NI)} = ${M(NI * PE)}. Per share = ÷ ${S}M = ${USD((NI * PE) / S)}. EBITDA is a trap here: it belongs with EV, not P/E.`,
      };
    },
  },
];

/* ---------- 4. Precedent transactions ---------- */
const precedents = [
  {
    id: 'precedents.premium-slider', stage: 'Intuition',
    make(r) {
      const P = r.pick([20, 32, 40, 48]);
      const prem = r.pick([20, 25, 30, 35, 40]);
      return {
        type: 'slider',
        prompt: `The target trades at ${USD(P)} undisturbed. Drag the control premium until the offer reaches ${USD(P * (1 + prem / 100))} a share.`,
        min: 0, max: 60, step: 5, start: 0,
        format: (v) => `Premium ${v}%`,
        readouts: (v) => [['Offer price', USD(P * (1 + v / 100))]],
        answer: prem,
        hint: 'To buy the whole company you must outbid every holder’s reservation price.',
        explain: `Offer = undisturbed × (1 + premium): ${USD(P)} × ${(1 + prem / 100).toFixed(2)} = ${USD(P * (1 + prem / 100))}, a ${prem}% premium.`,
      };
    },
  },
  {
    id: 'precedents.relevance', stage: 'Mechanism',
    make(r) {
      const good = [['Year', '2025'], ['Sector', 'Vertical software'], ['Deal size', BN(900)], ['EV/EBITDA', X(14)]];
      const bad = [['Year', '2015'], ['Sector', 'Hardware distribution'], ['Deal size', BN(6500)], ['EV/EBITDA', X(9)]];
      const flip = r.bool();
      return {
        type: 'compare',
        prompt: 'You’re pricing a mid-cap vertical software business in 2026. Which precedent belongs in your set?',
        a: { name: 'Deal A', rows: flip ? good : bad },
        b: { name: 'Deal B', rows: flip ? bad : good },
        answer: flip ? 'a' : 'b',
        hint: 'Precedents age like milk. Same sector, similar size, recent market.',
        explain: 'Relevance beats size: same business model, a comparable ticket and a recent credit market. A decade-old hardware deal priced a different company in a different rate environment.',
      };
    },
  },
  {
    id: 'precedents.premium-build', stage: 'Structure',
    make(r) {
      return {
        type: 'build',
        prompt: 'Assemble the offer premium.',
        parts: ['Premium = (', 0, ' − ', 1, ') ÷ ', 2],
        tokens: r.shuffle(['Offer price', 'Undisturbed price', 'Undisturbed price', '52-week high', 'EPS']),
        answer: ['Offer price', 'Undisturbed price', 'Undisturbed price'],
        hint: 'A premium is a markup: (new − old) ÷ old.',
        explain: 'Measure the premium against the undisturbed price, before rumours or the announcement moved the stock. Against a 52-week high it would look smaller than it is.',
      };
    },
  },
  {
    id: 'precedents.why-higher', stage: 'Logic',
    make(r) {
      const { options, answer } = mc(r, 'Buyers pay a control premium, partly funded by the synergies they expect.', [
        'Precedents use forward EBITDA, which is always lower.',
        'Trading multiples exclude debt from enterprise value.',
        'Precedent deals only happen in bull markets.',
      ]);
      return {
        type: 'choice',
        prompt: 'Why do precedent multiples usually sit above trading multiples?',
        options, answer,
        hint: 'Renting a room versus buying the house.',
        explain: 'A share on the screen is a minority stake. A takeover buys control: the right to set strategy, cut costs and capture synergies. Buyers pay for that, typically 20–40% over the undisturbed price.',
      };
    },
  },
  {
    id: 'precedents.ev', stage: 'Deal case',
    make(r) {
      const set = r.pick([{ m: [9.5, 10.5, 11, 12, 14], med: 11 }, { m: [8, 9, 10, 10.5, 13.5], med: 10 }]);
      const mean = set.m.reduce((a, b) => a + b, 0) / set.m.length;
      const E = r.pick([50, 60, 80]);
      const { options, answer } = mc(r, M(set.med * E), [M(mean * E), M(Math.max(...set.m) * E), M(Math.min(...set.m) * E)]);
      return {
        type: 'choice',
        prompt: 'Implied enterprise value on the median precedent multiple?',
        data: [['Precedent EV/EBITDA', set.m.map((x) => X(x)).join(' · ')], ['Target LTM EBITDA', M(E)]],
        options, answer,
        hint: 'Line them up and take the middle one.',
        explain: `Median = ${X(set.med)} (mean ${X(mean, 1)}). EV = ${X(set.med)} × ${M(E)} = ${M(set.med * E)}.`,
      };
    },
  },
  {
    id: 'precedents.offer-ev', stage: 'Deal case',
    make(r) {
      const [P, prem, S, ND] = r.pick([[40, 30, 100, 800], [25, 25, 80, 600], [50, 20, 60, 500]]);
      const offer = P * (1 + prem / 100);
      const eq = offer * S;
      const { options, answer } = mc(r, BN(eq + ND), [BN(eq), BN(P * S + ND), BN(eq - ND)]);
      return {
        type: 'choice',
        prompt: 'What enterprise value does the offer imply?',
        data: [['Undisturbed share price', USD(P)], ['Offer premium', `${prem}%`], ['Diluted shares', `${S}M`], ['Net debt', M(ND)]],
        options, answer,
        hint: 'Price per share → equity purchase price → add what the buyer also takes on.',
        explain: `Offer = ${USD(P)} × ${(1 + prem / 100).toFixed(2)} = ${USD(offer)}. Equity = ${USD(offer)} × ${S}M = ${BN(eq)}. EV = equity + net debt = ${BN(eq + ND)}.`,
      };
    },
  },
];

/* ---------- 5. The leveraged buyout ---------- */
const lbo = [
  {
    id: 'lbo.leverage', stage: 'Intuition',
    make(r) {
      const [exit, m, d] = r.pick([[1400, 2, 60], [1300, 2, 70], [1500, 2, 50], [1200, 1.5, 60]]);
      const moic = (pct) => (exit - 10 * pct) / (1000 - 10 * pct);
      return {
        type: 'slider',
        prompt: `Buy at ${M(1000)}, sell for ${M(exit)} in five years, no debt paydown. Drag the debt share of the price until MOIC reaches ${X(m)}.`,
        min: 0, max: 80, step: 5, start: 0,
        format: (v) => `Debt ${v}% of price`,
        readouts: (v) => [['Equity cheque', M(1000 - 10 * v)], ['MOIC', X(moic(v), 2)]],
        answer: d,
        hint: 'Leverage is a lever: the same gain lands on a smaller cheque.',
        explain: `MOIC = (exit − debt) ÷ (price − debt). Solve for debt: (${m} × 1,000 − ${num(exit)}) ÷ (${m} − 1) = ${M(10 * d)}, ${d}% of the price.`,
      };
    },
  },
  {
    id: 'lbo.candidate', stage: 'Mechanism',
    make(r) {
      const good = [['EBITDA margin', '24%'], ['CapEx, % of sales', '3%'], ['Revenue volatility', 'Low'], ['FCF conversion', '70%']];
      const bad = [['EBITDA margin', '13%'], ['CapEx, % of sales', '12%'], ['Revenue volatility', 'High, cyclical'], ['FCF conversion', '25%']];
      const flip = r.bool();
      return {
        type: 'compare',
        prompt: 'Which business can carry an LBO capital structure?',
        a: { name: 'Target A', rows: flip ? good : bad },
        b: { name: 'Target B', rows: flip ? bad : good },
        answer: flip ? 'a' : 'b',
        hint: 'Lenders lend against predictable cash. Think toll road, not fashion label.',
        explain: 'Debt is repaid from free cash flow. High margins, light CapEx and steady revenue mean more cash, more reliably, to service and pay down the loan.',
      };
    },
  },
  {
    id: 'lbo.moic-build', stage: 'Structure',
    make(r) {
      return {
        type: 'build',
        prompt: 'Assemble the sponsor’s multiple of invested capital.',
        parts: ['MOIC = (', 0, ' − ', 1, ') ÷ ', 2],
        tokens: r.shuffle(['Exit EV', 'Net debt at exit', 'Equity invested', 'Entry EV', 'EBITDA']),
        answer: ['Exit EV', 'Net debt at exit', 'Equity invested'],
        hint: 'What you get back over what you put in, and you only get back what’s left after the lenders.',
        explain: 'At exit the sponsor sells the whole company (exit EV), repays the remaining debt, and keeps the rest. MOIC compares that to the equity cheque written at entry.',
      };
    },
  },
  {
    id: 'lbo.irr-rule', stage: 'Logic',
    make(r) {
      const cases = [[2, 5], [3, 5], [2, 3], [2.5, 5], [3, 3]];
      const [m, n] = r.pick(cases);
      const irr = (m ** (1 / n) - 1) * 100;
      const others = cases.filter(([a, b]) => a !== m || b !== n).map(([a, b]) => `~${Math.round((a ** (1 / b) - 1) * 100)}%`);
      const { options, answer } = mc(r, `~${Math.round(irr)}%`, [`~${Math.round(((m - 1) / n) * 100)}%`, ...r.shuffle(others)]);
      return {
        type: 'choice',
        prompt: `A sponsor makes ${X(m)} its money in ${n} years. The IRR is closest to…`,
        options, answer,
        hint: '2x in 5 ≈ 15%, 3x in 5 ≈ 25%, 2x in 3 ≈ 26%. Compounding, not division.',
        explain: `IRR = MOIC^(1/years) − 1 = ${m}^(1/${n}) − 1 = ${PCT(irr, 1)}. Dividing the gain by the years (${PCT(((m - 1) / n) * 100, 1)}) ignores compounding.`,
      };
    },
  },
  {
    id: 'lbo.moic-case', stage: 'Deal case',
    make(r) {
      const E = r.pick([80, 100]);
      const em = r.pick([8, 9]);
      const lev = r.pick([5, 5.5]);
      const growth = r.pick([1.25, 1.3]);
      const debt = lev * E;
      const eq = em * E - debt;
      const exitEV = E * growth * em;
      const left = debt * 0.6;
      const moic = (exitEV - left) / eq;
      const { options, answer } = mc(r, X(moic, 2), [X((exitEV - debt) / eq, 2), X(exitEV / (em * E), 2), X((exitEV - left) / (em * E), 2)]);
      return {
        type: 'choice',
        prompt: 'Five-year LBO, exit at the entry multiple. What MOIC does the sponsor earn?',
        data: [['Entry EBITDA', M(E)], ['Entry multiple', X(em)], ['Debt raised', `${X(lev)} EBITDA`], ['Exit EBITDA', M(E * growth)], ['Debt repaid by exit', '40%']],
        options, answer,
        hint: 'Three levers: EBITDA growth, multiple, and the debt the cash flows paid down.',
        explain: `Entry: EV ${M(em * E)}, debt ${M(debt)}, equity ${M(eq)}. Exit: EV ${M(exitEV)}, debt left ${M(left)}, equity ${M(exitEV - left)}. MOIC = ${M(exitEV - left)} ÷ ${M(eq)} = ${X(moic, 2)}.`,
      };
    },
  },
  {
    id: 'lbo.irr-case', stage: 'Deal case',
    make(r) {
      const inv = r.pick([250, 300, 400]);
      const m = r.pick([2.2, 2.5, 3]);
      const irr = (m ** (1 / 5) - 1) * 100;
      const { options, answer } = mc(r, PCT(irr, 1), [PCT(((m - 1) / 5) * 100, 1), PCT((m ** (1 / 4) - 1) * 100, 1), PCT((m / 5) * 100, 1)]);
      return {
        type: 'choice',
        prompt: 'What IRR did the sponsor earn?',
        data: [['Equity invested', M(inv)], ['Equity returned at exit', M(inv * m)], ['Holding period', '5 years'], ['Interim dividends', 'None']],
        options, answer,
        hint: 'Find the MOIC first, then take the fifth root.',
        explain: `MOIC = ${M(inv * m)} ÷ ${M(inv)} = ${X(m)}. IRR = ${m}^(1/5) − 1 = ${PCT(irr, 1)}.`,
      };
    },
  },
];

/* ---------- 6. M&A accretion and dilution ---------- */
const ma = [
  {
    id: 'ma.breakeven', stage: 'Intuition',
    make(r) {
      const A = r.pick([15, 18, 20, 24]);
      const impact = (x) => (120 / (100 + (20 * x) / A) - 1) * 100;
      return {
        type: 'slider',
        prompt: `All-stock deal. Your shares trade at ${X(A)} earnings. Drag the P/E you pay for the target until the deal is exactly EPS-neutral.`,
        min: 8, max: 32, step: 1, start: 8,
        format: (v) => `P/E paid ${X(v)}`,
        readouts: (v) => [['EPS impact', SPCT(impact(v))]],
        answer: A,
        hint: 'You pay with your own shares. Compare what your shares earn with what the target earns per dollar.',
        explain: `In an all-stock deal you swap your earnings yield (1 ÷ ${A} = ${PCT(100 / A, 1)}) for the target’s. It’s neutral when the two are equal: P/E paid = ${X(A)}.`,
      };
    },
  },
  {
    id: 'ma.financing', stage: 'Mechanism',
    make(r) {
      const v = r.pick([{ T: 14, rate: 6, PE: 16 }, { T: 12, rate: 7, PE: 18 }, { T: 14, rate: 7, PE: 25 }]);
      const debtCost = v.rate * 0.75;
      const stockCost = 100 / v.PE;
      const cash = [['Funded with', 'New debt'], ['Pre-tax interest', PCT(v.rate, 1)], ['Tax rate', '25%']];
      const stock = [['Funded with', 'New shares'], ['Your P/E', X(v.PE)]];
      const flip = r.bool();
      const cheaper = debtCost < stockCost ? 'cash' : 'stock';
      return {
        type: 'compare',
        prompt: `You’re buying a target at ${X(v.T)} earnings. Which financing makes the deal more accretive?`,
        a: { name: 'Option A', rows: flip ? stock : cash },
        b: { name: 'Option B', rows: flip ? cash : stock },
        answer: (cheaper === 'cash') !== flip ? 'a' : 'b',
        hint: 'Every currency has a cost: interest after tax for debt, 1 ÷ P/E for stock. Pick the cheaper one.',
        explain: `Debt costs ${v.rate}% × (1 − 25%) = ${PCT(debtCost, 2)}. Stock costs 1 ÷ ${v.PE} = ${PCT(stockCost, 2)}. The target yields 1 ÷ ${v.T} = ${PCT(100 / v.T, 2)}, so both are accretive, but ${cheaper === 'cash' ? 'debt' : 'stock'} is the cheaper currency.`,
      };
    },
  },
  {
    id: 'ma.pf-build', stage: 'Structure',
    make(r) {
      return {
        type: 'build',
        prompt: 'Assemble pro forma EPS for a deal funded with debt and stock.',
        parts: ['Pro forma EPS = (', 0, ' + ', 1, ' − ', 2, ') ÷ (', 3, ' + ', 4, ')'],
        tokens: r.shuffle(['Acquirer net income', 'Target net income', 'After-tax interest on new debt', 'Acquirer shares', 'New shares issued', 'Target EV', 'Dividends']),
        answer: ['Acquirer net income', 'Target net income', 'After-tax interest on new debt', 'Acquirer shares', 'New shares issued'],
        commute: [[0, 1], [3, 4]],
        hint: 'Pie over slices: the pie gets bigger, and so may the number of slices.',
        explain: 'Combine both earnings, subtract the after-tax cost of the new debt, and spread the result over the old shares plus any new ones.',
      };
    },
  },
  {
    id: 'ma.accretive', stage: 'Logic',
    make(r) {
      const [a, b, res] = r.pick([[12, 18, 'Dilutive'], [20, 15, 'Accretive'], [16, 16, 'EPS-neutral']]);
      const { options, answer } = mc(r, res, ['Accretive', 'Dilutive', 'EPS-neutral', 'Depends only on synergies'].filter((x) => x !== res));
      return {
        type: 'choice',
        prompt: `An acquirer at ${X(a)} P/E buys a target at ${X(b)} P/E, 100% in stock, no synergies. The deal is…`,
        options, answer,
        hint: 'High-P/E paper buys low-P/E earnings cheaply. And the reverse.',
        explain: `The acquirer gives up ${PCT(100 / a, 2)} of earnings per dollar of stock issued and receives ${PCT(100 / b, 2)}. ${res === 'Accretive' ? 'It gets more than it gives: accretive.' : res === 'Dilutive' ? 'It gets less than it gives: dilutive.' : 'Equal yields: neutral.'}`,
      };
    },
  },
  {
    id: 'ma.stock-case', stage: 'Deal case',
    make(r) {
      const [NIa, S] = r.pick([[500, 250], [400, 200]]);
      const PEa = r.pick([20, 18]);
      const price = (NIa / S) * PEa;
      const NIt = r.pick([60, 50]);
      const PEt = r.pick([15, 12]);
      const cost = NIt * PEt;
      const nsh = cost / price;
      const acc = ((NIa + NIt) / (S + nsh) / (NIa / S) - 1) * 100;
      const { options, answer } = mc(r, SPCT(acc), [SPCT(((NIa + NIt) / S / (NIa / S) - 1) * 100), SPCT(-acc), SPCT(0)]);
      return {
        type: 'choice',
        prompt: 'All-stock acquisition, no synergies. EPS accretion or dilution?',
        data: [['Acquirer net income', M(NIa)], ['Acquirer shares', `${S}M`], ['Acquirer P/E', X(PEa)], ['Target net income', M(NIt)], ['Price paid', `${X(PEt)} earnings`]],
        options, answer,
        hint: 'Price paid ÷ your share price = new shares. Then pie over slices.',
        explain: `Price paid = ${M(cost)}. Your share price = ${USD(price)}, so ${num(nsh, 1)}M new shares. Pro forma EPS = ${M(NIa + NIt)} ÷ ${num(S + nsh, 1)}M = ${USD((NIa + NIt) / (S + nsh))} vs ${USD(NIa / S)} today: ${SPCT(acc)}.`,
      };
    },
  },
  {
    id: 'ma.cash-case', stage: 'Deal case',
    make(r) {
      const [NIa, S] = r.pick([[500, 250], [400, 200]]);
      const NIt = r.pick([60, 50]);
      const PEt = r.pick([15, 12]);
      const rate = r.pick([6, 7, 8]);
      const cost = NIt * PEt;
      const eps0 = NIa / S;
      const after = cost * (rate / 100) * 0.75;
      const acc = ((NIa + NIt - after) / S / eps0 - 1) * 100;
      const { options, answer } = mc(r, SPCT(acc), [SPCT(((NIa + NIt - cost * (rate / 100)) / S / eps0 - 1) * 100), SPCT(((NIa + NIt) / S / eps0 - 1) * 100), SPCT(-acc)]);
      return {
        type: 'choice',
        prompt: 'Same target, now funded 100% with new debt. EPS impact?',
        data: [['Acquirer net income', M(NIa)], ['Acquirer shares', `${S}M`], ['Target net income', M(NIt)], ['Price paid', `${X(PEt)} earnings`], ['Interest on new debt', PCT(rate, 1)], ['Tax rate', '25%']],
        options, answer,
        hint: 'No new shares this time. The cost is the interest, and the taxman pays a quarter of it.',
        explain: `Debt = ${M(cost)}. After-tax interest = ${M(cost)} × ${rate}% × 75% = ${M(after, 2)}. Pro forma EPS = (${M(NIa + NIt)} − ${M(after, 2)}) ÷ ${S}M = ${USD((NIa + NIt - after) / S)} vs ${USD(eps0)}: ${SPCT(acc)}.`,
      };
    },
  },
];

/* ---------- 7. Restructuring ---------- */
const restructuring = [
  {
    id: 'restructuring.waterfall', stage: 'Intuition',
    make(r) {
      const S = r.pick([300, 400]);
      const J = 200;
      const rec = r.pick([25, 50, 75]);
      const target = S + (J * rec) / 100;
      return {
        type: 'slider',
        prompt: `Senior notes ${M(S)}, junior notes ${M(J)}. Drag enterprise value until seniors are fully covered and juniors recover exactly ${rec}%.`,
        min: 100, max: 800, step: 25, start: 100,
        format: (v) => `Enterprise value ${M(v)}`,
        readouts: (v) => [
          ['Senior recovery', PCT(Math.min(1, v / S) * 100, 0)],
          ['Junior recovery', PCT(Math.max(0, Math.min(1, (v - S) / J)) * 100, 0)],
          ['Left for equity', M(Math.max(0, v - S - J))],
        ],
        answer: target,
        hint: 'Pour value from the top. The first bucket fills before a drop reaches the next.',
        explain: `Seniors take the first ${M(S)}. Juniors then need ${rec}% of ${M(J)} = ${M((J * rec) / 100)}. EV = ${M(target)}.`,
      };
    },
  },
  {
    id: 'restructuring.fulcrum', stage: 'Mechanism',
    make(r) {
      const EV = r.pick([550, 850]);
      const su = [['Size', M(300)], ['Claims ahead of it', M(400)]];
      const sub = [['Size', M(200)], ['Claims ahead of it', M(700)]];
      const fulcrum = EV < 700 ? 'su' : 'sub';
      const flip = r.bool();
      return {
        type: 'compare',
        prompt: `Secured loan ${M(400)}, senior unsecured ${M(300)}, subordinated ${M(200)}. Enterprise value is ${M(EV)}. Which class is the fulcrum?`,
        a: { name: flip ? 'Subordinated notes' : 'Senior unsecured', rows: flip ? sub : su },
        b: { name: flip ? 'Senior unsecured' : 'Subordinated notes', rows: flip ? su : sub },
        answer: (fulcrum === 'su') !== flip ? 'a' : 'b',
        hint: 'The fulcrum is the first class that isn’t paid in full but still gets something.',
        explain: EV < 700
          ? `${M(EV)} covers the ${M(400)} secured loan, leaving ${M(EV - 400)} for ${M(300)} of senior unsecured (${PCT(((EV - 400) / 300) * 100, 0)}). The subordinated notes get nothing. Senior unsecured is the fulcrum.`
          : `${M(EV)} covers secured and senior unsecured (${M(700)}), leaving ${M(EV - 700)} for ${M(200)} of subordinated notes (${PCT(((EV - 700) / 200) * 100, 0)}). The subordinated notes are the fulcrum.`,
      };
    },
  },
  {
    id: 'restructuring.priority', stage: 'Structure',
    make(r) {
      return {
        type: 'build',
        prompt: 'Rank the claims by priority in a liquidation.',
        parts: ['1st ', 0, ' 2nd ', 1, ' 3rd ', 2, ' 4th ', 3],
        tokens: r.shuffle(['Secured debt', 'Senior unsecured notes', 'Subordinated notes', 'Common equity']),
        answer: ['Secured debt', 'Senior unsecured notes', 'Subordinated notes', 'Common equity'],
        hint: 'Collateral first, promises next, subordinated promises after that, owners last.',
        explain: 'Absolute priority: secured lenders are paid from their collateral, then senior unsecured, then subordinated creditors who agreed to stand behind them. Equity holders own what is left, if anything.',
      };
    },
  },
  {
    id: 'restructuring.coverage', stage: 'Logic',
    make(r) {
      const [E, C, I] = r.pick([[60, 20, 50], [80, 30, 60], [80, 20, 45]]);
      const ok = E - C >= I;
      const right = ok
        ? `Yes: after CapEx, ${M(E - C)} covers ${M(I)} of interest (${X((E - C) / I)}).`
        : `No: after CapEx, only ${M(E - C)} is left for ${M(I)} of interest.`;
      const traps = ok
        ? ['No: EBITDA − CapEx is below interest.', 'No: any coverage under 2.0x means default.', 'Yes, because CapEx can always be skipped to pay interest.']
        : [`Yes: EBITDA covers interest ${X(E / I)}, so it’s fine.`, 'No: EBITDA is below interest.', 'Yes, because CapEx can always be skipped to pay interest.'];
      const { options, answer } = mc(r, right, traps);
      return {
        type: 'choice',
        prompt: `EBITDA ${M(E)}, maintenance CapEx ${M(C)}, cash interest ${M(I)}. Can operations service the debt?`,
        options, answer,
        hint: 'A landlord pays for the roof before paying the bank.',
        explain: `EBITDA isn’t cash: maintenance CapEx comes first. (EBITDA − CapEx) ÷ interest = ${M(E - C)} ÷ ${M(I)} = ${X((E - C) / I, 2)}.`,
      };
    },
  },
  {
    id: 'restructuring.recovery', stage: 'Deal case',
    make(r) {
      const EV = r.pick([500, 600]);
      const U = r.pick([400, 500]);
      const rec = ((EV - 300) / U) * 100;
      const { options, answer } = mc(r, PCT(rec), [PCT((EV / (300 + U)) * 100), PCT(0), PCT(100)]);
      return {
        type: 'choice',
        prompt: 'What do the unsecured notes recover?',
        data: [['Enterprise value', M(EV)], ['Secured term loan', M(300)], ['Unsecured notes', M(U)]],
        options, answer,
        hint: 'The secured loan drinks first. The unsecured share what’s left.',
        explain: `Secured is paid in full (${M(300)}), leaving ${M(EV - 300)} for ${M(U)} of unsecured notes: ${PCT(rec)}. A pro rata split (${PCT((EV / (300 + U)) * 100)}) would ignore priority.`,
      };
    },
  },
  {
    id: 'restructuring.swap', stage: 'Deal case',
    make(r) {
      const D = r.pick([900, 1000]);
      const E = r.pick([100, 125]);
      const C = r.pick([400, 500]);
      const { options, answer } = mc(r, X((D - C) / E), [X(D / E), X((D + C) / E), X(C / E)]);
      return {
        type: 'choice',
        prompt: 'The unsecured notes swap into equity. Total leverage afterwards?',
        data: [['Total debt', M(D)], ['EBITDA', M(E)], ['Notes converted to equity', M(C)]],
        options, answer,
        hint: 'Debt that becomes equity leaves the numerator.',
        explain: `Debt after the swap = ${M(D)} − ${M(C)} = ${M(D - C)}. Leverage = ${M(D - C)} ÷ ${M(E)} = ${X((D - C) / E)}, down from ${X(D / E)}.`,
      };
    },
  },
];

/* ---------- 8. Deal structuring ---------- */
const structuring = [
  {
    id: 'structuring.earnout', stage: 'Intuition',
    make(r) {
      const [U, p, C, E] = r.pick([[480, 0.5, 540, 120], [400, 0.4, 460, 150], [480, 0.5, 560, 160]]);
      return {
        type: 'slider',
        prompt: `You pay ${M(U)} upfront plus an earn-out paid only if EBITDA targets are hit (${Math.round(p * 100)}% likely). Drag the earn-out until your expected cost is ${M(C)}.`,
        min: 0, max: 200, step: 10, start: 0,
        format: (v) => `Earn-out ${M(v)}`,
        readouts: (v) => [['Headline price to the seller', M(U + v)], ['Your expected cost', M(U + p * v)]],
        answer: E,
        hint: 'The seller hears the headline. You budget the expectation.',
        explain: `Expected cost = upfront + probability × earn-out: ${M(U)} + ${Math.round(p * 100)}% × ${M(E)} = ${M(C)}. The seller still hears ${M(U + E)}: the gap is the risk you handed back.`,
      };
    },
  },
  {
    id: 'structuring.certainty', stage: 'Mechanism',
    make(r) {
      const cashP = r.pick([48, 50]);
      const stockP = r.pick([52, 54]);
      const cash = [['Consideration', 'All cash'], ['Value per share', USD(cashP)]];
      const stock = [['Consideration', 'Stock, fixed exchange ratio'], ['Value per share today', USD(stockP)], ['Acquirer share volatility', '45%']];
      const flip = r.bool();
      return {
        type: 'compare',
        prompt: 'The seller’s board wants certainty of value at closing, four months away. Which offer gives it?',
        a: { name: 'Offer A', rows: flip ? stock : cash },
        b: { name: 'Offer B', rows: flip ? cash : stock },
        answer: flip ? 'b' : 'a',
        hint: 'A fixed number of shares is a fixed promise of shares, not of dollars.',
        explain: `With a fixed exchange ratio the seller’s ${USD(stockP)} moves with the acquirer’s stock until closing. At 45% volatility, four months can swing it by double digits. Cash locks the value.`,
      };
    },
  },
  {
    id: 'structuring.uses', stage: 'Structure',
    make(r) {
      return {
        type: 'build',
        prompt: 'Assemble the uses of funds for a buyout.',
        parts: ['Uses = ', 0, ' + ', 1, ' + ', 2],
        tokens: r.shuffle(['Equity purchase price', 'Refinanced net debt', 'Transaction fees', 'New term loan', 'Sponsor equity']),
        answer: ['Equity purchase price', 'Refinanced net debt', 'Transaction fees'],
        commute: [[0, 1, 2]],
        hint: 'Uses are the receipt. Sources are how you paid it.',
        explain: 'Uses are where the money goes: buying the shares, refinancing the existing debt, paying the fees. New debt and sponsor equity are sources, and sources must equal uses.',
      };
    },
  },
  {
    id: 'structuring.earnout-why', stage: 'Logic',
    make(r) {
      const { options, answer } = mc(r, 'It shifts forecast risk to the seller: you only pay for the growth if it arrives.', [
        'It lowers the headline price the seller sees.',
        'It removes the need for due diligence.',
        'It is always tax-free for the seller.',
      ]);
      return {
        type: 'choice',
        prompt: 'Buyer and seller disagree on next year’s EBITDA. Why would the buyer propose an earn-out?',
        options, answer,
        hint: 'When two sides disagree on the forecast, let the forecast settle the bill.',
        explain: 'An earn-out pays part of the price later, and only if targets are hit. The seller keeps a high headline; the buyer pays it only if the forecast proves right.',
      };
    },
  },
  {
    id: 'structuring.sponsor-equity', stage: 'Deal case',
    make(r) {
      const EP = r.pick([700, 650]);
      const refi = r.pick([200, 250]);
      const fees = r.pick([30, 25]);
      const debt = r.pick([500, 450]);
      const eq = EP + refi + fees - debt;
      const { options, answer } = mc(r, M(eq), [M(EP + refi - debt), M(EP + fees - debt), M(EP - debt)]);
      return {
        type: 'choice',
        prompt: 'How much equity must the sponsor write?',
        data: [['Equity purchase price', M(EP)], ['Existing net debt refinanced', M(refi)], ['Transaction fees', M(fees)], ['New debt raised', M(debt)]],
        options, answer,
        hint: 'Total the uses first. Equity is the plug.',
        explain: `Uses = ${M(EP)} + ${M(refi)} + ${M(fees)} = ${M(EP + refi + fees)}. Sources = ${M(debt)} of debt + sponsor equity. Equity = ${M(eq)}.`,
      };
    },
  },
  {
    id: 'structuring.ownership', stage: 'Deal case',
    make(r) {
      const [O, A] = r.pick([[60, 40], [45, 30]]);
      const T = r.pick([50, 40]);
      const Ash = r.pick([200, 160]);
      const ratio = O / A;
      const nsh = ratio * T;
      const own = (nsh / (Ash + nsh)) * 100;
      const { options, answer } = mc(r, PCT(own), [PCT((nsh / Ash) * 100), PCT((T / (Ash + T)) * 100), PCT(100 - own)]);
      return {
        type: 'choice',
        prompt: 'All-stock deal. What share of the combined company do the target’s holders own?',
        data: [['Offer per target share', USD(O)], ['Acquirer share price', USD(A)], ['Target shares', `${T}M`], ['Acquirer shares', `${Ash}M`]],
        options, answer,
        hint: 'Exchange ratio first, then new shares over the new total.',
        explain: `Exchange ratio = ${USD(O)} ÷ ${USD(A)} = ${ratio.toFixed(2)}. New shares = ${ratio.toFixed(2)} × ${T}M = ${num(nsh)}M. Ownership = ${num(nsh)} ÷ (${Ash} + ${num(nsh)}) = ${PCT(own)}.`,
      };
    },
  },
];

export const LESSONS = { statements, dcf, comps, precedents, lbo, ma, restructuring, structuring };
export const TEMPLATES = Object.fromEntries(Object.values(LESSONS).flat().map((t) => [t.id, t]));

/** Build one question from a template and a seed. */
export const makeQuestion = (tid, seed) => ({ id: tid, stage: TEMPLATES[tid].stage, ...TEMPLATES[tid].make(rng(seed)) });

/** Grade an answer against a question. */
export function grade(q, value) {
  if (value == null) return false;
  if (q.type === 'choice') return value === q.answer;
  if (q.type === 'compare') return value === q.answer;
  if (q.type === 'slider') return Math.abs(value - q.answer) < q.step / 2;
  if (q.type === 'build') {
    if (value.some((v) => v == null)) return false;
    const groups = q.commute ?? [];
    const grouped = new Set(groups.flat());
    for (let k = 0; k < q.answer.length; k += 1) if (!grouped.has(k) && value[k] !== q.answer[k]) return false;
    return groups.every((g) => g.map((k) => value[k]).sort().join('|') === g.map((k) => q.answer[k]).sort().join('|'));
  }
  return false;
}

/** The right answer, written out (for the feedback panel). */
export function answerText(q) {
  if (q.type === 'choice') return q.options[q.answer];
  if (q.type === 'compare') return q[q.answer].name;
  if (q.type === 'slider') return q.format(q.answer);
  if (q.type === 'build') return q.parts.map((p) => (typeof p === 'number' ? q.answer[p] : p)).join('');
  return '';
}
