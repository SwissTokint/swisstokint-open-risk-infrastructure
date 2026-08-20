import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createReferenceExecutionEvidenceRecorder,
} from '../core/execution/reference-execution-evidence.mjs';

const h = (character) => character.repeat(64);
const ISSUED_AT = '2026-08-20T09:00:00.000Z';
const EXPIRES_AT = '2026-08-20T09:00:30.000Z';

function binding(index) {
  return {
    schema_version: 'pom-rx-exact-authorization/0.1',
    capability_id: `cap-${BigInt(index + 1).toString(16).padStart(32, '0')}`,
    binding_profile: 'pom-rx-core-reference/0.1',
    run_id: `run-exec-canonical-${String(index).padStart(4, '0')}`,
    agent_ref: 'agent-execution-01',
    subject_ref: 'subject-execution-01',
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
  };
}

function recorder() {
  const times = [
    '2026-08-20T09:00:01.000Z',
    '2026-08-20T09:00:02.000Z',
  ];
  let index = 0;
  return createReferenceExecutionEvidenceRecorder({
    trustedClock: () => times[Math.min(index++, times.length - 1)],
  });
}

test('plain-data-valid but canonicalization-invalid effects become explicit terminal unknown evidence', () => {
  const cases = [
    [],
    { account_id: 'x' },
    { note: 'x'.repeat(2_049) },
  ];

  for (const [index, effect] of cases.entries()) {
    const { recorder: evidenceRecorder, testAuthority } = recorder();
    const handle = evidenceRecorder.begin({ authorization_binding: binding(index) });
    const evidence = evidenceRecorder.complete(handle, {
      execution_status: 'success',
      effect,
    });

    assert.equal(evidence.execution_status, 'unknown');
    assert.equal(evidence.effect_commitment, null);
    assert.equal(evidence.diagnostic, 'POMRX_EXEC_DIAG_OUTCOME_INVALID');
    assert.equal(evidenceRecorder.isLocallyRecorded(evidence), true);
    assert.equal(testAuthority.inspectHandleStateForTest(handle), 'RECORDED');
  }
});
