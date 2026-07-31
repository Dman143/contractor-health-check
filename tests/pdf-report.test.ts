import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import test from 'node:test';
import { categories, industryBenchmarks } from '../src/data.ts';
import { createPdfReport, measurePdfText, wrapPdfText } from '../src/pdfReport.ts';
import type { BusinessRanking, LeadProfile, ResultsData, TradeActionPlan } from '../src/types.ts';

const repeated = (text: string, count: number) => Array.from({ length: count }, () => text).join(' ');

const profile = (company = 'Reliable Roofing Co'): LeadProfile => ({
  name: 'Jordan Contractor', company, email: 'jordan@example.com', phone: '555-0100', message: '',
  trade: 'General Contractor', teamSize: '6-10', monthlyRevenue: '$100k-$250k',
});

const ranking = (score: number): BusinessRanking => score >= 90 ? 'Top 10%' : score >= 80 ? 'Top 25%' : score >= 72 ? 'Above Average' : score >= 60 ? 'Average' : score >= 45 ? 'Below Average' : 'Bottom 25%';

const results = (score: number): ResultsData => {
  const categoryScores = categories.map((category, index) => ({ category, score: Math.max(1, Math.min(100, score + index - 4)), industryAverage: industryBenchmarks[category], difference: score - industryBenchmarks[category] }));
  return {
    overall: score, industryAverage: 62, ranking: ranking(score),
    rankingExplanation: `This ranking reflects measured performance across all operating categories at ${score} points while comparing the business with established contractor benchmarks.`,
    categories: categoryScores, strengths: categoryScores.slice(-3), opportunities: categoryScores.slice(0, 3),
  };
};

const plan = (score: number, long = false): TradeActionPlan => {
  const detail = long ? repeated('This detailed recommendation assigns an owner, a measurable target, a deadline, and a weekly review cadence so field execution remains accountable.', 12) : 'Create one accountable operating rhythm with a named owner and a weekly measurable target.';
  return {
    executiveSummary: long ? repeated('The assessment identifies specific operational constraints and practical opportunities that require disciplined sequencing before the company adds more volume.', 18) : `The ${score}-point result shows a clear next stage and a focused path to stronger performance.`,
    bottleneck: detail, biggestOpportunity: detail,
    categoryInsights: categories.map((category) => ({ category, score, whyItMatters: long ? repeated(`${category} directly affects margin, predictability, and owner capacity.`, 4) : `${category} directly affects predictable growth.`, diagnosis: detail })),
    priorities: [detail, detail, detail], quickWins: [detail, detail, detail],
    weeks: [1, 2, 3, 4].map((week) => ({ week: week as 1 | 2 | 3 | 4, title: `Build the week ${week} operating system`, focusCategories: [categories[(week - 1) % categories.length]], actions: [detail, detail, detail] })),
    risk: detail, estimatedOutcome: detail, context: detail, finalRecommendation: detail,
  };
};

const scenarios = [
  { name: 'low score', score: 25, company: 'Reliable Roofing Co', long: false },
  { name: 'average score', score: 63, company: 'Reliable Roofing Co', long: false },
  { name: 'high score', score: 94, company: 'Reliable Roofing Co', long: false },
  { name: 'perfect self-reported score', score: 100, company: 'Reliable Roofing Co', long: false },
  { name: 'long company name', score: 63, company: repeated('Northwestern Commercial Construction and Restoration', 7), long: false },
  { name: 'long AI summary and action plan', score: 63, company: 'Reliable Roofing Co', long: true },
] as const;

test('wraps using rendered Helvetica widths and splits words wider than the content box', () => {
  const lines = wrapPdfText('WWW iii Supercalifragilisticexpialidocious', 40, 10);
  assert.ok(lines.length > 2);
  assert.notDeepEqual(wrapPdfText('WWWW', 30, 10), wrapPdfText('iiii', 30, 10));
});

for (const scenario of scenarios) {
  test(`PDF safely flows the ${scenario.name} fixture`, async () => {
    const scenarioResults = results(scenario.score);
    scenarioResults.isPerfectSelfReported = scenario.score === 100;
    const report = createPdfReport(profile(scenario.company), scenarioResults, { label: ranking(scenario.score), description: '' }, plan(scenario.score, scenario.long));
    const source = await report.blob.text();
    if (process.env.WRITE_PDF_FIXTURES) {
      await mkdir(process.env.WRITE_PDF_FIXTURES, { recursive: true });
      await writeFile(`${process.env.WRITE_PDF_FIXTURES}/${scenario.name.replace(/\W+/g, '-')}.pdf`, new Uint8Array(await report.blob.arrayBuffer()));
    }
    assert.equal(source.startsWith('%PDF-1.4'), true);
    assert.equal((source.match(/\/Type \/Page\b/g) ?? []).length, report.pageCount);
    assert.match(source, /EXECUTIVE SUMMARY|The assessment identifies|The (?:25|63|94|100)-point result/i);
    assert.match(source, /OVERALL BUSINESS RANKING/);
    assert.match(source, /Your results are only as accurate as the answers you provide/);
    if (scenario.score === 100) {
      assert.match(source, /A perfect score is exceptionally rare/);
      assert.match(source, /selected 5\/5 throughout without critically evaluating your business/);
    }

    // Page one has exactly one horizontal stroke: the title divider beneath
    // "Prepared for". Its rule must remain entirely above the large score's
    // conservative font box so PDF viewers cannot render it through the score.
    const firstPage = source.match(/stream\n([\s\S]*?)\nendstream/)?.[1] ?? '';
    const horizontalRules = [...firstPage.matchAll(/([\d.]+) ([\d.]+) m ([\d.]+) \2 l S/g)];
    assert.equal(horizontalRules.length, 1);
    const dividerY = Number(horizontalRules[0][2]);
    const scoreMatch = firstPage.match(new RegExp(`/F2 42 Tf 42 ([\\d.]+) Td \\(${scenario.score}/100\\)`));
    const scoreY = Number(scoreMatch?.[1]);
    assert.ok(Number.isFinite(dividerY) && Number.isFinite(scoreY));
    assert.ok(scoreY + 42 < dividerY, `title divider at ${dividerY} intersects the score font box ending at ${scoreY + 42}`);

    // The ranking section is emitted once and flows at least 24 CSS pixels
    // (18 PDF points) below the fully rendered executive summary.
    assert.equal((source.match(/\/F2 10 Tf [^\n]*\(OVERALL BUSINESS RANKING/g) ?? []).length, 1);
    assert.equal((source.match(/This ranking reflects measured performance/g) ?? []).length, 1);
    if (!scenario.long && scenario.company === 'Reliable Roofing Co') {
      const summaryY = Number(firstPage.match(new RegExp(`/F1 10 Tf 42 ([\\d.]+) Td \\(The ${scenario.score}-point result`))?.[1]);
      const rankingY = Number(firstPage.match(/\/F2 10 Tf 42 ([\d.]+) Td \(OVERALL BUSINESS RANKING/)?.[1]);
      assert.ok(Number.isFinite(summaryY) && Number.isFinite(rankingY));
      assert.ok(summaryY - rankingY >= 15 + 18, `ranking starts only ${summaryY - rankingY}pt below the summary baseline`);
    }

    // Every text baseline generated by the flow engine remains inside the body,
    // header, or footer safe areas; no body text can be clipped by a page edge.
    const textCommands = [...source.matchAll(/\/F[12] ([\d.]+) Tf ([\d.]+) ([\d.]+) Td/g)];
    assert.ok(textCommands.length > 50);
    textCommands.forEach((match) => {
      const size = Number(match[1]);
      const x = Number(match[2]);
      const y = Number(match[3]);
      assert.ok(x >= 42 && x <= 570, `x=${x} is outside the safe area`);
      assert.ok(y === 26 || y >= 52, `y=${y} clips the bottom safe area`);
      assert.ok(y + size <= 760, `y=${y}, size=${size} clips the top safe area`);
    });

    // Inspect the actual content streams as rendered rectangles. Any intersecting
    // text rectangles indicate an overlap in the generated PDF itself.
    const streams = [...source.matchAll(/stream\n([\s\S]*?)\nendstream/g)].map((match) => match[1]);
    streams.forEach((stream, pageIndex) => {
      const boxes = stream.split('\n').flatMap((line) => {
        const match = line.match(/\/F([12]) ([\d.]+) Tf ([\d.]+) ([\d.]+) Td \((.*)\) Tj ET$/);
        if (!match) return [];
        const font = `F${match[1]}` as 'F1' | 'F2';
        const size = Number(match[2]);
        const x = Number(match[3]);
        const y = Number(match[4]);
        const value = match[5].replace(/\\([\\()])/g, '$1');
        return [{ x, y, right: x + measurePdfText(value, size, font), top: y + size, value }];
      });
      boxes.forEach((box, index) => {
        assert.ok(box.right <= 570.01, `page ${pageIndex + 1}: "${box.value}" clips the right safe area`);
        boxes.slice(index + 1).forEach((other) => {
          const overlaps = box.x < other.right - 0.01 && box.right > other.x + 0.01 && box.y < other.top - 0.01 && box.top > other.y + 0.01;
          assert.equal(overlaps, false, `page ${pageIndex + 1}: "${box.value}" overlaps "${other.value}"`);
        });
      });
    });
    assert.ok(report.pageCount >= (scenario.long ? 15 : 5));
  });
}
