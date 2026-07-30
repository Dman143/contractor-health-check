export type AssessmentAnswers = Record<number, number>;

export const saveAssessmentAnswer = (answers: AssessmentAnswers, questionId: number, score: number): AssessmentAnswers => ({
  ...answers,
  [questionId]: score,
});

export const hasCompleteAssessment = (answers: AssessmentAnswers, questionIds: readonly number[]): boolean => {
  const answerIds = Object.keys(answers).map(Number);

  return answerIds.length === questionIds.length
    && questionIds.length === 25
    && questionIds.every((questionId) => Number.isInteger(answers[questionId]) && answers[questionId] >= 1 && answers[questionId] <= 5)
    && answerIds.every((answerId) => questionIds.includes(answerId));
};
