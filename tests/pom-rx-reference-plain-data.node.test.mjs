import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PomRxPlainDataError,
  REFERENCE_PLAIN_DATA_LIMITS,
  captureReferencePlainData,
} from '../core/reference-data/plain-data-snapshot.mjs';

function expectCode(code) {
  return (error) => {
    assert.ok(error instanceof PomRxPlainDataError);
    assert.equal(error.code, code);
    return true;
  };
}

test('captures an immutable defensive snapshot without caller aliasing', () => {
  const input = {
    schema_version: 'fixture/1',
    nested: {
      enabled: true,
      count: 7,
    },
    values: ['alpha', 2, null],
  };

  const snapshot = captureReferencePlainData(input, 'fixture');
  input.nested.count = 99;
  input.values[0] = 'mutated';

  assert.equal(Object.getPrototypeOf(snapshot), null);
  assert.equal(Object.getPrototypeOf(snapshot.nested), null);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.nested), true);
  assert.equal(Object.isFrozen(snapshot.values), true);
  assert.equal(snapshot.nested.count, 7);
  assert.equal(snapshot.values[0], 'alpha');
});

test('accepts null-prototype records and preserves only captured values', () => {
  const input = Object.create(null);
  input.alpha = 'one';
  input.beta = Object.assign(Object.create(null), { gamma: 3 });

  const snapshot = captureReferencePlainData(input);
  assert.equal(snapshot.alpha, 'one');
  assert.equal(snapshot.beta.gamma, 3);
  assert.equal(Object.getPrototypeOf(snapshot), null);
  assert.equal(Object.getPrototypeOf(snapshot.beta), null);
});

test('rejects object accessors without invoking them', () => {
  let reads = 0;
  const input = {};
  Object.defineProperty(input, 'value', {
    enumerable: true,
    get() {
      reads += 1;
      return 'secret';
    },
  });

  assert.throws(
    () => captureReferencePlainData(input),
    expectCode('POMRX_DATA_E_ACCESSOR'),
  );
  assert.equal(reads, 0);
});

test('rejects top-level and nested proxies before user traps execute', () => {
  let traps = 0;
  const trapsHandler = {
    get() {
      traps += 1;
      return undefined;
    },
    getOwnPropertyDescriptor() {
      traps += 1;
      return undefined;
    },
    getPrototypeOf() {
      traps += 1;
      return Object.prototype;
    },
    ownKeys() {
      traps += 1;
      return [];
    },
  };

  const topProxy = new Proxy({ value: 1 }, trapsHandler);
  assert.throws(
    () => captureReferencePlainData(topProxy),
    expectCode('POMRX_DATA_E_PROXY'),
  );
  assert.equal(traps, 0);

  const nestedProxy = new Proxy({ value: 2 }, trapsHandler);
  assert.throws(
    () => captureReferencePlainData({ nested: nestedProxy }),
    expectCode('POMRX_DATA_E_PROXY'),
  );
  assert.equal(traps, 0);
});

test('rejects sparse, decorated, accessor-backed and proxied arrays', () => {
  const sparse = [];
  sparse.length = 2;
  sparse[1] = 'second';
  assert.throws(
    () => captureReferencePlainData({ sparse }),
    expectCode('POMRX_DATA_E_ARRAY'),
  );

  const decorated = ['a'];
  decorated.extra = 'hidden semantics';
  assert.throws(
    () => captureReferencePlainData({ decorated }),
    expectCode('POMRX_DATA_E_ARRAY'),
  );

  let reads = 0;
  const accessorArray = ['safe'];
  Object.defineProperty(accessorArray, '0', {
    enumerable: true,
    configurable: true,
    get() {
      reads += 1;
      return 'unsafe';
    },
  });
  assert.throws(
    () => captureReferencePlainData({ accessorArray }),
    expectCode('POMRX_DATA_E_ARRAY'),
  );
  assert.equal(reads, 0);

  let traps = 0;
  const proxied = new Proxy(['a'], {
    get() {
      traps += 1;
      return undefined;
    },
    ownKeys() {
      traps += 1;
      return ['0', 'length'];
    },
  });
  assert.throws(
    () => captureReferencePlainData({ proxied }),
    expectCode('POMRX_DATA_E_PROXY'),
  );
  assert.equal(traps, 0);
});

test('rejects custom prototypes, symbols, hidden fields and unsafe keys', () => {
  const custom = Object.create({ inherited: true });
  custom.value = 1;
  assert.throws(
    () => captureReferencePlainData(custom),
    expectCode('POMRX_DATA_E_PROTOTYPE'),
  );

  const symbolKey = { value: 1 };
  symbolKey[Symbol('hidden')] = 2;
  assert.throws(
    () => captureReferencePlainData(symbolKey),
    expectCode('POMRX_DATA_E_SYMBOL'),
  );

  const hidden = { visible: 1 };
  Object.defineProperty(hidden, 'hidden', {
    enumerable: false,
    value: 2,
  });
  assert.throws(
    () => captureReferencePlainData(hidden),
    expectCode('POMRX_DATA_E_ACCESSOR'),
  );

  const unsafe = Object.create(null);
  Object.defineProperty(unsafe, '__proto__', {
    enumerable: true,
    value: 'blocked',
  });
  assert.throws(
    () => captureReferencePlainData(unsafe),
    expectCode('POMRX_DATA_E_KEY'),
  );
});

test('enforces bounded values and container width without coercion', () => {
  assert.throws(
    () => captureReferencePlainData({ value: 1.5 }),
    expectCode('POMRX_DATA_E_NUMBER'),
  );
  assert.throws(
    () => captureReferencePlainData({ value: Number.MAX_SAFE_INTEGER + 1 }),
    expectCode('POMRX_DATA_E_NUMBER'),
  );
  assert.throws(
    () => captureReferencePlainData({ value: 'x'.repeat(REFERENCE_PLAIN_DATA_LIMITS.max_string_length + 1) }),
    expectCode('POMRX_DATA_E_STRING'),
  );

  const tooWide = Object.create(null);
  for (let index = 0; index < REFERENCE_PLAIN_DATA_LIMITS.max_nodes; index += 1) {
    tooWide[`k${index}`] = index;
  }
  assert.throws(
    () => captureReferencePlainData(tooWide),
    expectCode('POMRX_DATA_E_NODES'),
  );

  const tooManyArrayNodes = Array.from(
    { length: REFERENCE_PLAIN_DATA_LIMITS.max_array_length },
    (_, index) => index,
  );
  assert.throws(
    () => captureReferencePlainData(tooManyArrayNodes),
    expectCode('POMRX_DATA_E_NODES'),
  );

  let deep = 'leaf';
  for (let depth = 0; depth <= REFERENCE_PLAIN_DATA_LIMITS.max_depth; depth += 1) {
    deep = { next: deep };
  }
  assert.throws(
    () => captureReferencePlainData(deep),
    expectCode('POMRX_DATA_E_DEPTH'),
  );
});
