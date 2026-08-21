import assert from 'node:assert/strict';
import { types as utilTypes } from 'node:util';
import test from 'node:test';

import {
  captureReferencePlainDataOutcome,
} from '../../core/reference-data/plain-data-snapshot.mjs';
import {
  normalizeWalletGuardIntent,
} from '../../applications/blockchain-digital-assets/wallet-guard/intent.mjs';
import {
  createWalletGuardReferenceSimulationHarness,
} from '../../applications/blockchain-digital-assets/wallet-guard/simulation.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const ORIGIN = 'https://independent-review.wallet-guard.local';
const CHAIN_ID = '0x1';

function normalize(request, requestId) {
  return normalizeWalletGuardIntent({
    requestId,
    trustedOrigin: ORIGIN,
    trustedChainId: CHAIN_ID,
    trustedAccount: ACCOUNT,
    request,
  });
}

function unavailableResult(input) {
  return {
    status: 'unavailable',
    request_id: input.request_id,
    request_commitment: input.request_commitment,
    intent_commitment: input.intent_commitment,
    origin: input.origin,
    chain_id: input.chain_id,
    account: input.account,
    state_commitment: null,
    effect_commitment: null,
  };
}

function simpleTypedData(value = 'clean') {
  return {
    types: {
      EIP712Domain: [],
      CustomMessage: [{ name: 'value', type: 'string' }],
    },
    primaryType: 'CustomMessage',
    domain: {},
    message: { value },
  };
}

test('shared plain-data capture rejects a nested Proxy with the initialization-time intrinsic', () => {
  let traps = 0;
  const nested = new Proxy({ value: 'clean' }, {
    getPrototypeOf() {
      traps += 1;
      return Object.prototype;
    },
    ownKeys() {
      traps += 1;
      return ['value'];
    },
    getOwnPropertyDescriptor(target, key) {
      traps += 1;
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
    get(target, key, receiver) {
      traps += 1;
      return Reflect.get(target, key, receiver);
    },
  });
  const originalIsProxy = utilTypes.isProxy;
  utilTypes.isProxy = () => false;
  try {
    const outcome = captureReferencePlainDataOutcome(
      { outer: { nested } },
      'nested proxy intrinsic regression',
    );
    assert.equal(outcome.ok, false);
    assert.equal(outcome.error.code, 'POMRX_DATA_E_PROXY');
    assert.equal(traps, 0);
  } finally {
    utilTypes.isProxy = originalIsProxy;
  }
});

test('typed-data simulation rejects a nested Proxy after live isProxy poisoning with zero traps/callbacks', async () => {
  const cleanRequest = {
    method: 'eth_signTypedData_v4',
    params: [ACCOUNT, simpleTypedData('same-semantics')],
  };
  const intent = normalize(cleanRequest, 'wg-independent-nested-proxy-0001');
  let callbackCalls = 0;
  const runtime = createWalletGuardReferenceSimulationHarness({
    simulateRequest: async (input) => {
      callbackCalls += 1;
      return unavailableResult(input);
    },
  });

  let traps = 0;
  const hostileMessage = new Proxy({ value: 'same-semantics' }, {
    getPrototypeOf() {
      traps += 1;
      return Object.prototype;
    },
    ownKeys() {
      traps += 1;
      return ['value'];
    },
    getOwnPropertyDescriptor(target, key) {
      traps += 1;
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
    get(target, key, receiver) {
      traps += 1;
      return Reflect.get(target, key, receiver);
    },
  });
  const hostileTypedData = simpleTypedData('unused');
  hostileTypedData.message = hostileMessage;
  const hostileRequest = {
    method: 'eth_signTypedData_v4',
    params: [ACCOUNT, hostileTypedData],
  };

  const originalIsProxy = utilTypes.isProxy;
  utilTypes.isProxy = () => false;
  try {
    await assert.rejects(
      runtime.simulate({ intent, request: hostileRequest }),
      (error) => error?.code === 'POMRX_WG_SIM_E_REQUEST_INVALID',
    );
  } finally {
    utilTypes.isProxy = originalIsProxy;
  }
  assert.equal(traps, 0);
  assert.equal(callbackCalls, 0);
});

test('generic signature normalization rejects hidden request and decorated params wrappers', () => {
  const hiddenRequest = {
    method: 'personal_sign',
    params: ['payload'],
  };
  Object.defineProperty(hiddenRequest, 'shadow', {
    enumerable: false,
    configurable: true,
    value: 'hidden',
  });
  assert.throws(
    () => normalize(hiddenRequest, 'wg-independent-generic-wrapper-0001'),
    (error) => error?.code === 'POMRX_WG_E_REQUEST_INVALID',
  );

  const decoratedParams = ['payload'];
  Object.defineProperty(decoratedParams, 'shadow', {
    enumerable: false,
    configurable: true,
    value: true,
  });
  assert.throws(
    () => normalize({
      method: 'personal_sign',
      params: decoratedParams,
    }, 'wg-independent-generic-wrapper-0002'),
    (error) => error?.code === 'POMRX_WG_E_REQUEST_INVALID',
  );
});

test('generic signature keeps its exact 1000-node payload budget independent of the RPC wrapper', async () => {
  const boundaryRequest = {
    method: 'personal_sign',
    params: [Array.from({ length: 997 }, () => false)],
  };
  const intent = normalize(boundaryRequest, 'wg-independent-generic-budget-0001');
  assert.equal(intent.simulation_required, true);

  let callbackCalls = 0;
  const runtime = createWalletGuardReferenceSimulationHarness({
    simulateRequest: async (input) => {
      callbackCalls += 1;
      assert.equal(input.request.method, 'personal_sign');
      assert.equal(input.request.params.length, 1);
      assert.equal(input.request.params[0].length, 997);
      assert.equal(Object.isFrozen(input.request), true);
      assert.equal(Object.isFrozen(input.request.params), true);
      assert.equal(Object.isFrozen(input.request.params[0]), true);
      return unavailableResult(input);
    },
  });

  const evidence = await runtime.simulate({ intent, request: boundaryRequest });
  assert.equal(evidence.status, 'unavailable');
  assert.equal(callbackCalls, 1);

  const overBudgetRequest = {
    method: 'personal_sign',
    params: [Array.from({ length: 998 }, () => false)],
  };
  assert.throws(
    () => normalize(overBudgetRequest, 'wg-independent-generic-budget-0002'),
    (error) => error?.code === 'POMRX_WG_E_REQUEST_INVALID',
  );
  assert.equal(callbackCalls, 1);
});

test('generic request commitment distinguishes NFC-equivalent exact strings and rejects stale callback identity', async () => {
  const firstRequest = {
    method: 'personal_sign',
    params: ['é'],
  };
  const secondRequest = {
    method: 'personal_sign',
    params: ['e\u0301'],
  };
  const intent = normalize(firstRequest, 'wg-independent-generic-unicode-0001');

  const commitments = [];
  let cachedResult = null;
  const runtime = createWalletGuardReferenceSimulationHarness({
    simulateRequest: async (input) => {
      commitments.push(input.request_commitment);
      if (cachedResult === null) cachedResult = unavailableResult(input);
      return cachedResult;
    },
  });

  const firstEvidence = await runtime.simulate({ intent, request: firstRequest });
  const secondEvidence = await runtime.simulate({ intent, request: secondRequest });
  assert.equal(firstEvidence.status, 'unavailable');
  assert.equal(secondEvidence.status, 'mismatch');
  assert.equal(commitments.length, 2);
  assert.notEqual(commitments[0], commitments[1]);
});

test('generic request commitment distinguishes exact 0 and -0 and rejects stale callback identity', async () => {
  const firstRequest = {
    method: 'personal_sign',
    params: [0],
  };
  const secondRequest = {
    method: 'personal_sign',
    params: [-0],
  };
  const intent = normalize(firstRequest, 'wg-independent-generic-negzero-0001');

  const commitments = [];
  let cachedResult = null;
  const runtime = createWalletGuardReferenceSimulationHarness({
    simulateRequest: async (input) => {
      commitments.push(input.request_commitment);
      if (cachedResult === null) cachedResult = unavailableResult(input);
      return cachedResult;
    },
  });

  const firstEvidence = await runtime.simulate({ intent, request: firstRequest });
  const secondEvidence = await runtime.simulate({ intent, request: secondRequest });
  assert.equal(firstEvidence.status, 'unavailable');
  assert.equal(secondEvidence.status, 'mismatch');
  assert.equal(commitments.length, 2);
  assert.notEqual(commitments[0], commitments[1]);
});
