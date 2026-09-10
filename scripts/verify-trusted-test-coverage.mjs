import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

export const TRUSTED_TEST_MANIFEST_PATHS = Object.freeze([
  '.github/trusted-security-tests.txt',
  '.github/trusted-mutation-security-tests.txt',
  '.github/trusted-child-tests.txt',
  '.github/trusted-expected-red-test.txt',
]);

export const REQUIRED_ISOLATED_RUNNER_TEST = 'tests/pom-rx-strict-isolated-runner.node.test.mjs';
export const REQUIRED_POSITIVE_SECURITY_TESTS = Object.freeze([
  REQUIRED_ISOLATED_RUNNER_TEST,
  'tests/wallet-guard/prototype-server.node.test.mjs',
  'tests/wallet-guard/prototype-browser-rpc.node.test.mjs',
  'tests/wallet-guard/prototype-durable-journal.node.test.mjs',
]);
const EXPECTED_RED_TEST = 'tests/pom-rx-integrity-baseline.node.test.mjs';
const MAX_MANIFEST_BYTES = 128 * 1024;
const MAX_TEST_BYTES = 2 * 1024 * 1024;
const MAX_TESTS_PER_MANIFEST = 128;

function canonicalRoot(root) {
  if (typeof root !== 'string' || root.length === 0) {
    throw new Error('trusted coverage requires explicit tree roots');
  }
  const canonical = realpathSync.native(resolve(root));
  if (!lstatSync(canonical).isDirectory()) {
    throw new Error('trusted coverage root must be a directory');
  }
  return canonical;
}

function readRegularBytes(root, relativePath, maxBytes) {
  const filePath = resolve(root, ...relativePath.split('/'));
  const stat = lstatSync(filePath);
  const observedPath = relative(root, realpathSync.native(filePath)).split(sep).join('/');
  if (!stat.isFile() || stat.isSymbolicLink() || observedPath !== relativePath) {
    throw new Error(`trusted coverage path must be a contained regular file: ${relativePath}`);
  }
  if (stat.size === 0 || stat.size > maxBytes) {
    throw new Error(`trusted coverage file size is invalid: ${relativePath}`);
  }
  const bytes = readFileSync(filePath);
  if (bytes.length !== stat.size || bytes.length > maxBytes) {
    throw new Error(`trusted coverage file changed while reading: ${relativePath}`);
  }
  return bytes;
}

function manifestPaths(bytes, manifestPath) {
  const text = bytes.toString('utf8').replace(/\r\n/gu, '\n');
  const paths = (text.endsWith('\n') ? text.slice(0, -1) : text).split('\n');
  if (paths.length === 0 || paths.length > MAX_TESTS_PER_MANIFEST) {
    throw new Error(`trusted coverage manifest cardinality is invalid: ${manifestPath}`);
  }
  for (const path of paths) {
    if (
      !/^tests\/[A-Za-z0-9._/-]+\.test\.mjs$/u.test(path)
      || path.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
    ) {
      throw new Error(`trusted coverage manifest path is invalid: ${manifestPath}`);
    }
  }
  return paths;
}

/**
 * Check declared coverage and byte identity before loading candidate code.
 * The caller must provide this base-owned module and stable, immutable trees.
 * Path/size checks do not prove filesystem immutability or close mutable-tree
 * races. Membership does not prove execution, child completion or CI authority.
 */
export function verifyTrustedTestCoverage(baseRoot, candidateRoot) {
  const base = canonicalRoot(baseRoot);
  const candidate = canonicalRoot(candidateRoot);
  const selectedTests = new Set();
  const missingPositiveTests = new Set(REQUIRED_POSITIVE_SECURITY_TESTS);

  for (const manifestPath of TRUSTED_TEST_MANIFEST_PATHS) {
    const baseBytes = readRegularBytes(base, manifestPath, MAX_MANIFEST_BYTES);
    const candidateBytes = readRegularBytes(candidate, manifestPath, MAX_MANIFEST_BYTES);
    if (!baseBytes.equals(candidateBytes)) {
      throw new Error(`base-owned trusted manifest changed: ${manifestPath}`);
    }
    const paths = manifestPaths(baseBytes, manifestPath);
    if (manifestPath === '.github/trusted-security-tests.txt') {
      for (const path of paths) missingPositiveTests.delete(path);
    }
    if (
      manifestPath === '.github/trusted-expected-red-test.txt'
      && (paths.length !== 1 || paths[0] !== EXPECTED_RED_TEST)
    ) {
      throw new Error('trusted expected-red manifest must preserve its reviewed singleton');
    }
    for (const testPath of paths) {
      if (selectedTests.has(testPath)) {
        throw new Error(`trusted test is listed more than once: ${testPath}`);
      }
      selectedTests.add(testPath);
      const baseTestBytes = readRegularBytes(base, testPath, MAX_TEST_BYTES);
      const candidateTestBytes = readRegularBytes(candidate, testPath, MAX_TEST_BYTES);
      if (!baseTestBytes.equals(candidateTestBytes)) {
        throw new Error(`base-owned trusted test changed: ${testPath}`);
      }
    }
  }
  if (missingPositiveTests.has(REQUIRED_ISOLATED_RUNNER_TEST)) {
    throw new Error('isolated-runner coverage is required in the positive security manifest');
  }
  if (missingPositiveTests.size > 0) {
    throw new Error(`prototype coverage is required in the positive security manifest: ${[...missingPositiveTests].join(', ')}`);
  }
  return Object.freeze({
    manifestCount: TRUSTED_TEST_MANIFEST_PATHS.length,
    testCount: selectedTests.size,
    testPaths: Object.freeze([...selectedTests]),
    executionProved: false,
  });
}
