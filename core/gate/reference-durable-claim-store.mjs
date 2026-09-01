import {
  ChildProcess,
  fork as forkChildProcess,
} from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';
import { types as utilTypes } from 'node:util';

export const POM_RX_DURABLE_CLAIM_SCHEMA_VERSION = 'pom-rx-durable-claim/0.1';
export const POM_RX_DURABLE_TERMINAL_SCHEMA_VERSION = 'pom-rx-durable-terminal/0.1';

const BOOTSTRAP_KEYS = Object.freeze(['rootDir']);
const BOOTSTRAP_SORTED_KEYS = Object.freeze(['rootDir']);
const INSPECT_KEYS = Object.freeze(['capabilityId', 'authorizationCommitment']);
const INSPECT_SORTED_KEYS = Object.freeze(['authorizationCommitment', 'capabilityId']);
const IPC_SCHEMA = 'pom-rx-durable-owner-ipc/0.1';
const OWNER_MODULE = fileURLToPath(
  new URL('./reference-durable-claim-store-owner.mjs', import.meta.url),
);

// The parent process deliberately owns no authoritative durable-root or
// claim-directory descriptor. The reference implementation runs in a dedicated
// child process with a separate descriptor table and is reached only through a
// bounded, captured IPC surface. This closes the same-inode fd-reuse ownership
// gap: same-realm code in the parent cannot close/reuse a child-owned fd number.
// The child contains no caller callbacks or application/token semantics.
const REFLECT_APPLY = Reflect.apply;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_SORT = Array.prototype.sort;
const CHILD_FORK = forkChildProcess;
const CHILD_SEND = ChildProcess.prototype.send;
const CHILD_KILL = ChildProcess.prototype.kill;
const CHILD_DISCONNECT = ChildProcess.prototype.disconnect;
const CHILD_UNREF = ChildProcess.prototype.unref;
const EVENT_ON = EventEmitter.prototype.on;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_OWN_PROPERTY_NAMES = Object.getOwnPropertyNames;
const OBJECT_GET_OWN_PROPERTY_SYMBOLS = Object.getOwnPropertySymbols;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_PROTOTYPE = Object.prototype;
const PROMISE_CONSTRUCTOR = Promise;
const PROMISE_THEN = Promise.prototype.then;
const PROMISE_CATCH = Promise.prototype.catch;
const PROMISE_FINALLY = Promise.prototype.finally;
const PROMISE_SPECIES_KEY = Symbol.species;
const MAP_CONSTRUCTOR = Map;
const MAP_GET = Map.prototype.get;
const MAP_SET = Map.prototype.set;
const MAP_DELETE = Map.prototype.delete;
const MAP_FOR_EACH = Map.prototype.forEach;
const WEAK_MAP_CONSTRUCTOR = WeakMap;
const WEAK_MAP_GET = WeakMap.prototype.get;
const WEAK_MAP_SET = WeakMap.prototype.set;
const UTIL_TYPES_IS_PROXY = utilTypes.isProxy;
const CRYPTO_RANDOM_UUID = randomUUID;

function createObject(prototype) {
  return REFLECT_APPLY(OBJECT_CREATE, Object, [prototype]);
}

function freezeValue(value) {
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function defineData(target, key, value, enumerable = true) {
  const descriptor = createObject(null);
  descriptor.value = value;
  descriptor.configurable = false;
  descriptor.enumerable = enumerable;
  descriptor.writable = false;
  REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [target, key, descriptor]);
}

function makePromiseDescriptor(value) {
  const descriptor = createObject(null);
  descriptor.value = value;
  descriptor.configurable = false;
  descriptor.enumerable = false;
  descriptor.writable = false;
  return freezeValue(descriptor);
}

function makePromiseSpeciesCarrier() {
  const carrier = createObject(null);
  REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [
    carrier,
    PROMISE_SPECIES_KEY,
    makePromiseDescriptor(PROMISE_CONSTRUCTOR),
  ]);
  return freezeValue(carrier);
}

const PROMISE_SPECIES_CARRIER = makePromiseSpeciesCarrier();
const PROMISE_OWN_CONSTRUCTOR_DESCRIPTOR = makePromiseDescriptor(PROMISE_SPECIES_CARRIER);
const PROMISE_OWN_THEN_DESCRIPTOR = makePromiseDescriptor(PROMISE_THEN);
const PROMISE_OWN_CATCH_DESCRIPTOR = makePromiseDescriptor(PROMISE_CATCH);
const PROMISE_OWN_FINALLY_DESCRIPTOR = makePromiseDescriptor(PROMISE_FINALLY);

function stabilizePromise(promise) {
  REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [
    promise,
    'constructor',
    PROMISE_OWN_CONSTRUCTOR_DESCRIPTOR,
  ]);
  REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [
    promise,
    'then',
    PROMISE_OWN_THEN_DESCRIPTOR,
  ]);
  REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [
    promise,
    'catch',
    PROMISE_OWN_CATCH_DESCRIPTOR,
  ]);
  REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [
    promise,
    'finally',
    PROMISE_OWN_FINALLY_DESCRIPTOR,
  ]);
  return promise;
}

function mapGet(map, key) {
  return REFLECT_APPLY(MAP_GET, map, [key]);
}

function mapSet(map, key, value) {
  REFLECT_APPLY(MAP_SET, map, [key, value]);
}

function mapDelete(map, key) {
  REFLECT_APPLY(MAP_DELETE, map, [key]);
}

function mapForEach(map, callback) {
  REFLECT_APPLY(MAP_FOR_EACH, map, [callback]);
}

function weakMapGet(map, key) {
  return REFLECT_APPLY(WEAK_MAP_GET, map, [key]);
}

function weakMapSet(map, key, value) {
  REFLECT_APPLY(WEAK_MAP_SET, map, [key, value]);
}

function objectHasOwn(value, key) {
  return REFLECT_APPLY(OBJECT_HAS_OWN, Object, [value, key]);
}

function objectGetPrototypeOf(value) {
  return REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]);
}

function objectGetOwnPropertyNames(value) {
  return REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_NAMES, Object, [value]);
}

function objectGetOwnPropertySymbols(value) {
  return REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_SYMBOLS, Object, [value]);
}

function objectGetOwnPropertyDescriptors(value) {
  return REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
}

function isProxy(value) {
  return REFLECT_APPLY(UTIL_TYPES_IS_PROXY, utilTypes, [value]);
}

function arrayIsArray(value) {
  return REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value]);
}

function sortArray(value) {
  return REFLECT_APPLY(ARRAY_SORT, value, []);
}

function sameSortedKeys(actual, wanted) {
  if (actual.length !== wanted.length) return false;
  for (let index = 0; index < actual.length; index += 1) {
    if (actual[index] !== wanted[index]) return false;
  }
  return true;
}

function isOwnEnumerableDataDescriptor(descriptor) {
  return Boolean(descriptor)
    && objectHasOwn(descriptor, 'value')
    && objectHasOwn(descriptor, 'enumerable')
    && descriptor.enumerable === true
    && !objectHasOwn(descriptor, 'get')
    && !objectHasOwn(descriptor, 'set');
}

export class PomRxDurableClaimStoreError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PomRxDurableClaimStoreError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new PomRxDurableClaimStoreError(code, message);
}

function exactOwnData(value, expectedKeys, expectedSortedKeys, label) {
  if (!value
      || typeof value !== 'object'
      || isProxy(value)
      || arrayIsArray(value)
      || objectGetPrototypeOf(value) !== OBJECT_PROTOTYPE
      || objectGetOwnPropertySymbols(value).length !== 0) {
    fail('POMRX_GATE_E_DURABLE_INVALID', `${label} must be a non-Proxy plain object`);
  }
  const actual = sortArray(objectGetOwnPropertyNames(value));
  if (!sameSortedKeys(actual, expectedSortedKeys)) {
    fail('POMRX_GATE_E_DURABLE_INVALID', `${label} has missing, hidden or unknown fields`);
  }
  const descriptors = objectGetOwnPropertyDescriptors(value);
  const output = createObject(null);
  for (let index = 0; index < expectedKeys.length; index += 1) {
    const key = expectedKeys[index];
    const descriptor = descriptors[key];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail('POMRX_GATE_E_DURABLE_INVALID', `${label}.${key} must be an enumerable data property`);
    }
    defineData(output, key, descriptor.value);
  }
  return freezeValue(output);
}

function captureWireValue(value, depth = 0) {
  if (depth > 12) {
    fail('POMRX_GATE_E_DURABLE_IO', 'durable owner IPC response exceeds nesting bound');
  }
  if (value === null
      || typeof value === 'string'
      || typeof value === 'boolean'
      || (typeof value === 'number' && Number.isFinite(value))) {
    return value;
  }
  if (!value || typeof value !== 'object' || isProxy(value)) {
    fail('POMRX_GATE_E_DURABLE_IO', 'durable owner IPC response contains unsupported data');
  }

  if (arrayIsArray(value)) {
    const descriptors = objectGetOwnPropertyDescriptors(value);
    const lengthDescriptor = descriptors.length;
    if (!lengthDescriptor || !objectHasOwn(lengthDescriptor, 'value')) {
      fail('POMRX_GATE_E_DURABLE_IO', 'durable owner IPC array has invalid length');
    }
    const length = lengthDescriptor.value;
    if (!Number.isSafeInteger(length) || length < 0 || length > 4096) {
      fail('POMRX_GATE_E_DURABLE_IO', 'durable owner IPC array exceeds bounds');
    }
    const output = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[index];
      if (!isOwnEnumerableDataDescriptor(descriptor)) {
        fail('POMRX_GATE_E_DURABLE_IO', 'durable owner IPC array must be dense own data');
      }
      defineData(output, index, captureWireValue(descriptor.value, depth + 1));
    }
    return freezeValue(output);
  }

  const prototype = objectGetPrototypeOf(value);
  if ((prototype !== OBJECT_PROTOTYPE && prototype !== null)
      || objectGetOwnPropertySymbols(value).length !== 0) {
    fail('POMRX_GATE_E_DURABLE_IO', 'durable owner IPC response must be plain data');
  }
  const names = objectGetOwnPropertyNames(value);
  if (names.length > 128) {
    fail('POMRX_GATE_E_DURABLE_IO', 'durable owner IPC response has too many fields');
  }
  const descriptors = objectGetOwnPropertyDescriptors(value);
  const output = createObject(null);
  for (let index = 0; index < names.length; index += 1) {
    const key = names[index];
    const descriptor = descriptors[key];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail('POMRX_GATE_E_DURABLE_IO', 'durable owner IPC response contains accessors');
    }
    defineData(output, key, captureWireValue(descriptor.value, depth + 1));
  }
  return freezeValue(output);
}

function makeWireMessage(id, command, payload) {
  const message = createObject(null);
  defineData(message, 'schema', IPC_SCHEMA);
  defineData(message, 'id', id);
  defineData(message, 'command', command);
  defineData(message, 'payload', payload);
  return freezeValue(message);
}

function makeWireInput(captured) {
  const output = createObject(null);
  defineData(output, 'capabilityId', captured.capabilityId);
  defineData(output, 'authorizationCommitment', captured.authorizationCommitment);
  return freezeValue(output);
}

export function createReferenceDurableClaimStore(options) {
  const bootstrap = exactOwnData(
    options,
    BOOTSTRAP_KEYS,
    BOOTSTRAP_SORTED_KEYS,
    'durable claim store bootstrap',
  );
  if (typeof bootstrap.rootDir !== 'string'
      || bootstrap.rootDir.length < 2
      || bootstrap.rootDir.length > 4096) {
    fail('POMRX_GATE_E_DURABLE_INVALID', 'rootDir must be a bounded absolute path');
  }

  const child = REFLECT_APPLY(CHILD_FORK, undefined, [
    OWNER_MODULE,
    [],
    {
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      serialization: 'advanced',
      execArgv: [],
    },
  ]);
  const childChannel = child.channel;
  if (!childChannel
      || typeof childChannel.ref !== 'function'
      || typeof childChannel.unref !== 'function') {
    try {
      REFLECT_APPLY(CHILD_KILL, child, []);
    } catch {
      // Best-effort cleanup on bootstrap failure.
    }
    fail('POMRX_GATE_E_DURABLE_IO', 'durable owner IPC channel is unavailable');
  }
  const CHANNEL_REF = childChannel.ref;
  const CHANNEL_UNREF = childChannel.unref;
  // Idle stores must not keep a process alive merely because the durable owner
  // exists. Each request temporarily refs the IPC channel until its matching
  // response (or send failure) settles; the child process handle itself remains
  // unrefed. This preserves request liveness while avoiding a process-lifecycle
  // leak in callers that intentionally leave an idle reference store open.
  REFLECT_APPLY(CHILD_UNREF, child, []);
  REFLECT_APPLY(CHANNEL_UNREF, childChannel, []);

  const pending = new MAP_CONSTRUCTOR();
  const handleState = new WEAK_MAP_CONSTRUCTOR();
  let pendingCount = 0;
  let lifecycleState = 'OPEN';
  let ownerFailed = false;
  let activeOperations = 0;
  let drainResolve = null;
  let closePromise = null;

  function refRequestChannel() {
    if (pendingCount === 0) {
      REFLECT_APPLY(CHANNEL_REF, childChannel, []);
    }
    pendingCount += 1;
  }

  function unrefRequestChannel() {
    if (pendingCount > 0) pendingCount -= 1;
    if (pendingCount === 0) {
      try {
        REFLECT_APPLY(CHANNEL_UNREF, childChannel, []);
      } catch {
        // A disconnected/failed owner is already fail-closed elsewhere.
      }
    }
  }

  function rejectAllOwnerFailure(message) {
    if (ownerFailed) return;
    ownerFailed = true;
    mapForEach(pending, (entry, id) => {
      mapDelete(pending, id);
      entry.reject(new PomRxDurableClaimStoreError(
        'POMRX_GATE_E_DURABLE_IO',
        message,
      ));
    });
    pendingCount = 0;
    try {
      REFLECT_APPLY(CHANNEL_UNREF, childChannel, []);
    } catch {
      // Owner failure/disconnect already terminates authority.
    }
  }

  function onOwnerMessage(rawMessage) {
    let message;
    try {
      message = captureWireValue(rawMessage);
    } catch {
      rejectAllOwnerFailure('durable owner IPC returned malformed data');
      return;
    }
    if (message.schema !== IPC_SCHEMA || typeof message.id !== 'string') return;
    const entry = mapGet(pending, message.id);
    if (!entry) return;
    mapDelete(pending, message.id);
    unrefRequestChannel();

    if (message.ok === true) {
      entry.resolve(message.payload);
      return;
    }
    if (message.ok === false) {
      const errorPayload = message.error;
      const code = errorPayload && typeof errorPayload.code === 'string'
        ? errorPayload.code
        : 'POMRX_GATE_E_DURABLE_IO';
      const text = errorPayload && typeof errorPayload.message === 'string'
        ? errorPayload.message
        : 'durable owner operation failed';
      entry.reject(new PomRxDurableClaimStoreError(code, text));
      return;
    }
    entry.reject(new PomRxDurableClaimStoreError(
      'POMRX_GATE_E_DURABLE_IO',
      'durable owner IPC response is missing status',
    ));
  }

  function onOwnerFailure() {
    rejectAllOwnerFailure('durable owner process terminated or disconnected');
  }

  REFLECT_APPLY(EVENT_ON, child, ['message', onOwnerMessage]);
  REFLECT_APPLY(EVENT_ON, child, ['error', onOwnerFailure]);
  REFLECT_APPLY(EVENT_ON, child, ['exit', onOwnerFailure]);
  REFLECT_APPLY(EVENT_ON, child, ['disconnect', onOwnerFailure]);

  function request(command, payload) {
    if (ownerFailed) {
      return stabilizePromise(new PROMISE_CONSTRUCTOR((resolve, reject) => {
        reject(new PomRxDurableClaimStoreError(
          'POMRX_GATE_E_DURABLE_IO',
          'durable owner process is unavailable',
        ));
      }));
    }
    const id = REFLECT_APPLY(CRYPTO_RANDOM_UUID, undefined, []);
    return stabilizePromise(new PROMISE_CONSTRUCTOR((resolve, reject) => {
      mapSet(pending, id, { resolve, reject });
      refRequestChannel();
      const message = makeWireMessage(id, command, payload);
      try {
        REFLECT_APPLY(CHILD_SEND, child, [message, (error) => {
          if (!error) return;
          const entry = mapGet(pending, id);
          if (!entry) return;
          mapDelete(pending, id);
          unrefRequestChannel();
          entry.reject(new PomRxDurableClaimStoreError(
            'POMRX_GATE_E_DURABLE_IO',
            'durable owner IPC send failed',
          ));
        }]);
      } catch {
        mapDelete(pending, id);
        unrefRequestChannel();
        reject(new PomRxDurableClaimStoreError(
          'POMRX_GATE_E_DURABLE_IO',
          'durable owner IPC send failed',
        ));
      }
    }));
  }

  const initPayload = createObject(null);
  defineData(initPayload, 'rootDir', bootstrap.rootDir);
  freezeValue(initPayload);
  const readyPromise = request('init', initPayload);

  function beginOperation() {
    if (lifecycleState !== 'OPEN') {
      fail('POMRX_GATE_E_DURABLE_CLOSED', 'durable claim store is closing or closed');
    }
    if (ownerFailed) {
      fail('POMRX_GATE_E_DURABLE_IO', 'durable owner process is unavailable');
    }
    activeOperations += 1;
  }

  function endOperation() {
    activeOperations -= 1;
    if (activeOperations === 0 && drainResolve !== null) {
      const resolve = drainResolve;
      drainResolve = null;
      resolve();
    }
  }

  async function runOperation(command, payload) {
    beginOperation();
    try {
      await readyPromise;
      return await request(command, payload);
    } finally {
      endOperation();
    }
  }

  function inspect(input) {
    let captured;
    try {
      captured = exactOwnData(
        input,
        INSPECT_KEYS,
        INSPECT_SORTED_KEYS,
        'durable claim inspection',
      );
    } catch (error) {
      return stabilizePromise(new PROMISE_CONSTRUCTOR((resolve, reject) => reject(error)));
    }
    return stabilizePromise(runOperation('inspect', makeWireInput(captured)));
  }

  function claim(input) {
    let captured;
    try {
      captured = exactOwnData(
        input,
        INSPECT_KEYS,
        INSPECT_SORTED_KEYS,
        'durable claim request',
      );
    } catch (error) {
      return stabilizePromise(new PROMISE_CONSTRUCTOR((resolve, reject) => reject(error)));
    }
    const operation = stabilizePromise(runOperation('claim', makeWireInput(captured)));
    return stabilizePromise(REFLECT_APPLY(PROMISE_THEN, operation, [(wireResult) => {
      if (!wireResult
          || typeof wireResult !== 'object'
          || typeof wireResult.handle_id !== 'string'
          || !wireResult.claim) {
        fail('POMRX_GATE_E_DURABLE_IO', 'durable owner returned an invalid claim response');
      }
      const handle = freezeValue(createObject(null));
      const state = createObject(null);
      state.id = wireResult.handle_id;
      state.open = true;
      weakMapSet(handleState, handle, state);
      const result = createObject(null);
      defineData(result, 'handle', handle);
      defineData(result, 'claim', wireResult.claim);
      return freezeValue(result);
    }]));
  }

  function captureHandle(handle) {
    const state = weakMapGet(handleState, handle);
    if (!state || state.open !== true) {
      fail('POMRX_GATE_E_DURABLE_STALE', 'durable claim handle is foreign or no longer open');
    }
    return state;
  }

  function complete(handle, outcome) {
    let state;
    try {
      state = captureHandle(handle);
      if (outcome !== 'success' && outcome !== 'error') {
        fail('POMRX_GATE_E_DURABLE_INVALID', 'durable claim outcome must be success or error');
      }
    } catch (error) {
      return stabilizePromise(new PROMISE_CONSTRUCTOR((resolve, reject) => reject(error)));
    }
    const payload = createObject(null);
    defineData(payload, 'handle_id', state.id);
    defineData(payload, 'outcome', outcome);
    freezeValue(payload);
    const operation = stabilizePromise(runOperation('complete', payload));
    return stabilizePromise(REFLECT_APPLY(PROMISE_THEN, operation, [
      (result) => {
        state.open = false;
        return result;
      },
      (error) => {
        state.open = false;
        throw error;
      },
    ]));
  }

  function abandon(handle) {
    let state;
    try {
      state = captureHandle(handle);
    } catch (error) {
      return stabilizePromise(new PROMISE_CONSTRUCTOR((resolve, reject) => reject(error)));
    }
    const payload = createObject(null);
    defineData(payload, 'handle_id', state.id);
    freezeValue(payload);
    const operation = stabilizePromise(runOperation('abandon', payload));
    return stabilizePromise(REFLECT_APPLY(PROMISE_THEN, operation, [
      (result) => {
        state.open = false;
        return result;
      },
      (error) => {
        state.open = false;
        throw error;
      },
    ]));
  }

  function closeChildBestEffort() {
    try {
      REFLECT_APPLY(CHILD_DISCONNECT, child, []);
    } catch {
      // IPC may already be disconnected.
    }
    try {
      REFLECT_APPLY(CHILD_KILL, child, []);
    } catch {
      // The owner may already have exited.
    }
  }

  function close() {
    if (lifecycleState === 'CLOSED') {
      return stabilizePromise(new PROMISE_CONSTRUCTOR((resolve) => resolve()));
    }
    if (lifecycleState === 'CLOSING') return closePromise;

    lifecycleState = 'CLOSING';
    closePromise = stabilizePromise((async () => {
      try {
        if (activeOperations > 0) {
          await stabilizePromise(new PROMISE_CONSTRUCTOR((resolve) => {
            drainResolve = resolve;
          }));
        }
        if (!ownerFailed) {
          await readyPromise;
          await request('close', null);
        } else {
          fail('POMRX_GATE_E_DURABLE_IO', 'durable owner process is unavailable');
        }
      } finally {
        lifecycleState = 'CLOSED';
        closeChildBestEffort();
      }
    })());
    return closePromise;
  }

  return freezeValue({
    claim,
    complete,
    abandon,
    inspect,
    close,
  });
}
