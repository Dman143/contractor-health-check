import { createReadStream, existsSync, promises as fs } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
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
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const MAX_PDF_BASE64_BYTES = 7 * 1024 * 1024;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const sanitizeHeader = (value) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
const errorMessage = (error) => error instanceof Error ? error.message : String(error);
const requestErrorMessages = ['Content-Type must be application/json.', 'Request body must be valid JSON.', 'Request body is too large.'];


const jsonResponse = (response, statusCode, body) => {
  response.writeHead(statusCode, { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
};

const readJsonBody = (request) => new Promise((resolve, reject) => {
  if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) {
    reject(new Error('Content-Type must be application/json.'));
    return;
  }
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

const hostnamePattern = /^(?=.{1,253}$)(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)*[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i;
const smtpHostPattern = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const smtpVariableChecks = () => ({
  SMTP_HOST: Boolean(config.smtp.host) && (hostnamePattern.test(config.smtp.host) || smtpHostPattern.test(config.smtp.host)),
  SMTP_PORT: Number.isInteger(config.smtp.port) && config.smtp.port >= 1 && config.smtp.port <= 65535,
  SMTP_SECURE: ['true', 'false'].includes(config.smtp.secureRaw),
  SMTP_USER: Boolean(config.smtp.username) && emailPattern.test(config.smtp.username),
  SMTP_PASS: Boolean(config.smtp.password) && !/[\r\n]/.test(config.smtp.password),
  SMTP_FROM_EMAIL: Boolean(config.smtp.fromEmail) && emailPattern.test(config.smtp.fromEmail),
  SMTP_EHLO_DOMAIN: Boolean(config.smtp.ehloDomain) && hostnamePattern.test(config.smtp.ehloDomain),
  TRADEBUILT_RECIPIENT_EMAIL: Boolean(config.assessmentRecipientEmail) && emailPattern.test(config.assessmentRecipientEmail),
});

export const smtpRuntimeReport = () => Object.fromEntries(Object.entries(smtpVariableChecks()).map(([name, valid]) => [name, {
  present: Boolean(process.env[name]?.trim()),
  validFormat: valid,
  loadedAtRuntime: valid && Boolean(config.smtp[name === 'SMTP_HOST' ? 'host' : name === 'SMTP_PORT' ? 'port' : name === 'SMTP_SECURE' ? 'secureRaw' : name === 'SMTP_USER' ? 'username' : name === 'SMTP_PASS' ? 'password' : name === 'SMTP_FROM_EMAIL' ? 'fromEmail' : name === 'SMTP_EHLO_DOMAIN' ? 'ehloDomain' : undefined] ?? config.assessmentRecipientEmail),
}]));

const validateSmtpEnvironment = () => {
  const report = smtpRuntimeReport();
  const failures = Object.entries(report).filter(([, result]) => !result.present || !result.validFormat || !result.loadedAtRuntime);
  if (failures.length) throw new Error(failures.map(([name, result]) => `${name}: ${!result.present ? 'missing' : !result.validFormat ? 'invalid format' : 'not loaded at runtime'}`).join('; '));
};

const smtpErrorDetail = (error) => ({
  name: error instanceof Error ? error.name : typeof error,
  message: errorMessage(error),
  code: error?.code,
  command: error?.command,
  response: error?.response,
  responseCode: error?.responseCode,
  errno: error?.errno,
  syscall: error?.syscall,
  address: error?.address,
  port: error?.port,
  stack: error instanceof Error ? error.stack : undefined,
});

const sendSmtpEmail = async ({ subject, text, html, replyTo, to, bcc, attachment }) => {
  validateSmtpEnvironment();
  const from = sanitizeHeader(config.smtp.fromEmail);
  const recipient = sanitizeHeader(to);
  const blindCopy = sanitizeHeader(bcc);
  const envelopeRecipients = [...new Set([recipient, blindCopy].filter(Boolean))];
  if (!envelopeRecipients.length || envelopeRecipients.some((address) => !emailPattern.test(address))) throw new Error('A valid email recipient is required.');
  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: { user: config.smtp.username, pass: config.smtp.password },
    name: config.smtp.ehloDomain,
    connectionTimeout: 30_000,
    greetingTimeout: 30_000,
    socketTimeout: 30_000,
  });
  try {
    console.error('[SMTP verification started]', { environment: smtpRuntimeReport() });
    await transporter.verify();
    console.error('[SMTP verification succeeded]', { host: config.smtp.host, port: config.smtp.port });
    const info = await transporter.sendMail({
      from: { name: brand.emailSenderName, address: from }, to: recipient, bcc: blindCopy || undefined,
      replyTo: replyTo ? sanitizeHeader(replyTo) : undefined, subject: sanitizeHeader(subject), text, html,
      attachments: attachment ? [{ filename: sanitizeHeader(attachment.filename).replace(/["\\]/g, '-'), content: attachment.base64, encoding: 'base64', contentType: 'application/pdf' }] : [],
    });
    console.error('[SMTP delivery succeeded]', { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected, response: info.response });
    return info;
  } catch (error) {
    console.error('[SMTP connection/authentication/delivery failed]', smtpErrorDetail(error));
    throw error;
  } finally {
    transporter.close();
  }
};

const formatReviewEmail = (payload) => {
  const { leadProfile, results, context = {}, answers = [], completedAt, crewQuestionShown } = payload;
  const completedDate = new Date(completedAt ?? Date.now()).toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' });
  const trackLines = results.tracks.map(({ track, score }) => `${track}: ${score}/100`);
  const answerLines = answers.map(({ questionId, question, answer }) => `${questionId} — ${question}\nAnswer: ${answer ?? 'Not applicable'}`);
  const profileLines = [
    `Name: ${leadProfile.name}`, `Business: ${leadProfile.company || 'Not supplied'}`, `Email: ${leadProfile.email}`,
    `Phone: ${leadProfile.phone || 'Not supplied'}`, `Trade: ${leadProfile.trade || 'Not supplied'}`,
    `Desired model: ${context.desiredModel || 'Not supplied'}`, `Team: ${context.teamSituation || 'Not supplied'}`,
    `Owner reliance: ${context.ownerReliance || 'Not supplied'}`, `Priority: ${context.priority || 'Not supplied'}`,
    `Crew question shown: ${crewQuestionShown ? 'Yes' : 'No'}`, `Applicable answers: ${answers.length}`,
  ];
  const lines = ['TradeBuilt Contractor Health Check — internal review', results.assessmentVersion, `Completed: ${completedDate} UTC`, '', ...profileLines, '', `Internal score: ${results.overall}/100`, ...trackLines, '', 'Responses', ...answerLines];
  const rows = answers.map(({ questionId, question, answer }) => `<tr><td style="padding:8px;border-bottom:1px solid #ddd"><strong>${escapeHtml(questionId)}</strong><br>${escapeHtml(question)}</td><td style="padding:8px;border-bottom:1px solid #ddd">${escapeHtml(answer ?? 'Not applicable')}</td></tr>`).join('');
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;max-width:760px;margin:24px auto;color:#171717"><p style="color:#ff6b00;font-weight:800">TRADE<span style="color:#171717">BUILT</span></p><h1>Health Check ready for personal review</h1><p>${profileLines.map(escapeHtml).join('<br>')}</p><h2>Internal scoring</h2><p><strong>${escapeHtml(results.overall)}/100</strong></p><ul>${trackLines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul><h2>Responses</h2><table style="border-collapse:collapse;width:100%">${rows}</table></body></html>`;
  return { subject: `Health Check review — ${leadProfile.company || leadProfile.name}`, text: lines.join('\n'), html, replyTo: leadProfile.email, to: config.assessmentRecipientEmail, attachment: payload.pdf };
};

const formatContractorReceipt = ({ leadProfile }) => {
  const guideUrl = `https://${brand.domain}/tradebuilt-quick-guide.pdf`;
  const text = ['Health Check received', '', `Hi ${leadProfile.name},`, '', 'Thanks for completing the TradeBuilt Contractor Health Check.', '', 'I’ll personally review your answers and get back to you with a few areas I think are worth looking at.', '', 'In the meantime, I’ve put together a short read covering five things every contractor should have under control.', '', 'Download the TradeBuilt Quick Guide:', guideUrl, '', 'TradeBuilt', 'Think Before You Build.'];
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;max-width:640px;margin:24px auto;color:#171717"><h1>Health Check received</h1><p>Hi ${escapeHtml(leadProfile.name)},</p><p>Thanks for completing the TradeBuilt Contractor Health Check.</p><p>I’ll personally review your answers and get back to you with a few areas I think are worth looking at.</p><p>In the meantime, I’ve put together a short read covering five things every contractor should have under control.</p><p><a href="${guideUrl}" style="display:inline-block;padding:14px 18px;background:#ff6b00;color:#111;font-weight:800;text-decoration:none">Download the TradeBuilt Quick Guide</a></p><p><strong>TradeBuilt</strong><br>Think Before You Build.</p></body></html>`;
  return { subject: 'Your TradeBuilt Health Check has been received', text: text.join('\n'), html, replyTo: config.assessmentRecipientEmail, to: leadProfile.email };
};

const logEmailRoute = (route, request, payload = {}) => {
  console.error('[Email route invoked]', {
    route,
    method: request.method,
    url: request.url,
    requestId: request.headers['x-request-id'] || request.headers['x-vercel-id'] || request.headers['x-render-request-id'],
    smtpEnvironment: smtpRuntimeReport(),
    ...payload,
  });
};

const handleEmailReport = async (request, response) => {
  const requestId = request.headers['x-request-id'] || request.headers['x-vercel-id'] || request.headers['x-render-request-id'] || crypto.randomUUID();
  const startedAt = Date.now();
  try {
    const payload = await readJsonBody(request);
    logEmailRoute('email-report', request, { attachmentBytes: payload.pdf?.base64?.length ?? 0 });
    const expectedAnswers = payload.crewQuestionShown ? 20 : 19;
    if (!emailPattern.test(payload.leadProfile?.email ?? '') || payload.results?.tracks?.length !== 6 || payload.answers?.length !== expectedAnswers || !payload.pdf?.base64 || payload.pdf.base64.length > MAX_PDF_BASE64_BYTES || !/^[a-z0-9][a-z0-9._-]*\.pdf$/i.test(payload.pdf?.filename ?? '')) {
      jsonResponse(response, 400, { message: 'Lead profile and assessment results are required.' });
      return;
    }
    await sendSmtpEmail(formatReviewEmail(payload));
    await sendSmtpEmail(formatContractorReceipt(payload));
    console.error('[Email report route succeeded]', { requestId, durationMs: Date.now() - startedAt });
    jsonResponse(response, 200, { message: 'Report email sent.', requestId });
  } catch (error) {
    const isBadRequest = requestErrorMessages.includes(error.message);
    if (!isBadRequest) console.error('[Email report route failed]', { requestId, durationMs: Date.now() - startedAt, smtpError: smtpErrorDetail(error) });
    jsonResponse(response, isBadRequest ? 400 : 500, { message: isBadRequest ? error.message : 'Unable to send report email.', requestId, ...(config.environment === 'development' && !isBadRequest ? { error: smtpErrorDetail(error) } : {}) });
  }
};

const handleEngineIngestion = async (request, response) => {
  try {
    const payload = await readJsonBody(request);
    if (payload.assessmentVersion !== 'tradebuilt-contractor-health-check-v2.0' || payload.product !== 'TRADEBUILT' || !payload.submissionId || !Array.isArray(payload.answers)) {
      jsonResponse(response, 400, { message: 'A valid TradeBuilt V2 submission is required.' }); return;
    }
    const endpoint = process.env.TRADEBUILT_ENGINE_INGESTION_URL;
    if (!endpoint) { jsonResponse(response, 202, { accepted: false, nonBlocking: true }); return; }
    let delivered = false;
    for (let attempt = 0; attempt < 2 && !delivered; attempt += 1) {
      try {
        const upstream = await fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json','Idempotency-Key':`${payload.assessmentVersion}:${payload.submissionId}`}, body:JSON.stringify(payload), signal:AbortSignal.timeout(8_000) });
        delivered = upstream.ok || upstream.status === 409;
      } catch { /* completion remains non-blocking */ }
    }
    jsonResponse(response, 202, { accepted: delivered, nonBlocking: true });
  } catch (error) { jsonResponse(response, 202, { accepted:false, nonBlocking:true, message:errorMessage(error) }); }
};

const serveStatic = (request, response) => {
  const requestedPath = new URL(request.url, `http://${request.headers.host}`).pathname;
  const filePath = path.join(distDir, requestedPath === '/' ? 'index.html' : requestedPath);
  const safePath = filePath.startsWith(`${distDir}${path.sep}`) && existsSync(filePath) ? filePath : path.join(distDir, 'index.html');
  const contentTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
  const isHtml = path.extname(safePath) === '.html';
  response.writeHead(200, { 'Cache-Control': isHtml ? 'no-cache' : 'public, max-age=31536000, immutable', 'Content-Type': `${contentTypes[path.extname(safePath)] ?? 'application/octet-stream'}${isHtml ? '; charset=utf-8' : ''}` });
  createReadStream(safePath).pipe(response);
};

export const handleRequest = async (request, response) => {
  response.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  const pathname = new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname.replace(/\/$/, '') || '/';
  if (request.method === 'POST' && pathname === '/api/email-report') {
    await handleEmailReport(request, response);
    return;
  }
  if (request.method === 'POST' && pathname === '/api/engine-ingestion') {
    await handleEngineIngestion(request, response);
    return;
  }
  if (request.method === 'GET') {
    serveStatic(request, response);
    return;
  }
  jsonResponse(response, 405, { message: 'Method not allowed.' });
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createServer(handleRequest).listen(config.port, () => {
    console.log(`TradeBuilt server listening on http://localhost:${config.port}`);
    console.error('[SMTP runtime environment]', smtpRuntimeReport());
  });
}
