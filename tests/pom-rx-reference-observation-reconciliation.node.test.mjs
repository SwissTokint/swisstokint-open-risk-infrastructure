import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PomRxObservationError,
  createReferenceObservationReconciliation,
} from '../core/observation/reference-observation-reconciliation.mjs';

const hash = (character) => character.repeat(64);
const ACTION = hash('a');
const CONTEXT = hash('b');
const AUTHORIZATION = hash('c');
const EFFECT = hash('d');
const OTHER = hash('e');

function expected(overrides = {}) {
  return {
    binding_profile: 'pom-rx-reference-observation/0.1',
    run_id: 'run-reference-observation-0001',
    authorization_commitment: AUTHORIZATION,
    action_commitment: ACTION,
    context_commitment: CONTEXT,
    authorization_issued_at: '2026-08-19T20:00:00.000Z',
    authorization_valid_until: '2026-08-19T20:00:30.000Z',
    expected_execution_status: 'success',
    expected_effect_commitment: EFFECT,
    ...overrides,
  };
}

function observed(overrides = {}) {
  return {
    run_id: 'run-reference-observation-0001',
    action_commitment: ACTION,
    context_commitment: CONTEXT,
    execution_status: 'success',
    effect_commitment: EFFECT,
    executed_at: '2026-08-19T20:00:10.000Z',
    observed_at: '2026-08-19T20:00:12.000Z',
    ...overrides,
  };
}

function clockSequence(...values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

function harness({ observation = observed(), observeExecution, clock } = {}) {
  return createReferenceObservationReconciliation({
    trustedClock: clock ?? clockSequence(
      '2026-08-19T20:00:11.000Z',
      '2026-08-19T20:00:13.000Z',
    ),
    observeExecution: observeExecution ?? (async () => observation),
  });
}

function expectCode(error, code) {
  assert.ok(error instanceof PomRxObservationError);
  assert.equal(error.code, code);
  return true;
}

test('matching independently observed binding, status and effect reconciles as MATCH', async () => {
  const result = await harness().captureAndReconcile({
    expected: expected(),
    observationRef: { provider: 'fixture', transaction: 'tx-0001' },
  });

  assert.equal(result.reconciliation.verdict, 'MATCH');
  assert.deepEqual(result.reconciliation.reasons, []);
  assert.equal(result.reconciliation.expected_execution_status, 'success');
  assert.match(result.observation.observation_hash, /^[a-f0-9]{64}$/u);
  assert.match(result.reconciliation.reconciliation_hash, /^[a-f0-9]{64}$/u);
  assert.equal(result.reconciliation.reference_only, true);
  assert.equal(result.reconciliation.external_world_proved, false);
});

test('action, context and run substitutions are explicit mismatches', async () => {
  const cases = [
    ['run_id', 'run-reference-observation-9999', 'POMRX_RECON_MISMATCH_RUN'],
    ['action_commitment', OTHER, 'POMRX_RECON_MISMATCH_ACTION'],
    ['context_commitment', OTHER, 'POMRX_RECON_MISMATCH_CONTEXT'],
  ];

  for (const [field, value, reason] of cases) {
    const result = await harness({ observation: observed({ [field]: value }) })
      .captureAndReconcile({ expected: expected(), observationRef: { id: field } });
    assert.equal(result.reconciliation.verdict, 'MISMATCH');
    assert.ok(result.reconciliation.reasons.includes(reason));
  }
});

test('execution outside the exact authorization window is a mismatch', async () => {
  for (const executedAt of [
    '2026-08-19T19:59:59.999Z',
    '2026-08-19T20:00:30.000Z',
  ]) {
    const result = await harness({
      observation: observed({
        executed_at: executedAt,
        observed_at: '2026-08-19T20:00:30.100Z',
      }),
      clock: clockSequence(
        '2026-08-19T20:00:29.000Z',
        '2026-08-19T20:00:31.000Z',
      ),
    }).captureAndReconcile({ expected: expected(), observationRef: { id: executedAt } });

    assert.equal(result.reconciliation.verdict, 'MISMATCH');
    assert.ok(result.reconciliation.reasons.includes('POMRX_RECON_MISMATCH_AUTH_WINDOW'));
  }
});

test('execution status mismatch cannot silently reconcile as MATCH', async () => {
  const result = await harness({
    observation: observed({ execution_status: 'error' }),
  }).captureAndReconcile({ expected: expected(), observationRef: { id: 'status' } });

  assert.equal(result.reconciliation.verdict, 'MISMATCH');
  assert.deepEqual(result.reconciliation.reasons, ['POMRX_RECON_MISMATCH_STATUS']);

  const explicitlyExpectedError = await harness({
    observation: observed({ execution_status: 'error' }),
  }).captureAndReconcile({
    expected: expected({ expected_execution_status: 'error' }),
    observationRef: { id: 'expected-error' },
  });
  assert.equal(explicitlyExpectedError.reconciliation.verdict, 'MATCH');
});

test('effect mismatch is never upgraded to MATCH', async () => {
  const result = await harness({
    observation: observed({ effect_commitment: OTHER }),
  }).captureAndReconcile({ expected: expected(), observationRef: { id: 'effect' } });

  assert.equal(result.reconciliation.verdict, 'MISMATCH');
  assert.deepEqual(result.reconciliation.reasons, ['POMRX_RECON_MISMATCH_EFFECT']);
});

test('unknown execution status remains INDETERMINATE and non-proving', async () => {
  const result = await harness({
    observation: observed({ execution_status: 'unknown', effect_commitment: null }),
  }).captureAndReconcile({ expected: expected(), observationRef: { id: 'unknown' } });

  assert.equal(result.reconciliation.verdict, 'INDETERMINATE');
  assert.deepEqual(
    result.reconciliation.reasons,
    ['POMRX_RECON_INDETERMINATE_EXECUTION'],
  );
  assert.equal(result.reconciliation.external_world_proved, false);
});

test('any expected status permits a known status but still does not prove external truth', async () => {
  const result = await harness({
    observation: observed({ execution_status: 'error' }),
  }).captureAndReconcile({
    expected: expected({
      expected_execution_status: 'any',
      expected_effect_commitment: null,
    }),
    observationRef: { id: 'any-status' },
  });

  assert.equal(result.reconciliation.verdict, 'MATCH');
  assert.equal(result.reconciliation.expected_execution_status, 'any');
  assert.equal(result.reconciliation.external_world_proved, false);
});

test('no expected effect can match binding/status/time without pretending to prove an external effect', async () => {
  const result = await harness({
    observation: observed({ effect_commitment: OTHER }),
  }).captureAndReconcile({
    expected: expected({ expected_effect_commitment: null }),
    observationRef: { id: 'binding-only' },
  });

  assert.equal(result.reconciliation.verdict, 'MATCH');
  assert.equal(result.reconciliation.expected_effect_commitment, null);
  assert.equal(result.reconciliation.external_world_proved, false);
});

test('caller mutation after entry cannot alter the observation reference seen by the observer', async () => {
  let release;
  const barrier = new Promise((resolve) => { release = resolve; });
  let started;
  const observerStarted = new Promise((resolve) => { started = resolve; });
  let captured;

  const reference = { provider: 'fixture', nested: { transaction: 'tx-original' } };
  const runtime = harness({
    observeExecution: async (snapshot) => {
      captured = snapshot;
      started();
      await barrier;
      return observed();
    },
  });

  const pending = runtime.captureAndReconcile({ expected: expected(), observationRef: reference });
  await observerStarted;
  reference.nested.transaction = 'tx-mutated';
  release();
  const result = await pending;

  assert.equal(result.reconciliation.verdict, 'MATCH');
  assert.equal(captured.nested.transaction, 'tx-original');
  assert.equal(Object.isFrozen(captured), true);
  assert.equal(Object.isFrozen(captured.nested), true);
});

test('observer failure and malformed output fail closed with stable diagnostics', async () => {
  const throwing = harness({
    observeExecution: async () => { throw new Error('unavailable'); },
  });
  await assert.rejects(
    throwing.captureAndReconcile({ expected: expected(), observationRef: { id: 'x' } }),
    (error) => expectCode(error, 'POMRX_OBS_E_OBSERVER_FAILED'),
  );

  const malformed = harness({
    observation: { ...observed(), surprise: true },
  });
  await assert.rejects(
    malformed.captureAndReconcile({ expected: expected(), observationRef: { id: 'y' } }),
    (error) => expectCode(error, 'POMRX_OBS_E_INVALID'),
  );
});

test('future observations and backwards observation chronology are rejected', async () => {
  const future = harness({
    observation: observed({ observed_at: '2026-08-19T20:00:14.000Z' }),
    clock: clockSequence(
      '2026-08-19T20:00:11.000Z',
      '2026-08-19T20:00:13.000Z',
    ),
  });
  await assert.rejects(
    future.captureAndReconcile({ expected: expected(), observationRef: { id: 'future' } }),
    (error) => expectCode(error, 'POMRX_OBS_E_OBSERVER_INVALID'),
  );

  const backwards = harness({
    observation: observed({
      executed_at: '2026-08-19T20:00:12.000Z',
      observed_at: '2026-08-19T20:00:11.000Z',
    }),
  });
  await assert.rejects(
    backwards.captureAndReconcile({ expected: expected(), observationRef: { id: 'backwards' } }),
    (error) => expectCode(error, 'POMRX_OBS_E_OBSERVER_INVALID'),
  );
});

test('known execution status requires effect evidence', async () => {
  const runtime = harness({ observation: observed({ effect_commitment: null }) });
  await assert.rejects(
    runtime.captureAndReconcile({ expected: expected(), observationRef: { id: 'missing-effect' } }),
    (error) => expectCode(error, 'POMRX_OBS_E_OBSERVER_INVALID'),
  );
});

test('invalid expected execution status fails closed before observer invocation', async () => {
  let observerCalls = 0;
  const runtime = harness({
    observeExecution: async () => {
      observerCalls += 1;
      return observed();
    },
  });
  await assert.rejects(
    runtime.captureAndReconcile({
      expected: expected({ expected_execution_status: 'maybe' }),
      observationRef: { id: 'invalid-status' },
    }),
    (error) => expectCode(error, 'POMRX_OBS_E_INVALID'),
  );
  assert.equal(observerCalls, 0);
});

test('trusted clock rollback fails closed', async () => {
  const runtime = harness({
    clock: clockSequence(
      '2026-08-19T20:00:13.000Z',
      '2026-08-19T20:00:12.000Z',
    ),
  });
  await assert.rejects(
    runtime.captureAndReconcile({ expected: expected(), observationRef: { id: 'rollback' } }),
    (error) => expectCode(error, 'POMRX_OBS_E_TIME_ROLLBACK'),
  );
});

test('observation and reconciliation hashes are deterministic for identical evidence', async () => {
  const left = await harness().captureAndReconcile({
    expected: expected(),
    observationRef: { id: 'same' },
  });
  const right = await harness().captureAndReconcile({
    expected: expected(),
    observationRef: { id: 'same' },
  });

  assert.equal(left.observation.observation_hash, right.observation.observation_hash);
  assert.equal(
    left.reconciliation.reconciliation_hash,
    right.reconciliation.reconciliation_hash,
  );
});

test('observation references reject accessors and non-plain objects before async observation', async () => {
  let observerCalls = 0;
  const runtime = harness({
    observeExecution: async () => {
      observerCalls += 1;
      return observed();
    },
  });

  const withAccessor = {};
  Object.defineProperty(withAccessor, 'danger', {
    enumerable: true,
    get() { return 'value'; },
  });

  await assert.rejects(
    runtime.captureAndReconcile({ expected: expected(), observationRef: withAccessor }),
    (error) => expectCode(error, 'POMRX_OBS_E_REFERENCE_INVALID'),
  );
  await assert.rejects(
    runtime.captureAndReconcile({ expected: expected(), observationRef: new Date() }),
    (error) => expectCode(error, 'POMRX_OBS_E_REFERENCE_INVALID'),
  );
  assert.equal(observerCalls, 0);
});
