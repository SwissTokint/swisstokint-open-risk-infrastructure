import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PomRxExecutionEvidenceError,
  createReferenceExecutionEvidenceRecorder,
} from '../core/execution/reference-execution-evidence.mjs';

const h = (character) => character.repeat(64);
const ISSUED_AT = '2026-08-19T17:00:00.000Z';
const EXPIRES_AT = '2026-08-19T17:00:30.000Z';

function binding(overrides = {}) {
  return {
    schema_version: 'pom-rx-exact-authorization/0.1',
    capability_id: `cap-${'9'.repeat(32)}`,
    binding_profile: 'pom-rx-core-reference/0.1',
    run_id: 'run-execution-0001',
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
    ...overrides,
  };
}

function sequenceClock(...values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

function recorderAt(...times) {
  return createReferenceExecutionEvidenceRecorder({
    trustedClock: sequenceClock(...times),
  });
}

function expectCode(error, code) {
  assert.ok(error instanceof PomRxExecutionEvidenceError);
  assert.equal(error.code, code);
  return true;
}

test('recorder exposes evidence-only operations and separate test inspection', () => {
  const { recorder, testAuthority } = recorderAt('2026-08-19T17:00:01.000Z');
  assert.deepEqual(Object.keys(recorder).sort(), ['begin', 'complete', 'isLocallyRecorded']);
  assert.deepEqual(Object.keys(testAuthority), ['inspectHandleStateForTest']);
  assert.equal(Object.isFrozen(recorder), true);
});

test('valid success outcome binds authorization, action, context, effect and recorder chronology', () => {
  const { recorder, testAuthority } = recorderAt(
    '2026-08-19T17:00:01.000Z',
    '2026-08-19T17:00:02.000Z',
  );
  const handle = recorder.begin({ authorization_binding: binding() });
  const evidence = recorder.complete(handle, {
    execution_status: 'success',
    effect: { tx_ref: 'fixture-transaction', changed: true },
  });

  assert.equal(evidence.schema_version, 'pom-rx-reference-execution-evidence/0.1');
  assert.equal(evidence.run_id, 'run-execution-0001');
  assert.equal(evidence.action_commitment, h('3'));
  assert.equal(evidence.context_commitment, h('4'));
  assert.equal(evidence.execution_status, 'success');
  assert.match(evidence.authorization_commitment, /^[a-f0-9]{64}$/u);
  assert.match(evidence.effect_commitment, /^[a-f0-9]{64}$/u);
  assert.match(evidence.execution_evidence_hash, /^[a-f0-9]{64}$/u);
  assert.equal(evidence.recording_started_at, '2026-08-19T17:00:01.000Z');
  assert.equal(evidence.recorded_at, '2026-08-19T17:00:02.000Z');
  assert.equal(Object.hasOwn(evidence, 'executed_at'), false);
  assert.equal(evidence.diagnostic, null);
  assert.equal(evidence.reference_only, true);
  assert.equal(evidence.gate_consumption_proved, false);
  assert.equal(evidence.external_execution_proved, false);
  assert.equal(evidence.external_effect_proved, false);
  assert.equal(recorder.isLocallyRecorded(evidence), true);
  assert.equal(testAuthority.inspectHandleStateForTest(handle), 'RECORDED');
});

test('error outcome is known only when a bounded effect is supplied', () => {
  const { recorder } = recorderAt(
    '2026-08-19T17:00:01.000Z',
    '2026-08-19T17:00:02.000Z',
    '2026-08-19T17:00:03.000Z',
    '2026-08-19T17:00:04.000Z',
  );
  const knownHandle = recorder.begin({ authorization_binding: binding() });
  const known = recorder.complete(knownHandle, {
    execution_status: 'error',
    effect: { error_class: 'fixture_revert', external_state: 'unknown' },
  });
  assert.equal(known.execution_status, 'error');
  assert.match(known.effect_commitment, /^[a-f0-9]{64}$/u);

  const invalidHandle = recorder.begin({
    authorization_binding: binding({
      capability_id: `cap-${'8'.repeat(32)}`,
      run_id: 'run-execution-0002',
    }),
  });
  const invalid = recorder.complete(invalidHandle, {
    execution_status: 'error',
    effect: null,
  });
  assert.equal(invalid.execution_status, 'unknown');
  assert.equal(invalid.effect_commitment, null);
  assert.equal(invalid.diagnostic, 'POMRX_EXEC_DIAG_OUTCOME_INVALID');
});

test('explicit unknown outcome cannot claim an effect', () => {
  const { recorder } = recorderAt(
    '2026-08-19T17:00:01.000Z',
    '2026-08-19T17:00:02.000Z',
    '2026-08-19T17:00:03.000Z',
    '2026-08-19T17:00:04.000Z',
  );
  const first = recorder.begin({ authorization_binding: binding() });
  const unknown = recorder.complete(first, {
    execution_status: 'unknown',
    effect: null,
  });
  assert.equal(unknown.execution_status, 'unknown');
  assert.equal(unknown.effect_commitment, null);
  assert.equal(unknown.diagnostic, 'POMRX_EXEC_DIAG_EXECUTION_UNKNOWN');

  const second = recorder.begin({
    authorization_binding: binding({
      capability_id: `cap-${'8'.repeat(32)}`,
      run_id: 'run-execution-0002',
    }),
  });
  const substituted = recorder.complete(second, {
    execution_status: 'unknown',
    effect: { should_not_be_committed: true },
  });
  assert.equal(substituted.execution_status, 'unknown');
  assert.equal(substituted.effect_commitment, null);
  assert.equal(substituted.diagnostic, 'POMRX_EXEC_DIAG_OUTCOME_INVALID');
});

test('authorization binding is snapshotted before later caller mutation', () => {
  const raw = binding();
  const { recorder } = recorderAt(
    '2026-08-19T17:00:01.000Z',
    '2026-08-19T17:00:02.000Z',
  );
  const handle = recorder.begin({ authorization_binding: raw });
  raw.run_id = 'run-mutated-9999';
  raw.action_commitment = h('f');
  raw.context_commitment = h('e');

  const evidence = recorder.complete(handle, {
    execution_status: 'success',
    effect: { accepted: true },
  });
  assert.equal(evidence.run_id, 'run-execution-0001');
  assert.equal(evidence.action_commitment, h('3'));
  assert.equal(evidence.context_commitment, h('4'));
});

test('same authorization cannot open multiple locally branded records', () => {
  const { recorder, testAuthority } = recorderAt(
    '2026-08-19T17:00:01.000Z',
    '2026-08-19T17:00:02.000Z',
    '2026-08-19T17:00:03.000Z',
  );
  const first = recorder.begin({ authorization_binding: binding() });
  assert.throws(
    () => recorder.begin({ authorization_binding: binding() }),
    (error) => expectCode(error, 'POMRX_EXEC_E_AUTHORIZATION_REPLAY'),
  );
  assert.equal(testAuthority.inspectHandleStateForTest(first), 'OPEN');
  const evidence = recorder.complete(first, {
    execution_status: 'success',
    effect: { once: true },
  });
  assert.equal(evidence.execution_status, 'success');
  assert.equal(testAuthority.inspectHandleStateForTest(first), 'RECORDED');
});

test('opaque handle is recorder-instance-local, single-use and clone injection fails', () => {
  const first = recorderAt(
    '2026-08-19T17:00:01.000Z',
    '2026-08-19T17:00:02.000Z',
  );
  const second = recorderAt('2026-08-19T17:00:01.000Z');
  const handle = first.recorder.begin({ authorization_binding: binding() });

  assert.equal(JSON.stringify(handle), '{}');
  assert.deepEqual({ ...handle }, {});
  assert.throws(
    () => second.recorder.complete(handle, { execution_status: 'unknown', effect: null }),
    (error) => expectCode(error, 'POMRX_EXEC_E_HANDLE_REQUIRED'),
  );
  assert.throws(
    () => first.recorder.complete({ ...handle }, { execution_status: 'unknown', effect: null }),
    (error) => expectCode(error, 'POMRX_EXEC_E_HANDLE_REQUIRED'),
  );

  const evidence = first.recorder.complete(handle, {
    execution_status: 'success',
    effect: { once: true },
  });
  assert.equal(first.recorder.isLocallyRecorded(evidence), true);
  assert.throws(
    () => first.recorder.complete(handle, { execution_status: 'success', effect: { twice: true } }),
    (error) => expectCode(error, 'POMRX_EXEC_E_HANDLE_STALE'),
  );
});

test('malformed or accessor-backed outcome becomes terminal unknown evidence without running getters', () => {
  let getterCalls = 0;
  const { recorder, testAuthority } = recorderAt(
    '2026-08-19T17:00:01.000Z',
    '2026-08-19T17:00:02.000Z',
    '2026-08-19T17:00:03.000Z',
    '2026-08-19T17:00:04.000Z',
  );
  const first = recorder.begin({ authorization_binding: binding() });
  const hostile = {};
  Object.defineProperty(hostile, 'execution_status', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return 'success';
    },
  });
  hostile.effect = { changed: true };

  const evidence = recorder.complete(first, hostile);
  assert.equal(getterCalls, 0);
  assert.equal(evidence.execution_status, 'unknown');
  assert.equal(evidence.effect_commitment, null);
  assert.equal(evidence.diagnostic, 'POMRX_EXEC_DIAG_OUTCOME_INVALID');
  assert.equal(testAuthority.inspectHandleStateForTest(first), 'RECORDED');

  const second = recorder.begin({
    authorization_binding: binding({
      capability_id: `cap-${'8'.repeat(32)}`,
      run_id: 'run-execution-0002',
    }),
  });
  const extraField = recorder.complete(second, {
    execution_status: 'success',
    effect: { changed: true },
    unexpected: true,
  });
  assert.equal(extraField.execution_status, 'unknown');
  assert.equal(extraField.diagnostic, 'POMRX_EXEC_DIAG_OUTCOME_INVALID');
});

test('nested effect accessors are rejected without invocation and cannot obtain a commitment', () => {
  let getterCalls = 0;
  const effect = {};
  Object.defineProperty(effect, 'amount', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return 100;
    },
  });
  const { recorder } = recorderAt(
    '2026-08-19T17:00:01.000Z',
    '2026-08-19T17:00:02.000Z',
  );
  const handle = recorder.begin({ authorization_binding: binding() });
  const evidence = recorder.complete(handle, {
    execution_status: 'success',
    effect,
  });
  assert.equal(getterCalls, 0);
  assert.equal(evidence.execution_status, 'unknown');
  assert.equal(evidence.effect_commitment, null);
  assert.equal(evidence.diagnostic, 'POMRX_EXEC_DIAG_OUTCOME_INVALID');
});

test('recording start must be inside the exact authorization window', () => {
  const before = recorderAt('2026-08-19T16:59:59.999Z');
  assert.throws(
    () => before.recorder.begin({ authorization_binding: binding() }),
    (error) => expectCode(error, 'POMRX_EXEC_E_AUTHORIZATION_WINDOW'),
  );

  const atExpiry = recorderAt(EXPIRES_AT);
  assert.throws(
    () => atExpiry.recorder.begin({ authorization_binding: binding() }),
    (error) => expectCode(error, 'POMRX_EXEC_E_AUTHORIZATION_WINDOW'),
  );
});

test('trusted clock rollback during completion fails rather than fabricating chronology', () => {
  const { recorder, testAuthority } = recorderAt(
    '2026-08-19T17:00:05.000Z',
    '2026-08-19T17:00:04.000Z',
  );
  const handle = recorder.begin({ authorization_binding: binding() });
  assert.throws(
    () => recorder.complete(handle, { execution_status: 'success', effect: { changed: true } }),
    (error) => expectCode(error, 'POMRX_EXEC_E_TIME_ROLLBACK'),
  );
  assert.equal(testAuthority.inspectHandleStateForTest(handle), 'FAILED');
});

test('trusted clock rollback is detected before a later record opens', () => {
  const { recorder } = recorderAt(
    '2026-08-19T17:00:01.000Z',
    '2026-08-19T17:00:02.000Z',
    '2026-08-19T17:00:01.500Z',
  );
  const first = recorder.begin({ authorization_binding: binding() });
  recorder.complete(first, { execution_status: 'unknown', effect: null });

  assert.throws(
    () => recorder.begin({
      authorization_binding: binding({
        capability_id: `cap-${'8'.repeat(32)}`,
        run_id: 'run-execution-0002',
      }),
    }),
    (error) => expectCode(error, 'POMRX_EXEC_E_TIME_ROLLBACK'),
  );
});

test('authorization accessors are rejected without execution', () => {
  let getterCalls = 0;
  const raw = binding();
  Object.defineProperty(raw, 'action_commitment', {
    enumerable: true,
    configurable: true,
    get() {
      getterCalls += 1;
      return h('3');
    },
  });
  const { recorder } = recorderAt('2026-08-19T17:00:01.000Z');
  assert.throws(
    () => recorder.begin({ authorization_binding: raw }),
    (error) => expectCode(error, 'POMRX_EXEC_E_AUTHORIZATION_INVALID'),
  );
  assert.equal(getterCalls, 0);
});

test('bootstrap accessors are rejected without executing the getter', () => {
  let getterCalls = 0;
  const options = {};
  Object.defineProperty(options, 'trustedClock', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return () => '2026-08-19T17:00:01.000Z';
    },
  });
  assert.throws(
    () => createReferenceExecutionEvidenceRecorder(options),
    (error) => expectCode(error, 'POMRX_EXEC_E_INVALID'),
  );
  assert.equal(getterCalls, 0);
});

test('local evidence provenance is recorder-specific and structural clones are rejected', () => {
  const first = recorderAt(
    '2026-08-19T17:00:01.000Z',
    '2026-08-19T17:00:02.000Z',
  );
  const second = recorderAt('2026-08-19T17:00:01.000Z');
  const handle = first.recorder.begin({ authorization_binding: binding() });
  const evidence = first.recorder.complete(handle, {
    execution_status: 'success',
    effect: { fixture: 1 },
  });

  assert.equal(first.recorder.isLocallyRecorded(evidence), true);
  assert.equal(second.recorder.isLocallyRecorded(evidence), false);
  assert.equal(first.recorder.isLocallyRecorded({ ...evidence }), false);
});

test('same binding, recorder chronology and outcome produce deterministic commitments', () => {
  function record() {
    const { recorder } = recorderAt(
      '2026-08-19T17:00:01.000Z',
      '2026-08-19T17:00:02.000Z',
    );
    const handle = recorder.begin({ authorization_binding: binding() });
    return recorder.complete(handle, {
      execution_status: 'success',
      effect: { b: 2, a: 1 },
    });
  }

  const first = record();
  const second = record();
  assert.equal(first.authorization_commitment, second.authorization_commitment);
  assert.equal(first.effect_commitment, second.effect_commitment);
  assert.equal(first.execution_evidence_hash, second.execution_evidence_hash);
});
