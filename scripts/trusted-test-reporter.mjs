import { lstatSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SafeArray = Array;
const SafeArrayIsArray = Array.isArray;
const SafeError = Error;
const SafeNumberIsSafeInteger = Number.isSafeInteger;
const SafeReflectApply = Reflect.apply;
const SafeRegExpTest = RegExp.prototype.test;
const SafeResolve = resolve;
const trustedPathPattern = /^tests\/[A-Za-z0-9._/-]+\.test\.mjs$/u;

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
  if (!SafeArrayIsArray(testPaths) || testPaths.length === 0 || testPaths.length > 128) {
    throw new SafeError('trusted test manifest has invalid cardinality');
  }
  const expectedRecords = [];
  for (let index = 0; index < testPaths.length; index += 1) {
    const testPath = testPaths[index];
    if (
      typeof testPath !== 'string'
      || !SafeReflectApply(SafeRegExpTest, trustedPathPattern, [testPath])
    ) {
      throw new SafeError(`invalid trusted test path: ${String(testPath)}`);
    }
    const absolutePath = SafeResolve(testPath);
    for (let previous = 0; previous < expectedRecords.length; previous += 1) {
      if (expectedRecords[previous].absolutePath === absolutePath) {
        throw new SafeError(`duplicate trusted test path: ${testPath}`);
      }
    }
    expectedRecords.push({ absolutePath, testPath });
  }
  return expectedRecords;
}

function validCount(value) {
  return SafeNumberIsSafeInteger(value) && value >= 0;
}

export function createTrustedTestReporter(expectedTestPaths) {
  const expectedRecords = validateExpectedPaths(expectedTestPaths);
  return async function* trustedTestReporter(source) {
    const passCounts = new SafeArray(expectedRecords.length);
    for (let index = 0; index < passCounts.length; index += 1) passCounts[index] = 0;
    let finalSummary;

    for await (const event of source) {
      if (event?.type === 'test:fail' || event?.type === 'test:cancel') {
        throw new SafeError(`test runner emitted a failing lifecycle event: ${event.type}`);
      }
      if (event?.type === 'test:pass') {
        const eventFile = event.data?.file;
        if (typeof eventFile !== 'string') {
          throw new SafeError('test runner emitted a pass without a source file');
        }
        const absoluteEventFile = SafeResolve(eventFile);
        let expectedIndex = -1;
        for (let index = 0; index < expectedRecords.length; index += 1) {
          if (expectedRecords[index].absolutePath === absoluteEventFile) {
            expectedIndex = index;
            break;
          }
        }
        if (expectedIndex < 0) {
          throw new SafeError(`test runner passed an unexpected source file: ${eventFile}`);
        }
        passCounts[expectedIndex] += 1;
        continue;
      }
      if (event?.type !== 'test:summary') continue;
      const summary = event.data;
      if (!summary || typeof summary !== 'object' || summary.file !== undefined) {
        throw new SafeError('test runner emitted an untrusted or malformed summary');
      }
      if (finalSummary !== undefined) {
        throw new SafeError('test runner duplicated the final summary');
      }
      finalSummary = summary;
    }

    if (finalSummary === undefined) {
      throw new SafeError('test runner did not emit exactly one final summary');
    }
    const finalCounts = finalSummary.counts;
    if (
      finalSummary.success !== true
      || !finalCounts
      || typeof finalCounts !== 'object'
      || !validCount(finalCounts.tests)
      || !validCount(finalCounts.passed)
      || !validCount(finalCounts.failed)
      || !validCount(finalCounts.cancelled)
      || finalCounts.tests < expectedRecords.length
      || finalCounts.passed !== finalCounts.tests
      || finalCounts.failed !== 0
      || finalCounts.cancelled !== 0
      || (finalCounts.skipped !== undefined && finalCounts.skipped !== 0)
      || (finalCounts.todo !== undefined && finalCounts.todo !== 0)
    ) {
      throw new SafeError('test runner final summary is not an all-pass result');
    }
    let missingPaths = '';
    for (let index = 0; index < expectedRecords.length; index += 1) {
      if (passCounts[index] < 1) {
        missingPaths += `${missingPaths === '' ? '' : ', '}${expectedRecords[index].testPath}`;
      }
    }
    if (missingPaths !== '') {
      throw new SafeError(`trusted test files missing direct pass events: ${missingPaths}`);
    }
    for (let index = 0; index < expectedRecords.length; index += 1) {
      yield `trusted-test-file-pass ${expectedRecords[index].testPath} tests=${passCounts[index]}\n`;
    }
    yield `trusted-test-suite-pass files=${expectedRecords.length}\n`;
  };
}

export default createTrustedTestReporter(readTrustedManifest());
