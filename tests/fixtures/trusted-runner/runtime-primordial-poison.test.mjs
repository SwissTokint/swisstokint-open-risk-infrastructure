import assert from 'node:assert/strict';
import test from 'node:test';

import { unsafeSnapshot } from './runtime-primordial-poison-candidate.mjs';

test('candidate runtime poisoning must not bless an unsafe snapshot', () => {
  const snapshot = unsafeSnapshot();
  assert.equal(Object.getPrototypeOf(snapshot), null);
  assert.equal(Object.isFrozen(snapshot), true);
});
