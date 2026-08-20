import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PomRxObservationError,
  createReferenceObservationReconciliation,
} from '../core/observation/reference-observation-reconciliation.mjs';

const hash = (character) => character.repeat(64);
const ACTION = hash('a');
const CONTEXT = hash('b');
const EFFECT = hash('d');
const PROFILE = 'pom-rx-reference-observation/0.1';

function binding() {
  return {
    schema_version: 'pom-rx-exact-authorization/0.1',
    capability_id: `cap-${'1'.repeat(32)}`,
    binding_profile: PROFILE,
    run_id: 'run-reference-observation-0001',
    agent_ref: 'agent-reference-observation-01',
    subject_ref: 'subject-reference-observation-01',
    method_hash: hash('1'),
    policy_hash: hash('2'),
    action_commitment: ACTION,
    context_commitment: CONTEXT,
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
  };
}

function expected() {
  return {
    authorization_binding: binding(),
    expected_execution_status: 'success',
    expected_effect_commitment: EFFECT,
  };
}

function observed() {
  return {
    binding_profile: PROFILE,
    run_id: 'run-reference-observation-0001',
    action_commitment: ACTION,
    context_commitment: CONTEXT,
    execution_status: 'success',
    effect_commitment: EFFECT,
    executed_at: '2026-08-20T05:00:10.000Z',
    observed_at: '2026-08-20T05:00:12.000Z',
  };
}

function expectCode(error, code) {
  assert.ok(error instanceof PomRxObservationError);
  assert.equal(error.code, code);
  return true;
}

function proxyWithTrapCounter(target, counter) {
  return new Proxy(target, {
    get() {
      counter.calls += 1;
      return undefined;
    },
    getPrototypeOf() {
      counter.calls += 1;
      return Object.prototype;
    },
    ownKeys() {
      counter.calls += 1;
      return [];
    },
    getOwnPropertyDescriptor() {
      counter.calls += 1;
      return undefined;
    },
  });
}

test('bootstrap captures trusted callbacks once and ignores later caller mutation', async () => {
  let originalClockCalls = 0;
  let originalObserverCalls = 0;
  let replacementCalls = 0;
  const options = {
    trustedClock() {
      originalClockCalls += 1;
      return originalClockCalls === 1
        ? '2026-08-20T05:00:11.000Z'
        : '2026-08-20T05:00:13.000Z';
    },
    observeExecution(_reference, deliver) {
      originalObserverCalls += 1;
      deliver(observed());
    },
  };
  const runtime = createReferenceObservationReconciliation(options);
  options.trustedClock = () => {
    replacementCalls += 1;
    return '2030-01-01T00:00:00.000Z';
  };
  options.observeExecution = (_reference, deliver) => {
    replacementCalls += 1;
    deliver({ ...observed(), execution_status: 'error' });
  };

  const result = await runtime.captureAndReconcile({
    expected: expected(),
    observationRef: { id: 'captured-authorities' },
  });
  assert.equal(result.reconciliation.verdict, 'MATCH');
  assert.equal(originalClockCalls, 2);
  assert.equal(originalObserverCalls, 1);
  assert.equal(replacementCalls, 0);
});

test('bootstrap and capture-input Proxy wrappers fail before traps execute', async () => {
  const bootstrapCounter = { calls: 0 };
  assert.throws(
    () => createReferenceObservationReconciliation(proxyWithTrapCounter({
      trustedClock: () => '2026-08-20T05:00:13.000Z',
      observeExecution: (_reference, deliver) => deliver(observed()),
    }, bootstrapCounter)),
    (error) => expectCode(error, 'POMRX_OBS_E_INVALID'),
  );
  assert.equal(bootstrapCounter.calls, 0);

  const runtime = createReferenceObservationReconciliation({
    trustedClock: () => '2026-08-20T05:00:13.000Z',
    observeExecution: (_reference, deliver) => deliver(observed()),
  });
  const inputCounter = { calls: 0 };
  await assert.rejects(
    runtime.captureAndReconcile(proxyWithTrapCounter({
      expected: expected(),
      observationRef: { id: 'proxy' },
    }, inputCounter)),
    (error) => expectCode(error, 'POMRX_OBS_E_REFERENCE_INVALID'),
  );
  assert.equal(inputCounter.calls, 0);
});

test('expected-input accessor is rejected without executing it', async () => {
  let reads = 0;
  let observerCalls = 0;
  const hostileExpected = expected();
  Object.defineProperty(hostileExpected, 'expected_execution_status', {
    enumerable: true,
    get() {
      reads += 1;
      return 'any';
    },
  });
  const runtime = createReferenceObservationReconciliation({
    trustedClock: () => '2026-08-20T05:00:13.000Z',
    observeExecution: (_reference, deliver) => {
      observerCalls += 1;
      deliver(observed());
    },
  });

  await assert.rejects(
    runtime.captureAndReconcile({
      expected: hostileExpected,
      observationRef: { id: 'status-substitution' },
    }),
    (error) => expectCode(error, 'POMRX_OBS_E_REFERENCE_INVALID'),
  );
  assert.equal(reads, 0);
  assert.equal(observerCalls, 0);
});

test('observer Proxy output is rejected in the capture sink before traps execute', async () => {
  const counter = { calls: 0 };
  let clockIndex = 0;
  const clock = ['2026-08-20T05:00:11.000Z', '2026-08-20T05:00:13.000Z'];
  const runtime = createReferenceObservationReconciliation({
    trustedClock: () => clock[Math.min(clockIndex++, clock.length - 1)],
    observeExecution: (_reference, deliver) => {
      deliver(proxyWithTrapCounter(observed(), counter));
    },
  });

  await assert.rejects(
    runtime.captureAndReconcile({
      expected: expected(),
      observationRef: { id: 'observer-proxy' },
    }),
    (error) => expectCode(error, 'POMRX_OBS_E_OBSERVER_INVALID'),
  );
  assert.equal(counter.calls, 0);
});

test('a Proxy returned by the observer is rejected without Promise assimilation or traps', async () => {
  const counter = { calls: 0 };
  const returnedProxy = proxyWithTrapCounter(observed(), counter);
  const runtime = createReferenceObservationReconciliation({
    trustedClock: () => '2026-08-20T05:00:11.000Z',
    observeExecution: () => returnedProxy,
  });

  await assert.rejects(
    runtime.captureAndReconcile({
      expected: expected(),
      observationRef: { id: 'returned-proxy' },
    }),
    (error) => expectCode(error, 'POMRX_OBS_E_OBSERVER_INVALID'),
  );
  assert.equal(counter.calls, 0);
});

test('observer output accessors are rejected by the sink without semantic reads', async () => {
  let reads = 0;
  const hostile = observed();
  Object.defineProperty(hostile, 'binding_profile', {
    enumerable: true,
    get() {
      reads += 1;
      return PROFILE;
    },
  });
  const runtime = createReferenceObservationReconciliation({
    trustedClock: () => '2026-08-20T05:00:11.000Z',
    observeExecution: (_reference, deliver) => deliver(hostile),
  });

  await assert.rejects(
    runtime.captureAndReconcile({
      expected: expected(),
      observationRef: { id: 'accessor-output' },
    }),
    (error) => expectCode(error, 'POMRX_OBS_E_OBSERVER_INVALID'),
  );
  assert.equal(reads, 0);
});

test('conflicting synchronous observer terminal reports fail closed', async () => {
  const runtime = createReferenceObservationReconciliation({
    trustedClock: () => '2026-08-20T05:00:11.000Z',
    observeExecution: (_reference, deliver) => {
      deliver(observed());
      deliver(observed());
    },
  });

  await assert.rejects(
    runtime.captureAndReconcile({
      expected: expected(),
      observationRef: { id: 'double-delivery' },
    }),
    (error) => expectCode(error, 'POMRX_OBS_E_OBSERVER_INVALID'),
  );
});
