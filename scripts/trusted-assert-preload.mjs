import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { Readable } from 'node:stream';

const SafeError = Error;
const SafeObjectDefineProperty = Object.defineProperty;
const SafeObjectFreeze = Object.freeze;
const SafeObjectGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const SafeObjectGetPrototypeOf = Object.getPrototypeOf;
const SafeObjectIs = Object.is;
const SafeObjectIsFrozen = Object.isFrozen;
const SafeProxy = Proxy;
const SafeReflectApply = Reflect.apply;
const SafeReflectConstruct = Reflect.construct;
const SafeReflectDefineProperty = Reflect.defineProperty;
const SafeReflectGet = Reflect.get;
const SafeReflectOwnKeys = Reflect.ownKeys;
const SafeReflectSet = Reflect.set;
const SafeString = String;
const SafeStringToUpperCase = String.prototype.toUpperCase;

const requiredAssert = createRequire(import.meta.url)('node:assert/strict');
const requiredModule = createRequire(import.meta.url)('node:module');
const trustedRequire = createRequire(import.meta.url);
const protectedBuiltinNames = [
  'node:child_process',
  'node:crypto',
  'node:events',
  'node:fs',
  'node:fs/promises',
  'node:module',
  'node:os',
  'node:path',
  'node:stream',
  'node:test',
  'node:url',
  'node:util',
  'node:v8',
];
const trustedBuiltinEntries = await Promise.all(protectedBuiltinNames.map(async (name) => [
  name,
  trustedRequire(name),
  await import(name),
]));

if (requiredAssert !== assert || assert.strict !== assert) {
  throw new SafeError('trusted strict-assert identity is inconsistent');
}

SafeObjectFreeze(assert);

if (!SafeObjectIsFrozen(assert)) {
  throw new SafeError('trusted strict-assert object did not freeze');
}

function forbidCandidateLoaderRegistration() {
  throw new SafeError('candidate ESM loader registration is forbidden');
}

SafeObjectFreeze(forbidCandidateLoaderRegistration);
for (const property of ['register', 'registerHooks']) {
  const descriptor = SafeObjectGetOwnPropertyDescriptor(requiredModule, property);
  if (descriptor === undefined || typeof descriptor.value !== 'function') {
    throw new SafeError(`trusted module loader API is unavailable: ${property}`);
  }
  SafeObjectDefineProperty(requiredModule, property, {
    value: forbidCandidateLoaderRegistration,
    writable: false,
    enumerable: descriptor.enumerable,
    configurable: false,
  });
}
syncBuiltinESMExports();

function forbiddenEarlyExit(code) {
  throw new SafeError(`candidate-controlled early process exit is forbidden: ${SafeString(code)}`);
}

for (const property of ['exit', 'reallyExit', 'execve']) {
  SafeObjectDefineProperty(process, property, {
    value: forbiddenEarlyExit,
    writable: false,
    enumerable: true,
    configurable: false,
  });
}

for (const [target, property] of [
  [Readable.prototype, 'push'],
  [EventEmitter.prototype, 'emit'],
]) {
  const descriptor = SafeObjectGetOwnPropertyDescriptor(target, property);
  if (descriptor === undefined || typeof descriptor.value !== 'function') {
    throw new SafeError(`trusted lifecycle method is unavailable: ${property}`);
  }
  SafeObjectDefineProperty(target, property, {
    value: descriptor.value,
    writable: false,
    enumerable: descriptor.enumerable,
    configurable: false,
  });
}

SafeObjectDefineProperty(process, 'emit', {
  value: EventEmitter.prototype.emit,
  writable: false,
  enumerable: false,
  configurable: false,
});

const dangerousChildEnvironmentNames = [
  'BASH_ENV',
  'ENV',
  'LD_PRELOAD',
  'NODE_EXTRA_CA_CERTS',
  'NODE_OPTIONS',
  'NODE_PATH',
  'PYTHONPATH',
  'RUBYOPT',
];
const originalEnvironment = process.env;

function isDangerousChildEnvironmentName(property) {
  if (typeof property !== 'string') return false;
  const normalized = SafeReflectApply(SafeStringToUpperCase, property, []);
  for (let index = 0; index < dangerousChildEnvironmentNames.length; index += 1) {
    if (normalized === dangerousChildEnvironmentNames[index]) return true;
  }
  return false;
}

for (const name of dangerousChildEnvironmentNames) delete originalEnvironment[name];
const protectedEnvironment = new SafeProxy(originalEnvironment, {
  set(target, property, value, receiver) {
    if (isDangerousChildEnvironmentName(property)) {
      throw new SafeError(`candidate child environment mutation is forbidden: ${SafeString(property)}`);
    }
    return SafeReflectSet(target, property, value, receiver);
  },
  defineProperty(target, property, descriptor) {
    if (isDangerousChildEnvironmentName(property)) {
      throw new SafeError(`candidate child environment mutation is forbidden: ${SafeString(property)}`);
    }
    return SafeReflectDefineProperty(target, property, descriptor);
  },
  deleteProperty(target, property) {
    if (isDangerousChildEnvironmentName(property)) return false;
    return delete target[property];
  },
});
const environmentDescriptor = SafeObjectGetOwnPropertyDescriptor(process, 'env');
SafeObjectDefineProperty(process, 'env', {
  value: protectedEnvironment,
  writable: false,
  enumerable: environmentDescriptor?.enumerable ?? true,
  configurable: false,
});

const globalBindingNames = [
  'AggregateError',
  'Array',
  'ArrayBuffer',
  'Atomics',
  'BigInt',
  'BigInt64Array',
  'BigUint64Array',
  'Boolean',
  'Buffer',
  'DataView',
  'Date',
  'DOMException',
  'Error',
  'EvalError',
  'FinalizationRegistry',
  'Float32Array',
  'Float64Array',
  'Function',
  'Int8Array',
  'Int16Array',
  'Int32Array',
  'Intl',
  'JSON',
  'Map',
  'Math',
  'Number',
  'Object',
  'Promise',
  'Proxy',
  'RangeError',
  'ReferenceError',
  'Reflect',
  'RegExp',
  'Set',
  'SharedArrayBuffer',
  'String',
  'Symbol',
  'SyntaxError',
  'TypeError',
  'URIError',
  'URL',
  'URLSearchParams',
  'Uint8Array',
  'Uint8ClampedArray',
  'Uint16Array',
  'Uint32Array',
  'WeakMap',
  'WeakRef',
  'WeakSet',
  'WebAssembly',
  'TextDecoder',
  'TextEncoder',
  'decodeURI',
  'decodeURIComponent',
  'encodeURI',
  'encodeURIComponent',
  'eval',
  'isFinite',
  'isNaN',
  'parseFloat',
  'parseInt',
  'process',
  'queueMicrotask',
  'setImmediate',
  'setInterval',
  'setTimeout',
];

function captureDescriptor(target, property) {
  const descriptor = SafeObjectGetOwnPropertyDescriptor(target, property);
  if (descriptor === undefined) return undefined;
  return {
    configurable: descriptor.configurable,
    enumerable: descriptor.enumerable,
    writable: descriptor.writable,
    value: descriptor.value,
    get: descriptor.get,
    set: descriptor.set,
  };
}

function sameDescriptor(left, right) {
  return left?.configurable === right?.configurable
    && left?.enumerable === right?.enumerable
    && left?.writable === right?.writable
    && SafeObjectIs(left?.value, right?.value)
    && left?.get === right?.get
    && left?.set === right?.set;
}

const globalBindings = globalBindingNames.map((name) => [
  name,
  captureDescriptor(globalThis, name),
]);
const trustedArrayPrototypeLength = captureDescriptor(Array.prototype, 'length');

const primordialTargets = [];
const seenTargets = new Set();

function addTarget(label, target) {
  if ((typeof target !== 'object' || target === null) && typeof target !== 'function') return;
  if (seenTargets.has(target)) return;
  seenTargets.add(target);
  primordialTargets.push({
    label,
    target,
    descriptors: SafeReflectOwnKeys(target).map((property) => [
      property,
      captureDescriptor(target, property),
    ]),
  });
}

for (const name of globalBindingNames) {
  if (name === 'process') continue;
  const target = globalThis[name];
  addTarget(name, target);
  addTarget(`${name}.prototype`, target?.prototype);
}

addTarget('%ArrayIteratorPrototype%', SafeObjectGetPrototypeOf([][Symbol.iterator]()));
addTarget('%MapIteratorPrototype%', SafeObjectGetPrototypeOf(new Map()[Symbol.iterator]()));
addTarget('%SetIteratorPrototype%', SafeObjectGetPrototypeOf(new Set()[Symbol.iterator]()));
addTarget('%StringIteratorPrototype%', SafeObjectGetPrototypeOf(''[Symbol.iterator]()));
addTarget('%TypedArrayPrototype%', SafeObjectGetPrototypeOf(Uint8Array.prototype));

for (const [name, commonJsExports, esmNamespace] of trustedBuiltinEntries) {
  addTarget(`builtin-cjs:${name}`, commonJsExports);
  addTarget(`builtin-esm:${name}`, esmNamespace);
  if (name === 'node:util') addTarget('builtin-cjs:node:util.types', commonJsExports.types);
}

export function verifyTrustedPrimordials() {
  for (let bindingIndex = 0; bindingIndex < globalBindings.length; bindingIndex += 1) {
    const [name, expected] = globalBindings[bindingIndex];
    const actual = captureDescriptor(globalThis, name);
    if (!sameDescriptor(actual, expected)) {
      throw new SafeError(`candidate initialization changed global binding: ${name}`);
    }
  }

  for (let targetIndex = 0; targetIndex < primordialTargets.length; targetIndex += 1) {
    const { label, target, descriptors } = primordialTargets[targetIndex];
    const actualKeys = SafeReflectOwnKeys(target);
    if (actualKeys.length !== descriptors.length) {
      throw new SafeError(`candidate initialization changed primordial keys: ${label}`);
    }
    for (let index = 0; index < descriptors.length; index += 1) {
      const [expectedKey, expectedDescriptor] = descriptors[index];
      if (actualKeys[index] !== expectedKey) {
        throw new SafeError(`candidate initialization changed primordial key order: ${label}`);
      }
      const actualDescriptor = captureDescriptor(target, expectedKey);
      if (!sameDescriptor(actualDescriptor, expectedDescriptor)) {
        throw new SafeError(
          `candidate initialization changed primordial descriptor: ${label}.${SafeString(expectedKey)}`,
        );
      }
    }
  }
}

SafeObjectFreeze(verifyTrustedPrimordials);

export function verifyTrustedPrimordialsAfterTest() {
  const currentLength = captureDescriptor(Array.prototype, 'length');
  if (
    currentLength
    && trustedArrayPrototypeLength
    && currentLength.value !== trustedArrayPrototypeLength.value
    && currentLength.configurable === trustedArrayPrototypeLength.configurable
    && currentLength.enumerable === trustedArrayPrototypeLength.enumerable
    && currentLength.writable === trustedArrayPrototypeLength.writable
  ) {
    SafeObjectDefineProperty(Array.prototype, 'length', {
      value: trustedArrayPrototypeLength.value,
      writable: trustedArrayPrototypeLength.writable,
      enumerable: trustedArrayPrototypeLength.enumerable,
      configurable: trustedArrayPrototypeLength.configurable,
    });
  }
  verifyTrustedPrimordials();
}

SafeObjectFreeze(verifyTrustedPrimordialsAfterTest);

function createTrustedFacade(target) {
  const descriptors = SafeReflectOwnKeys(target).map((property) => [
    property,
    captureDescriptor(target, property),
  ]);
  let facade;
  facade = new SafeProxy(target, {
    get(_target, property, receiver) {
      for (let index = 0; index < descriptors.length; index += 1) {
        const [capturedProperty, descriptor] = descriptors[index];
        if (capturedProperty !== property) continue;
        if ('value' in descriptor) return descriptor.value;
        if (descriptor.get === undefined) return undefined;
        return SafeReflectApply(descriptor.get, receiver === facade ? target : receiver, []);
      }
      return SafeReflectGet(target, property, receiver === facade ? target : receiver);
    },
    set(_target, property, value) {
      return SafeReflectSet(target, property, value, target);
    },
    defineProperty(_target, property, descriptor) {
      return SafeReflectDefineProperty(target, property, descriptor);
    },
    apply(_target, thisArgument, argumentsList) {
      return SafeReflectApply(target, thisArgument, argumentsList);
    },
    construct(_target, argumentsList, newTarget) {
      return SafeReflectConstruct(target, argumentsList, newTarget === facade ? target : newTarget);
    },
  });
  return facade;
}

const facadeNames = [
  'AggregateError',
  'Array',
  'ArrayBuffer',
  'Atomics',
  'BigInt',
  'BigInt64Array',
  'BigUint64Array',
  'Boolean',
  'Buffer',
  'DataView',
  'Date',
  'DOMException',
  'Error',
  'EvalError',
  'FinalizationRegistry',
  'Float32Array',
  'Float64Array',
  'Function',
  'Int8Array',
  'Int16Array',
  'Int32Array',
  'Intl',
  'JSON',
  'Map',
  'Math',
  'Number',
  'Object',
  'Promise',
  'Proxy',
  'RangeError',
  'ReferenceError',
  'Reflect',
  'RegExp',
  'Set',
  'SharedArrayBuffer',
  'String',
  'Symbol',
  'SyntaxError',
  'TextDecoder',
  'TextEncoder',
  'TypeError',
  'URIError',
  'URL',
  'URLSearchParams',
  'Uint8Array',
  'Uint8ClampedArray',
  'Uint16Array',
  'Uint32Array',
  'WeakMap',
  'WeakRef',
  'WeakSet',
  'WebAssembly',
];
const directNames = [
  'decodeURI',
  'decodeURIComponent',
  'encodeURI',
  'encodeURIComponent',
  'isFinite',
  'isNaN',
  'parseFloat',
  'parseInt',
  'queueMicrotask',
  'setImmediate',
  'setInterval',
  'setTimeout',
];

const trustedTestPrimordialEntries = [];
for (const name of facadeNames) {
  const target = globalThis[name];
  if (target !== undefined) trustedTestPrimordialEntries.push([name, createTrustedFacade(target)]);
}
for (const name of directNames) {
  const target = globalThis[name];
  if (target !== undefined) trustedTestPrimordialEntries.push([name, target]);
}

export const trustedTestPrimordials = SafeObjectFreeze(
  Object.fromEntries(trustedTestPrimordialEntries),
);
