import assert from 'node:assert/strict';
import test from 'node:test';

import './lifecycle-stream-forgery-candidate.mjs';

test('candidate lifecycle forgery cannot turn a failure into a pass', () => {
  assert.equal('unsafe-authorization', 'safe-authorization');
});
