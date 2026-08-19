import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  POM_RX_V01_STRICT_PROFILE,
  POM_RX_V01_STRICT_VERIFIER_VERSION,
  verifyPomRxChainProfiled,
  withFreshPomRxPolicyCapability,
} from '../sdk/typescript/pom-rx-profiled.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureRoot = path.join(repositoryRoot, 'fixtures', 'pom-rx', 'v0.1-compat', '1', 'chains');
const artifactManifestPath = path.join(
  repositoryRoot,
  'core',
  'strict-verification',
  'pom-rx-v01-artifact-manifest.json',
);
const artifactManifestBytes = readFileSync(artifactManifestPath);
const artifactManifest = JSON.parse(artifactManifestBytes);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function readChain(name) {
  return JSON.parse(readFileSync(path.join(fixtureRoot, `${name}.json`), 'utf8'));
}

function runtimeConstraints() {
  return {
    node_version: process.versions.node,
    icu_version: process.versions.icu,
    unicode_version: process.versions.unicode,
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
    platform: process.platform,
    arch: process.arch,
  };
}

function localPolicy(implementationArtifactSha256 = artifactManifest.implementation_artifact_sha256) {
  return {
    policy_schema_version: 'pom-rx-local-verification-policy/1',
    policy_id: 'policy-pom-rx-strict-activation-test',
    policy_version: '2026-08-19.1',
    accepted_verifiers: [{
      receipt_schema_version: 'pom-rx/0.1',
      verifier_profile: POM_RX_V01_STRICT_PROFILE,
      verifier_version: POM_RX_V01_STRICT_VERIFIER_VERSION,
      implementation_artifact_sha256: implementationArtifactSha256,
      runtime_constraints: runtimeConstraints(),
    }],
    withdrawn_verifiers: [],
  };
}

function withTempDirectory(callback) {
  const directory = realpathSync.native(mkdtempSync(path.join(os.tmpdir(), 'pom-rx-v01-strict-')));
  try {
    return callback(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function verifyWithFreshPolicy(receipts, {
  policyArtifactSha256 = artifactManifest.implementation_artifact_sha256,
  allowPartial = false,
} = {}) {
  return withTempDirectory((directory) => {
    const policyBytes = Buffer.from(JSON.stringify(localPolicy(policyArtifactSha256)), 'utf8');
    const policyPath = path.join(directory, 'policy.json');
    writeFileSync(policyPath, policyBytes);
    return withFreshPomRxPolicyCapability({
      policyPath,
      expectedPolicySha256: sha256(policyBytes),
      trustedEvaluationInstant: '2026-08-19T09:00:00.000Z',
      artifactManifestPath,
      expectedArtifactManifestSha256: sha256(artifactManifestBytes),
    }, (capability) => verifyPomRxChainProfiled(receipts, {
      allowPartial,
      verificationProfile: POM_RX_V01_STRICT_PROFILE,
    }, capability));
  });
}

function diagnosticCodes(verdict) {
  return verdict.diagnostics.map(({ diagnostic_code: code }) => code);
}

function diagnosticSummary(verdict) {
  return JSON.stringify(verdict.diagnostics);
}

function assertNeverAuthorizes(verdict) {
  assert.equal(verdict.authorization_eligible, false);
  assert.equal(verdict.authorization_proved, false);
}

test('strict activation exports the exact ratified profile and verifier identifiers', () => {
  assert.equal(POM_RX_V01_STRICT_PROFILE, 'pom-rx-v0.1/strict-errata-1');
  assert.equal(POM_RX_V01_STRICT_VERIFIER_VERSION, 'pom-rx-v0.1-strict-verifier/1');
  assert.equal(artifactManifest.verifier_version, POM_RX_V01_STRICT_VERIFIER_VERSION);
  assert.match(artifactManifest.implementation_artifact_sha256, /^[a-f0-9]{64}$/u);
});

test('strict profile options fail closed without downgrade or implicit fallback', () => {
  const valid = readChain('valid-control');
  const missing = verifyPomRxChainProfiled(valid, {}, null);
  assert.equal(missing.structural_status, 'indeterminate');
  assert.deepEqual(diagnosticCodes(missing), ['POMRX_V01_E_PROFILE_REQUIRED']);
  assertNeverAuthorizes(missing);

  const downgrade = verifyPomRxChainProfiled(valid, { verificationProfile: 'pom-rx/0.1' }, null);
  assert.equal(downgrade.structural_status, 'indeterminate');
  assert.deepEqual(diagnosticCodes(downgrade), ['POMRX_V01_E_DOWNGRADE_FORBIDDEN']);
  assertNeverAuthorizes(downgrade);

  const unsupported = verifyPomRxChainProfiled(valid, { verificationProfile: 'pom-rx-v9' }, null);
  assert.equal(unsupported.structural_status, 'indeterminate');
  assert.deepEqual(diagnosticCodes(unsupported), ['POMRX_V01_E_PROFILE_UNSUPPORTED']);
  assertNeverAuthorizes(unsupported);
});

test('strict activation requires a branded fresh policy capability', () => {
  const verdict = verifyPomRxChainProfiled(
    readChain('valid-control'),
    { verificationProfile: POM_RX_V01_STRICT_PROFILE },
    {},
  );
  assert.equal(verdict.structural_status, 'indeterminate');
  assert.deepEqual(diagnosticCodes(verdict), ['POMRX_V01_E_POLICY_CAPABILITY_REQUIRED']);
  assertNeverAuthorizes(verdict);
});

test('strict activation produces a fully bound non-authorizing conformant verdict', {
  skip: process.platform === 'win32',
}, () => {
  const verdict = verifyWithFreshPolicy(readChain('valid-control'));
  assert.equal(verdict.structural_status, 'conformant', diagnosticSummary(verdict));
  assert.equal(verdict.qualification, 'STRICT_STRUCTURAL_CONFORMANCE_OBSERVED');
  assert.equal(verdict.structural_prerequisite_satisfied, true);
  assert.equal(verdict.receipt_schema_version, 'pom-rx/0.1');
  assert.equal(verdict.verifier_profile, POM_RX_V01_STRICT_PROFILE);
  assert.equal(verdict.verifier_version, POM_RX_V01_STRICT_VERIFIER_VERSION);
  assert.equal(verdict.implementation_artifact_sha256, artifactManifest.implementation_artifact_sha256);
  assert.equal(verdict.expected_implementation_artifact_sha256, artifactManifest.implementation_artifact_sha256);
  assert.equal(verdict.observed_implementation_artifact_sha256, artifactManifest.implementation_artifact_sha256);
  assert.equal(verdict.effective_policy_id, 'policy-pom-rx-strict-activation-test');
  assert.equal(verdict.receipt_hashes.length, 3);
  assert.deepEqual(verdict.diagnostics, []);
  assertNeverAuthorizes(verdict);
});

test('strict activation closes every frozen structural integrity gap in the five-invariant matrix', {
  skip: process.platform === 'win32',
}, () => {
  const cases = [
    ['POMRX-001-ACTION-PREFLIGHT-EXECUTION', 'POMRX_V01_E_ACTION_CONTINUITY', true],
    ['POMRX-001-ACTION-EXECUTION-RECONCILIATION', 'POMRX_V01_E_ACTION_CONTINUITY', false],
    ['POMRX-001-INPUT-PREFLIGHT-EXECUTION', 'POMRX_V01_E_INPUT_CONTINUITY', true],
    ['POMRX-006-EXECUTION-FAIL-ASSERTION', 'POMRX_V01_E_EXECUTION_ASSERTION_CONFLICT', true],
    ['POMRX-006-RECONCILIATION-FAIL-ASSERTION', 'POMRX_V01_E_RECONCILIATION_ASSERTION_CONFLICT', false],
    ['POMRX-007-DUPLICATE-RECEIPT-ID', 'POMRX_V01_E_DUPLICATE_RECEIPT_ID', true],
  ];

  for (const [fixture, expectedCode, allowPartial] of cases) {
    const verdict = verifyWithFreshPolicy(readChain(fixture), { allowPartial });
    assert.equal(
      verdict.structural_status,
      'nonconformant',
      `${fixture}: ${diagnosticSummary(verdict)}`,
    );
    assert.equal(verdict.qualification, 'STRICT_STRUCTURAL_NONCONFORMANCE_OBSERVED', fixture);
    assert.ok(diagnosticCodes(verdict).includes(expectedCode), fixture);
    assertNeverAuthorizes(verdict);
  }
});

test('strict activation rejects policy/artifact mismatch as indeterminate', {
  skip: process.platform === 'win32',
}, () => {
  const verdict = verifyWithFreshPolicy(readChain('valid-control'), {
    policyArtifactSha256: '0'.repeat(64),
  });
  assert.equal(verdict.structural_status, 'indeterminate');
  assert.deepEqual(
    diagnosticCodes(verdict),
    ['POMRX_V01_E_VERIFIER_NOT_ALLOWED'],
    diagnosticSummary(verdict),
  );
  assertNeverAuthorizes(verdict);
});

test('strict activation maps malformed receipt input to an indeterminate typed verdict', {
  skip: process.platform === 'win32',
}, () => {
  const verdict = verifyWithFreshPolicy([{ phase: 'preflight' }]);
  assert.equal(verdict.structural_status, 'indeterminate');
  assert.deepEqual(
    diagnosticCodes(verdict),
    ['POMRX_V01_E_SCHEMA_INVALID'],
    diagnosticSummary(verdict),
  );
  assertNeverAuthorizes(verdict);
});

test('strict activation source never calls or falls back to the historical verifier', () => {
  const strictSource = readFileSync(
    path.join(repositoryRoot, 'core', 'strict-verification', 'pom-rx-v01-profiled-verifier.mjs'),
    'utf8',
  );
  const legacySource = readFileSync(path.join(repositoryRoot, 'sdk', 'typescript', 'pom-rx.mjs'), 'utf8');

  assert.doesNotMatch(strictSource, /\bverifyPomRxChain\s*\(/u);
  assert.doesNotMatch(legacySource, /verifyPomRxChainProfiled|pom-rx-profiled/u);
});

test('Windows strict production boundary is explicit fail-closed until native metadata evidence exists', {
  skip: process.platform !== 'win32',
}, () => {
  const verdict = verifyWithFreshPolicy(readChain('valid-control'));
  assert.equal(verdict.structural_status, 'indeterminate');
  assert.deepEqual(diagnosticCodes(verdict), ['POMRX_V01_E_RUNTIME_ENVIRONMENT_UNSUPPORTED']);
  assertNeverAuthorizes(verdict);
});
