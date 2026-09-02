import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createWalletGuardReferenceProviderGateway,
} from '../../applications/blockchain-digital-assets/wallet-guard/provider.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const RECIPIENT = `0x${'3'.repeat(40)}`;
const ORIGIN = 'https://fixture.wallet-guard.local';
const CHAIN_ID = '0x1';
const TX_RESULT = `0x${'a'.repeat(64)}`;

function hash(character) {
  return character.repeat(64);
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

function referenceAuthorizationRecord() {
  return {
    run_id: 'run-wallet-guard-security-00000031',
    agent_ref: 'agent-wallet-guard-31',
    subject_ref: 'subject-wallet-guard-31',
    preflight_receipt_hash: hash('5'),
    witness_ack_hash: hash('6'),
    source_key_id: `ed25519-${'a'.repeat(32)}`,
    witness_key_id: `ed25519-${'b'.repeat(32)}`,
    verification_profile: 'pom-rx-v0.1/strict-errata-1',
    verifier_version: 'pom-rx-v0.1-strict-verifier/1',
    implementation_artifact_sha256: hash('3'),
    effective_verification_policy_sha256: hash('4'),
    witness_valid_until: '2026-08-19T17:01:00.000Z',
  };
}

function createGateway() {
  const state = { sensitiveCalls: 0 };
  const provider = Object.freeze({
    async request(request) {
      if (request.method === 'eth_chainId') return CHAIN_ID;
      if (request.method === 'eth_accounts') return [ACCOUNT];
      state.sensitiveCalls += 1;
      return TX_RESULT;
    },
  });
  const gateway = createWalletGuardReferenceProviderGateway({
    captureTrustedOrigin: () => ORIGIN,
    provider,
    policy: policy(),
    trustedClock: () => '2026-08-19T17:00:00.000Z',
    referenceAuthorizationForRequest: () => referenceAuthorizationRecord(),
    capabilityLifetimeMs: 30_000,
  });
  return {
    gateway,
    sensitiveCallCount: () => state.sensitiveCalls,
  };
}

test('unsupported transaction field cannot be hidden by post-import Object.keys drift', async () => {
  const { gateway, sensitiveCallCount } = createGateway();
  const tx = {
    from: ACCOUNT,
    to: RECIPIENT,
    value: '0x0',
    data: '0x',
    gas: '0x5208',
  };
  const request = { method: 'eth_sendTransaction', params: [tx] };
  const originalKeys = Object.keys;
  Object.keys = function poisonedKeys(value) {
    const keys = originalKeys(value);
    if (value === tx) return keys.filter((key) => key !== 'gas');
    return keys;
  };

  try {
    await assert.rejects(
      gateway.request(request),
      (error) => error?.code === 'POMRX_WG_E_REQUEST_INVALID',
    );
  } finally {
    Object.keys = originalKeys;
  }

  assert.equal(sensitiveCallCount(), 0);
});

test('EIP-1193 params shape cannot be forged by post-import Array.isArray drift', async () => {
  const { gateway, sensitiveCallCount } = createGateway();
  const fakeParams = {
    0: { from: ACCOUNT, to: RECIPIENT, value: '0x0', data: '0x' },
    length: 1,
  };
  const request = { method: 'eth_sendTransaction', params: fakeParams };
  const originalIsArray = Array.isArray;
  Array.isArray = function poisonedIsArray(value) {
    if (value === fakeParams) return true;
    return originalIsArray(value);
  };

  try {
    await assert.rejects(
      gateway.request(request),
      (error) => error?.code === 'POMRX_WG_E_REQUEST_INVALID'
        || error?.code === 'POMRX_WG_PROVIDER_E_REQUEST_INVALID',
    );
  } finally {
    Array.isArray = originalIsArray;
  }

  assert.equal(sensitiveCallCount(), 0);
});
