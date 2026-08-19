import {
  canonicalizePayload,
  sha256Hex,
} from '../../sdk/typescript/swisstokint-proof.mjs';
import {
  commitExactAuthorizationBinding,
} from '../authorization/reference-exact-authorization.mjs';

export const POM_RX_REFERENCE_EXECUTION_EVIDENCE_VERSION =
  'pom-rx-reference-execution-evidence/0.1';
export const POM_RX_REFERENCE_EXECUTION_EVIDENCE_HASH_DOMAIN =
  'swisstokint:pom-rx-reference-execution-evidence:v1:';
export const POM_RX_REFERENCE_EXECUTION_EFFECT_HASH_DOMAIN =
  'swisstokint:pom-rx-reference-execution-effect:v1:';

const EXECUTION_STATUSES = new Set(['success', 'error', 'unknown']);
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const DIAGNOSTIC_PATTERN = /^[A-Z0-9_]{3,96}$/u;
const MAX_DATA_DEPTH = 8;
const MAX_DATA_NODES = 1_000;
const MAX_DATA_STRING = 16_384;
const MAX_DATA_KEY = 128;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const BOOTSTRAP_KEYS = Object.freeze(['trustedClock']);
const BEGIN_KEYS = Object.freeze(['authorization_binding']);
const OUTCOME_KEYS = Object.freeze(['execution_status', 'effect']);
const EVIDENCE_KEYS = Object.freeze([
  'schema_version',
  'binding_profile',
  'run_id',
  'capability_id',
  'authorization_commitment',
  'action_commitment',
  'context_commitment',
  'execution_status',
  'effect_commitment',
  'recording_started_at',
  'recorded_at',
  'diagnostic',
  'reference_only',
  'gate_consumption_proved',
  'external_execution_proved',
  'external_effect_proved',
  'execution_evidence_hash',
]);

export class PomRxExecutionEvidenceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PomRxExecutionEvidenceError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new PomRxExecutionEvidenceError(code, message);
}

function assertPlainObjectWithExactDataKeys(value, expected, label, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(code, `${label} must be a plain object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(code, `${label} must be a plain object`);
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    fail(code, `${label} cannot contain symbol keys`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Object.keys(descriptors).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail(code, `${label} has missing or unknown fields`);
  }
  for (const key of actual) {
    const descriptor = descriptors[key];
    if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
      fail(code, `${label} cannot contain accessors`);
    }
  }
  return descriptors;
}

function canonicalUtcInstant(value, field) {
  if (typeof value !== 'string' || !value.endsWith('Z')) {
    fail('POMRX_EXEC_E_TIME_INVALID', `${field} must be a canonical UTC instant`);
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    fail('POMRX_EXEC_E_TIME_INVALID', `${field} must be a canonical UTC instant`);
  }
  return parsed;
}

function clonePlainData(
  value,
  depth = 0,
  budget = { remaining: MAX_DATA_NODES },
  code = 'POMRX_EXEC_E_DATA_INVALID',
) {
  if (depth > MAX_DATA_DEPTH || budget.remaining-- <= 0) {
    fail(code, 'plain-data snapshot exceeds reference bounds');
  }
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.length > MAX_DATA_STRING) {
      fail(code, 'plain-data snapshot string is too long');
    }
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      fail(code, 'plain-data snapshot numbers must be safe integers');
    }
    return value;
  }
  if (Array.isArray(value)) {
    const keys = Object.keys(value);
    if (keys.length !== value.length || keys.some((key, index) => key !== String(index))) {
      fail(code, 'plain-data snapshot arrays must be dense');
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    return Object.freeze(keys.map((key) => {
      const descriptor = descriptors[key];
      if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
        fail(code, 'plain-data snapshot cannot contain accessors');
      }
      return clonePlainData(descriptor.value, depth + 1, budget, code);
    }));
  }
  if (!value || typeof value !== 'object') {
    fail(code, 'plain-data snapshot contains unsupported data');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(code, 'plain-data snapshot must contain plain objects only');
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    fail(code, 'plain-data snapshot cannot contain symbol keys');
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const output = Object.create(null);
  for (const key of Object.keys(value)) {
    if (key.length === 0 || key.length > MAX_DATA_KEY || FORBIDDEN_KEYS.has(key)) {
      fail(code, 'plain-data snapshot contains an unsafe key');
    }
    const descriptor = descriptors[key];
    if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
      fail(code, 'plain-data snapshot cannot contain accessors');
    }
    output[key] = clonePlainData(descriptor.value, depth + 1, budget, code);
  }
  return Object.freeze(output);
}

function snapshotAuthorizationBinding(value) {
  let snapshot;
  let committed;
  try {
    snapshot = clonePlainData(
      value,
      0,
      { remaining: MAX_DATA_NODES },
      'POMRX_EXEC_E_AUTHORIZATION_INVALID',
    );
    committed = commitExactAuthorizationBinding(snapshot);
  } catch (error) {
    if (error instanceof PomRxExecutionEvidenceError
        && error.code === 'POMRX_EXEC_E_AUTHORIZATION_INVALID') {
      throw error;
    }
    fail('POMRX_EXEC_E_AUTHORIZATION_INVALID', 'exact authorization binding is invalid');
  }
  return Object.freeze({ snapshot, committed });
}

function effectCommitment(effect) {
  const canonical = canonicalizePayload(effect);
  return sha256Hex(`${POM_RX_REFERENCE_EXECUTION_EFFECT_HASH_DOMAIN}${canonical}`);
}

function evidenceHash(payload) {
  const canonical = canonicalizePayload(payload);
  return sha256Hex(`${POM_RX_REFERENCE_EXECUTION_EVIDENCE_HASH_DOMAIN}${canonical}`);
}

function validateEvidenceShape(evidence) {
  assertPlainObjectWithExactDataKeys(
    evidence,
    EVIDENCE_KEYS,
    'reference execution evidence',
    'POMRX_EXEC_E_EVIDENCE_INVALID',
  );
  if (evidence.schema_version !== POM_RX_REFERENCE_EXECUTION_EVIDENCE_VERSION) {
    fail('POMRX_EXEC_E_EVIDENCE_INVALID', 'execution evidence version is invalid');
  }
  if (!EXECUTION_STATUSES.has(evidence.execution_status)) {
    fail('POMRX_EXEC_E_EVIDENCE_INVALID', 'execution status is invalid');
  }
  for (const field of [
    'authorization_commitment',
    'action_commitment',
    'context_commitment',
    'execution_evidence_hash',
  ]) {
    if (typeof evidence[field] !== 'string' || !HASH_PATTERN.test(evidence[field])) {
      fail('POMRX_EXEC_E_EVIDENCE_INVALID', `${field} is invalid`);
    }
  }
  if (evidence.effect_commitment !== null
      && (typeof evidence.effect_commitment !== 'string'
        || !HASH_PATTERN.test(evidence.effect_commitment))) {
    fail('POMRX_EXEC_E_EVIDENCE_INVALID', 'effect_commitment is invalid');
  }
  if (evidence.execution_status === 'unknown' && evidence.effect_commitment !== null) {
    fail('POMRX_EXEC_E_EVIDENCE_INVALID', 'unknown execution cannot claim an effect commitment');
  }
  if (evidence.execution_status !== 'unknown' && evidence.effect_commitment === null) {
    fail('POMRX_EXEC_E_EVIDENCE_INVALID', 'known execution requires an effect commitment');
  }
  if (evidence.diagnostic !== null
      && (typeof evidence.diagnostic !== 'string' || !DIAGNOSTIC_PATTERN.test(evidence.diagnostic))) {
    fail('POMRX_EXEC_E_EVIDENCE_INVALID', 'diagnostic is invalid');
  }
  if (evidence.reference_only !== true
      || evidence.gate_consumption_proved !== false
      || evidence.external_execution_proved !== false
      || evidence.external_effect_proved !== false) {
    fail('POMRX_EXEC_E_EVIDENCE_INVALID', 'reference proof flags are invalid');
  }
  const startedAt = canonicalUtcInstant(evidence.recording_started_at, 'recording_started_at');
  const recordedAt = canonicalUtcInstant(evidence.recorded_at, 'recorded_at');
  if (recordedAt.getTime() < startedAt.getTime()) {
    fail('POMRX_EXEC_E_EVIDENCE_INVALID', 'recorded_at cannot predate recording_started_at');
  }
  return evidence;
}

export function createReferenceExecutionEvidenceRecorder(options) {
  const optionDescriptors = assertPlainObjectWithExactDataKeys(
    options,
    BOOTSTRAP_KEYS,
    'execution evidence bootstrap',
    'POMRX_EXEC_E_INVALID',
  );
  const trustedClock = optionDescriptors.trustedClock.value;
  if (typeof trustedClock !== 'function') {
    fail('POMRX_EXEC_E_INVALID', 'trustedClock must be a function');
  }

  let lastTrustedTimeMs = null;
  const handleState = new WeakMap();
  const localEvidence = new WeakSet();
  const usedAuthorizationCommitments = new Set();

  function sampleTrustedClock() {
    let raw;
    try {
      raw = trustedClock();
    } catch {
      fail('POMRX_EXEC_E_TIME_INVALID', 'trusted clock failed');
    }
    if (raw && typeof raw === 'object' && typeof raw.then === 'function') {
      fail('POMRX_EXEC_E_TIME_INVALID', 'trusted clock must be synchronous');
    }
    const now = canonicalUtcInstant(raw, 'trusted clock');
    if (lastTrustedTimeMs !== null && now.getTime() < lastTrustedTimeMs) {
      fail('POMRX_EXEC_E_TIME_ROLLBACK', 'trusted clock moved backwards');
    }
    lastTrustedTimeMs = now.getTime();
    return now;
  }

  function begin(input) {
    const descriptors = assertPlainObjectWithExactDataKeys(
      input,
      BEGIN_KEYS,
      'execution evidence begin input',
      'POMRX_EXEC_E_INVALID',
    );
    const { snapshot: binding, committed } = snapshotAuthorizationBinding(
      descriptors.authorization_binding.value,
    );
    const now = sampleTrustedClock();
    const issuedAt = canonicalUtcInstant(binding.issued_at, 'authorization issued_at');
    const expiresAt = canonicalUtcInstant(binding.expires_at, 'authorization expires_at');
    if (now.getTime() < issuedAt.getTime() || now.getTime() >= expiresAt.getTime()) {
      fail('POMRX_EXEC_E_AUTHORIZATION_WINDOW', 'recording start is outside authorization validity');
    }
    if (usedAuthorizationCommitments.has(committed.authorizationCommitment)) {
      fail(
        'POMRX_EXEC_E_AUTHORIZATION_REPLAY',
        'this exact authorization was already opened by this recorder',
      );
    }
    usedAuthorizationCommitments.add(committed.authorizationCommitment);

    const handle = Object.freeze(Object.create(null));
    handleState.set(handle, {
      state: 'OPEN',
      binding,
      authorization_commitment: committed.authorizationCommitment,
      recording_started_at: now.toISOString(),
      evidence: null,
    });
    return handle;
  }

  function reserve(handle) {
    const record = handleState.get(handle);
    if (!record) {
      fail('POMRX_EXEC_E_HANDLE_REQUIRED', 'a handle from this recorder is required');
    }
    if (record.state !== 'OPEN') {
      fail('POMRX_EXEC_E_HANDLE_STALE', 'execution evidence handle is no longer open');
    }
    record.state = 'COMPLETING';
    return record;
  }

  function buildEvidence(record, executionStatus, effectHash, diagnostic) {
    const recordedAt = sampleTrustedClock();
    const payload = Object.freeze({
      schema_version: POM_RX_REFERENCE_EXECUTION_EVIDENCE_VERSION,
      binding_profile: record.binding.binding_profile,
      run_id: record.binding.run_id,
      capability_id: record.binding.capability_id,
      authorization_commitment: record.authorization_commitment,
      action_commitment: record.binding.action_commitment,
      context_commitment: record.binding.context_commitment,
      execution_status: executionStatus,
      effect_commitment: effectHash,
      recording_started_at: record.recording_started_at,
      recorded_at: recordedAt.toISOString(),
      diagnostic,
      reference_only: true,
      gate_consumption_proved: false,
      external_execution_proved: false,
      external_effect_proved: false,
    });
    const evidence = Object.freeze({
      ...payload,
      execution_evidence_hash: evidenceHash(payload),
    });
    validateEvidenceShape(evidence);
    localEvidence.add(evidence);
    record.state = 'RECORDED';
    record.evidence = evidence;
    return evidence;
  }

  function complete(handle, rawOutcome) {
    const record = reserve(handle);
    try {
      const outcome = clonePlainData(
        rawOutcome,
        0,
        { remaining: MAX_DATA_NODES },
        'POMRX_EXEC_E_OUTCOME_INVALID',
      );
      const descriptors = assertPlainObjectWithExactDataKeys(
        outcome,
        OUTCOME_KEYS,
        'execution outcome',
        'POMRX_EXEC_E_OUTCOME_INVALID',
      );
      const executionStatus = descriptors.execution_status.value;
      const effect = descriptors.effect.value;
      if (typeof executionStatus !== 'string' || !EXECUTION_STATUSES.has(executionStatus)) {
        return buildEvidence(
          record,
          'unknown',
          null,
          'POMRX_EXEC_DIAG_OUTCOME_INVALID',
        );
      }
      if (executionStatus === 'unknown') {
        if (effect !== null) {
          return buildEvidence(
            record,
            'unknown',
            null,
            'POMRX_EXEC_DIAG_OUTCOME_INVALID',
          );
        }
        return buildEvidence(
          record,
          'unknown',
          null,
          'POMRX_EXEC_DIAG_EXECUTION_UNKNOWN',
        );
      }
      if (effect === null) {
        return buildEvidence(
          record,
          'unknown',
          null,
          'POMRX_EXEC_DIAG_OUTCOME_INVALID',
        );
      }
      return buildEvidence(record, executionStatus, effectCommitment(effect), null);
    } catch (error) {
      if (error instanceof PomRxExecutionEvidenceError
          && (error.code === 'POMRX_EXEC_E_OUTCOME_INVALID'
            || error.code === 'POMRX_EXEC_E_DATA_INVALID')) {
        return buildEvidence(
          record,
          'unknown',
          null,
          'POMRX_EXEC_DIAG_OUTCOME_INVALID',
        );
      }
      record.state = 'FAILED';
      throw error;
    }
  }

  function isLocallyRecorded(evidence) {
    if (!localEvidence.has(evidence)) return false;
    validateEvidenceShape(evidence);
    return true;
  }

  function inspectHandleStateForTest(handle) {
    return handleState.get(handle)?.state ?? null;
  }

  const recorder = Object.freeze({ begin, complete, isLocallyRecorded });
  const testAuthority = Object.freeze({ inspectHandleStateForTest });
  return Object.freeze({ recorder, testAuthority });
}
