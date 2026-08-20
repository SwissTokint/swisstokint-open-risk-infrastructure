import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const gatePath =
  'docs/project-management/pom-rx-core/POM_RX_POST_MERGE_ASSURANCE_GATE.md';
const policyPath =
  'docs/project-management/pom-rx-core/POM_RX_AUTOMATION_POLICY.md';
const exactMainStatusWorkflowPath =
  '.github/workflows/exact-main-ci-status.yml';

const gate = readFileSync(gatePath, 'utf8');
const policy = readFileSync(policyPath, 'utf8');
const exactMainStatusWorkflow = readFileSync(exactMainStatusWorkflowPath, 'utf8');

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

test('exact-main CI status is bound to the completed same-repository main push', () => {
  assert.match(exactMainStatusWorkflow, /workflow_run:/);
  assert.match(exactMainStatusWorkflow, /workflows:\s*\["CI"\]/);
  assert.match(exactMainStatusWorkflow, /types:\s*\[completed\]/);
  assert.match(
    exactMainStatusWorkflow,
    /github\.event\.workflow_run\.event == 'push'/,
  );
  assert.match(
    exactMainStatusWorkflow,
    /github\.event\.workflow_run\.head_branch == 'main'/,
  );
  assert.match(
    exactMainStatusWorkflow,
    /github\.event\.workflow_run\.head_repository\.full_name == github\.repository/,
  );
  assert.match(
    exactMainStatusWorkflow,
    /HEAD_SHA:\s*\$\{\{ github\.event\.workflow_run\.head_sha \}\}/,
  );
  assert.match(exactMainStatusWorkflow, /STATUS_CONTEXT:\s*pom-rx\/exact-main-ci/);
  assert.match(
    exactMainStatusWorkflow,
    /state = 'success' if conclusion == 'success' else 'failure'/,
  );
  assert.match(exactMainStatusWorkflow, /statuses\/\{sha\}/);

  assert.match(gate, /pom-rx\/exact-main-ci/);
  assert.match(gate, /exact merge SHA/i);
  assert.match(gate, /does not retroactively/i);
});

test('privileged exact-main status publisher never executes repository or upstream workflow data', () => {
  assert.match(exactMainStatusWorkflow, /permissions:\n  statuses: write\n/);
  assert.doesNotMatch(exactMainStatusWorkflow, /contents:\s*write/);
  assert.doesNotMatch(exactMainStatusWorkflow, /pull_request_target/);
  assert.doesNotMatch(exactMainStatusWorkflow, /^\s*uses:/m);
  assert.doesNotMatch(exactMainStatusWorkflow, /actions\/checkout/i);
  assert.doesNotMatch(exactMainStatusWorkflow, /download-artifact/i);
  assert.doesNotMatch(exactMainStatusWorkflow, /cache/i);

  const runBlock = exactMainStatusWorkflow.split('run: |', 2)[1];
  assert.ok(runBlock, 'status publisher must have one explicit run block');
  assert.doesNotMatch(
    runBlock,
    /\$\{\{/,
    'workflow-run values must reach the script only through validated environment variables',
  );
  assert.match(runBlock, /re\.fullmatch\(r'\[0-9a-f\]\{40\}'/);
  assert.match(
    runBlock,
    /expected_run_prefix = f'https:\/\/github\.com\/\{repository\}\/actions\/runs\/'/,
  );
  assert.match(runBlock, /run_id\.isascii\(\).*run_id\.isdigit\(\)/s);
  assert.match(runBlock, /body\.get\('url'\) != status_url/);
  assert.match(runBlock, /body\.get\('context'\) != context/);
  assert.match(runBlock, /body\.get\('state'\) != state/);
  assert.match(runBlock, /body\.get\('target_url'\) != run_url/);
});
