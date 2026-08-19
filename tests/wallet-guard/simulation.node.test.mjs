import assert from 'node:assert/strict';
import test from 'node:test';

import {
  commitWalletGuardIntent,
  normalizeWalletGuardIntent,
} from '../../applications/blockchain-digital-assets/wallet-guard/intent.mjs';
import {
  WalletGuardSimulationError,
  createWalletGuardReferenceSimulationHarness,
} from '../../applications/blockchain-digital-assets/wallet-guard/simulation.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const RECIPIENT = `0x${'2'.repeat(40)}`;
const OTHER = `0x${'9'.repeat(40)}`;
const ORIGIN = 'https://simulation.wallet-guard.local';
const CHAIN_ID = '0x1';
const STATE = 'a'.repeat(64);
const EFFECT = 'b'.repeat(64);

function request({ value = '0x1', to = RECIPIENT } = {}) {
  return {
    method: 'eth_sendTransaction',
    params: [{
      from: ACCOUNT,
      to,
      value,
      data: '0x',
    }],
  };
}

function intent(rawRequest = request()) {
  return normalizeWalletGuardIntent({
    requestId: 'wg-simulation-request-0001',
    trustedOrigin: ORIGIN,
    trustedChainId: CHAIN_ID,
    trustedAccount: ACCOUNT,
    request: rawRequest,
  });
}

function callbackResult(input, overrides = {}) {
  return {
    status: 'pass',
    request_id: input.request_id,
    intent_commitment: input.intent_commitment,
    origin: input.origin,
    chain_id: input.chain_id,
    account: input.account,
    state_commitment: STATE,
    effect_commitment: EFFECT,
    ...overrides,
  };
}

function harness(simulateRequest = async (input) => callbackResult(input)) {
  return createWalletGuardReferenceSimulationHarness({ simulateRequest });
}

function expectCode(error, code) {
  assert.ok(error instanceof WalletGuardSimulationError);
  assert.equal(error.code, code);
  return true;
}

test('pass evidence is bound to the exact locally normalized intent and request', async () => {
  const rawRequest = request();
  const normalizedIntent = intent(rawRequest);
  let captured;
  const runtime = harness(async (input) => {
    captured = input;
    return callbackResult(input);
  });

  const evidence = await runtime.simulate({ intent: normalizedIntent, request: rawRequest });

  assert.equal(evidence.status, 'pass');
  assert.equal(evidence.request_id, normalizedIntent.request_id);
  assert.equal(
    evidence.intent_commitment,
    commitWalletGuardIntent(normalizedIntent).intent_commitment,
  );
  assert.equal(evidence.origin, ORIGIN);
  assert.equal(evidence.chain_id, CHAIN_ID);
  assert.equal(evidence.account, ACCOUNT);
  assert.equal(evidence.state_commitment, STATE);
  assert.equal(evidence.effect_commitment, EFFECT);
  assert.match(evidence.simulation_commitment, /^[a-f0-9]{64}$/u);
  assert.equal(evidence.reference_only, true);
  assert.equal(evidence.simulator_truth_proved, false);
  assert.equal(runtime.isLocalEvidence(evidence), true);
  assert.deepEqual(runtime.toPolicySimulation(normalizedIntent, evidence), { status: 'pass' });
  assert.equal(Object.isFrozen(captured), true);
  assert.equal(Object.isFrozen(captured.request), true);
  assert.equal(Object.isFrozen(captured.request.params), true);
  assert.equal(Object.isFrozen(captured.request.params[0]), true);
});

test('a raw request that differs from the committed intent is rejected before simulator invocation', async () => {
  const safeRequest = request({ value: '0x1' });
  const normalizedIntent = intent(safeRequest);
  let calls = 0;
  const runtime = harness(async (input) => {
    calls += 1;
    return callbackResult(input);
  });

  await assert.rejects(
    runtime.simulate({
      intent: normalizedIntent,
      request: request({ value: '0x2' }),
    }),
    (error) => expectCode(error, 'POMRX_WG_SIM_E_BINDING_MISMATCH'),
  );
  assert.equal(calls, 0);
});

test('caller mutation after entry cannot alter the request received by the simulator', async () => {
  let started;
  const simulatorStarted = new Promise((resolve) => { started = resolve; });
  let release;
  const barrier = new Promise((resolve) => { release = resolve; });
  let captured;
  const runtime = harness(async (input) => {
    captured = input;
    started();
    await barrier;
    return callbackResult(input);
  });
  const rawRequest = request({ value: '0x1' });
  const normalizedIntent = intent(rawRequest);

  const pending = runtime.simulate({ intent: normalizedIntent, request: rawRequest });
  await simulatorStarted;
  rawRequest.params[0].value = '0x999';
  rawRequest.params[0].to = OTHER;
  release();
  const evidence = await pending;

  assert.equal(evidence.status, 'pass');
  assert.equal(captured.request.params[0].value, '0x1');
  assert.equal(captured.request.params[0].to, RECIPIENT);
});

test('top-level accessor-backed run input is rejected without invoking the accessor', async () => {
  let getterCalls = 0;
  let simulatorCalls = 0;
  const rawRequest = request();
  const normalizedIntent = intent(rawRequest);
  const runtime = harness(async (input) => {
    simulatorCalls += 1;
    return callbackResult(input);
  });
  const hostile = { request: rawRequest };
  Object.defineProperty(hostile, 'intent', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return normalizedIntent;
    },
  });

  await assert.rejects(
    runtime.simulate(hostile),
    (error) => expectCode(error, 'POMRX_WG_SIM_E_REQUEST_INVALID'),
  );
  assert.equal(getterCalls, 0);
  assert.equal(simulatorCalls, 0);
});

test('bootstrap accessor is rejected without invoking the trusted callback getter', () => {
  let getterCalls = 0;
  const bootstrap = {};
  Object.defineProperty(bootstrap, 'simulateRequest', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return async () => null;
    },
  });

  assert.throws(
    () => createWalletGuardReferenceSimulationHarness(bootstrap),
    (error) => expectCode(error, 'POMRX_WG_SIM_E_INVALID'),
  );
  assert.equal(getterCalls, 0);
});

test('simulator identity substitution is downgraded to mismatch evidence', async () => {
  const runtime = harness(async (input) => callbackResult(input, {
    account: OTHER,
    intent_commitment: 'f'.repeat(64),
  }));
  const rawRequest = request();
  const normalizedIntent = intent(rawRequest);
  const evidence = await runtime.simulate({ intent: normalizedIntent, request: rawRequest });

  assert.equal(evidence.status, 'mismatch');
  assert.equal(evidence.account, ACCOUNT);
  assert.equal(evidence.state_commitment, null);
  assert.equal(evidence.effect_commitment, null);
  assert.deepEqual(runtime.toPolicySimulation(normalizedIntent, evidence), { status: 'mismatch' });
});

test('malformed or accessor-bearing simulator output becomes mismatch without semantic reads', async () => {
  const rawRequest = request();
  const normalizedIntent = intent(rawRequest);

  const withAccessor = harness(async (input) => {
    const result = callbackResult(input);
    Object.defineProperty(result, 'status', {
      enumerable: true,
      get() { throw new Error('must not be invoked'); },
    });
    return result;
  });
  const accessorEvidence = await withAccessor.simulate({
    intent: normalizedIntent,
    request: rawRequest,
  });
  assert.equal(accessorEvidence.status, 'mismatch');

  const extraField = harness(async (input) => ({
    ...callbackResult(input),
    surprise: true,
  }));
  const extraEvidence = await extraField.simulate({
    intent: normalizedIntent,
    request: rawRequest,
  });
  assert.equal(extraEvidence.status, 'mismatch');
});

test('simulator operational failure becomes unavailable and remains non-proving', async () => {
  const rawRequest = request();
  const normalizedIntent = intent(rawRequest);
  const runtime = harness(async () => {
    throw new Error('simulator offline');
  });
  const evidence = await runtime.simulate({ intent: normalizedIntent, request: rawRequest });

  assert.equal(evidence.status, 'unavailable');
  assert.equal(evidence.state_commitment, null);
  assert.equal(evidence.effect_commitment, null);
  assert.equal(evidence.simulator_truth_proved, false);
  assert.deepEqual(runtime.toPolicySimulation(normalizedIntent, evidence), { status: 'unavailable' });
});

test('pass and fail require exact state/effect commitments while unavailable requires null commitments', async () => {
  const rawRequest = request();
  const normalizedIntent = intent(rawRequest);

  for (const overrides of [
    { state_commitment: null },
    { effect_commitment: null },
    { state_commitment: 'not-a-hash' },
    { effect_commitment: 'not-a-hash' },
  ]) {
    const runtime = harness(async (input) => callbackResult(input, overrides));
    const evidence = await runtime.simulate({ intent: normalizedIntent, request: rawRequest });
    assert.equal(evidence.status, 'mismatch');
    assert.deepEqual(runtime.toPolicySimulation(normalizedIntent, evidence), { status: 'mismatch' });
  }

  const failedRuntime = harness(async (input) => callbackResult(input, { status: 'fail' }));
  const failed = await failedRuntime.simulate({ intent: normalizedIntent, request: rawRequest });
  assert.equal(failed.status, 'fail');
  assert.deepEqual(failedRuntime.toPolicySimulation(normalizedIntent, failed), { status: 'fail' });

  const invalidUnavailableRuntime = harness(async (input) => callbackResult(input, {
    status: 'unavailable',
  }));
  const invalidUnavailable = await invalidUnavailableRuntime.simulate({
    intent: normalizedIntent,
    request: rawRequest,
  });
  assert.equal(invalidUnavailable.status, 'mismatch');

  const unavailableRuntime = harness(async (input) => callbackResult(input, {
    status: 'unavailable',
    state_commitment: null,
    effect_commitment: null,
  }));
  const unavailable = await unavailableRuntime.simulate({
    intent: normalizedIntent,
    request: rawRequest,
  });
  assert.equal(unavailable.status, 'unavailable');
});

test('forged structural and cross-harness evidence cannot enter policy as local simulation evidence', async () => {
  const rawRequest = request();
  const normalizedIntent = intent(rawRequest);
  const sourceHarness = harness();
  const evidence = await sourceHarness.simulate({ intent: normalizedIntent, request: rawRequest });
  const forged = Object.freeze({ ...evidence });
  const otherHarness = harness();

  assert.equal(sourceHarness.isLocalEvidence(forged), false);
  assert.throws(
    () => sourceHarness.toPolicySimulation(normalizedIntent, forged),
    (error) => expectCode(error, 'POMRX_WG_SIM_E_INVALID'),
  );

  assert.equal(otherHarness.isLocalEvidence(evidence), false);
  assert.throws(
    () => otherHarness.toPolicySimulation(normalizedIntent, evidence),
    (error) => expectCode(error, 'POMRX_WG_SIM_E_INVALID'),
  );
});

test('same-harness pass evidence cannot be replayed onto a different Wallet Guard intent', async () => {
  const firstRequest = request({ value: '0x1' });
  const firstIntent = intent(firstRequest);
  const secondRequest = request({ value: '0x2' });
  const secondIntent = intent(secondRequest);
  const runtime = harness();
  const evidence = await runtime.simulate({ intent: firstIntent, request: firstRequest });

  assert.throws(
    () => runtime.toPolicySimulation(secondIntent, evidence),
    (error) => expectCode(error, 'POMRX_WG_SIM_E_BINDING_MISMATCH'),
  );
  assert.deepEqual(runtime.toPolicySimulation(firstIntent, evidence), { status: 'pass' });
});

test('non-local evidence is rejected before any forged accessor is read', () => {
  const runtime = harness();
  const normalizedIntent = intent();
  let getterCalls = 0;
  const forged = {};
  Object.defineProperty(forged, 'status', {
    enumerable: true,
    get() {
      getterCalls += 1;
      throw new Error('must not execute');
    },
  });

  assert.throws(
    () => runtime.toPolicySimulation(normalizedIntent, forged),
    (error) => expectCode(error, 'POMRX_WG_SIM_E_INVALID'),
  );
  assert.equal(getterCalls, 0);
});

test('simulation commitment is deterministic for identical intent and semantic simulator result', async () => {
  const rawRequest = request();
  const normalizedIntent = intent(rawRequest);
  const firstRuntime = harness();
  const secondRuntime = harness();
  const first = await firstRuntime.simulate({ intent: normalizedIntent, request: rawRequest });
  const second = await secondRuntime.simulate({ intent: normalizedIntent, request: rawRequest });

  assert.equal(first.simulation_commitment, second.simulation_commitment);
  assert.equal(first.intent_commitment, second.intent_commitment);
  assert.equal(firstRuntime.isLocalEvidence(second), false);
  assert.equal(secondRuntime.isLocalEvidence(first), false);
});

test('hostile request structures fail closed before simulator invocation', async () => {
  let calls = 0;
  const runtime = harness(async (input) => {
    calls += 1;
    return callbackResult(input);
  });
  const rawRequest = request();
  const normalizedIntent = intent(rawRequest);
  const hostile = request();
  Object.defineProperty(hostile.params[0], 'value', {
    enumerable: true,
    get() { return '0x1'; },
  });

  await assert.rejects(
    runtime.simulate({ intent: normalizedIntent, request: hostile }),
    (error) => expectCode(error, 'POMRX_WG_SIM_E_REQUEST_INVALID'),
  );
  assert.equal(calls, 0);
});
