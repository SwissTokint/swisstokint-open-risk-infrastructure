import assert from 'node:assert/strict';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  IMMUTABLE_CONTROL_PATHS,
  verifyTrustedControlPlane,
} from '../scripts/verify-trusted-control-plane.mjs';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const manifestPaths = [
  '.github/trusted-security-tests.txt',
  '.github/trusted-mutation-security-tests.txt',
  '.github/trusted-child-tests.txt',
  '.github/trusted-expected-red-test.txt',
].flatMap((relativePath) => readFileSync(
  join(repositoryRoot, relativePath),
  'utf8',
).replace(/\r\n/gu, '\n').trim().split('\n'));

assert.ok(IMMUTABLE_CONTROL_PATHS.includes(
  'tests/pom-rx-post-merge-assurance-policy.node.test.mjs',
));
assert.ok(IMMUTABLE_CONTROL_PATHS.includes(
  'tests/pom-rx-v01-compat-fixtures.node.test.mjs',
));
assert.ok(IMMUTABLE_CONTROL_PATHS.includes(
  'tests/fixtures/trusted-runner/self-restoring-instance-poison.test.mjs',
));
assert.ok(manifestPaths.includes(
  'tests/wallet-guard/security-intent-shape-regressions.node.test.mjs',
));
assert.ok(manifestPaths.includes(
  'tests/fixtures/trusted-runner/authenticated-child-source.test.mjs',
));

function copyControlTree(targetRoot) {
  const paths = new Set([
    ...IMMUTABLE_CONTROL_PATHS,
    ...manifestPaths,
    'package.json',
    'package-lock.json',
  ]);
  for (const relativePath of paths) {
    const destination = join(targetRoot, relativePath);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(repositoryRoot, relativePath), destination);
  }
}

test('trusted control plane accepts byte-identical reviewed controls', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'trusted-control-plane-'));
  const baseRoot = join(sandbox, 'base');
  const candidateRoot = join(sandbox, 'candidate');
  try {
    copyControlTree(baseRoot);
    copyControlTree(candidateRoot);
    const result = verifyTrustedControlPlane(baseRoot, candidateRoot);
    assert.equal(result.protectedPaths, IMMUTABLE_CONTROL_PATHS.length);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('trusted control plane rejects workflow, command and parser drift', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'trusted-control-plane-red-'));
  const baseRoot = join(sandbox, 'base');
  const candidateRoot = join(sandbox, 'candidate');
  try {
    copyControlTree(baseRoot);
    copyControlTree(candidateRoot);

    const workflowPath = join(candidateRoot, '.github/workflows/trusted-pr-security.yml');
    writeFileSync(workflowPath, `${readFileSync(workflowPath, 'utf8')}\n# candidate drift\n`);
    assert.throws(
      () => verifyTrustedControlPlane(baseRoot, candidateRoot),
      /out-of-band bootstrap review/u,
    );
    copyFileSync(join(baseRoot, '.github/workflows/trusted-pr-security.yml'), workflowPath);

    const packagePath = join(candidateRoot, 'package.json');
    const candidatePackage = JSON.parse(readFileSync(packagePath, 'utf8'));
    candidatePackage.scripts.test = 'true';
    writeFileSync(packagePath, `${JSON.stringify(candidatePackage, null, 2)}\n`);
    assert.throws(
      () => verifyTrustedControlPlane(baseRoot, candidateRoot),
      /immutable trusted command plane/u,
    );
    copyFileSync(join(baseRoot, 'package.json'), packagePath);

    const lockPath = join(candidateRoot, 'package-lock.json');
    const candidateLock = JSON.parse(readFileSync(lockPath, 'utf8'));
    candidateLock.packages['node_modules/yaml'].resolved = 'https://attacker.invalid/yaml.tgz';
    writeFileSync(lockPath, `${JSON.stringify(candidateLock, null, 2)}\n`);
    assert.throws(
      () => verifyTrustedControlPlane(baseRoot, candidateRoot),
      /reviewed yaml registry artifact/u,
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('trusted control plane rejects a protected path redirected through a symlink', {
  skip: process.platform === 'win32',
}, () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'trusted-control-plane-link-'));
  const baseRoot = join(sandbox, 'base');
  const candidateRoot = join(sandbox, 'candidate');
  try {
    copyControlTree(baseRoot);
    copyControlTree(candidateRoot);
    const candidatePackagePath = join(candidateRoot, 'package.json');
    unlinkSync(candidatePackagePath);
    symlinkSync(join(baseRoot, 'package.json'), candidatePackagePath, 'file');
    assert.throws(
      () => verifyTrustedControlPlane(baseRoot, candidateRoot),
      /not a contained regular file/u,
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
