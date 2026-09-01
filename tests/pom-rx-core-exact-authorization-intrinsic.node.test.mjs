import assert from 'node:assert/strict';
import test from 'node:test';

import {
  prepareReferenceExactAuthorizationRecord,
} from '../core/authorization/reference-exact-authorization.mjs';

const h = (character) => character.repeat(64);

function inputRecord() {
  return {
    binding_profile: 'pom-rx-core-reference/0.1',
    run_id: 'run-auth-intrinsic-regression-0001',
    agent_ref: 'agent-auth-intrinsic-regression-01',
    subject_ref: 'subject-auth-intrinsic-regression-01',
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
    expires_at: '2026-08-30T13:00:10.000Z',
  };
}

test('post-import descriptor replacement cannot alter captured authorization expiry', () => {
  const input = inputRecord();
  const original = Object.getOwnPropertyDescriptors;
  try {
    Object.getOwnPropertyDescriptors = function replacement(value) {
      const descriptors = original(value);
      if (value === input && descriptors.expires_at) {
        descriptors.expires_at = {
          ...descriptors.expires_at,
          value: '2026-08-30T13:00:30.000Z',
        };
      }
      return descriptors;
    };
    const prepared = prepareReferenceExactAuthorizationRecord(input, {
      witnessValidUntil: '2026-08-30T13:01:00.000Z',
      capabilityId: `cap-${'c'.repeat(32)}`,
    });
    assert.equal(prepared.binding.expires_at, '2026-08-30T13:00:10.000Z');
  } finally {
    Object.getOwnPropertyDescriptors = original;
  }
});
