import { FormEvent, useMemo, useState } from 'react';
import {
  categories,
  categoryActionItems,
  categoryGradients,
  categoryRevenueLeaks,
  benchmarkMethodology,
  industryBenchmarks,
  monthlyRevenueOptions,
  questions,
  scaleLabels,
  teamSizeOptions,
  tradeOptions,
} from './data';
import type { ActionPlanWeek, BusinessRanking, Category, LeadProfile, ResultsData, StrategySessionRequest } from './types';

type Screen = 'landing' | 'lead-capture' | 'assessment' | 'results';

type ScoreBand = {
  label: string;
  description: string;
};


type EmailReportPayload = {
  leadProfile: LeadProfile;
  results: ResultsData;
  actionPlan: ActionPlanWeek[];
  completedAt: string;
  pdf: {
    base64: string;
    filename: string;
  };
};

const createActionPlan = (results: ResultsData): ActionPlanWeek[] => {
  const weakest = results.opportunities.map(({ category }) => category);
  const [primary = 'Systems', secondary = primary, tertiary = secondary] = weakest;

  return [
    { week: 1, title: `Diagnose and control ${primary}`, focusCategories: [primary], actions: categoryActionItems[primary].slice(0, 3) },
    { week: 2, title: `Build the ${secondary} foundation`, focusCategories: [secondary], actions: categoryActionItems[secondary].slice(0, 3) },
    { week: 3, title: `Strengthen ${tertiary}`, focusCategories: [tertiary], actions: categoryActionItems[tertiary].slice(0, 3) },
    {
      week: 4,
      title: 'Lock in accountability and momentum',
      focusCategories: [primary, secondary, tertiary],
      actions: [categoryActionItems[primary][3], categoryActionItems[secondary][3], categoryActionItems[tertiary][3]],
    },
  ];
};

type StrategySessionPayload = StrategySessionRequest & {
  assessmentScore: number;
  priorityArea: Category;
};

const sendReportEmail = async (payload: EmailReportPayload) => {
  const response = await fetch('/api/email-report', {
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) throw new Error((await response.json().catch(() => null))?.message ?? 'Unable to send report email.');
};

const sendStrategySessionRequest = async (payload: StrategySessionPayload) => {
  const response = await fetch('/api/strategy-session', {
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) throw new Error((await response.json().catch(() => null))?.message ?? 'Unable to send your request.');
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

const createPdfReport = (leadProfile: LeadProfile, results: ResultsData, band: ScoreBand) => {
  const priorityCategory = results.opportunities[0]?.category ?? 'Systems';
  const reportDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date());
  const plan = createActionPlan(results);
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
  wrapPdfText(band.description, 62).forEach((value, index) => text(overview, value, 42, 364 - index * 16, 11));
  text(overview, `OVERALL BUSINESS RANKING  |  ${results.ranking}`, 42, 320, 10, 'F2', '0.10 0.55 0.42');
  wrapPdfText(results.rankingExplanation, 76).forEach((value, index) => text(overview, value, 42, 302 - index * 13, 8));
  text(overview, 'BUSINESS PROFILE', 42, 248, 9, 'F2', '0.42 0.46 0.52');
  [[leadProfile.trade, 'Primary trade'], [leadProfile.teamSize, 'Team size'], [`${leadProfile.monthlyRevenue} / month`, 'Revenue range']].forEach(([value, label], index) => {
    const x = 42 + index * 176;
    text(overview, label.toUpperCase(), x, 223, 7, 'F2', '0.48 0.52 0.58');
    text(overview, value, x, 203, 11, 'F2');
  });
  text(overview, 'CONSULTANT PRIORITY', 42, 158, 9, 'F2', '0.42 0.46 0.52');
  text(overview, `Strengthen ${priorityCategory} first.`, 42, 132, 17, 'F2', '0.04 0.07 0.12');
  wrapPdfText(categoryRevenueLeaks[priorityCategory], 76).forEach((value, index) => text(overview, value, 42, 108 - index * 14, 9));

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

const downloadPdfReport = (leadProfile: LeadProfile, results: ResultsData, band: ScoreBand) => {
  const { blob, filename } = createPdfReport(leadProfile, results, band);
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

  const currentQuestion = questions[currentQuestionIndex];
  const results = useMemo(() => calculateResults(answers), [answers]);
  const progress = ((currentQuestionIndex + (answers[currentQuestion.id] ? 1 : 0)) / questions.length) * 100;

  const startAssessment = () => {
    setScreen('lead-capture');
  };

  const beginDiagnostic = (profile: LeadProfile) => {
    setLeadProfile(profile);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setScreen('assessment');
  };

  const selectScore = (score: number) => {
    setAnswers((existingAnswers) => ({ ...existingAnswers, [currentQuestion.id]: score }));

    window.setTimeout(() => {
      if (currentQuestionIndex === questions.length - 1) {
        setScreen('results');
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

  if (screen === 'results') {
    return (
      <ResultsPage
        leadProfile={leadProfile}
        results={results}
        strategySessionRequests={strategySessionRequests}
        onLeadUpdate={setLeadProfile}
        onRestart={startAssessment}
        onStrategyRequest={(request) => setStrategySessionRequests((requests) => [request, ...requests])}
      />
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
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

        <article className="rounded-[1.75rem] border border-white/10 bg-white/[.075] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8 md:rounded-[2.25rem] md:p-12">
          <p className="mb-5 inline-flex rounded-full bg-amber-400/15 px-4 py-2 text-sm font-bold text-amber-200 ring-1 ring-amber-300/20">
            {currentQuestion.category}
          </p>
          <h1 className="text-3xl font-black leading-tight tracking-tight md:text-5xl">{currentQuestion.prompt}</h1>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 md:mt-10 md:grid-cols-5">
            {scaleLabels.map((label, index) => (
              <button
                className="group rounded-2xl border border-white/10 bg-slate-900/75 p-5 text-left shadow-lg shadow-black/15 transition duration-200 hover:-translate-y-1 hover:border-amber-300/60 hover:bg-white/10 hover:shadow-amber-500/10 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-slate-950"
                key={label}
                onClick={() => selectScore(index + 1)}
              >
                <span className="block text-3xl font-black text-white">{index + 1}</span>
                <span className="mt-3 block text-sm font-medium leading-5 text-slate-300 group-hover:text-white">{label}</span>
              </button>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function LandingPage({ onStart }: { onStart: () => void }) {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <section className="relative isolate px-5 py-6 sm:px-6 md:px-10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_12%,rgba(251,191,36,.28),transparent_26%),radial-gradient(circle_at_88%_18%,rgba(56,189,248,.20),transparent_28%),linear-gradient(135deg,#020617,#111827_48%,#0f172a)]" />
        <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 rounded-full border border-white/10 bg-white/[.04] px-4 py-3 backdrop-blur md:px-5">
          <div className="text-lg font-black tracking-[0.02em] sm:text-xl">
            Trade<span className="text-amber-300">Built</span>
          </div>
          <span className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-slate-300 sm:text-sm">Contractor Business Health Assessment</span>
        </nav>

        <div className="mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl items-center gap-10 py-12 md:py-16 lg:grid-cols-[1.05fr_.95fr] lg:gap-14">
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
    onSubmit(profile);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white sm:px-6 md:py-12">
      <section className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[.85fr_1.15fr]">
        <div>
          <button className="mb-8 rounded-full border border-white/15 px-4 py-2 font-semibold text-slate-300 transition hover:bg-white/10" onClick={onBack}>← Back</button>
          <p className="mb-4 inline-flex rounded-full bg-sky-400/10 px-4 py-2 text-sm font-bold text-sky-200 ring-1 ring-sky-300/20">Your business profile</p>
          <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">Make this assessment specific to your business.</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">Tell us where the business stands today. We’ll tailor your scorecard and action plan to your trade, team, and current revenue stage.</p>
        </div>
        <form className="rounded-[2rem] border border-white/10 bg-white/[.07] p-6 shadow-2xl shadow-black/30 backdrop-blur md:p-8" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Your name" required value={profile.name} onChange={(value) => updateProfile('name', value)} />
            <TextField label="Company" required value={profile.company} onChange={(value) => updateProfile('company', value)} />
            <TextField label="Work email" required type="email" value={profile.email} onChange={(value) => updateProfile('email', value)} />
            <TextField label="Phone (optional)" type="tel" value={profile.phone} onChange={(value) => updateProfile('phone', value)} />
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

function ResultsPage({ leadProfile, results, onLeadUpdate, onRestart, onStrategyRequest }: { leadProfile: LeadProfile; results: ResultsData; strategySessionRequests: StrategySessionRequest[]; onLeadUpdate: (profile: LeadProfile) => void; onRestart: () => void; onStrategyRequest: (request: StrategySessionRequest) => void }) {
  const band = getScoreBand(results.overall);
  const nextCategory = results.opportunities[0]?.category ?? 'Systems';
  const actionPlan = createActionPlan(results);
  const benchmarkDelta = results.overall - results.industryAverage;
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
      const { blob, filename } = createPdfReport(leadProfile, results, band);
      await sendReportEmail({
        completedAt: new Date().toISOString(),
        leadProfile,
        pdf: { base64: await blobToBase64(blob), filename },
        actionPlan,
        results: {
          ...results,
          opportunities: results.opportunities.map((opportunity) => ({
            ...opportunity,
            description: categoryRevenueLeaks[opportunity.category],
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
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white sm:px-6 md:py-10">
      <section className="mx-auto max-w-6xl">
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
              <p className="mt-3 leading-7 text-slate-300">{band.description}</p>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[.06] p-4">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-200">Overall Business Ranking</p>
                <p className="mt-2 text-3xl font-black text-white">{results.ranking}</p>
                <p className="mt-3 text-sm leading-6 text-slate-300">{results.rankingExplanation}</p>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <button className="rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-6 py-4 font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5" onClick={() => downloadPdfReport(leadProfile, results, band)}>
                  Download PDF Report
                </button>
                <button aria-busy={isEmailSending} className="flex items-center justify-center gap-2 rounded-full border border-sky-300/40 bg-sky-400/10 px-6 py-4 font-black text-sky-100 transition hover:-translate-y-0.5 hover:bg-sky-400/20 disabled:cursor-wait disabled:opacity-60" disabled={isEmailSending} onClick={emailReport}>
                  {isEmailSending && <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-sky-100/30 border-t-sky-100" />}
                  {isEmailSending ? 'Sending Report…' : 'Email My Report'}
                </button>
                <button className="rounded-full border border-white/15 px-6 py-4 font-bold text-slate-200 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10 sm:col-span-2" onClick={onRestart}>
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
              <p className="mt-4 text-xs leading-5 text-slate-500">{benchmarkMethodology}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <InsightCard title="Top 3 Strengths" items={results.strengths.map((item) => `${item.category}: ${item.score}%`)} />
          <InsightCard title="Top 3 Opportunities" items={results.opportunities.map((item) => `${item.category}: ${categoryRevenueLeaks[item.category]}`)} />
          <InsightCard title="Primary Constraint" items={[`${nextCategory} scored ${results.opportunities[0]?.score ?? 0}%.`, categoryRevenueLeaks[nextCategory]]} />
        </div>

        <section className="relative mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[.065] p-6 shadow-2xl shadow-black/25 md:p-10">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-200">Personalized consulting roadmap</p>
            <div className="mt-3 max-w-3xl">
              <h2 className="text-3xl font-black tracking-tight md:text-5xl">Your 30-Day Action Plan</h2>
              <p className="mt-3 leading-7 text-slate-300">Prioritized around your three lowest scores: {results.opportunities.map(({ category, score }) => `${category} (${score}%)`).join(', ')}.</p>
            </div>
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
          </div>
        </section>

        <section className="mt-8 rounded-[1.5rem] border border-amber-300/20 bg-amber-300/10 p-6 shadow-xl shadow-amber-900/10 md:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-200">Your next stage of growth</p>
          <div className="mt-3 grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-3xl font-black">Turn this scorecard into a 90-day growth plan.</h2>
              <p className="mt-2 max-w-3xl leading-7 text-slate-200">Meet with a TradeBuilt growth advisor to identify the highest-leverage moves for stronger margins, a more dependable pipeline, and a business that runs with less owner dependency.</p>
            </div>
            <button className="rounded-full bg-white px-7 py-4 text-center font-black text-slate-950 transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-white/30" onClick={() => { setEmailNotice(''); setStrategyRequestNotice(''); setIsStrategyModalOpen(true); }}>Request My Strategy Session</button>
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
            await sendStrategySessionRequest({ ...request, assessmentScore: results.overall, priorityArea: nextCategory });
            onLeadUpdate({ ...leadProfile, ...request });
            onStrategyRequest({ ...request, submittedAt: new Date().toISOString() });
            setIsStrategyModalOpen(false);
            setEmailNotice('');
            setStrategyRequestNotice(`Thank you, ${request.name}. Your strategy session request has been received.`);
          }}
        />}
      </section>
    </main>
  );
}

function TextField({ label, onChange, required = false, type = 'text', value }: { label: string; onChange: (value: string) => void; required?: boolean; type?: string; value: string }) {
  return (
    <label className="block text-sm font-bold text-slate-200">
      {label}
      <input className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-amber-300" onChange={(event) => onChange(event.target.value)} required={required} type={type} value={value} />
    </label>
  );
}


function TextAreaField({ label, onChange, placeholder, required = false, value }: { label: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; value: string }) {
  return (
    <label className="mt-4 block text-sm font-bold text-slate-200">
      {label}
      <textarea className="mt-2 min-h-32 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} value={value} />
    </label>
  );
}

function StrategySessionModal({ initialProfile, onCancel, onSubmit }: { initialProfile: LeadProfile; onCancel: () => void; onSubmit: (request: StrategySessionRequest) => Promise<void> }) {
  const [profile, setProfile] = useState<LeadProfile>(initialProfile);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const updateProfile = (field: keyof LeadProfile, value: string) => setProfile((existingProfile) => ({ ...existingProfile, [field]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      await onSubmit(profile);
    } catch {
      setSubmitError('We couldn’t send your request. Please check your details and try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div aria-labelledby="strategy-session-title" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-5 py-6 backdrop-blur-sm" role="dialog">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-white/15 bg-slate-950 p-6 text-white shadow-2xl shadow-black/50 md:p-8">
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
            <TextField label="Name *" required value={profile.name} onChange={(value) => updateProfile('name', value)} />
            <TextField label="Company *" required value={profile.company} onChange={(value) => updateProfile('company', value)} />
            <TextField label="Email *" required type="email" value={profile.email} onChange={(value) => updateProfile('email', value)} />
            <TextField label="Phone (optional)" type="tel" value={profile.phone} onChange={(value) => updateProfile('phone', value)} />
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

function BenchmarkBar({ category, score }: { category: Category; score: number }) {
  const benchmark = industryBenchmarks[category];
  const difference = score - benchmark;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-lg shadow-black/10">
      <div className="mb-3 flex items-center justify-between gap-3 text-sm">
        <span className="font-bold text-slate-100">{category}</span>
        <span className={`rounded-full px-2.5 py-1 font-black ${difference >= 0 ? 'bg-emerald-400/10 text-emerald-200' : 'bg-amber-400/10 text-amber-200'}`}>{difference >= 0 ? '+' : ''}{difference}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
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
