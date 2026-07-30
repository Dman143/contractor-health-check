export type AssessmentAnswers = Record<number, number>;

export type AssessmentProgress = {
  answers: AssessmentAnswers;
  currentQuestionIndex: number;
  isComplete: boolean;
};

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

export const answerCurrentQuestion = (
  answers: AssessmentAnswers,
  currentQuestionIndex: number,
  questionIds: readonly number[],
  score: number,
): AssessmentProgress => {
  const questionId = questionIds[currentQuestionIndex];
  if (questionId === undefined) throw new RangeError('The current assessment question does not exist.');

  const nextAnswers = saveAssessmentAnswer(answers, questionId, score);
  const isLastQuestion = currentQuestionIndex === questionIds.length - 1;

  return {
    answers: nextAnswers,
    currentQuestionIndex: isLastQuestion ? currentQuestionIndex : currentQuestionIndex + 1,
    isComplete: isLastQuestion && hasCompleteAssessment(nextAnswers, questionIds),
  };
};
