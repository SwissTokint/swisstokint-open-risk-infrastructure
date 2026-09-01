from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"expected exactly one match in {path}, found {count}: {old[:100]!r}")
    p.write_text(text.replace(old, new, 1))


# P1-A: the direct native Promise returned by executeDownstream must not cross
# await with a mutable inherited constructor/then channel.
replace_once(
    'core/gate/reference-single-use-gate.mjs',
    'const UTIL_TYPES_IS_PROXY = utilTypes.isProxy;\n',
    'const UTIL_TYPES_IS_PROXY = utilTypes.isProxy;\n'
    'const UTIL_TYPES_IS_PROMISE = utilTypes.isPromise;\n'
    'const PROMISE_CONSTRUCTOR = Promise;\n'
    'const PROMISE_THEN = Promise.prototype.then;\n',
)
replace_once(
    'core/gate/reference-single-use-gate.mjs',
    "function isProxy(value) {\n  return REFLECT_APPLY(UTIL_TYPES_IS_PROXY, utilTypes, [value]);\n}\n",
    "function isProxy(value) {\n  return REFLECT_APPLY(UTIL_TYPES_IS_PROXY, utilTypes, [value]);\n}\n\n"
    "function isPromise(value) {\n  return REFLECT_APPLY(UTIL_TYPES_IS_PROMISE, utilTypes, [value]);\n}\n",
)
replace_once(
    'core/gate/reference-single-use-gate.mjs',
    "function stringEndsWith(value, suffix) {\n  return REFLECT_APPLY(STRING_ENDS_WITH, value, [suffix]);\n}\n\nfunction exactSortedKeys(value) {",
    "function stringEndsWith(value, suffix) {\n  return REFLECT_APPLY(STRING_ENDS_WITH, value, [suffix]);\n}\n\n"
    "function makePromiseDescriptor(value) {\n"
    "  const descriptor = createObject(null);\n"
    "  descriptor.value = value;\n"
    "  descriptor.enumerable = false;\n"
    "  descriptor.writable = false;\n"
    "  descriptor.configurable = false;\n"
    "  return freezeValue(descriptor);\n"
    "}\n\n"
    "const PROMISE_OWN_CONSTRUCTOR_DESCRIPTOR = makePromiseDescriptor(PROMISE_CONSTRUCTOR);\n"
    "const PROMISE_OWN_THEN_DESCRIPTOR = makePromiseDescriptor(PROMISE_THEN);\n\n"
    "function stabilizeDownstreamPromise(value) {\n"
    "  if (!isPromise(value)) return value;\n"
    "  objectDefineProperty(value, 'constructor', PROMISE_OWN_CONSTRUCTOR_DESCRIPTOR);\n"
    "  objectDefineProperty(value, 'then', PROMISE_OWN_THEN_DESCRIPTOR);\n"
    "  return value;\n"
    "}\n\n"
    "function exactSortedKeys(value) {",
)
replace_once(
    'core/gate/reference-single-use-gate.mjs',
    '      resolvedResult = await downstreamResult;\n',
    '      resolvedResult = await stabilizeDownstreamPromise(downstreamResult);\n',
)

# P1-B: an exposed composed Promise must not delegate direct `.then()` result
# construction to mutable Promise[Symbol.species]. Keep constructor=Promise for
# Await direct-adoption, but provide a Core-owned chaining function on promises
# created at this boundary. Already-hardened inner/store promises retain their
# captured native then slot and are accepted as trusted internal channels.
old_promise_block = """function makePromiseDescriptor(value) {
  const descriptor = createObject(null);
  descriptor.value = value;
  descriptor.enumerable = false;
  descriptor.writable = false;
  descriptor.configurable = false;
  return freezeValue(descriptor);
}

const PROMISE_OWN_CONSTRUCTOR_DESCRIPTOR = makePromiseDescriptor(PROMISE_CONSTRUCTOR);
const PROMISE_OWN_THEN_DESCRIPTOR = makePromiseDescriptor(PROMISE_THEN);

function stabilizePromise(promise) {
  // Await uses PromiseResolve(%Promise%, value). An immutable own constructor
  // equal to the captured intrinsic makes that operation return this native
  // Promise directly instead of consulting a mutable inherited `.then`. The own
  // captured `.then` also protects direct consumer chaining after module import.
  objectDefineProperty(promise, 'constructor', PROMISE_OWN_CONSTRUCTOR_DESCRIPTOR);
  objectDefineProperty(promise, 'then', PROMISE_OWN_THEN_DESCRIPTOR);
  return promise;
}
"""
new_promise_block = """function makePromiseDescriptor(value) {
  const descriptor = createObject(null);
  descriptor.value = value;
  descriptor.enumerable = false;
  descriptor.writable = false;
  descriptor.configurable = false;
  return freezeValue(descriptor);
}

const PROMISE_OWN_CONSTRUCTOR_DESCRIPTOR = makePromiseDescriptor(PROMISE_CONSTRUCTOR);

function stablePromiseThen(onFulfilled, onRejected) {
  const source = this;
  return stabilizePromise(new PROMISE_CONSTRUCTOR((resolve, reject) => {
    void (async () => {
      try {
        const value = await source;
        if (typeof onFulfilled === 'function') resolve(onFulfilled(value));
        else resolve(value);
      } catch (error) {
        if (typeof onRejected === 'function') {
          try {
            resolve(onRejected(error));
          } catch (callbackError) {
            reject(callbackError);
          }
        } else {
          reject(error);
        }
      }
    })();
  }));
}

const PROMISE_OWN_SAFE_THEN_DESCRIPTOR = makePromiseDescriptor(stablePromiseThen);

function stabilizePromise(promise) {
  // Await uses PromiseResolve(%Promise%, value). Pinning constructor=%Promise%
  // preserves direct adoption without consulting inherited then. Public promises
  // created by this boundary also receive a Core-owned then implementation that
  // constructs its result with the captured Promise directly, so mutable
  // Promise[Symbol.species] cannot rewrite a successful exposed chain.
  const descriptors = objectGetOwnPropertyDescriptors(promise);
  if (!objectHasOwn(descriptors, 'constructor')) {
    objectDefineProperty(promise, 'constructor', PROMISE_OWN_CONSTRUCTOR_DESCRIPTOR);
  } else if (descriptors.constructor.value !== PROMISE_CONSTRUCTOR) {
    throw new TypeError('Reference durable Gate Promise constructor channel is invalid');
  }

  if (!objectHasOwn(descriptors, 'then')) {
    objectDefineProperty(promise, 'then', PROMISE_OWN_SAFE_THEN_DESCRIPTOR);
  } else if (descriptors.then.value !== PROMISE_THEN
      && descriptors.then.value !== stablePromiseThen) {
    throw new TypeError('Reference durable Gate Promise then channel is invalid');
  }
  return promise;
}
"""
replace_once(
    'core/gate/reference-durable-single-use-gate.mjs',
    old_promise_block,
    new_promise_block,
)

# P2-C: an expected authorization field must have an own descriptor. Merely
# matching the own-name count cannot allow an inherited descriptor-shaped value
# to stand in for a missing expected field.
replace_once(
    'core/authorization/reference-exact-authorization.mjs',
    "    const descriptor = descriptors[key];\n    if (!isOwnEnumerableDataDescriptor(descriptor)) {\n",
    "    const descriptor = descriptors[key];\n    if (!objectHasOwn(descriptors, key) || !isOwnEnumerableDataDescriptor(descriptor)) {\n",
)
