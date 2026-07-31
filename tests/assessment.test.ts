import assert from 'node:assert/strict';
import test from 'node:test';
import { answerCurrentQuestion, hasCompleteAssessment, saveAssessmentAnswer } from '../src/assessment.ts';
import { isAllFivesAssessment } from '../src/reportIntegrity.ts';

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

test('advancing records the current answer and moves to exactly the next question', () => {
  const firstClick = answerCurrentQuestion({}, 0, questionIds, 3);
  const repeatedClickBeforeRender = answerCurrentQuestion({}, 0, questionIds, 5);

  assert.equal(firstClick.currentQuestionIndex, 1);
  assert.equal(repeatedClickBeforeRender.currentQuestionIndex, 1);
  assert.deepEqual(repeatedClickBeforeRender.answers, { 1: 5 });
});

test('the final answer is validated from the same completed snapshot', () => {
  const previousAnswers = Object.fromEntries(questionIds.slice(0, -1).map((id) => [id, 3]));
  const progress = answerCurrentQuestion(previousAnswers, 24, questionIds, 4);

  assert.equal(progress.isComplete, true);
  assert.equal(progress.answers[25], 4);
  assert.equal(progress.currentQuestionIndex, 24);
});

test('detects only a complete 25-answer all-5s assessment', () => {
  const perfectAnswers = Object.fromEntries(questionIds.map((id) => [id, 5]));
  assert.equal(isAllFivesAssessment(perfectAnswers, questionIds), true);
  assert.equal(isAllFivesAssessment({ ...perfectAnswers, 12: 4 }, questionIds), false);
  assert.equal(isAllFivesAssessment(perfectAnswers, questionIds.slice(0, 24)), false);
});
