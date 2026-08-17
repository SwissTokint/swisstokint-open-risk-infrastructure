import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sdk = readFileSync(
  new URL('../sdk/typescript/pom-rx.mjs', import.meta.url),
  'utf8',
);
const boundary = readFileSync(
  new URL('../docs/POM_RX_V0_2_STATUS_BOUNDARY.md', import.meta.url),
  'utf8',
);
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

test('v0.2 documentation cannot be mistaken for the current v0.1 implementation', () => {
  assert.match(sdk, /POM_RX_SCHEMA_VERSION = 'pom-rx\/0\.1'/);
  assert.match(boundary, /does \*\*not\*\* publish POM-RX v0\.2/);
  assert.match(
    boundary,
    /They do not by themselves prove that a\s+source was independently witnessed/,
  );
  assert.doesNotMatch(boundary, /POM-RX v0\.2 is implemented/i);
});

test('v0.2 migration gates preserve each independent evidence role', () => {
  for (const requiredRole of [
    'Declared policy and action source',
    'Witnessed preflight',
    'Exact authorisation consumed by a gate',
    'Native execution',
    'Independent observation',
    'Reconciliation',
  ]) {
    assert.ok(boundary.includes(requiredRole), `missing role: ${requiredRole}`);
  }

  assert.match(boundary, /signature substitution/);
  assert.match(boundary, /replayed consumption/);
  assert.match(boundary, /separate implementation/);
  assert.match(boundary, /wallet connection, payment,\n  order, deployment or grant submission/);
});

test('the public repository map directs readers to the v0.2 status boundary', () => {
  assert.match(readme, /POM_RX_V0_2_STATUS_BOUNDARY\.md/);
});
