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
  checkPomRxV01InputContinuity,
} from '../sdk/typescript/internal/pom-rx-v01-input-continuity.mjs';
import {
  createPomRxV01ProfileReadiness,
} from './support/pom-rx-v01-profile-readiness.mjs';

const hash = (character) => character.repeat(64);
const fixtureRoot = 'fixtures/pom-rx/v0.1-compat/1/chains';
const actionImplementationPath = 'sdk/typescript/internal/pom-rx-v01-action-continuity.mjs';
const inputImplementationPath = 'sdk/typescript/internal/pom-rx-v01-input-continuity.mjs';

function receipt(phase, inputCommitment = hash('a')) {
  return Object.freeze({ phase, input_commitment: inputCommitment });
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

test('input-continuity invariant identifier is stable', () => {
  assert.equal(POM_RX_V01_INPUT_CONTINUITY_INVARIANT, 'POMRX_V01_I_INPUT_CONTINUITY');
});

test('input-continuity checker emits no diagnostic for an unchanged full chain', () => {
  assert.deepEqual(checkPomRxV01InputContinuity([
    receipt('preflight'),
    receipt('execution'),
    receipt('reconciliation'),
  ]), []);
});

test('input-continuity checker detects preflight to execution substitution exactly', () => {
  const diagnostics = checkPomRxV01InputContinuity([
    receipt('preflight'),
    receipt('execution', hash('b')),
  ]);

  assert.equal(diagnostics.length, 1);
  assert.deepEqual(diagnostics[0], {
    defect_id: 'POMRX-001-INPUT-PREFLIGHT-EXECUTION',
    diagnostic_code: 'POMRX_V01_E_INPUT_CONTINUITY',
    severity: 'error',
    phase: 'execution',
    receipt_index: 1,
    field: 'input_commitment',
    message: 'input_commitment changed across preflight>execution',
  });
});

test('input-continuity checker detects execution to reconciliation substitution exactly', () => {
  const diagnostics = checkPomRxV01InputContinuity([
    receipt('preflight'),
    receipt('execution'),
    receipt('reconciliation', hash('c')),
  ]);

  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].defect_id, 'POMRX-001-INPUT-EXECUTION-RECONCILIATION');
  assert.equal(diagnostics[0].phase, 'reconciliation');
  assert.equal(diagnostics[0].receipt_index, 2);
});

test('input-continuity checker deterministically reports both adjacent substitutions', () => {
  const diagnostics = checkPomRxV01InputContinuity([
    receipt('preflight', hash('a')),
    receipt('execution', hash('b')),
    receipt('reconciliation', hash('c')),
  ]);

  assert.deepEqual(
    diagnostics.map(({ defect_id: defectId, receipt_index: receiptIndex }) => [defectId, receiptIndex]),
    [
      ['POMRX-001-INPUT-PREFLIGHT-EXECUTION', 1],
      ['POMRX-001-INPUT-EXECUTION-RECONCILIATION', 2],
    ],
  );
});

test('input-continuity checker closes the frozen preflight-to-execution input substitution fixture', () => {
  const diagnostics = checkPomRxV01InputContinuity(
    readChain('POMRX-001-INPUT-PREFLIGHT-EXECUTION'),
  );
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].defect_id, 'POMRX-001-INPUT-PREFLIGHT-EXECUTION');
  assert.equal(diagnostics[0].diagnostic_code, 'POMRX_V01_E_INPUT_CONTINUITY');
});

test('equal substituted input commitments do not prove input authenticity or authorization', () => {
  const attackerChosen = hash('9');
  const diagnostics = checkPomRxV01InputContinuity([
    receipt('preflight', attackerChosen),
    receipt('execution', attackerChosen),
    receipt('reconciliation', attackerChosen),
  ]);

  assert.deepEqual(diagnostics, []);
});

test('input-continuity checker fails closed on malformed or noncontiguous internal input', () => {
  expectInternalFailure(() => checkPomRxV01InputContinuity([]));
  expectInternalFailure(() => checkPomRxV01InputContinuity([receipt('execution')]));
  expectInternalFailure(() => checkPomRxV01InputContinuity([
    receipt('preflight'),
    receipt('reconciliation'),
  ]));
  expectInternalFailure(() => checkPomRxV01InputContinuity([
    receipt('preflight', 'not-a-hash'),
  ]));
});

test('two implemented continuity invariants remain PROFILE_INCOMPLETE and never authorize', () => {
  const readiness = createPomRxV01ProfileReadiness({
    sourceClosure: [
      { path: actionImplementationPath, bytes: readFileSync(actionImplementationPath) },
      { path: inputImplementationPath, bytes: readFileSync(inputImplementationPath) },
    ],
    implementedInvariants: [
      POM_RX_V01_ACTION_CONTINUITY_INVARIANT,
      POM_RX_V01_INPUT_CONTINUITY_INVARIANT,
    ],
  });

  assert.deepEqual(readiness.implemented_invariants, [
    'POMRX_V01_I_ACTION_CONTINUITY',
    'POMRX_V01_I_INPUT_CONTINUITY',
  ]);
  assert.deepEqual(readiness.missing_invariants, [
    'POMRX_V01_I_EXECUTION_ASSERTION_CONSISTENCY',
    'POMRX_V01_I_RECONCILIATION_ASSERTION_CONSISTENCY',
    'POMRX_V01_I_RECEIPT_ID_UNIQUENESS',
  ]);
  assert.equal(readiness.structural_status, 'indeterminate');
  assert.equal(readiness.structural_prerequisite_satisfied, false);
  assert.equal(readiness.authorization_eligible, false);
  assert.equal(readiness.authorization_proved, false);
  assert.equal(readiness.diagnostic_code, 'POMRX_V01_E_PROFILE_INCOMPLETE');
});

test('input-continuity implementation remains internal and does not alter legacy verifier source', () => {
  const legacySource = readFileSync('sdk/typescript/pom-rx.mjs', 'utf8');
  assert.doesNotMatch(legacySource, /pom-rx-v01-input-continuity/u);
  assert.doesNotMatch(legacySource, /checkPomRxV01InputContinuity/u);
});
