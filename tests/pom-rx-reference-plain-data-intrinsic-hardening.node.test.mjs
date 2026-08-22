import assert from 'node:assert/strict';
import test from 'node:test';
import { types as utilTypes } from 'node:util';

import {
  PomRxPlainDataError,
  captureReferencePlainData,
} from '../core/reference-data/plain-data-snapshot.mjs';

function expectPlainDataCode(error, code) {
  assert.ok(error instanceof PomRxPlainDataError);
  assert.equal(error.code, code);
  return true;
}

test('post-import Object.create and Object.freeze replacement cannot redirect or unfreeze snapshots', () => {
  const originalObjectCreate = Object.create;
  const originalObjectFreeze = Object.freeze;
  let captured;

  try {
    Object.create = function poisonedObjectCreate(prototype) {
      const value = originalObjectCreate(prototype);
      if (prototype === null) {
        Object.defineProperty(value, 'request', {
          configurable: true,
          enumerable: true,
          get() {
            return { value: 'substituted' };
          },
          set() {
            // A vulnerable live Object.create snapshot would discard the write.
          },
        });
      }
      return value;
    };
    Object.freeze = (value) => value;

    captured = captureReferencePlainData({
      request: { value: 'prepared' },
      values: [1, 2],
    }, 'prepared_execution');
  } finally {
    Object.create = originalObjectCreate;
    Object.freeze = originalObjectFreeze;
  }

  assert.equal(captured.request.value, 'prepared');
  assert.equal(Array.isArray(captured.values), true);
  assert.deepEqual([...captured.values], [1, 2]);
  assert.equal(Object.getPrototypeOf(captured), null);
  assert.equal(Object.isFrozen(captured), true);
  assert.equal(Object.isFrozen(captured.request), true);
  assert.equal(Object.isFrozen(captured.values), true);
});

test('post-import reflection replacement cannot hide a non-enumerable caller field', () => {
  const input = { visible: 1 };
  Object.defineProperty(input, 'hidden', {
    enumerable: false,
    configurable: true,
    value: 2,
  });

  const originalGetOwnPropertyNames = Object.getOwnPropertyNames;
  let thrown;
  try {
    Object.getOwnPropertyNames = (value) => originalGetOwnPropertyNames(value)
      .filter((key) => key !== 'hidden');
    try {
      captureReferencePlainData(input, 'reflection_poison');
    } catch (error) {
      thrown = error;
    }
  } finally {
    Object.getOwnPropertyNames = originalGetOwnPropertyNames;
  }

  assert.ok(thrown);
  assert.equal(expectPlainDataCode(thrown, 'POMRX_DATA_E_ACCESSOR'), true);
});

test('post-import numeric and key-check replacement cannot weaken the accepted data language', () => {
  const originalIsSafeInteger = Number.isSafeInteger;
  const originalRegExpTest = RegExp.prototype.test;
  const originalRegExpExec = RegExp.prototype.exec;
  const originalSetHas = Set.prototype.has;

  let numberError;
  let unsafePatternError;
  let forbiddenKeyError;
  try {
    Number.isSafeInteger = () => true;
    RegExp.prototype.test = () => true;
    RegExp.prototype.exec = () => ['forged-match'];
    Set.prototype.has = () => false;

    try {
      captureReferencePlainData({ value: 1.5 }, 'numeric_poison');
    } catch (error) {
      numberError = error;
    }

    try {
      captureReferencePlainData({ 'bad key': 1 }, 'pattern_poison');
    } catch (error) {
      unsafePatternError = error;
    }

    const unsafe = Reflect.apply(originalObjectCreate, Object, [null]);
    Object.defineProperty(unsafe, '__proto__', {
      enumerable: true,
      configurable: true,
      value: 'must-stay-forbidden',
    });
    try {
      captureReferencePlainData(unsafe, 'key_poison');
    } catch (error) {
      forbiddenKeyError = error;
    }
  } finally {
    Number.isSafeInteger = originalIsSafeInteger;
    RegExp.prototype.test = originalRegExpTest;
    RegExp.prototype.exec = originalRegExpExec;
    Set.prototype.has = originalSetHas;
  }

  assert.ok(numberError);
  assert.equal(expectPlainDataCode(numberError, 'POMRX_DATA_E_NUMBER'), true);
  assert.ok(unsafePatternError);
  assert.equal(expectPlainDataCode(unsafePatternError, 'POMRX_DATA_E_KEY'), true);
  assert.ok(forbiddenKeyError);
  assert.equal(expectPlainDataCode(forbiddenKeyError, 'POMRX_DATA_E_KEY'), true);

  function originalObjectCreate(prototype) {
    return Reflect.apply(Object.create, Object, [prototype]);
  }
});

test('post-import util.types.isProxy replacement cannot expose nested Proxy traps', () => {
  const originalIsProxy = utilTypes.isProxy;
  let traps = 0;
  const nested = new Proxy({ value: 1 }, {
    getPrototypeOf() {
      traps += 1;
      return Object.prototype;
    },
    ownKeys() {
      traps += 1;
      return ['value'];
    },
    getOwnPropertyDescriptor() {
      traps += 1;
      return {
        configurable: true,
        enumerable: true,
        value: 1,
        writable: true,
      };
    },
  });

  let thrown;
  try {
    utilTypes.isProxy = () => false;
    try {
      captureReferencePlainData({ nested }, 'proxy_poison');
    } catch (error) {
      thrown = error;
    }
  } finally {
    utilTypes.isProxy = originalIsProxy;
  }

  assert.ok(thrown);
  assert.equal(expectPlainDataCode(thrown, 'POMRX_DATA_E_PROXY'), true);
  assert.equal(traps, 0);
});

test('captured arrays detach iteration and method lookup from live Array.prototype', () => {
  const captured = captureReferencePlainData({ items: ['trusted', 'second'] }, 'array_detach');
  const snapshotPrototype = Object.getPrototypeOf(captured.items);

  assert.equal(Array.isArray(captured.items), true);
  assert.notEqual(snapshotPrototype, Array.prototype);
  assert.equal(Object.isFrozen(snapshotPrototype), true);
  assert.equal(Object.getPrototypeOf(snapshotPrototype), null);

  const originalIterator = Array.prototype[Symbol.iterator];
  const originalJoin = Array.prototype.join;
  const originalMap = Array.prototype.map;
  try {
    Array.prototype[Symbol.iterator] = function* poisonedIterator() {
      yield 'forged';
    };
    Array.prototype.join = () => 'forged';
    Array.prototype.map = () => ['forged'];

    const iterated = [...captured.items];
    assert.deepEqual(iterated, ['trusted', 'second']);
    assert.equal(captured.items.join(','), 'trusted,second');
    assert.deepEqual(captured.items.map((value) => value), ['trusted', 'second']);
  } finally {
    Array.prototype[Symbol.iterator] = originalIterator;
    Array.prototype.join = originalJoin;
    Array.prototype.map = originalMap;
  }
});

test('captured arrays do not inherit mutable shared ArrayIterator next semantics', () => {
  const captured = captureReferencePlainData({ items: ['trusted', 'second'] }, 'iterator_detach');
  const originalArrayIterator = Array.prototype[Symbol.iterator];
  const probeIterator = Reflect.apply(originalArrayIterator, [], [[]]);
  const arrayIteratorPrototype = Object.getPrototypeOf(probeIterator);
  const originalNext = arrayIteratorPrototype.next;
  let iterated;
  let valuesIterated;

  try {
    arrayIteratorPrototype.next = function poisonedArrayIteratorNext() {
      return { value: 'forged', done: true };
    };
    iterated = [...captured.items];
    valuesIterated = [...captured.items.values()];
  } finally {
    arrayIteratorPrototype.next = originalNext;
  }

  assert.deepEqual(iterated, ['trusted', 'second']);
  assert.deepEqual(valuesIterated, ['trusted', 'second']);
});

test('reference snapshot arrays can be safely recaptured without admitting arbitrary array prototypes', () => {
  const first = captureReferencePlainData({
    assertions: [
      { type: 'policy', result: 'allow' },
      { type: 'simulation', result: 'allow' },
    ],
  }, 'first_capture');
  const snapshotPrototype = Object.getPrototypeOf(first.assertions);

  const second = captureReferencePlainData(first, 'second_capture');
  assert.equal(Array.isArray(second.assertions), true);
  assert.equal(Object.getPrototypeOf(second.assertions), snapshotPrototype);
  assert.deepEqual(
    second.assertions.map((item) => item.type),
    ['policy', 'simulation'],
  );
  assert.equal(Object.isFrozen(second.assertions), true);

  const foreign = ['untrusted'];
  Object.setPrototypeOf(foreign, Object.freeze(Object.create(null)));
  assert.throws(
    () => captureReferencePlainData(foreign, 'foreign_array_prototype'),
    (error) => expectPlainDataCode(error, 'POMRX_DATA_E_PROTOTYPE'),
  );
});

test('descriptor inspection ignores inherited Object.prototype get/set poison', () => {
  const originalGet = Object.getOwnPropertyDescriptor(Object.prototype, 'get');
  const originalSet = Object.getOwnPropertyDescriptor(Object.prototype, 'set');
  let getCalls = 0;
  let setCalls = 0;

  try {
    Object.defineProperty(Object.prototype, 'get', {
      configurable: true,
      get() {
        getCalls += 1;
        return () => 'forged';
      },
    });
    Object.defineProperty(Object.prototype, 'set', {
      configurable: true,
      get() {
        setCalls += 1;
        return () => {};
      },
    });

    const captured = captureReferencePlainData({ value: 'trusted' }, 'descriptor_poison');
    assert.equal(captured.value, 'trusted');
  } finally {
    if (originalGet) Object.defineProperty(Object.prototype, 'get', originalGet);
    else delete Object.prototype.get;
    if (originalSet) Object.defineProperty(Object.prototype, 'set', originalSet);
    else delete Object.prototype.set;
  }

  assert.equal(getCalls, 0);
  assert.equal(setCalls, 0);
});

test('array snapshot defines own elements without inherited index setters', () => {
  const originalZero = Object.getOwnPropertyDescriptor(Array.prototype, '0');
  let setterCalls = 0;

  try {
    Object.defineProperty(Array.prototype, '0', {
      configurable: true,
      set() {
        setterCalls += 1;
      },
    });
    const captured = captureReferencePlainData(['trusted'], 'array_index_poison');
    assert.equal(captured.length, 1);
    assert.equal(captured[0], 'trusted');
  } finally {
    if (originalZero) Object.defineProperty(Array.prototype, '0', originalZero);
    else delete Array.prototype[0];
  }

  assert.equal(setterCalls, 0);
});
