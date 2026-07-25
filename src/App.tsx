import { useMemo, useState } from 'react';
import { categories, categoryGradients, questions, scaleLabels } from './data';
import type { Category, ResultsData } from './types';

type Screen = 'landing' | 'assessment' | 'results';

type ScoreBand = {
  label: string;
  description: string;
};

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

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const currentQuestion = questions[currentQuestionIndex];
  const results = useMemo(() => calculateResults(answers), [answers]);
  const progress = ((currentQuestionIndex + (answers[currentQuestion.id] ? 1 : 0)) / questions.length) * 100;

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
    }, 180);
  };

  const goBack = () => {
    if (currentQuestionIndex === 0) {
      setScreen('landing');
      return;
    }

    setCurrentQuestionIndex((index) => index - 1);
  };

  if (screen === 'landing') {
    return <LandingPage onStart={startAssessment} />;
  }

  if (screen === 'results') {
    return <ResultsPage results={results} onRestart={startAssessment} />;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,.20),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,.18),transparent_35%)]" />
      <section className="relative mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-10">
        <div className="mb-8 flex items-center justify-between text-sm text-slate-300">
          <button className="rounded-full border border-white/15 px-4 py-2 hover:bg-white/10" onClick={goBack}>
            Back
          </button>
          <span>
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
        </div>

        <div aria-label="Assessment progress" className="mb-8 h-3 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-sky-400 transition-all" style={{ width: `${progress}%` }} />
        </div>

        <article className="rounded-[2rem] border border-white/10 bg-white/[.07] p-8 shadow-2xl backdrop-blur md:p-12">
          <p className="mb-4 inline-flex rounded-full bg-amber-400/15 px-4 py-2 text-sm font-semibold text-amber-200">
            {currentQuestion.category}
          </p>
          <h1 className="text-3xl font-bold leading-tight md:text-5xl">{currentQuestion.prompt}</h1>
          <div className="mt-10 grid gap-3 md:grid-cols-5">
            {scaleLabels.map((label, index) => (
              <button
                className="group rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-left transition hover:-translate-y-1 hover:border-amber-300/60 hover:bg-white/10"
                key={label}
                onClick={() => selectScore(index + 1)}
              >
                <span className="block text-3xl font-black text-white">{index + 1}</span>
                <span className="mt-3 block text-sm text-slate-300 group-hover:text-white">{label}</span>
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
      <section className="relative isolate px-6 py-8 md:px-10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(251,191,36,.25),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(56,189,248,.20),transparent_28%),linear-gradient(135deg,#020617,#111827_48%,#0f172a)]" />
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="text-lg font-black tracking-tight">
            Contractor<span className="text-amber-300">Health</span>Check
          </div>
          <span className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-300">Built for 1–20 employee contractors</span>
        </nav>

        <div className="mx-auto grid min-h-[calc(100vh-96px)] max-w-7xl items-center gap-12 py-16 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="mb-6 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-amber-200 ring-1 ring-white/15">
              25-question business diagnostic
            </p>
            <h1 className="text-5xl font-black leading-[.95] tracking-tight md:text-7xl">
              Find the leaks in your contracting business before they cost you another year.
            </h1>
            <p className="mt-7 max-w-2xl text-xl leading-8 text-slate-300">
              Get a clear Business Health Score across pricing, sales, marketing, cash flow, systems, team, operations, and customer experience—then see exactly where to focus next.
            </p>
            <button
              className="mt-10 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-8 py-4 text-lg font-black text-slate-950 shadow-[0_20px_60px_rgba(245,158,11,.35)] transition hover:-translate-y-1"
              onClick={onStart}
            >
              Start Assessment
            </button>
          </div>
          <ReportPreview />
        </div>
      </section>
    </main>
  );
}

function ReportPreview() {
  return (
    <aside className="rounded-[2.5rem] border border-white/10 bg-white/[.08] p-6 shadow-2xl backdrop-blur">
      <div className="rounded-[2rem] bg-slate-950/80 p-7">
        <div className="mb-8 flex items-center justify-between">
          <span className="text-slate-400">Business Health</span>
          <span className="text-amber-300">Premium Report</span>
        </div>
        <div className="text-7xl font-black">
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

function ResultsPage({ results, onRestart }: { results: ResultsData; onRestart: () => void }) {
  const band = getScoreBand(results.overall);
  const nextCategory = results.opportunities[0]?.category ?? 'Systems';

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-[2rem] border border-white/10 bg-white/[.07] p-8 shadow-2xl md:p-12">
          <p className="text-amber-200">Your Contractor Health Check</p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <div className="text-8xl font-black">
                {results.overall}<span className="text-3xl text-slate-400">/100</span>
              </div>
              <h1 className="mt-4 text-4xl font-black">{band.label}</h1>
              <p className="mt-3 text-slate-300">{band.description}</p>
              <a
                className="mt-8 inline-flex rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-7 py-4 font-black text-slate-950"
                href="mailto:hello@tradebuilt.example?subject=Strategy%20Call"
              >
                Book a Strategy Call
              </a>
              <button className="ml-3 mt-8 rounded-full border border-white/15 px-6 py-4 font-bold text-slate-200" onClick={onRestart}>
                Retake
              </button>
            </div>

            <div className="grid gap-4">
              {results.categories.map(({ category, score }) => (
                <ScoreBar category={category} key={category} score={score} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <InsightCard title="Top 3 Strengths" items={results.strengths.map((item) => `${item.category}: ${item.score}%`)} />
          <InsightCard title="Top 3 Opportunities" items={results.opportunities.map((item) => `${item.category}: ${item.score}%`)} />
          <InsightCard
            title="Recommended Next Step"
            items={[`Prioritize ${nextCategory}. Document the current process, set one measurable target, and review progress weekly for the next 30 days.`]}
          />
        </div>
      </section>
    </main>
  );
}

function ScoreBar({ category, score }: { category: Category; score: number }) {
  return (
    <div className="rounded-2xl bg-slate-900/70 p-4">
      <div className="mb-2 flex justify-between text-sm">
        <span className="font-bold">{category}</span>
        <span>{score}%</span>
      </div>
      <div className="h-3 rounded-full bg-white/10">
        <div className={`h-3 rounded-full bg-gradient-to-r ${categoryGradients[category]}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function InsightCard({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-white/[.06] p-6">
      <h2 className="mb-4 text-xl font-black">{title}</h2>
      <ul className="space-y-3 text-slate-300">
        {items.map((item) => (
          <li className="flex gap-3" key={item}>
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-300" />
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}
