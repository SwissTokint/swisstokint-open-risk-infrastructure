import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

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

const requiredAssert = createRequire(import.meta.url)('node:assert/strict');

if (requiredAssert !== assert || assert.strict !== assert) {
  throw new SafeError('trusted strict-assert identity is inconsistent');
}

SafeObjectFreeze(assert);

if (!SafeObjectIsFrozen(assert)) {
  throw new SafeError('trusted strict-assert object did not freeze');
}

function forbiddenEarlyExit(code) {
  throw new SafeError(`candidate-controlled early process exit is forbidden: ${SafeString(code)}`);
}

for (const property of ['exit', 'reallyExit']) {
  SafeObjectDefineProperty(process, property, {
    value: forbiddenEarlyExit,
    writable: false,
    enumerable: true,
    configurable: false,
  });
}

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
