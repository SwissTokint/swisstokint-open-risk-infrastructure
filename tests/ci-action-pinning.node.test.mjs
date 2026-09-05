import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const workflowDirectory = new URL('../.github/workflows/', import.meta.url);
const workflowSources = readdirSync(workflowDirectory)
  .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
  .sort()
  .map((name) => ({
    name,
    contents: readFileSync(new URL(name, workflowDirectory), 'utf8').replace(/\r\n/gu, '\n'),
  }));
const workflows = workflowSources
  .map(({ contents }) => contents)
  .join('\n');

function extractActionRefs(contents) {
  return [...contents.matchAll(
    /^\s*(?:-\s*)?uses:\s*(?:"([^"]+)"|'([^']+)'|([^\s#]+))(?:\s+#\s*(.+))?\s*$/gmu,
  )].map(([, doubleQuoted, singleQuoted, bare, annotation]) => ({
    reference: doubleQuoted ?? singleQuoted ?? bare,
    annotation,
  }));
}

const actionRefs = extractActionRefs(workflows);

const requiredPins = new Map([
  ['actions/checkout', '3d3c42e5aac5ba805825da76410c181273ba90b1'],
  ['actions/setup-node', '820762786026740c76f36085b0efc47a31fe5020'],
  ['actions/setup-python', '5fda3b95a4ea91299a34e894583c3862153e4b97'],
]);
const statusWritePermission = /(?:^|[\s,{])["']?statuses["']?\s*:\s*["']?write["']?(?=\s*(?:$|[,}#]))/imu;
const writeAllPermission = /(?:^|[\s,{])["']?permissions["']?\s*:\s*["']?write-all["']?(?=\s*(?:$|[,}#]))/imu;

test('CI workflows reference every external action by a full immutable commit SHA', () => {
  assert.ok(actionRefs.length > 0, 'expected at least one external action');

  for (const { reference } of actionRefs) {
    assert.match(
      reference,
      /^[^@\s]+@[0-9a-f]{40}$/u,
      `mutable or malformed action reference: ${reference}`,
    );
  }
});

test('CI pins the reviewed v7 action revisions and preserves release annotations', () => {
  for (const [action, expectedSha] of requiredPins) {
    const occurrences = actionRefs.filter(({ reference }) => {
      const [referencedAction] = reference.split('@');
      return referencedAction.toLowerCase() === action;
    });
    assert.ok(occurrences.length > 0, `${action} must occur in a CI workflow`);
    for (const { reference, annotation } of occurrences) {
      const [, sha] = reference.split('@');
      assert.deepEqual(
        { sha, annotation },
        { sha: expectedSha, annotation: 'v7' },
        `every ${action} occurrence must match the reviewed v7 commit and annotation`,
      );
    }
  }
});

test('action extraction covers YAML quoting and case-insensitive GitHub identities', () => {
  const sha = '0'.repeat(40);
  assert.deepEqual(extractActionRefs(`steps:\n  - uses: "Actions/Checkout@${sha}" # v7\n`), [{
    reference: `Actions/Checkout@${sha}`,
    annotation: 'v7',
  }]);
  assert.equal('Actions/Checkout'.toLowerCase(), 'actions/checkout');
});

test('only base-owned controller workflows may request commit-status writes', () => {
  const allowedStatusWriters = new Set([
    'exact-main-ci-status.yml',
    'trusted-pr-security.yml',
  ]);
  const expectedPermissions = new Map([
    ['exact-main-ci-status.yml', 'permissions:\n  actions: read\n  statuses: write'],
    [
      'trusted-pr-security.yml',
      'permissions:\n  contents: read\n  pull-requests: read\n  statuses: write',
    ],
  ]);

  for (const { name, contents } of workflowSources) {
    assert.doesNotMatch(contents, writeAllPermission, `${name} must not request write-all`);
    assert.doesNotMatch(contents, /^[ \t]+["']permissions["'][ \t]*:/mu);
    assert.equal(
      [...contents.matchAll(/^permissions:$/gmu)].length,
      1,
      `${name} must contain one explicit top-level permissions block`,
    );
    assert.equal(
      [...contents.matchAll(/^[ \t]+permissions:$/gmu)].length,
      0,
      `${name} must not override permissions at job scope`,
    );
    const permissionBlock = contents.match(
      /^permissions:\n((?:  [a-z-]+: (?:read|write|none)\n?)+)/mu,
    );
    assert.ok(permissionBlock, `${name} permissions must use the bounded block form`);
    assert.equal(
      `permissions:\n${permissionBlock[1]}`.trimEnd(),
      expectedPermissions.get(name) ?? 'permissions:\n  contents: read',
      `${name} permissions escaped the reviewed allowlist`,
    );
    if (statusWritePermission.test(contents)) {
      assert.equal(
        allowedStatusWriters.has(name),
        true,
        `${name} must not share the trusted commit-status identity`,
      );
    }
  }

  const exactMain = workflowSources.find(({ name }) => name === 'exact-main-ci-status.yml');
  assert.ok(exactMain, 'exact-main status controller must exist');
  assert.match(exactMain.contents, /^  workflow_run:$/mu);
  assert.match(exactMain.contents, /workflows: \["CI"\]/u);
  assert.match(exactMain.contents, /github\.event\.workflow_run\.event == 'push'/u);
  assert.match(exactMain.contents, /github\.event\.workflow_run\.head_branch == 'main'/u);
  assert.match(
    exactMain.contents,
    /github\.event\.workflow_run\.head_repository\.full_name == github\.repository/u,
  );
  assert.doesNotMatch(exactMain.contents, /^  pull_request(?:_target)?:/mu);
  assert.doesNotMatch(exactMain.contents, /pom-rx\/trusted-exact-head/u);
});

test('status-write permission detection covers block, quoted and flow YAML forms', () => {
  for (const contents of [
    'permissions:\n  statuses: write\n',
    "permissions:\n  'statuses': 'write'\n",
    'permissions: { contents: read, "statuses": "write" }\n',
  ]) {
    assert.match(contents, statusWritePermission);
  }
  assert.match('permissions: "write-all"\n', writeAllPermission);
  assert.doesNotMatch('permissions:\n  statuses: read\n', statusWritePermission);
});
