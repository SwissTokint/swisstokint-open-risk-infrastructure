import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const workflowDirectory = new URL('../.github/workflows/', import.meta.url);
const workflows = readdirSync(workflowDirectory)
  .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
  .sort()
  .map((name) => readFileSync(new URL(name, workflowDirectory), 'utf8'))
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
