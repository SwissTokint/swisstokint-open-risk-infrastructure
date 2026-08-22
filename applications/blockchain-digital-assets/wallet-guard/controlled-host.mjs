import { types as utilTypes } from 'node:util';

import {
  captureReferencePlainData,
} from '../../../core/reference-data/plain-data-snapshot.mjs';
import {
  normalizeChainId,
  normalizeEvmAddress,
} from './evm-decoders.mjs';
import {
  normalizeWalletGuardPolicy,
} from './policy.mjs';
import {
  createWalletGuardReferenceProviderGateway,
} from './provider.mjs';

const REFLECT_APPLY = Reflect.apply;
const ARRAY_CONSTRUCTOR = Array;
const ARRAY_PROTOTYPE = Array.prototype;
const SET_CONSTRUCTOR = Set;
const SET_PROTOTYPE = Set.prototype;
const OBJECT_PROTOTYPE = Object.prototype;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_GET_OWN_PROPERTY_NAMES = Object.getOwnPropertyNames;
const OBJECT_GET_OWN_PROPERTY_SYMBOLS = Object.getOwnPropertySymbols;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_IS = Object.is;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_ITERATOR_METHOD = Array.prototype[Symbol.iterator];
const SET_ITERATOR_METHOD = Set.prototype.values;
const NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const REGEXP_TEST = RegExp.prototype.test;
const SET_HAS = Set.prototype.has;
const SET_ADD = Set.prototype.add;
const IS_PROXY = utilTypes.isProxy;
const URL_CTOR = URL;

function freeze(value) {
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function regexpTest(pattern, value) {
  return REFLECT_APPLY(REGEXP_TEST, pattern, [value]);
}

function setHas(set, value) {
  return REFLECT_APPLY(SET_HAS, set, [value]);
}

function setAdd(set, value) {
  REFLECT_APPLY(SET_ADD, set, [value]);
}

function defineArrayElement(array, index, value) {
  REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [array, String(index), {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  }]);
}

const HOST_KEYS = freeze([
  'trustedOrigin',
  'chainId',
  'accounts',
  'policy',
  'trustedClock',
  'referenceAuthorizationForRequest',
  'capabilityLifetimeMs',
  'providerResult',
]);
const TX_HASH_PATTERN = /^0x[a-f0-9]{64}$/u;
const MAX_ACCOUNTS = 64;
const MAX_SENSITIVE_CALLS = 64;

const ARRAY_ITERATOR_PROTOTYPE = REFLECT_APPLY(
  OBJECT_GET_PROTOTYPE_OF,
  Object,
  [REFLECT_APPLY(ARRAY_ITERATOR_METHOD, new ARRAY_CONSTRUCTOR(), [])],
);
const SET_ITERATOR_PROTOTYPE = REFLECT_APPLY(
  OBJECT_GET_PROTOTYPE_OF,
  Object,
  [REFLECT_APPLY(SET_ITERATOR_METHOD, new SET_CONSTRUCTOR(), [])],
);

function captureIntrinsicSurface(value) {
  return {
    parent: REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]),
    names: REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_NAMES, Object, [value]),
    symbols: REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_SYMBOLS, Object, [value]),
    descriptors: REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]),
  };
}

// The application policy parser intentionally accepts standard Arrays and uses
// the standard Array/Set iterator protocol. Capture the exact initialization-time
// prototype surfaces it dispatches through and fail closed if a same-realm actor
// changes them later. Checking Array.prototype alone is insufficient because an
// unchanged Symbol.iterator method can still return an iterator whose shared
// %ArrayIteratorPrototype%.next was mutated. Policy capture below is synchronous
// and receives only already-inert Core data, so there is no callback/await point
// between the final guard and parser dispatch. The same guard is injected into the
// provider gateway so every post-await policy dispatch is rechecked immediately
// after trusted context sampling. This remains application-local; Core keeps its
// detached captured-array representation.
const ARRAY_PROTOTYPE_BASELINE = captureIntrinsicSurface(ARRAY_PROTOTYPE);
const ARRAY_ITERATOR_PROTOTYPE_BASELINE = captureIntrinsicSurface(ARRAY_ITERATOR_PROTOTYPE);
const SET_PROTOTYPE_BASELINE = captureIntrinsicSurface(SET_PROTOTYPE);
const SET_ITERATOR_PROTOTYPE_BASELINE = captureIntrinsicSurface(SET_ITERATOR_PROTOTYPE);

export class WalletGuardControlledHostError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WalletGuardControlledHostError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new WalletGuardControlledHostError(code, message);
}

function descriptorFieldEqual(left, right, field) {
  const leftHas = OBJECT_HAS_OWN(left, field);
  const rightHas = OBJECT_HAS_OWN(right, field);
  return leftHas === rightHas && (!leftHas || OBJECT_IS(left[field], right[field]));
}

function sameDescriptor(left, right) {
  return Boolean(left)
    && Boolean(right)
    && descriptorFieldEqual(left, right, 'value')
    && descriptorFieldEqual(left, right, 'writable')
    && descriptorFieldEqual(left, right, 'get')
    && descriptorFieldEqual(left, right, 'set')
    && descriptorFieldEqual(left, right, 'enumerable')
    && descriptorFieldEqual(left, right, 'configurable');
}

function intrinsicMutation(label) {
  fail(
    'POMRX_WG_HOST_E_INTRINSIC_MUTATION',
    `${label} changed after Wallet Guard controlled-host initialization`,
  );
}

function assertIntrinsicSurfaceStable(value, baseline, label) {
  if (!OBJECT_IS(
    REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]),
    baseline.parent,
  )) {
    intrinsicMutation(label);
  }

  const names = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_NAMES, Object, [value]);
  const symbols = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_SYMBOLS, Object, [value]);
  if (names.length !== baseline.names.length || symbols.length !== baseline.symbols.length) {
    intrinsicMutation(label);
  }
  for (let index = 0; index < names.length; index += 1) {
    if (!OBJECT_IS(names[index], baseline.names[index])) intrinsicMutation(label);
  }
  for (let index = 0; index < symbols.length; index += 1) {
    if (!OBJECT_IS(symbols[index], baseline.symbols[index])) intrinsicMutation(label);
  }

  const descriptors = REFLECT_APPLY(
    OBJECT_GET_OWN_PROPERTY_DESCRIPTORS,
    Object,
    [value],
  );
  for (let index = 0; index < baseline.names.length; index += 1) {
    const key = baseline.names[index];
    if (!sameDescriptor(descriptors[key], baseline.descriptors[key])) intrinsicMutation(label);
  }
  for (let index = 0; index < baseline.symbols.length; index += 1) {
    const key = baseline.symbols[index];
    if (!sameDescriptor(descriptors[key], baseline.descriptors[key])) intrinsicMutation(label);
  }
}

function assertArrayPrototypeStable() {
  assertIntrinsicSurfaceStable(ARRAY_PROTOTYPE, ARRAY_PROTOTYPE_BASELINE, 'Array.prototype');
  assertIntrinsicSurfaceStable(
    ARRAY_ITERATOR_PROTOTYPE,
    ARRAY_ITERATOR_PROTOTYPE_BASELINE,
    '%ArrayIteratorPrototype%',
  );
  assertIntrinsicSurfaceStable(SET_PROTOTYPE, SET_PROTOTYPE_BASELINE, 'Set.prototype');
  assertIntrinsicSurfaceStable(
    SET_ITERATOR_PROTOTYPE,
    SET_ITERATOR_PROTOTYPE_BASELINE,
    '%SetIteratorPrototype%',
  );
}

function isOwnEnumerableDataDescriptor(descriptor) {
  return Boolean(descriptor)
    && OBJECT_HAS_OWN(descriptor, 'value')
    && OBJECT_HAS_OWN(descriptor, 'enumerable')
    && descriptor.enumerable === true
    && !OBJECT_HAS_OWN(descriptor, 'get')
    && !OBJECT_HAS_OWN(descriptor, 'set');
}

function captureExactRecord(value, expectedKeys, label) {
  if (!value
      || typeof value !== 'object'
      || REFLECT_APPLY(IS_PROXY, utilTypes, [value])
      || ARRAY_IS_ARRAY(value)) {
    fail('POMRX_WG_HOST_E_INVALID', `${label} must be a non-Proxy plain object`);
  }
  const prototype = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]);
  if (prototype !== OBJECT_PROTOTYPE && prototype !== null) {
    fail('POMRX_WG_HOST_E_INVALID', `${label} must use Object.prototype or a null prototype`);
  }
  if (REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_SYMBOLS, Object, [value]).length !== 0) {
    fail('POMRX_WG_HOST_E_INVALID', `${label} cannot contain symbol keys`);
  }

  const actualNames = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_NAMES, Object, [value]);
  const actual = [...actualNames].sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length
      || actual.some((key, index) => key !== expected[index])) {
    fail('POMRX_WG_HOST_E_INVALID', `${label} has missing, hidden or unknown fields`);
  }

  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  const captured = REFLECT_APPLY(OBJECT_CREATE, Object, [null]);
  for (const key of expectedKeys) {
    const descriptor = descriptors[key];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail('POMRX_WG_HOST_E_INVALID', `${label}.${key} must be an enumerable data property`);
    }
    captured[key] = descriptor.value;
  }
  return freeze(captured);
}

function canonicalOrigin(value) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 512) {
    fail('POMRX_WG_HOST_E_ORIGIN_INVALID', 'trusted origin is invalid');
  }
  let url;
  try {
    url = new URL_CTOR(value);
  } catch {
    fail('POMRX_WG_HOST_E_ORIGIN_INVALID', 'trusted origin must be an absolute HTTP(S) origin');
  }
  if ((url.protocol !== 'https:' && url.protocol !== 'http:')
      || url.origin !== value
      || url.username
      || url.password) {
    fail('POMRX_WG_HOST_E_ORIGIN_INVALID', 'trusted origin must be canonical');
  }
  return url.origin;
}

function copyFrozenArray(values) {
  const output = new ARRAY_CONSTRUCTOR(values.length);
  for (let index = 0; index < values.length; index += 1) {
    defineArrayElement(output, index, values[index]);
  }
  return freeze(output);
}

function canonicalAccounts(value) {
  if (!ARRAY_IS_ARRAY(value)
      || REFLECT_APPLY(IS_PROXY, utilTypes, [value])
      || REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]) !== ARRAY_PROTOTYPE) {
    fail('POMRX_WG_HOST_E_ACCOUNTS_INVALID', 'accounts must be a standard non-Proxy array');
  }
  if (value.length < 1 || value.length > MAX_ACCOUNTS) {
    fail('POMRX_WG_HOST_E_ACCOUNTS_INVALID', 'accounts must be a bounded non-empty array');
  }
  if (REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_SYMBOLS, Object, [value]).length !== 0) {
    fail('POMRX_WG_HOST_E_ACCOUNTS_INVALID', 'accounts cannot contain symbol keys');
  }

  const names = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_NAMES, Object, [value]);
  if (names.length !== value.length + 1 || !names.includes('length')) {
    fail('POMRX_WG_HOST_E_ACCOUNTS_INVALID', 'accounts must be a dense undecorated array');
  }
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  const normalized = new ARRAY_CONSTRUCTOR(value.length);
  const seen = new SET_CONSTRUCTOR();
  for (let index = 0; index < value.length; index += 1) {
    const key = String(index);
    const descriptor = descriptors[key];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail('POMRX_WG_HOST_E_ACCOUNTS_INVALID', 'accounts must contain dense data elements only');
    }
    const account = normalizeEvmAddress(descriptor.value, 'controlled host account');
    if (setHas(seen, account)) {
      fail('POMRX_WG_HOST_E_ACCOUNTS_INVALID', 'accounts cannot contain duplicates');
    }
    setAdd(seen, account);
    defineArrayElement(normalized, index, account);
  }
  return freeze(normalized);
}

function materializeCapturedPlainData(value) {
  if (value === null || typeof value !== 'object') return value;

  if (ARRAY_IS_ARRAY(value)) {
    const output = new ARRAY_CONSTRUCTOR(value.length);
    for (let index = 0; index < value.length; index += 1) {
      defineArrayElement(output, index, materializeCapturedPlainData(value[index]));
    }
    return freeze(output);
  }

  const names = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_NAMES, Object, [value]);
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  const output = REFLECT_APPLY(OBJECT_CREATE, Object, [null]);
  for (let index = 0; index < names.length; index += 1) {
    const key = names[index];
    output[key] = materializeCapturedPlainData(descriptors[key].value);
  }
  return freeze(output);
}

function capturePolicy(value) {
  // Keep the generic hardened Core boundary in front of policy input so Proxy,
  // accessor, hidden/symbol, decorated-array and custom-prototype rejection stays
  // zero-side-effect and bounded. Then materialize only that trusted inert snapshot
  // into ordinary frozen arrays before the Wallet Guard application parser sees it.
  // The parser intentionally consumes standard Array/Set iteration surfaces, so
  // those initialization-time prototypes (including iterator prototypes) are
  // checked immediately before/after this synchronous path. Any post-import drift
  // fails closed instead of dispatching through attacker-owned iteration or
  // inherited setters. Core's detached snapshot representation is unchanged.
  assertArrayPrototypeStable();
  const captured = captureReferencePlainData(value, 'Wallet Guard controlled host policy');
  const materialized = materializeCapturedPlainData(captured);
  assertArrayPrototypeStable();
  const normalized = normalizeWalletGuardPolicy(materialized);
  assertArrayPrototypeStable();
  return normalized;
}

function capturePageRequest(value) {
  return captureReferencePlainData(value, 'Wallet Guard controlled page request');
}

function captureSensitiveRequest(value) {
  return captureReferencePlainData(value, 'Wallet Guard controlled provider request');
}

function inspectSensitiveCalls(calls) {
  const output = new ARRAY_CONSTRUCTOR(calls.length);
  for (let index = 0; index < calls.length; index += 1) {
    defineArrayElement(output, index, captureReferencePlainData(
      calls[index],
      'Wallet Guard controlled provider recorded request',
    ));
  }
  return freeze(output);
}

export function createWalletGuardControlledReferenceHost(rawOptions) {
  assertArrayPrototypeStable();
  const options = captureExactRecord(
    rawOptions,
    HOST_KEYS,
    'Wallet Guard controlled host options',
  );
  if (typeof options.trustedClock !== 'function'
      || typeof options.referenceAuthorizationForRequest !== 'function') {
    fail(
      'POMRX_WG_HOST_E_INVALID',
      'trusted clock and reference authorization supplier are required',
    );
  }
  if (!NUMBER_IS_SAFE_INTEGER(options.capabilityLifetimeMs)
      || options.capabilityLifetimeMs < 1_000
      || options.capabilityLifetimeMs > 300_000) {
    fail(
      'POMRX_WG_HOST_E_INVALID',
      'capabilityLifetimeMs must be between 1 second and 5 minutes',
    );
  }
  if (typeof options.providerResult !== 'string'
      || !regexpTest(TX_HASH_PATTERN, options.providerResult)) {
    fail(
      'POMRX_WG_HOST_E_INVALID',
      'providerResult must be a lowercase 32-byte transaction hash',
    );
  }

  const policy = capturePolicy(options.policy);
  const state = {
    origin: canonicalOrigin(options.trustedOrigin),
    chainId: normalizeChainId(options.chainId),
    accounts: canonicalAccounts(options.accounts),
    sensitiveCalls: [],
    contextReads: 0,
    inFlightRequests: 0,
  };

  // This fake raw provider never leaves this closure. The only externally
  // returned request function comes from the already-reviewed provider/Gate
  // gateway. Context mutation is available only through the separate test
  // authority returned beside, never beneath, the controlled page graph.
  const rawProvider = freeze({
    async request(request) {
      assertArrayPrototypeStable();
      if (request && request.method === 'eth_chainId') {
        state.contextReads += 1;
        return state.chainId;
      }
      if (request && request.method === 'eth_accounts') {
        state.contextReads += 1;
        return copyFrozenArray(state.accounts);
      }
      if (state.sensitiveCalls.length >= MAX_SENSITIVE_CALLS) {
        fail(
          'POMRX_WG_HOST_E_LOG_FULL',
          'controlled provider sensitive-call log is full',
        );
      }
      state.sensitiveCalls.push(captureSensitiveRequest(request));
      return options.providerResult;
    },
  });

  const gateway = createWalletGuardReferenceProviderGateway({
    captureTrustedOrigin: () => state.origin,
    provider: rawProvider,
    policy,
    trustedClock: options.trustedClock,
    referenceAuthorizationForRequest: options.referenceAuthorizationForRequest,
    capabilityLifetimeMs: options.capabilityLifetimeMs,
    assertRuntimeIntegrity: assertArrayPrototypeStable,
  });

  // The page-facing boundary is stricter than the historical provider gateway:
  // capture caller-owned request data through the shared hardened plain-data
  // boundary before invoking gateway code that predates Proxy/decorated-array
  // rejection. Proxy/accessor/hidden/symbol/custom-prototype request behavior
  // therefore cannot execute inside the controlled page path. Capacity is
  // reserved synchronously before the first gateway async boundary so a full
  // log cannot keep issuing authorization/replay state under concurrency.
  async function request(untrustedRequest) {
    assertArrayPrototypeStable();
    const requestSnapshot = capturePageRequest(untrustedRequest);
    if (state.sensitiveCalls.length + state.inFlightRequests >= MAX_SENSITIVE_CALLS) {
      fail(
        'POMRX_WG_HOST_E_LOG_FULL',
        'controlled provider request capacity is exhausted',
      );
    }
    state.inFlightRequests += 1;
    try {
      return await gateway.request(requestSnapshot);
    } finally {
      state.inFlightRequests -= 1;
    }
  }

  const ethereum = freeze({ request });
  const page = freeze({ ethereum });
  const testAuthority = freeze({
    setTrustedOrigin(value) {
      assertArrayPrototypeStable();
      state.origin = canonicalOrigin(value);
    },
    setChainId(value) {
      assertArrayPrototypeStable();
      state.chainId = normalizeChainId(value);
    },
    setAccounts(value) {
      assertArrayPrototypeStable();
      state.accounts = canonicalAccounts(value);
    },
    inspect() {
      assertArrayPrototypeStable();
      return freeze({
        origin: state.origin,
        chain_id: state.chainId,
        accounts: copyFrozenArray(state.accounts),
        context_reads: state.contextReads,
        in_flight_request_count: state.inFlightRequests,
        sensitive_call_count: state.sensitiveCalls.length,
        sensitive_calls: inspectSensitiveCalls(state.sensitiveCalls),
      });
    },
  });

  return freeze({ page, testAuthority });
}
