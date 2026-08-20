import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PomRxPlainDataError,
} from '../../core/reference-data/plain-data-snapshot.mjs';
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

function request() {
  return {
    method: 'eth_sendTransaction',
    params: [{
      from: ACCOUNT,
      to: RECIPIENT,
      value: '0x1',
      data: '0x',
    }],
  };
}

function normalize(rawRequest, requestId) {
  return normalizeWalletGuardIntent({
    requestId,
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
    request_commitment: input.request_commitment,
    intent_commitment: input.intent_commitment,
    origin: input.origin,
    chain_id: input.chain_id,
    account: input.account,
    state_commitment: STATE,
    effect_commitment: EFFECT,
    ...overrides,
  };
}

test('foreign PomRxPlainDataError during callback capture is not downgraded to mismatch', async () => {
  const rawRequest = request();
  const intent = normalize(rawRequest, 'wg-simulation-provenance-0001');
  const originalSetHas = Set.prototype.has;
  const foreign = new PomRxPlainDataError(
    'POMRX_DATA_E_KEY',
    'foreign callback-capture failure',
  );
  const runtime = createWalletGuardReferenceSimulationHarness({
    simulateRequest: async (input) => {
      Set.prototype.has = function poisonedSetHas() {
        Set.prototype.has = originalSetHas;
        throw foreign;
      };
      return callbackResult(input);
    },
  });

  try {
    await assert.rejects(
      runtime.simulate({ intent, request: rawRequest }),
      (error) => error === foreign,
    );
  } finally {
    Set.prototype.has = originalSetHas;
  }
});

test('matching exported simulation error from a later intrinsic preserves exact provenance', async () => {
  const rawRequest = request();
  const intent = normalize(rawRequest, 'wg-simulation-provenance-0002');
  const originalRegExpTest = RegExp.prototype.test;
  const foreign = new WalletGuardSimulationError(
    'POMRX_WG_SIM_E_CALLBACK_INVALID',
    'foreign hash-path failure',
  );
  const runtime = createWalletGuardReferenceSimulationHarness({
    simulateRequest: async (input) => {
      RegExp.prototype.test = function poisonedRegExpTest() {
        RegExp.prototype.test = originalRegExpTest;
        throw foreign;
      };
      return callbackResult(input);
    },
  });

  try {
    await assert.rejects(
      runtime.simulate({ intent, request: rawRequest }),
      (error) => error === foreign,
    );
  } finally {
    RegExp.prototype.test = originalRegExpTest;
  }
});

test('genuine invalid callback hashes remain local mismatch evidence', async () => {
  const rawRequest = request();
  const intent = normalize(rawRequest, 'wg-simulation-provenance-0003');
  const runtime = createWalletGuardReferenceSimulationHarness({
    simulateRequest: async (input) => callbackResult(input, {
      state_commitment: 'NOT-A-SHA256',
    }),
  });

  const evidence = await runtime.simulate({ intent, request: rawRequest });
  assert.equal(evidence.status, 'mismatch');
  assert.equal(evidence.state_commitment, null);
  assert.equal(evidence.effect_commitment, null);
});
