import {
  PROFILE_LIMITATIONS,
  orderPomRxV01Diagnostics,
  throwPomRxV01Strict,
} from './pom-rx-v01-diagnostics.mjs';

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const STRICT_PROFILE = 'pom-rx-v0.1/strict-errata-1';
const STRUCTURAL_ERROR_CODES = new Set([
  'POMRX_V01_E_RECEIPT_HASH_LINK_INVALID',
  'POMRX_V01_E_CHAIN_PHASE_INVALID',
  'POMRX_V01_E_CHAIN_TIMESTAMP_INVALID',
  'POMRX_V01_E_CHAIN_SHARED_FIELD_CHANGED',
  'POMRX_V01_E_PARTIAL_CHAIN_FORBIDDEN',
  'POMRX_V01_E_ACTION_CONTINUITY',
  'POMRX_V01_E_INPUT_CONTINUITY',
  'POMRX_V01_E_EXECUTION_ASSERTION_CONFLICT',
  'POMRX_V01_E_RECONCILIATION_ASSERTION_CONFLICT',
  'POMRX_V01_E_DUPLICATE_RECEIPT_ID',
]);
const TOP_LEVEL_KEYS = [
  'verdict_schema_version',
  'receipt_schema_version',
  'receipt_hashes',
  'verifier_profile',
  'verifier_version',
  'implementation_artifact_sha256',
  'expected_implementation_artifact_sha256',
  'observed_implementation_artifact_sha256',
  'execution_environment',
  'effective_policy_id',
  'effective_policy_version',
  'effective_policy_sha256',
  'qualification',
  'assurance',
  'authorization_eligible',
  'authorization_proved',
  'structural_status',
  'structural_prerequisite_satisfied',
  'diagnostics',
  'warnings',
  'limitations',
];

function fail(message, details = {}) {
  throwPomRxV01Strict('POMRX_V01_E_INTERNAL_VERIFIER_ERROR', message, details);
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  if (JSON.stringify(Object.keys(value)) !== JSON.stringify(expected)) fail(`${label} key set or order is invalid`);
}

function nullableString(value, label) {
  if (value !== null && (typeof value !== 'string' || value.length === 0)) fail(`${label} must be null or non-empty string`);
}

function nullableHash(value, label) {
  if (value !== null && !HASH_PATTERN.test(value)) fail(`${label} must be null or lowercase SHA-256`);
}

function validateEnvironment(environment) {
  if (environment === null) return null;
  exactKeys(environment, ['node_version', 'icu_version', 'unicode_version', 'locale', 'platform', 'arch'], 'execution_environment');
  for (const key of Object.keys(environment)) {
    if (typeof environment[key] !== 'string' || environment[key].length === 0) fail(`execution_environment.${key} is invalid`);
  }
  return Object.freeze({ ...environment });
}

function qualificationFor(status) {
  if (status === 'conformant') return 'STRICT_STRUCTURAL_CONFORMANCE_OBSERVED';
  if (status === 'nonconformant') return 'STRICT_STRUCTURAL_NONCONFORMANCE_OBSERVED';
  if (status === 'indeterminate') return 'STRICT_VERIFICATION_INDETERMINATE';
  fail('structural_status is invalid');
}

function validateTruthTable(status, diagnostics) {
  const errors = diagnostics.filter(({ severity }) => severity === 'error');
  const requiredStatus = errors.length === 0
    ? 'conformant'
    : errors.some(({ diagnostic_code: code }) => !STRUCTURAL_ERROR_CODES.has(code))
      ? 'indeterminate'
      : 'nonconformant';
  if (status !== requiredStatus) {
    fail('Strict verdict truth table is invalid', { status, requiredStatus, errorCount: errors.length });
  }
}

function validateBindingNullability(verdict) {
  if (verdict.verifier_profile !== null && verdict.verifier_profile !== STRICT_PROFILE) {
    fail('verifier_profile is unsupported');
  }
  const policyFields = [
    verdict.effective_policy_id,
    verdict.effective_policy_version,
    verdict.effective_policy_sha256,
  ];
  const policyBound = policyFields.every((value) => value !== null);
  if (!policyBound && policyFields.some((value) => value !== null)) fail('Policy identity fields must populate together');
  if (verdict.expected_implementation_artifact_sha256 !== null && !policyBound) fail('Expected artifact identity requires policy binding');
  if (verdict.observed_implementation_artifact_sha256 !== null
    && (verdict.expected_implementation_artifact_sha256 === null || verdict.execution_environment === null)) {
    fail('Observed artifact identity requires expected identity and measured environment');
  }
  if (verdict.implementation_artifact_sha256 !== null) {
    if (verdict.expected_implementation_artifact_sha256 !== verdict.implementation_artifact_sha256
      || verdict.observed_implementation_artifact_sha256 !== verdict.implementation_artifact_sha256
      || verdict.verifier_version === null) {
      fail('Bound artifact identity requires equal expected and observed digests plus verifier version');
    }
  } else if (verdict.verifier_version !== null) {
    fail('verifier_version requires a bound artifact identity');
  }
  if (verdict.verifier_profile !== null
    && (!policyBound || verdict.implementation_artifact_sha256 === null)) {
    fail('verifier_profile requires policy and artifact binding');
  }
  if (verdict.receipt_schema_version !== null) {
    if (verdict.receipt_schema_version !== 'pom-rx/0.1'
      || verdict.verifier_profile !== STRICT_PROFILE
      || verdict.receipt_hashes.length === 0) {
      fail('Receipt identity requires the selected strict profile and complete receipt hashes');
    }
  } else if (verdict.receipt_hashes.length !== 0) {
    fail('receipt_hashes must be empty until receipt schema binding completes');
  }
  if (verdict.structural_status !== 'indeterminate' && verdict.receipt_schema_version === null) {
    fail('Completed structural status requires validated receipt identity');
  }
}

export function buildPomRxV01StrictVerdict({
  receiptSchemaVersion = null,
  receiptHashes = [],
  verifierProfile = null,
  verifierVersion = null,
  implementationArtifactSha256 = null,
  expectedImplementationArtifactSha256 = null,
  observedImplementationArtifactSha256 = null,
  executionEnvironment = null,
  effectivePolicyId = null,
  effectivePolicyVersion = null,
  effectivePolicySha256 = null,
  structuralStatus = 'indeterminate',
  diagnostics = [],
  limitations = PROFILE_LIMITATIONS,
} = {}) {
  const orderedDiagnostics = orderPomRxV01Diagnostics(diagnostics);
  if (orderedDiagnostics.some(({ diagnostic_code: code }) => code === 'POMRX_V01_E_PROFILE_INCOMPLETE')) {
    fail('Internal readiness diagnostics cannot enter a strict verdict envelope');
  }
  validateTruthTable(structuralStatus, orderedDiagnostics);
  if (!Array.isArray(receiptHashes) || receiptHashes.some((value) => !HASH_PATTERN.test(value))) fail('receipt_hashes is invalid');
  if (JSON.stringify(limitations) !== JSON.stringify(PROFILE_LIMITATIONS)) fail('limitations must equal the stable profile registry');

  const warnings = [];
  for (const diagnostic of orderedDiagnostics) {
    if (diagnostic.severity === 'warning' && !warnings.includes(diagnostic.diagnostic_code)) warnings.push(diagnostic.diagnostic_code);
  }
  const verdict = {
    verdict_schema_version: 'pom-rx-verification-verdict/1',
    receipt_schema_version: receiptSchemaVersion,
    receipt_hashes: Object.freeze([...receiptHashes]),
    verifier_profile: verifierProfile,
    verifier_version: verifierVersion,
    implementation_artifact_sha256: implementationArtifactSha256,
    expected_implementation_artifact_sha256: expectedImplementationArtifactSha256,
    observed_implementation_artifact_sha256: observedImplementationArtifactSha256,
    execution_environment: validateEnvironment(executionEnvironment),
    effective_policy_id: effectivePolicyId,
    effective_policy_version: effectivePolicyVersion,
    effective_policy_sha256: effectivePolicySha256,
    qualification: qualificationFor(structuralStatus),
    assurance: structuralStatus === 'indeterminate' ? null : 'frozen-v0.1-structural-verification',
    authorization_eligible: false,
    authorization_proved: false,
    structural_status: structuralStatus,
    structural_prerequisite_satisfied: structuralStatus === 'conformant',
    diagnostics: orderedDiagnostics,
    warnings: Object.freeze(warnings),
    limitations: PROFILE_LIMITATIONS,
  };
  validateBindingNullability(verdict);
  return validatePomRxV01StrictVerdict(verdict);
}

export function validatePomRxV01StrictVerdict(verdict) {
  exactKeys(verdict, TOP_LEVEL_KEYS, 'strict verdict');
  if (verdict.verdict_schema_version !== 'pom-rx-verification-verdict/1') fail('verdict_schema_version is invalid');
  nullableString(verdict.receipt_schema_version, 'receipt_schema_version');
  nullableString(verdict.verifier_profile, 'verifier_profile');
  nullableString(verdict.verifier_version, 'verifier_version');
  nullableHash(verdict.implementation_artifact_sha256, 'implementation_artifact_sha256');
  nullableHash(verdict.expected_implementation_artifact_sha256, 'expected_implementation_artifact_sha256');
  nullableHash(verdict.observed_implementation_artifact_sha256, 'observed_implementation_artifact_sha256');
  nullableString(verdict.effective_policy_id, 'effective_policy_id');
  nullableString(verdict.effective_policy_version, 'effective_policy_version');
  nullableHash(verdict.effective_policy_sha256, 'effective_policy_sha256');
  validateEnvironment(verdict.execution_environment);
  if (!Array.isArray(verdict.receipt_hashes) || verdict.receipt_hashes.some((value) => !HASH_PATTERN.test(value))) fail('receipt_hashes is invalid');
  validateBindingNullability(verdict);
  if (verdict.authorization_eligible !== false || verdict.authorization_proved !== false) fail('Strict verdict can never authorize');
  if (verdict.qualification !== qualificationFor(verdict.structural_status)) fail('Strict verdict qualification does not match status');
  if (verdict.structural_prerequisite_satisfied !== (verdict.structural_status === 'conformant')) fail('Strict prerequisite flag does not match status');
  if (verdict.assurance !== (verdict.structural_status === 'indeterminate' ? null : 'frozen-v0.1-structural-verification')) fail('Strict assurance does not match status');
  const ordered = orderPomRxV01Diagnostics(verdict.diagnostics);
  if (JSON.stringify(ordered) !== JSON.stringify(verdict.diagnostics)) fail('Strict diagnostics are not ordered and deduplicated');
  if (ordered.some(({ diagnostic_code: code }) => code === 'POMRX_V01_E_PROFILE_INCOMPLETE')) fail('Internal readiness diagnostic leaked into strict verdict');
  validateTruthTable(verdict.structural_status, ordered);
  const expectedWarnings = [];
  for (const diagnostic of ordered) {
    if (diagnostic.severity === 'warning' && !expectedWarnings.includes(diagnostic.diagnostic_code)) expectedWarnings.push(diagnostic.diagnostic_code);
  }
  if (JSON.stringify(verdict.warnings) !== JSON.stringify(expectedWarnings)) fail('Strict verdict warnings projection is invalid');
  if (JSON.stringify(verdict.limitations) !== JSON.stringify(PROFILE_LIMITATIONS)) fail('Strict verdict limitations are invalid');
  return Object.freeze({
    ...verdict,
    receipt_hashes: Object.freeze([...verdict.receipt_hashes]),
    diagnostics: ordered,
    warnings: Object.freeze([...verdict.warnings]),
    limitations: PROFILE_LIMITATIONS,
  });
}
