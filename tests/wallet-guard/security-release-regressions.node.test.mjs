import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import {
  createWalletGuardReferenceProviderGateway,
} from '../../applications/blockchain-digital-assets/wallet-guard/provider.mjs';
import {
  normalizeWalletGuardIntent,
} from '../../applications/blockchain-digital-assets/wallet-guard/intent.mjs';
import {
  evaluateWalletGuardPolicy,
} from '../../applications/blockchain-digital-assets/wallet-guard/policy.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const ATTACKER = `0x${'8'.repeat(40)}`;
const RECIPIENT = `0x${'3'.repeat(40)}`;
const ORIGIN = 'https://fixture.wallet-guard.local';
const CHAIN_ID = '0x1';
const TX_RESULT = `0x${'a'.repeat(64)}`;

function hash(character) {
  return character.repeat(64);
}

function sendTransaction({ from = ACCOUNT, to = RECIPIENT, value = '0x0' } = {}) {
  return {
    method: 'eth_sendTransaction',
    params: [{ from, to, value, data: '0x' }],
  };
}

function policy(overrides = {}) {
  return {
    schema_version: 'wallet-guard-policy/0.1',
    policy_id: 'wallet-guard-release-regression/0.1',
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

function referenceAuthorizationRecord() {
  return {
    run_id: 'run-wallet-guard-release-00000001',
    agent_ref: 'agent-wallet-guard-release-01',
    subject_ref: 'subject-wallet-guard-release-01',
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

function createRawGateway() {
  const state = {
    sensitiveCalls: 0,
  };
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

function expectNoSensitiveForward(error) {
  assert.ok(error instanceof Error);
  return true;
}

test('provider account mapping cannot substitute an attacker account after module import', async () => {
  const { gateway, sensitiveCallCount } = createRawGateway();
  const originalMap = Array.prototype.map;
  Array.prototype.map = function poisonedMap(callback, thisArg) {
    if (this.length === 1 && this[0] === ACCOUNT) return [ATTACKER];
    return Reflect.apply(originalMap, this, [callback, thisArg]);
  };

  try {
    await assert.rejects(
      gateway.request(sendTransaction({ from: ATTACKER })),
      expectNoSensitiveForward,
    );
  } finally {
    Array.prototype.map = originalMap;
  }

  assert.equal(sensitiveCallCount(), 0);
});

test('inherited Array thenable cannot substitute an attacker account before Wallet Guard capture', () => {
  const providerModuleUrl = new URL(
    '../../applications/blockchain-digital-assets/wallet-guard/provider.mjs',
    import.meta.url,
  ).href;
  const childSource = `
    import { createWalletGuardReferenceProviderGateway } from ${JSON.stringify(providerModuleUrl)};

    const ACCOUNT = '0x${'1'.repeat(40)}';
    const ATTACKER = '0x${'8'.repeat(40)}';
    const RECIPIENT = '0x${'3'.repeat(40)}';
    const ORIGIN = ${JSON.stringify(ORIGIN)};
    const CHAIN_ID = '0x1';
    const TX_RESULT = '0x${'a'.repeat(64)}';
    let sensitiveCalls = 0;

    const provider = Object.freeze({
      async request(request) {
        if (request.method === 'eth_chainId') return CHAIN_ID;
        if (request.method === 'eth_accounts') return [ACCOUNT];
        sensitiveCalls += 1;
        return TX_RESULT;
      },
    });
    const policy = {
      schema_version: 'wallet-guard-policy/0.1',
      policy_id: 'wallet-guard-release-thenable/0.1',
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
    const referenceAuthorizationForRequest = () => ({
      run_id: 'run-wallet-guard-release-00000002',
      agent_ref: 'agent-wallet-guard-release-02',
      subject_ref: 'subject-wallet-guard-release-02',
      preflight_receipt_hash: '${'5'.repeat(64)}',
      witness_ack_hash: '${'6'.repeat(64)}',
      source_key_id: 'ed25519-${'a'.repeat(32)}',
      witness_key_id: 'ed25519-${'b'.repeat(32)}',
      verification_profile: 'pom-rx-v0.1/strict-errata-1',
      verifier_version: 'pom-rx-v0.1-strict-verifier/1',
      implementation_artifact_sha256: '${'3'.repeat(64)}',
      effective_verification_policy_sha256: '${'4'.repeat(64)}',
      witness_valid_until: '2026-08-19T17:01:00.000Z',
    });

    let gateway = null;
    let safe = false;
    try {
      gateway = createWalletGuardReferenceProviderGateway({
        captureTrustedOrigin: () => ORIGIN,
        provider,
        policy,
        trustedClock: () => '2026-08-19T17:00:00.000Z',
        referenceAuthorizationForRequest,
        capabilityLifetimeMs: 30_000,
      });
    } catch {
      safe = true;
    }

    if (gateway) {
      const originalThen = Object.getOwnPropertyDescriptor(Array.prototype, 'then');
      const originalDefineProperty = Object.defineProperty;
      Object.defineProperty(Array.prototype, 'then', {
        configurable: true,
        enumerable: false,
        writable: true,
        value(resolve) {
          const replacement = this.length === 1 && this[0] === ACCOUNT ? [ATTACKER] : this;
          originalDefineProperty(replacement, 'then', {
            configurable: true,
            enumerable: false,
            writable: true,
            value: undefined,
          });
          resolve(replacement);
        },
      });
      try {
        await gateway.request({
          method: 'eth_sendTransaction',
          params: [{ from: ATTACKER, to: RECIPIENT, value: '0x0', data: '0x' }],
        });
      } catch {
        safe = true;
      } finally {
        if (originalThen) Object.defineProperty(Array.prototype, 'then', originalThen);
        else delete Array.prototype.then;
      }
    }

    if (!safe || sensitiveCalls !== 0) process.exitCode = 2;
  `;

  const child = spawnSync(
    process.execPath,
    ['--unhandled-rejections=strict', '--input-type=module', '--eval', childSource],
    { encoding: 'utf8', timeout: 5_000 },
  );

  assert.equal(
    child.status,
    0,
    `thenable regression child failed\nstdout:\n${child.stdout}\nstderr:\n${child.stderr}`,
  );
  assert.equal(child.signal, null);
  assert.equal(child.error, undefined);
});

test('Array species cannot hide an extra EIP-1193 root field during exact-shape validation', () => {
  const originalConstructor = Object.getOwnPropertyDescriptor(Array.prototype, 'constructor');
  const speciesHolder = {};

  function DroppingSpecies() {
    const target = [];
    return new Proxy(target, {
      defineProperty(array, key, descriptor) {
        if (descriptor?.value === 'extra') return true;
        return Reflect.defineProperty(array, key, descriptor);
      },
    });
  }
  Object.defineProperty(speciesHolder, Symbol.species, {
    configurable: true,
    enumerable: false,
    value: DroppingSpecies,
  });
  Object.defineProperty(Array.prototype, 'constructor', {
    configurable: true,
    enumerable: false,
    get() {
      if (this.length === 3
          && this[0] === 'method'
          && this[1] === 'params'
          && this[2] === 'extra') {
        return speciesHolder;
      }
      return Array;
    },
  });

  try {
    assert.throws(
      () => normalizeWalletGuardIntent({
        requestId: 'wg-release-shape-00000001',
        trustedOrigin: ORIGIN,
        trustedChainId: CHAIN_ID,
        trustedAccount: ACCOUNT,
        request: {
          method: 'eth_sendTransaction',
          params: [{ from: ACCOUNT, to: RECIPIENT, value: '0x0', data: '0x' }],
          extra: 'uncommitted',
        },
      }),
      (error) => error?.code === 'POMRX_WG_E_REQUEST_INVALID',
    );
  } finally {
    Object.defineProperty(Array.prototype, 'constructor', originalConstructor);
  }
});

function uniqueAddress(index) {
  return `0x${index.toString(16).padStart(40, '0')}`;
}

test('policy evaluation preserves the canonical payload byte bound used by policy state', () => {
  const addresses = Array.from({ length: 100 }, (_value, index) => uniqueAddress(index + 1));
  const oversizedPolicy = policy({
    allowed_targets: addresses,
    allowed_recipients: addresses,
    allowed_spenders: addresses,
    allowed_typed_data_verifying_contracts: addresses,
  });
  const intent = normalizeWalletGuardIntent({
    requestId: 'wg-release-policy-bound-0001',
    trustedOrigin: ORIGIN,
    trustedChainId: CHAIN_ID,
    trustedAccount: ACCOUNT,
    request: sendTransaction({ to: addresses[0] }),
  });

  assert.throws(
    () => evaluateWalletGuardPolicy(intent, oversizedPolicy, { status: 'not_run' }),
  );
});
