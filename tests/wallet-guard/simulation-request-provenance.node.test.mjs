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

function unavailableResult(simulatorInput) {
  return {
    status: 'unavailable',
    request_id: simulatorInput.request_id,
    request_commitment: simulatorInput.request_commitment,
    intent_commitment: simulatorInput.intent_commitment,
    origin: simulatorInput.origin,
    chain_id: simulatorInput.chain_id,
    account: simulatorInput.account,
    state_commitment: null,
    effect_commitment: null,
  };
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

test('bounded JSON-string typed data above the shared string limit remains simulatable', async () => {
  const typedData = {
    types: {
      EIP712Domain: [],
      CustomMessage: [
        { name: 'partA', type: 'string' },
        { name: 'partB', type: 'string' },
      ],
    },
    primaryType: 'CustomMessage',
    domain: {},
    message: {
      partA: 'a'.repeat(1_800),
      partB: 'b'.repeat(1_800),
    },
  };
  const typedDataJson = JSON.stringify(typedData);
  assert.ok(typedDataJson.length > 2_048);
  assert.ok(typedDataJson.length < 16 * 1_024);

  const request = {
    method: 'eth_signTypedData_v4',
    params: [ACCOUNT, typedDataJson],
  };
  const intent = normalize(request, 'wg-simulation-request-provenance-0003');
  assert.equal(intent.request_class, 'unknown_typed_data');
  assert.equal(intent.simulation_required, true);

  let callbackCalls = 0;
  let firstCommitment;
  const runtime = createWalletGuardReferenceSimulationHarness({
    simulateRequest: async (simulatorInput) => {
      callbackCalls += 1;
      assert.equal(simulatorInput.request.params[1], typedDataJson);
      firstCommitment = simulatorInput.request_commitment;
      return unavailableResult(simulatorInput);
    },
  });

  const evidence = await runtime.simulate({ intent, request });
  assert.equal(callbackCalls, 1);
  assert.equal(evidence.status, 'unavailable');
  assert.match(evidence.request_commitment, /^[a-f0-9]{64}$/u);
  assert.equal(evidence.request_commitment, firstCommitment);
});

test('JSON-string typed-data request commitment binds exact captured text', async () => {
  const typedData = {
    types: {
      EIP712Domain: [],
      CustomMessage: [
        { name: 'partA', type: 'string' },
        { name: 'partB', type: 'string' },
      ],
    },
    primaryType: 'CustomMessage',
    domain: {},
    message: {
      partA: 'a'.repeat(1_200),
      partB: 'b'.repeat(1_200),
    },
  };
  const compactJson = JSON.stringify(typedData);
  const spacedJson = JSON.stringify(typedData, null, 1);
  assert.ok(compactJson.length > 2_048);
  assert.ok(spacedJson.length > 2_048);
  assert.ok(compactJson.length < 16 * 1_024);
  assert.ok(spacedJson.length < 16 * 1_024);
  assert.notEqual(compactJson, spacedJson);

  const commitments = [];
  async function simulateText(rawJson, requestId) {
    const request = {
      method: 'eth_signTypedData_v4',
      params: [ACCOUNT, rawJson],
    };
    const intent = normalize(request, requestId);
    const runtime = createWalletGuardReferenceSimulationHarness({
      simulateRequest: async (simulatorInput) => {
        assert.equal(simulatorInput.request.params[1], rawJson);
        commitments.push(simulatorInput.request_commitment);
        return unavailableResult(simulatorInput);
      },
    });
    return runtime.simulate({ intent, request });
  }

  await simulateText(compactJson, 'wg-simulation-request-provenance-0004');
  await simulateText(spacedJson, 'wg-simulation-request-provenance-0005');

  assert.equal(commitments.length, 2);
  assert.notEqual(commitments[0], commitments[1]);
});
