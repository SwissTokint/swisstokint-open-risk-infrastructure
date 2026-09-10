import assert from 'node:assert/strict';
import test from 'node:test';

import { returnArrayAfterPoisoningIncludes } from './runtime-instance-poison-candidate.mjs';

test('post-test integrity rejects poisoned instance dispatch', () => {
  const result = returnArrayAfterPoisoningIncludes();
  assert.equal(result.includes('trusted-value'), true);
});
