import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBrief } from './dealBrief.ts';
import { CHAPTER_BRIEFS } from '../content/briefs.ts';
import { TEMPLATE_IDS, makeExercise } from '../lib/finance/templates.ts';

test('every chapter brief and template brief fits the schema', () => {
  for (const b of Object.values(CHAPTER_BRIEFS)) assert.ok(parseBrief(b), b.id);
  for (const id of TEMPLATE_IDS) assert.ok(parseBrief(makeExercise(id, 1).brief), id);
});

test('over-long or missing fields are rejected', () => {
  assert.equal(parseBrief({ rule: 'x'.repeat(141), trap: 'a valid trap', realWorld: 'somewhere real' }), null);
  assert.equal(parseBrief({ rule: 'a valid rule' }), null);
});
