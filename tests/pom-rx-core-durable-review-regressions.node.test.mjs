import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  createReferenceDurableSingleUseGateHarness,
} from '../core/gate/reference-durable-single-use-gate.mjs';

const ARRAY_PROTOTYPE = Array.prototype;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_PROTOTYPE = Object.prototype;
const h = (character) => character.repeat(64);

function bindingInput() {
  return {
    binding_profile: 'pom-rx-core-reference/0.1',
    run_id: 'run-durable-review-regression-0001',
    agent_ref: 'agent-durable-review-regression-01',
    subject_ref: 'subject-durable-review-regression-01',
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
    prepared_execution: { operation: 'durable-review-control' },
  };
}

function restorePrototypeProperty(prototype, key, descriptor) {
  if (descriptor) {
    OBJECT_DEFINE_PROPERTY(prototype, key, descriptor);
  } else {
    delete prototype[key];
  }
}

function trustedClock() {
  const values = [
    '2026-08-30T12:00:01.000Z',
    '2026-08-30T12:00:02.000Z',
  ];
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

test(
  'post-terminal inherited thenable cannot reject a result after durable success',
  { concurrency: false },
  async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-post-terminal-then-'));
    const originalThen = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(OBJECT_PROTOTYPE, 'then');
    let evidence;
    let thenGets = 0;
    let attackCalls = 0;
    let harness;
    const downstreamResult = Object.freeze({ accepted: true });

    try {
      harness = createReferenceDurableSingleUseGateHarness({
        rootDir,
        trustedClock: trustedClock(),
        observeBinding: async () => observedFrom(evidence),
        executeDownstream: () => downstreamResult,
      });
      const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
        witnessValidUntil: '2026-08-30T12:01:00.000Z',
      });
      evidence = issued.evidence;

      OBJECT_DEFINE_PROPERTY(OBJECT_PROTOTYPE, 'then', {
        configurable: true,
        enumerable: false,
        get() {
          if (this !== downstreamResult) return undefined;
          thenGets += 1;
          if (thenGets === 1) return undefined;
          return function rejectAfterTerminal(resolve, reject) {
            attackCalls += 1;
            reject(new Error('post-terminal inherited thenable attack'));
          };
        },
      });

      const result = await harness.gate.consume(issued.capability, { raw: true });
      assert.equal(result.accepted, true);
      assert.equal(Object.getPrototypeOf(result), Object.prototype);
      assert.deepEqual(result, { accepted: true });
      assert.deepEqual(Object.getOwnPropertyDescriptor(result, 'then'), {
        value: undefined,
        enumerable: false,
        writable: false,
        configurable: false,
      });
      assert.equal(
        harness.testAuthority.inspectCapabilityStateForTest(issued.capability),
        'CONSUMED_SUCCESS',
      );
      assert.equal(
        (await harness.testAuthority.inspectDurableStateForTest(issued.capability)).state,
        'CONSUMED_SUCCESS',
      );
      assert.equal(attackCalls, 0);
      assert.equal(thenGets, 1);
    } finally {
      restorePrototypeProperty(OBJECT_PROTOTYPE, 'then', originalThen);
      await harness?.close().catch(() => {});
      await rm(rootDir, { recursive: true, force: true });
    }
  },
);

test(
  'post-terminal result rematerialization bypasses inherited object field setters',
  { concurrency: false },
  async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-post-terminal-setter-'));
    const originalAccepted = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(OBJECT_PROTOTYPE, 'accepted');
    let evidence;
    let setterCalls = 0;
    let harness;
    const downstreamResult = Object.freeze({ accepted: true });

    try {
      harness = createReferenceDurableSingleUseGateHarness({
        rootDir,
        trustedClock: trustedClock(),
        observeBinding: async () => observedFrom(evidence),
        executeDownstream: () => downstreamResult,
      });
      const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
        witnessValidUntil: '2026-08-30T12:01:00.000Z',
      });
      evidence = issued.evidence;

      OBJECT_DEFINE_PROPERTY(OBJECT_PROTOTYPE, 'accepted', {
        configurable: true,
        enumerable: false,
        get() {
          return false;
        },
        set(_value) {
          setterCalls += 1;
        },
      });

      const result = await harness.gate.consume(issued.capability, { raw: true });
      assert.equal(setterCalls, 0, 'detached result fields must not dispatch through inherited setters');
      assert.equal(OBJECT_HAS_OWN(result, 'accepted'), true);
      assert.equal(result.accepted, true);
      assert.equal(
        harness.testAuthority.inspectCapabilityStateForTest(issued.capability),
        'CONSUMED_SUCCESS',
      );
      assert.equal(
        (await harness.testAuthority.inspectDurableStateForTest(issued.capability)).state,
        'CONSUMED_SUCCESS',
      );
    } finally {
      restorePrototypeProperty(OBJECT_PROTOTYPE, 'accepted', originalAccepted);
      await harness?.close().catch(() => {});
      await rm(rootDir, { recursive: true, force: true });
    }
  },
);

test(
  'post-terminal array rematerialization bypasses inherited index setters',
  { concurrency: false },
  async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-post-terminal-array-setter-'));
    const originalZero = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(ARRAY_PROTOTYPE, '0');
    let evidence;
    let setterCalls = 0;
    let harness;
    const downstreamResult = Object.freeze([Object.freeze({ accepted: true })]);

    try {
      harness = createReferenceDurableSingleUseGateHarness({
        rootDir,
        trustedClock: trustedClock(),
        observeBinding: async () => observedFrom(evidence),
        executeDownstream: () => downstreamResult,
      });
      const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
        witnessValidUntil: '2026-08-30T12:01:00.000Z',
      });
      evidence = issued.evidence;

      OBJECT_DEFINE_PROPERTY(ARRAY_PROTOTYPE, '0', {
        configurable: true,
        enumerable: false,
        get() {
          return undefined;
        },
        set(_value) {
          setterCalls += 1;
        },
      });

      const result = await harness.gate.consume(issued.capability, { raw: true });
      assert.equal(setterCalls, 0, 'detached array indices must not dispatch through inherited setters');
      assert.equal(Array.isArray(result), true);
      assert.equal(OBJECT_HAS_OWN(result, '0'), true);
      assert.equal(result[0].accepted, true);
      assert.equal(
        harness.testAuthority.inspectCapabilityStateForTest(issued.capability),
        'CONSUMED_SUCCESS',
      );
      assert.equal(
        (await harness.testAuthority.inspectDurableStateForTest(issued.capability)).state,
        'CONSUMED_SUCCESS',
      );
    } finally {
      restorePrototypeProperty(ARRAY_PROTOTYPE, '0', originalZero);
      await harness?.close().catch(() => {});
      await rm(rootDir, { recursive: true, force: true });
    }
  },
);
