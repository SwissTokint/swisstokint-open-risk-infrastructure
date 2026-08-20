import assert from 'node:assert/strict';
import test from 'node:test';

import {
  commitExactAuthorizationBinding,
} from '../core/authorization/reference-exact-authorization.mjs';
import {
  PomRxObservationError,
  createReferenceObservationReconciliation,
} from '../core/observation/reference-observation-reconciliation.mjs';

const hash = (character) => character.repeat(64);
const ACTION = hash('a');
const CONTEXT = hash('b');
const EFFECT = hash('d');
const OTHER = hash('e');
const PROFILE = 'pom-rx-reference-observation/0.1';

function authorizationBinding(overrides = {}) {
  return {
    schema_version: 'pom-rx-exact-authorization/0.1',
    capability_id: `cap-${'1'.repeat(32)}`,
    binding_profile: PROFILE,
    run_id: 'run-reference-observation-0001',
    agent_ref: 'agent-reference-observation-01',
    subject_ref: 'subject-reference-observation-01',
    method_hash: hash('1'),
    policy_hash: hash('2'),
    action_commitment: ACTION,
    context_commitment: CONTEXT,
    preflight_receipt_hash: hash('3'),
    witness_ack_hash: hash('4'),
    source_key_id: `ed25519-${'a'.repeat(32)}`,
    witness_key_id: `ed25519-${'b'.repeat(32)}`,
    verification_profile: 'pom-rx-v0.1/strict-errata-1',
    verifier_version: 'pom-rx-v0.1-strict-verifier/1',
    implementation_artifact_sha256: hash('5'),
    effective_verification_policy_sha256: hash('6'),
    issued_at: '2026-08-19T20:00:00.000Z',
    expires_at: '2026-08-19T20:00:30.000Z',
    ...overrides,
  };
}

function expected(overrides = {}) {
  return {
    authorization_binding: authorizationBinding(),
    expected_execution_status: 'success',
    expected_effect_commitment: EFFECT,
    ...overrides,
  };
}

function observed(overrides = {}) {
  return {
    binding_profile: PROFILE,
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

function delivering(value) {
  return (_reference, deliver) => {
    deliver(value);
  };
}

function harness({ observation = observed(), observeExecution, clock } = {}) {
  return createReferenceObservationReconciliation({
    trustedClock: clock ?? clockSequence(
      '2026-08-19T20:00:11.000Z',
      '2026-08-19T20:00:13.000Z',
    ),
    observeExecution: observeExecution ?? delivering(observation),
  });
}

function expectCode(error, code) {
  assert.ok(error instanceof PomRxObservationError);
  assert.equal(error.code, code);
  return true;
}

test('matching captured evidence reconciles as MATCH and binds the exact authorization', async () => {
  const binding = authorizationBinding();
  const result = await harness().captureAndReconcile({
    expected: expected({ authorization_binding: binding }),
    observationRef: { provider: 'fixture', transaction: 'tx-0001' },
  });

  assert.equal(result.reconciliation.verdict, 'MATCH');
  assert.deepEqual(result.reconciliation.reasons, []);
  assert.equal(result.observation.binding_profile, PROFILE);
  assert.equal(result.reconciliation.binding_profile, PROFILE);
  assert.equal(
    result.reconciliation.authorization_commitment,
    commitExactAuthorizationBinding(binding).authorizationCommitment,
  );
  assert.match(result.observation.observation_hash, /^[a-f0-9]{64}$/u);
  assert.match(result.reconciliation.reconciliation_hash, /^[a-f0-9]{64}$/u);
  assert.equal(result.reconciliation.reference_only, true);
  assert.equal(result.reconciliation.external_world_proved, false);
});

test('binding-profile substitution is an explicit mismatch', async () => {
  const result = await harness({
    observation: observed({ binding_profile: 'different-application/9.9' }),
  }).captureAndReconcile({
    expected: expected(),
    observationRef: { id: 'profile-substitution' },
  });

  assert.equal(result.reconciliation.verdict, 'MISMATCH');
  assert.deepEqual(result.reconciliation.reasons, ['POMRX_RECON_MISMATCH_BINDING_PROFILE']);
});

test('run, action and context substitutions are explicit mismatches', async () => {
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

test('authorization commitment is recomputed and malformed authorization fails before observation', async () => {
  let observerCalls = 0;
  const runtime = harness({
    observeExecution: (_reference, deliver) => {
      observerCalls += 1;
      deliver(observed());
    },
  });

  await assert.rejects(
    runtime.captureAndReconcile({
      expected: { ...expected(), authorization_commitment: hash('f') },
      observationRef: { id: 'forged-commitment' },
    }),
    (error) => expectCode(error, 'POMRX_OBS_E_INVALID'),
  );
  assert.equal(observerCalls, 0);

  await assert.rejects(
    runtime.captureAndReconcile({
      expected: expected({
        authorization_binding: authorizationBinding({ capability_id: 'cap-invalid' }),
      }),
      observationRef: { id: 'bad-binding' },
    }),
    (error) => expectCode(error, 'POMRX_OBS_E_AUTHORIZATION_INVALID'),
  );
  assert.equal(observerCalls, 0);
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

test('known status and effect substitutions cannot reconcile as MATCH', async () => {
  const status = await harness({
    observation: observed({ execution_status: 'error' }),
  }).captureAndReconcile({ expected: expected(), observationRef: { id: 'status' } });
  assert.equal(status.reconciliation.verdict, 'MISMATCH');
  assert.ok(status.reconciliation.reasons.includes('POMRX_RECON_MISMATCH_STATUS'));

  const effect = await harness({
    observation: observed({ effect_commitment: OTHER }),
  }).captureAndReconcile({ expected: expected(), observationRef: { id: 'effect' } });
  assert.equal(effect.reconciliation.verdict, 'MISMATCH');
  assert.ok(effect.reconciliation.reasons.includes('POMRX_RECON_MISMATCH_EFFECT'));
});

test('unknown execution is INDETERMINATE and any expected status is explicitly weaker', async () => {
  const unknown = await harness({
    observation: observed({ execution_status: 'unknown', effect_commitment: null }),
  }).captureAndReconcile({ expected: expected(), observationRef: { id: 'unknown' } });
  assert.equal(unknown.reconciliation.verdict, 'INDETERMINATE');
  assert.deepEqual(
    unknown.reconciliation.reasons,
    ['POMRX_RECON_INDETERMINATE_EXECUTION'],
  );

  const any = await harness({
    observation: observed({ execution_status: 'error' }),
  }).captureAndReconcile({
    expected: expected({ expected_execution_status: 'any', expected_effect_commitment: null }),
    observationRef: { id: 'any-status' },
  });
  assert.equal(any.reconciliation.verdict, 'MATCH');
  assert.equal(any.reconciliation.external_world_proved, false);
});

test('an asynchronous observer can deliver later through the one-shot capture callback', async () => {
  const runtime = harness({
    observeExecution: (_reference, deliver) => {
      queueMicrotask(() => deliver(observed()));
    },
  });

  const result = await runtime.captureAndReconcile({
    expected: expected(),
    observationRef: { id: 'async-delivery' },
  });
  assert.equal(result.reconciliation.verdict, 'MATCH');
});

test('observer return values are never treated as evidence', async () => {
  const runtime = harness({ observeExecution: () => observed() });
  await assert.rejects(
    runtime.captureAndReconcile({
      expected: expected(),
      observationRef: { id: 'returned-value' },
    }),
    (error) => expectCode(error, 'POMRX_OBS_E_OBSERVER_INVALID'),
  );
});

test('observer failures use a stable failure diagnostic', async () => {
  const explicitFailure = harness({
    observeExecution: (_reference, _deliver, failObserver) => {
      queueMicrotask(() => failObserver());
    },
  });
  await assert.rejects(
    explicitFailure.captureAndReconcile({ expected: expected(), observationRef: { id: 'failed' } }),
    (error) => expectCode(error, 'POMRX_OBS_E_OBSERVER_FAILED'),
  );

  const throwing = harness({
    observeExecution: () => { throw new Error('unavailable'); },
  });
  await assert.rejects(
    throwing.captureAndReconcile({ expected: expected(), observationRef: { id: 'throw' } }),
    (error) => expectCode(error, 'POMRX_OBS_E_OBSERVER_FAILED'),
  );
});

test('future/backwards chronology and missing known effect fail closed', async () => {
  await assert.rejects(
    harness({
      observation: observed({ observed_at: '2026-08-19T20:00:14.000Z' }),
    }).captureAndReconcile({ expected: expected(), observationRef: { id: 'future' } }),
    (error) => expectCode(error, 'POMRX_OBS_E_OBSERVER_INVALID'),
  );

  await assert.rejects(
    harness({
      observation: observed({
        executed_at: '2026-08-19T20:00:12.000Z',
        observed_at: '2026-08-19T20:00:11.000Z',
      }),
    }).captureAndReconcile({ expected: expected(), observationRef: { id: 'backwards' } }),
    (error) => expectCode(error, 'POMRX_OBS_E_OBSERVER_INVALID'),
  );

  await assert.rejects(
    harness({ observation: observed({ effect_commitment: null }) }).captureAndReconcile({
      expected: expected(), observationRef: { id: 'missing-effect' },
    }),
    (error) => expectCode(error, 'POMRX_OBS_E_OBSERVER_INVALID'),
  );
});

test('caller mutation after entry cannot alter the observation reference seen by the observer', async () => {
  let release;
  const barrier = new Promise((resolve) => { release = resolve; });
  let started;
  const observerStarted = new Promise((resolve) => { started = resolve; });
  let capturedReference;

  const reference = { provider: 'fixture', nested: { transaction: 'tx-original' } };
  const runtime = harness({
    observeExecution: (snapshot, deliver) => {
      capturedReference = snapshot;
      started();
      barrier.then(() => deliver(observed()));
    },
  });

  const pending = runtime.captureAndReconcile({ expected: expected(), observationRef: reference });
  await observerStarted;
  reference.nested.transaction = 'tx-mutated';
  release();
  const result = await pending;

  assert.equal(result.reconciliation.verdict, 'MATCH');
  assert.equal(capturedReference.nested.transaction, 'tx-original');
  assert.equal(Object.isFrozen(capturedReference), true);
  assert.equal(Object.isFrozen(capturedReference.nested), true);
});

test('trusted clock rollback fails closed after observer delivery', async () => {
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

test('hashes are deterministic for identical captured evidence', async () => {
  const left = await harness().captureAndReconcile({ expected: expected(), observationRef: { id: 'same' } });
  const right = await harness().captureAndReconcile({ expected: expected(), observationRef: { id: 'same' } });
  assert.equal(left.observation.observation_hash, right.observation.observation_hash);
  assert.equal(left.reconciliation.reconciliation_hash, right.reconciliation.reconciliation_hash);
});
