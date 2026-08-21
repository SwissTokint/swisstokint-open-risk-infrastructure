import assert from 'node:assert/strict';
import test from 'node:test';
import { types as utilTypes } from 'node:util';

import {
  PomRxPlainDataError,
  captureReferencePlainData,
} from '../core/reference-data/plain-data-snapshot.mjs';
import {
  createReferenceSingleUseGateHarness,
} from '../core/gate/reference-single-use-gate.mjs';

const h = (character) => character.repeat(64);

function expectPlainDataCode(error, code) {
  assert.ok(error instanceof PomRxPlainDataError);
  assert.equal(error.code, code);
  return true;
}

function bindingInput() {
  return {
    binding_profile: 'pom-rx-core-reference/0.1',
    run_id: 'run-plain-data-intrinsic-0001',
    agent_ref: 'agent-plain-data-intrinsic-01',
    subject_ref: 'subject-plain-data-intrinsic-01',
    method_hash: h('1'),
    policy_hash: h('2'),
    action_commitment: h('3'),
    context_commitment: h('4'),
    preflight_receipt_hash: h('5'),
    witness_ack_hash: h('6'),
    source_key_id: `ed25519-${'a'.repeat(32)}`,
    witness_key_id: `ed25519-${'b'.repeat(32)}`,
    verification_profile: 'pom-rx-v0.1/strict-errata-1',
    verifier_version: 'pom-rx-v0.1-strict-verifier/1',
    implementation_artifact_sha256: h('7'),
    effective_verification_policy_sha256: h('8'),
    issued_at: '2026-08-21T05:00:00.000Z',
    expires_at: '2026-08-21T05:00:30.000Z',
  };
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
            // Vulnerable live Object.create snapshots lose the captured request.
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
  assert.equal(captured.values.length, 2);
  assert.equal(captured.values[0], 1);
  assert.equal(captured.values[1], 2);
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

    const unsafe = originalObjectWithNullPrototype();
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

  function originalObjectWithNullPrototype() {
    return Reflect.apply(Object.create, Object, [null]);
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

test('Gate prepared execution remains exact under post-issuance Object.create poisoning', async () => {
  let evidence;
  let downstreamValue;
  const harness = createReferenceSingleUseGateHarness({
    trustedClock: (() => {
      const values = ['2026-08-21T05:00:01.000Z', '2026-08-21T05:00:02.000Z'];
      let index = 0;
      return () => values[Math.min(index++, values.length - 1)];
    })(),
    observeBinding: async () => ({
      binding_profile: evidence.binding.binding_profile,
      action_commitment: evidence.binding.action_commitment,
      context_commitment: evidence.binding.context_commitment,
      prepared_execution: {
        request: 'observer-prepared-value',
      },
    }),
    executeDownstream: async (preparedExecution) => {
      downstreamValue = preparedExecution.request;
      return 'ok';
    },
  });

  const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
    witnessValidUntil: '2026-08-21T05:01:00.000Z',
  });
  evidence = issued.evidence;

  const originalObjectCreate = Object.create;
  try {
    Object.create = function poisonedObjectCreate(prototype) {
      const value = originalObjectCreate(prototype);
      if (prototype === null) {
        Object.defineProperty(value, 'request', {
          configurable: true,
          enumerable: true,
          get() {
            return 'poisoned-prepared-value';
          },
          set() {
            // A vulnerable snapshot silently discards the observer value here.
          },
        });
      }
      return value;
    };

    assert.equal(await harness.gate.consume(issued.capability, { request: 'attempt' }), 'ok');
  } finally {
    Object.create = originalObjectCreate;
  }

  assert.equal(downstreamValue, 'observer-prepared-value');
  assert.equal(
    harness.testAuthority.inspectCapabilityStateForTest(issued.capability),
    'CONSUMED_SUCCESS',
  );
});

test('captured arrays detach implicit iteration and method lookup from live Array.prototype', () => {
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
    assert.equal(iterated.length, 2);
    assert.equal(iterated[0], 'trusted');
    assert.equal(iterated[1], 'second');
    assert.equal(captured.items.join(','), 'trusted,second');

    const mapped = captured.items.map((value) => value);
    assert.equal(mapped.length, 2);
    assert.equal(mapped[0], 'trusted');
    assert.equal(mapped[1], 'second');
  } finally {
    Array.prototype[Symbol.iterator] = originalIterator;
    Array.prototype.join = originalJoin;
    Array.prototype.map = originalMap;
  }
});

test('captured arrays do not inherit shared ArrayIterator prototype next semantics', () => {
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

  assert.equal(iterated.length, 2);
  assert.equal(iterated[0], 'trusted');
  assert.equal(iterated[1], 'second');
  assert.equal(valuesIterated.length, 2);
  assert.equal(valuesIterated[0], 'trusted');
  assert.equal(valuesIterated[1], 'second');
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
  assert.equal(second.assertions.length, 2);
  assert.equal(second.assertions[0].type, 'policy');
  assert.equal(second.assertions[1].type, 'simulation');
  assert.equal(Object.isFrozen(second.assertions), true);

  const foreign = ['untrusted'];
  Object.setPrototypeOf(foreign, Object.freeze(Object.create(null)));
  assert.throws(
    () => captureReferencePlainData(foreign, 'foreign_array_prototype'),
    (error) => expectPlainDataCode(error, 'POMRX_DATA_E_PROTOTYPE'),
  );
});

test('Gate prepared execution arrays remain exact under post-issuance Array prototype poisoning', async () => {
  let evidence;
  let downstreamItems;
  const harness = createReferenceSingleUseGateHarness({
    trustedClock: (() => {
      const values = ['2026-08-21T05:00:01.000Z', '2026-08-21T05:00:02.000Z'];
      let index = 0;
      return () => values[Math.min(index++, values.length - 1)];
    })(),
    observeBinding: async () => ({
      binding_profile: evidence.binding.binding_profile,
      action_commitment: evidence.binding.action_commitment,
      context_commitment: evidence.binding.context_commitment,
      prepared_execution: {
        items: ['trusted'],
      },
    }),
    executeDownstream: async (preparedExecution) => {
      downstreamItems = [...preparedExecution.items];
      return 'ok';
    },
  });

  const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
    witnessValidUntil: '2026-08-21T05:01:00.000Z',
  });
  evidence = issued.evidence;

  const originalIterator = Array.prototype[Symbol.iterator];
  try {
    Array.prototype[Symbol.iterator] = function* poisonedIterator() {
      yield 'forged';
    };
    assert.equal(await harness.gate.consume(issued.capability, { request: 'attempt' }), 'ok');
  } finally {
    Array.prototype[Symbol.iterator] = originalIterator;
  }

  assert.ok(downstreamItems);
  assert.equal(downstreamItems.length, 1);
  assert.equal(downstreamItems[0], 'trusted');
  assert.equal(
    harness.testAuthority.inspectCapabilityStateForTest(issued.capability),
    'CONSUMED_SUCCESS',
  );
});
