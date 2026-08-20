import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PomRxExecutionEvidenceError,
  createReferenceExecutionEvidenceRecorder,
} from '../core/execution/reference-execution-evidence.mjs';

const h = (character) => character.repeat(64);

function binding(overrides = {}) {
  return {
    schema_version: 'pom-rx-exact-authorization/0.1',
    capability_id: `cap-${'9'.repeat(32)}`,
    binding_profile: 'pom-rx-core-reference/0.1',
    run_id: 'run-execution-hardening-0001',
    agent_ref: 'agent-execution-hardening-01',
    subject_ref: 'subject-execution-hardening-01',
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
    issued_at: '2026-08-20T09:00:00.000Z',
    expires_at: '2026-08-20T09:00:30.000Z',
    ...overrides,
  };
}

function sequenceClock(...values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

function expectCode(error, code) {
  assert.ok(error instanceof PomRxExecutionEvidenceError);
  assert.equal(error.code, code);
  return true;
}

test('revoked bootstrap Proxy is normalized to the recorder invalid-input diagnostic', () => {
  const { proxy, revoke } = Proxy.revocable({ trustedClock: () => '2026-08-20T09:00:01.000Z' }, {});
  revoke();
  assert.throws(
    () => createReferenceExecutionEvidenceRecorder(proxy),
    (error) => expectCode(error, 'POMRX_EXEC_E_INVALID'),
  );
});

test('revoked begin-envelope Proxy is rejected before Array.isArray can throw', () => {
  const { recorder } = createReferenceExecutionEvidenceRecorder({
    trustedClock: sequenceClock('2026-08-20T09:00:01.000Z'),
  });
  const { proxy, revoke } = Proxy.revocable({ authorization_binding: binding() }, {});
  revoke();
  assert.throws(
    () => recorder.begin(proxy),
    (error) => expectCode(error, 'POMRX_EXEC_E_INVALID'),
  );
});

test('bounded effects outside canonical commitment shape become terminal unknown evidence', () => {
  const { recorder, testAuthority } = createReferenceExecutionEvidenceRecorder({
    trustedClock: sequenceClock(
      '2026-08-20T09:00:01.000Z',
      '2026-08-20T09:00:02.000Z',
      '2026-08-20T09:00:03.000Z',
      '2026-08-20T09:00:04.000Z',
    ),
  });

  const first = recorder.begin({ authorization_binding: binding() });
  const arrayEffect = recorder.complete(first, {
    execution_status: 'success',
    effect: [],
  });
  assert.equal(arrayEffect.execution_status, 'unknown');
  assert.equal(arrayEffect.effect_commitment, null);
  assert.equal(arrayEffect.diagnostic, 'POMRX_EXEC_DIAG_OUTCOME_INVALID');
  assert.equal(testAuthority.inspectHandleStateForTest(first), 'RECORDED');

  const second = recorder.begin({
    authorization_binding: binding({
      capability_id: `cap-${'8'.repeat(32)}`,
      run_id: 'run-execution-hardening-0002',
    }),
  });
  const unsupportedKeyEffect = recorder.complete(second, {
    execution_status: 'error',
    effect: { account_id: 'fixture-account' },
  });
  assert.equal(unsupportedKeyEffect.execution_status, 'unknown');
  assert.equal(unsupportedKeyEffect.effect_commitment, null);
  assert.equal(unsupportedKeyEffect.diagnostic, 'POMRX_EXEC_DIAG_OUTCOME_INVALID');
  assert.equal(testAuthority.inspectHandleStateForTest(second), 'RECORDED');
});
