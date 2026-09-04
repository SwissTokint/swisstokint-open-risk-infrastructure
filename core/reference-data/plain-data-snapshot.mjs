import { types as utilTypes } from 'node:util';

const TRUSTED_REFLECT_APPLY = Reflect.apply;
const TRUSTED_OBJECT = globalThis.Object;
const TRUSTED_ARRAY = globalThis.Array;
const TRUSTED_NUMBER = globalThis.Number;
const TRUSTED_STRING = globalThis.String;
const TRUSTED_REGEXP_TEST = RegExp.prototype.test;
const TRUSTED_IS_PROXY = utilTypes.isProxy;
const TRUSTED_OBJECT_CREATE = TRUSTED_OBJECT.create;
const TRUSTED_OBJECT_DEFINE_PROPERTY = TRUSTED_OBJECT.defineProperty;
const TRUSTED_OBJECT_FREEZE = TRUSTED_OBJECT.freeze;
const TRUSTED_OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = TRUSTED_OBJECT.getOwnPropertyDescriptor;
const TRUSTED_OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = TRUSTED_OBJECT.getOwnPropertyDescriptors;
const TRUSTED_OBJECT_GET_OWN_PROPERTY_NAMES = TRUSTED_OBJECT.getOwnPropertyNames;
const TRUSTED_OBJECT_GET_OWN_PROPERTY_SYMBOLS = TRUSTED_OBJECT.getOwnPropertySymbols;
const TRUSTED_OBJECT_GET_PROTOTYPE_OF = TRUSTED_OBJECT.getPrototypeOf;
const TRUSTED_OBJECT_HAS_OWN = TRUSTED_OBJECT.hasOwn;
const TRUSTED_ARRAY_IS_ARRAY = TRUSTED_ARRAY.isArray;
const TRUSTED_NUMBER_IS_SAFE_INTEGER = TRUSTED_NUMBER.isSafeInteger;
const ARRAY_PROTOTYPE = TRUSTED_ARRAY.prototype;
const OBJECT_PROTOTYPE = TRUSTED_OBJECT.prototype;

export const REFERENCE_PLAIN_DATA_LIMITS = TRUSTED_OBJECT_FREEZE({
  max_depth: 8,
  max_nodes: 1_000,
  max_string_length: 16_384,
  max_key_length: 128,
  max_array_length: 1_000,
});

const SAFE_KEY_PATTERN = /^[A-Za-z0-9_.:/-]{1,128}$/u;

export class PomRxPlainDataError extends TypeError {
  constructor(code, message) {
    super(message);
    this.name = 'PomRxPlainDataError';
    this.code = code;
  }
}

function trustedApply(fn, receiver, args) {
  return TRUSTED_REFLECT_APPLY(fn, receiver, args);
}

function objectCreate(prototype) {
  return trustedApply(TRUSTED_OBJECT_CREATE, undefined, [prototype]);
}

function objectFreeze(value) {
  return trustedApply(TRUSTED_OBJECT_FREEZE, undefined, [value]);
}

function objectGetOwnPropertyDescriptor(value, key) {
  return trustedApply(TRUSTED_OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, undefined, [value, key]);
}

function objectGetOwnPropertyDescriptors(value) {
  return trustedApply(TRUSTED_OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, undefined, [value]);
}

function objectGetOwnPropertyNames(value) {
  return trustedApply(TRUSTED_OBJECT_GET_OWN_PROPERTY_NAMES, undefined, [value]);
}

function objectGetOwnPropertySymbols(value) {
  return trustedApply(TRUSTED_OBJECT_GET_OWN_PROPERTY_SYMBOLS, undefined, [value]);
}

function objectGetPrototypeOf(value) {
  return trustedApply(TRUSTED_OBJECT_GET_PROTOTYPE_OF, undefined, [value]);
}

function objectHasOwn(value, key) {
  return trustedApply(TRUSTED_OBJECT_HAS_OWN, undefined, [value, key]);
}

function arrayIsArray(value) {
  return trustedApply(TRUSTED_ARRAY_IS_ARRAY, undefined, [value]);
}

function numberIsSafeInteger(value) {
  return trustedApply(TRUSTED_NUMBER_IS_SAFE_INTEGER, undefined, [value]);
}

function trustedString(value) {
  return trustedApply(TRUSTED_STRING, undefined, [value]);
}

function regexpTest(pattern, value) {
  return trustedApply(TRUSTED_REGEXP_TEST, pattern, [value]);
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
  if (value
      && typeof value === 'object'
      && trustedApply(TRUSTED_IS_PROXY, utilTypes, [value])) {
    fail('POMRX_DATA_E_PROXY', `${label} cannot be a Proxy`);
  }
}

function isOwnDataDescriptor(descriptor) {
  return Boolean(descriptor)
    && objectHasOwn(descriptor, 'value')
    && !objectHasOwn(descriptor, 'get')
    && !objectHasOwn(descriptor, 'set');
}

function isOwnEnumerableDataDescriptor(descriptor) {
  return isOwnDataDescriptor(descriptor)
    && objectHasOwn(descriptor, 'enumerable')
    && descriptor.enumerable === true;
}

function defineOwnArrayElement(output, key, value) {
  const descriptor = objectCreate(null);
  descriptor.value = value;
  descriptor.enumerable = true;
  descriptor.writable = true;
  descriptor.configurable = true;
  trustedApply(TRUSTED_OBJECT_DEFINE_PROPERTY, undefined, [output, key, descriptor]);
}

function captureArray(value, label, depth, budget) {
  rejectProxy(value, label);
  if (objectGetPrototypeOf(value) !== ARRAY_PROTOTYPE) {
    fail('POMRX_DATA_E_PROTOTYPE', `${label} must use Array.prototype`);
  }
  if (objectGetOwnPropertySymbols(value).length !== 0) {
    fail('POMRX_DATA_E_SYMBOL', `${label} cannot contain symbol keys`);
  }

  const lengthDescriptor = objectGetOwnPropertyDescriptor(value, 'length');
  if (!isOwnDataDescriptor(lengthDescriptor)
      || !numberIsSafeInteger(lengthDescriptor.value)
      || lengthDescriptor.value < 0
      || lengthDescriptor.value > REFERENCE_PLAIN_DATA_LIMITS.max_array_length) {
    fail('POMRX_DATA_E_ARRAY', `${label} has an invalid array length`);
  }

  const length = lengthDescriptor.value;
  if (length > budget.remaining) {
    fail('POMRX_DATA_E_NODES', `${label} exceeds the remaining node budget`);
  }

  const ownNames = objectGetOwnPropertyNames(value);
  let sawLength = false;
  for (let index = 0; index < ownNames.length; index += 1) {
    if (ownNames[index] === 'length') sawLength = true;
  }
  if (ownNames.length !== length + 1 || !sawLength) {
    fail('POMRX_DATA_E_ARRAY', `${label} must be a dense undecorated array`);
  }

  const descriptors = objectGetOwnPropertyDescriptors(value);
  const output = new TRUSTED_ARRAY(length);
  for (let index = 0; index < length; index += 1) {
    const key = trustedString(index);
    if (!objectHasOwn(descriptors, key)) {
      fail('POMRX_DATA_E_ARRAY', `${label} must contain every array index as an own property`);
    }
    const descriptor = descriptors[key];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail('POMRX_DATA_E_ARRAY', `${label} must contain dense data elements only`);
    }
    const captured = captureValue(descriptor.value, `${label}[${key}]`, depth + 1, budget);
    defineOwnArrayElement(output, key, captured);
  }
  return objectFreeze(output);
}

function captureObject(value, label, depth, budget) {
  rejectProxy(value, label);
  const prototype = objectGetPrototypeOf(value);
  if (prototype !== OBJECT_PROTOTYPE && prototype !== null) {
    fail('POMRX_DATA_E_PROTOTYPE', `${label} must be a plain object`);
  }
  if (objectGetOwnPropertySymbols(value).length !== 0) {
    fail('POMRX_DATA_E_SYMBOL', `${label} cannot contain symbol keys`);
  }

  const ownNames = objectGetOwnPropertyNames(value);
  if (ownNames.length > budget.remaining) {
    fail('POMRX_DATA_E_NODES', `${label} exceeds the remaining node budget`);
  }

  const descriptors = objectGetOwnPropertyDescriptors(value);
  const output = objectCreate(null);
  for (let index = 0; index < ownNames.length; index += 1) {
    const key = ownNames[index];
    if (key.length > REFERENCE_PLAIN_DATA_LIMITS.max_key_length
        || !regexpTest(SAFE_KEY_PATTERN, key)
        || key === '__proto__'
        || key === 'constructor'
        || key === 'prototype') {
      fail('POMRX_DATA_E_KEY', `${label} contains an unsafe key: ${key}`);
    }
    const descriptor = descriptors[key];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail('POMRX_DATA_E_ACCESSOR', `${label}.${key} must be an enumerable data property`);
    }
    const captured = captureValue(descriptor.value, `${label}.${key}`, depth + 1, budget);
    const outputDescriptor = objectCreate(null);
    outputDescriptor.value = captured;
    outputDescriptor.enumerable = true;
    outputDescriptor.writable = true;
    outputDescriptor.configurable = true;
    trustedApply(TRUSTED_OBJECT_DEFINE_PROPERTY, undefined, [output, key, outputDescriptor]);
  }
  return objectFreeze(output);
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
    if (!numberIsSafeInteger(value)) {
      fail('POMRX_DATA_E_NUMBER', `${label} must be a safe integer`);
    }
    return value;
  }
  if (typeof value !== 'object') {
    fail('POMRX_DATA_E_TYPE', `${label} contains an unsupported value`);
  }

  rejectProxy(value, label);
  if (arrayIsArray(value)) {
    return captureArray(value, label, depth, budget);
  }
  return captureObject(value, label, depth, budget);
}

export function captureReferencePlainData(value, label = 'value') {
  assertLabel(label);
  return captureValue(value, label, 0, { remaining: REFERENCE_PLAIN_DATA_LIMITS.max_nodes });
}
