import crypto from 'node:crypto';
import { types as utilTypes } from 'node:util';

import {
  PomRxReferenceCapabilityError,
  prepareReferenceExactAuthorizationRecord,
} from '../authorization/reference-exact-authorization.mjs';
import {
  captureReferencePlainData,
} from '../reference-data/plain-data-snapshot.mjs';

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const PROFILE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{2,127}$/u;
const OBSERVED_KEYS = Object.freeze([
  'binding_profile',
  'action_commitment',
  'context_commitment',
  'prepared_execution',
]);
const OBSERVED_SORTED_KEYS = Object.freeze([
  'action_commitment',
  'binding_profile',
  'context_commitment',
  'prepared_execution',
]);
const HARNESS_KEYS = Object.freeze([
  'executeDownstream',
  'observeBinding',
  'trustedClock',
]);
const HARNESS_SORTED_KEYS = Object.freeze([
  'executeDownstream',
  'observeBinding',
  'trustedClock',
]);

// The Gate's local provenance and exact-object boundary are security-critical.
// Capture the constructors/reflection/temporal primitives used by the factory once
// at module initialization so post-import replacement cannot substitute capability
// state, rewrite detached bootstrap/observer snapshots, widen their shape, redirect
// sorting, or falsify validity-window checks. Security-sensitive iteration over the
// module-owned key sets is index-based rather than delegated to the mutable shared
// Array iterator. A resolved downstream object is detached to reference-owned plain
// data before the capability is marked successful; the final async return therefore
// cannot re-assimilate an inherited thenable after terminal success. Poisoning before
// module initialization remains outside this reference guarantee.
const REFLECT_APPLY = Reflect.apply;
const REFLECT_CONSTRUCT = Reflect.construct;
const ARRAY_CONSTRUCTOR = Array;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_SORT = Array.prototype.sort;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_OWN_PROPERTY_NAMES = Object.getOwnPropertyNames;
const OBJECT_GET_OWN_PROPERTY_SYMBOLS = Object.getOwnPropertySymbols;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_KEYS = Object.keys;
const OBJECT_PROTOTYPE = Object.prototype;
const UTIL_TYPES_IS_PROXY = utilTypes.isProxy;
const WEAK_MAP_CONSTRUCTOR = WeakMap;
const WEAK_MAP_GET = WeakMap.prototype.get;
const WEAK_MAP_SET = WeakMap.prototype.set;
const CRYPTO_RANDOM_BYTES = crypto.randomBytes;
const BUFFER_TO_STRING = Buffer.prototype.toString.call.bind(Buffer.prototype.toString);
const DATE_CONSTRUCTOR = Date;
const DATE_GET_TIME = Date.prototype.getTime;
const DATE_TO_ISO_STRING = Date.prototype.toISOString;
const NUMBER_IS_FINITE = Number.isFinite;
const STRING_ENDS_WITH = String.prototype.endsWith;

function arrayIsArray(value) {
  return REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value]);
}

function sortArray(value) {
  return REFLECT_APPLY(ARRAY_SORT, value, []);
}

function createObject(prototype) {
  return REFLECT_APPLY(OBJECT_CREATE, Object, [prototype]);
}

function freezeValue(value) {
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function objectDefineProperty(value, key, descriptor) {
  return REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [value, key, descriptor]);
}

function defineDetachedDataProperty(value, key, propertyValue) {
  const descriptor = createObject(null);
  descriptor.value = propertyValue;
  descriptor.enumerable = true;
  descriptor.writable = true;
  descriptor.configurable = true;
  objectDefineProperty(value, key, descriptor);
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

function objectKeys(value) {
  return REFLECT_APPLY(OBJECT_KEYS, Object, [value]);
}

function isProxy(value) {
  return REFLECT_APPLY(UTIL_TYPES_IS_PROXY, utilTypes, [value]);
}

function weakMapGet(map, key) {
  return REFLECT_APPLY(WEAK_MAP_GET, map, [key]);
}

function weakMapSet(map, key, value) {
  REFLECT_APPLY(WEAK_MAP_SET, map, [key, value]);
}

function dateFrom(value) {
  return REFLECT_CONSTRUCT(DATE_CONSTRUCTOR, [value]);
}

function dateGetTime(value) {
  return REFLECT_APPLY(DATE_GET_TIME, value, []);
}

function dateToISOString(value) {
  return REFLECT_APPLY(DATE_TO_ISO_STRING, value, []);
}

function numberIsFinite(value) {
  return REFLECT_APPLY(NUMBER_IS_FINITE, Number, [value]);
}

function stringEndsWith(value, suffix) {
  return REFLECT_APPLY(STRING_ENDS_WITH, value, [suffix]);
}

function exactSortedKeys(value) {
  return sortArray(objectKeys(value));
}

function sameSortedKeys(actual, expected) {
  if (actual.length !== expected.length) return false;
  for (let index = 0; index < actual.length; index += 1) {
    if (actual[index] !== expected[index]) return false;
  }
  return true;
}

export class PomRxGateError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PomRxGateError';
    this.code = code;
  }
}

function gateError(code, message) {
  return new PomRxGateError(code, message);
}

function snapshotExactReferences(value, expectedKeys, expectedSortedKeys, label) {
  if (!value || typeof value !== 'object' || arrayIsArray(value) || isProxy(value)) {
    throw new TypeError(`${label} must be an exact plain data object`);
  }

  const prototype = objectGetPrototypeOf(value);
  if (prototype !== OBJECT_PROTOTYPE && prototype !== null) {
    throw new TypeError(`${label} must use Object.prototype or a null prototype`);
  }
  if (objectGetOwnPropertySymbols(value).length !== 0) {
    throw new TypeError(`${label} cannot contain symbol keys`);
  }

  const descriptors = objectGetOwnPropertyDescriptors(value);
  const actual = exactSortedKeys(descriptors);
  if (!sameSortedKeys(actual, expectedSortedKeys)) {
    throw new TypeError(`${label} has missing, hidden or unknown fields`);
  }

  const snapshot = createObject(null);
  for (let index = 0; index < expectedKeys.length; index += 1) {
    const key = expectedKeys[index];
    const descriptor = descriptors[key];
    if (!descriptor
      || descriptor.enumerable !== true
      || typeof descriptor.get === 'function'
      || typeof descriptor.set === 'function'
      || !objectHasOwn(descriptor, 'value')) {
      throw new TypeError(`${label} fields must be enumerable data properties`);
    }
    snapshot[key] = descriptor.value;
  }
  return freezeValue(snapshot);
}

function snapshotObservedRecord(value) {
  if (!value || typeof value !== 'object' || arrayIsArray(value) || isProxy(value)) {
    throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Trusted binding observer returned an invalid record');
  }

  const prototype = objectGetPrototypeOf(value);
  if (prototype !== OBJECT_PROTOTYPE && prototype !== null) {
    throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Trusted binding observer record must be plain data');
  }
  if (objectGetOwnPropertySymbols(value).length !== 0) {
    throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Trusted binding observer record cannot contain symbol keys');
  }

  const descriptors = objectGetOwnPropertyDescriptors(value);
  const actual = exactSortedKeys(descriptors);
  if (!sameSortedKeys(actual, OBSERVED_SORTED_KEYS)) {
    throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Trusted binding observer returned an invalid record');
  }

  const snapshot = createObject(null);
  for (let index = 0; index < OBSERVED_KEYS.length; index += 1) {
    const key = OBSERVED_KEYS[index];
    const descriptor = descriptors[key];
    if (!descriptor
      || descriptor.enumerable !== true
      || typeof descriptor.get === 'function'
      || typeof descriptor.set === 'function'
      || !objectHasOwn(descriptor, 'value')) {
      throw gateError(
        'POMRX_GATE_E_OBSERVER_FAILED',
        'Trusted binding observer fields must be enumerable data properties',
      );
    }
    snapshot[key] = descriptor.value;
  }
  return freezeValue(snapshot);
}

function canonicalClockInstant(value) {
  if (typeof value !== 'string' || !stringEndsWith(value, 'Z')) {
    throw gateError('POMRX_GATE_E_TIME_INVALID', 'Trusted clock returned an invalid instant');
  }
  const parsed = dateFrom(value);
  if (!numberIsFinite(dateGetTime(parsed)) || dateToISOString(parsed) !== value) {
    throw gateError('POMRX_GATE_E_TIME_INVALID', 'Trusted clock returned an invalid instant');
  }
  return parsed;
}

function sampleTrustedClock(trustedClock) {
  let value;
  try {
    value = trustedClock();
  } catch {
    throw gateError('POMRX_GATE_E_TIME_INVALID', 'Trusted clock failed');
  }
  if (value && typeof value === 'object' && typeof value.then === 'function') {
    throw gateError('POMRX_GATE_E_TIME_INVALID', 'Trusted clock must be synchronous');
  }
  return canonicalClockInstant(value);
}

function validateObservedBinding(value) {
  const snapshot = snapshotObservedRecord(value);
  if (typeof snapshot.binding_profile !== 'string'
    || !PROFILE_PATTERN.test(snapshot.binding_profile)) {
    throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Trusted binding observer returned an invalid profile');
  }

  if (typeof snapshot.action_commitment !== 'string'
      || !HASH_PATTERN.test(snapshot.action_commitment)
      || typeof snapshot.context_commitment !== 'string'
      || !HASH_PATTERN.test(snapshot.context_commitment)) {
    throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Trusted binding observer returned an invalid commitment');
  }

  let preparedExecution;
  try {
    // Preserve the historical Gate budget exactly: prepared_execution is the
    // root of the bounded data contract. The fixed observer envelope must not
    // consume prepared depth or node budget.
    preparedExecution = captureReferencePlainData(
      snapshot.prepared_execution,
      'trusted Gate prepared execution',
    );
  } catch {
    throw gateError(
      'POMRX_GATE_E_OBSERVER_FAILED',
      'Trusted binding observer returned non-inert or out-of-bounds prepared data',
    );
  }

  return freezeValue({
    binding_profile: snapshot.binding_profile,
    action_commitment: snapshot.action_commitment,
    context_commitment: snapshot.context_commitment,
    prepared_execution: preparedExecution,
  });
}

function rematerializeDetachedResult(value, root = false) {
  if (value === null || typeof value !== 'object') return value;

  let result;
  if (arrayIsArray(value)) {
    result = REFLECT_CONSTRUCT(ARRAY_CONSTRUCTOR, [value.length]);
    for (let index = 0; index < value.length; index += 1) {
      defineDetachedDataProperty(
      result,
      index,
      rematerializeDetachedResult(value[index]),
    );
    }
  } else {
    result = createObject(OBJECT_PROTOTYPE);
    const descriptors = objectGetOwnPropertyDescriptors(value);
    const names = objectGetOwnPropertyNames(value);
    for (let index = 0; index < names.length; index += 1) {
      const key = names[index];
      const descriptor = descriptors[key];
      if (!descriptor || !objectHasOwn(descriptor, 'value')) {
        throw gateError(
          'POMRX_GATE_E_DOWNSTREAM_FAILED',
          'Detached downstream result lost its plain-data boundary',
        );
      }
      defineDetachedDataProperty(
      result,
      key,
      rematerializeDetachedResult(descriptor.value),
    );
    }
  }

  if (root) {
    if (objectHasOwn(result, 'then')) {
      throw gateError(
        'POMRX_GATE_E_DOWNSTREAM_FAILED',
        'Downstream result root cannot expose an own then field',
      );
    }
    objectDefineProperty(result, 'then', {
      value: undefined,
      enumerable: false,
      writable: false,
      configurable: false,
    });
  }
  return freezeValue(result);
}

function snapshotDownstreamResult(value) {
  if (value === null) return null;
  const type = typeof value;
  if (type !== 'object' && type !== 'function') return value;
  if (type === 'function') {
    throw gateError(
      'POMRX_GATE_E_DOWNSTREAM_FAILED',
      'Downstream returned a non-inert result after execution',
    );
  }
  try {
    const detached = captureReferencePlainData(value, 'trusted Gate downstream result');
    return rematerializeDetachedResult(detached, true);
  } catch (error) {
    if (error instanceof PomRxGateError) throw error;
    throw gateError(
      'POMRX_GATE_E_DOWNSTREAM_FAILED',
      'Downstream returned a non-inert or out-of-bounds result after execution',
    );
  }
}

function assertCapabilityActive(binding, now) {
  const nowMs = dateGetTime(now);
  const issuedAtMs = dateGetTime(dateFrom(binding.issued_at));
  const expiresAtMs = dateGetTime(dateFrom(binding.expires_at));
  if (nowMs < issuedAtMs) {
    throw gateError(
      'POMRX_GATE_E_CAPABILITY_NOT_YET_VALID',
      'Reference capability is not yet valid',
    );
  }
  if (nowMs >= expiresAtMs) {
    throw gateError('POMRX_GATE_E_CAPABILITY_EXPIRED', 'Reference capability is expired');
  }
}

function normalizeCapabilityError(error) {
  if (error instanceof PomRxGateError) return error;
  if (error instanceof PomRxReferenceCapabilityError) {
    return gateError(error.code, error.message);
  }
  return gateError('POMRX_GATE_E_CAPABILITY_REQUIRED', 'A branded reference capability is required');
}

function exactBindingMatches(binding, observed) {
  return binding.binding_profile === observed.binding_profile
    && binding.action_commitment === observed.action_commitment
    && binding.context_commitment === observed.context_commitment;
}

export function createReferenceSingleUseGateHarness(options) {
  const bootstrap = snapshotExactReferences(
    options,
    HARNESS_KEYS,
    HARNESS_SORTED_KEYS,
    'Reference Gate harness bootstrap',
  );
  const {
    trustedClock,
    observeBinding,
    executeDownstream,
  } = bootstrap;
  if (typeof trustedClock !== 'function'
    || typeof observeBinding !== 'function'
    || typeof executeDownstream !== 'function') {
    throw new TypeError('Reference Gate harness bootstrap dependencies must be functions');
  }

  // Capability lifecycle is private and bound to this Gate instance. A capability
  // created by another reference Gate cannot be consumed here. The constructor
  // and get/set dispatch are captured at module initialization so a later global
  // WeakMap replacement cannot rewrite the authorization binding stored here.
  const capabilityState = new WEAK_MAP_CONSTRUCTOR();
  let lastTrustedTimeMs = null;

  function sampleGateClock() {
    const now = sampleTrustedClock(trustedClock);
    const nowMs = dateGetTime(now);
    if (lastTrustedTimeMs !== null && nowMs < lastTrustedTimeMs) {
      throw gateError('POMRX_GATE_E_TIME_ROLLBACK', 'Trusted clock moved backwards');
    }
    lastTrustedTimeMs = nowMs;
    return now;
  }

  function issueReferenceAuthorizationForTest(bindingInput, { witnessValidUntil } = {}) {
    const capabilityId = `cap-${BUFFER_TO_STRING(CRYPTO_RANDOM_BYTES(16), 'hex')}`;
    const prepared = prepareReferenceExactAuthorizationRecord(bindingInput, {
      witnessValidUntil,
      capabilityId,
    });
    const capability = freezeValue(createObject(null));
    weakMapSet(capabilityState, capability, {
      state: 'AVAILABLE',
      binding: prepared.binding,
    });
    return freezeValue({ capability, evidence: prepared.evidence });
  }

  function inspectCapabilityStateForTest(capability) {
    return weakMapGet(capabilityState, capability)?.state ?? null;
  }

  function reserveCapability(capability) {
    const record = weakMapGet(capabilityState, capability);
    if (!record) {
      throw gateError('POMRX_GATE_E_CAPABILITY_REQUIRED', 'A capability from this reference Gate is required');
    }
    if (record.state !== 'AVAILABLE') {
      throw gateError('POMRX_GATE_E_CAPABILITY_STALE', 'Reference capability is no longer available');
    }
    record.state = 'VALIDATING';
    return record.binding;
  }

  function rejectCapability(capability) {
    const record = weakMapGet(capabilityState, capability);
    if (!record || record.state !== 'VALIDATING') {
      throw gateError('POMRX_GATE_E_CAPABILITY_STALE', 'Reference capability cannot be rejected from its current state');
    }
    record.state = 'REJECTED';
  }

  function beginConsumption(capability) {
    const record = weakMapGet(capabilityState, capability);
    if (!record || record.state !== 'VALIDATING') {
      throw gateError('POMRX_GATE_E_CAPABILITY_STALE', 'Reference capability cannot begin consumption');
    }
    record.state = 'CONSUMING';
  }

  function completeConsumption(capability, terminalState) {
    const record = weakMapGet(capabilityState, capability);
    if (!record || record.state !== 'CONSUMING') {
      throw gateError('POMRX_GATE_E_CAPABILITY_STALE', 'Reference capability is not consuming');
    }
    record.state = terminalState;
  }

  async function consume(capability, executionAttempt) {
    let binding;
    try {
      // Synchronous reservation happens before the first await.
      binding = reserveCapability(capability);
    } catch (error) {
      throw normalizeCapabilityError(error);
    }

    try {
      const firstNow = sampleGateClock();
      assertCapabilityActive(binding, firstNow);
    } catch (error) {
      rejectCapability(capability);
      throw normalizeCapabilityError(error);
    }

    let observed;
    try {
      // The observer is a trusted async bootstrap dependency. JavaScript resolves
      // its return channel before this boundary. Once a value is resolved, Core
      // captures the fixed record through data descriptors, then captures
      // prepared_execution as its own bounded root before semantic forwarding.
      observed = validateObservedBinding(await observeBinding(executionAttempt));
    } catch (error) {
      rejectCapability(capability);
      if (error instanceof PomRxGateError) throw error;
      throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Trusted binding observer failed');
    }

    if (!exactBindingMatches(binding, observed)) {
      rejectCapability(capability);
      throw gateError('POMRX_GATE_E_BINDING_MISMATCH', 'Observed execution binding does not match authorization');
    }

    try {
      const preForwardNow = sampleGateClock();
      assertCapabilityActive(binding, preForwardNow);
    } catch (error) {
      rejectCapability(capability);
      throw normalizeCapabilityError(error);
    }

    beginConsumption(capability);

    // The caller-owned executionAttempt is never forwarded. Only the detached,
    // frozen snapshot captured from the trusted observer can reach downstream.
    // A synchronous throw is locally classifiable. Once a result channel exists,
    // an asynchronous rejection is ambiguous and must not invent effect truth.
    let downstreamResult;
    try {
      downstreamResult = executeDownstream(observed.prepared_execution);
    } catch {
      completeConsumption(capability, 'CONSUMED_ERROR');
      throw gateError('POMRX_GATE_E_DOWNSTREAM_FAILED', 'Downstream execution failed synchronously');
    }

    let resolvedResult;
    try {
      resolvedResult = await downstreamResult;
    } catch {
      completeConsumption(capability, 'CONSUMED_UNKNOWN');
      throw gateError(
        'POMRX_GATE_E_DOWNSTREAM_FAILED',
        'Downstream execution failed or its asynchronous result channel is ambiguous',
      );
    }

    let detachedResult;
    try {
      detachedResult = snapshotDownstreamResult(resolvedResult);
    } catch (error) {
      completeConsumption(capability, 'CONSUMED_UNKNOWN');
      if (error instanceof PomRxGateError) throw error;
      throw gateError(
        'POMRX_GATE_E_DOWNSTREAM_FAILED',
        'Downstream result could not be detached safely',
      );
    }

    completeConsumption(capability, 'CONSUMED_SUCCESS');
    return detachedResult;
  }

  const gate = freezeValue({ consume });
  const testAuthority = freezeValue({
    issueReferenceAuthorizationForTest,
    inspectCapabilityStateForTest,
  });

  return freezeValue({ gate, testAuthority });
}
