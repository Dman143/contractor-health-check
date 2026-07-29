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

for (const requiredText of ['Get My Business Health Score', 'Request My Strategy Session', 'Top 3 Strengths', 'Top 3 Opportunities', 'Your 30-Day Action Plan', 'Performance vs Industry', 'Overall Business Ranking', 'Industry Average', 'Difference']) {
  if (!appSource.includes(requiredText)) {
    throw new Error(`Missing required UI text: ${requiredText}.`);
  }
}

for (const ranking of ['Top 10%', 'Top 25%', 'Above Average', 'Average', 'Below Average', 'Bottom 25%']) {
  if (!appSource.includes(`'${ranking}'`)) throw new Error(`Missing business ranking: ${ranking}.`);
}

for (const week of ['Week 1', 'Week 2', 'Week 3', 'Week 4']) {
  if (!appSource.includes("week: " + week.split(' ')[1])) throw new Error(`Missing action plan section: ${week}.`);
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
