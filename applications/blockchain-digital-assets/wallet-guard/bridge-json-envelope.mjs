import { types as utilTypes } from 'node:util';

import {
  parseWalletGuardBoundedJsonData,
} from './json-ingress.mjs';
import {
  captureReferencePlainData,
} from '../../../core/reference-data/plain-data-snapshot.mjs';

export const WALLET_GUARD_BRIDGE_SCHEMA_VERSION = 'wallet_guard_bridge/0.1';

const TRUSTED_REFLECT_APPLY = Reflect.apply;
const TRUSTED_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const UTIL_TYPES_IS_PROXY_DESCRIPTOR = TRUSTED_REFLECT_APPLY(
  TRUSTED_GET_OWN_PROPERTY_DESCRIPTOR,
  null,
  [utilTypes, 'isProxy'],
);
const UTIL_TYPES_IS_PROXY = UTIL_TYPES_IS_PROXY_DESCRIPTOR?.value;

const ERROR_CODES = Object.freeze([
  'BRIDGE_CLOSED',
  'CONTEXT_CHANGED',
  'INTERNAL_ERROR',
  'TIMEOUT',
  'USER_REJECTED',
  'WALLET_UNAVAILABLE',
]);
const COMMAND_KEYS = Object.freeze([
  'schema_version',
  'session_id',
  'sequence',
  'request_id',
  'expected_chain_id',
  'expected_account',
  'request',
]);
const RESPONSE_KEYS = Object.freeze([
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

function captureBridgePlainData(value, label) {
  assertProxyDetectorIntegrity();
  try {
    return captureReferencePlainData(value, label);
  } catch {
    fail('POMRX_WG_BRIDGE_E_SHAPE', `${label} must be bounded plain data`);
  }
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('POMRX_WG_BRIDGE_E_SHAPE', `${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length
      || actual.some((key, index) => key !== wanted[index])) {
    fail('POMRX_WG_BRIDGE_E_SHAPE', `${label} has missing or unknown fields`);
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
      || !Number.isSafeInteger(value.sequence)
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
      || !Number.isSafeInteger(sequence)
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
      || !Array.isArray(request.params)
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
  const command = Object.freeze({
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
  const command = captureBridgePlainData(rawCommand, 'bridge command');
  exactKeys(command, COMMAND_KEYS, 'bridge command');
  validateIdentity(command, 'bridge command');
  validateContext(command.expected_chain_id, command.expected_account, 'bridge command');
  validateRequest(command.request);
  return JSON.stringify(command);
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
    return Object.freeze({ outcome: 'result', result: response.result });
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
    return Object.freeze({ outcome: 'error', error_code: response.error.code });
  }

  fail('POMRX_WG_BRIDGE_E_OUTCOME', 'bridge response outcome is invalid');
}
