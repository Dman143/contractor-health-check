/** Frozen interpreter for completed legacy results. Never use this for V2 submissions. */
export const LEGACY_V1_VERSION = 'tradebuilt-contractor-health-check-v1.0';
export type LegacyV1Result = { version: typeof LEGACY_V1_VERSION; overall: number; categoryScores: Record<string, number> };
export const interpretCompletedV1 = (answers: Record<number, number>, categoriesByQuestion: Record<number, string>): LegacyV1Result => {
  const entries = Object.entries(answers).filter(([id, value]) => Number(id) >= 1 && Number(id) <= 25 && Number.isInteger(value) && value >= 1 && value <= 5);
  if (entries.length !== 25) throw new Error('A completed V1 assessment requires its original 25 answers.');
  const grouped: Record<string, number[]> = {};
  entries.forEach(([id, value]) => { const category=categoriesByQuestion[Number(id)]; if(!category) throw new Error('The frozen V1 category map is required.'); (grouped[category]??=[]).push(value); });
  return { version:LEGACY_V1_VERSION, overall:Math.round(entries.reduce((sum,[,value])=>sum+value,0)/(25*5)*100), categoryScores:Object.fromEntries(Object.entries(grouped).map(([category,values])=>[category,Math.round(values.reduce((a,b)=>a+b,0)/(values.length*5)*100)])) };
};
