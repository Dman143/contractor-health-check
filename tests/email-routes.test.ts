import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import net from 'node:net';
import test from 'node:test';

test('email routes use production-compatible SMTP variables and deliver to the intended recipients', async () => {
  const recipients: string[] = [];
  const smtpServer = net.createServer((socket) => {
    socket.write('220 test-smtp ESMTP\r\n');
    let buffer = '';
    let authStep = 0;
    let receivingData = false;
    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      if (receivingData) {
        if (buffer.includes('\r\n.\r\n')) {
          buffer = '';
          receivingData = false;
          socket.write('250 accepted\r\n');
        }
        return;
      }
      while (buffer.includes('\r\n')) {
        const lineEnd = buffer.indexOf('\r\n');
        const line = buffer.slice(0, lineEnd);
        buffer = buffer.slice(lineEnd + 2);
        if (line.startsWith('EHLO ')) socket.write('250 hello\r\n');
        else if (line === 'AUTH LOGIN') { authStep = 1; socket.write('334 username\r\n'); }
        else if (authStep === 1) { authStep = 2; socket.write('334 password\r\n'); }
        else if (authStep === 2) { authStep = 0; socket.write('235 authenticated\r\n'); }
        else if (line.startsWith('MAIL FROM:')) socket.write('250 sender ok\r\n');
        else if (line.startsWith('RCPT TO:')) { recipients.push(line); socket.write('250 recipient ok\r\n'); }
        else if (line === 'DATA') { receivingData = true; buffer = ''; socket.write('354 send data\r\n'); }
        else if (line === 'QUIT') { socket.write('221 bye\r\n'); socket.end(); }
      }
    });
  });
  await new Promise<void>((resolve) => smtpServer.listen(0, '127.0.0.1', resolve));
  const smtpAddress = smtpServer.address();
  assert(smtpAddress && typeof smtpAddress === 'object');

  process.env.SMTP_HOST = '127.0.0.1';
  process.env.SMTP_PORT = String(smtpAddress.port);
  process.env.SMTP_SECURE = 'false';
  process.env.SMTP_USER = 'smtp-user@example.com';
  process.env.SMTP_PASS = 'app-password';
  process.env.SMTP_FROM_EMAIL = 'sender@example.com';
  process.env.SMTP_EHLO_DOMAIN = 'tradebuilt.pro';
  process.env.TRADEBUILT_RECIPIENT_EMAIL = 'advisor@example.com';
  const { handleRequest, smtpRuntimeReport } = await import(`../server/index.mjs?email-test=${Date.now()}`);
  assert.deepEqual(smtpRuntimeReport(), Object.fromEntries([
    'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM_EMAIL', 'SMTP_EHLO_DOMAIN', 'TRADEBUILT_RECIPIENT_EMAIL',
  ].map((name) => [name, { present: true, validFormat: true, loadedAtRuntime: true }])));
  const app = createServer(handleRequest);
  await new Promise<void>((resolve) => app.listen(0, '127.0.0.1', resolve));
  const appAddress = app.address();
  assert(appAddress && typeof appAddress === 'object');
  const post = (path: string, body: unknown) => fetch(`http://127.0.0.1:${appAddress.port}${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });

  try {
    const reportResponse = await post('/api/email-report?source=production', {
      leadProfile: { name: 'Pat', company: 'Pat Plumbing', email: 'pat@example.com' },
      results: { overall: 72, industryAverage: 60, ranking: 'Strong', rankingExplanation: 'Test', categories: [{ category: 'Pricing', score: 72, industryAverage: 60, difference: 12 }] },
      pdf: { filename: 'tradebuilt-report.pdf', base64: Buffer.from('pdf').toString('base64') },
    });
    assert.equal(reportResponse.status, 200);

    const strategyResponse = await post('/api/strategy-session/', {
      name: 'Pat', company: 'Pat Plumbing', email: 'pat@example.com', phone: '', message: 'Growth', assessmentScore: 72, priorityArea: 'Pricing',
    });
    assert.equal(strategyResponse.status, 200);
    assert.deepEqual(recipients, [
      'RCPT TO:<pat@example.com>',
      'RCPT TO:<advisor@example.com>',
      'RCPT TO:<advisor@example.com>',
    ]);
  } finally {
    await new Promise<void>((resolve) => app.close(() => resolve()));
    await new Promise<void>((resolve) => smtpServer.close(() => resolve()));
  }
});
