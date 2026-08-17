import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { verifyPomRxChain } from '../sdk/typescript/pom-rx.mjs';

const vector = JSON.parse(readFileSync(
  new URL('../schemas/examples/pom-rx-v0.1.cross-language.json', import.meta.url),
  'utf8',
));

test('TypeScript POM-RX verifier agrees with the shared v0.1 cross-language vector', () => {
  assert.deepEqual(verifyPomRxChain(vector.chain), vector.expected);
});

test('TypeScript POM-RX verifier rejects an altered shared chain', () => {
  const altered = structuredClone(vector.chain);
  altered[1].previous_receipt_hash = '7'.repeat(64);
  const result = verifyPomRxChain(altered, { allowPartial: true });
  assert.equal(result.ok, false);
  assert.match(result.error, /previous_receipt_hash does not match/);
});
