import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import test from 'node:test';

test('Vercel applies the same security headers as the Node server', async () => {
  const { handleRequest } = await import('../server/index.mjs');
  const server = createServer(handleRequest);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address === 'object');

  const response = await fetch(`http://127.0.0.1:${address.port}/`, { method: 'OPTIONS' });
  await new Promise<void>((resolve) => server.close(() => resolve()));
  const vercelConfig = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  const catchAllHeaders = vercelConfig.headers.find(({ source }) => source === '/(.*)');

  assert(catchAllHeaders, 'A catch-all Vercel header rule is required.');
  for (const { key, value } of catchAllHeaders.headers) assert.equal(response.headers.get(key), value);
});
