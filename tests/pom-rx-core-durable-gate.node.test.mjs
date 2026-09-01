import assert from 'node:assert/strict';
import {
  mkdtemp,
  rm,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  PomRxDurableClaimStoreError,
  createReferenceDurableClaimStore,
} from '../core/gate/reference-durable-claim-store.mjs';
import {
  PomRxGateError,
} from '../core/gate/reference-single-use-gate.mjs';
import {
  createReferenceDurableSingleUseGateHarness,
} from '../core/gate/reference-durable-single-use-gate.mjs';

const h = (character) => character.repeat(64);
const ISSUED_AT = '2026-08-30T12:00:00.000Z';
const EXPIRES_AT = '2026-08-30T12:00:30.000Z';
const WITNESS_VALID_UNTIL = '2026-08-30T12:01:00.000Z';

function bindingInput(overrides = {}) {
  return {
    binding_profile: 'pom-rx-core-reference/0.1',
    run_id: 'run-durable-gate-v2-0001',
    agent_ref: 'agent-durable-gate-v2-01',
    subject_ref: 'subject-durable-gate-v2-01',
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

function observedFrom(evidence, overrides = {}) {
  return {
    binding_profile: evidence.binding.binding_profile,
    action_commitment: evidence.binding.action_commitment,
    context_commitment: evidence.binding.context_commitment,
    prepared_execution: { request: 'prepared-durable-control', value: 1 },
    ...overrides,
  };
}

async function withTempDir(run) {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-durable-gate-v2-'));
  try {
    await run(rootDir);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
}

function expectGateCode(error, code) {
  assert.ok(error instanceof PomRxGateError);
  assert.equal(error.code, code);
  return true;
}

function expectDurableCode(error, code) {
  assert.ok(error instanceof PomRxDurableClaimStoreError);
  assert.equal(error.code, code);
  return true;
}

function createHarness(rootDir, overrides = {}) {
  let latestEvidence = null;
  let observerCalls = 0;
  let downstreamCalls = 0;
  let downstreamArgument = null;

  const harness = createReferenceDurableSingleUseGateHarness({
    rootDir,
    trustedClock: overrides.trustedClock ?? sequenceClock(
      '2026-08-30T12:00:01.000Z',
      '2026-08-30T12:00:02.000Z',
    ),
    observeBinding: overrides.observeBinding ?? (async () => {
      observerCalls += 1;
      return observedFrom(latestEvidence);
    }),
    executeDownstream: overrides.executeDownstream ?? (async (preparedExecution) => {
      downstreamCalls += 1;
      downstreamArgument = preparedExecution;
      return Object.freeze({ accepted: true });
    }),
  });

  return {
    ...harness,
    issue(bindingOverrides = {}) {
      const issued = harness.testAuthority.issueReferenceAuthorizationForTest(
        bindingInput(bindingOverrides),
        { witnessValidUntil: WITNESS_VALID_UNTIL },
      );
      latestEvidence = issued.evidence;
      return issued;
    },
    stats() {
      return { observerCalls, downstreamCalls, downstreamArgument };
    },
  };
}

function durableInput(evidence) {
  return {
    capabilityId: evidence.binding.capability_id,
    authorizationCommitment: evidence.authorization_commitment,
  };
}

test('durable Gate exposes consumption only and keeps durable internals behind test authority', async () => {
  await withTempDir(async (rootDir) => {
    const harness = createHarness(rootDir);
    assert.deepEqual(Object.keys(harness.gate), ['consume']);
    assert.deepEqual(Object.keys(harness.testAuthority).sort(), [
      'inspectCapabilityStateForTest',
      'inspectDurableStateForTest',
      'issueReferenceAuthorizationForTest',
    ]);
    assert.equal(Object.hasOwn(harness.gate, 'rootDir'), false);
    assert.equal(Object.hasOwn(harness.gate, 'durableStore'), false);
  });
});

test('valid control is durably claimed before forwarding and persists success before return', async () => {
  await withTempDir(async (rootDir) => {
    const harness = createHarness(rootDir);
    const issued = harness.issue();
    const rawAttempt = { request: 'raw-untrusted', value: 999 };

    const result = await harness.gate.consume(issued.capability, rawAttempt);
    assert.deepEqual(result, { accepted: true });
    assert.equal(harness.stats().observerCalls, 1);
    assert.equal(harness.stats().downstreamCalls, 1);
    assert.notEqual(harness.stats().downstreamArgument, rawAttempt);
    assert.equal(harness.stats().downstreamArgument.request, 'prepared-durable-control');
    assert.equal(Object.isFrozen(harness.stats().downstreamArgument), true);
    assert.equal(
      harness.testAuthority.inspectCapabilityStateForTest(issued.capability),
      'CONSUMED_SUCCESS',
    );

    const persisted = await createReferenceDurableClaimStore({ rootDir })
      .inspect(durableInput(issued.evidence));
    assert.equal(persisted.state, 'CONSUMED_SUCCESS');
    assert.match(persisted.claim_commitment, /^[a-f0-9]{64}$/u);
    assert.match(persisted.terminal_commitment, /^[a-f0-9]{64}$/u);

    await assert.rejects(
      harness.gate.consume(issued.capability, { request: 'replay' }),
      (error) => expectGateCode(error, 'POMRX_GATE_E_CAPABILITY_STALE'),
    );
    assert.equal(harness.stats().downstreamCalls, 1);
  });
});

test('external durable claim blocks observer and downstream before effectful work', async () => {
  await withTempDir(async (rootDir) => {
    const harness = createHarness(rootDir);
    const issued = harness.issue();
    await createReferenceDurableClaimStore({ rootDir }).claim(durableInput(issued.evidence));

    await assert.rejects(
      harness.gate.consume(issued.capability, { request: 'must-not-observe' }),
      (error) => expectDurableCode(error, 'POMRX_GATE_E_DURABLE_REPLAY'),
    );
    assert.equal(harness.stats().observerCalls, 0);
    assert.equal(harness.stats().downstreamCalls, 0);
    assert.equal(
      harness.testAuthority.inspectCapabilityStateForTest(issued.capability),
      'REJECTED',
    );
  });
});

test('Gate and external store race produces one durable winner', async () => {
  await withTempDir(async (rootDir) => {
    const harness = createHarness(rootDir);
    const issued = harness.issue();
    const externalStore = createReferenceDurableClaimStore({ rootDir });

    const results = await Promise.allSettled([
      harness.gate.consume(issued.capability, { request: 'gate-race' }),
      externalStore.claim(durableInput(issued.evidence)),
    ]);

    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
    const rejected = results.find((result) => result.status === 'rejected');
    assert.ok(expectDurableCode(rejected.reason, 'POMRX_GATE_E_DURABLE_REPLAY'));
    assert.ok(harness.stats().downstreamCalls === 0 || harness.stats().downstreamCalls === 1);
  });
});

test('post-claim binding rejection burns capability without inventing execution terminal state', async () => {
  await withTempDir(async (rootDir) => {
    let evidence;
    let observerCalls = 0;
    let downstreamCalls = 0;
    const harness = createReferenceDurableSingleUseGateHarness({
      rootDir,
      trustedClock: sequenceClock('2026-08-30T12:00:01.000Z'),
      observeBinding: async () => {
        observerCalls += 1;
        return observedFrom(evidence, { action_commitment: h('9') });
      },
      executeDownstream: async () => {
        downstreamCalls += 1;
      },
    });
    const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
      witnessValidUntil: WITNESS_VALID_UNTIL,
    });
    evidence = issued.evidence;

    await assert.rejects(
      harness.gate.consume(issued.capability, { request: 'mismatch' }),
      (error) => expectGateCode(error, 'POMRX_GATE_E_BINDING_MISMATCH'),
    );
    assert.equal(observerCalls, 1);
    assert.equal(downstreamCalls, 0);
    assert.equal(
      harness.testAuthority.inspectCapabilityStateForTest(issued.capability),
      'REJECTED',
    );
    const inspection = await harness.testAuthority.inspectDurableStateForTest(issued.capability);
    assert.equal(inspection.state, 'RESERVED');
    assert.equal(inspection.terminal_commitment, null);

    await assert.rejects(
      createReferenceDurableClaimStore({ rootDir }).claim(durableInput(issued.evidence)),
      (error) => expectDurableCode(error, 'POMRX_GATE_E_DURABLE_REPLAY'),
    );
  });
});

test('asynchronous downstream rejection remains non-replayable without false durable error truth', async () => {
  await withTempDir(async (rootDir) => {
    let evidence;
    let downstreamCalls = 0;
    const harness = createReferenceDurableSingleUseGateHarness({
      rootDir,
      trustedClock: sequenceClock(
        '2026-08-30T12:00:01.000Z',
        '2026-08-30T12:00:02.000Z',
      ),
      observeBinding: async () => observedFrom(evidence),
      executeDownstream: async () => {
        downstreamCalls += 1;
        throw new Error('sensitive downstream detail');
      },
    });
    const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
      witnessValidUntil: WITNESS_VALID_UNTIL,
    });
    evidence = issued.evidence;

    await assert.rejects(
      harness.gate.consume(issued.capability, { request: 'downstream-error' }),
      (error) => expectGateCode(error, 'POMRX_GATE_E_DOWNSTREAM_FAILED'),
    );
    assert.equal(downstreamCalls, 1);
    assert.equal(
      harness.testAuthority.inspectCapabilityStateForTest(issued.capability),
      'CONSUMED_UNKNOWN',
    );
    const inspection = await harness.testAuthority.inspectDurableStateForTest(issued.capability);
    assert.equal(inspection.state, 'RESERVED');
    assert.equal(inspection.terminal_commitment, null);
    await assert.rejects(
      harness.gate.consume(issued.capability, { request: 'retry' }),
      (error) => expectGateCode(error, 'POMRX_GATE_E_CAPABILITY_STALE'),
    );
  });
});

test('synchronous downstream throw persists durable CONSUMED_ERROR before reporting failure', async () => {
  await withTempDir(async (rootDir) => {
    let evidence;
    let downstreamCalls = 0;
    const harness = createReferenceDurableSingleUseGateHarness({
      rootDir,
      trustedClock: sequenceClock(
        '2026-08-30T12:00:01.000Z',
        '2026-08-30T12:00:02.000Z',
      ),
      observeBinding: async () => observedFrom(evidence),
      executeDownstream: () => {
        downstreamCalls += 1;
        throw new Error('synchronous downstream failure');
      },
    });
    const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
      witnessValidUntil: WITNESS_VALID_UNTIL,
    });
    evidence = issued.evidence;

    await assert.rejects(
      harness.gate.consume(issued.capability, { request: 'sync-downstream-error' }),
      (error) => expectGateCode(error, 'POMRX_GATE_E_DOWNSTREAM_FAILED'),
    );
    assert.equal(downstreamCalls, 1);
    assert.equal(
      harness.testAuthority.inspectCapabilityStateForTest(issued.capability),
      'CONSUMED_ERROR',
    );
    assert.equal(
      (await harness.testAuthority.inspectDurableStateForTest(issued.capability)).state,
      'CONSUMED_ERROR',
    );
  });
});

test('concurrent local consume is synchronously reserved and forwards at most once', async () => {
  await withTempDir(async (rootDir) => {
    let evidence;
    let releaseObserver;
    const observerBarrier = new Promise((resolve) => { releaseObserver = resolve; });
    let observerCalls = 0;
    let downstreamCalls = 0;
    const harness = createReferenceDurableSingleUseGateHarness({
      rootDir,
      trustedClock: sequenceClock(
        '2026-08-30T12:00:01.000Z',
        '2026-08-30T12:00:02.000Z',
      ),
      observeBinding: async () => {
        observerCalls += 1;
        await observerBarrier;
        return observedFrom(evidence);
      },
      executeDownstream: async () => {
        downstreamCalls += 1;
        return 'ok';
      },
    });
    const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
      witnessValidUntil: WITNESS_VALID_UNTIL,
    });
    evidence = issued.evidence;

    const first = harness.gate.consume(issued.capability, { request: 'first' });
    const second = harness.gate.consume(issued.capability, { request: 'second' });
    await assert.rejects(
      second,
      (error) => expectGateCode(error, 'POMRX_GATE_E_CAPABILITY_STALE'),
    );

    while (observerCalls === 0) await new Promise((resolve) => setImmediate(resolve));
    assert.equal(observerCalls, 1);
    assert.equal(downstreamCalls, 0);
    releaseObserver();
    assert.equal(await first, 'ok');
    assert.equal(downstreamCalls, 1);
  });
});

test('bootstrap Proxy and accessor substitution are rejected before attacker code executes', async () => {
  await withTempDir(async (rootDir) => {
    let proxyTraps = 0;
    const proxy = new Proxy({
      rootDir,
      trustedClock: () => ISSUED_AT,
      observeBinding: async () => ({}),
      executeDownstream: async () => {},
    }, {
      ownKeys() {
        proxyTraps += 1;
        return [];
      },
      getOwnPropertyDescriptor() {
        proxyTraps += 1;
        return undefined;
      },
      getPrototypeOf() {
        proxyTraps += 1;
        return Object.prototype;
      },
    });
    assert.throws(
      () => createReferenceDurableSingleUseGateHarness(proxy),
      /non-Proxy plain object/u,
    );
    assert.equal(proxyTraps, 0);

    let getterCalls = 0;
    const accessor = {
      trustedClock: () => ISSUED_AT,
      observeBinding: async () => ({}),
      executeDownstream: async () => {},
    };
    Object.defineProperty(accessor, 'rootDir', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return rootDir;
      },
    });
    assert.throws(
      () => createReferenceDurableSingleUseGateHarness(accessor),
      /enumerable data property/u,
    );
    assert.equal(getterCalls, 0);
  });
});
