// The Deal Path: one chapter per module, in desk order. Each chapter has a
// six-question session (src/content/lessons.js) and a Platinum card for the
// Vault, unlocked at two stars: the chapter's golden rule, a memory hook and
// a banker's tip. Ids match public.modules.

export const CHAPTERS = [
  {
    id: 'statements', title: 'The three statements', level: 'Analyst', icon: 'FileSpreadsheet', artifact: 'cube',
    vault: {
      title: 'Cash is a fact',
      rule: 'Profit is an opinion; cash is a fact.',
      hook: 'Net income is the story management tells. Cash from operations is the receipt. When the two drift apart for long, believe the receipt.',
      tip: 'Check cash conversion (CFO ÷ net income) first. Below 80% three years running is a red flag.',
    },
  },
  {
    id: 'dcf', title: 'DCF and WACC', level: 'Analyst', icon: 'Calculator', artifact: 'rings',
    vault: {
      title: 'The toll for waiting',
      rule: 'A dollar tomorrow is a discounted promise.',
      hook: 'WACC is the hurdle: raise the bar and the same cash flows are worth less. Terminal value lives in the gap between WACC and g, and small gaps bite.',
      tip: 'Terminal value is usually 60–80% of a DCF. Stress-test it before anything else.',
    },
  },
  {
    id: 'comps', title: 'Trading comparables', level: 'Analyst', icon: 'Scale', artifact: 'pyramid',
    vault: {
      title: 'Match the payer',
      rule: 'A multiple’s numerator and denominator must belong to the same investors.',
      hook: 'EV pairs with EBITDA: every capital provider is paid out of it. Equity value pairs with net income: only shareholders are.',
      tip: 'Use the median, not the mean. One outlier peer can drag your whole range.',
    },
  },
  {
    id: 'precedents', title: 'Precedent transactions', level: 'Associate', icon: 'History', artifact: 'cube',
    vault: {
      title: 'Control costs extra',
      rule: 'Buying the whole house costs more than renting a room.',
      hook: 'Precedent multiples = trading multiples + a control premium, partly funded by the synergies the buyer expects.',
      tip: 'Recent, same sector, similar size. A ten-year-old precedent is a history lesson, not a price.',
    },
  },
  {
    id: 'lbo', title: 'The leveraged buyout', level: 'Associate', icon: 'Building2', artifact: 'pyramid',
    vault: {
      title: 'The three levers',
      rule: 'Buy cheap, grow EBITDA, pay down debt.',
      hook: 'An LBO is a mortgage on a business: its own cash flows pay off the loan, and you keep the house.',
      tip: '2x in 5 years ≈ 15% IRR. 3x in 5 ≈ 25%. 2x in 3 ≈ 26%.',
    },
  },
  {
    id: 'ma', title: 'M&A accretion and dilution', level: 'VP', icon: 'Merge', artifact: 'rings',
    vault: {
      title: 'Cheap paper buys earnings',
      rule: 'A deal is accretive when what you pay with costs less than what you buy earns.',
      hook: 'Compare yields. Debt costs rate × (1 − t). Stock costs 1 ÷ your P/E. The target earns 1 ÷ the P/E you pay.',
      tip: 'After-tax debt is usually the cheapest currency, until leverage makes it expensive.',
    },
  },
  {
    id: 'restructuring', title: 'Restructuring', level: 'VP', icon: 'LifeBuoy', artifact: 'cube',
    vault: {
      title: 'The waterfall',
      rule: 'Absolute priority: value pours from the top bucket down.',
      hook: 'Secured, senior unsecured, subordinated, then equity. The first bucket only partly filled is the fulcrum, and it usually ends up owning the company.',
      tip: 'Coverage is (EBITDA − CapEx) ÷ cash interest. EBITDA alone flatters a distressed credit.',
    },
  },
  {
    id: 'structuring', title: 'Deal structuring', level: 'MD', icon: 'Puzzle', artifact: 'rings',
    vault: {
      title: 'Bridge the gap',
      rule: 'Structure bridges the gap between price and value.',
      hook: 'An earn-out pays for the future with the future: the seller gets the upside only if it shows up.',
      tip: 'Sources must equal uses. Fees are a use, and they are always bigger than the first draft says.',
    },
  },
];

export const chapterOf = (id) => CHAPTERS.find((c) => c.id === id) ?? null;

/** Chapter of a question template id ("dcf.pv" → the DCF chapter). */
export const chapterOfConcept = (conceptId) => chapterOf(String(conceptId).split('.')[0]);

/** Stars from first-try answers on the six questions. */
export const starsFor = (firstTry) => (firstTry >= 6 ? 3 : firstTry >= 4 ? 2 : 1);

export const VAULT_STARS = 2;
