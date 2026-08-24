import { types as utilTypes } from 'node:util';

import {
  parseWalletGuardBoundedJsonData,
} from './json-ingress.mjs';

export const WALLET_GUARD_BRIDGE_SCHEMA_VERSION = 'wallet_guard_bridge/0.1';

const TRUSTED_REFLECT_APPLY = Reflect.apply;
const TRUSTED_ARRAY_IS_ARRAY = Array.isArray;
const TRUSTED_ARRAY_PROTOTYPE = Array.prototype;
const TRUSTED_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const TRUSTED_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const TRUSTED_GET_OWN_PROPERTY_NAMES = Object.getOwnPropertyNames;
const TRUSTED_GET_OWN_PROPERTY_SYMBOLS = Object.getOwnPropertySymbols;
const TRUSTED_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const TRUSTED_JSON_STRINGIFY = JSON.stringify;
const TRUSTED_NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const TRUSTED_OBJECT_CREATE = Object.create;
const TRUSTED_OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const TRUSTED_OBJECT_FREEZE = Object.freeze;
const TRUSTED_OBJECT_HAS_OWN = Object.hasOwn;
const TRUSTED_OBJECT_KEYS = Object.keys;
const TRUSTED_OBJECT_PROTOTYPE = Object.prototype;
const TRUSTED_OBJECT_SET_PROTOTYPE_OF = Object.setPrototypeOf;
const UTIL_TYPES_IS_PROXY_DESCRIPTOR = TRUSTED_REFLECT_APPLY(
  TRUSTED_GET_OWN_PROPERTY_DESCRIPTOR,
  null,
  [utilTypes, 'isProxy'],
);
const UTIL_TYPES_IS_PROXY = UTIL_TYPES_IS_PROXY_DESCRIPTOR?.value;

const ERROR_CODES = TRUSTED_OBJECT_FREEZE([
  'BRIDGE_CLOSED',
  'CONTEXT_CHANGED',
  'INTERNAL_ERROR',
  'TIMEOUT',
  'USER_REJECTED',
  'WALLET_UNAVAILABLE',
]);
const COMMAND_KEYS = TRUSTED_OBJECT_FREEZE([
  'schema_version',
  'session_id',
  'sequence',
  'request_id',
  'expected_chain_id',
  'expected_account',
  'request',
]);
const RESPONSE_KEYS = TRUSTED_OBJECT_FREEZE([
  'schema_version',
  'session_id',
  'sequence',
  'request_id',
  'observed_chain_id',
  'observed_account',
  'outcome',
  'result',
  'error',
]);

export class WalletGuardBridgeEnvelopeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WalletGuardBridgeEnvelopeError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new WalletGuardBridgeEnvelopeError(code, message);
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

function assertProxyDetectorIntegrity() {
  const current = TRUSTED_REFLECT_APPLY(
    TRUSTED_GET_OWN_PROPERTY_DESCRIPTOR,
    null,
    [utilTypes, 'isProxy'],
  );
  if (typeof UTIL_TYPES_IS_PROXY !== 'function'
      || !sameDescriptor(current, UTIL_TYPES_IS_PROXY_DESCRIPTOR)) {
    fail('POMRX_WG_BRIDGE_E_RUNTIME_INTEGRITY', 'bridge Proxy detector drifted after bootstrap');
  }
}

function captureBridgePlainData(value, label, detachArrayPrototype = false) {
  assertProxyDetectorIntegrity();
  try {
    return captureBridgeValue(value, label, 0, {
      remaining: 1_000,
      detachArrayPrototype,
    });
  } catch {
    fail('POMRX_WG_BRIDGE_E_SHAPE', `${label} must be bounded plain data`);
  }
}

function isOwnDataDescriptor(descriptor) {
  return descriptor !== null && descriptor !== undefined
    && TRUSTED_OBJECT_HAS_OWN(descriptor, 'value')
    && !TRUSTED_OBJECT_HAS_OWN(descriptor, 'get')
    && !TRUSTED_OBJECT_HAS_OWN(descriptor, 'set');
}

function isOwnEnumerableDataDescriptor(descriptor) {
  return isOwnDataDescriptor(descriptor)
    && TRUSTED_OBJECT_HAS_OWN(descriptor, 'enumerable')
    && descriptor.enumerable === true;
}

function defineCapturedValue(output, key, value) {
  const descriptor = TRUSTED_OBJECT_CREATE(null);
  descriptor.value = value;
  descriptor.enumerable = true;
  descriptor.writable = false;
  descriptor.configurable = false;
  TRUSTED_OBJECT_DEFINE_PROPERTY(output, key, descriptor);
}

function unsafeKey(key) {
  return key.length < 1 || key.length > 128
    || key === '__proto__' || key === 'constructor' || key === 'prototype';
}

function rejectBridgeProxy(value) {
  if (value && typeof value === 'object'
      && TRUSTED_REFLECT_APPLY(UTIL_TYPES_IS_PROXY, utilTypes, [value])) {
    fail('POMRX_WG_BRIDGE_E_SHAPE', 'bridge plain data cannot contain a Proxy');
  }
}

function captureBridgeArray(value, label, depth, budget) {
  rejectBridgeProxy(value);
  if (TRUSTED_GET_PROTOTYPE_OF(value) !== TRUSTED_ARRAY_PROTOTYPE
      || TRUSTED_GET_OWN_PROPERTY_SYMBOLS(value).length !== 0) {
    fail('POMRX_WG_BRIDGE_E_SHAPE', `${label} must be a plain array`);
  }
  const descriptors = TRUSTED_GET_OWN_PROPERTY_DESCRIPTORS(value);
  const lengthDescriptor = descriptors.length;
  if (!isOwnDataDescriptor(lengthDescriptor)
      || !TRUSTED_NUMBER_IS_SAFE_INTEGER(lengthDescriptor.value)
      || lengthDescriptor.value < 0 || lengthDescriptor.value > 1_000) {
    fail('POMRX_WG_BRIDGE_E_SHAPE', `${label} has an invalid array length`);
  }
  const length = lengthDescriptor.value;
  const names = TRUSTED_GET_OWN_PROPERTY_NAMES(value);
  if (names.length !== length + 1 || length > budget.remaining) {
    fail('POMRX_WG_BRIDGE_E_SHAPE', `${label} must be a dense bounded array`);
  }
  const output = [];
  if (budget.detachArrayPrototype) {
    TRUSTED_REFLECT_APPLY(TRUSTED_OBJECT_SET_PROTOTYPE_OF, null, [output, null]);
  }
  for (let index = 0; index < length; index += 1) {
    const key = `${index}`;
    const descriptor = descriptors[key];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail('POMRX_WG_BRIDGE_E_SHAPE', `${label} must contain dense data elements`);
    }
    defineCapturedValue(
      output,
      key,
      captureBridgeValue(descriptor.value, `${label}[${key}]`, depth + 1, budget),
    );
  }
  return TRUSTED_OBJECT_FREEZE(output);
}

function captureBridgeObject(value, label, depth, budget) {
  rejectBridgeProxy(value);
  const prototype = TRUSTED_GET_PROTOTYPE_OF(value);
  if ((prototype !== TRUSTED_OBJECT_PROTOTYPE && prototype !== null)
      || TRUSTED_GET_OWN_PROPERTY_SYMBOLS(value).length !== 0) {
    fail('POMRX_WG_BRIDGE_E_SHAPE', `${label} must be a plain object`);
  }
  const names = TRUSTED_GET_OWN_PROPERTY_NAMES(value);
  if (names.length > budget.remaining) {
    fail('POMRX_WG_BRIDGE_E_SHAPE', `${label} exceeds the node budget`);
  }
  const descriptors = TRUSTED_GET_OWN_PROPERTY_DESCRIPTORS(value);
  const output = TRUSTED_OBJECT_CREATE(null);
  for (let index = 0; index < names.length; index += 1) {
    const key = names[index];
    const descriptor = descriptors[key];
    if (unsafeKey(key) || !isOwnEnumerableDataDescriptor(descriptor)) {
      fail('POMRX_WG_BRIDGE_E_SHAPE', `${label} contains an unsafe property`);
    }
    defineCapturedValue(
      output,
      key,
      captureBridgeValue(descriptor.value, `${label}.${key}`, depth + 1, budget),
    );
  }
  return TRUSTED_OBJECT_FREEZE(output);
}

function captureBridgeValue(value, label, depth, budget) {
  if (depth > 8 || budget.remaining <= 0) {
    fail('POMRX_WG_BRIDGE_E_SHAPE', `${label} exceeds bridge bounds`);
  }
  budget.remaining -= 1;
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.length > 16_384) fail('POMRX_WG_BRIDGE_E_SHAPE', `${label} is too long`);
    return value;
  }
  if (typeof value === 'number') {
    if (!TRUSTED_NUMBER_IS_SAFE_INTEGER(value)) {
      fail('POMRX_WG_BRIDGE_E_SHAPE', `${label} must be a safe integer`);
    }
    return value;
  }
  if (!value || typeof value !== 'object') {
    fail('POMRX_WG_BRIDGE_E_SHAPE', `${label} contains an unsupported value`);
  }
  rejectBridgeProxy(value);
  return TRUSTED_ARRAY_IS_ARRAY(value)
    ? captureBridgeArray(value, label, depth, budget)
    : captureBridgeObject(value, label, depth, budget);
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || TRUSTED_ARRAY_IS_ARRAY(value)) {
    fail('POMRX_WG_BRIDGE_E_SHAPE', `${label} must be an object`);
  }
  const actual = TRUSTED_OBJECT_KEYS(value);
  if (actual.length !== expected.length) {
    fail('POMRX_WG_BRIDGE_E_SHAPE', `${label} has missing or unknown fields`);
  }
  for (let index = 0; index < expected.length; index += 1) {
    let found = false;
    for (let candidate = 0; candidate < actual.length; candidate += 1) {
      if (actual[candidate] === expected[index]) found = true;
    }
    if (!found) fail('POMRX_WG_BRIDGE_E_SHAPE', `${label} has missing or unknown fields`);
  }
}

function isLowerHex(value, length, prefix = '') {
  if (typeof value !== 'string' || value.length !== prefix.length + length) return false;
  for (let index = 0; index < prefix.length; index += 1) {
    if (value[index] !== prefix[index]) return false;
  }
  for (let index = prefix.length; index < value.length; index += 1) {
    const character = value[index];
    if (!((character >= '0' && character <= '9')
        || (character >= 'a' && character <= 'f'))) return false;
  }
  return true;
}

function errorCodeSupported(code) {
  for (let index = 0; index < ERROR_CODES.length; index += 1) {
    if (ERROR_CODES[index] === code) return true;
  }
  return false;
}

function isCanonicalChainId(value) {
  if (typeof value !== 'string' || value.length < 3 || value.length > 66
      || value[0] !== '0' || value[1] !== 'x') return false;
  if (value.length > 3 && value[2] === '0') return false;
  return isLowerHex(value, value.length - 2, '0x');
}

function validateContext(chainId, account, label) {
  if (!isCanonicalChainId(chainId) || !isLowerHex(account, 40, '0x')) {
    fail('POMRX_WG_BRIDGE_E_CONTEXT', `${label} wallet context is invalid`);
  }
}

function validateIdentity(value, label) {
  if (value.schema_version !== WALLET_GUARD_BRIDGE_SCHEMA_VERSION
      || typeof value.session_id !== 'string'
      || !isLowerHex(value.session_id, 64)
      || !TRUSTED_NUMBER_IS_SAFE_INTEGER(value.sequence)
      || value.sequence < 1
      || value.sequence > 99_999_999
      || typeof value.request_id !== 'string'
      || value.request_id !== makeRequestId(value.session_id, value.sequence)) {
    fail('POMRX_WG_BRIDGE_E_IDENTITY', `${label} identity is invalid`);
  }
}

function makeRequestId(sessionId, sequence) {
  if (typeof sessionId !== 'string'
      || !isLowerHex(sessionId, 64)
      || !TRUSTED_NUMBER_IS_SAFE_INTEGER(sequence)
      || sequence < 1
      || sequence > 99_999_999) {
    fail('POMRX_WG_BRIDGE_E_IDENTITY', 'bridge command identity is invalid');
  }
  let prefix = '';
  for (let index = 0; index < 16; index += 1) prefix += sessionId[index];
  let paddedSequence = `${sequence}`;
  while (paddedSequence.length < 8) paddedSequence = `0${paddedSequence}`;
  return `wg-bridge-${prefix}-${paddedSequence}`;
}

function validateExpectedIdentity(value, expected) {
  const snapshot = captureBridgePlainData(expected, 'expected bridge identity');
  exactKeys(
    snapshot,
    ['session_id', 'sequence', 'request_id', 'expected_chain_id', 'expected_account'],
    'expected bridge identity',
  );
  if (value.session_id !== snapshot.session_id
      || value.sequence !== snapshot.sequence
      || value.request_id !== snapshot.request_id
      || value.observed_chain_id !== snapshot.expected_chain_id
      || value.observed_account !== snapshot.expected_account) {
    fail('POMRX_WG_BRIDGE_E_BINDING', 'bridge response does not match the pending command');
  }
}

function validateRequest(request) {
  exactKeys(request, ['method', 'params'], 'bridge request');
  if (request.method !== 'eth_sendTransaction'
      || !TRUSTED_ARRAY_IS_ARRAY(request.params)
      || request.params.length !== 1) {
    fail(
      'POMRX_WG_BRIDGE_E_REQUEST',
      'bridge command is limited to one eth_sendTransaction parameter',
    );
  }
}

export function makeWalletGuardBridgeCommand(rawInput) {
  const input = captureBridgePlainData(rawInput, 'bridge command input');
  exactKeys(
    input,
    ['sessionId', 'sequence', 'expectedChainId', 'expectedAccount', 'request'],
    'bridge command input',
  );
  const requestId = makeRequestId(input.sessionId, input.sequence);
  validateContext(input.expectedChainId, input.expectedAccount, 'bridge command');
  const command = TRUSTED_OBJECT_FREEZE({
    schema_version: WALLET_GUARD_BRIDGE_SCHEMA_VERSION,
    session_id: input.sessionId,
    sequence: input.sequence,
    request_id: requestId,
    expected_chain_id: input.expectedChainId,
    expected_account: input.expectedAccount,
    request: input.request,
  });
  exactKeys(command, COMMAND_KEYS, 'bridge command');
  validateIdentity(command, 'bridge command');
  validateContext(command.expected_chain_id, command.expected_account, 'bridge command');
  validateRequest(input.request);
  return command;
}

export function serializeWalletGuardBridgeCommand(rawCommand) {
  const command = captureBridgePlainData(rawCommand, 'bridge command', true);
  exactKeys(command, COMMAND_KEYS, 'bridge command');
  validateIdentity(command, 'bridge command');
  validateContext(command.expected_chain_id, command.expected_account, 'bridge command');
  validateRequest(command.request);
  return TRUSTED_REFLECT_APPLY(TRUSTED_JSON_STRINGIFY, null, [command]);
}

export function parseWalletGuardBridgeResponse(raw, expectedIdentity) {
  let response;
  try {
    response = parseWalletGuardBoundedJsonData(raw);
  } catch {
    fail('POMRX_WG_BRIDGE_E_JSON', 'bridge response is not strict bounded JSON');
  }
  exactKeys(response, RESPONSE_KEYS, 'bridge response');
  validateIdentity(response, 'bridge response');
  validateContext(response.observed_chain_id, response.observed_account, 'bridge response');
  validateExpectedIdentity(response, expectedIdentity);

  if (response.outcome === 'result') {
    if (typeof response.result !== 'string'
        || !isLowerHex(response.result, 64, '0x')
        || response.error !== null) {
      fail('POMRX_WG_BRIDGE_E_RESULT', 'bridge success result must be one lowercase transaction hash');
    }
    return TRUSTED_OBJECT_FREEZE({ outcome: 'result', result: response.result });
  }

  if (response.outcome === 'error') {
    if (response.result !== null) {
      fail('POMRX_WG_BRIDGE_E_ERROR', 'bridge error response must have a null result');
    }
    exactKeys(response.error, ['code'], 'bridge response error');
    if (typeof response.error.code !== 'string'
        || !errorCodeSupported(response.error.code)) {
      fail('POMRX_WG_BRIDGE_E_ERROR', 'bridge response uses an unsupported bounded error code');
    }
    return TRUSTED_OBJECT_FREEZE({ outcome: 'error', error_code: response.error.code });
  }

  fail('POMRX_WG_BRIDGE_E_OUTCOME', 'bridge response outcome is invalid');
}
