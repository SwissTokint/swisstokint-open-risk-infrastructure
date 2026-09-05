import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createWalletGuardControlledCallbackProviderTransport,
} from '../../applications/blockchain-digital-assets/wallet-guard/trusted-provider-transport.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;

function createTransport() {
  return createWalletGuardControlledCallbackProviderTransport({
    chainId: '0x7a69',
    accounts: [ACCOUNT],
    maxSensitiveCalls: 1,
    dispatchSensitive() {},
  });
}

function restoreDescriptor(target, key, descriptor) {
  if (descriptor === undefined) delete target[key];
  else Object.defineProperty(target, key, descriptor);
}

test('CSPRNG session encoding never consults a post-import Buffer.prototype.length getter', () => {
  const original = Object.getOwnPropertyDescriptor(Buffer.prototype, 'length');
  let poisonCalls = 0;

  Object.defineProperty(Buffer.prototype, 'length', {
    configurable: true,
    get() {
      poisonCalls += 1;
      for (let index = 0; index < 32; index += 1) {
        this[index] = 0;
      }
      return 32;
    },
  });

  let first;
  let second;
  try {
    first = createTransport();
    second = createTransport();
  } finally {
    restoreDescriptor(Buffer.prototype, 'length', original);
  }

  assert.equal(poisonCalls, 0, 'session generation must not execute inherited Buffer length hooks');
  assert.notEqual(
    first.control.inspect().session_id,
    second.control.inspect().session_id,
    'independent callback transports must retain distinct CSPRNG-owned session identities',
  );
});
