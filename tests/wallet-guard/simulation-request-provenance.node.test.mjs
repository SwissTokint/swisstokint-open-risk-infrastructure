import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ProofPayloadValidationError,
} from '../../sdk/typescript/swisstokint-proof.mjs';
import {
  WalletGuardIntentError,
  normalizeWalletGuardIntent,
} from '../../applications/blockchain-digital-assets/wallet-guard/intent.mjs';
import {
  createWalletGuardReferenceSimulationHarness,
} from '../../applications/blockchain-digital-assets/wallet-guard/simulation.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const RECIPIENT = `0x${'2'.repeat(40)}`;
const ORIGIN = 'https://simulation.wallet-guard.local';
const CHAIN_ID = '0x1';

function rawRequest() {
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

function normalize(request, requestId) {
  return normalizeWalletGuardIntent({
    requestId,
    trustedOrigin: ORIGIN,
    trustedChainId: CHAIN_ID,
    trustedAccount: ACCOUNT,
    request,
  });
}

function neverCalledHarness() {
  return createWalletGuardReferenceSimulationHarness({
    simulateRequest: async () => {
      throw new Error('simulator callback must not be reached');
    },
  });
}

test('foreign ProofPayloadValidationError during request commitment preserves exact provenance', async () => {
  const request = rawRequest();
  const intent = normalize(request, 'wg-simulation-request-provenance-0001');
  const runtime = neverCalledHarness();
  const originalEntries = Object.entries;
  const foreign = new ProofPayloadValidationError(
    'PROOF_E_PAYLOAD_KEY',
    'foreign canonicalizer-path failure',
  );

  Object.entries = function poisonedEntries(value) {
    if (value
        && typeof value === 'object'
        && Object.hasOwn(value, 'method')
        && Object.hasOwn(value, 'params')) {
      Object.entries = originalEntries;
      throw foreign;
    }
    return originalEntries(value);
  };
  try {
    await assert.rejects(
      runtime.simulate({ intent, request }),
      (error) => error === foreign,
    );
  } finally {
    Object.entries = originalEntries;
  }
});

test('foreign WalletGuardIntentError during replay normalization preserves exact provenance', async () => {
  const request = rawRequest();
  const intent = normalize(request, 'wg-simulation-request-provenance-0002');
  const runtime = neverCalledHarness();
  const originalKeys = Object.keys;
  const foreign = new WalletGuardIntentError(
    'POMRX_WG_E_REQUEST_INVALID',
    'foreign replay-path failure',
  );

  Object.keys = function poisonedKeys(value) {
    if (value
        && typeof value === 'object'
        && Object.hasOwn(value, 'requestId')
        && Object.hasOwn(value, 'trustedOrigin')
        && Object.hasOwn(value, 'request')) {
      Object.keys = originalKeys;
      throw foreign;
    }
    return originalKeys(value);
  };
  try {
    await assert.rejects(
      runtime.simulate({ intent, request }),
      (error) => error === foreign,
    );
  } finally {
    Object.keys = originalKeys;
  }
});
