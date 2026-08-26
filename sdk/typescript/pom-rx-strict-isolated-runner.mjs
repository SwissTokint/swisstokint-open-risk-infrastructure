import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const POM_RX_STRICT_ISOLATED_RUNNER_SCHEMA_VERSION =
  'pom-rx-strict-isolated-runner/1';
export const POM_RX_STRICT_ISOLATED_RUNNER_HOST_CONFIG_SCHEMA_VERSION =
  'pom-rx-strict-isolated-runner-host-config/1';
export const POM_RX_STRICT_ISOLATED_RUNNER_RESULT_SCHEMA_VERSION =
  'pom-rx-strict-isolated-runner-result/1';
export const POM_RX_STRICT_ISOLATED_RUNNER_SCENARIOS = Object.freeze([
  'valid-control',
  'action-continuity-mismatch',
  'duplicate-receipt-id',
]);

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const RUNNER_ERROR_PATTERN = /^POMRX_RUNNER_E_[A-Z0-9_]+$/u;
const MAX_CHILD_INPUT_BYTES = 64 * 1024;
const MAX_CHILD_OUTPUT_BYTES = 256 * 1024;
const CHILD_TIMEOUT_MS = 5_000;
const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(moduleDirectory, '../..');
const childEntrypoint = path.resolve(
  moduleDirectory,
  'internal/pom-rx-strict-isolated-child.mjs',
);
const nodeExecutable = process.execPath;
const childSpawnSync = spawnSync;
const jsonParse = JSON.parse;
const jsonStringify = JSON.stringify;
const objectFreeze = Object.freeze;
const objectKeys = Object.keys;

export class PomRxStrictIsolatedRunnerError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PomRxStrictIsolatedRunnerError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new PomRxStrictIsolatedRunnerError(code, message);
}

function assertExactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('POMRX_RUNNER_E_HOST_CONFIG', `${label} must be an object`);
  }
  const actual = objectKeys(value).sort();
  const wanted = [...expected].sort();
  if (jsonStringify(actual) !== jsonStringify(wanted)) {
    fail('POMRX_RUNNER_E_HOST_CONFIG', `${label} has missing or unknown fields`);
  }
}

function validateCanonicalInstant(value) {
  if (typeof value !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) {
    fail('POMRX_RUNNER_E_HOST_CONFIG', 'trusted evaluation instant is invalid');
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    fail('POMRX_RUNNER_E_HOST_CONFIG', 'trusted evaluation instant is invalid');
  }
}

function validateBootstrapHostPreconditions(value) {
  assertExactKeys(
    value,
    [
      'schema_version',
      'immutable_source_pin_established',
      'clean_node_process_established',
      'immutable_runtime_filesystem_established',
    ],
    'bootstrap_host_preconditions',
  );
  if (value.schema_version !== 'pom-rx-strict-bootstrap-host-preconditions/1'
    || value.immutable_source_pin_established !== true
    || value.clean_node_process_established !== true
    || value.immutable_runtime_filesystem_established !== true) {
    fail(
      'POMRX_RUNNER_E_HOST_CONFIG',
      'strict bootstrap host preconditions must already be established',
    );
  }
  return objectFreeze({ ...value });
}

function validateHostConfig(value) {
  assertExactKeys(
    value,
    [
      'schema_version',
      'policy_path',
      'expected_policy_sha256',
      'trusted_evaluation_instant',
      'bootstrap_host_preconditions',
    ],
    'trusted host config',
  );
  if (value.schema_version !== POM_RX_STRICT_ISOLATED_RUNNER_HOST_CONFIG_SCHEMA_VERSION) {
    fail('POMRX_RUNNER_E_HOST_CONFIG', 'trusted host config schema is unsupported');
  }
  if (typeof value.policy_path !== 'string'
    || !path.isAbsolute(value.policy_path)
    || value.policy_path.length > 4096) {
    fail('POMRX_RUNNER_E_HOST_CONFIG', 'policy path must be an absolute bounded path');
  }
  if (typeof value.expected_policy_sha256 !== 'string'
    || !HASH_PATTERN.test(value.expected_policy_sha256)) {
    fail('POMRX_RUNNER_E_HOST_CONFIG', 'policy SHA-256 pin is invalid');
  }
  validateCanonicalInstant(value.trusted_evaluation_instant);
  return objectFreeze({
    schema_version: value.schema_version,
    policy_path: value.policy_path,
    expected_policy_sha256: value.expected_policy_sha256,
    trusted_evaluation_instant: value.trusted_evaluation_instant,
    bootstrap_host_preconditions: validateBootstrapHostPreconditions(
      value.bootstrap_host_preconditions,
    ),
  });
}

function validateScenarioId(value) {
  if (typeof value !== 'string' || !POM_RX_STRICT_ISOLATED_RUNNER_SCENARIOS.includes(value)) {
    fail('POMRX_RUNNER_E_SCENARIO', 'scenario is not allowlisted');
  }
  return value;
}

function validateHashArray(values, label) {
  if (!Array.isArray(values) || values.length > 8
    || values.some((value) => typeof value !== 'string' || !HASH_PATTERN.test(value))) {
    fail('POMRX_RUNNER_E_CHILD_RESULT', `${label} is invalid`);
  }
  return objectFreeze([...values]);
}

function validateDiagnosticCodes(values) {
  if (!Array.isArray(values) || values.length > 32
    || values.some((value) => typeof value !== 'string'
      || !/^POMRX_V01_[A-Z0-9_]+$/u.test(value))) {
    fail('POMRX_RUNNER_E_CHILD_RESULT', 'diagnostic code projection is invalid');
  }
  return objectFreeze([...values]);
}

function validateChildResult(value, expectedScenario, expectedPolicySha256) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('POMRX_RUNNER_E_CHILD_RESULT', 'child result must be an object');
  }
  const expectedKeys = [
    'schema_version',
    'scenario_id',
    'runner_process_isolated',
    'clean_child_environment',
    'measured_artifact_bytes_integrity',
    'artifact_manifest_sha256',
    'verifier_profile',
    'verifier_version',
    'implementation_artifact_sha256',
    'effective_policy_sha256',
    'structural_status',
    'qualification',
    'receipt_hashes',
    'diagnostic_codes',
    'host_preconditions_proved',
    'authorization_eligible',
    'authorization_proved',
    'external_execution_proved',
    'financial_safety_proved',
  ];
  const actualKeys = objectKeys(value).sort();
  if (jsonStringify(actualKeys) !== jsonStringify([...expectedKeys].sort())) {
    fail('POMRX_RUNNER_E_CHILD_RESULT', 'child result has missing or unknown fields');
  }
  if (value.schema_version !== POM_RX_STRICT_ISOLATED_RUNNER_RESULT_SCHEMA_VERSION
    || value.scenario_id !== expectedScenario
    || value.runner_process_isolated !== true
    || value.clean_child_environment !== true
    || value.measured_artifact_bytes_integrity !== 'verified'
    || typeof value.artifact_manifest_sha256 !== 'string'
    || !HASH_PATTERN.test(value.artifact_manifest_sha256)
    || value.verifier_profile !== 'pom-rx-v0.1/strict-errata-1'
    || value.verifier_version !== 'pom-rx-v0.1-strict-verifier/1'
    || typeof value.implementation_artifact_sha256 !== 'string'
    || !HASH_PATTERN.test(value.implementation_artifact_sha256)
    || value.effective_policy_sha256 !== expectedPolicySha256
    || !['conformant', 'nonconformant', 'indeterminate'].includes(value.structural_status)
    || typeof value.qualification !== 'string'
    || value.qualification.length === 0
    || value.host_preconditions_proved !== false
    || value.authorization_eligible !== false
    || value.authorization_proved !== false
    || value.external_execution_proved !== false
    || value.financial_safety_proved !== false) {
    fail('POMRX_RUNNER_E_CHILD_RESULT', 'child result violates the strict runner contract');
  }
  const receiptHashes = validateHashArray(value.receipt_hashes, 'receipt hashes');
  const diagnosticCodes = validateDiagnosticCodes(value.diagnostic_codes);
  if (value.structural_status === 'conformant'
    && (receiptHashes.length !== 3 || diagnosticCodes.length !== 0)) {
    fail('POMRX_RUNNER_E_CHILD_RESULT', 'conformant result has inconsistent evidence');
  }
  if (value.structural_status !== 'conformant' && diagnosticCodes.length === 0) {
    fail('POMRX_RUNNER_E_CHILD_RESULT', 'non-conformant/indeterminate result lacks diagnostics');
  }
  return objectFreeze({
    ...value,
    receipt_hashes: receiptHashes,
    diagnostic_codes: diagnosticCodes,
  });
}

function parseChildError(stdout) {
  try {
    const parsed = jsonParse(stdout);
    if (parsed
      && typeof parsed === 'object'
      && !Array.isArray(parsed)
      && objectKeys(parsed).length === 2
      && parsed.schema_version === 'pom-rx-strict-isolated-runner-error/1'
      && typeof parsed.error_code === 'string'
      && RUNNER_ERROR_PATTERN.test(parsed.error_code)) {
      return parsed.error_code;
    }
  } catch {
    // Generic fail-closed error below.
  }
  return 'POMRX_RUNNER_E_CHILD_FAILURE';
}

export function createPomRxStrictIsolatedRunner(trustedHostConfig) {
  const config = validateHostConfig(trustedHostConfig);
  if (process.platform !== 'linux') {
    fail('POMRX_RUNNER_E_PLATFORM_UNSUPPORTED', 'isolated strict runner is Linux-only');
  }

  return objectFreeze({
    runScenario(scenarioId) {
      const selectedScenario = validateScenarioId(scenarioId);
      const requestBody = jsonStringify({
        schema_version: 'pom-rx-strict-isolated-runner-request/1',
        scenario_id: selectedScenario,
        trusted_host_config: config,
      });
      if (Buffer.byteLength(requestBody, 'utf8') > MAX_CHILD_INPUT_BYTES) {
        fail('POMRX_RUNNER_E_HOST_CONFIG', 'runner request exceeds the bounded input size');
      }

      const childEnvironment = Object.freeze({
        LANG: 'C.UTF-8',
        LC_ALL: 'C.UTF-8',
        TZ: 'UTC',
      });
      const child = childSpawnSync(nodeExecutable, [childEntrypoint], {
        cwd: packageRoot,
        env: childEnvironment,
        input: requestBody,
        encoding: 'utf8',
        shell: false,
        windowsHide: true,
        timeout: CHILD_TIMEOUT_MS,
        maxBuffer: MAX_CHILD_OUTPUT_BYTES,
        killSignal: 'SIGKILL',
      });

      if (child.error) {
        fail('POMRX_RUNNER_E_CHILD_FAILURE', 'strict child process failed to execute');
      }
      if (child.status !== 0) {
        fail(parseChildError(child.stdout ?? ''), 'strict child process rejected the request');
      }
      if (typeof child.stdout !== 'string' || Buffer.byteLength(child.stdout, 'utf8') > MAX_CHILD_OUTPUT_BYTES) {
        fail('POMRX_RUNNER_E_CHILD_RESULT', 'strict child output is invalid');
      }

      let parsed;
      try {
        parsed = jsonParse(child.stdout);
      } catch {
        fail('POMRX_RUNNER_E_CHILD_RESULT', 'strict child output is not valid JSON');
      }
      return validateChildResult(parsed, selectedScenario, config.expected_policy_sha256);
    },
  });
}
