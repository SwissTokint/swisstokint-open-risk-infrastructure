import {
  normalizeChainId,
  normalizeEvmAddress,
} from './evm-decoders.mjs';
import {
  createWalletGuardReferenceProviderGateway,
} from './provider.mjs';

const HOST_KEYS = Object.freeze([
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
const MAX_SENSITIVE_CALLS = 1_000;
const MAX_SNAPSHOT_DEPTH = 8;
const MAX_SNAPSHOT_NODES = 1_000;
const MAX_SNAPSHOT_STRING = 16_384;
const MAX_SNAPSHOT_KEY = 64;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

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

function exactOwnDataObject(value, expectedKeys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('POMRX_WG_HOST_E_INVALID', `${label} must be a plain object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail('POMRX_WG_HOST_E_INVALID', `${label} must be a plain object`);
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    fail('POMRX_WG_HOST_E_INVALID', `${label} cannot contain symbol keys`);
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail('POMRX_WG_HOST_E_INVALID', `${label} has missing or unknown fields`);
  }

  const output = Object.create(null);
  for (const key of expectedKeys) {
    const descriptor = descriptors[key];
    if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
      fail('POMRX_WG_HOST_E_INVALID', `${label} cannot contain accessors`);
    }
    output[key] = descriptor.value;
  }
  return Object.freeze(output);
}

function canonicalOrigin(value) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 512) {
    fail('POMRX_WG_HOST_E_ORIGIN_INVALID', 'trusted origin is invalid');
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    fail('POMRX_WG_HOST_E_ORIGIN_INVALID', 'trusted origin must be an absolute HTTP(S) origin');
  }
  if (!['https:', 'http:'].includes(url.protocol)
      || url.origin !== value
      || url.username
      || url.password) {
    fail('POMRX_WG_HOST_E_ORIGIN_INVALID', 'trusted origin must be canonical');
  }
  return url.origin;
}

function canonicalChainId(value) {
  try {
    return normalizeChainId(value);
  } catch {
    fail('POMRX_WG_HOST_E_CHAIN_INVALID', 'chainId is invalid');
  }
}

function canonicalAccounts(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_ACCOUNTS) {
    fail('POMRX_WG_HOST_E_ACCOUNTS_INVALID', 'accounts must be a bounded non-empty array');
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    fail('POMRX_WG_HOST_E_ACCOUNTS_INVALID', 'accounts cannot contain symbol keys');
  }
  const keys = Object.keys(value);
  if (keys.length !== value.length || keys.some((key, index) => key !== String(index))) {
    fail('POMRX_WG_HOST_E_ACCOUNTS_INVALID', 'accounts must be a dense plain array');
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const normalized = keys.map((key) => {
    const descriptor = descriptors[key];
    if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
      fail('POMRX_WG_HOST_E_ACCOUNTS_INVALID', 'accounts cannot contain accessors');
    }
    try {
      return normalizeEvmAddress(descriptor.value, 'controlled host account');
    } catch {
      fail('POMRX_WG_HOST_E_ACCOUNTS_INVALID', 'accounts contain an invalid address');
    }
  });
  if (new Set(normalized).size !== normalized.length) {
    fail('POMRX_WG_HOST_E_ACCOUNTS_INVALID', 'accounts cannot contain duplicates');
  }
  return Object.freeze(normalized);
}

function clonePlainData(value, depth = 0, budget = { remaining: MAX_SNAPSHOT_NODES }) {
  if (depth > MAX_SNAPSHOT_DEPTH || budget.remaining-- <= 0) {
    fail('POMRX_WG_HOST_E_SNAPSHOT_INVALID', 'data exceeds reference bounds');
  }
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.length > MAX_SNAPSHOT_STRING) {
      fail('POMRX_WG_HOST_E_SNAPSHOT_INVALID', 'data string is too long');
    }
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      fail('POMRX_WG_HOST_E_SNAPSHOT_INVALID', 'data numbers must be safe integers');
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (Object.getOwnPropertySymbols(value).length !== 0) {
      fail('POMRX_WG_HOST_E_SNAPSHOT_INVALID', 'data arrays cannot contain symbol keys');
    }
    const keys = Object.keys(value);
    if (keys.length !== value.length || keys.some((key, index) => key !== String(index))) {
      fail('POMRX_WG_HOST_E_SNAPSHOT_INVALID', 'data arrays must be dense');
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    return Object.freeze(keys.map((key) => {
      const descriptor = descriptors[key];
      if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
        fail('POMRX_WG_HOST_E_SNAPSHOT_INVALID', 'data arrays cannot contain accessors');
      }
      return clonePlainData(descriptor.value, depth + 1, budget);
    }));
  }
  if (!value || typeof value !== 'object') {
    fail('POMRX_WG_HOST_E_SNAPSHOT_INVALID', 'data contains unsupported values');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail('POMRX_WG_HOST_E_SNAPSHOT_INVALID', 'data must contain plain objects only');
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    fail('POMRX_WG_HOST_E_SNAPSHOT_INVALID', 'data cannot contain symbol keys');
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const output = Object.create(null);
  for (const key of Object.keys(value)) {
    if (key.length === 0 || key.length > MAX_SNAPSHOT_KEY || FORBIDDEN_KEYS.has(key)) {
      fail('POMRX_WG_HOST_E_SNAPSHOT_INVALID', 'data contains an unsafe key');
    }
    const descriptor = descriptors[key];
    if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
      fail('POMRX_WG_HOST_E_SNAPSHOT_INVALID', 'data cannot contain accessors');
    }
    output[key] = clonePlainData(descriptor.value, depth + 1, budget);
  }
  return Object.freeze(output);
}

export function createWalletGuardControlledReferenceHost(rawOptions) {
  const options = exactOwnDataObject(rawOptions, HOST_KEYS, 'Wallet Guard controlled host options');
  if (typeof options.trustedClock !== 'function'
      || typeof options.referenceAuthorizationForRequest !== 'function') {
    fail('POMRX_WG_HOST_E_INVALID', 'trusted clock and reference authorization supplier are required');
  }
  if (!Number.isSafeInteger(options.capabilityLifetimeMs)
      || options.capabilityLifetimeMs < 1_000
      || options.capabilityLifetimeMs > 300_000) {
    fail('POMRX_WG_HOST_E_INVALID', 'capabilityLifetimeMs must be between 1 second and 5 minutes');
  }
  if (typeof options.providerResult !== 'string' || !TX_HASH_PATTERN.test(options.providerResult)) {
    fail('POMRX_WG_HOST_E_INVALID', 'providerResult must be a lowercase 32-byte transaction hash');
  }

  const policy = clonePlainData(options.policy);
  const state = {
    origin: canonicalOrigin(options.trustedOrigin),
    chainId: canonicalChainId(options.chainId),
    accounts: canonicalAccounts(options.accounts),
    sensitiveCalls: [],
    contextReads: 0,
  };

  // The raw provider exists only inside this closure. Neither the page-facing
  // surface nor the test authority receives the provider object or its request method.
  const rawProvider = Object.freeze({
    async request(request) {
      if (request?.method === 'eth_chainId') {
        state.contextReads += 1;
        return state.chainId;
      }
      if (request?.method === 'eth_accounts') {
        state.contextReads += 1;
        return [...state.accounts];
      }
      if (state.sensitiveCalls.length >= MAX_SENSITIVE_CALLS) {
        fail('POMRX_WG_HOST_E_LOG_FULL', 'controlled provider sensitive-call log is full');
      }
      state.sensitiveCalls.push(clonePlainData(request));
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

  const ethereum = Object.freeze({
    request: gateway.request,
  });
  const page = Object.freeze({ ethereum });

  const testAuthority = Object.freeze({
    setTrustedOrigin(value) {
      state.origin = canonicalOrigin(value);
    },
    setChainId(value) {
      state.chainId = canonicalChainId(value);
    },
    setAccounts(value) {
      state.accounts = canonicalAccounts(value);
    },
    inspect() {
      return Object.freeze({
        origin: state.origin,
        chain_id: state.chainId,
        accounts: Object.freeze([...state.accounts]),
        context_reads: state.contextReads,
        sensitive_call_count: state.sensitiveCalls.length,
        sensitive_calls: Object.freeze(state.sensitiveCalls.map((request) => clonePlainData(request))),
      });
    },
  });

  return Object.freeze({ page, testAuthority });
}
