import assert from 'node:assert/strict';
import test from 'node:test';
import { hasCompleteAssessment, saveAssessmentAnswer } from '../src/assessment.ts';

const questionIds = Array.from({ length: 25 }, (_, index) => index + 1);

test('accepts exactly 25 valid assessment answers', () => {
  const answers = Object.fromEntries(questionIds.map((id) => [id, (id % 5) + 1]));

  assert.equal(hasCompleteAssessment(answers, questionIds), true);
});

test('rejects missing, extra, and invalid assessment answers', () => {
  const completeAnswers = Object.fromEntries(questionIds.map((id) => [id, 3]));

  assert.equal(hasCompleteAssessment({ ...completeAnswers, 25: undefined as unknown as number }, questionIds), false);
  assert.equal(hasCompleteAssessment({ ...completeAnswers, 26: 3 }, questionIds), false);
  assert.equal(hasCompleteAssessment({ ...completeAnswers, 25: 0 }, questionIds), false);
  assert.equal(hasCompleteAssessment({ ...completeAnswers, 25: 6 }, questionIds), false);
  assert.equal(hasCompleteAssessment({ ...completeAnswers, 25: 2.5 }, questionIds), false);
});

test('saving the final answer preserves every earlier answer', () => {
  const previousAnswers = Object.fromEntries(questionIds.slice(0, -1).map((id) => [id, (id % 5) + 1]));
  const completedAnswers = saveAssessmentAnswer(previousAnswers, 25, 5);

  assert.deepEqual(Object.entries(completedAnswers).slice(0, -1), Object.entries(previousAnswers));
  assert.equal(completedAnswers[25], 5);
  assert.equal(hasCompleteAssessment(completedAnswers, questionIds), true);
  assert.notEqual(completedAnswers, previousAnswers);
});
