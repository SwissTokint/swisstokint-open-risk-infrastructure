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

// Exact authorization is part of the Gate's trust boundary. Capture every
// mutable same-realm intrinsic used to classify/snapshot caller-owned records,
// validate patterns and interpret time at module initialization. Poisoning
// before module initialization remains outside this reference-runtime guarantee.
const REFLECT_APPLY = Reflect.apply;
const ARRAY_IS_ARRAY = Array.isArray;
const OBJECT_CREATE = Object.create;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_OWN_PROPERTY_NAMES = Object.getOwnPropertyNames;
const OBJECT_GET_OWN_PROPERTY_SYMBOLS = Object.getOwnPropertySymbols;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_PROTOTYPE = Object.prototype;
const REGEXP_EXEC = RegExp.prototype.exec;
const STRING_ENDS_WITH = String.prototype.endsWith;
const NUMBER_IS_FINITE = Number.isFinite;
const DATE_CONSTRUCTOR = Date;
const DATE_GET_TIME = Date.prototype.getTime;
const DATE_TO_ISO_STRING = Date.prototype.toISOString;
const UTIL_TYPES_IS_PROXY = utilTypes.isProxy;

function freezeValue(value) {
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function objectCreate(prototype) {
  return REFLECT_APPLY(OBJECT_CREATE, Object, [prototype]);
}

function objectGetOwnPropertyDescriptors(value) {
  return REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
}

function objectGetOwnPropertyNames(value) {
  return REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_NAMES, Object, [value]);
}

function objectGetOwnPropertySymbols(value) {
  return REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_SYMBOLS, Object, [value]);
}

function objectGetPrototypeOf(value) {
  return REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]);
}

function objectHasOwn(value, key) {
  return REFLECT_APPLY(OBJECT_HAS_OWN, Object, [value, key]);
}

function arrayIsArray(value) {
  return REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value]);
}

function isProxy(value) {
  return REFLECT_APPLY(UTIL_TYPES_IS_PROXY, utilTypes, [value]);
}

function regexpTest(pattern, value) {
  return REFLECT_APPLY(REGEXP_EXEC, pattern, [value]) !== null;
}

function stringEndsWith(value, suffix) {
  return REFLECT_APPLY(STRING_ENDS_WITH, value, [suffix]);
}

function dateGetTime(value) {
  return REFLECT_APPLY(DATE_GET_TIME, value, []);
}

function dateToISOString(value) {
  return REFLECT_APPLY(DATE_TO_ISO_STRING, value, []);
}

const INPUT_KEYS = freezeValue([
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

const BINDING_KEYS = freezeValue([
  'schema_version',
  'capability_id',
  ...INPUT_KEYS,
]);

const HASH_FIELDS = freezeValue([
  'method_hash',
  'policy_hash',
  'action_commitment',
  'context_commitment',
  'preflight_receipt_hash',
  'witness_ack_hash',
  'implementation_artifact_sha256',
  'effective_verification_policy_sha256',
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

function isOwnEnumerableDataDescriptor(descriptor) {
  return Boolean(descriptor)
    && objectHasOwn(descriptor, 'value')
    && objectHasOwn(descriptor, 'enumerable')
    && descriptor.enumerable === true
    && !objectHasOwn(descriptor, 'get')
    && !objectHasOwn(descriptor, 'set');
}

function assertPlainObjectBoundary(value, label) {
  if (!value || typeof value !== 'object' || isProxy(value)) {
    fail('POMRX_GATE_E_BINDING_MISMATCH', `${label} must be a non-Proxy object`);
  }
  if (arrayIsArray(value)) {
    fail('POMRX_GATE_E_BINDING_MISMATCH', `${label} must be an object`);
  }
  const prototype = objectGetPrototypeOf(value);
  if (prototype !== OBJECT_PROTOTYPE && prototype !== null) {
    fail('POMRX_GATE_E_BINDING_MISMATCH', `${label} must be a plain object`);
  }
  if (objectGetOwnPropertySymbols(value).length !== 0) {
    fail('POMRX_GATE_E_BINDING_MISMATCH', `${label} cannot contain symbol keys`);
  }
}

function snapshotExactDataObject(value, expectedKeys, label) {
  assertPlainObjectBoundary(value, label);
  const actual = objectGetOwnPropertyNames(value);
  if (actual.length !== expectedKeys.length) {
    fail('POMRX_GATE_E_BINDING_MISMATCH', `${label} has missing or unknown fields`);
  }

  const descriptors = objectGetOwnPropertyDescriptors(value);
  const snapshot = objectCreate(null);
  for (let index = 0; index < expectedKeys.length; index += 1) {
    const key = expectedKeys[index];
    const descriptor = descriptors[key];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail('POMRX_GATE_E_BINDING_MISMATCH', `${label}.${key} must be an enumerable data property`);
    }
    snapshot[key] = descriptor.value;
  }
  return freezeValue(snapshot);
}

function snapshotPrepareOptions(value) {
  assertPlainObjectBoundary(value, 'Reference exact authorization options');
  const actual = objectGetOwnPropertyNames(value);
  if (actual.length > 2) {
    fail('POMRX_GATE_E_BINDING_MISMATCH', 'Reference exact authorization options have unknown fields');
  }

  const descriptors = objectGetOwnPropertyDescriptors(value);
  for (let index = 0; index < actual.length; index += 1) {
    const key = actual[index];
    if (key !== 'witnessValidUntil' && key !== 'capabilityId') {
      fail('POMRX_GATE_E_BINDING_MISMATCH', 'Reference exact authorization options have unknown fields');
    }
    if (!isOwnEnumerableDataDescriptor(descriptors[key])) {
      fail(
        'POMRX_GATE_E_BINDING_MISMATCH',
        `Reference exact authorization options.${key} must be an enumerable data property`,
      );
    }
  }

  const witnessDescriptor = objectHasOwn(descriptors, 'witnessValidUntil')
    ? descriptors.witnessValidUntil
    : undefined;
  const capabilityDescriptor = objectHasOwn(descriptors, 'capabilityId')
    ? descriptors.capabilityId
    : undefined;
  return freezeValue({
    witnessValidUntil: witnessDescriptor ? witnessDescriptor.value : undefined,
    capabilityId: capabilityDescriptor ? capabilityDescriptor.value : undefined,
  });
}

function assertStringPattern(value, pattern, field) {
  if (typeof value !== 'string' || !regexpTest(pattern, value)) {
    fail('POMRX_GATE_E_BINDING_MISMATCH', `${field} has an invalid format`);
  }
}

function canonicalUtcInstant(value, field) {
  if (typeof value !== 'string' || !stringEndsWith(value, 'Z')) {
    fail('POMRX_GATE_E_TIME_INVALID', `${field} must be a canonical UTC instant`);
  }
  const parsed = new DATE_CONSTRUCTOR(value);
  const parsedMs = dateGetTime(parsed);
  if (!REFLECT_APPLY(NUMBER_IS_FINITE, Number, [parsedMs]) || dateToISOString(parsed) !== value) {
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

  for (let index = 0; index < HASH_FIELDS.length; index += 1) {
    const field = HASH_FIELDS[index];
    assertStringPattern(binding[field], HASH_PATTERN, field);
  }

  const issuedAt = canonicalUtcInstant(binding.issued_at, 'issued_at');
  const expiresAt = canonicalUtcInstant(binding.expires_at, 'expires_at');
  const lifetimeMs = dateGetTime(expiresAt) - dateGetTime(issuedAt);
  if (lifetimeMs < MIN_LIFETIME_MS || lifetimeMs > MAX_LIFETIME_MS) {
    fail(
      'POMRX_GATE_E_TIME_INVALID',
      'Reference capability lifetime must be between 1 second and 5 minutes',
    );
  }

  return freezeValue({ issuedAt, expiresAt });
}

function snapshotAndValidateBinding(binding) {
  const snapshot = snapshotExactDataObject(binding, BINDING_KEYS, 'Exact authorization binding');
  const times = validateBindingSnapshot(snapshot);
  return freezeValue({ binding: snapshot, ...times });
}

function commitValidatedBinding(binding) {
  const canonicalBinding = canonicalizePayload(binding);
  const authorizationCommitment = sha256Hex(
    `${POM_RX_EXACT_AUTHORIZATION_COMMIT_DOMAIN}${canonicalBinding}`,
  );
  return freezeValue({ canonicalBinding, authorizationCommitment });
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

  const binding = freezeValue({
    schema_version: POM_RX_EXACT_AUTHORIZATION_SCHEMA_VERSION,
    capability_id: optionSnapshot.capabilityId,
    ...inputSnapshot,
  });

  const { expiresAt } = validateBindingSnapshot(binding);
  if (dateGetTime(expiresAt) > dateGetTime(witnessExpiry)) {
    fail(
      'POMRX_GATE_E_TIME_INVALID',
      'Reference capability expiry cannot exceed witness validity',
    );
  }

  const committed = commitValidatedBinding(binding);
  const evidence = freezeValue({
    binding,
    authorization_commitment: committed.authorizationCommitment,
    reference_only: true,
    authorization_eligible: false,
    authorization_proved: false,
  });

  return freezeValue({ binding, evidence });
}
