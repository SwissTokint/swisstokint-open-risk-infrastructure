import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WalletGuardControlledHostError,
  createWalletGuardControlledReferenceHost,
} from '../../applications/blockchain-digital-assets/wallet-guard/controlled-host.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const RECIPIENT = `0x${'3'.repeat(40)}`;
const ORIGIN = 'https://controlled.wallet-guard.local';
const CHAIN_ID = '0x1';
const TX_RESULT = `0x${'a'.repeat(64)}`;
const SENSITIVE_CALL_CAPACITY = 64;
const hash = (character) => character.repeat(64);

function sendTransaction() {
  return {
    method: 'eth_sendTransaction',
    params: [{
      from: ACCOUNT,
      to: RECIPIENT,
      value: '0x1',
      data: '0x',
    }],
  };
}

function policy() {
  return {
    schema_version: 'wallet-guard-policy/0.1',
    policy_id: 'wallet-guard-controlled-host-push-regression/0.1',
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

function indexedHash(index, offset) {
  return (20_000n + (BigInt(index) * 2n) + BigInt(offset))
    .toString(16)
    .padStart(64, '0');
}

function referenceAuthorizationFactory() {
  let counter = 0;
  return () => {
    counter += 1;
    return {
      run_id: `run-controlled-push-${String(counter).padStart(8, '0')}`,
      agent_ref: 'agent-controlled-push-01',
      subject_ref: 'subject-controlled-push-01',
      preflight_receipt_hash: indexedHash(counter, 0),
      witness_ack_hash: indexedHash(counter, 1),
      source_key_id: `ed25519-${'a'.repeat(32)}`,
      witness_key_id: `ed25519-${'b'.repeat(32)}`,
      verification_profile: 'pom-rx-v0.1/strict-errata-1',
      verifier_version: 'pom-rx-v0.1-strict-verifier/1',
      implementation_artifact_sha256: hash('3'),
      effective_verification_policy_sha256: hash('4'),
      witness_valid_until: '2026-08-20T20:10:00.000Z',
    };
  };
}

function expectHostCode(error, code) {
  assert.ok(error instanceof WalletGuardControlledHostError);
  assert.equal(error.code, code);
  return true;
}

test('post-import Array.prototype.push drift cannot bypass sensitive-call capacity', async () => {
  const { page, testAuthority } = createWalletGuardControlledReferenceHost({
    trustedOrigin: ORIGIN,
    chainId: CHAIN_ID,
    accounts: [ACCOUNT],
    policy: policy(),
    trustedClock: () => '2026-08-20T20:00:00.000Z',
    referenceAuthorizationForRequest: referenceAuthorizationFactory(),
    capabilityLifetimeMs: 30_000,
    providerResult: TX_RESULT,
  });

  const originalPush = Array.prototype.push;
  Array.prototype.push = function poisonedPush(...values) {
    if (values.length === 1
        && values[0]
        && typeof values[0] === 'object'
        && values[0].method === 'eth_sendTransaction') {
      return this.length;
    }
    return Reflect.apply(originalPush, this, values);
  };

  try {
    for (let index = 0; index < SENSITIVE_CALL_CAPACITY; index += 1) {
      const result = await page.ethereum.request(sendTransaction());
      assert.equal(result.forwarded, true);
    }

    await assert.rejects(
      page.ethereum.request(sendTransaction()),
      (error) => expectHostCode(error, 'POMRX_WG_HOST_E_LOG_FULL'),
    );
  } finally {
    Array.prototype.push = originalPush;
  }

  const state = testAuthority.inspect();
  assert.equal(state.sensitive_call_count, SENSITIVE_CALL_CAPACITY);
  assert.equal(state.in_flight_request_count, 0);
});
