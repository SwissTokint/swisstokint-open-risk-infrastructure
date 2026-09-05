import { EventEmitter } from 'node:events';
import { lstatSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const SafeArray = Array;
const SafeArrayIsArray = Array.isArray;
const SafeError = Error;
const SafeNumberIsSafeInteger = Number.isSafeInteger;
const SafeObjectDefineProperty = Object.defineProperty;
const SafeObjectFreeze = Object.freeze;
const SafeObjectGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const SafeReflectApply = Reflect.apply;
const SafeRegExpTest = RegExp.prototype.test;
const SafeResolve = resolve;
const SafeEventEmitterOn = EventEmitter.prototype.on;
const protectedLifecycleMethods = [
  [Readable.prototype, 'push', SafeObjectGetOwnPropertyDescriptor(Readable.prototype, 'push')],
  [EventEmitter.prototype, 'emit', SafeObjectGetOwnPropertyDescriptor(EventEmitter.prototype, 'emit')],
];
const trustedPathPattern = /^tests\/[A-Za-z0-9._/-]+\.test\.mjs$/u;

function lockLifecycleMethod(target, property, descriptor) {
  if (
    descriptor === undefined
    || typeof descriptor.value !== 'function'
    || descriptor.get !== undefined
    || descriptor.set !== undefined
  ) {
    throw new SafeError(`trusted lifecycle method is unavailable: ${property}`);
  }
  SafeObjectDefineProperty(target, property, {
    value: descriptor.value,
    writable: false,
    enumerable: descriptor.enumerable,
    configurable: false,
  });
}

function lockLifecycleEvidenceSurfaces() {
  for (let index = 0; index < protectedLifecycleMethods.length; index += 1) {
    const [target, property, descriptor] = protectedLifecycleMethods[index];
    lockLifecycleMethod(target, property, descriptor);
  }
}

function installFailClosedExitGuard(isTrustedPass) {
  const eventTable = process._events;
  if (eventTable === null || typeof eventTable !== 'object') {
    throw new SafeError('trusted process event table is unavailable');
  }

  const failClosedExit = () => {
    if (!isTrustedPass()) process.exitCode = 1;
  };
  SafeReflectApply(SafeEventEmitterOn, process, ['exit', failClosedExit]);

  const exitDescriptor = SafeObjectGetOwnPropertyDescriptor(eventTable, 'exit');
  if (exitDescriptor === undefined) {
    throw new SafeError('trusted exit guard was not installed');
  }
  if (SafeArrayIsArray(exitDescriptor.value)) SafeObjectFreeze(exitDescriptor.value);
  SafeObjectDefineProperty(eventTable, 'exit', {
    value: exitDescriptor.value,
    writable: false,
    enumerable: exitDescriptor.enumerable,
    configurable: false,
  });

  const eventTableDescriptor = SafeObjectGetOwnPropertyDescriptor(process, '_events');
  if (eventTableDescriptor === undefined || eventTableDescriptor.value !== eventTable) {
    throw new SafeError('trusted process event table identity changed');
  }
  SafeObjectDefineProperty(process, '_events', {
    value: eventTable,
    writable: false,
    enumerable: eventTableDescriptor.enumerable,
    configurable: false,
  });
}

function readTrustedManifest() {
  const configuredPath = process.env.TRUSTED_TEST_MANIFEST;
  const manifestPath = configuredPath
    ? resolve(configuredPath)
    : fileURLToPath(new URL('../.github/trusted-security-tests.txt', import.meta.url));
  const stats = lstatSync(manifestPath);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.size > 128 * 1024) {
    throw new Error('trusted test manifest must be a bounded regular file');
  }
  const testPaths = readFileSync(manifestPath, 'utf8')
    .replace(/\r\n/gu, '\n')
    .trim()
    .split('\n');
  const selectedTestPath = process.env.TRUSTED_TEST_PATH;
  if (selectedTestPath === undefined) return testPaths;
  for (let index = 0; index < testPaths.length; index += 1) {
    if (testPaths[index] === selectedTestPath) return [selectedTestPath];
  }
  throw new Error(`selected trusted test is not in the manifest: ${selectedTestPath}`);
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

const reportTrustedManifest = createTrustedTestReporter(readTrustedManifest());
let defaultReporterClaimed = false;
let defaultReporterPassed = false;

export default async function* trustedManifestReporter(source) {
  if (defaultReporterClaimed) {
    throw new SafeError('trusted manifest reporter can only be claimed by the test runner once');
  }
  defaultReporterClaimed = true;
  lockLifecycleEvidenceSurfaces();
  installFailClosedExitGuard(() => defaultReporterPassed);

  for await (const output of reportTrustedManifest(source)) yield output;
  defaultReporterPassed = true;
}
