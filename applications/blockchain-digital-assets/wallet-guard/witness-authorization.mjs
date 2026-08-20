import { types as utilTypes } from 'node:util';

import {
  captureReferencePlainData,
} from '../../../core/reference-data/plain-data-snapshot.mjs';

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const KEY_ID_PATTERN = /^ed25519-[a-f0-9]{32}$/u;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{15,127}$/u;
const PROFILE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{2,127}$/u;
const MIN_LIFETIME_MS = 1_000;
const MAX_LIFETIME_MS = 300_000;

const BOOTSTRAP_KEYS = Object.freeze([
  'verifyAuthorizationCandidate',
  'evidenceForRequest',
  'verificationBinding',
]);
const VERIFICATION_BINDING_KEYS = Object.freeze([
  'verification_profile',
  'verifier_version',
  'implementation_artifact_sha256',
  'effective_verification_policy_sha256',
]);
const REQUEST_SUMMARY_KEYS = Object.freeze([
  'request_id',
  'method_hash',
  'policy_hash',
  'action_commitment',
  'context_commitment',
  'issued_at',
  'expires_at',
]);
const EVIDENCE_KEYS = Object.freeze([
  'sourceEnvelope',
  'witnessAcknowledgement',
]);
const VERIFIED_SUCCESS_KEYS = Object.freeze([
  'ok',
  'source_key_id',
  'witness_key_id',
  'receipt_hash',
  'acknowledgement_hash',
  'current_time',
  'authorization_valid_until',
  'trust_revision',
  'trust_state_hash',
  'reference_only',
  'production_trust_proved',
]);
const VERIFIED_FAILURE_KEYS = Object.freeze(['ok', 'code', 'error']);

export class WalletGuardWitnessAuthorizationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WalletGuardWitnessAuthorizationError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new WalletGuardWitnessAuthorizationError(code, message);
}

function isOwnEnumerableDataDescriptor(descriptor) {
  return Boolean(descriptor)
    && Object.hasOwn(descriptor, 'value')
    && Object.hasOwn(descriptor, 'enumerable')
    && descriptor.enumerable === true
    && !Object.hasOwn(descriptor, 'get')
    && !Object.hasOwn(descriptor, 'set');
}

function captureExactEnvelope(value, expectedKeys, label, code) {
  if (!value
      || typeof value !== 'object'
      || utilTypes.isProxy(value)
      || Array.isArray(value)) {
    fail(code, `${label} must be a non-Proxy plain object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(code, `${label} must be a plain object`);
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    fail(code, `${label} cannot contain symbol keys`);
  }
  const actual = Object.getOwnPropertyNames(value).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length
      || actual.some((key, index) => key !== expected[index])) {
    fail(code, `${label} has missing, hidden or unknown fields`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const output = Object.create(null);
  for (const key of expectedKeys) {
    const descriptor = descriptors[key];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail(code, `${label}.${key} must be an enumerable data property`);
    }
    output[key] = descriptor.value;
  }
  return Object.freeze(output);
}

function captureBootstrap(value) {
  return captureExactEnvelope(
    value,
    BOOTSTRAP_KEYS,
    'Witness authorization bootstrap',
    'POMRX_WG_WITNESS_E_INVALID',
  );
}

function exactKeys(value, expectedKeys, label, code = 'POMRX_WG_WITNESS_E_INVALID') {
  const actual = Object.getOwnPropertyNames(value).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length
      || actual.some((key, index) => key !== expected[index])) {
    fail(code, `${label} has missing or unknown fields`);
  }
}

function assertPattern(value, pattern, field, code = 'POMRX_WG_WITNESS_E_INVALID') {
  if (typeof value !== 'string' || !pattern.test(value)) {
    fail(code, `${field} has an invalid format`);
  }
}

function canonicalUtcInstant(value, field, code = 'POMRX_WG_WITNESS_E_TIME_INVALID') {
  if (typeof value !== 'string' || !value.endsWith('Z')) {
    fail(code, `${field} must be a canonical UTC instant`);
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    fail(code, `${field} must be a canonical UTC instant`);
  }
  return parsed;
}

function normalizeVerificationBinding(value) {
  const captured = captureReferencePlainData(
    value,
    'Wallet Guard Witness verification binding',
  );
  exactKeys(captured, VERIFICATION_BINDING_KEYS, 'Wallet Guard Witness verification binding');
  assertPattern(captured.verification_profile, PROFILE_PATTERN, 'verification_profile');
  assertPattern(captured.verifier_version, PROFILE_PATTERN, 'verifier_version');
  assertPattern(
    captured.implementation_artifact_sha256,
    HASH_PATTERN,
    'implementation_artifact_sha256',
  );
  assertPattern(
    captured.effective_verification_policy_sha256,
    HASH_PATTERN,
    'effective_verification_policy_sha256',
  );
  return captured;
}

function normalizeRequestSummary(value) {
  const captured = captureReferencePlainData(
    value,
    'Wallet Guard Witness authorization request',
  );
  exactKeys(captured, REQUEST_SUMMARY_KEYS, 'Wallet Guard Witness authorization request');
  assertPattern(captured.request_id, ID_PATTERN, 'request_id');
  for (const field of [
    'method_hash',
    'policy_hash',
    'action_commitment',
    'context_commitment',
  ]) {
    assertPattern(captured[field], HASH_PATTERN, field);
  }
  const issuedAt = canonicalUtcInstant(captured.issued_at, 'issued_at');
  const expiresAt = canonicalUtcInstant(captured.expires_at, 'expires_at');
  const lifetimeMs = expiresAt.getTime() - issuedAt.getTime();
  if (lifetimeMs < MIN_LIFETIME_MS || lifetimeMs > MAX_LIFETIME_MS) {
    fail(
      'POMRX_WG_WITNESS_E_TIME_INVALID',
      'requested capability lifetime must be between 1 second and 5 minutes',
    );
  }
  return Object.freeze({ summary: captured, issuedAt, expiresAt });
}

function captureEvidence(value) {
  const envelope = captureExactEnvelope(
    value,
    EVIDENCE_KEYS,
    'Wallet Guard Witness evidence bundle',
    'POMRX_WG_WITNESS_E_EVIDENCE',
  );

  // Preserve the shared Core envelope/acknowledgement budgets exactly. The
  // fixed two-field Wallet Guard wrapper must not consume either child's depth
  // or node headroom before Core performs the same bounded capture again.
  return Object.freeze({
    sourceEnvelope: captureReferencePlainData(
      envelope.sourceEnvelope,
      'Wallet Guard source envelope',
    ),
    witnessAcknowledgement: captureReferencePlainData(
      envelope.witnessAcknowledgement,
      'Wallet Guard Witness acknowledgement',
    ),
  });
}

function captureVerificationResult(value) {
  const captured = captureReferencePlainData(
    value,
    'POM-RX Witness verification result',
  );
  if (captured.ok === false) {
    exactKeys(
      captured,
      VERIFIED_FAILURE_KEYS,
      'POM-RX Witness verification failure',
      'POMRX_WG_WITNESS_E_VERIFY',
    );
    fail(
      'POMRX_WG_WITNESS_E_VERIFY',
      typeof captured.code === 'string'
        ? `POM-RX Witness verification failed: ${captured.code}`
        : 'POM-RX Witness verification failed',
    );
  }
  if (captured.ok !== true) {
    fail('POMRX_WG_WITNESS_E_VERIFY', 'POM-RX Witness verification result has an invalid status');
  }
  exactKeys(
    captured,
    VERIFIED_SUCCESS_KEYS,
    'POM-RX Witness verification result',
    'POMRX_WG_WITNESS_E_VERIFY',
  );
  for (const field of ['source_key_id', 'witness_key_id']) {
    assertPattern(captured[field], KEY_ID_PATTERN, field, 'POMRX_WG_WITNESS_E_VERIFY');
  }
  if (captured.source_key_id === captured.witness_key_id) {
    fail('POMRX_WG_WITNESS_E_VERIFY', 'source and Witness identities must be distinct');
  }
  for (const field of ['receipt_hash', 'acknowledgement_hash', 'trust_state_hash']) {
    assertPattern(captured[field], HASH_PATTERN, field, 'POMRX_WG_WITNESS_E_VERIFY');
  }
  const currentTime = canonicalUtcInstant(
    captured.current_time,
    'current_time',
    'POMRX_WG_WITNESS_E_VERIFY',
  );
  const authorizationValidUntil = canonicalUtcInstant(
    captured.authorization_valid_until,
    'authorization_valid_until',
    'POMRX_WG_WITNESS_E_VERIFY',
  );
  if (!Number.isSafeInteger(captured.trust_revision) || captured.trust_revision < 0) {
    fail('POMRX_WG_WITNESS_E_VERIFY', 'trust_revision is invalid');
  }
  if (captured.reference_only !== true || captured.production_trust_proved !== false) {
    fail('POMRX_WG_WITNESS_E_VERIFY', 'POM-RX Witness verification result overclaims trust');
  }
  return Object.freeze({ result: captured, currentTime, authorizationValidUntil });
}

function assertReceiptBinding(receipt, summary, issuedAt) {
  if (!receipt || typeof receipt !== 'object') {
    fail('POMRX_WG_WITNESS_E_BINDING_MISMATCH', 'verified source receipt is unavailable');
  }
  if (receipt.phase !== 'preflight' || receipt.outcome !== 'allow') {
    fail('POMRX_WG_WITNESS_E_BINDING_MISMATCH', 'verified source receipt is not an allow preflight');
  }
  if (receipt.method_hash !== summary.method_hash
      || receipt.policy_hash !== summary.policy_hash
      || receipt.action_commitment !== summary.action_commitment) {
    fail(
      'POMRX_WG_WITNESS_E_BINDING_MISMATCH',
      'verified source receipt does not match the exact Wallet Guard request commitments',
    );
  }
  const occurredAt = canonicalUtcInstant(
    receipt.occurred_at,
    'preflight occurred_at',
    'POMRX_WG_WITNESS_E_BINDING_MISMATCH',
  );
  if (occurredAt.getTime() > issuedAt.getTime()) {
    fail(
      'POMRX_WG_WITNESS_E_BINDING_MISMATCH',
      'verified preflight cannot occur after capability issuance',
    );
  }
  assertPattern(receipt.run_id, ID_PATTERN, 'run_id', 'POMRX_WG_WITNESS_E_BINDING_MISMATCH');
  assertPattern(receipt.agent_ref, ID_PATTERN, 'agent_ref', 'POMRX_WG_WITNESS_E_BINDING_MISMATCH');
  assertPattern(receipt.subject_ref, ID_PATTERN, 'subject_ref', 'POMRX_WG_WITNESS_E_BINDING_MISMATCH');
}

function assertVerifiedEvidenceContinuity(evidence, verified) {
  const { sourceEnvelope, witnessAcknowledgement } = evidence;
  const result = verified.result;
  if (sourceEnvelope.receipt_hash !== result.receipt_hash
      || witnessAcknowledgement.receipt_hash !== result.receipt_hash
      || sourceEnvelope.receipt.source_key_id !== result.source_key_id
      || witnessAcknowledgement.source_key_id !== result.source_key_id
      || witnessAcknowledgement.witness_key_id !== result.witness_key_id) {
    fail(
      'POMRX_WG_WITNESS_E_BINDING_MISMATCH',
      'Core verification result does not match the captured signed evidence identities',
    );
  }
}

export function createWalletGuardWitnessAuthorizationSupplier(rawOptions) {
  const options = captureBootstrap(rawOptions);
  if (typeof options.verifyAuthorizationCandidate !== 'function'
      || typeof options.evidenceForRequest !== 'function') {
    fail(
      'POMRX_WG_WITNESS_E_INVALID',
      'verifyAuthorizationCandidate and evidenceForRequest must be functions',
    );
  }
  const verificationBinding = normalizeVerificationBinding(options.verificationBinding);

  return function referenceAuthorizationForRequest(rawSummary) {
    const normalized = normalizeRequestSummary(rawSummary);
    const rawEvidence = options.evidenceForRequest(normalized.summary);
    const evidence = captureEvidence(rawEvidence);

    const rawVerification = options.verifyAuthorizationCandidate(
      evidence.sourceEnvelope,
      evidence.witnessAcknowledgement,
    );
    const verified = captureVerificationResult(rawVerification);

    assertVerifiedEvidenceContinuity(evidence, verified);
    const receipt = evidence.sourceEnvelope.receipt;
    assertReceiptBinding(receipt, normalized.summary, normalized.issuedAt);
    if (verified.currentTime.getTime() < normalized.issuedAt.getTime()
        || verified.currentTime.getTime() >= normalized.expiresAt.getTime()) {
      fail(
        'POMRX_WG_WITNESS_E_TIME_INVALID',
        'Core Witness verification time must be inside the requested capability window',
      );
    }
    if (verified.authorizationValidUntil.getTime() < normalized.expiresAt.getTime()) {
      fail(
        'POMRX_WG_WITNESS_E_TIME_INVALID',
        'trust-bounded Witness authorization expires before the requested capability',
      );
    }

    return Object.freeze({
      run_id: receipt.run_id,
      agent_ref: receipt.agent_ref,
      subject_ref: receipt.subject_ref,
      preflight_receipt_hash: verified.result.receipt_hash,
      witness_ack_hash: verified.result.acknowledgement_hash,
      source_key_id: verified.result.source_key_id,
      witness_key_id: verified.result.witness_key_id,
      verification_profile: verificationBinding.verification_profile,
      verifier_version: verificationBinding.verifier_version,
      implementation_artifact_sha256: verificationBinding.implementation_artifact_sha256,
      effective_verification_policy_sha256:
        verificationBinding.effective_verification_policy_sha256,
      witness_valid_until: verified.result.authorization_valid_until,
    });
  };
}
