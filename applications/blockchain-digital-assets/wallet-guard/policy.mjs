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

const DECIMAL_INTEGER_PATTERN = /^(?:0|[1-9][0-9]*)$/u;
const POLICY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{7,127}$/u;
const POLICY_KEYS = Object.freeze([
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
const BOOLEAN_POLICY_FIELDS = Object.freeze([
  'enabled',
  'kill_switch',
  'deny_unlimited_allowance',
  'deny_operator_approval',
]);
const KNOWN_REQUEST_CLASSES = new Set([
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
const CRITICAL_UNKNOWN_CLASSES = new Set([
  'permit2_batch_unknown',
  'unknown_calldata',
  'unknown_typed_data',
  'generic_signature',
  'unsupported_rpc',
]);
const SIMULATION_STATUSES = new Set(['not_run', 'pass', 'fail', 'unavailable', 'mismatch']);

// Policy parsing can run after asynchronous provider sampling, so its inherited
// collection helpers are part of the authorization boundary. Capture all
// load-bearing reflection/Array/Set/RegExp/URL/BigInt operations at module load;
// freezing an ordinary Array alone does not protect inherited methods from later
// same-realm mutation.
const REFLECT_APPLY = Reflect.apply;
const ARRAY_CONSTRUCTOR = Array;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_INCLUDES = Array.prototype.includes;
const ARRAY_SORT = Array.prototype.sort;
const ARRAY_PROTOTYPE = Array.prototype;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_OWN_PROPERTY_NAMES = Object.getOwnPropertyNames;
const OBJECT_GET_OWN_PROPERTY_SYMBOLS = Object.getOwnPropertySymbols;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_PROTOTYPE = Object.prototype;
const NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const REGEXP_TEST = RegExp.prototype.test;
const SET_CONSTRUCTOR = Set;
const SET_HAS = Set.prototype.has;
const SET_ADD = Set.prototype.add;
const UTIL_TYPES_IS_PROXY = utilTypes.isProxy;
const URL_CONSTRUCTOR = URL;
const BIGINT_CONSTRUCTOR = BigInt;
const BIGINT_TO_STRING = BigInt.prototype.toString;

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
  return REFLECT_APPLY(UTIL_TYPES_IS_PROXY, utilTypes, [value]);
}

function isArray(value) {
  return REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value]);
}

function objectHasOwn(value, key) {
  return REFLECT_APPLY(OBJECT_HAS_OWN, Object, [value, key]);
}

function objectGetPrototypeOf(value) {
  return REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]);
}

function objectGetOwnPropertySymbols(value) {
  return REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_SYMBOLS, Object, [value]);
}

function objectGetOwnPropertyDescriptors(value) {
  return REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
}

function objectGetOwnPropertyNames(value) {
  return REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_NAMES, Object, [value]);
}

function freezeValue(value) {
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function createObject(prototype) {
  return REFLECT_APPLY(OBJECT_CREATE, Object, [prototype]);
}

function defineArrayElement(array, index, value) {
  const descriptor = createObject(null);
  descriptor.value = value;
  descriptor.writable = true;
  descriptor.enumerable = true;
  descriptor.configurable = true;
  REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [array, String(index), descriptor]);
}

function arrayIncludes(array, value) {
  return REFLECT_APPLY(ARRAY_INCLUDES, array, [value]);
}

function sortArray(array) {
  return REFLECT_APPLY(ARRAY_SORT, array, []);
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

function numberIsSafeInteger(value) {
  return REFLECT_APPLY(NUMBER_IS_SAFE_INTEGER, Number, [value]);
}

function bigintFrom(value) {
  return REFLECT_APPLY(BIGINT_CONSTRUCTOR, undefined, [value]);
}

function bigintToString(value, radix) {
  return REFLECT_APPLY(BIGINT_TO_STRING, value, [radix]);
}

function isOwnEnumerableDataDescriptor(descriptor) {
  return Boolean(descriptor)
    && objectHasOwn(descriptor, 'enumerable')
    && descriptor.enumerable === true
    && objectHasOwn(descriptor, 'value')
    && !objectHasOwn(descriptor, 'get')
    && !objectHasOwn(descriptor, 'set');
}

function isOwnDataDescriptor(descriptor) {
  return Boolean(descriptor)
    && objectHasOwn(descriptor, 'value')
    && !objectHasOwn(descriptor, 'get')
    && !objectHasOwn(descriptor, 'set');
}

function snapshotExactDataRecord(value, expected, label) {
  if (!value || typeof value !== 'object' || isProxy(value) || isArray(value)) {
    fail('POMRX_WG_POLICY_E_INVALID', `${label} must be an exact plain data object`);
  }
  const prototype = objectGetPrototypeOf(value);
  if (prototype !== OBJECT_PROTOTYPE && prototype !== null) {
    fail('POMRX_WG_POLICY_E_INVALID', `${label} must use Object.prototype or a null prototype`);
  }
  if (objectGetOwnPropertySymbols(value).length !== 0) {
    fail('POMRX_WG_POLICY_E_INVALID', `${label} cannot contain symbol keys`);
  }
  const descriptors = objectGetOwnPropertyDescriptors(value);
  const names = objectGetOwnPropertyNames(descriptors);
  if (names.length !== expected.length) {
    fail('POMRX_WG_POLICY_E_INVALID', `${label} has missing, hidden or unknown fields`);
  }
  const snapshot = createObject(null);
  for (let index = 0; index < expected.length; index += 1) {
    const key = expected[index];
    const descriptor = descriptors[key];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail('POMRX_WG_POLICY_E_INVALID', `${label} has missing, hidden or unknown fields`);
    }
    snapshot[key] = descriptor.value;
  }
  return freezeValue(snapshot);
}

function snapshotDenseArray(values, field) {
  if (!values || typeof values !== 'object' || isProxy(values) || !isArray(values)) {
    fail('POMRX_WG_POLICY_E_INVALID', `${field} must be a bounded plain array`);
  }
  if (objectGetPrototypeOf(values) !== ARRAY_PROTOTYPE) {
    fail('POMRX_WG_POLICY_E_INVALID', `${field} must use the standard Array prototype`);
  }
  if (objectGetOwnPropertySymbols(values).length !== 0) {
    fail('POMRX_WG_POLICY_E_INVALID', `${field} cannot contain symbol keys`);
  }
  const descriptors = objectGetOwnPropertyDescriptors(values);
  const lengthDescriptor = descriptors.length;
  if (!isOwnDataDescriptor(lengthDescriptor)
      || !numberIsSafeInteger(lengthDescriptor.value)
      || lengthDescriptor.value < 0
      || lengthDescriptor.value > 256) {
    fail('POMRX_WG_POLICY_E_INVALID', `${field} must be a bounded array`);
  }
  const length = lengthDescriptor.value;
  if (objectGetOwnPropertyNames(descriptors).length !== length + 1) {
    fail('POMRX_WG_POLICY_E_INVALID', `${field} must be dense and cannot contain extra or hidden properties`);
  }
  const snapshot = new ARRAY_CONSTRUCTOR(length);
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail('POMRX_WG_POLICY_E_INVALID', `${field} entries must be enumerable data properties`);
    }
    defineArrayElement(snapshot, index, descriptor.value);
  }
  return freezeValue(snapshot);
}

function normalizeOrigin(value) {
  if (typeof value !== 'string') fail('POMRX_WG_POLICY_E_INVALID', 'origin must be a string');
  let url;
  try {
    url = new URL_CONSTRUCTOR(value);
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
  if (typeof value !== 'string' || !regexpTest(DECIMAL_INTEGER_PATTERN, value)) {
    fail('POMRX_WG_POLICY_E_INVALID', `${field} must be a canonical decimal integer string`);
  }
  return bigintToString(bigintFrom(value), 10);
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
  const normalized = new ARRAY_CONSTRUCTOR(snapshotted.length);
  const seen = new SET_CONSTRUCTOR();
  for (let index = 0; index < snapshotted.length; index += 1) {
    const value = normalizeItem(snapshotted[index]);
    if (setHas(seen, value)) {
      fail('POMRX_WG_POLICY_E_INVALID', `${field} cannot contain duplicates`);
    }
    setAdd(seen, value);
    defineArrayElement(normalized, index, value);
  }
  sortArray(normalized);
  return freezeValue(normalized);
}

function normalizePolicy(policy) {
  const snapshot = snapshotExactDataRecord(policy, POLICY_KEYS, 'Wallet Guard policy');
  if (snapshot.schema_version !== WALLET_GUARD_POLICY_SCHEMA_VERSION) {
    fail('POMRX_WG_POLICY_E_INVALID', 'unsupported Wallet Guard policy version');
  }
  if (typeof snapshot.policy_id !== 'string' || !regexpTest(POLICY_ID_PATTERN, snapshot.policy_id)) {
    fail('POMRX_WG_POLICY_E_INVALID', 'policy_id has an invalid format');
  }
  for (let index = 0; index < BOOLEAN_POLICY_FIELDS.length; index += 1) {
    const field = BOOLEAN_POLICY_FIELDS[index];
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

  return freezeValue({
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
  const value = simulation ?? freezeValue({ status: 'not_run' });
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
  if (value === null || value === undefined || !regexpTest(DECIMAL_INTEGER_PATTERN, value)) {
    return true;
  }
  return bigintFrom(value) > bigintFrom(limit);
}

function uniqueReasons(reasons) {
  const output = new ARRAY_CONSTRUCTOR(reasons.length);
  const seen = new SET_CONSTRUCTOR();
  let count = 0;
  for (let index = 0; index < reasons.length; index += 1) {
    const reason = reasons[index];
    if (!setHas(seen, reason)) {
      setAdd(seen, reason);
      defineArrayElement(output, count, reason);
      count += 1;
    }
  }
  if (count !== output.length) output.length = count;
  return freezeValue(output);
}

function makeResult(decision, reasons, normalizedPolicy) {
  const canonicalPolicy = canonicalizePayload(normalizedPolicy);
  return freezeValue({
    decision,
    reasons: uniqueReasons(reasons),
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

  if (!normalizedPolicy.enabled) denyReasons.push('WG_POLICY_DENY_DISABLED');
  if (normalizedPolicy.kill_switch) denyReasons.push('WG_POLICY_DENY_KILL_SWITCH');
  if (!includes(normalizedPolicy.allowed_origins, intent.origin)) {
    denyReasons.push('WG_POLICY_DENY_ORIGIN');
  }
  if (intent.chain_id !== normalizedPolicy.expected_chain_id) {
    denyReasons.push('WG_POLICY_DENY_CHAIN');
  }
  if (greaterThan(intent.native_value, normalizedPolicy.max_native_value)) {
    denyReasons.push('WG_POLICY_DENY_NATIVE_VALUE');
  }

  if (setHas(CRITICAL_UNKNOWN_CLASSES, intent.request_class)) {
    indeterminateReasons.push('WG_POLICY_INDETERMINATE_UNSUPPORTED_EFFECT');
  }

  if (intent.request_class === 'native_transfer') {
    if (!includes(normalizedPolicy.allowed_recipients, intent.recipient)) {
      denyReasons.push('WG_POLICY_DENY_RECIPIENT');
    }
  }

  if (intent.request_class === 'erc20_transfer') {
    if (!includes(normalizedPolicy.allowed_targets, intent.target)) {
      denyReasons.push('WG_POLICY_DENY_TARGET');
    }
    if (!includes(normalizedPolicy.allowed_recipients, intent.recipient)) {
      denyReasons.push('WG_POLICY_DENY_RECIPIENT');
    }
    if (greaterThan(intent.token_amount, normalizedPolicy.max_token_amount)) {
      denyReasons.push('WG_POLICY_DENY_TOKEN_AMOUNT');
    }
  }

  if (intent.request_class === 'erc20_approve') {
    if (!includes(normalizedPolicy.allowed_targets, intent.target)) {
      denyReasons.push('WG_POLICY_DENY_TARGET');
    }
    if (!includes(normalizedPolicy.allowed_spenders, intent.spender)) {
      denyReasons.push('WG_POLICY_DENY_SPENDER');
    }
    if (normalizedPolicy.deny_unlimited_allowance
        && intent.requested_allowance === MAX_UINT256_DECIMAL) {
      denyReasons.push('WG_POLICY_DENY_UNLIMITED_ALLOWANCE');
    }
    if (greaterThan(intent.requested_allowance, normalizedPolicy.max_token_amount)) {
      denyReasons.push('WG_POLICY_DENY_ALLOWANCE_LIMIT');
    }
  }

  if (intent.request_class === 'set_approval_for_all') {
    if (!includes(normalizedPolicy.allowed_targets, intent.target)) {
      denyReasons.push('WG_POLICY_DENY_TARGET');
    }
    if (!includes(normalizedPolicy.allowed_spenders, intent.spender)) {
      denyReasons.push('WG_POLICY_DENY_OPERATOR');
    }
    if (normalizedPolicy.deny_operator_approval && intent.requested_operator_approval === true) {
      denyReasons.push('WG_POLICY_DENY_OPERATOR_APPROVAL');
    }
  }

  if (intent.request_class === 'permit_eip2612' || intent.request_class === 'permit2_single') {
    if (!includes(normalizedPolicy.allowed_targets, intent.target)) {
      denyReasons.push('WG_POLICY_DENY_TARGET');
    }
    if (!includes(normalizedPolicy.allowed_spenders, intent.spender)) {
      denyReasons.push('WG_POLICY_DENY_SPENDER');
    }
    if (intent.typed_data_domain_chain_id !== intent.chain_id) {
      denyReasons.push('WG_POLICY_DENY_TYPED_DATA_CHAIN');
    }
    if (!includes(
      normalizedPolicy.allowed_typed_data_verifying_contracts,
      intent.typed_data_verifying_contract,
    )) {
      denyReasons.push('WG_POLICY_DENY_TYPED_DATA_DOMAIN');
    }
    if (intent.request_class === 'permit_eip2612' && intent.typed_data_owner !== intent.account) {
      denyReasons.push('WG_POLICY_DENY_TYPED_DATA_OWNER');
    }
    if (normalizedPolicy.deny_unlimited_allowance
        && intent.requested_allowance === MAX_UINT256_DECIMAL) {
      denyReasons.push('WG_POLICY_DENY_UNLIMITED_ALLOWANCE');
    }
    if (greaterThan(intent.requested_allowance, normalizedPolicy.max_token_amount)) {
      denyReasons.push('WG_POLICY_DENY_ALLOWANCE_LIMIT');
    }
  }

  const simulationRequired = intent.simulation_required === true
    || includes(normalizedPolicy.require_simulation_for, intent.request_class);
  if (simulationRequired) {
    if (simulationStatus === 'fail' || simulationStatus === 'mismatch') {
      denyReasons.push('WG_POLICY_DENY_SIMULATION');
    } else if (simulationStatus !== 'pass') {
      indeterminateReasons.push('WG_POLICY_INDETERMINATE_SIMULATION');
    }
  }

  if (denyReasons.length > 0) {
    return makeResult('DENY', denyReasons, normalizedPolicy);
  }
  if (indeterminateReasons.length > 0) {
    return makeResult('INDETERMINATE', indeterminateReasons, normalizedPolicy);
  }
  return makeResult('ALLOW', ['WG_POLICY_ALLOW_EXACT'], normalizedPolicy);
}

export function normalizeWalletGuardPolicy(policy) {
  return normalizePolicy(policy);
}
