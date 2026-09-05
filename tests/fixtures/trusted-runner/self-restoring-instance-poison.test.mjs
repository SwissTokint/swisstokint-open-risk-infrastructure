import assert from 'node:assert/strict';
import test from 'node:test';

import {
  returnArrayAfterSelfRestoringPoison,
} from './self-restoring-instance-poison-candidate.mjs';

test('a one-shot poisoned observation must not produce trusted evidence', () => {
  const result = returnArrayAfterSelfRestoringPoison();
  assert.equal(result.includes('trusted-value'), true);
});
