import { createHash } from 'node:crypto';
import { types as utilTypes } from 'node:util';

import {
  createReferenceSingleUseGateHarness,
} from '../../../core/gate/reference-single-use-gate.mjs';
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
import {
  WalletGuardTrustedContextError,
  captureWalletGuardTrustedContext,
} from './trusted-context-capture.mjs';

export const WALLET_GUARD_BINDING_PROFILE = 'pom-rx-wallet-guard/0.1';
export const WALLET_GUARD_CONTEXT_SCHEMA_VERSION = 'wallet_guard_context/0.1';
export const WALLET_GUARD_PREPARED_EXECUTION_VERSION = 'wallet_guard_prepared_execution/0.1';

const TRUSTED_REFLECT_APPLY = Reflect.apply;
const TRUSTED_SET = Set;
const TRUSTED_SET_ADD = Set.prototype.add;
const TRUSTED_SET_HAS = Set.prototype.has;
const TRUSTED_REGEXP_EXEC = RegExp.prototype.exec;
const TRUSTED_REGEXP_TEST = RegExp.prototype.test;
const TRUSTED_IS_PROXY = utilTypes.isProxy;

const TRUSTED_OBJECT = globalThis.Object;
const TRUSTED_ARRAY = globalThis.Array;
const TRUSTED_NUMBER = globalThis.Number;
const TRUSTED_DATE = globalThis.Date;
const TRUSTED_URL = globalThis.URL;
const TRUSTED_STRING = globalThis.String;
const TRUSTED_JSON_STRINGIFY = globalThis.JSON.stringify;
const TRUSTED_CREATE_HASH = createHash;
const TRUSTED_ARRAY_SORT = TRUSTED_ARRAY.prototype.sort;
const TRUSTED_STRING_PAD_START = TRUSTED_STRING.prototype.padStart;
const TRUSTED_DATE_GET_TIME = TRUSTED_DATE.prototype.getTime;
const TRUSTED_DATE_TO_ISO_STRING = TRUSTED_DATE.prototype.toISOString;
const TRUSTED_URL_PROTOCOL_GET = globalThis.Object.getOwnPropertyDescriptor(
  TRUSTED_URL.prototype,
  'protocol',
).get;
const TRUSTED_URL_ORIGIN_GET = globalThis.Object.getOwnPropertyDescriptor(
  TRUSTED_URL.prototype,
  'origin',
).get;
const TRUSTED_URL_USERNAME_GET = globalThis.Object.getOwnPropertyDescriptor(
  TRUSTED_URL.prototype,
  'username',
).get;
const TRUSTED_URL_PASSWORD_GET = globalThis.Object.getOwnPropertyDescriptor(
  TRUSTED_URL.prototype,
  'password',
).get;
const TRUSTED_HASH_PROBE = TRUSTED_CREATE_HASH('sha256');
const TRUSTED_HASH_UPDATE = TRUSTED_HASH_PROBE.update;
const TRUSTED_HASH_DIGEST = TRUSTED_HASH_PROBE.digest;

const Object = {
  create: TRUSTED_OBJECT.create,
  defineProperty: TRUSTED_OBJECT.defineProperty,
  freeze: TRUSTED_OBJECT.freeze,
  getOwnPropertyDescriptors: TRUSTED_OBJECT.getOwnPropertyDescriptors,
  getOwnPropertySymbols: TRUSTED_OBJECT.getOwnPropertySymbols,
  getPrototypeOf: TRUSTED_OBJECT.getPrototypeOf,
  hasOwn: TRUSTED_OBJECT.hasOwn,
  keys: TRUSTED_OBJECT.keys,
  prototype: TRUSTED_OBJECT.prototype,
};
const Array = {
  isArray: TRUSTED_ARRAY.isArray,
};
const Number = {
  isFinite: TRUSTED_NUMBER.isFinite,
  isSafeInteger: TRUSTED_NUMBER.isSafeInteger,
};
class Date extends TRUSTED_DATE {
  getTime() {
    return TRUSTED_REFLECT_APPLY(TRUSTED_DATE_GET_TIME, this, []);
  }

  toISOString() {
    return TRUSTED_REFLECT_APPLY(TRUSTED_DATE_TO_ISO_STRING, this, []);
  }
}
class URL extends TRUSTED_URL {
  get protocol() {
    return TRUSTED_REFLECT_APPLY(TRUSTED_URL_PROTOCOL_GET, this, []);
  }

  get origin() {
    return TRUSTED_REFLECT_APPLY(TRUSTED_URL_ORIGIN_GET, this, []);
  }

  get username() {
    return TRUSTED_REFLECT_APPLY(TRUSTED_URL_USERNAME_GET, this, []);
  }

  get password() {
    return TRUSTED_REFLECT_APPLY(TRUSTED_URL_PASSWORD_GET, this, []);
  }
}

const TRUSTED_CONTEXT_RUNTIME = Object.freeze({
  objectCreate: TRUSTED_OBJECT.create,
  objectDefineProperty: TRUSTED_OBJECT.defineProperty,
  objectFreeze: TRUSTED_OBJECT.freeze,
  reflectApply: TRUSTED_REFLECT_APPLY,
  regexpExec: TRUSTED_REGEXP_EXEC,
});

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
const FORBIDDEN_KEYS = new TRUSTED_SET(['__proto__', 'constructor', 'prototype']);
const BOOTSTRAP_KEYS = Object.freeze([
  'captureTrustedOrigin',
  'provider',
  'policy',
  'trustedClock',
  'referenceAuthorizationForRequest',
  'capabilityLifetimeMs',
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

function setHas(set, value) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_SET_HAS, set, [value]);
}

function setAdd(set, value) {
  TRUSTED_REFLECT_APPLY(TRUSTED_SET_ADD, set, [value]);
}

function regexpTest(pattern, value) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_REGEXP_TEST, pattern, [value]);
}

function isProxy(value) {
  return Boolean(value)
    && (typeof value === 'object' || typeof value === 'function')
    && TRUSTED_REFLECT_APPLY(TRUSTED_IS_PROXY, utilTypes, [value]);
}

function defineOwnDataProperty(target, key, value, writable = false, configurable = false) {
  const descriptor = TRUSTED_REFLECT_APPLY(Object.create, undefined, [null]);
  descriptor.value = value;
  descriptor.enumerable = true;
  descriptor.configurable = configurable;
  descriptor.writable = writable;
  TRUSTED_REFLECT_APPLY(
    Object.defineProperty,
    undefined,
    [target, key, descriptor],
  );
}

function appendArrayValue(list, value) {
  defineOwnDataProperty(list, `${list.length}`, value, true, true);
}

function sortedCopy(values) {
  const copy = new TRUSTED_ARRAY();
  for (let index = 0; index < values.length; index += 1) {
    appendArrayValue(copy, values[index]);
  }
  TRUSTED_REFLECT_APPLY(TRUSTED_ARRAY_SORT, copy, []);
  return copy;
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('POMRX_WG_PROVIDER_E_INVALID', `${label} must be an object`);
  }
  const actual = sortedCopy(Object.keys(value));
  const wanted = sortedCopy(expected);
  if (actual.length !== wanted.length) {
    fail('POMRX_WG_PROVIDER_E_INVALID', `${label} has missing or unknown fields`);
  }
  for (let index = 0; index < actual.length; index += 1) {
    if (actual[index] !== wanted[index]) {
      fail('POMRX_WG_PROVIDER_E_INVALID', `${label} has missing or unknown fields`);
    }
  }
}

function snapshotExactOwnDataRecord(value, expected, label) {
  if (!value
      || typeof value !== 'object'
      || isProxy(value)
      || Array.isArray(value)) {
    fail('POMRX_WG_PROVIDER_E_INVALID', `${label} must be a non-Proxy object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail('POMRX_WG_PROVIDER_E_INVALID', `${label} must be a plain object`);
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    fail('POMRX_WG_PROVIDER_E_INVALID', `${label} cannot contain symbol fields`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const names = Object.keys(descriptors);
  if (names.length !== expected.length) {
    fail('POMRX_WG_PROVIDER_E_INVALID', `${label} has missing or unknown fields`);
  }
  const snapshot = Object.create(null);
  for (let index = 0; index < expected.length; index += 1) {
    const key = expected[index];
    const descriptor = descriptors[key];
    if (!descriptor
        || descriptor.enumerable !== true
        || !Object.hasOwn(descriptor, 'value')
        || Object.hasOwn(descriptor, 'get')
        || Object.hasOwn(descriptor, 'set')) {
      fail('POMRX_WG_PROVIDER_E_INVALID', `${label}.${key} must be an enumerable data property`);
    }
    defineOwnDataProperty(snapshot, key, descriptor.value);
  }
  return Object.freeze(snapshot);
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
  if ((url.protocol !== 'https:' && url.protocol !== 'http:')
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
  if (typeof value !== 'string' || value.length === 0 || value[value.length - 1] !== 'Z') {
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
    if (keys.length !== value.length) {
      fail('POMRX_WG_PROVIDER_E_REQUEST_INVALID', 'request arrays must be dense');
    }
    for (let index = 0; index < keys.length; index += 1) {
      if (keys[index] !== `${index}`) {
        fail('POMRX_WG_PROVIDER_E_REQUEST_INVALID', 'request arrays must be dense');
      }
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const output = new TRUSTED_ARRAY();
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const descriptor = descriptors[key];
      if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
        fail('POMRX_WG_PROVIDER_E_REQUEST_INVALID', 'request arrays cannot contain accessors');
      }
      appendArrayValue(output, clonePlainRequest(descriptor.value, depth + 1, budget));
    }
    return Object.freeze(output);
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
  const keys = Object.keys(value);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (key.length === 0 || key.length > MAX_REQUEST_KEY || setHas(FORBIDDEN_KEYS, key)) {
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
    fail('POMRX_WG_PROVIDER_E_CONTEXT_INVALID', 'trusted context returned an invalid chain id');
  }
}

function normalizeProviderAccount(value) {
  try {
    return normalizeEvmAddress(value, 'trusted context account');
  } catch {
    fail('POMRX_WG_PROVIDER_E_CONTEXT_INVALID', 'trusted context returned an invalid account');
  }
}

function captureProviderContext(provider, captureContext) {
  let captured;
  try {
    captured = captureWalletGuardTrustedContext(
      (deliverContext, reportFailure) => TRUSTED_REFLECT_APPLY(
        captureContext,
        provider,
        [deliverContext, reportFailure],
      ),
      TRUSTED_CONTEXT_RUNTIME,
    );
  } catch (error) {
    if (error instanceof WalletGuardTrustedContextError) {
      if (error.code === 'POMRX_WG_CONTEXT_E_CONTRADICTORY') {
        fail('POMRX_WG_PROVIDER_E_CONTEXT_UNSTABLE', 'trusted context source emitted contradictory evidence');
      }
      if (error.code === 'POMRX_WG_CONTEXT_E_INVALID') {
        fail('POMRX_WG_PROVIDER_E_CONTEXT_INVALID', 'trusted context source emitted invalid evidence');
      }
      fail('POMRX_WG_PROVIDER_E_CONTEXT_UNAVAILABLE', 'trusted context source was unavailable');
    }
    throw error;
  }
  return Object.freeze({
    chain_id: normalizeProviderChain(captured.chain_id),
    account: normalizeProviderAccount(captured.account),
  });
}

function sampleStableProviderContext(provider, captureContext) {
  const first = captureProviderContext(provider, captureContext);
  const second = captureProviderContext(provider, captureContext);
  if (first.chain_id !== second.chain_id || first.account !== second.account) {
    fail('POMRX_WG_PROVIDER_E_CONTEXT_UNSTABLE', 'provider chain/account context changed during sampling');
  }
  return first;
}

function sampleTrustedContext(captureTrustedOrigin, provider, captureContext) {
  const originBefore = sampleTrustedOrigin(captureTrustedOrigin);
  const providerContext = sampleStableProviderContext(provider, captureContext);
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

function quoteCanonicalString(value) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_JSON_STRINGIFY, undefined, [value]);
}

function trustedSha256Hex(value) {
  const hash = TRUSTED_CREATE_HASH('sha256');
  TRUSTED_REFLECT_APPLY(TRUSTED_HASH_UPDATE, hash, [value, 'utf8']);
  return TRUSTED_REFLECT_APPLY(TRUSTED_HASH_DIGEST, hash, ['hex']);
}

function commitContext(context, policyHash) {
  const canonical = `{"account":${quoteCanonicalString(context.account)}`
    + `,"chain_id":${quoteCanonicalString(context.chain_id)}`
    + `,"origin":${quoteCanonicalString(context.origin)}`
    + `,"policy_hash":${quoteCanonicalString(policyHash)}`
    + `,"schema_version":${quoteCanonicalString(WALLET_GUARD_CONTEXT_SCHEMA_VERSION)}}`;
  return trustedSha256Hex(`${CONTEXT_COMMIT_DOMAIN}${canonical}`);
}

function commitMethod(method) {
  return trustedSha256Hex(`${METHOD_COMMIT_DOMAIN}${method}`);
}

function validateReferenceAuthorization(value) {
  const snapshot = snapshotExactOwnDataRecord(
    value,
    REFERENCE_AUTH_KEYS,
    'reference authorization evidence',
  );
  for (const field of ['run_id', 'agent_ref', 'subject_ref']) {
    if (typeof snapshot[field] !== 'string' || !regexpTest(ID_PATTERN, snapshot[field])) {
      fail('POMRX_WG_PROVIDER_E_INVALID', `${field} is invalid`);
    }
  }
  for (const field of ['verification_profile', 'verifier_version']) {
    if (typeof snapshot[field] !== 'string' || !regexpTest(PROFILE_PATTERN, snapshot[field])) {
      fail('POMRX_WG_PROVIDER_E_INVALID', `${field} is invalid`);
    }
  }
  for (const field of [
    'preflight_receipt_hash',
    'witness_ack_hash',
    'implementation_artifact_sha256',
    'effective_verification_policy_sha256',
  ]) {
    if (typeof snapshot[field] !== 'string' || !regexpTest(HASH_PATTERN, snapshot[field])) {
      fail('POMRX_WG_PROVIDER_E_INVALID', `${field} is invalid`);
    }
  }
  for (const field of ['source_key_id', 'witness_key_id']) {
    if (typeof snapshot[field] !== 'string' || !regexpTest(KEY_ID_PATTERN, snapshot[field])) {
      fail('POMRX_WG_PROVIDER_E_INVALID', `${field} is invalid`);
    }
  }
  if (snapshot.source_key_id === snapshot.witness_key_id) {
    fail('POMRX_WG_PROVIDER_E_INVALID', 'source and witness identities must be distinct');
  }
  canonicalUtcInstant(snapshot.witness_valid_until, 'witness_valid_until');
  return snapshot;
}

function getReferenceAuthorizationForRequest(factory, requestSummary) {
  exactKeys(requestSummary, REFERENCE_REQUEST_KEYS, 'reference authorization request');
  let value;
  try {
    value = factory(Object.freeze({ ...requestSummary }));
  } catch {
    fail('POMRX_WG_PROVIDER_E_REFERENCE_UNAVAILABLE', 'reference authorization evidence supplier failed');
  }
  return validateReferenceAuthorization(value);
}

function validatePreparedExecution(prepared) {
  exactKeys(prepared, PREPARED_KEYS, 'prepared execution');
  if (prepared.schema_version !== WALLET_GUARD_PREPARED_EXECUTION_VERSION) {
    fail('POMRX_WG_PROVIDER_E_PREPARED_INVALID', 'prepared execution version is invalid');
  }
  if (typeof prepared.intent_commitment !== 'string'
      || !regexpTest(HASH_PATTERN, prepared.intent_commitment)
      || typeof prepared.policy_hash !== 'string'
      || !regexpTest(HASH_PATTERN, prepared.policy_hash)) {
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
  const result = TRUSTED_REFLECT_APPLY(Object.create, undefined, [null]);
  defineOwnDataProperty(result, 'decision', policyResult.decision);
  defineOwnDataProperty(result, 'reasons', policyResult.reasons);
  defineOwnDataProperty(result, 'policy_hash', policyResult.policy_hash);
  defineOwnDataProperty(result, 'intent_commitment', committed.intent_commitment);
  defineOwnDataProperty(result, 'forwarded', forwarded);
  defineOwnDataProperty(result, 'provider_result', providerResult);
  defineOwnDataProperty(result, 'reference_authorization_only', true);
  return TRUSTED_REFLECT_APPLY(Object.freeze, undefined, [result]);
}

export function createWalletGuardReferenceProviderGateway(options) {
  exactKeys(options, BOOTSTRAP_KEYS, 'Wallet Guard provider bootstrap');
  const {
    captureTrustedOrigin,
    provider,
    trustedClock,
    referenceAuthorizationForRequest,
  } = options;
  if (typeof captureTrustedOrigin !== 'function'
      || !provider
      || typeof provider !== 'object'
      || typeof provider.request !== 'function'
      || typeof provider.captureContext !== 'function'
      || typeof trustedClock !== 'function'
      || typeof referenceAuthorizationForRequest !== 'function') {
    fail(
      'POMRX_WG_PROVIDER_E_INVALID',
      'trusted bootstrap requires sensitive request plus synchronous scalar context capture',
    );
  }
  if (!Number.isSafeInteger(options.capabilityLifetimeMs)
      || options.capabilityLifetimeMs < 1_000
      || options.capabilityLifetimeMs > 300_000) {
    fail('POMRX_WG_PROVIDER_E_INVALID', 'capabilityLifetimeMs must be between 1 second and 5 minutes');
  }

  const providerRequest = provider.request;
  const providerCaptureContext = provider.captureContext;
  const policy = normalizeWalletGuardPolicy(options.policy);
  const usedRunIds = new TRUSTED_SET();
  const usedPreflightHashes = new TRUSTED_SET();
  const usedWitnessHashes = new TRUSTED_SET();
  let requestCounter = 0;

  const coreGateHarness = createReferenceSingleUseGateHarness({
    trustedClock,
    observeBinding: async (attempt) => {
      exactKeys(attempt, ['request_id', 'request'], 'Wallet Guard execution attempt');
      const context = sampleTrustedContext(captureTrustedOrigin, provider, providerCaptureContext);
      const request = clonePlainRequest(attempt.request);
      const intent = normalizeWalletGuardIntent({
        requestId: attempt.request_id,
        trustedOrigin: context.origin,
        trustedChainId: context.chain_id,
        trustedAccount: context.account,
        request,
      });
      const policyResult = evaluateWalletGuardPolicy(intent, policy, { status: 'not_run' });
      if (policyResult.decision !== 'ALLOW') {
        fail('POMRX_WG_PROVIDER_E_POLICY_CHANGED', 'policy no longer allows the execution attempt');
      }
      const committed = commitWalletGuardIntent(intent);

      const preparedExecution = TRUSTED_REFLECT_APPLY(Object.create, undefined, [null]);
      defineOwnDataProperty(
        preparedExecution,
        'schema_version',
        WALLET_GUARD_PREPARED_EXECUTION_VERSION,
      );
      defineOwnDataProperty(preparedExecution, 'request_id', attempt.request_id);
      defineOwnDataProperty(preparedExecution, 'origin', context.origin);
      defineOwnDataProperty(preparedExecution, 'chain_id', context.chain_id);
      defineOwnDataProperty(preparedExecution, 'account', context.account);
      defineOwnDataProperty(
        preparedExecution,
        'intent_commitment',
        committed.intent_commitment,
      );
      defineOwnDataProperty(preparedExecution, 'policy_hash', policyResult.policy_hash);
      defineOwnDataProperty(preparedExecution, 'request', request);
      const frozenPreparedExecution = TRUSTED_REFLECT_APPLY(
        Object.freeze,
        undefined,
        [preparedExecution],
      );

      const observed = TRUSTED_REFLECT_APPLY(Object.create, undefined, [null]);
      defineOwnDataProperty(observed, 'binding_profile', WALLET_GUARD_BINDING_PROFILE);
      defineOwnDataProperty(observed, 'action_commitment', committed.intent_commitment);
      defineOwnDataProperty(
        observed,
        'context_commitment',
        commitContext(context, policyResult.policy_hash),
      );
      defineOwnDataProperty(observed, 'prepared_execution', frozenPreparedExecution);
      return TRUSTED_REFLECT_APPLY(Object.freeze, undefined, [observed]);
    },
    executeDownstream: async (preparedInput) => {
      const prepared = validatePreparedExecution(preparedInput);
      const context = sampleTrustedContext(captureTrustedOrigin, provider, providerCaptureContext);
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

      const policyResult = evaluateWalletGuardPolicy(intent, policy, { status: 'not_run' });
      if (policyResult.decision !== 'ALLOW' || policyResult.policy_hash !== prepared.policy_hash) {
        fail('POMRX_WG_PROVIDER_E_POLICY_CHANGED', 'policy no longer allows the prepared request');
      }

      const finalContext = sampleTrustedContext(
        captureTrustedOrigin,
        provider,
        providerCaptureContext,
      );
      if (!exactContextMatches(prepared, finalContext)) {
        fail('POMRX_WG_PROVIDER_E_CONTEXT_CHANGED', 'trusted context changed immediately before forwarding');
      }
      return TRUSTED_REFLECT_APPLY(providerRequest, provider, [request]);
    },
  });

  async function request(untrustedRequest) {
    // Snapshot caller-owned data before the first asynchronous boundary. Mutating
    // the dApp object after this call cannot change the request later forwarded.
    const requestSnapshot = clonePlainRequest(untrustedRequest);
    requestCounter += 1;
    const counterText = TRUSTED_REFLECT_APPLY(TRUSTED_STRING, undefined, [requestCounter]);
    const paddedCounter = TRUSTED_REFLECT_APPLY(
      TRUSTED_STRING_PAD_START,
      counterText,
      [8, '0'],
    );
    const requestId = `wg-reference-request-${paddedCounter}`;

    const context = sampleTrustedContext(captureTrustedOrigin, provider, providerCaptureContext);
    const intent = normalizeWalletGuardIntent({
      requestId,
      trustedOrigin: context.origin,
      trustedChainId: context.chain_id,
      trustedAccount: context.account,
      request: requestSnapshot,
    });
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
    if (setHas(usedRunIds, referenceAuthorization.run_id)
        || setHas(usedPreflightHashes, referenceAuthorization.preflight_receipt_hash)
        || setHas(usedWitnessHashes, referenceAuthorization.witness_ack_hash)) {
      fail(
        'POMRX_WG_PROVIDER_E_REFERENCE_REPLAY',
        'reference authorization evidence was already used by this gateway',
      );
    }

    // Reserve replay identities before any capability-issuer work can execute.
    // Reservations are intentionally not rolled back: if issuance fails, the
    // evidence remains consumed so a reentrant or retried path cannot re-arm it.
    setAdd(usedRunIds, referenceAuthorization.run_id);
    setAdd(usedPreflightHashes, referenceAuthorization.preflight_receipt_hash);
    setAdd(usedWitnessHashes, referenceAuthorization.witness_ack_hash);

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
