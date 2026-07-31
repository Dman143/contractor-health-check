export const RESULTS_DISCLAIMER = 'Your results are only as accurate as the answers you provide.';

export const PERFECT_SCORE_INTEGRITY_MESSAGE = [
  'A perfect score is exceptionally rare.',
  'A genuine 100/100 means your contracting business has world-class systems, predictable lead generation, strong financial controls, documented processes, and can continue growing even while you are away.',
  'If that is genuinely the case, congratulations — you are among the very best contractors we have assessed.',
  'If you selected 5/5 throughout without critically evaluating your business, we recommend retaking the assessment honestly. The more accurate your answers, the more valuable your report will be.',
] as const;

export const isAllFivesAssessment = (answers: Record<number, number>, questionIds: readonly number[]) =>
  questionIds.length === 25 && questionIds.every((questionId) => answers[questionId] === 5);
