import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PomRxExecutionEvidenceError,
  createReferenceExecutionEvidenceRecorder,
} from '../core/execution/reference-execution-evidence.mjs';

const h = (character) => character.repeat(64);
const ISSUED_AT = '2026-08-20T09:00:00.000Z';
const EXPIRES_AT = '2026-08-20T09:00:30.000Z';

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
  const { recorder, testAuthority } = recorderAt('2026-08-20T09:00:01.000Z');
  assert.deepEqual(Object.keys(recorder).sort(), ['begin', 'complete', 'isLocallyRecorded']);
  assert.deepEqual(Object.keys(testAuthority), ['inspectHandleStateForTest']);
  assert.equal(Object.isFrozen(recorder), true);
});

test('known success binds authorization, effect and recorder-only chronology', () => {
  const { recorder, testAuthority } = recorderAt(
    '2026-08-20T09:00:01.000Z',
    '2026-08-20T09:00:02.000Z',
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
  assert.equal(evidence.recording_started_at, '2026-08-20T09:00:01.000Z');
  assert.equal(evidence.recorded_at, '2026-08-20T09:00:02.000Z');
  assert.equal(Object.hasOwn(evidence, 'executed_at'), false);
  assert.equal(evidence.reference_only, true);
  assert.equal(evidence.gate_consumption_proved, false);
  assert.equal(evidence.native_execution_time_proved, false);
  assert.equal(evidence.external_execution_proved, false);
  assert.equal(evidence.external_effect_proved, false);
  assert.equal(recorder.isLocallyRecorded(evidence), true);
  assert.equal(testAuthority.inspectHandleStateForTest(handle), 'RECORDED');
});

test('known error needs a bounded effect while malformed known outcome becomes unknown', () => {
  const { recorder } = recorderAt(
    '2026-08-20T09:00:01.000Z',
    '2026-08-20T09:00:02.000Z',
    '2026-08-20T09:00:03.000Z',
    '2026-08-20T09:00:04.000Z',
  );
  const first = recorder.begin({ authorization_binding: binding() });
  const known = recorder.complete(first, {
    execution_status: 'error',
    effect: { error_class: 'fixture_revert' },
  });
  assert.equal(known.execution_status, 'error');
  assert.match(known.effect_commitment, /^[a-f0-9]{64}$/u);

  const second = recorder.begin({
    authorization_binding: binding({
      capability_id: `cap-${'8'.repeat(32)}`,
      run_id: 'run-execution-0002',
    }),
  });
  const invalid = recorder.complete(second, {
    execution_status: 'error',
    effect: null,
  });
  assert.equal(invalid.execution_status, 'unknown');
  assert.equal(invalid.effect_commitment, null);
  assert.equal(invalid.diagnostic, 'POMRX_EXEC_DIAG_OUTCOME_INVALID');
});

test('explicit unknown cannot claim an effect', () => {
  const { recorder } = recorderAt(
    '2026-08-20T09:00:01.000Z',
    '2026-08-20T09:00:02.000Z',
  );
  const handle = recorder.begin({ authorization_binding: binding() });
  const evidence = recorder.complete(handle, {
    execution_status: 'unknown',
    effect: null,
  });
  assert.equal(evidence.execution_status, 'unknown');
  assert.equal(evidence.effect_commitment, null);
  assert.equal(evidence.diagnostic, 'POMRX_EXEC_DIAG_EXECUTION_UNKNOWN');
});

test('authorization binding is detached before later caller mutation', () => {
  const raw = binding();
  const { recorder } = recorderAt(
    '2026-08-20T09:00:01.000Z',
    '2026-08-20T09:00:02.000Z',
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

test('same exact authorization opens at most one recorder lifecycle', () => {
  const { recorder, testAuthority } = recorderAt(
    '2026-08-20T09:00:01.000Z',
    '2026-08-20T09:00:02.000Z',
    '2026-08-20T09:00:03.000Z',
  );
  const first = recorder.begin({ authorization_binding: binding() });
  assert.throws(
    () => recorder.begin({ authorization_binding: binding() }),
    (error) => expectCode(error, 'POMRX_EXEC_E_AUTHORIZATION_REPLAY'),
  );
  assert.equal(testAuthority.inspectHandleStateForTest(first), 'OPEN');
  recorder.complete(first, { execution_status: 'unknown', effect: null });
  assert.equal(testAuthority.inspectHandleStateForTest(first), 'RECORDED');
});

test('opaque handles and local evidence provenance are recorder-instance-local', () => {
  const first = recorderAt(
    '2026-08-20T09:00:01.000Z',
    '2026-08-20T09:00:02.000Z',
  );
  const second = recorderAt('2026-08-20T09:00:01.000Z');
  const handle = first.recorder.begin({ authorization_binding: binding() });

  assert.equal(JSON.stringify(handle), '{}');
  assert.throws(
    () => second.recorder.complete(handle, { execution_status: 'unknown', effect: null }),
    (error) => expectCode(error, 'POMRX_EXEC_E_HANDLE_REQUIRED'),
  );
  const evidence = first.recorder.complete(handle, {
    execution_status: 'success',
    effect: { once: true },
  });
  assert.equal(first.recorder.isLocallyRecorded(evidence), true);
  assert.equal(second.recorder.isLocallyRecorded(evidence), false);
  assert.equal(first.recorder.isLocallyRecorded({ ...evidence }), false);
  assert.throws(
    () => first.recorder.complete(handle, { execution_status: 'unknown', effect: null }),
    (error) => expectCode(error, 'POMRX_EXEC_E_HANDLE_STALE'),
  );
});

test('accessor-backed outcome becomes terminal unknown without executing getters', () => {
  let getterCalls = 0;
  const hostile = {};
  Object.defineProperty(hostile, 'execution_status', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return 'success';
    },
  });
  hostile.effect = { changed: true };

  const { recorder, testAuthority } = recorderAt(
    '2026-08-20T09:00:01.000Z',
    '2026-08-20T09:00:02.000Z',
  );
  const handle = recorder.begin({ authorization_binding: binding() });
  const evidence = recorder.complete(handle, hostile);
  assert.equal(getterCalls, 0);
  assert.equal(evidence.execution_status, 'unknown');
  assert.equal(evidence.effect_commitment, null);
  assert.equal(evidence.diagnostic, 'POMRX_EXEC_DIAG_OUTCOME_INVALID');
  assert.equal(testAuthority.inspectHandleStateForTest(handle), 'RECORDED');
});

test('nested effect accessors and decorated outcomes cannot mint known effects', () => {
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
    '2026-08-20T09:00:01.000Z',
    '2026-08-20T09:00:02.000Z',
    '2026-08-20T09:00:03.000Z',
    '2026-08-20T09:00:04.000Z',
  );
  const first = recorder.begin({ authorization_binding: binding() });
  const accessorEvidence = recorder.complete(first, {
    execution_status: 'success',
    effect,
  });
  assert.equal(getterCalls, 0);
  assert.equal(accessorEvidence.execution_status, 'unknown');

  const second = recorder.begin({
    authorization_binding: binding({
      capability_id: `cap-${'8'.repeat(32)}`,
      run_id: 'run-execution-0002',
    }),
  });
  const extraEvidence = recorder.complete(second, {
    execution_status: 'success',
    effect: { changed: true },
    unexpected: true,
  });
  assert.equal(extraEvidence.execution_status, 'unknown');
  assert.equal(extraEvidence.diagnostic, 'POMRX_EXEC_DIAG_OUTCOME_INVALID');
});

test('authorization and outcome Proxies fail closed before trap execution', () => {
  let authTrapCalls = 0;
  const proxiedBinding = new Proxy(binding(), {
    getPrototypeOf() {
      authTrapCalls += 1;
      return Object.prototype;
    },
    ownKeys() {
      authTrapCalls += 1;
      return [];
    },
  });
  const first = recorderAt('2026-08-20T09:00:01.000Z');
  assert.throws(
    () => first.recorder.begin({ authorization_binding: proxiedBinding }),
    (error) => expectCode(error, 'POMRX_EXEC_E_AUTHORIZATION_INVALID'),
  );
  assert.equal(authTrapCalls, 0);

  let outcomeTrapCalls = 0;
  const proxiedOutcome = new Proxy({ execution_status: 'success', effect: { changed: true } }, {
    getPrototypeOf() {
      outcomeTrapCalls += 1;
      return Object.prototype;
    },
    ownKeys() {
      outcomeTrapCalls += 1;
      return [];
    },
  });
  const second = recorderAt(
    '2026-08-20T09:00:01.000Z',
    '2026-08-20T09:00:02.000Z',
  );
  const handle = second.recorder.begin({ authorization_binding: binding() });
  const evidence = second.recorder.complete(handle, proxiedOutcome);
  assert.equal(outcomeTrapCalls, 0);
  assert.equal(evidence.execution_status, 'unknown');
  assert.equal(evidence.effect_commitment, null);
});

test('authorization window is half-open and exact issued_at is accepted', () => {
  const exactStart = recorderAt(
    ISSUED_AT,
    '2026-08-20T09:00:00.001Z',
  );
  const handle = exactStart.recorder.begin({ authorization_binding: binding() });
  const evidence = exactStart.recorder.complete(handle, {
    execution_status: 'unknown',
    effect: null,
  });
  assert.equal(evidence.recording_started_at, ISSUED_AT);

  const before = recorderAt('2026-08-20T08:59:59.999Z');
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

test('trusted-clock rollback at completion is terminal', () => {
  const { recorder, testAuthority } = recorderAt(
    '2026-08-20T09:00:05.000Z',
    '2026-08-20T09:00:04.000Z',
  );
  const handle = recorder.begin({ authorization_binding: binding() });
  assert.throws(
    () => recorder.complete(handle, { execution_status: 'success', effect: { changed: true } }),
    (error) => expectCode(error, 'POMRX_EXEC_E_TIME_ROLLBACK'),
  );
  assert.equal(testAuthority.inspectHandleStateForTest(handle), 'FAILED');
  assert.throws(
    () => recorder.complete(handle, { execution_status: 'unknown', effect: null }),
    (error) => expectCode(error, 'POMRX_EXEC_E_HANDLE_STALE'),
  );
});

test('trusted-clock rollback across separate openings fails closed', () => {
  const { recorder } = recorderAt(
    '2026-08-20T09:00:01.000Z',
    '2026-08-20T09:00:02.000Z',
    '2026-08-20T09:00:01.500Z',
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

test('reference replay memory is explicitly bounded and fails closed at capacity', () => {
  const { recorder } = recorderAt('2026-08-20T09:00:01.000Z');
  for (let index = 0; index < 1_000; index += 1) {
    recorder.begin({
      authorization_binding: binding({
        capability_id: `cap-${BigInt(index + 1).toString(16).padStart(32, '0')}`,
        run_id: `run-exec-capacity-${String(index).padStart(4, '0')}`,
      }),
    });
  }

  assert.throws(
    () => recorder.begin({
      authorization_binding: binding({
        capability_id: `cap-${'f'.repeat(32)}`,
        run_id: 'run-exec-capacity-overflow',
      }),
    }),
    (error) => expectCode(error, 'POMRX_EXEC_E_CAPACITY'),
  );
});
