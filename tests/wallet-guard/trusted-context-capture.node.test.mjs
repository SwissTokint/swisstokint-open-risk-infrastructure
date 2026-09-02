import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WalletGuardTrustedContextError,
  captureWalletGuardTrustedContext,
} from '../../applications/blockchain-digital-assets/wallet-guard/trusted-context-capture.mjs';

const CHAIN_ID = '0x1';
const ACCOUNT = `0x${'1'.repeat(40)}`;

function validCapture(deliverContext) {
  deliverContext(CHAIN_ID, ACCOUNT);
}

test('trusted context capture returns exact prototype-inert scalar context', () => {
  const context = captureWalletGuardTrustedContext(validCapture);
  assert.equal(Object.getPrototypeOf(context), null);
  assert.equal(Object.isFrozen(context), true);
  assert.deepEqual(Object.keys(context).sort(), ['account', 'chain_id']);
  assert.equal(context.chain_id, CHAIN_ID);
  assert.equal(context.account, ACCOUNT);
});

test('inherited Array/Object thenables cannot participate in scalar context delivery', () => {
  const originalArrayThen = Object.getOwnPropertyDescriptor(Array.prototype, 'then');
  const originalObjectThen = Object.getOwnPropertyDescriptor(Object.prototype, 'then');
  let poisonCalls = 0;
  Object.defineProperty(Array.prototype, 'then', {
    configurable: true,
    value(resolve) {
      poisonCalls += 1;
      resolve(['0x2', `0x${'8'.repeat(40)}`]);
    },
  });
  Object.defineProperty(Object.prototype, 'then', {
    configurable: true,
    value(resolve) {
      poisonCalls += 1;
      resolve({ chain_id: '0x2', account: `0x${'8'.repeat(40)}` });
    },
  });

  try {
    const context = captureWalletGuardTrustedContext(validCapture);
    assert.equal(context.chain_id, CHAIN_ID);
    assert.equal(context.account, ACCOUNT);
    assert.equal(poisonCalls, 0);
  } finally {
    if (originalArrayThen) {
      Object.defineProperty(Array.prototype, 'then', originalArrayThen);
    } else {
      delete Array.prototype.then;
    }
    if (originalObjectThen) {
      Object.defineProperty(Object.prototype, 'then', originalObjectThen);
    } else {
      delete Object.prototype.then;
    }
  }
});

test('duplicate success callbacks fail closed', () => {
  assert.throws(
    () => captureWalletGuardTrustedContext((deliverContext) => {
      deliverContext(CHAIN_ID, ACCOUNT);
      deliverContext(CHAIN_ID, ACCOUNT);
    }),
    (error) => error instanceof WalletGuardTrustedContextError
      && error.code === 'POMRX_WG_CONTEXT_E_CONTRADICTORY',
  );
});

test('success plus failure contradiction fails closed', () => {
  assert.throws(
    () => captureWalletGuardTrustedContext((deliverContext, reportFailure) => {
      deliverContext(CHAIN_ID, ACCOUNT);
      reportFailure('CONTEXT_UNAVAILABLE');
    }),
    (error) => error instanceof WalletGuardTrustedContextError
      && error.code === 'POMRX_WG_CONTEXT_E_CONTRADICTORY',
  );
});

test('missing terminal callback fails closed', () => {
  assert.throws(
    () => captureWalletGuardTrustedContext(() => undefined),
    (error) => error instanceof WalletGuardTrustedContextError
      && error.code === 'POMRX_WG_CONTEXT_E_MISSING',
  );
});

test('dispatcher return values are outside the callback contract', () => {
  assert.throws(
    () => captureWalletGuardTrustedContext((deliverContext) => {
      deliverContext(CHAIN_ID, ACCOUNT);
      return { chain_id: CHAIN_ID, account: ACCOUNT };
    }),
    (error) => error instanceof WalletGuardTrustedContextError
      && error.code === 'POMRX_WG_CONTEXT_E_RETURN_VALUE',
  );
});

test('malformed chain or account scalar fails closed', () => {
  for (const [chainId, account] of [
    ['0x01', ACCOUNT],
    ['1', ACCOUNT],
    [CHAIN_ID, `0x${'A'.repeat(40)}`],
    [CHAIN_ID, '0x1234'],
  ]) {
    assert.throws(
      () => captureWalletGuardTrustedContext((deliverContext) => {
        deliverContext(chainId, account);
      }),
      (error) => error instanceof WalletGuardTrustedContextError
        && error.code === 'POMRX_WG_CONTEXT_E_INVALID',
    );
  }
});

test('explicit context failure is preserved as a closed outcome', () => {
  assert.throws(
    () => captureWalletGuardTrustedContext((_deliverContext, reportFailure) => {
      reportFailure('CONTEXT_UNAVAILABLE');
    }),
    (error) => error instanceof WalletGuardTrustedContextError
      && error.code === 'POMRX_WG_CONTEXT_E_SOURCE_FAILURE',
  );
});
