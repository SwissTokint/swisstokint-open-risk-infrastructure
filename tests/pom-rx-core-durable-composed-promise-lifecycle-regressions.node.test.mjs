import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  createReferenceDurableSingleUseGateHarness,
} from '../core/gate/reference-durable-single-use-gate.mjs';

const h = (character) => character.repeat(64);

function bindingInput(index) {
  const suffix = String(index).padStart(4, '0');
  return {
    binding_profile: 'pom-rx-core-reference/0.1',
    run_id: `run-composed-promise-${suffix}`,
    agent_ref: `agent-composed-promise-${suffix}`,
    subject_ref: `subject-composed-promise-${suffix}`,
    method_hash: h('1'),
    policy_hash: h('2'),
    action_commitment: h('3'),
    context_commitment: h('4'),
    preflight_receipt_hash: h('5'),
    witness_ack_hash: h('6'),
    source_key_id: `ed25519-${'a'.repeat(32)}`,
    witness_key_id: `ed25519-${'b'.repeat(32)}`,
    verification_profile: 'pom-rx-v0.1/strict-errata-1',
    verifier_version: 'pom-rx-v0.1-strict-verifier/1',
    implementation_artifact_sha256: h('7'),
    effective_verification_policy_sha256: h('8'),
    issued_at: '2026-08-30T12:00:00.000Z',
    expires_at: '2026-08-30T12:00:30.000Z',
  };
}

function observedFrom(evidence) {
  return {
    binding_profile: evidence.binding.binding_profile,
    action_commitment: evidence.binding.action_commitment,
    context_commitment: evidence.binding.context_commitment,
    prepared_execution: { operation: 'composed-promise-control' },
  };
}

function clock() {
  let index = 0;
  const values = [
    '2026-08-30T12:00:01.000Z',
    '2026-08-30T12:00:02.000Z',
  ];
  return () => values[Math.min(index++, values.length - 1)];
}

function installPromisePrototypePoison(interceptor) {
  const constructorDescriptor = Object.getOwnPropertyDescriptor(Promise.prototype, 'constructor');
  const thenDescriptor = Object.getOwnPropertyDescriptor(Promise.prototype, 'then');
  const originalThen = thenDescriptor.value;
  const poisonedConstructor = Object.create(null);
  Object.defineProperty(poisonedConstructor, Symbol.species, {
    value: Promise,
    configurable: false,
    enumerable: false,
    writable: false,
  });
  Object.defineProperty(Promise.prototype, 'constructor', {
    ...constructorDescriptor,
    value: poisonedConstructor,
  });
  Object.defineProperty(Promise.prototype, 'then', {
    ...thenDescriptor,
    value: function poisonedThen(onFulfilled, onRejected) {
      return interceptor({
        promise: this,
        onFulfilled,
        onRejected,
        originalThen,
      });
    },
  });
  return () => {
    Object.defineProperty(Promise.prototype, 'then', thenDescriptor);
    Object.defineProperty(Promise.prototype, 'constructor', constructorDescriptor);
  };
}

test(
  'composed Gate inner consume result cannot be rejected by post-import Promise prototype poisoning',
  { concurrency: false },
  async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-composed-inner-promise-'));
    let evidence;
    let intercepts = 0;
    const harness = createReferenceDurableSingleUseGateHarness({
      rootDir,
      trustedClock: clock(),
      observeBinding: async () => observedFrom(evidence),
      executeDownstream: () => Object.freeze({ accepted: true }),
    });
    const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(1), {
      witnessValidUntil: '2026-08-30T12:01:00.000Z',
    });
    evidence = issued.evidence;

    let restore = () => {};
    try {
      restore = installPromisePrototypePoison(({
        promise,
        onFulfilled,
        onRejected,
        originalThen,
      }) => {
        const wrappedFulfilled = typeof onFulfilled === 'function'
          ? (value) => {
            if (value !== null
                && typeof value === 'object'
                && value.accepted === true
                && typeof onRejected === 'function') {
              intercepts += 1;
              return onRejected(new Error('poisoned composed inner result channel'));
            }
            return onFulfilled(value);
          }
          : onFulfilled;
        return Reflect.apply(originalThen, promise, [wrappedFulfilled, onRejected]);
      });

      const result = await harness.gate.consume(issued.capability, { raw: true });
      assert.deepEqual(result, { accepted: true });
      assert.equal(intercepts, 0, 'mutable Promise prototype must not observe the composed inner result');
    } finally {
      restore();
    }

    try {
      assert.equal(
        harness.testAuthority.inspectCapabilityStateForTest(issued.capability),
        'CONSUMED_SUCCESS',
      );
      assert.equal(
        (await harness.testAuthority.inspectDurableStateForTest(issued.capability)).state,
        'CONSUMED_SUCCESS',
      );
    } finally {
      await harness.close().catch(() => {});
      await rm(rootDir, { recursive: true, force: true });
    }
  },
);

test(
  'external close drain cannot be fulfilled early by post-import Promise prototype poisoning',
  { concurrency: false },
  async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-composed-close-promise-'));
    let evidence;
    let downstreamStartedResolve;
    let downstreamRelease;
    let downstreamResultChannel;
    const downstreamStarted = new Promise((resolve) => {
      downstreamStartedResolve = resolve;
    });
    const downstreamPending = new Promise((resolve) => {
      downstreamRelease = resolve;
    });
    const harness = createReferenceDurableSingleUseGateHarness({
      rootDir,
      trustedClock: clock(),
      observeBinding: async () => observedFrom(evidence),
      executeDownstream: (_preparedExecution, resultChannel) => {
        downstreamResultChannel = resultChannel;
        downstreamStartedResolve();
        return downstreamPending;
      },
    });
    const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(2), {
      witnessValidUntil: '2026-08-30T12:01:00.000Z',
    });
    evidence = issued.evidence;

    const consumePromise = harness.gate.consume(issued.capability, { raw: true });
    await downstreamStarted;

    let bypassArmed = true;
    let bypassCalls = 0;
    let restore = () => {};
    let closePromise;
    try {
      restore = installPromisePrototypePoison(({
        promise,
        onFulfilled,
        onRejected,
        originalThen,
      }) => {
        if (bypassArmed && typeof onFulfilled === 'function') {
          bypassArmed = false;
          bypassCalls += 1;
          onFulfilled(undefined);
          return undefined;
        }
        return Reflect.apply(originalThen, promise, [onFulfilled, onRejected]);
      });
      closePromise = harness.close();
    } finally {
      restore();
    }

    // Flush any PromiseResolveThenableJob that captured the poisoned `then`.
    await Promise.resolve();
    await Promise.resolve();

    const downstreamResult = Object.freeze({ accepted: true });
    downstreamResultChannel.capture(downstreamResult);
    downstreamRelease(downstreamResult);
    let consumeResult;
    let consumeError = null;
    try {
      consumeResult = await consumePromise;
    } catch (error) {
      consumeError = error;
    }
    await closePromise.catch(() => {});

    try {
      assert.equal(
        bypassCalls,
        0,
        'mutable Promise prototype must not fulfil the active-consume drain channel',
      );
      assert.equal(consumeError, null);
      assert.deepEqual(consumeResult, { accepted: true });
      assert.equal(
        harness.testAuthority.inspectCapabilityStateForTest(issued.capability),
        'CONSUMED_SUCCESS',
      );
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  },
);

test(
  'descendant close after its originating consume finishes is not treated as reentrant',
  { concurrency: false },
  async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-composed-descendant-close-'));
    let evidence;
    let releaseDescendant;
    const descendantTrigger = new Promise((resolve) => {
      releaseDescendant = resolve;
    });
    let descendantClose;
    let harness;

    harness = createReferenceDurableSingleUseGateHarness({
      rootDir,
      trustedClock: clock(),
      observeBinding: async () => observedFrom(evidence),
      executeDownstream: () => {
        descendantClose = (async () => {
          await descendantTrigger;
          try {
            await harness.close();
            return { ok: true, code: null };
          } catch (error) {
            return { ok: false, code: error?.code ?? null };
          }
        })();
        return Object.freeze({ accepted: true });
      },
    });
    const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(3), {
      witnessValidUntil: '2026-08-30T12:01:00.000Z',
    });
    evidence = issued.evidence;

    try {
      const result = await harness.gate.consume(issued.capability, { raw: true });
      assert.deepEqual(result, { accepted: true });
      releaseDescendant();
      const descendantResult = await descendantClose;
      assert.deepEqual(
        descendantResult,
        { ok: true, code: null },
        'a descendant task may close only after its originating consume is no longer active',
      );
    } finally {
      releaseDescendant?.();
      await descendantClose?.catch(() => {});
      await harness.close().catch(() => {});
      await rm(rootDir, { recursive: true, force: true });
    }
  },
);