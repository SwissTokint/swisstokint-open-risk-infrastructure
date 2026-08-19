import {
  PomRxReferenceCapabilityError,
  beginReferenceCapabilityConsumptionForGate,
  completeReferenceCapabilityConsumptionForGate,
  rejectReferenceCapabilityForGate,
  reserveReferenceCapabilityForGate,
} from '../authorization/reference-exact-authorization.mjs';

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const PROFILE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{2,127}$/u;
const OBSERVED_KEYS = Object.freeze([
  'binding_profile',
  'action_commitment',
  'context_commitment',
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

  async function consume(capability, executionAttempt) {
    let binding;
    try {
      // This reservation is synchronous and occurs before the first await.
      binding = reserveReferenceCapabilityForGate(capability);
    } catch (error) {
      throw normalizeCapabilityError(error);
    }

    try {
      const firstNow = sampleTrustedClock(trustedClock);
      assertNotExpired(binding, firstNow);
    } catch (error) {
      rejectReferenceCapabilityForGate(capability);
      throw normalizeCapabilityError(error);
    }

    let observed;
    try {
      observed = validateObservedBinding(await observeBinding(executionAttempt));
    } catch (error) {
      rejectReferenceCapabilityForGate(capability);
      if (error instanceof PomRxGateError) throw error;
      throw gateError('POMRX_GATE_E_OBSERVER_FAILED', 'Trusted binding observer failed');
    }

    if (!exactBindingMatches(binding, observed)) {
      rejectReferenceCapabilityForGate(capability);
      throw gateError('POMRX_GATE_E_BINDING_MISMATCH', 'Observed execution binding does not match authorization');
    }

    try {
      const preForwardNow = sampleTrustedClock(trustedClock);
      assertNotExpired(binding, preForwardNow);
    } catch (error) {
      rejectReferenceCapabilityForGate(capability);
      throw normalizeCapabilityError(error);
    }

    try {
      beginReferenceCapabilityConsumptionForGate(capability);
    } catch (error) {
      throw normalizeCapabilityError(error);
    }

    try {
      const result = await executeDownstream(executionAttempt);
      completeReferenceCapabilityConsumptionForGate(capability, true);
      return result;
    } catch {
      completeReferenceCapabilityConsumptionForGate(capability, false);
      throw gateError('POMRX_GATE_E_DOWNSTREAM_FAILED', 'Downstream execution failed');
    }
  }

  return Object.freeze({ consume });
}
