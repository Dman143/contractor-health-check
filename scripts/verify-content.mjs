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

for (const requiredText of ['Get My Business Health Score', 'Request My Strategy Session', 'Top 3 Strengths', 'Top 3 Opportunities', 'Recommended Next Step']) {
  if (!appSource.includes(requiredText)) {
    throw new Error(`Missing required UI text: ${requiredText}.`);
  }
}

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
