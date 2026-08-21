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

function customTypedData() {
  return {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
      ],
      CustomMessage: [
        { name: 'value', type: 'string' },
      ],
    },
    primaryType: 'CustomMessage',
    domain: {
      name: 'Boundary Test',
      version: '1',
    },
    message: {
      value: 'stable',
    },
  };
}

function typedDataRequest(data) {
  return {
    method: 'eth_signTypedData_v4',
    params: [ACCOUNT, data],
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

test('typed-data normalization rejects hidden, symbol and custom-array decorations', () => {
  const cases = [
    {
      name: 'hidden object field',
      mutate(data) {
        Object.defineProperty(data.message, 'hidden', {
          value: true,
          enumerable: false,
        });
      },
    },
    {
      name: 'symbol array field',
      mutate(data) {
        data.types.CustomMessage[Symbol('hidden')] = true;
      },
    },
    {
      name: 'hidden array field',
      mutate(data) {
        Object.defineProperty(data.types.CustomMessage, 'hidden', {
          value: true,
          enumerable: false,
        });
      },
    },
    {
      name: 'custom array prototype',
      mutate(data) {
        Object.setPrototypeOf(
          data.types.CustomMessage,
          Object.create(Array.prototype),
        );
      },
    },
  ];

  cases.forEach(({ name, mutate }, index) => {
    const data = customTypedData();
    mutate(data);
    assert.throws(
      () => normalize(
        typedDataRequest(data),
        `wg-intent-intrinsic-typed-${String(index).padStart(4, '0')}`,
      ),
      expectRequestInvalid,
      name,
    );
  });
});

test('typed-data normalization rejects hidden, symbol, accessor, Proxy and custom-prototype wrappers', () => {
  const cases = [
    {
      name: 'hidden request field',
      build() {
        const rawRequest = typedDataRequest(customTypedData());
        Object.defineProperty(rawRequest, 'hidden', {
          value: true,
          enumerable: false,
        });
        return { rawRequest, observed: () => 0 };
      },
    },
    {
      name: 'symbol request field',
      build() {
        const rawRequest = typedDataRequest(customTypedData());
        rawRequest[Symbol('hidden')] = true;
        return { rawRequest, observed: () => 0 };
      },
    },
    {
      name: 'custom request prototype',
      build() {
        const rawRequest = typedDataRequest(customTypedData());
        Object.setPrototypeOf(rawRequest, Object.create(Object.prototype));
        return { rawRequest, observed: () => 0 };
      },
    },
    {
      name: 'hidden params field',
      build() {
        const rawRequest = typedDataRequest(customTypedData());
        Object.defineProperty(rawRequest.params, 'hidden', {
          value: true,
          enumerable: false,
        });
        return { rawRequest, observed: () => 0 };
      },
    },
    {
      name: 'symbol params field',
      build() {
        const rawRequest = typedDataRequest(customTypedData());
        rawRequest.params[Symbol('hidden')] = true;
        return { rawRequest, observed: () => 0 };
      },
    },
    {
      name: 'custom params prototype',
      build() {
        const rawRequest = typedDataRequest(customTypedData());
        Object.setPrototypeOf(rawRequest.params, Object.create(Array.prototype));
        return { rawRequest, observed: () => 0 };
      },
    },
    {
      name: 'method accessor',
      build() {
        const rawRequest = typedDataRequest(customTypedData());
        let getterCount = 0;
        Object.defineProperty(rawRequest, 'method', {
          enumerable: true,
          configurable: true,
          get() {
            getterCount += 1;
            return 'eth_signTypedData_v4';
          },
        });
        return { rawRequest, observed: () => getterCount };
      },
    },
    {
      name: 'params accessor',
      build() {
        const rawRequest = typedDataRequest(customTypedData());
        const params = rawRequest.params;
        let getterCount = 0;
        Object.defineProperty(rawRequest, 'params', {
          enumerable: true,
          configurable: true,
          get() {
            getterCount += 1;
            return params;
          },
        });
        return { rawRequest, observed: () => getterCount };
      },
    },
    {
      name: 'request Proxy',
      build() {
        const target = typedDataRequest(customTypedData());
        let trapCount = 0;
        const rawRequest = new Proxy(target, {
          get(...args) {
            trapCount += 1;
            return Reflect.get(...args);
          },
          getOwnPropertyDescriptor(...args) {
            trapCount += 1;
            return Reflect.getOwnPropertyDescriptor(...args);
          },
          ownKeys(...args) {
            trapCount += 1;
            return Reflect.ownKeys(...args);
          },
        });
        return { rawRequest, observed: () => trapCount };
      },
    },
    {
      name: 'params Proxy',
      build() {
        const rawRequest = typedDataRequest(customTypedData());
        let trapCount = 0;
        rawRequest.params = new Proxy(rawRequest.params, {
          get(...args) {
            trapCount += 1;
            return Reflect.get(...args);
          },
          getOwnPropertyDescriptor(...args) {
            trapCount += 1;
            return Reflect.getOwnPropertyDescriptor(...args);
          },
          ownKeys(...args) {
            trapCount += 1;
            return Reflect.ownKeys(...args);
          },
        });
        return { rawRequest, observed: () => trapCount };
      },
    },
  ];

  cases.forEach(({ name, build }, index) => {
    const { rawRequest, observed } = build();
    assert.throws(
      () => normalize(
        rawRequest,
        `wg-intent-intrinsic-wrapper-${String(index).padStart(4, '0')}`,
      ),
      expectRequestInvalid,
      name,
    );
    assert.equal(observed(), 0, `${name} must not execute user code`);
  });
});
