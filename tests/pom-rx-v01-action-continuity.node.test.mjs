import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PomRxV01StrictError,
} from '../sdk/typescript/internal/pom-rx-v01-diagnostics.mjs';
import {
  POM_RX_V01_ACTION_CONTINUITY_INVARIANT,
  checkPomRxV01ActionContinuity,
} from '../sdk/typescript/internal/pom-rx-v01-action-continuity.mjs';

const hash = (character) => character.repeat(64);

function receipt(phase, actionCommitment = hash('a')) {
  return Object.freeze({
    phase,
    action_commitment: actionCommitment,
  });
}

function expectInternalFailure(callback) {
  assert.throws(
    callback,
    (error) => error instanceof PomRxV01StrictError
      && error.code === 'POMRX_V01_E_INTERNAL_VERIFIER_ERROR',
  );
}

test('action-continuity invariant identifier is stable', () => {
  assert.equal(
    POM_RX_V01_ACTION_CONTINUITY_INVARIANT,
    'POMRX_V01_I_ACTION_CONTINUITY',
  );
});

test('action-continuity checker emits no diagnostic for an unchanged full chain', () => {
  const diagnostics = checkPomRxV01ActionContinuity([
    receipt('preflight'),
    receipt('execution'),
    receipt('reconciliation'),
  ]);

  assert.deepEqual(diagnostics, []);
});

test('action-continuity checker detects preflight to execution substitution exactly', () => {
  const diagnostics = checkPomRxV01ActionContinuity([
    receipt('preflight'),
    receipt('execution', hash('b')),
  ]);

  assert.equal(diagnostics.length, 1);
  assert.deepEqual(diagnostics[0], {
    defect_id: 'POMRX-001-ACTION-PREFLIGHT-EXECUTION',
    diagnostic_code: 'POMRX_V01_E_ACTION_CONTINUITY',
    severity: 'error',
    phase: 'execution',
    receipt_index: 1,
    field: 'action_commitment',
    message: 'action_commitment changed across preflight>execution',
  });
});

test('action-continuity checker detects execution to reconciliation substitution exactly', () => {
  const diagnostics = checkPomRxV01ActionContinuity([
    receipt('preflight'),
    receipt('execution'),
    receipt('reconciliation', hash('c')),
  ]);

  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].defect_id, 'POMRX-001-ACTION-EXECUTION-RECONCILIATION');
  assert.equal(diagnostics[0].phase, 'reconciliation');
  assert.equal(diagnostics[0].receipt_index, 2);
});

test('action-continuity checker deterministically reports both adjacent substitutions', () => {
  const diagnostics = checkPomRxV01ActionContinuity([
    receipt('preflight', hash('a')),
    receipt('execution', hash('b')),
    receipt('reconciliation', hash('c')),
  ]);

  assert.deepEqual(
    diagnostics.map(({ defect_id: defectId, receipt_index: receiptIndex }) => [defectId, receiptIndex]),
    [
      ['POMRX-001-ACTION-PREFLIGHT-EXECUTION', 1],
      ['POMRX-001-ACTION-EXECUTION-RECONCILIATION', 2],
    ],
  );
});

test('action-continuity checker fails closed on malformed or noncontiguous internal input', () => {
  expectInternalFailure(() => checkPomRxV01ActionContinuity([]));
  expectInternalFailure(() => checkPomRxV01ActionContinuity([
    receipt('execution'),
  ]));
  expectInternalFailure(() => checkPomRxV01ActionContinuity([
    receipt('preflight'),
    receipt('reconciliation'),
  ]));
  expectInternalFailure(() => checkPomRxV01ActionContinuity([
    receipt('preflight', 'not-a-hash'),
  ]));
});
