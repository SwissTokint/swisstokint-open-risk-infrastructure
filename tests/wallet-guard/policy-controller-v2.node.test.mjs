import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WalletGuardPolicyStateError,
  createWalletGuardReferencePolicyController,
} from '../../applications/blockchain-digital-assets/wallet-guard/policy-controller.mjs';
import {
  normalizeWalletGuardIntent,
} from '../../applications/blockchain-digital-assets/wallet-guard/intent.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const RECIPIENT = `0x${'3'.repeat(40)}`;
const ORIGIN = 'https://fixture.wallet-guard.local';
const CHAIN_ID = '0x1';

function policy(overrides = {}) {
  return {
    schema_version: 'wallet-guard-policy/0.1',
    policy_id: 'wallet-guard-reference-policy/0.1',
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

function nativeIntent(value = '0x1') {
  return normalizeWalletGuardIntent({
    requestId: 'wg-policy-controller-v2-0001',
    trustedOrigin: ORIGIN,
    trustedChainId: CHAIN_ID,
    trustedAccount: ACCOUNT,
    request: {
      method: 'eth_sendTransaction',
      params: [{
        from: ACCOUNT,
        to: RECIPIENT,
        value,
        data: '0x',
      }],
    },
  });
}

function expectCode(error, code) {
  assert.ok(error instanceof WalletGuardPolicyStateError);
  assert.equal(error.code, code);
  return true;
}

test('initial state is deterministic, frozen and explicitly controller-local', () => {
  const first = createWalletGuardReferencePolicyController({ policy: policy() });
  const second = createWalletGuardReferencePolicyController({ policy: policy() });
  const left = first.readSnapshot();
  const right = second.readSnapshot();

  assert.equal(left.revision, 0);
  assert.equal(left.policy_hash, right.policy_hash);
  assert.equal(left.state_commitment, right.state_commitment);
  assert.equal(left.reference_only, true);
  assert.equal(left.controller_instance_synchronous_atomicity, true);
  assert.equal(left.process_wide_policy_state_proved, false);
  assert.equal(left.durable_policy_state_proved, false);
  assert.equal(left.remote_operator_authorization_proved, false);
  assert.equal(left.provider_gate_state_binding_proved, false);
  assert.equal(Object.isFrozen(left), true);
  assert.equal(Object.isFrozen(left.policy), true);
});

test('current snapshot evaluates an allowlisted native transfer', () => {
  const controller = createWalletGuardReferencePolicyController({ policy: policy() });
  const result = controller.evaluate(nativeIntent());

  assert.equal(result.decision, 'ALLOW');
  assert.equal(result.policy_state_revision, 0);
  assert.equal(result.policy_hash, controller.readSnapshot().policy_hash);
  assert.equal(result.policy_state_commitment, controller.readSnapshot().state_commitment);
  assert.equal(result.reference_policy_state, true);
  assert.equal(result.provider_gate_state_binding_proved, false);
});

test('kill switch is compare-and-swap, terminal for the revision, and idempotent once active', () => {
  const controller = createWalletGuardReferencePolicyController({ policy: policy() });
  const before = controller.readSnapshot();
  const engaged = controller.engageKillSwitch({ expected_revision: 0 });

  assert.equal(engaged.revision, 1);
  assert.equal(engaged.kill_switch, true);
  assert.notEqual(engaged.policy_hash, before.policy_hash);
  assert.notEqual(engaged.state_commitment, before.state_commitment);
  assert.equal(controller.evaluate(nativeIntent()).decision, 'DENY');

  assert.throws(
    () => controller.engageKillSwitch({ expected_revision: 0 }),
    (error) => expectCode(error, 'POMRX_WG_POLICY_STATE_E_STALE'),
  );
  assert.strictEqual(
    controller.engageKillSwitch({ expected_revision: 1 }),
    engaged,
  );
});

test('full replacement is required to re-enable and policy identity cannot change', () => {
  const controller = createWalletGuardReferencePolicyController({ policy: policy() });
  controller.engageKillSwitch({ expected_revision: 0 });

  assert.throws(
    () => controller.replacePolicy({ expected_revision: 0, policy: policy() }),
    (error) => expectCode(error, 'POMRX_WG_POLICY_STATE_E_STALE'),
  );
  assert.throws(
    () => controller.replacePolicy({
      expected_revision: 1,
      policy: policy({ policy_id: 'wallet-guard-other-policy/0.1' }),
    }),
    (error) => expectCode(error, 'POMRX_WG_POLICY_STATE_E_IDENTITY'),
  );

  const reenabled = controller.replacePolicy({ expected_revision: 1, policy: policy() });
  assert.equal(reenabled.revision, 2);
  assert.equal(reenabled.kill_switch, false);
  assert.equal(controller.evaluate(nativeIntent()).decision, 'ALLOW');
});

test('state transition is prepared before publication and old snapshots stay immutable', () => {
  const controller = createWalletGuardReferencePolicyController({ policy: policy() });
  const revisionZero = controller.readSnapshot();
  const candidate = policy({ max_native_value: '10' });
  const revisionOne = controller.replacePolicy({ expected_revision: 0, policy: candidate });

  candidate.max_native_value = '999999';
  candidate.allowed_recipients[0] = ACCOUNT;

  assert.equal(revisionZero.revision, 0);
  assert.equal(revisionZero.policy.max_native_value, '1000');
  assert.equal(revisionOne.revision, 1);
  assert.equal(revisionOne.policy.max_native_value, '10');
  assert.deepEqual(revisionOne.policy.allowed_recipients, [RECIPIENT]);
});

test('failed prospective state commitment leaves current state unchanged', () => {
  const controller = createWalletGuardReferencePolicyController({ policy: policy() });
  const before = controller.readSnapshot();
  const originalNormalize = String.prototype.normalize;
  const sentinel = new TypeError('prospective state commitment failure');

  String.prototype.normalize = function normalize(form) {
    if (String(this) === 'wallet_guard_policy_state/0.1' && form === 'NFC') throw sentinel;
    return originalNormalize.call(this, form);
  };
  try {
    assert.throws(
      () => controller.replacePolicy({
        expected_revision: 0,
        policy: policy({ max_native_value: '10' }),
      }),
      (error) => error === sentinel,
    );
  } finally {
    String.prototype.normalize = originalNormalize;
  }

  assert.strictEqual(controller.readSnapshot(), before);
  assert.equal(controller.readSnapshot().revision, 0);
});

test('bootstrap/update envelopes reject accessors, hidden fields, symbols and custom prototypes without getter execution', () => {
  let getterCalls = 0;
  const bootstrap = {};
  Object.defineProperty(bootstrap, 'policy', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return policy();
    },
  });
  assert.throws(
    () => createWalletGuardReferencePolicyController(bootstrap),
    (error) => expectCode(error, 'POMRX_WG_POLICY_STATE_E_INVALID'),
  );
  assert.equal(getterCalls, 0);

  const controller = createWalletGuardReferencePolicyController({ policy: policy() });
  const hidden = { expected_revision: 0, policy: policy() };
  Object.defineProperty(hidden, 'shadow', { enumerable: false, value: true });
  assert.throws(
    () => controller.replacePolicy(hidden),
    (error) => expectCode(error, 'POMRX_WG_POLICY_STATE_E_INVALID'),
  );

  const symbolUpdate = { expected_revision: 0 };
  symbolUpdate[Symbol('shadow')] = true;
  assert.throws(
    () => controller.engageKillSwitch(symbolUpdate),
    (error) => expectCode(error, 'POMRX_WG_POLICY_STATE_E_INVALID'),
  );

  const custom = Object.create({ inherited: true });
  custom.expected_revision = 0;
  assert.throws(
    () => controller.engageKillSwitch(custom),
    (error) => expectCode(error, 'POMRX_WG_POLICY_STATE_E_INVALID'),
  );
});

test('live and revoked Proxy envelopes are rejected before reflective traps run', () => {
  let traps = 0;
  const proxy = new Proxy({ policy: policy() }, {
    getPrototypeOf(target) {
      traps += 1;
      return Reflect.getPrototypeOf(target);
    },
    ownKeys(target) {
      traps += 1;
      return Reflect.ownKeys(target);
    },
  });
  assert.throws(
    () => createWalletGuardReferencePolicyController(proxy),
    (error) => expectCode(error, 'POMRX_WG_POLICY_STATE_E_INVALID'),
  );
  assert.equal(traps, 0);

  const controller = createWalletGuardReferencePolicyController({ policy: policy() });
  const revoked = Proxy.revocable({ expected_revision: 0 }, {});
  revoked.revoke();
  assert.throws(
    () => controller.engageKillSwitch(revoked.proxy),
    (error) => expectCode(error, 'POMRX_WG_POLICY_STATE_E_INVALID'),
  );
});

test('inherited descriptor get/set poisoning cannot rewrite controller envelope values', { concurrency: false }, () => {
  const previousGet = Object.getOwnPropertyDescriptor(Object.prototype, 'get');
  const previousSet = Object.getOwnPropertyDescriptor(Object.prototype, 'set');
  let inheritedReads = 0;

  try {
    Object.defineProperty(Object.prototype, 'get', {
      configurable: true,
      get() {
        inheritedReads += 1;
        return undefined;
      },
    });
    Object.defineProperty(Object.prototype, 'set', {
      configurable: true,
      get() {
        inheritedReads += 1;
        return undefined;
      },
    });

    const controller = createWalletGuardReferencePolicyController({ policy: policy() });
    controller.engageKillSwitch({ expected_revision: 0 });
    assert.equal(controller.readSnapshot().revision, 1);
    assert.equal(controller.readSnapshot().kill_switch, true);
    assert.equal(inheritedReads, 0);
  } finally {
    if (previousGet) Object.defineProperty(Object.prototype, 'get', previousGet);
    else delete Object.prototype.get;
    if (previousSet) Object.defineProperty(Object.prototype, 'set', previousSet);
    else delete Object.prototype.set;
  }
});

test('policy and simulation dynamic objects are delegated to the hardened policy boundary', () => {
  let policyGetterCalls = 0;
  const hostilePolicy = policy();
  Object.defineProperty(hostilePolicy, 'kill_switch', {
    enumerable: true,
    get() {
      policyGetterCalls += 1;
      return false;
    },
  });
  assert.throws(
    () => createWalletGuardReferencePolicyController({ policy: hostilePolicy }),
    (error) => expectCode(error, 'POMRX_WG_POLICY_STATE_E_POLICY'),
  );
  assert.equal(policyGetterCalls, 0);

  const controller = createWalletGuardReferencePolicyController({ policy: policy() });
  let simulationGetterCalls = 0;
  const simulation = {};
  Object.defineProperty(simulation, 'status', {
    enumerable: true,
    get() {
      simulationGetterCalls += 1;
      return 'pass';
    },
  });
  assert.throws(
    () => controller.evaluate(nativeIntent(), simulation),
    (error) => expectCode(error, 'POMRX_WG_POLICY_STATE_E_EVALUATION'),
  );
  assert.equal(simulationGetterCalls, 0);
});

test('foreign runtime failures are not relabeled as policy-state validation failures', () => {
  const rawPolicy = policy();
  const originalNormalize = String.prototype.normalize;
  const sentinel = new TypeError('foreign policy runtime failure');

  String.prototype.normalize = function normalize(form) {
    if (String(this) === 'allowed_origins' && form === 'NFKC') throw sentinel;
    return originalNormalize.call(this, form);
  };
  try {
    assert.throws(
      () => createWalletGuardReferencePolicyController({ policy: rawPolicy }),
      (error) => error === sentinel,
    );
  } finally {
    String.prototype.normalize = originalNormalize;
  }
});

test('malformed revisions fail closed without changing state', () => {
  const controller = createWalletGuardReferencePolicyController({ policy: policy() });
  const before = controller.readSnapshot();

  for (const revision of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(
      () => controller.replacePolicy({ expected_revision: revision, policy: policy() }),
      (error) => expectCode(error, 'POMRX_WG_POLICY_STATE_E_INVALID'),
    );
  }
  assert.strictEqual(controller.readSnapshot(), before);
});
