import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canonicalizePayload,
} from '../../sdk/typescript/swisstokint-proof.mjs';
import {
  WalletGuardDecoderError,
} from '../../applications/blockchain-digital-assets/wallet-guard/evm-decoders.mjs';
import {
  normalizeWalletGuardIntent,
} from '../../applications/blockchain-digital-assets/wallet-guard/intent.mjs';
import {
  createWalletGuardReferenceSimulationHarness,
} from '../../applications/blockchain-digital-assets/wallet-guard/simulation.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const ORIGIN = 'https://simulation-review.wallet-guard.local';
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

function simpleTypedData(value = 'ok') {
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

function typedDataJsonWithLiteralCodeUnit(codeUnit) {
  const marker = '__CODE_UNIT__';
  const serialized = JSON.stringify(simpleTypedData(marker));
  return serialized.replace(marker, String.fromCharCode(codeUnit));
}

test('later Object.freeze replacement cannot make minted local evidence mutable', async () => {
  const request = {
    method: 'eth_signTypedData_v4',
    params: [ACCOUNT, simpleTypedData()],
  };
  const intent = normalize(request, 'wg-simulation-review-freeze-0001');
  const runtime = createWalletGuardReferenceSimulationHarness({
    simulateRequest: async (input) => unavailableResult(input),
  });
  const originalFreeze = Object.freeze;

  Object.freeze = (value) => value;
  let evidence;
  try {
    evidence = await runtime.simulate({ intent, request });
  } finally {
    Object.freeze = originalFreeze;
  }

  assert.equal(Object.isFrozen(evidence), true);
  assert.equal(evidence.status, 'unavailable');
  assert.throws(() => {
    evidence.status = 'pass';
  }, TypeError);
  assert.deepEqual(runtime.toPolicySimulation(intent, evidence), { status: 'unavailable' });
});

test('exact JSON-string commitment distinguishes UTF-8-colliding lone UTF-16 surrogates', async () => {
  const firstJson = typedDataJsonWithLiteralCodeUnit(0xd800);
  const secondJson = typedDataJsonWithLiteralCodeUnit(0xd801);

  assert.notEqual(firstJson, secondJson);
  assert.deepEqual(Buffer.from(firstJson, 'utf8'), Buffer.from(secondJson, 'utf8'));

  const commitments = [];
  const runtime = createWalletGuardReferenceSimulationHarness({
    simulateRequest: async (input) => {
      commitments.push(input.request_commitment);
      return unavailableResult(input);
    },
  });

  for (const [index, rawJson] of [firstJson, secondJson].entries()) {
    const request = {
      method: 'eth_signTypedData_v4',
      params: [ACCOUNT, rawJson],
    };
    const intent = normalize(request, `wg-simulation-review-utf16-000${index + 1}`);
    const evidence = await runtime.simulate({ intent, request });
    assert.equal(evidence.status, 'unavailable');
  }

  assert.equal(commitments.length, 2);
  assert.match(commitments[0], /^[a-f0-9]{64}$/u);
  assert.match(commitments[1], /^[a-f0-9]{64}$/u);
  assert.notEqual(commitments[0], commitments[1]);
});

test('object-form typed data near the Core byte limit commits without wrapper headroom failure', async () => {
  const fieldLength = 1_981;
  const fields = Array.from({ length: 8 }, (_, index) => ({
    name: `part${index}`,
    type: 'string',
  }));
  const message = Object.fromEntries(fields.map((field, index) => [
    field.name,
    String.fromCharCode(97 + index).repeat(fieldLength),
  ]));
  const typedData = {
    types: {
      EIP712Domain: [],
      CustomMessage: fields,
    },
    primaryType: 'CustomMessage',
    domain: {},
    message,
  };
  const request = {
    method: 'eth_signTypedData_v4',
    params: [ACCOUNT, typedData],
  };

  const typedDataCanonical = canonicalizePayload(typedData);
  assert.ok(Buffer.byteLength(typedDataCanonical, 'utf8') <= 16 * 1024);
  assert.throws(
    () => canonicalizePayload(request),
    (error) => error?.code === 'PROOF_E_PAYLOAD_CANONICAL_BYTES',
  );

  const intent = normalize(request, 'wg-simulation-review-headroom-0001');
  let callbackCalls = 0;
  const runtime = createWalletGuardReferenceSimulationHarness({
    simulateRequest: async (input) => {
      callbackCalls += 1;
      assert.equal(input.request.params[1].message.part0.length, fieldLength);
      assert.match(input.request_commitment, /^[a-f0-9]{64}$/u);
      return unavailableResult(input);
    },
  });

  const evidence = await runtime.simulate({ intent, request });
  assert.equal(callbackCalls, 1);
  assert.equal(evidence.status, 'unavailable');
});

test('foreign same-class decoder failure during replay preserves exact provenance', async () => {
  const request = {
    method: 'eth_signTypedData_v4',
    params: [ACCOUNT, simpleTypedData('decoder-provenance')],
  };
  const intent = normalize(request, 'wg-simulation-review-decoder-0001');
  const runtime = createWalletGuardReferenceSimulationHarness({
    simulateRequest: async () => {
      throw new Error('simulator callback must not be reached');
    },
  });
  const originalKeys = Object.keys;
  const foreign = new WalletGuardDecoderError(
    'POMRX_WG_E_TYPED_DATA_INVALID',
    'foreign replay decoder failure',
  );

  Object.keys = function poisonedKeys(value) {
    if (value
        && typeof value === 'object'
        && Object.hasOwn(value, 'primaryType')
        && Object.hasOwn(value, 'message')) {
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
