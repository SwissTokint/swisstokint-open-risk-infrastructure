import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  createReferenceDurableSingleUseGateHarness,
} from '../core/gate/reference-durable-single-use-gate.mjs';

const h = (character) => character.repeat(64);
const WITNESS_VALID_UNTIL = '2026-08-30T13:01:00.000Z';

function bindingInput() {
  return {
    binding_profile: 'pom-rx-core-reference/0.1',
    run_id: 'run-durable-bootstrap-intrinsic-0001',
    agent_ref: 'agent-durable-bootstrap-intrinsic-01',
    subject_ref: 'subject-durable-bootstrap-intrinsic-01',
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
    issued_at: '2026-08-30T13:00:00.000Z',
    expires_at: '2026-08-30T13:00:30.000Z',
  };
}

function observedFrom(evidence) {
  return {
    binding_profile: evidence.binding.binding_profile,
    action_commitment: evidence.binding.action_commitment,
    context_commitment: evidence.binding.context_commitment,
    prepared_execution: { request: 'prepared-bootstrap-intrinsic-control' },
  };
}

test('post-import descriptor poisoning cannot substitute inner Gate executeDownstream', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-durable-bootstrap-intrinsic-'));
  const originalGetOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
  let evidence;
  let intendedCalls = 0;
  let substitutedCalls = 0;

  const intendedDownstream = async () => {
    intendedCalls += 1;
    return 'expected-downstream';
  };
  const substitutedDownstream = async () => {
    substitutedCalls += 1;
    return 'substituted-downstream';
  };

  let harness;
  try {
    Object.getOwnPropertyDescriptors = function poisonedGetOwnPropertyDescriptors(value) {
      const descriptors = originalGetOwnPropertyDescriptors(value);
      if (
        descriptors.executeDownstream
        && descriptors.observeBinding
        && descriptors.trustedClock
        && !descriptors.rootDir
      ) {
        descriptors.executeDownstream = {
          ...descriptors.executeDownstream,
          value: substitutedDownstream,
        };
      }
      return descriptors;
    };

    harness = createReferenceDurableSingleUseGateHarness({
      rootDir,
      trustedClock: (() => {
        const values = [
          '2026-08-30T13:00:01.000Z',
          '2026-08-30T13:00:02.000Z',
        ];
        let index = 0;
        return () => values[Math.min(index++, values.length - 1)];
      })(),
      observeBinding: async () => observedFrom(evidence),
      executeDownstream: intendedDownstream,
    });
  } finally {
    Object.getOwnPropertyDescriptors = originalGetOwnPropertyDescriptors;
  }

  try {
    const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
      witnessValidUntil: WITNESS_VALID_UNTIL,
    });
    evidence = issued.evidence;

    const result = await harness.gate.consume(issued.capability, { request: 'untrusted-control' });
    assert.equal(result, 'expected-downstream');
    assert.equal(intendedCalls, 1);
    assert.equal(substitutedCalls, 0);
    assert.equal(
      harness.testAuthority.inspectCapabilityStateForTest(issued.capability),
      'CONSUMED_SUCCESS',
    );
    assert.equal(
      (await harness.testAuthority.inspectDurableStateForTest(issued.capability)).state,
      'CONSUMED_SUCCESS',
    );
  } finally {
    Object.getOwnPropertyDescriptors = originalGetOwnPropertyDescriptors;
    await rm(rootDir, { recursive: true, force: true });
  }
});
