import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const gatePath =
  'docs/project-management/pom-rx-core/POM_RX_POST_MERGE_ASSURANCE_GATE.md';
const policyPath =
  'docs/project-management/pom-rx-core/POM_RX_AUTOMATION_POLICY.md';

const gate = readFileSync(gatePath, 'utf8');
const policy = readFileSync(policyPath, 'utf8');

test('post-merge assurance includes all mandatory control families', () => {
  for (const required of [
    'SpecKit reconciliation',
    'Skeptical/falsification pass',
    'Security audit',
    'Code-quality review',
    'Optimization review',
    'Integration/regression evidence',
    'POST_MERGE_ASSURANCE_PASS',
    'POST_MERGE_ASSURANCE_CONDITIONAL',
    'POST_MERGE_ASSURANCE_BLOCK',
  ]) {
    assert.match(gate, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('post-merge assurance is read-only and cannot bypass repair PR review', () => {
  assert.match(gate, /post-merge assurance is read-only/i);
  assert.match(gate, /never patched directly on\s+`main`/i);
  assert.match(gate, /repair branch\/PR/i);
  assert.match(gate, /normal pre-merge five-stage gate/i);
});

test('Prime automation policy requires post-merge assurance after every non-trivial merge', () => {
  assert.match(policy, /POM_RX_POST_MERGE_ASSURANCE_GATE\.md/);
  assert.match(policy, /after every non-trivial merge/i);
  assert.match(policy, /SpecKit.*skeptical.*security.*code-quality.*optimization/s);
  assert.match(policy, /POST_MERGE_ASSURANCE_PASS/);
  assert.match(policy, /must not be used as trusted\s+evidence/i);
});
