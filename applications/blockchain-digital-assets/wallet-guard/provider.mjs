import { types as utilTypes } from 'node:util';

import {
  canonicalizePayload,
  sha256Hex,
} from '../../../sdk/typescript/swisstokint-proof.mjs';
import {
  createReferenceSingleUseGateHarness,
} from '../../../core/gate/reference-single-use-gate.mjs';
import {
  captureReferencePlainData,
  PomRxPlainDataError,
} from '../../../core/reference-data/plain-data-snapshot.mjs';
import {
  normalizeChainId,
  normalizeEvmAddress,
} from './evm-decoders.mjs';
import {
  commitWalletGuardIntent,
  normalizeWalletGuardIntent,
} from './intent.mjs';
import {
  evaluateWalletGuardPolicy,
  normalizeWalletGuardPolicy,
} from './policy.mjs';

export const WALLET_GUARD_BINDING_PROFILE = 'pom-rx-wallet-guard/0.1';
export const WALLET_GUARD_CONTEXT_SCHEMA_VERSION = 'wallet_guard_context/0.1';
export const WALLET_GUARD_PREPARED_EXECUTION_VERSION = 'wallet_guard_prepared_execution/0.1';

const CONTEXT_COMMIT_DOMAIN = 'swisstokint:pom-rx-wallet-guard-context:v1:';
const METHOD_COMMIT_DOMAIN = 'swisstokint:pom-rx-wallet-guard-method:v1:';
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const KEY_ID_PATTERN = /^ed25519-[a-f0-9]{32}$/u;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{15,127}$/u;
const PROFILE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{2,127}$/u;
const MAX_REQUEST_DEPTH = 8;
const MAX_REQUEST_NODES = 1_000;
const MAX_REQUEST_STRING = 16_384;
const MAX_REQUEST_KEY = 64;
const MAX_ACCOUNTS = 64;
const REFLECT_APPLY = Reflect.apply;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_MAP = Array.prototype.map;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_GET_OWN_PROPERTY_NAMES = Object.getOwnPropertyNames;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const PROMISE_CONSTRUCTOR = Promise;
const PROMISE_PROTOTYPE = Promise.prototype;
const PROMISE_CONSTRUCTOR_DESCRIPTOR = Object.getOwnPropertyDescriptor(
  PROMISE_PROTOTYPE,
  'constructor',
);
const UTIL_TYPES_IS_PROMISE = utilTypes.isPromise;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const BOOTSTRAP_KEYS = Object.freeze([
  'captureTrustedOrigin',
  'provider',
  'policy',
  'trustedClock',
  'referenceAuthorizationForRequest',
  'capabilityLifetimeMs',
]);
const GUARDED_BOOTSTRAP_KEYS = Object.freeze([
  ...BOOTSTRAP_KEYS,
  'assertRuntimeIntegrity',
]);
const REFERENCE_AUTH_KEYS = Object.freeze([
  'run_id',
  'agent_ref',
  'subject_ref',
  'preflight_receipt_hash',
  'witness_ack_hash',
  'source_key_id',
  'witness_key_id',
  'verification_profile',
  'verifier_version',
  'implementation_artifact_sha256',
  'effective_verification_policy_sha256',
  'witness_valid_until',
]);
const REFERENCE_REQUEST_KEYS = Object.freeze([
  'request_id',
  'method_hash',
  'policy_hash',
  'action_commitment',
  'context_commitment',
  'issued_at',
  'expires_at',
]);
const PREPARED_KEYS = Object.freeze([
  'schema_version',
  'request_id',
  'origin',
  'chain_id',
  'account',
  'intent_commitment',
  'policy_hash',
  'request',
]);

export class WalletGuardProviderError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WalletGuardProviderError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new WalletGuardProviderError(code, message);
}

function arrayIsArray(value) {
  return REFLECT_APPLY(ARRAY_IS_ARRAY, null, [value]);
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('POMRX_WG_PROVIDER_E_INVALID', `${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail('POMRX_WG_PROVIDER_E_INVALID', `${label} has missing or unknown fields`);
  }
}

function exactBootstrapKeys(value) {
  const expected = value
    && typeof value === 'object'
    && Object.hasOwn(value, 'assertRuntimeIntegrity')
    ? GUARDED_BOOTSTRAP_KEYS
    : BOOTSTRAP_KEYS;
  exactKeys(value, expected, 'Wallet Guard provider bootstrap');
}

function canonicalOrigin(value) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 512) {
    fail('POMRX_WG_PROVIDER_E_ORIGIN_INVALID', 'trusted origin is invalid');
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    fail('POMRX_WG_PROVIDER_E_ORIGIN_INVALID', 'trusted origin must be an absolute HTTP(S) origin');
  }
  if (!['https:', 'http:'].includes(url.protocol)
      || url.origin !== value
      || url.username
      || url.password) {
    fail('POMRX_WG_PROVIDER_E_ORIGIN_INVALID', 'trusted origin must be canonical');
  }
  return url.origin;
}

function sampleTrustedOrigin(captureTrustedOrigin) {
  let value;
  try {
    value = captureTrustedOrigin();
  } catch {
    fail('POMRX_WG_PROVIDER_E_ORIGIN_INVALID', 'trusted origin capture failed');
  }
  if (value && typeof value === 'object' && typeof value.then === 'function') {
    fail('POMRX_WG_PROVIDER_E_ORIGIN_INVALID', 'trusted origin capture must be synchronous');
  }
  return canonicalOrigin(value);
}

function canonicalUtcInstant(value, field) {
  if (typeof value !== 'string' || !value.endsWith('Z')) {
    fail('POMRX_WG_PROVIDER_E_TIME_INVALID', `${field} must be a canonical UTC instant`);
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    fail('POMRX_WG_PROVIDER_E_TIME_INVALID', `${field} must be a canonical UTC instant`);
  }
  return parsed;
}

function sampleTrustedClock(trustedClock) {
  let value;
  try {
    value = trustedClock();
  } catch {
    fail('POMRX_WG_PROVIDER_E_TIME_INVALID', 'trusted clock failed');
  }
  if (value && typeof value === 'object' && typeof value.then === 'function') {
    fail('POMRX_WG_PROVIDER_E_TIME_INVALID', 'trusted clock must be synchronous');
  }
  return canonicalUtcInstant(value, 'trusted clock');
}

function clonePlainRequest(value, depth = 0, budget = { remaining: MAX_REQUEST_NODES }) {
  if (depth > MAX_REQUEST_DEPTH || budget.remaining-- <= 0) {
    fail('POMRX_WG_PROVIDER_E_REQUEST_INVALID', 'request exceeds reference bounds');
  }

  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.length > MAX_REQUEST_STRING) {
      fail('POMRX_WG_PROVIDER_E_REQUEST_INVALID', 'request string is too long');
    }
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      fail('POMRX_WG_PROVIDER_E_REQUEST_INVALID', 'request numbers must be safe integers');
    }
    return value;
  }
  if (Array.isArray(value)) {
    const keys = Object.keys(value);
    if (keys.length !== value.length || keys.some((key, index) => key !== String(index))) {
      fail('POMRX_WG_PROVIDER_E_REQUEST_INVALID', 'request arrays must be dense');
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    return Object.freeze(keys.map((key) => {
      const descriptor = descriptors[key];
      if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
        fail('POMRX_WG_PROVIDER_E_REQUEST_INVALID', 'request arrays cannot contain accessors');
      }
      return clonePlainRequest(descriptor.value, depth + 1, budget);
    }));
  }

  if (!value || typeof value !== 'object') {
    fail('POMRX_WG_PROVIDER_E_REQUEST_INVALID', 'request contains unsupported values');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail('POMRX_WG_PROVIDER_E_REQUEST_INVALID', 'request must contain plain objects only');
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    fail('POMRX_WG_PROVIDER_E_REQUEST_INVALID', 'request cannot contain symbol keys');
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const output = Object.create(null);
  for (const key of Object.keys(value)) {
    if (key.length === 0 || key.length > MAX_REQUEST_KEY || FORBIDDEN_KEYS.has(key)) {
      fail('POMRX_WG_PROVIDER_E_REQUEST_INVALID', 'request contains an unsafe key');
    }
    const descriptor = descriptors[key];
    if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
      fail('POMRX_WG_PROVIDER_E_REQUEST_INVALID', 'request cannot contain accessors');
    }
    output[key] = clonePlainRequest(descriptor.value, depth + 1, budget);
  }
  return Object.freeze(output);
}

function normalizeProviderChain(value) {
  try {
    return normalizeChainId(value);
  } catch {
    fail('POMRX_WG_PROVIDER_E_CONTEXT_INVALID', 'provider returned an invalid chain id');
  }
}

function normalizeProviderAccount(value) {
  try {
    return normalizeEvmAddress(value, 'provider account');
  } catch {
    fail('POMRX_WG_PROVIDER_E_CONTEXT_INVALID', 'provider returned an invalid account');
  }
}

function captureProviderAccounts(value) {
  try {
    return captureReferencePlainData(value, 'provider accounts');
  } catch (error) {
    if (error instanceof PomRxPlainDataError) {
      fail(
        'POMRX_WG_PROVIDER_E_CONTEXT_INVALID',
        'provider accounts must be a bounded inert dense data array',
      );
    }
    throw error;
  }
}

function normalizeAccounts(value) {
  // Cross the shared hardened inert-data boundary before any application-level
  // array normalization. A provider-controlled Proxy/decorated array is rejected
  // by saved reflection/Proxy intrinsics without executing caller traps/getters;
  // the returned Array exotic is detached from mutable Array.prototype.
  const captured = captureProviderAccounts(value);
  if (!arrayIsArray(captured) || captured.length < 1 || captured.length > MAX_ACCOUNTS) {
    fail('POMRX_WG_PROVIDER_E_CONTEXT_INVALID', 'provider must expose a bounded non-empty accounts array');
  }

  const normalizedTransient = REFLECT_APPLY(ARRAY_MAP, captured, [normalizeProviderAccount]);
  const normalized = captureReferencePlainData(normalizedTransient, 'normalized provider accounts');
  for (let index = 0; index < normalized.length; index += 1) {
    for (let prior = 0; prior < index; prior += 1) {
      if (normalized[prior] === normalized[index]) {
        fail('POMRX_WG_PROVIDER_E_CONTEXT_INVALID', 'provider accounts cannot contain duplicates');
      }
    }
  }
  return normalized;
}

function captureProviderReadResult(value, method) {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return value;
  try {
    return captureReferencePlainData(value, `provider ${method} result`);
  } catch (error) {
    if (error instanceof PomRxPlainDataError) {
      fail(
        'POMRX_WG_PROVIDER_E_CONTEXT_INVALID',
        `provider ${method} returned unsafe context data`,
      );
    }
    throw error;
  }
}

function isNativePromise(value) {
  return REFLECT_APPLY(UTIL_TYPES_IS_PROMISE, utilTypes, [value]);
}

function validateNativePromiseTransport(value, method) {
  const prototype = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]);
  const ownNames = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_NAMES, Object, [value]);
  const constructorDescriptor = REFLECT_APPLY(
    OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
    Object,
    [PROMISE_PROTOTYPE, 'constructor'],
  );
  const baseline = PROMISE_CONSTRUCTOR_DESCRIPTOR;

  if (prototype !== PROMISE_PROTOTYPE
      || ownNames.length !== 0
      || !baseline
      || !constructorDescriptor
      || constructorDescriptor.value !== PROMISE_CONSTRUCTOR
      || constructorDescriptor.value !== baseline.value
      || constructorDescriptor.writable !== baseline.writable
      || constructorDescriptor.enumerable !== baseline.enumerable
      || constructorDescriptor.configurable !== baseline.configurable
      || constructorDescriptor.get !== baseline.get
      || constructorDescriptor.set !== baseline.set) {
    fail(
      'POMRX_WG_PROVIDER_E_CONTEXT_INVALID',
      `provider ${method} must return an undecorated native Promise transport`,
    );
  }
}

async function providerRead(provider, method) {
  let directResult;
  try {
    directResult = provider.request(Object.freeze({ method, params: Object.freeze([]) }));
  } catch {
    fail('POMRX_WG_PROVIDER_E_CONTEXT_UNAVAILABLE', `provider ${method} read failed`);
  }

  // A synchronous provider result must cross the shared inert-data boundary
  // before this async function can perform Promise/thenable assimilation on it.
  // util.types.isPromise performs native Promise classification without reading
  // a result-owned `then` property, so an Array/Object/Function Proxy is rejected
  // by the shared capture boundary with zero caller trap/getter dispatch.
  if (!isNativePromise(directResult)) {
    return captureProviderReadResult(directResult, method);
  }

  // `await` performs PromiseResolve semantics and can consult the transport's
  // `constructor` before suspension. Accept only a same-realm native Promise with
  // no own string properties and require the initialization-time
  // Promise.prototype.constructor descriptor to remain intact. Node/AsyncHooks
  // may attach own symbol metadata to ordinary native Promises; PromiseResolve
  // does not consult those symbols, so they are not treated as transport
  // decoration here. The reflection used here is captured at module
  // initialization and reads descriptors without invoking result-owned getters.
  // Upstream assimilation already performed internally before a genuine Promise
  // reaches this boundary remains an explicit non-claim.
  validateNativePromiseTransport(directResult, method);

  let resolved;
  try {
    resolved = await directResult;
  } catch {
    fail('POMRX_WG_PROVIDER_E_CONTEXT_UNAVAILABLE', `provider ${method} read failed`);
  }
  return captureProviderReadResult(resolved, method);
}

async function readProviderSnapshot(provider, assertRuntimeIntegrity) {
  const chainRaw = await providerRead(provider, 'eth_chainId');
  assertRuntimeIntegrity();
  const accountsRaw = await providerRead(provider, 'eth_accounts');
  // The provider result itself is still untrusted ambient data. Recheck the
  // controlled-host intrinsic surface immediately after the await and before
  // normalizeAccounts() can dispatch through Array.prototype methods. Keeping
  // this outside providerRead() also preserves the exact guard error provenance.
  assertRuntimeIntegrity();
  return Object.freeze({
    chain_id: normalizeProviderChain(chainRaw),
    accounts: normalizeAccounts(accountsRaw),
  });
}

function sameAccounts(left, right) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

async function sampleStableProviderContext(provider, assertRuntimeIntegrity) {
  const first = await readProviderSnapshot(provider, assertRuntimeIntegrity);
  const second = await readProviderSnapshot(provider, assertRuntimeIntegrity);
  if (first.chain_id !== second.chain_id || !sameAccounts(first.accounts, second.accounts)) {
    fail('POMRX_WG_PROVIDER_E_CONTEXT_UNSTABLE', 'provider chain/account context changed during sampling');
  }
  return Object.freeze({
    chain_id: first.chain_id,
    account: first.accounts[0],
  });
}

async function sampleTrustedContext(captureTrustedOrigin, provider, assertRuntimeIntegrity) {
  const originBefore = sampleTrustedOrigin(captureTrustedOrigin);
  const providerContext = await sampleStableProviderContext(provider, assertRuntimeIntegrity);
  const originAfter = sampleTrustedOrigin(captureTrustedOrigin);
  if (originBefore !== originAfter) {
    fail('POMRX_WG_PROVIDER_E_CONTEXT_UNSTABLE', 'trusted origin changed during provider sampling');
  }
  return Object.freeze({
    origin: originBefore,
    chain_id: providerContext.chain_id,
    account: providerContext.account,
  });
}

function commitContext(context, policyHash) {
  const payload = Object.freeze({
    schema_version: WALLET_GUARD_CONTEXT_SCHEMA_VERSION,
    origin: context.origin,
    chain_id: context.chain_id,
    account: context.account,
    policy_hash: policyHash,
  });
  const canonical = canonicalizePayload(payload);
  return sha256Hex(`${CONTEXT_COMMIT_DOMAIN}${canonical}`);
}

function commitMethod(method) {
  return sha256Hex(`${METHOD_COMMIT_DOMAIN}${method}`);
}

function validateReferenceAuthorization(value) {
  exactKeys(value, REFERENCE_AUTH_KEYS, 'reference authorization evidence');
  for (const field of ['run_id', 'agent_ref', 'subject_ref']) {
    if (typeof value[field] !== 'string' || !ID_PATTERN.test(value[field])) {
      fail('POMRX_WG_PROVIDER_E_INVALID', `${field} is invalid`);
    }
  }
  for (const field of ['verification_profile', 'verifier_version']) {
    if (typeof value[field] !== 'string' || !PROFILE_PATTERN.test(value[field])) {
      fail('POMRX_WG_PROVIDER_E_INVALID', `${field} is invalid`);
    }
  }
  for (const field of [
    'preflight_receipt_hash',
    'witness_ack_hash',
    'implementation_artifact_sha256',
    'effective_verification_policy_sha256',
  ]) {
    if (typeof value[field] !== 'string' || !HASH_PATTERN.test(value[field])) {
      fail('POMRX_WG_PROVIDER_E_INVALID', `${field} is invalid`);
    }
  }
  for (const field of ['source_key_id', 'witness_key_id']) {
    if (typeof value[field] !== 'string' || !KEY_ID_PATTERN.test(value[field])) {
      fail('POMRX_WG_PROVIDER_E_INVALID', `${field} is invalid`);
    }
  }
  if (value.source_key_id === value.witness_key_id) {
    fail('POMRX_WG_PROVIDER_E_INVALID', 'source and witness identities must be distinct');
  }
  canonicalUtcInstant(value.witness_valid_until, 'witness_valid_until');
  return Object.freeze({ ...value });
}

function getReferenceAuthorizationForRequest(factory, requestSummary) {
  exactKeys(requestSummary, REFERENCE_REQUEST_KEYS, 'reference authorization request');
  let value;
  try {
    value = factory(Object.freeze({ ...requestSummary }));
  } catch {
    fail('POMRX_WG_PROVIDER_E_REFERENCE_UNAVAILABLE', 'reference authorization evidence supplier failed');
  }
  if (value && typeof value === 'object' && typeof value.then === 'function') {
    fail('POMRX_WG_PROVIDER_E_REFERENCE_UNAVAILABLE', 'reference authorization evidence supplier must be synchronous');
  }
  return validateReferenceAuthorization(value);
}

function validatePreparedExecution(prepared) {
  exactKeys(prepared, PREPARED_KEYS, 'prepared execution');
  if (prepared.schema_version !== WALLET_GUARD_PREPARED_EXECUTION_VERSION) {
    fail('POMRX_WG_PROVIDER_E_PREPARED_INVALID', 'prepared execution version is invalid');
  }
  if (typeof prepared.intent_commitment !== 'string' || !HASH_PATTERN.test(prepared.intent_commitment)
      || typeof prepared.policy_hash !== 'string' || !HASH_PATTERN.test(prepared.policy_hash)) {
    fail('POMRX_WG_PROVIDER_E_PREPARED_INVALID', 'prepared execution commitments are invalid');
  }
  return prepared;
}

function exactContextMatches(prepared, context) {
  return prepared.origin === context.origin
    && prepared.chain_id === context.chain_id
    && prepared.account === context.account;
}

function makeDecisionResult(policyResult, committed, forwarded, providerResult = null) {
  return Object.freeze({
    decision: policyResult.decision,
    reasons: policyResult.reasons,
    policy_hash: policyResult.policy_hash,
    intent_commitment: committed.intent_commitment,
    forwarded,
    provider_result: providerResult,
    reference_authorization_only: true,
  });
}

export function createWalletGuardReferenceProviderGateway(options) {
  exactBootstrapKeys(options);
  const {
    captureTrustedOrigin,
    provider,
    trustedClock,
    referenceAuthorizationForRequest,
    assertRuntimeIntegrity,
  } = options;
  if (typeof captureTrustedOrigin !== 'function'
      || !provider
      || typeof provider !== 'object'
      || typeof provider.request !== 'function'
      || typeof trustedClock !== 'function'
      || typeof referenceAuthorizationForRequest !== 'function'
      || (assertRuntimeIntegrity !== undefined && typeof assertRuntimeIntegrity !== 'function')) {
    fail('POMRX_WG_PROVIDER_E_INVALID', 'trusted bootstrap dependencies are invalid');
  }
  if (!Number.isSafeInteger(options.capabilityLifetimeMs)
      || options.capabilityLifetimeMs < 1_000
      || options.capabilityLifetimeMs > 300_000) {
    fail('POMRX_WG_PROVIDER_E_INVALID', 'capabilityLifetimeMs must be between 1 second and 5 minutes');
  }

  function assertRuntimeIntegrityNow() {
    if (assertRuntimeIntegrity !== undefined) assertRuntimeIntegrity();
  }

  assertRuntimeIntegrityNow();
  const policy = normalizeWalletGuardPolicy(options.policy);
  const usedRunIds = new Set();
  const usedPreflightHashes = new Set();
  const usedWitnessHashes = new Set();
  let requestCounter = 0;

  const coreGateHarness = createReferenceSingleUseGateHarness({
    trustedClock,
    observeBinding: async (attempt) => {
      exactKeys(attempt, ['request_id', 'request'], 'Wallet Guard execution attempt');
      const context = await sampleTrustedContext(
        captureTrustedOrigin,
        provider,
        assertRuntimeIntegrityNow,
      );
      // The controlled host can supply a synchronous same-realm integrity guard.
      // Run it immediately after every async context sample, before request cloning,
      // intent normalization or policy evaluation can dispatch through mutable
      // application intrinsics. There is no await between this check and policy
      // dispatch, so post-await prototype drift cannot hide between coarse guards.
      assertRuntimeIntegrityNow();
      const request = clonePlainRequest(attempt.request);
      const intent = normalizeWalletGuardIntent({
        requestId: attempt.request_id,
        trustedOrigin: context.origin,
        trustedChainId: context.chain_id,
        trustedAccount: context.account,
        request,
      });
      assertRuntimeIntegrityNow();
      const policyResult = evaluateWalletGuardPolicy(intent, policy, { status: 'not_run' });
      if (policyResult.decision !== 'ALLOW') {
        fail('POMRX_WG_PROVIDER_E_POLICY_CHANGED', 'policy no longer allows the execution attempt');
      }
      const committed = commitWalletGuardIntent(intent);
      return Object.freeze({
        binding_profile: WALLET_GUARD_BINDING_PROFILE,
        action_commitment: committed.intent_commitment,
        context_commitment: commitContext(context, policyResult.policy_hash),
        prepared_execution: Object.freeze({
          schema_version: WALLET_GUARD_PREPARED_EXECUTION_VERSION,
          request_id: attempt.request_id,
          origin: context.origin,
          chain_id: context.chain_id,
          account: context.account,
          intent_commitment: committed.intent_commitment,
          policy_hash: policyResult.policy_hash,
          request,
        }),
      });
    },
    executeDownstream: async (preparedInput) => {
      const prepared = validatePreparedExecution(preparedInput);
      const context = await sampleTrustedContext(
        captureTrustedOrigin,
        provider,
        assertRuntimeIntegrityNow,
      );
      assertRuntimeIntegrityNow();
      if (!exactContextMatches(prepared, context)) {
        fail('POMRX_WG_PROVIDER_E_CONTEXT_CHANGED', 'trusted context changed immediately before forwarding');
      }

      const request = clonePlainRequest(prepared.request);
      const intent = normalizeWalletGuardIntent({
        requestId: prepared.request_id,
        trustedOrigin: context.origin,
        trustedChainId: context.chain_id,
        trustedAccount: context.account,
        request,
      });
      const committed = commitWalletGuardIntent(intent);
      if (committed.intent_commitment !== prepared.intent_commitment) {
        fail('POMRX_WG_PROVIDER_E_BINDING_CHANGED', 'prepared request no longer matches the Gate-bound intent');
      }

      assertRuntimeIntegrityNow();
      const policyResult = evaluateWalletGuardPolicy(intent, policy, { status: 'not_run' });
      if (policyResult.decision !== 'ALLOW' || policyResult.policy_hash !== prepared.policy_hash) {
        fail('POMRX_WG_PROVIDER_E_POLICY_CHANGED', 'policy no longer allows the prepared request');
      }

      return provider.request(request);
    },
  });

  async function request(untrustedRequest) {
    // Snapshot caller-owned data before the first asynchronous boundary. Mutating
    // the dApp object after this call cannot change the request later forwarded.
    const requestSnapshot = clonePlainRequest(untrustedRequest);
    requestCounter += 1;
    const requestId = `wg-reference-request-${String(requestCounter).padStart(8, '0')}`;

    const context = await sampleTrustedContext(
      captureTrustedOrigin,
      provider,
      assertRuntimeIntegrityNow,
    );
    assertRuntimeIntegrityNow();
    const intent = normalizeWalletGuardIntent({
      requestId,
      trustedOrigin: context.origin,
      trustedChainId: context.chain_id,
      trustedAccount: context.account,
      request: requestSnapshot,
    });
    assertRuntimeIntegrityNow();
    const policyResult = evaluateWalletGuardPolicy(intent, policy, { status: 'not_run' });
    const committed = commitWalletGuardIntent(intent);

    if (policyResult.decision !== 'ALLOW') {
      return makeDecisionResult(policyResult, committed, false);
    }

    const issuedAt = sampleTrustedClock(trustedClock);
    const expiresAt = new Date(issuedAt.getTime() + options.capabilityLifetimeMs).toISOString();
    const methodHash = commitMethod(intent.rpc_method);
    const contextCommitment = commitContext(context, policyResult.policy_hash);
    const referenceAuthorization = getReferenceAuthorizationForRequest(
      referenceAuthorizationForRequest,
      {
        request_id: requestId,
        method_hash: methodHash,
        policy_hash: policyResult.policy_hash,
        action_commitment: committed.intent_commitment,
        context_commitment: contextCommitment,
        issued_at: issuedAt.toISOString(),
        expires_at: expiresAt,
      },
    );

    const witnessValidUntil = canonicalUtcInstant(
      referenceAuthorization.witness_valid_until,
      'witness_valid_until',
    );
    if (new Date(expiresAt).getTime() > witnessValidUntil.getTime()) {
      fail('POMRX_WG_PROVIDER_E_TIME_INVALID', 'capability expiry exceeds witness validity');
    }
    if (usedRunIds.has(referenceAuthorization.run_id)
        || usedPreflightHashes.has(referenceAuthorization.preflight_receipt_hash)
        || usedWitnessHashes.has(referenceAuthorization.witness_ack_hash)) {
      fail(
        'POMRX_WG_PROVIDER_E_REFERENCE_REPLAY',
        'reference authorization evidence was already used by this gateway',
      );
    }

    const bindingInput = Object.freeze({
      binding_profile: WALLET_GUARD_BINDING_PROFILE,
      run_id: referenceAuthorization.run_id,
      agent_ref: referenceAuthorization.agent_ref,
      subject_ref: referenceAuthorization.subject_ref,
      method_hash: methodHash,
      policy_hash: policyResult.policy_hash,
      action_commitment: committed.intent_commitment,
      context_commitment: contextCommitment,
      preflight_receipt_hash: referenceAuthorization.preflight_receipt_hash,
      witness_ack_hash: referenceAuthorization.witness_ack_hash,
      source_key_id: referenceAuthorization.source_key_id,
      witness_key_id: referenceAuthorization.witness_key_id,
      verification_profile: referenceAuthorization.verification_profile,
      verifier_version: referenceAuthorization.verifier_version,
      implementation_artifact_sha256: referenceAuthorization.implementation_artifact_sha256,
      effective_verification_policy_sha256: referenceAuthorization.effective_verification_policy_sha256,
      issued_at: issuedAt.toISOString(),
      expires_at: expiresAt,
    });

    const { capability } = coreGateHarness.testAuthority.issueReferenceAuthorizationForTest(
      bindingInput,
      { witnessValidUntil: referenceAuthorization.witness_valid_until },
    );
    usedRunIds.add(referenceAuthorization.run_id);
    usedPreflightHashes.add(referenceAuthorization.preflight_receipt_hash);
    usedWitnessHashes.add(referenceAuthorization.witness_ack_hash);

    const providerResult = await coreGateHarness.gate.consume(
      capability,
      Object.freeze({ request_id: requestId, request: requestSnapshot }),
    );
    return makeDecisionResult(policyResult, committed, true, providerResult);
  }

  // The caller-facing surface intentionally exposes no provider, Core Gate,
  // capability issuer, policy object or trusted capture callback.
  return Object.freeze({ request });
}