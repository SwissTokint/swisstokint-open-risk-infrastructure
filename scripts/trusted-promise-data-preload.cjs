'use strict';

// Application-owned --require preload, before --frozen-intrinsics runs.
// Preserve native data properties instead of trusting Node's later accessor
// wrappers. This module neither registers a runtime profile nor grants trust
// to callers; the transport independently validates its runtime at import/use.
const { runInNewContext } = require('node:vm');
const { types } = require('node:util');
const pristine = runInNewContext(`(() => {
  const descriptor = Object.getOwnPropertyDescriptor;
  return {
    apply: Reflect.apply,
    descriptor,
    prototypeOf: Object.getPrototypeOf,
    define: Object.defineProperty,
    hasOwn: Object.hasOwn,
    source: Function.prototype.toString,
    Error,
    promiseSource: Function.prototype.toString.call(Promise),
    thenSource: Function.prototype.toString.call(Promise.prototype.then),
    global: descriptor(globalThis, 'Promise'),
    prototype: descriptor(Promise, 'prototype'),
  };
})()`);
const isProxy = types.isProxy;
const fail = () => {
  throw new pristine.Error('trusted Promise data preload requires native data properties before Node freezing');
};
const source = (value) => pristine.apply(pristine.source, value, []);
const own = (value, key) => pristine.hasOwn(value, key);

function dataShape(descriptor, writable, configurable) {
  return descriptor !== undefined
    && own(descriptor, 'value') && own(descriptor, 'writable')
    && !own(descriptor, 'get') && !own(descriptor, 'set')
    && descriptor.enumerable === false
    && descriptor.writable === writable
    && descriptor.configurable === configurable;
}

const globalDescriptor = pristine.descriptor(globalThis, 'Promise');
if (!dataShape(globalDescriptor, pristine.global.writable, pristine.global.configurable)) fail();
const constructor = globalDescriptor.value;
if (typeof constructor !== 'function' || isProxy(constructor)
    || source(constructor) !== pristine.promiseSource) fail();

async function nativePromiseProbe() {}
const prototype = pristine.prototypeOf(nativePromiseProbe());
const prototypeDescriptor = pristine.descriptor(constructor, 'prototype');
if (!dataShape(prototypeDescriptor, pristine.prototype.writable, pristine.prototype.configurable)
    || prototypeDescriptor.value !== prototype) fail();

const constructorDescriptor = pristine.descriptor(prototype, 'constructor');
const thenDescriptor = pristine.descriptor(prototype, 'then');
const ordinary = dataShape(constructorDescriptor, true, true) && dataShape(thenDescriptor, true, true);
const pinned = dataShape(constructorDescriptor, false, false) && dataShape(thenDescriptor, false, false);
if ((!ordinary && !pinned) || constructorDescriptor.value !== constructor
    || typeof thenDescriptor.value !== 'function' || isProxy(thenDescriptor.value)
    || source(thenDescriptor.value) !== pristine.thenSource) fail();

// Validate the complete pair before either irreversible write. Null-prototype
// records keep descriptor conversion independent of inherited fields.
pristine.define(prototype, 'constructor', {
  __proto__: null,
  value: constructorDescriptor.value,
  writable: false,
  enumerable: false,
  configurable: false,
});
pristine.define(prototype, 'then', {
  __proto__: null,
  value: thenDescriptor.value,
  writable: false,
  enumerable: false,
  configurable: false,
});
