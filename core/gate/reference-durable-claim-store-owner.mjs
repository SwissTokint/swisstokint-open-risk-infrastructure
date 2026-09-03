import { randomUUID } from 'node:crypto';
import {
  PomRxDurableClaimStoreError,
  createReferenceDurableClaimStore,
} from './reference-durable-claim-store-local.mjs';

const IPC_SCHEMA = 'pom-rx-durable-owner-ipc/0.1';
const MAX_OPEN_HANDLES = 4096;
const stores = new Map();
const handles = new Map();
let store = null;
let closing = false;

function plainObject() {
  return Object.create(null);
}

function ownData(value, expectedKeys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const names = Object.getOwnPropertyNames(value).sort();
  const wanted = [...expectedKeys].sort();
  if (names.length !== wanted.length
      || names.some((name, index) => name !== wanted[index])
      || Object.getOwnPropertySymbols(value).length !== 0) {
    throw new Error(`${label} has an invalid shape`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const output = plainObject();
  for (const key of expectedKeys) {
    const descriptor = descriptors[key];
    if (!descriptor
        || !Object.hasOwn(descriptor, 'value')
        || descriptor.enumerable !== true
        || Object.hasOwn(descriptor, 'get')
        || Object.hasOwn(descriptor, 'set')) {
      throw new Error(`${label}.${key} must be own enumerable data`);
    }
    Object.defineProperty(output, key, {
      value: descriptor.value,
      enumerable: true,
      configurable: false,
      writable: false,
    });
  }
  return Object.freeze(output);
}

function copyForWire(value, depth = 0) {
  if (depth > 12) throw new Error('owner result exceeds nesting bound');
  if (value === null
      || typeof value === 'string'
      || typeof value === 'boolean'
      || (typeof value === 'number' && Number.isFinite(value))) {
    return value;
  }
  if (!value || typeof value !== 'object') {
    throw new Error('owner result contains unsupported data');
  }
  if (Array.isArray(value)) {
    if (value.length > 4096) throw new Error('owner result array exceeds bounds');
    const output = [];
    for (let index = 0; index < value.length; index += 1) {
      Object.defineProperty(output, index, {
        value: copyForWire(value[index], depth + 1),
        enumerable: true,
        configurable: false,
        writable: false,
      });
    }
    return Object.freeze(output);
  }
  const names = Object.getOwnPropertyNames(value);
  if (names.length > 128) throw new Error('owner result has too many fields');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const output = plainObject();
  for (const key of names) {
    const descriptor = descriptors[key];
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
      throw new Error('owner result contains accessors');
    }
    Object.defineProperty(output, key, {
      value: copyForWire(descriptor.value, depth + 1),
      enumerable: descriptor.enumerable === true,
      configurable: false,
      writable: false,
    });
  }
  return Object.freeze(output);
}

function sendResponse(id, ok, payload = null, error = null) {
  if (typeof process.send !== 'function') return;
  const response = plainObject();
  response.schema = IPC_SCHEMA;
  response.id = id;
  response.ok = ok;
  response.payload = payload;
  response.error = error;
  process.send(response);
}

function errorForWire(error) {
  const payload = plainObject();
  payload.code = error instanceof PomRxDurableClaimStoreError
    ? error.code
    : 'POMRX_GATE_E_DURABLE_IO';
  payload.message = typeof error?.message === 'string'
    ? error.message
    : 'durable owner operation failed';
  return Object.freeze(payload);
}

async function dispatch(message) {
  const envelope = ownData(message, ['schema', 'id', 'command', 'payload'], 'IPC request');
  if (envelope.schema !== IPC_SCHEMA || typeof envelope.id !== 'string') return;
  if (typeof envelope.command !== 'string') {
    throw new Error('IPC command must be a string');
  }

  if (envelope.command === 'init') {
    if (store !== null || closing) throw new Error('durable owner already initialized');
    const payload = ownData(envelope.payload, ['rootDir'], 'init payload');
    store = createReferenceDurableClaimStore({ rootDir: payload.rootDir });
    stores.set('store', store);
    sendResponse(envelope.id, true, null, null);
    return;
  }

  if (store === null || closing) {
    throw new PomRxDurableClaimStoreError(
      'POMRX_GATE_E_DURABLE_CLOSED',
      'durable owner is not available',
    );
  }

  if (envelope.command === 'inspect') {
    const payload = ownData(
      envelope.payload,
      ['capabilityId', 'authorizationCommitment'],
      'inspect payload',
    );
    const result = await store.inspect({
      capabilityId: payload.capabilityId,
      authorizationCommitment: payload.authorizationCommitment,
    });
    sendResponse(envelope.id, true, copyForWire(result), null);
    return;
  }

  if (envelope.command === 'claim') {
    if (handles.size >= MAX_OPEN_HANDLES) {
      throw new PomRxDurableClaimStoreError(
        'POMRX_GATE_E_DURABLE_IO',
        'durable owner handle bound exceeded',
      );
    }
    const payload = ownData(
      envelope.payload,
      ['capabilityId', 'authorizationCommitment'],
      'claim payload',
    );
    const claimed = await store.claim({
      capabilityId: payload.capabilityId,
      authorizationCommitment: payload.authorizationCommitment,
    });
    const handleId = randomUUID();
    handles.set(handleId, claimed.handle);
    const result = plainObject();
    result.handle_id = handleId;
    result.claim = copyForWire(claimed.claim);
    sendResponse(envelope.id, true, copyForWire(result), null);
    return;
  }

  if (envelope.command === 'complete') {
    const payload = ownData(envelope.payload, ['handle_id', 'outcome'], 'complete payload');
    const handle = handles.get(payload.handle_id);
    if (!handle) {
      throw new PomRxDurableClaimStoreError(
        'POMRX_GATE_E_DURABLE_STALE',
        'durable claim handle is foreign or no longer open',
      );
    }
    try {
      const result = await store.complete(handle, payload.outcome);
      sendResponse(envelope.id, true, copyForWire(result), null);
    } finally {
      handles.delete(payload.handle_id);
    }
    return;
  }

  if (envelope.command === 'abandon') {
    const payload = ownData(envelope.payload, ['handle_id'], 'abandon payload');
    const handle = handles.get(payload.handle_id);
    if (!handle) {
      throw new PomRxDurableClaimStoreError(
        'POMRX_GATE_E_DURABLE_STALE',
        'durable claim handle is foreign or no longer open',
      );
    }
    try {
      const result = await store.abandon(handle);
      sendResponse(envelope.id, true, copyForWire(result), null);
    } finally {
      handles.delete(payload.handle_id);
    }
    return;
  }

  if (envelope.command === 'close') {
    closing = true;
    try {
      await store.close();
      handles.clear();
      stores.clear();
      store = null;
      sendResponse(envelope.id, true, null, null);
    } finally {
      // Parent owns process termination after receiving the close response.
    }
    return;
  }

  throw new Error('unknown durable owner IPC command');
}

process.on('message', (message) => {
  Promise.resolve()
    .then(() => dispatch(message))
    .catch((error) => {
      let id = null;
      try {
        const descriptor = Object.getOwnPropertyDescriptor(message, 'id');
        if (descriptor && Object.hasOwn(descriptor, 'value') && typeof descriptor.value === 'string') {
          id = descriptor.value;
        }
      } catch {
        id = null;
      }
      if (id !== null) sendResponse(id, false, null, errorForWire(error));
    });
});

process.on('disconnect', async () => {
  closing = true;
  if (store !== null) {
    try {
      await store.close();
    } catch {
      // Parent disconnect means there is no response channel; fail closed and exit.
    }
  }
  process.exit(0);
});
