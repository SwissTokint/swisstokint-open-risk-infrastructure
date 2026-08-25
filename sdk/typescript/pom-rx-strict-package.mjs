import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  verifyPomRxArtifactIdentity,
} from './internal/pom-rx-v01-artifact-identity.mjs';
import {
  POM_RX_V01_STRICT_PROFILE,
  POM_RX_V01_STRICT_VERIFIER_VERSION,
} from './pom-rx-profiled.mjs';

export const POM_RX_STRICT_PACKAGE_SCHEMA_VERSION = 'pom-rx-strict-package/1';
export const POM_RX_STRICT_ARTIFACT_MANIFEST_RELATIVE_PATH =
  'core/strict-verification/pom-rx-v01-artifact-manifest.json';
export const POM_RX_STRICT_CASE_FOLDING_RELATIVE_PATH =
  'fixtures/pom-rx/support/unicode/17.0.0/CaseFolding.txt';
export const POM_RX_STRICT_ARTIFACT_MANIFEST_SHA256 =
  '05c0f37091cd4aa6c97d0339cf785125e71424e3553c0d7545baf3ebf3eaca9f';
export const POM_RX_STRICT_IMPLEMENTATION_ARTIFACT_SHA256 =
  '72a187e56bba7d488e0ecb5510abba013b61322d1b599aa7d76b633bae5dc9eb';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(moduleDirectory, '../..');

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export const POM_RX_STRICT_PACKAGE_CONTRACT = Object.freeze({
  schema_version: POM_RX_STRICT_PACKAGE_SCHEMA_VERSION,
  verifier_entrypoint: 'sdk/typescript/pom-rx-profiled.mjs',
  artifact_manifest_relative_path: POM_RX_STRICT_ARTIFACT_MANIFEST_RELATIVE_PATH,
  case_folding_relative_path: POM_RX_STRICT_CASE_FOLDING_RELATIVE_PATH,
  verifier_profile: POM_RX_V01_STRICT_PROFILE,
  verifier_version: POM_RX_V01_STRICT_VERIFIER_VERSION,
  artifact_manifest_sha256: POM_RX_STRICT_ARTIFACT_MANIFEST_SHA256,
  implementation_artifact_sha256: POM_RX_STRICT_IMPLEMENTATION_ARTIFACT_SHA256,
  policy_capability_required: true,
  authorization_proved: false,
  external_execution_proved: false,
  financial_safety_proved: false,
});

export function getPomRxStrictPackageHostPins() {
  return Object.freeze({
    artifactManifestPath: path.join(
      packageRoot,
      POM_RX_STRICT_ARTIFACT_MANIFEST_RELATIVE_PATH,
    ),
    expectedArtifactManifestSha256: POM_RX_STRICT_ARTIFACT_MANIFEST_SHA256,
  });
}

export function verifyPomRxStrictPackageIntegrity() {
  const hostPins = getPomRxStrictPackageHostPins();
  const manifestBytes = readFileSync(hostPins.artifactManifestPath);
  const observedManifestSha256 = sha256(manifestBytes);

  if (observedManifestSha256 !== hostPins.expectedArtifactManifestSha256) {
    throw new TypeError('POM-RX strict artifact manifest digest differs from the packaged host pin');
  }

  const identity = verifyPomRxArtifactIdentity({
    packageRoot,
    artifactManifestPath: hostPins.artifactManifestPath,
    expectedArtifactManifestSha256: hostPins.expectedArtifactManifestSha256,
    caseFoldingPath: path.join(packageRoot, POM_RX_STRICT_CASE_FOLDING_RELATIVE_PATH),
  });

  if (identity.verifier_version !== POM_RX_V01_STRICT_VERIFIER_VERSION
    || identity.implementation_artifact_sha256 !== POM_RX_STRICT_IMPLEMENTATION_ARTIFACT_SHA256
    || identity.expected_implementation_artifact_sha256 !== POM_RX_STRICT_IMPLEMENTATION_ARTIFACT_SHA256
    || identity.observed_implementation_artifact_sha256 !== POM_RX_STRICT_IMPLEMENTATION_ARTIFACT_SHA256) {
    throw new TypeError('POM-RX strict packaged implementation identity differs from the pinned contract');
  }

  return Object.freeze({
    schema_version: POM_RX_STRICT_PACKAGE_SCHEMA_VERSION,
    package_integrity: 'verified',
    verifier_profile: POM_RX_V01_STRICT_PROFILE,
    verifier_version: POM_RX_V01_STRICT_VERIFIER_VERSION,
    artifact_manifest_sha256: observedManifestSha256,
    implementation_artifact_sha256: identity.implementation_artifact_sha256,
    policy_capability_required: true,
    authorization_proved: false,
    external_execution_proved: false,
    financial_safety_proved: false,
  });
}
