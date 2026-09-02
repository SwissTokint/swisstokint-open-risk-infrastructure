import {
  canonicalizePayload,
  sha256Hex,
} from '../../../sdk/typescript/swisstokint-proof.mjs';

const TRUSTED_ARRAY_INCLUDES = Array.prototype.includes;
const TRUSTED_BIGINT = BigInt;
const TRUSTED_BIGINT_TO_STRING = BigInt.prototype.toString;
const TRUSTED_OBJECT_FREEZE = Object.freeze;
const TRUSTED_REFLECT_APPLY = Reflect.apply;
const TRUSTED_STRING_TO_LOWER_CASE = String.prototype.toLowerCase;

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/u;
const HEX_DATA_PATTERN = /^0x(?:[a-fA-F0-9]{2})*$/u;
const HEX_QUANTITY_PATTERN = /^0x(?:0|[1-9a-fA-F][a-fA-F0-9]*)$/u;
const DECIMAL_INTEGER_PATTERN = /^(?:0|[1-9][0-9]*)$/u;
const MAX_JSON_DEPTH = 8;
const MAX_JSON_NODES = 1_000;
const MAX_JSON_STRING = 16_384;
const MAX_JSON_KEY = 64;
const SAFE_KEY_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/u;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const EIP2612_DOMAIN_FIELDS = TRUSTED_OBJECT_FREEZE([
  ['name', 'string'],
  ['version', 'string'],
  ['chainId', 'uint256'],
  ['verifyingContract', 'address'],
]);
const EIP2612_PERMIT_FIELDS = TRUSTED_OBJECT_FREEZE([
  ['owner', 'address'],
  ['spender', 'address'],
  ['value', 'uint256'],
  ['nonce', 'uint256'],
  ['deadline', 'uint256'],
]);
const PERMIT2_DOMAIN_FIELDS = TRUSTED_OBJECT_FREEZE([
  ['name', 'string'],
  ['chainId', 'uint256'],
  ['verifyingContract', 'address'],
]);
const PERMIT2_DETAILS_FIELDS = TRUSTED_OBJECT_FREEZE([
  ['token', 'address'],
  ['amount', 'uint160'],
  ['expiration', 'uint48'],
  ['nonce', 'uint48'],
]);
const PERMIT2_SINGLE_FIELDS = TRUSTED_OBJECT_FREEZE([
  ['details', 'PermitDetails'],
  ['spender', 'address'],
  ['sigDeadline', 'uint256'],
]);

export const ERC20_APPROVE_SELECTOR = '0x095ea7b3';
export const ERC20_TRANSFER_SELECTOR = '0xa9059cbb';
export const SET_APPROVAL_FOR_ALL_SELECTOR = '0xa22cb465';
export const MAX_UINT256_DECIMAL = trustedBigIntToString((1n << 256n) - 1n, 10);

export class WalletGuardDecoderError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WalletGuardDecoderError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new WalletGuardDecoderError(code, message);
}

function trustedBigIntToString(value, radix) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_BIGINT_TO_STRING, value, [radix]);
}

function trustedLowerCase(value) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_STRING_TO_LOWER_CASE, value, []);
}

function trustedIncludes(values, value) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_ARRAY_INCLUDES, values, [value]);
}

export function normalizeEvmAddress(value, field = 'address') {
  if (typeof value !== 'string' || !ADDRESS_PATTERN.test(value)) {
    fail('POMRX_WG_E_ADDRESS_INVALID', `${field} must be a 20-byte EVM address`);
  }
  return trustedLowerCase(value);
}

export function normalizeHexData(value, field = 'data') {
  if (typeof value !== 'string' || !HEX_DATA_PATTERN.test(value)) {
    fail('POMRX_WG_E_HEX_INVALID', `${field} must be canonical byte-aligned hex data`);
  }
  return trustedLowerCase(value);
}

export function normalizeChainId(value) {
  if (typeof value !== 'string' || !HEX_QUANTITY_PATTERN.test(value)) {
    fail('POMRX_WG_E_CHAIN_INVALID', 'chain_id must be a canonical EIP-1193 hex quantity');
  }
  return `0x${trustedBigIntToString(TRUSTED_BIGINT(value), 16)}`;
}

export function normalizeQuantity(value, field = 'value') {
  if (value === undefined || value === null) return '0';
  if (typeof value !== 'string' || !HEX_QUANTITY_PATTERN.test(value)) {
    fail('POMRX_WG_E_QUANTITY_INVALID', `${field} must be a canonical EVM hex quantity`);
  }
  return trustedBigIntToString(TRUSTED_BIGINT(value), 10);
}

function normalizeNumberish(value, field, bits = 256) {
  let parsed;
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) {
      fail('POMRX_WG_E_TYPED_DATA_INVALID', `${field} must be a non-negative integer`);
    }
    parsed = TRUSTED_BIGINT(value);
  } else if (typeof value === 'string' && DECIMAL_INTEGER_PATTERN.test(value)) {
    parsed = TRUSTED_BIGINT(value);
  } else if (typeof value === 'string' && HEX_QUANTITY_PATTERN.test(value)) {
    parsed = TRUSTED_BIGINT(value);
  } else {
    fail('POMRX_WG_E_TYPED_DATA_INVALID', `${field} must be a canonical integer`);
  }

  if (parsed >= (1n << TRUSTED_BIGINT(bits))) {
    fail('POMRX_WG_E_TYPED_DATA_INVALID', `${field} exceeds uint${bits}`);
  }
  return trustedBigIntToString(parsed, 10);
}

function parseAddressWord(word, field) {
  if (!/^[a-f0-9]{64}$/u.test(word) || !/^0{24}/u.test(word)) {
    fail('POMRX_WG_E_CALLDATA_MALFORMED', `${field} is not a canonical ABI address word`);
  }
  return normalizeEvmAddress(`0x${word.slice(24)}`, field);
}

function parseUint256Word(word, field) {
  if (!/^[a-f0-9]{64}$/u.test(word)) {
    fail('POMRX_WG_E_CALLDATA_MALFORMED', `${field} is not a canonical uint256 word`);
  }
  return trustedBigIntToString(TRUSTED_BIGINT(`0x${word}`), 10);
}

function parseBoolWord(word, field) {
  if (!/^[a-f0-9]{64}$/u.test(word)) {
    fail('POMRX_WG_E_CALLDATA_MALFORMED', `${field} is not a canonical bool word`);
  }
  const value = TRUSTED_BIGINT(`0x${word}`);
  if (value !== 0n && value !== 1n) {
    fail('POMRX_WG_E_CALLDATA_MALFORMED', `${field} must be ABI bool 0 or 1`);
  }
  return value === 1n;
}

export function decodeTransactionCalldata(rawData) {
  const data = normalizeHexData(rawData ?? '0x', 'transaction data');
  const calldataSha256 = sha256Hex(data);

  if (data === '0x') {
    return TRUSTED_OBJECT_FREEZE({
      request_class: 'native_transfer',
      selector: null,
      spender: null,
      recipient: null,
      requested_allowance: null,
      token_amount: null,
      requested_operator_approval: null,
      calldata_sha256: calldataSha256,
      simulation_required: false,
    });
  }

  if (data.length < 10) {
    fail('POMRX_WG_E_CALLDATA_MALFORMED', 'transaction data is too short for a selector');
  }

  const selector = data.slice(0, 10);
  if (trustedIncludes([ERC20_APPROVE_SELECTOR, ERC20_TRANSFER_SELECTOR, SET_APPROVAL_FOR_ALL_SELECTOR], selector)) {
    if (data.length !== 138) {
      fail('POMRX_WG_E_CALLDATA_MALFORMED', 'recognized two-argument calldata has an invalid length');
    }
    const firstWord = data.slice(10, 74);
    const secondWord = data.slice(74, 138);

    if (selector === ERC20_APPROVE_SELECTOR) {
      return TRUSTED_OBJECT_FREEZE({
        request_class: 'erc20_approve',
        selector,
        spender: parseAddressWord(firstWord, 'spender'),
        recipient: null,
        requested_allowance: parseUint256Word(secondWord, 'allowance'),
        token_amount: null,
        requested_operator_approval: null,
        calldata_sha256: calldataSha256,
        simulation_required: true,
      });
    }

    if (selector === ERC20_TRANSFER_SELECTOR) {
      return TRUSTED_OBJECT_FREEZE({
        request_class: 'erc20_transfer',
        selector,
        spender: null,
        recipient: parseAddressWord(firstWord, 'recipient'),
        requested_allowance: null,
        token_amount: parseUint256Word(secondWord, 'token amount'),
        requested_operator_approval: null,
        calldata_sha256: calldataSha256,
        simulation_required: true,
      });
    }

    return TRUSTED_OBJECT_FREEZE({
      request_class: 'set_approval_for_all',
      selector,
      spender: parseAddressWord(firstWord, 'operator'),
      recipient: null,
      requested_allowance: null,
      token_amount: null,
      requested_operator_approval: parseBoolWord(secondWord, 'approved'),
      calldata_sha256: calldataSha256,
      simulation_required: true,
    });
  }

  return TRUSTED_OBJECT_FREEZE({
    request_class: 'unknown_calldata',
    selector,
    spender: null,
    recipient: null,
    requested_allowance: null,
    token_amount: null,
    requested_operator_approval: null,
    calldata_sha256: calldataSha256,
    simulation_required: true,
  });
}

function clonePlainJson(value, depth = 0, budget = { remaining: MAX_JSON_NODES }) {
  if (depth > MAX_JSON_DEPTH || budget.remaining-- <= 0) {
    fail('POMRX_WG_E_TYPED_DATA_INVALID', 'typed data exceeds reference bounds');
  }

  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.length > MAX_JSON_STRING) {
      fail('POMRX_WG_E_TYPED_DATA_INVALID', 'typed data string is too long');
    }
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      fail('POMRX_WG_E_TYPED_DATA_INVALID', 'typed data numbers must be safe integers');
    }
    return value;
  }
  if (Array.isArray(value)) {
    const keys = Object.keys(value);
    if (keys.length !== value.length || keys.some((key, index) => key !== String(index))) {
      fail('POMRX_WG_E_TYPED_DATA_INVALID', 'typed data arrays must be dense');
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    return TRUSTED_OBJECT_FREEZE(keys.map((key) => {
      const descriptor = descriptors[key];
      if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
        fail('POMRX_WG_E_TYPED_DATA_INVALID', 'typed data cannot contain accessors');
      }
      return clonePlainJson(descriptor.value, depth + 1, budget);
    }));
  }

  if (!value || typeof value !== 'object') {
    fail('POMRX_WG_E_TYPED_DATA_INVALID', 'typed data contains an unsupported value');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail('POMRX_WG_E_TYPED_DATA_INVALID', 'typed data must contain plain objects only');
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    fail('POMRX_WG_E_TYPED_DATA_INVALID', 'typed data cannot contain symbol keys');
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const output = Object.create(null);
  for (const key of Object.keys(value)) {
    if (key.length > MAX_JSON_KEY || !SAFE_KEY_PATTERN.test(key) || FORBIDDEN_KEYS.has(key)) {
      fail('POMRX_WG_E_TYPED_DATA_INVALID', 'typed data contains an unsafe key');
    }
    const descriptor = descriptors[key];
    if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
      fail('POMRX_WG_E_TYPED_DATA_INVALID', 'typed data cannot contain accessors');
    }
    output[key] = clonePlainJson(descriptor.value, depth + 1, budget);
  }
  return TRUSTED_OBJECT_FREEZE(output);
}

function parseTypedData(rawTypedData) {
  let parsed = rawTypedData;
  if (typeof rawTypedData === 'string') {
    if (rawTypedData.length > 16 * 1024) {
      fail('POMRX_WG_E_TYPED_DATA_INVALID', 'typed data JSON is too large');
    }
    try {
      parsed = JSON.parse(rawTypedData);
    } catch {
      fail('POMRX_WG_E_TYPED_DATA_INVALID', 'typed data JSON is invalid');
    }
  }
  return clonePlainJson(parsed);
}

function exactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function exactTypeDefinition(types, typeName, expectedFields) {
  const definition = types?.[typeName];
  if (!Array.isArray(definition) || definition.length !== expectedFields.length) return false;
  return definition.every((field, index) => (
    exactKeys(field, ['name', 'type'])
    && field.name === expectedFields[index][0]
    && field.type === expectedFields[index][1]
  ));
}

function exactTypeSet(types, expectedDefinitions) {
  if (!types || typeof types !== 'object' || Array.isArray(types)) return false;
  const typeNames = Object.keys(expectedDefinitions).sort();
  if (!exactKeys(types, typeNames)) return false;
  return typeNames.every((name) => exactTypeDefinition(types, name, expectedDefinitions[name]));
}

function isExactEip2612Permit(typedData) {
  return exactKeys(typedData, ['types', 'primaryType', 'domain', 'message'])
    && exactTypeSet(typedData.types, {
      EIP712Domain: EIP2612_DOMAIN_FIELDS,
      Permit: EIP2612_PERMIT_FIELDS,
    })
    && exactKeys(typedData.domain, ['name', 'version', 'chainId', 'verifyingContract'])
    && exactKeys(typedData.message, ['owner', 'spender', 'value', 'nonce', 'deadline']);
}

function isExactPermit2Single(typedData) {
  return exactKeys(typedData, ['types', 'primaryType', 'domain', 'message'])
    && exactTypeSet(typedData.types, {
      EIP712Domain: PERMIT2_DOMAIN_FIELDS,
      PermitDetails: PERMIT2_DETAILS_FIELDS,
      PermitSingle: PERMIT2_SINGLE_FIELDS,
    })
    && exactKeys(typedData.domain, ['name', 'chainId', 'verifyingContract'])
    && exactKeys(typedData.message, ['details', 'spender', 'sigDeadline'])
    && exactKeys(typedData.message.details, ['token', 'amount', 'expiration', 'nonce']);
}

function normalizeOptionalDomainChainId(domain) {
  if (!Object.hasOwn(domain, 'chainId')) return null;
  const decimal = normalizeNumberish(domain.chainId, 'typed data domain chainId', 256);
  return `0x${trustedBigIntToString(TRUSTED_BIGINT(decimal), 16)}`;
}

function unknownTypedDataResult(primaryType, typedDataSha256, domainChainId, domainVerifyingContract) {
  return TRUSTED_OBJECT_FREEZE({
    request_class: primaryType === 'PermitBatch' ? 'permit2_batch_unknown' : 'unknown_typed_data',
    target: null,
    spender: null,
    requested_allowance: null,
    typed_data_owner: null,
    typed_data_sha256: typedDataSha256,
    typed_data_domain_chain_id: domainChainId,
    typed_data_verifying_contract: domainVerifyingContract,
    simulation_required: true,
  });
}

export function decodeTypedData(rawTypedData) {
  const typedData = parseTypedData(rawTypedData);
  if (!typedData || typeof typedData !== 'object' || Array.isArray(typedData)) {
    fail('POMRX_WG_E_TYPED_DATA_INVALID', 'typed data must be an object');
  }
  if (typeof typedData.primaryType !== 'string' || typedData.primaryType.length < 1) {
    fail('POMRX_WG_E_TYPED_DATA_INVALID', 'typed data primaryType is required');
  }
  const domain = typedData.domain;
  const message = typedData.message;
  if (!domain || typeof domain !== 'object' || Array.isArray(domain)
      || !message || typeof message !== 'object' || Array.isArray(message)) {
    fail('POMRX_WG_E_TYPED_DATA_INVALID', 'typed data domain and message are required');
  }

  const canonicalTypedData = canonicalizePayload(typedData);
  const typedDataSha256 = sha256Hex(canonicalTypedData);
  const domainChainId = normalizeOptionalDomainChainId(domain);
  const domainVerifyingContract = Object.hasOwn(domain, 'verifyingContract')
    ? normalizeEvmAddress(domain.verifyingContract, 'typed data verifyingContract')
    : null;

  if (typedData.primaryType === 'Permit') {
    if (!isExactEip2612Permit(typedData)) {
      return unknownTypedDataResult(
        typedData.primaryType,
        typedDataSha256,
        domainChainId,
        domainVerifyingContract,
      );
    }
    if (domainChainId === null || domainVerifyingContract === null) {
      fail('POMRX_WG_E_TYPED_DATA_INVALID', 'EIP-2612 Permit requires chainId and verifyingContract');
    }
    normalizeNumberish(message.nonce, 'Permit nonce', 256);
    normalizeNumberish(message.deadline, 'Permit deadline', 256);
    return TRUSTED_OBJECT_FREEZE({
      request_class: 'permit_eip2612',
      target: domainVerifyingContract,
      spender: normalizeEvmAddress(message.spender, 'Permit spender'),
      requested_allowance: normalizeNumberish(message.value, 'Permit value', 256),
      typed_data_owner: normalizeEvmAddress(message.owner, 'Permit owner'),
      typed_data_sha256: typedDataSha256,
      typed_data_domain_chain_id: domainChainId,
      typed_data_verifying_contract: domainVerifyingContract,
      simulation_required: true,
    });
  }

  if (typedData.primaryType === 'PermitSingle') {
    if (!isExactPermit2Single(typedData)) {
      return unknownTypedDataResult(
        typedData.primaryType,
        typedDataSha256,
        domainChainId,
        domainVerifyingContract,
      );
    }
    if (domainChainId === null || domainVerifyingContract === null) {
      fail('POMRX_WG_E_TYPED_DATA_INVALID', 'Permit2 requires chainId and verifyingContract');
    }
    normalizeNumberish(message.details.expiration, 'Permit2 expiration', 48);
    normalizeNumberish(message.details.nonce, 'Permit2 nonce', 48);
    normalizeNumberish(message.sigDeadline, 'Permit2 sigDeadline', 256);
    return TRUSTED_OBJECT_FREEZE({
      request_class: 'permit2_single',
      target: normalizeEvmAddress(message.details.token, 'Permit2 token'),
      spender: normalizeEvmAddress(message.spender, 'Permit2 spender'),
      requested_allowance: normalizeNumberish(message.details.amount, 'Permit2 amount', 160),
      typed_data_owner: null,
      typed_data_sha256: typedDataSha256,
      typed_data_domain_chain_id: domainChainId,
      typed_data_verifying_contract: domainVerifyingContract,
      simulation_required: true,
    });
  }

  return unknownTypedDataResult(
    typedData.primaryType,
    typedDataSha256,
    domainChainId,
    domainVerifyingContract,
  );
}
