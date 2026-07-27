import { useEffect, useMemo, useState } from 'react';
import { categories, categoryGradients, questions, scaleLabels } from './data';
import type { Category, OnboardingData, ResultsData } from './types';

type Screen = 'landing' | 'onboarding' | 'assessment' | 'results';
type OnboardingField = keyof OnboardingData;

type ScoreBand = {
  label: string;
  description: string;
};

const onboardingSteps: Array<{
  field: OnboardingField;
  eyebrow: string;
  title: string;
  description: string;
  placeholder: string;
  inputMode?: 'email' | 'text';
}> = [
  {
    field: 'name',
    eyebrow: 'Step 1 of 4',
    title: 'Who should we build this report for?',
    description: 'Your results will read like a board-ready business snapshot, not a generic quiz score.',
    placeholder: 'Jordan Smith',
  },
  {
    field: 'company',
    eyebrow: 'Step 2 of 4',
    title: 'What company are we assessing?',
    description: 'We will personalize the report around your contracting business and operating context.',
    placeholder: 'Smith & Sons Remodeling',
  },
  {
    field: 'email',
    eyebrow: 'Step 3 of 4',
    title: 'Where should your report be sent?',
    description: 'Use the email you would want attached to a downloadable version of the report.',
    placeholder: 'jordan@company.com',
    inputMode: 'email',
  },
  {
    field: 'teamSize',
    eyebrow: 'Step 4 of 4',
    title: 'How many people are on your team?',
    description: 'This helps frame recommendations for your current stage of growth.',
    placeholder: 'Owner + 6 team members',
  },
];

const getScoreBand = (score: number): ScoreBand => {
  if (score >= 85) {
    return { label: 'Excellent', description: 'Your business has strong fundamentals and is ready to scale with discipline.' };
  }

  if (score >= 70) {
    return { label: 'Healthy', description: 'You have a solid base with a few constraints holding back smoother growth.' };
  }

  if (score >= 50) {
    return { label: 'Vulnerable', description: 'Several areas need attention before growth becomes predictable.' };
  }

  return { label: 'At Risk', description: 'Focus on stabilizing cash, delivery, and sales systems before adding complexity.' };
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

const emptyProfile: OnboardingData = { name: '', company: '', email: '', teamSize: '' };

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [onboardingIndex, setOnboardingIndex] = useState(0);
  const [profile, setProfile] = useState<OnboardingData>(emptyProfile);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const currentQuestion = questions[currentQuestionIndex];
  const results = useMemo(() => calculateResults(answers), [answers]);
  const progress = ((currentQuestionIndex + (answers[currentQuestion.id] ? 1 : 0)) / questions.length) * 100;

  const beginOnboarding = () => {
    setProfile(emptyProfile);
    setOnboardingIndex(0);
    setScreen('onboarding');
  };

  const startAssessment = () => {
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
    }, 220);
  };

  const goBack = () => {
    if (currentQuestionIndex === 0) {
      setScreen('onboarding');
      return;
    }

    setCurrentQuestionIndex((index) => index - 1);
  };

  if (screen === 'landing') {
    return <LandingPage onStart={beginOnboarding} />;
  }

  if (screen === 'onboarding') {
    return (
      <OnboardingPage
        onBack={() => (onboardingIndex === 0 ? setScreen('landing') : setOnboardingIndex((index) => index - 1))}
        onChange={setProfile}
        onContinue={() => (onboardingIndex === onboardingSteps.length - 1 ? startAssessment() : setOnboardingIndex((index) => index + 1))}
        profile={profile}
        stepIndex={onboardingIndex}
      />
    );
  }

  if (screen === 'results') {
    return <ResultsPage profile={profile} results={results} onRestart={beginOnboarding} />;
  }

  return <AssessmentPage currentQuestionIndex={currentQuestionIndex} answers={answers} onBack={goBack} onSelectScore={selectScore} progress={progress} />;
}

function LandingPage({ onStart }: { onStart: () => void }) {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <section className="relative isolate px-6 py-8 md:px-10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(251,191,36,.25),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(56,189,248,.20),transparent_28%),linear-gradient(135deg,#020617,#111827_48%,#0f172a)]" />
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="text-lg font-black tracking-tight">Contractor<span className="text-amber-300">Health</span>Check <span className="text-xs text-slate-400">v2</span></div>
          <span className="hidden rounded-full border border-white/15 px-4 py-2 text-sm text-slate-300 sm:inline-flex">Private diagnostic • 8 minutes</span>
        </nav>

        <div className="mx-auto grid min-h-[calc(100vh-96px)] max-w-7xl items-center gap-12 py-16 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <p className="mb-6 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-amber-200 ring-1 ring-white/15">Premium contractor business diagnostic</p>
            <h1 className="text-5xl font-black leading-[.95] tracking-tight md:text-7xl">See exactly where your contracting business is strong, exposed, and ready to scale.</h1>
            <p className="mt-7 max-w-2xl text-xl leading-8 text-slate-300">Complete a guided assessment and receive a save-worthy Business Health Report with category scores, executive summary, top strengths, and your highest-priority action.</p>
            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              {['8 min completion', 'Personalized report', 'Action-first summary'].map((item) => <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4 text-sm font-bold text-slate-200" key={item}>{item}</div>)}
            </div>
            <button className="mt-10 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-8 py-4 text-lg font-black text-slate-950 shadow-[0_20px_60px_rgba(245,158,11,.35)] transition hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-amber-200/40" onClick={onStart}>Start Assessment</button>
          </div>
          <ReportPreview />
        </div>
      </section>
    </main>
  );
}

function OnboardingPage({ onBack, onChange, onContinue, profile, stepIndex }: { onBack: () => void; onChange: (profile: OnboardingData) => void; onContinue: () => void; profile: OnboardingData; stepIndex: number }) {
  const step = onboardingSteps[stepIndex];
  const value = profile[step.field];
  const canContinue = value.trim().length > 1 && (step.field !== 'email' || /\S+@\S+\.\S+/.test(value));
  const percent = ((stepIndex + 1) / onboardingSteps.length) * 100;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col justify-center">
        <div className="mb-8 flex items-center justify-between text-sm text-slate-300"><button className="rounded-full border border-white/15 px-4 py-2 hover:bg-white/10" onClick={onBack}>Back</button><span>Assessment begins after onboarding</span></div>
        <div className="mb-8 h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-sky-300 transition-all duration-500" style={{ width: `${percent}%` }} /></div>
        <form className="rounded-[2rem] border border-white/10 bg-white/[.07] p-7 shadow-2xl backdrop-blur md:p-12" onSubmit={(event) => { event.preventDefault(); if (canContinue) onContinue(); }}>
          <p className="mb-4 text-sm font-black uppercase tracking-[.3em] text-amber-200">{step.eyebrow}</p>
          <h1 className="text-4xl font-black tracking-tight md:text-6xl">{step.title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">{step.description}</p>
          <label className="mt-10 block"><span className="mb-3 block text-sm font-bold text-slate-200">{step.field === 'teamSize' ? 'Team size' : step.field.charAt(0).toUpperCase() + step.field.slice(1)}</span><input autoFocus className="w-full rounded-3xl border border-white/10 bg-slate-950/80 px-6 py-5 text-xl font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-amber-300 focus:ring-4 focus:ring-amber-300/20" inputMode={step.inputMode} onChange={(event) => onChange({ ...profile, [step.field]: event.target.value })} placeholder={step.placeholder} type={step.field === 'email' ? 'email' : 'text'} value={value} /></label>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-400">You will receive: score, breakdown, strengths, opportunities, and priority action.</p><button className="rounded-full bg-white px-7 py-4 font-black text-slate-950 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40" disabled={!canContinue} type="submit">{stepIndex === onboardingSteps.length - 1 ? 'Begin Assessment' : 'Continue'}</button></div>
        </form>
      </section>
    </main>
  );
}

function AssessmentPage({ answers, currentQuestionIndex, onBack, onSelectScore, progress }: { answers: Record<number, number>; currentQuestionIndex: number; onBack: () => void; onSelectScore: (score: number) => void; progress: number }) {
  const currentQuestion = questions[currentQuestionIndex];
  const selected = answers[currentQuestion.id];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (/^[1-5]$/.test(event.key)) onSelectScore(Number(event.key));
      if (event.key === 'ArrowLeft') onBack();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack, onSelectScore]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,.20),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,.18),transparent_35%)]" />
      <section className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-5 py-8 md:px-6 md:py-10">
        <div className="mb-6 flex items-center justify-between text-sm text-slate-300"><button className="rounded-full border border-white/15 px-4 py-2 hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/15" onClick={onBack}>Back</button><span>Question {currentQuestionIndex + 1} of {questions.length}</span></div>
        <div aria-label="Assessment progress" className="mb-8 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-sky-400 transition-all duration-500" style={{ width: `${progress}%` }} /></div>
        <article className="animate-[fadeIn_.28s_ease-out] rounded-[2rem] border border-white/10 bg-white/[.07] p-6 shadow-2xl backdrop-blur md:p-12">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><p className="inline-flex rounded-full bg-amber-400/15 px-4 py-2 text-sm font-semibold text-amber-200">{currentQuestion.category}</p><p className="text-sm text-slate-400">Press keys 1–5 to answer</p></div>
          <h1 className="text-3xl font-black leading-tight md:text-5xl">{currentQuestion.prompt}</h1>
          <div className="mt-10 grid gap-3 md:grid-cols-5" role="radiogroup" aria-label="Answer scale">
            {scaleLabels.map((label, index) => {
              const score = index + 1;
              const isSelected = selected === score;
              return <button aria-checked={isSelected} className={`group rounded-2xl border p-5 text-left transition duration-200 hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-amber-300/25 ${isSelected ? 'border-amber-300 bg-amber-300 text-slate-950 shadow-[0_18px_45px_rgba(245,158,11,.25)]' : 'border-white/10 bg-slate-900/70 hover:border-amber-300/60 hover:bg-white/10'}`} key={label} onClick={() => onSelectScore(score)} role="radio"><span className="block text-3xl font-black">{score}</span><span className={`mt-3 block text-sm ${isSelected ? 'text-slate-900' : 'text-slate-300 group-hover:text-white'}`}>{label}</span></button>;
            })}
          </div>
        </article>
      </section>
    </main>
  );
}

function ReportPreview() {
  return (
    <aside className="rounded-[2.5rem] border border-white/10 bg-white/[.08] p-6 shadow-2xl backdrop-blur">
      <div className="rounded-[2rem] bg-slate-950/80 p-7">
        <div className="mb-8 flex items-center justify-between"><span className="text-slate-400">Business Health</span><span className="text-amber-300">Premium Report</span></div>
        <div className="text-7xl font-black">82<span className="text-3xl text-slate-400">/100</span></div>
        <div className="mt-6 grid gap-4">{categories.slice(0, 5).map((category, index) => <ScoreBar category={category} key={category} score={88 - index * 7} />)}</div>
      </div>
    </aside>
  );
}

function ResultsPage({ profile, results, onRestart }: { profile: OnboardingData; results: ResultsData; onRestart: () => void }) {
  const band = getScoreBand(results.overall);
  const nextCategory = results.opportunities[0]?.category ?? 'Systems';
  const firstName = profile.name.split(' ')[0] || 'there';
  const summary = `${profile.company || 'Your business'} is ${band.label.toLowerCase()} overall, with the clearest leverage in ${nextCategory}. Protect what is already working, then make one focused operating improvement before adding more leads or overhead.`;

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white md:px-6 md:py-10">
      <section className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-amber-200">Contractor Health Check Report</p><h1 className="mt-2 text-4xl font-black md:text-6xl">{profile.company || 'Your Business'} Health Report</h1></div><p className="text-sm text-slate-400">Prepared for {firstName} • Save-ready snapshot</p></div>
        <div className="rounded-[2rem] border border-white/10 bg-white/[.07] p-7 shadow-2xl md:p-12">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]"><div><p className="text-sm font-black uppercase tracking-[.28em] text-slate-400">Overall Business Health Score</p><div className="mt-4 text-8xl font-black">{results.overall}<span className="text-3xl text-slate-400">/100</span></div><h2 className="mt-4 text-4xl font-black">{band.label}</h2><p className="mt-3 text-lg leading-8 text-slate-300">{band.description}</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><button className="rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-7 py-4 font-black text-slate-950">Download Report</button><a className="rounded-full border border-white/15 px-7 py-4 text-center font-black text-slate-100 hover:bg-white/10" href="mailto:hello@tradebuilt.example?subject=Strategy%20Session">Book a Strategy Call</a></div><button className="mt-3 text-sm font-bold text-slate-400 underline underline-offset-4" onClick={onRestart}>Retake assessment</button></div><div className="grid gap-4">{results.categories.map(({ category, score }) => <ScoreBar category={category} key={category} score={score} />)}</div></div>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-3"><InsightCard title="Executive Summary" items={[summary]} /><InsightCard title="Top 3 Strengths" items={results.strengths.map((item) => `${item.category}: ${item.score}% — keep using this as a competitive advantage.`)} /><InsightCard title="Top 3 Opportunities" items={results.opportunities.map((item) => `${item.category}: ${item.score}% — tighten this before scaling volume.`)} /></div>
        <div className="mt-6 rounded-[1.5rem] border border-amber-300/25 bg-amber-300/10 p-6"><p className="text-sm font-black uppercase tracking-[.25em] text-amber-200">Recommended Next Step</p><h2 className="mt-3 text-2xl font-black">Build a 30-day improvement sprint around {nextCategory}.</h2><p className="mt-3 text-slate-300">Document the current process, choose one owner, set one measurable target, and review progress every Friday until the bottleneck is visibly improved.</p></div>
      </section>
    </main>
  );
}

function ScoreBar({ category, score }: { category: Category; score: number }) {
  return <div className="rounded-2xl bg-slate-900/70 p-4"><div className="mb-2 flex justify-between gap-4 text-sm"><span className="font-bold">{category}</span><span>{score}%</span></div><div className="h-3 overflow-hidden rounded-full bg-white/10"><div className={`h-3 rounded-full bg-gradient-to-r ${categoryGradients[category]} transition-all duration-700`} style={{ width: `${score}%` }} /></div></div>;
}

function InsightCard({ title, items }: { title: string; items: string[] }) {
  return <article className="rounded-[1.5rem] border border-white/10 bg-white/[.06] p-6"><h2 className="mb-4 text-xl font-black">{title}</h2><ul className="space-y-3 text-slate-300">{items.map((item) => <li className="flex gap-3" key={item}><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-300" />{item}</li>)}</ul></article>;
}
