import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WalletGuardPolicyError,
  evaluateWalletGuardPolicy,
  normalizeWalletGuardPolicy,
} from '../../applications/blockchain-digital-assets/wallet-guard/policy.mjs';
import {
  normalizeWalletGuardIntent,
} from '../../applications/blockchain-digital-assets/wallet-guard/intent.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const RECIPIENT = `0x${'3'.repeat(40)}`;
const ORIGIN = 'https://fixture.wallet-guard.local';
const CHAIN_ID = '0x1';

function basePolicy(overrides = {}) {
  return {
    schema_version: 'wallet-guard-policy/0.1',
    policy_id: 'wallet-guard-boundary-policy/0.1',
    enabled: true,
    kill_switch: false,
    expected_chain_id: CHAIN_ID,
    allowed_origins: [ORIGIN],
    allowed_targets: [],
    allowed_recipients: [RECIPIENT],
    allowed_spenders: [],
    allowed_typed_data_verifying_contracts: [],
    max_native_value: '1000',
    max_token_amount: '1000',
    deny_unlimited_allowance: true,
    deny_operator_approval: true,
    require_simulation_for: [],
    ...overrides,
  };
}

function nativeIntent() {
  return normalizeWalletGuardIntent({
    requestId: 'wg-boundary-request-0001',
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

function expectPolicyCode(error) {
  assert.ok(error instanceof WalletGuardPolicyError);
  assert.equal(error.code, 'POMRX_WG_POLICY_E_INVALID');
  return true;
}

test('plain policy behavior and deterministic normalized shape remain unchanged', () => {
  const first = normalizeWalletGuardPolicy(basePolicy());
  const second = normalizeWalletGuardPolicy({ ...basePolicy() });
  assert.deepEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.allowed_origins), true);
  assert.equal(evaluateWalletGuardPolicy(nativeIntent(), basePolicy()).decision, 'ALLOW');
});

test('top-level policy accessor is rejected without invoking getter', () => {
  let getterCalls = 0;
  const raw = basePolicy();
  delete raw.kill_switch;
  Object.defineProperty(raw, 'kill_switch', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return false;
    },
  });

  assert.throws(() => normalizeWalletGuardPolicy(raw), expectPolicyCode);
  assert.equal(getterCalls, 0);
});

test('top-level policy Proxy is rejected before reflective traps run', () => {
  let trapCalls = 0;
  const proxy = new Proxy(basePolicy(), {
    getPrototypeOf() {
      trapCalls += 1;
      return Object.prototype;
    },
    ownKeys(target) {
      trapCalls += 1;
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, key) {
      trapCalls += 1;
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });

  assert.throws(() => normalizeWalletGuardPolicy(proxy), expectPolicyCode);
  assert.equal(trapCalls, 0);
});

test('nested policy-list accessor is rejected without invocation', () => {
  let getterCalls = 0;
  const origins = [];
  Object.defineProperty(origins, '0', {
    enumerable: true,
    configurable: true,
    get() {
      getterCalls += 1;
      return ORIGIN;
    },
  });
  origins.length = 1;

  assert.throws(
    () => normalizeWalletGuardPolicy(basePolicy({ allowed_origins: origins })),
    expectPolicyCode,
  );
  assert.equal(getterCalls, 0);
});

test('nested policy-list Proxy is rejected before traps run', () => {
  let trapCalls = 0;
  const origins = new Proxy([ORIGIN], {
    getPrototypeOf() {
      trapCalls += 1;
      return Array.prototype;
    },
    ownKeys(target) {
      trapCalls += 1;
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, key) {
      trapCalls += 1;
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });

  assert.throws(
    () => normalizeWalletGuardPolicy(basePolicy({ allowed_origins: origins })),
    expectPolicyCode,
  );
  assert.equal(trapCalls, 0);
});

test('hidden or extra policy-list properties fail closed instead of being ignored', () => {
  const origins = [ORIGIN];
  Object.defineProperty(origins, 'hidden', {
    enumerable: false,
    value: 'semantic-data',
  });
  assert.throws(
    () => normalizeWalletGuardPolicy(basePolicy({ allowed_origins: origins })),
    expectPolicyCode,
  );

  const spenders = [];
  spenders.extra = 'unexpected';
  assert.throws(
    () => normalizeWalletGuardPolicy(basePolicy({ allowed_spenders: spenders })),
    expectPolicyCode,
  );
});

test('simulation accessor cannot substitute status and is not invoked', () => {
  let getterCalls = 0;
  const simulation = {};
  Object.defineProperty(simulation, 'status', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return 'pass';
    },
  });

  assert.throws(
    () => evaluateWalletGuardPolicy(nativeIntent(), basePolicy(), simulation),
    expectPolicyCode,
  );
  assert.equal(getterCalls, 0);
});

test('simulation Proxy is rejected before reflective traps run', () => {
  let trapCalls = 0;
  const simulation = new Proxy({ status: 'pass' }, {
    getPrototypeOf() {
      trapCalls += 1;
      return Object.prototype;
    },
    ownKeys(target) {
      trapCalls += 1;
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, key) {
      trapCalls += 1;
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });

  assert.throws(
    () => evaluateWalletGuardPolicy(nativeIntent(), basePolicy(), simulation),
    expectPolicyCode,
  );
  assert.equal(trapCalls, 0);
});

test('null-prototype plain policy remains accepted after boundary hardening', () => {
  const raw = Object.assign(Object.create(null), basePolicy());
  const normalized = normalizeWalletGuardPolicy(raw);
  assert.equal(normalized.policy_id, 'wallet-guard-boundary-policy/0.1');
});
