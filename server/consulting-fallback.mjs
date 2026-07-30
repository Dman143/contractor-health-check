const categoryGuidance = {
  Pricing: {
    consequence: 'Pricing discipline determines whether booked work turns into usable gross margin.',
    deliverable: 'a quote review sheet covering job cost, target margin, exclusions, and change-order approval',
    indicator: 'quotes reviewed against target margin',
  },
  Sales: {
    consequence: 'A controlled sales process protects estimating time and makes conversion less dependent on the owner remembering to follow up.',
    deliverable: 'a one-page enquiry-to-signature pipeline with qualification rules and dated follow-ups',
    indicator: 'open estimates with a dated next step',
  },
  Marketing: {
    consequence: 'A measurable market position improves lead quality and reduces dependence on whichever referral happens to arrive next.',
    deliverable: 'a simple lead-source scorecard and one clear statement of the work the business wants to win',
    indicator: 'qualified enquiries traced to a source',
  },
  'Cash Flow': {
    consequence: 'Cash control determines whether payroll, materials, and tax obligations can be met without avoidable surprises.',
    deliverable: 'a rolling 13-week cash view with payment milestones and overdue invoices visible',
    indicator: 'cash commitments forecast before they fall due',
  },
  Systems: {
    consequence: 'Documented handoffs let a growing contractor repeat good work without every detail passing through the owner.',
    deliverable: 'a one-page checklist for the weakest recurring workflow, including owner, trigger, and definition of done',
    indicator: 'jobs using the agreed checklist without rework',
  },
  Team: {
    consequence: 'Clear accountability converts headcount into capacity rather than more questions and owner escalation.',
    deliverable: 'a responsibility map with one accountable person and one observable standard for each recurring duty',
    indicator: 'commitments completed by the named owner on time',
  },
  Operations: {
    consequence: 'Job controls connect scope, schedule, and live profitability before a problem is too late to correct.',
    deliverable: 'a weekly live-job review covering scope, schedule, materials, client commitments, and margin risk',
    indicator: 'live jobs reviewed before schedule or cost variance grows',
  },
  'Customer Experience': {
    consequence: 'Consistent client communication protects trust during delivery and creates reviews, referrals, and repeat work after closeout.',
    deliverable: 'a client communication and closeout checklist from kickoff through review request',
    indicator: 'projects receiving every promised update and closeout step',
  },
};

const categoryScore = (results, category) => results.categories.find((item) => item.category === category);
const answerTone = (answer) => answer.response?.trim() || ['Not true yet', 'Rarely true', 'Sometimes true', 'Mostly true', 'Dialed in'][answer.score - 1];
const answerSubject = (answer) => answer.prompt
  .replace(/^(Our|We|The owner)\s+/i, '')
  .replace(/[.—]+$/g, '')
  .replace(/—/g, ', ')
  .replace(/^./, (character) => character.toLowerCase());
const evidence = (answer) => `the answer on whether ${answerSubject(answer)} was “${answerTone(answer)}” (${answer.score}/5)`;
const select = (options, seed, offset = 0) => options[(seed + offset) % options.length];

const rankAnswers = (answers, direction = 'asc') => [...answers].sort((a, b) => {
  const scoreDifference = direction === 'asc' ? a.score - b.score : b.score - a.score;
  return scoreDifference || a.questionId - b.questionId;
});

export const createLocalConsultingInsights = ({ leadProfile, results, assessmentAnswers = [] }) => {
  const rankedCategories = [...results.categories].sort((a, b) => a.score - b.score || a.category.localeCompare(b.category));
  const priorities = rankedCategories.slice(0, 3);
  const strongest = [...results.categories].sort((a, b) => b.score - a.score || a.category.localeCompare(b.category))[0];
  const company = leadProfile.company?.trim() || 'Your business';
  const trade = leadProfile.trade.trim();
  const ownerPriority = leadProfile.message?.trim();
  const seed = assessmentAnswers.reduce((total, answer) => total + answer.questionId * answer.score, company.length + trade.length);
  const answersByCategory = Object.fromEntries(results.categories.map(({ category }) => [category, assessmentAnswers.filter((answer) => answer.category === category)]));
  const allLowAnswers = rankAnswers(assessmentAnswers);
  const allHighAnswers = rankAnswers(assessmentAnswers, 'desc');
  const constraintAnswer = allLowAnswers[0];
  const leverageAnswer = allLowAnswers.find((answer) => answer.category !== constraintAnswer?.category) ?? allLowAnswers[1] ?? constraintAnswer;
  const proofAnswer = allHighAnswers[0];
  const constraint = categoryScore(results, constraintAnswer?.category) ?? priorities[0];
  const leverage = categoryScore(results, leverageAnswer?.category) ?? priorities[1];

  const categoryInsights = results.categories.map((item, categoryIndex) => {
    const answers = answersByCategory[item.category];
    const weakest = rankAnswers(answers)[0];
    const best = rankAnswers(answers, 'desc')[0];
    const spread = best && weakest ? best.score - weakest.score : 0;
    const benchmarkPosition = `${Math.abs(item.difference)} points ${item.difference >= 0 ? 'above' : 'below'} the benchmark`;
    const diagnosis = !weakest
      ? `${item.category} sits ${benchmarkPosition}; validate the underlying practices before making a major decision.`
      : spread >= 2
        ? select([
          `The ${item.score}% category score hides an execution gap: ${evidence(best)} is a usable strength, while ${evidence(weakest)} is where consistency breaks down. Preserve the former and standardize the latter.`,
          `This is an uneven ${item.score}% rather than a uniform result. ${evidence(best)} provides a base to build from; by contrast, ${evidence(weakest)} explains the immediate exposure.`,
          `${evidence(best)} shows the business can execute here, but ${evidence(weakest)} prevents that capability from carrying through the whole process. The result is ${benchmarkPosition}.`,
        ], seed, categoryIndex)
        : select([
          `The ${item.score}% result is broadly consistent across the answers; most telling is ${evidence(weakest)}. That specific practice should set the next operating standard.`,
          `At ${item.score}% (${benchmarkPosition}), the clearest evidence is ${evidence(weakest)}. Treat that response as a practical control issue, not simply a score to improve.`,
          `${evidence(weakest)} anchors this ${item.score}% result. The next move is to make that practice observable, owned, and reviewable each week.`,
        ], seed, categoryIndex);
    return {
      category: item.category,
      score: item.score,
      whyItMatters: `${categoryGuidance[item.category].consequence} For a ${leadProfile.teamSize} ${trade} business, that directly affects how confidently the current ${leadProfile.monthlyRevenue} revenue level can be managed.`,
      diagnosis,
    };
  });

  const weeks = priorities.map((item, index) => {
    const weakAnswer = rankAnswers(answersByCategory[item.category])[0];
    const guidance = categoryGuidance[item.category];
    const verbs = [
      ['Define', 'Build', 'Run'],
      ['Map', 'Install', 'Review'],
      ['Clarify', 'Document', 'Test'],
    ][(seed + index) % 3];
    return {
      week: index + 1,
      title: select([
        `Turn the ${item.category} gap into a working control`,
        `Make ${item.category} visible and accountable`,
        `Remove the friction in ${item.category}`,
      ], seed, index),
      focusCategories: [item.category],
      actions: [
        `${verbs[0]} the failure point behind ${evidence(weakAnswer)}: write down what happens now, where it stalls, and the person who can correct it.`,
        `${verbs[1]} ${guidance.deliverable} to correct the ${weakAnswer.score}/5 practice; keep it to one page and assign one accountable owner rather than a committee.`,
        `${verbs[2]} the new control on active work against the “${answerTone(weakAnswer)}” response, then record ${guidance.indicator} and one adjustment before the next weekly review.`,
      ],
    };
  });
  weeks.push({
    week: 4,
    title: select(['Prove the new operating rhythm', 'Consolidate what the team can sustain', 'Turn the fixes into management cadence'], seed),
    focusCategories: priorities.map(({ category }) => category),
    actions: [
      `Compare the evidence collected for ${priorities.map(({ category }) => category).join(', ')}; keep only the controls the team actually used and name the owner of each.`,
      `Hold a 30-minute review of the three weak responses that shaped this plan—${priorities.map((item) => `${item.category} ${rankAnswers(answersByCategory[item.category])[0]?.score ?? 0}/5`).join(', ')}—and close every action with a person and date.`,
      `Set the next four weekly review dates and carry forward the single indicator that best exposes risk before it reaches a customer, the schedule, or cash.`,
    ],
  });

  const priorityStatements = priorities.map((item, index) => {
    const weakAnswer = rankAnswers(answersByCategory[item.category])[0];
    return `${index + 1}. ${item.category}: respond to ${evidence(weakAnswer)} by creating ${categoryGuidance[item.category].deliverable}. Review ${categoryGuidance[item.category].indicator} weekly so the change becomes a management control, not a one-off task.`;
  });
  const priorityContext = ownerPriority ? ` The owner's stated priority—“${ownerPriority}”—should be tested against this operating evidence rather than pursued as a separate initiative.` : '';
  const executiveSummary = select([
    `${company} is operating at ${results.overall}/100. ${strongest.category} is the strongest category at ${strongest.score}%, supported by ${evidence(proofAnswer)}; however, ${evidence(constraintAnswer)} points to ${constraint.category} as the first constraint to remove. For a ${leadProfile.teamSize} ${trade} contractor in the ${leadProfile.monthlyRevenue} monthly revenue band, the right 30-day decision is to strengthen control before adding complexity.${priorityContext}`,
    `The assessment describes a ${trade} business with a credible base in ${strongest.category} (${strongest.score}%) but a specific control problem in ${constraint.category}: ${evidence(constraintAnswer)}. At ${results.overall}/100 and ${leadProfile.monthlyRevenue} in monthly revenue, ${company} should use the next month to convert that weak practice into a visible routine the ${leadProfile.teamSize} team can run without informal follow-up.${priorityContext}`,
    `${company}'s ${results.overall}/100 result is not a call for a broad overhaul. The useful contrast is between ${evidence(proofAnswer)}, which demonstrates capability, and ${evidence(constraintAnswer)}, which exposes the near-term constraint. The commercial priority for this ${leadProfile.teamSize} ${trade} operation is disciplined execution across ${constraint.category}, then ${leverage.category}.${priorityContext}`,
  ], seed);

  return {
    executiveSummary,
    context: executiveSummary,
    bottleneck: `${constraint.category} is the immediate constraint, not merely because it scored ${constraint.score}%, but because ${evidence(constraintAnswer)}. Until that practice has an owner, a visible standard, and a weekly proof point, additional volume can amplify the weakness.`,
    biggestOpportunity: `${leverage.category} offers the best adjacent leverage: ${evidence(leverageAnswer)}. Improving it alongside ${constraint.category} should make work easier to convert, deliver, or collect without asking the team to absorb a wide transformation at once.`,
    categoryInsights,
    priorities: priorityStatements,
    weeks,
    quickWins: [
      `Circle the owner and due date beside the open issue implied by ${evidence(constraintAnswer)}.`,
      `Book a 20-minute ${constraint.category.toLowerCase()} review and place “${categoryGuidance[constraint.category].indicator}” in the agenda.`,
      `Ask the person closest to ${leverage.category.toLowerCase()} to show one current example behind the ${leverageAnswer?.score ?? 0}/5 response; use the example to define the first correction.`,
    ],
    risk: `If ${evidence(constraintAnswer)} remains unchanged, more work is likely to place additional pressure on ${constraint.category}; the business would be carrying a known control gap into its next jobs rather than resolving it at the current scale.`,
    estimatedOutcome: `After 30 days, look for a higher share of ${categoryGuidance[constraint.category].indicator}, dated ownership of ${leverage.category.toLowerCase()} actions, and fewer exceptions discovered after the fact. Those leading indicators—not a promised revenue result—will show whether the plan is taking hold.`,
    finalRecommendation: `Do not launch eight improvement projects. Use ${evidence(constraintAnswer)} as the test case: install the ${constraint.category} control, inspect it weekly, and expand only after the ${leadProfile.teamSize} team can demonstrate it without owner reminders.`,
  };
};
