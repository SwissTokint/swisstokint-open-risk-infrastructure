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
  POM_RX_STRICT_ARTIFACT_SCANNER_RELATIVE_PATH,
  POM_RX_STRICT_IMPLEMENTATION_ARTIFACT_SHA256,
  POM_RX_STRICT_PACKAGE_CONTRACT,
  POM_RX_STRICT_PACKAGE_SCHEMA_VERSION,
  getPomRxStrictPackageHostPins,
  verifyPomRxStrictMeasuredArtifactBytes,
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
    POM_RX_STRICT_PACKAGE_CONTRACT.expected_implementation_artifact_sha256,
    POM_RX_STRICT_IMPLEMENTATION_ARTIFACT_SHA256,
  );
  assert.equal(POM_RX_STRICT_PACKAGE_CONTRACT.measured_entry_count, 16);
  assert.equal(POM_RX_STRICT_PACKAGE_CONTRACT.immutable_source_pin_required, true);
  assert.equal(POM_RX_STRICT_PACKAGE_CONTRACT.immutable_runtime_filesystem_required, true);
  assert.equal(POM_RX_STRICT_PACKAGE_CONTRACT.clean_node_process_required, true);
  assert.equal(POM_RX_STRICT_PACKAGE_CONTRACT.node_builtin_integrity_proved, false);
  assert.equal(POM_RX_STRICT_PACKAGE_CONTRACT.package_source_identity_proved, false);
  assert.equal(POM_RX_STRICT_PACKAGE_CONTRACT.policy_capability_required, true);
  assert.equal(POM_RX_STRICT_PACKAGE_CONTRACT.authorization_proved, false);
  assert.equal(POM_RX_STRICT_PACKAGE_CONTRACT.external_execution_proved, false);
  assert.equal(POM_RX_STRICT_PACKAGE_CONTRACT.financial_safety_proved, false);
});

test('strict bootstrap host pins bind the exact bundled artifact manifest bytes', () => {
  const pins = getPomRxStrictPackageHostPins();
  assert.equal(path.isAbsolute(pins.artifactManifestPath), true);
  assert.equal(pins.expectedArtifactManifestSha256, POM_RX_STRICT_ARTIFACT_MANIFEST_SHA256);
  assert.equal(
    path.relative(repositoryRoot, pins.artifactManifestPath).replaceAll('\\', '/'),
    POM_RX_STRICT_ARTIFACT_MANIFEST_RELATIVE_PATH,
  );
  assert.equal(sha256(readFileSync(pins.artifactManifestPath)), POM_RX_STRICT_ARTIFACT_MANIFEST_SHA256);
});

test('strict bootstrap authenticates every declared artifact byte before measured code executes', () => {
  const report = verifyPomRxStrictMeasuredArtifactBytes();
  assert.equal(report.measured_artifact_bytes_integrity, 'verified');
  assert.equal(report.verifier_profile, 'pom-rx-v0.1/strict-errata-1');
  assert.equal(report.verifier_version, 'pom-rx-v0.1-strict-verifier/1');
  assert.equal(report.artifact_manifest_sha256, POM_RX_STRICT_ARTIFACT_MANIFEST_SHA256);
  assert.equal(
    report.manifest_declared_implementation_artifact_sha256,
    POM_RX_STRICT_IMPLEMENTATION_ARTIFACT_SHA256,
  );
  assert.equal(report.measured_entry_count, 16);
  assert.equal(report.measured_artifact_code_executed, false);
  assert.equal(report.immutable_source_pin_required, true);
  assert.equal(report.immutable_runtime_filesystem_required, true);
  assert.equal(report.clean_node_process_required, true);
  assert.equal(report.node_builtin_integrity_proved, false);
  assert.equal(report.package_source_identity_proved, false);
  assert.equal(report.policy_capability_required, true);
  assert.equal(report.authorization_proved, false);
});

test('the artifact identity scanner itself is authenticated as ordinary bytes by the bootstrap', () => {
  const manifest = JSON.parse(readFileSync(
    path.join(repositoryRoot, POM_RX_STRICT_ARTIFACT_MANIFEST_RELATIVE_PATH),
    'utf8',
  ));
  const scanner = manifest.entries.find(({ path: entryPath }) => (
    entryPath === POM_RX_STRICT_ARTIFACT_SCANNER_RELATIVE_PATH
  ));
  assert.ok(scanner, 'strict artifact scanner must be declared in the pinned manifest');
  const scannerBytes = readFileSync(path.join(repositoryRoot, ...scanner.path.split('/')));
  assert.equal(scannerBytes.length, scanner.byte_length);
  assert.equal(sha256(scannerBytes), scanner.sha256);
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

test('bootstrap imports no measured POM-RX code and keeps the Node TCB explicit', () => {
  const source = readFileSync(
    path.join(repositoryRoot, 'sdk', 'typescript', 'pom-rx-strict-package.mjs'),
    'utf8',
  );
  assert.doesNotMatch(source, /from\s+['"]\.\//u);
  assert.doesNotMatch(source, /import\s*\(/u);
  assert.doesNotMatch(source, /verifyPomRxChainProfiled\s*\(/u);
  assert.doesNotMatch(source, /verifyPomRxChain\s*\(/u);
  assert.doesNotMatch(source, /verificationProfile:\s*['"]pom-rx\/0\.1/u);
  assert.match(source, /const cryptoCreateHash = createHash;/u);
  assert.match(source, /const fsReadFileSync = readFileSync;/u);
  assert.match(source, /measured_artifact_code_executed:\s*false/u);
  assert.match(source, /clean_node_process_required:\s*true/u);
  assert.match(source, /node_builtin_integrity_proved:\s*false/u);
  assert.match(source, /immutable_source_pin_required:\s*true/u);
  assert.match(source, /immutable_runtime_filesystem_required:\s*true/u);
  assert.match(source, /package_source_identity_proved:\s*false/u);
  assert.match(source, /policy_capability_required:\s*true/u);
});
