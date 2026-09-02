import { types as utilTypes } from 'node:util';

import {
  canonicalizePayload,
  sha256Hex,
} from '../../../sdk/typescript/swisstokint-proof.mjs';
import {
  MAX_UINT256_DECIMAL,
  WalletGuardDecoderError,
  normalizeChainId,
  normalizeEvmAddress,
} from './evm-decoders.mjs';
import {
  WalletGuardIntentError,
  isLocallyNormalizedWalletGuardIntent,
  validateWalletGuardIntent,
} from './intent.mjs';

export const WALLET_GUARD_POLICY_SCHEMA_VERSION = 'wallet-guard-policy/0.1';
export const WALLET_GUARD_POLICY_COMMIT_DOMAIN = 'swisstokint:pom-rx-wallet-guard-policy:v1:';

const TRUSTED_ARRAY_IS_ARRAY = Array.isArray;
const TRUSTED_ARRAY_INCLUDES = Array.prototype.includes;
const TRUSTED_ARRAY_SORT = Array.prototype.sort;
const TRUSTED_BIGINT = BigInt;
const TRUSTED_IS_PROXY = utilTypes.isProxy;
const TRUSTED_NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const TRUSTED_OBJECT_CREATE = Object.create;
const TRUSTED_OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const TRUSTED_OBJECT_FREEZE = Object.freeze;
const TRUSTED_OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const TRUSTED_OBJECT_GET_OWN_PROPERTY_SYMBOLS = Object.getOwnPropertySymbols;
const TRUSTED_OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const TRUSTED_OBJECT_HAS_OWN = Object.hasOwn;
const TRUSTED_OBJECT_KEYS = Object.keys;
const TRUSTED_REFLECT_APPLY = Reflect.apply;
const TRUSTED_SET = Set;
const TRUSTED_SET_HAS = Set.prototype.has;
const TRUSTED_URL = URL;

const DECIMAL_INTEGER_PATTERN = /^(?:0|[1-9][0-9]*)$/u;
const POLICY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{7,127}$/u;
const POLICY_KEYS = TRUSTED_OBJECT_FREEZE([
  'schema_version',
  'policy_id',
  'enabled',
  'kill_switch',
  'expected_chain_id',
  'allowed_origins',
  'allowed_targets',
  'allowed_recipients',
  'allowed_spenders',
  'allowed_typed_data_verifying_contracts',
  'max_native_value',
  'max_token_amount',
  'deny_unlimited_allowance',
  'deny_operator_approval',
  'require_simulation_for',
]);
const KNOWN_REQUEST_CLASSES = new TRUSTED_SET([
  'native_transfer',
  'erc20_approve',
  'erc20_transfer',
  'set_approval_for_all',
  'permit_eip2612',
  'permit2_single',
  'permit2_batch_unknown',
  'unknown_calldata',
  'unknown_typed_data',
  'generic_signature',
  'unsupported_rpc',
]);
const CRITICAL_UNKNOWN_CLASSES = new TRUSTED_SET([
  'permit2_batch_unknown',
  'unknown_calldata',
  'unknown_typed_data',
  'generic_signature',
  'unsupported_rpc',
]);
const SIMULATION_STATUSES = new TRUSTED_SET(['not_run', 'pass', 'fail', 'unavailable', 'mismatch']);

export class WalletGuardPolicyError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WalletGuardPolicyError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new WalletGuardPolicyError(code, message);
}

function isProxy(value) {
  return TRUSTED_IS_PROXY(value);
}

function setHas(set, value) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_SET_HAS, set, [value]);
}

function arrayIncludes(list, value) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_ARRAY_INCLUDES, list, [value]);
}

function appendArrayValue(list, value) {
  TRUSTED_OBJECT_DEFINE_PROPERTY(list, `${list.length}`, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  });
}

function cloneArray(values) {
  const result = [];
  for (let index = 0; index < values.length; index += 1) {
    appendArrayValue(result, values[index]);
  }
  return result;
}

function sortedArray(values) {
  const result = cloneArray(values);
  TRUSTED_REFLECT_APPLY(TRUSTED_ARRAY_SORT, result, []);
  return result;
}

function isOwnEnumerableDataDescriptor(descriptor) {
  return Boolean(descriptor)
    && TRUSTED_OBJECT_HAS_OWN(descriptor, 'enumerable')
    && descriptor.enumerable === true
    && TRUSTED_OBJECT_HAS_OWN(descriptor, 'value')
    && !TRUSTED_OBJECT_HAS_OWN(descriptor, 'get')
    && !TRUSTED_OBJECT_HAS_OWN(descriptor, 'set');
}

function isOwnDataDescriptor(descriptor) {
  return Boolean(descriptor)
    && TRUSTED_OBJECT_HAS_OWN(descriptor, 'value')
    && !TRUSTED_OBJECT_HAS_OWN(descriptor, 'get')
    && !TRUSTED_OBJECT_HAS_OWN(descriptor, 'set');
}

function hasExactSortedKeys(actual, expected) {
  if (actual.length !== expected.length) return false;
  for (let index = 0; index < actual.length; index += 1) {
    if (actual[index] !== expected[index]) return false;
  }
  return true;
}

function snapshotExactDataRecord(value, expected, label) {
  if (!value || typeof value !== 'object' || isProxy(value) || TRUSTED_ARRAY_IS_ARRAY(value)) {
    fail('POMRX_WG_POLICY_E_INVALID', `${label} must be an exact plain data object`);
  }
  const prototype = TRUSTED_OBJECT_GET_PROTOTYPE_OF(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail('POMRX_WG_POLICY_E_INVALID', `${label} must use Object.prototype or a null prototype`);
  }
  if (TRUSTED_OBJECT_GET_OWN_PROPERTY_SYMBOLS(value).length !== 0) {
    fail('POMRX_WG_POLICY_E_INVALID', `${label} cannot contain symbol keys`);
  }
  const descriptors = TRUSTED_OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
  const actual = sortedArray(TRUSTED_OBJECT_KEYS(descriptors));
  const wanted = sortedArray(expected);
  if (!hasExactSortedKeys(actual, wanted)) {
    fail('POMRX_WG_POLICY_E_INVALID', `${label} has missing, hidden or unknown fields`);
  }
  const snapshot = TRUSTED_OBJECT_CREATE(null);
  for (let index = 0; index < expected.length; index += 1) {
    const key = expected[index];
    const descriptor = descriptors[key];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail('POMRX_WG_POLICY_E_INVALID', `${label} fields must be enumerable data properties`);
    }
    snapshot[key] = descriptor.value;
  }
  return TRUSTED_OBJECT_FREEZE(snapshot);
}

function snapshotDenseArray(values, field) {
  if (!values || typeof values !== 'object' || isProxy(values) || !TRUSTED_ARRAY_IS_ARRAY(values)) {
    fail('POMRX_WG_POLICY_E_INVALID', `${field} must be a bounded plain array`);
  }
  if (TRUSTED_OBJECT_GET_OWN_PROPERTY_SYMBOLS(values).length !== 0) {
    fail('POMRX_WG_POLICY_E_INVALID', `${field} cannot contain symbol keys`);
  }
  const descriptors = TRUSTED_OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(values);
  const lengthDescriptor = descriptors.length;
  if (!isOwnDataDescriptor(lengthDescriptor)
      || !TRUSTED_NUMBER_IS_SAFE_INTEGER(lengthDescriptor.value)
      || lengthDescriptor.value < 0
      || lengthDescriptor.value > 256) {
    fail('POMRX_WG_POLICY_E_INVALID', `${field} must be a bounded array`);
  }
  const length = lengthDescriptor.value;
  const descriptorKeys = TRUSTED_OBJECT_KEYS(descriptors);
  const keys = [];
  for (let index = 0; index < descriptorKeys.length; index += 1) {
    const key = descriptorKeys[index];
    if (key !== 'length') appendArrayValue(keys, key);
  }
  if (keys.length !== length) {
    fail('POMRX_WG_POLICY_E_INVALID', `${field} must be dense and cannot contain extra or hidden properties`);
  }
  for (let index = 0; index < keys.length; index += 1) {
    if (keys[index] !== `${index}`) {
      fail('POMRX_WG_POLICY_E_INVALID', `${field} must be dense and cannot contain extra or hidden properties`);
    }
  }
  const snapshot = [];
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = descriptors[keys[index]];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail('POMRX_WG_POLICY_E_INVALID', `${field} entries must be enumerable data properties`);
    }
    appendArrayValue(snapshot, descriptor.value);
  }
  return TRUSTED_OBJECT_FREEZE(snapshot);
}

function normalizeOrigin(value) {
  if (typeof value !== 'string') fail('POMRX_WG_POLICY_E_INVALID', 'origin must be a string');
  let url;
  try {
    url = new TRUSTED_URL(value);
  } catch {
    fail('POMRX_WG_POLICY_E_INVALID', 'origin must be an absolute URL origin');
  }
  if ((url.protocol !== 'https:' && url.protocol !== 'http:')
      || url.origin !== value
      || url.username
      || url.password) {
    fail('POMRX_WG_POLICY_E_INVALID', 'origin must be canonical HTTP(S) origin');
  }
  return url.origin;
}

function normalizeCanonicalDecimal(value, field) {
  if (typeof value !== 'string' || !DECIMAL_INTEGER_PATTERN.test(value)) {
    fail('POMRX_WG_POLICY_E_INVALID', `${field} must be a canonical decimal integer string`);
  }
  return TRUSTED_BIGINT(value).toString(10);
}

function normalizePolicyChainId(value) {
  try {
    return normalizeChainId(value);
  } catch (error) {
    const detail = error instanceof WalletGuardDecoderError ? error.code : 'invalid-chain';
    fail('POMRX_WG_POLICY_E_INVALID', `expected_chain_id is invalid: ${detail}`);
  }
}

function normalizePolicyAddress(value, field) {
  try {
    return normalizeEvmAddress(value, field);
  } catch (error) {
    const detail = error instanceof WalletGuardDecoderError ? error.code : 'invalid-address';
    fail('POMRX_WG_POLICY_E_INVALID', `${field} is invalid: ${detail}`);
  }
}

function normalizeUniqueList(values, field, normalizeItem) {
  const snapshotted = snapshotDenseArray(values, field);
  const normalized = [];
  for (let index = 0; index < snapshotted.length; index += 1) {
    const item = normalizeItem(snapshotted[index]);
    if (arrayIncludes(normalized, item)) {
      fail('POMRX_WG_POLICY_E_INVALID', `${field} cannot contain duplicates`);
    }
    appendArrayValue(normalized, item);
  }
  TRUSTED_REFLECT_APPLY(TRUSTED_ARRAY_SORT, normalized, []);
  return TRUSTED_OBJECT_FREEZE(normalized);
}

function normalizePolicy(policy) {
  const snapshot = snapshotExactDataRecord(policy, POLICY_KEYS, 'Wallet Guard policy');
  if (snapshot.schema_version !== WALLET_GUARD_POLICY_SCHEMA_VERSION) {
    fail('POMRX_WG_POLICY_E_INVALID', 'unsupported Wallet Guard policy version');
  }
  if (typeof snapshot.policy_id !== 'string' || !POLICY_ID_PATTERN.test(snapshot.policy_id)) {
    fail('POMRX_WG_POLICY_E_INVALID', 'policy_id has an invalid format');
  }
  const booleanFields = ['enabled', 'kill_switch', 'deny_unlimited_allowance', 'deny_operator_approval'];
  for (let index = 0; index < booleanFields.length; index += 1) {
    const field = booleanFields[index];
    if (typeof snapshot[field] !== 'boolean') {
      fail('POMRX_WG_POLICY_E_INVALID', `${field} must be boolean`);
    }
  }

  const requireSimulationFor = normalizeUniqueList(
    snapshot.require_simulation_for,
    'require_simulation_for',
    (value) => {
      if (typeof value !== 'string' || !setHas(KNOWN_REQUEST_CLASSES, value)) {
        fail('POMRX_WG_POLICY_E_INVALID', 'require_simulation_for contains an unknown request class');
      }
      return value;
    },
  );

  return TRUSTED_OBJECT_FREEZE({
    schema_version: WALLET_GUARD_POLICY_SCHEMA_VERSION,
    policy_id: snapshot.policy_id,
    enabled: snapshot.enabled,
    kill_switch: snapshot.kill_switch,
    expected_chain_id: normalizePolicyChainId(snapshot.expected_chain_id),
    allowed_origins: normalizeUniqueList(snapshot.allowed_origins, 'allowed_origins', normalizeOrigin),
    allowed_targets: normalizeUniqueList(
      snapshot.allowed_targets,
      'allowed_targets',
      (value) => normalizePolicyAddress(value, 'allowed target'),
    ),
    allowed_recipients: normalizeUniqueList(
      snapshot.allowed_recipients,
      'allowed_recipients',
      (value) => normalizePolicyAddress(value, 'allowed recipient'),
    ),
    allowed_spenders: normalizeUniqueList(
      snapshot.allowed_spenders,
      'allowed_spenders',
      (value) => normalizePolicyAddress(value, 'allowed spender'),
    ),
    allowed_typed_data_verifying_contracts: normalizeUniqueList(
      snapshot.allowed_typed_data_verifying_contracts,
      'allowed_typed_data_verifying_contracts',
      (value) => normalizePolicyAddress(value, 'allowed typed-data verifying contract'),
    ),
    max_native_value: normalizeCanonicalDecimal(snapshot.max_native_value, 'max_native_value'),
    max_token_amount: normalizeCanonicalDecimal(snapshot.max_token_amount, 'max_token_amount'),
    deny_unlimited_allowance: snapshot.deny_unlimited_allowance,
    deny_operator_approval: snapshot.deny_operator_approval,
    require_simulation_for: requireSimulationFor,
  });
}

function validateIntent(intent) {
  try {
    validateWalletGuardIntent(intent);
  } catch (error) {
    const detail = error instanceof WalletGuardIntentError ? error.code : 'invalid-intent';
    fail('POMRX_WG_POLICY_E_INVALID', `Wallet Guard intent failed canonical validation: ${detail}`);
  }
  if (!isLocallyNormalizedWalletGuardIntent(intent)) {
    fail('POMRX_WG_POLICY_E_INVALID', 'Wallet Guard policy requires a locally normalized intent');
  }
  if (!setHas(KNOWN_REQUEST_CLASSES, intent.request_class)) {
    fail('POMRX_WG_POLICY_E_INVALID', 'Wallet Guard intent request class is unknown');
  }
}

function normalizeSimulation(simulation) {
  const value = simulation ?? TRUSTED_OBJECT_FREEZE({ status: 'not_run' });
  const snapshot = snapshotExactDataRecord(value, ['status'], 'simulation evidence');
  if (typeof snapshot.status !== 'string' || !setHas(SIMULATION_STATUSES, snapshot.status)) {
    fail('POMRX_WG_POLICY_E_INVALID', 'simulation status is invalid');
  }
  return snapshot.status;
}

function includes(list, value) {
  return value !== null && value !== undefined && arrayIncludes(list, value);
}

function greaterThan(value, limit) {
  if (value === null || value === undefined || !DECIMAL_INTEGER_PATTERN.test(value)) {
    return true;
  }
  return TRUSTED_BIGINT(value) > TRUSTED_BIGINT(limit);
}

function makeResult(decision, reasons, normalizedPolicy) {
  const canonicalPolicy = canonicalizePayload(normalizedPolicy);
  const uniqueReasons = [];
  for (let index = 0; index < reasons.length; index += 1) {
    const reason = reasons[index];
    if (!arrayIncludes(uniqueReasons, reason)) appendArrayValue(uniqueReasons, reason);
  }
  return TRUSTED_OBJECT_FREEZE({
    decision,
    reasons: TRUSTED_OBJECT_FREEZE(uniqueReasons),
    policy_id: normalizedPolicy.policy_id,
    policy_hash: sha256Hex(`${WALLET_GUARD_POLICY_COMMIT_DOMAIN}${canonicalPolicy}`),
  });
}

export function evaluateWalletGuardPolicy(intent, policy, simulation = { status: 'not_run' }) {
  validateIntent(intent);
  const normalizedPolicy = normalizePolicy(policy);
  const simulationStatus = normalizeSimulation(simulation);
  const denyReasons = [];
  const indeterminateReasons = [];

  if (!normalizedPolicy.enabled) appendArrayValue(denyReasons, 'WG_POLICY_DENY_DISABLED');
  if (normalizedPolicy.kill_switch) appendArrayValue(denyReasons, 'WG_POLICY_DENY_KILL_SWITCH');
  if (!includes(normalizedPolicy.allowed_origins, intent.origin)) {
    appendArrayValue(denyReasons, 'WG_POLICY_DENY_ORIGIN');
  }
  if (intent.chain_id !== normalizedPolicy.expected_chain_id) {
    appendArrayValue(denyReasons, 'WG_POLICY_DENY_CHAIN');
  }
  if (greaterThan(intent.native_value, normalizedPolicy.max_native_value)) {
    appendArrayValue(denyReasons, 'WG_POLICY_DENY_NATIVE_VALUE');
  }

  if (setHas(CRITICAL_UNKNOWN_CLASSES, intent.request_class)) {
    appendArrayValue(indeterminateReasons, 'WG_POLICY_INDETERMINATE_UNSUPPORTED_EFFECT');
  }

  if (intent.request_class === 'native_transfer') {
    if (!includes(normalizedPolicy.allowed_recipients, intent.recipient)) {
      appendArrayValue(denyReasons, 'WG_POLICY_DENY_RECIPIENT');
    }
  }

  if (intent.request_class === 'erc20_transfer') {
    if (!includes(normalizedPolicy.allowed_targets, intent.target)) {
      appendArrayValue(denyReasons, 'WG_POLICY_DENY_TARGET');
    }
    if (!includes(normalizedPolicy.allowed_recipients, intent.recipient)) {
      appendArrayValue(denyReasons, 'WG_POLICY_DENY_RECIPIENT');
    }
    if (greaterThan(intent.token_amount, normalizedPolicy.max_token_amount)) {
      appendArrayValue(denyReasons, 'WG_POLICY_DENY_TOKEN_AMOUNT');
    }
  }

  if (intent.request_class === 'erc20_approve') {
    if (!includes(normalizedPolicy.allowed_targets, intent.target)) {
      appendArrayValue(denyReasons, 'WG_POLICY_DENY_TARGET');
    }
    if (!includes(normalizedPolicy.allowed_spenders, intent.spender)) {
      appendArrayValue(denyReasons, 'WG_POLICY_DENY_SPENDER');
    }
    if (normalizedPolicy.deny_unlimited_allowance
        && intent.requested_allowance === MAX_UINT256_DECIMAL) {
      appendArrayValue(denyReasons, 'WG_POLICY_DENY_UNLIMITED_ALLOWANCE');
    }
    if (greaterThan(intent.requested_allowance, normalizedPolicy.max_token_amount)) {
      appendArrayValue(denyReasons, 'WG_POLICY_DENY_ALLOWANCE_LIMIT');
    }
  }

  if (intent.request_class === 'set_approval_for_all') {
    if (!includes(normalizedPolicy.allowed_targets, intent.target)) {
      appendArrayValue(denyReasons, 'WG_POLICY_DENY_TARGET');
    }
    if (!includes(normalizedPolicy.allowed_spenders, intent.spender)) {
      appendArrayValue(denyReasons, 'WG_POLICY_DENY_OPERATOR');
    }
    if (normalizedPolicy.deny_operator_approval && intent.requested_operator_approval === true) {
      appendArrayValue(denyReasons, 'WG_POLICY_DENY_OPERATOR_APPROVAL');
    }
  }

  if (intent.request_class === 'permit_eip2612' || intent.request_class === 'permit2_single') {
    if (!includes(normalizedPolicy.allowed_targets, intent.target)) {
      appendArrayValue(denyReasons, 'WG_POLICY_DENY_TARGET');
    }
    if (!includes(normalizedPolicy.allowed_spenders, intent.spender)) {
      appendArrayValue(denyReasons, 'WG_POLICY_DENY_SPENDER');
    }
    if (intent.typed_data_domain_chain_id !== intent.chain_id) {
      appendArrayValue(denyReasons, 'WG_POLICY_DENY_TYPED_DATA_CHAIN');
    }
    if (!includes(
      normalizedPolicy.allowed_typed_data_verifying_contracts,
      intent.typed_data_verifying_contract,
    )) {
      appendArrayValue(denyReasons, 'WG_POLICY_DENY_TYPED_DATA_DOMAIN');
    }
    if (intent.request_class === 'permit_eip2612' && intent.typed_data_owner !== intent.account) {
      appendArrayValue(denyReasons, 'WG_POLICY_DENY_TYPED_DATA_OWNER');
    }
    if (normalizedPolicy.deny_unlimited_allowance
        && intent.requested_allowance === MAX_UINT256_DECIMAL) {
      appendArrayValue(denyReasons, 'WG_POLICY_DENY_UNLIMITED_ALLOWANCE');
    }
    if (greaterThan(intent.requested_allowance, normalizedPolicy.max_token_amount)) {
      appendArrayValue(denyReasons, 'WG_POLICY_DENY_ALLOWANCE_LIMIT');
    }
  }

  const simulationRequired = intent.simulation_required === true
    || includes(normalizedPolicy.require_simulation_for, intent.request_class);
  if (simulationRequired) {
    if (simulationStatus === 'fail' || simulationStatus === 'mismatch') {
      appendArrayValue(denyReasons, 'WG_POLICY_DENY_SIMULATION');
    } else if (simulationStatus !== 'pass') {
      appendArrayValue(indeterminateReasons, 'WG_POLICY_INDETERMINATE_SIMULATION');
    }
  }

  if (denyReasons.length > 0) {
    return makeResult('DENY', denyReasons, normalizedPolicy);
  }
  if (indeterminateReasons.length > 0) {
    return makeResult('INDETERMINATE', indeterminateReasons, normalizedPolicy);
  }
  const allowReasons = [];
  appendArrayValue(allowReasons, 'WG_POLICY_ALLOW_EXACT');
  return makeResult('ALLOW', allowReasons, normalizedPolicy);
}

export function normalizeWalletGuardPolicy(policy) {
  return normalizePolicy(policy);
}
