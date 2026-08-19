import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { TextDecoder } from 'node:util';

import { PomRxV01StrictError, throwPomRxV01Strict } from './pom-rx-v01-diagnostics.mjs';

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const MAX_POLICY_BYTES = 64 * 1024;
const MAX_ARTIFACT_MANIFEST_BYTES = 1024 * 1024;
const capabilityStates = new WeakMap();
const bindingStates = new WeakMap();

function assertExactKeys(value, expected, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throwPomRxV01Strict(code, `${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throwPomRxV01Strict(code, `${label} has missing or unknown fields`, { actual, expected: wanted });
  }
}

function assertString(value, code, label, { hash = false } = {}) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 256
    || /[\u0000-\u001f\u007f]/u.test(value)
    || (hash && !HASH_PATTERN.test(value))) {
    throwPomRxV01Strict(code, `${label} is invalid`);
  }
  if (!hash && /[*?]|(?:^|\s)[<>=~^]|\.\./u.test(value)) {
    throwPomRxV01Strict(code, `${label} cannot contain a wildcard or range`);
  }
}

function decodeUtf8(bytes, code, label) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throwPomRxV01Strict(code, `${label} is not valid UTF-8`);
  }
}

function scanObjectKeys(text, code, label) {
  let index = 0;
  const whitespace = () => {
    while (index < text.length && /[\u0009\u000a\u000d\u0020]/u.test(text[index])) index += 1;
  };
  const parseString = () => {
    const start = index;
    index += 1;
    while (index < text.length) {
      if (text[index] === '"') {
        index += 1;
        try {
          return JSON.parse(text.slice(start, index));
        } catch {
          throwPomRxV01Strict(code, `${label} contains an invalid JSON string`);
        }
      }
      if (text[index] === '\\') index += 1;
      index += 1;
    }
    throwPomRxV01Strict(code, `${label} contains an unterminated JSON string`);
  };
  const parseValue = () => {
    whitespace();
    if (text[index] === '{') return parseObject();
    if (text[index] === '[') return parseArray();
    if (text[index] === '"') return parseString();
    const start = index;
    while (index < text.length && !/[\s,\]}]/u.test(text[index])) index += 1;
    if (start === index) throwPomRxV01Strict(code, `${label} contains an invalid JSON value`);
    return undefined;
  };
  const parseArray = () => {
    index += 1;
    whitespace();
    if (text[index] === ']') { index += 1; return; }
    while (index < text.length) {
      parseValue();
      whitespace();
      if (text[index] === ']') { index += 1; return; }
      if (text[index] !== ',') throwPomRxV01Strict(code, `${label} contains an invalid JSON array`);
      index += 1;
    }
    throwPomRxV01Strict(code, `${label} contains an unterminated JSON array`);
  };
  const parseObject = () => {
    index += 1;
    const seen = new Set();
    whitespace();
    if (text[index] === '}') { index += 1; return; }
    while (index < text.length) {
      whitespace();
      if (text[index] !== '"') throwPomRxV01Strict(code, `${label} contains an invalid JSON object key`);
      const key = parseString();
      if (seen.has(key)) throwPomRxV01Strict(code, `${label} contains a duplicate JSON key`);
      seen.add(key);
      whitespace();
      if (text[index] !== ':') throwPomRxV01Strict(code, `${label} contains an invalid JSON object`);
      index += 1;
      parseValue();
      whitespace();
      if (text[index] === '}') { index += 1; return; }
      if (text[index] !== ',') throwPomRxV01Strict(code, `${label} contains an invalid JSON object`);
      index += 1;
    }
    throwPomRxV01Strict(code, `${label} contains an unterminated JSON object`);
  };
  whitespace();
  parseValue();
  whitespace();
  if (index !== text.length) throwPomRxV01Strict(code, `${label} contains trailing JSON data`);
}

export function sha256PomRxV01Bytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function parsePomRxV01ExactJson(bytes, label, {
  errorCode = 'POMRX_V01_E_POLICY_INVALID',
  maxBytes = MAX_POLICY_BYTES,
} = {}) {
  const byteLength = ArrayBuffer.isView(bytes) ? bytes.byteLength : bytes?.byteLength;
  if (!Number.isSafeInteger(byteLength) || byteLength < 1 || byteLength > maxBytes) {
    throwPomRxV01Strict(errorCode, `${label} byte length is invalid`);
  }
  const snapshot = Buffer.from(bytes);
  if (snapshot.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) {
    throwPomRxV01Strict(errorCode, `${label} contains a BOM`);
  }
  const text = decodeUtf8(snapshot, errorCode, label);
  scanObjectKeys(text, errorCode, label);
  try {
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof PomRxV01StrictError) throw error;
    throwPomRxV01Strict(errorCode, `${label} is not valid JSON`);
  }
}

function validateRuntimeConstraints(runtime, code = 'POMRX_V01_E_POLICY_INVALID') {
  assertExactKeys(runtime, ['node_version', 'icu_version', 'unicode_version', 'locale', 'platform', 'arch'], code, 'runtime_constraints');
  const copy = {};
  for (const key of ['node_version', 'icu_version', 'unicode_version', 'locale', 'platform', 'arch']) {
    assertString(runtime[key], code, `runtime_constraints.${key}`);
    copy[key] = runtime[key];
  }
  return Object.freeze(copy);
}

function validateTuple(tuple, { runtimeRequired = false } = {}) {
  const keys = ['receipt_schema_version', 'verifier_profile', 'verifier_version', 'implementation_artifact_sha256'];
  if (runtimeRequired) keys.push('runtime_constraints');
  assertExactKeys(tuple, keys, 'POMRX_V01_E_POLICY_INVALID', 'verifier tuple');
  for (const key of keys.filter((key) => key !== 'runtime_constraints')) {
    assertString(tuple[key], 'POMRX_V01_E_POLICY_INVALID', `verifier tuple ${key}`, {
      hash: key === 'implementation_artifact_sha256',
    });
  }
  const copy = {
    receipt_schema_version: tuple.receipt_schema_version,
    verifier_profile: tuple.verifier_profile,
    verifier_version: tuple.verifier_version,
    implementation_artifact_sha256: tuple.implementation_artifact_sha256,
  };
  if (runtimeRequired) copy.runtime_constraints = validateRuntimeConstraints(tuple.runtime_constraints);
  return Object.freeze(copy);
}

function tupleIdentity(tuple) {
  return JSON.stringify([
    tuple.receipt_schema_version,
    tuple.verifier_profile,
    tuple.verifier_version,
    tuple.implementation_artifact_sha256,
  ]);
}

function parseCanonicalInstant(value, code) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) {
    throwPomRxV01Strict(code, 'Trusted evaluation instant is unavailable or malformed');
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    throwPomRxV01Strict(code, 'Trusted evaluation instant is unavailable or malformed');
  }
  return parsed.getTime();
}

function validatePolicy(policy, policySha256) {
  assertExactKeys(
    policy,
    ['policy_schema_version', 'policy_id', 'policy_version', 'accepted_verifiers', 'withdrawn_verifiers'],
    'POMRX_V01_E_POLICY_INVALID',
    'policy',
  );
  if (policy.policy_schema_version !== 'pom-rx-local-verification-policy/1') {
    throwPomRxV01Strict('POMRX_V01_E_POLICY_INVALID', 'Unsupported policy schema version');
  }
  assertString(policy.policy_id, 'POMRX_V01_E_POLICY_INVALID', 'policy_id');
  assertString(policy.policy_version, 'POMRX_V01_E_POLICY_INVALID', 'policy_version');
  if (!Array.isArray(policy.accepted_verifiers) || !Array.isArray(policy.withdrawn_verifiers)) {
    throwPomRxV01Strict('POMRX_V01_E_POLICY_INVALID', 'Policy verifier sets must be arrays');
  }
  const accepted = policy.accepted_verifiers.map((entry) => validateTuple(entry, { runtimeRequired: true }));
  const acceptedIds = accepted.map(tupleIdentity);
  if (new Set(acceptedIds).size !== acceptedIds.length) {
    throwPomRxV01Strict('POMRX_V01_E_POLICY_INVALID', 'Policy contains duplicate accepted verifier tuples');
  }

  const withdrawn = policy.withdrawn_verifiers.map((entry) => {
    assertExactKeys(entry, [
      'receipt_schema_version', 'verifier_profile', 'verifier_version', 'implementation_artifact_sha256',
      'effective_at', 'status', 'replacement', 'reason_code',
    ], 'POMRX_V01_E_POLICY_INVALID', 'withdrawal');
    const tuple = validateTuple({
      receipt_schema_version: entry.receipt_schema_version,
      verifier_profile: entry.verifier_profile,
      verifier_version: entry.verifier_version,
      implementation_artifact_sha256: entry.implementation_artifact_sha256,
    });
    const effectiveAtMs = parseCanonicalInstant(entry.effective_at, 'POMRX_V01_E_POLICY_INVALID');
    if (!['replacement', 'terminal'].includes(entry.status)) {
      throwPomRxV01Strict('POMRX_V01_E_POLICY_INVALID', 'Withdrawal status is invalid');
    }
    if ((entry.status === 'replacement') !== (entry.replacement !== null)) {
      throwPomRxV01Strict('POMRX_V01_E_POLICY_INVALID', 'Withdrawal replacement shape is invalid');
    }
    const replacement = entry.replacement === null ? null : validateTuple(entry.replacement);
    assertString(entry.reason_code, 'POMRX_V01_E_POLICY_INVALID', 'withdrawal reason_code');
    return Object.freeze({ ...tuple, effective_at: entry.effective_at, effectiveAtMs, status: entry.status, replacement, reason_code: entry.reason_code });
  });
  const withdrawalIds = withdrawn.map(tupleIdentity);
  if (new Set(withdrawalIds).size !== withdrawalIds.length) {
    throwPomRxV01Strict('POMRX_V01_E_POLICY_INVALID', 'Policy contains duplicate withdrawals');
  }
  return Object.freeze({
    policy_schema_version: policy.policy_schema_version,
    policy_id: policy.policy_id,
    policy_version: policy.policy_version,
    policy_sha256: policySha256,
    accepted_verifiers: Object.freeze(accepted),
    withdrawn_verifiers: Object.freeze(withdrawn),
  });
}

function readPinnedJson(filePath, expectedSha256, label, maxBytes) {
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath) || !HASH_PATTERN.test(expectedSha256)) {
    throwPomRxV01Strict('POMRX_V01_E_POLICY_INVALID', `${label} host pin is invalid`);
  }
  let bytes;
  try {
    bytes = readFileSync(filePath);
  } catch {
    throwPomRxV01Strict('POMRX_V01_E_POLICY_INVALID', `${label} cannot be read`);
  }
  const observedSha256 = sha256PomRxV01Bytes(bytes);
  if (observedSha256 !== expectedSha256) {
    throwPomRxV01Strict('POMRX_V01_E_POLICY_INVALID', `${label} digest differs from its host pin`);
  }
  return { bytes, observedSha256, parsed: parsePomRxV01ExactJson(bytes, label, { maxBytes }) };
}

export function withFreshPomRxPolicyCapability(trustedBootstrapConfig, callback) {
  assertExactKeys(trustedBootstrapConfig, [
    'policyPath',
    'expectedPolicySha256',
    'trustedEvaluationInstant',
    'artifactManifestPath',
    'expectedArtifactManifestSha256',
  ], 'POMRX_V01_E_POLICY_INVALID', 'trusted bootstrap config');
  if (typeof callback !== 'function') throwPomRxV01Strict('POMRX_V01_E_POLICY_INVALID', 'Capability callback is required');
  const current = readPinnedJson(
    trustedBootstrapConfig.policyPath,
    trustedBootstrapConfig.expectedPolicySha256,
    'local verification policy',
    MAX_POLICY_BYTES,
  );
  const validatedPolicy = validatePolicy(current.parsed, current.observedSha256);
  const evaluationTimeMs = parseCanonicalInstant(
    trustedBootstrapConfig.trustedEvaluationInstant,
    'POMRX_V01_E_POLICY_TIME_UNAVAILABLE',
  );
  if (typeof trustedBootstrapConfig.artifactManifestPath !== 'string'
    || !path.isAbsolute(trustedBootstrapConfig.artifactManifestPath)
    || !HASH_PATTERN.test(trustedBootstrapConfig.expectedArtifactManifestSha256)) {
    throwPomRxV01Strict('POMRX_V01_E_POLICY_INVALID', 'Artifact manifest host pin is invalid');
  }
  const capability = Object.freeze(Object.create(null));
  const state = {
    active: true,
    used: false,
    evaluationTimeMs,
    trustedEvaluationInstant: trustedBootstrapConfig.trustedEvaluationInstant,
    policy: validatedPolicy,
    artifactManifestPath: trustedBootstrapConfig.artifactManifestPath,
    expectedArtifactManifestSha256: trustedBootstrapConfig.expectedArtifactManifestSha256,
  };
  capabilityStates.set(capability, state);
  try {
    const result = callback(capability);
    if (result && typeof result.then === 'function') {
      throwPomRxV01Strict('POMRX_V01_E_POLICY_CAPABILITY_STALE', 'Policy capability callback must be synchronous');
    }
    return result;
  } finally {
    state.active = false;
  }
}

export function bindFreshPomRxPolicyCapability(capability, selectedVerifierTuple, measuredRuntime) {
  const state = capabilityStates.get(capability);
  if (!state) throwPomRxV01Strict('POMRX_V01_E_POLICY_CAPABILITY_REQUIRED', 'A branded policy capability is required');
  if (!state.active || state.used) {
    throwPomRxV01Strict('POMRX_V01_E_POLICY_CAPABILITY_STALE', 'Policy capability is stale, reused or invalidated');
  }
  state.used = true;
  const tuple = validateTuple(selectedVerifierTuple);
  const runtime = validateRuntimeConstraints(measuredRuntime, 'POMRX_V01_E_RUNTIME_ENVIRONMENT_UNSUPPORTED');
  const identity = tupleIdentity(tuple);
  const activeWithdrawal = state.policy.withdrawn_verifiers.find((entry) => (
    tupleIdentity(entry) === identity && entry.effectiveAtMs <= state.evaluationTimeMs
  ));
  if (activeWithdrawal) {
    throwPomRxV01Strict('POMRX_V01_E_VERIFIER_WITHDRAWN', 'Selected verifier tuple is withdrawn');
  }
  const accepted = state.policy.accepted_verifiers.find((entry) => tupleIdentity(entry) === identity);
  if (!accepted) throwPomRxV01Strict('POMRX_V01_E_VERIFIER_NOT_ALLOWED', 'Selected verifier tuple is not allowlisted');
  if (JSON.stringify(accepted.runtime_constraints) !== JSON.stringify(runtime)) {
    throwPomRxV01Strict('POMRX_V01_E_RUNTIME_ENVIRONMENT_UNSUPPORTED', 'Runtime constraints do not match policy');
  }
  const binding = Object.freeze(Object.create(null));
  bindingStates.set(binding, {
    capabilityState: state,
    used: false,
    value: Object.freeze({
    effective_policy_id: state.policy.policy_id,
    effective_policy_version: state.policy.policy_version,
    effective_policy_sha256: state.policy.policy_sha256,
    trusted_evaluation_instant: state.trustedEvaluationInstant,
    artifact_manifest_path: state.artifactManifestPath,
    expected_artifact_manifest_sha256: state.expectedArtifactManifestSha256,
    selected_verifier: accepted,
    execution_environment: runtime,
    }),
  });
  return binding;
}

export function consumeFreshPomRxPolicyBinding(binding) {
  const bindingState = bindingStates.get(binding);
  if (!bindingState) {
    throwPomRxV01Strict('POMRX_V01_E_POLICY_CAPABILITY_REQUIRED', 'A branded policy binding is required');
  }
  if (!bindingState.capabilityState.active || bindingState.used) {
    throwPomRxV01Strict('POMRX_V01_E_POLICY_CAPABILITY_STALE', 'Policy binding is stale, reused or invalidated');
  }
  bindingState.used = true;
  return bindingState.value;
}

export const POM_RX_V01_POLICY_LIMITS = Object.freeze({
  max_policy_bytes: MAX_POLICY_BYTES,
  max_artifact_manifest_bytes: MAX_ARTIFACT_MANIFEST_BYTES,
});
