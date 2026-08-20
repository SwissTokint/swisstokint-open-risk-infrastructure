import { types as utilTypes } from 'node:util';

import {
  canonicalizePayload,
  sha256Hex,
} from '../../sdk/typescript/swisstokint-proof.mjs';
import {
  commitExactAuthorizationBinding,
} from '../authorization/reference-exact-authorization.mjs';
import {
  captureReferencePlainData,
} from '../reference-data/plain-data-snapshot.mjs';

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

function snapshotExactReferences(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('POMRX_OBS_E_INVALID', `${label} must be an object`);
  }
  if (utilTypes.isProxy(value)) {
    fail('POMRX_OBS_E_INVALID', `${label} cannot be a Proxy`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail('POMRX_OBS_E_INVALID', `${label} must be a plain object`);
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    fail('POMRX_OBS_E_INVALID', `${label} cannot contain symbol keys`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Object.keys(descriptors).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail('POMRX_OBS_E_INVALID', `${label} has missing or unknown fields`);
  }
  const snapshot = Object.create(null);
  for (const key of expected) {
    const descriptor = descriptors[key];
    if (!descriptor
        || descriptor.enumerable !== true
        || typeof descriptor.get === 'function'
        || typeof descriptor.set === 'function'
        || !Object.hasOwn(descriptor, 'value')) {
      fail('POMRX_OBS_E_INVALID', `${label}.${key} must be an enumerable data property`);
    }
    snapshot[key] = descriptor.value;
  }
  return Object.freeze(snapshot);
}

function snapshotPlainData(value, label, errorCode) {
  try {
    return captureReferencePlainData(value, label);
  } catch {
    fail(errorCode, `${label} must be inert bounded plain data`);
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

function normalizeExpected(value) {
  exactKeys(value, EXPECTED_KEYS, 'expected reconciliation input');
  const expectedExecutionStatus = value.expected_execution_status;
  if (typeof expectedExecutionStatus !== 'string'
      || !EXPECTED_EXECUTION_STATUSES.has(expectedExecutionStatus)) {
    fail(
      'POMRX_OBS_E_INVALID',
      'expected_execution_status must be success, error or any',
    );
  }

  let authorizationBinding;
  let committedAuthorization;
  try {
    authorizationBinding = value.authorization_binding;
    committedAuthorization = commitExactAuthorizationBinding(authorizationBinding);
  } catch {
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
    expected_execution_status: expectedExecutionStatus,
    expected_effect_commitment: assertHash(
      value.expected_effect_commitment,
      'expected_effect_commitment',
      { nullable: true },
    ),
  });
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
  const bootstrap = snapshotExactReferences(
    options,
    ['trustedClock', 'observeExecution'],
    'observation/reconciliation bootstrap',
  );
  if (typeof bootstrap.trustedClock !== 'function' || typeof bootstrap.observeExecution !== 'function') {
    fail('POMRX_OBS_E_INVALID', 'trustedClock and observeExecution must be functions');
  }
  const trustedClock = bootstrap.trustedClock;
  const observeExecution = bootstrap.observeExecution;

  let lastTrustedTimeMs = null;

  function sampleTrustedClock() {
    let raw;
    try {
      raw = trustedClock();
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
    const captured = snapshotPlainData(
      input,
      'capture/reconcile input',
      'POMRX_OBS_E_REFERENCE_INVALID',
    );
    exactKeys(captured, CAPTURE_KEYS, 'capture/reconcile input');
    const expected = normalizeExpected(captured.expected);
    const observationRef = captured.observationRef;

    sampleTrustedClock();
    let rawObservation;
    try {
      rawObservation = await observeExecution(observationRef);
    } catch {
      fail('POMRX_OBS_E_OBSERVER_FAILED', 'independent observer failed');
    }
    const trustedNow = sampleTrustedClock();
    const observedSnapshot = snapshotPlainData(
      rawObservation,
      'independent observation',
      'POMRX_OBS_E_OBSERVER_INVALID',
    );
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
