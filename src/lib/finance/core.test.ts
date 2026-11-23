import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as f from './core.ts';

const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('EV by multiple and the equity bridge round-trip', () => {
  const ev = f.evFromMultiple(50, 8);
  assert.equal(ev, 400);
  const eq = f.equityFromEv(ev, 120, 20);
  assert.equal(eq, 300);
  assert.equal(f.evFromEquity(eq, 120, 20), 400);
  near(f.perShare(300, 40), 7.5);
  assert.throws(() => f.perShare(1, 0), RangeError);
  assert.throws(() => f.evFromMultiple(Number.NaN, 8), RangeError);
});

test('CAPM and WACC', () => {
  near(f.costOfEquity(0.04, 1.2, 0.05), 0.1);
  near(f.wacc({ equity: 600, debt: 400, costEquity: 0.1, costDebt: 0.05, tax: 0.25 }), 0.075);
  assert.throws(() => f.wacc({ equity: 0, debt: 0, costEquity: 0.1, costDebt: 0.05, tax: 0.25 }), RangeError);
});

test('Gordon growth and the landing demo DCF', () => {
  assert.equal(f.gordon(30, 0.08, 0.03), 600);
  assert.throws(() => f.gordon(30, 0.03, 0.03), RangeError);
  near(f.presentValue(110, 0.1, 1), 100);
  near(f.discountFactor(0.1, 2), 1 / 1.21);
});

test('DCF adds discounted flows and the terminal value at year N', () => {
  const r = f.dcf([100, 100], 0.1, 1000);
  near(r.pvFlows, 100 / 1.1 + 100 / 1.21);
  near(r.pvTerminal, 1000 / 1.21);
  near(r.ev, r.pvFlows + r.pvTerminal);
});

test('LBO: MOIC, IRR from MOIC and IRR from flows agree', () => {
  near(f.irrFromMoic(2, 5), 0.148698, 1e-5);
  near(f.irrFromMoic(3, 5), 0.245731, 1e-5);
  const flows = [-100, 0, 0, 0, 0, 300];
  near(f.irr(flows) ?? 0, f.irrFromMoic(3, 5), 1e-6);
  assert.equal(f.irr([100, 50]), null);
  const deal = f.lbo({ entryEbitda: 100, entryMultiple: 10, leverage: 6, exitEbitda: 140, exitMultiple: 10, years: 5, debtRepaid: 200 });
  assert.equal(deal.equityIn, 400);
  assert.equal(deal.exitEquity, 1400 - 400);
  near(deal.moic, 2.5);
});

test('accretion / dilution', () => {
  // All-stock: 50 new shares at 100 standalone shares; target earns 40 on acquirer 200.
  const stock = f.accretion({ acquirerNi: 200, acquirerShares: 100, targetNi: 40, newShares: 50, newDebt: 0, rate: 0, tax: 0.25 });
  near(stock.standalone, 2);
  near(stock.proForma, 1.6);
  near(stock.change, -0.2);
  // All-debt at 6% pre-tax: 500 × 6% × 0.75 = 22.5 after-tax interest.
  const debt = f.accretion({ acquirerNi: 200, acquirerShares: 100, targetNi: 40, newShares: 0, newDebt: 500, rate: 0.06, tax: 0.25 });
  near(debt.proForma, 2.175);
  assert.ok(debt.change > 0);
});

test('three-statement links', () => {
  assert.equal(f.cashFromOperations(80, 20, 15), 85);
  assert.equal(f.freeCashFlow(85, 30), 55);
  assert.equal(f.retainedEarnings(500, 80, 30), 550);
  near(f.unleveredFcf(100, 0.25, 20, 30, 10), 55);
});
