import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { fail, parseExactJson, sha256Bytes } from './pom-rx-v01-fixture-contract.mjs';

export function assertRuntime(actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail('ENVIRONMENT_MISMATCH', 'runtime tuple differs from immutable fixture provenance', { expected, actual });
}

export function assertRuntimeBeforeCanary(actual, expected, verify) {
  assertRuntime(actual, expected);
  return verify();
}

export function assertGitSourceBinding(git, sourceBaseline, sourceFiles) {
  for (const [relativePath, expectedBlob, expectedSha] of sourceFiles) {
    if (git(['rev-parse', `${sourceBaseline}:${relativePath}`]).trim() !== expectedBlob) fail('SOURCE_BINDING_MISMATCH', 'Git blob identity differs', { path: relativePath });
    const rawBlob = git(['cat-file', 'blob', `${sourceBaseline}:${relativePath}`], { encoding: null });
    if (!Buffer.isBuffer(rawBlob) || sha256Bytes(rawBlob) !== expectedSha) fail('SOURCE_BINDING_MISMATCH', 'raw Git blob bytes or digest differ', { path: relativePath });
  }
}

export function snapshotFrozenSource(sourceRoot, sourceFiles) {
  return new Map(sourceFiles.map(([relativePath, , expectedSha]) => {
    const digest = sha256Bytes(readFileSync(path.join(sourceRoot, ...relativePath.split('/'))));
    if (digest !== expectedSha) fail('SOURCE_BINDING_MISMATCH', 'frozen source differs immediately before execution', { path: relativePath });
    return [relativePath, digest];
  }));
}

export function assertFrozenSourceUnchanged(sourceRoot, before) {
  for (const [relativePath, beforeDigest] of before) {
    if (sha256Bytes(readFileSync(path.join(sourceRoot, ...relativePath.split('/')))) !== beforeDigest) fail('SOURCE_BINDING_MISMATCH', 'frozen source changed during execution', { path: relativePath });
  }
}

export function assertImportedModuleUrl(importUrl, pomRxPath) {
  const expectedUrl = pathToFileURL(pomRxPath).href;
  if (importUrl !== expectedUrl) fail('SOURCE_BINDING_MISMATCH', 'imported module URL differs from the exact hashed path', { expected: expectedUrl, actual: importUrl });
}

export function verifyCanary(canaryInputBytes, canaryExpectedBytes, expectedSha) {
  if (sha256Bytes(canaryInputBytes) !== '811d8ff308bf40f503b1d0b27ede1e1cf2ec952b191dd90fbfef8e5601888c9b' || sha256Bytes(canaryExpectedBytes) !== expectedSha) fail('CANARY_DIGEST_MISMATCH', 'canary bytes differ');
  const canaryInput = parseExactJson(canaryInputBytes, 'canary input', { terminalLf: false });
  const canaryExpected = parseExactJson(canaryExpectedBytes, 'canary expected', { terminalLf: false });
  if (JSON.stringify([...canaryInput].sort((left, right) => left.localeCompare(right))) !== JSON.stringify(canaryExpected)) fail('CANARY_ORDER_MISMATCH', 'localeCompare canary differs');
}
