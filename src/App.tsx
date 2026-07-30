import { FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  categories,
  categoryGradients,
  benchmarkMethodology,
  industryBenchmarks,
  monthlyRevenueOptions,
  questions,
  scaleLabels,
  teamSizeOptions,
  tradeOptions,
} from './data';
import type { ActionPlanWeek, BusinessRanking, Category, LeadProfile, ResultsData, StrategySessionRequest, TradeActionPlan } from './types';

type Screen = 'landing' | 'lead-capture' | 'assessment' | 'results';

type ScoreBand = {
  label: string;
  description: string;
};

type GrowthPhase = {
  number: 1 | 2 | 3 | 4;
  name: string;
  focus: string[];
};

const growthPhases: GrowthPhase[] = [
  { number: 1, name: 'Stabilize', focus: ['Pricing', 'Cash Flow', 'Systems'] },
  { number: 2, name: 'Grow', focus: ['Marketing', 'Sales', 'Customer Experience'] },
  { number: 3, name: 'Scale', focus: ['Team', 'Operations', 'Leadership'] },
  { number: 4, name: 'Freedom', focus: ['Dashboards', 'Automation', 'Profit optimization', 'Business valuation'] },
];

const tradeBuiltServices = [
  { name: 'Contractor Health Check', description: 'A focused diagnostic that reveals the constraints, profit leaks, and highest-leverage priorities in your business.' },
  { name: '90-Day Growth Program', description: 'An intensive implementation sprint that turns your priorities into a practical plan, measurable wins, and lasting momentum.' },
  { name: 'Monthly Growth Advisory', description: 'Ongoing strategic guidance and accountability for owners navigating growth, decisions, and new levels of complexity.' },
  { name: 'Systems & Automation', description: 'Purpose-built workflows and smart automation that reduce owner dependency, rework, and administrative drag.' },
  { name: 'KPI Dashboard', description: 'A clear command center for the numbers that drive cash, margin, sales, operations, and confident decisions.' },
];

type DashboardMetric = {
  label: string;
  value: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  chart?: number[];
};

const dashboardMetrics: DashboardMetric[] = [
  { label: 'Revenue This Month', value: '$184,750', trend: '↑ 12.4%', trendDirection: 'up', chart: [32, 45, 40, 58, 63, 72, 82] },
  { label: 'Gross Profit %', value: '38.6%', trend: '↑ 2.1 pts', trendDirection: 'up', chart: [45, 44, 52, 54, 60, 65, 68] },
  { label: 'Leads This Month', value: '47', trend: '↑ 8 vs last month', trendDirection: 'up', chart: [35, 50, 44, 62, 56, 70, 76] },
  { label: 'Quotes Sent', value: '29', trend: '6 awaiting follow-up', trendDirection: 'neutral' },
  { label: 'Quote Conversion %', value: '41.3%', trend: '↑ 4.7 pts', trendDirection: 'up', chart: [42, 48, 46, 55, 52, 61, 69] },
  { label: 'Active Projects', value: '12', trend: 'On schedule', trendDirection: 'up' },
  { label: 'Jobs Completed', value: '18', trend: '↑ 3 vs last month', trendDirection: 'up' },
  { label: 'Outstanding Quotes', value: '$96,400', trend: '↓ 2 need action', trendDirection: 'down' },
  { label: 'Cash Flow Health', value: 'Healthy', trend: '8.4 weeks runway', trendDirection: 'up', chart: [44, 48, 55, 53, 62, 68, 74] },
  { label: 'Google Review Rating', value: '4.9 ★', trend: '126 reviews', trendDirection: 'up' },
];

const getGrowthPhaseIndex = (score: number) => {
  if (score >= 85) return 3;
  if (score >= 70) return 2;
  if (score >= 50) return 1;
  return 0;
};

const requestJson = async <T,>(url: string, payload: unknown, fallbackMessage: string): Promise<T> => {
  const response = await fetch(url, {
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    signal: AbortSignal.timeout(65_000),
  });
  const body = await response.json().catch(() => null) as ({ message?: string } & T) | null;
  if (!response.ok) throw new Error(body?.message || fallbackMessage);
  return body as T;
};


type EmailReportPayload = {
  leadProfile: LeadProfile;
  results: ResultsData;
  actionPlan: ActionPlanWeek[];
  tradePlan: TradeActionPlan;
  completedAt: string;
  pdf: {
    base64: string;
    filename: string;
  };
};

type StrategySessionPayload = StrategySessionRequest & {
  assessmentScore: number;
  priorityArea: Category;
};

const generateConsultingInsights = async (leadProfile: LeadProfile, results: ResultsData, answers: Record<number, number>) => {
  const assessmentAnswers = questions.map((question) => ({
    category: question.category,
    prompt: question.prompt,
    score: answers[question.id],
    response: scaleLabels[(answers[question.id] ?? 1) - 1],
  }));
  const response = await requestJson<{ tradePlan: TradeActionPlan }>('/api/consulting-insights', { leadProfile, results, assessmentAnswers }, 'Unable to generate consulting insights.');
  return response.tradePlan;
};

const sendReportEmail = async (payload: EmailReportPayload) => {
  await requestJson('/api/email-report', payload, 'Unable to send report email.');
};

const sendStrategySessionRequest = async (payload: StrategySessionPayload) => {
  await requestJson('/api/strategy-session', payload, 'Unable to send your request.');
};

const emptyLeadProfile: LeadProfile = {
  name: '',
  company: '',
  email: '',
  phone: '',
  message: '',
  trade: tradeOptions[0],
  teamSize: teamSizeOptions[1],
  monthlyRevenue: monthlyRevenueOptions[1],
};

const getScoreBand = (score: number): ScoreBand => {
  if (score >= 85) {
    return { label: 'Scale Ready', description: 'Your business has strong fundamentals and is ready for managed growth, hiring, or premium positioning.' };
  }

  if (score >= 70) {
    return { label: 'Healthy Operator', description: 'You have a solid base with a few constraints holding back smoother growth and owner freedom.' };
  }

  if (score >= 50) {
    return { label: 'Growth Constrained', description: 'Several operating areas need attention before growth becomes predictable and profitable.' };
  }

  return { label: 'Stabilize First', description: 'Focus on cash, delivery, and sales control before adding more volume or complexity.' };
};

const industryAverage = Math.round(categories.reduce((sum, category) => sum + industryBenchmarks[category], 0) / categories.length);

const getBusinessRanking = (score: number): BusinessRanking => {
  if (score >= 90) return 'Top 10%';
  if (score >= 80) return 'Top 25%';
  if (score >= 72) return 'Above Average';
  if (score >= 60) return 'Average';
  if (score >= 45) return 'Below Average';
  return 'Bottom 25%';
};

const getRankingExplanation = (overall: number, categoryScores: ResultsData['categories'], ranking: BusinessRanking) => {
  const aboveBenchmark = categoryScores.filter(({ category, score }) => score >= industryBenchmarks[category]);
  const strongest = [...categoryScores].sort((a, b) => (b.score - industryBenchmarks[b.category]) - (a.score - industryBenchmarks[a.category]))[0];
  const delta = overall - industryAverage;
  const comparison = delta === 0 ? 'in line with' : `${Math.abs(delta)} points ${delta > 0 ? 'above' : 'below'}`;
  const proof = aboveBenchmark.length
    ? `${aboveBenchmark.length} of 8 operating categories meet or exceed their benchmark, led by ${strongest.category}`
    : `all eight operating categories remain below their benchmark, with ${strongest.category} closest to the peer standard`;
  return `${ranking} reflects an overall score of ${overall}, ${comparison} the ${industryAverage}-point industry average; ${proof}.`;
};


const pdfSafe = (value: string) => value.normalize('NFKD').replace(/[^\x20-\x7E]/g, '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
const wrapPdfText = (value: string, limit = 82) => {
  const words = pdfSafe(value).split(/\s+/);
  return words.reduce<string[]>((lines, word) => {
    const last = lines.at(-1) ?? '';
    if (!last || `${last} ${word}`.length > limit) lines.push(word);
    else lines[lines.length - 1] = `${last} ${word}`;
    return lines;
  }, []);
};

const createPdfReport = (leadProfile: LeadProfile, results: ResultsData, band: ScoreBand, tradePlan: TradeActionPlan) => {
  const reportDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date());
  const plan = tradePlan.weeks;
  const pages: string[][] = [];
  const page = () => { const commands: string[] = []; pages.push(commands); return commands; };
  const text = (commands: string[], value: string, x: number, y: number, size = 10, font = 'F1', color = '0.16 0.20 0.27') => {
    commands.push(`${color} rg BT /${font} ${size} Tf ${x} ${y} Td (${pdfSafe(value)}) Tj ET`);
  };
  const line = (commands: string[], x1: number, y1: number, x2: number, y2: number, color = '0.85 0.87 0.90') => commands.push(`${color} RG 1 w ${x1} ${y1} m ${x2} ${y2} l S`);
  const header = (commands: string[], section: string) => {
    commands.push('0.04 0.07 0.12 rg 0 728 612 64 re f', '0.96 0.66 0.18 rg 42 745 12 12 re f');
    text(commands, 'TRADEBUILT', 65, 746, 14, 'F2', '1 1 1');
    text(commands, section.toUpperCase(), 430, 747, 8, 'F2', '0.74 0.78 0.84');
    text(commands, `Prepared ${reportDate}`, 42, 26, 8, 'F1', '0.42 0.46 0.52');
    text(commands, `TradeBuilt Business Health Report  |  ${pages.length}`, 390, 26, 8, 'F1', '0.42 0.46 0.52');
  };

  const overview = page();
  header(overview, 'Business Health Report');
  text(overview, 'CONTRACTOR GROWTH DIAGNOSTIC', 42, 681, 9, 'F2', '0.78 0.45 0.08');
  wrapPdfText(`${leadProfile.company} Business Health Report`, 38).forEach((value, index) => text(overview, value, 42, 638 - index * 34, 27, 'F2', '0.04 0.07 0.12'));
  text(overview, `Prepared for ${leadProfile.name}`, 42, 555, 12, 'F1', '0.35 0.39 0.45');
  line(overview, 42, 528, 570, 528);
  text(overview, `${results.overall}`, 42, 428, 74, 'F2', '0.04 0.07 0.12');
  text(overview, '/100', 130, 438, 20, 'F2', '0.42 0.46 0.52');
  text(overview, band.label, 42, 394, 22, 'F2', '0.78 0.45 0.08');
  wrapPdfText(tradePlan.executiveSummary, 62).slice(0, 5).forEach((value, index) => text(overview, value, 42, 364 - index * 16, 11));
  text(overview, `OVERALL BUSINESS RANKING  |  ${results.ranking}`, 42, 320, 10, 'F2', '0.10 0.55 0.42');
  wrapPdfText(results.rankingExplanation, 76).forEach((value, index) => text(overview, value, 42, 302 - index * 13, 8));
  text(overview, 'BUSINESS PROFILE', 42, 248, 9, 'F2', '0.42 0.46 0.52');
  [[leadProfile.trade, 'Primary trade'], [leadProfile.teamSize, 'Team size'], [`${leadProfile.monthlyRevenue} / month`, 'Revenue range']].forEach(([value, label], index) => {
    const x = 42 + index * 176;
    text(overview, label.toUpperCase(), x, 223, 7, 'F2', '0.48 0.52 0.58');
    text(overview, value, x, 203, 11, 'F2');
  });
  text(overview, 'CONSULTANT PRIORITY', 42, 158, 9, 'F2', '0.42 0.46 0.52');
  text(overview, 'Biggest opportunity', 42, 132, 17, 'F2', '0.04 0.07 0.12');
  wrapPdfText(tradePlan.biggestOpportunity, 76).forEach((value, index) => text(overview, value, 42, 108 - index * 14, 9));

  const scorecard = page();
  header(scorecard, 'Performance Scorecard');
  text(scorecard, 'Business performance by operating area', 42, 680, 23, 'F2', '0.04 0.07 0.12');
  text(scorecard, 'Scores are compared with the TradeBuilt contractor peer baseline.', 42, 654, 10);
  text(scorecard, 'YOUR SCORE', 380, 628, 7, 'F2', '0.42 0.46 0.52');
  text(scorecard, 'INDUSTRY AVG', 450, 628, 7, 'F2', '0.42 0.46 0.52');
  text(scorecard, 'DIFFERENCE', 530, 628, 7, 'F2', '0.42 0.46 0.52');
  results.categories.forEach(({ category, score }, index) => {
    const y = 602 - index * 61;
    const benchmark = industryBenchmarks[category];
    text(scorecard, category, 42, y + 18, 11, 'F2');
    text(scorecard, `${score}%`, 388, y + 18, 11, 'F2');
    text(scorecard, `${benchmark}%`, 466, y + 18, 11, 'F2');
    text(scorecard, `${score - benchmark >= 0 ? '+' : ''}${score - benchmark}`, 540, y + 18, 11, 'F2', score >= benchmark ? '0.10 0.55 0.42' : '0.78 0.45 0.08');
    scorecard.push(`0.91 0.92 0.94 rg 42 ${y} 528 9 re f`, `0.96 0.66 0.18 rg 42 ${y} ${Math.max(4, 5.28 * score)} 9 re f`);
    text(scorecard, `Performance vs Industry`, 42, y - 16, 8, 'F1', '0.42 0.46 0.52');
  });
  wrapPdfText(benchmarkMethodology, 94).forEach((value, index) => text(scorecard, value, 42, 76 - index * 12, 7, 'F1', '0.42 0.46 0.52'));

  const scoreInsights = page();
  header(scoreInsights, 'Consultant Score Analysis');
  text(scoreInsights, 'Why each score matters', 42, 680, 23, 'F2', '0.04 0.07 0.12');
  tradePlan.categoryInsights.forEach((insight, index) => {
    const y = 642 - index * 72;
    text(scoreInsights, `${insight.category.toUpperCase()}  |  ${insight.score}%`, 42, y, 9, 'F2', '0.78 0.45 0.08');
    wrapPdfText(`${insight.whyItMatters} ${insight.diagnosis}`, 92).slice(0, 3).forEach((value, lineIndex) => text(scoreInsights, value, 42, y - 18 - lineIndex * 12, 8));
  });

  const planSummary = page();
  header(planSummary, '30-Day TradeBuilt Action Plan');
  text(planSummary, 'Your 30-Day TradeBuilt Action Plan', 42, 680, 23, 'F2', '0.04 0.07 0.12');
  wrapPdfText(tradePlan.context, 88).forEach((value, index) => text(planSummary, value, 42, 650 - index * 14, 9));
  text(planSummary, 'YOUR BIGGEST BOTTLENECK', 42, 590, 9, 'F2', '0.78 0.45 0.08');
  wrapPdfText(tradePlan.bottleneck, 88).forEach((value, index) => text(planSummary, value, 42, 566 - index * 14, 9));
  text(planSummary, 'TOP 3 PRIORITIES', 42, 485, 9, 'F2', '0.78 0.45 0.08');
  tradePlan.priorities.forEach((priority, index) => wrapPdfText(`${index + 1}. ${priority}`, 84).forEach((value, lineIndex) => text(planSummary, value, 42, 460 - index * 55 - lineIndex * 13, 9)));
  text(planSummary, '3 QUICK WINS UNDER 30 MINUTES', 42, 280, 9, 'F2', '0.78 0.45 0.08');
  tradePlan.quickWins.forEach((win, index) => wrapPdfText(`${index + 1}. ${win}`, 84).forEach((value, lineIndex) => text(planSummary, value, 42, 255 - index * 55 - lineIndex * 13, 9)));

  [plan.slice(0, 2), plan.slice(2)].forEach((weeks, pageIndex) => {
    const actionPlan = page();
    header(actionPlan, '30-Day Action Plan');
    text(actionPlan, pageIndex === 0 ? 'Your personalized 30-day action plan' : 'Your personalized action plan, continued', 42, 680, 23, 'F2', '0.04 0.07 0.12');
    text(actionPlan, `Built from your lowest scores: ${results.opportunities.map(({ category, score }) => `${category} ${score}%`).join('  |  ')}`, 42, 654, 9);
    weeks.forEach((week, weekIndex) => {
      const top = 606 - weekIndex * 270;
      text(actionPlan, `WEEK ${week.week}`, 42, top, 9, 'F2', '0.78 0.45 0.08');
      text(actionPlan, week.title, 42, top - 27, 17, 'F2', '0.04 0.07 0.12');
      week.actions.forEach((step, index) => {
        const itemY = top - 70 - index * 57;
        text(actionPlan, `${index + 1}`, 42, itemY, 11, 'F2', '0.78 0.45 0.08');
        wrapPdfText(step, 76).forEach((value, lineIndex) => text(actionPlan, value, 70, itemY - lineIndex * 13, 9));
      });
      if (weekIndex === 0) line(actionPlan, 42, top - 238, 570, top - 238);
    });
  });

  const planOutcome = page();
  header(planOutcome, '30-Day Plan Outcome');
  text(planOutcome, 'Protect the business, then build momentum', 42, 680, 22, 'F2', '0.04 0.07 0.12');
  text(planOutcome, 'BIGGEST BUSINESS RISK IF NOTHING CHANGES', 42, 628, 9, 'F2', '0.78 0.45 0.08');
  wrapPdfText(tradePlan.risk, 86).forEach((value, index) => text(planOutcome, value, 42, 600 - index * 15, 10));
  line(planOutcome, 42, 492, 570, 492);
  text(planOutcome, 'ESTIMATED OUTCOME IF THIS PLAN IS COMPLETED', 42, 455, 9, 'F2', '0.10 0.55 0.42');
  wrapPdfText(tradePlan.estimatedOutcome, 86).forEach((value, index) => text(planOutcome, value, 42, 425 - index * 15, 10));
  text(planOutcome, 'FINAL CONSULTANT RECOMMENDATION', 42, 335, 9, 'F2', '0.78 0.45 0.08');
  wrapPdfText(tradePlan.finalRecommendation, 86).forEach((value, index) => text(planOutcome, value, 42, 307 - index * 15, 10));
  text(planOutcome, 'DAY-30 OWNER REVIEW', 42, 270, 9, 'F2', '0.42 0.46 0.52');
  ['Confirm each priority has one accountable owner.', 'Compare the three category scores and benchmark gaps with today’s baseline.', 'Keep the operating rhythm that worked; replace any step the field team did not use.'].forEach((item, index) => text(planOutcome, `${index + 1}. ${item}`, 42, 244 - index * 32, 9));

  const roadmap = page();
  const currentPhaseIndex = getGrowthPhaseIndex(results.overall);
  header(roadmap, 'Growth Roadmap');
  text(roadmap, 'Your Growth Roadmap', 42, 680, 25, 'F2', '0.04 0.07 0.12');
  text(roadmap, `CURRENT STAGE  |  PHASE ${currentPhaseIndex + 1} - ${growthPhases[currentPhaseIndex].name.toUpperCase()}`, 42, 647, 10, 'F2', '0.78 0.45 0.08');
  wrapPdfText('Build in sequence: strengthen the current stage before adding the complexity of the next.', 80).forEach((value, index) => text(roadmap, value, 42, 624 - index * 14, 10));
  growthPhases.forEach((phase, index) => {
    const top = 550 - index * 113;
    const isCurrent = index === currentPhaseIndex;
    roadmap.push(`${isCurrent ? '0.99 0.94 0.82' : '0.95 0.96 0.97'} rg 42 ${top - 66} 528 86 re f`);
    text(roadmap, `PHASE ${phase.number}`, 58, top, 8, 'F2', isCurrent ? '0.78 0.45 0.08' : '0.42 0.46 0.52');
    text(roadmap, phase.name, 58, top - 24, 16, 'F2', '0.04 0.07 0.12');
    text(roadmap, phase.focus.join('  |  '), 198, top - 22, 10, 'F1', '0.24 0.28 0.34');
    if (isCurrent) text(roadmap, 'YOUR CURRENT PHASE', 438, top, 7, 'F2', '0.78 0.45 0.08');
  });
  text(roadmap, 'NEXT STEP', 42, 80, 8, 'F2', '0.42 0.46 0.52');
  text(roadmap, 'Request a Strategy Session', 42, 55, 16, 'F2', '0.04 0.07 0.12');

  const dashboard = page();
  header(dashboard, 'TradeBuilt Growth Preview');
  dashboard.push('0.04 0.07 0.12 rg 28 62 556 642 re f');
  text(dashboard, 'PREVIEW OF TRADEBUILT GROWTH', 48, 670, 8, 'F2', '0.96 0.66 0.18');
  text(dashboard, 'Your TradeBuilt Dashboard', 48, 638, 23, 'F2', '1 1 1');
  text(dashboard, 'One place to monitor the numbers that actually grow your contracting business.', 48, 615, 9, 'F1', '0.67 0.72 0.80');
  dashboardMetrics.forEach((metric, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 48 + column * 260;
    const y = 555 - row * 94;
    dashboard.push(`0.08 0.12 0.19 rg ${x} ${y - 56} 244 76 re f`, `0.18 0.23 0.31 RG .5 w ${x} ${y - 56} 244 76 re S`);
    text(dashboard, metric.label.toUpperCase(), x + 14, y + 2, 7, 'F2', '0.55 0.61 0.70');
    text(dashboard, metric.value, x + 14, y - 26, 17, 'F2', '1 1 1');
    if (metric.trend) text(dashboard, metric.trend, x + 132, y - 24, 8, 'F2', metric.trendDirection === 'down' ? '0.96 0.66 0.18' : metric.trendDirection === 'neutral' ? '0.67 0.72 0.80' : '0.20 0.78 0.56');
  });
  text(dashboard, 'SAMPLE DATA  |  Your live dashboard updates as your business moves.', 48, 76, 8, 'F1', '0.55 0.61 0.70');

  const fontObjectIds = { regular: 3 + pages.length * 2, bold: 4 + pages.length * 2 };
  const pageObjectIds = pages.map((_, index) => 3 + index * 2);
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`,
  ];
  pages.forEach((commands, index) => {
    const pageId = pageObjectIds[index];
    const stream = commands.join('\n');
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObjectIds.regular} 0 R /F2 ${fontObjectIds.bold} 0 R >> >> /Contents ${pageId + 1} 0 R >>`);
    objects.push(`<< /Length ${stream.length} >> stream\n${stream}\nendstream`);
  });
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const filename = `${(leadProfile.company || 'contractor').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-health-check-report.pdf`;
  return { blob: new Blob([pdf], { type: 'application/pdf' }), filename };
};

const downloadPdfReport = (leadProfile: LeadProfile, results: ResultsData, band: ScoreBand, tradePlan: TradeActionPlan) => {
  const { blob, filename } = createPdfReport(leadProfile, results, band, tradePlan);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const blobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
  reader.onerror = () => reject(new Error('Unable to prepare the PDF report.'));
  reader.readAsDataURL(blob);
});

const calculateResults = (answers: Record<number, number>): ResultsData => {
  const answeredTotal = questions.reduce((sum, question) => sum + (answers[question.id] ?? 0), 0);
  const categoryScores = categories.map((category) => {
    const categoryQuestions = questions.filter((question) => question.category === category);
    const categoryTotal = categoryQuestions.reduce((sum, question) => sum + (answers[question.id] ?? 0), 0);

    return {
      category,
      score: Math.round((categoryTotal / (categoryQuestions.length * 5)) * 100),
      industryAverage: industryBenchmarks[category],
      difference: Math.round((categoryTotal / (categoryQuestions.length * 5)) * 100) - industryBenchmarks[category],
    };
  });

  const overall = Math.round((answeredTotal / (questions.length * 5)) * 100);
  const ranking = getBusinessRanking(overall);

  return {
    overall,
    industryAverage,
    ranking,
    rankingExplanation: getRankingExplanation(overall, categoryScores, ranking),
    categories: categoryScores,
    strengths: [...categoryScores].sort((a, b) => b.score - a.score).slice(0, 3),
    opportunities: [...categoryScores].sort((a, b) => a.score - b.score).slice(0, 3),
  };
};

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [leadProfile, setLeadProfile] = useState<LeadProfile>(emptyLeadProfile);
  const [strategySessionRequests, setStrategySessionRequests] = useState<StrategySessionRequest[]>([]);
  const [tradePlan, setTradePlan] = useState<TradeActionPlan | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [assessmentError, setAssessmentError] = useState('');

  const currentQuestion = questions[currentQuestionIndex];
  const results = useMemo(() => calculateResults(answers), [answers]);
  const progress = ((currentQuestionIndex + (answers[currentQuestion.id] ? 1 : 0)) / questions.length) * 100;

  const startAssessment = () => {
    setScreen('lead-capture');
  };

  const beginDiagnostic = (profile: LeadProfile) => {
    setLeadProfile(profile);
    setTradePlan(null);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setScreen('assessment');
  };

  const selectScore = async (score: number) => {
    if (isGeneratingInsights) return;
    setAssessmentError('');
    const completedAnswers = { ...answers, [currentQuestion.id]: score };
    setAnswers(completedAnswers);
    if (currentQuestionIndex === questions.length - 1) setIsGeneratingInsights(true);

    window.setTimeout(async () => {
      if (currentQuestionIndex === questions.length - 1) {
        try {
          setTradePlan(await generateConsultingInsights(leadProfile, calculateResults(completedAnswers), completedAnswers));
          setScreen('results');
        } catch (error) {
          setAssessmentError(error instanceof Error ? error.message : 'We couldn’t prepare your report. Please try again.');
        } finally {
          setIsGeneratingInsights(false);
        }
        return;
      }

      setCurrentQuestionIndex((index) => index + 1);
    }, 180);
  };

  const goBack = () => {
    if (currentQuestionIndex === 0) {
      setScreen('lead-capture');
      return;
    }

    setCurrentQuestionIndex((index) => index - 1);
  };

  if (screen === 'landing') {
    return <LandingPage onStart={startAssessment} />;
  }

  if (screen === 'lead-capture') {
    return <LeadCapturePage initialProfile={leadProfile} onBack={() => setScreen('landing')} onSubmit={beginDiagnostic} />;
  }

  if (screen === 'results' && tradePlan) {
    return (
      <ResultsPage
        leadProfile={leadProfile}
        results={results}
        tradePlan={tradePlan}
        strategySessionRequests={strategySessionRequests}
        onLeadUpdate={setLeadProfile}
        onRestart={startAssessment}
        onStrategyRequest={(request) => setStrategySessionRequests((requests) => [request, ...requests])}
      />
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <a className="skip-link" href="#assessment-question">Skip to question</a>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,.20),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,.18),transparent_35%)]" />
      <section className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-5 py-8 sm:px-6 md:py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300 md:mb-8">
          <button className="rounded-full border border-white/15 px-4 py-2 font-semibold transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10" onClick={goBack}>
            Back
          </button>
          <span className="rounded-full bg-white/5 px-4 py-2 font-medium ring-1 ring-white/10">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
        </div>

        <div className="mb-6 rounded-full border border-white/10 bg-slate-900/80 p-1 shadow-inner shadow-black/30 md:mb-8">
          <div aria-label="Assessment progress" aria-valuemax={100} aria-valuemin={0} aria-valuenow={Math.round(progress)} className="h-3 overflow-hidden rounded-full bg-white/10" role="progressbar">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-sky-400 shadow-[0_0_24px_rgba(251,191,36,.45)] transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <article className="surface-enter rounded-[1.75rem] border border-white/10 bg-white/[.075] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8 md:rounded-[2.25rem] md:p-12" id="assessment-question">
          <p className="mb-5 inline-flex rounded-full bg-amber-400/15 px-4 py-2 text-sm font-bold text-amber-200 ring-1 ring-amber-300/20">
            {currentQuestion.category}
          </p>
          <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-[-0.025em] md:text-5xl">{currentQuestion.prompt}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">Choose the answer that best reflects how the business operates today—not where you want it to be.</p>
          {assessmentError && <p aria-live="assertive" className="mt-6 rounded-xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-100" role="alert">{assessmentError} Your answers are saved; select an answer to retry.</p>}
          <div className="mt-8 grid gap-3 sm:grid-cols-2 md:mt-10 md:grid-cols-5">
            {scaleLabels.map((label, index) => (
              <button
                className="group rounded-2xl border border-white/10 bg-slate-900/75 p-5 text-left shadow-lg shadow-black/15 transition duration-200 hover:-translate-y-1 hover:border-amber-300/60 hover:bg-white/10 hover:shadow-amber-500/10 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-slate-950"
                key={label}
                onClick={() => selectScore(index + 1)}
                disabled={isGeneratingInsights}
                aria-pressed={answers[currentQuestion.id] === index + 1}
              >
                <span className="block text-3xl font-black text-white">{index + 1}</span>
                <span className="mt-3 block text-sm font-medium leading-5 text-slate-300 group-hover:text-white">{label}</span>
              </button>
            ))}
          </div>
          {isGeneratingInsights && <p aria-live="polite" className="mt-6 flex items-center gap-3 text-sm font-semibold text-slate-300"><span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-amber-200/25 border-t-amber-300" />Building your personalized report…</p>}
        </article>
      </section>
    </main>
  );
}

function LandingPage({ onStart }: { onStart: () => void }) {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <section className="relative isolate px-5 py-6 sm:px-6 md:px-10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_12%,rgba(251,191,36,.28),transparent_26%),radial-gradient(circle_at_88%_18%,rgba(56,189,248,.20),transparent_28%),linear-gradient(135deg,#020617,#111827_48%,#0f172a)]" />
        <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 rounded-full border border-white/10 bg-white/[.04] px-4 py-3 backdrop-blur md:px-5">
          <div className="text-lg font-black tracking-[0.02em] sm:text-xl">
            Trade<span className="text-amber-300">Built</span>
          </div>
          <span className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-slate-300 sm:text-sm">Contractor Business Health Assessment</span>
        </nav>

        <div className="mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl items-center gap-10 py-12 md:py-16 lg:grid-cols-[1.05fr_.95fr] lg:gap-14" id="main-content">
          <div className="max-w-4xl">
            <p className="mb-6 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-amber-200 ring-1 ring-white/15">
              Built for contractors ready to grow with control
            </p>
            <h1 className="max-w-5xl text-4xl font-black leading-[1.02] tracking-[-0.045em] sm:text-5xl md:text-7xl">
              Build a stronger, more profitable contracting business.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 md:mt-7 md:text-xl">
              See exactly where your business is strong, where profit and capacity are being lost, and what to improve over the next 30 days.
            </p>
            <div className="mt-8 grid gap-3 text-sm font-semibold text-slate-300 sm:grid-cols-3">
              {['25 focused questions', 'Contractor benchmarks', 'Personalized action plan'].map((item) => (
                <span className="rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3" key={item}>✓ {item}</span>
              ))}
            </div>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                className="group rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-8 py-4 text-lg font-black text-slate-950 shadow-[0_20px_60px_rgba(245,158,11,.35)] ring-1 ring-amber-200/60 transition duration-200 hover:-translate-y-1 hover:scale-[1.01] hover:from-amber-200 hover:to-orange-400 hover:shadow-[0_24px_70px_rgba(245,158,11,.48)] focus:outline-none focus:ring-4 focus:ring-amber-300/50"
                onClick={onStart}
              >
                Get My Business Health Score <span className="inline-block transition group-hover:translate-x-1">→</span>
              </button>
              <span className="text-sm font-medium text-slate-400">Free • Takes about 5 minutes • Instant report</span>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/10 pt-6 text-xs font-bold uppercase tracking-[0.12em] text-slate-400" aria-label="Assessment deliverables">
              <span><strong className="text-white">8</strong> operating areas</span>
              <span><strong className="text-white">30-day</strong> roadmap</span>
              <span><strong className="text-white">PDF</strong> report included</span>
            </div>
          </div>
          <ReportPreview />
        </div>
      </section>
    </main>
  );
}

function LeadCapturePage({ initialProfile, onBack, onSubmit }: { initialProfile: LeadProfile; onBack: () => void; onSubmit: (profile: LeadProfile) => void }) {
  const [profile, setProfile] = useState<LeadProfile>(initialProfile);

  const updateProfile = (field: keyof LeadProfile, value: string) => {
    setProfile((existingProfile) => ({ ...existingProfile, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(Object.fromEntries(Object.entries(profile).map(([key, value]) => [key, value.trim()])) as LeadProfile);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white sm:px-6 md:py-12">
      <a className="skip-link" href="#business-profile-form">Skip to form</a>
      <section className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[.85fr_1.15fr]">
        <div>
          <button className="mb-8 rounded-full border border-white/15 px-4 py-2 font-semibold text-slate-300 transition hover:bg-white/10" onClick={onBack}>← Back</button>
          <p className="mb-4 inline-flex rounded-full bg-sky-400/10 px-4 py-2 text-sm font-bold text-sky-200 ring-1 ring-sky-300/20">Your business profile</p>
          <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">Make this assessment specific to your business.</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">Tell us where the business stands today. We’ll tailor your scorecard and action plan to your trade, team, and current revenue stage.</p>
        </div>
        <form className="surface-enter rounded-[2rem] border border-white/10 bg-white/[.07] p-6 shadow-2xl shadow-black/30 backdrop-blur md:p-8" id="business-profile-form" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField autoComplete="name" label="Your name" required value={profile.name} onChange={(value) => updateProfile('name', value)} />
            <TextField autoComplete="organization" label="Company" required value={profile.company} onChange={(value) => updateProfile('company', value)} />
            <TextField autoComplete="email" label="Work email" required type="email" value={profile.email} onChange={(value) => updateProfile('email', value)} />
            <TextField autoComplete="tel" label="Phone (optional)" type="tel" value={profile.phone} onChange={(value) => updateProfile('phone', value)} />
            <SelectField label="Primary trade" options={tradeOptions} value={profile.trade} onChange={(value) => updateProfile('trade', value)} />
            <SelectField label="Team size" options={teamSizeOptions} value={profile.teamSize} onChange={(value) => updateProfile('teamSize', value)} />
            <SelectField label="Monthly revenue" options={monthlyRevenueOptions} value={profile.monthlyRevenue} onChange={(value) => updateProfile('monthlyRevenue', value)} />
          </div>
          <TextAreaField label="Your top business priority (optional)" placeholder="For example: improve margins, build a stronger team, or create more consistent sales" value={profile.message} onChange={(value) => updateProfile('message', value)} />
          <button className="mt-6 w-full rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-8 py-4 text-lg font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5" type="submit">
            Start My Assessment
          </button>
          <p className="mt-4 text-center text-xs leading-5 text-slate-400">Your information is used to prepare and deliver your TradeBuilt report.</p>
        </form>
      </section>
    </main>
  );
}

function ReportPreview() {
  return (
    <aside className="relative rounded-[2rem] border border-white/10 bg-white/[.08] p-4 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-6 md:rounded-[2.5rem]">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-sky-400/20 blur-2xl" />
      <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-5 sm:p-7 md:rounded-[2rem]">
        <div className="mb-8 flex items-center justify-between gap-4 text-sm">
          <span className="font-bold tracking-wide text-slate-300">TRADE<span className="text-amber-300">BUILT</span></span>
          <span className="rounded-full bg-amber-300/10 px-3 py-1 font-bold text-amber-300 ring-1 ring-amber-300/20">Business scorecard</span>
        </div>
        <div className="text-6xl font-black tracking-tight sm:text-7xl">
          82<span className="text-3xl text-slate-400">/100</span>
        </div>
        <div className="mt-6 grid gap-4">
          {categories.slice(0, 5).map((category, index) => {
            const score = 88 - index * 7;

            return <ScoreBar category={category} key={category} score={score} />;
          })}
        </div>
      </div>
    </aside>
  );
}

function ResultsPage({ leadProfile, results, tradePlan, onLeadUpdate, onRestart, onStrategyRequest }: { leadProfile: LeadProfile; results: ResultsData; tradePlan: TradeActionPlan; strategySessionRequests: StrategySessionRequest[]; onLeadUpdate: (profile: LeadProfile) => void; onRestart: () => void; onStrategyRequest: (request: StrategySessionRequest) => void }) {
  const band = getScoreBand(results.overall);
  const actionPlan = tradePlan.weeks;
  const benchmarkDelta = results.overall - results.industryAverage;
  const currentGrowthPhaseIndex = getGrowthPhaseIndex(results.overall);
  const strategyPriorityCategory = results.opportunities[0]?.category ?? 'Systems';
  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState(false);
  const [emailNotice, setEmailNotice] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [strategyRequestNotice, setStrategyRequestNotice] = useState('');

  const emailReport = async () => {
    if (isEmailSending) return;
    setIsEmailSending(true);
    setEmailStatus('sending');
    setEmailNotice('Preparing your report for secure delivery…');

    try {
      const { blob, filename } = createPdfReport(leadProfile, results, band, tradePlan);
      await sendReportEmail({
        completedAt: new Date().toISOString(),
        leadProfile,
        pdf: { base64: await blobToBase64(blob), filename },
        actionPlan,
        tradePlan,
        results: {
          ...results,
          opportunities: results.opportunities.map((opportunity) => ({
            ...opportunity,
            description: tradePlan.categoryInsights.find(({ category }) => category === opportunity.category)?.diagnosis ?? '',
          })),
        },
      });
      setEmailStatus('success');
      setEmailNotice("Your report has been sent successfully. We'll review your assessment and get back to you shortly.");
    } catch {
      setEmailStatus('error');
      setEmailNotice('We couldn’t send your report. Please check your connection and try again.');
    } finally {
      setIsEmailSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 pb-28 text-white sm:px-6 md:py-10 md:pb-10">
      <a className="skip-link" href="#report-summary">Skip to report</a>
      <section className="mx-auto max-w-6xl" id="report-summary">
        <div className="mb-8 grid gap-4 rounded-[1.75rem] border border-white/10 bg-white/[.05] p-5 text-sm text-slate-300 shadow-xl shadow-black/10 md:grid-cols-[1fr_auto] md:items-center md:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">Business profile</p>
            <p className="mt-2 text-base leading-7"><strong className="text-xl text-white">{leadProfile.company}</strong> <span className="text-slate-500">•</span> {leadProfile.name} <span className="text-slate-500">•</span> {leadProfile.trade}</p>
            <p className="leading-7">{leadProfile.teamSize} <span className="text-slate-500">•</span> {leadProfile.monthlyRevenue} monthly revenue</p>
            {leadProfile.message && <p className="mt-2 max-w-3xl leading-6 text-slate-400"><span className="font-semibold text-slate-300">Current priority:</span> {leadProfile.message}</p>}
          </div>
          <span className="justify-self-start rounded-full bg-emerald-400/10 px-4 py-2 font-bold text-emerald-200 ring-1 ring-emerald-300/20 md:justify-self-end">Assessment complete</span>
        </div>
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[.07] p-6 shadow-2xl shadow-black/30 backdrop-blur md:rounded-[2rem] md:p-12">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-200">TradeBuilt Business Health Report</p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[.78fr_1.22fr]">
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-6">
              <div className="text-7xl font-black tracking-tight sm:text-8xl">
                {results.overall}<span className="text-3xl text-slate-400">/100</span>
              </div>
              <h1 className="mt-4 text-3xl font-black md:text-4xl">{band.label}</h1>
              <p className="mt-3 leading-7 text-slate-300">{tradePlan.executiveSummary}</p>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[.06] p-4">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-200">Overall Business Ranking</p>
                <p className="mt-2 text-3xl font-black text-white">{results.ranking}</p>
                <p className="mt-3 text-sm leading-6 text-slate-300">{results.rankingExplanation}</p>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <button className="rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-6 py-4 font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5" onClick={() => downloadPdfReport(leadProfile, results, band, tradePlan)}>
                  Download PDF Report
                </button>
                <button aria-busy={isEmailSending} className="flex items-center justify-center gap-2 rounded-full border border-sky-300/40 bg-sky-400/10 px-6 py-4 font-black text-sky-100 transition hover:-translate-y-0.5 hover:bg-sky-400/20 disabled:cursor-wait disabled:opacity-60" disabled={isEmailSending} onClick={emailReport}>
                  {isEmailSending && <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-sky-100/30 border-t-sky-100" />}
                  {isEmailSending ? 'Sending Report…' : 'Email My Report'}
                </button>
                <button className="rounded-full bg-white px-6 py-4 font-black text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-100 sm:col-span-2" onClick={() => { setEmailNotice(''); setStrategyRequestNotice(''); setIsStrategyModalOpen(true); }}>
                  Discuss My Results
                </button>
                <button className="py-2 text-sm font-bold text-slate-400 underline decoration-white/20 underline-offset-4 transition hover:text-white sm:col-span-2" onClick={onRestart}>
                  Retake Assessment
                </button>
              </div>
              {emailNotice && (
                <div className={`mt-4 rounded-2xl border p-4 text-sm font-semibold ${emailStatus === 'success' ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100' : emailStatus === 'error' ? 'border-rose-300/30 bg-rose-400/10 text-rose-100' : 'border-sky-300/20 bg-sky-400/10 text-sky-100'}`} role={emailStatus === 'error' ? 'alert' : 'status'}>
                  <p>{emailNotice}</p>
                  {emailStatus === 'error' && <button className="mt-3 rounded-full bg-white px-5 py-2 font-black text-slate-950 transition hover:bg-slate-100" onClick={emailReport}>Retry</button>}
                </div>
              )}
            </div>

            <div>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">Consulting benchmark</p>
                  <h2 className="mt-1 text-2xl font-black">Performance vs Industry</h2>
                </div>
                <span className={`rounded-full px-3 py-1.5 text-sm font-black ring-1 ${benchmarkDelta >= 0 ? 'bg-emerald-400/10 text-emerald-200 ring-emerald-300/20' : 'bg-amber-400/10 text-amber-200 ring-amber-300/20'}`}>{benchmarkDelta >= 0 ? '+' : ''}{benchmarkDelta} overall</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {results.categories.map(({ category, score }) => (
                  <BenchmarkBar category={category} key={category} score={score} />
                ))}
              </div>
              <details className="mt-4 rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-xs leading-5 text-slate-400">
                <summary className="font-bold text-slate-300">How your score and benchmark are calculated</summary>
                <p className="mt-2">Each answer is scored from 1–5, then converted to a percentage within its operating category. Your overall score weights all 25 questions equally. {benchmarkMethodology}</p>
              </details>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <InsightCard title="Top 3 Strengths" items={results.strengths.map((item) => tradePlan.categoryInsights.find(({ category }) => category === item.category)?.diagnosis ?? `${item.category}: ${item.score}%`)} />
          <InsightCard title="Top 3 Opportunities" items={[tradePlan.biggestOpportunity, ...tradePlan.priorities.slice(0, 2)]} />
          <InsightCard title="Primary Constraint" items={[tradePlan.bottleneck]} />
        </div>

        <section className="relative mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[.065] p-6 shadow-2xl shadow-black/25 md:p-10">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-200">Personalized consulting roadmap</p>
            <div className="mt-3 max-w-3xl">
              <h2 className="text-3xl font-black tracking-tight md:text-5xl">Your 30-Day TradeBuilt Action Plan</h2>
              <p className="mt-3 leading-7 text-slate-300">{tradePlan.context}</p>
            </div>
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              <InsightCard title="Your biggest bottleneck" items={[tradePlan.bottleneck]} />
              <InsightCard title="Your biggest opportunity" items={[tradePlan.biggestOpportunity]} />
            </div>
            <div className="mt-5"><InsightCard title="Why each score matters" items={tradePlan.categoryInsights.map((insight) => `${insight.category} (${insight.score}%): ${insight.whyItMatters} ${insight.diagnosis}`)} /></div>
            <div className="mt-5"><InsightCard title="Top 3 priorities" items={tradePlan.priorities} /></div>
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {actionPlan.map((week) => (
                <article className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-6 shadow-xl shadow-black/15" key={week.week}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">Week {week.week}</p>
                      <h3 className="mt-2 text-xl font-black text-white">{week.title}</h3>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[.06] px-3 py-1 text-xs font-bold text-slate-300">{week.focusCategories.join(' + ')}</span>
                  </div>
                  <ol className="mt-5 space-y-4">
                    {week.actions.map((action, index) => (
                      <li className="flex gap-3 leading-6 text-slate-300" key={action}>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-300/15 text-xs font-black text-amber-200 ring-1 ring-amber-300/20">{index + 1}</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              <InsightCard title="3 quick wins under 30 minutes" items={tradePlan.quickWins} />
              <InsightCard title="Biggest business risk if nothing changes" items={[tradePlan.risk]} />
              <InsightCard title="Estimated outcome after 30 days" items={[tradePlan.estimatedOutcome]} />
            </div>
          </div>
        </section>

        <section className="relative mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,.98),rgba(30,41,59,.76))] p-6 shadow-2xl shadow-black/30 md:p-10">
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-200">Built in the right sequence</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Your Growth Roadmap</h2>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">Every enduring contracting business moves through the same essential stages. Your assessment places you in <strong className="text-white">Phase {currentGrowthPhaseIndex + 1} — {growthPhases[currentGrowthPhaseIndex].name}</strong>.</p>

            <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {growthPhases.map((phase, index) => {
                const isCurrent = index === currentGrowthPhaseIndex;
                const isComplete = index < currentGrowthPhaseIndex;
                return (
                  <article className={`relative flex min-h-64 flex-col rounded-[1.5rem] border p-6 transition ${isCurrent ? 'border-amber-300/60 bg-amber-300/[.11] shadow-[0_18px_60px_rgba(245,158,11,.15)]' : 'border-white/10 bg-slate-950/55'}`} key={phase.number}>
                    {isCurrent && <span className="absolute right-4 top-4 rounded-full bg-amber-300 px-3 py-1 text-[.65rem] font-black uppercase tracking-wider text-slate-950">Your phase</span>}
                    <p className={`text-xs font-black uppercase tracking-[0.18em] ${isCurrent ? 'text-amber-200' : 'text-slate-500'}`}>Phase {phase.number}</p>
                    <h3 className="mt-3 text-2xl font-black text-white">{phase.name}</h3>
                    <ul className="mt-6 space-y-3">
                      {phase.focus.map((item) => <li className="flex items-center gap-3 text-sm font-semibold text-slate-300" key={item}><span className={`h-1.5 w-1.5 rounded-full ${isCurrent ? 'bg-amber-300' : 'bg-slate-600'}`} />{item}</li>)}
                    </ul>
                    {isComplete && <p className="mt-auto pt-5 text-xs font-bold uppercase tracking-wider text-emerald-300">Foundation established</p>}
                  </article>
                );
              })}
            </div>

            <DashboardPreview
              onStrategyRequest={() => { setEmailNotice(''); setStrategyRequestNotice(''); setIsStrategyModalOpen(true); }}
            />

            <div className="mt-14 border-t border-white/10 pt-10">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-sky-200">Strategic support, built for contractors</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">TradeBuilt Services</h2>
              <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                {tradeBuiltServices.map((service, index) => (
                  <article className={`rounded-[1.35rem] border border-white/10 bg-white/[.045] p-6 ${index < 2 ? 'lg:col-span-3' : 'lg:col-span-2'}`} key={service.name}>
                    <p className="text-xs font-black tracking-[0.16em] text-amber-300">0{index + 1}</p>
                    <h3 className="mt-3 text-xl font-black text-white">{service.name}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-400">{service.description}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-10 rounded-[1.5rem] border border-amber-300/25 bg-amber-300/[.08] p-6 text-center md:p-9">
              <p className="mx-auto max-w-2xl text-lg leading-8 text-slate-200">Ready to turn your current phase into a focused, executable plan?</p>
              <button className="mt-5 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-9 py-4 text-center text-lg font-black text-slate-950 shadow-[0_18px_50px_rgba(245,158,11,.25)] transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-amber-300/30" onClick={() => { setEmailNotice(''); setStrategyRequestNotice(''); setIsStrategyModalOpen(true); }}>Request a Strategy Session</button>
            </div>
          </div>
          {strategyRequestNotice && (
            <div className="mt-5 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-100" role="status">
              <p>{strategyRequestNotice}</p>
              <p className="mt-2 text-xs font-medium text-emerald-100/75">A TradeBuilt advisor will follow up using the contact details provided.</p>
            </div>
          )}
        </section>
        {isStrategyModalOpen && <StrategySessionModal
          initialProfile={leadProfile}
          onCancel={() => setIsStrategyModalOpen(false)}
          onSubmit={async (request) => {
            await sendStrategySessionRequest({ ...request, assessmentScore: results.overall, priorityArea: strategyPriorityCategory });
            onLeadUpdate({ ...leadProfile, ...request });
            onStrategyRequest({ ...request, submittedAt: new Date().toISOString() });
            setIsStrategyModalOpen(false);
            setEmailNotice('');
            setStrategyRequestNotice(`Thank you, ${request.name}. Your strategy session request has been received.`);
          }}
        />}
      </section>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/90 p-3 backdrop-blur-xl md:hidden">
        <button className="w-full rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-6 py-3.5 font-black text-slate-950 shadow-[0_12px_32px_rgba(245,158,11,.25)]" onClick={() => { setEmailNotice(''); setStrategyRequestNotice(''); setIsStrategyModalOpen(true); }}>Discuss My Results</button>
      </div>
    </main>
  );
}

function TextField({ autoComplete, label, onChange, required = false, type = 'text', value }: { autoComplete?: string; label: string; onChange: (value: string) => void; required?: boolean; type?: string; value: string }) {
  const id = useId();
  return (
    <div className="block text-sm font-bold text-slate-200">
      <label htmlFor={id}>{label}</label>
      <input autoComplete={autoComplete} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-base text-white outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20" id={id} maxLength={type === 'email' ? 254 : 120} onChange={(event) => onChange(event.target.value)} required={required} type={type} value={value} />
    </div>
  );
}


function TextAreaField({ label, onChange, placeholder, required = false, value }: { label: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; value: string }) {
  const id = useId();
  return (
    <div className="mt-4 block text-sm font-bold text-slate-200">
      <label htmlFor={id}>{label}</label>
      <textarea className="mt-2 min-h-32 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20" id={id} maxLength={1000} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} value={value} />
    </div>
  );
}

function StrategySessionModal({ initialProfile, onCancel, onSubmit }: { initialProfile: LeadProfile; onCancel: () => void; onSubmit: (request: StrategySessionRequest) => Promise<void> }) {
  const [profile, setProfile] = useState<LeadProfile>(initialProfile);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    modalRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !isSubmitting) onCancel(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      previousFocus?.focus();
    };
  }, [isSubmitting, onCancel]);
  const updateProfile = (field: keyof LeadProfile, value: string) => setProfile((existingProfile) => ({ ...existingProfile, [field]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      await onSubmit(profile);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'We couldn’t send your request. Please check your details and try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div aria-labelledby="strategy-session-title" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 py-4 backdrop-blur-sm sm:px-5 sm:py-6" role="dialog">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[1.5rem] border border-white/15 bg-slate-950 p-5 text-white shadow-2xl shadow-black/50 sm:rounded-[2rem] md:p-8" ref={modalRef} tabIndex={-1}>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-200">TradeBuilt advisory</p>
            <h3 className="mt-2 text-3xl font-black text-white" id="strategy-session-title">Request a Strategy Session</h3>
            <p className="mt-2 leading-6 text-slate-300">Share the best contact details and the outcome you want most. A TradeBuilt advisor will review your scorecard before following up.</p>
          </div>
          <button aria-label="Cancel strategy session request" className="rounded-full border border-white/15 px-4 py-2 font-bold text-slate-200 transition hover:bg-white/10" onClick={onCancel} type="button">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField autoComplete="name" label="Name *" required value={profile.name} onChange={(value) => updateProfile('name', value)} />
            <TextField autoComplete="organization" label="Company *" required value={profile.company} onChange={(value) => updateProfile('company', value)} />
            <TextField autoComplete="email" label="Email *" required type="email" value={profile.email} onChange={(value) => updateProfile('email', value)} />
            <TextField autoComplete="tel" label="Phone (optional)" type="tel" value={profile.phone} onChange={(value) => updateProfile('phone', value)} />
          </div>
          <TextAreaField label="What would make this session valuable?" placeholder="Tell us about the growth challenge or opportunity you want to solve first" value={profile.message} onChange={(value) => updateProfile('message', value)} />
          {submitError && <p className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm font-semibold text-rose-100" role="alert">{submitError}</p>}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="rounded-full border border-white/15 px-7 py-4 font-black text-slate-200 transition hover:-translate-y-0.5 hover:bg-white/10" onClick={onCancel} type="button">
              Cancel
            </button>
            <button className="rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-7 py-4 font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Sending Request…' : 'Request My Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SelectField({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: string[]; value: string }) {
  return (
    <label className="block text-sm font-bold text-slate-200">
      {label}
      <select className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-amber-300" onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function MetricSparkline({ points }: { points: number[] }) {
  const gradientId = useId();
  const coordinates = points.map((point, index) => `${(index / (points.length - 1)) * 100},${42 - (point / 100) * 36}`).join(' ');

  return (
    <svg aria-hidden="true" className="h-11 w-24 overflow-visible" viewBox="0 0 100 42">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity=".24" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill={`url(#${gradientId})`} points={`0,42 ${coordinates} 100,42`} />
      <polyline fill="none" points={coordinates} stroke="#fbbf24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function DashboardPreview({ onStrategyRequest }: { onStrategyRequest: () => void }) {
  return (
    <section className="relative mt-14 border-t border-white/10 pt-10" aria-labelledby="dashboard-preview-title">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-200">Preview of TradeBuilt Growth</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl" id="dashboard-preview-title">Your TradeBuilt Dashboard</h2>
          <p className="mt-4 text-lg leading-8 text-slate-300">One place to monitor the numbers that actually grow your contracting business.</p>
        </div>
        <span className="w-fit rounded-full border border-white/10 bg-white/[.05] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Sample data</span>
      </div>

      <div className="mt-8 overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/80 shadow-[0_28px_80px_rgba(0,0,0,.32)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-white/[.035] px-5 py-4 md:px-7">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-300 font-black text-slate-950">T</span>
            <div><p className="text-sm font-black">Business Overview</p><p className="text-xs text-slate-500">Updated just now</p></div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.7)]" />Live metrics preview</div>
        </div>
        <div className="grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-5">
          {dashboardMetrics.map((metric) => (
            <article className="min-h-44 bg-slate-950 p-5" key={metric.label}>
              <p className="min-h-10 text-xs font-bold uppercase leading-5 tracking-[0.12em] text-slate-500">{metric.label}</p>
              <div className="mt-3 flex items-end justify-between gap-2">
                <p className="text-2xl font-black tracking-tight text-white">{metric.value}</p>
                {metric.chart && <MetricSparkline points={metric.chart} />}
              </div>
              {metric.trend && <p className={`mt-4 text-xs font-bold ${metric.trendDirection === 'down' ? 'text-amber-300' : metric.trendDirection === 'neutral' ? 'text-slate-400' : 'text-emerald-300'}`}>{metric.trend}</p>}
            </article>
          ))}
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <a className="rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-8 py-4 text-center font-black text-slate-950 shadow-[0_16px_44px_rgba(245,158,11,.24)] transition hover:-translate-y-0.5" href="mailto:daniel@tradebuilt.pro?subject=Join%20TradeBuilt%20Growth">Join TradeBuilt Growth</a>
        <button className="rounded-full border border-white/15 bg-white/[.04] px-8 py-4 font-black text-white transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[.08]" onClick={onStrategyRequest}>Request Strategy Session</button>
      </div>
    </section>
  );
}

function BenchmarkBar({ category, score }: { category: Category; score: number }) {
  const benchmark = industryBenchmarks[category];
  const difference = score - benchmark;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-lg shadow-black/10">
      <div className="mb-3 flex items-center justify-between gap-3 text-sm">
        <span className="font-bold text-slate-100">{category}</span>
        <span className={`rounded-full px-2.5 py-1 font-black ${difference >= 0 ? 'bg-emerald-400/10 text-emerald-200' : 'bg-amber-400/10 text-amber-200'}`}>{difference >= 0 ? '+' : ''}{difference}</span>
      </div>
      <div aria-label={`${category} score: ${score} percent; industry average: ${benchmark} percent`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={score} className="h-2.5 overflow-hidden rounded-full bg-white/10" role="progressbar">
        <div className={`h-full rounded-full bg-gradient-to-r ${categoryGradients[category]}`} style={{ width: `${score}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] uppercase tracking-wide text-slate-500">
        <span>Your Score<strong className="mt-1 block text-sm text-white">{score}%</strong></span>
        <span>Industry Average<strong className="mt-1 block text-sm text-slate-300">{benchmark}%</strong></span>
        <span>Difference<strong className={`mt-1 block text-sm ${difference >= 0 ? 'text-emerald-300' : 'text-amber-300'}`}>{difference >= 0 ? '+' : ''}{difference}</strong></span>
      </div>
    </div>
  );
}

function ScoreBar({ category, score }: { category: Category; score: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-lg shadow-black/10">
      <div className="mb-3 flex items-center justify-between gap-3 text-sm">
        <span className="font-bold text-slate-100">{category}</span>
        <span className="rounded-full bg-white/10 px-2.5 py-1 font-black text-white">{score}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full bg-gradient-to-r ${categoryGradients[category]}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function InsightCard({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-white/[.06] p-6 shadow-xl shadow-black/10">
      <h2 className="mb-4 text-xl font-black">{title}</h2>
      <ul className="space-y-3 text-slate-300">
        {items.map((item) => (
          <li className="flex gap-3 leading-6" key={item}>
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-300" />
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}
