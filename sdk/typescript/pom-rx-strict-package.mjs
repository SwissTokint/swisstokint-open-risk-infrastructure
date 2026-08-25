import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const POM_RX_STRICT_PACKAGE_SCHEMA_VERSION = 'pom-rx-strict-package/1';
export const POM_RX_STRICT_PROFILE = 'pom-rx-v0.1/strict-errata-1';
export const POM_RX_STRICT_VERIFIER_VERSION = 'pom-rx-v0.1-strict-verifier/1';
export const POM_RX_STRICT_ARTIFACT_MANIFEST_RELATIVE_PATH =
  'core/strict-verification/pom-rx-v01-artifact-manifest.json';
export const POM_RX_STRICT_CASE_FOLDING_RELATIVE_PATH =
  'fixtures/pom-rx/support/unicode/17.0.0/CaseFolding.txt';
export const POM_RX_STRICT_ARTIFACT_SCANNER_RELATIVE_PATH =
  'sdk/typescript/internal/pom-rx-v01-artifact-identity.mjs';
export const POM_RX_STRICT_ARTIFACT_MANIFEST_SHA256 =
  '05c0f37091cd4aa6c97d0339cf785125e71424e3553c0d7545baf3ebf3eaca9f';
export const POM_RX_STRICT_IMPLEMENTATION_ARTIFACT_SHA256 =
  '72a187e56bba7d488e0ecb5510abba013b61322d1b599aa7d76b633bae5dc9eb';

// Capture the small Node bootstrap TCB immediately after module loading. This
// protects against later replacement of exported builtin functions, but it
// deliberately does not claim to detect pre-import/runtime compromise.
const cryptoCreateHash = createHash;
const fsLstatSync = lstatSync;
const fsReadFileSync = readFileSync;
const fsRealpathNative = realpathSync.native;
const pathDirname = path.dirname;
const pathIsAbsolute = path.isAbsolute;
const pathRelative = path.relative;
const pathResolve = path.resolve;
const pathSep = path.sep;
const posixIsAbsolute = path.posix.isAbsolute;
const posixNormalize = path.posix.normalize;
const urlFileURLToPath = fileURLToPath;
const jsonParse = JSON.parse;
const objectKeys = Object.keys;
const objectFreeze = Object.freeze;

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const MAX_MANIFEST_BYTES = 1024 * 1024;
const MAX_ENTRY_BYTES = 2 * 1024 * 1024;
const MAX_CLOSURE_BYTES = 8 * 1024 * 1024;
const EXPECTED_ENTRY_COUNT = 16;
const moduleDirectory = pathDirname(urlFileURLToPath(import.meta.url));
const packageRoot = pathResolve(moduleDirectory, '../..');

function sha256(bytes) {
  return cryptoCreateHash('sha256').update(bytes).digest('hex');
}

function assert(condition, message) {
  if (!condition) throw new TypeError(message);
}

function assertExactKeys(value, expected, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  const actual = objectKeys(value).sort();
  const wanted = [...expected].sort();
  assert(JSON.stringify(actual) === JSON.stringify(wanted), `${label} has missing or unknown fields`);
}

function assertPackageRoot() {
  const status = fsLstatSync(packageRoot, { bigint: true });
  assert(status.isDirectory() && !status.isSymbolicLink(), 'POM-RX strict package root must be a regular directory');
  assert(fsRealpathNative(packageRoot) === packageRoot, 'POM-RX strict package root must use its canonical native path');
}

function resolvePinnedEntry(relativePath) {
  assert(
    typeof relativePath === 'string'
      && relativePath.length > 0
      && relativePath.length <= 512
      && !relativePath.includes('\\')
      && !relativePath.includes('\0')
      && !posixIsAbsolute(relativePath)
      && posixNormalize(relativePath) === relativePath
      && relativePath !== '..'
      && !relativePath.startsWith('../'),
    'POM-RX strict artifact manifest contains an invalid entry path',
  );

  const fullPath = pathResolve(packageRoot, relativePath);
  const relativeToRoot = pathRelative(packageRoot, fullPath);
  assert(
    relativeToRoot !== ''
      && !pathIsAbsolute(relativeToRoot)
      && relativeToRoot !== '..'
      && !relativeToRoot.startsWith(`..${pathSep}`),
    'POM-RX strict artifact entry escapes the package root',
  );
  return fullPath;
}

function parsePinnedManifest(bytes) {
  assert(bytes.length > 0 && bytes.length <= MAX_MANIFEST_BYTES, 'POM-RX strict artifact manifest size is invalid');
  assert(
    sha256(bytes) === POM_RX_STRICT_ARTIFACT_MANIFEST_SHA256,
    'POM-RX strict artifact manifest digest differs from the bootstrap pin',
  );

  let manifest;
  try {
    manifest = jsonParse(bytes.toString('utf8'));
  } catch {
    throw new TypeError('POM-RX strict artifact manifest is not valid JSON');
  }

  assertExactKeys(
    manifest,
    [
      'artifact_manifest_schema_version',
      'artifact_id',
      'verifier_version',
      'verification_root',
      'entries',
      'implementation_artifact_sha256',
    ],
    'POM-RX strict artifact manifest',
  );
  assert(
    manifest.artifact_manifest_schema_version === 'pom-rx-verifier-artifact-manifest/1',
    'POM-RX strict artifact manifest schema differs from the bootstrap contract',
  );
  assert(manifest.artifact_id === 'pom-rx-v0.1-strict-verifier-1', 'POM-RX strict artifact id differs from the bootstrap contract');
  assert(manifest.verifier_version === POM_RX_STRICT_VERIFIER_VERSION, 'POM-RX strict verifier version differs from the bootstrap contract');
  assert(manifest.verification_root === 'package-root', 'POM-RX strict artifact verification root differs from the bootstrap contract');
  assert(
    manifest.implementation_artifact_sha256 === POM_RX_STRICT_IMPLEMENTATION_ARTIFACT_SHA256,
    'POM-RX strict implementation artifact digest differs from the bootstrap contract',
  );
  assert(Array.isArray(manifest.entries) && manifest.entries.length === EXPECTED_ENTRY_COUNT, 'POM-RX strict artifact entry count differs from the bootstrap contract');

  const seenPaths = new Set();
  let totalBytes = 0;
  const entries = manifest.entries.map((entry) => {
    assertExactKeys(entry, ['path', 'byte_length', 'sha256'], 'POM-RX strict artifact entry');
    resolvePinnedEntry(entry.path);
    assert(!seenPaths.has(entry.path), 'POM-RX strict artifact manifest contains a duplicate path');
    seenPaths.add(entry.path);
    assert(Number.isSafeInteger(entry.byte_length) && entry.byte_length > 0 && entry.byte_length <= MAX_ENTRY_BYTES, 'POM-RX strict artifact entry byte length is invalid');
    assert(typeof entry.sha256 === 'string' && HASH_PATTERN.test(entry.sha256), 'POM-RX strict artifact entry digest is invalid');
    totalBytes += entry.byte_length;
    assert(totalBytes <= MAX_CLOSURE_BYTES, 'POM-RX strict artifact closure exceeds the bootstrap byte limit');
    return objectFreeze({ ...entry });
  });

  assert(seenPaths.has(POM_RX_STRICT_ARTIFACT_SCANNER_RELATIVE_PATH), 'POM-RX strict artifact scanner is missing from the measured closure');
  assert(seenPaths.has(POM_RX_STRICT_CASE_FOLDING_RELATIVE_PATH), 'POM-RX strict Unicode support data is missing from the measured closure');

  return objectFreeze({
    ...manifest,
    entries: objectFreeze(entries),
  });
}

function verifyEntryBytes(entry) {
  const fullPath = resolvePinnedEntry(entry.path);
  let before;
  try {
    before = fsLstatSync(fullPath, { bigint: true });
  } catch {
    throw new TypeError(`POM-RX strict artifact entry cannot be inspected: ${entry.path}`);
  }
  assert(
    before.isFile() && !before.isSymbolicLink() && before.nlink === 1n,
    `POM-RX strict artifact entry is not a single-link regular file: ${entry.path}`,
  );
  assert(before.size === BigInt(entry.byte_length), `POM-RX strict artifact entry size differs: ${entry.path}`);
  assert(fsRealpathNative(fullPath) === fullPath, `POM-RX strict artifact entry path is not canonical: ${entry.path}`);

  let bytes;
  try {
    bytes = fsReadFileSync(fullPath);
  } catch {
    throw new TypeError(`POM-RX strict artifact entry cannot be read: ${entry.path}`);
  }

  const after = fsLstatSync(fullPath, { bigint: true });
  assert(
    after.dev === before.dev
      && after.ino === before.ino
      && after.size === before.size
      && after.mtimeNs === before.mtimeNs,
    `POM-RX strict artifact entry changed during bootstrap measurement: ${entry.path}`,
  );
  assert(bytes.length === entry.byte_length, `POM-RX strict artifact entry byte length differs: ${entry.path}`);
  assert(sha256(bytes) === entry.sha256, `POM-RX strict artifact entry digest differs: ${entry.path}`);
}

export const POM_RX_STRICT_PACKAGE_CONTRACT = objectFreeze({
  schema_version: POM_RX_STRICT_PACKAGE_SCHEMA_VERSION,
  bootstrap_entrypoint: 'sdk/typescript/pom-rx-strict-package.mjs',
  verifier_entrypoint: 'sdk/typescript/pom-rx-profiled.mjs',
  artifact_manifest_relative_path: POM_RX_STRICT_ARTIFACT_MANIFEST_RELATIVE_PATH,
  case_folding_relative_path: POM_RX_STRICT_CASE_FOLDING_RELATIVE_PATH,
  verifier_profile: POM_RX_STRICT_PROFILE,
  verifier_version: POM_RX_STRICT_VERIFIER_VERSION,
  artifact_manifest_sha256: POM_RX_STRICT_ARTIFACT_MANIFEST_SHA256,
  expected_implementation_artifact_sha256: POM_RX_STRICT_IMPLEMENTATION_ARTIFACT_SHA256,
  measured_entry_count: EXPECTED_ENTRY_COUNT,
  immutable_source_pin_required: true,
  immutable_runtime_filesystem_required: true,
  clean_node_process_required: true,
  node_builtin_integrity_proved: false,
  package_source_identity_proved: false,
  policy_capability_required: true,
  authorization_proved: false,
  external_execution_proved: false,
  financial_safety_proved: false,
});

export function getPomRxStrictPackageHostPins() {
  return objectFreeze({
    artifactManifestPath: pathResolve(packageRoot, POM_RX_STRICT_ARTIFACT_MANIFEST_RELATIVE_PATH),
    expectedArtifactManifestSha256: POM_RX_STRICT_ARTIFACT_MANIFEST_SHA256,
  });
}

export function verifyPomRxStrictMeasuredArtifactBytes() {
  assertPackageRoot();
  const hostPins = getPomRxStrictPackageHostPins();
  const manifestBytes = fsReadFileSync(hostPins.artifactManifestPath);
  const manifest = parsePinnedManifest(manifestBytes);

  for (const entry of manifest.entries) verifyEntryBytes(entry);

  return objectFreeze({
    schema_version: POM_RX_STRICT_PACKAGE_SCHEMA_VERSION,
    measured_artifact_bytes_integrity: 'verified',
    verifier_profile: POM_RX_STRICT_PROFILE,
    verifier_version: POM_RX_STRICT_VERIFIER_VERSION,
    artifact_manifest_sha256: POM_RX_STRICT_ARTIFACT_MANIFEST_SHA256,
    manifest_declared_implementation_artifact_sha256:
      POM_RX_STRICT_IMPLEMENTATION_ARTIFACT_SHA256,
    measured_entry_count: manifest.entries.length,
    measured_artifact_code_executed: false,
    immutable_source_pin_required: true,
    immutable_runtime_filesystem_required: true,
    clean_node_process_required: true,
    node_builtin_integrity_proved: false,
    package_source_identity_proved: false,
    policy_capability_required: true,
    authorization_proved: false,
    external_execution_proved: false,
    financial_safety_proved: false,
  });
}
