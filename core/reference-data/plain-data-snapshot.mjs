import { types as utilTypes } from 'node:util';

export const REFERENCE_PLAIN_DATA_LIMITS = Object.freeze({
  max_depth: 8,
  max_nodes: 1_000,
  max_string_length: 16_384,
  max_key_length: 128,
  max_array_length: 1_000,
});

const SAFE_KEY_PATTERN = /^[A-Za-z0-9_.:/-]{1,128}$/u;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export class PomRxPlainDataError extends TypeError {
  constructor(code, message) {
    super(message);
    this.name = 'PomRxPlainDataError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new PomRxPlainDataError(code, message);
}

function assertLabel(label) {
  if (typeof label !== 'string' || label.length < 1 || label.length > 128) {
    throw new TypeError('plain-data snapshot label must be a non-empty bounded string');
  }
}

function rejectProxy(value, label) {
  if (value && typeof value === 'object' && utilTypes.isProxy(value)) {
    fail('POMRX_DATA_E_PROXY', `${label} cannot be a Proxy`);
  }
}

function isOwnDataDescriptor(descriptor) {
  return Boolean(descriptor)
    && Object.hasOwn(descriptor, 'value')
    && !Object.hasOwn(descriptor, 'get')
    && !Object.hasOwn(descriptor, 'set');
}

function isOwnEnumerableDataDescriptor(descriptor) {
  return isOwnDataDescriptor(descriptor)
    && Object.hasOwn(descriptor, 'enumerable')
    && descriptor.enumerable === true;
}

function defineOwnArrayElement(output, key, value) {
  const descriptor = Object.create(null);
  descriptor.value = value;
  descriptor.enumerable = true;
  descriptor.writable = true;
  descriptor.configurable = true;
  Object.defineProperty(output, key, descriptor);
}

function captureArray(value, label, depth, budget) {
  rejectProxy(value, label);
  if (Object.getPrototypeOf(value) !== Array.prototype) {
    fail('POMRX_DATA_E_PROTOTYPE', `${label} must use Array.prototype`);
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    fail('POMRX_DATA_E_SYMBOL', `${label} cannot contain symbol keys`);
  }

  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
  if (!isOwnDataDescriptor(lengthDescriptor)
      || !Number.isSafeInteger(lengthDescriptor.value)
      || lengthDescriptor.value < 0
      || lengthDescriptor.value > REFERENCE_PLAIN_DATA_LIMITS.max_array_length) {
    fail('POMRX_DATA_E_ARRAY', `${label} has an invalid array length`);
  }

  const length = lengthDescriptor.value;
  if (length > budget.remaining) {
    fail('POMRX_DATA_E_NODES', `${label} exceeds the remaining node budget`);
  }

  const ownNames = Object.getOwnPropertyNames(value);
  if (ownNames.length !== length + 1 || !ownNames.includes('length')) {
    fail('POMRX_DATA_E_ARRAY', `${label} must be a dense undecorated array`);
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const output = new Array(length);
  for (let index = 0; index < length; index += 1) {
    const key = String(index);
    if (!Object.hasOwn(descriptors, key)) {
      fail('POMRX_DATA_E_ARRAY', `${label} must contain every array index as an own property`);
    }
    const descriptor = descriptors[key];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail('POMRX_DATA_E_ARRAY', `${label} must contain dense data elements only`);
    }
    const captured = captureValue(descriptor.value, `${label}[${key}]`, depth + 1, budget);
    defineOwnArrayElement(output, key, captured);
  }
  return Object.freeze(output);
}

function captureObject(value, label, depth, budget) {
  rejectProxy(value, label);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail('POMRX_DATA_E_PROTOTYPE', `${label} must be a plain object`);
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    fail('POMRX_DATA_E_SYMBOL', `${label} cannot contain symbol keys`);
  }

  const ownNames = Object.getOwnPropertyNames(value);
  if (ownNames.length > budget.remaining) {
    fail('POMRX_DATA_E_NODES', `${label} exceeds the remaining node budget`);
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const output = Object.create(null);
  for (const key of ownNames) {
    if (key.length > REFERENCE_PLAIN_DATA_LIMITS.max_key_length
        || !SAFE_KEY_PATTERN.test(key)
        || FORBIDDEN_KEYS.has(key)) {
      fail('POMRX_DATA_E_KEY', `${label} contains an unsafe key: ${key}`);
    }
    const descriptor = descriptors[key];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail('POMRX_DATA_E_ACCESSOR', `${label}.${key} must be an enumerable data property`);
    }
    output[key] = captureValue(descriptor.value, `${label}.${key}`, depth + 1, budget);
  }
  return Object.freeze(output);
}

function captureValue(value, label, depth, budget) {
  if (depth > REFERENCE_PLAIN_DATA_LIMITS.max_depth) {
    fail('POMRX_DATA_E_DEPTH', `${label} exceeds the maximum depth`);
  }
  if (budget.remaining <= 0) {
    fail('POMRX_DATA_E_NODES', `${label} exceeds the maximum node count`);
  }
  budget.remaining -= 1;

  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.length > REFERENCE_PLAIN_DATA_LIMITS.max_string_length) {
      fail('POMRX_DATA_E_STRING', `${label} string is too long`);
    }
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      fail('POMRX_DATA_E_NUMBER', `${label} must be a safe integer`);
    }
    return value;
  }
  if (typeof value !== 'object') {
    fail('POMRX_DATA_E_TYPE', `${label} contains an unsupported value`);
  }

  rejectProxy(value, label);
  if (Array.isArray(value)) {
    return captureArray(value, label, depth, budget);
  }
  return captureObject(value, label, depth, budget);
}

export function captureReferencePlainData(value, label = 'value') {
  assertLabel(label);
  return captureValue(value, label, 0, { remaining: REFERENCE_PLAIN_DATA_LIMITS.max_nodes });
}
