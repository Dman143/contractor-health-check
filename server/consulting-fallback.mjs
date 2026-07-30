const categoryGuidance = {
  Pricing: ['Protecting gross margin starts with consistent estimating and change-order discipline.', 'standardize estimate assumptions and review job margin variance'],
  Sales: ['A repeatable follow-up process turns more qualified enquiries into booked work.', 'document the sales follow-up cadence and track each open estimate'],
  Marketing: ['A dependable lead pipeline reduces reliance on referrals and seasonal demand.', 'identify the best lead source and schedule one repeatable outreach activity'],
  'Cash Flow': ['Cash visibility keeps payroll, materials, and growth decisions from becoming surprises.', 'build a weekly cash forecast and tighten invoice follow-up'],
  Systems: ['Documented workflows reduce owner dependency and make quality easier to repeat.', 'document the most frequently repeated workflow as a one-page checklist'],
  Team: ['Clear ownership and feedback keep field and office work moving without constant escalation.', 'assign one accountable owner and a measurable standard to each recurring responsibility'],
  Operations: ['Reliable scheduling and job controls protect capacity, deadlines, and margin.', 'introduce a weekly job review covering schedule, blockers, and margin risk'],
  'Customer Experience': ['Consistent communication builds trust, referrals, and smoother project closeout.', 'set customer update milestones from kickoff through final walkthrough'],
};

const categoryScore = (results, category) => results.categories.find((item) => item.category === category);

export const createLocalConsultingInsights = ({ leadProfile, results }) => {
  const ranked = [...results.categories].sort((a, b) => a.score - b.score);
  const priorities = ranked.slice(0, 3);
  const strongest = [...results.categories].sort((a, b) => b.score - a.score)[0];
  const company = leadProfile.company?.trim() || 'Your business';
  const trade = leadProfile.trade.trim();
  const constraint = priorities[0];

  const weeks = priorities.map((item, index) => {
    const action = categoryGuidance[item.category][1];
    return {
      week: index + 1,
      title: `Strengthen ${item.category}`,
      focusCategories: [item.category],
      actions: [
        `Review the ${item.category.toLowerCase()} answers with the team and agree on the single largest gap.`,
        `Create a one-page working standard to ${action}.`,
        `Measure compliance at the end of the week and record one adjustment for the next review.`,
      ],
    };
  });
  weeks.push({
    week: 4,
    title: 'Lock in the operating rhythm',
    focusCategories: priorities.map(({ category }) => category),
    actions: [
      `Review progress across ${priorities.map(({ category }) => category).join(', ')} and record the leading indicator for each.`,
      'Choose one working standard to keep as a weekly team cadence for the next 60 days.',
      'Share the next-month priorities, owners, and review dates with everyone responsible for delivery.',
    ],
  });

  const executiveSummary = `${company} scored ${results.overall}/100, with ${strongest.category} as the strongest area and ${constraint.category} as the clearest near-term constraint. For a ${leadProfile.teamSize} ${trade} business in the ${leadProfile.monthlyRevenue} monthly revenue range, the next 30 days should turn the lowest-scoring practices into simple, owned routines before adding complexity.`;

  return {
    executiveSummary,
    context: executiveSummary,
    bottleneck: `${constraint.category} (${constraint.score}%) is the primary constraint. ${categoryGuidance[constraint.category][0]} Focus first on a visible standard, a named owner, and a weekly check.`,
    biggestOpportunity: `Improving ${priorities[1].category} alongside ${constraint.category} offers the best practical leverage because these are the two lowest-scoring parts of the current operating system.`,
    categoryInsights: results.categories.map((item) => ({
      category: item.category,
      score: item.score,
      whyItMatters: categoryGuidance[item.category][0],
      diagnosis: `${item.category} scored ${item.score}%, ${item.difference >= 0 ? `${item.difference} points above` : `${Math.abs(item.difference)} points below`} the assessment benchmark. ${item.score >= 75 ? 'Preserve the routines producing this result and make them easier for the team to repeat.' : `The next step is to ${categoryGuidance[item.category][1]}.`}`,
    })),
    priorities: priorities.map((item, index) => `${index + 1}. Strengthen ${item.category}: ${categoryGuidance[item.category][1]}, then review one leading indicator weekly.`),
    weeks,
    quickWins: [
      `Put a 20-minute weekly ${constraint.category.toLowerCase()} review on the calendar.`,
      `Write down the owner and next action for the most urgent ${priorities[1].category.toLowerCase()} gap.`,
      `Share the strongest ${strongest.category.toLowerCase()} practice with the team so it remains consistent.`,
    ],
    risk: `If the current ${constraint.category.toLowerCase()} gap remains unmanaged, growth can add workload without improving control, consistency, or financial performance.`,
    estimatedOutcome: `After 30 days, look for more consistent completion of the new routines, fewer unresolved ${constraint.category.toLowerCase()} issues, and clearer ownership across the three priority areas.`,
    finalRecommendation: `Keep the plan deliberately simple: establish the ${constraint.category} routine first, review evidence weekly, and only add another process after the team can sustain the first one.`,
  };
};
