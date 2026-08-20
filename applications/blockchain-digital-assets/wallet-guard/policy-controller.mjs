import {
  canonicalizePayload,
  sha256Hex,
} from '../../../sdk/typescript/swisstokint-proof.mjs';
import {
  WALLET_GUARD_POLICY_COMMIT_DOMAIN,
  evaluateWalletGuardPolicy,
  normalizeWalletGuardPolicy,
} from './policy.mjs';

export const WALLET_GUARD_POLICY_STATE_SCHEMA_VERSION = 'wallet_guard_policy_state/0.1';
export const WALLET_GUARD_POLICY_STATE_COMMIT_DOMAIN = 'swisstokint:pom-rx-wallet-guard-policy-state:v1:';

const MAX_SNAPSHOT_DEPTH = 8;
const MAX_SNAPSHOT_NODES = 1_000;
const MAX_SNAPSHOT_STRING = 2_048;
const MAX_SNAPSHOT_KEY = 128;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const UPDATE_KEYS = Object.freeze(['expected_revision', 'policy']);
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

function captureExactDataObject(value, expectedKeys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('POMRX_WG_POLICY_STATE_E_INVALID', `${label} must be an object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail('POMRX_WG_POLICY_STATE_E_INVALID', `${label} must be a plain object`);
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    fail('POMRX_WG_POLICY_STATE_E_INVALID', `${label} cannot contain symbol keys`);
  }

  const actual = Object.keys(value).sort();
  const wanted = [...expectedKeys].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail('POMRX_WG_POLICY_STATE_E_INVALID', `${label} has missing or unknown fields`);
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const output = Object.create(null);
  for (const key of actual) {
    const descriptor = descriptors[key];
    if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
      fail('POMRX_WG_POLICY_STATE_E_INVALID', `${label} cannot contain accessors`);
    }
    output[key] = descriptor.value;
  }
  return output;
}

function snapshotPlainData(value, depth = 0, budget = { remaining: MAX_SNAPSHOT_NODES }) {
  if (depth > MAX_SNAPSHOT_DEPTH || budget.remaining-- <= 0) {
    fail('POMRX_WG_POLICY_STATE_E_INVALID', 'policy input exceeds reference bounds');
  }
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.length > MAX_SNAPSHOT_STRING) {
      fail('POMRX_WG_POLICY_STATE_E_INVALID', 'policy input string is too long');
    }
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      fail('POMRX_WG_POLICY_STATE_E_INVALID', 'policy input numbers must be safe integers');
    }
    return value;
  }
  if (Array.isArray(value)) {
    const keys = Object.keys(value);
    if (keys.length !== value.length || keys.some((key, index) => key !== String(index))) {
      fail('POMRX_WG_POLICY_STATE_E_INVALID', 'policy input arrays must be dense');
    }
    if (Object.getOwnPropertySymbols(value).length !== 0) {
      fail('POMRX_WG_POLICY_STATE_E_INVALID', 'policy input arrays cannot contain symbol keys');
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const output = keys.map((key) => {
      const descriptor = descriptors[key];
      if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
        fail('POMRX_WG_POLICY_STATE_E_INVALID', 'policy input arrays cannot contain accessors');
      }
      return snapshotPlainData(descriptor.value, depth + 1, budget);
    });
    return Object.freeze(output);
  }
  if (!value || typeof value !== 'object') {
    fail('POMRX_WG_POLICY_STATE_E_INVALID', 'policy input contains an unsupported value');
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail('POMRX_WG_POLICY_STATE_E_INVALID', 'policy input must contain plain objects only');
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    fail('POMRX_WG_POLICY_STATE_E_INVALID', 'policy input cannot contain symbol keys');
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const output = Object.create(null);
  for (const key of Object.keys(value)) {
    if (key.length === 0 || key.length > MAX_SNAPSHOT_KEY || FORBIDDEN_KEYS.has(key)) {
      fail('POMRX_WG_POLICY_STATE_E_INVALID', 'policy input contains an unsafe key');
    }
    const descriptor = descriptors[key];
    if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
      fail('POMRX_WG_POLICY_STATE_E_INVALID', 'policy input cannot contain accessors');
    }
    output[key] = snapshotPlainData(descriptor.value, depth + 1, budget);
  }
  return Object.freeze(output);
}

function normalizeCandidate(policy) {
  let normalized;
  try {
    normalized = normalizeWalletGuardPolicy(snapshotPlainData(policy));
  } catch (error) {
    if (error instanceof WalletGuardPolicyStateError) throw error;
    fail('POMRX_WG_POLICY_STATE_E_INVALID', 'Wallet Guard policy candidate is invalid');
  }
  return normalized;
}

function commitPolicy(policy) {
  const canonicalPolicy = canonicalizePayload(policy);
  return sha256Hex(`${WALLET_GUARD_POLICY_COMMIT_DOMAIN}${canonicalPolicy}`);
}

function commitState({ revision, policyHash, policyId, killSwitch }) {
  const statePayload = Object.freeze({
    schema_version: WALLET_GUARD_POLICY_STATE_SCHEMA_VERSION,
    policy_id: policyId,
    revision,
    policy_hash: policyHash,
    kill_switch: killSwitch,
  });
  const canonicalState = canonicalizePayload(statePayload);
  return sha256Hex(`${WALLET_GUARD_POLICY_STATE_COMMIT_DOMAIN}${canonicalState}`);
}

function assertRevision(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail('POMRX_WG_POLICY_STATE_E_INVALID', `${label} must be a non-negative safe integer`);
  }
}

function makeSnapshot(policy, revision) {
  const policyHash = commitPolicy(policy);
  return Object.freeze({
    schema_version: WALLET_GUARD_POLICY_STATE_SCHEMA_VERSION,
    policy_id: policy.policy_id,
    revision,
    policy_hash: policyHash,
    state_commitment: commitState({
      revision,
      policyHash,
      policyId: policy.policy_id,
      killSwitch: policy.kill_switch,
    }),
    kill_switch: policy.kill_switch,
    policy,
    reference_only: true,
    process_local_atomicity: true,
    durable_policy_state_proved: false,
    remote_operator_authorization_proved: false,
  });
}

export function createWalletGuardReferencePolicyController(options) {
  const bootstrap = captureExactDataObject(options, ['policy'], 'policy controller bootstrap');
  const initialPolicy = normalizeCandidate(bootstrap.policy);
  const policyId = initialPolicy.policy_id;
  let current = makeSnapshot(initialPolicy, 0);

  function readSnapshot() {
    return current;
  }

  function replacePolicy(updateInput) {
    const update = captureExactDataObject(updateInput, UPDATE_KEYS, 'policy replacement');
    assertRevision(update.expected_revision, 'expected_revision');
    if (update.expected_revision !== current.revision) {
      fail('POMRX_WG_POLICY_STATE_E_STALE', 'policy replacement revision is stale');
    }

    const nextPolicy = normalizeCandidate(update.policy);
    if (nextPolicy.policy_id !== policyId) {
      fail('POMRX_WG_POLICY_STATE_E_IDENTITY', 'policy_id cannot change inside one controller');
    }

    current = makeSnapshot(nextPolicy, current.revision + 1);
    return current;
  }

  function engageKillSwitch(input) {
    const update = captureExactDataObject(input, KILL_SWITCH_KEYS, 'kill-switch update');
    assertRevision(update.expected_revision, 'expected_revision');
    if (update.expected_revision !== current.revision) {
      fail('POMRX_WG_POLICY_STATE_E_STALE', 'kill-switch revision is stale');
    }
    if (current.policy.kill_switch) return current;

    const nextPolicy = normalizeCandidate({
      ...current.policy,
      kill_switch: true,
    });
    current = makeSnapshot(nextPolicy, current.revision + 1);
    return current;
  }

  function evaluate(intent, simulation = { status: 'not_run' }) {
    const snapshot = current;
    const result = evaluateWalletGuardPolicy(intent, snapshot.policy, simulation);
    if (result.policy_hash !== snapshot.policy_hash) {
      fail('POMRX_WG_POLICY_STATE_E_INTERNAL', 'policy evaluation hash diverged from controller snapshot');
    }
    return Object.freeze({
      ...result,
      policy_state_revision: snapshot.revision,
      policy_state_commitment: snapshot.state_commitment,
      reference_policy_state: true,
    });
  }

  return Object.freeze({
    readSnapshot,
    replacePolicy,
    engageKillSwitch,
    evaluate,
  });
}
