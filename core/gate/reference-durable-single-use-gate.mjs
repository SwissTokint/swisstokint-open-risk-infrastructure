import { types as utilTypes } from 'node:util';

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

// This composition boundary sits in front of two independently reviewed Core
// reference primitives. Capture the reflection/state intrinsics it depends on at
// module initialization so a later same-realm mutation cannot widen bootstrap
// shape, turn an accessor into a trusted dependency, forge local capability
// provenance, or re-open a wrapper-reserved capability. Poisoning before module
// initialization and a generally compromised runtime remain outside this
// reference guarantee.
const REFLECT_APPLY = Reflect.apply;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_OWN_PROPERTY_NAMES = Object.getOwnPropertyNames;
const OBJECT_GET_OWN_PROPERTY_SYMBOLS = Object.getOwnPropertySymbols;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_PROTOTYPE = Object.prototype;
const UTIL_TYPES_IS_PROXY = utilTypes.isProxy;
const WEAK_MAP_GET = WeakMap.prototype.get;
const WEAK_MAP_SET = WeakMap.prototype.set;

function freezeValue(value) {
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
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

function weakMapGet(map, key) {
  return REFLECT_APPLY(WEAK_MAP_GET, map, [key]);
}

function weakMapSet(map, key, value) {
  REFLECT_APPLY(WEAK_MAP_SET, map, [key, value]);
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

  const snapshot = Object.create(null);
  for (const key of BOOTSTRAP_KEYS) {
    if (!objectHasOwn(descriptors, key)
        || !isOwnEnumerableDataDescriptor(descriptors[key])) {
      throw new TypeError(`Reference durable Gate bootstrap.${key} must be an enumerable data property`);
    }
    snapshot[key] = descriptors[key].value;
  }
  return freezeValue(snapshot);
}

function gateError(code, message) {
  return new PomRxGateError(code, message);
}

/**
 * Compose the process-local reference Gate with the filesystem durable claim
 * primitive without changing either primitive's standalone API.
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

  // The store is created inside the composition boundary rather than accepted as
  // a caller-provided structural object. This keeps the claimed durable behavior
  // tied to the reviewed reference store implementation and its root checks.
  const durableStore = createReferenceDurableClaimStore({ rootDir: options.rootDir });
  const inner = createReferenceSingleUseGateHarness({
    trustedClock: options.trustedClock,
    observeBinding: options.observeBinding,
    executeDownstream: options.executeDownstream,
  });

  const capabilityMetadata = new WeakMap();
  const wrapperState = new WeakMap();

  function issueReferenceAuthorizationForTest(bindingInput, issueOptions = {}) {
    const issued = inner.testAuthority.issueReferenceAuthorizationForTest(
      bindingInput,
      issueOptions,
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

  async function inspectDurableStateForTest(capability) {
    const { metadata } = requireLocalCapability(capability);
    return durableStore.inspect({
      capabilityId: metadata.capabilityId,
      authorizationCommitment: metadata.authorizationCommitment,
    });
  }

  async function consume(capability, executionAttempt) {
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
      durableClaim = await durableStore.claim({
        capabilityId: metadata.capabilityId,
        authorizationCommitment: metadata.authorizationCommitment,
      });
    } catch (error) {
      state.state = 'REJECTED';
      throw error;
    }

    let result;
    try {
      result = await inner.gate.consume(capability, executionAttempt);
    } catch (error) {
      const innerState = inner.testAuthority.inspectCapabilityStateForTest(capability);
      if (innerState === 'CONSUMED_ERROR') {
        state.state = 'CONSUMED_ERROR';
        // Preserve the downstream diagnostic only if the durable terminal record
        // is successfully published. If terminal persistence itself fails, that
        // durability failure is the stronger fail-closed diagnostic; the durable
        // claim tombstone still prevents replay and observation is required to
        // determine external effect truth.
        try {
          await durableStore.complete(durableClaim.handle, 'error');
        } catch (durableError) {
          throw durableError;
        }
      } else {
        // Validation/time/observer/binding failures never reached downstream.
        // Keep the durable claim RESERVED rather than manufacturing a consumed
        // terminal record. The occupied tombstone still globally burns the
        // capability under the local-filesystem assumption.
        state.state = 'REJECTED';
      }
      throw error;
    }

    state.state = 'CONSUMED_SUCCESS';
    // Do not return a successful downstream result until its optional terminal
    // marker has been durably published. If publication fails, local state still
    // records the known downstream success while the persisted claim remains
    // fail-closed RESERVED; callers must not retry the same capability.
    await durableStore.complete(durableClaim.handle, 'success');
    return result;
  }

  const gate = freezeValue({ consume });
  const testAuthority = freezeValue({
    issueReferenceAuthorizationForTest,
    inspectCapabilityStateForTest,
    inspectDurableStateForTest,
  });

  return freezeValue({ gate, testAuthority });
}
