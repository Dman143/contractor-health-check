import assert from 'node:assert/strict';
import test from 'node:test';
import { generateConsultingInsights } from '../server/index.mjs';

const categories = ['Pricing', 'Sales', 'Marketing', 'Cash Flow', 'Systems', 'Team', 'Operations', 'Customer Experience'];
const assessment = {
  leadProfile: { company: 'Reliable Electric', trade: 'Electrical', teamSize: '6–10', monthlyRevenue: '$100k–$250k', message: '' },
  results: {
    overall: 62,
    industryAverage: 65,
    performanceRating: 'Growth Constrained',
    categories: categories.map((category, index) => ({ category, score: 45 + index * 5, industryAverage: 65, difference: index * 5 - 20 })),
  },
  assessmentAnswers: Array.from({ length: 25 }, (_, index) => ({
    questionId: index + 1,
    category: categories[Math.min(Math.floor(index / 3), 7)],
    prompt: `Practice ${index + 1}`,
    score: (index % 5) + 1,
    response: `Response ${(index % 5) + 1}`,
  })),
};

const insights = {
  executiveSummary: 'Summary',
  bottleneck: 'Bottleneck',
  biggestOpportunity: 'Opportunity',
  categoryInsights: assessment.results.categories.map(({ category, score }) => ({ category, score, whyItMatters: 'Reason', diagnosis: 'Diagnosis' })),
  priorities: ['One', 'Two', 'Three'],
  weeks: [1, 2, 3, 4].map((week) => ({ week, title: `Week ${week}`, focusCategories: ['Pricing'], actions: ['One', 'Two', 'Three'] })),
  quickWins: ['One', 'Two', 'Three'],
  risk: 'Risk',
  estimatedOutcome: 'Outcome',
  finalRecommendation: 'Recommendation',
};

test('retries one timeout with the same idempotency key and a compact prompt', async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.OPENAI_API_KEY;
  const requests: RequestInit[] = [];
  process.env.OPENAI_API_KEY = 'test-key';
  globalThis.fetch = async (_input, init) => {
    requests.push(init ?? {});
    if (requests.length === 1) throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    return new Response(JSON.stringify({ output_text: JSON.stringify(insights) }), { status: 200 });
  };

  try {
    const result = await generateConsultingInsights(assessment);
    assert.equal(result.executiveSummary, 'Summary');
    assert.equal(requests.length, 2);
    assert.equal(requests[0].signal, undefined, 'valid OpenAI responses must not be aborted by an application deadline');
    assert.equal(requests[1].signal, undefined, 'retries must not reintroduce an application deadline');
    assert.equal((requests[0].headers as Record<string, string>)['Idempotency-Key'], (requests[1].headers as Record<string, string>)['Idempotency-Key']);
    const body = JSON.parse(requests[0].body as string);
    assert.doesNotMatch(body.input, /strongestCategories|weakestCategories|questionId|Response 1/);
    assert.match(body.input, /answersByCategory/);
    assert.equal(body.reasoning.effort, 'minimal');
    assert.equal(body.text.verbosity, 'low');
    assert.ok(Buffer.byteLength(requests[0].body as string) < 4_500);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalApiKey;
  }
});

test('returns a clear error only after both timeout attempts fail', async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.OPENAI_API_KEY;
  let attempts = 0;
  process.env.OPENAI_API_KEY = 'test-key';
  globalThis.fetch = async () => {
    attempts += 1;
    throw new DOMException('timed out', 'TimeoutError');
  };

  try {
    await assert.rejects(generateConsultingInsights(assessment), /timed out after 2 attempts/);
    assert.equal(attempts, 2);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalApiKey;
  }
});
