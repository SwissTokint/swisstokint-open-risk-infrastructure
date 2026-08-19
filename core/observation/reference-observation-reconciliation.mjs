import {
  canonicalizePayload,
  sha256Hex,
} from '../../sdk/typescript/swisstokint-proof.mjs';
import {
  commitExactAuthorizationBinding,
} from '../authorization/reference-exact-authorization.mjs';

export const POM_RX_REFERENCE_OBSERVATION_VERSION =
  'pom-rx-reference-observation/0.1';
export const POM_RX_REFERENCE_RECONCILIATION_VERSION =
  'pom-rx-reference-reconciliation/0.1';
export const POM_RX_REFERENCE_OBSERVATION_HASH_DOMAIN =
  'swisstokint:pom-rx-reference-observation:v1:';
export const POM_RX_REFERENCE_RECONCILIATION_HASH_DOMAIN =
  'swisstokint:pom-rx-reference-reconciliation:v1:';

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/u;
const EXECUTION_STATUSES = new Set(['success', 'error', 'unknown']);
const EXPECTED_EXECUTION_STATUSES = new Set(['success', 'error', 'any']);
const MAX_REFERENCE_DEPTH = 8;
const MAX_REFERENCE_NODES = 1_000;
const MAX_REFERENCE_STRING = 16_384;
const MAX_REFERENCE_KEY = 128;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const EXPECTED_KEYS = Object.freeze([
  'authorization_binding',
  'expected_execution_status',
  'expected_effect_commitment',
]);

const OBSERVED_KEYS = Object.freeze([
  'run_id',
  'action_commitment',
  'context_commitment',
  'execution_status',
  'effect_commitment',
  'executed_at',
  'observed_at',
]);

const CAPTURE_KEYS = Object.freeze(['expected', 'observationRef']);

export class PomRxObservationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PomRxObservationError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new PomRxObservationError(code, message);
}

function exactKeys(value, expected, label, code = 'POMRX_OBS_E_INVALID') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(code, `${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail(code, `${label} has missing or unknown fields`);
  }
}

function canonicalUtcInstant(value, field, code = 'POMRX_OBS_E_TIME_INVALID') {
  if (typeof value !== 'string' || !value.endsWith('Z')) {
    fail(code, `${field} must be a canonical UTC instant`);
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    fail(code, `${field} must be a canonical UTC instant`);
  }
  return parsed;
}

function assertHash(value, field, { nullable = false, code = 'POMRX_OBS_E_INVALID' } = {}) {
  if (nullable && value === null) return null;
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    fail(code, `${field} must be a lowercase SHA-256 hash${nullable ? ' or null' : ''}`);
  }
  return value;
}

function assertId(value, field, code = 'POMRX_OBS_E_INVALID') {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
    fail(code, `${field} is invalid`);
  }
  return value;
}

function clonePlainData(
  value,
  depth = 0,
  budget = { remaining: MAX_REFERENCE_NODES },
  errorCode = 'POMRX_OBS_E_REFERENCE_INVALID',
) {
  if (depth > MAX_REFERENCE_DEPTH || budget.remaining-- <= 0) {
    fail(errorCode, 'plain-data snapshot exceeds bounds');
  }
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.length > MAX_REFERENCE_STRING) {
      fail(errorCode, 'plain-data snapshot string is too long');
    }
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      fail(errorCode, 'plain-data snapshot numbers must be safe integers');
    }
    return value;
  }
  if (Array.isArray(value)) {
    const keys = Object.keys(value);
    if (keys.length !== value.length || keys.some((key, index) => key !== String(index))) {
      fail(errorCode, 'plain-data snapshot arrays must be dense');
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    return Object.freeze(keys.map((key) => {
      const descriptor = descriptors[key];
      if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
        fail(errorCode, 'plain-data snapshot cannot contain accessors');
      }
      return clonePlainData(descriptor.value, depth + 1, budget, errorCode);
    }));
  }
  if (!value || typeof value !== 'object') {
    fail(errorCode, 'plain-data snapshot contains unsupported data');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(errorCode, 'plain-data snapshot must contain plain objects only');
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    fail(errorCode, 'plain-data snapshot cannot contain symbol keys');
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const output = Object.create(null);
  for (const key of Object.keys(value)) {
    if (key.length === 0 || key.length > MAX_REFERENCE_KEY || FORBIDDEN_KEYS.has(key)) {
      fail(errorCode, 'plain-data snapshot contains an unsafe key');
    }
    const descriptor = descriptors[key];
    if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
      fail(errorCode, 'plain-data snapshot cannot contain accessors');
    }
    output[key] = clonePlainData(descriptor.value, depth + 1, budget, errorCode);
  }
  return Object.freeze(output);
}

function normalizeExpected(value) {
  exactKeys(value, EXPECTED_KEYS, 'expected reconciliation input');
  if (typeof value.expected_execution_status !== 'string'
      || !EXPECTED_EXECUTION_STATUSES.has(value.expected_execution_status)) {
    fail(
      'POMRX_OBS_E_INVALID',
      'expected_execution_status must be success, error or any',
    );
  }

  let authorizationBinding;
  let committedAuthorization;
  try {
    authorizationBinding = clonePlainData(
      value.authorization_binding,
      0,
      { remaining: MAX_REFERENCE_NODES },
      'POMRX_OBS_E_AUTHORIZATION_INVALID',
    );
    committedAuthorization = commitExactAuthorizationBinding(authorizationBinding);
  } catch (error) {
    if (error instanceof PomRxObservationError
        && error.code === 'POMRX_OBS_E_AUTHORIZATION_INVALID') {
      throw error;
    }
    fail(
      'POMRX_OBS_E_AUTHORIZATION_INVALID',
      'exact authorization binding is invalid',
    );
  }

  return Object.freeze({
    binding_profile: authorizationBinding.binding_profile,
    run_id: authorizationBinding.run_id,
    authorization_commitment: committedAuthorization.authorizationCommitment,
    action_commitment: authorizationBinding.action_commitment,
    context_commitment: authorizationBinding.context_commitment,
    authorization_issued_at: authorizationBinding.issued_at,
    authorization_valid_until: authorizationBinding.expires_at,
    expected_execution_status: value.expected_execution_status,
    expected_effect_commitment: assertHash(
      value.expected_effect_commitment,
      'expected_effect_commitment',
      { nullable: true },
    ),
  });
}

function snapshotObservedRecord(value) {
  return clonePlainData(
    value,
    0,
    { remaining: MAX_REFERENCE_NODES },
    'POMRX_OBS_E_OBSERVER_INVALID',
  );
}

function normalizeObserved(value, trustedNow) {
  exactKeys(
    value,
    OBSERVED_KEYS,
    'independent observation',
    'POMRX_OBS_E_OBSERVER_INVALID',
  );
  if (typeof value.execution_status !== 'string' || !EXECUTION_STATUSES.has(value.execution_status)) {
    fail('POMRX_OBS_E_OBSERVER_INVALID', 'execution_status is invalid');
  }
  const executedAt = canonicalUtcInstant(
    value.executed_at,
    'executed_at',
    'POMRX_OBS_E_OBSERVER_INVALID',
  );
  const observedAt = canonicalUtcInstant(
    value.observed_at,
    'observed_at',
    'POMRX_OBS_E_OBSERVER_INVALID',
  );
  if (observedAt.getTime() < executedAt.getTime()) {
    fail('POMRX_OBS_E_OBSERVER_INVALID', 'observation cannot predate execution');
  }
  if (observedAt.getTime() > trustedNow.getTime()) {
    fail('POMRX_OBS_E_OBSERVER_INVALID', 'observer reported a future observation');
  }
  const effectCommitment = assertHash(
    value.effect_commitment,
    'effect_commitment',
    { nullable: true, code: 'POMRX_OBS_E_OBSERVER_INVALID' },
  );
  if (value.execution_status !== 'unknown' && effectCommitment === null) {
    fail('POMRX_OBS_E_OBSERVER_INVALID', 'known execution status requires an effect commitment');
  }
  return Object.freeze({
    schema_version: POM_RX_REFERENCE_OBSERVATION_VERSION,
    run_id: assertId(value.run_id, 'observed run_id', 'POMRX_OBS_E_OBSERVER_INVALID'),
    action_commitment: assertHash(
      value.action_commitment,
      'observed action_commitment',
      { code: 'POMRX_OBS_E_OBSERVER_INVALID' },
    ),
    context_commitment: assertHash(
      value.context_commitment,
      'observed context_commitment',
      { code: 'POMRX_OBS_E_OBSERVER_INVALID' },
    ),
    execution_status: value.execution_status,
    effect_commitment: effectCommitment,
    executed_at: executedAt.toISOString(),
    observed_at: observedAt.toISOString(),
  });
}

function commitObservation(observation) {
  const canonical = canonicalizePayload(observation);
  return Object.freeze({
    canonical_observation: canonical,
    observation_hash: sha256Hex(`${POM_RX_REFERENCE_OBSERVATION_HASH_DOMAIN}${canonical}`),
  });
}

function classify(expected, observation) {
  const reasons = [];
  if (observation.run_id !== expected.run_id) reasons.push('POMRX_RECON_MISMATCH_RUN');
  if (observation.action_commitment !== expected.action_commitment) {
    reasons.push('POMRX_RECON_MISMATCH_ACTION');
  }
  if (observation.context_commitment !== expected.context_commitment) {
    reasons.push('POMRX_RECON_MISMATCH_CONTEXT');
  }

  const executedMs = new Date(observation.executed_at).getTime();
  const issuedMs = new Date(expected.authorization_issued_at).getTime();
  const validUntilMs = new Date(expected.authorization_valid_until).getTime();
  if (executedMs < issuedMs || executedMs >= validUntilMs) {
    reasons.push('POMRX_RECON_MISMATCH_AUTH_WINDOW');
  }

  if (observation.execution_status !== 'unknown'
      && expected.expected_execution_status !== 'any'
      && observation.execution_status !== expected.expected_execution_status) {
    reasons.push('POMRX_RECON_MISMATCH_STATUS');
  }

  if (expected.expected_effect_commitment !== null
      && observation.execution_status !== 'unknown'
      && observation.effect_commitment !== expected.expected_effect_commitment) {
    reasons.push('POMRX_RECON_MISMATCH_EFFECT');
  }

  if (reasons.length > 0) {
    return Object.freeze({ verdict: 'MISMATCH', reasons: Object.freeze(reasons) });
  }
  if (observation.execution_status === 'unknown') {
    return Object.freeze({
      verdict: 'INDETERMINATE',
      reasons: Object.freeze(['POMRX_RECON_INDETERMINATE_EXECUTION']),
    });
  }
  return Object.freeze({ verdict: 'MATCH', reasons: Object.freeze([]) });
}

function commitReconciliation(expected, observationHash, classification) {
  const payload = Object.freeze({
    schema_version: POM_RX_REFERENCE_RECONCILIATION_VERSION,
    binding_profile: expected.binding_profile,
    run_id: expected.run_id,
    authorization_commitment: expected.authorization_commitment,
    action_commitment: expected.action_commitment,
    context_commitment: expected.context_commitment,
    expected_execution_status: expected.expected_execution_status,
    expected_effect_commitment: expected.expected_effect_commitment,
    observation_hash: observationHash,
    verdict: classification.verdict,
    reasons: classification.reasons,
  });
  const canonical = canonicalizePayload(payload);
  return Object.freeze({
    ...payload,
    reconciliation_hash: sha256Hex(
      `${POM_RX_REFERENCE_RECONCILIATION_HASH_DOMAIN}${canonical}`,
    ),
    reference_only: true,
    external_world_proved: false,
  });
}

export function createReferenceObservationReconciliation(options) {
  exactKeys(options, ['trustedClock', 'observeExecution'], 'observation/reconciliation bootstrap');
  if (typeof options.trustedClock !== 'function' || typeof options.observeExecution !== 'function') {
    fail('POMRX_OBS_E_INVALID', 'trustedClock and observeExecution must be functions');
  }

  let lastTrustedTimeMs = null;

  function sampleTrustedClock() {
    let raw;
    try {
      raw = options.trustedClock();
    } catch {
      fail('POMRX_OBS_E_TIME_INVALID', 'trusted clock failed');
    }
    if (raw && typeof raw === 'object' && typeof raw.then === 'function') {
      fail('POMRX_OBS_E_TIME_INVALID', 'trusted clock must be synchronous');
    }
    const now = canonicalUtcInstant(raw, 'trusted clock');
    if (lastTrustedTimeMs !== null && now.getTime() < lastTrustedTimeMs) {
      fail('POMRX_OBS_E_TIME_ROLLBACK', 'trusted clock moved backwards');
    }
    lastTrustedTimeMs = now.getTime();
    return now;
  }

  async function captureAndReconcile(input) {
    exactKeys(input, CAPTURE_KEYS, 'capture/reconcile input');
    const expected = normalizeExpected(input.expected);
    const observationRef = clonePlainData(input.observationRef);

    sampleTrustedClock();
    let rawObservation;
    try {
      rawObservation = await options.observeExecution(observationRef);
    } catch {
      fail('POMRX_OBS_E_OBSERVER_FAILED', 'independent observer failed');
    }
    const trustedNow = sampleTrustedClock();
    const observedSnapshot = snapshotObservedRecord(rawObservation);
    const observation = normalizeObserved(observedSnapshot, trustedNow);
    const committedObservation = commitObservation(observation);
    const classification = classify(expected, observation);
    const reconciliation = commitReconciliation(
      expected,
      committedObservation.observation_hash,
      classification,
    );

    return Object.freeze({
      observation: Object.freeze({
        ...observation,
        observation_hash: committedObservation.observation_hash,
      }),
      reconciliation,
    });
  }

  return Object.freeze({ captureAndReconcile });
}
