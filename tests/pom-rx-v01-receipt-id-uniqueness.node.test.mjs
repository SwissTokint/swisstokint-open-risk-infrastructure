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
} from '../sdk/typescript/internal/pom-rx-v01-execution-assertion-consistency.mjs';
import {
  POM_RX_V01_RECONCILIATION_ASSERTION_CONSISTENCY_INVARIANT,
} from '../sdk/typescript/internal/pom-rx-v01-reconciliation-assertion-consistency.mjs';
import {
  POM_RX_V01_RECEIPT_ID_UNIQUENESS_INVARIANT,
  checkPomRxV01ReceiptIdUniqueness,
} from '../sdk/typescript/internal/pom-rx-v01-receipt-id-uniqueness.mjs';
import {
  createPomRxV01ProfileReadiness,
} from './support/pom-rx-v01-profile-readiness.mjs';

const fixtureRoot = 'fixtures/pom-rx/v0.1-compat/1/chains';
const implementationPaths = [
  'sdk/typescript/internal/pom-rx-v01-action-continuity.mjs',
  'sdk/typescript/internal/pom-rx-v01-input-continuity.mjs',
  'sdk/typescript/internal/pom-rx-v01-execution-assertion-consistency.mjs',
  'sdk/typescript/internal/pom-rx-v01-reconciliation-assertion-consistency.mjs',
  'sdk/typescript/internal/pom-rx-v01-receipt-id-uniqueness.mjs',
];

const defaultReceiptId = {
  preflight: 'receipt_preflight_test_0001',
  execution: 'receipt_execution_test_0001',
  reconciliation: 'receipt_reconciliation_test_0001',
};

function receipt(phase, receiptId = defaultReceiptId[phase]) {
  return Object.freeze({ phase, receipt_id: receiptId });
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

test('receipt-ID uniqueness invariant identifier is stable', () => {
  assert.equal(
    POM_RX_V01_RECEIPT_ID_UNIQUENESS_INVARIANT,
    'POMRX_V01_I_RECEIPT_ID_UNIQUENESS',
  );
});

test('unique receipt IDs across a full chain emit no diagnostic', () => {
  assert.deepEqual(checkPomRxV01ReceiptIdUniqueness([
    receipt('preflight'),
    receipt('execution'),
    receipt('reconciliation'),
  ]), []);
});

test('duplicate preflight/execution receipt ID emits the tracked exact defect at the duplicate', () => {
  const duplicate = 'receipt_duplicate_test_0001';
  const diagnostics = checkPomRxV01ReceiptIdUniqueness([
    receipt('preflight', duplicate),
    receipt('execution', duplicate),
  ]);

  assert.deepEqual(diagnostics, [{
    defect_id: 'POMRX-007-DUPLICATE-RECEIPT-ID',
    diagnostic_code: 'POMRX_V01_E_DUPLICATE_RECEIPT_ID',
    severity: 'error',
    phase: 'execution',
    receipt_index: 1,
    field: 'receipt_id',
    message: 'receipt_id duplicates receipt index 0',
  }]);
});

test('duplicate execution/reconciliation receipt ID is detected at reconciliation', () => {
  const duplicate = 'receipt_duplicate_test_0002';
  const diagnostics = checkPomRxV01ReceiptIdUniqueness([
    receipt('preflight'),
    receipt('execution', duplicate),
    receipt('reconciliation', duplicate),
  ]);

  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].defect_id, 'POMRX-007-DUPLICATE-RECEIPT-ID');
  assert.equal(diagnostics[0].phase, 'reconciliation');
  assert.equal(diagnostics[0].receipt_index, 2);
});

test('three equal receipt IDs deterministically report both later duplicate positions', () => {
  const duplicate = 'receipt_duplicate_test_0003';
  const diagnostics = checkPomRxV01ReceiptIdUniqueness([
    receipt('preflight', duplicate),
    receipt('execution', duplicate),
    receipt('reconciliation', duplicate),
  ]);

  assert.deepEqual(
    diagnostics.map(({ receipt_index: receiptIndex, phase }) => [receiptIndex, phase]),
    [[1, 'execution'], [2, 'reconciliation']],
  );
});

test('receipt-ID checker closes the frozen duplicate-ID fixture', () => {
  const diagnostics = checkPomRxV01ReceiptIdUniqueness(
    readChain('POMRX-007-DUPLICATE-RECEIPT-ID'),
  );

  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].defect_id, 'POMRX-007-DUPLICATE-RECEIPT-ID');
  assert.equal(diagnostics[0].diagnostic_code, 'POMRX_V01_E_DUPLICATE_RECEIPT_ID');
});

test('checker fails closed on malformed IDs and noncontiguous internal chain shape', () => {
  expectInternalFailure(() => checkPomRxV01ReceiptIdUniqueness([]));
  expectInternalFailure(() => checkPomRxV01ReceiptIdUniqueness([
    receipt('execution'),
  ]));
  expectInternalFailure(() => checkPomRxV01ReceiptIdUniqueness([
    receipt('preflight'),
    receipt('reconciliation'),
  ]));
  expectInternalFailure(() => checkPomRxV01ReceiptIdUniqueness([
    receipt('preflight', 'short'),
  ]));
});

test('same receipt ID reused in separate invocations is not claimed as cross-chain replay detection', () => {
  const reusedAcrossChains = 'receipt_cross_chain_reuse_0001';

  assert.deepEqual(checkPomRxV01ReceiptIdUniqueness([
    receipt('preflight', reusedAcrossChains),
  ]), []);
  assert.deepEqual(checkPomRxV01ReceiptIdUniqueness([
    receipt('preflight', reusedAcrossChains),
  ]), []);
});

test('all five invariant families cannot self-activate through the test-only readiness harness', () => {
  const implementedInvariants = [
    POM_RX_V01_ACTION_CONTINUITY_INVARIANT,
    POM_RX_V01_INPUT_CONTINUITY_INVARIANT,
    POM_RX_V01_EXECUTION_ASSERTION_CONSISTENCY_INVARIANT,
    POM_RX_V01_RECONCILIATION_ASSERTION_CONSISTENCY_INVARIANT,
    POM_RX_V01_RECEIPT_ID_UNIQUENESS_INVARIANT,
  ];
  const sourceClosure = implementationPaths.map((path) => ({
    path,
    bytes: readFileSync(path),
  }));

  expectInternalFailure(() => createPomRxV01ProfileReadiness({
    sourceClosure,
    implementedInvariants,
  }));
});

test('receipt-ID uniqueness implementation remains internal and leaves legacy verifier unchanged', () => {
  const legacySource = readFileSync('sdk/typescript/pom-rx.mjs', 'utf8');
  assert.doesNotMatch(legacySource, /pom-rx-v01-receipt-id-uniqueness/u);
  assert.doesNotMatch(legacySource, /checkPomRxV01ReceiptIdUniqueness/u);
});
