import { test } from 'node:test';
import assert from 'node:assert/strict';
import { START, band, expected, itemRating, pickDifficulty, update } from './elo.ts';

test('expected score is 50% against an equal item', () => {
  assert.equal(expected(1000, 1000), 0.5);
  assert.ok(expected(1200, 1000) > 0.75);
});

test('right answers raise the rating, more for harder items', () => {
  const easy = update(START, 1, true) - START;
  const hard = update(START, 5, true) - START;
  assert.ok(easy > 0 && hard > easy);
  assert.ok(update(START, 1, false) < START);
  assert.equal(itemRating(9), itemRating(5));
});

test('difficulty follows the rating', () => {
  assert.ok(pickDifficulty(800) <= pickDifficulty(1000));
  assert.ok(pickDifficulty(1000) <= pickDifficulty(1500));
  assert.equal(band(START), 'Building');
});
