import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testFile = fileURLToPath(new URL('../tests/pom-rx-integrity-baseline.node.test.mjs', import.meta.url));
const run = spawnSync(process.execPath, ['--test', '--test-reporter=tap', testFile], {
  encoding: 'utf8',
  windowsHide: true,
});
const output = `${run.stdout ?? ''}\n${run.stderr ?? ''}`;

const expectedFailures = [
  'rejects action_commitment substitution from preflight to execution',
  'rejects action_commitment substitution from execution to reconciliation',
  'rejects input_commitment substitution from preflight to execution',
  'rejects execution:accepted when an execution assertion fails',
  'rejects reconciliation:matched when a reconciliation assertion fails',
  'rejects duplicate receipt_id values within one chain',
  'rejects action substitution after a witness acknowledgement',
];
const actualFailures = [...output.matchAll(/^not ok \d+ - (.+)$/gm)].map((match) => match[1]);

assert.equal(run.error, undefined, `integrity baseline could not start: ${run.error?.message ?? 'unknown error'}`);
assert.equal(run.status, 1, 'integrity baseline must remain expected-red until the approved protocol fix lands');
assert.deepEqual(actualFailures, expectedFailures, 'integrity baseline failure set changed unexpectedly');
assert.match(
  output,
  /^ok \d+ - keeps canonical rule_id order identical when locale collation behavior differs$/m,
  'the approved ordinal comparator regression test must remain green',
);

console.log(`Expected-red POM-RX integrity baseline confirmed: ${expectedFailures.length} tracked failures, 1 pass.`);
