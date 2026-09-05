import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const workflowDirectory = new URL('../.github/workflows/', import.meta.url);
const workflows = readdirSync(workflowDirectory)
  .filter((name) => name.endsWith('.yml'))
  .map((name) => readFileSync(new URL(name, workflowDirectory), 'utf8'))
  .join('\n');

const actionRefs = [...workflows.matchAll(
  /^\s*(?:-\s*)?uses:\s*([^\s#]+)(?:\s+#\s*(.+))?$/gmu,
)].map(([, reference, annotation]) => ({ reference, annotation }));

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
  const refsByAction = new Map(actionRefs.map(({ reference, annotation }) => {
    const [action, sha] = reference.split('@');
    return [action, { sha, annotation }];
  }));

  for (const [action, expectedSha] of requiredPins) {
    assert.deepEqual(
      refsByAction.get(action),
      { sha: expectedSha, annotation: 'v7' },
      `${action} must match the reviewed v7 commit and annotation`,
    );
  }
});
