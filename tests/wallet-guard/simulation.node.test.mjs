import assert from 'node:assert/strict';
import test from 'node:test';

import {
  commitWalletGuardIntent,
  normalizeWalletGuardIntent,
} from '../../applications/blockchain-digital-assets/wallet-guard/intent.mjs';
import {
  WalletGuardSimulationError,
  createWalletGuardReferenceSimulationHarness,
  isLocallyProducedWalletGuardSimulationEvidence,
  toWalletGuardPolicySimulation,
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
  assert.equal(isLocallyProducedWalletGuardSimulationEvidence(evidence), true);
  assert.deepEqual(toWalletGuardPolicySimulation(evidence), { status: 'pass' });
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

test('simulator identity substitution is downgraded to mismatch evidence', async () => {
  const runtime = harness(async (input) => callbackResult(input, {
    account: OTHER,
    intent_commitment: 'f'.repeat(64),
  }));
  const rawRequest = request();
  const evidence = await runtime.simulate({ intent: intent(rawRequest), request: rawRequest });

  assert.equal(evidence.status, 'mismatch');
  assert.equal(evidence.account, ACCOUNT);
  assert.equal(evidence.state_commitment, null);
  assert.equal(evidence.effect_commitment, null);
  assert.deepEqual(toWalletGuardPolicySimulation(evidence), { status: 'mismatch' });
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
  const evidence = await harness(async () => {
    throw new Error('simulator offline');
  }).simulate({ intent: intent(rawRequest), request: rawRequest });

  assert.equal(evidence.status, 'unavailable');
  assert.equal(evidence.state_commitment, null);
  assert.equal(evidence.effect_commitment, null);
  assert.equal(evidence.simulator_truth_proved, false);
  assert.deepEqual(toWalletGuardPolicySimulation(evidence), { status: 'unavailable' });
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
    const evidence = await harness(async (input) => callbackResult(input, overrides))
      .simulate({ intent: normalizedIntent, request: rawRequest });
    assert.equal(evidence.status, 'mismatch');
  }

  const failed = await harness(async (input) => callbackResult(input, { status: 'fail' }))
    .simulate({ intent: normalizedIntent, request: rawRequest });
  assert.equal(failed.status, 'fail');
  assert.deepEqual(toWalletGuardPolicySimulation(failed), { status: 'fail' });

  const invalidUnavailable = await harness(async (input) => callbackResult(input, {
    status: 'unavailable',
  })).simulate({ intent: normalizedIntent, request: rawRequest });
  assert.equal(invalidUnavailable.status, 'mismatch');

  const unavailable = await harness(async (input) => callbackResult(input, {
    status: 'unavailable',
    state_commitment: null,
    effect_commitment: null,
  })).simulate({ intent: normalizedIntent, request: rawRequest });
  assert.equal(unavailable.status, 'unavailable');
});

test('forged structural simulation evidence cannot be supplied to policy as locally produced evidence', async () => {
  const rawRequest = request();
  const evidence = await harness().simulate({ intent: intent(rawRequest), request: rawRequest });
  const forged = Object.freeze({ ...evidence });

  assert.equal(isLocallyProducedWalletGuardSimulationEvidence(forged), false);
  assert.throws(
    () => toWalletGuardPolicySimulation(forged),
    (error) => expectCode(error, 'POMRX_WG_SIM_E_INVALID'),
  );
});

test('simulation commitment is deterministic for identical intent and semantic simulator result', async () => {
  const rawRequest = request();
  const normalizedIntent = intent(rawRequest);
  const first = await harness().simulate({ intent: normalizedIntent, request: rawRequest });
  const second = await harness().simulate({ intent: normalizedIntent, request: rawRequest });

  assert.equal(first.simulation_commitment, second.simulation_commitment);
  assert.equal(first.intent_commitment, second.intent_commitment);
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
