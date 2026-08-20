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
  return utilTypes.isProxy(value);
}

function snapshotExactDataRecord(value, expected, label) {
  if (!value || typeof value !== 'object' || isProxy(value) || Array.isArray(value)) {
    fail('POMRX_WG_POLICY_E_INVALID', `${label} must be an exact plain data object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail('POMRX_WG_POLICY_E_INVALID', `${label} must use Object.prototype or a null prototype`);
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    fail('POMRX_WG_POLICY_E_INVALID', `${label} cannot contain symbol keys`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Object.keys(descriptors).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail('POMRX_WG_POLICY_E_INVALID', `${label} has missing, hidden or unknown fields`);
  }
  const snapshot = Object.create(null);
  for (const key of expected) {
    const descriptor = descriptors[key];
    if (!descriptor
      || descriptor.enumerable !== true
      || typeof descriptor.get === 'function'
      || typeof descriptor.set === 'function'
      || !Object.hasOwn(descriptor, 'value')) {
      fail('POMRX_WG_POLICY_E_INVALID', `${label} fields must be enumerable data properties`);
    }
    snapshot[key] = descriptor.value;
  }
  return Object.freeze(snapshot);
}

function snapshotDenseArray(values, field) {
  if (!values || typeof values !== 'object' || isProxy(values) || !Array.isArray(values)) {
    fail('POMRX_WG_POLICY_E_INVALID', `${field} must be a bounded plain array`);
  }
  if (Object.getPrototypeOf(values) !== Array.prototype) {
    fail('POMRX_WG_POLICY_E_INVALID', `${field} must use the standard Array prototype`);
  }
  if (Object.getOwnPropertySymbols(values).length !== 0) {
    fail('POMRX_WG_POLICY_E_INVALID', `${field} cannot contain symbol keys`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(values);
  const lengthDescriptor = descriptors.length;
  if (!lengthDescriptor
      || typeof lengthDescriptor.get === 'function'
      || typeof lengthDescriptor.set === 'function'
      || !Object.hasOwn(lengthDescriptor, 'value')
      || !Number.isSafeInteger(lengthDescriptor.value)
      || lengthDescriptor.value < 0
      || lengthDescriptor.value > 256) {
    fail('POMRX_WG_POLICY_E_INVALID', `${field} must be a bounded array`);
  }
  const length = lengthDescriptor.value;
  const keys = Object.keys(descriptors).filter((key) => key !== 'length');
  if (keys.length !== length || keys.some((key, index) => key !== String(index))) {
    fail('POMRX_WG_POLICY_E_INVALID', `${field} must be dense and cannot contain extra or hidden properties`);
  }
  const snapshot = keys.map((key) => {
    const descriptor = descriptors[key];
    if (!descriptor
      || descriptor.enumerable !== true
      || typeof descriptor.get === 'function'
      || typeof descriptor.set === 'function'
      || !Object.hasOwn(descriptor, 'value')) {
      fail('POMRX_WG_POLICY_E_INVALID', `${field} entries must be enumerable data properties`);
    }
    return descriptor.value;
  });
  return Object.freeze(snapshot);
}

function normalizeOrigin(value) {
  if (typeof value !== 'string') fail('POMRX_WG_POLICY_E_INVALID', 'origin must be a string');
  let url;
  try {
    url = new URL(value);
  } catch {
    fail('POMRX_WG_POLICY_E_INVALID', 'origin must be an absolute URL origin');
  }
  if (!['https:', 'http:'].includes(url.protocol) || url.origin !== value || url.username || url.password) {
    fail('POMRX_WG_POLICY_E_INVALID', 'origin must be canonical HTTP(S) origin');
  }
  return url.origin;
}

function normalizeCanonicalDecimal(value, field) {
  if (typeof value !== 'string' || !DECIMAL_INTEGER_PATTERN.test(value)) {
    fail('POMRX_WG_POLICY_E_INVALID', `${field} must be a canonical decimal integer string`);
  }
  return BigInt(value).toString(10);
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
  const normalized = snapshotted.map(normalizeItem);
  const unique = new Set(normalized);
  if (unique.size !== normalized.length) {
    fail('POMRX_WG_POLICY_E_INVALID', `${field} cannot contain duplicates`);
  }
  return Object.freeze([...normalized].sort());
}

function normalizePolicy(policy) {
  const snapshot = snapshotExactDataRecord(policy, POLICY_KEYS, 'Wallet Guard policy');
  if (snapshot.schema_version !== WALLET_GUARD_POLICY_SCHEMA_VERSION) {
    fail('POMRX_WG_POLICY_E_INVALID', 'unsupported Wallet Guard policy version');
  }
  if (typeof snapshot.policy_id !== 'string' || !POLICY_ID_PATTERN.test(snapshot.policy_id)) {
    fail('POMRX_WG_POLICY_E_INVALID', 'policy_id has an invalid format');
  }
  for (const field of ['enabled', 'kill_switch', 'deny_unlimited_allowance', 'deny_operator_approval']) {
    if (typeof snapshot[field] !== 'boolean') {
      fail('POMRX_WG_POLICY_E_INVALID', `${field} must be boolean`);
    }
  }

  const requireSimulationFor = normalizeUniqueList(
    snapshot.require_simulation_for,
    'require_simulation_for',
    (value) => {
      if (typeof value !== 'string' || !KNOWN_REQUEST_CLASSES.has(value)) {
        fail('POMRX_WG_POLICY_E_INVALID', 'require_simulation_for contains an unknown request class');
      }
      return value;
    },
  );

  return Object.freeze({
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
  if (!KNOWN_REQUEST_CLASSES.has(intent.request_class)) {
    fail('POMRX_WG_POLICY_E_INVALID', 'Wallet Guard intent request class is unknown');
  }
}

function normalizeSimulation(simulation) {
  const value = simulation ?? Object.freeze({ status: 'not_run' });
  const snapshot = snapshotExactDataRecord(value, ['status'], 'simulation evidence');
  if (typeof snapshot.status !== 'string' || !SIMULATION_STATUSES.has(snapshot.status)) {
    fail('POMRX_WG_POLICY_E_INVALID', 'simulation status is invalid');
  }
  return snapshot.status;
}

function includes(list, value) {
  return value !== null && value !== undefined && list.includes(value);
}

function greaterThan(value, limit) {
  if (value === null || value === undefined || !DECIMAL_INTEGER_PATTERN.test(value)) {
    return true;
  }
  return BigInt(value) > BigInt(limit);
}

function makeResult(decision, reasons, normalizedPolicy) {
  const canonicalPolicy = canonicalizePayload(normalizedPolicy);
  return Object.freeze({
    decision,
    reasons: Object.freeze([...new Set(reasons)]),
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
  if (!normalizedPolicy.allowed_origins.includes(intent.origin)) {
    denyReasons.push('WG_POLICY_DENY_ORIGIN');
  }
  if (intent.chain_id !== normalizedPolicy.expected_chain_id) {
    denyReasons.push('WG_POLICY_DENY_CHAIN');
  }
  if (greaterThan(intent.native_value, normalizedPolicy.max_native_value)) {
    denyReasons.push('WG_POLICY_DENY_NATIVE_VALUE');
  }

  if (CRITICAL_UNKNOWN_CLASSES.has(intent.request_class)) {
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
    || normalizedPolicy.require_simulation_for.includes(intent.request_class);
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
