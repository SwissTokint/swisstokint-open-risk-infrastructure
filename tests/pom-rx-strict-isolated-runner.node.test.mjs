import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  POM_RX_STRICT_ISOLATED_RUNNER_HOST_CONFIG_SCHEMA_VERSION,
  POM_RX_STRICT_ISOLATED_RUNNER_RESULT_SCHEMA_VERSION,
  POM_RX_STRICT_ISOLATED_RUNNER_SCENARIOS,
  POM_RX_STRICT_ISOLATED_RUNNER_SCHEMA_VERSION,
  PomRxStrictIsolatedRunnerError,
  createPomRxStrictIsolatedRunner,
} from '../sdk/typescript/pom-rx-strict-isolated-runner.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifactManifestPath = path.join(
  repositoryRoot,
  'core',
  'strict-verification',
  'pom-rx-v01-artifact-manifest.json',
);
const artifactManifest = JSON.parse(readFileSync(artifactManifestPath, 'utf8'));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function runtimeConstraintsForCleanChild() {
  return {
    node_version: process.versions.node,
    icu_version: process.versions.icu,
    unicode_version: process.versions.unicode,
    locale: 'en-US',
    platform: 'linux',
    arch: process.arch,
  };
}

function testPolicy() {
  return {
    policy_schema_version: 'pom-rx-local-verification-policy/1',
    policy_id: 'policy-pom-rx-isolated-runner-test',
    policy_version: '2026-08-26.1',
    accepted_verifiers: [{
      receipt_schema_version: 'pom-rx/0.1',
      verifier_profile: 'pom-rx-v0.1/strict-errata-1',
      verifier_version: 'pom-rx-v0.1-strict-verifier/1',
      implementation_artifact_sha256: artifactManifest.implementation_artifact_sha256,
      runtime_constraints: runtimeConstraintsForCleanChild(),
    }],
    withdrawn_verifiers: [],
  };
}

function withRunner(callback, overrides = {}) {
  const directory = realpathSync.native(mkdtempSync(path.join(os.tmpdir(), 'pom-rx-isolated-runner-')));
  try {
    const policyBytes = Buffer.from(JSON.stringify(testPolicy()), 'utf8');
    const policyPath = path.join(directory, 'policy.json');
    writeFileSync(policyPath, policyBytes);
    const hostConfig = {
      schema_version: POM_RX_STRICT_ISOLATED_RUNNER_HOST_CONFIG_SCHEMA_VERSION,
      policy_path: policyPath,
      expected_policy_sha256: sha256(policyBytes),
      trusted_evaluation_instant: '2026-08-26T10:00:00.000Z',
      // Test harness assertion only. These booleans are not evidence that this
      // mutable test checkout satisfies a production host immutability claim.
      bootstrap_host_preconditions: {
        schema_version: 'pom-rx-strict-bootstrap-host-preconditions/1',
        immutable_source_pin_established: true,
        clean_node_process_established: true,
        immutable_runtime_filesystem_established: true,
      },
      ...overrides,
    };
    return callback(createPomRxStrictIsolatedRunner(hostConfig), hostConfig);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function expectRunnerCode(error, code) {
  assert.ok(error instanceof PomRxStrictIsolatedRunnerError);
  assert.equal(error.code, code);
  return true;
}

const linuxTest = process.platform === 'linux' ? test : test.skip;

linuxTest('isolated strict runner exposes only the bounded scenario method', () => {
  withRunner((runner) => {
    assert.equal(POM_RX_STRICT_ISOLATED_RUNNER_SCHEMA_VERSION, 'pom-rx-strict-isolated-runner/1');
    assert.deepEqual(POM_RX_STRICT_ISOLATED_RUNNER_SCENARIOS, [
      'valid-control',
      'action-continuity-mismatch',
      'duplicate-receipt-id',
    ]);
    assert.deepEqual(Object.keys(runner), ['runScenario']);
    assert.equal(Object.isFrozen(runner), true);
  });
});

linuxTest('valid control runs in the clean child and remains explicitly non-authorizing', () => {
  withRunner((runner) => {
    const result = runner.runScenario('valid-control');
    assert.equal(result.schema_version, POM_RX_STRICT_ISOLATED_RUNNER_RESULT_SCHEMA_VERSION);
    assert.equal(result.scenario_id, 'valid-control');
    assert.equal(result.runner_process_isolated, true);
    assert.equal(result.clean_child_environment, true);
    assert.equal(result.measured_artifact_bytes_integrity, 'verified');
    assert.equal(result.verifier_profile, 'pom-rx-v0.1/strict-errata-1');
    assert.equal(result.verifier_version, 'pom-rx-v0.1-strict-verifier/1');
    assert.equal(result.structural_status, 'conformant');
    assert.equal(result.qualification, 'STRICT_STRUCTURAL_CONFORMANCE_OBSERVED');
    assert.equal(result.receipt_hashes.length, 3);
    assert.deepEqual(result.diagnostic_codes, []);
    assert.equal(result.host_preconditions_proved, false);
    assert.equal(result.authorization_eligible, false);
    assert.equal(result.authorization_proved, false);
    assert.equal(result.external_execution_proved, false);
    assert.equal(result.financial_safety_proved, false);
  });
});

linuxTest('action-continuity mismatch is a strict nonconformance, not an infrastructure success claim', () => {
  withRunner((runner) => {
    const result = runner.runScenario('action-continuity-mismatch');
    assert.equal(result.structural_status, 'nonconformant');
    assert.equal(result.qualification, 'STRICT_STRUCTURAL_NONCONFORMANCE_OBSERVED');
    assert.ok(result.diagnostic_codes.includes('POMRX_V01_E_ACTION_CONTINUITY'));
    assert.equal(result.authorization_eligible, false);
    assert.equal(result.authorization_proved, false);
  });
});

linuxTest('duplicate receipt id is rejected by the strict profile in the isolated child', () => {
  withRunner((runner) => {
    const result = runner.runScenario('duplicate-receipt-id');
    assert.equal(result.structural_status, 'nonconformant');
    assert.ok(result.diagnostic_codes.includes('POMRX_V01_E_DUPLICATE_RECEIPT_ID'));
    assert.equal(result.authorization_proved, false);
  });
});

linuxTest('unknown scenario is rejected in the parent before the child process is invoked', () => {
  withRunner((runner) => {
    assert.throws(
      () => runner.runScenario('../arbitrary-receipts.json'),
      (error) => expectRunnerCode(error, 'POMRX_RUNNER_E_SCENARIO'),
    );
  });
});

linuxTest('host config cannot omit or weaken M4 pre-measurement preconditions', () => {
  const directory = realpathSync.native(mkdtempSync(path.join(os.tmpdir(), 'pom-rx-runner-host-config-')));
  try {
    const policyBytes = Buffer.from(JSON.stringify(testPolicy()), 'utf8');
    const policyPath = path.join(directory, 'policy.json');
    writeFileSync(policyPath, policyBytes);
    const base = {
      schema_version: POM_RX_STRICT_ISOLATED_RUNNER_HOST_CONFIG_SCHEMA_VERSION,
      policy_path: policyPath,
      expected_policy_sha256: sha256(policyBytes),
      trusted_evaluation_instant: '2026-08-26T10:00:00.000Z',
      bootstrap_host_preconditions: {
        schema_version: 'pom-rx-strict-bootstrap-host-preconditions/1',
        immutable_source_pin_established: true,
        clean_node_process_established: true,
        immutable_runtime_filesystem_established: false,
      },
    };
    assert.throws(
      () => createPomRxStrictIsolatedRunner(base),
      (error) => expectRunnerCode(error, 'POMRX_RUNNER_E_HOST_CONFIG'),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

linuxTest('inherited NODE_OPTIONS is not propagated into the isolated child', () => {
  const previous = process.env.NODE_OPTIONS;
  process.env.NODE_OPTIONS = '--trace-warnings';
  try {
    withRunner((runner) => {
      const result = runner.runScenario('valid-control');
      assert.equal(result.clean_child_environment, true);
      assert.equal(result.structural_status, 'conformant');
    });
  } finally {
    if (previous === undefined) delete process.env.NODE_OPTIONS;
    else process.env.NODE_OPTIONS = previous;
  }
});

linuxTest('a wrong policy pin fails closed at the child boundary', () => {
  withRunner((_runner, hostConfig) => {
    const mismatched = createPomRxStrictIsolatedRunner({
      ...hostConfig,
      expected_policy_sha256: '0'.repeat(64),
    });
    assert.throws(
      () => mismatched.runScenario('valid-control'),
      (error) => expectRunnerCode(error, 'POMRX_RUNNER_E_CHILD_FAILURE'),
    );
  });
});

test('child source imports bootstrap before strict verifier and has no static POM-RX dependency', () => {
  const source = readFileSync(
    path.join(repositoryRoot, 'sdk', 'typescript', 'internal', 'pom-rx-strict-isolated-child.mjs'),
    'utf8',
  );
  assert.doesNotMatch(source, /^import .*pom-rx/um);
  const bootstrapImport = source.indexOf("await import('../pom-rx-strict-package.mjs')");
  const strictImport = source.indexOf("await import('../pom-rx-profiled.mjs')");
  assert.ok(bootstrapImport > 0, 'child must dynamically import the M4 bootstrap');
  assert.ok(strictImport > bootstrapImport, 'strict verifier must load only after bootstrap');
  assert.match(source, /process\.execArgv\.length !== 0/u);
  assert.match(source, /process\.env\.NODE_OPTIONS !== undefined/u);
  assert.match(source, /host_preconditions_proved: false/u);
  assert.match(source, /authorization_proved: false/u);
  assert.match(source, /external_execution_proved: false/u);
  assert.match(source, /financial_safety_proved: false/u);
});
