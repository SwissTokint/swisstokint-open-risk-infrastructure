import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import './builtin-export-poison-candidate.mjs';

test('candidate cannot fabricate trusted file evidence through builtins', () => {
  assert.notEqual(readFileSync(import.meta.filename, 'utf8'), 'fabricated trusted contents');
});
