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
const HARNESS_KEYS = Object.freeze([
  'executeDownstream',
  'observeBinding',
  'trustedClock',
]);

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

function snapshotExactReferences(value, expectedKeys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || utilTypes.isProxy(value)) {
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
  const actual = Object.keys(descriptors).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`${label} has missing, hidden or unknown fields`);
  }

  const snapshot = Object.create(null);
  for (const key of expectedKeys) {
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

function canonicalClockInstant(value) {
  if (typeof value !== 'string' || !value.endsWith('Z')) {
    throw gateError('POMRX_GATE_E_TIME_INVALID', 'Trusted clock returned an invalid instant');
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
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
  let snapshot;
  try {
    snapshot = captureReferencePlainData(value, 'trusted Gate observer result');
  } catch {
    throw gateError(
      'POMRX_GATE_E_OBSERVER_FAILED',
      'Trusted binding observer returned non-inert or out-of-bounds data',
    );
  }

  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Trusted binding observer returned an invalid record');
  }
  const actual = Object.keys(snapshot).sort();
  const expected = [...OBSERVED_KEYS].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Trusted binding observer returned an invalid record');
  }
  if (typeof snapshot.binding_profile !== 'string'
    || !PROFILE_PATTERN.test(snapshot.binding_profile)) {
    throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Trusted binding observer returned an invalid profile');
  }
  for (const field of ['action_commitment', 'context_commitment']) {
    if (typeof snapshot[field] !== 'string' || !HASH_PATTERN.test(snapshot[field])) {
      throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Trusted binding observer returned an invalid commitment');
    }
  }
  return Object.freeze({
    binding_profile: snapshot.binding_profile,
    action_commitment: snapshot.action_commitment,
    context_commitment: snapshot.context_commitment,
    prepared_execution: snapshot.prepared_execution,
  });
}

function assertNotExpired(binding, now) {
  const expiresAt = new Date(binding.expires_at);
  if (now.getTime() >= expiresAt.getTime()) {
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
  const capabilityState = new WeakMap();

  function issueReferenceAuthorizationForTest(bindingInput, { witnessValidUntil } = {}) {
    const capabilityId = `cap-${crypto.randomBytes(16).toString('hex')}`;
    const prepared = prepareReferenceExactAuthorizationRecord(bindingInput, {
      witnessValidUntil,
      capabilityId,
    });
    const capability = Object.freeze(Object.create(null));
    capabilityState.set(capability, {
      state: 'AVAILABLE',
      binding: prepared.binding,
    });
    return Object.freeze({ capability, evidence: prepared.evidence });
  }

  function inspectCapabilityStateForTest(capability) {
    return capabilityState.get(capability)?.state ?? null;
  }

  function reserveCapability(capability) {
    const record = capabilityState.get(capability);
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
    const record = capabilityState.get(capability);
    if (!record || record.state !== 'VALIDATING') {
      throw gateError('POMRX_GATE_E_CAPABILITY_STALE', 'Reference capability cannot be rejected from its current state');
    }
    record.state = 'REJECTED';
  }

  function beginConsumption(capability) {
    const record = capabilityState.get(capability);
    if (!record || record.state !== 'VALIDATING') {
      throw gateError('POMRX_GATE_E_CAPABILITY_STALE', 'Reference capability cannot begin consumption');
    }
    record.state = 'CONSUMING';
  }

  function completeConsumption(capability, success) {
    const record = capabilityState.get(capability);
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
      const firstNow = sampleTrustedClock(trustedClock);
      assertNotExpired(binding, firstNow);
    } catch (error) {
      rejectCapability(capability);
      throw normalizeCapabilityError(error);
    }

    let observed;
    try {
      // The observer is a trusted async bootstrap dependency. JavaScript resolves
      // its return channel before this boundary. Once a value is resolved, Core
      // immediately captures it as detached bounded inert data before any binding
      // field is read or any prepared value can reach downstream.
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
      const preForwardNow = sampleTrustedClock(trustedClock);
      assertNotExpired(binding, preForwardNow);
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
