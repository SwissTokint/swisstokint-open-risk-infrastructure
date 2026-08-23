import { runInNewContext } from 'node:vm';
import { types as utilTypes } from 'node:util';

import {
  captureReferencePlainData,
} from '../../../core/reference-data/plain-data-snapshot.mjs';
import {
  createWalletGuardReferenceProviderGateway,
} from './provider.mjs';

const PRISTINE_RUNTIME = runInNewContext(`(() => {
  const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  const getPrototypeOf = Object.getPrototypeOf;
  const functionToString = Function.prototype.toString;
  const reflectApply = Reflect.apply;
  const speciesKey = Symbol.species;
  const promisePrototype = Promise.prototype;
  const speciesDescriptor = getOwnPropertyDescriptor(Promise, speciesKey);
  return {
    reflectApply,
    getOwnPropertyDescriptor,
    getPrototypeOf,
    functionToString,
    promiseResolve: Promise.resolve,
    promiseReject: Promise.reject,
    weakSetConstructor: WeakSet,
    weakSetAdd: WeakSet.prototype.add,
    weakSetHas: WeakSet.prototype.has,
    promiseSource: functionToString.call(Promise),
    resolveSource: functionToString.call(Promise.resolve),
    rejectSource: functionToString.call(Promise.reject),
    thenSource: functionToString.call(promisePrototype.then),
    speciesGetSource: functionToString.call(speciesDescriptor.get),
    globalPromiseDescriptor: getOwnPropertyDescriptor(globalThis, 'Promise'),
    prototypeDescriptor: getOwnPropertyDescriptor(Promise, 'prototype'),
    resolveDescriptor: getOwnPropertyDescriptor(Promise, 'resolve'),
    rejectDescriptor: getOwnPropertyDescriptor(Promise, 'reject'),
    speciesDescriptor,
    constructorDescriptor: getOwnPropertyDescriptor(promisePrototype, 'constructor'),
    thenDescriptor: getOwnPropertyDescriptor(promisePrototype, 'then'),
  };
})()`);

const TRUSTED_REFLECT_APPLY = PRISTINE_RUNTIME.reflectApply;
const TRUSTED_GET_OWN_PROPERTY_DESCRIPTOR = PRISTINE_RUNTIME.getOwnPropertyDescriptor;
const TRUSTED_GET_PROTOTYPE_OF = PRISTINE_RUNTIME.getPrototypeOf;
const TRUSTED_FUNCTION_TO_STRING = PRISTINE_RUNTIME.functionToString;
const TRUSTED_PROMISE_RESOLVE = PRISTINE_RUNTIME.promiseResolve;
const TRUSTED_PROMISE_REJECT = PRISTINE_RUNTIME.promiseReject;
const TRUSTED_WEAK_SET_CONSTRUCTOR = PRISTINE_RUNTIME.weakSetConstructor;
const TRUSTED_WEAK_SET_ADD = PRISTINE_RUNTIME.weakSetAdd;
const TRUSTED_WEAK_SET_HAS = PRISTINE_RUNTIME.weakSetHas;

const REFLECT_APPLY = Reflect.apply;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_CREATE = Object.create;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_OWN_PROPERTY_NAMES = Object.getOwnPropertyNames;
const OBJECT_GET_OWN_PROPERTY_SYMBOLS = Object.getOwnPropertySymbols;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_CONSTRUCTOR = Array;
const ARRAY_PROTOTYPE = Array.prototype;
const OBJECT_PROTOTYPE = Object.prototype;
const NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const PROMISE_SPECIES_KEY = Symbol.species;
const UTIL_TYPES_IS_PROMISE = utilTypes.isPromise;
const UTIL_TYPES_IS_PROXY = utilTypes.isProxy;
const WEAK_SET = new TRUSTED_WEAK_SET_CONSTRUCTOR();

function trustedApply(fn, receiver, args) {
  return TRUSTED_REFLECT_APPLY(fn, receiver, args);
}

function trustedOwnDescriptor(value, key) {
  return trustedApply(TRUSTED_GET_OWN_PROPERTY_DESCRIPTOR, Object, [value, key]);
}

function trustedPrototypeOf(value) {
  return trustedApply(TRUSTED_GET_PROTOTYPE_OF, Object, [value]);
}

function trustedIsProxy(value) {
  return Boolean(value)
    && (typeof value === 'object' || typeof value === 'function')
    && trustedApply(UTIL_TYPES_IS_PROXY, utilTypes, [value]);
}

function trustedFunctionSource(value) {
  if (typeof value !== 'function') return null;
  try {
    return trustedApply(TRUSTED_FUNCTION_TO_STRING, value, []);
  } catch {
    return null;
  }
}

async function intrinsicPromiseProbe() {}
const INTRINSIC_PROMISE_PROTOTYPE = trustedPrototypeOf(intrinsicPromiseProbe());
const GLOBAL_PROMISE_DESCRIPTOR = trustedOwnDescriptor(globalThis, 'Promise');
const PROMISE_CONSTRUCTOR = GLOBAL_PROMISE_DESCRIPTOR?.value;
const PROMISE_CONSTRUCTOR_IS_PROXY = trustedIsProxy(PROMISE_CONSTRUCTOR);
const PROMISE_PROTOTYPE = INTRINSIC_PROMISE_PROTOTYPE;
const PROMISE_PROTOTYPE_DESCRIPTOR = PROMISE_CONSTRUCTOR_IS_PROXY
  ? null
  : trustedOwnDescriptor(PROMISE_CONSTRUCTOR, 'prototype');
const PROMISE_RESOLVE_DESCRIPTOR = PROMISE_CONSTRUCTOR_IS_PROXY
  ? null
  : trustedOwnDescriptor(PROMISE_CONSTRUCTOR, 'resolve');
const PROMISE_REJECT_DESCRIPTOR = PROMISE_CONSTRUCTOR_IS_PROXY
  ? null
  : trustedOwnDescriptor(PROMISE_CONSTRUCTOR, 'reject');
const PROMISE_SPECIES_DESCRIPTOR = PROMISE_CONSTRUCTOR_IS_PROXY
  ? null
  : trustedOwnDescriptor(PROMISE_CONSTRUCTOR, PROMISE_SPECIES_KEY);
const PROMISE_CONSTRUCTOR_DESCRIPTOR = trustedOwnDescriptor(PROMISE_PROTOTYPE, 'constructor');
const PROMISE_THEN_DESCRIPTOR = trustedOwnDescriptor(PROMISE_PROTOTYPE, 'then');
const PROMISE_THEN = PROMISE_THEN_DESCRIPTOR?.value;
const ARRAY_PROTOTYPE_DESCRIPTOR = trustedOwnDescriptor(
  ARRAY_CONSTRUCTOR,
  'prototype',
);
const ARRAY_PROTOTYPE_PARENT = trustedPrototypeOf(ARRAY_PROTOTYPE);
const OBJECT_PROTOTYPE_PARENT = trustedPrototypeOf(OBJECT_PROTOTYPE);
const INITIAL_ARRAY_THEN_DESCRIPTOR = trustedOwnDescriptor(
  ARRAY_PROTOTYPE,
  'then',
);
const INITIAL_OBJECT_THEN_DESCRIPTOR = trustedOwnDescriptor(
  OBJECT_PROTOTYPE,
  'then',
);

const OPTIONS_KEYS = OBJECT_FREEZE([
  'chainId',
  'accounts',
  'providerResult',
  'maxSensitiveCalls',
]);
const TRUSTED_GATEWAY_KEYS = OBJECT_FREEZE([
  'captureTrustedOrigin',
  'provider',
  'policy',
  'trustedClock',
  'referenceAuthorizationForRequest',
  'capabilityLifetimeMs',
]);
const MAX_CONTEXT_ACCOUNTS = 64;

export class WalletGuardTrustedProviderTransportError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WalletGuardTrustedProviderTransportError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new WalletGuardTrustedProviderTransportError(code, message);
}

function apply(fn, receiver, args) {
  return REFLECT_APPLY(fn, receiver, args);
}

function freeze(value) {
  return apply(OBJECT_FREEZE, Object, [value]);
}

function isProxy(value) {
  return Boolean(value)
    && (typeof value === 'object' || typeof value === 'function')
    && apply(UTIL_TYPES_IS_PROXY, utilTypes, [value]);
}

function sameDescriptor(current, baseline) {
  if (!current || !baseline) return false;
  return current.value === baseline.value
    && current.writable === baseline.writable
    && current.enumerable === baseline.enumerable
    && current.configurable === baseline.configurable
    && current.get === baseline.get
    && current.set === baseline.set;
}

function sameDescriptorShape(current, baseline) {
  if (!current || !baseline) return false;
  return current.writable === baseline.writable
    && current.enumerable === baseline.enumerable
    && current.configurable === baseline.configurable
    && Boolean(current.get) === Boolean(baseline.get)
    && Boolean(current.set) === Boolean(baseline.set);
}

function promiseRuntimeMatchesTrustedPrimordial() {
  const liveGlobalPromise = trustedOwnDescriptor(globalThis, 'Promise');
  const livePromiseConstructor = liveGlobalPromise?.value;
  if (!PROMISE_CONSTRUCTOR
      || PROMISE_CONSTRUCTOR_IS_PROXY
      || !liveGlobalPromise
      || livePromiseConstructor !== PROMISE_CONSTRUCTOR
      || trustedIsProxy(livePromiseConstructor)) {
    return false;
  }

  const livePrototype = trustedOwnDescriptor(PROMISE_CONSTRUCTOR, 'prototype');
  const liveResolve = trustedOwnDescriptor(PROMISE_CONSTRUCTOR, 'resolve');
  const liveReject = trustedOwnDescriptor(PROMISE_CONSTRUCTOR, 'reject');
  const liveSpecies = trustedOwnDescriptor(PROMISE_CONSTRUCTOR, PROMISE_SPECIES_KEY);
  const livePrototypeConstructor = trustedOwnDescriptor(PROMISE_PROTOTYPE, 'constructor');
  const liveThen = trustedOwnDescriptor(PROMISE_PROTOTYPE, 'then');

  return sameDescriptorShape(liveGlobalPromise, PRISTINE_RUNTIME.globalPromiseDescriptor)
    && trustedFunctionSource(PROMISE_CONSTRUCTOR) === PRISTINE_RUNTIME.promiseSource
    && sameDescriptorShape(livePrototype, PRISTINE_RUNTIME.prototypeDescriptor)
    && livePrototype.value === PROMISE_PROTOTYPE
    && sameDescriptorShape(liveResolve, PRISTINE_RUNTIME.resolveDescriptor)
    && trustedFunctionSource(liveResolve.value) === PRISTINE_RUNTIME.resolveSource
    && sameDescriptorShape(liveReject, PRISTINE_RUNTIME.rejectDescriptor)
    && trustedFunctionSource(liveReject.value) === PRISTINE_RUNTIME.rejectSource
    && sameDescriptorShape(liveSpecies, PRISTINE_RUNTIME.speciesDescriptor)
    && trustedFunctionSource(liveSpecies.get) === PRISTINE_RUNTIME.speciesGetSource
    && sameDescriptorShape(livePrototypeConstructor, PRISTINE_RUNTIME.constructorDescriptor)
    && livePrototypeConstructor.value === PROMISE_CONSTRUCTOR
    && sameDescriptorShape(liveThen, PRISTINE_RUNTIME.thenDescriptor)
    && trustedFunctionSource(liveThen.value) === PRISTINE_RUNTIME.thenSource;
}

function runtimeBaselineWasSupported() {
  return promiseRuntimeMatchesTrustedPrimordial()
    && sameDescriptor(
      PROMISE_PROTOTYPE_DESCRIPTOR,
      trustedOwnDescriptor(PROMISE_CONSTRUCTOR, 'prototype'),
    )
    && PROMISE_PROTOTYPE_DESCRIPTOR.value === PROMISE_PROTOTYPE
    && PROMISE_RESOLVE_DESCRIPTOR?.value === trustedOwnDescriptor(PROMISE_CONSTRUCTOR, 'resolve')?.value
    && PROMISE_REJECT_DESCRIPTOR?.value === trustedOwnDescriptor(PROMISE_CONSTRUCTOR, 'reject')?.value
    && PROMISE_CONSTRUCTOR_DESCRIPTOR?.value === PROMISE_CONSTRUCTOR
    && PROMISE_THEN_DESCRIPTOR?.value === PROMISE_THEN
    && ARRAY_PROTOTYPE_DESCRIPTOR?.value === ARRAY_PROTOTYPE
    && ARRAY_PROTOTYPE_PARENT === OBJECT_PROTOTYPE
    && OBJECT_PROTOTYPE_PARENT === null
    && INITIAL_ARRAY_THEN_DESCRIPTOR === undefined
    && INITIAL_OBJECT_THEN_DESCRIPTOR === undefined;
}

const INITIAL_RUNTIME_SUPPORTED = runtimeBaselineWasSupported();

function assertPromiseTransportRuntime() {
  if (!INITIAL_RUNTIME_SUPPORTED
      || !promiseRuntimeMatchesTrustedPrimordial()
      || !sameDescriptor(
        trustedOwnDescriptor(PROMISE_CONSTRUCTOR, 'prototype'),
        PROMISE_PROTOTYPE_DESCRIPTOR,
      )
      || !sameDescriptor(
        trustedOwnDescriptor(PROMISE_CONSTRUCTOR, 'resolve'),
        PROMISE_RESOLVE_DESCRIPTOR,
      )
      || !sameDescriptor(
        trustedOwnDescriptor(PROMISE_CONSTRUCTOR, 'reject'),
        PROMISE_REJECT_DESCRIPTOR,
      )
      || !sameDescriptor(
        trustedOwnDescriptor(PROMISE_CONSTRUCTOR, PROMISE_SPECIES_KEY),
        PROMISE_SPECIES_DESCRIPTOR,
      )
      || !sameDescriptor(
        trustedOwnDescriptor(PROMISE_PROTOTYPE, 'constructor'),
        PROMISE_CONSTRUCTOR_DESCRIPTOR,
      )
      || !sameDescriptor(
        trustedOwnDescriptor(PROMISE_PROTOTYPE, 'then'),
        PROMISE_THEN_DESCRIPTOR,
      )
      || !sameDescriptor(
        trustedOwnDescriptor(ARRAY_CONSTRUCTOR, 'prototype'),
        ARRAY_PROTOTYPE_DESCRIPTOR,
      )
      || trustedPrototypeOf(ARRAY_PROTOTYPE) !== ARRAY_PROTOTYPE_PARENT
      || trustedPrototypeOf(OBJECT_PROTOTYPE) !== OBJECT_PROTOTYPE_PARENT
      || trustedOwnDescriptor(ARRAY_PROTOTYPE, 'then') !== undefined
      || trustedOwnDescriptor(OBJECT_PROTOTYPE, 'then') !== undefined) {
    fail(
      'POMRX_WG_TRANSPORT_E_RUNTIME_INTEGRITY',
      'trusted provider Promise transport runtime is outside the supported local contract',
    );
  }
}

function exactKeys(value, expected, label) {
  if (!value
      || typeof value !== 'object'
      || isProxy(value)
      || apply(ARRAY_IS_ARRAY, null, [value])) {
    fail('POMRX_WG_TRANSPORT_E_INVALID', `${label} must be a non-Proxy object`);
  }
  const descriptors = apply(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  const names = apply(OBJECT_GET_OWN_PROPERTY_NAMES, Object, [value]);
  if (apply(OBJECT_GET_OWN_PROPERTY_SYMBOLS, Object, [value]).length !== 0
      || names.length !== expected.length) {
    fail('POMRX_WG_TRANSPORT_E_INVALID', `${label} has missing or unknown fields`);
  }
  for (let index = 0; index < expected.length; index += 1) {
    const key = expected[index];
    const descriptor = descriptors[key];
    if (!descriptor
        || !OBJECT_HAS_OWN(descriptor, 'value')
        || descriptor.enumerable !== true
        || OBJECT_HAS_OWN(descriptor, 'get')
        || OBJECT_HAS_OWN(descriptor, 'set')) {
      fail('POMRX_WG_TRANSPORT_E_INVALID', `${label}.${key} must be an enumerable data property`);
    }
  }
  return descriptors;
}

function defineArrayElement(output, index, value) {
  const descriptor = apply(OBJECT_CREATE, Object, [null]);
  descriptor.value = value;
  descriptor.enumerable = true;
  descriptor.writable = false;
  descriptor.configurable = false;
  apply(OBJECT_DEFINE_PROPERTY, Object, [output, String(index), descriptor]);
}

function snapshotTransportValue(value, label, depth = 0) {
  if (depth > 4) {
    fail('POMRX_WG_TRANSPORT_E_VALUE', `${label} exceeds the supported transport depth`);
  }
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number' && apply(NUMBER_IS_SAFE_INTEGER, Number, [value])) return value;
  if (!value || typeof value !== 'object' || isProxy(value)) {
    fail('POMRX_WG_TRANSPORT_E_VALUE', `${label} contains unsupported transport data`);
  }
  if (!apply(ARRAY_IS_ARRAY, null, [value])) {
    fail(
      'POMRX_WG_TRANSPORT_E_VALUE',
      `${label} supports only primitives and dense arrays in this local provider contract`,
    );
  }
  if (trustedPrototypeOf(value) !== ARRAY_PROTOTYPE
      || apply(OBJECT_GET_OWN_PROPERTY_SYMBOLS, Object, [value]).length !== 0) {
    fail('POMRX_WG_TRANSPORT_E_VALUE', `${label} must be a standard non-Proxy array`);
  }
  const descriptors = apply(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  const lengthDescriptor = descriptors.length;
  const length = lengthDescriptor?.value;
  if (!apply(NUMBER_IS_SAFE_INTEGER, Number, [length]) || length < 0 || length > MAX_CONTEXT_ACCOUNTS) {
    fail('POMRX_WG_TRANSPORT_E_VALUE', `${label} has an invalid array length`);
  }
  const names = apply(OBJECT_GET_OWN_PROPERTY_NAMES, Object, [value]);
  if (names.length !== length + 1 || !lengthDescriptor || !OBJECT_HAS_OWN(lengthDescriptor, 'value')) {
    fail('POMRX_WG_TRANSPORT_E_VALUE', `${label} must be a dense undecorated array`);
  }
  const output = [];
  if (trustedPrototypeOf(output) !== ARRAY_PROTOTYPE) {
    fail('POMRX_WG_TRANSPORT_E_RUNTIME_INTEGRITY', 'array literal prototype drifted');
  }
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor
        || !OBJECT_HAS_OWN(descriptor, 'value')
        || descriptor.enumerable !== true
        || OBJECT_HAS_OWN(descriptor, 'get')
        || OBJECT_HAS_OWN(descriptor, 'set')) {
      fail('POMRX_WG_TRANSPORT_E_VALUE', `${label} must contain dense data elements only`);
    }
    defineArrayElement(
      output,
      index,
      snapshotTransportValue(descriptor.value, `${label}[${String(index)}]`, depth + 1),
    );
  }
  return freeze(output);
}

function assertOwnedPromise(value) {
  // Node's async_hooks/test runner may attach runtime-owned symbol metadata to
  // native Promises. The supported transport creates this Promise internally,
  // so caller-controlled decoration cannot race this check before return.
  // Require the native Promise brand, direct same-realm prototype, and no own
  // string properties; runtime-owned symbol metadata is not an attacker input.
  if (!apply(UTIL_TYPES_IS_PROMISE, utilTypes, [value])
      || trustedPrototypeOf(value) !== PROMISE_PROTOTYPE
      || apply(OBJECT_GET_OWN_PROPERTY_NAMES, Object, [value]).length !== 0) {
    fail(
      'POMRX_WG_TRANSPORT_E_RUNTIME_INTEGRITY',
      'controlled transport did not originate a same-realm native Promise',
    );
  }
  return value;
}

function fulfilledTransport(value) {
  assertPromiseTransportRuntime();
  const transport = trustedApply(TRUSTED_PROMISE_RESOLVE, PROMISE_CONSTRUCTOR, [value]);
  assertPromiseTransportRuntime();
  return assertOwnedPromise(transport);
}

function rejectedTransport(error) {
  assertPromiseTransportRuntime();
  const transport = trustedApply(TRUSTED_PROMISE_REJECT, PROMISE_CONSTRUCTOR, [error]);
  assertPromiseTransportRuntime();
  return assertOwnedPromise(transport);
}

function trustedTransportHas(provider) {
  return trustedApply(TRUSTED_WEAK_SET_HAS, WEAK_SET, [provider]);
}

function trustedTransportAdd(provider) {
  trustedApply(TRUSTED_WEAK_SET_ADD, WEAK_SET, [provider]);
}

function copySensitiveCalls(calls) {
  return captureReferencePlainData(calls, 'trusted provider sensitive calls');
}

export function createWalletGuardControlledProviderTransport(rawOptions) {
  exactKeys(rawOptions, OPTIONS_KEYS, 'trusted provider transport options');
  assertPromiseTransportRuntime();

  if (typeof rawOptions.chainId !== 'string'
      || typeof rawOptions.providerResult !== 'string'
      || !apply(NUMBER_IS_SAFE_INTEGER, Number, [rawOptions.maxSensitiveCalls])
      || rawOptions.maxSensitiveCalls < 1
      || rawOptions.maxSensitiveCalls > 1_000) {
    fail('POMRX_WG_TRANSPORT_E_INVALID', 'trusted provider transport options are invalid');
  }

  const state = {
    chainId: rawOptions.chainId,
    accounts: snapshotTransportValue(rawOptions.accounts, 'trusted provider accounts'),
    providerResult: rawOptions.providerResult,
    maxSensitiveCalls: rawOptions.maxSensitiveCalls,
    contextReads: 0,
    sensitiveCalls: [],
    rejectNextContextMethod: null,
  };

  const provider = freeze({
    request(request) {
      // This check occurs before the controlled provider can originate any
      // transport. No caller-supplied provider request function exists on this
      // supported local path.
      assertPromiseTransportRuntime();

      try {
        const method = request?.method;
        if (method === 'eth_chainId' || method === 'eth_accounts') {
          state.contextReads += 1;
          if (state.rejectNextContextMethod === method) {
            state.rejectNextContextMethod = null;
            throw new WalletGuardTrustedProviderTransportError(
              'POMRX_WG_TRANSPORT_E_INJECTED_REJECTION',
              `controlled ${method} context read rejected`,
            );
          }
          const value = method === 'eth_chainId'
            ? state.chainId
            : snapshotTransportValue(state.accounts, 'trusted provider accounts result');
          assertPromiseTransportRuntime();
          return fulfilledTransport(value);
        }

        if (state.sensitiveCalls.length >= state.maxSensitiveCalls) {
          throw new WalletGuardTrustedProviderTransportError(
            'POMRX_WG_TRANSPORT_E_LOG_FULL',
            'controlled provider sensitive-call log is full',
          );
        }
        apply(ARRAY_PUSH, state.sensitiveCalls, [
          captureReferencePlainData(request, 'trusted provider sensitive request'),
        ]);
        assertPromiseTransportRuntime();
        return fulfilledTransport(state.providerResult);
      } catch (error) {
        // The rejection transport itself is created here, after the controlled
        // path has been checked again. No process-global rejection handler is
        // installed and no attacker-selected Promise species is consulted.
        assertPromiseTransportRuntime();
        return rejectedTransport(error);
      }
    },
  });
  trustedTransportAdd(provider);

  const control = freeze({
    setChainId(value) {
      if (typeof value !== 'string') {
        fail('POMRX_WG_TRANSPORT_E_INVALID', 'controlled chain id must be a string');
      }
      state.chainId = value;
    },
    setAccounts(value) {
      state.accounts = snapshotTransportValue(value, 'trusted provider accounts');
    },
    rejectNextContextRead(method = 'eth_chainId') {
      if (method !== 'eth_chainId' && method !== 'eth_accounts') {
        fail('POMRX_WG_TRANSPORT_E_INVALID', 'rejection injection is limited to context reads');
      }
      state.rejectNextContextMethod = method;
    },
    sensitiveCallCount() {
      return state.sensitiveCalls.length;
    },
    inspect() {
      return freeze({
        chain_id: state.chainId,
        accounts: snapshotTransportValue(state.accounts, 'trusted provider inspected accounts'),
        context_reads: state.contextReads,
        sensitive_call_count: state.sensitiveCalls.length,
        sensitive_calls: copySensitiveCalls(state.sensitiveCalls),
      });
    },
  });

  return freeze({ provider, control });
}

export function createWalletGuardTrustedProviderGateway(options) {
  if (!options
      || typeof options !== 'object'
      || isProxy(options)
      || apply(ARRAY_IS_ARRAY, null, [options])) {
    fail(
      'POMRX_WG_TRANSPORT_E_INVALID',
      'trusted Wallet Guard gateway bootstrap must be a non-Proxy object',
    );
  }

  const providerDescriptor = apply(
    OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
    Object,
    [options, 'provider'],
  );
  if (!providerDescriptor || !OBJECT_HAS_OWN(providerDescriptor, 'value')) {
    fail(
      'POMRX_WG_TRANSPORT_E_INVALID',
      'trusted Wallet Guard gateway provider must be an own data property',
    );
  }

  const provider = providerDescriptor.value;
  if (!provider || !trustedTransportHas(provider)) {
    fail(
      'POMRX_WG_TRANSPORT_E_UNTRUSTED_PROVIDER',
      'supported Wallet Guard provider path requires the controlled trusted transport',
    );
  }

  const descriptors = exactKeys(
    options,
    TRUSTED_GATEWAY_KEYS,
    'trusted Wallet Guard provider bootstrap',
  );
  const snapshot = freeze({
    captureTrustedOrigin: descriptors.captureTrustedOrigin.value,
    provider,
    policy: descriptors.policy.value,
    trustedClock: descriptors.trustedClock.value,
    referenceAuthorizationForRequest: descriptors.referenceAuthorizationForRequest.value,
    capabilityLifetimeMs: descriptors.capabilityLifetimeMs.value,
  });

  assertPromiseTransportRuntime();
  return createWalletGuardReferenceProviderGateway(snapshot);
}
