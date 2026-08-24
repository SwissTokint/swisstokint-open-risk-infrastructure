import { runInNewContext } from 'node:vm';
import { types as utilTypes } from 'node:util';
import { randomBytes } from 'node:crypto';

import {
  captureReferencePlainData,
} from '../../../core/reference-data/plain-data-snapshot.mjs';
import {
  createWalletGuardReferenceProviderGateway,
} from './provider.mjs';
import {
  parseWalletGuardBridgeResponse,
} from './bridge-json-envelope.mjs';

// Bootstrap TCB: this Node-only transport must be imported in a clean,
// application-owned process before any untrusted same-process code. The
// built-in node:vm implementation and node:util.types exports are trusted at
// that boundary. Pre-import mutation of shared node: built-ins is therefore
// out of contract and requires a separately reviewed process/worker/RPC
// isolation boundary. Covered pre-import poisoning remains limited to the
// ECMAScript globals explicitly validated below.

const PRISTINE_RUNTIME = runInNewContext(`(() => {
  const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  const getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
  const getOwnPropertyNames = Object.getOwnPropertyNames;
  const getOwnPropertySymbols = Object.getOwnPropertySymbols;
  const getPrototypeOf = Object.getPrototypeOf;
  const objectFreeze = Object.freeze;
  const objectCreate = Object.create;
  const objectHasOwn = Object.hasOwn;
  const objectDefineProperty = Object.defineProperty;
  const arrayIsArray = Array.isArray;
  const arrayPush = Array.prototype.push;
  const numberIsSafeInteger = Number.isSafeInteger;
  const functionToString = Function.prototype.toString;
  const stringSlice = String.prototype.slice;
  const stringPadStart = String.prototype.padStart;
  const regexpExec = RegExp.prototype.exec;
  const reflectApply = Reflect.apply;
  const reflectConstruct = Reflect.construct;
  const speciesKey = Symbol.species;
  const promisePrototype = Promise.prototype;
  const speciesDescriptor = getOwnPropertyDescriptor(Promise, speciesKey);
  return {
    reflectApply,
    reflectConstruct,
    getOwnPropertyDescriptor,
    getOwnPropertyDescriptors,
    getOwnPropertyNames,
    getOwnPropertySymbols,
    getPrototypeOf,
    objectFreeze,
    objectCreate,
    objectHasOwn,
    objectDefineProperty,
    arrayIsArray,
    arrayPush,
    numberIsSafeInteger,
    functionToString,
    stringSlice,
    stringPadStart,
    regexpExec,
    promiseResolve: Promise.resolve,
    promiseReject: Promise.reject,
    weakSetConstructor: WeakSet,
    weakSetAdd: WeakSet.prototype.add,
    weakSetHas: WeakSet.prototype.has,
    speciesKey,
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
const TRUSTED_REFLECT_CONSTRUCT = PRISTINE_RUNTIME.reflectConstruct;
const TRUSTED_GET_OWN_PROPERTY_DESCRIPTOR = PRISTINE_RUNTIME.getOwnPropertyDescriptor;
const TRUSTED_GET_OWN_PROPERTY_DESCRIPTORS = PRISTINE_RUNTIME.getOwnPropertyDescriptors;
const TRUSTED_GET_OWN_PROPERTY_NAMES = PRISTINE_RUNTIME.getOwnPropertyNames;
const TRUSTED_GET_OWN_PROPERTY_SYMBOLS = PRISTINE_RUNTIME.getOwnPropertySymbols;
const TRUSTED_GET_PROTOTYPE_OF = PRISTINE_RUNTIME.getPrototypeOf;
const TRUSTED_OBJECT_FREEZE = PRISTINE_RUNTIME.objectFreeze;
const TRUSTED_OBJECT_CREATE = PRISTINE_RUNTIME.objectCreate;
const TRUSTED_OBJECT_HAS_OWN = PRISTINE_RUNTIME.objectHasOwn;
const TRUSTED_OBJECT_DEFINE_PROPERTY = PRISTINE_RUNTIME.objectDefineProperty;
const TRUSTED_ARRAY_IS_ARRAY = PRISTINE_RUNTIME.arrayIsArray;
const TRUSTED_ARRAY_PUSH = PRISTINE_RUNTIME.arrayPush;
const TRUSTED_NUMBER_IS_SAFE_INTEGER = PRISTINE_RUNTIME.numberIsSafeInteger;
const TRUSTED_FUNCTION_TO_STRING = PRISTINE_RUNTIME.functionToString;
const TRUSTED_STRING_SLICE = PRISTINE_RUNTIME.stringSlice;
const TRUSTED_STRING_PAD_START = PRISTINE_RUNTIME.stringPadStart;
const TRUSTED_REGEXP_EXEC = PRISTINE_RUNTIME.regexpExec;
const TRUSTED_PROMISE_RESOLVE = PRISTINE_RUNTIME.promiseResolve;
const TRUSTED_PROMISE_REJECT = PRISTINE_RUNTIME.promiseReject;
const TRUSTED_WEAK_SET_CONSTRUCTOR = PRISTINE_RUNTIME.weakSetConstructor;
const TRUSTED_WEAK_SET_ADD = PRISTINE_RUNTIME.weakSetAdd;
const TRUSTED_WEAK_SET_HAS = PRISTINE_RUNTIME.weakSetHas;

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

const PROMISE_SPECIES_KEY = PRISTINE_RUNTIME.speciesKey;
const UTIL_TYPES_IS_PROMISE_DESCRIPTOR = trustedApply(
  TRUSTED_GET_OWN_PROPERTY_DESCRIPTOR,
  null,
  [utilTypes, 'isPromise'],
);
const UTIL_TYPES_IS_PROXY_DESCRIPTOR = trustedApply(
  TRUSTED_GET_OWN_PROPERTY_DESCRIPTOR,
  null,
  [utilTypes, 'isProxy'],
);
const UTIL_TYPES_IS_PROMISE = UTIL_TYPES_IS_PROMISE_DESCRIPTOR?.value;
const UTIL_TYPES_IS_PROXY = UTIL_TYPES_IS_PROXY_DESCRIPTOR?.value;
const WEAK_SET = new TRUSTED_WEAK_SET_CONSTRUCTOR();

function trustedApply(fn, receiver, args) {
  return TRUSTED_REFLECT_APPLY(fn, receiver, args);
}

function trustedOwnDescriptor(value, key) {
  return trustedApply(TRUSTED_GET_OWN_PROPERTY_DESCRIPTOR, null, [value, key]);
}

function nodeUtilDetectorRuntimeMatchesBootstrap() {
  return typeof UTIL_TYPES_IS_PROMISE === 'function'
    && typeof UTIL_TYPES_IS_PROXY === 'function'
    && sameDescriptor(
      trustedOwnDescriptor(utilTypes, 'isPromise'),
      UTIL_TYPES_IS_PROMISE_DESCRIPTOR,
    )
    && sameDescriptor(
      trustedOwnDescriptor(utilTypes, 'isProxy'),
      UTIL_TYPES_IS_PROXY_DESCRIPTOR,
    );
}

function assertNodeUtilDetectorRuntime() {
  if (!nodeUtilDetectorRuntimeMatchesBootstrap()) {
    fail(
      'POMRX_WG_TRANSPORT_E_RUNTIME_INTEGRITY',
      'trusted Node util type detectors drifted after bootstrap',
    );
  }
}

function trustedPrototypeOf(value) {
  return trustedApply(TRUSTED_GET_PROTOTYPE_OF, null, [value]);
}

function trustedIsProxy(value) {
  assertNodeUtilDetectorRuntime();
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

function apply(fn, receiver, args) {
  return trustedApply(fn, receiver, args);
}

function freeze(value) {
  return apply(TRUSTED_OBJECT_FREEZE, null, [value]);
}

function isProxy(value) {
  return trustedIsProxy(value);
}

const ARRAY_PROTOTYPE = trustedPrototypeOf([]);
const OBJECT_PROTOTYPE = trustedPrototypeOf({});

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

const OPTIONS_KEYS = freeze([
  'chainId',
  'accounts',
  'providerResult',
  'maxSensitiveCalls',
]);
const CALLBACK_OPTIONS_KEYS = freeze([
  'chainId',
  'accounts',
  'maxSensitiveCalls',
  'dispatchSensitive',
]);
const TRUSTED_GATEWAY_KEYS = freeze([
  'captureTrustedOrigin',
  'provider',
  'policy',
  'trustedClock',
  'referenceAuthorizationForRequest',
  'capabilityLifetimeMs',
]);
const MAX_CONTEXT_ACCOUNTS = 64;
const BRIDGE_SCHEMA_VERSION = 'wallet_guard_bridge/0.1';
const SESSION_ID_PATTERN = /^[0-9a-f]{64}$/u;
const CHAIN_ID_PATTERN = /^0x(?:0|[1-9a-f][0-9a-f]*)$/u;
const ACCOUNT_PATTERN = /^0x[0-9a-f]{40}$/u;
const TX_HASH_PATTERN = /^0x[0-9a-f]{64}$/u;
const BRIDGE_FAILURE_CODES = freeze([
  'BRIDGE_CLOSED',
  'CONTEXT_CHANGED',
  'INTERNAL_ERROR',
  'TIMEOUT',
  'USER_REJECTED',
  'WALLET_UNAVAILABLE',
]);

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
  return nodeUtilDetectorRuntimeMatchesBootstrap()
    && promiseRuntimeMatchesTrustedPrimordial()
    && sameDescriptor(
      PROMISE_PROTOTYPE_DESCRIPTOR,
      trustedOwnDescriptor(PROMISE_CONSTRUCTOR, 'prototype'),
    )
    && PROMISE_PROTOTYPE_DESCRIPTOR.value === PROMISE_PROTOTYPE
    && PROMISE_RESOLVE_DESCRIPTOR?.value === trustedOwnDescriptor(PROMISE_CONSTRUCTOR, 'resolve')?.value
    && PROMISE_REJECT_DESCRIPTOR?.value === trustedOwnDescriptor(PROMISE_CONSTRUCTOR, 'reject')?.value
    && PROMISE_CONSTRUCTOR_DESCRIPTOR?.value === PROMISE_CONSTRUCTOR
    && PROMISE_THEN_DESCRIPTOR?.value === PROMISE_THEN
    && ARRAY_PROTOTYPE_PARENT === OBJECT_PROTOTYPE
    && OBJECT_PROTOTYPE_PARENT === null
    && INITIAL_ARRAY_THEN_DESCRIPTOR === undefined
    && INITIAL_OBJECT_THEN_DESCRIPTOR === undefined;
}

const INITIAL_RUNTIME_SUPPORTED = runtimeBaselineWasSupported();

function assertPromiseTransportRuntime() {
  if (!INITIAL_RUNTIME_SUPPORTED
      || !nodeUtilDetectorRuntimeMatchesBootstrap()
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
      || apply(TRUSTED_ARRAY_IS_ARRAY, null, [value])) {
    fail('POMRX_WG_TRANSPORT_E_INVALID', `${label} must be a non-Proxy object`);
  }
  const descriptors = apply(TRUSTED_GET_OWN_PROPERTY_DESCRIPTORS, null, [value]);
  const names = apply(TRUSTED_GET_OWN_PROPERTY_NAMES, null, [value]);
  if (apply(TRUSTED_GET_OWN_PROPERTY_SYMBOLS, null, [value]).length !== 0
      || names.length !== expected.length) {
    fail('POMRX_WG_TRANSPORT_E_INVALID', `${label} has missing or unknown fields`);
  }
  for (let index = 0; index < expected.length; index += 1) {
    const key = expected[index];
    const descriptor = descriptors[key];
    if (!descriptor
        || !TRUSTED_OBJECT_HAS_OWN(descriptor, 'value')
        || descriptor.enumerable !== true
        || TRUSTED_OBJECT_HAS_OWN(descriptor, 'get')
        || TRUSTED_OBJECT_HAS_OWN(descriptor, 'set')) {
      fail('POMRX_WG_TRANSPORT_E_INVALID', `${label}.${key} must be an enumerable data property`);
    }
  }
  return descriptors;
}

function defineArrayElement(output, index, value) {
  const descriptor = apply(TRUSTED_OBJECT_CREATE, null, [null]);
  descriptor.value = value;
  descriptor.enumerable = true;
  descriptor.writable = false;
  descriptor.configurable = false;
  apply(TRUSTED_OBJECT_DEFINE_PROPERTY, null, [output, String(index), descriptor]);
}

function snapshotTransportValue(value, label, depth = 0) {
  if (depth > 4) {
    fail('POMRX_WG_TRANSPORT_E_VALUE', `${label} exceeds the supported transport depth`);
  }
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number' && apply(TRUSTED_NUMBER_IS_SAFE_INTEGER, null, [value])) return value;
  if (!value || typeof value !== 'object' || isProxy(value)) {
    fail('POMRX_WG_TRANSPORT_E_VALUE', `${label} contains unsupported transport data`);
  }
  if (!apply(TRUSTED_ARRAY_IS_ARRAY, null, [value])) {
    fail(
      'POMRX_WG_TRANSPORT_E_VALUE',
      `${label} supports only primitives and dense arrays in this local provider contract`,
    );
  }
  if (trustedPrototypeOf(value) !== ARRAY_PROTOTYPE
      || apply(TRUSTED_GET_OWN_PROPERTY_SYMBOLS, null, [value]).length !== 0) {
    fail('POMRX_WG_TRANSPORT_E_VALUE', `${label} must be a standard non-Proxy array`);
  }
  const descriptors = apply(TRUSTED_GET_OWN_PROPERTY_DESCRIPTORS, null, [value]);
  const lengthDescriptor = descriptors.length;
  const length = lengthDescriptor?.value;
  if (!apply(TRUSTED_NUMBER_IS_SAFE_INTEGER, null, [length]) || length < 0 || length > MAX_CONTEXT_ACCOUNTS) {
    fail('POMRX_WG_TRANSPORT_E_VALUE', `${label} has an invalid array length`);
  }
  const names = apply(TRUSTED_GET_OWN_PROPERTY_NAMES, null, [value]);
  if (names.length !== length + 1 || !lengthDescriptor || !TRUSTED_OBJECT_HAS_OWN(lengthDescriptor, 'value')) {
    fail('POMRX_WG_TRANSPORT_E_VALUE', `${label} must be a dense undecorated array`);
  }
  const output = [];
  if (trustedPrototypeOf(output) !== ARRAY_PROTOTYPE) {
    fail('POMRX_WG_TRANSPORT_E_RUNTIME_INTEGRITY', 'array literal prototype drifted');
  }
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor
        || !TRUSTED_OBJECT_HAS_OWN(descriptor, 'value')
        || descriptor.enumerable !== true
        || TRUSTED_OBJECT_HAS_OWN(descriptor, 'get')
        || TRUSTED_OBJECT_HAS_OWN(descriptor, 'set')) {
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
  if (!nodeUtilDetectorRuntimeMatchesBootstrap()
      || !apply(UTIL_TYPES_IS_PROMISE, utilTypes, [value])
      || trustedPrototypeOf(value) !== PROMISE_PROTOTYPE
      || apply(TRUSTED_GET_OWN_PROPERTY_NAMES, null, [value]).length !== 0) {
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

function constructPendingTransport() {
  assertPromiseTransportRuntime();
  let resolveTransport;
  let rejectTransport;
  const transport = trustedApply(
    TRUSTED_REFLECT_CONSTRUCT,
    null,
    [PROMISE_CONSTRUCTOR, [(resolve, reject) => {
      resolveTransport = resolve;
      rejectTransport = reject;
    }], PROMISE_CONSTRUCTOR],
  );
  assertPromiseTransportRuntime();
  if (typeof resolveTransport !== 'function' || typeof rejectTransport !== 'function') {
    fail(
      'POMRX_WG_TRANSPORT_E_RUNTIME_INTEGRITY',
      'native Promise constructor did not provide settlement functions',
    );
  }
  return freeze({
    transport: assertOwnedPromise(transport),
    resolve: resolveTransport,
    reject: rejectTransport,
  });
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

function bridgeFailureCodeSupported(code) {
  for (let index = 0; index < BRIDGE_FAILURE_CODES.length; index += 1) {
    if (BRIDGE_FAILURE_CODES[index] === code) return true;
  }
  return false;
}

function trustedPatternTest(pattern, value) {
  return trustedApply(TRUSTED_REGEXP_EXEC, pattern, [value]) !== null;
}

function localBridgeFailure(code) {
  const safeCode = bridgeFailureCodeSupported(code) ? code : 'INTERNAL_ERROR';
  return new WalletGuardTrustedProviderTransportError(
    `POMRX_WG_TRANSPORT_E_BRIDGE_${safeCode}`,
    `captured provider bridge failed with ${safeCode}`,
  );
}

function createSessionId() {
  const bytes = randomBytes(32);
  if (!bytes || bytes.length !== 32) {
    fail('POMRX_WG_TRANSPORT_E_RUNTIME_INTEGRITY', 'Node CSPRNG returned an invalid session id');
  }
  const alphabet = '0123456789abcdef';
  let output = '';
  for (let index = 0; index < bytes.length; index += 1) {
    const value = bytes[index];
    if (!apply(TRUSTED_NUMBER_IS_SAFE_INTEGER, null, [value]) || value < 0 || value > 255) {
      fail('POMRX_WG_TRANSPORT_E_RUNTIME_INTEGRITY', 'Node CSPRNG returned invalid bytes');
    }
    output += alphabet[(value >>> 4) & 15];
    output += alphabet[value & 15];
  }
  if (!trustedPatternTest(SESSION_ID_PATTERN, output)) {
    fail('POMRX_WG_TRANSPORT_E_RUNTIME_INTEGRITY', 'Node CSPRNG session encoding failed');
  }
  return output;
}

function makeCapturedBridgeCommand(sessionId, sequence, chainId, account, request) {
  const sequenceText = `${sequence}`;
  const sessionPrefix = trustedApply(TRUSTED_STRING_SLICE, sessionId, [0, 16]);
  const paddedSequence = trustedApply(TRUSTED_STRING_PAD_START, sequenceText, [8, '0']);
  const command = freeze({
    schema_version: BRIDGE_SCHEMA_VERSION,
    session_id: sessionId,
    sequence,
    request_id: `wg-bridge-${sessionPrefix}-${paddedSequence}`,
    expected_chain_id: chainId,
    expected_account: account,
    request,
  });
  return captureReferencePlainData(command, 'trusted callback provider command');
}

export function createWalletGuardControlledProviderTransport(rawOptions) {
  exactKeys(rawOptions, OPTIONS_KEYS, 'trusted provider transport options');
  assertPromiseTransportRuntime();

  if (typeof rawOptions.chainId !== 'string'
      || typeof rawOptions.providerResult !== 'string'
      || !apply(TRUSTED_NUMBER_IS_SAFE_INTEGER, null, [rawOptions.maxSensitiveCalls])
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
        apply(TRUSTED_ARRAY_PUSH, state.sensitiveCalls, [
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

export function createWalletGuardControlledCallbackProviderTransport(rawOptions) {
  exactKeys(rawOptions, CALLBACK_OPTIONS_KEYS, 'trusted callback provider transport options');
  assertPromiseTransportRuntime();

  if (typeof rawOptions.chainId !== 'string'
      || !trustedPatternTest(CHAIN_ID_PATTERN, rawOptions.chainId)
      || typeof rawOptions.dispatchSensitive !== 'function'
      || isProxy(rawOptions.dispatchSensitive)
      || !apply(TRUSTED_NUMBER_IS_SAFE_INTEGER, null, [rawOptions.maxSensitiveCalls])
      || rawOptions.maxSensitiveCalls < 1
      || rawOptions.maxSensitiveCalls > 1_000) {
    fail('POMRX_WG_TRANSPORT_E_INVALID', 'trusted callback provider transport options are invalid');
  }

  const accounts = snapshotTransportValue(
    rawOptions.accounts,
    'trusted callback provider accounts',
  );
  if (accounts.length !== 1
      || typeof accounts[0] !== 'string'
      || !trustedPatternTest(ACCOUNT_PATTERN, accounts[0])) {
    fail(
      'POMRX_WG_TRANSPORT_E_INVALID',
      'trusted callback provider requires exactly one lowercase EVM account',
    );
  }

  const state = {
    chainId: rawOptions.chainId,
    accounts,
    sessionId: createSessionId(),
    maxSensitiveCalls: rawOptions.maxSensitiveCalls,
    dispatchSensitive: rawOptions.dispatchSensitive,
    contextReads: 0,
    sensitiveCalls: [],
    inFlight: false,
    nextSequence: 1,
    destroyed: false,
  };

  const provider = freeze({
    request(request) {
      assertPromiseTransportRuntime();

      try {
        const requestSnapshot = captureReferencePlainData(
          request,
          'trusted callback provider request',
        );
        if (state.destroyed) {
          throw new WalletGuardTrustedProviderTransportError(
            'POMRX_WG_TRANSPORT_E_SESSION_CLOSED',
            'captured provider session is closed and must be re-armed',
          );
        }
        const method = requestSnapshot?.method;
        if (method === 'eth_chainId' || method === 'eth_accounts') {
          state.contextReads += 1;
          const value = method === 'eth_chainId'
            ? state.chainId
            : snapshotTransportValue(state.accounts, 'trusted callback provider accounts result');
          assertPromiseTransportRuntime();
          return fulfilledTransport(value);
        }

        if (method !== 'eth_sendTransaction') {
          throw new WalletGuardTrustedProviderTransportError(
            'POMRX_WG_TRANSPORT_E_METHOD',
            'captured provider supports eth_sendTransaction only',
          );
        }
        if (state.inFlight) {
          throw new WalletGuardTrustedProviderTransportError(
            'POMRX_WG_TRANSPORT_E_IN_FLIGHT',
            'captured provider permits one sensitive command in flight',
          );
        }
        if (state.sensitiveCalls.length >= state.maxSensitiveCalls
            || state.nextSequence > 99_999_999) {
          throw new WalletGuardTrustedProviderTransportError(
            'POMRX_WG_TRANSPORT_E_LOG_FULL',
            'captured provider sensitive-call capacity is exhausted',
          );
        }

        const command = makeCapturedBridgeCommand(
          state.sessionId,
          state.nextSequence,
          state.chainId,
          state.accounts[0],
          requestSnapshot,
        );
        const pending = constructPendingTransport();
        state.nextSequence += 1;
        state.inFlight = true;
        apply(TRUSTED_ARRAY_PUSH, state.sensitiveCalls, [command]);

        const resolve = pending.resolve;
        const reject = pending.reject;
        {
          let settled = false;
          let dispatchComplete = false;
          let earlyOutcome = null;

          const finish = (outcome) => {
            if (settled) return undefined;
            settled = true;
            state.inFlight = false;
            try {
              if (outcome.kind === 'raw') {
                const parsed = parseWalletGuardBridgeResponse(outcome.raw, {
                  session_id: command.session_id,
                  sequence: command.sequence,
                  request_id: command.request_id,
                  expected_chain_id: command.expected_chain_id,
                  expected_account: command.expected_account,
                });
                if (parsed.outcome === 'result'
                    && typeof parsed.result === 'string'
                    && trustedPatternTest(TX_HASH_PATTERN, parsed.result)) {
                  trustedApply(resolve, undefined, [parsed.result]);
                  return undefined;
                }
                state.destroyed = true;
                trustedApply(reject, undefined, [localBridgeFailure(parsed.error_code)]);
                return undefined;
              }
              state.destroyed = true;
              trustedApply(reject, undefined, [localBridgeFailure(outcome.code)]);
            } catch {
              state.destroyed = true;
              trustedApply(reject, undefined, [localBridgeFailure('INTERNAL_ERROR')]);
            }
            return undefined;
          };

          const deliverRawJson = (raw) => {
            if (settled) return undefined;
            const outcome = { kind: 'raw', raw };
            if (!dispatchComplete) {
              earlyOutcome = earlyOutcome === null
                ? outcome
                : { kind: 'failure', code: 'INTERNAL_ERROR' };
              return undefined;
            }
            return finish(outcome);
          };

          const reportFailure = (code) => {
            if (settled) return undefined;
            const outcome = { kind: 'failure', code };
            if (!dispatchComplete) {
              earlyOutcome = earlyOutcome === null
                ? outcome
                : { kind: 'failure', code: 'INTERNAL_ERROR' };
              return undefined;
            }
            return finish(outcome);
          };

          let dispatchReturn;
          let dispatchThrew = false;
          try {
            dispatchReturn = trustedApply(
              state.dispatchSensitive,
              undefined,
              [command, deliverRawJson, reportFailure],
            );
          } catch {
            dispatchThrew = true;
          }
          dispatchComplete = true;
          try {
            assertPromiseTransportRuntime();
          } catch (error) {
            state.destroyed = true;
            throw error;
          }
          if (dispatchThrew || dispatchReturn !== undefined) {
            finish({ kind: 'failure', code: 'INTERNAL_ERROR' });
          } else if (earlyOutcome !== null) {
            finish(earlyOutcome);
          }
        }
        return pending.transport;
      } catch (error) {
        assertPromiseTransportRuntime();
        return rejectedTransport(error);
      }
    },
  });
  trustedTransportAdd(provider);

  const control = freeze({
    sensitiveCallCount() {
      return state.sensitiveCalls.length;
    },
    inspect() {
      return freeze({
        chain_id: state.chainId,
        accounts: snapshotTransportValue(state.accounts, 'trusted callback provider inspected accounts'),
        session_id: state.sessionId,
        context_reads: state.contextReads,
        sensitive_call_count: state.sensitiveCalls.length,
        sensitive_calls: copySensitiveCalls(state.sensitiveCalls),
        in_flight: state.inFlight,
        next_sequence: state.nextSequence,
        destroyed: state.destroyed,
      });
    },
  });

  return freeze({ provider, control });
}

export function createWalletGuardTrustedProviderGateway(options) {
  if (!options
      || typeof options !== 'object'
      || isProxy(options)
      || apply(TRUSTED_ARRAY_IS_ARRAY, null, [options])) {
    fail(
      'POMRX_WG_TRANSPORT_E_INVALID',
      'trusted Wallet Guard gateway bootstrap must be a non-Proxy object',
    );
  }

  const providerDescriptor = trustedOwnDescriptor(options, 'provider');
  if (!providerDescriptor || !TRUSTED_OBJECT_HAS_OWN(providerDescriptor, 'value')) {
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
