import {
  canonicalizePayload,
  sha256Hex,
} from '../../../sdk/typescript/swisstokint-proof.mjs';
import {
  commitWalletGuardIntent,
  isLocallyNormalizedWalletGuardIntent,
  normalizeWalletGuardIntent,
  validateWalletGuardIntent,
} from './intent.mjs';

export const WALLET_GUARD_SIMULATION_SCHEMA_VERSION = 'wallet_guard_simulation/0.1';
export const WALLET_GUARD_SIMULATION_COMMIT_DOMAIN =
  'swisstokint:pom-rx-wallet-guard-simulation:v1:';

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const CALLBACK_STATUSES = new Set(['pass', 'fail', 'unavailable']);
const EVIDENCE_STATUSES = new Set(['pass', 'fail', 'unavailable', 'mismatch']);
const MAX_DATA_DEPTH = 8;
const MAX_DATA_NODES = 1_000;
const MAX_DATA_STRING = 16_384;
const MAX_DATA_KEY = 128;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const RUN_KEYS = Object.freeze(['intent', 'request']);
const CALLBACK_RESULT_KEYS = Object.freeze([
  'status',
  'request_id',
  'intent_commitment',
  'origin',
  'chain_id',
  'account',
  'state_commitment',
  'effect_commitment',
]);
const SIMULATOR_INPUT_KEYS = Object.freeze([
  'schema_version',
  'request_id',
  'intent_commitment',
  'origin',
  'chain_id',
  'account',
  'request',
]);
const EVIDENCE_KEYS = Object.freeze([
  'schema_version',
  'request_id',
  'intent_commitment',
  'origin',
  'chain_id',
  'account',
  'status',
  'state_commitment',
  'effect_commitment',
  'simulation_commitment',
  'reference_only',
  'simulator_truth_proved',
]);

const localEvidenceBrand = new WeakSet();

export class WalletGuardSimulationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WalletGuardSimulationError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new WalletGuardSimulationError(code, message);
}

function exactKeys(value, expected, label, code = 'POMRX_WG_SIM_E_INVALID') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(code, `${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail(code, `${label} has missing or unknown fields`);
  }
}

function clonePlainData(
  value,
  depth = 0,
  budget = { remaining: MAX_DATA_NODES },
  errorCode = 'POMRX_WG_SIM_E_REQUEST_INVALID',
) {
  if (depth > MAX_DATA_DEPTH || budget.remaining-- <= 0) {
    fail(errorCode, 'simulation data exceeds reference bounds');
  }
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.length > MAX_DATA_STRING) {
      fail(errorCode, 'simulation data string is too long');
    }
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      fail(errorCode, 'simulation data numbers must be safe integers');
    }
    return value;
  }
  if (Array.isArray(value)) {
    const keys = Object.keys(value);
    if (keys.length !== value.length || keys.some((key, index) => key !== String(index))) {
      fail(errorCode, 'simulation data arrays must be dense');
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    return Object.freeze(keys.map((key) => {
      const descriptor = descriptors[key];
      if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
        fail(errorCode, 'simulation data cannot contain accessors');
      }
      return clonePlainData(descriptor.value, depth + 1, budget, errorCode);
    }));
  }
  if (!value || typeof value !== 'object') {
    fail(errorCode, 'simulation data contains unsupported values');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(errorCode, 'simulation data must contain plain objects only');
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    fail(errorCode, 'simulation data cannot contain symbol keys');
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const output = Object.create(null);
  for (const key of Object.keys(value)) {
    if (key.length === 0 || key.length > MAX_DATA_KEY || FORBIDDEN_KEYS.has(key)) {
      fail(errorCode, 'simulation data contains an unsafe key');
    }
    const descriptor = descriptors[key];
    if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
      fail(errorCode, 'simulation data cannot contain accessors');
    }
    output[key] = clonePlainData(descriptor.value, depth + 1, budget, errorCode);
  }
  return Object.freeze(output);
}

function assertHash(value, field, { nullable = false } = {}) {
  if (nullable && value === null) return null;
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    fail('POMRX_WG_SIM_E_INVALID', `${field} must be a lowercase SHA-256${nullable ? ' or null' : ''}`);
  }
  return value;
}

function validateLocalIntent(intent) {
  try {
    validateWalletGuardIntent(intent);
  } catch {
    fail('POMRX_WG_SIM_E_INTENT_INVALID', 'simulation requires a canonical Wallet Guard intent');
  }
  if (!isLocallyNormalizedWalletGuardIntent(intent)) {
    fail('POMRX_WG_SIM_E_INTENT_INVALID', 'simulation requires a locally normalized Wallet Guard intent');
  }
}

function replayAndCommitIntent(intent, requestSnapshot) {
  let replayed;
  try {
    replayed = normalizeWalletGuardIntent({
      requestId: intent.request_id,
      trustedOrigin: intent.origin,
      trustedChainId: intent.chain_id,
      trustedAccount: intent.account,
      request: requestSnapshot,
    });
  } catch {
    fail('POMRX_WG_SIM_E_BINDING_MISMATCH', 'simulation request does not normalize under the intent context');
  }
  const expectedCommitment = commitWalletGuardIntent(intent).intent_commitment;
  const replayedCommitment = commitWalletGuardIntent(replayed).intent_commitment;
  if (replayedCommitment !== expectedCommitment) {
    fail('POMRX_WG_SIM_E_BINDING_MISMATCH', 'simulation request does not match the committed intent');
  }
  return expectedCommitment;
}

function evidencePayload(identity, status, stateCommitment, effectCommitment) {
  return Object.freeze({
    schema_version: WALLET_GUARD_SIMULATION_SCHEMA_VERSION,
    request_id: identity.request_id,
    intent_commitment: identity.intent_commitment,
    origin: identity.origin,
    chain_id: identity.chain_id,
    account: identity.account,
    status,
    state_commitment: stateCommitment,
    effect_commitment: effectCommitment,
  });
}

function makeEvidence(identity, status, stateCommitment = null, effectCommitment = null) {
  if (!EVIDENCE_STATUSES.has(status)) {
    fail('POMRX_WG_SIM_E_INVALID', 'internal simulation status is invalid');
  }
  const payload = evidencePayload(identity, status, stateCommitment, effectCommitment);
  const canonical = canonicalizePayload(payload);
  const evidence = Object.freeze({
    ...payload,
    simulation_commitment: sha256Hex(`${WALLET_GUARD_SIMULATION_COMMIT_DOMAIN}${canonical}`),
    reference_only: true,
    simulator_truth_proved: false,
  });
  localEvidenceBrand.add(evidence);
  return evidence;
}

function identityMatches(result, identity) {
  return result.request_id === identity.request_id
    && result.intent_commitment === identity.intent_commitment
    && result.origin === identity.origin
    && result.chain_id === identity.chain_id
    && result.account === identity.account;
}

function normalizeCallbackResult(rawResult, identity) {
  let result;
  try {
    result = clonePlainData(
      rawResult,
      0,
      { remaining: MAX_DATA_NODES },
      'POMRX_WG_SIM_E_CALLBACK_INVALID',
    );
    exactKeys(result, CALLBACK_RESULT_KEYS, 'simulation callback result', 'POMRX_WG_SIM_E_CALLBACK_INVALID');
  } catch (error) {
    if (error instanceof WalletGuardSimulationError) {
      return makeEvidence(identity, 'mismatch');
    }
    throw error;
  }

  if (typeof result.status !== 'string' || !CALLBACK_STATUSES.has(result.status)) {
    return makeEvidence(identity, 'mismatch');
  }
  if (!identityMatches(result, identity)) {
    return makeEvidence(identity, 'mismatch');
  }

  if (result.status === 'unavailable') {
    if (result.state_commitment !== null || result.effect_commitment !== null) {
      return makeEvidence(identity, 'mismatch');
    }
    return makeEvidence(identity, 'unavailable');
  }

  try {
    const stateCommitment = assertHash(result.state_commitment, 'state_commitment');
    const effectCommitment = assertHash(result.effect_commitment, 'effect_commitment');
    return makeEvidence(identity, result.status, stateCommitment, effectCommitment);
  } catch {
    return makeEvidence(identity, 'mismatch');
  }
}

function validateEvidence(evidence) {
  exactKeys(evidence, EVIDENCE_KEYS, 'Wallet Guard simulation evidence');
  if (evidence.schema_version !== WALLET_GUARD_SIMULATION_SCHEMA_VERSION
      || typeof evidence.status !== 'string'
      || !EVIDENCE_STATUSES.has(evidence.status)
      || evidence.reference_only !== true
      || evidence.simulator_truth_proved !== false) {
    fail('POMRX_WG_SIM_E_INVALID', 'simulation evidence metadata is invalid');
  }
  assertHash(evidence.intent_commitment, 'intent_commitment');
  assertHash(evidence.simulation_commitment, 'simulation_commitment');
  if (evidence.status === 'pass' || evidence.status === 'fail') {
    assertHash(evidence.state_commitment, 'state_commitment');
    assertHash(evidence.effect_commitment, 'effect_commitment');
  } else if (evidence.state_commitment !== null || evidence.effect_commitment !== null) {
    fail('POMRX_WG_SIM_E_INVALID', 'non-executed simulation evidence cannot carry state/effect commitments');
  }

  const payload = evidencePayload(
    evidence,
    evidence.status,
    evidence.state_commitment,
    evidence.effect_commitment,
  );
  const canonical = canonicalizePayload(payload);
  const expectedCommitment = sha256Hex(`${WALLET_GUARD_SIMULATION_COMMIT_DOMAIN}${canonical}`);
  if (expectedCommitment !== evidence.simulation_commitment) {
    fail('POMRX_WG_SIM_E_INVALID', 'simulation commitment does not match evidence');
  }
  return evidence;
}

export function isLocallyProducedWalletGuardSimulationEvidence(evidence) {
  return localEvidenceBrand.has(evidence);
}

export function toWalletGuardPolicySimulation(evidence) {
  validateEvidence(evidence);
  if (!localEvidenceBrand.has(evidence)) {
    fail('POMRX_WG_SIM_E_INVALID', 'policy simulation requires locally produced evidence');
  }
  return Object.freeze({ status: evidence.status });
}

export function createWalletGuardReferenceSimulationHarness(options) {
  exactKeys(options, ['simulateRequest'], 'Wallet Guard simulation bootstrap');
  if (typeof options.simulateRequest !== 'function') {
    fail('POMRX_WG_SIM_E_INVALID', 'simulateRequest must be a function');
  }

  async function simulate(input) {
    exactKeys(input, RUN_KEYS, 'Wallet Guard simulation input');
    validateLocalIntent(input.intent);
    const requestSnapshot = clonePlainData(input.request);
    const intentCommitment = replayAndCommitIntent(input.intent, requestSnapshot);
    const identity = Object.freeze({
      request_id: input.intent.request_id,
      intent_commitment: intentCommitment,
      origin: input.intent.origin,
      chain_id: input.intent.chain_id,
      account: input.intent.account,
    });
    const simulatorInput = Object.freeze({
      schema_version: WALLET_GUARD_SIMULATION_SCHEMA_VERSION,
      ...identity,
      request: requestSnapshot,
    });
    exactKeys(simulatorInput, SIMULATOR_INPUT_KEYS, 'simulation callback input');

    let rawResult;
    try {
      rawResult = await options.simulateRequest(simulatorInput);
    } catch {
      return makeEvidence(identity, 'unavailable');
    }
    return normalizeCallbackResult(rawResult, identity);
  }

  return Object.freeze({ simulate });
}
