import assert from 'node:assert/strict';
import test from 'node:test';

try {
  process.emit = () => true;
} catch {
  // A trusted runner must prevent own-property lifecycle shadowing.
}

test('process emit shadowing cannot suppress a trusted failure', () => {
  assert.fail('candidate process.emit shadow suppressed the trusted runner');
});
