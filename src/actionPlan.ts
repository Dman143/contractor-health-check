import { categoryActionItems, categoryRevenueLeaks, industryBenchmarks } from './data';
import type { ActionPlanWeek, Category, LeadProfile, ResultsData, TradeActionPlan } from './types';

type TradePlaybook = { unit: string; field: string; proof: string; scheduleRisk: string };

const tradePlaybooks: Record<string, TradePlaybook> = {
  'General Contractor': { unit: 'project', field: 'project manager and lead carpenter', proof: 'completed-project photos and client references', scheduleRisk: 'subcontractor, selection, and inspection constraints' },
  Remodeling: { unit: 'remodel', field: 'project lead and production coordinator', proof: 'before-and-after transformations and occupied-home reviews', scheduleRisk: 'selections, change orders, and long-lead materials' },
  Roofing: { unit: 'roof', field: 'crew lead and production coordinator', proof: 'roof-system photos, warranty proof, and neighborhood reviews', scheduleRisk: 'weather, permits, material drops, and supplement approvals' },
  HVAC: { unit: 'install or service call', field: 'install lead and dispatcher', proof: 'comfort results, maintenance reviews, and equipment expertise', scheduleRisk: 'equipment availability, callbacks, and dispatch capacity' },
  Plumbing: { unit: 'plumbing job', field: 'service lead and dispatcher', proof: 'response-time reviews and clean-install photos', scheduleRisk: 'dispatch gaps, parts availability, and return visits' },
  Electrical: { unit: 'electrical job', field: 'journeyperson and service coordinator', proof: 'panel, lighting, and code-compliant installation photos', scheduleRisk: 'permits, inspections, materials, and crew loading' },
  Landscaping: { unit: 'landscape project', field: 'crew leader and production manager', proof: 'seasonal transformations and property-specific reviews', scheduleRisk: 'weather, material delivery, equipment, and crew routing' },
  Painting: { unit: 'painting project', field: 'crew leader and production coordinator', proof: 'surface-preparation photos and finish-quality reviews', scheduleRisk: 'prep conditions, color approvals, weather, and crew sequencing' },
  'Concrete / Masonry': { unit: 'concrete or masonry project', field: 'foreman and production manager', proof: 'finish-detail photos and durability-focused reviews', scheduleRisk: 'weather windows, site readiness, inspections, and pour logistics' },
  'Other Specialty Trade': { unit: 'job', field: 'field lead and office coordinator', proof: 'project photos and trade-specific client reviews', scheduleRisk: 'materials, access, approvals, and crew capacity' },
};

const stageFor = (profile: LeadProfile, score: number) => {
  if (score < 50 || profile.monthlyRevenue === 'Under $50k') return { name: 'stabilization', owner: 'the owner', cadence: 'daily', outcome: 'control cash and stop preventable leakage before adding volume' };
  if (profile.teamSize === 'Solo owner' || profile.teamSize === '2–5 people') return { name: 'owner-led growth', owner: 'the owner and one named backup', cadence: 'twice-weekly', outcome: 'create repeatability without adding unnecessary overhead' };
  if (profile.monthlyRevenue === '$500k+' || profile.teamSize === '21+ people') return { name: 'scale', owner: 'the accountable department lead', cadence: 'weekly', outcome: 'tighten management visibility and protect margin at scale' };
  return { name: 'managed growth', owner: 'the owner and functional lead', cadence: 'weekly', outcome: 'increase throughput without making the owner the bottleneck' };
};

const tailoredAction = (category: Category, base: string, trade: TradePlaybook, stage: ReturnType<typeof stageFor>) => {
  const additions: Partial<Record<Category, string>> = {
    Pricing: `Apply it to each ${trade.unit}, with separate labor, material, and callback or warranty allowances.`,
    Sales: `Use the same process for every qualified ${trade.unit} opportunity and record the next action before the lead is closed.`,
    Marketing: `Lead with ${trade.proof}; track booked revenue rather than likes or raw lead count.`,
    'Cash Flow': `Include committed labor and materials for every active ${trade.unit}, not only invoices already received.`,
    Systems: `Test the workflow with the ${trade.field} so it works in the field, not just in the office.`,
    Team: `Make ${stage.owner} accountable and review it ${stage.cadence}.`,
    Operations: `Flag ${trade.scheduleRisk} before they affect the promised completion date.`,
    'Customer Experience': `Make the update specific to the next milestone, access needs, decisions, and risks on the ${trade.unit}.`,
  };
  return `${base} ${additions[category]}`;
};

export const createTradeActionPlan = (profile: LeadProfile, results: ResultsData): TradeActionPlan => {
  const trade = tradePlaybooks[profile.trade] ?? tradePlaybooks['Other Specialty Trade'];
  const stage = stageFor(profile, results.overall);
  const rankedGaps = [...results.categories].sort((a, b) => a.difference - b.difference || a.score - b.score);
  const priorities = rankedGaps.slice(0, 3).map(({ category }) => category);
  const [primary = 'Systems', secondary = primary, tertiary = secondary] = priorities;
  const strongest = [...results.categories].sort((a, b) => b.score - a.score)[0];
  const primaryScore = results.categories.find(({ category }) => category === primary)?.score ?? 0;
  const primaryGap = primaryScore - industryBenchmarks[primary];
  const priorityCopy = priorities.map((category, index) => {
    const score = results.categories.find((item) => item.category === category)?.score ?? 0;
    const gap = score - industryBenchmarks[category];
    const moves = ['control the immediate leak', 'build the repeatable operating rhythm', 'protect the gain with ownership and measurement'];
    return `${category} — ${moves[index]}; at ${score}%, it is ${Math.abs(gap)} points ${gap < 0 ? 'behind' : 'ahead of'} the contractor benchmark.`;
  });
  const weeks: ActionPlanWeek[] = [
    { week: 1, title: `Get control of ${primary}`, focusCategories: [primary], actions: categoryActionItems[primary].slice(0, 3).map((item) => tailoredAction(primary, item, trade, stage)) },
    { week: 2, title: `Install the ${secondary} operating rhythm`, focusCategories: [secondary], actions: categoryActionItems[secondary].slice(0, 3).map((item) => tailoredAction(secondary, item, trade, stage)) },
    { week: 3, title: `Remove the ${tertiary} constraint`, focusCategories: [tertiary], actions: categoryActionItems[tertiary].slice(0, 3).map((item) => tailoredAction(tertiary, item, trade, stage)) },
    { week: 4, title: 'Measure, assign, and lock in the new standard', focusCategories: [primary, secondary, tertiary], actions: priorities.map((category) => tailoredAction(category, categoryActionItems[category][3], trade, stage)) },
  ];
  const quickWins = [
    `Put a 20-minute calendar block on the ${stage.owner}'s schedule to review ${primary} every ${stage.cadence === 'daily' ? 'workday' : stage.cadence.replace('-', ' ')}.`,
    `Choose one active ${trade.unit} and write its next milestone, owner, due date, and biggest blocker in the team’s source of truth.`,
    `Send one past customer a direct review request that mentions ${trade.proof}.`,
  ];
  return {
    bottleneck: `${primary} is the biggest bottleneck: it scored ${primaryScore}% (${Math.abs(primaryGap)} points ${primaryGap < 0 ? 'below' : 'above'} benchmark). In a ${profile.trade.toLowerCase()} business at the ${stage.name} stage, ${categoryRevenueLeaks[primary].toLowerCase()}`,
    priorities: priorityCopy,
    weeks,
    quickWins,
    risk: `If nothing changes, weak ${primary.toLowerCase()} will compound as ${profile.monthlyRevenue} in monthly work moves through a ${profile.teamSize.toLowerCase()} team. The likely result is ${categoryRevenueLeaks[primary].toLowerCase()} More sales could increase workload faster than cash, margin, or delivery reliability improves.`,
    estimatedOutcome: `Completed consistently for 30 days, this plan should give ${profile.company || 'the business'} a visible owner and weekly measure for each constraint, cleaner control of every ${trade.unit}, and a practical path to close the ${Math.max(0, -primaryGap)}-point ${primary} benchmark gap. Expect better predictability and faster decisions first—not a guaranteed revenue claim—while using ${strongest.category} (${strongest.score}%) as the operating strength that helps the changes stick.`,
    context: `Built for a ${profile.trade} business with ${profile.teamSize.toLowerCase()} at ${profile.monthlyRevenue} monthly revenue. With an overall score of ${results.overall}/100, the next 30 days should ${stage.outcome}.`,
  };
};
