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

// Plain-data snapshots are reused by authorization, Gate and application
// reference paths as an exact inert-data boundary. Capture every load-bearing
// intrinsic at module initialization so later same-realm mutation cannot hide
// caller-owned fields, reclassify arrays/Proxies, redirect null-prototype output,
// weaken key/number checks, or leave a supposedly frozen snapshot mutable.
// Captured arrays are additionally detached from the mutable shared
// Array.prototype onto a frozen method-only prototype assembled at module
// initialization, so implicit iteration and ordinary Array-method lookup do not
// re-enter a later-poisoned global Array prototype. Poisoning before module
// initialization remains outside this reference guarantee.
const REFLECT_APPLY = Reflect.apply;
const ARRAY_CONSTRUCTOR = Array;
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
const OBJECT_PROTOTYPE = Object.prototype;
const OBJECT_SET_PROTOTYPE_OF = Object.setPrototypeOf;
const REGEXP_EXEC = RegExp.prototype.exec;
const SET_HAS = Set.prototype.has;
const UTIL_TYPES_IS_PROXY = utilTypes.isProxy;

function createImmutableArraySnapshotPrototype() {
  const prototype = REFLECT_APPLY(OBJECT_CREATE, Object, [null]);
  const names = REFLECT_APPLY(
    OBJECT_GET_OWN_PROPERTY_NAMES,
    Object,
    [ARRAY_PROTOTYPE],
  );

  // Copy only callable built-ins. In particular, do not copy `constructor` or
  // Symbol.unscopables: species construction should fall back to the intrinsic
  // Array path instead of consulting mutable constructor state, and unscopables
  // is not data traversal behavior.
  for (let index = 0; index < names.length; index += 1) {
    const key = names[index];
    if (key === 'length' || key === 'constructor') continue;
    const sourceDescriptor = REFLECT_APPLY(
      OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
      Object,
      [ARRAY_PROTOTYPE, key],
    );
    if (!sourceDescriptor
        || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [sourceDescriptor, 'value'])
        || typeof sourceDescriptor.value !== 'function') {
      continue;
    }

    const descriptor = REFLECT_APPLY(OBJECT_CREATE, Object, [null]);
    descriptor.value = sourceDescriptor.value;
    descriptor.enumerable = false;
    descriptor.writable = false;
    descriptor.configurable = false;
    REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [prototype, key, descriptor]);
  }

  const symbols = REFLECT_APPLY(
    OBJECT_GET_OWN_PROPERTY_SYMBOLS,
    Object,
    [ARRAY_PROTOTYPE],
  );
  for (let index = 0; index < symbols.length; index += 1) {
    const key = symbols[index];
    const sourceDescriptor = REFLECT_APPLY(
      OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
      Object,
      [ARRAY_PROTOTYPE, key],
    );
    if (!sourceDescriptor
        || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [sourceDescriptor, 'value'])
        || typeof sourceDescriptor.value !== 'function') {
      continue;
    }

    const descriptor = REFLECT_APPLY(OBJECT_CREATE, Object, [null]);
    descriptor.value = sourceDescriptor.value;
    descriptor.enumerable = false;
    descriptor.writable = false;
    descriptor.configurable = false;
    REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [prototype, key, descriptor]);
  }

  return REFLECT_APPLY(OBJECT_FREEZE, Object, [prototype]);
}

const SNAPSHOT_ARRAY_PROTOTYPE = createImmutableArraySnapshotPrototype();

function arrayIsArray(value) {
  return REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value]);
}

function numberIsSafeInteger(value) {
  return REFLECT_APPLY(NUMBER_IS_SAFE_INTEGER, Number, [value]);
}

function objectCreate(prototype) {
  return REFLECT_APPLY(OBJECT_CREATE, Object, [prototype]);
}

function objectDefineProperty(target, key, descriptor) {
  return REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [target, key, descriptor]);
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

function objectSetPrototypeOf(value, prototype) {
  return REFLECT_APPLY(OBJECT_SET_PROTOTYPE_OF, Object, [value, prototype]);
}

function regexpMatches(expression, value) {
  return REFLECT_APPLY(REGEXP_EXEC, expression, [value]) !== null;
}

function setHas(set, value) {
  return REFLECT_APPLY(SET_HAS, set, [value]);
}

function isProxy(value) {
  return REFLECT_APPLY(UTIL_TYPES_IS_PROXY, utilTypes, [value]);
}

function hasName(names, wanted) {
  for (let index = 0; index < names.length; index += 1) {
    if (names[index] === wanted) return true;
  }
  return false;
}

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
  if (value && typeof value === 'object' && isProxy(value)) {
    fail('POMRX_DATA_E_PROXY', `${label} cannot be a Proxy`);
  }
}

function isOwnDataDescriptor(descriptor) {
  return descriptor !== null
    && descriptor !== undefined
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
  if (ownNames.length !== length + 1 || !hasName(ownNames, 'length')) {
    fail('POMRX_DATA_E_ARRAY', `${label} must be a dense undecorated array`);
  }

  const descriptors = objectGetOwnPropertyDescriptors(value);
  const output = new ARRAY_CONSTRUCTOR(length);
  objectSetPrototypeOf(output, SNAPSHOT_ARRAY_PROTOTYPE);
  for (let index = 0; index < length; index += 1) {
    const key = `${index}`;
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
        || !regexpMatches(SAFE_KEY_PATTERN, key)
        || setHas(FORBIDDEN_KEYS, key)) {
      fail('POMRX_DATA_E_KEY', `${label} contains an unsafe key: ${key}`);
    }
    const descriptor = descriptors[key];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail('POMRX_DATA_E_ACCESSOR', `${label}.${key} must be an enumerable data property`);
    }
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

export function captureReferencePlainData(value, label = 'value') {
  assertLabel(label);
  return captureValue(value, label, 0, { remaining: REFERENCE_PLAIN_DATA_LIMITS.max_nodes });
}
