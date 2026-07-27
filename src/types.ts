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
};

export type OnboardingData = {
  name: string;
  company: string;
  email: string;
  teamSize: string;
};

export type ResultsData = {
  overall: number;
  categories: CategoryScore[];
  strengths: CategoryScore[];
  opportunities: CategoryScore[];
};
