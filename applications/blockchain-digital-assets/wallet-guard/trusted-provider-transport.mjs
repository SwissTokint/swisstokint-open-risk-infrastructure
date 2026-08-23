import { types as utilTypes } from 'node:util';

import {
  captureReferencePlainData,
} from '../../../core/reference-data/plain-data-snapshot.mjs';
import {
  createWalletGuardReferenceProviderGateway,
} from './provider.mjs';

const REFLECT_APPLY = Reflect.apply;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_OWN_PROPERTY_NAMES = Object.getOwnPropertyNames;
const OBJECT_GET_OWN_PROPERTY_SYMBOLS = Object.getOwnPropertySymbols;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_CONSTRUCTOR = Array;
const ARRAY_PROTOTYPE = Array.prototype;
const PROMISE_CONSTRUCTOR = Promise;
const PROMISE_PROTOTYPE = Promise.prototype;
const PROMISE_RESOLVE = Promise.resolve;
const PROMISE_REJECT = Promise.reject;
const PROMISE_THEN = Promise.prototype.then;
const PROMISE_SPECIES_KEY = Symbol.species;
const UTIL_TYPES_IS_PROMISE = utilTypes.isPromise;
const UTIL_TYPES_IS_PROXY = utilTypes.isProxy;
const WEAK_SET = new WeakSet();
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;

const PROMISE_PROTOTYPE_DESCRIPTOR = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
  PROMISE_CONSTRUCTOR,
  'prototype',
);
const PROMISE_RESOLVE_DESCRIPTOR = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
  PROMISE_CONSTRUCTOR,
  'resolve',
);
const PROMISE_REJECT_DESCRIPTOR = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
  PROMISE_CONSTRUCTOR,
  'reject',
);
const PROMISE_SPECIES_DESCRIPTOR = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
  PROMISE_CONSTRUCTOR,
  PROMISE_SPECIES_KEY,
);
const PROMISE_CONSTRUCTOR_DESCRIPTOR = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
  PROMISE_PROTOTYPE,
  'constructor',
);
const PROMISE_THEN_DESCRIPTOR = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
  PROMISE_PROTOTYPE,
  'then',
);
const ARRAY_PROTOTYPE_DESCRIPTOR = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
  ARRAY_CONSTRUCTOR,
  'prototype',
);
const INITIAL_ARRAY_THEN_DESCRIPTOR = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
  ARRAY_PROTOTYPE,
  'then',
);
const INITIAL_OBJECT_THEN_DESCRIPTOR = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
  Object.prototype,
  'then',
);

const OPTIONS_KEYS = OBJECT_FREEZE([
  'chainId',
  'accounts',
  'providerResult',
  'maxSensitiveCalls',
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

function runtimeBaselineWasSupported() {
  return sameDescriptor(
    PROMISE_PROTOTYPE_DESCRIPTOR,
    OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(PROMISE_CONSTRUCTOR, 'prototype'),
  )
    && PROMISE_PROTOTYPE_DESCRIPTOR.value === PROMISE_PROTOTYPE
    && PROMISE_RESOLVE_DESCRIPTOR?.value === PROMISE_RESOLVE
    && PROMISE_REJECT_DESCRIPTOR?.value === PROMISE_REJECT
    && PROMISE_CONSTRUCTOR_DESCRIPTOR?.value === PROMISE_CONSTRUCTOR
    && PROMISE_THEN_DESCRIPTOR?.value === PROMISE_THEN
    && ARRAY_PROTOTYPE_DESCRIPTOR?.value === ARRAY_PROTOTYPE
    && INITIAL_ARRAY_THEN_DESCRIPTOR === undefined
    && INITIAL_OBJECT_THEN_DESCRIPTOR === undefined;
}

const INITIAL_RUNTIME_SUPPORTED = runtimeBaselineWasSupported();

function assertPromiseTransportRuntime() {
  if (!INITIAL_RUNTIME_SUPPORTED
      || !sameDescriptor(
        apply(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [PROMISE_CONSTRUCTOR, 'prototype']),
        PROMISE_PROTOTYPE_DESCRIPTOR,
      )
      || !sameDescriptor(
        apply(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [PROMISE_CONSTRUCTOR, 'resolve']),
        PROMISE_RESOLVE_DESCRIPTOR,
      )
      || !sameDescriptor(
        apply(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [PROMISE_CONSTRUCTOR, 'reject']),
        PROMISE_REJECT_DESCRIPTOR,
      )
      || !sameDescriptor(
        apply(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [PROMISE_CONSTRUCTOR, PROMISE_SPECIES_KEY]),
        PROMISE_SPECIES_DESCRIPTOR,
      )
      || !sameDescriptor(
        apply(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [PROMISE_PROTOTYPE, 'constructor']),
        PROMISE_CONSTRUCTOR_DESCRIPTOR,
      )
      || !sameDescriptor(
        apply(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [PROMISE_PROTOTYPE, 'then']),
        PROMISE_THEN_DESCRIPTOR,
      )
      || !sameDescriptor(
        apply(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [ARRAY_CONSTRUCTOR, 'prototype']),
        ARRAY_PROTOTYPE_DESCRIPTOR,
      )
      || apply(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [ARRAY_PROTOTYPE, 'then']) !== undefined
      || apply(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [Object.prototype, 'then']) !== undefined) {
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
  for (const key of expected) {
    const descriptor = descriptors[key];
    if (!descriptor
        || !OBJECT_HAS_OWN(descriptor, 'value')
        || descriptor.enumerable !== true
        || OBJECT_HAS_OWN(descriptor, 'get')
        || OBJECT_HAS_OWN(descriptor, 'set')) {
      fail('POMRX_WG_TRANSPORT_E_INVALID', `${label}.${key} must be an enumerable data property`);
    }
  }
}

function defineArrayElement(output, index, value) {
  const descriptor = Object.create(null);
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
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value;
  if (!value || typeof value !== 'object' || isProxy(value)) {
    fail('POMRX_WG_TRANSPORT_E_VALUE', `${label} contains unsupported transport data`);
  }
  if (!apply(ARRAY_IS_ARRAY, null, [value])) {
    fail(
      'POMRX_WG_TRANSPORT_E_VALUE',
      `${label} supports only primitives and dense arrays in this local provider contract`,
    );
  }
  if (apply(OBJECT_GET_PROTOTYPE_OF, Object, [value]) !== ARRAY_PROTOTYPE
      || apply(OBJECT_GET_OWN_PROPERTY_SYMBOLS, Object, [value]).length !== 0) {
    fail('POMRX_WG_TRANSPORT_E_VALUE', `${label} must be a standard non-Proxy array`);
  }
  const descriptors = apply(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  const lengthDescriptor = descriptors.length;
  const length = lengthDescriptor?.value;
  if (!Number.isSafeInteger(length) || length < 0 || length > MAX_CONTEXT_ACCOUNTS) {
    fail('POMRX_WG_TRANSPORT_E_VALUE', `${label} has an invalid array length`);
  }
  const names = apply(OBJECT_GET_OWN_PROPERTY_NAMES, Object, [value]);
  if (names.length !== length + 1 || !names.includes('length')) {
    fail('POMRX_WG_TRANSPORT_E_VALUE', `${label} must be a dense undecorated array`);
  }
  const output = [];
  if (apply(OBJECT_GET_PROTOTYPE_OF, Object, [output]) !== ARRAY_PROTOTYPE) {
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
  if (!apply(UTIL_TYPES_IS_PROMISE, utilTypes, [value])
      || apply(OBJECT_GET_PROTOTYPE_OF, Object, [value]) !== PROMISE_PROTOTYPE
      || apply(OBJECT_GET_OWN_PROPERTY_NAMES, Object, [value]).length !== 0
      || apply(OBJECT_GET_OWN_PROPERTY_SYMBOLS, Object, [value]).length !== 0) {
    fail(
      'POMRX_WG_TRANSPORT_E_RUNTIME_INTEGRITY',
      'controlled transport did not originate an undecorated same-realm native Promise',
    );
  }
  return value;
}

function fulfilledTransport(value) {
  assertPromiseTransportRuntime();
  const transport = apply(PROMISE_RESOLVE, PROMISE_CONSTRUCTOR, [value]);
  assertPromiseTransportRuntime();
  return assertOwnedPromise(transport);
}

function rejectedTransport(error) {
  assertPromiseTransportRuntime();
  const transport = apply(PROMISE_REJECT, PROMISE_CONSTRUCTOR, [error]);
  assertPromiseTransportRuntime();
  return assertOwnedPromise(transport);
}

function trustedTransportHas(provider) {
  return apply(WEAK_SET_HAS, WEAK_SET, [provider]);
}

function trustedTransportAdd(provider) {
  apply(WEAK_SET_ADD, WEAK_SET, [provider]);
}

function copySensitiveCalls(calls) {
  return captureReferencePlainData(calls, 'trusted provider sensitive calls');
}

export function createWalletGuardControlledProviderTransport(rawOptions) {
  exactKeys(rawOptions, OPTIONS_KEYS, 'trusted provider transport options');
  assertPromiseTransportRuntime();

  if (typeof rawOptions.chainId !== 'string'
      || typeof rawOptions.providerResult !== 'string'
      || !Number.isSafeInteger(rawOptions.maxSensitiveCalls)
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
        state.sensitiveCalls.push(
          captureReferencePlainData(request, 'trusted provider sensitive request'),
        );
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
  const provider = options && typeof options === 'object' ? options.provider : null;
  if (!provider || !trustedTransportHas(provider)) {
    fail(
      'POMRX_WG_TRANSPORT_E_UNTRUSTED_PROVIDER',
      'supported Wallet Guard provider path requires the controlled trusted transport',
    );
  }
  assertPromiseTransportRuntime();
  return createWalletGuardReferenceProviderGateway(options);
}
