import crypto from 'node:crypto';

import {
  canonicalizePayload,
  sha256Hex,
} from '../../sdk/typescript/swisstokint-proof.mjs';

export const POM_RX_EXACT_AUTHORIZATION_SCHEMA_VERSION = 'pom-rx-exact-authorization/0.1';
export const POM_RX_EXACT_AUTHORIZATION_COMMIT_DOMAIN = 'swisstokint:pom-rx-exact-authorization:v1:';

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const CAPABILITY_ID_PATTERN = /^cap-[a-f0-9]{32}$/u;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{15,127}$/u;
const PROFILE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{2,127}$/u;
const KEY_ID_PATTERN = /^ed25519-[a-f0-9]{32}$/u;
const MAX_LIFETIME_MS = 300_000;
const MIN_LIFETIME_MS = 1_000;

const INPUT_KEYS = Object.freeze([
  'binding_profile',
  'run_id',
  'agent_ref',
  'subject_ref',
  'method_hash',
  'policy_hash',
  'action_commitment',
  'context_commitment',
  'preflight_receipt_hash',
  'witness_ack_hash',
  'source_key_id',
  'witness_key_id',
  'verification_profile',
  'verifier_version',
  'implementation_artifact_sha256',
  'effective_verification_policy_sha256',
  'issued_at',
  'expires_at',
]);

const BINDING_KEYS = Object.freeze([
  'schema_version',
  'capability_id',
  ...INPUT_KEYS,
]);

const capabilityState = new WeakMap();

export class PomRxReferenceCapabilityError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PomRxReferenceCapabilityError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new PomRxReferenceCapabilityError(code, message);
}

function assertExactKeys(value, expectedKeys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('POMRX_GATE_E_BINDING_MISMATCH', `${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail('POMRX_GATE_E_BINDING_MISMATCH', `${label} has missing or unknown fields`);
  }
}

function assertStringPattern(value, pattern, field) {
  if (typeof value !== 'string' || !pattern.test(value)) {
    fail('POMRX_GATE_E_BINDING_MISMATCH', `${field} has an invalid format`);
  }
}

function canonicalUtcInstant(value, field) {
  if (typeof value !== 'string' || !value.endsWith('Z')) {
    fail('POMRX_GATE_E_TIME_INVALID', `${field} must be a canonical UTC instant`);
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    fail('POMRX_GATE_E_TIME_INVALID', `${field} must be a canonical UTC instant`);
  }
  return parsed;
}

function validateBindingRecord(binding) {
  assertExactKeys(binding, BINDING_KEYS, 'Exact authorization binding');
  if (binding.schema_version !== POM_RX_EXACT_AUTHORIZATION_SCHEMA_VERSION) {
    fail('POMRX_GATE_E_BINDING_MISMATCH', 'Unsupported exact authorization schema version');
  }

  assertStringPattern(binding.capability_id, CAPABILITY_ID_PATTERN, 'capability_id');
  assertStringPattern(binding.binding_profile, PROFILE_PATTERN, 'binding_profile');
  assertStringPattern(binding.run_id, ID_PATTERN, 'run_id');
  assertStringPattern(binding.agent_ref, ID_PATTERN, 'agent_ref');
  assertStringPattern(binding.subject_ref, ID_PATTERN, 'subject_ref');
  assertStringPattern(binding.verification_profile, PROFILE_PATTERN, 'verification_profile');
  assertStringPattern(binding.verifier_version, PROFILE_PATTERN, 'verifier_version');
  assertStringPattern(binding.source_key_id, KEY_ID_PATTERN, 'source_key_id');
  assertStringPattern(binding.witness_key_id, KEY_ID_PATTERN, 'witness_key_id');

  if (binding.source_key_id === binding.witness_key_id) {
    fail('POMRX_GATE_E_BINDING_MISMATCH', 'Source and witness identities must be distinct');
  }

  for (const field of [
    'method_hash',
    'policy_hash',
    'action_commitment',
    'context_commitment',
    'preflight_receipt_hash',
    'witness_ack_hash',
    'implementation_artifact_sha256',
    'effective_verification_policy_sha256',
  ]) {
    assertStringPattern(binding[field], HASH_PATTERN, field);
  }

  const issuedAt = canonicalUtcInstant(binding.issued_at, 'issued_at');
  const expiresAt = canonicalUtcInstant(binding.expires_at, 'expires_at');
  const lifetimeMs = expiresAt.getTime() - issuedAt.getTime();
  if (lifetimeMs < MIN_LIFETIME_MS || lifetimeMs > MAX_LIFETIME_MS) {
    fail(
      'POMRX_GATE_E_TIME_INVALID',
      'Reference capability lifetime must be between 1 second and 5 minutes',
    );
  }

  return Object.freeze({ issuedAt, expiresAt });
}

export function commitExactAuthorizationBinding(binding) {
  validateBindingRecord(binding);
  const canonicalBinding = canonicalizePayload(binding);
  const authorizationCommitment = sha256Hex(
    `${POM_RX_EXACT_AUTHORIZATION_COMMIT_DOMAIN}${canonicalBinding}`,
  );
  return Object.freeze({ canonicalBinding, authorizationCommitment });
}

export function issueReferenceExactAuthorization(bindingInput, { witnessValidUntil } = {}) {
  assertExactKeys(bindingInput, INPUT_KEYS, 'Reference exact authorization input');
  const witnessExpiry = canonicalUtcInstant(witnessValidUntil, 'witness_valid_until');

  const binding = Object.freeze({
    schema_version: POM_RX_EXACT_AUTHORIZATION_SCHEMA_VERSION,
    capability_id: `cap-${crypto.randomBytes(16).toString('hex')}`,
    ...bindingInput,
  });

  const { expiresAt } = validateBindingRecord(binding);
  if (expiresAt.getTime() > witnessExpiry.getTime()) {
    fail(
      'POMRX_GATE_E_TIME_INVALID',
      'Reference capability expiry cannot exceed witness validity',
    );
  }

  const committed = commitExactAuthorizationBinding(binding);
  const capability = Object.freeze(Object.create(null));
  const evidence = Object.freeze({
    binding,
    authorization_commitment: committed.authorizationCommitment,
    reference_only: true,
    authorization_eligible: false,
    authorization_proved: false,
  });

  capabilityState.set(capability, {
    state: 'AVAILABLE',
    binding,
    authorizationCommitment: committed.authorizationCommitment,
  });

  return Object.freeze({ capability, evidence });
}

export function reserveReferenceCapabilityForGate(capability) {
  const record = capabilityState.get(capability);
  if (!record) {
    fail('POMRX_GATE_E_CAPABILITY_REQUIRED', 'A branded reference capability is required');
  }
  if (record.state !== 'AVAILABLE') {
    fail('POMRX_GATE_E_CAPABILITY_STALE', 'Reference capability is no longer available');
  }
  record.state = 'VALIDATING';
  return record.binding;
}

export function rejectReferenceCapabilityForGate(capability) {
  const record = capabilityState.get(capability);
  if (!record || record.state !== 'VALIDATING') {
    fail('POMRX_GATE_E_CAPABILITY_STALE', 'Reference capability cannot be rejected from its current state');
  }
  record.state = 'REJECTED';
}

export function beginReferenceCapabilityConsumptionForGate(capability) {
  const record = capabilityState.get(capability);
  if (!record || record.state !== 'VALIDATING') {
    fail('POMRX_GATE_E_CAPABILITY_STALE', 'Reference capability cannot begin consumption');
  }
  record.state = 'CONSUMING';
}

export function completeReferenceCapabilityConsumptionForGate(capability, success) {
  const record = capabilityState.get(capability);
  if (!record || record.state !== 'CONSUMING') {
    fail('POMRX_GATE_E_CAPABILITY_STALE', 'Reference capability is not consuming');
  }
  record.state = success ? 'CONSUMED_SUCCESS' : 'CONSUMED_ERROR';
}

export function inspectReferenceCapabilityState(capability) {
  return capabilityState.get(capability)?.state ?? null;
}
