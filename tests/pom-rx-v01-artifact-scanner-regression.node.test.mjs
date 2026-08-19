import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  computePomRxArtifactDigest,
  verifyPomRxArtifactIdentityTestOnly,
} from '../sdk/typescript/internal/pom-rx-v01-artifact-identity.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const caseFoldingPath = path.join(
  repositoryRoot,
  'fixtures',
  'pom-rx',
  'support',
  'unicode',
  '17.0.0',
  'CaseFolding.txt',
);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const metadata = () => ({ reparse: false, streams: ['::$DATA'] });

function withTempDirectory(callback) {
  const directory = realpathSync.native(mkdtempSync(path.join(os.tmpdir(), 'pom-rx-scanner-')));
  try {
    return callback(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function verifySource(source) {
  return withTempDirectory((directory) => {
    const moduleBytes = Buffer.from(source, 'utf8');
    const modulePath = path.join(directory, 'module.mjs');
    writeFileSync(modulePath, moduleBytes);

    const implementationArtifactSha256 = computePomRxArtifactDigest([
      { path: 'module.mjs', bytes: moduleBytes },
    ]);
    const manifest = {
      artifact_manifest_schema_version: 'pom-rx-verifier-artifact-manifest/1',
      artifact_id: 'scanner-regression-fixture',
      verifier_version: 'pom-rx-v0.1-strict-verifier/1',
      verification_root: 'package-root',
      entries: [{
        path: 'module.mjs',
        byte_length: moduleBytes.byteLength,
        sha256: sha256(moduleBytes),
      }],
      implementation_artifact_sha256: implementationArtifactSha256,
    };
    const manifestBytes = Buffer.from(JSON.stringify(manifest), 'utf8');
    const manifestPath = path.join(directory, 'artifact-manifest.json');
    writeFileSync(manifestPath, manifestBytes);

    return verifyPomRxArtifactIdentityTestOnly({
      packageRoot: directory,
      artifactManifestPath: manifestPath,
      expectedArtifactManifestSha256: sha256(manifestBytes),
      caseFoldingPath,
      inspectPathMetadata: metadata,
    });
  });
}

test('artifact scanner accepts static arrays and for-of array expressions', () => {
  const result = verifySource(`
const forbiddenNamesAsData = ['Function', 'eval', 'constructor'];
const output = Object.create(null);
for (const key of ['alpha', 'beta']) {
  output[key] = key;
}
export { forbiddenNamesAsData, output };
`);
  assert.match(result.implementation_artifact_sha256, /^[a-f0-9]{64}$/u);
});

test('artifact scanner still rejects literal string-computed member access', () => {
  assert.throws(
    () => verifySource(`
const object = Object.create(null);
void object['constructor'];
export { object };
`),
    (error) => error?.code === 'POMRX_V01_E_ARTIFACT_MANIFEST_INVALID'
      && /String-computed member access is forbidden/u.test(error.message),
  );
});
