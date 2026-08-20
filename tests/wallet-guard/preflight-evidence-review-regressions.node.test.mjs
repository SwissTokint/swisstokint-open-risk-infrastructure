import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WalletGuardPreflightEvidenceError,
  createWalletGuardPreflightEvidenceBuilder,
} from '../../applications/blockchain-digital-assets/wallet-guard/preflight-evidence.mjs';
import {
  normalizeWalletGuardIntent,
} from '../../applications/blockchain-digital-assets/wallet-guard/intent.mjs';
import {
  commitWalletGuardMethod,
} from '../../applications/blockchain-digital-assets/wallet-guard/method-commitment.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const TOKEN = `0x${'2'.repeat(40)}`;
const RECIPIENT = `0x${'3'.repeat(40)}`;
const ORIGIN = 'https://fixture.wallet-guard.local';
const CHAIN_ID = '0x1';
const FIXED_TIME = '2026-08-20T01:00:00.000Z';

function addressWord(address) {
  return `${'0'.repeat(24)}${address.slice(2).toLowerCase()}`;
}

function uintWord(value) {
  return BigInt(value).toString(16).padStart(64, '0');
}

function sendTransaction({
  to = RECIPIENT,
  value = '0x0',
  data = '0x',
} = {}) {
  return {
    method: 'eth_sendTransaction',
    params: [{ from: ACCOUNT, to, value, data }],
  };
}

function normalize(request, requestId) {
  return normalizeWalletGuardIntent({
    requestId,
    trustedOrigin: ORIGIN,
    trustedChainId: CHAIN_ID,
    trustedAccount: ACCOUNT,
    request,
  });
}

function policy() {
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
  };
}

function buildInput(intent, overrides = {}) {
  return {
    intent,
    policy: policy(),
    evidenceId: 'evidence_wg_preflight_review_0001',
    runId: 'run_wg_preflight_review_0001',
    agentRef: 'wallet-guard-reference-agent',
    subjectRef: 'wallet:fixture-account-01',
    sourceKeyId: 'wallet-guard-source-01',
    ...overrides,
  };
}

function builder() {
  return createWalletGuardPreflightEvidenceBuilder({
    trustedClock: () => FIXED_TIME,
  });
}

function expectInvalid(error) {
  assert.ok(error instanceof WalletGuardPreflightEvidenceError);
  assert.equal(error.code, 'POMRX_WG_PREFLIGHT_E_INVALID');
  return true;
}

test('agent/subject reference limits apply after NFC normalization', () => {
  const expandsUnderNfc = '\u0344'.repeat(256);
  assert.ok(expandsUnderNfc.length <= 256);
  assert.ok(expandsUnderNfc.normalize('NFC').length > 256);

  const allowIntent = normalize(
    sendTransaction({ value: '0x1' }),
    'wg-preflight-review-allow-0001',
  );
  assert.throws(
    () => builder().build(buildInput(allowIntent, { agentRef: expandsUnderNfc })),
    expectInvalid,
  );

  const transfer = `0xa9059cbb${addressWord(RECIPIENT)}${uintWord(25)}`;
  const indeterminateIntent = normalize(
    sendTransaction({ to: TOKEN, data: transfer }),
    'wg-preflight-review-indeterminate-0001',
  );
  assert.throws(
    () => builder().build(buildInput(indeterminateIntent, { subjectRef: expandsUnderNfc })),
    expectInvalid,
  );
});

test('standalone and portable evidence expose the canonical Wallet Guard method commitment', () => {
  const expectedMethodHash = commitWalletGuardMethod('eth_sendTransaction');

  const allowIntent = normalize(
    sendTransaction({ value: '0x1' }),
    'wg-preflight-review-allow-0002',
  );
  const allowEvidence = builder().build(buildInput(allowIntent));
  assert.equal(allowEvidence.method_hash, expectedMethodHash);
  assert.equal(allowEvidence.pom_rx_receipt.method_hash, expectedMethodHash);

  const transfer = `0xa9059cbb${addressWord(RECIPIENT)}${uintWord(25)}`;
  const indeterminateIntent = normalize(
    sendTransaction({ to: TOKEN, data: transfer }),
    'wg-preflight-review-indeterminate-0002',
  );
  const indeterminateEvidence = builder().build(buildInput(indeterminateIntent));
  assert.equal(indeterminateEvidence.wallet_guard_decision, 'INDETERMINATE');
  assert.equal(indeterminateEvidence.portable_preflight_produced, false);
  assert.equal(indeterminateEvidence.pom_rx_receipt, null);
  assert.equal(indeterminateEvidence.method_hash, expectedMethodHash);
});
