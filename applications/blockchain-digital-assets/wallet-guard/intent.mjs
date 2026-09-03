import { createHash } from 'node:crypto';

import {
  canonicalizePayload,
  sha256Hex,
} from '../../../sdk/typescript/swisstokint-proof.mjs';
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

const TRUSTED_ARRAY_IS_ARRAY = Array.isArray;
const TRUSTED_ARRAY_SORT = Array.prototype.sort;
const TRUSTED_CREATE_HASH = createHash;
const TRUSTED_JSON_STRINGIFY = JSON.stringify;
const TRUSTED_OBJECT_CREATE = Object.create;
const TRUSTED_OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const TRUSTED_OBJECT_FREEZE = Object.freeze;
const TRUSTED_OBJECT_HAS_OWN = Object.hasOwn;
const TRUSTED_OBJECT_KEYS = Object.keys;
const TRUSTED_REFLECT_APPLY = Reflect.apply;
const TRUSTED_REGEXP_TEST = RegExp.prototype.test;
const TRUSTED_SET_HAS = Set.prototype.has;
const TRUSTED_WEAK_SET = WeakSet;
const TRUSTED_WEAK_SET_ADD = WeakSet.prototype.add;
const TRUSTED_WEAK_SET_HAS = WeakSet.prototype.has;
const TRUSTED_URL = URL;
const TRUSTED_URL_PROTOCOL_GET = Object.getOwnPropertyDescriptor(TRUSTED_URL.prototype, 'protocol').get;
const TRUSTED_URL_ORIGIN_GET = Object.getOwnPropertyDescriptor(TRUSTED_URL.prototype, 'origin').get;
const TRUSTED_URL_USERNAME_GET = Object.getOwnPropertyDescriptor(TRUSTED_URL.prototype, 'username').get;
const TRUSTED_URL_PASSWORD_GET = Object.getOwnPropertyDescriptor(TRUSTED_URL.prototype, 'password').get;
const TRUSTED_HASH_PROBE = TRUSTED_CREATE_HASH('sha256');
const TRUSTED_HASH_UPDATE = TRUSTED_HASH_PROBE.update;
const TRUSTED_HASH_DIGEST = TRUSTED_HASH_PROBE.digest;

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{7,127}$/u;
const RPC_METHOD_PATTERN = /^[A-Za-z0-9_]{1,64}$/u;
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const DECIMAL_INTEGER_PATTERN = /^(?:0|[1-9][0-9]*)$/u;
const REQUEST_KEYS = TRUSTED_OBJECT_FREEZE(['method', 'params']);
const NORMALIZE_KEYS = TRUSTED_OBJECT_FREEZE([
  'requestId',
  'trustedOrigin',
  'trustedChainId',
  'trustedAccount',
  'request',
]);
const SEND_TX_KEYS = new Set(['from', 'to', 'value', 'data']);
const normalizedIntentBrand = new TRUSTED_WEAK_SET();

export const WALLET_GUARD_INTENT_KEYS = TRUSTED_OBJECT_FREEZE([
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

function setHas(set, value) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_SET_HAS, set, [value]);
}

function weakSetHas(set, value) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_WEAK_SET_HAS, set, [value]);
}

function weakSetAdd(set, value) {
  TRUSTED_REFLECT_APPLY(TRUSTED_WEAK_SET_ADD, set, [value]);
}

function arrayIsArray(value) {
  return TRUSTED_ARRAY_IS_ARRAY(value);
}

function objectKeys(value) {
  return TRUSTED_OBJECT_KEYS(value);
}

function objectHasOwn(value, key) {
  return TRUSTED_OBJECT_HAS_OWN(value, key);
}

function patternTest(pattern, value) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_REGEXP_TEST, pattern, [value]);
}

function appendArrayValue(list, value) {
  const descriptor = TRUSTED_REFLECT_APPLY(TRUSTED_OBJECT_CREATE, undefined, [null]);
  descriptor.value = value;
  descriptor.enumerable = true;
  descriptor.configurable = true;
  descriptor.writable = true;
  TRUSTED_REFLECT_APPLY(
    TRUSTED_OBJECT_DEFINE_PROPERTY,
    undefined,
    [list, String(list.length), descriptor],
  );
}

function sortedCopy(values) {
  const copy = [];
  for (let index = 0; index < values.length; index += 1) {
    appendArrayValue(copy, values[index]);
  }
  TRUSTED_REFLECT_APPLY(TRUSTED_ARRAY_SORT, copy, []);
  return copy;
}

class TrustedURL extends TRUSTED_URL {
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

function assertExactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || arrayIsArray(value)) {
    fail('POMRX_WG_E_REQUEST_INVALID', `${label} must be an object`);
  }
  const actual = sortedCopy(objectKeys(value));
  const wanted = sortedCopy(expected);
  if (actual.length !== wanted.length) {
    fail('POMRX_WG_E_REQUEST_INVALID', `${label} has missing or unknown fields`);
  }
  for (let index = 0; index < actual.length; index += 1) {
    if (actual[index] !== wanted[index]) {
      fail('POMRX_WG_E_REQUEST_INVALID', `${label} has missing or unknown fields`);
    }
  }
}

function normalizeTrustedOrigin(value) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 512) {
    fail('POMRX_WG_E_ORIGIN_INVALID', 'trusted origin is invalid');
  }
  let url;
  try {
    url = new TrustedURL(value);
  } catch {
    fail('POMRX_WG_E_ORIGIN_INVALID', 'trusted origin must be an absolute URL origin');
  }
  if ((url.protocol !== 'https:' && url.protocol !== 'http:')
      || url.origin !== value
      || url.username
      || url.password) {
    fail('POMRX_WG_E_ORIGIN_INVALID', 'trusted origin must be a canonical HTTP(S) origin');
  }
  return url.origin;
}

function normalizeRequest(request) {
  assertExactKeys(request, REQUEST_KEYS, 'EIP-1193 request');
  if (typeof request.method !== 'string' || !patternTest(RPC_METHOD_PATTERN, request.method)) {
    fail('POMRX_WG_E_REQUEST_INVALID', 'RPC method is invalid');
  }
  if (!arrayIsArray(request.params)) {
    fail('POMRX_WG_E_REQUEST_INVALID', 'RPC params must be an array');
  }
  return request;
}

function normalizeSendTransaction(request, trustedAccount) {
  if (request.params.length !== 1) {
    fail('POMRX_WG_E_REQUEST_INVALID', 'eth_sendTransaction requires exactly one transaction object');
  }
  const tx = request.params[0];
  if (!tx || typeof tx !== 'object' || arrayIsArray(tx)) {
    fail('POMRX_WG_E_REQUEST_INVALID', 'transaction must be an object');
  }
  const txKeys = objectKeys(tx);
  for (let index = 0; index < txKeys.length; index += 1) {
    const key = txKeys[index];
    if (!setHas(SEND_TX_KEYS, key)) {
      fail('POMRX_WG_E_REQUEST_INVALID', `unsupported transaction field: ${key}`);
    }
  }
  if (!objectHasOwn(tx, 'from') || !objectHasOwn(tx, 'to')) {
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

  return TRUSTED_OBJECT_FREEZE({
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
  const decoded = decodeTypedData(request.params[1]);
  if (decoded.request_class === 'permit_eip2612' && decoded.typed_data_owner !== trustedAccount) {
    fail('POMRX_WG_E_ACCOUNT_MISMATCH', 'Permit owner does not match trusted active account');
  }
  return TRUSTED_OBJECT_FREEZE({
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
  return TRUSTED_OBJECT_FREEZE({
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
  return TRUSTED_OBJECT_FREEZE({
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
  return TRUSTED_OBJECT_FREEZE({
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
  if (value !== null && (typeof value !== 'string' || !patternTest(HASH_PATTERN, value))) {
    fail('POMRX_WG_E_REQUEST_INVALID', `${field} must be null or lowercase SHA-256`);
  }
}

function assertNullableDecimal(value, field) {
  if (value !== null && (typeof value !== 'string' || !patternTest(DECIMAL_INTEGER_PATTERN, value))) {
    fail('POMRX_WG_E_REQUEST_INVALID', `${field} must be null or canonical decimal`);
  }
}

export function validateWalletGuardIntent(intent) {
  assertExactKeys(intent, WALLET_GUARD_INTENT_KEYS, 'Wallet Guard intent');
  if (intent.schema_version !== WALLET_GUARD_INTENT_SCHEMA_VERSION) {
    fail('POMRX_WG_E_REQUEST_INVALID', 'unsupported Wallet Guard intent version');
  }
  if (typeof intent.request_id !== 'string' || !patternTest(REQUEST_ID_PATTERN, intent.request_id)) {
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
  if (typeof intent.rpc_method !== 'string' || !patternTest(RPC_METHOD_PATTERN, intent.rpc_method)
      || typeof intent.request_class !== 'string' || intent.request_class.length < 1) {
    fail('POMRX_WG_E_REQUEST_INVALID', 'intent RPC identity is invalid');
  }
  const addressFields = [
    'target',
    'spender',
    'recipient',
    'typed_data_owner',
    'typed_data_verifying_contract',
  ];
  for (let index = 0; index < addressFields.length; index += 1) {
    const field = addressFields[index];
    assertNullableAddress(intent[field], field);
  }
  assertNullableHash(intent.calldata_sha256, 'calldata_sha256');
  assertNullableHash(intent.typed_data_sha256, 'typed_data_sha256');
  const decimalFields = ['native_value', 'requested_allowance', 'token_amount'];
  for (let index = 0; index < decimalFields.length; index += 1) {
    const field = decimalFields[index];
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

export function normalizeWalletGuardIntent(input) {
  assertExactKeys(input, NORMALIZE_KEYS, 'Wallet Guard normalization input');
  if (typeof input.requestId !== 'string' || !patternTest(REQUEST_ID_PATTERN, input.requestId)) {
    fail('POMRX_WG_E_REQUEST_INVALID', 'requestId has an invalid format');
  }

  const origin = normalizeTrustedOrigin(input.trustedOrigin);
  const chainId = normalizeChainId(input.trustedChainId);
  const account = normalizeEvmAddress(input.trustedAccount, 'trusted active account');
  const request = normalizeRequest(input.request);

  let action;
  try {
    if (request.method === 'eth_sendTransaction') {
      action = normalizeSendTransaction(request, account);
    } else if (request.method === 'eth_signTypedData_v4') {
      action = normalizeTypedDataRequest(request, account);
    } else if (request.method === 'personal_sign' || request.method === 'eth_sign') {
      action = normalizeGenericSignature(request);
    } else {
      action = normalizeUnsupportedRpc(request);
    }
  } catch (error) {
    if (error instanceof WalletGuardDecoderError) {
      fail(error.code, error.message);
    }
    throw error;
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

function quoteCanonicalString(value) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_JSON_STRINGIFY, undefined, [value]);
}

function canonicalNullableString(value) {
  return value === null ? 'null' : quoteCanonicalString(value);
}

function canonicalNullableBoolean(value) {
  if (value === null) return 'null';
  return value ? 'true' : 'false';
}

function canonicalizeValidatedIntent(intent) {
  return `{"account":${quoteCanonicalString(intent.account)}`
    + `,"calldata_sha256":${canonicalNullableString(intent.calldata_sha256)}`
    + `,"chain_id":${quoteCanonicalString(intent.chain_id)}`
    + `,"native_value":${quoteCanonicalString(intent.native_value)}`
    + `,"origin":${quoteCanonicalString(intent.origin)}`
    + `,"recipient":${canonicalNullableString(intent.recipient)}`
    + `,"request_class":${quoteCanonicalString(intent.request_class)}`
    + `,"request_id":${quoteCanonicalString(intent.request_id)}`
    + `,"requested_allowance":${canonicalNullableString(intent.requested_allowance)}`
    + `,"requested_operator_approval":${canonicalNullableBoolean(intent.requested_operator_approval)}`
    + `,"rpc_method":${quoteCanonicalString(intent.rpc_method)}`
    + `,"schema_version":${quoteCanonicalString(intent.schema_version)}`
    + `,"simulation_required":${intent.simulation_required ? 'true' : 'false'}`
    + `,"spender":${canonicalNullableString(intent.spender)}`
    + `,"target":${canonicalNullableString(intent.target)}`
    + `,"token_amount":${canonicalNullableString(intent.token_amount)}`
    + `,"typed_data_domain_chain_id":${canonicalNullableString(intent.typed_data_domain_chain_id)}`
    + `,"typed_data_owner":${canonicalNullableString(intent.typed_data_owner)}`
    + `,"typed_data_sha256":${canonicalNullableString(intent.typed_data_sha256)}`
    + `,"typed_data_verifying_contract":${canonicalNullableString(intent.typed_data_verifying_contract)}}`;
}

function trustedSha256Hex(value) {
  const hash = TRUSTED_CREATE_HASH('sha256');
  TRUSTED_REFLECT_APPLY(TRUSTED_HASH_UPDATE, hash, [value, 'utf8']);
  return TRUSTED_REFLECT_APPLY(TRUSTED_HASH_DIGEST, hash, ['hex']);
}

export function commitWalletGuardIntent(intent) {
  validateWalletGuardIntent(intent);
  const canonical_intent = canonicalizeValidatedIntent(intent);
  return TRUSTED_OBJECT_FREEZE({
    canonical_intent,
    intent_commitment: trustedSha256Hex(
      `${WALLET_GUARD_INTENT_COMMIT_DOMAIN}${canonical_intent}`,
    ),
  });
}
