import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUEST_SCHEMA_VERSION = 'pom-rx-strict-isolated-runner-request/1';
const HOST_CONFIG_SCHEMA_VERSION = 'pom-rx-strict-isolated-runner-host-config/1';
const RESULT_SCHEMA_VERSION = 'pom-rx-strict-isolated-runner-result/1';
const ERROR_SCHEMA_VERSION = 'pom-rx-strict-isolated-runner-error/1';
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const MAX_INPUT_BYTES = 64 * 1024;
const MAX_FIXTURE_BYTES = 256 * 1024;
const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(moduleDirectory, '../../..');
const fixtureRoot = path.resolve(
  packageRoot,
  'fixtures/pom-rx/v0.1-compat/1/chains',
);

const SCENARIOS = Object.freeze({
  'valid-control': Object.freeze({
    fixture: 'valid-control.json',
    git_blob_sha1: '36b427245bb16fba9ec4deb90d8a6e0dc91835da',
    allow_partial: false,
  }),
  'action-continuity-mismatch': Object.freeze({
    fixture: 'POMRX-001-ACTION-PREFLIGHT-EXECUTION.json',
    git_blob_sha1: '0c57a2cd0740996dce60e5a06778eccdb2b4349e',
    allow_partial: true,
  }),
  'duplicate-receipt-id': Object.freeze({
    fixture: 'POMRX-007-DUPLICATE-RECEIPT-ID.json',
    git_blob_sha1: '58758946a41ccb9d8dce4e65c78aa1aab853c377',
    allow_partial: true,
  }),
});

function fail(code) {
  const payload = JSON.stringify({
    schema_version: ERROR_SCHEMA_VERSION,
    error_code: code,
  });
  process.stdout.write(payload);
  process.exitCode = 1;
  throw Object.freeze({ pomRxRunnerTerminal: true });
}

function exactKeys(value, expected, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) fail(code);
}

function validateCleanChildEnvironment() {
  if (process.platform !== 'linux') fail('POMRX_RUNNER_E_PLATFORM_UNSUPPORTED');
  if (process.execArgv.length !== 0 || process.argv.length !== 2) {
    fail('POMRX_RUNNER_E_CHILD_ENVIRONMENT');
  }
  const actualEnvironmentKeys = Object.keys(process.env).sort();
  const expectedEnvironmentKeys = ['LANG', 'LC_ALL', 'TZ'].sort();
  if (JSON.stringify(actualEnvironmentKeys) !== JSON.stringify(expectedEnvironmentKeys)
    || process.env.LANG !== 'C.UTF-8'
    || process.env.LC_ALL !== 'C.UTF-8'
    || process.env.TZ !== 'UTC'
    || process.env.NODE_OPTIONS !== undefined
    || process.env.NODE_PATH !== undefined
    || process.env.NODE_V8_COVERAGE !== undefined
    || process.env.LD_PRELOAD !== undefined
    || process.env.DYLD_INSERT_LIBRARIES !== undefined) {
    fail('POMRX_RUNNER_E_CHILD_ENVIRONMENT');
  }
}

function validateCanonicalInstant(value) {
  if (typeof value !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) {
    fail('POMRX_RUNNER_E_HOST_CONFIG');
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    fail('POMRX_RUNNER_E_HOST_CONFIG');
  }
}

function validateBootstrapHostPreconditions(value) {
  exactKeys(value, [
    'schema_version',
    'immutable_source_pin_established',
    'clean_node_process_established',
    'immutable_runtime_filesystem_established',
  ], 'POMRX_RUNNER_E_HOST_CONFIG');
  if (value.schema_version !== 'pom-rx-strict-bootstrap-host-preconditions/1'
    || value.immutable_source_pin_established !== true
    || value.clean_node_process_established !== true
    || value.immutable_runtime_filesystem_established !== true) {
    fail('POMRX_RUNNER_E_HOST_CONFIG');
  }
  return Object.freeze({ ...value });
}

function validateHostConfig(value) {
  exactKeys(value, [
    'schema_version',
    'policy_path',
    'expected_policy_sha256',
    'trusted_evaluation_instant',
    'bootstrap_host_preconditions',
  ], 'POMRX_RUNNER_E_HOST_CONFIG');
  if (value.schema_version !== HOST_CONFIG_SCHEMA_VERSION
    || typeof value.policy_path !== 'string'
    || !path.isAbsolute(value.policy_path)
    || value.policy_path.length > 4096
    || typeof value.expected_policy_sha256 !== 'string'
    || !HASH_PATTERN.test(value.expected_policy_sha256)) {
    fail('POMRX_RUNNER_E_HOST_CONFIG');
  }
  validateCanonicalInstant(value.trusted_evaluation_instant);
  return Object.freeze({
    schema_version: value.schema_version,
    policy_path: value.policy_path,
    expected_policy_sha256: value.expected_policy_sha256,
    trusted_evaluation_instant: value.trusted_evaluation_instant,
    bootstrap_host_preconditions: validateBootstrapHostPreconditions(
      value.bootstrap_host_preconditions,
    ),
  });
}

function parseRequest() {
  let bytes;
  try {
    bytes = readFileSync(0);
  } catch {
    fail('POMRX_RUNNER_E_REQUEST');
  }
  if (bytes.length < 1 || bytes.length > MAX_INPUT_BYTES) fail('POMRX_RUNNER_E_REQUEST');
  let parsed;
  try {
    parsed = JSON.parse(bytes.toString('utf8'));
  } catch {
    fail('POMRX_RUNNER_E_REQUEST');
  }
  exactKeys(
    parsed,
    ['schema_version', 'scenario_id', 'trusted_host_config'],
    'POMRX_RUNNER_E_REQUEST',
  );
  if (parsed.schema_version !== REQUEST_SCHEMA_VERSION
    || typeof parsed.scenario_id !== 'string'
    || !Object.hasOwn(SCENARIOS, parsed.scenario_id)) {
    fail('POMRX_RUNNER_E_SCENARIO');
  }
  return Object.freeze({
    scenario_id: parsed.scenario_id,
    trusted_host_config: validateHostConfig(parsed.trusted_host_config),
  });
}

function gitBlobSha1(bytes) {
  const header = Buffer.from(`blob ${bytes.length}\0`, 'utf8');
  return createHash('sha1').update(header).update(bytes).digest('hex');
}

function readPinnedScenario(scenarioId) {
  const scenario = SCENARIOS[scenarioId];
  const fixturePath = path.resolve(fixtureRoot, scenario.fixture);
  if (path.dirname(fixturePath) !== fixtureRoot) fail('POMRX_RUNNER_E_FIXTURE');
  let bytes;
  try {
    bytes = readFileSync(fixturePath);
  } catch {
    fail('POMRX_RUNNER_E_FIXTURE');
  }
  if (bytes.length < 1 || bytes.length > MAX_FIXTURE_BYTES
    || gitBlobSha1(bytes) !== scenario.git_blob_sha1) {
    fail('POMRX_RUNNER_E_FIXTURE');
  }
  let receipts;
  try {
    receipts = JSON.parse(bytes.toString('utf8'));
  } catch {
    fail('POMRX_RUNNER_E_FIXTURE');
  }
  if (!Array.isArray(receipts)) fail('POMRX_RUNNER_E_FIXTURE');
  return Object.freeze({ receipts, allowPartial: scenario.allow_partial });
}

function diagnosticCodes(verdict) {
  if (!Array.isArray(verdict.diagnostics)) fail('POMRX_RUNNER_E_STRICT_RESULT');
  return Object.freeze(verdict.diagnostics.map((diagnostic) => {
    if (!diagnostic || typeof diagnostic !== 'object'
      || typeof diagnostic.diagnostic_code !== 'string'
      || !/^POMRX_V01_[A-Z0-9_]+$/u.test(diagnostic.diagnostic_code)) {
      fail('POMRX_RUNNER_E_STRICT_RESULT');
    }
    return diagnostic.diagnostic_code;
  }));
}

async function run() {
  validateCleanChildEnvironment();
  const request = parseRequest();

  // First POM-RX module import in this process: byte bootstrap only.
  const bootstrap = await import('../pom-rx-strict-package.mjs');
  const bootstrapReport = bootstrap.verifyPomRxStrictMeasuredArtifactBytes(
    request.trusted_host_config.bootstrap_host_preconditions,
  );
  if (bootstrapReport.measured_artifact_bytes_integrity !== 'verified'
    || bootstrapReport.measured_artifact_code_executed !== false
    || bootstrapReport.host_preconditions_proved !== false
    || bootstrapReport.authorization_proved !== false
    || bootstrapReport.external_execution_proved !== false
    || bootstrapReport.financial_safety_proved !== false) {
    fail('POMRX_RUNNER_E_BOOTSTRAP');
  }

  const hostPins = bootstrap.getPomRxStrictPackageHostPins();
  const scenario = readPinnedScenario(request.scenario_id);

  // Strict verifier is imported only after the M4 byte bootstrap succeeds.
  const profiled = await import('../pom-rx-profiled.mjs');
  const verdict = profiled.withFreshPomRxPolicyCapability({
    policyPath: request.trusted_host_config.policy_path,
    expectedPolicySha256: request.trusted_host_config.expected_policy_sha256,
    trustedEvaluationInstant: request.trusted_host_config.trusted_evaluation_instant,
    artifactManifestPath: hostPins.artifactManifestPath,
    expectedArtifactManifestSha256: hostPins.expectedArtifactManifestSha256,
  }, (capability) => profiled.verifyPomRxChainProfiled(scenario.receipts, {
    allowPartial: scenario.allowPartial,
    verificationProfile: profiled.POM_RX_V01_STRICT_PROFILE,
  }, capability));

  if (!verdict || typeof verdict !== 'object'
    || verdict.verifier_profile !== profiled.POM_RX_V01_STRICT_PROFILE
    || verdict.verifier_version !== profiled.POM_RX_V01_STRICT_VERIFIER_VERSION
    || verdict.effective_policy_sha256 !== request.trusted_host_config.expected_policy_sha256
    || verdict.authorization_eligible !== false
    || verdict.authorization_proved !== false
    || !['conformant', 'nonconformant', 'indeterminate'].includes(verdict.structural_status)) {
    fail('POMRX_RUNNER_E_STRICT_RESULT');
  }

  const result = Object.freeze({
    schema_version: RESULT_SCHEMA_VERSION,
    scenario_id: request.scenario_id,
    runner_process_isolated: true,
    clean_child_environment: true,
    measured_artifact_bytes_integrity: bootstrapReport.measured_artifact_bytes_integrity,
    artifact_manifest_sha256: bootstrapReport.artifact_manifest_sha256,
    verifier_profile: verdict.verifier_profile,
    verifier_version: verdict.verifier_version,
    implementation_artifact_sha256: verdict.implementation_artifact_sha256,
    effective_policy_sha256: verdict.effective_policy_sha256,
    structural_status: verdict.structural_status,
    qualification: verdict.qualification,
    receipt_hashes: verdict.receipt_hashes,
    diagnostic_codes: diagnosticCodes(verdict),
    host_preconditions_proved: false,
    authorization_eligible: false,
    authorization_proved: false,
    external_execution_proved: false,
    financial_safety_proved: false,
  });
  process.stdout.write(JSON.stringify(result));
}

try {
  await run();
} catch (error) {
  if (!error?.pomRxRunnerTerminal) {
    const code = typeof error?.code === 'string' && /^POMRX_RUNNER_E_[A-Z0-9_]+$/u.test(error.code)
      ? error.code
      : 'POMRX_RUNNER_E_CHILD_FAILURE';
    try {
      process.stdout.write(JSON.stringify({ schema_version: ERROR_SCHEMA_VERSION, error_code: code }));
    } catch {
      // Deliberately suppress all diagnostic detail on the child boundary.
    }
    process.exitCode = 1;
  }
}
