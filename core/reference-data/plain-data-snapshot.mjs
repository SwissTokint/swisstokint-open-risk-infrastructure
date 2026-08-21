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

// Validation-error provenance is intentionally private and scoped to one
// synchronous capture invocation. The capture boundary itself is also
// load-bearing Core security state: callers rely on it to reject nested Proxies,
// accessors, symbols, unsafe prototypes and decorated arrays before any consumer
// treats the resulting graph as inert. Capture every reflection/collection
// intrinsic used by that decision once at module initialization so later
// same-realm mutation cannot turn a nested Proxy into ordinary data, hide an own
// field, reclassify an array, widen the key allowlist, or make the detached copy
// mutable. Poisoning before module initialization and a generally compromised
// runtime remain outside this scoped reference guarantee.
const REFLECT_APPLY = Reflect.apply;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PROTOTYPE = Array.prototype;
const NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_OWN_PROPERTY_NAMES = Object.getOwnPropertyNames;
const OBJECT_GET_OWN_PROPERTY_SYMBOLS = Object.getOwnPropertySymbols;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const REGEXP_TEST = RegExp.prototype.test;
const SET_HAS = Set.prototype.has;
const UTIL_TYPES_IS_PROXY = utilTypes.isProxy;
const WEAK_MAP_SET = WeakMap.prototype.set;
const WEAK_MAP_GET = WeakMap.prototype.get;
const validationErrorContext = new WeakMap();
let activeCaptureContext = null;

function arrayIsArray(value) {
  return REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value]);
}

function numberIsSafeInteger(value) {
  return REFLECT_APPLY(NUMBER_IS_SAFE_INTEGER, Number, [value]);
}

function objectCreate(prototype) {
  return REFLECT_APPLY(OBJECT_CREATE, Object, [prototype]);
}

function objectDefineProperty(value, key, descriptor) {
  return REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [value, key, descriptor]);
}

function objectFreeze(value) {
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
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

function regexpTest(pattern, value) {
  return REFLECT_APPLY(REGEXP_TEST, pattern, [value]);
}

function setHas(set, value) {
  return REFLECT_APPLY(SET_HAS, set, [value]);
}

function isProxy(value) {
  return REFLECT_APPLY(UTIL_TYPES_IS_PROXY, utilTypes, [value]);
}

function weakMapSet(map, key, value) {
  REFLECT_APPLY(WEAK_MAP_SET, map, [key, value]);
}

function weakMapGet(map, key) {
  return REFLECT_APPLY(WEAK_MAP_GET, map, [key]);
}

export class PomRxPlainDataError extends TypeError {
  constructor(code, message) {
    super(message);
    this.name = 'PomRxPlainDataError';
    this.code = code;
  }
}

function fail(code, message) {
  const error = new PomRxPlainDataError(code, message);
  if (activeCaptureContext !== null) {
    weakMapSet(validationErrorContext, error, activeCaptureContext);
  }
  throw error;
}

function assertLabel(label) {
  if (typeof label !== 'string' || label.length < 1 || label.length > 128) {
    throw new TypeError('plain-data snapshot label must be a non-empty bounded string');
  }
}

function rejectProxy(value, label) {
  if (value && typeof value === 'object' && isProxy(value)) {
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
  objectDefineProperty(output, key, descriptor);
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
  if (ownNames.length !== length + 1) {
    fail('POMRX_DATA_E_ARRAY', `${label} must be a dense undecorated array`);
  }
  let sawLength = false;
  for (const key of ownNames) {
    if (key === 'length') {
      sawLength = true;
      break;
    }
  }
  if (!sawLength) {
    fail('POMRX_DATA_E_ARRAY', `${label} must be a dense undecorated array`);
  }

  const descriptors = objectGetOwnPropertyDescriptors(value);
  const output = [];
  // Establish the same target length as `new Array(length)` without relying on a
  // mutable global constructor. Each accepted index is then defined explicitly
  // through the initialization-time defineProperty intrinsic.
  output.length = length;
  for (let index = 0; index < length; index += 1) {
    const key = String(index);
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
  for (const key of ownNames) {
    if (key.length > REFERENCE_PLAIN_DATA_LIMITS.max_key_length
        || !regexpTest(SAFE_KEY_PATTERN, key)
        || setHas(FORBIDDEN_KEYS, key)) {
      fail('POMRX_DATA_E_KEY', `${label} contains an unsafe key: ${key}`);
    }
    const descriptor = descriptors[key];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail('POMRX_DATA_E_ACCESSOR', `${label}.${key} must be an enumerable data property`);
    }
    // The destination is a fresh null-prototype object and the key has already
    // passed the forbidden-key check, so assignment cannot dispatch through an
    // attacker-controlled prototype setter.
    output[key] = captureValue(descriptor.value, `${label}.${key}`, depth + 1, budget);
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

function runCapture(value, label, returnOutcome) {
  assertLabel(label);
  const context = {};
  const parentContext = activeCaptureContext;
  activeCaptureContext = context;
  try {
    const captured = captureValue(
      value,
      label,
      0,
      { remaining: REFERENCE_PLAIN_DATA_LIMITS.max_nodes },
    );
    if (returnOutcome) {
      return objectFreeze({ ok: true, value: captured, error: null });
    }
    return captured;
  } catch (error) {
    if (weakMapGet(validationErrorContext, error) !== context) {
      throw error;
    }
    if (returnOutcome) {
      return objectFreeze({ ok: false, value: null, error });
    }
    throw error;
  } finally {
    activeCaptureContext = parentContext;
  }
}

export function captureReferencePlainDataOutcome(value, label = 'value') {
  return runCapture(value, label, true);
}

export function captureReferencePlainData(value, label = 'value') {
  return runCapture(value, label, false);
}
