import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WalletGuardPolicyStateError,
  createWalletGuardReferencePolicyController,
} from '../../applications/blockchain-digital-assets/wallet-guard/policy-controller.mjs';
import {
  normalizeWalletGuardIntent,
} from '../../applications/blockchain-digital-assets/wallet-guard/intent.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const RECIPIENT = `0x${'3'.repeat(40)}`;
const ORIGIN = 'https://fixture.wallet-guard.local';
const CHAIN_ID = '0x1';

function policy(overrides = {}) {
  return {
    schema_version: 'wallet-guard-policy/0.1',
    policy_id: 'wallet-guard-reference-policy/0.1',
    enabled: true,
    kill_switch: false,
    expected_chain_id: CHAIN_ID,
    allowed_origins: [ORIGIN],
    allowed_targets: [],
    allowed_recipients: [RECIPIENT],
    allowed_spenders: [],
    allowed_typed_data_verifying_contracts: [],
    max_native_value: '1000',
    max_token_amount: '1000000',
    deny_unlimited_allowance: true,
    deny_operator_approval: true,
    require_simulation_for: [],
    ...overrides,
  };
}

function nativeIntent() {
  return normalizeWalletGuardIntent({
    requestId: 'wg-policy-controller-reentrant-eval-0001',
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

test('reentrant mutation cannot overwrite an in-progress compare-and-swap transition', { concurrency: false }, () => {
  const controller = createWalletGuardReferencePolicyController({ policy: policy() });
  const originalNormalize = String.prototype.normalize;
  let nestedError = null;
  let attempted = false;

  String.prototype.normalize = function normalize(form) {
    if (!attempted && String(this) === 'wallet_guard_policy_state/0.1' && form === 'NFC') {
      attempted = true;
      try {
        controller.engageKillSwitch({ expected_revision: 0 });
      } catch (error) {
        nestedError = error;
      }
    }
    return originalNormalize.call(this, form);
  };

  let replacement;
  try {
    replacement = controller.replacePolicy({
      expected_revision: 0,
      policy: policy({ max_native_value: '10' }),
    });
  } finally {
    String.prototype.normalize = originalNormalize;
  }

  assert.ok(nestedError instanceof WalletGuardPolicyStateError);
  assert.equal(nestedError.code, 'POMRX_WG_POLICY_STATE_E_REENTRANT');
  assert.equal(replacement.revision, 1);
  assert.equal(replacement.kill_switch, false);
  assert.equal(replacement.policy.max_native_value, '10');
  assert.strictEqual(controller.readSnapshot(), replacement);
});

test('reentrant idempotent kill cannot report success inside an in-progress re-enable', { concurrency: false }, () => {
  const controller = createWalletGuardReferencePolicyController({ policy: policy() });
  const killed = controller.engageKillSwitch({ expected_revision: 0 });
  assert.equal(killed.revision, 1);
  assert.equal(killed.kill_switch, true);

  const originalNormalize = String.prototype.normalize;
  let nestedError = null;
  let nestedResult = null;
  let attempted = false;

  String.prototype.normalize = function normalize(form) {
    if (!attempted && String(this) === 'wallet_guard_policy_state/0.1' && form === 'NFC') {
      attempted = true;
      try {
        nestedResult = controller.engageKillSwitch({ expected_revision: 1 });
      } catch (error) {
        nestedError = error;
      }
    }
    return originalNormalize.call(this, form);
  };

  let reenabled;
  try {
    reenabled = controller.replacePolicy({
      expected_revision: 1,
      policy: policy(),
    });
  } finally {
    String.prototype.normalize = originalNormalize;
  }

  assert.equal(nestedResult, null);
  assert.ok(nestedError instanceof WalletGuardPolicyStateError);
  assert.equal(nestedError.code, 'POMRX_WG_POLICY_STATE_E_REENTRANT');
  assert.equal(reenabled.revision, 2);
  assert.equal(reenabled.kill_switch, false);
  assert.strictEqual(controller.readSnapshot(), reenabled);
});

test('reentrant kill-switch mutation cannot turn a state-stable evaluation into stale ALLOW', { concurrency: false }, () => {
  const controller = createWalletGuardReferencePolicyController({ policy: policy() });
  const intent = nativeIntent();
  const originalTest = RegExp.prototype.test;
  let nestedError = null;
  let attempted = false;

  RegExp.prototype.test = function test(value) {
    if (!attempted && value === 'wallet-guard-reference-policy/0.1') {
      attempted = true;
      try {
        controller.engageKillSwitch({ expected_revision: 0 });
      } catch (error) {
        nestedError = error;
      }
    }
    return Reflect.apply(originalTest, this, [value]);
  };

  let result;
  try {
    result = controller.evaluate(intent);
  } finally {
    RegExp.prototype.test = originalTest;
  }

  assert.equal(attempted, true);
  assert.ok(nestedError instanceof WalletGuardPolicyStateError);
  assert.equal(nestedError.code, 'POMRX_WG_POLICY_STATE_E_REENTRANT');
  assert.equal(result.decision, 'ALLOW');
  assert.equal(result.policy_state_revision, 0);
  assert.equal(controller.readSnapshot().revision, 0);
  assert.equal(controller.readSnapshot().kill_switch, false);
});

test('operation lock is released after a failed prospective transition', { concurrency: false }, () => {
  const controller = createWalletGuardReferencePolicyController({ policy: policy() });
  const originalNormalize = String.prototype.normalize;
  const sentinel = new TypeError('prospective transition failed');

  String.prototype.normalize = function normalize(form) {
    if (String(this) === 'wallet_guard_policy_state/0.1' && form === 'NFC') throw sentinel;
    return originalNormalize.call(this, form);
  };
  try {
    assert.throws(
      () => controller.replacePolicy({
        expected_revision: 0,
        policy: policy({ max_native_value: '10' }),
      }),
      (error) => error === sentinel,
    );
  } finally {
    String.prototype.normalize = originalNormalize;
  }

  const engaged = controller.engageKillSwitch({ expected_revision: 0 });
  assert.equal(engaged.revision, 1);
  assert.equal(engaged.kill_switch, true);
});
