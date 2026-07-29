import { createReadStream, existsSync, promises as fs } from 'node:fs';
import { createServer } from 'node:http';
import net from 'node:net';
import path from 'node:path';
import tls from 'node:tls';
import { fileURLToPath } from 'node:url';

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

const PORT = Number(process.env.PORT ?? 4174);
const MAX_BODY_BYTES = 1024 * 1024;
const requiredEnv = ['SMTP_USER', 'SMTP_PASS', 'REPORT_RECIPIENT_EMAIL'];
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

const sendSmtpEmail = async ({ subject, text, html, replyTo }) => {
  for (const key of requiredEnv) {
    if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
  }

  const host = process.env.SMTP_HOST ?? 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT ?? 465);
  const secure = (process.env.SMTP_SECURE ?? 'true') !== 'false';
  const from = sanitizeHeader(process.env.REPORT_FROM_EMAIL ?? process.env.SMTP_USER);
  const to = sanitizeHeader(process.env.REPORT_RECIPIENT_EMAIL);
  const boundary = `report-${Date.now().toString(36)}`;
  const socket = secure ? tls.connect(port, host, { servername: host }) : net.connect(port, host);

  try {
    await smtpRead(socket);
    await smtpCommand(socket, `EHLO ${process.env.SMTP_EHLO_DOMAIN ?? 'contractor-health-check.local'}`, [250]);
    await smtpCommand(socket, 'AUTH LOGIN', [334]);
    await smtpCommand(socket, Buffer.from(process.env.SMTP_USER).toString('base64'), [334]);
    await smtpCommand(socket, Buffer.from(process.env.SMTP_PASS).toString('base64'), [235]);
    await smtpCommand(socket, `MAIL FROM:<${from}>`, [250]);
    await smtpCommand(socket, `RCPT TO:<${to}>`, [250, 251]);
    await smtpCommand(socket, 'DATA', [354]);

    const headers = [
      `From: TradeBuilt Contractor Health Check <${from}>`,
      `To: ${to}`,
      `Subject: ${sanitizeHeader(subject)}`,
      replyTo ? `Reply-To: ${sanitizeHeader(replyTo)}` : '',
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ].filter(Boolean).join('\r\n');
    const message = `${headers}\r\n\r\n--${boundary}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${text}\r\n\r\n--${boundary}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${html}\r\n\r\n--${boundary}--\r\n.`;
    await smtpCommand(socket, message, [250]);
    await smtpCommand(socket, 'QUIT', [221]);
  } finally {
    socket.end();
  }
};

const formatReportEmail = (payload) => {
  const { leadProfile, results, recommendedNextSteps = [], completedAt } = payload;
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
  const lines = [
    'TradeBuilt Contractor Health Check Report', '', `Date completed: ${completedDate}`, '', 'Lead details', ...leadLines, '', `Assessment score: ${results.overall}/100`, '', 'Category scores', ...results.categories.map(({ category, score }) => `${category}: ${score}%`), '', 'Top strengths', ...results.strengths.map(({ category, score }) => `${category}: ${score}%`), '', 'Top opportunities', ...opportunityLines, '', 'Recommended next steps', ...recommendedNextSteps.map((step, index) => `${index + 1}. ${step}`),
  ];
  const section = (title, items) => `<h2>${escapeHtml(title)}</h2><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  const html = `<main><h1>TradeBuilt Contractor Health Check Report</h1><p><strong>Date completed:</strong> ${escapeHtml(completedDate)}</p>${section('Lead details', leadLines)}<h2>Assessment score</h2><p><strong>${escapeHtml(results.overall)}/100</strong></p>${section('Category scores', results.categories.map(({ category, score }) => `${category}: ${score}%`))}${section('Top strengths', results.strengths.map(({ category, score }) => `${category}: ${score}%`))}${section('Top opportunities', opportunityLines)}${section('Recommended next steps', recommendedNextSteps.map((step, index) => `${index + 1}. ${step}`))}</main>`;

  return { subject: `Contractor Health Check Report - ${subjectName}`, text: lines.join('\n'), html, replyTo: leadProfile.email };
};

const handleEmailReport = async (request, response) => {
  try {
    const payload = await readJsonBody(request);
    if (!payload.leadProfile?.email || !payload.results?.categories?.length) {
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
  if (request.method === 'GET') {
    serveStatic(request, response);
    return;
  }
  jsonResponse(response, 405, { message: 'Method not allowed.' });
}).listen(PORT, () => {
  console.log(`Contractor Health Check server listening on http://localhost:${PORT}`);
});
