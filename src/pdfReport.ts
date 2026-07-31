import { benchmarkMethodology, industryBenchmarks } from './data.ts';
import type { LeadProfile, ResultsData, TradeActionPlan } from './types.ts';

type ScoreBand = { label: string; description: string };
type FontName = 'F1' | 'F2';
type TextStyle = { size: number; font: FontName; color: string; leading: number };

const growthPhases = [
  { number: 1, name: 'Stabilize', focus: ['Pricing', 'Cash Flow', 'Systems'] },
  { number: 2, name: 'Grow', focus: ['Marketing', 'Sales', 'Customer Experience'] },
  { number: 3, name: 'Scale', focus: ['Team', 'Operations', 'Leadership'] },
  { number: 4, name: 'Freedom', focus: ['Dashboards', 'Automation', 'Profit optimization', 'Business valuation'] },
] as const;

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const LEFT = 42;
const RIGHT = 570;
const TOP = 680;
const BOTTOM = 52;
const CONTENT_WIDTH = RIGHT - LEFT;
// CSS pixels convert to PDF points at 0.75pt per pixel (24px = 18pt).
const RANKING_SECTION_SPACING = 18;
// Keep the large score's full font box clear of the title divider. Without this
// PDF-only spacing, the divider crosses the upper portion of the score glyphs.
const TITLE_DIVIDER_TO_SCORE_SPACING = 24;

// Widths from the PDF core Helvetica font metrics, in thousandths of an em.
// PDF viewers use these same metrics, so wrapping is based on rendered width rather
// than character-count estimates.
const helveticaWidths: Record<string, number> = {
  ' ': 278, '!': 278, '"': 355, '#': 556, '$': 556, '%': 889, '&': 667, "'": 191,
  '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278,
  '0': 556, '1': 556, '2': 556, '3': 556, '4': 556, '5': 556, '6': 556, '7': 556, '8': 556, '9': 556,
  ':': 278, ';': 278, '<': 584, '=': 584, '>': 584, '?': 556, '@': 1015,
  A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500,
  K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611,
  U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  '[': 278, '\\': 278, ']': 278, '^': 469, _: 556, '`': 333,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222,
  k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278,
  u: 556, v: 500, w: 722, x: 500, y: 500, z: 500, '{': 334, '|': 260, '}': 334, '~': 584,
};

const boldOverrides: Record<string, number> = {
  A: 722, B: 722, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 556,
  K: 722, L: 611, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611,
  U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  a: 556, b: 611, c: 556, d: 611, e: 556, f: 333, g: 611, h: 611, i: 278, j: 278,
  k: 556, l: 278, m: 889, n: 611, o: 611, p: 611, q: 611, r: 389, s: 556, t: 333,
  u: 611, v: 556, w: 778, x: 556, y: 556, z: 500,
};

const normalizePdfText = (value: string) => value
  .normalize('NFKD')
  .replace(/[^\x20-\x7E\n]/g, '')
  .replace(/\r\n?/g, '\n');

const escapePdfText = (value: string) => normalizePdfText(value)
  .replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

export const measurePdfText = (value: string, size: number, font: FontName) => Array.from(value).reduce((sum, character) => {
  const width = font === 'F2' ? (boldOverrides[character] ?? helveticaWidths[character]) : helveticaWidths[character];
  return sum + (width ?? 556) * size / 1000;
}, 0);

export const wrapPdfText = (value: string, maxWidth: number, size: number, font: FontName = 'F1') => {
  const paragraphs = normalizePdfText(value).split('\n');
  const lines: string[] = [];
  const splitWord = (word: string) => {
    const pieces: string[] = [];
    let piece = '';
    Array.from(word).forEach((character) => {
      if (piece && measurePdfText(piece + character, size, font) > maxWidth) {
        pieces.push(piece);
        piece = character;
      } else piece += character;
    });
    if (piece) pieces.push(piece);
    return pieces;
  };

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean).flatMap(splitWord);
    if (!words.length) lines.push('');
    else words.forEach((word) => {
      const candidate = lines.length && lines.at(-1) !== '' ? `${lines.at(-1)} ${word}` : word;
      if (lines.length && lines.at(-1) !== '' && measurePdfText(candidate, size, font) <= maxWidth) lines[lines.length - 1] = candidate;
      else lines.push(word);
    });
    if (paragraphIndex < paragraphs.length - 1 && lines.at(-1) !== '') lines.push('');
  });
  return lines;
};

class PdfFlow {
  pages: string[][] = [];
  private commands: string[] = [];
  private cursor = TOP;
  private section = 'Report';
  private reportDate: string;

  constructor(reportDate: string) { this.reportDate = reportDate; }

  private text(value: string, x: number, y: number, style: Omit<TextStyle, 'leading'>) {
    this.commands.push(`${style.color} rg BT /${style.font} ${style.size} Tf ${x} ${y} Td (${escapePdfText(value)}) Tj ET`);
  }

  newPage(section = this.section) {
    this.section = section;
    this.commands = [];
    this.pages.push(this.commands);
    this.cursor = TOP;
    this.commands.push('0.04 0.07 0.12 rg 0 728 612 64 re f', '0.96 0.66 0.18 rg 42 745 12 12 re f');
    this.text('TRADEBUILT', 65, 746, { size: 14, font: 'F2', color: '1 1 1' });
    const header = wrapPdfText(section.toUpperCase(), 165, 8, 'F2')[0] ?? '';
    this.text(header, RIGHT - measurePdfText(header, 8, 'F2'), 747, { size: 8, font: 'F2', color: '0.74 0.78 0.84' });
    this.text(`Prepared ${this.reportDate}`, LEFT, 26, { size: 8, font: 'F1', color: '0.42 0.46 0.52' });
    const footer = `TradeBuilt Business Health Report  |  ${this.pages.length}`;
    this.text(footer, RIGHT - measurePdfText(footer, 8, 'F1'), 26, { size: 8, font: 'F1', color: '0.42 0.46 0.52' });
  }

  remaining() { return this.cursor - BOTTOM; }

  ensure(height: number, section = this.section) {
    if (height > this.remaining()) this.newPage(section);
  }

  gap(height: number, section = this.section) {
    this.ensure(height, section);
    this.cursor -= height;
  }

  paragraph(value: string, options: Partial<TextStyle> & { indent?: number; after?: number; section?: string } = {}) {
    const style: TextStyle = {
      size: options.size ?? 9, font: options.font ?? 'F1', color: options.color ?? '0.16 0.20 0.27', leading: options.leading ?? 13,
    };
    const indent = options.indent ?? 0;
    const after = options.after ?? 10;
    const section = options.section ?? this.section;
    const lines = wrapPdfText(value, CONTENT_WIDTH - indent, style.size, style.font);
    lines.forEach((line) => {
      this.ensure(style.leading, section);
      if (line) this.text(line, LEFT + indent, this.cursor, style);
      this.cursor -= style.leading;
    });
    // Spacing is flow content too: if it does not fit, defer it to the next page.
    if (after <= this.remaining()) this.cursor -= after;
    return this.cursor;
  }

  continueBelow(finalY: number, spacing: number, section: string) {
    // Continue from the measured end of the preceding rendered content rather
    // than placing the next section at an independent page coordinate.
    this.cursor = Math.min(this.cursor, finalY);
    this.gap(spacing, section);
  }

  heading(value: string, section: string, level: 1 | 2 = 2, followingHeight = 26) {
    const style: TextStyle = level === 1
      ? { size: 23, font: 'F2', color: '0.04 0.07 0.12', leading: 29 }
      : { size: 10, font: 'F2', color: '0.78 0.45 0.08', leading: 16 };
    const lines = wrapPdfText(value, CONTENT_WIDTH, style.size, style.font);
    const height = lines.length * style.leading;
    this.ensure(height + Math.min(followingHeight, TOP - BOTTOM - height), section);
    lines.forEach((line) => {
      this.text(line, LEFT, this.cursor, style);
      this.cursor -= style.leading;
    });
  }

  rule(section: string) {
    this.ensure(20, section);
    this.commands.push(`0.85 0.87 0.90 RG 1 w ${LEFT} ${this.cursor} m ${RIGHT} ${this.cursor} l S`);
    this.cursor -= 20;
  }

  scoreRow(category: string, score: number, benchmark: number) {
    this.ensure(50, 'Performance Scorecard');
    this.text(category, LEFT, this.cursor, { size: 11, font: 'F2', color: '0.16 0.20 0.27' });
    this.text(`${score}%`, 390, this.cursor, { size: 11, font: 'F2', color: '0.16 0.20 0.27' });
    this.text(`Peer ${benchmark}%`, 450, this.cursor, { size: 9, font: 'F1', color: '0.42 0.46 0.52' });
    this.text(`${score - benchmark >= 0 ? '+' : ''}${score - benchmark}`, 540, this.cursor, { size: 10, font: 'F2', color: score >= benchmark ? '0.10 0.55 0.42' : '0.78 0.45 0.08' });
    this.cursor -= 19;
    this.commands.push(`0.91 0.92 0.94 rg ${LEFT} ${this.cursor} ${CONTENT_WIDTH} 9 re f`, `0.96 0.66 0.18 rg ${LEFT} ${this.cursor} ${Math.max(4, CONTENT_WIDTH * score / 100)} 9 re f`);
    this.cursor -= 31;
  }

  roadmapCard(phase: (typeof growthPhases)[number], isCurrent: boolean) {
    const focusLines = wrapPdfText(phase.focus.join('  |  '), 220, 9, 'F1');
    const height = Math.max(78, 43 + focusLines.length * 12);
    this.ensure(height + 16, 'Growth Roadmap');
    this.commands.push(`${isCurrent ? '0.99 0.94 0.82' : '0.95 0.96 0.97'} rg ${LEFT} ${this.cursor - height + 16} ${CONTENT_WIDTH} ${height} re f`);
    this.text(`PHASE ${phase.number}`, 58, this.cursor - 4, { size: 8, font: 'F2', color: isCurrent ? '0.78 0.45 0.08' : '0.42 0.46 0.52' });
    this.text(phase.name, 58, this.cursor - 29, { size: 16, font: 'F2', color: '0.04 0.07 0.12' });
    focusLines.forEach((line, index) => this.text(line, 198, this.cursor - 25 - index * 12, { size: 9, font: 'F1', color: '0.16 0.20 0.27' }));
    if (isCurrent) this.text('YOUR CURRENT PHASE', 438, this.cursor - 4, { size: 7, font: 'F2', color: '0.78 0.45 0.08' });
    this.cursor -= height + 16;
  }
}

const growthPhaseIndex = (score: number) => score >= 85 ? 3 : score >= 70 ? 2 : score >= 50 ? 1 : 0;

export const createPdfReport = (leadProfile: LeadProfile, results: ResultsData, band: ScoreBand, tradePlan: TradeActionPlan) => {
  const reportDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date());
  const flow = new PdfFlow(reportDate);

  flow.newPage('Business Health Report');
  flow.paragraph('CONTRACTOR GROWTH DIAGNOSTIC', { size: 9, font: 'F2', color: '0.78 0.45 0.08', after: 14 });
  flow.paragraph(`${leadProfile.company} Business Health Report`, { size: 27, leading: 33, font: 'F2', color: '0.04 0.07 0.12', after: 8, section: 'Report title' });
  flow.paragraph(`Prepared for ${leadProfile.name}`, { size: 12, color: '0.35 0.39 0.45', after: 18 });
  flow.rule('Overview');
  flow.gap(TITLE_DIVIDER_TO_SCORE_SPACING, 'Overview');
  flow.paragraph(`${results.overall}/100`, { size: 42, leading: 48, font: 'F2', color: '0.04 0.07 0.12', after: 2 });
  flow.paragraph(band.label, { size: 20, leading: 24, font: 'F2', color: '0.78 0.45 0.08' });
  const executiveSummaryFinalY = flow.paragraph(tradePlan.executiveSummary, { size: 10, leading: 15, after: 0, section: 'Executive summary' });
  flow.continueBelow(executiveSummaryFinalY, RANKING_SECTION_SPACING, 'Overview');
  flow.heading(`OVERALL BUSINESS RANKING  |  ${results.ranking}`, 'Overview');
  flow.paragraph(results.rankingExplanation, { section: 'Overview' });
  flow.heading('BUSINESS PROFILE', 'Overview');
  flow.paragraph(`Primary trade: ${leadProfile.trade}  |  Team size: ${leadProfile.teamSize}  |  Monthly revenue: ${leadProfile.monthlyRevenue}`);
  flow.heading('BIGGEST OPPORTUNITY', 'Biggest opportunity');
  flow.paragraph(tradePlan.biggestOpportunity, { section: 'Biggest opportunity' });

  flow.newPage('Performance Scorecard');
  flow.heading('Business performance by operating area', 'Scorecard', 1);
  flow.paragraph('Scores are compared with the TradeBuilt contractor peer baseline.', { after: 16 });
  results.categories.forEach(({ category, score }) => flow.scoreRow(category, score, industryBenchmarks[category]));
  flow.paragraph(benchmarkMethodology, { size: 7, leading: 11, color: '0.42 0.46 0.52', section: 'Scorecard methodology' });

  flow.newPage('Consultant Score Analysis');
  flow.heading('Why each score matters', 'Score analysis', 1);
  tradePlan.categoryInsights.forEach((insight) => {
    const body = `${insight.whyItMatters} ${insight.diagnosis}`;
    flow.heading(`${insight.category.toUpperCase()}  |  ${insight.score}%`, 'Consultant Score Analysis', 2, 24);
    flow.paragraph(body, { size: 8, leading: 12, after: 13, section: 'Consultant Score Analysis' });
  });

  flow.newPage('30-Day Action Plan');
  flow.heading('Your 30-Day TradeBuilt Action Plan', 'Action plan', 1);
  flow.paragraph(tradePlan.context, { leading: 14, section: 'Action plan context' });
  flow.heading('YOUR BIGGEST BOTTLENECK', 'Bottleneck');
  flow.paragraph(tradePlan.bottleneck, { section: 'Bottleneck' });
  flow.heading('TOP 3 PRIORITIES', 'Priorities');
  tradePlan.priorities.forEach((priority, index) => flow.paragraph(`${index + 1}. ${priority.replace(/^\d+\.\s*/, '')}`, { indent: 8, section: 'Priorities' }));
  flow.heading('3 QUICK WINS UNDER 30 MINUTES', 'Quick wins');
  tradePlan.quickWins.forEach((win, index) => flow.paragraph(`${index + 1}. ${win}`, { indent: 8, section: 'Quick wins' }));

  tradePlan.weeks.forEach((week) => {
    flow.heading(`WEEK ${week.week}  |  ${week.title}`, `Week ${week.week}`, 1, 38);
    flow.paragraph(`Focus: ${week.focusCategories.join(' | ')}`, { size: 8, font: 'F2', color: '0.78 0.45 0.08', section: `Week ${week.week}` });
    week.actions.forEach((action, index) => flow.paragraph(`${index + 1}. ${action}`, { indent: 14, section: `Week ${week.week}` }));
    flow.rule(`Week ${week.week}`);
  });

  flow.heading('BIGGEST BUSINESS RISK IF NOTHING CHANGES', 'Plan outcome');
  flow.paragraph(tradePlan.risk, { leading: 14, section: 'Plan outcome' });
  flow.heading('ESTIMATED OUTCOME IF THIS PLAN IS COMPLETED', 'Plan outcome');
  flow.paragraph(tradePlan.estimatedOutcome, { leading: 14, section: 'Plan outcome' });
  flow.heading('FINAL CONSULTANT RECOMMENDATION', 'Plan outcome');
  flow.paragraph(tradePlan.finalRecommendation, { leading: 14, section: 'Plan outcome' });

  flow.newPage('Growth Roadmap');
  flow.heading('Your Growth Roadmap', 'Growth Roadmap', 1);
  const currentPhaseIndex = growthPhaseIndex(results.overall);
  flow.paragraph(`CURRENT STAGE  |  PHASE ${currentPhaseIndex + 1} - ${growthPhases[currentPhaseIndex].name.toUpperCase()}`, { font: 'F2', color: '0.78 0.45 0.08' });
  flow.paragraph('Build in sequence: strengthen the current stage before adding the complexity of the next.', { after: 18 });
  growthPhases.forEach((phase, index) => flow.roadmapCard(phase, index === currentPhaseIndex));
  flow.heading('NEXT STEP', 'Growth Roadmap');
  flow.paragraph('Request a Strategy Session', { size: 16, font: 'F2', color: '0.04 0.07 0.12' });

  const pages = flow.pages;
  const fontObjectIds = { regular: 3 + pages.length * 2, bold: 4 + pages.length * 2 };
  const pageObjectIds = pages.map((_, index) => 3 + index * 2);
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`];
  pages.forEach((pageCommands, index) => {
    const pageId = pageObjectIds[index];
    const stream = pageCommands.join('\n');
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontObjectIds.regular} 0 R /F2 ${fontObjectIds.bold} 0 R >> >> /Contents ${pageId + 1} 0 R >>`);
    objects.push(`<< /Length ${new TextEncoder().encode(stream).length} >> stream\n${stream}\nendstream`);
  });
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(new TextEncoder().encode(pdf).length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const filename = `${(leadProfile.company || 'contractor').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-health-check-report.pdf`;
  return { blob: new Blob([pdf], { type: 'application/pdf' }), filename, pageCount: pages.length };
};
