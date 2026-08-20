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
const RECIPIENT = `0x${'2'.repeat(40)}`;
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
    requestId: 'wg-policy-controller-0001',
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

test('initial snapshot is deterministic, immutable and explicitly reference-only', () => {
  const first = createWalletGuardReferencePolicyController({ policy: policy() });
  const second = createWalletGuardReferencePolicyController({ policy: policy() });

  const left = first.readSnapshot();
  const right = second.readSnapshot();

  assert.equal(left.revision, 0);
  assert.equal(left.policy_id, 'wallet-guard-reference-policy/0.1');
  assert.match(left.policy_hash, /^[a-f0-9]{64}$/u);
  assert.match(left.state_commitment, /^[a-f0-9]{64}$/u);
  assert.equal(left.policy_hash, right.policy_hash);
  assert.equal(left.state_commitment, right.state_commitment);
  assert.equal(left.reference_only, true);
  assert.equal(left.process_local_atomicity, true);
  assert.equal(left.durable_policy_state_proved, false);
  assert.equal(left.remote_operator_authorization_proved, false);
  assert.equal(Object.isFrozen(left), true);
  assert.equal(Object.isFrozen(left.policy), true);
});

test('current policy evaluates an allowlisted native transfer and binds state revision', () => {
  const controller = createWalletGuardReferencePolicyController({ policy: policy() });
  const result = controller.evaluate(nativeIntent());

  assert.equal(result.decision, 'ALLOW');
  assert.equal(result.policy_state_revision, 0);
  assert.equal(result.policy_hash, controller.readSnapshot().policy_hash);
  assert.equal(result.policy_state_commitment, controller.readSnapshot().state_commitment);
  assert.equal(result.reference_policy_state, true);
});

test('kill switch engages atomically under compare-and-swap revision and makes the same intent deny', () => {
  const controller = createWalletGuardReferencePolicyController({ policy: policy() });
  const before = controller.readSnapshot();
  const engaged = controller.engageKillSwitch({ expected_revision: 0 });

  assert.equal(engaged.revision, 1);
  assert.equal(engaged.kill_switch, true);
  assert.notEqual(engaged.policy_hash, before.policy_hash);
  assert.notEqual(engaged.state_commitment, before.state_commitment);

  const result = controller.evaluate(nativeIntent());
  assert.equal(result.decision, 'DENY');
  assert.ok(result.reasons.includes('WG_POLICY_DENY_KILL_SWITCH'));
  assert.equal(result.policy_state_revision, 1);

  assert.throws(
    () => controller.engageKillSwitch({ expected_revision: 0 }),
    (error) => expectCode(error, 'POMRX_WG_POLICY_STATE_E_STALE'),
  );
});

test('engaging an already active kill switch is idempotent and does not create revision churn', () => {
  const controller = createWalletGuardReferencePolicyController({ policy: policy() });
  const first = controller.engageKillSwitch({ expected_revision: 0 });
  const second = controller.engageKillSwitch({ expected_revision: 1 });

  assert.strictEqual(second, first);
  assert.equal(second.revision, 1);
});

test('full explicit policy replacement can re-enable only at the current revision', () => {
  const controller = createWalletGuardReferencePolicyController({ policy: policy() });
  controller.engageKillSwitch({ expected_revision: 0 });

  assert.throws(
    () => controller.replacePolicy({ expected_revision: 0, policy: policy() }),
    (error) => expectCode(error, 'POMRX_WG_POLICY_STATE_E_STALE'),
  );

  const replacement = controller.replacePolicy({ expected_revision: 1, policy: policy() });
  assert.equal(replacement.revision, 2);
  assert.equal(replacement.kill_switch, false);
  assert.equal(controller.evaluate(nativeIntent()).decision, 'ALLOW');
});

test('policy identity cannot be substituted inside one controller', () => {
  const controller = createWalletGuardReferencePolicyController({ policy: policy() });

  assert.throws(
    () => controller.replacePolicy({
      expected_revision: 0,
      policy: policy({ policy_id: 'another-wallet-policy/0.1' }),
    }),
    (error) => expectCode(error, 'POMRX_WG_POLICY_STATE_E_IDENTITY'),
  );
  assert.equal(controller.readSnapshot().revision, 0);
});

test('old snapshots remain stable after replacement and revision changes state identity even if policy cycles back', () => {
  const controller = createWalletGuardReferencePolicyController({ policy: policy() });
  const revisionZero = controller.readSnapshot();

  const revisionOne = controller.replacePolicy({
    expected_revision: 0,
    policy: policy({ max_native_value: '10' }),
  });
  const revisionTwo = controller.replacePolicy({
    expected_revision: 1,
    policy: policy(),
  });

  assert.equal(revisionZero.revision, 0);
  assert.equal(revisionZero.policy.max_native_value, '1000');
  assert.equal(revisionOne.revision, 1);
  assert.equal(revisionOne.policy.max_native_value, '10');
  assert.equal(revisionTwo.revision, 2);
  assert.equal(revisionTwo.policy_hash, revisionZero.policy_hash);
  assert.notEqual(revisionTwo.state_commitment, revisionZero.state_commitment);
});

test('caller mutation after replacement cannot alter the stored normalized policy', () => {
  const controller = createWalletGuardReferencePolicyController({ policy: policy() });
  const candidate = policy({ allowed_recipients: [RECIPIENT] });
  const stored = controller.replacePolicy({ expected_revision: 0, policy: candidate });

  candidate.allowed_recipients[0] = ACCOUNT;
  candidate.kill_switch = true;

  assert.deepEqual(stored.policy.allowed_recipients, [RECIPIENT]);
  assert.equal(stored.policy.kill_switch, false);
  assert.equal(controller.evaluate(nativeIntent()).decision, 'ALLOW');
});

test('top-level and nested accessors are rejected without executing getters', () => {
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

  const hostilePolicy = policy();
  const hostileOrigins = [];
  Object.defineProperty(hostileOrigins, '0', {
    enumerable: true,
    configurable: true,
    get() {
      getterCalls += 1;
      return ORIGIN;
    },
  });
  hostileOrigins.length = 1;
  hostilePolicy.allowed_origins = hostileOrigins;

  assert.throws(
    () => createWalletGuardReferencePolicyController({ policy: hostilePolicy }),
    (error) => expectCode(error, 'POMRX_WG_POLICY_STATE_E_INVALID'),
  );
  assert.equal(getterCalls, 0);
});

test('malformed revisions and unsupported policy values fail closed without changing current state', () => {
  const controller = createWalletGuardReferencePolicyController({ policy: policy() });

  assert.throws(
    () => controller.replacePolicy({ expected_revision: -1, policy: policy() }),
    (error) => expectCode(error, 'POMRX_WG_POLICY_STATE_E_INVALID'),
  );
  assert.throws(
    () => controller.replacePolicy({
      expected_revision: 0,
      policy: policy({ expected_chain_id: '1' }),
    }),
    (error) => expectCode(error, 'POMRX_WG_POLICY_STATE_E_INVALID'),
  );
  assert.equal(controller.readSnapshot().revision, 0);
});
