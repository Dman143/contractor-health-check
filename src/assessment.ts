import { applicableQuestions, healthTracks, questions } from './data.ts';
import { ASSESSMENT_VERSION, type Answers, type BusinessContext, type ResultsData } from './types.ts';

export const PROGRESS_KEY = 'tradebuilt:contractor-health-check:v2.0:progress';
export const LEGACY_PROGRESS_KEY = 'tradebuilt-assessment-progress';
export const normalizedScore = (raw: number) => Math.round(((raw - 1) / 3) * 100);
export const clearInapplicableAnswers = (answers: Answers, hasTeam: boolean): Answers => {
  const next = { ...answers }; if (!hasTeam) delete next['TB-CAP-03']; return next;
};
export const hasCompleteAssessment = (answers: Answers, hasTeam: boolean) => applicableQuestions(hasTeam).every(({ id }) => Object.hasOwn(answers, id));

export const calculateResults = (answers: Answers, context: BusinessContext, hasTeam: boolean): ResultsData => {
  const applicable = applicableQuestions(hasTeam);
  const tracks = healthTracks.map((track) => {
    const values = applicable.filter((item) => item.track === track && item.scored).map((item) => {
      const value = answers[item.id];
      if (typeof value !== 'number') return value;
      return item.options.find((option) => option.value === value)?.scoreValue ?? value;
    }).filter((value): value is number => typeof value === 'number');
    return { track, score: values.length ? Math.round(values.reduce((sum, value) => sum + normalizedScore(value), 0) / values.length) : 0, applicableEvidence: values.length };
  });
  // Equal track weighting prevents a short track from being overwhelmed by raw question counts.
  const evidenced = tracks.filter(({ applicableEvidence }) => applicableEvidence > 0);
  const overall = evidenced.length ? Math.round(evidenced.reduce((sum, item) => sum + item.score, 0) / evidenced.length) : 0;
  const sorted = [...evidenced].sort((a,b) => b.score - a.score || healthTracks.indexOf(a.track) - healthTracks.indexOf(b.track));
  const weaknesses = [...sorted].reverse().slice(0,2).map(({ track }) => track);
  const risks = weaknesses.map((track) => `Your answers suggest ${track.toLowerCase()} may be affecting business health.`);
  if (context.desiredModel !== 'Owner-led specialist' && ['Almost everything','Most things'].includes(context.ownerReliance)) risks.push('Current owner reliance may be inconsistent with the business model you want.');
  const pricing = answers['TB-COM-02'];
  if (typeof pricing === 'number' && pricing <= 2) risks.push('Pricing and value alignment needs deeper investigation; the Health Check does not establish whether prices should change.');
  return { assessmentVersion: ASSESSMENT_VERSION, overall, tracks, strengths: sorted.slice(0,2).map(({track}) => track), weaknesses, risks, investigationPriorities: weaknesses.map((track) => `${track}: this area needs deeper investigation.`), deeperEvidence: ['The Health Check does not yet establish root causes, financial leakage, or the right repair method.','A paid diagnostic can review relevant job, financial, client and operating evidence.'], disclaimer: 'Your Contractor Health Score is a directional, self-reported business health signal—not an objective industry ranking.' };
};

export const buildEngineSubmission = (submissionId: string, answers: Answers, context: BusinessContext, hasTeam: boolean, leadSource = '', leadProfile?: unknown, results?: ResultsData) => ({
  submissionId, assessmentVersion: ASSESSMENT_VERSION, product: 'TRADEBUILT', context, leadProfile, results,
  leadSource, crewQuestionShown: hasTeam,
  answers: applicableQuestions(hasTeam).map(({ id, type, prompt, options }) => {
    const value = Object.hasOwn(answers,id) ? answers[id] : null;
    return { questionId: id, question: prompt, rawType: type, value, answer: options.find((option) => option.value === value)?.label ?? null };
  }),
});
export const questionIds = questions.map(({id}) => id);
