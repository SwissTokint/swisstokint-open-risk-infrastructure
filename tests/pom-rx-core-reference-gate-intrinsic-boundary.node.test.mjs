import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createReferenceSingleUseGateHarness,
} from '../core/gate/reference-single-use-gate.mjs';

const h = (character) => character.repeat(64);
const WITNESS_VALID_UNTIL = '2026-08-19T17:01:00.000Z';

function bindingInput() {
  return {
    binding_profile: 'pom-rx-core-reference/0.1',
    run_id: 'run-intrinsic-boundary-0001',
    agent_ref: 'agent-intrinsic-boundary-01',
    subject_ref: 'subject-intrinsic-boundary-01',
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
    issued_at: '2026-08-19T17:00:00.000Z',
    expires_at: '2026-08-19T17:00:30.000Z',
  };
}

function sequenceClock(...values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

function restoreDescriptor(target, key, descriptor) {
  if (descriptor === undefined) delete target[key];
  else Object.defineProperty(target, key, descriptor);
}

function createHarness(preparedExecution) {
  let evidence;
  let downstreamCalls = 0;
  let downstreamArgument = null;
  const harness = createReferenceSingleUseGateHarness({
    trustedClock: sequenceClock(
      '2026-08-19T17:00:01.000Z',
      '2026-08-19T17:00:02.000Z',
    ),
    observeBinding: async () => ({
      binding_profile: evidence.binding.binding_profile,
      action_commitment: evidence.binding.action_commitment,
      context_commitment: evidence.binding.context_commitment,
      prepared_execution: preparedExecution,
    }),
    executeDownstream: async (prepared) => {
      downstreamCalls += 1;
      downstreamArgument = prepared;
      return 'ok';
    },
  });
  const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
    witnessValidUntil: WITNESS_VALID_UNTIL,
  });
  evidence = issued.evidence;
  return {
    harness,
    issued,
    evidence,
    stats: () => ({ downstreamCalls, downstreamArgument }),
  };
}

test('Gate observation snapshot ignores post-import Object.getOwnPropertyDescriptors substitution', async () => {
  const preparedA = Object.freeze({ request: 'recipient-a' });
  const preparedB = Object.freeze({ request: 'recipient-b' });
  const setup = createHarness(preparedA);
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    Object,
    'getOwnPropertyDescriptors',
  );
  const originalDescriptors = originalDescriptor.value;
  let poisonCalls = 0;

  Object.defineProperty(Object, 'getOwnPropertyDescriptors', {
    ...originalDescriptor,
    value(value) {
      const descriptors = originalDescriptors(value);
      if (descriptors.binding_profile?.value === setup.evidence.binding.binding_profile
          && descriptors.action_commitment?.value === setup.evidence.binding.action_commitment
          && descriptors.context_commitment?.value === setup.evidence.binding.context_commitment
          && descriptors.prepared_execution?.value === preparedA) {
        poisonCalls += 1;
        return originalDescriptors({
          binding_profile: setup.evidence.binding.binding_profile,
          action_commitment: setup.evidence.binding.action_commitment,
          context_commitment: setup.evidence.binding.context_commitment,
          prepared_execution: preparedB,
        });
      }
      return descriptors;
    },
  });

  let result;
  try {
    result = await setup.harness.gate.consume(setup.issued.capability, { caller: 'raw' });
  } finally {
    restoreDescriptor(Object, 'getOwnPropertyDescriptors', originalDescriptor);
  }

  assert.equal(poisonCalls, 0, 'Gate observation capture must not dispatch through the ambient descriptor getter');
  assert.equal(result, 'ok');
  assert.equal(setup.stats().downstreamCalls, 1);
  assert.equal(setup.stats().downstreamArgument.request, 'recipient-a');
});

test('prepared execution snapshot ignores post-import Object.getOwnPropertyDescriptors substitution', async () => {
  const preparedA = Object.freeze({ request: 'recipient-a' });
  const setup = createHarness(preparedA);
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    Object,
    'getOwnPropertyDescriptors',
  );
  const originalDescriptors = originalDescriptor.value;
  let poisonCalls = 0;

  Object.defineProperty(Object, 'getOwnPropertyDescriptors', {
    ...originalDescriptor,
    value(value) {
      const descriptors = originalDescriptors(value);
      if (descriptors.request?.value === 'recipient-a'
          && Object.keys(descriptors).length === 1) {
        poisonCalls += 1;
        return originalDescriptors({ request: 'recipient-b' });
      }
      return descriptors;
    },
  });

  let result;
  try {
    result = await setup.harness.gate.consume(setup.issued.capability, { caller: 'raw' });
  } finally {
    restoreDescriptor(Object, 'getOwnPropertyDescriptors', originalDescriptor);
  }

  assert.equal(poisonCalls, 0, 'prepared-data capture must not dispatch through the ambient descriptor getter');
  assert.equal(result, 'ok');
  assert.equal(setup.stats().downstreamCalls, 1);
  assert.equal(setup.stats().downstreamArgument.request, 'recipient-a');
});
