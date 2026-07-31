import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PERFECT_SCORE_INTEGRITY_MESSAGE } from '../src/reportIntegrity.ts';

test('perfect-score guidance is respectful, congratulatory, and validation-focused everywhere', async () => {
  const message = PERFECT_SCORE_INTEGRITY_MESSAGE.join(' ');

  assert.match(message, /exceptional achievement and is extremely uncommon/);
  assert.match(message, /congratulations.*exceptional operation/);
  assert.match(message, /independently validated in practice/);
  assert.match(message, /Honest self-assessment/);
  assert.doesNotMatch(message, /without critically evaluating|retaking the assessment honestly/i);

  const emailSource = await readFile(new URL('../server/index.mjs', import.meta.url), 'utf8');
  PERFECT_SCORE_INTEGRITY_MESSAGE.forEach((paragraph) => assert.ok(
    emailSource.includes(paragraph),
    `Email report is missing perfect-score guidance: ${paragraph}`,
  ));
});
