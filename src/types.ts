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
  categories: CategoryScore[];
  strengths: CategoryScore[];
  opportunities: CategoryScore[];
};

export type StrategySessionRequest = Pick<LeadProfile, 'name' | 'company' | 'email' | 'phone' | 'message'> & {
  submittedAt?: string;
};
