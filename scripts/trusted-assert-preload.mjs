import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const requiredAssert = createRequire(import.meta.url)('node:assert/strict');

if (requiredAssert !== assert || assert.strict !== assert) {
  throw new Error('trusted strict-assert identity is inconsistent');
}

Object.freeze(assert);

if (!Object.isFrozen(assert)) {
  throw new Error('trusted strict-assert object did not freeze');
}
