import type { HealthTrack, Question } from './types.ts';

export const healthTracks: HealthTrack[] = ['Delivery & Workmanship','Client Experience & Reputation','Commercial Control','Financial Control','Demand & Positioning','Capacity & Direction'];
export const scaleOptions = [1,2,3,4,5].map((value) => ({ value, label: ['Not in place','Rarely consistent','Sometimes consistent','Usually consistent','Consistently in place'][value - 1] }));
const q = (id: string, track: HealthTrack, prompt: string): Question => ({ id, track, prompt, type: 'SCALE', scored: true, options: scaleOptions });

// This ordered registry is the sender contract. Context is collected separately and is never scored.
export const questions: Question[] = [
  q('TB-DEL-01','Delivery & Workmanship','How consistently is work completed to the standard promised to the client?'),
  q('TB-DEL-02','Delivery & Workmanship','How consistently are defects, rework and callbacks kept under control?'),
  q('TB-DEL-03','Delivery & Workmanship','How reliably are jobs delivered against agreed scope and timing?'),
  q('TB-CLI-01','Client Experience & Reputation','How consistently do clients receive clear updates before and during the job?'),
  q('TB-CLI-02','Client Experience & Reputation','How consistently are client concerns and completion issues handled well?'),
  q('TB-CLI-03','Client Experience & Reputation','How consistently does completed work generate credible reviews, referrals or repeat business?'),
  q('TB-COM-01','Commercial Control','How consistently are quotes based on a clear scope and known job requirements?'),
  q('TB-COM-02','Commercial Control','How confident are you that pricing reflects the value delivered and the work involved?'),
  q('TB-COM-03','Commercial Control','How consistently are variations and extras agreed and charged rather than absorbed?'),
  q('TB-FIN-01','Financial Control','How clearly do you know whether completed jobs made the expected money?'),
  q('TB-FIN-02','Financial Control','How consistently do deposits and payment stages avoid the business funding the client’s job?'),
  { ...q('TB-FIN-03','Financial Control','How consistently does your materials policy protect the business from unplanned cost exposure?'), options: [...scaleOptions, { value: null, label: 'Not applicable — clients normally buy materials directly' }] },
  q('TB-DEM-01','Demand & Positioning','How consistently does the business attract enough suitable enquiries?'),
  q('TB-DEM-02','Demand & Positioning','How clearly can suitable clients understand why they should choose your business?'),
  q('TB-DEM-03','Demand & Positioning','How consistently do you know which sources produce suitable work?'),
  q('TB-CAP-02','Capacity & Direction','How manageable is the current workload without persistent overload or avoidable delay?'),
  q('TB-CAP-03','Capacity & Direction','How consistently can the business operate at the level intended without everything depending on the owner?'),
  q('TB-CAP-04','Capacity & Direction','How clearly are business decisions guided by the model you want to build?'),
  q('TB-CAP-05','Capacity & Direction','How confident are you that current capacity supports your stated business priority?'),
  { ...q('TB-CAP-01','Capacity & Direction','How consistently can staff or crew deliver their responsibilities without avoidable owner intervention?'), conditional: 'HAS_TEAM' },
];
export const coreQuestions = questions.filter(({ conditional }) => !conditional);
export const conditionalQuestions = questions.filter(({ conditional }) => conditional);
export const applicableQuestions = (hasTeam: boolean) => questions.filter((question) => question.conditional !== 'HAS_TEAM' || hasTeam);
