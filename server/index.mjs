import { createReadStream, existsSync, promises as fs } from 'node:fs';
import { createServer } from 'node:http';
import net from 'node:net';
import path from 'node:path';
import tls from 'node:tls';
import { fileURLToPath } from 'node:url';
import { brand, getConfig } from './config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const envPath = path.join(rootDir, '.env');

const loadEnvFile = async () => {
  if (!existsSync(envPath)) return;
  const envFile = await fs.readFile(envPath, 'utf8');
  envFile.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) return;
    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  });
};

await loadEnvFile();

const config = getConfig();
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const sanitizeHeader = (value) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();

const jsonResponse = (response, statusCode, body) => {
  response.writeHead(statusCode, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
};

const readJsonBody = (request) => new Promise((resolve, reject) => {
  let body = '';
  request.on('data', (chunk) => {
    body += chunk;
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
      reject(new Error('Request body is too large.'));
      request.destroy();
    }
  });
  request.on('end', () => {
    try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Request body must be valid JSON.')); }
  });
  request.on('error', reject);
});

const smtpRead = (socket) => new Promise((resolve, reject) => {
  let buffer = '';
  const onData = (chunk) => {
    buffer += chunk.toString('utf8');
    const lines = buffer.split(/\r?\n/).filter(Boolean);
    const lastLine = lines.at(-1) ?? '';
    if (/^\d{3} /.test(lastLine)) {
      socket.off('data', onData);
      resolve(buffer);
    }
  };
  socket.on('data', onData);
  socket.once('error', reject);
});

const smtpCommand = async (socket, command, expectedCodes) => {
  socket.write(`${command}\r\n`);
  const response = await smtpRead(socket);
  const code = Number(response.slice(0, 3));
  if (!expectedCodes.includes(code)) throw new Error(`SMTP command failed with ${code}.`);
  return response;
};

const sendSmtpEmail = async ({ subject, text, html, replyTo, to, attachment }) => {
  if (!config.smtp.username) throw new Error('Missing required environment variable: SMTP_USER');
  if (!config.smtp.password) throw new Error('Missing required environment variable: SMTP_PASS');

  const { host, port, secure } = config.smtp;
  const from = sanitizeHeader(config.smtp.fromEmail);
  const recipient = sanitizeHeader(to);
  const mixedBoundary = `mixed-${Date.now().toString(36)}`;
  const alternativeBoundary = `content-${Date.now().toString(36)}`;
  const socket = secure ? tls.connect(port, host, { servername: host }) : net.connect(port, host);

  try {
    await smtpRead(socket);
    await smtpCommand(socket, `EHLO ${config.smtp.ehloDomain}`, [250]);
    await smtpCommand(socket, 'AUTH LOGIN', [334]);
    await smtpCommand(socket, Buffer.from(config.smtp.username).toString('base64'), [334]);
    await smtpCommand(socket, Buffer.from(config.smtp.password).toString('base64'), [235]);
    await smtpCommand(socket, `MAIL FROM:<${from}>`, [250]);
    await smtpCommand(socket, `RCPT TO:<${recipient}>`, [250, 251]);
    await smtpCommand(socket, 'DATA', [354]);

    const headers = [
      `From: ${brand.emailSenderName} <${from}>`,
      `To: ${recipient}`,
      `Subject: ${sanitizeHeader(subject)}`,
      replyTo ? `Reply-To: ${sanitizeHeader(replyTo)}` : '',
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    ].filter(Boolean).join('\r\n');
    const alternativeContent = `--${mixedBoundary}\r\nContent-Type: multipart/alternative; boundary="${alternativeBoundary}"\r\n\r\n--${alternativeBoundary}\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${text}\r\n\r\n--${alternativeBoundary}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${html}\r\n\r\n--${alternativeBoundary}--`;
    const attachmentContent = attachment ? `\r\n\r\n--${mixedBoundary}\r\nContent-Type: application/pdf; name="${sanitizeHeader(attachment.filename).replace(/["\\]/g, '-')}"\r\nContent-Disposition: attachment; filename="${sanitizeHeader(attachment.filename).replace(/["\\]/g, '-')}"\r\nContent-Transfer-Encoding: base64\r\n\r\n${attachment.base64.match(/.{1,76}/g)?.join('\r\n') ?? ''}` : '';
    const messageBody = `${headers}\r\n\r\n${alternativeContent}${attachmentContent}\r\n--${mixedBoundary}--`;
    const message = `${messageBody.replace(/(^|\r\n)\./g, '$1..')}\r\n.`;
    await smtpCommand(socket, message, [250]);
    await smtpCommand(socket, 'QUIT', [221]);
  } finally {
    socket.end();
  }
};

const formatReportEmail = (payload) => {
  const { leadProfile, results, actionPlan = [], tradePlan, completedAt } = payload;
  const completedDate = new Date(completedAt ?? Date.now()).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });
  const subjectName = leadProfile.company || leadProfile.name || 'Contractor';
  const leadLines = [
    `Name: ${leadProfile.name || 'Not provided'}`,
    `Company: ${leadProfile.company || 'Not provided'}`,
    `Email: ${leadProfile.email || 'Not provided'}`,
    `Phone: ${leadProfile.phone || 'Not provided'}`,
    `Trade: ${leadProfile.trade || 'Not provided'}`,
    `Team size: ${leadProfile.teamSize || 'Not provided'}`,
    `Monthly revenue: ${leadProfile.monthlyRevenue || 'Not provided'}`,
    `Message: ${leadProfile.message || 'Not provided'}`,
  ];
  const opportunityLines = results.opportunities.map(({ category, score, description }) => `${category}: ${score}% - ${description}`);
  const actionPlanLines = actionPlan.flatMap(({ week, title, actions }) => ['', `Week ${week}: ${title}`, ...actions.map((step, index) => `${index + 1}. ${step}`)]);
  const benchmarkLines = results.categories.map(({ category, score, industryAverage, difference }) => `${category}: Your Score ${score}% | Industry Average ${industryAverage}% | Difference ${difference >= 0 ? '+' : ''}${difference}`);
  const lines = [
    'TradeBuilt Business Health Report', '', `Date completed: ${completedDate}`, '', 'Business profile', ...leadLines, '', `Assessment score: ${results.overall}/100`, `Industry average: ${results.industryAverage}/100`, `Overall Business Ranking: ${results.ranking}`, results.rankingExplanation, '', 'Performance vs Industry', ...benchmarkLines, '', 'Top strengths', ...results.strengths.map(({ category, score }) => `${category}: ${score}%`), '', 'Top opportunities', ...opportunityLines, '', 'Your 30-Day TradeBuilt Action Plan', tradePlan?.context ?? '', '', 'Your biggest bottleneck', tradePlan?.bottleneck ?? '', '', 'Top 3 priorities', ...(tradePlan?.priorities ?? []), ...actionPlanLines, '', 'Three quick wins under 30 minutes', ...(tradePlan?.quickWins ?? []), '', 'Biggest business risk if nothing changes', tradePlan?.risk ?? '', '', 'Estimated outcome if this plan is completed', tradePlan?.estimatedOutcome ?? '',
  ];
  const section = (title, items) => `<div style="margin-top:28px"><h2 style="margin:0 0 12px;font-size:18px;color:#0f172a">${escapeHtml(title)}</h2><ul style="margin:0;padding-left:20px;color:#334155;line-height:1.7">${items.map((item) => `<li style="margin-bottom:8px">${escapeHtml(item)}</li>`).join('')}</ul></div>`;
  const actionPlanHtml = actionPlan.map(({ week, title, actions }) => `<div style="margin-top:16px;padding:20px;border-radius:14px;background:#0f172a;color:#fff"><p style="margin:0;color:#fbbf24;font-size:11px;font-weight:700;letter-spacing:1.5px">WEEK ${escapeHtml(week)}</p><h3 style="margin:7px 0 12px;font-size:17px">${escapeHtml(title)}</h3><ol style="margin:0;padding-left:20px;color:#cbd5e1;line-height:1.65">${actions.map((action) => `<li style="margin-bottom:7px">${escapeHtml(action)}</li>`).join('')}</ol></div>`).join('');
  const planSection = (title, content) => content ? `<div style="margin-top:20px;padding:18px;border-left:4px solid #fbbf24;background:#f8fafc"><h3 style="margin:0 0 8px;color:#0f172a;font-size:16px">${escapeHtml(title)}</h3><p style="margin:0;color:#475569;line-height:1.65">${escapeHtml(content)}</p></div>` : '';
  const html = `<!doctype html><html><body style="margin:0;background:#e2e8f0;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">A new TradeBuilt assessment is ready for review.</div><main style="max-width:680px;margin:24px auto;background:#fff;border-radius:18px;overflow:hidden"><header style="padding:32px 36px;background:#0f172a;color:#fff"><p style="margin:0 0 18px;color:#fbbf24;font-size:12px;font-weight:700;letter-spacing:2px">TRADEBUILT</p><h1 style="margin:0;font-size:28px">Business Health Report</h1><p style="margin:10px 0 0;color:#cbd5e1">Prepared for ${escapeHtml(subjectName)} on ${escapeHtml(completedDate)}</p></header><div style="padding:32px 36px"><div style="padding:24px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0"><p style="margin:0;color:#64748b;font-size:12px;font-weight:700;letter-spacing:1px">OVERALL BUSINESS HEALTH SCORE</p><p style="margin:8px 0 0;color:#0f172a;font-size:42px;font-weight:800">${escapeHtml(results.overall)}<span style="font-size:18px;color:#64748b">/100</span></p><p style="margin:14px 0 5px;color:#059669;font-size:12px;font-weight:700;letter-spacing:1px">OVERALL BUSINESS RANKING</p><p style="margin:0;color:#0f172a;font-size:24px;font-weight:800">${escapeHtml(results.ranking)}</p><p style="margin:8px 0 0;color:#475569;line-height:1.6">${escapeHtml(results.rankingExplanation)}</p></div>${section('Contact and business profile', leadLines)}${section('Performance vs Industry — Your Score | Industry Average | Difference', benchmarkLines)}${section('Strengths', results.strengths.map(({ category, score }) => `${category}: ${score}%`))}${section('Opportunities', opportunityLines)}<div style="margin-top:30px"><h2 style="margin:0 0 4px;font-size:22px;color:#0f172a">Your 30-Day TradeBuilt Action Plan</h2><p style="margin:0 0 12px;color:#64748b">${escapeHtml(tradePlan?.context ?? '')}</p>${planSection('Your biggest bottleneck', tradePlan?.bottleneck)}${section('Top 3 priorities', tradePlan?.priorities ?? [])}${actionPlanHtml}${section('Three quick wins under 30 minutes', tradePlan?.quickWins ?? [])}${planSection('Biggest business risk if nothing changes', tradePlan?.risk)}${planSection('Estimated outcome if this plan is completed', tradePlan?.estimatedOutcome)}</div><p style="margin:32px 0 0;padding-top:20px;border-top:1px solid #e2e8f0;color:#64748b;font-size:13px;line-height:1.6">The complete PDF report is attached for review.</p></div></main></body></html>`;

  return { subject: `TradeBuilt lead report - ${subjectName}`, text: lines.join('\n'), html, replyTo: leadProfile.email, to: config.assessmentRecipientEmail, attachment: payload.pdf };
};

const handleEmailReport = async (request, response) => {
  try {
    const payload = await readJsonBody(request);
    if (!emailPattern.test(payload.leadProfile?.email ?? '') || !payload.results?.categories?.length || !payload.pdf?.base64 || !payload.pdf?.filename) {
      jsonResponse(response, 400, { message: 'Lead profile and assessment results are required.' });
      return;
    }
    await sendSmtpEmail(formatReportEmail(payload));
    jsonResponse(response, 200, { message: 'Report email sent.' });
  } catch (error) {
    console.error(error);
    jsonResponse(response, 500, { message: 'Unable to send report email.' });
  }
};

const handleStrategySession = async (request, response) => {
  try {
    const payload = await readJsonBody(request);
    if (!payload.name?.trim() || !payload.company?.trim() || !emailPattern.test(payload.email ?? '')) {
      jsonResponse(response, 400, { message: 'Name, company, and a valid email are required.' });
      return;
    }
    const details = [`Name: ${payload.name}`, `Company: ${payload.company}`, `Email: ${payload.email}`, `Phone: ${payload.phone || 'Not supplied'}`, `Assessment score: ${payload.assessmentScore}/100`, `Priority area: ${payload.priorityArea}`, `Business context: ${payload.message || 'Not supplied'}`];
    await sendSmtpEmail({
      to: config.assessmentRecipientEmail,
      replyTo: payload.email,
      subject: `TradeBuilt strategy request - ${payload.company}`,
      text: ['A contractor has requested a TradeBuilt strategy session.', '', ...details].join('\n'),
      html: `<main style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><h1>New TradeBuilt strategy request</h1><ul>${details.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></main>`,
    });
    jsonResponse(response, 200, { message: 'Strategy session request sent.' });
  } catch (error) {
    console.error(error);
    jsonResponse(response, 500, { message: 'Unable to send strategy session request.' });
  }
};

const serveStatic = (request, response) => {
  const requestedPath = new URL(request.url, `http://${request.headers.host}`).pathname;
  const filePath = path.join(distDir, requestedPath === '/' ? 'index.html' : requestedPath);
  const safePath = filePath.startsWith(distDir) && existsSync(filePath) ? filePath : path.join(distDir, 'index.html');
  const contentTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
  response.writeHead(200, { 'Content-Type': contentTypes[path.extname(safePath)] ?? 'application/octet-stream' });
  createReadStream(safePath).pipe(response);
};

createServer(async (request, response) => {
  if (request.method === 'POST' && request.url === '/api/email-report') {
    await handleEmailReport(request, response);
    return;
  }
  if (request.method === 'POST' && request.url === '/api/strategy-session') {
    await handleStrategySession(request, response);
    return;
  }
  if (request.method === 'GET') {
    serveStatic(request, response);
    return;
  }
  jsonResponse(response, 405, { message: 'Method not allowed.' });
}).listen(config.port, () => {
  console.log(`TradeBuilt server listening on http://localhost:${config.port}`);
});
