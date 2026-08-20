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
const ORIGIN = 'https://simulation.wallet-guard.local';
const CHAIN_ID = '0x1';
const REQUEST_ID = 'wg-simulation-equal-commitment-0001';
const STATE = 'a'.repeat(64);
const EFFECT = 'b'.repeat(64);

function normalize(request) {
  return normalizeWalletGuardIntent({
    requestId: REQUEST_ID,
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

function expectBindingMismatch(error) {
  assert.ok(error instanceof WalletGuardSimulationError);
  assert.equal(error.code, 'POMRX_WG_SIM_E_BINDING_MISMATCH');
  return true;
}

test('commitment-equivalent local intents cannot share simulation evidence', async () => {
  const omittedDefaultsRequest = {
    method: 'eth_sendTransaction',
    params: [{
      from: ACCOUNT,
      to: RECIPIENT,
    }],
  };
  const explicitDefaultsRequest = {
    method: 'eth_sendTransaction',
    params: [{
      from: ACCOUNT,
      to: RECIPIENT,
      value: '0x0',
      data: '0x',
    }],
  };

  const firstIntent = normalize(omittedDefaultsRequest);
  const secondIntent = normalize(explicitDefaultsRequest);

  assert.notEqual(firstIntent, secondIntent);
  assert.equal(
    commitWalletGuardIntent(firstIntent).intent_commitment,
    commitWalletGuardIntent(secondIntent).intent_commitment,
  );

  const runtime = createWalletGuardReferenceSimulationHarness({
    simulateRequest: async (input) => callbackResult(input),
  });
  const evidence = await runtime.simulate({
    intent: firstIntent,
    request: omittedDefaultsRequest,
  });

  assert.deepEqual(runtime.toPolicySimulation(firstIntent, evidence), { status: 'pass' });
  assert.throws(
    () => runtime.toPolicySimulation(secondIntent, evidence),
    expectBindingMismatch,
  );
});
