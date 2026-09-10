import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import {
  REQUIRED_ISOLATED_RUNNER_TEST,
  REQUIRED_POSITIVE_SECURITY_TESTS,
  TRUSTED_TEST_MANIFEST_PATHS,
  verifyTrustedTestCoverage,
} from '../scripts/verify-trusted-test-coverage.mjs';

const POSITIVE = '.github/trusted-security-tests.txt';
const MUTATION = '.github/trusted-mutation-security-tests.txt';
const CHILD = '.github/trusted-child-tests.txt';
const EXPECTED_RED = '.github/trusted-expected-red-test.txt';
const BASELINE_TEST = 'tests/pom-rx-integrity-baseline.node.test.mjs';
// Keep the required contract explicit in fixtures, independent of the validator.
const PROTOTYPE_TESTS = Object.freeze([
  'tests/wallet-guard/prototype-server.node.test.mjs',
  'tests/wallet-guard/prototype-browser-rpc.node.test.mjs',
  'tests/wallet-guard/prototype-durable-journal.node.test.mjs',
]);
const fixtureManifests = Object.freeze({
  [POSITIVE]: [REQUIRED_ISOLATED_RUNNER_TEST, 'tests/ordinary-positive.test.mjs', ...PROTOTYPE_TESTS],
  [MUTATION]: ['tests/ordinary-mutation.test.mjs'],
  [CHILD]: ['tests/ordinary-child.test.mjs'],
  [EXPECTED_RED]: [BASELINE_TEST],
});

function write(root, path, content) {
  const destination = join(root, path);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, content);
}

function withTrees(t) {
  const directory = mkdtempSync(join(tmpdir(), 'trusted-coverage-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const roots = [join(directory, 'base'), join(directory, 'candidate')];
  for (const root of roots) {
    for (const [manifest, paths] of Object.entries(fixtureManifests)) {
      write(root, manifest, `${paths.join('\n')}\n`);
      for (const path of paths) {
        // Ordinary data only. These files are compared, never imported or run.
        write(root, path, 'export const ordinaryFixture = 1;\n');
      }
    }
  }
  return { base: roots[0], candidate: roots[1], roots };
}

test('coverage validates identical complete declarations without claiming execution', (t) => {
  const { base, candidate } = withTrees(t);
  const result = verifyTrustedTestCoverage(base, candidate);
  assert.equal(result.manifestCount, 4);
  assert.equal(result.testCount, 8);
  assert.deepEqual(result.testPaths, Object.values(fixtureManifests).flat());
  assert.equal(result.executionProved, false);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.testPaths));
  assert.ok(Object.isFrozen(TRUSTED_TEST_MANIFEST_PATHS));
  assert.ok(Object.isFrozen(REQUIRED_POSITIVE_SECURITY_TESTS));
  assert.deepEqual(REQUIRED_POSITIVE_SECURITY_TESTS, [REQUIRED_ISOLATED_RUNNER_TEST, ...PROTOTYPE_TESTS]);
});

test('each prototype suite is required even when both trees omit it identically', async (t) => {
  for (const path of PROTOTYPE_TESTS) {
    await t.test(path, (t) => {
      const { base, candidate, roots } = withTrees(t);
      for (const root of roots) {
        write(root, POSITIVE, `${fixtureManifests[POSITIVE].filter((entry) => entry !== path).join('\n')}\n`);
      }
      assert.throws(() => verifyTrustedTestCoverage(base, candidate), (error) => {
        assert.match(error.message, /prototype coverage is required in the positive security manifest/u);
        assert.ok(error.message.includes(path));
        return true;
      });
    });
  }
});

test('prototype coverage cannot be moved to mutation, child or expected-red lanes', async (t) => {
  for (const path of PROTOTYPE_TESTS) {
    for (const lane of [MUTATION, CHILD, EXPECTED_RED]) {
      await t.test(`${path} -> ${lane}`, (t) => {
        const { base, candidate, roots } = withTrees(t);
        for (const root of roots) {
          write(root, POSITIVE, `${fixtureManifests[POSITIVE].filter((entry) => entry !== path).join('\n')}\n`);
          write(root, lane, `${fixtureManifests[lane].join('\n')}\n${path}\n`);
        }
        assert.throws(() => verifyTrustedTestCoverage(base, candidate), lane === EXPECTED_RED
          ? /expected-red manifest must preserve its reviewed singleton/u
          : /prototype coverage is required in the positive security manifest/u);
      });
    }
  }
});

test('identical manifests cannot omit required isolated-runner coverage', (t) => {
  const { base, candidate, roots } = withTrees(t);
  for (const root of roots) write(root, POSITIVE, 'tests/ordinary-positive.test.mjs\n');
  assert.throws(() => verifyTrustedTestCoverage(base, candidate), /isolated-runner coverage is required/u);
});

test('required coverage cannot be routed only to mutation or child manifests', async (t) => {
  for (const lane of [MUTATION, CHILD]) {
    await t.test(lane, (t) => {
      const { base, candidate, roots } = withTrees(t);
      for (const root of roots) {
        write(root, POSITIVE, 'tests/ordinary-positive.test.mjs\n');
        write(root, lane, `${fixtureManifests[lane][0]}\n${REQUIRED_ISOLATED_RUNNER_TEST}\n`);
      }
      assert.throws(() => verifyTrustedTestCoverage(base, candidate), /isolated-runner coverage is required/u);
    });
  }
});

test('expected-red routing preserves exactly the existing baseline suite', async (t) => {
  for (const paths of [[REQUIRED_ISOLATED_RUNNER_TEST], [BASELINE_TEST, REQUIRED_ISOLATED_RUNNER_TEST]]) {
    await t.test(paths.join(','), (t) => {
      const { base, candidate, roots } = withTrees(t);
      for (const root of roots) write(root, EXPECTED_RED, `${paths.join('\n')}\n`);
      assert.throws(() => verifyTrustedTestCoverage(base, candidate), /expected-red manifest must preserve/u);
    });
  }
});

test('all referenced tests retain base byte identity across every manifest', async (t) => {
  for (const path of Object.values(fixtureManifests).flat()) {
    await t.test(path, (t) => {
      const { base, candidate } = withTrees(t);
      write(candidate, path, 'export const ordinaryFixture = 2;\n');
      assert.throws(() => verifyTrustedTestCoverage(base, candidate), /base-owned trusted test changed/u);
    });
  }
});

test('every manifest retains byte identity including line endings', async (t) => {
  for (const manifest of TRUSTED_TEST_MANIFEST_PATHS) {
    await t.test(manifest, (t) => {
      const { base, candidate } = withTrees(t);
      write(candidate, manifest, `${fixtureManifests[manifest].join('\r\n')}\r\n`);
      assert.throws(() => verifyTrustedTestCoverage(base, candidate), /base-owned trusted manifest changed/u);
    });
  }
});

test('duplicate coverage is rejected within and between manifests', async (t) => {
  for (const manifest of [POSITIVE, CHILD]) {
    await t.test(manifest, (t) => {
      const { base, candidate, roots } = withTrees(t);
      for (const root of roots) {
        write(root, manifest, `${fixtureManifests[manifest].join('\n')}\n${REQUIRED_ISOLATED_RUNNER_TEST}\n`);
      }
      assert.throws(() => verifyTrustedTestCoverage(base, candidate), /listed more than once/u);
    });
  }
});

test('invalid declaration syntax is rejected before reading a test path', async (t) => {
  for (const path of ['', 'tests/../ordinary.test.mjs', 'tests//ordinary.test.mjs', '/tests/ordinary.test.mjs', 'tests/ordinary.test.js']) {
    await t.test(JSON.stringify(path), (t) => {
      const { base, candidate, roots } = withTrees(t);
      for (const root of roots) write(root, POSITIVE, `${path}\n`);
      assert.throws(() => verifyTrustedTestCoverage(base, candidate), /manifest path is invalid/u);
    });
  }
});

test('declarations have a bounded entry count and byte size', async (t) => {
  for (const [label, content, expected] of [
    ['entry count', `${Array.from({ length: 129 }, (_, index) => `tests/ordinary-${index}.test.mjs`).join('\n')}\n`, /cardinality is invalid/u],
    ['byte size', 'x'.repeat(128 * 1024 + 1), /file size is invalid/u],
  ]) {
    await t.test(label, (t) => {
      const { base, candidate, roots } = withTrees(t);
      for (const root of roots) write(root, POSITIVE, content);
      assert.throws(() => verifyTrustedTestCoverage(base, candidate), expected);
    });
  }
});

test('missing declarations or tests are errors, not partial coverage', async (t) => {
  for (const path of [CHILD, REQUIRED_ISOLATED_RUNNER_TEST, ...PROTOTYPE_TESTS]) {
    await t.test(path, (t) => {
      const { base, candidate } = withTrees(t);
      unlinkSync(join(candidate, path));
      assert.throws(() => verifyTrustedTestCoverage(base, candidate), { code: 'ENOENT' });
    });
  }
});

test('empty or oversized test files cannot count as reviewed coverage', async (t) => {
  for (const size of [0, 2 * 1024 * 1024 + 1]) {
    await t.test(String(size), (t) => {
      const { base, candidate, roots } = withTrees(t);
      for (const root of roots) write(root, REQUIRED_ISOLATED_RUNNER_TEST, Buffer.alloc(size, 32));
      assert.throws(() => verifyTrustedTestCoverage(base, candidate), /file size is invalid/u);
    });
  }
});

test('nonregular paths and symlinked test files are rejected', { skip: process.platform === 'win32' }, async (t) => {
  for (const kind of ['directory', 'symlink']) {
    await t.test(kind, (t) => {
      const { base, candidate } = withTrees(t);
      const destination = join(candidate, REQUIRED_ISOLATED_RUNNER_TEST);
      unlinkSync(destination);
      if (kind === 'directory') mkdirSync(destination);
      else symlinkSync(join(base, REQUIRED_ISOLATED_RUNNER_TEST), destination);
      assert.throws(() => verifyTrustedTestCoverage(base, candidate), /contained regular file/u);
    });
  }
});

test('matching CRLF declarations are accepted without normalizing compared test bytes', (t) => {
  const { base, candidate, roots } = withTrees(t);
  for (const root of roots) {
    for (const manifest of TRUSTED_TEST_MANIFEST_PATHS) {
      write(root, manifest, `${fixtureManifests[manifest].join('\r\n')}\r\n`);
    }
  }
  assert.equal(verifyTrustedTestCoverage(base, candidate).testCount, 8);
  assert.equal(readFileSync(join(candidate, REQUIRED_ISOLATED_RUNNER_TEST), 'utf8'), 'export const ordinaryFixture = 1;\n');
});

test('tree roots are explicit and must name directories', (t) => {
  const { base, candidate } = withTrees(t);
  for (const root of [undefined, null, '']) {
    assert.throws(() => verifyTrustedTestCoverage(root, candidate), /explicit tree roots/u);
  }
  assert.throws(() => verifyTrustedTestCoverage(base, join(candidate, CHILD)), /root must be a directory/u);
});
