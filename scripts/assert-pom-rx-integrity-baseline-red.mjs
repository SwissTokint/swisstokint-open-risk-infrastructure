import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const testFile = fileURLToPath(new URL('../tests/pom-rx-integrity-baseline.node.test.mjs', import.meta.url));
const testSource = readFileSync(testFile, 'utf8');
const run = spawnSync(process.execPath, ['--test', '--test-reporter=tap', testFile], {
  encoding: 'utf8',
  windowsHide: true,
});
const output = `${run.stdout ?? ''}\n${run.stderr ?? ''}`.replace(/\r\n/g, '\n');

const expectedFailureCases = [
  {
    defectId: 'POMRX-001-ACTION-PREFLIGHT-EXECUTION',
    testName: 'rejects action_commitment substitution from preflight to execution',
    expectedDiagnostic: 'action_commitment changed',
    vulnerableBehavior: 'v0.1 currently accepts a re-linked action substitution',
  },
  {
    defectId: 'POMRX-001-ACTION-EXECUTION-RECONCILIATION',
    testName: 'rejects action_commitment substitution from execution to reconciliation',
    expectedDiagnostic: 'action_commitment changed',
    vulnerableBehavior: 'v0.1 currently accepts a reconciled action substitution',
  },
  {
    defectId: 'POMRX-001-INPUT-PREFLIGHT-EXECUTION',
    testName: 'rejects input_commitment substitution from preflight to execution',
    expectedDiagnostic: 'input_commitment changed',
    vulnerableBehavior: 'v0.1 currently accepts a re-linked input substitution',
  },
  {
    defectId: 'POMRX-006-EXECUTION-FAIL-ASSERTION',
    testName: 'rejects execution:accepted when an execution assertion fails',
    expectedDiagnostic: 'accepted execution requires every assertion to pass',
    vulnerableBehavior: 'v0.1 currently permits accepted with a failed assertion',
  },
  {
    defectId: 'POMRX-006-RECONCILIATION-FAIL-ASSERTION',
    testName: 'rejects reconciliation:matched when a reconciliation assertion fails',
    expectedDiagnostic: 'matched reconciliation requires every assertion to pass',
    vulnerableBehavior: 'v0.1 currently permits matched with a failed assertion',
  },
  {
    defectId: 'POMRX-007-DUPLICATE-RECEIPT-ID',
    testName: 'rejects duplicate receipt_id values within one chain',
    expectedDiagnostic: 'receipt_id cannot repeat',
    vulnerableBehavior: 'v0.1 currently accepts duplicate receipt_id values',
  },
  {
    defectId: 'POMRX-001-SURROGATE-ACK-ACTION-SUBSTITUTION',
    testName: 'rejects action substitution after an unsigned surrogate witness acknowledgement',
    expectedDiagnostic: 'action_commitment changed',
    vulnerableBehavior: 'an unsigned surrogate acknowledgement does not repair v0.1 chain continuity',
  },
];
const expectedGreenControls = [
  'accepts the unmodified synthetic chain fixture',
  'keeps canonical rule_id order identical when locale collation behavior differs',
];
const actualFailures = [...output.matchAll(/^not ok \d+ - (.+)$/gm)].map((match) => match[1]);
const actualPasses = [...output.matchAll(/^ok \d+ - (.+)$/gm)].map((match) => match[1]);

function extractOutputBlock(testName) {
  const marker = `# Subtest: ${testName}\n`;
  const start = output.indexOf(marker);
  assert.notEqual(start, -1, `missing TAP block for ${testName}`);
  const candidates = [output.indexOf('\n# Subtest: ', start + marker.length), output.indexOf('\n1..', start + marker.length)]
    .filter((index) => index >= 0);
  const end = candidates.length > 0 ? Math.min(...candidates) : output.length;
  return output.slice(start, end);
}

function extractSourceBlock(testName) {
  const marker = `test('${testName}', () => {`;
  const start = testSource.indexOf(marker);
  assert.notEqual(start, -1, `missing source block for ${testName}`);
  const next = testSource.indexOf('\ntest(', start + marker.length);
  return testSource.slice(start, next >= 0 ? next : testSource.length);
}

assert.equal(run.error, undefined, `integrity baseline could not start: ${run.error?.message ?? 'unknown error'}`);
assert.equal(run.signal, null, `integrity baseline was interrupted by ${run.signal}`);
assert.equal(run.status, 1, 'integrity baseline must remain expected-red until the approved protocol fix lands');
assert.doesNotMatch(
  output,
  /\b(?:SyntaxError|ReferenceError|TypeError)\b|ERR_MODULE_NOT_FOUND|Cannot find module|\bENOENT\b/,
  'expected-red evidence cannot come from import, syntax, runtime, or missing-fixture errors',
);
assert.match(output, /^1\.\.9$/m, 'the complete nine-test TAP plan must be present');
assert.match(output, /^# tests 9$/m);
assert.match(output, /^# pass 2$/m);
assert.match(output, /^# fail 7$/m);
assert.match(output, /^# cancelled 0$/m);
assert.match(output, /^# skipped 0$/m);
assert.match(output, /^# todo 0$/m);
assert.deepEqual(actualFailures, expectedFailureCases.map(({ testName }) => testName), 'integrity baseline failure set changed unexpectedly');
assert.deepEqual(actualPasses, expectedGreenControls, 'fixture or canonical-order green controls changed unexpectedly');
assert.equal(new Set(expectedFailureCases.map(({ defectId }) => defectId)).size, expectedFailureCases.length, 'defect IDs must be unique');

for (const expectedCase of expectedFailureCases) {
  assert.match(expectedCase.defectId, /^POMRX-\d{3}-[A-Z0-9-]+$/, `invalid defect ID: ${expectedCase.defectId}`);

  const outputBlock = extractOutputBlock(expectedCase.testName);
  assert.match(outputBlock, /^not ok \d+ - /m, `${expectedCase.defectId}: test is not red`);
  assert.match(outputBlock, /failureType: 'testCodeFailure'/, `${expectedCase.defectId}: failure is not a test assertion`);
  assert.ok(outputBlock.includes(expectedCase.vulnerableBehavior), `${expectedCase.defectId}: vulnerable behavior was not observed`);
  assert.match(outputBlock, /expected: false\n  actual: true\n  operator: 'strictEqual'/, `${expectedCase.defectId}: expected vulnerable true verdict was not observed`);

  const sourceBlock = extractSourceBlock(expectedCase.testName);
  assert.ok(sourceBlock.includes(`/${expectedCase.expectedDiagnostic}/`), `${expectedCase.defectId}: expected diagnostic assertion is missing`);
}

console.log(JSON.stringify({
  schema_version: 'swisstokint-pom-rx-expected-red-gate/0.1',
  status: 'EXPECTED_RED_CONFIRMED',
  qualification: 'local synthetic unaudited prototype evidence',
  totals: {
    tracked_defects: expectedFailureCases.length,
    vulnerable_failures: actualFailures.length,
    green_controls: actualPasses.length,
  },
  cases: expectedFailureCases.map(({ defectId, testName, expectedDiagnostic, vulnerableBehavior }) => ({
    defect_id: defectId,
    test_name: testName,
    expected_diagnostic: expectedDiagnostic,
    observed_vulnerable_behavior: vulnerableBehavior,
  })),
}, null, 2));
