// Deal calculator: a small, safe expression parser (no eval; the CSP forbids it).
// Understands deal shorthand: 22.5M, 1.2B, 40K, 9.0x, 35%, $ and thousands commas,
// + − × ÷ ^ and parentheses. Returns a number, or null if the input isn't valid yet.

const SUFFIX = { k: 1e3, m: 1e6, mm: 1e6, b: 1e9, bn: 1e9, x: 1, '%': 0.01 };

function tokenize(src) {
  const s = src.replace(/[×*]/g, '*').replace(/[÷/]/g, '/').replace(/[−–]/g, '-').replace(/\$/g, '');
  const out = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.,]/.test(s[j])) j++;
      const raw = s.slice(i, j).replace(/,/g, '');
      if (!/^\d*\.?\d+$|^\d+\.$/.test(raw)) return null;
      let value = parseFloat(raw);
      const rest = s.slice(j).toLowerCase();
      const suf = ['bn', 'mm', 'k', 'm', 'b', 'x', '%'].find((k) => rest.startsWith(k) && !/[a-z]/.test(rest[k.length] ?? ''));
      if (suf) {
        value *= SUFFIX[suf];
        j += suf.length;
      }
      out.push({ t: 'n', v: value });
      i = j;
      continue;
    }
    if ('+-*/^()'.includes(c)) { out.push({ t: c }); i++; continue; }
    return null;
  }
  return out;
}

export function evaluate(src) {
  if (!src || !src.trim()) return null;
  const tokens = tokenize(src);
  if (!tokens || !tokens.length) return null;
  let pos = 0;
  const peek = () => tokens[pos]?.t;
  const fail = () => { throw new Error('parse'); };

  const primary = () => {
    const tok = tokens[pos];
    if (!tok) fail();
    if (tok.t === 'n') { pos++; return tok.v; }
    if (tok.t === '(') {
      pos++;
      const v = expr();
      if (peek() !== ')') fail();
      pos++;
      return v;
    }
    return fail();
  };
  const unary = () => {
    if (peek() === '-') { pos++; return -unary(); }
    if (peek() === '+') { pos++; return unary(); }
    return primary();
  };
  const power = () => {
    const base = unary();
    if (peek() === '^') { pos++; return base ** power(); }
    return base;
  };
  const term = () => {
    let v = power();
    while (peek() === '*' || peek() === '/') {
      const op = tokens[pos++].t;
      const r = power();
      v = op === '*' ? v * r : v / r;
    }
    return v;
  };
  function expr() {
    let v = term();
    while (peek() === '+' || peek() === '-') {
      const op = tokens[pos++].t;
      const r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }

  try {
    const v = expr();
    if (pos !== tokens.length || !Number.isFinite(v)) return null;
    return v;
  } catch {
    return null;
  }
}

const full = new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 });

/** { main, alt } display strings for a result, e.g. 22500000 → "22,500,000" / "$22.5M". */
export function formatResult(v) {
  if (v == null) return null;
  const a = Math.abs(v);
  const compact = (n, unit) => `${+(v / n).toFixed(2)}${unit}`;
  let alt = null;
  if (a >= 1e9) alt = compact(1e9, 'B');
  else if (a >= 1e6) alt = compact(1e6, 'M');
  else if (a >= 1e4) alt = compact(1e3, 'K');
  else if (a > 0 && a < 1) alt = `${+(v * 100).toFixed(2)}%`;
  const main = a !== 0 && a < 1e-4 ? v.toExponential(3) : full.format(+v.toPrecision(10));
  return { main, alt };
}

/** Turns a deal-term value into something the calculator can use: "$22.50M" → "22.5M", "9.0x EV / EBITDA" → "9.0x". */
export function termToToken(value) {
  const m = String(value).replace(/,/g, '').match(/(\d*\.?\d+)\s*(bn|mm|[kmb]|x|%)?/i);
  if (!m) return null;
  const n = String(parseFloat(m[1]));
  const suf = (m[2] ?? '').toUpperCase().replace('X', 'x');
  return `${n}${suf}`;
}
