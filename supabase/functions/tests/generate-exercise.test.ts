// Run with npm run test:functions.
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { makeExercise } from '../_shared/templates.ts';

Deno.env.set('VANTARIS_TEST', '1');
const { acceptNarrative } = await import('../generate-exercise/index.ts');

const ex = makeExercise('dcf.gordon', 7, 2);
const brief = { rule: 'Next year cash flow over the spread.', trap: 'Growing the cash flow twice.', realWorld: 'Most of a DCF sits in this number.', formula: 'TV = FCF₁ ÷ (WACC − g)' };

Deno.test('a story that quotes every figure is kept', () => {
  const scenario = `A utility will throw off ${ex.numbers[0]} of free cash next year. Investors want ${ex.numbers[1]} and expect ${ex.numbers[2]} growth forever after.`;
  assert(acceptNarrative({ scenario, brief }, ex));
});

Deno.test('a story that changes or adds a figure is rejected', () => {
  const changed = `A utility will throw off $999M of free cash next year. Investors want ${ex.numbers[1]} and expect ${ex.numbers[2]} growth forever after.`;
  assertEquals(acceptNarrative({ scenario: changed, brief }, ex), null);
  const extra = `A utility will throw off ${ex.numbers[0]} next year, ${ex.numbers[1]} required, ${ex.numbers[2]} growth, and a 47.5% margin.`;
  assertEquals(acceptNarrative({ scenario: extra, brief }, ex), null);
});

Deno.test('an over-long brief is rejected', () => {
  const scenario = `Cash of ${ex.numbers[0]} next year, ${ex.numbers[1]} required return, ${ex.numbers[2]} growth after that.`;
  assertEquals(acceptNarrative({ scenario, brief: { ...brief, rule: 'x'.repeat(200) } }, ex), null);
});

// ---------- V4 lessons ----------
const { lessonItems } = await import('../generate-exercise/index.ts');

Deno.test('a lesson keeps the engine wording when the writer fails twice, and has a non-MCQ', async () => {
  let calls = 0;
  const items = await lessonItems('dcf', 11, 2, async () => {
    calls += 1;
    return null;
  });
  assertEquals(items.length, 5);
  assert(items.some((b) => b.pub.kind !== 'mcq'));
  assert(calls <= 2 * items.filter((b) => b.pub.kind === 'mcq').length);
  for (const b of items) assert(!JSON.stringify(b.pub).includes('"correct"'));
});
