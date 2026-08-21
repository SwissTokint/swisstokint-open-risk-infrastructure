import assert from 'node:assert/strict';
import crypto from 'node:crypto';
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

function typedDataRequest(value = 'stable') {
  return {
    method: 'eth_signTypedData_v4',
    params: [
      ACCOUNT,
      {
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
          name: 'Freeze Test',
          version: '1',
        },
        message: { value },
      },
    ],
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

test('foreign WalletGuardSimulationError after callback capture preserves exact provenance', async () => {
  const request = rawRequest();
  const intent = normalize(request, 'wg-simulation-intrinsic-0002');
  const originalGetOwnPropertyNames = Object.getOwnPropertyNames;
  const foreignError = new WalletGuardSimulationError(
    'POMRX_WG_SIM_E_INTERNAL',
    'foreign callback-shape failure',
  );
  const runtime = createWalletGuardReferenceSimulationHarness({
    simulateRequest: async (input) => {
      Object.getOwnPropertyNames = () => {
        throw foreignError;
      };
      return callbackResult(input);
    },
  });

  let thrown;
  try {
    await runtime.simulate({ intent, request });
  } catch (error) {
    thrown = error;
  } finally {
    Object.getOwnPropertyNames = originalGetOwnPropertyNames;
  }

  assert.equal(thrown, foreignError);
});

test('later Object.freeze replacement cannot leave a mutable typed-data callback request', async () => {
  const request = typedDataRequest();
  const intent = normalize(request, 'wg-simulation-intrinsic-0003');
  let callbackCount = 0;
  const runtime = createWalletGuardReferenceSimulationHarness({
    simulateRequest: async (input) => {
      callbackCount += 1;
      assert.equal(Object.isFrozen(input.request), true);
      assert.equal(Object.isFrozen(input.request.params), true);
      assert.equal(Object.isFrozen(input.request.params[1]), true);
      assert.equal(Object.isFrozen(input.request.params[1].message), true);
      await Promise.resolve();
      assert.throws(() => {
        input.request.params[1].message.value = 'mutated';
      }, TypeError);
      assert.equal(input.request.params[1].message.value, 'stable');
      return callbackResult(input);
    },
  });

  const originalFreeze = Object.freeze;
  const retained = [];
  Object.freeze = (value) => {
    retained.push(value);
    return value;
  };

  let evidence;
  try {
    evidence = await runtime.simulate({ intent, request });
  } finally {
    Object.freeze = originalFreeze;
  }

  assert.ok(retained.length > 0);
  assert.equal(callbackCount, 1);
  assert.equal(evidence.status, 'pass');
});

test('later Array sort/isArray poisoning cannot collapse compact typed-data request commitments', async () => {
  const firstRequest = typedDataRequest('é');
  const equivalentRequest = typedDataRequest('é');
  const distinctExactRequest = typedDataRequest('e\u0301');
  const intent = normalize(firstRequest, 'wg-simulation-intrinsic-0004');
  let cachedResult = null;
  const runtime = createWalletGuardReferenceSimulationHarness({
    simulateRequest: async (input) => {
      if (cachedResult === null) cachedResult = callbackResult(input);
      return cachedResult;
    },
  });

  const originalSort = Array.prototype.sort;
  const originalIsArray = Array.isArray;
  Array.prototype.sort = function poisonedSort() {
    this.length = 0;
    return this;
  };
  Array.isArray = (value) => {
    if (originalIsArray(value)
        && Object.isFrozen(value)
        && value.length === 2
        && value[1]
        && typeof value[1] === 'object'
        && Object.hasOwn(value[1], 'exact_typed_data_sha256')) {
      return false;
    }
    return originalIsArray(value);
  };

  let firstEvidence;
  let equivalentEvidence;
  let distinctEvidence;
  try {
    firstEvidence = await runtime.simulate({ intent, request: firstRequest });
    equivalentEvidence = await runtime.simulate({ intent, request: equivalentRequest });
    distinctEvidence = await runtime.simulate({ intent, request: distinctExactRequest });
  } finally {
    Array.prototype.sort = originalSort;
    Array.isArray = originalIsArray;
  }

  assert.equal(firstEvidence.status, 'pass');
  assert.equal(equivalentEvidence.status, 'pass');
  assert.equal(distinctEvidence.status, 'mismatch');
  assert.equal(equivalentEvidence.request_commitment, firstEvidence.request_commitment);
  assert.notEqual(distinctEvidence.request_commitment, firstEvidence.request_commitment);
});

test('later node:crypto createHash poisoning cannot collapse simulation commitments', async () => {
  const firstRequest = typedDataRequest('é');
  const distinctExactRequest = typedDataRequest('e\u0301');
  const intent = normalize(firstRequest, 'wg-simulation-intrinsic-0005');
  let cachedResult = null;
  const runtime = createWalletGuardReferenceSimulationHarness({
    simulateRequest: async (input) => {
      if (cachedResult === null) cachedResult = callbackResult(input);
      return cachedResult;
    },
  });

  const originalCreateHash = crypto.createHash;
  crypto.createHash = () => ({
    update() {
      return this;
    },
    digest() {
      return '0'.repeat(64);
    },
  });

  let firstEvidence;
  let distinctEvidence;
  try {
    firstEvidence = await runtime.simulate({ intent, request: firstRequest });
    distinctEvidence = await runtime.simulate({ intent, request: distinctExactRequest });
  } finally {
    crypto.createHash = originalCreateHash;
  }

  assert.equal(firstEvidence.status, 'pass');
  assert.equal(distinctEvidence.status, 'mismatch');
  assert.notEqual(firstEvidence.request_commitment, '0'.repeat(64));
  assert.notEqual(firstEvidence.intent_commitment, '0'.repeat(64));
  assert.notEqual(firstEvidence.simulation_commitment, '0'.repeat(64));
  assert.notEqual(distinctEvidence.request_commitment, firstEvidence.request_commitment);
});
