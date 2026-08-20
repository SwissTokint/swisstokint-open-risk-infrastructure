import assert from 'node:assert/strict';
import test from 'node:test';

import {
  captureReferencePlainData,
} from '../core/reference-data/plain-data-snapshot.mjs';

test('plain-data descriptor inspection ignores inherited Object.prototype get/set accessors', { concurrency: false }, () => {
  const previousGet = Object.getOwnPropertyDescriptor(Object.prototype, 'get');
  const previousSet = Object.getOwnPropertyDescriptor(Object.prototype, 'set');
  let inheritedAccessorCalls = 0;

  try {
    Object.defineProperty(Object.prototype, 'get', {
      configurable: true,
      get() {
        inheritedAccessorCalls += 1;
        if (Object.hasOwn(this, 'value') && this.value === 'object-safe') {
          this.value = 'object-mutated';
        }
        if (Object.hasOwn(this, 'value') && this.value === 'array-safe') {
          this.value = 'array-mutated';
        }
        return undefined;
      },
    });
    Object.defineProperty(Object.prototype, 'set', {
      configurable: true,
      get() {
        inheritedAccessorCalls += 1;
        return undefined;
      },
    });

    const snapshot = captureReferencePlainData({
      object_value: 'object-safe',
      array_value: ['array-safe'],
    });

    assert.equal(snapshot.object_value, 'object-safe');
    assert.equal(snapshot.array_value[0], 'array-safe');
    assert.equal(inheritedAccessorCalls, 0);
  } finally {
    if (previousGet) {
      Object.defineProperty(Object.prototype, 'get', previousGet);
    } else {
      delete Object.prototype.get;
    }
    if (previousSet) {
      Object.defineProperty(Object.prototype, 'set', previousSet);
    } else {
      delete Object.prototype.set;
    }
  }
});

test('plain-data array snapshot creates own elements without inherited index setters', { concurrency: false }, () => {
  const index = '777';
  const source = Array.from({ length: 778 }, (_, position) => (
    position === 777 ? 'sentinel' : position
  ));
  const previous = Object.getOwnPropertyDescriptor(Array.prototype, index);
  let setterCalls = 0;

  try {
    Object.defineProperty(Array.prototype, index, {
      configurable: true,
      get() {
        return 'poisoned-inherited-value';
      },
      set() {
        setterCalls += 1;
      },
    });

    const snapshot = captureReferencePlainData({ values: source });
    assert.equal(Object.hasOwn(snapshot.values, index), true);
    assert.equal(snapshot.values[777], 'sentinel');
    assert.equal(setterCalls, 0);
  } finally {
    if (previous) {
      Object.defineProperty(Array.prototype, index, previous);
    } else {
      delete Array.prototype[index];
    }
  }
});
