export const RESULTS_DISCLAIMER = 'Your results are only as accurate as the answers you provide.';

export const PERFECT_SCORE_INTEGRITY_MESSAGE = [
  'A 100/100 result is an exceptional achievement and is extremely uncommon.',
  'If your answers accurately reflect consistent, well-documented performance across your business, congratulations — you have built an exceptional operation.',
  'Because this assessment is self-reported, a 100/100 result should always be independently validated in practice through current records, team observations, customer outcomes, and performance over time.',
  'We encourage every owner to answer thoughtfully and revisit any rating that is not yet supported by clear, repeatable evidence. Honest self-assessment makes your report more accurate, useful, and credible.',
] as const;

export const isAllFivesAssessment = (answers: Record<number, number>, questionIds: readonly number[]) =>
  questionIds.length === 25 && questionIds.every((questionId) => answers[questionId] === 5);
