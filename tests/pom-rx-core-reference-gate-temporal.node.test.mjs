import assert from 'node:assert/strict';
import test from 'node:test';

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
    run_id: 'run-temporal-0001',
    agent_ref: 'agent-temporal-01',
    subject_ref: 'subject-temporal-01',
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

function observedFrom(evidence) {
  return {
    binding_profile: evidence.binding.binding_profile,
    action_commitment: evidence.binding.action_commitment,
    context_commitment: evidence.binding.context_commitment,
    prepared_execution: { operation: 'temporal-control' },
  };
}

function expectGateCode(error, code) {
  assert.ok(error instanceof PomRxGateError);
  assert.equal(error.code, code);
  return true;
}

test('capability cannot be consumed before its issued_at boundary', async () => {
  let observerCalls = 0;
  let downstreamCalls = 0;
  const harness = createReferenceSingleUseGateHarness({
    trustedClock: sequenceClock('2026-08-19T16:59:59.999Z'),
    observeBinding: async () => {
      observerCalls += 1;
      throw new Error('observer must not run');
    },
    executeDownstream: async () => {
      downstreamCalls += 1;
    },
  });
  const { capability } = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
    witnessValidUntil: WITNESS_VALID_UNTIL,
  });

  await assert.rejects(
    harness.gate.consume(capability, { operation: 'too-early' }),
    (error) => expectGateCode(error, 'POMRX_GATE_E_CAPABILITY_NOT_YET_VALID'),
  );
  assert.equal(observerCalls, 0);
  assert.equal(downstreamCalls, 0);
  assert.equal(harness.testAuthority.inspectCapabilityStateForTest(capability), 'REJECTED');
});

test('trusted clock rollback during observation is terminal and non-forwarding', async () => {
  let evidence;
  let downstreamCalls = 0;
  const harness = createReferenceSingleUseGateHarness({
    trustedClock: sequenceClock(
      '2026-08-19T17:00:10.000Z',
      '2026-08-19T17:00:09.000Z',
    ),
    observeBinding: async () => observedFrom(evidence),
    executeDownstream: async () => {
      downstreamCalls += 1;
    },
  });
  const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
    witnessValidUntil: WITNESS_VALID_UNTIL,
  });
  evidence = issued.evidence;

  await assert.rejects(
    harness.gate.consume(issued.capability, { operation: 'rollback-during-observation' }),
    (error) => expectGateCode(error, 'POMRX_GATE_E_TIME_ROLLBACK'),
  );
  assert.equal(downstreamCalls, 0);
  assert.equal(harness.testAuthority.inspectCapabilityStateForTest(issued.capability), 'REJECTED');
});

test('trusted clock rollback across capability consumptions is rejected by one Gate instance', async () => {
  let evidence;
  let observerCalls = 0;
  let downstreamCalls = 0;
  const harness = createReferenceSingleUseGateHarness({
    trustedClock: sequenceClock(
      '2026-08-19T17:00:10.000Z',
      '2026-08-19T17:00:11.000Z',
      '2026-08-19T17:00:09.000Z',
    ),
    observeBinding: async () => {
      observerCalls += 1;
      return observedFrom(evidence);
    },
    executeDownstream: async () => {
      downstreamCalls += 1;
      return 'ok';
    },
  });

  const first = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
    witnessValidUntil: WITNESS_VALID_UNTIL,
  });
  evidence = first.evidence;
  assert.equal(await harness.gate.consume(first.capability, { operation: 'first' }), 'ok');

  const second = harness.testAuthority.issueReferenceAuthorizationForTest(
    bindingInput({ run_id: 'run-temporal-0002' }),
    { witnessValidUntil: WITNESS_VALID_UNTIL },
  );
  evidence = second.evidence;

  await assert.rejects(
    harness.gate.consume(second.capability, { operation: 'second-after-rollback' }),
    (error) => expectGateCode(error, 'POMRX_GATE_E_TIME_ROLLBACK'),
  );
  assert.equal(observerCalls, 1);
  assert.equal(downstreamCalls, 1);
  assert.equal(harness.testAuthority.inspectCapabilityStateForTest(second.capability), 'REJECTED');
});

test('issued_at boundary and equal trusted-clock samples are accepted exactly once', async () => {
  let evidence;
  let downstreamCalls = 0;
  const harness = createReferenceSingleUseGateHarness({
    trustedClock: sequenceClock(ISSUED_AT, ISSUED_AT),
    observeBinding: async () => observedFrom(evidence),
    executeDownstream: async () => {
      downstreamCalls += 1;
      return 'ok';
    },
  });
  const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
    witnessValidUntil: WITNESS_VALID_UNTIL,
  });
  evidence = issued.evidence;

  assert.equal(await harness.gate.consume(issued.capability, { operation: 'at-issued-at' }), 'ok');
  assert.equal(downstreamCalls, 1);
  assert.equal(harness.testAuthority.inspectCapabilityStateForTest(issued.capability), 'CONSUMED_SUCCESS');
});
