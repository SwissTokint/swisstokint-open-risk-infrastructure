import { types as utilTypes } from 'node:util';

import {
  canonicalizePayload,
  sha256Hex,
} from '../../../sdk/typescript/swisstokint-proof.mjs';
import {
  captureReferencePlainDataOutcome,
} from '../../../core/reference-data/plain-data-snapshot.mjs';
import {
  WalletGuardDecoderError,
  decodeTransactionCalldata,
  decodeTypedData,
  normalizeChainId,
  normalizeEvmAddress,
  normalizeHexData,
  normalizeQuantity,
} from './evm-decoders.mjs';

export const WALLET_GUARD_INTENT_SCHEMA_VERSION = 'wallet_guard_intent/0.1';
export const WALLET_GUARD_INTENT_COMMIT_DOMAIN = 'swisstokint:pom-rx-wallet-guard-intent:v1:';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{7,127}$/u;
const RPC_METHOD_PATTERN = /^[A-Za-z0-9_]{1,64}$/u;
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const DECIMAL_INTEGER_PATTERN = /^(?:0|[1-9][0-9]*)$/u;
const REQUEST_KEYS = Object.freeze(['method', 'params']);
const NORMALIZE_KEYS = Object.freeze([
  'requestId',
  'trustedOrigin',
  'trustedChainId',
  'trustedAccount',
  'request',
]);
const SEND_TX_KEYS = new Set(['from', 'to', 'value', 'data']);
const normalizedIntentBrand = new WeakSet();

// Intent provenance and the transaction-field allowlist are security-critical
// application-profile state. Capture their collection intrinsics once so later
// same-realm prototype mutation cannot forge local intent provenance, prevent
// new intents from being branded, or widen the accepted transaction envelope.
const REFLECT_APPLY = Reflect.apply;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PROTOTYPE = Array.prototype;
const OBJECT_PROTOTYPE = Object.prototype;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_OWN_PROPERTY_NAMES = Object.getOwnPropertyNames;
const OBJECT_GET_OWN_PROPERTY_SYMBOLS = Object.getOwnPropertySymbols;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const SET_HAS = Set.prototype.has;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const UTIL_TYPES_IS_PROXY = utilTypes.isProxy;

function arrayIsArray(value) {
  return REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value]);
}

function isProxy(value) {
  return REFLECT_APPLY(UTIL_TYPES_IS_PROXY, utilTypes, [value]);
}

function objectGetOwnPropertyDescriptor(value, key) {
  return REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [value, key]);
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

function setHas(set, value) {
  return REFLECT_APPLY(SET_HAS, set, [value]);
}

function weakSetAdd(set, value) {
  REFLECT_APPLY(WEAK_SET_ADD, set, [value]);
}

function weakSetHas(set, value) {
  return REFLECT_APPLY(WEAK_SET_HAS, set, [value]);
}

export const WALLET_GUARD_INTENT_KEYS = Object.freeze([
  'schema_version',
  'request_id',
  'origin',
  'chain_id',
  'account',
  'rpc_method',
  'request_class',
  'target',
  'spender',
  'recipient',
  'native_value',
  'calldata_sha256',
  'typed_data_sha256',
  'requested_allowance',
  'token_amount',
  'requested_operator_approval',
  'typed_data_owner',
  'typed_data_domain_chain_id',
  'typed_data_verifying_contract',
  'simulation_required',
]);

export class WalletGuardIntentError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WalletGuardIntentError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new WalletGuardIntentError(code, message);
}

function assertExactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('POMRX_WG_E_REQUEST_INVALID', `${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail('POMRX_WG_E_REQUEST_INVALID', `${label} has missing or unknown fields`);
  }
}

function isOwnEnumerableDataDescriptor(descriptor) {
  return Boolean(descriptor)
    && objectHasOwn(descriptor, 'value')
    && objectHasOwn(descriptor, 'enumerable')
    && descriptor.enumerable === true
    && !objectHasOwn(descriptor, 'get')
    && !objectHasOwn(descriptor, 'set');
}

function validateExactTypedDataRequestWrapper(request) {
  const label = 'EIP-1193 typed-data request';
  if (!request
      || typeof request !== 'object'
      || isProxy(request)
      || arrayIsArray(request)) {
    fail('POMRX_WG_E_REQUEST_INVALID', `${label} must be a non-Proxy plain object`);
  }
  const prototype = objectGetPrototypeOf(request);
  if (prototype !== OBJECT_PROTOTYPE && prototype !== null) {
    fail('POMRX_WG_E_REQUEST_INVALID', `${label} must use Object.prototype or a null prototype`);
  }
  if (objectGetOwnPropertySymbols(request).length !== 0) {
    fail('POMRX_WG_E_REQUEST_INVALID', `${label} cannot contain symbol keys`);
  }

  const requestNames = objectGetOwnPropertyNames(request);
  const requestDescriptors = objectGetOwnPropertyDescriptors(request);
  if (requestNames.length !== REQUEST_KEYS.length) {
    fail('POMRX_WG_E_REQUEST_INVALID', `${label} has missing, hidden or unknown fields`);
  }
  for (const key of REQUEST_KEYS) {
    if (!objectHasOwn(requestDescriptors, key)
        || !isOwnEnumerableDataDescriptor(requestDescriptors[key])) {
      fail('POMRX_WG_E_REQUEST_INVALID', `${label}.${key} must be an enumerable data property`);
    }
  }
  if (requestDescriptors.method.value !== 'eth_signTypedData_v4') {
    fail('POMRX_WG_E_REQUEST_INVALID', `${label} method is invalid`);
  }

  const params = requestDescriptors.params.value;
  if (!params
      || typeof params !== 'object'
      || isProxy(params)
      || !arrayIsArray(params)) {
    fail('POMRX_WG_E_REQUEST_INVALID', `${label}.params must be a non-Proxy array`);
  }
  if (objectGetPrototypeOf(params) !== ARRAY_PROTOTYPE) {
    fail('POMRX_WG_E_REQUEST_INVALID', `${label}.params must use Array.prototype`);
  }
  if (objectGetOwnPropertySymbols(params).length !== 0) {
    fail('POMRX_WG_E_REQUEST_INVALID', `${label}.params cannot contain symbol keys`);
  }

  const paramNames = objectGetOwnPropertyNames(params);
  const paramDescriptors = objectGetOwnPropertyDescriptors(params);
  const lengthDescriptor = objectGetOwnPropertyDescriptor(params, 'length');
  if (paramNames.length !== 3
      || !lengthDescriptor
      || !objectHasOwn(lengthDescriptor, 'value')
      || lengthDescriptor.value !== 2
      || objectHasOwn(lengthDescriptor, 'get')
      || objectHasOwn(lengthDescriptor, 'set')) {
    fail('POMRX_WG_E_REQUEST_INVALID', `${label}.params must contain exactly 2 dense elements`);
  }
  for (let index = 0; index < 2; index += 1) {
    const descriptor = paramDescriptors[String(index)];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail(
        'POMRX_WG_E_REQUEST_INVALID',
        `${label}.params[${index}] must be an enumerable data property`,
      );
    }
  }
}

function normalizeTrustedOrigin(value) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 512) {
    fail('POMRX_WG_E_ORIGIN_INVALID', 'trusted origin is invalid');
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    fail('POMRX_WG_E_ORIGIN_INVALID', 'trusted origin must be an absolute URL origin');
  }
  if (!['https:', 'http:'].includes(url.protocol) || url.origin !== value || url.username || url.password) {
    fail('POMRX_WG_E_ORIGIN_INVALID', 'trusted origin must be a canonical HTTP(S) origin');
  }
  return url.origin;
}

function normalizeRequest(request) {
  if (!request
      || typeof request !== 'object'
      || arrayIsArray(request)
      || isProxy(request)) {
    fail('POMRX_WG_E_REQUEST_INVALID', 'EIP-1193 request must be a non-Proxy object');
  }

  const methodDescriptor = objectGetOwnPropertyDescriptor(request, 'method');
  const paramsDescriptor = objectGetOwnPropertyDescriptor(request, 'params');
  if (!isOwnEnumerableDataDescriptor(methodDescriptor)
      || !isOwnEnumerableDataDescriptor(paramsDescriptor)) {
    fail(
      'POMRX_WG_E_REQUEST_INVALID',
      'EIP-1193 request method and params must be enumerable data properties',
    );
  }

  if (methodDescriptor.value === 'eth_signTypedData_v4') {
    // The typed-data payload receives its own full shared capture budget later;
    // validate only the exact request/params wrapper here so hidden fields,
    // symbols, accessors, Proxies and decorated/custom-prototype arrays cannot
    // normalize successfully and then fail at the simulation boundary.
    validateExactTypedDataRequestWrapper(request);
  } else {
    assertExactKeys(request, REQUEST_KEYS, 'EIP-1193 request');
  }

  if (typeof methodDescriptor.value !== 'string'
      || !RPC_METHOD_PATTERN.test(methodDescriptor.value)) {
    fail('POMRX_WG_E_REQUEST_INVALID', 'RPC method is invalid');
  }
  if (!arrayIsArray(paramsDescriptor.value)) {
    fail('POMRX_WG_E_REQUEST_INVALID', 'RPC params must be an array');
  }
  return request;
}

function normalizeSendTransaction(request, trustedAccount) {
  if (request.params.length !== 1) {
    fail('POMRX_WG_E_REQUEST_INVALID', 'eth_sendTransaction requires exactly one transaction object');
  }
  const tx = request.params[0];
  if (!tx || typeof tx !== 'object' || Array.isArray(tx)) {
    fail('POMRX_WG_E_REQUEST_INVALID', 'transaction must be an object');
  }
  for (const key of Object.keys(tx)) {
    if (!setHas(SEND_TX_KEYS, key)) {
      fail('POMRX_WG_E_REQUEST_INVALID', `unsupported transaction field: ${key}`);
    }
  }
  if (!Object.hasOwn(tx, 'from') || !Object.hasOwn(tx, 'to')) {
    fail('POMRX_WG_E_REQUEST_INVALID', 'transaction from and to are required');
  }

  const requestedFrom = normalizeEvmAddress(tx.from, 'transaction from');
  if (requestedFrom !== trustedAccount) {
    fail('POMRX_WG_E_ACCOUNT_MISMATCH', 'transaction from does not match trusted active account');
  }

  const target = normalizeEvmAddress(tx.to, 'transaction to');
  const nativeValue = normalizeQuantity(tx.value ?? '0x0', 'transaction value');
  const data = normalizeHexData(tx.data ?? '0x', 'transaction data');
  const decoded = decodeTransactionCalldata(data);

  return Object.freeze({
    request_class: decoded.request_class,
    target,
    spender: decoded.spender,
    recipient: decoded.request_class === 'native_transfer' ? target : decoded.recipient,
    native_value: nativeValue,
    calldata_sha256: decoded.calldata_sha256,
    typed_data_sha256: null,
    requested_allowance: decoded.requested_allowance,
    token_amount: decoded.token_amount,
    requested_operator_approval: decoded.requested_operator_approval,
    typed_data_owner: null,
    typed_data_domain_chain_id: null,
    typed_data_verifying_contract: null,
    simulation_required: decoded.simulation_required,
  });
}

function normalizeTypedDataRequest(request, trustedAccount) {
  if (request.params.length !== 2) {
    fail('POMRX_WG_E_REQUEST_INVALID', 'eth_signTypedData_v4 requires account and typed data');
  }
  const requestedAccount = normalizeEvmAddress(request.params[0], 'typed data account');
  if (requestedAccount !== trustedAccount) {
    fail('POMRX_WG_E_ACCOUNT_MISMATCH', 'typed data account does not match trusted active account');
  }

  // Keep the normalization boundary consistent with the simulation boundary for
  // typed-data payloads. The shared capture rejects hidden/non-enumerable fields,
  // symbols, custom array prototypes, sparse/decorated arrays, accessors and
  // Proxies without widening any shared limit. The typed-data payload receives
  // the same full 1,000-node/depth/string budget as the decoder itself.
  const typedDataCapture = captureReferencePlainDataOutcome(
    request.params[1],
    'Wallet Guard typed data normalization',
  );
  if (!typedDataCapture.ok) {
    fail(
      'POMRX_WG_E_REQUEST_INVALID',
      'typed data must be bounded inert plain data',
    );
  }

  const decoded = decodeTypedData(typedDataCapture.value);
  if (decoded.request_class === 'permit_eip2612' && decoded.typed_data_owner !== trustedAccount) {
    fail('POMRX_WG_E_ACCOUNT_MISMATCH', 'Permit owner does not match trusted active account');
  }
  return Object.freeze({
    request_class: decoded.request_class,
    target: decoded.target,
    spender: decoded.spender,
    recipient: null,
    native_value: '0',
    calldata_sha256: null,
    typed_data_sha256: decoded.typed_data_sha256,
    requested_allowance: decoded.requested_allowance,
    token_amount: null,
    requested_operator_approval: null,
    typed_data_owner: decoded.typed_data_owner,
    typed_data_domain_chain_id: decoded.typed_data_domain_chain_id,
    typed_data_verifying_contract: decoded.typed_data_verifying_contract,
    simulation_required: decoded.simulation_required,
  });
}

function normalizeGenericSignature(request) {
  if (request.params.length < 1 || request.params.length > 2) {
    fail('POMRX_WG_E_REQUEST_INVALID', `${request.method} has an unsupported parameter shape`);
  }
  let canonicalParams;
  try {
    canonicalParams = canonicalizePayload({ params: request.params });
  } catch {
    fail('POMRX_WG_E_REQUEST_INVALID', 'generic signature payload is outside bounded canonical form');
  }
  return Object.freeze({
    request_class: 'generic_signature',
    target: null,
    spender: null,
    recipient: null,
    native_value: '0',
    calldata_sha256: null,
    typed_data_sha256: sha256Hex(canonicalParams),
    requested_allowance: null,
    token_amount: null,
    requested_operator_approval: null,
    typed_data_owner: null,
    typed_data_domain_chain_id: null,
    typed_data_verifying_contract: null,
    simulation_required: true,
  });
}

function normalizeUnsupportedRpc(request) {
  let canonicalRequest;
  try {
    canonicalRequest = canonicalizePayload({
      method: request.method,
      params: request.params,
    });
  } catch {
    fail('POMRX_WG_E_REQUEST_INVALID', 'unsupported RPC payload is outside bounded canonical form');
  }
  return Object.freeze({
    request_class: 'unsupported_rpc',
    target: null,
    spender: null,
    recipient: null,
    native_value: '0',
    calldata_sha256: sha256Hex(canonicalRequest),
    typed_data_sha256: null,
    requested_allowance: null,
    token_amount: null,
    requested_operator_approval: null,
    typed_data_owner: null,
    typed_data_domain_chain_id: null,
    typed_data_verifying_contract: null,
    simulation_required: true,
  });
}

function freezeIntent(fields) {
  return Object.freeze({
    schema_version: WALLET_GUARD_INTENT_SCHEMA_VERSION,
    ...fields,
  });
}

function assertNullableAddress(value, field) {
  if (value === null) return;
  if (normalizeEvmAddress(value, field) !== value) {
    fail('POMRX_WG_E_REQUEST_INVALID', `${field} is not canonical`);
  }
}

function assertNullableHash(value, field) {
  if (value !== null && (typeof value !== 'string' || !HASH_PATTERN.test(value))) {
    fail('POMRX_WG_E_REQUEST_INVALID', `${field} must be null or lowercase SHA-256`);
  }
}

function assertNullableDecimal(value, field) {
  if (value !== null && (typeof value !== 'string' || !DECIMAL_INTEGER_PATTERN.test(value))) {
    fail('POMRX_WG_E_REQUEST_INVALID', `${field} must be null or canonical decimal`);
  }
}

export function validateWalletGuardIntent(intent) {
  assertExactKeys(intent, WALLET_GUARD_INTENT_KEYS, 'Wallet Guard intent');
  if (intent.schema_version !== WALLET_GUARD_INTENT_SCHEMA_VERSION) {
    fail('POMRX_WG_E_REQUEST_INVALID', 'unsupported Wallet Guard intent version');
  }
  if (typeof intent.request_id !== 'string' || !REQUEST_ID_PATTERN.test(intent.request_id)) {
    fail('POMRX_WG_E_REQUEST_INVALID', 'intent request_id is invalid');
  }
  if (normalizeTrustedOrigin(intent.origin) !== intent.origin) {
    fail('POMRX_WG_E_REQUEST_INVALID', 'intent origin is not canonical');
  }
  if (normalizeChainId(intent.chain_id) !== intent.chain_id) {
    fail('POMRX_WG_E_REQUEST_INVALID', 'intent chain_id is not canonical');
  }
  if (normalizeEvmAddress(intent.account, 'intent account') !== intent.account) {
    fail('POMRX_WG_E_REQUEST_INVALID', 'intent account is not canonical');
  }
  if (typeof intent.rpc_method !== 'string' || !RPC_METHOD_PATTERN.test(intent.rpc_method)
      || typeof intent.request_class !== 'string' || intent.request_class.length < 1) {
    fail('POMRX_WG_E_REQUEST_INVALID', 'intent RPC identity is invalid');
  }
  for (const field of [
    'target',
    'spender',
    'recipient',
    'typed_data_owner',
    'typed_data_verifying_contract',
  ]) {
    assertNullableAddress(intent[field], field);
  }
  assertNullableHash(intent.calldata_sha256, 'calldata_sha256');
  assertNullableHash(intent.typed_data_sha256, 'typed_data_sha256');
  for (const field of ['native_value', 'requested_allowance', 'token_amount']) {
    assertNullableDecimal(intent[field], field);
  }
  if (intent.native_value === null) {
    fail('POMRX_WG_E_REQUEST_INVALID', 'native_value must always be canonical decimal');
  }
  if (intent.requested_operator_approval !== null
      && typeof intent.requested_operator_approval !== 'boolean') {
    fail('POMRX_WG_E_REQUEST_INVALID', 'requested_operator_approval must be null or boolean');
  }
  if (intent.typed_data_domain_chain_id !== null
      && normalizeChainId(intent.typed_data_domain_chain_id) !== intent.typed_data_domain_chain_id) {
    fail('POMRX_WG_E_REQUEST_INVALID', 'typed_data_domain_chain_id is not canonical');
  }
  if (typeof intent.simulation_required !== 'boolean') {
    fail('POMRX_WG_E_REQUEST_INVALID', 'simulation_required must be boolean');
  }
  if (intent.request_class === 'permit_eip2612' && intent.typed_data_owner !== intent.account) {
    fail('POMRX_WG_E_ACCOUNT_MISMATCH', 'Permit owner must equal intent account');
  }
  return intent;
}

export function isLocallyNormalizedWalletGuardIntent(intent) {
  return weakSetHas(normalizedIntentBrand, intent);
}

function normalizeWalletGuardAction(request, account) {
  if (request.method === 'eth_sendTransaction') {
    return normalizeSendTransaction(request, account);
  }
  if (request.method === 'eth_signTypedData_v4') {
    return normalizeTypedDataRequest(request, account);
  }
  if (request.method === 'personal_sign' || request.method === 'eth_sign') {
    return normalizeGenericSignature(request);
  }
  return normalizeUnsupportedRpc(request);
}

function normalizeWalletGuardIntentInternal(input, translateDecoderErrors) {
  assertExactKeys(input, NORMALIZE_KEYS, 'Wallet Guard normalization input');
  if (typeof input.requestId !== 'string' || !REQUEST_ID_PATTERN.test(input.requestId)) {
    fail('POMRX_WG_E_REQUEST_INVALID', 'requestId has an invalid format');
  }

  const origin = normalizeTrustedOrigin(input.trustedOrigin);
  const chainId = normalizeChainId(input.trustedChainId);
  const account = normalizeEvmAddress(input.trustedAccount, 'trusted active account');
  const request = normalizeRequest(input.request);

  let action;
  if (translateDecoderErrors) {
    try {
      action = normalizeWalletGuardAction(request, account);
    } catch (error) {
      if (error instanceof WalletGuardDecoderError) {
        fail(error.code, error.message);
      }
      throw error;
    }
  } else {
    // Replay is an internal provenance-sensitive validation path. Do not classify
    // a foreign same-class decoder error as a local WalletGuardIntentError. A
    // genuine decoder rejection therefore also keeps its exact decoder provenance
    // here; callers may distinguish semantic mismatch only after a successful
    // replay produces a different normalized commitment.
    action = normalizeWalletGuardAction(request, account);
  }

  const intent = freezeIntent({
    request_id: input.requestId,
    origin,
    chain_id: chainId,
    account,
    rpc_method: request.method,
    request_class: action.request_class,
    target: action.target,
    spender: action.spender,
    recipient: action.recipient,
    native_value: action.native_value,
    calldata_sha256: action.calldata_sha256,
    typed_data_sha256: action.typed_data_sha256,
    requested_allowance: action.requested_allowance,
    token_amount: action.token_amount,
    requested_operator_approval: action.requested_operator_approval,
    typed_data_owner: action.typed_data_owner,
    typed_data_domain_chain_id: action.typed_data_domain_chain_id,
    typed_data_verifying_contract: action.typed_data_verifying_contract,
    simulation_required: action.simulation_required,
  });
  validateWalletGuardIntent(intent);
  weakSetAdd(normalizedIntentBrand, intent);
  return intent;
}

export function normalizeWalletGuardIntent(input) {
  return normalizeWalletGuardIntentInternal(input, true);
}

export function normalizeWalletGuardIntentForReplay(input) {
  return normalizeWalletGuardIntentInternal(input, false);
}

export function commitWalletGuardIntent(intent) {
  validateWalletGuardIntent(intent);
  const canonical_intent = canonicalizePayload(intent);
  return Object.freeze({
    canonical_intent,
    intent_commitment: sha256Hex(`${WALLET_GUARD_INTENT_COMMIT_DOMAIN}${canonical_intent}`),
  });
}
