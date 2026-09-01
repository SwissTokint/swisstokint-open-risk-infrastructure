import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createReferenceDurableClaimStore } from '../core/gate/reference-durable-claim-store.mjs';
import {
  createReferenceDurableSingleUseGateHarness,
} from '../core/gate/reference-durable-single-use-gate.mjs';

const CAPABILITY_ID = `cap-${'c'.repeat(32)}`;
const AUTHORIZATION_COMMITMENT = '9'.repeat(64);
const h = (character) => character.repeat(64);

function bindingInput() {
  return {
    binding_profile: 'pom-rx-core-reference/0.1',
    run_id: 'run-durable-latest-review-0001',
    agent_ref: 'agent-durable-latest-review-01',
    subject_ref: 'subject-durable-latest-review-01',
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
    issued_at: '2026-09-01T12:00:00.000Z',
    expires_at: '2026-09-01T12:00:30.000Z',
  };
}

function trustedClock() {
  const values = [
    '2026-09-01T12:00:01.000Z',
    '2026-09-01T12:00:02.000Z',
  ];
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

function observedFrom(evidence) {
  const preparedExecution = Object.create(null);
  preparedExecution.operation = 'latest-independent-review-control';
  Object.freeze(preparedExecution);

  const observed = Object.create(null);
  observed.binding_profile = evidence.binding.binding_profile;
  observed.action_commitment = evidence.binding.action_commitment;
  observed.context_commitment = evidence.binding.context_commitment;
  observed.prepared_execution = preparedExecution;
  return Object.freeze(observed);
}

test(
  'post-import Promise.prototype.catch poisoning cannot rewrite public durable Gate success',
  { concurrency: false },
  async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-public-catch-'));
    const originalCatchDescriptor = Object.getOwnPropertyDescriptor(Promise.prototype, 'catch');
    const originalThen = Promise.prototype.then;
    let poisonCalls = 0;
    let evidence;
    let harness;

    try {
      harness = createReferenceDurableSingleUseGateHarness({
        rootDir,
        trustedClock: trustedClock(),
        observeBinding: () => observedFrom(evidence),
        executeDownstream: () => Object.freeze({ accepted: true }),
      });
      const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
        witnessValidUntil: '2026-09-01T12:01:00.000Z',
      });
      evidence = issued.evidence;

      const consumePromise = harness.gate.consume(issued.capability, { raw: true });
      Object.defineProperty(Promise.prototype, 'catch', {
        ...originalCatchDescriptor,
        value: function poisonedCatch(onRejected) {
          poisonCalls += 1;
          return Reflect.apply(originalThen, this, [
            () => {
              throw new Error('post-import Promise.prototype.catch attack');
            },
            onRejected,
          ]);
        },
      });

      const result = await consumePromise.catch(() => Object.freeze({ recovered: true }));
      assert.equal(poisonCalls, 0, 'public durable Gate promise must own captured catch dispatch');
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
      Object.defineProperty(Promise.prototype, 'catch', originalCatchDescriptor);
      await harness?.close().catch(() => {});
      await rm(rootDir, { recursive: true, force: true });
    }
  },
);

test(
  'standalone durable-store promise chaining ignores post-import Promise species poisoning',
  { concurrency: false },
  async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-store-species-'));
    const store = createReferenceDurableClaimStore({ rootDir });
    const originalSpeciesDescriptor = Object.getOwnPropertyDescriptor(Promise, Symbol.species);
    let speciesCalls = 0;

    try {
      const claim = await store.claim({
        capabilityId: CAPABILITY_ID,
        authorizationCommitment: AUTHORIZATION_COMMITMENT,
      });
      const completionPromise = store.complete(claim.handle, 'success');
      await completionPromise;

      class RejectingSpecies extends Promise {
        constructor(executor) {
          speciesCalls += 1;
          super((resolve, reject) => executor(
            () => reject(new Error('post-import Promise species attack')),
            reject,
          ));
        }
      }

      let chained;
      try {
        Object.defineProperty(Promise, Symbol.species, {
          configurable: true,
          enumerable: false,
          writable: false,
          value: RejectingSpecies,
        });
        chained = completionPromise.then((value) => value);
      } finally {
        Object.defineProperty(Promise, Symbol.species, originalSpeciesDescriptor);
      }

      const chainedResult = await chained;
      assert.equal(
        speciesCalls,
        0,
        'standalone durable-store promise must not consult mutable Promise[Symbol.species]',
      );
      assert.equal(chainedResult.state, 'CONSUMED_SUCCESS');
      assert.equal(
        (await store.inspect({
          capabilityId: CAPABILITY_ID,
          authorizationCommitment: AUTHORIZATION_COMMITMENT,
        })).state,
        'CONSUMED_SUCCESS',
      );
    } finally {
      Object.defineProperty(Promise, Symbol.species, originalSpeciesDescriptor);
      await store.close().catch(() => {});
      await rm(rootDir, { recursive: true, force: true });
    }
  },
);
