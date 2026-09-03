import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isLocallyNormalizedWalletGuardIntent,
  normalizeWalletGuardIntent,
} from '../../applications/blockchain-digital-assets/wallet-guard/intent.mjs';
import {
  WalletGuardPolicyError,
  evaluateWalletGuardPolicy,
} from '../../applications/blockchain-digital-assets/wallet-guard/policy.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const RECIPIENT = `0x${'3'.repeat(40)}`;
const ORIGIN = 'https://fixture.wallet-guard.local';
const CHAIN_ID = '0x1';

function request() {
  return {
    method: 'eth_sendTransaction',
    params: [{ from: ACCOUNT, to: RECIPIENT, value: '0x0', data: '0x' }],
  };
}

function policy() {
  return {
    schema_version: 'wallet-guard-policy/0.1',
    policy_id: 'wallet-guard-security-policy/0.1',
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
  };
}

function locallyNormalizedIntent() {
  return normalizeWalletGuardIntent({
    requestId: 'wg-security-provenance-00000001',
    trustedOrigin: ORIGIN,
    trustedChainId: CHAIN_ID,
    trustedAccount: ACCOUNT,
    request: request(),
  });
}

test('forged intent cannot become locally normalized through WeakSet.prototype.has drift', () => {
  const legitimate = locallyNormalizedIntent();
  const forged = Object.freeze({ ...legitimate });
  assert.equal(isLocallyNormalizedWalletGuardIntent(forged), false);

  const originalHas = WeakSet.prototype.has;
  WeakSet.prototype.has = function poisonedHas(value) {
    if (value === forged) return true;
    return Reflect.apply(originalHas, this, [value]);
  };

  try {
    assert.throws(
      () => evaluateWalletGuardPolicy(forged, policy(), { status: 'not_run' }),
      (error) => error instanceof WalletGuardPolicyError
        && error.code === 'POMRX_WG_POLICY_E_INVALID',
    );
  } finally {
    WeakSet.prototype.has = originalHas;
  }
});

test('local intent branding cannot be suppressed through WeakSet.prototype.add drift', () => {
  const originalAdd = WeakSet.prototype.add;
  WeakSet.prototype.add = function poisonedAdd() {
    return this;
  };

  let intent;
  try {
    intent = locallyNormalizedIntent();
  } finally {
    WeakSet.prototype.add = originalAdd;
  }

  assert.equal(isLocallyNormalizedWalletGuardIntent(intent), true);
});
