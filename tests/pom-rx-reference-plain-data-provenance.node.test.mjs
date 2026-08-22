import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PomRxPlainDataError,
  captureReferencePlainData,
  captureReferencePlainDataOutcome,
} from '../core/reference-data/plain-data-snapshot.mjs';

function unsafePrototypeRecord() {
  const value = Object.create(null);
  Object.defineProperty(value, '__proto__', {
    enumerable: true,
    value: 'blocked',
  });
  return value;
}

test('plain-data outcome reports validation errors minted by its own capture', () => {
  const outcome = captureReferencePlainDataOutcome(unsafePrototypeRecord(), 'fixture');

  assert.equal(outcome.ok, false);
  assert.equal(outcome.value, null);
  assert.ok(outcome.error instanceof PomRxPlainDataError);
  assert.equal(outcome.error.code, 'POMRX_DATA_E_KEY');
});

test('post-import key-test poisoning cannot alter shared plain-data validation', () => {
  const originalSetHas = Set.prototype.has;
  const originalRegExpExec = RegExp.prototype.exec;
  let setCalls = 0;
  let regexpCalls = 0;
  let outcome;

  Set.prototype.has = function poisonedSetHas() {
    setCalls += 1;
    return false;
  };
  RegExp.prototype.exec = function poisonedExec() {
    regexpCalls += 1;
    return ['forged'];
  };
  try {
    // Keep the poison window scoped to production code. Assertion/runtime internals
    // are evaluated only after the global prototypes are restored.
    outcome = captureReferencePlainDataOutcome(unsafePrototypeRecord(), 'fixture');
  } finally {
    Set.prototype.has = originalSetHas;
    RegExp.prototype.exec = originalRegExpExec;
  }

  assert.equal(outcome.ok, false);
  assert.equal(outcome.error.code, 'POMRX_DATA_E_KEY');
  assert.equal(setCalls, 0);
  assert.equal(regexpCalls, 0);
});

test('post-import descriptor poisoning cannot substitute nested captured values', () => {
  const message = { value: 'e\u0301' };
  const input = { message };
  const originalDescriptors = Object.getOwnPropertyDescriptors;
  let poisonCalls = 0;

  Object.getOwnPropertyDescriptors = (value) => {
    poisonCalls += 1;
    const descriptors = originalDescriptors(value);
    if (value === message) {
      descriptors.value = {
        value: 'é',
        writable: true,
        enumerable: true,
        configurable: true,
      };
    }
    return descriptors;
  };

  let captured;
  try {
    captured = captureReferencePlainData(input, 'fixture');
  } finally {
    Object.getOwnPropertyDescriptors = originalDescriptors;
  }

  assert.equal(poisonCalls, 0);
  assert.equal(captured.message.value, 'e\u0301');
  assert.equal(Object.isFrozen(captured), true);
  assert.equal(Object.isFrozen(captured.message), true);
});

test('post-import reflection and freeze poisoning cannot hide decoration or leave snapshots mutable', () => {
  const decorated = { safe: 'value' };
  Object.defineProperty(decorated, 'hidden', {
    value: 'blocked',
    enumerable: false,
    configurable: true,
  });

  const originalNames = Object.getOwnPropertyNames;
  const originalFreeze = Object.freeze;
  const originalIsArray = Array.isArray;
  let namesCalls = 0;
  let freezeCalls = 0;
  let isArrayCalls = 0;
  let outcome;
  let captured;

  Object.getOwnPropertyNames = () => {
    namesCalls += 1;
    return ['safe'];
  };
  Object.freeze = (value) => {
    freezeCalls += 1;
    return value;
  };
  Array.isArray = () => {
    isArrayCalls += 1;
    return false;
  };

  try {
    // As above, only the shared capture boundary executes while the intrinsics are
    // poisoned; test-runner/assertion code must not contaminate dispatch counts.
    outcome = captureReferencePlainDataOutcome(decorated, 'fixture');
    captured = captureReferencePlainData({ nested: ['value'] }, 'clean');
  } finally {
    Object.getOwnPropertyNames = originalNames;
    Object.freeze = originalFreeze;
    Array.isArray = originalIsArray;
  }

  assert.equal(outcome.ok, false);
  assert.equal(outcome.error.code, 'POMRX_DATA_E_ACCESSOR');
  assert.equal(Object.isFrozen(captured), true);
  assert.equal(Object.isFrozen(captured.nested), true);
  assert.deepEqual(captured.nested, ['value']);
  assert.equal(namesCalls, 0);
  assert.equal(freezeCalls, 0);
  assert.equal(isArrayCalls, 0);
});
