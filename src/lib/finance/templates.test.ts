import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATE_IDS, makeExercise, mentionsAll } from './templates.ts';

test('every template yields four distinct options with the answer among them', () => {
  for (const id of TEMPLATE_IDS) {
    for (let s = 1; s <= 400; s++) {
      const ex = makeExercise(id, s * 7919, 1 + (s % 5));
      assert.equal(ex.options.length, 4, `${id} #${s}`);
      assert.equal(new Set(ex.options).size, 4, `${id} #${s} duplicate options ${ex.options}`);
      assert.ok(ex.answerIndex >= 0 && ex.answerIndex < 4, `${id} answer index`);
      assert.ok(Number.isFinite(ex.answer), `${id} finite answer`);
      assert.ok(!/NaN|undefined|Infinity/.test(JSON.stringify(ex)), `${id} clean text`);
      assert.ok(mentionsAll(ex.prompt, ex.numbers), `${id} fallback prompt carries its numbers`);
    }
  }
});

test('the same seed gives the same exercise', () => {
  for (const id of TEMPLATE_IDS) assert.deepEqual(makeExercise(id, 42, 2), makeExercise(id, 42, 2));
});

test('the narrative check rejects a changed figure', () => {
  const ex = makeExercise('dcf.gordon', 7, 2);
  assert.ok(mentionsAll(ex.prompt, ex.numbers));
  assert.ok(!mentionsAll(ex.prompt.replace(ex.numbers[0], '$999M'), ex.numbers));
});
