import { types as utilTypes } from 'node:util';

import {
  canonicalizePayload,
  sha256Hex,
} from '../../../sdk/typescript/swisstokint-proof.mjs';
import {
  WALLET_GUARD_POLICY_COMMIT_DOMAIN,
  WalletGuardPolicyError,
  evaluateWalletGuardPolicy,
  normalizeWalletGuardPolicy,
} from './policy.mjs';

export const WALLET_GUARD_POLICY_STATE_SCHEMA_VERSION =
  'wallet_guard_policy_state/0.1';
export const WALLET_GUARD_POLICY_STATE_COMMIT_DOMAIN =
  'swisstokint:pom-rx-wallet-guard-policy-state:v1:';

const BOOTSTRAP_KEYS = Object.freeze(['policy']);
const REPLACE_KEYS = Object.freeze(['expected_revision', 'policy']);
const KILL_SWITCH_KEYS = Object.freeze(['expected_revision']);

export class WalletGuardPolicyStateError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WalletGuardPolicyStateError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new WalletGuardPolicyStateError(code, message);
}

function asciiCompare(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function isOwnEnumerableDataDescriptor(descriptor) {
  return Boolean(descriptor)
    && Object.hasOwn(descriptor, 'value')
    && Object.hasOwn(descriptor, 'enumerable')
    && descriptor.enumerable === true
    && !Object.hasOwn(descriptor, 'get')
    && !Object.hasOwn(descriptor, 'set');
}

function captureExactDataRecord(value, expectedKeys, label) {
  if (!value
      || typeof value !== 'object'
      || utilTypes.isProxy(value)
      || Array.isArray(value)) {
    fail('POMRX_WG_POLICY_STATE_E_INVALID', `${label} must be a non-Proxy plain object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail('POMRX_WG_POLICY_STATE_E_INVALID', `${label} must use Object.prototype or a null prototype`);
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    fail('POMRX_WG_POLICY_STATE_E_INVALID', `${label} cannot contain symbol keys`);
  }

  const actual = Object.getOwnPropertyNames(value).sort(asciiCompare);
  const expected = [...expectedKeys].sort(asciiCompare);
  if (actual.length !== expected.length
      || actual.some((key, index) => key !== expected[index])) {
    fail('POMRX_WG_POLICY_STATE_E_INVALID', `${label} has missing, hidden or unknown fields`);
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const snapshot = Object.create(null);
  for (const key of expectedKeys) {
    const descriptor = descriptors[key];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail('POMRX_WG_POLICY_STATE_E_INVALID', `${label}.${key} must be an enumerable data property`);
    }
    snapshot[key] = descriptor.value;
  }
  return Object.freeze(snapshot);
}

function normalizePolicyCandidate(rawPolicy) {
  try {
    return normalizeWalletGuardPolicy(rawPolicy);
  } catch (error) {
    if (error instanceof WalletGuardPolicyError) {
      fail('POMRX_WG_POLICY_STATE_E_POLICY', 'Wallet Guard policy candidate is invalid');
    }
    throw error;
  }
}

function assertRevision(value, field = 'expected_revision') {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail('POMRX_WG_POLICY_STATE_E_INVALID', `${field} must be a non-negative safe integer`);
  }
}

function nextRevision(currentRevision) {
  if (currentRevision >= Number.MAX_SAFE_INTEGER) {
    fail(
      'POMRX_WG_POLICY_STATE_E_REVISION_EXHAUSTED',
      'policy-state revision space is exhausted',
    );
  }
  return currentRevision + 1;
}

function commitPolicy(policy) {
  const canonicalPolicy = canonicalizePayload(policy);
  return sha256Hex(`${WALLET_GUARD_POLICY_COMMIT_DOMAIN}${canonicalPolicy}`);
}

function commitState({ revision, policyHash, policyId, killSwitch }) {
  const payload = Object.freeze({
    schema_version: WALLET_GUARD_POLICY_STATE_SCHEMA_VERSION,
    policy_id: policyId,
    revision,
    policy_hash: policyHash,
    kill_switch: killSwitch,
  });
  const canonical = canonicalizePayload(payload);
  return sha256Hex(`${WALLET_GUARD_POLICY_STATE_COMMIT_DOMAIN}${canonical}`);
}

function makeSnapshot(policy, revision) {
  assertRevision(revision, 'revision');
  const policyHash = commitPolicy(policy);
  const stateCommitment = commitState({
    revision,
    policyHash,
    policyId: policy.policy_id,
    killSwitch: policy.kill_switch,
  });
  return Object.freeze({
    schema_version: WALLET_GUARD_POLICY_STATE_SCHEMA_VERSION,
    policy_id: policy.policy_id,
    revision,
    policy_hash: policyHash,
    state_commitment: stateCommitment,
    kill_switch: policy.kill_switch,
    policy,
    reference_only: true,
    controller_instance_synchronous_atomicity: true,
    process_wide_policy_state_proved: false,
    durable_policy_state_proved: false,
    remote_operator_authorization_proved: false,
    provider_gate_state_binding_proved: false,
  });
}

function policyWithKillSwitch(policy) {
  return {
    schema_version: policy.schema_version,
    policy_id: policy.policy_id,
    enabled: policy.enabled,
    kill_switch: true,
    expected_chain_id: policy.expected_chain_id,
    allowed_origins: policy.allowed_origins,
    allowed_targets: policy.allowed_targets,
    allowed_recipients: policy.allowed_recipients,
    allowed_spenders: policy.allowed_spenders,
    allowed_typed_data_verifying_contracts: policy.allowed_typed_data_verifying_contracts,
    max_native_value: policy.max_native_value,
    max_token_amount: policy.max_token_amount,
    deny_unlimited_allowance: policy.deny_unlimited_allowance,
    deny_operator_approval: policy.deny_operator_approval,
    require_simulation_for: policy.require_simulation_for,
  };
}

export function createWalletGuardReferencePolicyController(rawOptions) {
  const options = captureExactDataRecord(
    rawOptions,
    BOOTSTRAP_KEYS,
    'policy controller bootstrap',
  );
  const initialPolicy = normalizePolicyCandidate(options.policy);
  const fixedPolicyId = initialPolicy.policy_id;
  let current = makeSnapshot(initialPolicy, 0);
  let operationInProgress = false;

  function readSnapshot() {
    return current;
  }

  function enterOperation() {
    if (operationInProgress) {
      fail(
        'POMRX_WG_POLICY_STATE_E_REENTRANT',
        'policy-state operation is already in progress in this controller',
      );
    }
    operationInProgress = true;
  }

  function leaveOperation() {
    operationInProgress = false;
  }

  function replacePolicy(rawUpdate) {
    // Acquire the controller operation lock before inspecting the update or the
    // current revision. A nested synchronous operation must never observe an
    // in-progress transition as if it were an independent CAS attempt.
    enterOperation();
    try {
      const update = captureExactDataRecord(
        rawUpdate,
        REPLACE_KEYS,
        'policy replacement',
      );
      assertRevision(update.expected_revision);
      if (update.expected_revision !== current.revision) {
        fail('POMRX_WG_POLICY_STATE_E_STALE', 'policy replacement revision is stale');
      }

      const candidate = normalizePolicyCandidate(update.policy);
      if (candidate.policy_id !== fixedPolicyId) {
        fail('POMRX_WG_POLICY_STATE_E_IDENTITY', 'policy_id cannot change inside one controller');
      }

      const next = makeSnapshot(candidate, nextRevision(current.revision));
      current = next;
      return next;
    } finally {
      leaveOperation();
    }
  }

  function engageKillSwitch(rawUpdate) {
    // The lock intentionally covers the already-killed idempotent return too.
    // Otherwise a nested kill-switch call could report success while an outer
    // in-progress replacement is about to publish a re-enabled policy.
    enterOperation();
    try {
      const update = captureExactDataRecord(
        rawUpdate,
        KILL_SWITCH_KEYS,
        'kill-switch update',
      );
      assertRevision(update.expected_revision);
      if (update.expected_revision !== current.revision) {
        fail('POMRX_WG_POLICY_STATE_E_STALE', 'kill-switch revision is stale');
      }
      if (current.policy.kill_switch === true) return current;

      const candidate = normalizePolicyCandidate(policyWithKillSwitch(current.policy));
      const next = makeSnapshot(candidate, nextRevision(current.revision));
      current = next;
      return next;
    } finally {
      leaveOperation();
    }
  }

  function evaluate(intent, simulation = Object.freeze({ status: 'not_run' })) {
    enterOperation();
    try {
      const snapshot = current;
      let result;
      try {
        result = evaluateWalletGuardPolicy(intent, snapshot.policy, simulation);
      } catch (error) {
        if (error instanceof WalletGuardPolicyError) {
          fail('POMRX_WG_POLICY_STATE_E_EVALUATION', 'Wallet Guard policy evaluation failed');
        }
        throw error;
      }
      if (current !== snapshot) {
        fail(
          'POMRX_WG_POLICY_STATE_E_INTERNAL',
          'policy state changed during a controller evaluation',
        );
      }
      if (result.policy_id !== snapshot.policy_id || result.policy_hash !== snapshot.policy_hash) {
        fail(
          'POMRX_WG_POLICY_STATE_E_INTERNAL',
          'policy evaluation diverged from the captured controller snapshot',
        );
      }
      return Object.freeze({
        ...result,
        policy_state_revision: snapshot.revision,
        policy_state_commitment: snapshot.state_commitment,
        reference_policy_state: true,
        provider_gate_state_binding_proved: false,
      });
    } finally {
      leaveOperation();
    }
  }

  return Object.freeze({
    readSnapshot,
    replacePolicy,
    engageKillSwitch,
    evaluate,
  });
}
