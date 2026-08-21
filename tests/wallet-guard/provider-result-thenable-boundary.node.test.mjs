import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WalletGuardProviderError,
  createWalletGuardReferenceProviderGateway,
} from '../../applications/blockchain-digital-assets/wallet-guard/provider.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const ATTACKER = `0x${'9'.repeat(40)}`;
const RECIPIENT = `0x${'3'.repeat(40)}`;
const ORIGIN = 'https://thenable-boundary.wallet-guard.local';
const TX_RESULT = `0x${'a'.repeat(64)}`;
const hash = (character) => character.repeat(64);

function policy() {
  return {
    schema_version: 'wallet-guard-policy/0.1',
    policy_id: 'wallet-guard-thenable-boundary/0.1',
    enabled: true,
    kill_switch: false,
    expected_chain_id: '0x1',
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

function authorization() {
  return {
    run_id: 'run-thenable-boundary-0001',
    agent_ref: 'agent-thenable-boundary-01',
    subject_ref: 'subject-thenable-boundary-01',
    preflight_receipt_hash: hash('1'),
    witness_ack_hash: hash('2'),
    source_key_id: `ed25519-${'a'.repeat(32)}`,
    witness_key_id: `ed25519-${'b'.repeat(32)}`,
    verification_profile: 'pom-rx-v0.1/strict-errata-1',
    verifier_version: 'pom-rx-v0.1-strict-verifier/1',
    implementation_artifact_sha256: hash('3'),
    effective_verification_policy_sha256: hash('4'),
    witness_valid_until: '2026-08-21T12:01:00.000Z',
  };
}

function nativeTransfer() {
  return {
    method: 'eth_sendTransaction',
    params: [{
      from: ACCOUNT,
      to: RECIPIENT,
      value: '0x0',
      data: '0x',
    }],
  };
}

function gateway(provider, onAuthorization = () => {}) {
  return createWalletGuardReferenceProviderGateway({
    captureTrustedOrigin: () => ORIGIN,
    provider,
    policy: policy(),
    trustedClock: () => '2026-08-21T12:00:00.000Z',
    referenceAuthorizationForRequest: () => {
      onAuthorization();
      return authorization();
    },
    capabilityLifetimeMs: 30_000,
    assertRuntimeIntegrity: () => {},
  });
}

test('synchronous account Proxy is rejected before thenable assimilation or authorization', async () => {
  let accountReads = 0;
  let thenTrapCalls = 0;
  let otherTrapCalls = 0;
  let authorizationCalls = 0;
  let sensitiveCalls = 0;

  const hostileAccounts = new Proxy([ACCOUNT], {
    get(target, key, receiver) {
      if (key === 'then') {
        thenTrapCalls += 1;
        return (resolve) => resolve([ATTACKER]);
      }
      otherTrapCalls += 1;
      return Reflect.get(target, key, receiver);
    },
  });

  const provider = Object.freeze({
    request(request) {
      if (request.method === 'eth_chainId') return '0x1';
      if (request.method === 'eth_accounts') {
        accountReads += 1;
        return hostileAccounts;
      }
      sensitiveCalls += 1;
      return TX_RESULT;
    },
  });

  const guarded = gateway(provider, () => {
    authorizationCalls += 1;
  });

  await assert.rejects(
    guarded.request(nativeTransfer()),
    (error) => {
      assert.ok(error instanceof WalletGuardProviderError);
      assert.equal(error.code, 'POMRX_WG_PROVIDER_E_CONTEXT_INVALID');
      return true;
    },
  );

  assert.equal(accountReads, 1);
  assert.equal(thenTrapCalls, 0);
  assert.equal(otherTrapCalls, 0);
  assert.equal(authorizationCalls, 0);
  assert.equal(sensitiveCalls, 0);
});

test('synchronous callable Proxy is rejected before async-return thenable assimilation', async () => {
  let accountReads = 0;
  let thenTrapCalls = 0;
  let otherTrapCalls = 0;
  let authorizationCalls = 0;
  let sensitiveCalls = 0;

  const hostileCallable = new Proxy(function hostileAccountsThenable() {}, {
    get(target, key, receiver) {
      if (key === 'then') {
        thenTrapCalls += 1;
        return (resolve) => resolve([ATTACKER]);
      }
      otherTrapCalls += 1;
      return Reflect.get(target, key, receiver);
    },
  });

  const provider = Object.freeze({
    request(request) {
      if (request.method === 'eth_chainId') return '0x1';
      if (request.method === 'eth_accounts') {
        accountReads += 1;
        return hostileCallable;
      }
      sensitiveCalls += 1;
      return TX_RESULT;
    },
  });

  const guarded = gateway(provider, () => {
    authorizationCalls += 1;
  });

  await assert.rejects(
    guarded.request(nativeTransfer()),
    (error) => {
      assert.ok(error instanceof WalletGuardProviderError);
      assert.equal(error.code, 'POMRX_WG_PROVIDER_E_CONTEXT_INVALID');
      return true;
    },
  );

  assert.equal(accountReads, 1);
  assert.equal(thenTrapCalls, 0);
  assert.equal(otherTrapCalls, 0);
  assert.equal(authorizationCalls, 0);
  assert.equal(sensitiveCalls, 0);
});

test('ordinary synchronous provider context data remains supported', async () => {
  let authorizationCalls = 0;
  let sensitiveCalls = 0;

  const provider = Object.freeze({
    request(request) {
      if (request.method === 'eth_chainId') return '0x1';
      if (request.method === 'eth_accounts') return [ACCOUNT];
      sensitiveCalls += 1;
      return TX_RESULT;
    },
  });

  const guarded = gateway(provider, () => {
    authorizationCalls += 1;
  });
  const result = await guarded.request(nativeTransfer());

  assert.equal(result.decision, 'ALLOW');
  assert.equal(result.forwarded, true);
  assert.equal(result.provider_result, TX_RESULT);
  assert.equal(authorizationCalls, 1);
  assert.equal(sensitiveCalls, 1);
});
