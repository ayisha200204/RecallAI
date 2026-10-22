import test from 'node:test';
import assert from 'node:assert';
import { evaluateShortAnswer } from '../services/evaluatorService.js';
import { predictStudentPerformance } from '../services/mlService.js';

test('Evaluator: awards correctness when expected concepts are present', () => {
  const result = evaluateShortAnswer({
    submittedAnswer: 'A context switch saves the processor state and program counter to the PCB, then restores registers of the next thread.',
    referenceAnswer: 'During a context switch, the OS saves the CPU registers and program counter to the PCB and restores the next process.',
    expectedKeyConcepts: ['save state', 'PCB', 'program counter', 'registers', 'restore'],
    questionText: 'Explain what happens during a process context switch.',
  });

  assert.strictEqual(result.isCorrect, true);
  assert.ok(result.score >= 0.6);
  assert.ok(result.conceptsMatched.length > 0);
});

test('Evaluator: does not rely solely on exact string matching', () => {
  const result = evaluateShortAnswer({
    submittedAnswer: 'Circular wait is eliminated by enforcing a strict numerical ordering of resource acquisition across threads.',
    referenceAnswer: 'Circular wait can be prevented by imposing a global linear ordering on all resource types.',
    expectedKeyConcepts: ['resource ordering', 'linear ordering', 'hierarchy'],
    questionText: 'How can an OS prevent deadlocks by invalidating circular wait?',
  });

  assert.strictEqual(result.isCorrect, true);
  assert.ok(result.score > 0.3);
});

test('ML Service: calculates realistic probability, urgency, and contributions', async () => {
  const highRisk = await predictStudentPerformance({
    recent_accuracy: 0.25,
    previous_correct: 0,
    confidence_rating: 1.5,
    hours_since_last_attempt: 120,
    attempts_count: 2,
    difficulty: 0.8,
  });

  assert.ok(highRisk.success_probability < 0.5);
  assert.strictEqual(highRisk.urgency, 'high');
  assert.ok(highRisk.feature_contributions);

  const highMastery = await predictStudentPerformance({
    recent_accuracy: 0.95,
    previous_correct: 1,
    confidence_rating: 4.8,
    hours_since_last_attempt: 12,
    attempts_count: 8,
    difficulty: 0.4,
  });

  assert.ok(highMastery.success_probability > 0.7);
  assert.strictEqual(highMastery.urgency, 'low');
});
