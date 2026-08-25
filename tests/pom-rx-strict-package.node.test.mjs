import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  POM_RX_STRICT_ARTIFACT_MANIFEST_RELATIVE_PATH,
  POM_RX_STRICT_ARTIFACT_MANIFEST_SHA256,
  POM_RX_STRICT_IMPLEMENTATION_ARTIFACT_SHA256,
  POM_RX_STRICT_PACKAGE_CONTRACT,
  POM_RX_STRICT_PACKAGE_SCHEMA_VERSION,
  getPomRxStrictPackageHostPins,
  verifyPomRxStrictMeasuredArtifactIntegrity,
} from '../sdk/typescript/pom-rx-strict-package.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function packedFiles() {
  const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const output = execFileSync(
    npmExecutable,
    ['pack', '--dry-run', '--json', '--ignore-scripts'],
    { cwd: repositoryRoot, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
  );
  const parsed = JSON.parse(output);
  assert.equal(parsed.length, 1);
  return new Set(parsed[0].files.map(({ path: packedPath }) => packedPath));
}

test('strict package descriptor pins the ratified strict artifact without authorizing', () => {
  assert.equal(POM_RX_STRICT_PACKAGE_SCHEMA_VERSION, 'pom-rx-strict-package/1');
  assert.equal(POM_RX_STRICT_PACKAGE_CONTRACT.verifier_profile, 'pom-rx-v0.1/strict-errata-1');
  assert.equal(POM_RX_STRICT_PACKAGE_CONTRACT.verifier_version, 'pom-rx-v0.1-strict-verifier/1');
  assert.equal(
    POM_RX_STRICT_PACKAGE_CONTRACT.implementation_artifact_sha256,
    POM_RX_STRICT_IMPLEMENTATION_ARTIFACT_SHA256,
  );
  assert.equal(POM_RX_STRICT_PACKAGE_CONTRACT.immutable_source_pin_required, true);
  assert.equal(POM_RX_STRICT_PACKAGE_CONTRACT.package_source_identity_proved, false);
  assert.equal(POM_RX_STRICT_PACKAGE_CONTRACT.policy_capability_required, true);
  assert.equal(POM_RX_STRICT_PACKAGE_CONTRACT.authorization_proved, false);
  assert.equal(POM_RX_STRICT_PACKAGE_CONTRACT.external_execution_proved, false);
  assert.equal(POM_RX_STRICT_PACKAGE_CONTRACT.financial_safety_proved, false);
});

test('strict package host pins bind the exact bundled artifact manifest bytes', () => {
  const pins = getPomRxStrictPackageHostPins();
  assert.equal(path.isAbsolute(pins.artifactManifestPath), true);
  assert.equal(pins.expectedArtifactManifestSha256, POM_RX_STRICT_ARTIFACT_MANIFEST_SHA256);
  assert.equal(
    path.relative(repositoryRoot, pins.artifactManifestPath).replaceAll('\\', '/'),
    POM_RX_STRICT_ARTIFACT_MANIFEST_RELATIVE_PATH,
  );
  assert.equal(sha256(readFileSync(pins.artifactManifestPath)), POM_RX_STRICT_ARTIFACT_MANIFEST_SHA256);
});

test('strict package helper measures only the declared implementation artifact', {
  skip: process.platform === 'win32',
}, () => {
  const report = verifyPomRxStrictMeasuredArtifactIntegrity();
  assert.equal(report.measured_artifact_integrity, 'verified');
  assert.equal(report.verifier_profile, 'pom-rx-v0.1/strict-errata-1');
  assert.equal(report.verifier_version, 'pom-rx-v0.1-strict-verifier/1');
  assert.equal(report.artifact_manifest_sha256, POM_RX_STRICT_ARTIFACT_MANIFEST_SHA256);
  assert.equal(report.implementation_artifact_sha256, POM_RX_STRICT_IMPLEMENTATION_ARTIFACT_SHA256);
  assert.equal(report.immutable_source_pin_required, true);
  assert.equal(report.package_source_identity_proved, false);
  assert.equal(report.policy_capability_required, true);
  assert.equal(report.authorization_proved, false);
});

test('npm package dry-run contains every strict artifact entry and runtime support file', () => {
  const manifest = JSON.parse(readFileSync(
    path.join(repositoryRoot, POM_RX_STRICT_ARTIFACT_MANIFEST_RELATIVE_PATH),
    'utf8',
  ));
  const files = packedFiles();

  for (const entry of manifest.entries) {
    assert.equal(files.has(entry.path), true, `npm package omits strict artifact entry: ${entry.path}`);
  }
  assert.equal(files.has(POM_RX_STRICT_ARTIFACT_MANIFEST_RELATIVE_PATH), true);
  assert.equal(files.has('sdk/typescript/pom-rx-strict-package.mjs'), true);
});

test('packaging boundary does not implement, wrap or downgrade strict verification semantics', () => {
  const source = readFileSync(
    path.join(repositoryRoot, 'sdk', 'typescript', 'pom-rx-strict-package.mjs'),
    'utf8',
  );
  assert.doesNotMatch(source, /verifyPomRxChainProfiled\s*\(/u);
  assert.doesNotMatch(source, /verifyPomRxChain\s*\(/u);
  assert.doesNotMatch(source, /verificationProfile:\s*['"]pom-rx\/0\.1/u);
  assert.match(source, /immutable_source_pin_required:\s*true/u);
  assert.match(source, /package_source_identity_proved:\s*false/u);
  assert.match(source, /policy_capability_required:\s*true/u);
});
