import test from 'node:test';
import assert from 'node:assert';
import { calculateNextReview, formatIntervalReadable } from '../services/spacedRepetitionService.js';

test('SRS: Again schedules short relearning step (~10 minutes) and resets repetitions', () => {
  const current = {
    repetitions: 3,
    interval: 7,
    easeFactor: 2.5,
    lapses: 0,
    state: 'review',
  };

  const next = calculateNextReview(current, 'again');

  assert.strictEqual(next.state, 'relearning');
  assert.strictEqual(next.repetitions, 0);
  assert.strictEqual(next.lapses, 1);
  assert.ok(next.interval < 1); // Less than 1 day (10 minutes)
  assert.strictEqual(formatIntervalReadable(next.interval), '10m');
  assert.ok(next.easeFactor < 2.5); // Ease reduced on failure
});

test('SRS: Hard schedules ~1 day for new card and preserves or scales slightly with penalty', () => {
  const newCard = {
    repetitions: 0,
    interval: 0,
    easeFactor: 2.5,
  };

  const next = calculateNextReview(newCard, 'hard');
  assert.strictEqual(next.repetitions, 1);
  assert.strictEqual(next.interval, 1);
  assert.strictEqual(formatIntervalReadable(next.interval), '1d');
  assert.ok(next.easeFactor < 2.5);
});

test('SRS: Good schedules ~3 days for initial review and expands by ease factor', () => {
  const newCard = {
    repetitions: 0,
    interval: 0,
    easeFactor: 2.5,
  };

  const firstGood = calculateNextReview(newCard, 'good');
  assert.strictEqual(firstGood.repetitions, 1);
  assert.strictEqual(firstGood.interval, 3);
  assert.strictEqual(formatIntervalReadable(firstGood.interval), '3d');

  const secondGood = calculateNextReview(firstGood, 'good');
  assert.strictEqual(secondGood.repetitions, 2);
  assert.ok(secondGood.interval >= 7); // ~3 * 2.5 = 7.5 -> 8d
});

test('SRS: Easy advances through accelerated intervals (7d -> 21d -> 45d -> 90d -> 180d)', () => {
  const newCard = {
    repetitions: 0,
    interval: 0,
    easeFactor: 2.5,
  };

  const step1 = calculateNextReview(newCard, 'easy');
  assert.strictEqual(step1.interval, 7);
  assert.strictEqual(formatIntervalReadable(step1.interval), '7d');

  const step2 = calculateNextReview(step1, 'easy');
  assert.strictEqual(step2.interval, 21);
  assert.strictEqual(formatIntervalReadable(step2.interval), '21d');

  const step3 = calculateNextReview(step2, 'easy');
  assert.strictEqual(step3.interval, 45);

  const step4 = calculateNextReview(step3, 'easy');
  assert.strictEqual(step4.interval, 90);

  const step5 = calculateNextReview(step4, 'easy');
  assert.strictEqual(step5.interval, 180);
});

test('SRS: Skip does NOT advance review interval or count as success', () => {
  const card = {
    repetitions: 2,
    interval: 7,
    easeFactor: 2.5,
    lapses: 0,
    state: 'review',
    nextDueDate: new Date('2026-11-01T12:00:00Z'),
  };

  const next = calculateNextReview(card, 'skip');
  assert.strictEqual(next.isSkip, true);
  assert.strictEqual(next.repetitions, 2);
  assert.strictEqual(next.interval, 7);
  assert.strictEqual(next.lapses, 0);
  assert.strictEqual(next.nextDueDate.toISOString(), '2026-11-01T12:00:00.000Z');
});
