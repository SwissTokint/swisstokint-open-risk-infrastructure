import assert from 'node:assert/strict';
import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { isMap, isScalar, isSeq, parseDocument } from 'yaml';

const workflowDirectory = new URL('../.github/workflows/', import.meta.url);
const yamlPackage = JSON.parse(
  readFileSync(new URL('../node_modules/yaml/package.json', import.meta.url), 'utf8'),
);

function annotationAt(contents, offset) {
  const lineStart = contents.lastIndexOf('\n', Math.max(0, offset - 1)) + 1;
  const nextNewline = contents.indexOf('\n', offset);
  const lineEnd = nextNewline === -1 ? contents.length : nextNewline;
  return contents.slice(lineStart, lineEnd).match(/#\s*(.*?)\s*$/u)?.[1];
}

function collectActionRefs(node, contents, sourceName, refs) {
  if (isSeq(node)) {
    for (const item of node.items) collectActionRefs(item, contents, sourceName, refs);
    return;
  }
  if (!isMap(node)) return;

  for (const pair of node.items) {
    if (isScalar(pair.key) && pair.key.value === 'uses') {
      if (!isScalar(pair.value) || typeof pair.value.value !== 'string') {
        throw new Error('workflow uses values must be literal strings');
      }
      const namePair = node.items.find(
        (item) => isScalar(item.key) && item.key.value === 'name',
      );
      refs.push({
        sourceName,
        stepName: isScalar(namePair?.value) ? namePair.value.value : undefined,
        reference: pair.value.value,
        annotation: annotationAt(contents, pair.value.range[0]),
      });
    }
    collectActionRefs(pair.value, contents, sourceName, refs);
  }
}

function parseWorkflowSource(name, rawContents) {
  const contents = rawContents.replace(/\r\n/gu, '\n');
  if (Buffer.byteLength(contents, 'utf8') > 256 * 1024) {
    throw new Error(`workflow is too large to inspect safely: ${name}`);
  }

  const document = parseDocument(contents, {
    prettyErrors: false,
    schema: 'core',
    strict: true,
    uniqueKeys: true,
  });
  if (document.errors.length !== 0 || document.warnings.length !== 0) {
    throw new Error(`workflow YAML is not canonical: ${name}`);
  }

  const data = document.toJS({ maxAliasCount: 0 });
  if (
    typeof data !== 'object'
    || data === null
    || Array.isArray(data)
    || Object.getPrototypeOf(data) !== Object.prototype
  ) {
    throw new Error(`workflow must be a plain YAML mapping: ${name}`);
  }

  const actionRefs = [];
  collectActionRefs(document.contents, contents, name, actionRefs);
  return Object.freeze({ name, contents, data, actionRefs: Object.freeze(actionRefs) });
}

const workflowNames = readdirSync(workflowDirectory)
  .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
  .sort();
assert.ok(workflowNames.length > 0 && workflowNames.length <= 64);

const workflowSources = workflowNames.map((name) => {
  const workflowUrl = new URL(name, workflowDirectory);
  const stats = lstatSync(workflowUrl);
  assert.equal(stats.isSymbolicLink(), false, `${name} must not be a symbolic link`);
  assert.equal(stats.isFile(), true, `${name} must be a regular file`);
  return parseWorkflowSource(name, readFileSync(workflowUrl, 'utf8'));
});
const actionRefs = workflowSources.flatMap(({ actionRefs: refs }) => refs);

const requiredPins = new Map([
  ['actions/checkout', '3d3c42e5aac5ba805825da76410c181273ba90b1'],
  ['actions/setup-node', '820762786026740c76f36085b0efc47a31fe5020'],
  ['actions/setup-python', '5fda3b95a4ea91299a34e894583c3862153e4b97'],
]);

test('CI workflows parse as YAML and pin every action occurrence to a full SHA', () => {
  assert.equal(yamlPackage.version, '2.9.0', 'trusted YAML parser version drifted');
  assert.ok(actionRefs.length > 0, 'expected at least one external action');

  for (const { reference } of actionRefs) {
    assert.match(
      reference,
      /^[^@\s]+@[0-9a-f]{40}$/u,
      `mutable or malformed action reference: ${reference}`,
    );
  }
});

test('CI pins every reviewed v7 action occurrence and preserves its annotation', () => {
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

test('YAML parsing covers whitespace-before-colon and quoted action syntax', () => {
  const sha = '0'.repeat(40);
  const parsed = parseWorkflowSource('synthetic.yml', `
permissions:
  contents: read
jobs:
  test:
    steps:
      - uses : "Actions/Checkout@${sha}" # v7
`);
  assert.deepEqual(parsed.actionRefs, [{
    sourceName: 'synthetic.yml',
    stepName: undefined,
    reference: `Actions/Checkout@${sha}`,
    annotation: 'v7',
  }]);
});

test('the privileged trusted controller uses only its reviewed action steps', () => {
  const trustedActions = actionRefs
    .filter(({ sourceName }) => sourceName === 'trusted-pr-security.yml')
    .map(({ stepName, reference }) => ({ stepName, reference }))
    .sort((left, right) => left.stepName.localeCompare(right.stepName));
  assert.deepEqual(trustedActions, [
    {
      stepName: 'Check out exact candidate head',
      reference: 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1',
    },
    {
      stepName: 'Check out exact trusted main controller',
      reference: 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1',
    },
    {
      stepName: 'Check out trusted base controller',
      reference: 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1',
    },
    {
      stepName: 'Install exact trusted Node runtime',
      reference: 'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020',
    },
    {
      stepName: 'Install exact trusted Node runtime',
      reference: 'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020',
    },
  ]);
});

test('every workflow permission mapping matches the reviewed semantic allowlist', () => {
  const expectedPermissions = new Map([
    ['exact-main-ci-status.yml', { actions: 'read', statuses: 'write' }],
    [
      'trusted-pr-security.yml',
      { contents: 'read', 'pull-requests': 'read', statuses: 'write' },
    ],
  ]);

  for (const { name, data } of workflowSources) {
    assert.deepEqual(
      data.permissions,
      expectedPermissions.get(name) ?? { contents: 'read' },
      `${name} permissions escaped the reviewed allowlist`,
    );
    assert.equal(typeof data.jobs, 'object', `${name} must define jobs`);
    for (const [jobName, job] of Object.entries(data.jobs)) {
      assert.equal(
        Object.hasOwn(job, 'permissions'),
        false,
        `${name} job ${jobName} must not override permissions`,
      );
    }
  }

  const exactMain = workflowSources.find(({ name }) => name === 'exact-main-ci-status.yml');
  assert.ok(exactMain, 'exact-main status controller must exist');
  assert.deepEqual(exactMain.data.on, {
    workflow_run: {
      workflows: ['CI'],
      types: ['in_progress', 'completed'],
    },
  });
  assert.match(exactMain.contents, /github\.event\.workflow_run\.event == 'push'/u);
  assert.match(exactMain.contents, /github\.event\.workflow_run\.head_branch == 'main'/u);
  assert.match(
    exactMain.contents,
    /github\.event\.workflow_run\.head_repository\.full_name == github\.repository/u,
  );
  assert.doesNotMatch(exactMain.contents, /pom-rx\/trusted-exact-head/u);
});
