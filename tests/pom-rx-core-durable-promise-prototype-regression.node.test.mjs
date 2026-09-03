import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createReferenceDurableClaimStore } from '../core/gate/reference-durable-claim-store.mjs';

const CAPABILITY_A = `cap-${'a'.repeat(32)}`;
const CAPABILITY_B = `cap-${'b'.repeat(32)}`;
const AUTH_A = '1'.repeat(64);
const AUTH_B = '2'.repeat(64);

function makeReplacementClaimResult(claimResult, replacementHandle) {
  const output = Object.create(null);
  output.handle = replacementHandle;
  output.claim = claimResult.claim;
  return Object.freeze(output);
}

test('post-import Promise prototype poisoning cannot substitute a durable claim handle', { concurrency: false }, async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-promise-prototype-'));
  const store = createReferenceDurableClaimStore({ rootDir });
  const originalConstructorDescriptor = Object.getOwnPropertyDescriptor(Promise.prototype, 'constructor');
  const originalThenDescriptor = Object.getOwnPropertyDescriptor(Promise.prototype, 'then');
  const originalThen = originalThenDescriptor.value;
  let claimResultIntercepts = 0;

  try {
    const claimA = await store.claim({
      capabilityId: CAPABILITY_A,
      authorizationCommitment: AUTH_A,
    });

    const poisonedConstructor = Object.create(null);
    Object.defineProperty(poisonedConstructor, Symbol.species, {
      value: Promise,
      configurable: false,
      enumerable: false,
      writable: false,
    });

    Object.defineProperty(Promise.prototype, 'constructor', {
      ...originalConstructorDescriptor,
      value: poisonedConstructor,
    });
    Object.defineProperty(Promise.prototype, 'then', {
      ...originalThenDescriptor,
      value: function poisonedThen(onFulfilled, onRejected) {
        const wrappedFulfilled = typeof onFulfilled === 'function'
          ? (value) => {
            if (value !== null
                && typeof value === 'object'
                && value.claim !== null
                && typeof value.claim === 'object'
                && value.claim.capability_id === CAPABILITY_B) {
              claimResultIntercepts += 1;
              return onFulfilled(makeReplacementClaimResult(value, claimA.handle));
            }
            return onFulfilled(value);
          }
          : onFulfilled;
        return Reflect.apply(originalThen, this, [wrappedFulfilled, onRejected]);
      },
    });

    let claimB;
    try {
      claimB = await store.claim({
        capabilityId: CAPABILITY_B,
        authorizationCommitment: AUTH_B,
      });
    } finally {
      Object.defineProperty(Promise.prototype, 'then', originalThenDescriptor);
      Object.defineProperty(Promise.prototype, 'constructor', originalConstructorDescriptor);
    }

    await store.complete(claimB.handle, 'success');

    const inspectedA = await store.inspect({
      capabilityId: CAPABILITY_A,
      authorizationCommitment: AUTH_A,
    });
    const inspectedB = await store.inspect({
      capabilityId: CAPABILITY_B,
      authorizationCommitment: AUTH_B,
    });

    assert.equal(
      claimResultIntercepts,
      0,
      'mutable Promise prototype must not observe or substitute the durable claim result channel',
    );
    assert.notStrictEqual(claimB.handle, claimA.handle, 'claim B must retain its own durable handle');
    assert.equal(inspectedA.state, 'RESERVED');
    assert.equal(inspectedB.state, 'CONSUMED_SUCCESS');
  } finally {
    Object.defineProperty(Promise.prototype, 'then', originalThenDescriptor);
    Object.defineProperty(Promise.prototype, 'constructor', originalConstructorDescriptor);
    await store.close().catch(() => {});
    await rm(rootDir, { recursive: true, force: true });
  }
});