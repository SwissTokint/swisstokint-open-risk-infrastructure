import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WalletGuardSimulationError,
  createWalletGuardReferenceSimulationHarness,
} from '../../applications/blockchain-digital-assets/wallet-guard/simulation.mjs';
import {
  normalizeWalletGuardIntent,
} from '../../applications/blockchain-digital-assets/wallet-guard/intent.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const RECIPIENT = `0x${'2'.repeat(40)}`;
const ORIGIN = 'https://simulation.wallet-guard.local';
const CHAIN_ID = '0x1';
const STATE = 'a'.repeat(64);
const EFFECT = 'b'.repeat(64);

function request() {
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

function intent(rawRequest = request()) {
  return normalizeWalletGuardIntent({
    requestId: 'wg-simulation-hardening-0001',
    trustedOrigin: ORIGIN,
    trustedChainId: CHAIN_ID,
    trustedAccount: ACCOUNT,
    request: rawRequest,
  });
}

function callbackResult(input, overrides = {}) {
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
    ...overrides,
  };
}

function harness(simulateRequest = async (input) => callbackResult(input)) {
  return createWalletGuardReferenceSimulationHarness({ simulateRequest });
}

function expectCode(error, code) {
  assert.ok(error instanceof WalletGuardSimulationError);
  assert.equal(error.code, code);
  return true;
}

test('live/revoked Proxy run and bootstrap wrappers fail before reflective traps execute', async () => {
  let traps = 0;
  const liveBootstrap = new Proxy(
    { simulateRequest: async () => null },
    {
      get() { traps += 1; return undefined; },
      ownKeys() { traps += 1; return []; },
    },
  );
  assert.throws(
    () => createWalletGuardReferenceSimulationHarness(liveBootstrap),
    (error) => expectCode(error, 'POMRX_WG_SIM_E_INVALID'),
  );

  const revokedBootstrap = Proxy.revocable({ simulateRequest: async () => null }, {});
  revokedBootstrap.revoke();
  assert.throws(
    () => createWalletGuardReferenceSimulationHarness(revokedBootstrap.proxy),
    (error) => expectCode(error, 'POMRX_WG_SIM_E_INVALID'),
  );

  const runtime = harness();
  const rawRequest = request();
  const normalizedIntent = intent(rawRequest);
  const liveRun = new Proxy(
    { intent: normalizedIntent, request: rawRequest },
    {
      get() { traps += 1; return undefined; },
      ownKeys() { traps += 1; return []; },
    },
  );
  await assert.rejects(
    runtime.simulate(liveRun),
    (error) => expectCode(error, 'POMRX_WG_SIM_E_REQUEST_INVALID'),
  );

  const revokedRun = Proxy.revocable({ intent: normalizedIntent, request: rawRequest }, {});
  revokedRun.revoke();
  await assert.rejects(
    runtime.simulate(revokedRun.proxy),
    (error) => expectCode(error, 'POMRX_WG_SIM_E_REQUEST_INVALID'),
  );
  assert.equal(traps, 0);
});

test('run/bootstrap accessors, hidden fields, symbols and custom prototypes fail closed', async () => {
  let getterCalls = 0;
  const bootstrap = {};
  Object.defineProperty(bootstrap, 'simulateRequest', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return async () => null;
    },
  });
  assert.throws(
    () => createWalletGuardReferenceSimulationHarness(bootstrap),
    (error) => expectCode(error, 'POMRX_WG_SIM_E_INVALID'),
  );

  const runtime = harness();
  const rawRequest = request();
  const normalizedIntent = intent(rawRequest);
  const run = { request: rawRequest };
  Object.defineProperty(run, 'intent', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return normalizedIntent;
    },
  });
  await assert.rejects(
    runtime.simulate(run),
    (error) => expectCode(error, 'POMRX_WG_SIM_E_REQUEST_INVALID'),
  );
  assert.equal(getterCalls, 0);

  for (const mutation of [
    (value) => Object.defineProperty(value, 'hidden', { value: true, enumerable: false }),
    (value) => { value[Symbol('extra')] = true; },
    (value) => Object.setPrototypeOf(value, { inherited: true }),
  ]) {
    const hostile = { intent: normalizedIntent, request: rawRequest };
    mutation(hostile);
    await assert.rejects(
      runtime.simulate(hostile),
      (error) => expectCode(error, 'POMRX_WG_SIM_E_REQUEST_INVALID'),
    );
  }
});

test('hostile nested request accessors and Proxies are rejected before simulator invocation', async () => {
  let calls = 0;
  let getterCalls = 0;
  const runtime = harness(async (input) => {
    calls += 1;
    return callbackResult(input);
  });
  const safe = request();
  const normalizedIntent = intent(safe);

  const accessorRequest = request();
  Object.defineProperty(accessorRequest.params[0], 'value', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return '0x1';
    },
  });
  await assert.rejects(
    runtime.simulate({ intent: normalizedIntent, request: accessorRequest }),
    (error) => expectCode(error, 'POMRX_WG_SIM_E_REQUEST_INVALID'),
  );
  assert.equal(getterCalls, 0);

  const proxyRequest = request();
  proxyRequest.params[0] = new Proxy(proxyRequest.params[0], {
    ownKeys() { getterCalls += 1; return []; },
  });
  await assert.rejects(
    runtime.simulate({ intent: normalizedIntent, request: proxyRequest }),
    (error) => expectCode(error, 'POMRX_WG_SIM_E_REQUEST_INVALID'),
  );
  assert.equal(getterCalls, 0);
  assert.equal(calls, 0);
});

test('malformed/accessor/Proxy simulator output becomes mismatch without executing traps/getters', async () => {
  const rawRequest = request();
  const normalizedIntent = intent(rawRequest);
  let hostileCalls = 0;

  const accessorRuntime = harness(async (input) => {
    const result = callbackResult(input);
    Object.defineProperty(result, 'status', {
      enumerable: true,
      get() {
        hostileCalls += 1;
        throw new Error('must not execute');
      },
    });
    return result;
  });
  const accessorEvidence = await accessorRuntime.simulate({
    intent: normalizedIntent,
    request: rawRequest,
  });
  assert.equal(accessorEvidence.status, 'mismatch');

  const proxyRuntime = harness(async (input) => new Proxy(callbackResult(input), {
    ownKeys() { hostileCalls += 1; return []; },
    get() { hostileCalls += 1; return undefined; },
  }));
  const proxyEvidence = await proxyRuntime.simulate({
    intent: normalizedIntent,
    request: rawRequest,
  });
  assert.equal(proxyEvidence.status, 'mismatch');

  const extraRuntime = harness(async (input) => ({
    ...callbackResult(input),
    surprise: true,
  }));
  const extraEvidence = await extraRuntime.simulate({
    intent: normalizedIntent,
    request: rawRequest,
  });
  assert.equal(extraEvidence.status, 'mismatch');
  assert.equal(hostileCalls, 0);
});

test('non-local forged evidence is rejected before forged accessors are read', () => {
  const runtime = harness();
  const normalizedIntent = intent();
  let getterCalls = 0;
  const forged = {};
  Object.defineProperty(forged, 'status', {
    enumerable: true,
    get() {
      getterCalls += 1;
      throw new Error('must not execute');
    },
  });

  assert.throws(
    () => runtime.toPolicySimulation(normalizedIntent, forged),
    (error) => expectCode(error, 'POMRX_WG_SIM_E_INVALID'),
  );
  assert.equal(getterCalls, 0);
});

test('inherited descriptor get/set poisoning cannot rewrite run values or callback data', async () => {
  const originalGet = Object.getOwnPropertyDescriptor(Object.prototype, 'get');
  const originalSet = Object.getOwnPropertyDescriptor(Object.prototype, 'set');
  let hostileReads = 0;

  Object.defineProperty(Object.prototype, 'get', {
    configurable: true,
    get() {
      hostileReads += 1;
      return () => 'poison';
    },
  });
  Object.defineProperty(Object.prototype, 'set', {
    configurable: true,
    get() {
      hostileReads += 1;
      return () => {};
    },
  });

  try {
    const rawRequest = request();
    const normalizedIntent = intent(rawRequest);
    const runtime = harness();
    const evidence = await runtime.simulate({
      intent: normalizedIntent,
      request: rawRequest,
    });
    assert.equal(evidence.status, 'pass');
    assert.equal(evidence.state_commitment, STATE);
    assert.equal(evidence.effect_commitment, EFFECT);
    assert.equal(hostileReads, 0);
  } finally {
    if (originalGet) Object.defineProperty(Object.prototype, 'get', originalGet);
    else delete Object.prototype.get;
    if (originalSet) Object.defineProperty(Object.prototype, 'set', originalSet);
    else delete Object.prototype.set;
  }
});

test('foreign intrinsic failure during request canonicalization preserves exact provenance', async () => {
  const rawRequest = request();
  const normalizedIntent = intent(rawRequest);
  const runtime = harness();
  const originalNormalize = String.prototype.normalize;
  const sentinel = new TypeError('foreign request canonicalizer failure');

  String.prototype.normalize = function normalize(form) {
    if (String(this) === 'method' && form === 'NFKC') throw sentinel;
    return originalNormalize.call(this, form);
  };
  try {
    await assert.rejects(
      runtime.simulate({ intent: normalizedIntent, request: rawRequest }),
      (error) => error === sentinel,
    );
  } finally {
    String.prototype.normalize = originalNormalize;
  }
});

test('foreign intrinsic failure after valid callback capture is not downgraded to mismatch', async () => {
  const rawRequest = request();
  const normalizedIntent = intent(rawRequest);
  const originalNormalize = String.prototype.normalize;
  const sentinel = new TypeError('foreign evidence canonicalizer failure');
  const runtime = harness(async (input) => callbackResult(input));

  String.prototype.normalize = function normalize(form) {
    if (String(this) === 'schema_version' && form === 'NFKC') throw sentinel;
    return originalNormalize.call(this, form);
  };
  try {
    await assert.rejects(
      runtime.simulate({ intent: normalizedIntent, request: rawRequest }),
      (error) => error === sentinel,
    );
  } finally {
    String.prototype.normalize = originalNormalize;
  }
});
