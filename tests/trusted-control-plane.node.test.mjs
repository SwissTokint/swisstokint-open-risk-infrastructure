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
    assert.equal(result.coverage.executionProved, false);
    assert.equal(result.coverage.manifestCount, 4);
    assert.equal(result.coverage.testCount, manifestPaths.length);
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

// Exercise the caller integration with ordinary file edits only. Fixture test
// bytes are copied for comparison and never imported or executed here.
test('trusted control plane rejects matching manifests that omit isolated-runner coverage', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'trusted-control-plane-coverage-'));
  const baseRoot = join(sandbox, 'base');
  const candidateRoot = join(sandbox, 'candidate');
  try {
    copyControlTree(baseRoot);
    copyControlTree(candidateRoot);
    for (const root of [baseRoot, candidateRoot]) {
      const manifest = join(root, '.github/trusted-security-tests.txt');
      writeFileSync(manifest, readFileSync(manifest, 'utf8').replace(
        'tests/pom-rx-strict-isolated-runner.node.test.mjs\n', '',
      ));
    }
    assert.throws(
      () => verifyTrustedControlPlane(baseRoot, candidateRoot),
      /isolated-runner coverage is required in the positive security manifest/u,
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

for (const relativePath of [
  'scripts/trusted-promise-data-preload.cjs',
  'tests/helpers/trusted-test-child.mjs',
  'tests/trusted-test-child.node.test.mjs',
  'tests/wallet-guard/trusted-provider-frozen-runtime.node.test.mjs',
  'scripts/verify-trusted-test-coverage.mjs',
  'tests/trusted-test-coverage.node.test.mjs',
  'tests/pom-rx-strict-isolated-runner.node.test.mjs',
  'tests/wallet-guard/prototype-server.node.test.mjs',
  'tests/wallet-guard/prototype-browser-rpc.node.test.mjs',
  'tests/wallet-guard/prototype-durable-journal.node.test.mjs',
]) {
  test(`trusted control plane rejects byte drift in integrated coverage: ${relativePath}`, () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'trusted-control-plane-coverage-drift-'));
    const baseRoot = join(sandbox, 'base');
    const candidateRoot = join(sandbox, 'candidate');
    try {
      copyControlTree(baseRoot);
      copyControlTree(candidateRoot);
      const filePath = join(candidateRoot, relativePath);
      writeFileSync(filePath, `${readFileSync(filePath, 'utf8')}\n// fixture byte drift\n`);
      assert.throws(
        () => verifyTrustedControlPlane(baseRoot, candidateRoot),
        /out-of-band bootstrap review|base-owned trusted test changed/u,
      );
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
}

for (const relativePath of [
  'tests/wallet-guard/prototype-server.node.test.mjs',
  'tests/wallet-guard/prototype-browser-rpc.node.test.mjs',
  'tests/wallet-guard/prototype-durable-journal.node.test.mjs',
]) {
  test(`trusted control plane rejects matching manifests that omit prototype coverage: ${relativePath}`, () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'trusted-prototype-coverage-'));
    const baseRoot = join(sandbox, 'base');
    const candidateRoot = join(sandbox, 'candidate');
    try {
      copyControlTree(baseRoot);
      copyControlTree(candidateRoot);
      for (const root of [baseRoot, candidateRoot]) {
        const manifest = join(root, '.github/trusted-security-tests.txt');
        writeFileSync(manifest, readFileSync(manifest, 'utf8').replace(`${relativePath}\n`, ''));
      }
      assert.throws(
        () => verifyTrustedControlPlane(baseRoot, candidateRoot),
        /prototype coverage is required in the positive security manifest/u,
      );
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
}
