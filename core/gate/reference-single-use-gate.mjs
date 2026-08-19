import crypto from 'node:crypto';

import {
  PomRxReferenceCapabilityError,
  prepareReferenceExactAuthorizationRecord,
} from '../authorization/reference-exact-authorization.mjs';

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const PROFILE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{2,127}$/u;
const OBSERVED_KEYS = Object.freeze([
  'binding_profile',
  'action_commitment',
  'context_commitment',
  'prepared_execution',
]);
const MAX_PREPARED_DEPTH = 8;
const MAX_PREPARED_NODES = 1_000;
const MAX_PREPARED_STRING_LENGTH = 16_384;
const MAX_PREPARED_KEY_LENGTH = 128;
const FORBIDDEN_PREPARED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

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

function clonePreparedExecution(value, depth = 0, budget = { remaining: MAX_PREPARED_NODES }) {
  if (depth > MAX_PREPARED_DEPTH || budget.remaining-- <= 0) {
    throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Prepared execution exceeds reference bounds');
  }

  if (value === null || typeof value === 'boolean') return value;

  if (typeof value === 'string') {
    if (value.length > MAX_PREPARED_STRING_LENGTH) {
      throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Prepared execution string is too long');
    }
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Prepared execution numbers must be safe integers');
    }
    return value;
  }

  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => clonePreparedExecution(item, depth + 1, budget)));
  }

  if (!value || typeof value !== 'object') {
    throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Prepared execution contains an unsupported value');
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Prepared execution must contain plain data only');
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Prepared execution cannot contain symbol keys');
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const output = Object.create(null);
  for (const key of Object.keys(value)) {
    const descriptor = descriptors[key];
    if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
      throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Prepared execution cannot contain accessors');
    }
    if (key.length === 0 || key.length > MAX_PREPARED_KEY_LENGTH || FORBIDDEN_PREPARED_KEYS.has(key)) {
      throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Prepared execution contains an unsafe key');
    }
    output[key] = clonePreparedExecution(descriptor.value, depth + 1, budget);
  }
  return Object.freeze(output);
}

function validateObservedBinding(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Trusted binding observer returned an invalid record');
  }
  const actual = Object.keys(value).sort();
  const expected = [...OBSERVED_KEYS].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Trusted binding observer returned an invalid record');
  }
  if (typeof value.binding_profile !== 'string' || !PROFILE_PATTERN.test(value.binding_profile)) {
    throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Trusted binding observer returned an invalid profile');
  }
  for (const field of ['action_commitment', 'context_commitment']) {
    if (typeof value[field] !== 'string' || !HASH_PATTERN.test(value[field])) {
      throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Trusted binding observer returned an invalid commitment');
    }
  }
  return Object.freeze({
    binding_profile: value.binding_profile,
    action_commitment: value.action_commitment,
    context_commitment: value.context_commitment,
    prepared_execution: clonePreparedExecution(value.prepared_execution),
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

export function createReferenceSingleUseGate(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('Reference Gate bootstrap options are required');
  }
  const keys = Object.keys(options).sort();
  const expected = ['executeDownstream', 'observeBinding', 'trustedClock'];
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new TypeError('Reference Gate bootstrap has missing or unknown fields');
  }

  const {
    trustedClock,
    observeBinding,
    executeDownstream,
  } = options;
  if (typeof trustedClock !== 'function'
    || typeof observeBinding !== 'function'
    || typeof executeDownstream !== 'function') {
    throw new TypeError('Reference Gate bootstrap dependencies must be functions');
  }

  // Capability lifecycle is private and bound to this Gate instance. A capability
  // created by another reference Gate cannot be consumed here.
  const capabilityState = new WeakMap();

  function issueReferenceAuthorization(bindingInput, { witnessValidUntil } = {}) {
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

  function inspectCapabilityState(capability) {
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
      // The caller-owned executionAttempt is never forwarded. Only the defensive
      // snapshot returned by the trusted observer can reach the downstream adapter.
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
    issueReferenceAuthorization,
    inspectCapabilityState,
  });

  return Object.freeze({ gate, testAuthority });
}
