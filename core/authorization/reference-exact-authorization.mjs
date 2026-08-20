import { types as utilTypes } from 'node:util';

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

const PREPARE_OPTION_KEYS = Object.freeze([
  'witnessValidUntil',
  'capabilityId',
]);

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

function assertPlainObjectBoundary(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('POMRX_GATE_E_BINDING_MISMATCH', `${label} must be an object`);
  }
  if (utilTypes.isProxy(value)) {
    fail('POMRX_GATE_E_BINDING_MISMATCH', `${label} cannot be a Proxy`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail('POMRX_GATE_E_BINDING_MISMATCH', `${label} must be a plain object`);
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    fail('POMRX_GATE_E_BINDING_MISMATCH', `${label} cannot contain symbol keys`);
  }
}

function snapshotExactDataObject(value, expectedKeys, label) {
  assertPlainObjectBoundary(value, label);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Object.keys(descriptors).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail('POMRX_GATE_E_BINDING_MISMATCH', `${label} has missing or unknown fields`);
  }

  const snapshot = Object.create(null);
  for (const key of expectedKeys) {
    const descriptor = descriptors[key];
    if (!descriptor
        || typeof descriptor.get === 'function'
        || typeof descriptor.set === 'function'
        || descriptor.enumerable !== true) {
      fail('POMRX_GATE_E_BINDING_MISMATCH', `${label}.${key} must be an enumerable data property`);
    }
    snapshot[key] = descriptor.value;
  }
  return Object.freeze(snapshot);
}

function snapshotPrepareOptions(value) {
  assertPlainObjectBoundary(value, 'Reference exact authorization options');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Object.keys(descriptors);
  for (const key of actual) {
    if (!PREPARE_OPTION_KEYS.includes(key)) {
      fail('POMRX_GATE_E_BINDING_MISMATCH', 'Reference exact authorization options have unknown fields');
    }
    const descriptor = descriptors[key];
    if (!descriptor
        || typeof descriptor.get === 'function'
        || typeof descriptor.set === 'function'
        || descriptor.enumerable !== true) {
      fail(
        'POMRX_GATE_E_BINDING_MISMATCH',
        `Reference exact authorization options.${key} must be an enumerable data property`,
      );
    }
  }

  return Object.freeze({
    witnessValidUntil: descriptors.witnessValidUntil?.value,
    capabilityId: descriptors.capabilityId?.value,
  });
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

function validateBindingSnapshot(binding) {
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

function snapshotAndValidateBinding(binding) {
  const snapshot = snapshotExactDataObject(binding, BINDING_KEYS, 'Exact authorization binding');
  const times = validateBindingSnapshot(snapshot);
  return Object.freeze({ binding: snapshot, ...times });
}

function commitValidatedBinding(binding) {
  const canonicalBinding = canonicalizePayload(binding);
  const authorizationCommitment = sha256Hex(
    `${POM_RX_EXACT_AUTHORIZATION_COMMIT_DOMAIN}${canonicalBinding}`,
  );
  return Object.freeze({ canonicalBinding, authorizationCommitment });
}

export function commitExactAuthorizationBinding(binding) {
  const { binding: snapshot } = snapshotAndValidateBinding(binding);
  return commitValidatedBinding(snapshot);
}

export function prepareReferenceExactAuthorizationRecord(bindingInput, options = {}) {
  const inputSnapshot = snapshotExactDataObject(
    bindingInput,
    INPUT_KEYS,
    'Reference exact authorization input',
  );
  const optionSnapshot = snapshotPrepareOptions(options);
  assertStringPattern(optionSnapshot.capabilityId, CAPABILITY_ID_PATTERN, 'capability_id');
  const witnessExpiry = canonicalUtcInstant(
    optionSnapshot.witnessValidUntil,
    'witness_valid_until',
  );

  const binding = Object.freeze({
    schema_version: POM_RX_EXACT_AUTHORIZATION_SCHEMA_VERSION,
    capability_id: optionSnapshot.capabilityId,
    ...inputSnapshot,
  });

  const { expiresAt } = validateBindingSnapshot(binding);
  if (expiresAt.getTime() > witnessExpiry.getTime()) {
    fail(
      'POMRX_GATE_E_TIME_INVALID',
      'Reference capability expiry cannot exceed witness validity',
    );
  }

  const committed = commitValidatedBinding(binding);
  const evidence = Object.freeze({
    binding,
    authorization_commitment: committed.authorizationCommitment,
    reference_only: true,
    authorization_eligible: false,
    authorization_proved: false,
  });

  return Object.freeze({ binding, evidence });
}
