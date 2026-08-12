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
  run_id: 'run_pomrx_demo_20260728',
  agent_ref: 'eip155:84532:erc8004:agent-42',
  subject_ref: 'market:BTC-USD',
  method_hash: hash('a'),
  policy_hash: hash('b'),
  input_commitment: hash('c'),
  action_commitment: hash('d'),
  source_key_id: 'pom-rx-demo-key',
};
const passingAssertions = [
  {
    rule_id: 'max-notional',
    rule_hash: hash('e'),
    result: 'pass',
    proof_mode: 'commitment',
    evidence_hash: hash('f'),
  },
  {
    rule_id: 'withdrawals-disabled',
    rule_hash: hash('1'),
    result: 'pass',
    proof_mode: 'public',
    evidence_hash: hash('2'),
  },
];

function makePreflight(overrides = {}) {
  return {
    ...shared,
    receipt_id: 'receipt_preflight_20260728',
    phase: 'preflight',
    outcome: 'allow',
    assertions: passingAssertions,
    previous_receipt_hash: null,
    occurred_at: '2026-07-28T18:00:00.000Z',
    ...overrides,
  };
}

function makeExecution(previousReceiptHash, overrides = {}) {
  return {
    ...shared,
    receipt_id: 'receipt_execution_20260728',
    phase: 'execution',
    outcome: 'accepted',
    assertions: [{
      rule_id: 'venue-acknowledged',
      rule_hash: hash('3'),
      result: 'pass',
      proof_mode: 'commitment',
      evidence_hash: hash('4'),
    }],
    previous_receipt_hash: previousReceiptHash,
    occurred_at: '2026-07-28T18:00:01.000Z',
    ...overrides,
  };
}

function makeReconciliation(previousReceiptHash, overrides = {}) {
  return {
    ...shared,
    receipt_id: 'receipt_reconcile_20260728',
    phase: 'reconciliation',
    outcome: 'matched',
    assertions: [{
      rule_id: 'execution-matches-intent',
      rule_hash: hash('5'),
      result: 'pass',
      proof_mode: 'commitment',
      evidence_hash: hash('6'),
    }],
    previous_receipt_hash: previousReceiptHash,
    occurred_at: '2026-07-28T18:00:03.000Z',
    ...overrides,
  };
}

test('POM-RX validates an allowed preflight without disclosing numeric limits', () => {
  const receipt = validatePomRxReceipt(makePreflight());
  assert.equal(receipt.phase, 'preflight');
  assert.equal(receipt.outcome, 'allow');
  assert.deepEqual(
    receipt.assertions.map(({ rule_id: ruleId }) => ruleId),
    ['max-notional', 'withdrawals-disabled'],
  );
});

test('POM-RX verifies a hash-linked preflight, execution and reconciliation chain', () => {
  const preflight = makePreflight();
  const execution = makeExecution(commitPomRxReceipt(preflight).receiptHash);
  const reconciliation = makeReconciliation(commitPomRxReceipt(execution).receiptHash);
  const result = verifyPomRxChain([preflight, execution, reconciliation]);

  assert.equal(result.ok, true);
  assert.equal(result.status, 'reconciliation:matched');
  assert.equal(result.receipt_hashes.length, 3);
});

test('POM-RX rejects post-hoc execution without a preflight receipt', () => {
  const result = verifyPomRxChain([makeExecution(hash('7'))]);
  assert.equal(result.ok, false);
  assert.match(result.error, /start with preflight/);
});

test('POM-RX rejects a broken receipt link', () => {
  const preflight = makePreflight();
  const execution = makeExecution(hash('7'));
  const result = verifyPomRxChain([preflight, execution], { allowPartial: true });
  assert.equal(result.ok, false);
  assert.match(result.error, /does not match/);
});

test('POM-RX rejects method or policy substitution within one run', () => {
  const preflight = makePreflight();
  const execution = makeExecution(
    commitPomRxReceipt(preflight).receiptHash,
    { policy_hash: hash('8') },
  );
  const result = verifyPomRxChain([preflight, execution], { allowPartial: true });
  assert.equal(result.ok, false);
  assert.match(result.error, /policy_hash changed/);
});

test('POM-RX deny receipts require a failed assertion and stop execution', () => {
  const denied = makePreflight({
    outcome: 'deny',
    assertions: [{ ...passingAssertions[0], result: 'fail' }],
  });
  assert.equal(verifyPomRxChain([denied]).ok, true);

  const execution = makeExecution(commitPomRxReceipt(denied).receiptHash);
  const invalid = verifyPomRxChain([denied, execution], { allowPartial: true });
  assert.equal(invalid.ok, false);
  assert.match(invalid.error, /denied preflight/);
});

test('POM-RX fail-closes on unknown fields and duplicate rules', () => {
  assert.throws(
    () => validatePomRxReceipt({ ...makePreflight(), exchange_api_key: 'forbidden' }),
    /missing or unknown fields/,
  );
  assert.throws(
    () => validatePomRxReceipt({
      ...makePreflight(),
      assertions: [passingAssertions[0], passingAssertions[0]],
    }),
    /repeat a rule_id/,
  );
});

test('POM-RX rejects receipts whose timestamp moves backwards', () => {
  const preflight = makePreflight();
  const execution = makeExecution(
    commitPomRxReceipt(preflight).receiptHash,
    { occurred_at: '2026-07-28T17:59:59.000Z' },
  );
  const result = verifyPomRxChain([preflight, execution], { allowPartial: true });

  assert.equal(result.ok, false);
  assert.match(result.error, /time cannot move backwards/);
});

test('POM-RX rejects a chain with a missing lifecycle phase', () => {
  const preflight = makePreflight();
  const reconciliation = makeReconciliation(commitPomRxReceipt(preflight).receiptHash);
  const result = verifyPomRxChain([preflight, reconciliation]);

  assert.equal(result.ok, false);
  assert.match(result.error, /phases must be contiguous and ordered/);
});

test('POM-RX rejects a chain with an additional lifecycle receipt', () => {
  const preflight = makePreflight();
  const execution = makeExecution(commitPomRxReceipt(preflight).receiptHash);
  const reconciliation = makeReconciliation(commitPomRxReceipt(execution).receiptHash);
  const additional = makeReconciliation(commitPomRxReceipt(reconciliation).receiptHash, {
    receipt_id: 'receipt_additional_20260728',
    occurred_at: '2026-07-28T18:00:04.000Z',
  });
  const result = verifyPomRxChain([preflight, execution, reconciliation, additional]);

  assert.equal(result.ok, false);
  assert.match(result.error, /cannot exceed three receipts/);
});

test('POM-RX rejects an unknown receipt schema', () => {
  assert.throws(
    () => validatePomRxReceipt({ ...makePreflight(), schema_version: 'pom-rx/9.9' }),
    /Unsupported POM-RX schema version/,
  );
});

test('POM-RX rejects an oversized canonical receipt', () => {
  const assertions = Array.from({ length: 64 }, (_, index) => ({
    rule_id: `rule-${index.toString().padStart(2, '0')}-${'x'.repeat(54)}`,
    rule_hash: hash('e'),
    result: 'pass',
    proof_mode: 'commitment',
    evidence_hash: hash('f'),
  }));
  const oversized = makePreflight({
    agent_ref: 'a'.repeat(256),
    subject_ref: 's'.repeat(256),
    assertions,
  });

  assert.throws(
    () => commitPomRxReceipt(oversized),
    /Canonical payload exceeds 16 KiB/,
  );
});
