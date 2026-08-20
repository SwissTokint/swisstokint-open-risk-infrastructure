import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PomRxGateError,
  createReferenceSingleUseGateHarness,
} from '../core/gate/reference-single-use-gate.mjs';

const h = (character) => character.repeat(64);
const WITNESS_VALID_UNTIL = '2026-08-19T17:01:00.000Z';

function bindingInput() {
  return {
    binding_profile: 'pom-rx-core-reference/0.1',
    run_id: 'run-boundary-0001',
    agent_ref: 'agent-boundary-01',
    subject_ref: 'subject-boundary-01',
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

function expectGateCode(error, code) {
  assert.ok(error instanceof PomRxGateError);
  assert.equal(error.code, code);
  return true;
}

function makeHarness(observeBinding) {
  let evidence;
  let downstreamCalls = 0;
  let downstreamArgument = null;
  const harness = createReferenceSingleUseGateHarness({
    trustedClock: sequenceClock(
      '2026-08-19T17:00:01.000Z',
      '2026-08-19T17:00:02.000Z',
    ),
    observeBinding: observeBinding ?? (async () => ({
      binding_profile: evidence.binding.binding_profile,
      action_commitment: evidence.binding.action_commitment,
      context_commitment: evidence.binding.context_commitment,
      prepared_execution: { request: 'control', nested: { amount: 1 } },
    })),
    executeDownstream: async (preparedExecution) => {
      downstreamCalls += 1;
      downstreamArgument = preparedExecution;
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
    getEvidence: () => evidence,
    stats: () => ({ downstreamCalls, downstreamArgument }),
  };
}

test('valid observed binding still forwards one Gate-owned frozen prepared snapshot', async () => {
  const { harness, issued, stats } = makeHarness();
  assert.equal(await harness.gate.consume(issued.capability, { caller: 'raw' }), 'ok');
  assert.equal(stats().downstreamCalls, 1);
  assert.equal(Object.isFrozen(stats().downstreamArgument), true);
  assert.equal(Object.isFrozen(stats().downstreamArgument.nested), true);
  assert.equal(stats().downstreamArgument.nested.amount, 1);
});

test('bootstrap accessors are rejected without invoking getter bodies', () => {
  let getterCalls = 0;
  const options = {
    observeBinding: async () => ({}),
    executeDownstream: async () => undefined,
  };
  Object.defineProperty(options, 'trustedClock', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return () => '2026-08-19T17:00:01.000Z';
    },
  });

  assert.throws(
    () => createReferenceSingleUseGateHarness(options),
    /enumerable data properties/u,
  );
  assert.equal(getterCalls, 0);
});

test('bootstrap Proxy wrappers are rejected before reflective traps run', () => {
  let trapCalls = 0;
  const proxy = new Proxy({
    trustedClock: () => '2026-08-19T17:00:01.000Z',
    observeBinding: async () => ({}),
    executeDownstream: async () => undefined,
  }, {
    getPrototypeOf() {
      trapCalls += 1;
      return Object.prototype;
    },
    ownKeys(target) {
      trapCalls += 1;
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, key) {
      trapCalls += 1;
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });

  assert.throws(
    () => createReferenceSingleUseGateHarness(proxy),
    /plain data object/u,
  );
  assert.equal(trapCalls, 0);
});

test('observer record accessors are rejected without invocation and capability is terminally rejected', async () => {
  let getterCalls = 0;
  let evidence;
  const observed = {
    binding_profile: 'pom-rx-core-reference/0.1',
    context_commitment: h('4'),
    prepared_execution: { request: 'must-not-forward' },
  };
  Object.defineProperty(observed, 'action_commitment', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return evidence.binding.action_commitment;
    },
  });

  const setup = makeHarness(async () => observed);
  evidence = setup.getEvidence();
  await assert.rejects(
    setup.harness.gate.consume(setup.issued.capability, { caller: 'raw' }),
    (error) => expectGateCode(error, 'POMRX_GATE_E_OBSERVER_FAILED'),
  );
  assert.equal(getterCalls, 0);
  assert.equal(setup.stats().downstreamCalls, 0);
  assert.equal(
    setup.harness.testAuthority.inspectCapabilityStateForTest(setup.issued.capability),
    'REJECTED',
  );
});

test('observer record Proxy is rejected before its traps execute', async () => {
  let trapCalls = 0;
  let evidence;
  const raw = {
    binding_profile: 'pom-rx-core-reference/0.1',
    action_commitment: h('3'),
    context_commitment: h('4'),
    prepared_execution: { request: 'must-not-forward' },
  };
  const proxy = new Proxy(raw, {
    getPrototypeOf() {
      trapCalls += 1;
      return Object.prototype;
    },
    ownKeys(target) {
      trapCalls += 1;
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, key) {
      trapCalls += 1;
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  const setup = makeHarness(async () => proxy);
  evidence = setup.getEvidence();
  raw.action_commitment = evidence.binding.action_commitment;
  raw.context_commitment = evidence.binding.context_commitment;

  await assert.rejects(
    setup.harness.gate.consume(setup.issued.capability, { caller: 'raw' }),
    (error) => expectGateCode(error, 'POMRX_GATE_E_OBSERVER_FAILED'),
  );
  assert.equal(trapCalls, 0);
  assert.equal(setup.stats().downstreamCalls, 0);
});

test('nested prepared-execution Proxy is rejected before traps and never forwarded', async () => {
  let trapCalls = 0;
  let evidence;
  const nestedProxy = new Proxy({ amount: 1 }, {
    getPrototypeOf() {
      trapCalls += 1;
      return Object.prototype;
    },
    ownKeys(target) {
      trapCalls += 1;
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, key) {
      trapCalls += 1;
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  const setup = makeHarness(async () => ({
    binding_profile: evidence.binding.binding_profile,
    action_commitment: evidence.binding.action_commitment,
    context_commitment: evidence.binding.context_commitment,
    prepared_execution: { request: 'control', nested: nestedProxy },
  }));
  evidence = setup.getEvidence();

  await assert.rejects(
    setup.harness.gate.consume(setup.issued.capability, { caller: 'raw' }),
    (error) => expectGateCode(error, 'POMRX_GATE_E_OBSERVER_FAILED'),
  );
  assert.equal(trapCalls, 0);
  assert.equal(setup.stats().downstreamCalls, 0);
});

test('hidden prepared object properties fail closed rather than being silently dropped', async () => {
  let evidence;
  const prepared = { request: 'control' };
  Object.defineProperty(prepared, 'hidden', {
    enumerable: false,
    value: 'semantic-data',
  });
  const setup = makeHarness(async () => ({
    binding_profile: evidence.binding.binding_profile,
    action_commitment: evidence.binding.action_commitment,
    context_commitment: evidence.binding.context_commitment,
    prepared_execution: prepared,
  }));
  evidence = setup.getEvidence();

  await assert.rejects(
    setup.harness.gate.consume(setup.issued.capability, { caller: 'raw' }),
    (error) => expectGateCode(error, 'POMRX_GATE_E_OBSERVER_FAILED'),
  );
  assert.equal(setup.stats().downstreamCalls, 0);
});

test('prepared arrays reject hidden or extra properties instead of normalizing them away', async () => {
  let evidence;
  const prepared = ['control'];
  Object.defineProperty(prepared, 'hidden', {
    enumerable: false,
    value: 'semantic-data',
  });
  const setup = makeHarness(async () => ({
    binding_profile: evidence.binding.binding_profile,
    action_commitment: evidence.binding.action_commitment,
    context_commitment: evidence.binding.context_commitment,
    prepared_execution: prepared,
  }));
  evidence = setup.getEvidence();

  await assert.rejects(
    setup.harness.gate.consume(setup.issued.capability, { caller: 'raw' }),
    (error) => expectGateCode(error, 'POMRX_GATE_E_OBSERVER_FAILED'),
  );
  assert.equal(setup.stats().downstreamCalls, 0);
});
