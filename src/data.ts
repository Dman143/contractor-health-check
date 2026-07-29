import type { Category, Question } from './types';

export const questions: Question[] = [
  { id: 1, category: 'Pricing', prompt: 'Our pricing is based on real job costs, margins, and market positioning—not guesswork.' },
  { id: 2, category: 'Pricing', prompt: 'We consistently protect gross margin on change orders and extras.' },
  { id: 3, category: 'Pricing', prompt: 'We know which job types are most profitable and quote accordingly.' },
  { id: 4, category: 'Sales', prompt: 'We have a repeatable sales process from inquiry to signed agreement.' },
  { id: 5, category: 'Sales', prompt: 'We qualify prospects before investing time in estimates or site visits.' },
  { id: 6, category: 'Sales', prompt: 'Our follow-up process helps us close good-fit opportunities without chasing.' },
  { id: 7, category: 'Marketing', prompt: 'We generate consistent inbound leads from channels we can measure.' },
  { id: 8, category: 'Marketing', prompt: 'Our website, reviews, and project photos clearly build trust before prospects contact us.' },
  { id: 9, category: 'Marketing', prompt: 'We communicate a clear specialty or advantage instead of looking like every other contractor.' },
  { id: 10, category: 'Cash Flow', prompt: 'We always know our cash position and near-term obligations.' },
  { id: 11, category: 'Cash Flow', prompt: 'Deposits, progress payments, and collections keep projects cash-positive.' },
  { id: 12, category: 'Cash Flow', prompt: 'We review financial reports often enough to catch problems early.' },
  { id: 13, category: 'Systems', prompt: 'Important workflows are documented so work does not live only in someone’s head.' },
  { id: 14, category: 'Systems', prompt: 'We use tools or software that reduce double entry and missed details.' },
  { id: 15, category: 'Systems', prompt: 'Our estimating, scheduling, and project handoff process is consistent.' },
  { id: 16, category: 'Team', prompt: 'Everyone understands their role, responsibilities, and performance expectations.' },
  { id: 17, category: 'Team', prompt: 'We can delegate day-to-day tasks without quality or accountability slipping.' },
  { id: 18, category: 'Team', prompt: 'Hiring, onboarding, and training are structured enough to support growth.' },
  { id: 19, category: 'Operations', prompt: 'Projects start with clear scopes, timelines, materials, and client expectations.' },
  { id: 20, category: 'Operations', prompt: 'Schedules are managed proactively and delays are communicated early.' },
  { id: 21, category: 'Operations', prompt: 'We track job progress and profitability while the work is still happening.' },
  { id: 22, category: 'Customer Experience', prompt: 'Clients receive clear communication before, during, and after their project.' },
  { id: 23, category: 'Customer Experience', prompt: 'We have a reliable process for handling issues, punch lists, and warranty requests.' },
  { id: 24, category: 'Customer Experience', prompt: 'Happy clients are regularly converted into reviews, referrals, or repeat work.' },
  { id: 25, category: 'Operations', prompt: 'The owner can step away for a few days without everything stopping.' },
];

export const scaleLabels = ['Not true yet', 'Rarely true', 'Sometimes true', 'Mostly true', 'Dialed in'];

export const categories: Category[] = [
  'Pricing',
  'Sales',
  'Marketing',
  'Cash Flow',
  'Systems',
  'Team',
  'Operations',
  'Customer Experience',
];

export const categoryGradients: Record<Category, string> = {
  Pricing: 'from-amber-400 to-orange-500',
  Sales: 'from-emerald-400 to-teal-500',
  Marketing: 'from-sky-400 to-blue-500',
  'Cash Flow': 'from-lime-400 to-green-500',
  Systems: 'from-violet-400 to-purple-500',
  Team: 'from-rose-400 to-pink-500',
  Operations: 'from-cyan-400 to-slate-500',
  'Customer Experience': 'from-fuchsia-400 to-indigo-500',
};

export const tradeOptions = [
  'General Contractor',
  'Remodeling',
  'Roofing',
  'HVAC',
  'Plumbing',
  'Electrical',
  'Landscaping',
  'Painting',
  'Concrete / Masonry',
  'Other Specialty Trade',
];

export const teamSizeOptions = ['Solo owner', '2–5 people', '6–10 people', '11–20 people', '21+ people'];

export const monthlyRevenueOptions = ['Under $50k', '$50k–$100k', '$100k–$250k', '$250k–$500k', '$500k+'];

export const industryBenchmarks: Record<Category, number> = {
  Pricing: 72,
  Sales: 68,
  Marketing: 61,
  'Cash Flow': 66,
  Systems: 58,
  Team: 63,
  Operations: 70,
  'Customer Experience': 74,
};

export const categoryRevenueLeaks: Record<Category, string> = {
  Pricing: 'Margin is escaping through underpriced scopes, weak change-order discipline, or unprofitable job mix.',
  Sales: 'Good leads may be cooling off because qualification, follow-up, and close steps are inconsistent.',
  Marketing: 'The business is relying too heavily on referrals instead of measurable demand generation.',
  'Cash Flow': 'Cash pressure may be hiding in payment terms, collections timing, or delayed financial review.',
  Systems: 'Owner dependency and manual handoffs are creating rework, bottlenecks, and missed details.',
  Team: 'Growth is limited by unclear ownership, inconsistent delegation, or informal training.',
  Operations: 'Project execution is vulnerable to scope drift, schedule surprises, and late profitability tracking.',
  'Customer Experience': 'Referral and review momentum may be leaking after project completion.',
};

export const categoryPlaybooks: Record<Category, string[]> = {
  Pricing: ['Audit the last 10 completed jobs by gross margin.', 'Create a minimum-margin quoting rule for each job type.', 'Require written approval before any extra work starts.'],
  Sales: ['Define your ideal-fit customer and disqualification rules.', 'Use one pipeline stage checklist from inquiry to signed agreement.', 'Schedule three follow-up touches before every estimate goes cold.'],
  Marketing: ['Pick two measurable lead channels to improve this quarter.', 'Refresh project proof: photos, reviews, before/after stories.', 'Add a clear specialty promise to the website hero and estimate form.'],
  'Cash Flow': ['Review cash, receivables, payables, and backlog every Monday.', 'Standardize deposits and progress billing by project type.', 'Flag every invoice older than seven days for owner review.'],
  Systems: ['Document the estimate-to-handoff workflow in one page.', 'Remove one double-entry task from estimating or scheduling.', 'Create templates for scopes, selections, and client updates.'],
  Team: ['Rewrite each role around outcomes, not tasks.', 'Choose one weekly scorecard metric per key seat.', 'Build a 30-day onboarding checklist for the next hire.'],
  Operations: ['Launch every job with a scope, schedule, selections, and risk review.', 'Update schedule blockers twice per week.', 'Compare actual labor/material costs to estimate before job closeout.'],
  'Customer Experience': ['Set communication expectations before production starts.', 'Use one punch-list and warranty intake process.', 'Ask for the review or referral within 48 hours of completion.'],
};
