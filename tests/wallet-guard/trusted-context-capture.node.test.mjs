import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WalletGuardTrustedContextError,
  captureWalletGuardTrustedContext,
} from '../../applications/blockchain-digital-assets/wallet-guard/trusted-context-capture.mjs';

const CHAIN_ID = '0x1';
const ACCOUNT = `0x${'1'.repeat(40)}`;
const TRUSTED_RUNTIME = Object.freeze({
  objectCreate: Object.create,
  objectDefineProperty: Object.defineProperty,
  objectFreeze: Object.freeze,
  reflectApply: Reflect.apply,
  regexpExec: RegExp.prototype.exec,
});

function validCapture(deliverContext) {
  deliverContext(CHAIN_ID, ACCOUNT);
}

function capture(captureContext) {
  return captureWalletGuardTrustedContext(captureContext, TRUSTED_RUNTIME);
}

function assertExactContext(context) {
  assert.equal(Object.getPrototypeOf(context), null);
  assert.equal(Object.isFrozen(context), true);
  assert.deepEqual(Object.keys(context).sort(), ['account', 'chain_id']);
  assert.equal(context.chain_id, CHAIN_ID);
  assert.equal(context.account, ACCOUNT);
}

test('trusted context capture returns exact prototype-inert scalar context', () => {
  assertExactContext(capture(validCapture));
});

test('trusted primordial runtime is mandatory', () => {
  assert.throws(
    () => captureWalletGuardTrustedContext(validCapture),
    (error) => error instanceof WalletGuardTrustedContextError
      && error.code === 'POMRX_WG_CONTEXT_E_RUNTIME',
  );
});

test('pre-import ambient primordial poisoning is not silently captured as trusted', async () => {
  const originalCreate = Object.create;
  const originalDefineProperty = Object.defineProperty;
  const originalFreeze = Object.freeze;
  const originalApply = Reflect.apply;
  const originalExec = RegExp.prototype.exec;
  let poisonCalls = 0;

  Object.create = function poisonedCreate(prototype, properties) {
    poisonCalls += 1;
    if (prototype === null) return {};
    return originalApply(originalCreate, undefined, [prototype, properties]);
  };
  Object.defineProperty = function poisonedDefineProperty(...args) {
    poisonCalls += 1;
    return originalApply(originalDefineProperty, undefined, args);
  };
  Object.freeze = function poisonedFreeze(value) {
    poisonCalls += 1;
    return value;
  };
  Reflect.apply = function poisonedApply(...args) {
    poisonCalls += 1;
    return originalApply(...args);
  };
  RegExp.prototype.exec = function poisonedExec(...args) {
    poisonCalls += 1;
    return originalApply(originalExec, this, args);
  };

  let isolatedModule;
  try {
    isolatedModule = await import(
      '../../applications/blockchain-digital-assets/wallet-guard/trusted-context-capture.mjs?preimport-primordial-regression'
    );
  } finally {
    Object.create = originalCreate;
    Object.defineProperty = originalDefineProperty;
    Object.freeze = originalFreeze;
    Reflect.apply = originalApply;
    RegExp.prototype.exec = originalExec;
  }

  const beforeCaptureCalls = poisonCalls;
  const context = isolatedModule.captureWalletGuardTrustedContext(validCapture, TRUSTED_RUNTIME);
  assert.equal(poisonCalls, beforeCaptureCalls);
  assertExactContext(context);
});

test('post-import ambient primordial drift is ignored in favor of the trusted runtime', () => {
  const originalCreate = Object.create;
  const originalFreeze = Object.freeze;
  const originalDefineProperty = Object.defineProperty;
  const originalApply = Reflect.apply;
  const originalExec = RegExp.prototype.exec;
  let poisonCalls = 0;

  Object.create = function poisonedCreate(...args) {
    poisonCalls += 1;
    return originalApply(originalCreate, undefined, args);
  };
  Object.freeze = function poisonedFreeze(value) {
    poisonCalls += 1;
    return value;
  };
  Object.defineProperty = function poisonedDefineProperty(...args) {
    poisonCalls += 1;
    return originalApply(originalDefineProperty, undefined, args);
  };
  Reflect.apply = function poisonedApply(...args) {
    poisonCalls += 1;
    return originalApply(...args);
  };
  RegExp.prototype.exec = function poisonedExec(...args) {
    poisonCalls += 1;
    return originalApply(originalExec, this, args);
  };

  let context;
  try {
    context = capture(validCapture);
  } finally {
    Object.create = originalCreate;
    Object.freeze = originalFreeze;
    Object.defineProperty = originalDefineProperty;
    Reflect.apply = originalApply;
    RegExp.prototype.exec = originalExec;
  }

  assert.equal(poisonCalls, 0);
  assertExactContext(context);
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
    const context = capture(validCapture);
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
    () => capture((deliverContext) => {
      deliverContext(CHAIN_ID, ACCOUNT);
      deliverContext(CHAIN_ID, ACCOUNT);
    }),
    (error) => error instanceof WalletGuardTrustedContextError
      && error.code === 'POMRX_WG_CONTEXT_E_CONTRADICTORY',
  );
});

test('success plus failure contradiction fails closed', () => {
  assert.throws(
    () => capture((deliverContext, reportFailure) => {
      deliverContext(CHAIN_ID, ACCOUNT);
      reportFailure('CONTEXT_UNAVAILABLE');
    }),
    (error) => error instanceof WalletGuardTrustedContextError
      && error.code === 'POMRX_WG_CONTEXT_E_CONTRADICTORY',
  );
});

test('missing terminal callback fails closed', () => {
  assert.throws(
    () => capture(() => undefined),
    (error) => error instanceof WalletGuardTrustedContextError
      && error.code === 'POMRX_WG_CONTEXT_E_MISSING',
  );
});

test('dispatcher return values are outside the callback contract', () => {
  assert.throws(
    () => capture((deliverContext) => {
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
      () => capture((deliverContext) => {
        deliverContext(chainId, account);
      }),
      (error) => error instanceof WalletGuardTrustedContextError
        && error.code === 'POMRX_WG_CONTEXT_E_INVALID',
    );
  }
});

test('explicit context failure is preserved as a closed outcome', () => {
  assert.throws(
    () => capture((_deliverContext, reportFailure) => {
      reportFailure('CONTEXT_UNAVAILABLE');
    }),
    (error) => error instanceof WalletGuardTrustedContextError
      && error.code === 'POMRX_WG_CONTEXT_E_SOURCE_FAILURE',
  );
});
