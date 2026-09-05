import { EventEmitter } from 'node:events';
import { resolve } from 'node:path';
import { Readable } from 'node:stream';

const SafeArrayIsArray = Array.isArray;
const SafeError = Error;
const SafeObjectDefineProperty = Object.defineProperty;
const SafeObjectFreeze = Object.freeze;
const SafeObjectGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const SafeReflectApply = Reflect.apply;
const SafeEventEmitterOn = EventEmitter.prototype.on;
const expectedFile = resolve('tests/pom-rx-integrity-baseline.node.test.mjs');
const expectedFailures = Object.freeze([
  ['rejects action_commitment substitution from preflight to execution', 'v0.1 currently accepts a re-linked action substitution'],
  ['rejects action_commitment substitution from execution to reconciliation', 'v0.1 currently accepts a reconciled action substitution'],
  ['rejects input_commitment substitution from preflight to execution', 'v0.1 currently accepts a re-linked input substitution'],
  ['rejects execution:accepted when an execution assertion fails', 'v0.1 currently permits accepted with a failed assertion'],
  ['rejects reconciliation:matched when a reconciliation assertion fails', 'v0.1 currently permits matched with a failed assertion'],
  ['rejects duplicate receipt_id values within one chain', 'v0.1 currently accepts duplicate receipt_id values'],
  ['rejects action substitution after an unsigned surrogate witness acknowledgement', 'an unsigned surrogate acknowledgement does not repair v0.1 chain continuity'],
]);
const expectedPass = 'accepts the unmodified synthetic chain fixture';
const protectedLifecycleMethods = [
  [Readable.prototype, 'push', SafeObjectGetOwnPropertyDescriptor(Readable.prototype, 'push')],
  [EventEmitter.prototype, 'emit', SafeObjectGetOwnPropertyDescriptor(EventEmitter.prototype, 'emit')],
];

function lockLifecycleSurfaces() {
  for (const [target, property, descriptor] of protectedLifecycleMethods) {
    if (descriptor === undefined || typeof descriptor.value !== 'function') {
      throw new SafeError(`trusted expected-red lifecycle method is unavailable: ${property}`);
    }
    SafeObjectDefineProperty(target, property, {
      value: descriptor.value,
      writable: false,
      enumerable: descriptor.enumerable,
      configurable: false,
    });
  }
  SafeObjectDefineProperty(process, 'emit', {
    value: EventEmitter.prototype.emit,
    writable: false,
    enumerable: false,
    configurable: false,
  });
}

function installExitGuard(isTrustedPass) {
  const eventTable = process._events;
  if (eventTable === null || typeof eventTable !== 'object') {
    throw new SafeError('trusted expected-red event table is unavailable');
  }
  SafeReflectApply(SafeEventEmitterOn, process, ['exit', () => {
    if (!isTrustedPass()) process.exitCode = 1;
  }]);
  const exitDescriptor = SafeObjectGetOwnPropertyDescriptor(eventTable, 'exit');
  if (exitDescriptor === undefined) throw new SafeError('expected-red exit guard was not installed');
  if (SafeArrayIsArray(exitDescriptor.value)) SafeObjectFreeze(exitDescriptor.value);
  SafeObjectDefineProperty(eventTable, 'exit', {
    value: exitDescriptor.value,
    writable: false,
    enumerable: exitDescriptor.enumerable,
    configurable: false,
  });
  const tableDescriptor = SafeObjectGetOwnPropertyDescriptor(process, '_events');
  SafeObjectDefineProperty(process, '_events', {
    value: eventTable,
    writable: false,
    enumerable: tableDescriptor?.enumerable ?? true,
    configurable: false,
  });
}

let claimed = false;
let passed = false;

export default async function* trustedExpectedRedReporter(source) {
  if (claimed) throw new SafeError('trusted expected-red reporter is one-shot');
  claimed = true;
  lockLifecycleSurfaces();
  installExitGuard(() => passed);
  const seenFailures = new Set();
  let seenPass = false;
  let finalSummary;

  for await (const event of source) {
    if (event?.type === 'test:cancel') throw new SafeError('expected-red test was cancelled');
    if (event?.type === 'test:pass' || event?.type === 'test:fail') {
      if (resolve(event.data?.file ?? '') !== expectedFile) {
        throw new SafeError('expected-red event came from an unexpected file');
      }
      if (event.type === 'test:pass') {
        if (event.data.name !== expectedPass || seenPass) {
          throw new SafeError('expected-red green control changed');
        }
        seenPass = true;
        continue;
      }
      let matched;
      for (const expected of expectedFailures) {
        if (expected[0] === event.data.name) matched = expected;
      }
      if (!matched || seenFailures.has(matched[0])) {
        throw new SafeError('expected-red failure set changed');
      }
      const failure = event.data?.details?.error;
      const assertion = failure?.cause;
      if (
        failure?.failureType !== 'testCodeFailure'
        || assertion?.code !== 'ERR_ASSERTION'
        || assertion?.actual !== true
        || assertion?.expected !== false
        || assertion?.operator !== 'strictEqual'
        || typeof failure?.message !== 'string'
        || !failure.message.includes(matched[1])
      ) {
        throw new SafeError(`expected-red failure evidence changed: ${matched[0]}`);
      }
      seenFailures.add(matched[0]);
      continue;
    }
    if (event?.type === 'test:summary') {
      if (event.data?.file !== undefined || finalSummary !== undefined) {
        throw new SafeError('expected-red summary is malformed or duplicated');
      }
      finalSummary = event.data;
    }
  }

  const counts = finalSummary?.counts;
  if (
    finalSummary?.success !== false
    || counts?.tests !== 8
    || counts?.passed !== 1
    || counts?.failed !== 7
    || counts?.cancelled !== 0
    || (counts?.skipped ?? 0) !== 0
    || (counts?.todo ?? 0) !== 0
    || seenFailures.size !== expectedFailures.length
    || !seenPass
  ) {
    throw new SafeError('expected-red aggregate changed');
  }
  passed = true;
  process.exitCode = 0;
  yield 'trusted-expected-red-pass failures=7 controls=1\n';
}
