import { test } from 'node:test';
import assert from 'node:assert/strict';
import { multiplierFor, sliderStars, ExercisePublic, ExerciseKey } from './schema.ts';
import { buildLesson, grade, comboAfter, xpFor, isMilestone } from './lesson.ts';

test('multiplierFor: 1 → 2 at 3, 3 at 5, 5 at 8', () => {
  assert.deepEqual([0, 2, 3, 4, 5, 7, 8, 20].map(multiplierFor), [1, 1, 2, 2, 3, 3, 5, 5]);
});

test('sliderStars by relative error', () => {
  assert.equal(sliderStars(100, 100, 0.1), 3);
  assert.equal(sliderStars(105, 100, 0.1), 2);
  assert.equal(sliderStars(109, 100, 0.1), 1);
  assert.equal(sliderStars(120, 100, 0.1), 0);
  assert.equal(sliderStars(0, 0, 0.1), 3);
});

test('a lesson has five valid items and at least one non-MCQ', () => {
  for (const skill of ['statements', 'dcf', 'comps', 'lbo', 'ma', 'unknown']) {
    for (const seed of [1, 42, 99991]) {
      const l = buildLesson(skill, seed);
      assert.equal(l.length, 5);
      assert.ok(l.some((b) => b.pub.kind !== 'mcq'), `${skill}/${seed}`);
      l.forEach((b) => {
        ExercisePublic.parse(b.pub);
        ExerciseKey.parse(b.key);
        assert.ok(!('correct' in b.pub) && !('accepted' in b.pub) && !('target' in b.pub), 'no key in the public payload');
      });
    }
  }
});

test('lessons rebuild identically from their seed (the server recomputes keys)', () => {
  assert.deepEqual(buildLesson('dcf', 7), buildLesson('dcf', 7));
});

test('grade: mcq, formula (only provided tokens), slider', () => {
  const l = buildLesson('dcf', 5);
  const m = l.find((b) => b.key.kind === 'mcq')!;
  const right = m.key.kind === 'mcq' ? m.key.correct : '';
  assert.equal(grade(m.pub, m.key, { kind: 'mcq', choiceId: right }).correct, true);
  const f = buildLesson('statements', 3).find((b) => b.key.kind === 'formula');
  if (f && f.key.kind === 'formula') {
    assert.equal(grade(f.pub, f.key, { kind: 'formula', sequence: f.key.accepted[0] }).correct, true);
    assert.equal(grade(f.pub, f.key, { kind: 'formula', sequence: ['zz', ...f.key.accepted[0].slice(1)] }).correct, false);
  }
});

test('combo and XP', () => {
  assert.deepEqual(comboAfter(7, true), { combo: 8, multiplier: 5 });
  assert.deepEqual(comboAfter(7, false), { combo: 0, multiplier: 1 });
  assert.equal(xpFor({ base: 10, pub: { kind: 'mcq' } as never }, true, 3), 30);
  assert.equal(xpFor({ base: 10, pub: { kind: 'pairs' } as never }, true, 2), 10);
  assert.equal(isMilestone(7) && isMilestone(30) && !isMilestone(8), true);
});

test('a slider never starts on its answer: the track is off-centre', () => {
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    for (const b of buildLesson('dcf', seed)) {
      if (b.pub.kind !== 'slider' || b.key.kind !== 'slider') continue;
      const mid = (b.pub.min + b.pub.max) / 2;
      assert.ok(Math.abs(mid - b.key.target) / Math.abs(b.key.target) > 0.1, `seed ${seed}`);
    }
  }
});
