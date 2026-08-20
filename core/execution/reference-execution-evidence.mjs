import { types as utilTypes } from 'node:util';

import {
  canonicalizePayload,
  sha256Hex,
} from '../../sdk/typescript/swisstokint-proof.mjs';
import {
  PomRxReferenceCapabilityError,
  commitExactAuthorizationBinding,
} from '../authorization/reference-exact-authorization.mjs';
import {
  PomRxPlainDataError,
  captureReferencePlainData,
} from '../reference-data/plain-data-snapshot.mjs';

export const POM_RX_REFERENCE_EXECUTION_EVIDENCE_VERSION =
  'pom-rx-reference-execution-evidence/0.1';
export const POM_RX_REFERENCE_EXECUTION_EVIDENCE_HASH_DOMAIN =
  'swisstokint:pom-rx-reference-execution-evidence:v1:';
export const POM_RX_REFERENCE_EXECUTION_EFFECT_HASH_DOMAIN =
  'swisstokint:pom-rx-reference-execution-effect:v1:';

const EXECUTION_STATUSES = new Set(['success', 'error', 'unknown']);
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const DIAGNOSTIC_PATTERN = /^[A-Z0-9_]{3,96}$/u;
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
  'native_execution_time_proved',
  'external_execution_proved',
  'external_effect_proved',
  'execution_evidence_hash',
]);
const MAX_LOCAL_AUTHORIZATIONS = 1_000;

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

function isOwnEnumerableDataDescriptor(descriptor) {
  return Boolean(descriptor)
    && Object.hasOwn(descriptor, 'enumerable')
    && descriptor.enumerable === true
    && Object.hasOwn(descriptor, 'value')
    && !Object.hasOwn(descriptor, 'get')
    && !Object.hasOwn(descriptor, 'set');
}

function captureExactDataRecord(value, expectedKeys, label, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || utilTypes.isProxy(value)) {
    fail(code, `${label} must be a non-Proxy plain object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(code, `${label} must be a plain object`);
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    fail(code, `${label} cannot contain symbol keys`);
  }

  const ownNames = Object.getOwnPropertyNames(value).sort();
  const expected = [...expectedKeys].sort();
  if (ownNames.length !== expected.length
      || ownNames.some((key, index) => key !== expected[index])) {
    fail(code, `${label} has missing, hidden or unknown fields`);
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const snapshot = Object.create(null);
  for (const key of ownNames) {
    const descriptor = descriptors[key];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail(code, `${label}.${key} must be an enumerable data property`);
    }
    snapshot[key] = descriptor.value;
  }
  return Object.freeze(snapshot);
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

function captureAuthorizationBinding(value) {
  try {
    const snapshot = captureReferencePlainData(value, 'execution authorization binding');
    const committed = commitExactAuthorizationBinding(snapshot);
    return Object.freeze({ snapshot, committed });
  } catch (error) {
    if (error instanceof PomRxPlainDataError || error instanceof PomRxReferenceCapabilityError) {
      fail('POMRX_EXEC_E_AUTHORIZATION_INVALID', 'exact authorization binding is invalid');
    }
    throw error;
  }
}

function commitEffect(effect) {
  let canonical;
  try {
    canonical = canonicalizePayload(effect);
  } catch (error) {
    if (error instanceof TypeError) {
      fail(
        'POMRX_EXEC_E_EFFECT_UNCOMMITTABLE',
        'captured execution effect is outside the canonical commitment contract',
      );
    }
    throw error;
  }
  return sha256Hex(`${POM_RX_REFERENCE_EXECUTION_EFFECT_HASH_DOMAIN}${canonical}`);
}

function commitEvidence(payload) {
  const canonical = canonicalizePayload(payload);
  return sha256Hex(`${POM_RX_REFERENCE_EXECUTION_EVIDENCE_HASH_DOMAIN}${canonical}`);
}

function validateEvidence(evidence) {
  const captured = captureExactDataRecord(
    evidence,
    EVIDENCE_KEYS,
    'reference execution evidence',
    'POMRX_EXEC_E_EVIDENCE_INVALID',
  );
  if (captured.schema_version !== POM_RX_REFERENCE_EXECUTION_EVIDENCE_VERSION) {
    fail('POMRX_EXEC_E_EVIDENCE_INVALID', 'execution evidence version is invalid');
  }
  if (!EXECUTION_STATUSES.has(captured.execution_status)) {
    fail('POMRX_EXEC_E_EVIDENCE_INVALID', 'execution status is invalid');
  }
  for (const field of [
    'authorization_commitment',
    'action_commitment',
    'context_commitment',
    'execution_evidence_hash',
  ]) {
    if (typeof captured[field] !== 'string' || !HASH_PATTERN.test(captured[field])) {
      fail('POMRX_EXEC_E_EVIDENCE_INVALID', `${field} is invalid`);
    }
  }
  if (captured.effect_commitment !== null
      && (typeof captured.effect_commitment !== 'string'
        || !HASH_PATTERN.test(captured.effect_commitment))) {
    fail('POMRX_EXEC_E_EVIDENCE_INVALID', 'effect_commitment is invalid');
  }
  if (captured.execution_status === 'unknown' && captured.effect_commitment !== null) {
    fail('POMRX_EXEC_E_EVIDENCE_INVALID', 'unknown execution cannot claim an effect commitment');
  }
  if (captured.execution_status !== 'unknown' && captured.effect_commitment === null) {
    fail('POMRX_EXEC_E_EVIDENCE_INVALID', 'known execution requires an effect commitment');
  }
  if (captured.diagnostic !== null
      && (typeof captured.diagnostic !== 'string'
        || !DIAGNOSTIC_PATTERN.test(captured.diagnostic))) {
    fail('POMRX_EXEC_E_EVIDENCE_INVALID', 'diagnostic is invalid');
  }
  if (captured.reference_only !== true
      || captured.gate_consumption_proved !== false
      || captured.native_execution_time_proved !== false
      || captured.external_execution_proved !== false
      || captured.external_effect_proved !== false) {
    fail('POMRX_EXEC_E_EVIDENCE_INVALID', 'reference proof flags are invalid');
  }
  const startedAt = canonicalUtcInstant(captured.recording_started_at, 'recording_started_at');
  const recordedAt = canonicalUtcInstant(captured.recorded_at, 'recorded_at');
  if (recordedAt.getTime() < startedAt.getTime()) {
    fail('POMRX_EXEC_E_EVIDENCE_INVALID', 'recorded_at cannot predate recording_started_at');
  }
  return evidence;
}

export function createReferenceExecutionEvidenceRecorder(options) {
  const capturedOptions = captureExactDataRecord(
    options,
    BOOTSTRAP_KEYS,
    'execution evidence bootstrap',
    'POMRX_EXEC_E_INVALID',
  );
  const trustedClock = capturedOptions.trustedClock;
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
    const capturedInput = captureExactDataRecord(
      input,
      BEGIN_KEYS,
      'execution evidence begin input',
      'POMRX_EXEC_E_INVALID',
    );
    const { snapshot: binding, committed } = captureAuthorizationBinding(
      capturedInput.authorization_binding,
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
    if (usedAuthorizationCommitments.size >= MAX_LOCAL_AUTHORIZATIONS) {
      fail(
        'POMRX_EXEC_E_CAPACITY',
        'reference recorder reached its fail-closed local authorization ceiling',
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
      native_execution_time_proved: false,
      external_execution_proved: false,
      external_effect_proved: false,
    });
    const evidence = Object.freeze({
      ...payload,
      execution_evidence_hash: commitEvidence(payload),
    });
    validateEvidence(evidence);
    localEvidence.add(evidence);
    record.state = 'RECORDED';
    record.evidence = evidence;
    return evidence;
  }

  function complete(handle, rawOutcome) {
    const record = reserve(handle);
    try {
      let outcome;
      try {
        outcome = captureReferencePlainData(rawOutcome, 'execution outcome');
      } catch (error) {
        if (error instanceof PomRxPlainDataError) {
          return buildEvidence(
            record,
            'unknown',
            null,
            'POMRX_EXEC_DIAG_OUTCOME_INVALID',
          );
        }
        throw error;
      }

      let capturedOutcome;
      try {
        capturedOutcome = captureExactDataRecord(
          outcome,
          OUTCOME_KEYS,
          'execution outcome',
          'POMRX_EXEC_E_OUTCOME_INVALID',
        );
      } catch (error) {
        if (error instanceof PomRxExecutionEvidenceError
            && error.code === 'POMRX_EXEC_E_OUTCOME_INVALID') {
          return buildEvidence(
            record,
            'unknown',
            null,
            'POMRX_EXEC_DIAG_OUTCOME_INVALID',
          );
        }
        throw error;
      }

      const executionStatus = capturedOutcome.execution_status;
      const effect = capturedOutcome.effect;
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

      let effectHash;
      try {
        effectHash = commitEffect(effect);
      } catch (error) {
        if (error instanceof PomRxExecutionEvidenceError
            && error.code === 'POMRX_EXEC_E_EFFECT_UNCOMMITTABLE') {
          return buildEvidence(
            record,
            'unknown',
            null,
            'POMRX_EXEC_DIAG_OUTCOME_INVALID',
          );
        }
        throw error;
      }
      return buildEvidence(record, executionStatus, effectHash, null);
    } catch (error) {
      record.state = 'FAILED';
      throw error;
    }
  }

  function isLocallyRecorded(evidence) {
    if (!localEvidence.has(evidence)) return false;
    validateEvidence(evidence);
    return true;
  }

  function inspectHandleStateForTest(handle) {
    return handleState.get(handle)?.state ?? null;
  }

  const recorder = Object.freeze({
    begin,
    complete,
    isLocallyRecorded,
  });
  const testAuthority = Object.freeze({ inspectHandleStateForTest });
  return Object.freeze({ recorder, testAuthority });
}
