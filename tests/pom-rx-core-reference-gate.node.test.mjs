import assert from 'node:assert/strict';
import test from 'node:test';

import * as authorizationModule from '../core/authorization/reference-exact-authorization.mjs';
import {
  commitExactAuthorizationBinding,
} from '../core/authorization/reference-exact-authorization.mjs';
import {
  PomRxGateError,
  createReferenceSingleUseGateHarness,
} from '../core/gate/reference-single-use-gate.mjs';

const h = (character) => character.repeat(64);
const ISSUED_AT = '2026-08-19T17:00:00.000Z';
const EXPIRES_AT = '2026-08-19T17:00:30.000Z';
const WITNESS_VALID_UNTIL = '2026-08-19T17:01:00.000Z';

function bindingInput(overrides = {}) {
  return {
    binding_profile: 'pom-rx-core-reference/0.1',
    run_id: 'run-reference-0001',
    agent_ref: 'agent-reference-01',
    subject_ref: 'subject-reference-01',
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
    issued_at: ISSUED_AT,
    expires_at: EXPIRES_AT,
    ...overrides,
  };
}

function sequenceClock(...values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

function observedFrom(evidence, overrides = {}) {
  return {
    binding_profile: evidence.binding.binding_profile,
    action_commitment: evidence.binding.action_commitment,
    context_commitment: evidence.binding.context_commitment,
    prepared_execution: { request: 'prepared-control', value: 1 },
    ...overrides,
  };
}

function expectGateCode(error, code) {
  assert.ok(error instanceof PomRxGateError);
  assert.equal(error.code, code);
  return true;
}

function createHarness(overrides = {}) {
  let latestEvidence = null;
  let observerCalls = 0;
  let downstreamCalls = 0;
  let downstreamArgument = null;

  const harness = createReferenceSingleUseGateHarness({
    trustedClock: overrides.trustedClock ?? sequenceClock(
      '2026-08-19T17:00:01.000Z',
      '2026-08-19T17:00:02.000Z',
    ),
    observeBinding: overrides.observeBinding ?? (async () => {
      observerCalls += 1;
      return observedFrom(latestEvidence);
    }),
    executeDownstream: overrides.executeDownstream ?? (async (preparedExecution) => {
      downstreamCalls += 1;
      downstreamArgument = preparedExecution;
      return Object.freeze({ accepted: true });
    }),
  });

  return {
    ...harness,
    issue(overridesForBinding = {}) {
      const issued = harness.testAuthority.issueReferenceAuthorizationForTest(
        bindingInput(overridesForBinding),
        { witnessValidUntil: WITNESS_VALID_UNTIL },
      );
      latestEvidence = issued.evidence;
      return issued;
    },
    stats() {
      return { observerCalls, downstreamCalls, downstreamArgument };
    },
  };
}

test('reference authorization record is deterministic and explicitly non-authorizing', () => {
  const harness = createHarness();
  const { evidence } = harness.issue();
  assert.equal(evidence.reference_only, true);
  assert.equal(evidence.authorization_eligible, false);
  assert.equal(evidence.authorization_proved, false);
  assert.match(evidence.binding.capability_id, /^cap-[a-f0-9]{32}$/u);

  const reordered = Object.fromEntries(Object.entries(evidence.binding).reverse());
  const first = commitExactAuthorizationBinding(evidence.binding);
  const second = commitExactAuthorizationBinding(reordered);
  assert.equal(first.authorizationCommitment, evidence.authorization_commitment);
  assert.equal(first.authorizationCommitment, second.authorizationCommitment);
});

test('authorization module exposes no global capability registry or lifecycle transition API', () => {
  for (const forbiddenExport of [
    'issueReferenceExactAuthorization',
    'reserveReferenceCapabilityForGate',
    'rejectReferenceCapabilityForGate',
    'beginReferenceCapabilityConsumptionForGate',
    'completeReferenceCapabilityConsumptionForGate',
    'inspectReferenceCapabilityState',
  ]) {
    assert.equal(Object.hasOwn(authorizationModule, forbiddenExport), false);
  }
});

test('untrusted Gate handle exposes consume only and reference authority is explicitly test-only', () => {
  const { gate, testAuthority } = createHarness();
  assert.deepEqual(Object.keys(gate), ['consume']);
  assert.deepEqual(Object.keys(testAuthority).sort(), [
    'inspectCapabilityStateForTest',
    'issueReferenceAuthorizationForTest',
  ]);
});

test('reference capability is opaque and clone injection fails closed', async () => {
  const harness = createHarness();
  const { capability } = harness.issue();
  assert.equal(JSON.stringify(capability), '{}');
  assert.deepEqual({ ...capability }, {});

  await assert.rejects(
    harness.gate.consume({ ...capability }, { request: 'clone' }),
    (error) => expectGateCode(error, 'POMRX_GATE_E_CAPABILITY_REQUIRED'),
  );
  assert.equal(harness.stats().downstreamCalls, 0);
  assert.equal(harness.testAuthority.inspectCapabilityStateForTest(capability), 'AVAILABLE');
});

test('capability audience is bound to the Gate instance that issued it', async () => {
  const firstHarness = createHarness();
  const secondHarness = createHarness();
  const { capability } = firstHarness.issue();

  await assert.rejects(
    secondHarness.gate.consume(capability, { request: 'wrong-gate' }),
    (error) => expectGateCode(error, 'POMRX_GATE_E_CAPABILITY_REQUIRED'),
  );
  assert.equal(secondHarness.stats().downstreamCalls, 0);
  assert.equal(firstHarness.testAuthority.inspectCapabilityStateForTest(capability), 'AVAILABLE');
});

test('exact valid control reaches private downstream once with a Gate-owned prepared snapshot', async () => {
  const harness = createHarness();
  const { capability } = harness.issue();
  const rawAttempt = { request: 'raw-untrusted', value: 999 };

  const result = await harness.gate.consume(capability, rawAttempt);
  assert.deepEqual(result, { accepted: true });
  assert.equal(harness.stats().observerCalls, 1);
  assert.equal(harness.stats().downstreamCalls, 1);
  assert.notEqual(harness.stats().downstreamArgument, rawAttempt);
  assert.equal(harness.stats().downstreamArgument.request, 'prepared-control');
  assert.equal(harness.stats().downstreamArgument.value, 1);
  assert.equal(Object.isFrozen(harness.stats().downstreamArgument), true);
  assert.equal(harness.testAuthority.inspectCapabilityStateForTest(capability), 'CONSUMED_SUCCESS');

  await assert.rejects(
    harness.gate.consume(capability, { request: 'replay' }),
    (error) => expectGateCode(error, 'POMRX_GATE_E_CAPABILITY_STALE'),
  );
  assert.equal(harness.stats().downstreamCalls, 1);
});

test('caller mutation after validation cannot alter downstream prepared execution', async () => {
  let evidence;
  let downstreamStarted;
  const downstreamStartedPromise = new Promise((resolve) => { downstreamStarted = resolve; });
  let releaseDownstream;
  const downstreamBarrier = new Promise((resolve) => { releaseDownstream = resolve; });
  let downstreamAmount;

  const rawAttempt = { request: 'control', nested: { amount: 1 } };
  const harness = createReferenceSingleUseGateHarness({
    trustedClock: sequenceClock(
      '2026-08-19T17:00:01.000Z',
      '2026-08-19T17:00:02.000Z',
    ),
    observeBinding: async (attempt) => ({
      ...observedFrom(evidence),
      prepared_execution: attempt,
    }),
    executeDownstream: async (preparedExecution) => {
      downstreamStarted();
      await downstreamBarrier;
      downstreamAmount = preparedExecution.nested.amount;
      return 'ok';
    },
  });
  const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
    witnessValidUntil: WITNESS_VALID_UNTIL,
  });
  evidence = issued.evidence;

  const consumption = harness.gate.consume(issued.capability, rawAttempt);
  await downstreamStartedPromise;
  rawAttempt.nested.amount = 999;
  rawAttempt.request = 'mutated-after-validation';
  releaseDownstream();

  assert.equal(await consumption, 'ok');
  assert.equal(downstreamAmount, 1);
  assert.equal(harness.testAuthority.inspectCapabilityStateForTest(issued.capability), 'CONSUMED_SUCCESS');
});

test('action, context and binding-profile mutation terminally reject without downstream', async () => {
  for (const mutation of [
    { action_commitment: h('9') },
    { context_commitment: h('9') },
    { binding_profile: 'pom-rx-other-profile/0.1' },
  ]) {
    let evidence;
    let downstreamCalls = 0;
    const harness = createReferenceSingleUseGateHarness({
      trustedClock: sequenceClock('2026-08-19T17:00:01.000Z'),
      observeBinding: async () => observedFrom(evidence, mutation),
      executeDownstream: async () => { downstreamCalls += 1; },
    });
    const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
      witnessValidUntil: WITNESS_VALID_UNTIL,
    });
    evidence = issued.evidence;

    await assert.rejects(
      harness.gate.consume(issued.capability, { request: 'mutated' }),
      (error) => expectGateCode(error, 'POMRX_GATE_E_BINDING_MISMATCH'),
    );
    assert.equal(downstreamCalls, 0);
    assert.equal(harness.testAuthority.inspectCapabilityStateForTest(issued.capability), 'REJECTED');
  }
});

test('expiry at reservation fails before observer and downstream', async () => {
  let observerCalls = 0;
  let downstreamCalls = 0;
  const harness = createReferenceSingleUseGateHarness({
    trustedClock: sequenceClock(EXPIRES_AT),
    observeBinding: async () => {
      observerCalls += 1;
      throw new Error('must not run');
    },
    executeDownstream: async () => { downstreamCalls += 1; },
  });
  const { capability } = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
    witnessValidUntil: WITNESS_VALID_UNTIL,
  });

  await assert.rejects(
    harness.gate.consume(capability, { request: 'expired' }),
    (error) => expectGateCode(error, 'POMRX_GATE_E_CAPABILITY_EXPIRED'),
  );
  assert.equal(observerCalls, 0);
  assert.equal(downstreamCalls, 0);
  assert.equal(harness.testAuthority.inspectCapabilityStateForTest(capability), 'REJECTED');
});

test('expiry during asynchronous observation is rechecked immediately before forwarding', async () => {
  let evidence;
  let downstreamCalls = 0;
  const harness = createReferenceSingleUseGateHarness({
    trustedClock: sequenceClock(
      '2026-08-19T17:00:29.000Z',
      EXPIRES_AT,
    ),
    observeBinding: async () => {
      await Promise.resolve();
      return observedFrom(evidence);
    },
    executeDownstream: async () => { downstreamCalls += 1; },
  });
  const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
    witnessValidUntil: WITNESS_VALID_UNTIL,
  });
  evidence = issued.evidence;

  await assert.rejects(
    harness.gate.consume(issued.capability, { request: 'expires-during-observation' }),
    (error) => expectGateCode(error, 'POMRX_GATE_E_CAPABILITY_EXPIRED'),
  );
  assert.equal(downstreamCalls, 0);
  assert.equal(harness.testAuthority.inspectCapabilityStateForTest(issued.capability), 'REJECTED');
});

test('concurrent double-use reserves synchronously and reaches downstream at most once', async () => {
  let evidence;
  let releaseObserver;
  const observerBarrier = new Promise((resolve) => { releaseObserver = resolve; });
  let observerCalls = 0;
  let downstreamCalls = 0;

  const harness = createReferenceSingleUseGateHarness({
    trustedClock: sequenceClock(
      '2026-08-19T17:00:01.000Z',
      '2026-08-19T17:00:02.000Z',
    ),
    observeBinding: async () => {
      observerCalls += 1;
      await observerBarrier;
      return observedFrom(evidence);
    },
    executeDownstream: async () => {
      downstreamCalls += 1;
      return 'ok';
    },
  });
  const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
    witnessValidUntil: WITNESS_VALID_UNTIL,
  });
  evidence = issued.evidence;

  const first = harness.gate.consume(issued.capability, { request: 'first' });
  const second = harness.gate.consume(issued.capability, { request: 'second' });

  await assert.rejects(
    second,
    (error) => expectGateCode(error, 'POMRX_GATE_E_CAPABILITY_STALE'),
  );
  assert.equal(observerCalls, 1);
  assert.equal(downstreamCalls, 0);

  releaseObserver();
  assert.equal(await first, 'ok');
  assert.equal(downstreamCalls, 1);
  assert.equal(harness.testAuthority.inspectCapabilityStateForTest(issued.capability), 'CONSUMED_SUCCESS');
});

test('downstream failure is terminal and cannot be replayed', async () => {
  let evidence;
  let downstreamCalls = 0;
  const harness = createReferenceSingleUseGateHarness({
    trustedClock: sequenceClock(
      '2026-08-19T17:00:01.000Z',
      '2026-08-19T17:00:02.000Z',
    ),
    observeBinding: async () => observedFrom(evidence),
    executeDownstream: async () => {
      downstreamCalls += 1;
      throw new Error('sensitive downstream detail');
    },
  });
  const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
    witnessValidUntil: WITNESS_VALID_UNTIL,
  });
  evidence = issued.evidence;

  await assert.rejects(
    harness.gate.consume(issued.capability, { request: 'downstream-error' }),
    (error) => expectGateCode(error, 'POMRX_GATE_E_DOWNSTREAM_FAILED'),
  );
  assert.equal(downstreamCalls, 1);
  assert.equal(harness.testAuthority.inspectCapabilityStateForTest(issued.capability), 'CONSUMED_ERROR');

  await assert.rejects(
    harness.gate.consume(issued.capability, { request: 'retry' }),
    (error) => expectGateCode(error, 'POMRX_GATE_E_CAPABILITY_STALE'),
  );
  assert.equal(downstreamCalls, 1);
});

test('observer failure, malformed binding and unsafe prepared execution are terminal', async () => {
  const observerCases = [
    async () => { throw new Error('observer unavailable'); },
    async () => ({ binding_profile: 'pom-rx-core-reference/0.1' }),
    async () => ({
      binding_profile: 'pom-rx-core-reference/0.1',
      action_commitment: h('3'),
      context_commitment: h('4'),
      prepared_execution: new Date(),
    }),
    async () => ({
      binding_profile: 'pom-rx-core-reference/0.1',
      action_commitment: h('3'),
      context_commitment: h('4'),
      prepared_execution: [1, , 3],
    }),
  ];

  for (const observeBinding of observerCases) {
    let downstreamCalls = 0;
    const harness = createReferenceSingleUseGateHarness({
      trustedClock: sequenceClock('2026-08-19T17:00:01.000Z'),
      observeBinding,
      executeDownstream: async () => { downstreamCalls += 1; },
    });
    const { capability } = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
      witnessValidUntil: WITNESS_VALID_UNTIL,
    });

    await assert.rejects(
      harness.gate.consume(capability, { request: 'observer-failure' }),
      (error) => expectGateCode(error, 'POMRX_GATE_E_OBSERVER_FAILED'),
    );
    assert.equal(downstreamCalls, 0);
    assert.equal(harness.testAuthority.inspectCapabilityStateForTest(capability), 'REJECTED');
  }
});

test('caller fake trusted fields and extra callback cannot replace Gate bootstrap authorities', async () => {
  let evidence;
  let injectedCallbackCalls = 0;
  let downstreamCalls = 0;
  let downstreamArgument;
  const harness = createReferenceSingleUseGateHarness({
    trustedClock: sequenceClock(
      '2026-08-19T17:00:01.000Z',
      '2026-08-19T17:00:02.000Z',
    ),
    observeBinding: async () => observedFrom(evidence, {
      prepared_execution: { operation: 'trusted-prepared' },
    }),
    executeDownstream: async (preparedExecution) => {
      downstreamCalls += 1;
      downstreamArgument = preparedExecution;
      return 'trusted-downstream';
    },
  });
  const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
    witnessValidUntil: WITNESS_VALID_UNTIL,
  });
  evidence = issued.evidence;

  const attempt = {
    trusted_clock: '2099-01-01T00:00:00.000Z',
    context_commitment: h('9'),
    origin: 'https://attacker.invalid',
    operation: 'caller-controlled',
  };
  const result = await harness.gate.consume(
    issued.capability,
    attempt,
    () => { injectedCallbackCalls += 1; },
  );

  assert.equal(result, 'trusted-downstream');
  assert.equal(injectedCallbackCalls, 0);
  assert.equal(downstreamCalls, 1);
  assert.equal(downstreamArgument.operation, 'trusted-prepared');
  assert.notEqual(downstreamArgument, attempt);
});

test('reference test authority rejects invalid trust binding and capability lifetime claims', () => {
  const harness = createHarness();

  assert.throws(
    () => harness.testAuthority.issueReferenceAuthorizationForTest(
      bindingInput({ witness_key_id: `ed25519-${'a'.repeat(32)}` }),
      { witnessValidUntil: WITNESS_VALID_UNTIL },
    ),
    /distinct/u,
  );

  assert.throws(
    () => harness.testAuthority.issueReferenceAuthorizationForTest(
      bindingInput({ expires_at: '2026-08-19T17:06:00.000Z' }),
      { witnessValidUntil: '2026-08-19T17:10:00.000Z' },
    ),
    /between 1 second and 5 minutes/u,
  );

  assert.throws(
    () => harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
      witnessValidUntil: '2026-08-19T17:00:10.000Z',
    }),
    /cannot exceed witness validity/u,
  );
});
