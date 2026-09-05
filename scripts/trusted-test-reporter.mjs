import { lstatSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function readTrustedManifest() {
  const configuredPath = process.env.TRUSTED_TEST_MANIFEST;
  const manifestPath = configuredPath
    ? resolve(configuredPath)
    : fileURLToPath(new URL('../.github/trusted-security-tests.txt', import.meta.url));
  const stats = lstatSync(manifestPath);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.size > 128 * 1024) {
    throw new Error('trusted test manifest must be a bounded regular file');
  }
  return readFileSync(manifestPath, 'utf8').replace(/\r\n/gu, '\n').trim().split('\n');
}

function validateExpectedPaths(testPaths) {
  if (!Array.isArray(testPaths) || testPaths.length === 0 || testPaths.length > 128) {
    throw new Error('trusted test manifest has invalid cardinality');
  }
  const expectedByAbsolutePath = new Map();
  for (const testPath of testPaths) {
    if (typeof testPath !== 'string' || !/^tests\/[A-Za-z0-9._/-]+\.test\.mjs$/u.test(testPath)) {
      throw new Error(`invalid trusted test path: ${String(testPath)}`);
    }
    const absolutePath = resolve(testPath);
    if (expectedByAbsolutePath.has(absolutePath)) {
      throw new Error(`duplicate trusted test path: ${testPath}`);
    }
    expectedByAbsolutePath.set(absolutePath, testPath);
  }
  return expectedByAbsolutePath;
}

function validCount(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

export function createTrustedTestReporter(expectedTestPaths) {
  const expectedByAbsolutePath = validateExpectedPaths(expectedTestPaths);
  return async function* trustedTestReporter(source) {
    const completedPaths = new Set();
    let finalSummaryCount = 0;

    for await (const event of source) {
      if (event?.type !== 'test:summary') continue;
      const summary = event.data;
      if (!summary || typeof summary !== 'object') {
        throw new Error('test runner emitted a malformed summary');
      }

      if (summary.file === undefined) {
        finalSummaryCount += 1;
        continue;
      }

      const absolutePath = resolve(summary.file);
      const trustedPath = expectedByAbsolutePath.get(absolutePath);
      if (!trustedPath) {
        throw new Error(`test runner summarized an unexpected file: ${summary.file}`);
      }
      if (completedPaths.has(trustedPath)) {
        throw new Error(`test runner duplicated a file summary: ${trustedPath}`);
      }

      const counts = summary.counts;
      if (
        summary.success !== true
        || !counts
        || typeof counts !== 'object'
        || !validCount(counts.tests)
        || !validCount(counts.passed)
        || !validCount(counts.failed)
        || !validCount(counts.cancelled)
        || !validCount(counts.skipped)
        || !validCount(counts.todo)
        || counts.tests < 1
        || counts.passed !== counts.tests
        || counts.failed !== 0
        || counts.cancelled !== 0
        || counts.skipped !== 0
        || counts.todo !== 0
      ) {
        throw new Error(`trusted test file did not complete successfully: ${trustedPath}`);
      }

      completedPaths.add(trustedPath);
      yield `trusted-test-file-pass ${trustedPath} tests=${counts.tests}\n`;
    }

    if (finalSummaryCount !== 1) {
      throw new Error('test runner did not emit exactly one final summary');
    }
    const missingPaths = [...expectedByAbsolutePath.values()]
      .filter((testPath) => !completedPaths.has(testPath));
    if (missingPaths.length > 0) {
      throw new Error(`trusted test files missing authenticated summaries: ${missingPaths.join(', ')}`);
    }
    yield `trusted-test-suite-pass files=${completedPaths.size}\n`;
  };
}

export default createTrustedTestReporter(readTrustedManifest());
