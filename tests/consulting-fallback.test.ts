import assert from 'node:assert/strict';
import test from 'node:test';
import { createLocalConsultingInsights } from '../server/consulting-fallback.mjs';

const categories = ['Pricing', 'Sales', 'Marketing', 'Cash Flow', 'Systems', 'Team', 'Operations', 'Customer Experience'];
const results = {
  overall: 62,
  categories: categories.map((category, index) => ({ category, score: 45 + index * 5, industryAverage: 65, difference: index * 5 - 20 })),
};
const leadProfile = { company: 'Reliable Electric', trade: 'Electrical', teamSize: '6–10', monthlyRevenue: '$100k–$250k' };
const prompts = [
  'pricing uses real job costs', 'change orders protect gross margin', 'profitable job types are known',
  'sales follows a repeatable process', 'prospects are qualified', 'estimates receive consistent follow-up',
  'inbound leads are measurable', 'website and reviews build trust', 'the company communicates a clear specialty',
  'cash and obligations are visible', 'payment terms keep work cash-positive', 'financial reports are reviewed promptly',
  'important workflows are documented', 'tools reduce double entry', 'project handoffs are consistent',
  'roles and expectations are clear', 'day-to-day work can be delegated', 'hiring and onboarding are structured',
  'jobs start with a clear scope', 'schedules are managed proactively', 'live job profitability is tracked',
  'clients receive clear updates', 'issues and punch lists follow a process', 'clients are asked for reviews',
  'the owner can step away',
];
const assessmentAnswers = prompts.map((prompt, index) => ({
  questionId: index + 1,
  category: categories.find((category) => {
    const ranges = { Pricing: [1, 3], Sales: [4, 6], Marketing: [7, 9], 'Cash Flow': [10, 12], Systems: [13, 15], Team: [16, 18], Operations: [19, 21], 'Customer Experience': [22, 24] } as Record<string, number[]>;
    return (ranges[category]?.[0] <= index + 1 && index + 1 <= ranges[category]?.[1]) || (category === 'Operations' && index + 1 === 25);
  }),
  prompt,
  score: index === 0 ? 1 : (index % 5) + 1,
  response: ['Not true yet', 'Rarely true', 'Sometimes true', 'Mostly true', 'Dialed in'][index === 0 ? 0 : index % 5],
}));

test('creates a complete personalized consulting report without an API key', () => {
  const insights = createLocalConsultingInsights({ leadProfile, results, assessmentAnswers });

  assert.match(insights.executiveSummary, /Reliable Electric/);
  assert.match(insights.executiveSummary, /Electrical/);
  assert.equal(insights.context, insights.executiveSummary);
  assert.deepEqual(insights.categoryInsights.map(({ category, score }) => ({ category, score })), results.categories.map(({ category, score }) => ({ category, score })));
  assert.equal(insights.priorities.length, 3);
  assert.deepEqual(insights.weeks.map(({ week }) => week), [1, 2, 3, 4]);
  assert.ok(insights.weeks.every(({ actions }) => actions.length === 3));
  assert.equal(insights.quickWins.length, 3);
  assert.match(insights.bottleneck, /pricing uses real job costs/);
  assert.ok(insights.categoryInsights.every(({ diagnosis }) => /[1-5]\/5/.test(diagnosis)));
  assert.ok(insights.weeks.flatMap(({ actions }) => actions).every((action) => /^[A-Z][a-z]+\b/.test(action)));
});

test('returns the same report for the same assessment', () => {
  assert.deepEqual(createLocalConsultingInsights({ leadProfile, results, assessmentAnswers }), createLocalConsultingInsights({ leadProfile, results, assessmentAnswers }));
});

test('changes the consulting narrative when the underlying answers change', () => {
  const revisedAnswers = assessmentAnswers.map((answer) => answer.questionId === 1
    ? { ...answer, score: 5, response: 'Dialed in' }
    : answer);

  assert.notEqual(
    createLocalConsultingInsights({ leadProfile, results, assessmentAnswers }).bottleneck,
    createLocalConsultingInsights({ leadProfile, results, assessmentAnswers: revisedAnswers }).bottleneck,
  );
});

test('uses an evidence-validation narrative for the all-5s assessment', () => {
  const perfectResults = { overall: 100, categories: categories.map((category) => ({ category, score: 100, industryAverage: 65, difference: 35 })) };
  const perfectAnswers = assessmentAnswers.map((answer) => ({ ...answer, score: 5, response: 'Dialed in' }));
  const insights = createLocalConsultingInsights({ leadProfile, results: perfectResults, assessmentAnswers: perfectAnswers });

  assert.match(insights.executiveSummary, /self-reported score of 100\/100/);
  assert.match(insights.executiveSummary, /not an independent audit/);
  assert.match(insights.bottleneck, /No bottleneck is evidenced/);
  assert.match(insights.finalRecommendation, /Top 10% benchmark position as self-reported/);
  assert.doesNotMatch(JSON.stringify(insights), /small company/i);
});
