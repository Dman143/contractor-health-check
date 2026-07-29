import { readFileSync } from 'node:fs';

const dataSource = readFileSync(new URL('../src/data.ts', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
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

for (const requiredText of ['Start Assessment', 'Request Strategy Session', 'Top 3 Strengths', 'Top 3 Opportunities', 'Recommended Next Step']) {
  if (!appSource.includes(requiredText)) {
    throw new Error(`Missing required UI text: ${requiredText}.`);
  }
}

const legacyStrategyCta = ['Book', 'a', 'Strategy', 'Call'].join(' ');

if (appSource.includes(legacyStrategyCta)) {
  throw new Error('Legacy strategy CTA text is still present.');
}

for (const requiredModalText of ['Name *', 'Company *', 'Email *', 'Phone (optional)', 'Message', 'Send Request']) {
  if (!appSource.includes(requiredModalText)) {
    throw new Error(`Missing strategy session modal text: ${requiredModalText}.`);
  }
}

for (const requiredBehavior of ['setIsStrategyModalOpen(true)', 'setIsStrategyModalOpen(false)', 'setStrategySessionRequests', 'Premium confirmation']) {
  if (!appSource.includes(requiredBehavior)) {
    throw new Error(`Missing strategy session behavior: ${requiredBehavior}.`);
  }
}

console.log('Contractor Health Check content smoke test passed.');
