import assert from 'node:assert/strict';
import test from 'node:test';

test('second later trusted test remains base-owned', () => {
  assert.fail('candidate loader replaced the second later trusted test');
});
