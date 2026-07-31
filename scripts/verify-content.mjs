import { readFileSync } from 'node:fs';

const dataSource = readFileSync(new URL('../src/data.ts', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const assessmentSource = readFileSync(new URL('../src/assessment.ts', import.meta.url), 'utf8');
const serverSource = readFileSync(new URL('../server/index.mjs', import.meta.url), 'utf8');
const serverConfigSource = readFileSync(new URL('../server/config.mjs', import.meta.url), 'utf8');
const fallbackSource = readFileSync(new URL('../server/consulting-fallback.mjs', import.meta.url), 'utf8');
const requiredCategories = [
  'Pricing',
  'Sales',
  'Marketing',
  'Cash Flow',
  'Systems',
  'Team',
  'Operations',
  'Customer Experience',
];

const questionCount = (dataSource.match(/id: \d+, category:/g) ?? []).length;

if (questionCount !== 25) {
  throw new Error(`Expected 25 assessment questions, found ${questionCount}.`);
}

for (const category of requiredCategories) {
  if (!dataSource.includes(`'${category}'`)) {
    throw new Error(`Missing required category: ${category}.`);
  }
}

for (const requiredText of ['Get My Business Health Score', 'Request a Strategy Session', 'Top 3 Strengths', 'Top 3 Opportunities', 'Your 30-Day TradeBuilt Action Plan', 'Your biggest bottleneck', 'Top 3 priorities', '3 quick wins under 30 minutes', 'Biggest business risk if nothing changes', 'Estimated outcome after 30 days', 'Performance vs Industry', 'Performance Rating', 'Industry Average', 'Difference']) {
  if (!appSource.includes(requiredText)) {
    throw new Error(`Missing required UI text: ${requiredText}.`);
  }
}

for (const roadmapText of ['Your Growth Roadmap', 'Stabilize', 'Grow', 'Scale', 'Freedom', 'Your phase', 'TradeBuilt Services', 'Contractor Health Check', '90-Day Growth Program', 'Monthly Growth Advisory', 'Systems & Automation', 'KPI Dashboard']) {
  if (!appSource.includes(roadmapText)) {
    throw new Error(`Missing growth roadmap content: ${roadmapText}.`);
  }
}

for (const dashboardText of ['Preview of TradeBuilt Growth', 'Your TradeBuilt Dashboard', 'Revenue This Month', 'Gross Profit %', 'Leads This Month', 'Quotes Sent', 'Quote Conversion %', 'Active Projects', 'Jobs Completed', 'Outstanding Quotes', 'Cash Flow Health', 'Google Review Rating', 'Join TradeBuilt Growth', 'Request Strategy Session']) {
  if (!appSource.includes(dashboardText)) {
    throw new Error(`Missing dashboard preview content: ${dashboardText}.`);
  }
}

for (const rating of ['Elite', 'Excellent', 'Strong', 'Growth Ready', 'Growth Constrained', 'Needs Attention']) {
  if (!assessmentSource.includes(`'${rating}'`)) throw new Error(`Missing performance rating: ${rating}.`);
}

for (const generatedSection of ['executiveSummary', 'bottleneck', 'biggestOpportunity', 'categoryInsights', 'whyItMatters', 'priorities', 'weeks', 'quickWins', 'risk', 'estimatedOutcome', 'finalRecommendation']) {
  if (!serverSource.includes(generatedSection) && !fallbackSource.includes(generatedSection)) throw new Error(`Missing consulting report section: ${generatedSection}.`);
}

if (!serverSource.includes('https://api.openai.com/v1/responses') || !serverConfigSource.includes('OPENAI_API_KEY')) throw new Error('Missing server-side OpenAI integration.');
if (!serverSource.includes('createLocalConsultingInsights') || !fallbackSource.includes('createLocalConsultingInsights')) throw new Error('Missing local consulting fallback.');
if (!appSource.includes('assessmentAnswers') || !serverSource.includes('assessmentAnswers')) throw new Error('The AI consultant is not receiving the question-level assessment answers.');

const legacyStrategyCta = ['Book', 'a', 'Strategy', 'Call'].join(' ');

if (appSource.includes(legacyStrategyCta)) {
  throw new Error('Legacy strategy CTA text is still present.');
}

for (const requiredModalText of ['Name *', 'Company *', 'Email *', 'Phone (optional)', 'What would make this session valuable?', 'Request My Session']) {
  if (!appSource.includes(requiredModalText)) {
    throw new Error(`Missing strategy session modal text: ${requiredModalText}.`);
  }
}

for (const requiredBehavior of ['setIsStrategyModalOpen(true)', 'setIsStrategyModalOpen(false)', 'setStrategySessionRequests', 'sendStrategySessionRequest']) {
  if (!appSource.includes(requiredBehavior)) {
    throw new Error(`Missing strategy session behavior: ${requiredBehavior}.`);
  }
}

const retiredTerms = [['Saa', 'S'], ['V', '3'], ['Demo', ' Contractor'], ['No email service', ' is connected yet']].map((parts) => parts.join(''));

for (const retiredTerm of retiredTerms) {
  if (appSource.toLowerCase().includes(retiredTerm.toLowerCase())) {
    throw new Error(`Retired product wording is still present: ${retiredTerm}.`);
  }
}

console.log('TradeBuilt content smoke test passed.');
