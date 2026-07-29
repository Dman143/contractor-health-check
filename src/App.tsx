import { FormEvent, useMemo, useState } from 'react';
import {
  categories,
  categoryGradients,
  categoryPlaybooks,
  categoryRevenueLeaks,
  industryBenchmarks,
  monthlyRevenueOptions,
  questions,
  scaleLabels,
  teamSizeOptions,
  tradeOptions,
} from './data';
import type { Category, LeadProfile, ResultsData } from './types';

type Screen = 'landing' | 'lead-capture' | 'assessment' | 'results';

type ScoreBand = {
  label: string;
  description: string;
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
    return { label: 'Growth Constrained', description: 'Several SaaS-tracked operating areas need attention before growth becomes predictable.' };
  }

  return { label: 'Stabilize First', description: 'Focus on cash, delivery, and sales control before adding more volume or complexity.' };
};


const escapePdfText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const downloadPdfReport = (leadProfile: LeadProfile, results: ResultsData, band: ScoreBand) => {
  const lines = [
    'Contractor Health Check V3',
    `${leadProfile.company || 'Contractor'} Assessment Report`,
    `Prepared for: ${leadProfile.name || 'Not provided'}`,
    `Email: ${leadProfile.email || 'Not provided'} | Phone: ${leadProfile.phone || 'Not provided'}`,
    `Trade: ${leadProfile.trade} | Team: ${leadProfile.teamSize} | Revenue: ${leadProfile.monthlyRevenue}/mo`,
    '',
    `Overall Score: ${results.overall}/100 - ${band.label}`,
    band.description,
    '',
    'Category Scores',
    ...results.categories.map(({ category, score }) => `${category}: ${score}% (peer baseline ${industryBenchmarks[category]}%)`),
    '',
    'Top Opportunities',
    ...results.opportunities.map(({ category }) => `${category}: ${categoryRevenueLeaks[category]}`),
    '',
    '30-Day Recommended Next Steps',
    ...categoryPlaybooks[results.opportunities[0]?.category ?? 'Systems'].map((step, index) => `${index + 1}. ${step}`),
    '',
    `Lead Message: ${leadProfile.message || 'Not provided'}`,
  ];
  const content = lines.map((line, index) => `BT /F1 ${index < 2 ? 18 : 10} Tf 54 ${760 - index * 22} Td (${escapePdfText(line)}) Tj ET`).join('\n');
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object) => { offsets.push(pdf.length); pdf += `${object}\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${(leadProfile.company || 'contractor').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-health-check-report.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};

const calculateResults = (answers: Record<number, number>): ResultsData => {
  const answeredTotal = questions.reduce((sum, question) => sum + (answers[question.id] ?? 0), 0);
  const categoryScores = categories.map((category) => {
    const categoryQuestions = questions.filter((question) => question.category === category);
    const categoryTotal = categoryQuestions.reduce((sum, question) => sum + (answers[question.id] ?? 0), 0);

    return {
      category,
      score: Math.round((categoryTotal / (categoryQuestions.length * 5)) * 100),
    };
  });

  return {
    overall: Math.round((answeredTotal / (questions.length * 5)) * 100),
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
    return <ResultsPage leadProfile={leadProfile} results={results} onLeadUpdate={setLeadProfile} onRestart={startAssessment} />;
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
          <div className="text-lg font-black tracking-tight sm:text-xl">
            Contractor<span className="text-amber-300">Health</span>Check <span className="text-sky-300">V3</span>
          </div>
          <span className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-slate-300 sm:text-sm">SaaS diagnostic + benchmark report</span>
        </nav>

        <div className="mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl items-center gap-10 py-12 md:py-16 lg:grid-cols-[1.05fr_.95fr] lg:gap-14">
          <div className="max-w-4xl">
            <p className="mb-6 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-amber-200 ring-1 ring-white/15">
              Lead capture • 25-question diagnostic • personalized action plan
            </p>
            <h1 className="max-w-5xl text-4xl font-black leading-[1.02] tracking-[-0.045em] sm:text-5xl md:text-7xl">
              Turn every health check into a SaaS-ready contractor growth report.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 md:mt-7 md:text-xl">
              Capture qualified leads, score their business, benchmark each category, and generate a 30-day playbook that points to your paid advisory or software offer.
            </p>
            <div className="mt-8 grid gap-3 text-sm font-semibold text-slate-300 sm:grid-cols-3">
              {['CRM-ready profile', 'Benchmark gaps', 'Premium report CTA'].map((item) => (
                <span className="rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3" key={item}>✓ {item}</span>
              ))}
            </div>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                className="group rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-8 py-4 text-lg font-black text-slate-950 shadow-[0_20px_60px_rgba(245,158,11,.35)] ring-1 ring-amber-200/60 transition duration-200 hover:-translate-y-1 hover:scale-[1.01] hover:from-amber-200 hover:to-orange-400 hover:shadow-[0_24px_70px_rgba(245,158,11,.48)] focus:outline-none focus:ring-4 focus:ring-amber-300/50"
                onClick={onStart}
              >
                Start Assessment <span className="inline-block transition group-hover:translate-x-1">→</span>
              </button>
              <span className="text-sm font-medium text-slate-400">Takes less than 5 minutes. Report unlock included.</span>
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
          <p className="mb-4 inline-flex rounded-full bg-sky-400/10 px-4 py-2 text-sm font-bold text-sky-200 ring-1 ring-sky-300/20">V3 SaaS lead profile</p>
          <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">Personalize the report before the score.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">The profile step turns the diagnostic into a qualified lead record and lets the results page speak to the contractor’s trade, size, and revenue stage.</p>
        </div>
        <form className="rounded-[2rem] border border-white/10 bg-white/[.07] p-6 shadow-2xl shadow-black/30 backdrop-blur md:p-8" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Your name" required value={profile.name} onChange={(value) => updateProfile('name', value)} />
            <TextField label="Company" required value={profile.company} onChange={(value) => updateProfile('company', value)} />
            <TextField label="Work email" required type="email" value={profile.email} onChange={(value) => updateProfile('email', value)} />
            <TextField label="Phone" required type="tel" value={profile.phone} onChange={(value) => updateProfile('phone', value)} />
            <SelectField label="Primary trade" options={tradeOptions} value={profile.trade} onChange={(value) => updateProfile('trade', value)} />
            <SelectField label="Team size" options={teamSizeOptions} value={profile.teamSize} onChange={(value) => updateProfile('teamSize', value)} />
            <SelectField label="Monthly revenue" options={monthlyRevenueOptions} value={profile.monthlyRevenue} onChange={(value) => updateProfile('monthlyRevenue', value)} />
          </div>
          <TextAreaField label="Message" placeholder="What are you hoping this assessment helps you improve?" value={profile.message} onChange={(value) => updateProfile('message', value)} />
          <button className="mt-6 w-full rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-8 py-4 text-lg font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5" type="submit">
            Continue to Diagnostic
          </button>
          <p className="mt-4 text-center text-xs leading-5 text-slate-400">Demo SaaS flow: no data is sent to a server in this static build.</p>
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
          <span className="text-slate-400">V3 SaaS Report</span>
          <span className="rounded-full bg-amber-300/10 px-3 py-1 font-bold text-amber-300 ring-1 ring-amber-300/20">Premium</span>
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

function ResultsPage({ leadProfile, results, onLeadUpdate, onRestart }: { leadProfile: LeadProfile; results: ResultsData; onLeadUpdate: (profile: LeadProfile) => void; onRestart: () => void }) {
  const band = getScoreBand(results.overall);
  const nextCategory = results.opportunities[0]?.category ?? 'Systems';
  const benchmarkDelta = results.overall - Math.round(categories.reduce((sum, category) => sum + industryBenchmarks[category], 0) / categories.length);
  const [isStrategyFormOpen, setIsStrategyFormOpen] = useState(false);
  const [emailNotice, setEmailNotice] = useState('');

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white sm:px-6 md:py-10">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 grid gap-4 rounded-[1.75rem] border border-white/10 bg-white/[.05] p-5 text-sm text-slate-300 shadow-xl shadow-black/10 md:grid-cols-[1fr_auto] md:items-center md:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">Lead profile</p>
            <p className="mt-2 text-base leading-7"><strong className="text-xl text-white">{leadProfile.company || 'Demo Contractor'}</strong> • {leadProfile.name || 'Name not provided'} • {leadProfile.trade}</p>
            <p className="leading-7">{leadProfile.email || 'Email not provided'} • {leadProfile.phone || 'Phone not provided'} • {leadProfile.teamSize} • {leadProfile.monthlyRevenue}/mo</p>
            {leadProfile.message && <p className="mt-2 max-w-3xl leading-6 text-slate-400">“{leadProfile.message}”</p>}
          </div>
          <span className="justify-self-start rounded-full bg-sky-400/10 px-4 py-2 font-bold text-sky-200 ring-1 ring-sky-300/20 md:justify-self-end">Lead status: Report unlocked</span>
        </div>
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[.07] p-6 shadow-2xl shadow-black/30 backdrop-blur md:rounded-[2rem] md:p-12">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-200">Your Contractor Health Check V3</p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[.78fr_1.22fr]">
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-6">
              <div className="text-7xl font-black tracking-tight sm:text-8xl">
                {results.overall}<span className="text-3xl text-slate-400">/100</span>
              </div>
              <h1 className="mt-4 text-3xl font-black md:text-4xl">{band.label}</h1>
              <p className="mt-3 leading-7 text-slate-300">{band.description}</p>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[.06] p-4">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">Benchmark delta</p>
                <p className="mt-2 text-2xl font-black text-white">{benchmarkDelta >= 0 ? '+' : ''}{benchmarkDelta} points vs peer baseline</p>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <button className="rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-6 py-4 font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5" onClick={() => downloadPdfReport(leadProfile, results, band)}>
                  Download PDF Report
                </button>
                <button className="rounded-full border border-sky-300/40 bg-sky-400/10 px-6 py-4 font-black text-sky-100 transition hover:-translate-y-0.5 hover:bg-sky-400/20" onClick={() => setEmailNotice('Email integration is ready: this will send the branded report when connected to your email provider.')}>
                  Email My Report
                </button>
                <button className="rounded-full border border-white/15 px-6 py-4 font-bold text-slate-200 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10 sm:col-span-2" onClick={onRestart}>
                  Retake Assessment
                </button>
              </div>
              {emailNotice && <p className="mt-4 rounded-2xl border border-sky-300/20 bg-sky-400/10 p-3 text-sm font-semibold text-sky-100">{emailNotice}</p>}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {results.categories.map(({ category, score }) => (
                <BenchmarkBar category={category} key={category} score={score} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <InsightCard title="Top 3 Strengths" items={results.strengths.map((item) => `${item.category}: ${item.score}%`)} />
          <InsightCard title="Top 3 Opportunities" items={results.opportunities.map((item) => `${item.category}: ${categoryRevenueLeaks[item.category]}`)} />
          <InsightCard title="Recommended Next Step" items={[`Prioritize ${nextCategory}. ${categoryPlaybooks[nextCategory][0]}`, ...categoryPlaybooks[nextCategory].slice(1)]} />
        </div>

        <section className="mt-8 rounded-[1.5rem] border border-amber-300/20 bg-amber-300/10 p-6 shadow-xl shadow-amber-900/10 md:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-200">SaaS conversion offer</p>
          <div className="mt-3 grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-3xl font-black">Unlock the 90-day Contractor Growth OS</h2>
              <p className="mt-2 leading-7 text-slate-200">Turn this report into weekly scorecards, pipeline reviews, job-margin tracking, and automated client follow-up workflows.</p>
            </div>
            <button className="rounded-full bg-white px-7 py-4 text-center font-black text-slate-950 transition hover:-translate-y-0.5" onClick={() => setIsStrategyFormOpen((isOpen) => !isOpen)}>Request Strategy Session</button>
          </div>
          {isStrategyFormOpen && <StrategySessionForm initialProfile={leadProfile} onSubmit={(profile) => { onLeadUpdate(profile); setIsStrategyFormOpen(false); }} />}
        </section>
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

function StrategySessionForm({ initialProfile, onSubmit }: { initialProfile: LeadProfile; onSubmit: (profile: LeadProfile) => void }) {
  const [profile, setProfile] = useState<LeadProfile>(initialProfile);
  const updateProfile = (field: keyof LeadProfile, value: string) => setProfile((existingProfile) => ({ ...existingProfile, [field]: value }));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(profile);
  };

  return (
    <form className="mt-6 rounded-[1.5rem] border border-white/15 bg-slate-950/65 p-5 shadow-2xl shadow-black/20 md:p-6" onSubmit={handleSubmit}>
      <div className="mb-5">
        <h3 className="text-2xl font-black text-white">Request Strategy Session</h3>
        <p className="mt-2 leading-6 text-slate-300">Share the best contact details and context for a focused follow-up on this assessment.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Name" required value={profile.name} onChange={(value) => updateProfile('name', value)} />
        <TextField label="Company" required value={profile.company} onChange={(value) => updateProfile('company', value)} />
        <TextField label="Email" required type="email" value={profile.email} onChange={(value) => updateProfile('email', value)} />
        <TextField label="Phone" required type="tel" value={profile.phone} onChange={(value) => updateProfile('phone', value)} />
      </div>
      <TextAreaField label="Message" required placeholder="What would make this strategy session valuable?" value={profile.message} onChange={(value) => updateProfile('message', value)} />
      <button className="mt-5 w-full rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-7 py-4 font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5 sm:w-auto" type="submit">
        Save Request
      </button>
    </form>
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

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-lg shadow-black/10">
      <div className="mb-3 flex items-center justify-between gap-3 text-sm">
        <span className="font-bold text-slate-100">{category}</span>
        <span className="rounded-full bg-white/10 px-2.5 py-1 font-black text-white">{score}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full bg-gradient-to-r ${categoryGradients[category]}`} style={{ width: `${score}%` }} />
      </div>
      <p className="mt-2 text-xs font-semibold text-slate-400">Peer baseline: {benchmark}% • Gap: {score - benchmark >= 0 ? '+' : ''}{score - benchmark}</p>
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
