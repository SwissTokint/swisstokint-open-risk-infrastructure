import assert from 'node:assert/strict';
import test from 'node:test';

import {
  commitPomRxReceipt,
  validatePomRxReceipt,
  verifyPomRxChain,
} from '../sdk/typescript/pom-rx.mjs';

const hash = (character) => character.repeat(64);
const shared = {
  schema_version: 'pom-rx/0.1',
  run_id: 'run_pomrx_integrity_20260808',
  agent_ref: 'eip155:84532:erc8004:agent-42',
  subject_ref: 'market:BTC-USD',
  method_hash: hash('a'),
  policy_hash: hash('b'),
  input_commitment: hash('c'),
  action_commitment: hash('d'),
  source_key_id: 'pom-rx-integrity-key',
};

function assertion(ruleId, result = 'pass') {
  return {
    rule_id: ruleId,
    rule_hash: hash('e'),
    result,
    proof_mode: 'commitment',
    evidence_hash: hash('f'),
  };
}

function makePreflight(overrides = {}) {
  return {
    ...shared,
    receipt_id: 'receipt_preflight_integrity_20260808',
    phase: 'preflight',
    outcome: 'allow',
    assertions: [assertion('preflight-policy')],
    previous_receipt_hash: null,
    occurred_at: '2026-08-08T10:00:00.000Z',
    ...overrides,
  };
}

function makeExecution(previousReceiptHash, overrides = {}) {
  return {
    ...shared,
    receipt_id: 'receipt_execution_integrity_20260808',
    phase: 'execution',
    outcome: 'accepted',
    assertions: [assertion('execution-accepted')],
    previous_receipt_hash: previousReceiptHash,
    occurred_at: '2026-08-08T10:00:01.000Z',
    ...overrides,
  };
}

function makeReconciliation(previousReceiptHash, overrides = {}) {
  return {
    ...shared,
    receipt_id: 'receipt_reconciliation_integrity_20260808',
    phase: 'reconciliation',
    outcome: 'matched',
    assertions: [assertion('reconciliation-match')],
    previous_receipt_hash: previousReceiptHash,
    occurred_at: '2026-08-08T10:00:02.000Z',
    ...overrides,
  };
}

test('rejects action_commitment substitution from preflight to execution', () => {
  const preflight = makePreflight();
  const execution = makeExecution(commitPomRxReceipt(preflight).receiptHash, {
    action_commitment: hash('1'),
  });

  const result = verifyPomRxChain([preflight, execution], { allowPartial: true });
  assert.equal(result.ok, false, 'v0.1 currently accepts a re-linked action substitution');
  assert.match(result.error, /action_commitment changed/);
});

test('rejects action_commitment substitution from execution to reconciliation', () => {
  const preflight = makePreflight();
  const execution = makeExecution(commitPomRxReceipt(preflight).receiptHash);
  const reconciliation = makeReconciliation(commitPomRxReceipt(execution).receiptHash, {
    action_commitment: hash('1'),
  });

  const result = verifyPomRxChain([preflight, execution, reconciliation]);
  assert.equal(result.ok, false, 'v0.1 currently accepts a reconciled action substitution');
  assert.match(result.error, /action_commitment changed/);
});

test('rejects execution:accepted when an execution assertion fails', () => {
  const preflight = makePreflight();
  const execution = makeExecution(commitPomRxReceipt(preflight).receiptHash, {
    assertions: [assertion('execution-accepted', 'fail')],
  });

  const result = verifyPomRxChain([preflight, execution], { allowPartial: true });
  assert.equal(result.ok, false, 'v0.1 currently permits accepted with a failed assertion');
  assert.match(result.error, /accepted execution requires every assertion to pass/);
});

test('rejects reconciliation:matched when a reconciliation assertion fails', () => {
  const preflight = makePreflight();
  const execution = makeExecution(commitPomRxReceipt(preflight).receiptHash);
  const reconciliation = makeReconciliation(commitPomRxReceipt(execution).receiptHash, {
    assertions: [assertion('reconciliation-match', 'fail')],
  });

  const result = verifyPomRxChain([preflight, execution, reconciliation]);
  assert.equal(result.ok, false, 'v0.1 currently permits matched with a failed assertion');
  assert.match(result.error, /matched reconciliation requires every assertion to pass/);
});

test('rejects duplicate receipt_id values within one chain', () => {
  const preflight = makePreflight();
  const execution = makeExecution(commitPomRxReceipt(preflight).receiptHash, {
    receipt_id: preflight.receipt_id,
  });

  const result = verifyPomRxChain([preflight, execution], { allowPartial: true });
  assert.equal(result.ok, false, 'v0.1 currently accepts duplicate receipt_id values');
  assert.match(result.error, /receipt_id cannot repeat/);
});

test('keeps canonical rule_id order identical when locale collation behavior differs', () => {
  const originalLocaleCompare = String.prototype.localeCompare;
  String.prototype.localeCompare = () => -1;
  try {
    const receipt = validatePomRxReceipt(makePreflight({
      assertions: ['a_z', 'a-z', 'a.z', 'a0z', 'azz'].map((ruleId) => assertion(ruleId)),
    }));

    assert.deepEqual(
      receipt.assertions.map(({ rule_id: ruleId }) => ruleId),
      ['a-z', 'a.z', 'a0z', 'a_z', 'azz'],
    );
  } finally {
    String.prototype.localeCompare = originalLocaleCompare;
  }
});

test('rejects action substitution after a witness acknowledgement', () => {
  const preflight = makePreflight();
  const committedPreflight = commitPomRxReceipt(preflight);
  const witnessAcknowledgement = Object.freeze({
    schema_version: 'pom-rx-witness-ack/0.1',
    receipt_hash: committedPreflight.receiptHash,
  });
  const execution = makeExecution(witnessAcknowledgement.receipt_hash, {
    action_commitment: hash('1'),
  });

  assert.equal(
    witnessAcknowledgement.receipt_hash,
    commitPomRxReceipt(preflight).receiptHash,
    'the simulated acknowledgement remains bound to the exact preflight receipt',
  );
  const result = verifyPomRxChain([preflight, execution], { allowPartial: true });
  assert.equal(result.ok, false, 'witnessing the preflight does not repair v0.1 chain continuity');
  assert.match(result.error, /action_commitment changed/);
});
