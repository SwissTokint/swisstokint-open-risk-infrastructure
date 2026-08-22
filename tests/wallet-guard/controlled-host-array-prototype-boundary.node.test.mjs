import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createWalletGuardControlledReferenceHost,
} from '../../applications/blockchain-digital-assets/wallet-guard/controlled-host.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const OTHER_ACCOUNT = `0x${'9'.repeat(40)}`;
const RECIPIENT = `0x${'3'.repeat(40)}`;
const OTHER_RECIPIENT = `0x${'8'.repeat(40)}`;
const ORIGIN = 'https://controlled-array-boundary.wallet-guard.local';
const CHAIN_ID = '0x1';
const TX_RESULT = `0x${'a'.repeat(64)}`;
const hash = (character) => character.repeat(64);

function policy() {
  return {
    schema_version: 'wallet-guard-policy/0.1',
    policy_id: 'wallet-guard-array-boundary/0.1',
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

function authorization(index) {
  return {
    run_id: `run-array-boundary-${String(index).padStart(8, '0')}`,
    agent_ref: 'agent-array-boundary-01',
    subject_ref: 'subject-array-boundary-01',
    preflight_receipt_hash: hash(index % 2 === 0 ? '1' : '2'),
    witness_ack_hash: hash(index % 2 === 0 ? '3' : '4'),
    source_key_id: `ed25519-${'a'.repeat(32)}`,
    witness_key_id: `ed25519-${'b'.repeat(32)}`,
    verification_profile: 'pom-rx-v0.1/strict-errata-1',
    verifier_version: 'pom-rx-v0.1-strict-verifier/1',
    implementation_artifact_sha256: hash('5'),
    effective_verification_policy_sha256: hash('6'),
    witness_valid_until: '2026-08-22T18:01:00.000Z',
  };
}

function createHost() {
  let authorizationCalls = 0;
  const host = createWalletGuardControlledReferenceHost({
    trustedOrigin: ORIGIN,
    chainId: CHAIN_ID,
    accounts: [ACCOUNT],
    policy: policy(),
    trustedClock: () => '2026-08-22T18:00:00.000Z',
    referenceAuthorizationForRequest: () => {
      authorizationCalls += 1;
      return authorization(authorizationCalls);
    },
    capabilityLifetimeMs: 30_000,
    providerResult: TX_RESULT,
  });
  return {
    ...host,
    authorizationCalls: () => authorizationCalls,
  };
}

function transfer(from, to) {
  return {
    method: 'eth_sendTransaction',
    params: [{
      from,
      to,
      value: '0x0',
      data: '0x',
    }],
  };
}

function installIndexZeroSubstitution(substitute) {
  const original = Object.getOwnPropertyDescriptor(Array.prototype, '0');
  let calls = 0;
  Object.defineProperty(Array.prototype, '0', {
    configurable: true,
    set(value) {
      calls += 1;
      Object.defineProperty(this, '0', {
        configurable: true,
        enumerable: true,
        value: substitute(value),
        writable: true,
      });
    },
  });
  return {
    calls: () => calls,
    restore() {
      if (original) Object.defineProperty(Array.prototype, '0', original);
      else delete Array.prototype[0];
    },
  };
}

test('post-import Array.prototype index setter cannot rewrite the captured policy bridge', async () => {
  const poison = installIndexZeroSubstitution((value) => (
    value === RECIPIENT ? OTHER_RECIPIENT : value
  ));

  let host;
  try {
    host = createHost();
  } finally {
    poison.restore();
  }

  const allowed = await host.page.ethereum.request(transfer(ACCOUNT, RECIPIENT));
  assert.equal(allowed.decision, 'ALLOW');
  assert.equal(allowed.forwarded, true);

  const denied = await host.page.ethereum.request(transfer(ACCOUNT, OTHER_RECIPIENT));
  assert.equal(denied.decision, 'DENY');
  assert.equal(denied.forwarded, false);
  assert.equal(host.testAuthority.inspect().sensitive_call_count, 1);
});

test('post-bootstrap Array.prototype index setter cannot substitute provider-observed account context', async () => {
  const host = createHost();
  const poison = installIndexZeroSubstitution((value) => (
    value === ACCOUNT ? OTHER_ACCOUNT : value
  ));

  try {
    await assert.rejects(
      host.page.ethereum.request(transfer(OTHER_ACCOUNT, RECIPIENT)),
    );
  } finally {
    poison.restore();
  }

  assert.equal(host.authorizationCalls(), 0);
  assert.equal(host.testAuthority.inspect().sensitive_call_count, 0);
});
