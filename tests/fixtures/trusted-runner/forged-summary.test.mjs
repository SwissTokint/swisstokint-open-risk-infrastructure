import assert from 'node:assert/strict';
import test from 'node:test';

import './forged-summary-candidate.mjs';

test('the assertion after the candidate import must execute', () => {
  assert.fail('the forged summary must never suppress this failure');
});
