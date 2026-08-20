import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeWalletGuardIntent,
} from '../../applications/blockchain-digital-assets/wallet-guard/intent.mjs';
import {
  WalletGuardSimulationError,
  createWalletGuardReferenceSimulationHarness,
} from '../../applications/blockchain-digital-assets/wallet-guard/simulation.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const RECIPIENT = `0x${'2'.repeat(40)}`;
const ORIGIN = 'https://simulation.wallet-guard.local';
const CHAIN_ID = '0x1';
const STATE = 'a'.repeat(64);
const EFFECT = 'b'.repeat(64);

function rawRequest(value = '0x0') {
  return {
    method: 'eth_sendTransaction',
    params: [{
      from: ACCOUNT,
      to: RECIPIENT,
      value,
      data: '0x',
    }],
  };
}

function normalize(request, requestId) {
  return normalizeWalletGuardIntent({
    requestId,
    trustedOrigin: ORIGIN,
    trustedChainId: CHAIN_ID,
    trustedAccount: ACCOUNT,
    request,
  });
}

function callbackResult(input) {
  return {
    status: 'pass',
    request_id: input.request_id,
    request_commitment: input.request_commitment,
    intent_commitment: input.intent_commitment,
    origin: input.origin,
    chain_id: input.chain_id,
    account: input.account,
    state_commitment: STATE,
    effect_commitment: EFFECT,
  };
}

function expectCode(error, code) {
  assert.ok(error instanceof WalletGuardSimulationError);
  assert.equal(error.code, code);
  return true;
}

test('later WeakSet/WeakMap prototype poisoning cannot forge provenance or intent identity', async () => {
  const firstRequest = rawRequest();
  const firstIntent = normalize(firstRequest, 'wg-simulation-intrinsic-0001');
  const secondIntent = normalize(firstRequest, 'wg-simulation-intrinsic-0001');
  const runtime = createWalletGuardReferenceSimulationHarness({
    simulateRequest: async (input) => callbackResult(input),
  });
  const evidence = await runtime.simulate({ intent: firstIntent, request: firstRequest });
  const forged = Object.freeze({ ...evidence });

  const originalWeakSetHas = WeakSet.prototype.has;
  const originalWeakMapGet = WeakMap.prototype.get;
  let forgedResult;
  let wrongIntentResult;

  WeakSet.prototype.has = () => true;
  WeakMap.prototype.get = () => secondIntent;
  try {
    try {
      runtime.toPolicySimulation(secondIntent, forged);
    } catch (error) {
      forgedResult = error;
    }
    try {
      runtime.toPolicySimulation(secondIntent, evidence);
    } catch (error) {
      wrongIntentResult = error;
    }
  } finally {
    WeakSet.prototype.has = originalWeakSetHas;
    WeakMap.prototype.get = originalWeakMapGet;
  }

  assert.ok(forgedResult);
  expectCode(forgedResult, 'POMRX_WG_SIM_E_INVALID');
  assert.ok(wrongIntentResult);
  expectCode(wrongIntentResult, 'POMRX_WG_SIM_E_BINDING_MISMATCH');
  assert.deepEqual(runtime.toPolicySimulation(firstIntent, evidence), { status: 'pass' });
});

test('later Set.prototype.has poisoning cannot widen callback status vocabulary', async () => {
  const request = rawRequest('0x1');
  const intent = normalize(request, 'wg-simulation-intrinsic-0002');
  const runtime = createWalletGuardReferenceSimulationHarness({
    simulateRequest: async (input) => ({
      ...callbackResult(input),
      status: 'attacker-defined-status',
    }),
  });

  const originalSetHas = Set.prototype.has;
  let evidence;
  Set.prototype.has = () => true;
  try {
    evidence = await runtime.simulate({ intent, request });
  } finally {
    Set.prototype.has = originalSetHas;
  }

  assert.equal(evidence.status, 'mismatch');
  assert.deepEqual(runtime.toPolicySimulation(intent, evidence), { status: 'mismatch' });
});
