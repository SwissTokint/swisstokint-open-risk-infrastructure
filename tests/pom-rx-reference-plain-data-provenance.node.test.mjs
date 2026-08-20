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

test('plain-data outcome reports only validation errors minted by its own capture', () => {
  const outcome = captureReferencePlainDataOutcome(unsafePrototypeRecord(), 'fixture');

  assert.equal(outcome.ok, false);
  assert.equal(outcome.value, null);
  assert.ok(outcome.error instanceof PomRxPlainDataError);
  assert.equal(outcome.error.code, 'POMRX_DATA_E_KEY');
});

test('foreign same-class failure from a later intrinsic preserves exact provenance', () => {
  const originalSetHas = Set.prototype.has;
  const foreign = new PomRxPlainDataError(
    'POMRX_DATA_E_KEY',
    'foreign same-realm failure',
  );

  Set.prototype.has = function poisonedSetHas() {
    Set.prototype.has = originalSetHas;
    throw foreign;
  };
  try {
    assert.throws(
      () => captureReferencePlainDataOutcome({ safe: 'value' }, 'fixture'),
      (error) => error === foreign,
    );
  } finally {
    Set.prototype.has = originalSetHas;
  }
});

test('validation error from a nested capture cannot be claimed by the outer capture', () => {
  const originalSetHas = Set.prototype.has;
  let nestedError;

  Set.prototype.has = function poisonedSetHas() {
    Set.prototype.has = originalSetHas;
    try {
      captureReferencePlainData(unsafePrototypeRecord(), 'nested');
    } catch (error) {
      nestedError = error;
      throw error;
    }
    throw new Error('nested capture unexpectedly succeeded');
  };
  try {
    assert.throws(
      () => captureReferencePlainDataOutcome({ safe: 'value' }, 'outer'),
      (error) => error === nestedError,
    );
    assert.ok(nestedError instanceof PomRxPlainDataError);
    assert.equal(nestedError.code, 'POMRX_DATA_E_KEY');
  } finally {
    Set.prototype.has = originalSetHas;
  }
});
