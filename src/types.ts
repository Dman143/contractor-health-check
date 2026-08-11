export const ASSESSMENT_VERSION = 'tradebuilt-contractor-health-check-v2.0' as const;

export type HealthTrack = 'Delivery & Workmanship' | 'Client Experience & Reputation' | 'Commercial Control' | 'Financial Control' | 'Demand & Positioning' | 'Capacity & Direction';
export type RawAnswer = string | number | boolean | null;
export type Question = { id: string; track: HealthTrack; prompt: string; type: 'SCALE' | 'SINGLE_SELECT' | 'TEXT'; scored: boolean; conditional?: 'HAS_TEAM'; options: readonly { value: RawAnswer; label: string }[] };
export type Answers = Record<string, RawAnswer>;
export type LeadProfile = { name: string; company: string; email: string; phone: string; trade: string };
export type BusinessContext = { desiredModel: string; teamSituation: string; ownerReliance: string; priority: string };
export type TrackScore = { track: HealthTrack; score: number; applicableEvidence: number };
export type ResultsData = { assessmentVersion: typeof ASSESSMENT_VERSION; overall: number; tracks: TrackScore[]; strengths: HealthTrack[]; weaknesses: HealthTrack[]; risks: string[]; investigationPriorities: string[]; deeperEvidence: string[]; disclaimer: string };
