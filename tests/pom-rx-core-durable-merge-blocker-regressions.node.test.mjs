import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  prepareReferenceExactAuthorizationRecord,
} from '../core/authorization/reference-exact-authorization.mjs';
import {
  createReferenceDurableSingleUseGateHarness,
} from '../core/gate/reference-durable-single-use-gate.mjs';

const h = (character) => character.repeat(64);

function bindingInput(index) {
  const suffix = String(index).padStart(4, '0');
  return {
    binding_profile: 'pom-rx-core-reference/0.1',
    run_id: `run-merge-blocker-${suffix}`,
    agent_ref: `agent-merge-blocker-${suffix}`,
    subject_ref: `subject-merge-blocker-${suffix}`,
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
    prepared_execution: { operation: 'merge-blocker-control' },
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
  'direct downstream Promise cannot be forged by post-import Promise prototype poisoning',
  { concurrency: false },
  async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-direct-downstream-promise-'));
    let evidence;
    let rejectDownstream;
    let notifyDownstreamStarted;
    let intercepts = 0;
    const downstreamPromise = new Promise((_resolve, reject) => {
      rejectDownstream = reject;
    });
    const downstreamStarted = new Promise((resolve) => {
      notifyDownstreamStarted = resolve;
    });
    const harness = createReferenceDurableSingleUseGateHarness({
      rootDir,
      trustedClock: clock(),
      observeBinding: async () => observedFrom(evidence),
      executeDownstream: () => {
        notifyDownstreamStarted();
        return downstreamPromise;
      },
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
        if (promise === downstreamPromise && typeof onFulfilled === 'function') {
          intercepts += 1;
          onFulfilled(Object.freeze({ accepted: 'forged' }));
          return undefined;
        }
        return Reflect.apply(originalThen, promise, [onFulfilled, onRejected]);
      });

      const consumePromise = harness.gate.consume(issued.capability, { raw: true });
      await downstreamStarted;
      queueMicrotask(() => rejectDownstream(new Error('real downstream rejection')));
      await assert.rejects(
        consumePromise,
        (error) => {
          assert.equal(error?.code, 'POMRX_GATE_E_DOWNSTREAM_FAILED');
          return true;
        },
      );
      assert.equal(intercepts, 0, 'mutable Promise prototype must not forge downstream fulfillment');
    } finally {
      restore();
    }

    try {
      assert.equal(
        harness.testAuthority.inspectCapabilityStateForTest(issued.capability),
        'CONSUMED_UNKNOWN',
      );
      assert.equal(
        (await harness.testAuthority.inspectDurableStateForTest(issued.capability)).state,
        'RESERVED',
      );
    } finally {
      await harness.close().catch(() => {});
      await rm(rootDir, { recursive: true, force: true });
    }
  },
);

test(
  'public consume then chain ignores post-import Promise Symbol.species poisoning',
  { concurrency: false },
  async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-public-species-'));
    let evidence;
    let poisonCalls = 0;
    const harness = createReferenceDurableSingleUseGateHarness({
      rootDir,
      trustedClock: clock(),
      observeBinding: async () => observedFrom(evidence),
      executeDownstream: () => Object.freeze({ accepted: true }),
    });
    const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(2), {
      witnessValidUntil: '2026-08-30T12:01:00.000Z',
    });
    evidence = issued.evidence;

    const consumePromise = harness.gate.consume(issued.capability, { raw: true });
    const speciesDescriptor = Object.getOwnPropertyDescriptor(Promise, Symbol.species);
    let chained;
    try {
      function PoisonSpecies(executor) {
        poisonCalls += 1;
        return new Promise((resolve, reject) => {
          executor(
            () => reject(new Error('poisoned Promise species converted fulfillment to rejection')),
            reject,
          );
          void resolve;
        });
      }
      Object.defineProperty(Promise, Symbol.species, {
        value: PoisonSpecies,
        configurable: true,
        enumerable: false,
        writable: true,
      });
      chained = consumePromise.then((value) => value);
    } finally {
      Object.defineProperty(Promise, Symbol.species, speciesDescriptor);
    }

    try {
      assert.deepEqual(await chained, { accepted: true });
      assert.equal(poisonCalls, 0, 'public hardened then must not consult mutable Promise species');
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
  'exact authorization cannot satisfy a missing field from an inherited descriptor-shaped property',
  { concurrency: false },
  () => {
    const input = bindingInput(3);
    delete input.run_id;
    input.unknown = 'compensating-unknown-field';

    const inheritedDescriptor = {
      value: 'run-inherited-descriptor-0003',
      enumerable: true,
      writable: true,
      configurable: true,
    };
    const prior = Object.getOwnPropertyDescriptor(Object.prototype, 'run_id');
    try {
      Object.defineProperty(Object.prototype, 'run_id', {
        value: inheritedDescriptor,
        configurable: true,
        enumerable: false,
        writable: true,
      });
      assert.throws(
        () => prepareReferenceExactAuthorizationRecord(input, {
          witnessValidUntil: '2026-08-30T12:01:00.000Z',
          capabilityId: `cap-${'c'.repeat(32)}`,
        }),
        (error) => {
          assert.equal(error?.code, 'POMRX_GATE_E_BINDING_MISMATCH');
          return true;
        },
      );
    } finally {
      if (prior === undefined) delete Object.prototype.run_id;
      else Object.defineProperty(Object.prototype, 'run_id', prior);
    }
  },
);
