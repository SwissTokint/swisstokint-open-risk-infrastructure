import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WalletGuardProviderError,
  createWalletGuardReferenceProviderGateway,
} from '../../applications/blockchain-digital-assets/wallet-guard/provider.mjs';
import {
  normalizeWalletGuardIntent,
} from '../../applications/blockchain-digital-assets/wallet-guard/intent.mjs';
import {
  evaluateWalletGuardPolicy,
} from '../../applications/blockchain-digital-assets/wallet-guard/policy.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const RECIPIENT = `0x${'3'.repeat(40)}`;
const UNTRUSTED = `0x${'8'.repeat(40)}`;
const ORIGIN = 'https://fixture.wallet-guard.local';
const CHAIN_ID = '0x1';
const TX_RESULT = `0x${'a'.repeat(64)}`;
const HASH_PATTERN = /^[a-f0-9]{64}$/u;

function hash(character) {
  return character.repeat(64);
}

function sendTransaction({ to = RECIPIENT, value = '0x0' } = {}) {
  return {
    method: 'eth_sendTransaction',
    params: [{ from: ACCOUNT, to, value, data: '0x' }],
  };
}

function policy(overrides = {}) {
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
    ...overrides,
  };
}

function normalizedNativeIntent({ to = RECIPIENT, value = '0x0', requestId = 'wg-security-request-00000001' } = {}) {
  return normalizeWalletGuardIntent({
    requestId,
    trustedOrigin: ORIGIN,
    trustedChainId: CHAIN_ID,
    trustedAccount: ACCOUNT,
    request: sendTransaction({ to, value }),
  });
}

function referenceAuthorizationRecord() {
  return {
    run_id: 'run-wallet-guard-security-00000001',
    agent_ref: 'agent-wallet-guard-01',
    subject_ref: 'subject-wallet-guard-01',
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

function createFakeProvider() {
  const state = { sensitiveCalls: [] };
  const provider = Object.freeze({
    async request(request) {
      if (request.method === 'eth_chainId') return CHAIN_ID;
      if (request.method === 'eth_accounts') return [ACCOUNT];
      state.sensitiveCalls.push(request);
      return TX_RESULT;
    },
  });
  return {
    provider,
    sensitiveCallCount: () => state.sensitiveCalls.length,
  };
}

function createReplayGateway() {
  const fake = createFakeProvider();
  const gateway = createWalletGuardReferenceProviderGateway({
    captureTrustedOrigin: () => ORIGIN,
    provider: fake.provider,
    policy: policy(),
    trustedClock: () => '2026-08-19T17:00:00.000Z',
    referenceAuthorizationForRequest: () => referenceAuthorizationRecord(),
    capabilityLifetimeMs: 30_000,
  });
  return { gateway, fake };
}

function isReplayIdentity(value) {
  return typeof value === 'string'
    && (value.startsWith('run-wallet-guard-security-') || HASH_PATTERN.test(value));
}

test('policy DENY cannot be erased by post-import Array.prototype.push drift', () => {
  const intent = normalizedNativeIntent({ to: UNTRUSTED });
  const originalPush = Array.prototype.push;
  Array.prototype.push = function poisonedPush(...values) {
    void values;
    return this.length;
  };

  let result;
  try {
    result = evaluateWalletGuardPolicy(intent, policy(), { status: 'not_run' });
  } finally {
    Array.prototype.push = originalPush;
  }

  assert.equal(result.decision, 'DENY');
  assert.ok(result.reasons.includes('WG_POLICY_DENY_RECIPIENT'));
});

test('recipient allowlist cannot be selectively bypassed by post-import Array.prototype.includes drift', () => {
  const intent = normalizedNativeIntent({ to: UNTRUSTED });
  const originalIncludes = Array.prototype.includes;
  Array.prototype.includes = function poisonedIncludes(value, fromIndex) {
    if (value === UNTRUSTED && this.length === 1 && this[0] === RECIPIENT) {
      return true;
    }
    return Reflect.apply(originalIncludes, this, [value, fromIndex]);
  };

  let result;
  try {
    result = evaluateWalletGuardPolicy(intent, policy(), { status: 'not_run' });
  } finally {
    Array.prototype.includes = originalIncludes;
  }

  assert.equal(result.decision, 'DENY');
  assert.ok(result.reasons.includes('WG_POLICY_DENY_RECIPIENT'));
});

test('Array.prototype.map cannot substitute a normalized recipient allowlist', () => {
  const intent = normalizedNativeIntent({ to: UNTRUSTED });
  const originalMap = Array.prototype.map;
  Array.prototype.map = function poisonedMap(callback, thisArg) {
    if (this.length === 1 && this[0] === RECIPIENT) {
      return [UNTRUSTED];
    }
    return Reflect.apply(originalMap, this, [callback, thisArg]);
  };

  let result;
  try {
    result = evaluateWalletGuardPolicy(intent, policy(), { status: 'not_run' });
  } finally {
    Array.prototype.map = originalMap;
  }

  assert.equal(result.decision, 'DENY');
  assert.ok(result.reasons.includes('WG_POLICY_DENY_RECIPIENT'));
});

test('Object.getOwnPropertyDescriptors cannot substitute policy recipient descriptors', () => {
  const intent = normalizedNativeIntent({ to: UNTRUSTED });
  const policyValue = policy();
  const recipientList = policyValue.allowed_recipients;
  const originalDescriptors = Object.getOwnPropertyDescriptors;
  Object.getOwnPropertyDescriptors = function poisonedDescriptors(value) {
    if (value === recipientList) {
      return originalDescriptors([UNTRUSTED]);
    }
    return originalDescriptors(value);
  };

  let result;
  try {
    result = evaluateWalletGuardPolicy(intent, policyValue, { status: 'not_run' });
  } finally {
    Object.getOwnPropertyDescriptors = originalDescriptors;
  }

  assert.equal(result.decision, 'DENY');
  assert.ok(result.reasons.includes('WG_POLICY_DENY_RECIPIENT'));
});

test('native-value limit cannot be bypassed by post-import global BigInt drift', () => {
  const intent = normalizedNativeIntent({ value: '0x3e9' });
  const originalBigInt = globalThis.BigInt;
  globalThis.BigInt = function poisonedBigInt(value) {
    if (value === '1000') return 1000000n;
    return originalBigInt(value);
  };

  let result;
  try {
    result = evaluateWalletGuardPolicy(intent, policy({ max_native_value: '1000' }), { status: 'not_run' });
  } finally {
    globalThis.BigInt = originalBigInt;
  }

  assert.equal(result.decision, 'DENY');
  assert.ok(result.reasons.includes('WG_POLICY_DENY_NATIVE_VALUE'));
});

test('address normalization cannot persist a substituted recipient via String.prototype.toLowerCase drift', () => {
  const intent = normalizedNativeIntent({ to: UNTRUSTED });
  const originalToLowerCase = String.prototype.toLowerCase;
  String.prototype.toLowerCase = function poisonedToLowerCase() {
    const value = String(this);
    if (value === RECIPIENT) return UNTRUSTED;
    return Reflect.apply(originalToLowerCase, this, []);
  };

  let result;
  try {
    result = evaluateWalletGuardPolicy(intent, policy(), { status: 'not_run' });
  } finally {
    String.prototype.toLowerCase = originalToLowerCase;
  }

  assert.equal(result.decision, 'DENY');
  assert.ok(result.reasons.includes('WG_POLICY_DENY_RECIPIENT'));
});

test('policy result cannot be substituted by post-import Object.freeze drift', () => {
  const intent = normalizedNativeIntent({ to: UNTRUSTED });
  const originalFreeze = Object.freeze;
  Object.freeze = function poisonedFreeze(value) {
    if (value && typeof value === 'object' && value.decision === 'DENY') {
      return {
        ...value,
        decision: 'ALLOW',
        reasons: ['WG_POLICY_ALLOW_EXACT'],
      };
    }
    return originalFreeze(value);
  };

  let result;
  try {
    result = evaluateWalletGuardPolicy(intent, policy(), { status: 'not_run' });
  } finally {
    Object.freeze = originalFreeze;
  }

  assert.equal(result.decision, 'DENY');
  assert.ok(result.reasons.includes('WG_POLICY_DENY_RECIPIENT'));
});

test('replay rejection cannot be bypassed by post-import Set.prototype.has drift', async () => {
  const { gateway, fake } = createReplayGateway();
  const first = await gateway.request(sendTransaction());
  assert.equal(first.forwarded, true);
  assert.equal(fake.sensitiveCallCount(), 1);

  const originalHas = Set.prototype.has;
  Set.prototype.has = function poisonedHas(value) {
    if (isReplayIdentity(value)) return false;
    return Reflect.apply(originalHas, this, [value]);
  };

  try {
    await assert.rejects(
      gateway.request(sendTransaction()),
      (error) => error instanceof WalletGuardProviderError
        && error.code === 'POMRX_WG_PROVIDER_E_REFERENCE_REPLAY',
    );
  } finally {
    Set.prototype.has = originalHas;
  }

  assert.equal(fake.sensitiveCallCount(), 1);
});

test('replay state cannot be suppressed by post-import Set.prototype.add drift', async () => {
  const { gateway, fake } = createReplayGateway();
  const originalAdd = Set.prototype.add;
  Set.prototype.add = function poisonedAdd(value) {
    if (isReplayIdentity(value)) return this;
    return Reflect.apply(originalAdd, this, [value]);
  };

  try {
    const first = await gateway.request(sendTransaction());
    assert.equal(first.forwarded, true);
  } finally {
    Set.prototype.add = originalAdd;
  }
  assert.equal(fake.sensitiveCallCount(), 1);

  await assert.rejects(
    gateway.request(sendTransaction()),
    (error) => error instanceof WalletGuardProviderError
      && error.code === 'POMRX_WG_PROVIDER_E_REFERENCE_REPLAY',
  );
  assert.equal(fake.sensitiveCallCount(), 1);
});

test('post-import global Set replacement cannot create compromised replay registries', async () => {
  const fake = createFakeProvider();
  const OriginalSet = globalThis.Set;
  class PoisonedSet extends OriginalSet {
    has(value) {
      if (isReplayIdentity(value)) return false;
      return super.has(value);
    }

    add(value) {
      if (isReplayIdentity(value)) return this;
      return super.add(value);
    }
  }
  globalThis.Set = PoisonedSet;

  let gateway;
  try {
    gateway = createWalletGuardReferenceProviderGateway({
      captureTrustedOrigin: () => ORIGIN,
      provider: fake.provider,
      policy: policy(),
      trustedClock: () => '2026-08-19T17:00:00.000Z',
      referenceAuthorizationForRequest: () => referenceAuthorizationRecord(),
      capabilityLifetimeMs: 30_000,
    });
  } finally {
    globalThis.Set = OriginalSet;
  }

  const first = await gateway.request(sendTransaction());
  assert.equal(first.forwarded, true);
  await assert.rejects(
    gateway.request(sendTransaction()),
    (error) => error instanceof WalletGuardProviderError
      && error.code === 'POMRX_WG_PROVIDER_E_REFERENCE_REPLAY',
  );
  assert.equal(fake.sensitiveCallCount(), 1);
});
