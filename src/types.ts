export type Category =
  | 'Pricing'
  | 'Sales'
  | 'Marketing'
  | 'Cash Flow'
  | 'Systems'
  | 'Team'
  | 'Operations'
  | 'Customer Experience';

export type Question = {
  id: number;
  category: Category;
  prompt: string;
};

export type CategoryScore = {
  category: Category;
  score: number;
  industryAverage: number;
  difference: number;
  description?: string;
};

export type LeadProfile = {
  name: string;
  company: string;
  email: string;
  phone: string;
  message: string;
  trade: string;
  teamSize: string;
  monthlyRevenue: string;
};

export type ResultsData = {
  overall: number;
  industryAverage: number;
  ranking: BusinessRanking;
  rankingExplanation: string;
  categories: CategoryScore[];
  strengths: CategoryScore[];
  opportunities: CategoryScore[];
};

export type BusinessRanking = 'Top 10%' | 'Top 25%' | 'Above Average' | 'Average' | 'Below Average' | 'Bottom 25%';

export type ActionPlanWeek = {
  week: 1 | 2 | 3 | 4;
  title: string;
  focusCategories: Category[];
  actions: string[];
};

export type TradeActionPlan = {
  bottleneck: string;
  priorities: string[];
  weeks: ActionPlanWeek[];
  quickWins: string[];
  risk: string;
  estimatedOutcome: string;
  context: string;
};

export type StrategySessionRequest = Pick<LeadProfile, 'name' | 'company' | 'email' | 'phone' | 'message'> & {
  submittedAt?: string;
};
