import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PomRxObservationError,
  createReferenceObservationReconciliation,
} from '../core/observation/reference-observation-reconciliation.mjs';

const hash = (character) => character.repeat(64);
const PROFILE = 'pom-rx-reference-observation/0.1';

function expected() {
  return {
    authorization_binding: {
      schema_version: 'pom-rx-exact-authorization/0.1',
      capability_id: `cap-${'1'.repeat(32)}`,
      binding_profile: PROFILE,
      run_id: 'run-reference-observation-0001',
      agent_ref: 'agent-reference-observation-01',
      subject_ref: 'subject-reference-observation-01',
      method_hash: hash('1'),
      policy_hash: hash('2'),
      action_commitment: hash('a'),
      context_commitment: hash('b'),
      preflight_receipt_hash: hash('3'),
      witness_ack_hash: hash('4'),
      source_key_id: `ed25519-${'a'.repeat(32)}`,
      witness_key_id: `ed25519-${'b'.repeat(32)}`,
      verification_profile: 'pom-rx-v0.1/strict-errata-1',
      verifier_version: 'pom-rx-v0.1-strict-verifier/1',
      implementation_artifact_sha256: hash('5'),
      effective_verification_policy_sha256: hash('6'),
      issued_at: '2026-08-20T05:00:00.000Z',
      expires_at: '2026-08-20T05:00:30.000Z',
    },
    expected_execution_status: 'success',
    expected_effect_commitment: hash('d'),
  };
}

function observed() {
  return {
    binding_profile: PROFILE,
    run_id: 'run-reference-observation-0001',
    action_commitment: hash('a'),
    context_commitment: hash('b'),
    execution_status: 'success',
    effect_commitment: hash('d'),
    executed_at: '2026-08-20T05:00:10.000Z',
    observed_at: '2026-08-20T05:00:12.000Z',
  };
}

function expectObserverInvalid(error) {
  assert.ok(error instanceof PomRxObservationError);
  assert.equal(error.code, 'POMRX_OBS_E_OBSERVER_INVALID');
  return true;
}

function invokeWith(observer) {
  const runtime = createReferenceObservationReconciliation({
    trustedClock: () => '2026-08-20T05:00:13.000Z',
    observeExecution: observer,
  });
  return runtime.captureAndReconcile({
    expected: expected(),
    observationRef: { id: 'return-channel' },
  });
}

test('returned native Promise with an own then getter is rejected without reading then', async () => {
  let reads = 0;
  const promise = Promise.resolve('unused');
  Object.defineProperty(promise, 'then', {
    configurable: true,
    get() {
      reads += 1;
      return Promise.prototype.then;
    },
  });

  await assert.rejects(
    invokeWith(() => promise),
    expectObserverInvalid,
  );
  assert.equal(reads, 0);
});

test('returned plain thenable accessor is rejected without reading then', async () => {
  let reads = 0;
  const thenable = {};
  Object.defineProperty(thenable, 'then', {
    enumerable: true,
    get() {
      reads += 1;
      return () => {};
    },
  });

  await assert.rejects(
    invokeWith(() => thenable),
    expectObserverInvalid,
  );
  assert.equal(reads, 0);
});

test('synchronous delivery plus a returned Promise remains protocol-invalid without Promise inspection', async () => {
  let reads = 0;
  const promise = Promise.resolve('unused');
  Object.defineProperty(promise, 'then', {
    configurable: true,
    get() {
      reads += 1;
      return Promise.prototype.then;
    },
  });

  await assert.rejects(
    invokeWith((_reference, deliver) => {
      deliver(observed());
      return promise;
    }),
    expectObserverInvalid,
  );
  assert.equal(reads, 0);
});
