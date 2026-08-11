import { applicableQuestions, healthTracks, questions } from './data.ts';
import { ASSESSMENT_VERSION, type Answers, type BusinessContext, type ResultsData } from './types.ts';

export const PROGRESS_KEY = 'tradebuilt:contractor-health-check:v2.0:progress';
export const LEGACY_PROGRESS_KEY = 'tradebuilt-assessment-progress';
export const normalizedScore = (raw: number) => (raw - 1) * 25;
export const clearInapplicableAnswers = (answers: Answers, hasTeam: boolean): Answers => {
  const next = { ...answers }; if (!hasTeam) delete next['TB-CAP-01']; return next;
};
export const hasCompleteAssessment = (answers: Answers, hasTeam: boolean) => applicableQuestions(hasTeam).every(({ id }) => Object.hasOwn(answers, id));

export const calculateResults = (answers: Answers, context: BusinessContext, hasTeam: boolean): ResultsData => {
  const applicable = applicableQuestions(hasTeam);
  const tracks = healthTracks.map((track) => {
    const values = applicable.filter((item) => item.track === track && item.scored).map(({ id }) => answers[id]).filter((value): value is number => typeof value === 'number');
    return { track, score: values.length ? Math.round(values.reduce((sum, value) => sum + normalizedScore(value), 0) / values.length) : 0, applicableEvidence: values.length };
  });
  // Equal track weighting prevents a short track from being overwhelmed by raw question counts.
  const evidenced = tracks.filter(({ applicableEvidence }) => applicableEvidence > 0);
  const overall = evidenced.length ? Math.round(evidenced.reduce((sum, item) => sum + item.score, 0) / evidenced.length) : 0;
  const sorted = [...evidenced].sort((a,b) => b.score - a.score || healthTracks.indexOf(a.track) - healthTracks.indexOf(b.track));
  const weaknesses = [...sorted].reverse().slice(0,2).map(({ track }) => track);
  const risks = weaknesses.map((track) => `Your answers suggest ${track.toLowerCase()} may be affecting business health.`);
  if (context.desiredModel !== 'Owner-led specialist' && ['Everything','Most decisions and delivery'].includes(context.ownerReliance)) risks.push('Current owner reliance may be inconsistent with the business model you want.');
  const pricing = answers['TB-COM-02'];
  if (typeof pricing === 'number' && pricing <= 2) risks.push('Pricing and value alignment needs deeper investigation; the Health Check does not establish whether prices should change.');
  return { assessmentVersion: ASSESSMENT_VERSION, overall, tracks, strengths: sorted.slice(0,2).map(({track}) => track), weaknesses, risks, investigationPriorities: weaknesses.map((track) => `${track}: this area needs deeper investigation.`), deeperEvidence: ['The Health Check does not yet establish root causes, financial leakage, or the right repair method.','A paid diagnostic can review relevant job, financial, client and operating evidence.'], disclaimer: 'Your Contractor Health Score is a directional, self-reported business health signal—not an objective industry ranking.' };
};

export const buildEngineSubmission = (submissionId: string, answers: Answers, context: BusinessContext, hasTeam: boolean) => ({
  submissionId, assessmentVersion: ASSESSMENT_VERSION, product: 'TRADEBUILT', context,
  answers: applicableQuestions(hasTeam).map(({ id, type }) => ({ questionId: id, rawType: type, value: Object.hasOwn(answers,id) ? answers[id] : null })),
});
export const questionIds = questions.map(({id}) => id);
