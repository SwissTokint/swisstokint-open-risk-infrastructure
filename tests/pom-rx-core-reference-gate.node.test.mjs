import assert from 'node:assert/strict';
import test from 'node:test';

import {
  commitExactAuthorizationBinding,
  inspectReferenceCapabilityState,
  issueReferenceExactAuthorization,
} from '../core/authorization/reference-exact-authorization.mjs';
import {
  PomRxGateError,
  createReferenceSingleUseGate,
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

function issue(overrides = {}) {
  return issueReferenceExactAuthorization(bindingInput(overrides), {
    witnessValidUntil: WITNESS_VALID_UNTIL,
  });
}

function observedFrom(evidence, overrides = {}) {
  return {
    binding_profile: evidence.binding.binding_profile,
    action_commitment: evidence.binding.action_commitment,
    context_commitment: evidence.binding.context_commitment,
    ...overrides,
  };
}

function sequenceClock(...values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

function expectGateCode(error, code) {
  assert.ok(error instanceof PomRxGateError);
  assert.equal(error.code, code);
  return true;
}

test('reference exact authorization commitment is deterministic and explicitly non-authorizing', () => {
  const { evidence } = issue();
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

test('reference capability is opaque, non-serializable and clone injection fails closed', async () => {
  const { capability, evidence } = issue();
  assert.equal(JSON.stringify(capability), '{}');
  assert.deepEqual({ ...capability }, {});

  let downstreamCalls = 0;
  const gate = createReferenceSingleUseGate({
    trustedClock: sequenceClock('2026-08-19T17:00:01.000Z'),
    observeBinding: async () => observedFrom(evidence),
    executeDownstream: async () => { downstreamCalls += 1; },
  });

  await assert.rejects(
    gate.consume({ ...capability }, { request: 'clone' }),
    (error) => expectGateCode(error, 'POMRX_GATE_E_CAPABILITY_REQUIRED'),
  );
  assert.equal(downstreamCalls, 0);
  assert.equal(inspectReferenceCapabilityState(capability), 'AVAILABLE');
});

test('exact valid control reaches the private downstream exactly once and success replay fails', async () => {
  const { capability, evidence } = issue();
  let observerCalls = 0;
  let downstreamCalls = 0;
  const gate = createReferenceSingleUseGate({
    trustedClock: sequenceClock(
      '2026-08-19T17:00:01.000Z',
      '2026-08-19T17:00:02.000Z',
    ),
    observeBinding: async () => {
      observerCalls += 1;
      return observedFrom(evidence);
    },
    executeDownstream: async () => {
      downstreamCalls += 1;
      return Object.freeze({ accepted: true });
    },
  });

  const result = await gate.consume(capability, { request: 'control' });
  assert.deepEqual(result, { accepted: true });
  assert.equal(observerCalls, 1);
  assert.equal(downstreamCalls, 1);
  assert.equal(inspectReferenceCapabilityState(capability), 'CONSUMED_SUCCESS');

  await assert.rejects(
    gate.consume(capability, { request: 'replay' }),
    (error) => expectGateCode(error, 'POMRX_GATE_E_CAPABILITY_STALE'),
  );
  assert.equal(observerCalls, 1);
  assert.equal(downstreamCalls, 1);
});

test('action, context and binding-profile mutation are terminal rejects without downstream execution', async () => {
  for (const mutation of [
    { action_commitment: h('9') },
    { context_commitment: h('9') },
    { binding_profile: 'pom-rx-other-profile/0.1' },
  ]) {
    const { capability, evidence } = issue();
    let downstreamCalls = 0;
    const gate = createReferenceSingleUseGate({
      trustedClock: sequenceClock('2026-08-19T17:00:01.000Z'),
      observeBinding: async () => observedFrom(evidence, mutation),
      executeDownstream: async () => { downstreamCalls += 1; },
    });

    await assert.rejects(
      gate.consume(capability, { request: 'mutated' }),
      (error) => expectGateCode(error, 'POMRX_GATE_E_BINDING_MISMATCH'),
    );
    assert.equal(downstreamCalls, 0);
    assert.equal(inspectReferenceCapabilityState(capability), 'REJECTED');
  }
});

test('expiry at reservation fails closed before observer and downstream', async () => {
  const { capability, evidence } = issue();
  let observerCalls = 0;
  let downstreamCalls = 0;
  const gate = createReferenceSingleUseGate({
    trustedClock: sequenceClock(EXPIRES_AT),
    observeBinding: async () => {
      observerCalls += 1;
      return observedFrom(evidence);
    },
    executeDownstream: async () => { downstreamCalls += 1; },
  });

  await assert.rejects(
    gate.consume(capability, { request: 'expired' }),
    (error) => expectGateCode(error, 'POMRX_GATE_E_CAPABILITY_EXPIRED'),
  );
  assert.equal(observerCalls, 0);
  assert.equal(downstreamCalls, 0);
  assert.equal(inspectReferenceCapabilityState(capability), 'REJECTED');
});

test('expiry during asynchronous observation is rechecked immediately before forwarding', async () => {
  const { capability, evidence } = issue();
  let downstreamCalls = 0;
  const gate = createReferenceSingleUseGate({
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

  await assert.rejects(
    gate.consume(capability, { request: 'expires-during-observation' }),
    (error) => expectGateCode(error, 'POMRX_GATE_E_CAPABILITY_EXPIRED'),
  );
  assert.equal(downstreamCalls, 0);
  assert.equal(inspectReferenceCapabilityState(capability), 'REJECTED');
});

test('concurrent double-use reserves synchronously and reaches downstream at most once', async () => {
  const { capability, evidence } = issue();
  let releaseObserver;
  const observerBarrier = new Promise((resolve) => { releaseObserver = resolve; });
  let observerCalls = 0;
  let downstreamCalls = 0;

  const gate = createReferenceSingleUseGate({
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

  const first = gate.consume(capability, { request: 'first' });
  const second = gate.consume(capability, { request: 'second' });

  await assert.rejects(
    second,
    (error) => expectGateCode(error, 'POMRX_GATE_E_CAPABILITY_STALE'),
  );
  assert.equal(observerCalls, 1);
  assert.equal(downstreamCalls, 0);

  releaseObserver();
  assert.equal(await first, 'ok');
  assert.equal(downstreamCalls, 1);
  assert.equal(inspectReferenceCapabilityState(capability), 'CONSUMED_SUCCESS');
});

test('downstream failure is terminal and cannot be replayed', async () => {
  const { capability, evidence } = issue();
  let downstreamCalls = 0;
  const gate = createReferenceSingleUseGate({
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

  await assert.rejects(
    gate.consume(capability, { request: 'downstream-error' }),
    (error) => expectGateCode(error, 'POMRX_GATE_E_DOWNSTREAM_FAILED'),
  );
  assert.equal(downstreamCalls, 1);
  assert.equal(inspectReferenceCapabilityState(capability), 'CONSUMED_ERROR');

  await assert.rejects(
    gate.consume(capability, { request: 'retry' }),
    (error) => expectGateCode(error, 'POMRX_GATE_E_CAPABILITY_STALE'),
  );
  assert.equal(downstreamCalls, 1);
});

test('observer failure and malformed trusted observation are terminal without forwarding', async () => {
  for (const observeBinding of [
    async () => { throw new Error('observer unavailable'); },
    async () => ({ binding_profile: 'pom-rx-core-reference/0.1' }),
  ]) {
    const { capability } = issue();
    let downstreamCalls = 0;
    const gate = createReferenceSingleUseGate({
      trustedClock: sequenceClock('2026-08-19T17:00:01.000Z'),
      observeBinding,
      executeDownstream: async () => { downstreamCalls += 1; },
    });

    await assert.rejects(
      gate.consume(capability, { request: 'observer-failure' }),
      (error) => expectGateCode(error, 'POMRX_GATE_E_OBSERVER_FAILED'),
    );
    assert.equal(downstreamCalls, 0);
    assert.equal(inspectReferenceCapabilityState(capability), 'REJECTED');
  }
});

test('caller-supplied fake trusted fields and extra callbacks cannot replace Gate bootstrap authorities', async () => {
  const { capability, evidence } = issue();
  let injectedCallbackCalls = 0;
  let downstreamCalls = 0;
  const gate = createReferenceSingleUseGate({
    trustedClock: sequenceClock(
      '2026-08-19T17:00:01.000Z',
      '2026-08-19T17:00:02.000Z',
    ),
    observeBinding: async () => observedFrom(evidence),
    executeDownstream: async () => {
      downstreamCalls += 1;
      return 'trusted-downstream';
    },
  });

  const attempt = {
    trusted_clock: '2099-01-01T00:00:00.000Z',
    context_commitment: h('9'),
    origin: 'https://attacker.invalid',
  };
  const result = await gate.consume(
    capability,
    attempt,
    () => { injectedCallbackCalls += 1; },
  );

  assert.equal(result, 'trusted-downstream');
  assert.equal(injectedCallbackCalls, 0);
  assert.equal(downstreamCalls, 1);
});

test('reference issuer rejects invalid trust binding and capability lifetime claims', () => {
  assert.throws(
    () => issueReferenceExactAuthorization(
      bindingInput({ witness_key_id: `ed25519-${'a'.repeat(32)}` }),
      { witnessValidUntil: WITNESS_VALID_UNTIL },
    ),
    /distinct/u,
  );

  assert.throws(
    () => issueReferenceExactAuthorization(
      bindingInput({ expires_at: '2026-08-19T17:06:00.000Z' }),
      { witnessValidUntil: '2026-08-19T17:10:00.000Z' },
    ),
    /between 1 second and 5 minutes/u,
  );

  assert.throws(
    () => issueReferenceExactAuthorization(bindingInput(), {
      witnessValidUntil: '2026-08-19T17:00:10.000Z',
    }),
    /cannot exceed witness validity/u,
  );
});
