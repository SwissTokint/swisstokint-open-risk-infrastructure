import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildWalletGuardPreflightEvidence,
  WalletGuardPreflightEvidenceError,
} from '../../applications/blockchain-digital-assets/wallet-guard/preflight-evidence.mjs';
import {
  normalizeWalletGuardIntent,
} from '../../applications/blockchain-digital-assets/wallet-guard/intent.mjs';
import {
  verifyPomRxChain,
} from '../../sdk/typescript/pom-rx.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const TOKEN = `0x${'2'.repeat(40)}`;
const RECIPIENT = `0x${'3'.repeat(40)}`;
const OTHER = `0x${'8'.repeat(40)}`;
const ORIGIN = 'https://fixture.wallet-guard.local';
const CHAIN_ID = '0x1';

function addressWord(address) {
  return `${'0'.repeat(24)}${address.slice(2).toLowerCase()}`;
}

function uintWord(value) {
  return BigInt(value).toString(16).padStart(64, '0');
}

function sendTransaction({
  from = ACCOUNT,
  to = RECIPIENT,
  value = '0x0',
  data = '0x',
} = {}) {
  return {
    method: 'eth_sendTransaction',
    params: [{ from, to, value, data }],
  };
}

function intent(request, requestId = 'wg-preflight-request-0001') {
  return normalizeWalletGuardIntent({
    requestId,
    trustedOrigin: ORIGIN,
    trustedChainId: CHAIN_ID,
    trustedAccount: ACCOUNT,
    request,
  });
}

function policy(overrides = {}) {
  return {
    schema_version: 'wallet-guard-policy/0.1',
    policy_id: 'wallet-guard-preflight-policy/0.1',
    enabled: true,
    kill_switch: false,
    expected_chain_id: CHAIN_ID,
    allowed_origins: [ORIGIN],
    allowed_targets: [TOKEN],
    allowed_recipients: [RECIPIENT],
    allowed_spenders: [],
    allowed_typed_data_verifying_contracts: [],
    max_native_value: '1000',
    max_token_amount: '1000000',
    deny_unlimited_allowance: true,
    deny_operator_approval: true,
    require_simulation_for: [
      'erc20_transfer',
      'erc20_approve',
      'permit_eip2612',
      'permit2_single',
      'set_approval_for_all',
    ],
    ...overrides,
  };
}

function buildInput({
  intentValue = intent(sendTransaction({ value: '0x64' })),
  policyValue = policy(),
  overrides = {},
} = {}) {
  return {
    intent: intentValue,
    policy: policyValue,
    receiptId: 'receipt_wg_preflight_0001',
    runId: 'run_wg_preflight_0001',
    agentRef: 'wallet-guard-reference-agent',
    subjectRef: 'wallet:fixture-account-01',
    occurredAt: '2026-08-20T01:00:00.000Z',
    sourceKeyId: 'wallet-guard-source-01',
    ...overrides,
  };
}

function expectCode(error, code) {
  assert.ok(error instanceof WalletGuardPreflightEvidenceError);
  assert.equal(error.code, code);
  return true;
}

test('ALLOW creates one portable POM-RX preflight receipt bound to the exact intent and policy', () => {
  const evidence = buildWalletGuardPreflightEvidence(buildInput());

  assert.equal(evidence.wallet_guard_decision, 'ALLOW');
  assert.deepEqual(evidence.wallet_guard_reasons, ['WG_POLICY_ALLOW_EXACT']);
  assert.equal(evidence.portable_preflight_produced, true);
  assert.equal(evidence.pom_rx_receipt.phase, 'preflight');
  assert.equal(evidence.pom_rx_receipt.outcome, 'allow');
  assert.equal(evidence.pom_rx_receipt.action_commitment, evidence.action_commitment);
  assert.equal(evidence.pom_rx_receipt.input_commitment, evidence.input_commitment);
  assert.equal(evidence.pom_rx_receipt.policy_hash, evidence.policy_hash);
  assert.equal(evidence.authorization_eligible, false);
  assert.equal(evidence.authorization_proved, false);
  assert.equal(evidence.reference_only, true);
  assert.match(evidence.pom_rx_receipt_hash, /^[a-f0-9]{64}$/u);
  assert.match(evidence.decision_commitment, /^[a-f0-9]{64}$/u);

  const verified = verifyPomRxChain([evidence.pom_rx_receipt], { allowPartial: true });
  assert.equal(verified.ok, true, verified.error);
});

test('deterministic DENY creates a deny receipt with a failed forwardable assertion', () => {
  const deniedIntent = intent(sendTransaction({ to: OTHER, value: '0x1' }));
  const evidence = buildWalletGuardPreflightEvidence(buildInput({ intentValue: deniedIntent }));

  assert.equal(evidence.wallet_guard_decision, 'DENY');
  assert.ok(evidence.wallet_guard_reasons.includes('WG_POLICY_DENY_RECIPIENT'));
  assert.equal(evidence.portable_preflight_produced, true);
  assert.equal(evidence.pom_rx_receipt.outcome, 'deny');

  const forwardable = evidence.pom_rx_receipt.assertions.find(
    ({ rule_id: ruleId }) => ruleId === 'wallet-guard-forwardable',
  );
  assert.equal(forwardable.result, 'fail');

  const verified = verifyPomRxChain([evidence.pom_rx_receipt], { allowPartial: true });
  assert.equal(verified.ok, true, verified.error);
});

test('INDETERMINATE is never collapsed into a legacy POM-RX deny receipt', () => {
  const transfer = `0xa9059cbb${addressWord(RECIPIENT)}${uintWord(25)}`;
  const transferIntent = intent(sendTransaction({ to: TOKEN, data: transfer }));
  const evidence = buildWalletGuardPreflightEvidence(buildInput({ intentValue: transferIntent }));

  assert.equal(evidence.wallet_guard_decision, 'INDETERMINATE');
  assert.ok(evidence.wallet_guard_reasons.includes('WG_POLICY_INDETERMINATE_SIMULATION'));
  assert.equal(evidence.portable_preflight_produced, false);
  assert.equal(evidence.pom_rx_receipt, null);
  assert.equal(evidence.pom_rx_receipt_hash, null);
  assert.equal(evidence.authorization_eligible, false);
  assert.match(evidence.decision_commitment, /^[a-f0-9]{64}$/u);
});

test('the adapter deliberately cannot accept caller-supplied simulation pass evidence', () => {
  const raw = buildInput();
  raw.simulation = { status: 'pass' };
  assert.throws(
    () => buildWalletGuardPreflightEvidence(raw),
    (error) => expectCode(error, 'POMRX_WG_PREFLIGHT_E_INVALID'),
  );
});

test('structural intent clones cannot inherit local normalization provenance', () => {
  const localIntent = intent(sendTransaction({ value: '0x1' }));
  const clone = { ...localIntent };

  assert.throws(
    () => buildWalletGuardPreflightEvidence(buildInput({ intentValue: clone })),
    (error) => expectCode(error, 'POMRX_WG_PREFLIGHT_E_INTENT'),
  );
});

test('top-level accessors are rejected without executing getter bodies', () => {
  let reads = 0;
  const raw = buildInput();
  Object.defineProperty(raw, 'policy', {
    enumerable: true,
    get() {
      reads += 1;
      return policy();
    },
  });

  assert.throws(
    () => buildWalletGuardPreflightEvidence(raw),
    (error) => expectCode(error, 'POMRX_WG_PREFLIGHT_E_INVALID'),
  );
  assert.equal(reads, 0);
});

test('nested policy accessors are rejected without executing getter bodies', () => {
  let reads = 0;
  const policyValue = policy();
  Object.defineProperty(policyValue, 'kill_switch', {
    enumerable: true,
    get() {
      reads += 1;
      return false;
    },
  });

  assert.throws(
    () => buildWalletGuardPreflightEvidence(buildInput({ policyValue })),
    (error) => expectCode(error, 'POMRX_WG_PREFLIGHT_E_POLICY'),
  );
  assert.equal(reads, 0);
});

test('same exact inputs produce deterministic decision and receipt commitments', () => {
  const intentValue = intent(sendTransaction({ value: '0x7' }));
  const input = buildInput({ intentValue });
  const first = buildWalletGuardPreflightEvidence(input);
  const second = buildWalletGuardPreflightEvidence(input);

  assert.equal(first.decision_commitment, second.decision_commitment);
  assert.equal(first.input_commitment, second.input_commitment);
  assert.equal(first.action_commitment, second.action_commitment);
  assert.equal(first.pom_rx_receipt_hash, second.pom_rx_receipt_hash);
});

test('portable receipt metadata is normalized and frozen', () => {
  const evidence = buildWalletGuardPreflightEvidence(buildInput({
    overrides: {
      agentRef: 'wallet-guard-ag\u0065nt',
      subjectRef: 'wallet:fixture-subj\u0065ct',
    },
  }));

  assert.equal(Object.isFrozen(evidence), true);
  assert.equal(Object.isFrozen(evidence.pom_rx_receipt), true);
  assert.equal(Object.isFrozen(evidence.pom_rx_receipt.assertions), true);
  assert.equal(Object.isFrozen(evidence.pom_rx_receipt.assertions[0]), true);
});

test('malformed metadata fails in the preflight diagnostic family', () => {
  assert.throws(
    () => buildWalletGuardPreflightEvidence(buildInput({
      overrides: { occurredAt: '2026-08-20T01:00:00+00:00' },
    })),
    (error) => expectCode(error, 'POMRX_WG_PREFLIGHT_E_INVALID'),
  );
  assert.throws(
    () => buildWalletGuardPreflightEvidence(buildInput({
      overrides: { sourceKeyId: 'bad key id' },
    })),
    (error) => expectCode(error, 'POMRX_WG_PREFLIGHT_E_INVALID'),
  );
});
