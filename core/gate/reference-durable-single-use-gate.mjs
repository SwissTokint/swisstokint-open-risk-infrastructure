import { AsyncLocalStorage } from 'node:async_hooks';
import { types as utilTypes } from 'node:util';

import {
  captureReferencePlainData,
} from '../reference-data/plain-data-snapshot.mjs';
import {
  createReferenceDurableClaimStore,
} from './reference-durable-claim-store.mjs';
import {
  PomRxGateError,
  createReferenceSingleUseGateHarness,
} from './reference-single-use-gate.mjs';

const BOOTSTRAP_KEYS = Object.freeze([
  'rootDir',
  'executeDownstream',
  'observeBinding',
  'trustedClock',
]);
const ISSUE_OPTION_KEY = 'witnessValidUntil';

// This composition boundary sits in front of two independently reviewed Core
// reference primitives. Capture the reflection/state intrinsics and constructors
// it depends on at module initialization so a later same-realm mutation cannot
// widen bootstrap shape, turn an accessor into a trusted dependency, substitute
// the detached bootstrap snapshot, forge local capability provenance, re-open a
// wrapper-reserved capability, or rewrite an internal Promise result channel.
// Caller-supplied reference issuance options are captured here as exact own data
// before they reach the inner Gate so Proxy or accessor behavior cannot run
// during inner destructuring. Security-sensitive iteration over module-owned key
// sets is index-based so a later Array iterator replacement cannot rewrite the
// bootstrap contract. The explicit close lifecycle prevents the composed harness
// from retaining the durable root descriptor indefinitely and drains any
// already-started consume before the store descriptor is released. Poisoning
// before module initialization and a generally compromised runtime remain
// outside this reference guarantee.
const REFLECT_APPLY = Reflect.apply;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_OWN_PROPERTY_NAMES = Object.getOwnPropertyNames;
const OBJECT_GET_OWN_PROPERTY_SYMBOLS = Object.getOwnPropertySymbols;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_PROTOTYPE = Object.prototype;
const UTIL_TYPES_IS_PROXY = utilTypes.isProxy;
const UTIL_TYPES_IS_PROMISE = utilTypes.isPromise;
const WEAK_MAP_CONSTRUCTOR = WeakMap;
const WEAK_MAP_GET = WeakMap.prototype.get;
const WEAK_MAP_SET = WeakMap.prototype.set;
const PROMISE_CONSTRUCTOR = Promise;
const PROMISE_THEN = Promise.prototype.then;
const PROMISE_CATCH = Promise.prototype.catch;
const PROMISE_FINALLY = Promise.prototype.finally;
const PROMISE_SPECIES_KEY = Symbol.species;
const ASYNC_LOCAL_STORAGE_CONSTRUCTOR = AsyncLocalStorage;
const ASYNC_LOCAL_STORAGE_RUN = AsyncLocalStorage.prototype.run;
const ASYNC_LOCAL_STORAGE_GET_STORE = AsyncLocalStorage.prototype.getStore;

function createObject(prototype) {
  return REFLECT_APPLY(OBJECT_CREATE, Object, [prototype]);
}

function freezeValue(value) {
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function objectDefineProperty(value, key, descriptor) {
  return REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [value, key, descriptor]);
}

function objectGetOwnPropertyDescriptors(value) {
  return REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
}

function objectGetOwnPropertyNames(value) {
  return REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_NAMES, Object, [value]);
}

function objectGetOwnPropertySymbols(value) {
  return REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_SYMBOLS, Object, [value]);
}

function objectGetPrototypeOf(value) {
  return REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]);
}

function objectHasOwn(value, key) {
  return REFLECT_APPLY(OBJECT_HAS_OWN, Object, [value, key]);
}

function isProxy(value) {
  return REFLECT_APPLY(UTIL_TYPES_IS_PROXY, utilTypes, [value]);
}

function isPromise(value) {
  return REFLECT_APPLY(UTIL_TYPES_IS_PROMISE, utilTypes, [value]);
}

function weakMapGet(map, key) {
  return REFLECT_APPLY(WEAK_MAP_GET, map, [key]);
}

function weakMapSet(map, key, value) {
  REFLECT_APPLY(WEAK_MAP_SET, map, [key, value]);
}

function asyncLocalRun(storage, value, callback) {
  return REFLECT_APPLY(ASYNC_LOCAL_STORAGE_RUN, storage, [value, callback]);
}

function asyncLocalGetStore(storage) {
  return REFLECT_APPLY(ASYNC_LOCAL_STORAGE_GET_STORE, storage, []);
}

function makePromiseDescriptor(value) {
  const descriptor = createObject(null);
  descriptor.value = value;
  descriptor.enumerable = false;
  descriptor.writable = false;
  descriptor.configurable = false;
  return freezeValue(descriptor);
}

function makePromiseSpeciesCarrier() {
  const carrier = createObject(null);
  objectDefineProperty(
    carrier,
    PROMISE_SPECIES_KEY,
    makePromiseDescriptor(PROMISE_CONSTRUCTOR),
  );
  return freezeValue(carrier);
}

const PROMISE_SPECIES_CARRIER = makePromiseSpeciesCarrier();
const PROMISE_OWN_CONSTRUCTOR_DESCRIPTOR = makePromiseDescriptor(PROMISE_SPECIES_CARRIER);

function stablePromiseThen(onFulfilled, onRejected) {
  // Invoke the captured native then directly. The source Promise owns a frozen
  // constructor carrier whose @@species is the captured intrinsic Promise, so
  // native chaining cannot consult a later mutation of Promise[Symbol.species].
  return stabilizePromise(REFLECT_APPLY(
    PROMISE_THEN,
    this,
    [onFulfilled, onRejected],
  ));
}

const PROMISE_OWN_SAFE_THEN_DESCRIPTOR = makePromiseDescriptor(stablePromiseThen);

function stablePromiseCatch(onRejected) {
  // Promise.prototype.catch is specified in terms of the source promise's
  // `then` property. Route public catch through the captured safe `then`
  // directly so a later mutation of Promise.prototype.catch cannot become a
  // post-success result substitution channel.
  return REFLECT_APPLY(stablePromiseThen, this, [undefined, onRejected]);
}

const PROMISE_OWN_SAFE_CATCH_DESCRIPTOR = makePromiseDescriptor(stablePromiseCatch);

function stablePromiseFinally(onFinally) {
  // Invoke the captured native finally directly. The source Promise owns the
  // safe then dispatch and immutable constructor carrier, so native finally
  // cannot reach a post-import Promise.prototype.finally/then/species mutation.
  return stabilizePromise(REFLECT_APPLY(
    PROMISE_FINALLY,
    this,
    [onFinally],
  ));
}

const PROMISE_OWN_SAFE_FINALLY_DESCRIPTOR = makePromiseDescriptor(stablePromiseFinally);

function isSafePromiseSpeciesCarrier(value) {
  if (value === null
      || typeof value !== 'object'
      || isProxy(value)
      || objectGetPrototypeOf(value) !== null
      || objectGetOwnPropertyNames(value).length !== 0) {
    return false;
  }
  const symbols = objectGetOwnPropertySymbols(value);
  if (symbols.length !== 1 || symbols[0] !== PROMISE_SPECIES_KEY) return false;
  const descriptor = objectGetOwnPropertyDescriptors(value)[PROMISE_SPECIES_KEY];
  return Boolean(descriptor)
    && objectHasOwn(descriptor, 'value')
    && descriptor.value === PROMISE_CONSTRUCTOR
    && descriptor.enumerable === false
    && descriptor.writable === false
    && descriptor.configurable === false
    && !objectHasOwn(descriptor, 'get')
    && !objectHasOwn(descriptor, 'set');
}

function stabilizePromise(promise) {
  // Public promises created by this boundary own safe then/catch/finally
  // dispatch and a null-prototype constructor carrier with immutable
  // @@species=%Promise%. Promises already stabilized by another reviewed Core
  // primitive may retain constructor=%Promise% plus captured native methods and
  // are accepted as trusted internal channels rather than rewritten through
  // non-configurable slots.
  const descriptors = objectGetOwnPropertyDescriptors(promise);
  if (!objectHasOwn(descriptors, 'constructor')) {
    objectDefineProperty(promise, 'constructor', PROMISE_OWN_CONSTRUCTOR_DESCRIPTOR);
  } else if (descriptors.constructor.value !== PROMISE_CONSTRUCTOR
      && descriptors.constructor.value !== PROMISE_SPECIES_CARRIER
      && !isSafePromiseSpeciesCarrier(descriptors.constructor.value)) {
    throw new TypeError('Reference durable Gate Promise constructor channel is invalid');
  }

  if (!objectHasOwn(descriptors, 'then')) {
    objectDefineProperty(promise, 'then', PROMISE_OWN_SAFE_THEN_DESCRIPTOR);
  } else if (descriptors.then.value !== PROMISE_THEN
      && descriptors.then.value !== stablePromiseThen) {
    throw new TypeError('Reference durable Gate Promise then channel is invalid');
  }

  if (!objectHasOwn(descriptors, 'catch')) {
    objectDefineProperty(promise, 'catch', PROMISE_OWN_SAFE_CATCH_DESCRIPTOR);
  } else if (descriptors.catch.value !== PROMISE_CATCH
      && descriptors.catch.value !== stablePromiseCatch) {
    throw new TypeError('Reference durable Gate Promise catch channel is invalid');
  }

  if (!objectHasOwn(descriptors, 'finally')) {
    objectDefineProperty(promise, 'finally', PROMISE_OWN_SAFE_FINALLY_DESCRIPTOR);
  } else if (descriptors.finally.value !== PROMISE_FINALLY
      && descriptors.finally.value !== stablePromiseFinally) {
    throw new TypeError('Reference durable Gate Promise finally channel is invalid');
  }
  return promise;
}

function resolvedPromise(value) {
  return stabilizePromise(new PROMISE_CONSTRUCTOR((resolve) => resolve(value)));
}

function rejectedPromise(error) {
  return stabilizePromise(new PROMISE_CONSTRUCTOR((_resolve, reject) => reject(error)));
}

function isOwnEnumerableDataDescriptor(descriptor) {
  return Boolean(descriptor)
    && objectHasOwn(descriptor, 'value')
    && objectHasOwn(descriptor, 'enumerable')
    && descriptor.enumerable === true
    && !objectHasOwn(descriptor, 'get')
    && !objectHasOwn(descriptor, 'set');
}

function captureBootstrap(value) {
  if (!value || typeof value !== 'object' || isProxy(value)) {
    throw new TypeError('Reference durable Gate bootstrap must be a non-Proxy plain object');
  }
  const prototype = objectGetPrototypeOf(value);
  if (prototype !== OBJECT_PROTOTYPE && prototype !== null) {
    throw new TypeError('Reference durable Gate bootstrap must use Object.prototype or a null prototype');
  }
  if (objectGetOwnPropertySymbols(value).length !== 0) {
    throw new TypeError('Reference durable Gate bootstrap cannot contain symbol keys');
  }

  const names = objectGetOwnPropertyNames(value);
  const descriptors = objectGetOwnPropertyDescriptors(value);
  if (names.length !== BOOTSTRAP_KEYS.length) {
    throw new TypeError('Reference durable Gate bootstrap has missing, hidden or unknown fields');
  }

  const snapshot = createObject(null);
  for (let index = 0; index < BOOTSTRAP_KEYS.length; index += 1) {
    const key = BOOTSTRAP_KEYS[index];
    if (!objectHasOwn(descriptors, key)
        || !isOwnEnumerableDataDescriptor(descriptors[key])) {
      throw new TypeError(`Reference durable Gate bootstrap.${key} must be an enumerable data property`);
    }
    snapshot[key] = descriptors[key].value;
  }
  return freezeValue(snapshot);
}

function captureIssueOptions(value) {
  if (!value || typeof value !== 'object' || isProxy(value)) {
    throw new TypeError('Reference durable Gate issueOptions must be a non-Proxy plain object');
  }
  const prototype = objectGetPrototypeOf(value);
  if (prototype !== OBJECT_PROTOTYPE && prototype !== null) {
    throw new TypeError('Reference durable Gate issueOptions must use Object.prototype or a null prototype');
  }
  if (objectGetOwnPropertySymbols(value).length !== 0) {
    throw new TypeError('Reference durable Gate issueOptions cannot contain symbol keys');
  }

  const names = objectGetOwnPropertyNames(value);
  if (names.length > 1 || (names.length === 1 && names[0] !== ISSUE_OPTION_KEY)) {
    throw new TypeError('Reference durable Gate issueOptions has hidden or unknown fields');
  }
  const descriptors = objectGetOwnPropertyDescriptors(value);
  const snapshot = createObject(null);
  if (names.length === 1) {
    const descriptor = descriptors[ISSUE_OPTION_KEY];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      throw new TypeError(
        'Reference durable Gate issueOptions.witnessValidUntil must be an enumerable data property',
      );
    }
    snapshot[ISSUE_OPTION_KEY] = descriptor.value;
  }
  return freezeValue(snapshot);
}

function gateError(code, message) {
  return new PomRxGateError(code, message);
}

function captureProducerResult(value) {
  const type = typeof value;
  if (value === null || (type !== 'object' && type !== 'function')) return value;
  if (type === 'function') {
    throw gateError(
      'POMRX_GATE_E_DOWNSTREAM_FAILED',
      'Asynchronous downstream result channel cannot capture a function',
    );
  }
  try {
    return captureReferencePlainData(value, 'trusted durable Gate producer result');
  } catch {
    throw gateError(
      'POMRX_GATE_E_DOWNSTREAM_FAILED',
      'Asynchronous downstream result channel requires bounded inert plain data',
    );
  }
}

/**
 * Compose the process-local reference Gate with the filesystem durable claim
 * primitive without changing either primitive's standalone authorization
 * semantics.
 *
 * The durable claim is acquired after the wrapper's synchronous local
 * reservation and before the inner Gate is allowed to observe binding or reach
 * downstream. Consequently one persisted capability tombstone owns the global
 * reference attempt across processes sharing the trusted local root. A later
 * validation rejection intentionally leaves the durable claim in RESERVED:
 * fail-closed replay prevention is stronger than pretending a downstream
 * terminal outcome exists when forwarding never happened.
 */
export function createReferenceDurableSingleUseGateHarness(rawOptions) {
  const options = captureBootstrap(rawOptions);
  if (typeof options.rootDir !== 'string') {
    throw new TypeError('Reference durable Gate rootDir must be a string');
  }
  if (typeof options.trustedClock !== 'function'
      || typeof options.observeBinding !== 'function'
      || typeof options.executeDownstream !== 'function') {
    throw new TypeError('Reference durable Gate bootstrap dependencies must be functions');
  }

  function executeDurableDownstream(preparedExecution) {
    let captureState = 'OPEN';
    let capturedResult;

    function capture(value) {
      if (captureState !== 'OPEN') {
        captureState = 'FAILED';
        throw gateError(
          'POMRX_GATE_E_DOWNSTREAM_FAILED',
          'Asynchronous downstream result channel is one-shot',
        );
      }
      try {
        capturedResult = captureProducerResult(value);
      } catch (error) {
        captureState = 'FAILED';
        throw error;
      }
      captureState = 'CAPTURED';
    }

    const resultChannel = createObject(null);
    resultChannel.capture = capture;
    freezeValue(resultChannel);

    let producerResult;
    try {
      producerResult = options.executeDownstream(preparedExecution, resultChannel);
    } catch (error) {
      captureState = 'CLOSED';
      throw error;
    }

    if (!isPromise(producerResult)) {
      if (captureState === 'FAILED') {
        captureState = 'CLOSED';
        throw gateError(
          'POMRX_GATE_E_DOWNSTREAM_FAILED',
          'Downstream result channel failed before synchronous completion',
        );
      }
      if (captureState === 'CAPTURED') {
        captureState = 'CLOSED';
        if (producerResult !== undefined) {
          throw gateError(
            'POMRX_GATE_E_DOWNSTREAM_FAILED',
            'Downstream cannot mix a captured result with a direct synchronous result',
          );
        }
        return capturedResult;
      }
      captureState = 'CLOSED';
      return producerResult;
    }

    let completionResolve;
    let completionReject;
    const completionPromise = new PROMISE_CONSTRUCTOR((resolve, reject) => {
      completionResolve = resolve;
      completionReject = reject;
    });

    try {
      const producerPromise = stabilizePromise(producerResult);
      REFLECT_APPLY(PROMISE_THEN, producerPromise, [
        () => {
          if (captureState === 'CAPTURED') {
            captureState = 'CLOSED';
            completionResolve(capturedResult);
            return;
          }
          captureState = 'CLOSED';
          completionReject(gateError(
            'POMRX_GATE_E_DOWNSTREAM_FAILED',
            'Asynchronous downstream must capture its result through the Core-owned result channel',
          ));
        },
        (error) => {
          captureState = 'CLOSED';
          completionReject(error);
        },
      ]);
    } catch {
      captureState = 'CLOSED';
      completionReject(gateError(
        'POMRX_GATE_E_DOWNSTREAM_FAILED',
        'Asynchronous downstream result channel could not be observed safely',
      ));
    }

    // Deliberately return an ordinary intrinsic Promise here. The inner Gate
    // owns the next boundary and immediately pins its constructor/then slots
    // before awaiting it. Returning this raw Core-owned completion Promise avoids
    // handing the inner Gate a non-configurable Promise surface owned by this
    // outer composition layer.
    return completionPromise;
  }

  // The store is created inside the composition boundary rather than accepted as
  // a caller-provided structural object. This keeps the claimed durable behavior
  // tied to the reviewed reference store implementation and its root checks.
  const durableStore = createReferenceDurableClaimStore({ rootDir: options.rootDir });
  const inner = createReferenceSingleUseGateHarness({
    trustedClock: options.trustedClock,
    observeBinding: options.observeBinding,
    executeDownstream: executeDurableDownstream,
  });

  const capabilityMetadata = new WEAK_MAP_CONSTRUCTOR();
  const wrapperState = new WEAK_MAP_CONSTRUCTOR();
  const consumeContext = new ASYNC_LOCAL_STORAGE_CONSTRUCTOR();
  let lifecycleState = 'OPEN';
  let activeConsumes = 0;
  let drainResolve = null;
  let closePromise = null;

  function beginConsume() {
    if (lifecycleState !== 'OPEN') {
      throw gateError(
        'POMRX_GATE_E_CLOSED',
        'Reference durable Gate is closing or closed',
      );
    }
    activeConsumes += 1;
  }

  function endConsume() {
    activeConsumes -= 1;
    if (activeConsumes === 0 && drainResolve !== null) {
      const resolve = drainResolve;
      drainResolve = null;
      resolve();
    }
  }

  function issueReferenceAuthorizationForTest(bindingInput, issueOptions = {}) {
    if (lifecycleState !== 'OPEN') {
      throw gateError('POMRX_GATE_E_CLOSED', 'Reference durable Gate is closing or closed');
    }
    const capturedIssueOptions = captureIssueOptions(issueOptions);
    const issued = inner.testAuthority.issueReferenceAuthorizationForTest(
      bindingInput,
      capturedIssueOptions,
    );
    weakMapSet(capabilityMetadata, issued.capability, freezeValue({
      capabilityId: issued.evidence.binding.capability_id,
      authorizationCommitment: issued.evidence.authorization_commitment,
    }));
    weakMapSet(wrapperState, issued.capability, { state: 'AVAILABLE' });
    return issued;
  }

  function requireLocalCapability(capability) {
    const metadata = weakMapGet(capabilityMetadata, capability);
    const state = weakMapGet(wrapperState, capability);
    if (!metadata || !state) {
      throw gateError(
        'POMRX_GATE_E_CAPABILITY_REQUIRED',
        'A capability from this reference durable Gate is required',
      );
    }
    return { metadata, state };
  }

  function inspectCapabilityStateForTest(capability) {
    const { state } = requireLocalCapability(capability);
    if (state.state === 'VALIDATING') {
      const innerState = inner.testAuthority.inspectCapabilityStateForTest(capability);
      if (innerState !== null && innerState !== 'AVAILABLE') return innerState;
    }
    return state.state;
  }

  function inspectDurableStateForTest(capability) {
    if (lifecycleState !== 'OPEN') {
      return rejectedPromise(
        gateError('POMRX_GATE_E_CLOSED', 'Reference durable Gate is closing or closed'),
      );
    }
    let metadata;
    try {
      ({ metadata } = requireLocalCapability(capability));
    } catch (error) {
      return rejectedPromise(error);
    }
    return stabilizePromise(durableStore.inspect({
      capabilityId: metadata.capabilityId,
      authorizationCommitment: metadata.authorizationCommitment,
    }));
  }

  async function consumeImpl(capability, executionAttempt) {
    const { metadata, state } = requireLocalCapability(capability);
    if (state.state !== 'AVAILABLE') {
      throw gateError(
        'POMRX_GATE_E_CAPABILITY_STALE',
        'Reference durable capability is no longer available',
      );
    }

    // This synchronous wrapper reservation happens before the first await. It
    // preserves the local at-most-once property even before filesystem I/O and
    // ensures a second local call cannot race its own durable claim.
    state.state = 'VALIDATING';

    let durableClaim;
    try {
      durableClaim = await stabilizePromise(durableStore.claim({
        capabilityId: metadata.capabilityId,
        authorizationCommitment: metadata.authorizationCommitment,
      }));
    } catch (error) {
      state.state = 'REJECTED';
      throw error;
    }

    let result;
    try {
      result = await stabilizePromise(inner.gate.consume(capability, executionAttempt));
    } catch (error) {
      const innerState = inner.testAuthority.inspectCapabilityStateForTest(capability);
      if (innerState === 'CONSUMED_ERROR') {
        state.state = 'CONSUMED_ERROR';
        try {
          await stabilizePromise(durableStore.complete(durableClaim.handle, 'error'));
        } catch (durableError) {
          throw durableError;
        }
      } else if (innerState === 'CONSUMED_SUCCESS') {
        state.state = 'CONSUMED_SUCCESS';
        try {
          await stabilizePromise(durableStore.complete(durableClaim.handle, 'success'));
        } catch (durableError) {
          throw durableError;
        }
      } else if (innerState === 'CONSUMED_UNKNOWN') {
        state.state = 'CONSUMED_UNKNOWN';
        await stabilizePromise(durableStore.abandon(durableClaim.handle));
      } else {
        state.state = 'REJECTED';
        await stabilizePromise(durableStore.abandon(durableClaim.handle));
      }
      throw error;
    }

    state.state = 'CONSUMED_SUCCESS';
    await stabilizePromise(durableStore.complete(durableClaim.handle, 'success'));
    return result;
  }

  function consume(capability, executionAttempt) {
    // The token is private, null-prototype and mutable only by this closure. An
    // async descendant retains the same token, but `active` is cleared when the
    // originating consume actually finishes. That distinguishes true reentrant
    // close from a later descendant close without losing the self-deadlock guard.
    const consumeToken = createObject(null);
    consumeToken.active = true;

    let resultPromise;
    try {
      resultPromise = asyncLocalRun(consumeContext, consumeToken, () => {
        beginConsume();
        const operationPromise = stabilizePromise(consumeImpl(capability, executionAttempt));
        return stabilizePromise((async () => {
          try {
            return await operationPromise;
          } finally {
            consumeToken.active = false;
            endConsume();
          }
        })());
      });
    } catch (error) {
      consumeToken.active = false;
      return rejectedPromise(error);
    }
    return stabilizePromise(resultPromise);
  }

  function close() {
    const consumeToken = asyncLocalGetStore(consumeContext);
    if (consumeToken !== undefined && consumeToken !== null && consumeToken.active === true) {
      return rejectedPromise(gateError(
        'POMRX_GATE_E_REENTRANT_CLOSE',
        'Reference durable Gate cannot close from its active consume context',
      ));
    }
    if (lifecycleState === 'CLOSED') return resolvedPromise(undefined);
    if (lifecycleState === 'CLOSING') return closePromise;

    lifecycleState = 'CLOSING';
    closePromise = stabilizePromise((async () => {
      try {
        if (activeConsumes > 0) {
          const drainPromise = stabilizePromise(new PROMISE_CONSTRUCTOR((resolve) => {
            drainResolve = resolve;
          }));
          await drainPromise;
        }
        await stabilizePromise(durableStore.close());
      } finally {
        lifecycleState = 'CLOSED';
      }
    })());
    return closePromise;
  }

  const gate = freezeValue({ consume });
  const testAuthority = freezeValue({
    issueReferenceAuthorizationForTest,
    inspectCapabilityStateForTest,
    inspectDurableStateForTest,
  });

  return freezeValue({ gate, testAuthority, close });
}
