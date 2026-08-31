import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createWalletGuardControlledReferenceHost,
} from '../../applications/blockchain-digital-assets/wallet-guard/controlled-host.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const OTHER_ACCOUNT = `0x${'9'.repeat(40)}`;
const TOKEN = `0x${'2'.repeat(40)}`;
const RECIPIENT = `0x${'3'.repeat(40)}`;
const SPENDER = `0x${'4'.repeat(40)}`;
const ORIGIN = 'https://controlled.wallet-guard.local';
const OTHER_ORIGIN = 'https://other.wallet-guard.local';
const CHAIN_ID = '0x1';
const TX_RESULT = `0x${'a'.repeat(64)}`;

function policy() {
  return {
    schema_version: 'wallet-guard-policy/0.1',
    policy_id: 'wallet-guard-controlled-host/0.1',
    enabled: true,
    kill_switch: false,
    expected_chain_id: CHAIN_ID,
    allowed_origins: [ORIGIN],
    allowed_targets: [TOKEN],
    allowed_recipients: [RECIPIENT],
    allowed_spenders: [SPENDER],
    allowed_typed_data_verifying_contracts: [TOKEN],
    max_native_value: '1000',
    max_token_amount: '1000000',
    deny_unlimited_allowance: true,
    deny_operator_approval: true,
    require_simulation_for: [],
  };
}

function referenceAuthorizationForRequest() {
  return {
    run_id: 'run-policy-intrinsic-regression-0001',
    agent_ref: 'agent-policy-intrinsic-regression-01',
    subject_ref: 'subject-policy-intrinsic-regression-01',
    preflight_receipt_hash: '1'.repeat(64),
    witness_ack_hash: '2'.repeat(64),
    source_key_id: `ed25519-${'a'.repeat(32)}`,
    witness_key_id: `ed25519-${'b'.repeat(32)}`,
    verification_profile: 'pom-rx-v0.1/strict-errata-1',
    verifier_version: 'pom-rx-v0.1-strict-verifier/1',
    implementation_artifact_sha256: '3'.repeat(64),
    effective_verification_policy_sha256: '4'.repeat(64),
    witness_valid_until: '2026-08-20T20:10:00.000Z',
  };
}

function createHost() {
  return createWalletGuardControlledReferenceHost({
    trustedOrigin: ORIGIN,
    chainId: CHAIN_ID,
    accounts: [ACCOUNT],
    policy: policy(),
    trustedClock: () => '2026-08-20T20:00:00.000Z',
    referenceAuthorizationForRequest,
    capabilityLifetimeMs: 30_000,
    providerResult: TX_RESULT,
  });
}

function unauthorizedTransfer() {
  return {
    method: 'eth_sendTransaction',
    params: [{
      from: ACCOUNT,
      to: OTHER_ACCOUNT,
      value: '0x1',
      data: '0x',
    }],
  };
}

async function assertDeniedWithoutForward(host, pending) {
  const result = await pending;
  assert.equal(result.decision, 'DENY');
  assert.equal(result.forwarded, false);
  assert.equal(host.testAuthority.inspect().sensitive_call_count, 0);
}

test('post-await String.prototype.toLowerCase poisoning cannot substitute an allowlisted recipient', async () => {
  const host = createHost();
  const pending = host.page.ethereum.request(unauthorizedTransfer());
  const originalToLowerCase = String.prototype.toLowerCase;

  try {
    String.prototype.toLowerCase = function poisonedToLowerCase() {
      const actual = Reflect.apply(originalToLowerCase, this, []);
      return actual === RECIPIENT ? OTHER_ACCOUNT : actual;
    };
    await assertDeniedWithoutForward(host, pending);
  } finally {
    String.prototype.toLowerCase = originalToLowerCase;
  }
});

test('post-await Array.prototype.push poisoning cannot erase policy DENY reasons', async () => {
  const host = createHost();
  const pending = host.page.ethereum.request(unauthorizedTransfer());
  const originalPush = Array.prototype.push;

  try {
    Array.prototype.push = function poisonedPush(...items) {
      if (items.some((item) => typeof item === 'string' && item.startsWith('WG_POLICY_'))) {
        return this.length;
      }
      return Reflect.apply(originalPush, this, items);
    };
    await assertDeniedWithoutForward(host, pending);
  } finally {
    Array.prototype.push = originalPush;
  }
});

test('post-await URL.prototype.origin poisoning cannot remap an allowlisted policy origin', async () => {
  const host = createHost();
  host.testAuthority.setTrustedOrigin(OTHER_ORIGIN);
  const pending = host.page.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{
      from: ACCOUNT,
      to: RECIPIENT,
      value: '0x1',
      data: '0x',
    }],
  });

  const descriptor = Object.getOwnPropertyDescriptor(URL.prototype, 'origin');
  assert.equal(typeof descriptor?.get, 'function');
  const reads = new WeakMap();

  try {
    Object.defineProperty(URL.prototype, 'origin', {
      ...descriptor,
      get() {
        const actual = Reflect.apply(descriptor.get, this, []);
        if (actual !== ORIGIN) return actual;
        const next = (reads.get(this) ?? 0) + 1;
        reads.set(this, next);
        return next === 1 ? ORIGIN : OTHER_ORIGIN;
      },
    });
    await assertDeniedWithoutForward(host, pending);
  } finally {
    Object.defineProperty(URL.prototype, 'origin', descriptor);
  }
});

test('post-await inherited numeric setter cannot falsify policy DENY reason evidence', async () => {
  const host = createHost();
  const pending = host.page.ethereum.request(unauthorizedTransfer());
  const priorDescriptor = Object.getOwnPropertyDescriptor(Array.prototype, '0');
  const originalDefineProperty = Object.defineProperty;

  try {
    Object.defineProperty(Array.prototype, '0', {
      configurable: true,
      get() {
        return 'WG_POLICY_ALLOW_EXACT';
      },
      set(value) {
        if (typeof value === 'string' && value.startsWith('WG_POLICY_')) return;
        Reflect.apply(originalDefineProperty, Object, [this, '0', {
          configurable: true,
          enumerable: true,
          writable: true,
          value,
        }]);
      },
    });

    const result = await pending;
    assert.equal(result.decision, 'DENY');
    assert.equal(result.forwarded, false);
    assert.deepEqual([...result.reasons], ['WG_POLICY_DENY_RECIPIENT']);
    assert.equal(host.testAuthority.inspect().sensitive_call_count, 0);
  } finally {
    if (priorDescriptor) {
      Object.defineProperty(Array.prototype, '0', priorDescriptor);
    } else {
      delete Array.prototype[0];
    }
  }
});
