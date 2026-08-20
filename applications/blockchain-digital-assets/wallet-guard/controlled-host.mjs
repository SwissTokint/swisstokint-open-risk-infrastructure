import { types as utilTypes } from 'node:util';

import {
  captureReferencePlainData,
} from '../../../core/reference-data/plain-data-snapshot.mjs';
import {
  normalizeChainId,
  normalizeEvmAddress,
} from './evm-decoders.mjs';
import {
  createWalletGuardReferenceProviderGateway,
} from './provider.mjs';

const REFLECT_APPLY = Reflect.apply;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_GET_OWN_PROPERTY_NAMES = Object.getOwnPropertyNames;
const OBJECT_GET_OWN_PROPERTY_SYMBOLS = Object.getOwnPropertySymbols;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_HAS_OWN = Object.hasOwn;
const ARRAY_IS_ARRAY = Array.isArray;
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
  if (prototype !== Object.prototype && prototype !== null) {
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
  const captured = Object.create(null);
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
  const output = new Array(values.length);
  for (let index = 0; index < values.length; index += 1) {
    output[index] = values[index];
  }
  return freeze(output);
}

function canonicalAccounts(value) {
  if (!ARRAY_IS_ARRAY(value)
      || REFLECT_APPLY(IS_PROXY, utilTypes, [value])
      || REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]) !== Array.prototype) {
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
  const normalized = new Array(value.length);
  const seen = new Set();
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
    normalized[index] = account;
  }
  return freeze(normalized);
}

function capturePolicy(value) {
  return captureReferencePlainData(value, 'Wallet Guard controlled host policy');
}

function capturePageRequest(value) {
  return captureReferencePlainData(value, 'Wallet Guard controlled page request');
}

function captureSensitiveRequest(value) {
  return captureReferencePlainData(value, 'Wallet Guard controlled provider request');
}

function inspectSensitiveCalls(calls) {
  const output = new Array(calls.length);
  for (let index = 0; index < calls.length; index += 1) {
    output[index] = captureReferencePlainData(
      calls[index],
      'Wallet Guard controlled provider recorded request',
    );
  }
  return freeze(output);
}

export function createWalletGuardControlledReferenceHost(rawOptions) {
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
  if (!Number.isSafeInteger(options.capabilityLifetimeMs)
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
  });

  // The page-facing boundary is stricter than the historical provider gateway:
  // capture caller-owned request data through the shared hardened plain-data
  // boundary before invoking gateway code that predates Proxy/decorated-array
  // rejection. Proxy/accessor/hidden/symbol/custom-prototype request behavior
  // therefore cannot execute inside the controlled page path. Capacity is
  // reserved synchronously before the first gateway async boundary so a full
  // log cannot keep issuing authorization/replay state under concurrency.
  async function request(untrustedRequest) {
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
      state.origin = canonicalOrigin(value);
    },
    setChainId(value) {
      state.chainId = normalizeChainId(value);
    },
    setAccounts(value) {
      state.accounts = canonicalAccounts(value);
    },
    inspect() {
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
