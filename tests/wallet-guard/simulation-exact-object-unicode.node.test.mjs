import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeWalletGuardIntent,
} from '../../applications/blockchain-digital-assets/wallet-guard/intent.mjs';
import {
  createWalletGuardReferenceSimulationHarness,
} from '../../applications/blockchain-digital-assets/wallet-guard/simulation.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const ORIGIN = 'https://simulation-unicode.wallet-guard.local';
const CHAIN_ID = '0x1';

function typedData(value, reverseInsertionOrder = false) {
  const message = reverseInsertionOrder
    ? { note: 'stable', value }
    : { value, note: 'stable' };
  const domain = reverseInsertionOrder
    ? { version: '1', name: 'Unicode Test' }
    : { name: 'Unicode Test', version: '1' };

  if (reverseInsertionOrder) {
    return {
      message,
      domain,
      primaryType: 'CustomMessage',
      types: {
        CustomMessage: [
          { type: 'string', name: 'value' },
          { type: 'string', name: 'note' },
        ],
        EIP712Domain: [
          { type: 'string', name: 'name' },
          { type: 'string', name: 'version' },
        ],
      },
    };
  }

  return {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
      ],
      CustomMessage: [
        { name: 'value', type: 'string' },
        { name: 'note', type: 'string' },
      ],
    },
    primaryType: 'CustomMessage',
    domain,
    message,
  };
}

function requestFor(data) {
  return {
    method: 'eth_signTypedData_v4',
    params: [ACCOUNT, data],
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

test('object typed-data request commitment preserves exact normalization-equivalent Unicode', async () => {
  const composedRequest = requestFor(typedData('\u00e9'));
  const decomposedRequest = requestFor(typedData('e\u0301'));
  const intent = normalize(composedRequest, 'wg-simulation-exact-object-unicode-0001');

  const commitments = [];
  const observedValues = [];
  let cachedResult = null;
  const runtime = createWalletGuardReferenceSimulationHarness({
    simulateRequest: async (input) => {
      commitments.push(input.request_commitment);
      observedValues.push(input.request.params[1].message.value);
      if (cachedResult === null) {
        cachedResult = unavailableResult(input);
        return cachedResult;
      }
      // Deliberately replay the first request's cached identity. The second
      // normalization-equivalent request must have a distinct exact request
      // commitment, turning this stale callback result into local mismatch.
      return cachedResult;
    },
  });

  const first = await runtime.simulate({ intent, request: composedRequest });
  const second = await runtime.simulate({ intent, request: decomposedRequest });

  assert.equal(first.status, 'unavailable');
  assert.equal(second.status, 'mismatch');
  assert.deepEqual(observedValues, ['\u00e9', 'e\u0301']);
  assert.equal(commitments.length, 2);
  assert.notEqual(commitments[0], commitments[1]);
});

test('object typed-data request commitment ignores property insertion order only', async () => {
  const firstRequest = requestFor(typedData('same'));
  const reorderedRequest = requestFor(typedData('same', true));
  const intent = normalize(firstRequest, 'wg-simulation-exact-object-unicode-0002');

  const commitments = [];
  const runtime = createWalletGuardReferenceSimulationHarness({
    simulateRequest: async (input) => {
      commitments.push(input.request_commitment);
      return unavailableResult(input);
    },
  });

  const first = await runtime.simulate({ intent, request: firstRequest });
  const second = await runtime.simulate({ intent, request: reorderedRequest });

  assert.equal(first.status, 'unavailable');
  assert.equal(second.status, 'unavailable');
  assert.equal(commitments.length, 2);
  assert.equal(commitments[0], commitments[1]);
});

test('later Object.is replacement cannot collapse 0 and negative-zero request commitments', async () => {
  const zeroRequest = requestFor(typedData(0));
  const negativeZeroRequest = requestFor(typedData(-0));
  const intent = normalize(zeroRequest, 'wg-simulation-exact-object-unicode-0003');
  const commitments = [];
  const runtime = createWalletGuardReferenceSimulationHarness({
    simulateRequest: async (input) => {
      commitments.push(input.request_commitment);
      return unavailableResult(input);
    },
  });

  const originalObjectIs = Object.is;
  let first;
  let second;
  Object.is = () => false;
  try {
    first = await runtime.simulate({ intent, request: zeroRequest });
    second = await runtime.simulate({ intent, request: negativeZeroRequest });
  } finally {
    Object.is = originalObjectIs;
  }

  assert.equal(first.status, 'unavailable');
  assert.equal(second.status, 'unavailable');
  assert.equal(commitments.length, 2);
  assert.notEqual(commitments[0], commitments[1]);
});

test('later Object.getOwnPropertyNames replacement cannot collapse exact Unicode commitments', async () => {
  const composedRequest = requestFor(typedData('\u00e9'));
  const decomposedRequest = requestFor(typedData('e\u0301'));
  const intent = normalize(composedRequest, 'wg-simulation-exact-object-unicode-0004');
  const commitments = [];
  let cachedResult = null;
  const runtime = createWalletGuardReferenceSimulationHarness({
    simulateRequest: async (input) => {
      commitments.push(input.request_commitment);
      if (cachedResult === null) {
        cachedResult = unavailableResult(input);
        return cachedResult;
      }
      return cachedResult;
    },
  });

  const originalGetOwnPropertyNames = Object.getOwnPropertyNames;
  Object.getOwnPropertyNames = (value) => {
    const names = originalGetOwnPropertyNames(value);
    if (value
        && typeof value === 'object'
        && Object.isFrozen(value)
        && names.includes('types')
        && names.includes('primaryType')
        && names.includes('domain')
        && names.includes('message')) {
      return [];
    }
    return names;
  };

  let first;
  let second;
  try {
    first = await runtime.simulate({ intent, request: composedRequest });
    second = await runtime.simulate({ intent, request: decomposedRequest });
  } finally {
    Object.getOwnPropertyNames = originalGetOwnPropertyNames;
  }

  assert.equal(first.status, 'unavailable');
  assert.equal(second.status, 'mismatch');
  assert.equal(commitments.length, 2);
  assert.notEqual(commitments[0], commitments[1]);
});
