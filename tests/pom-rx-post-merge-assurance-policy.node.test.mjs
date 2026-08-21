import assert from 'node:assert/strict';
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
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

function extractPublisherPython() {
  const match = exactMainStatusWorkflow.match(
    /python3 - <<'PY'\n([\s\S]*?)\n          PY/,
  );
  assert.ok(match, 'publisher Python block must remain extractable for behavioral tests');
  return match[1]
    .split('\n')
    .map((line) => (line.startsWith('          ') ? line.slice(10) : line))
    .join('\n');
}

const publisherPython = extractPublisherPython();
const repository = 'SwissTokint/swisstokint-open-risk-infrastructure';
const headSha = '0123456789abcdef0123456789abcdef01234567';

function workflowRun({
  id,
  runNumber,
  runAttempt,
  status,
  conclusion,
}) {
  return {
    id,
    run_number: runNumber,
    run_attempt: runAttempt,
    status,
    conclusion,
    event: 'push',
    head_branch: 'main',
    head_sha: headSha,
    head_repository: { full_name: repository },
    html_url: `https://github.com/${repository}/actions/runs/${id}`,
  };
}

function runPublisher({
  eventRun,
  listing,
  workflowPath = '.github/workflows/ci.yml',
}) {
  const temp = mkdtempSync(join(tmpdir(), 'pom-rx-exact-main-status-'));
  const ghPath = join(temp, 'gh');
  const postLog = join(temp, 'post.jsonl');
  const fakeGh = `#!/usr/bin/env python3
import json
import os
import sys

args = sys.argv[1:]
if len(args) < 4 or args[0] != 'api' or args[1] != '--method':
    raise SystemExit(90)
method = args[2]
path = args[3]
if method == 'GET':
    expected = {
        'branch=main',
        'event=push',
        'head_sha=' + os.environ['HEAD_SHA'],
        'per_page=100',
    }
    if not expected.issubset(set(args)):
        raise SystemExit(91)
    if path != 'repos/' + os.environ['HEAD_REPOSITORY'] + '/actions/workflows/ci.yml/runs':
        raise SystemExit(92)
    sys.stdout.write(os.environ['FAKE_GH_LISTING'])
elif method == 'POST':
    expected_path = 'repos/' + os.environ['HEAD_REPOSITORY'] + '/statuses/' + os.environ['HEAD_SHA']
    if path != expected_path:
        raise SystemExit(93)
    payload = json.load(sys.stdin)
    with open(os.environ['FAKE_GH_POST_LOG'], 'a', encoding='utf-8') as handle:
        handle.write(json.dumps(payload, sort_keys=True) + '\\n')
    sys.stdout.write(json.dumps({
        'id': 424242,
        'url': 'https://api.github.com/' + path,
        'context': payload['context'],
        'state': payload['state'],
        'target_url': payload['target_url'],
    }))
else:
    raise SystemExit(94)
`;
  writeFileSync(ghPath, fakeGh, 'utf8');
  chmodSync(ghPath, 0o755);

  const result = spawnSync('python3', ['-c', publisherPython], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${temp}:${process.env.PATH ?? ''}`,
      HEAD_SHA: headSha,
      HEAD_REPOSITORY: repository,
      UPSTREAM_WORKFLOW_PATH: workflowPath,
      RUN_ID: String(eventRun.id),
      RUN_NUMBER: String(eventRun.run_number),
      RUN_ATTEMPT: String(eventRun.run_attempt),
      RUN_STATUS: eventRun.status,
      RUN_CONCLUSION: eventRun.conclusion ?? '',
      RUN_URL: eventRun.html_url,
      STATUS_CONTEXT: 'pom-rx/exact-main-ci',
      GH_TOKEN: 'synthetic-test-token',
      FAKE_GH_LISTING: JSON.stringify(listing),
      FAKE_GH_POST_LOG: postLog,
    },
  });

  const posts = existsSync(postLog)
    ? readFileSync(postLog, 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    : [];
  rmSync(temp, { recursive: true, force: true });
  return { result, posts };
}

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

test('exact-main CI status is bound to the canonical same-repository main push', () => {
  assert.match(exactMainStatusWorkflow, /workflow_run:/);
  assert.match(exactMainStatusWorkflow, /workflows:\s*\["CI"\]/);
  assert.match(exactMainStatusWorkflow, /types:\s*\[in_progress, completed\]/);
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
    /github\.event\.workflow_run\.path == '\.github\/workflows\/ci\.yml'/,
  );
  assert.match(
    exactMainStatusWorkflow,
    /github\.event\.workflow_run\.path == '\.github\/workflows\/ci\.yml@main'/,
  );
  for (const binding of [
    /HEAD_SHA:\s*\$\{\{ github\.event\.workflow_run\.head_sha \}\}/,
    /RUN_ID:\s*\$\{\{ github\.event\.workflow_run\.id \}\}/,
    /RUN_NUMBER:\s*\$\{\{ github\.event\.workflow_run\.run_number \}\}/,
    /RUN_ATTEMPT:\s*\$\{\{ github\.event\.workflow_run\.run_attempt \}\}/,
    /RUN_STATUS:\s*\$\{\{ github\.event\.workflow_run\.status \}\}/,
    /UPSTREAM_WORKFLOW_PATH:\s*\$\{\{ github\.event\.workflow_run\.path \}\}/,
  ]) {
    assert.match(exactMainStatusWorkflow, binding);
  }
  assert.match(exactMainStatusWorkflow, /STATUS_CONTEXT:\s*pom-rx\/exact-main-ci/);
  assert.match(exactMainStatusWorkflow, /state = 'pending'/);
  assert.match(
    exactMainStatusWorkflow,
    /state = 'success' if conclusion == 'success' else 'failure'/,
  );
  assert.match(exactMainStatusWorkflow, /statuses\/\{sha\}/);

  assert.match(gate, /pom-rx\/exact-main-ci/);
  assert.match(gate, /exact merge SHA/i);
  assert.match(gate, /does not retroactively/i);
  assert.match(gate, /observation\/write interval/i);
  assert.match(gate, /decision-time revalidation/i);
  assert.match(gate, /no newer queued or in-progress canonical run visible/i);
});

test('privileged exact-main status publisher executes no repository or upstream workflow data', () => {
  assert.match(
    exactMainStatusWorkflow,
    /permissions:\n  actions: read\n  statuses: write\n/,
  );
  assert.doesNotMatch(exactMainStatusWorkflow, /actions:\s*write/);
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
  assert.match(runBlock, /workflow_path not in/);
  assert.match(runBlock, /'\.github\/workflows\/ci\.yml'/);
  assert.match(runBlock, /'\.github\/workflows\/ci\.yml@main'/);
  assert.match(runBlock, /actions\/workflows\/ci\.yml\/runs/);
  assert.match(runBlock, /'head_sha=' \+ sha|'head_sha=\{sha\}'|f'head_sha=\{sha\}'/);
  assert.match(runBlock, /type\(total_count\) is not int/);
  assert.match(runBlock, /type\(value\) is int and value >= 1/);
  assert.match(runBlock, /duplicate run identity/);
  assert.match(runBlock, /total_count > 100/);
  assert.match(runBlock, /key=lambda entry: \(entry\[0\], entry\[1\]\)/);
  assert.match(runBlock, /stale exact-main workflow_run event ignored/);
  assert.match(runBlock, /status_url = f'https:\/\/api\.github\.com\/\{status_path\}'/);
  assert.match(runBlock, /status_id = body\.get\('id'\)/);
  assert.match(runBlock, /type\(status_id\) is not int/);
  assert.match(runBlock, /body\.get\('url'\) != status_url/);
  assert.match(runBlock, /body\.get\('context'\) != context/);
  assert.match(runBlock, /body\.get\('state'\) != state/);
  assert.match(runBlock, /body\.get\('target_url'\) != run_url/);
});

test(
  'latest exact-main completion publishes its exact successful status',
  { skip: process.platform === 'win32' },
  () => {
    const current = workflowRun({
      id: 200,
      runNumber: 40,
      runAttempt: 1,
      status: 'completed',
      conclusion: 'success',
    });
    const { result, posts } = runPublisher({
      eventRun: current,
      listing: { total_count: 1, workflow_runs: [current] },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(posts.length, 1);
    assert.equal(posts[0].state, 'success');
    assert.equal(posts[0].target_url, current.html_url);
  },
);

test(
  'canonical @main workflow path form is accepted without broadening to another file',
  { skip: process.platform === 'win32' },
  () => {
    const current = workflowRun({
      id: 200,
      runNumber: 40,
      runAttempt: 1,
      status: 'completed',
      conclusion: 'success',
    });
    const { result, posts } = runPublisher({
      eventRun: current,
      listing: { total_count: 1, workflow_runs: [current] },
      workflowPath: '.github/workflows/ci.yml@main',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(posts.length, 1);
    assert.equal(posts[0].state, 'success');
  },
);

test(
  'older successful run cannot overwrite a newer failed run on the same SHA',
  { skip: process.platform === 'win32' },
  () => {
    const older = workflowRun({
      id: 200,
      runNumber: 40,
      runAttempt: 1,
      status: 'completed',
      conclusion: 'success',
    });
    const newer = workflowRun({
      id: 201,
      runNumber: 41,
      runAttempt: 1,
      status: 'completed',
      conclusion: 'failure',
    });
    const { result, posts } = runPublisher({
      eventRun: older,
      listing: { total_count: 2, workflow_runs: [older, newer] },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /stale exact-main workflow_run event ignored/);
    assert.deepEqual(posts, []);
  },
);

test(
  'older successful attempt cannot overwrite a newer failed rerun attempt',
  { skip: process.platform === 'win32' },
  () => {
    const olderAttempt = workflowRun({
      id: 200,
      runNumber: 40,
      runAttempt: 1,
      status: 'completed',
      conclusion: 'success',
    });
    const latestAttempt = workflowRun({
      id: 200,
      runNumber: 40,
      runAttempt: 2,
      status: 'completed',
      conclusion: 'failure',
    });
    const { result, posts } = runPublisher({
      eventRun: olderAttempt,
      listing: { total_count: 1, workflow_runs: [latestAttempt] },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /stale exact-main workflow_run event ignored/);
    assert.deepEqual(posts, []);
  },
);

test(
  'latest rerun in progress clears any prior success to pending',
  { skip: process.platform === 'win32' },
  () => {
    const latestAttempt = workflowRun({
      id: 200,
      runNumber: 40,
      runAttempt: 2,
      status: 'in_progress',
      conclusion: null,
    });
    const { result, posts } = runPublisher({
      eventRun: latestAttempt,
      listing: { total_count: 1, workflow_runs: [latestAttempt] },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(posts.length, 1);
    assert.equal(posts[0].state, 'pending');
    assert.equal(posts[0].target_url, latestAttempt.html_url);
  },
);

test(
  'publisher fails closed when exact-SHA run multiplicity exceeds one bounded page',
  { skip: process.platform === 'win32' },
  () => {
    const current = workflowRun({
      id: 200,
      runNumber: 40,
      runAttempt: 1,
      status: 'completed',
      conclusion: 'success',
    });
    const { result, posts } = runPublisher({
      eventRun: current,
      listing: { total_count: 101, workflow_runs: [current] },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /too many exact-SHA workflow runs/);
    assert.deepEqual(posts, []);
  },
);

test(
  'publisher rejects boolean total_count instead of treating it as integer one',
  { skip: process.platform === 'win32' },
  () => {
    const current = workflowRun({
      id: 200,
      runNumber: 40,
      runAttempt: 1,
      status: 'completed',
      conclusion: 'success',
    });
    const { result, posts } = runPublisher({
      eventRun: current,
      listing: { total_count: true, workflow_runs: [current] },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /freshness lookup was empty/);
    assert.deepEqual(posts, []);
  },
);

test(
  'publisher rejects boolean run identity fields instead of aliasing integer one',
  { skip: process.platform === 'win32' },
  () => {
    const current = workflowRun({
      id: 200,
      runNumber: 40,
      runAttempt: 1,
      status: 'completed',
      conclusion: 'success',
    });
    const malformed = { ...current, run_attempt: true };
    const { result, posts } = runPublisher({
      eventRun: current,
      listing: { total_count: 1, workflow_runs: [malformed] },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /invalid run identity/);
    assert.deepEqual(posts, []);
  },
);

test(
  'publisher rejects duplicate run-number and attempt identities as ambiguous',
  { skip: process.platform === 'win32' },
  () => {
    const current = workflowRun({
      id: 200,
      runNumber: 40,
      runAttempt: 1,
      status: 'completed',
      conclusion: 'success',
    });
    const duplicate = { ...current, id: 201 };
    duplicate.html_url = `https://github.com/${repository}/actions/runs/201`;
    const { result, posts } = runPublisher({
      eventRun: current,
      listing: { total_count: 2, workflow_runs: [current, duplicate] },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /duplicate run identity/);
    assert.deepEqual(posts, []);
  },
);
