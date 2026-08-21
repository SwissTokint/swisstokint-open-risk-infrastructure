#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  computePomRxArtifactDigest,
} from '../sdk/typescript/internal/pom-rx-v01-artifact-identity.mjs';

const outputPath = process.argv[2];
if (!outputPath) {
  throw new Error('Usage: node scripts/generate-pom-rx-v01-strict-artifact-manifest.mjs <output.json>');
}

const CLOSURE = [
  'core/strict-verification/pom-rx-v01-profiled-verifier.mjs',
  'fixtures/pom-rx/support/unicode/17.0.0/CaseFolding.txt',
  'fixtures/pom-rx/v0.1-compat/1/canaries/localecompare-order-v1.expected.json',
  'fixtures/pom-rx/v0.1-compat/1/canaries/localecompare-order-v1.input.json',
  'sdk/typescript/internal/pom-rx-v01-action-continuity.mjs',
  'sdk/typescript/internal/pom-rx-v01-artifact-identity.mjs',
  'sdk/typescript/internal/pom-rx-v01-diagnostics.mjs',
  'sdk/typescript/internal/pom-rx-v01-execution-assertion-consistency.mjs',
  'sdk/typescript/internal/pom-rx-v01-input-continuity.mjs',
  'sdk/typescript/internal/pom-rx-v01-policy-capability.mjs',
  'sdk/typescript/internal/pom-rx-v01-receipt-id-uniqueness.mjs',
  'sdk/typescript/internal/pom-rx-v01-reconciliation-assertion-consistency.mjs',
  'sdk/typescript/internal/pom-rx-v01-verdict.mjs',
  'sdk/typescript/pom-rx-profiled.mjs',
  'sdk/typescript/pom-rx.mjs',
  'sdk/typescript/swisstokint-proof.mjs',
];

function compareUnicodeScalars(left, right) {
  const a = Array.from(left, (character) => character.codePointAt(0));
  const b = Array.from(right, (character) => character.codePointAt(0));
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

const entriesWithBytes = [...CLOSURE]
  .sort(compareUnicodeScalars)
  .map((relativePath) => ({
    path: relativePath,
    bytes: readFileSync(path.resolve(relativePath)),
  }));
const entries = entriesWithBytes.map(({ path: relativePath, bytes }) => ({
  path: relativePath,
  byte_length: bytes.length,
  sha256: sha256(bytes),
}));
const manifest = {
  artifact_manifest_schema_version: 'pom-rx-verifier-artifact-manifest/1',
  artifact_id: 'pom-rx-v0.1-strict-verifier-1',
  verifier_version: 'pom-rx-v0.1-strict-verifier/1',
  verification_root: 'package-root',
  entries,
  implementation_artifact_sha256: computePomRxArtifactDigest(entriesWithBytes),
};

const bytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n', 'utf8');
writeFileSync(outputPath, bytes, { flag: 'wx' });
process.stderr.write(bytes);
process.stdout.write(bytes);
