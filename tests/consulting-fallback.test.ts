import assert from 'node:assert/strict';
import test from 'node:test';
import { createLocalConsultingInsights } from '../server/consulting-fallback.mjs';

const categories = ['Pricing', 'Sales', 'Marketing', 'Cash Flow', 'Systems', 'Team', 'Operations', 'Customer Experience'];
const results = {
  overall: 62,
  categories: categories.map((category, index) => ({ category, score: 45 + index * 5, industryAverage: 65, difference: index * 5 - 20 })),
};
const leadProfile = { company: 'Reliable Electric', trade: 'Electrical', teamSize: '6–10', monthlyRevenue: '$100k–$250k' };

test('creates a complete personalized consulting report without an API key', () => {
  const insights = createLocalConsultingInsights({ leadProfile, results });

  assert.match(insights.executiveSummary, /Reliable Electric/);
  assert.match(insights.executiveSummary, /Electrical/);
  assert.equal(insights.context, insights.executiveSummary);
  assert.deepEqual(insights.categoryInsights.map(({ category, score }) => ({ category, score })), results.categories.map(({ category, score }) => ({ category, score })));
  assert.equal(insights.priorities.length, 3);
  assert.deepEqual(insights.weeks.map(({ week }) => week), [1, 2, 3, 4]);
  assert.ok(insights.weeks.every(({ actions }) => actions.length === 3));
  assert.equal(insights.quickWins.length, 3);
});

test('returns the same report for the same assessment', () => {
  assert.deepEqual(createLocalConsultingInsights({ leadProfile, results }), createLocalConsultingInsights({ leadProfile, results }));
});
