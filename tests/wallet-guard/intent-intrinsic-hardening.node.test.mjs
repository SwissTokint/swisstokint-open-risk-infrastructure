import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WalletGuardIntentError,
  isLocallyNormalizedWalletGuardIntent,
  normalizeWalletGuardIntent,
} from '../../applications/blockchain-digital-assets/wallet-guard/intent.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const RECIPIENT = `0x${'2'.repeat(40)}`;
const ORIGIN = 'https://intent.wallet-guard.local';
const CHAIN_ID = '0x1';

function request(extra = {}) {
  return {
    method: 'eth_sendTransaction',
    params: [{
      from: ACCOUNT,
      to: RECIPIENT,
      value: '0x0',
      data: '0x',
      ...extra,
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

function expectRequestInvalid(error) {
  assert.ok(error instanceof WalletGuardIntentError);
  assert.equal(error.code, 'POMRX_WG_E_REQUEST_INVALID');
  return true;
}

test('later WeakSet prototype poisoning cannot forge or suppress local intent provenance', () => {
  const first = normalize(request(), 'wg-intent-intrinsic-0001');
  const structuralClone = Object.freeze({ ...first });
  const originalHas = WeakSet.prototype.has;
  const originalAdd = WeakSet.prototype.add;
  let forgedAccepted;
  let second;

  WeakSet.prototype.has = () => true;
  WeakSet.prototype.add = function poisonedAdd() { return this; };
  try {
    forgedAccepted = isLocallyNormalizedWalletGuardIntent(structuralClone);
    second = normalize(request(), 'wg-intent-intrinsic-0002');
  } finally {
    WeakSet.prototype.has = originalHas;
    WeakSet.prototype.add = originalAdd;
  }

  assert.equal(forgedAccepted, false);
  assert.equal(isLocallyNormalizedWalletGuardIntent(first), true);
  assert.equal(isLocallyNormalizedWalletGuardIntent(second), true);
});

test('later Set.prototype.has poisoning cannot widen transaction fields', () => {
  const originalHas = Set.prototype.has;
  let thrown;

  Set.prototype.has = () => true;
  try {
    try {
      normalize(request({ gas: '0x5208' }), 'wg-intent-intrinsic-0003');
    } catch (error) {
      thrown = error;
    }
  } finally {
    Set.prototype.has = originalHas;
  }

  assert.ok(thrown);
  expectRequestInvalid(thrown);
});
