import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export const REVIEWED_YAML_ARTIFACT = Object.freeze({
  dependency: '2.9.0',
  integrity: 'sha512-2AvhNX3mb8zd6Zy7INTtSpl1F15HW6Wnqj0srWlkKLcpYl/gMIMJiyuGq2KeI2YFxUPjdlB+3Lc10seMLtL4cA==',
  resolved: 'https://registry.npmjs.org/yaml/-/yaml-2.9.0.tgz',
  version: '2.9.0',
});

export const IMMUTABLE_CONTROL_PATHS = Object.freeze([
  '.github/trusted-security-tests.txt',
  '.github/trusted-expected-red-test.txt',
  '.github/workflows/ci.yml',
  '.github/workflows/exact-main-ci-status.yml',
  '.github/workflows/trusted-pr-security.yml',
  'scripts/assert-pom-rx-integrity-baseline-red.mjs',
  'scripts/invalidate-trusted-pr-head-status.mjs',
  'scripts/publish-trusted-pr-status.mjs',
  'scripts/trusted-assert-preload.mjs',
  'scripts/trusted-expected-red-reporter.mjs',
  'scripts/trusted-test-loader-register.mjs',
  'scripts/trusted-test-loader.mjs',
  'scripts/trusted-test-reporter.mjs',
  'scripts/verify-trusted-control-plane.mjs',
  'tests/ci-action-pinning.node.test.mjs',
  'tests/fixtures/trusted-runner/builtin-export-poison-candidate.mjs',
  'tests/fixtures/trusted-runner/builtin-export-poison.test.mjs',
  'tests/fixtures/trusted-runner/forged-summary-candidate.mjs',
  'tests/fixtures/trusted-runner/forged-summary.test.mjs',
  'tests/fixtures/trusted-runner/lifecycle-stream-forgery-candidate.mjs',
  'tests/fixtures/trusted-runner/lifecycle-stream-forgery.test.mjs',
  'tests/fixtures/trusted-runner/loader-hook-forgery-blocked-a.test.mjs',
  'tests/fixtures/trusted-runner/loader-hook-forgery-blocked-b.test.mjs',
  'tests/fixtures/trusted-runner/loader-hook-forgery-bootstrap.test.mjs',
  'tests/fixtures/trusted-runner/loader-hook-forgery-candidate.mjs',
  'tests/fixtures/trusted-runner/loader-hook-forgery-hook.mjs',
  'tests/fixtures/trusted-runner/primordial-poison-candidate.mjs',
  'tests/fixtures/trusted-runner/primordial-poison.test.mjs',
  'tests/fixtures/trusted-runner/process-emit-shadow.test.mjs',
  'tests/fixtures/trusted-runner/process-execve-replacement.test.mjs',
  'tests/fixtures/trusted-runner/runtime-instance-poison-candidate.mjs',
  'tests/fixtures/trusted-runner/runtime-instance-poison.test.mjs',
  'tests/fixtures/trusted-runner/runtime-primordial-poison-candidate.mjs',
  'tests/fixtures/trusted-runner/runtime-primordial-poison.test.mjs',
  'tests/fixtures/trusted-runner/self-restoring-instance-poison-candidate.mjs',
  'tests/fixtures/trusted-runner/self-restoring-instance-poison.test.mjs',
  'tests/pom-rx-post-merge-assurance-policy.node.test.mjs',
  'tests/pom-rx-v01-compat-fixtures.node.test.mjs',
  'tests/trusted-assert-preload.node.test.mjs',
  'tests/trusted-control-plane.node.test.mjs',
  'tests/trusted-pr-security-workflow.node.test.mjs',
  'tests/trusted-pr-status-publisher.node.test.mjs',
  'tests/trusted-test-reporter.node.test.mjs',
]);

function readRegularBytes(root, relativePath) {
  const rootPath = realpathSync.native(resolve(root));
  const filePath = resolve(rootPath, ...relativePath.split('/'));
  const fileStat = lstatSync(filePath);
  const observedRelativePath = relative(rootPath, realpathSync.native(filePath))
    .split(sep)
    .join('/');
  if (!fileStat.isFile() || fileStat.isSymbolicLink() || observedRelativePath !== relativePath) {
    throw new Error(`trusted control path is not a contained regular file: ${relativePath}`);
  }
  return readFileSync(filePath);
}

function readJson(root, relativePath) {
  return JSON.parse(readRegularBytes(root, relativePath).toString('utf8'));
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function verifyTrustedControlPlane(baseRoot, candidateRoot) {
  for (const relativePath of IMMUTABLE_CONTROL_PATHS) {
    const baseBytes = readRegularBytes(baseRoot, relativePath);
    const candidateBytes = readRegularBytes(candidateRoot, relativePath);
    if (!baseBytes.equals(candidateBytes)) {
      throw new Error(`trusted control-plane change requires out-of-band bootstrap review: ${relativePath}`);
    }
  }

  const manifestText = readRegularBytes(baseRoot, '.github/trusted-security-tests.txt')
    .toString('utf8')
    .replace(/\r\n/gu, '\n')
    .trim();
  const manifestPaths = manifestText.split('\n');
  if (manifestPaths.length === 0 || manifestPaths.length > 128) {
    throw new Error('trusted manifest cardinality is invalid');
  }
  for (const relativePath of manifestPaths) {
    if (
      !/^tests\/[A-Za-z0-9._/-]+\.test\.mjs$/u.test(relativePath)
      || relativePath.split('/').some((segment) => segment === '.' || segment === '..')
    ) {
      throw new Error(`trusted manifest path is invalid: ${relativePath}`);
    }
    const baseBytes = readRegularBytes(baseRoot, relativePath);
    const candidateBytes = readRegularBytes(candidateRoot, relativePath);
    if (!baseBytes.equals(candidateBytes)) {
      throw new Error(`base-owned trusted test changed in-band: ${relativePath}`);
    }
  }

  const basePackage = readJson(baseRoot, 'package.json');
  const candidatePackage = readJson(candidateRoot, 'package.json');
  if (!sameJson(basePackage.scripts, candidatePackage.scripts)) {
    throw new Error('package scripts are part of the immutable trusted command plane');
  }
  if (candidatePackage.devDependencies?.yaml !== REVIEWED_YAML_ARTIFACT.dependency) {
    throw new Error('candidate yaml dependency is not the reviewed artifact');
  }

  const candidateLock = readJson(candidateRoot, 'package-lock.json');
  const rootLock = candidateLock.packages?.[''];
  const yamlLock = candidateLock.packages?.['node_modules/yaml'];
  if (
    rootLock?.devDependencies?.yaml !== REVIEWED_YAML_ARTIFACT.dependency
    || yamlLock?.version !== REVIEWED_YAML_ARTIFACT.version
    || yamlLock?.resolved !== REVIEWED_YAML_ARTIFACT.resolved
    || yamlLock?.integrity !== REVIEWED_YAML_ARTIFACT.integrity
  ) {
    throw new Error('candidate lockfile does not bind the reviewed yaml registry artifact');
  }
  return Object.freeze({ protectedPaths: IMMUTABLE_CONTROL_PATHS.length });
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  const baseRoot = process.env.TRUSTED_BASE_ROOT;
  const candidateRoot = process.env.CANDIDATE_ROOT;
  if (!baseRoot || !candidateRoot) throw new Error('missing trusted control-plane roots');
  verifyTrustedControlPlane(baseRoot, candidateRoot);
}
