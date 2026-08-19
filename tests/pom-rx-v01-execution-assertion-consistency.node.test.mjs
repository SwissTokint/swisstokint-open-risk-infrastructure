import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  PomRxV01StrictError,
} from '../sdk/typescript/internal/pom-rx-v01-diagnostics.mjs';
import {
  POM_RX_V01_ACTION_CONTINUITY_INVARIANT,
} from '../sdk/typescript/internal/pom-rx-v01-action-continuity.mjs';
import {
  POM_RX_V01_INPUT_CONTINUITY_INVARIANT,
} from '../sdk/typescript/internal/pom-rx-v01-input-continuity.mjs';
import {
  POM_RX_V01_EXECUTION_ASSERTION_CONSISTENCY_INVARIANT,
  checkPomRxV01ExecutionAssertionConsistency,
} from '../sdk/typescript/internal/pom-rx-v01-execution-assertion-consistency.mjs';
import {
  createPomRxV01ProfileReadiness,
} from './support/pom-rx-v01-profile-readiness.mjs';

const fixtureRoot = 'fixtures/pom-rx/v0.1-compat/1/chains';
const actionImplementationPath = 'sdk/typescript/internal/pom-rx-v01-action-continuity.mjs';
const inputImplementationPath = 'sdk/typescript/internal/pom-rx-v01-input-continuity.mjs';
const executionImplementationPath =
  'sdk/typescript/internal/pom-rx-v01-execution-assertion-consistency.mjs';

const defaultOutcome = {
  preflight: 'allow',
  execution: 'accepted',
  reconciliation: 'matched',
};

function receipt(phase, { outcome = defaultOutcome[phase], results = ['pass'] } = {}) {
  return Object.freeze({
    phase,
    outcome,
    assertions: Object.freeze(results.map((result) => Object.freeze({ result }))),
  });
}

function readChain(scenarioId) {
  return JSON.parse(readFileSync(`${fixtureRoot}/${scenarioId}.json`, 'utf8'));
}

function expectInternalFailure(callback) {
  assert.throws(
    callback,
    (error) => error instanceof PomRxV01StrictError
      && error.code === 'POMRX_V01_E_INTERNAL_VERIFIER_ERROR',
  );
}

test('execution assertion-consistency invariant identifier is stable', () => {
  assert.equal(
    POM_RX_V01_EXECUTION_ASSERTION_CONSISTENCY_INVARIANT,
    'POMRX_V01_I_EXECUTION_ASSERTION_CONSISTENCY',
  );
});

test('accepted execution with all passing assertions emits no diagnostic', () => {
  assert.deepEqual(checkPomRxV01ExecutionAssertionConsistency([
    receipt('preflight'),
    receipt('execution', { results: ['pass', 'pass'] }),
  ]), []);
});

test('accepted execution with a failed assertion emits the tracked exact defect', () => {
  const diagnostics = checkPomRxV01ExecutionAssertionConsistency([
    receipt('preflight'),
    receipt('execution', { results: ['pass', 'fail'] }),
  ]);

  assert.deepEqual(diagnostics, [{
    defect_id: 'POMRX-006-EXECUTION-FAIL-ASSERTION',
    diagnostic_code: 'POMRX_V01_E_EXECUTION_ASSERTION_CONFLICT',
    severity: 'error',
    phase: 'execution',
    receipt_index: 1,
    field: 'assertions',
    message: 'execution:accepted requires every assertion to pass',
  }]);
});

test('accepted execution with not_evaluated is rejected without inventing a PR 27 defect id', () => {
  const diagnostics = checkPomRxV01ExecutionAssertionConsistency([
    receipt('preflight'),
    receipt('execution', { results: ['pass', 'not_evaluated'] }),
  ]);

  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].defect_id, null);
  assert.equal(diagnostics[0].diagnostic_code, 'POMRX_V01_E_EXECUTION_ASSERTION_CONFLICT');
});

test('rejected and unresolved execution outcomes are not upgraded into accepted semantics', () => {
  for (const outcome of ['rejected', 'unresolved']) {
    assert.deepEqual(checkPomRxV01ExecutionAssertionConsistency([
      receipt('preflight'),
      receipt('execution', { outcome, results: ['fail'] }),
    ]), []);
  }
});

test('execution assertion checker closes the frozen accepted-with-fail fixture', () => {
  const diagnostics = checkPomRxV01ExecutionAssertionConsistency(
    readChain('POMRX-006-EXECUTION-FAIL-ASSERTION'),
  );
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].defect_id, 'POMRX-006-EXECUTION-FAIL-ASSERTION');
  assert.equal(diagnostics[0].diagnostic_code, 'POMRX_V01_E_EXECUTION_ASSERTION_CONFLICT');
});

test('checker refuses vacuous or malformed assertion inputs instead of silently passing them', () => {
  expectInternalFailure(() => checkPomRxV01ExecutionAssertionConsistency([]));
  expectInternalFailure(() => checkPomRxV01ExecutionAssertionConsistency([
    receipt('execution'),
  ]));
  expectInternalFailure(() => checkPomRxV01ExecutionAssertionConsistency([
    receipt('preflight'),
    receipt('reconciliation'),
  ]));
  expectInternalFailure(() => checkPomRxV01ExecutionAssertionConsistency([
    receipt('preflight'),
    receipt('execution', { results: [] }),
  ]));
  expectInternalFailure(() => checkPomRxV01ExecutionAssertionConsistency([
    receipt('preflight'),
    receipt('execution', { results: ['unknown'] }),
  ]));
  expectInternalFailure(() => checkPomRxV01ExecutionAssertionConsistency([
    receipt('preflight'),
    receipt('execution', { outcome: 'matched' }),
  ]));
});

test('passing execution assertions prove only this invariant, not native execution or authorization', () => {
  assert.deepEqual(checkPomRxV01ExecutionAssertionConsistency([
    receipt('preflight'),
    receipt('execution', { results: ['pass'] }),
  ]), []);

  const readiness = createPomRxV01ProfileReadiness({
    sourceClosure: [
      { path: actionImplementationPath, bytes: readFileSync(actionImplementationPath) },
      { path: inputImplementationPath, bytes: readFileSync(inputImplementationPath) },
      { path: executionImplementationPath, bytes: readFileSync(executionImplementationPath) },
    ],
    implementedInvariants: [
      POM_RX_V01_ACTION_CONTINUITY_INVARIANT,
      POM_RX_V01_INPUT_CONTINUITY_INVARIANT,
      POM_RX_V01_EXECUTION_ASSERTION_CONSISTENCY_INVARIANT,
    ],
  });

  assert.deepEqual(readiness.implemented_invariants, [
    'POMRX_V01_I_ACTION_CONTINUITY',
    'POMRX_V01_I_INPUT_CONTINUITY',
    'POMRX_V01_I_EXECUTION_ASSERTION_CONSISTENCY',
  ]);
  assert.deepEqual(readiness.missing_invariants, [
    'POMRX_V01_I_RECONCILIATION_ASSERTION_CONSISTENCY',
    'POMRX_V01_I_RECEIPT_ID_UNIQUENESS',
  ]);
  assert.equal(readiness.structural_status, 'indeterminate');
  assert.equal(readiness.structural_prerequisite_satisfied, false);
  assert.equal(readiness.authorization_eligible, false);
  assert.equal(readiness.authorization_proved, false);
  assert.equal(readiness.diagnostic_code, 'POMRX_V01_E_PROFILE_INCOMPLETE');
});

test('execution assertion implementation remains internal and leaves the legacy verifier unchanged', () => {
  const legacySource = readFileSync('sdk/typescript/pom-rx.mjs', 'utf8');
  assert.doesNotMatch(legacySource, /pom-rx-v01-execution-assertion-consistency/u);
  assert.doesNotMatch(legacySource, /checkPomRxV01ExecutionAssertionConsistency/u);
});
