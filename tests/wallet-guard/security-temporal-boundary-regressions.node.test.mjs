import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WalletGuardProviderError,
  createWalletGuardReferenceProviderGateway,
} from '../../applications/blockchain-digital-assets/wallet-guard/provider.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const RECIPIENT = `0x${'3'.repeat(40)}`;
const ORIGIN = 'https://fixture.wallet-guard.local';
const CHAIN_ID = '0x1';
const TX_RESULT = `0x${'a'.repeat(64)}`;
const NOW = '2026-08-19T17:00:00.000Z';
const EXPIRED_WITNESS = '2026-08-19T16:59:00.000Z';

function hash(character) {
  return character.repeat(64);
}

function sendTransaction() {
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

function expiredReferenceAuthorization() {
  return {
    run_id: 'run-wallet-guard-security-00000021',
    agent_ref: 'agent-wallet-guard-21',
    subject_ref: 'subject-wallet-guard-21',
    preflight_receipt_hash: hash('5'),
    witness_ack_hash: hash('6'),
    source_key_id: `ed25519-${'a'.repeat(32)}`,
    witness_key_id: `ed25519-${'b'.repeat(32)}`,
    verification_profile: 'pom-rx-v0.1/strict-errata-1',
    verifier_version: 'pom-rx-v0.1-strict-verifier/1',
    implementation_artifact_sha256: hash('3'),
    effective_verification_policy_sha256: hash('4'),
    witness_valid_until: EXPIRED_WITNESS,
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
    trustedClock: () => NOW,
    referenceAuthorizationForRequest: () => expiredReferenceAuthorization(),
    capabilityLifetimeMs: 30_000,
  });
  return {
    gateway,
    sensitiveCallCount: () => state.sensitiveCalls,
  };
}

test('expired witness cannot be revived by post-import global Date replacement', async () => {
  const { gateway, sensitiveCallCount } = createGateway();
  const NativeDate = globalThis.Date;
  const nativeParse = NativeDate.parse;

  class PoisonedDate {
    constructor(value) {
      this.value = value;
    }

    getTime() {
      if (this.value === EXPIRED_WITNESS) {
        return nativeParse('2099-01-01T00:00:00.000Z');
      }
      if (typeof this.value === 'number') return this.value;
      return nativeParse(this.value);
    }

    toISOString() {
      if (typeof this.value === 'number') {
        return new NativeDate(this.value).toISOString();
      }
      return this.value;
    }
  }

  globalThis.Date = PoisonedDate;
  try {
    await assert.rejects(
      gateway.request(sendTransaction()),
      (error) => error instanceof WalletGuardProviderError
        && error.code === 'POMRX_WG_PROVIDER_E_TIME_INVALID',
    );
  } finally {
    globalThis.Date = NativeDate;
  }

  assert.equal(sensitiveCallCount(), 0);
});

test('expired witness cannot be revived by post-import Date.prototype.getTime drift', async () => {
  const { gateway, sensitiveCallCount } = createGateway();
  const NativeDate = globalThis.Date;
  const originalGetTime = NativeDate.prototype.getTime;
  const expiredMs = NativeDate.parse(EXPIRED_WITNESS);

  NativeDate.prototype.getTime = function poisonedGetTime() {
    const actual = Reflect.apply(originalGetTime, this, []);
    if (actual === expiredMs) {
      return NativeDate.parse('2099-01-01T00:00:00.000Z');
    }
    return actual;
  };

  try {
    await assert.rejects(
      gateway.request(sendTransaction()),
      (error) => error instanceof WalletGuardProviderError
        && error.code === 'POMRX_WG_PROVIDER_E_TIME_INVALID',
    );
  } finally {
    NativeDate.prototype.getTime = originalGetTime;
  }

  assert.equal(sensitiveCallCount(), 0);
});
