import assert from 'node:assert/strict';
import test from 'node:test';

test('first later trusted test remains base-owned', () => {
  assert.fail('candidate loader replaced the first later trusted test');
});
