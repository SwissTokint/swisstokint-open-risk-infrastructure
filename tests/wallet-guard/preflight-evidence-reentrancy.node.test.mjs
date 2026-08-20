import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WalletGuardPreflightEvidenceError,
  createWalletGuardPreflightEvidenceBuilder,
} from '../../applications/blockchain-digital-assets/wallet-guard/preflight-evidence.mjs';
import {
  normalizeWalletGuardIntent,
} from '../../applications/blockchain-digital-assets/wallet-guard/intent.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const RECIPIENT = `0x${'3'.repeat(40)}`;
const ORIGIN = 'https://fixture.wallet-guard.local';
const CHAIN_ID = '0x1';

function intent() {
  return normalizeWalletGuardIntent({
    requestId: 'wg-preflight-reentrant-0001',
    trustedOrigin: ORIGIN,
    trustedChainId: CHAIN_ID,
    trustedAccount: ACCOUNT,
    request: {
      method: 'eth_sendTransaction',
      params: [{
        from: ACCOUNT,
        to: RECIPIENT,
        value: '0x1',
        data: '0x',
      }],
    },
  });
}

function policy() {
  return {
    schema_version: 'wallet-guard-policy/0.1',
    policy_id: 'wallet-guard-preflight-reentrant/0.1',
    enabled: true,
    kill_switch: false,
    expected_chain_id: CHAIN_ID,
    allowed_origins: [ORIGIN],
    allowed_targets: [],
    allowed_recipients: [RECIPIENT],
    allowed_spenders: [],
    allowed_typed_data_verifying_contracts: [],
    max_native_value: '1000',
    max_token_amount: '1000',
    deny_unlimited_allowance: true,
    deny_operator_approval: true,
    require_simulation_for: [],
  };
}

function buildInput(intentValue = intent()) {
  return {
    intent: intentValue,
    policy: policy(),
    evidenceId: 'evidence_wg_preflight_reentrant_0001',
    runId: 'run_wg_preflight_reentrant_0001',
    agentRef: 'wallet-guard-reentrant-agent',
    subjectRef: 'wallet:reentrant-subject-01',
    sourceKeyId: 'wallet-guard-source-01',
  };
}

test('trusted clock cannot re-enter build and mint duplicate receipt identity', () => {
  const rawInput = buildInput();
  let builder;
  let nestedError = null;
  let clockCalls = 0;

  builder = createWalletGuardPreflightEvidenceBuilder({
    trustedClock() {
      clockCalls += 1;
      if (clockCalls === 1) {
        try {
          builder.build(rawInput);
        } catch (error) {
          nestedError = error;
        }
      }
      return '2026-08-20T01:00:00.000Z';
    },
  });

  const evidence = builder.build(rawInput);
  assert.ok(nestedError instanceof WalletGuardPreflightEvidenceError);
  assert.equal(nestedError.code, 'POMRX_WG_PREFLIGHT_E_REENTRANT');
  assert.equal(clockCalls, 1);
  assert.equal(evidence.evidence_id, rawInput.evidenceId);
  assert.equal(evidence.run_id, rawInput.runId);
  assert.equal(evidence.portable_preflight_produced, true);

  assert.throws(
    () => builder.build(rawInput),
    (error) => {
      assert.ok(error instanceof WalletGuardPreflightEvidenceError);
      assert.equal(error.code, 'POMRX_WG_PREFLIGHT_E_REPLAY');
      return true;
    },
  );
});

test('reentrancy guard is released after a failed outer build', () => {
  const rawInput = buildInput();
  let builder;
  let first = true;
  const sentinel = new Error('clock failure');

  builder = createWalletGuardPreflightEvidenceBuilder({
    trustedClock() {
      if (first) {
        first = false;
        throw sentinel;
      }
      return '2026-08-20T01:00:00.000Z';
    },
  });

  assert.throws(
    () => builder.build(rawInput),
    (error) => {
      assert.ok(error instanceof WalletGuardPreflightEvidenceError);
      assert.equal(error.code, 'POMRX_WG_PREFLIGHT_E_TIME_INVALID');
      return true;
    },
  );

  const evidence = builder.build(rawInput);
  assert.equal(evidence.wallet_guard_decision, 'ALLOW');
});
