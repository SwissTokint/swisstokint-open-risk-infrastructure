import crypto from 'node:crypto';
import { types as utilTypes } from 'node:util';

import {
  PomRxReferenceCapabilityError,
  prepareReferenceExactAuthorizationRecord,
} from '../authorization/reference-exact-authorization.mjs';
import {
  captureReferencePlainData,
} from '../reference-data/plain-data-snapshot.mjs';

const TRUSTED_OBJECT = globalThis.Object;
const TRUSTED_ARRAY = globalThis.Array;
const TRUSTED_REFLECT_APPLY = globalThis.Reflect.apply;
const TRUSTED_WEAK_MAP = globalThis.WeakMap;
const TRUSTED_WEAK_MAP_GET = TRUSTED_WEAK_MAP.prototype.get;
const TRUSTED_WEAK_MAP_SET = TRUSTED_WEAK_MAP.prototype.set;
const TRUSTED_DATE = globalThis.Date;
const TRUSTED_DATE_GET_TIME = TRUSTED_DATE.prototype.getTime;
const TRUSTED_DATE_TO_ISO_STRING = TRUSTED_DATE.prototype.toISOString;
const TRUSTED_NUMBER_IS_FINITE = globalThis.Number.isFinite;
const TRUSTED_REGEXP_TEST = globalThis.RegExp.prototype.test;
const TRUSTED_STRING_ENDS_WITH = globalThis.String.prototype.endsWith;
const TRUSTED_IS_PROXY = utilTypes.isProxy;
const TRUSTED_RANDOM_BYTES = crypto.randomBytes;
const TRUSTED_BUFFER_TO_STRING = globalThis.Buffer.prototype.toString;
const Object = TRUSTED_OBJECT.freeze({
  create: TRUSTED_OBJECT.create,
  defineProperty: TRUSTED_OBJECT.defineProperty,
  freeze: TRUSTED_OBJECT.freeze,
  getOwnPropertyDescriptors: TRUSTED_OBJECT.getOwnPropertyDescriptors,
  getOwnPropertySymbols: TRUSTED_OBJECT.getOwnPropertySymbols,
  getPrototypeOf: TRUSTED_OBJECT.getPrototypeOf,
  hasOwn: TRUSTED_OBJECT.hasOwn,
  keys: TRUSTED_OBJECT.keys,
  prototype: TRUSTED_OBJECT.prototype,
});
const Array = TRUSTED_OBJECT.freeze({
  isArray: TRUSTED_ARRAY.isArray,
});

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const PROFILE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{2,127}$/u;
const OBSERVED_KEYS = Object.freeze([
  'binding_profile',
  'action_commitment',
  'context_commitment',
  'prepared_execution',
]);
const HARNESS_KEYS = Object.freeze([
  'executeDownstream',
  'observeBinding',
  'trustedClock',
]);

export class PomRxGateError extends Error {
  constructor(code, message) {
    super(message);
    defineGateErrorField(this, 'name', 'PomRxGateError');
    defineGateErrorField(this, 'code', code);
  }
}

function defineGateErrorField(error, key, value) {
  const descriptor = Object.create(null);
  descriptor.value = value;
  descriptor.enumerable = true;
  descriptor.writable = true;
  descriptor.configurable = true;
  TRUSTED_REFLECT_APPLY(Object.defineProperty, null, [error, key, descriptor]);
}

function weakMapGet(map, key) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_WEAK_MAP_GET, map, [key]);
}

function weakMapSet(map, key, value) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_WEAK_MAP_SET, map, [key, value]);
}

function isProxy(value) {
  return ((typeof value === 'object' && value !== null)
      || typeof value === 'function')
    && TRUSTED_REFLECT_APPLY(TRUSTED_IS_PROXY, utilTypes, [value]);
}

function regexpTest(pattern, value) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_REGEXP_TEST, pattern, [value]);
}

function stringEndsWith(value, suffix) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_STRING_ENDS_WITH, value, [suffix]);
}

function dateGetTime(value) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_DATE_GET_TIME, value, []);
}

function dateToISOString(value) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_DATE_TO_ISO_STRING, value, []);
}

function gateError(code, message) {
  return new PomRxGateError(code, message);
}

function snapshotExactReferences(value, expectedKeys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || isProxy(value)) {
    throw new TypeError(`${label} must be an exact plain data object`);
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${label} must use Object.prototype or a null prototype`);
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    throw new TypeError(`${label} cannot contain symbol keys`);
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Object.keys(descriptors);
  if (actual.length !== expectedKeys.length) {
    throw new TypeError(`${label} has missing, hidden or unknown fields`);
  }
  for (let index = 0; index < expectedKeys.length; index += 1) {
    const key = expectedKeys[index];
    if (!Object.hasOwn(descriptors, key)) {
      throw new TypeError(`${label} has missing, hidden or unknown fields`);
    }
  }

  const snapshot = Object.create(null);
  for (let index = 0; index < expectedKeys.length; index += 1) {
    const key = expectedKeys[index];
    const descriptor = descriptors[key];
    if (!descriptor
      || descriptor.enumerable !== true
      || typeof descriptor.get === 'function'
      || typeof descriptor.set === 'function'
      || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${label} fields must be enumerable data properties`);
    }
    snapshot[key] = descriptor.value;
  }
  return Object.freeze(snapshot);
}

function snapshotObservedRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || isProxy(value)) {
    throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Trusted binding observer returned an invalid record');
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Trusted binding observer record must be plain data');
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Trusted binding observer record cannot contain symbol keys');
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Object.keys(descriptors);
  if (actual.length !== OBSERVED_KEYS.length) {
    throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Trusted binding observer returned an invalid record');
  }
  for (let index = 0; index < OBSERVED_KEYS.length; index += 1) {
    const key = OBSERVED_KEYS[index];
    if (!Object.hasOwn(descriptors, key)) {
      throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Trusted binding observer returned an invalid record');
    }
  }

  const snapshot = Object.create(null);
  for (let index = 0; index < OBSERVED_KEYS.length; index += 1) {
    const key = OBSERVED_KEYS[index];
    const descriptor = descriptors[key];
    if (!descriptor
      || descriptor.enumerable !== true
      || typeof descriptor.get === 'function'
      || typeof descriptor.set === 'function'
      || !Object.hasOwn(descriptor, 'value')) {
      throw gateError(
        'POMRX_GATE_E_OBSERVER_FAILED',
        'Trusted binding observer fields must be enumerable data properties',
      );
    }
    snapshot[key] = descriptor.value;
  }
  return Object.freeze(snapshot);
}

function canonicalClockInstant(value) {
  if (typeof value !== 'string' || !stringEndsWith(value, 'Z')) {
    throw gateError('POMRX_GATE_E_TIME_INVALID', 'Trusted clock returned an invalid instant');
  }
  const parsed = new TRUSTED_DATE(value);
  if (!TRUSTED_NUMBER_IS_FINITE(dateGetTime(parsed)) || dateToISOString(parsed) !== value) {
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
    || !regexpTest(PROFILE_PATTERN, snapshot.binding_profile)) {
    throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Trusted binding observer returned an invalid profile');
  }
  const commitmentFields = ['action_commitment', 'context_commitment'];
  for (let index = 0; index < commitmentFields.length; index += 1) {
    const field = commitmentFields[index];
    if (typeof snapshot[field] !== 'string' || !regexpTest(HASH_PATTERN, snapshot[field])) {
      throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Trusted binding observer returned an invalid commitment');
    }
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

  return Object.freeze({
    binding_profile: snapshot.binding_profile,
    action_commitment: snapshot.action_commitment,
    context_commitment: snapshot.context_commitment,
    prepared_execution: preparedExecution,
  });
}

function assertCapabilityActive(binding, now) {
  const nowMs = dateGetTime(now);
  const issuedAtMs = dateGetTime(new TRUSTED_DATE(binding.issued_at));
  const expiresAtMs = dateGetTime(new TRUSTED_DATE(binding.expires_at));
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
  // created by another reference Gate cannot be consumed here.
  const capabilityState = new TRUSTED_WEAK_MAP();
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
    const randomBytes = TRUSTED_REFLECT_APPLY(TRUSTED_RANDOM_BYTES, undefined, [16]);
    const randomHex = TRUSTED_REFLECT_APPLY(TRUSTED_BUFFER_TO_STRING, randomBytes, ['hex']);
    const capabilityId = `cap-${randomHex}`;
    const prepared = prepareReferenceExactAuthorizationRecord(bindingInput, {
      witnessValidUntil,
      capabilityId,
    });
    const capability = Object.freeze(Object.create(null));
    weakMapSet(capabilityState, capability, {
      state: 'AVAILABLE',
      binding: prepared.binding,
    });
    return Object.freeze({ capability, evidence: prepared.evidence });
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

  function completeConsumption(capability, success) {
    const record = weakMapGet(capabilityState, capability);
    if (!record || record.state !== 'CONSUMING') {
      throw gateError('POMRX_GATE_E_CAPABILITY_STALE', 'Reference capability is not consuming');
    }
    record.state = success ? 'CONSUMED_SUCCESS' : 'CONSUMED_ERROR';
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

    try {
      // The caller-owned executionAttempt is never forwarded. Only the detached,
      // frozen snapshot captured from the trusted observer can reach downstream.
      const result = await executeDownstream(observed.prepared_execution);
      completeConsumption(capability, true);
      return result;
    } catch {
      completeConsumption(capability, false);
      throw gateError('POMRX_GATE_E_DOWNSTREAM_FAILED', 'Downstream execution failed');
    }
  }

  const gate = Object.freeze({ consume });
  const testAuthority = Object.freeze({
    issueReferenceAuthorizationForTest,
    inspectCapabilityStateForTest,
  });

  return Object.freeze({ gate, testAuthority });
}
