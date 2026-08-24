import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer, request as requestHttp } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

import {
  createWalletGuardControlledCallbackProviderTransport,
  createWalletGuardTrustedProviderGateway,
} from '../../applications/blockchain-digital-assets/wallet-guard/trusted-provider-transport.mjs';

const {
  captureWalletGuardPrototypeNodeChainView,
  createWalletGuardPrototypePublicLookup,
  createWalletGuardPrototypeServer,
  observeWalletGuardPrototypeTransaction,
} = await import(
  '../../applications/blockchain-digital-assets/wallet-guard/prototype/server.mjs'
);

const BROWSER_BRIDGE_SOURCE = await readFile(new URL(
  '../../applications/blockchain-digital-assets/wallet-guard/prototype/public/browser-bridge.js',
  import.meta.url,
), 'utf8');

const ANVIL_CHAIN_ID = '0x7a69';
const SEPOLIA_CHAIN_ID = '0xaa36a7';
const MAINNET_CHAIN_ID = '0x1';
const ACCOUNT = `0x${'1'.repeat(40)}`;
const OTHER_ACCOUNT = `0x${'2'.repeat(40)}`;
const TX_HASH = `0x${'a'.repeat(64)}`;
const BLOCK_HASH = `0x${'b'.repeat(64)}`;
const GENESIS_HASH = `0x${'d'.repeat(64)}`;
const LATEST_BLOCK_HASH = `0x${'e'.repeat(64)}`;
const LATEST_BLOCK_NUMBER = '0x5';
const SESSION_ID = 'c'.repeat(64);
const METAMASK_INFO = Object.freeze({
  uuid: '350670db-19fa-4704-a166-e52e178b59d2',
  name: 'MetaMask',
  rdns: 'io.metamask',
});

function response(status, value = null) {
  return Object.freeze({
    ok: status >= 200 && status < 300,
    status,
    headers: Object.freeze({
      get(name) {
        return name.toLowerCase() === 'content-type'
          ? 'application/json; charset=utf-8'
          : null;
      },
    }),
    async json() {
      return value;
    },
  });
}

function command() {
  return {
    schema_version: 'wallet_guard_bridge/0.1',
    session_id: SESSION_ID,
    sequence: 1,
    request_id: `wg-bridge-${SESSION_ID.slice(0, 16)}-00000001`,
    expected_chain_id: ANVIL_CHAIN_ID,
    expected_account: ACCOUNT,
    request: {
      method: 'eth_sendTransaction',
      params: [{ from: ACCOUNT, to: ACCOUNT, value: '0x0', data: '0x' }],
    },
  };
}

class FakeElement {
  constructor() {
    this.disabled = false;
    this.textContent = '';
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  async click() {
    const listeners = this.listeners.get('click') ?? [];
    await Promise.all(listeners.map((listener) => listener({ type: 'click' })));
  }
}

class DeterministicEip1193Provider {
  constructor({
    chainId = ANVIL_CHAIN_ID,
    account = ACCOUNT,
    rejectSend = false,
    switchMissingOnce = false,
    afterSend = null,
    postSendHangMethod = null,
  } = {}) {
    this.chainId = chainId;
    this.account = account;
    this.rejectSend = rejectSend;
    this.switchMissingOnce = switchMissingOnce;
    this.afterSend = afterSend;
    this.postSendHangMethod = postSendHangMethod;
    this.sendCompleted = false;
    this.switchCount = 0;
    this.calls = [];
    this.listeners = new Map();
    this.latestBlockNumber = LATEST_BLOCK_NUMBER;
    this.latestBlockHash = LATEST_BLOCK_HASH;
    this.trace = null;
  }

  on(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  async emit(type, value) {
    const listeners = this.listeners.get(type) ?? [];
    await Promise.all(listeners.map((listener) => listener(value)));
  }

  async request(input) {
    this.calls.push(JSON.parse(JSON.stringify(input)));
    this.trace?.push(`provider:${input.method}`);
    if (this.sendCompleted && input.method === this.postSendHangMethod) {
      return new Promise(() => {});
    }
    switch (input.method) {
      case 'eth_chainId':
        return this.chainId;
      case 'eth_requestAccounts':
      case 'eth_accounts':
        return [this.account];
      case 'eth_blockNumber':
        return this.latestBlockNumber;
      case 'eth_getBlockByNumber':
        if (input.params[0] === '0x0') return { number: '0x0', hash: GENESIS_HASH };
        if (input.params[0] === this.latestBlockNumber) {
          return { number: this.latestBlockNumber, hash: this.latestBlockHash };
        }
        throw new Error(`unexpected block number ${input.params[0]}`);
      case 'wallet_switchEthereumChain':
        this.switchCount += 1;
        if (this.switchMissingOnce && this.switchCount === 1) {
          const error = new Error('unknown chain');
          error.code = 4902;
          throw error;
        }
        this.chainId = input.params[0].chainId;
        return null;
      case 'wallet_addEthereumChain':
        // EIP-3085 does not require the wallet to select the newly added chain.
        return null;
      case 'eth_sendTransaction': {
        if (this.rejectSend) {
          const error = new Error('user rejected');
          error.code = 4001;
          throw error;
        }
        if (this.afterSend !== null) await this.afterSend(this);
        this.sendCompleted = true;
        return TX_HASH;
      }
      default:
        throw new Error(`unexpected EIP-1193 method ${input.method}`);
    }
  }
}

class FakeWindow {
  constructor(providerAnnouncements, { secureContext = true, storageLength = 0 } = {}) {
    this.providerAnnouncements = providerAnnouncements;
    this.listeners = new Map();
    this.isSecureContext = secureContext;
    this.opener = null;
    this.location = Object.freeze({
      protocol: 'http:',
      hostname: '127.0.0.1',
      origin: 'http://127.0.0.1:8787',
    });
    this.caches = Object.freeze({ async keys() { return []; } });
    this.localStorage = Object.freeze({ length: storageLength });
    this.sessionStorage = Object.freeze({ length: 0 });
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    this.listeners.set(type, listeners.filter((candidate) => candidate !== listener));
  }

  dispatchEvent(event) {
    const listeners = this.listeners.get(event.type) ?? [];
    for (const listener of listeners) listener(event);
    if (event.type === 'eip6963:requestProvider') {
      for (const detail of this.providerAnnouncements) {
        this.dispatchEvent({ type: 'eip6963:announceProvider', detail });
      }
    }
    return true;
  }
}

function browserHarness({
  provider,
  nextResponses,
  configResponse = null,
  connectionCheckpoint = null,
  commandCheckpoint = null,
  announcements = null,
  boundary = {},
  viewResponse = null,
  armResponse = null,
  dispatchedResponse = null,
  resultResponse = null,
} = {}) {
  const elements = new Map([
    ['#connect', new FakeElement()],
    ['#deny', new FakeElement()],
    ['#allow', new FakeElement()],
    ['#wallet-status', new FakeElement()],
    ['#result', new FakeElement()],
  ]);
  elements.get('#deny').disabled = true;
  elements.get('#allow').disabled = true;

  const fetchCalls = [];
  const trace = [];
  provider.trace = trace;
  const queue = [...nextResponses];
  const fetch = async (path, options = {}) => {
    const body = options.body === undefined ? null : JSON.parse(options.body);
    fetchCalls.push({ path, options, body });
    trace.push(`fetch:${path}`);
    if (path === '/api/config') {
      return response(200, configResponse ?? {
        chain_id: ANVIL_CHAIN_ID,
        rpc_url: 'http://127.0.0.1:8545/',
        host_origin: 'http://127.0.0.1:8787',
      });
    }
    if (path === '/api/checkpoint' && connectionCheckpoint !== null) {
      return response(200, connectionCheckpoint);
    }
    if (path === '/bridge/checkpoint' && commandCheckpoint !== null) {
      return response(200, commandCheckpoint);
    }
    if (path === '/api/handshake') {
      return response(200, {
        connected: true,
        chain_id: body.chain_id,
        account: body.account,
        chain_view_bound: true,
      });
    }
    if (path === '/bridge/next') return queue.shift() ?? response(410, { error: 'SESSION_CLOSED' });
    if (path === '/bridge/view' && viewResponse !== null) return viewResponse;
    if (path === '/bridge/arm' && armResponse !== null) return armResponse;
    if (path === '/bridge/dispatched' && dispatchedResponse !== null) {
      return typeof dispatchedResponse === 'function'
        ? dispatchedResponse()
        : dispatchedResponse;
    }
    if (path === '/bridge/result' && resultResponse !== null) return resultResponse;
    if (path === '/bridge/result' || path === '/bridge/close' || path === '/bridge/view'
        || path === '/bridge/arm' || path === '/bridge/dispatched') {
      return response(204);
    }
    throw new Error(`unexpected browser fetch ${path}`);
  };

  const fastSetTimeout = (listener, delay) => setTimeout(listener, Math.min(delay, 2));
  const providerAnnouncements = announcements ?? [{ info: METAMASK_INFO, provider }];
  const window = new FakeWindow(providerAnnouncements, boundary);
  const navigator = Object.freeze({
    serviceWorker: Object.freeze({
      controller: boundary.serviceWorkerController ? {} : null,
      async getRegistrations() { return boundary.serviceWorkerRegistration ? [{}] : []; },
    }),
  });
  class FakeEvent {
    constructor(type) {
      this.type = type;
    }
  }
  runInNewContext(BROWSER_BRIDGE_SOURCE, {
    document: {
      querySelector(selector) {
        const element = elements.get(selector);
        if (element === undefined) throw new Error(`unexpected selector ${selector}`);
        return element;
      },
    },
    fetch,
    setTimeout: fastSetTimeout,
    clearTimeout,
    Event: FakeEvent,
    navigator,
    URL,
    window,
  }, { filename: 'browser-bridge.js' });

  return Object.freeze({ elements, fetchCalls, provider, trace });
}

async function waitFor(predicate, label) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  assert.fail(`timed out waiting for ${label}`);
}

test('browser bridge forwards one bound command through a deterministic EIP-1193 provider', async () => {
  const harness = browserHarness({
    provider: new DeterministicEip1193Provider(),
    nextResponses: [response(200, command()), response(410, { error: 'SESSION_CLOSED' })],
  });

  await harness.elements.get('#connect').click();
  await waitFor(
    () => harness.fetchCalls.some(({ path }) => path === '/bridge/result'),
    'browser result delivery',
  );
  const delivery = harness.fetchCalls.find(({ path }) => path === '/bridge/result').body;
  assert.deepEqual(JSON.parse(JSON.stringify(delivery)), {
    schema_version: 'wallet_guard_bridge/0.1',
    session_id: SESSION_ID,
    sequence: 1,
    request_id: `wg-bridge-${SESSION_ID.slice(0, 16)}-00000001`,
    observed_chain_id: ANVIL_CHAIN_ID,
    observed_account: ACCOUNT,
    outcome: 'result',
    result: TX_HASH,
    error: null,
  });
  assert.deepEqual(
    harness.provider.calls.filter(({ method }) => method === 'eth_sendTransaction'),
    [command().request],
  );
  const viewCall = harness.fetchCalls.find(({ path }) => path === '/bridge/view');
  assert.deepEqual(JSON.parse(JSON.stringify(viewCall.body)), {
    schema_version: 'wallet_guard_bridge/0.1',
    session_id: SESSION_ID,
    sequence: 1,
    request_id: `wg-bridge-${SESSION_ID.slice(0, 16)}-00000001`,
    chain_id: ANVIL_CHAIN_ID,
    account: ACCOUNT,
    genesis_hash: GENESIS_HASH,
    latest_block_number: LATEST_BLOCK_NUMBER,
    latest_block_hash: LATEST_BLOCK_HASH,
  });
  assert.ok(
    harness.fetchCalls.indexOf(viewCall)
      < harness.fetchCalls.findIndex(({ path }) => path === '/bridge/result'),
  );
  const armIndex = harness.trace.indexOf('fetch:/bridge/arm');
  const sendIndex = harness.trace.indexOf('provider:eth_sendTransaction');
  const dispatchedIndex = harness.trace.indexOf('fetch:/bridge/dispatched');
  const resultIndex = harness.trace.indexOf('fetch:/bridge/result');
  assert.ok(armIndex >= 0 && armIndex < sendIndex);
  assert.ok(sendIndex < dispatchedIndex);
  assert.ok(dispatchedIndex < resultIndex);
  await waitFor(
    () => harness.fetchCalls.filter(({ path }) => path === '/bridge/next').length === 2,
    'bridge loop shutdown',
  );
});

test('browser bridge maps MetaMask rejection to the bounded USER_REJECTED outcome', async () => {
  const harness = browserHarness({
    provider: new DeterministicEip1193Provider({ rejectSend: true }),
    nextResponses: [response(200, command())],
  });

  await harness.elements.get('#connect').click();
  await waitFor(
    () => harness.fetchCalls.some(({ path }) => path === '/bridge/result'),
    'rejection delivery',
  );
  const delivery = harness.fetchCalls.find(({ path }) => path === '/bridge/result').body;
  assert.equal(delivery.outcome, 'error');
  assert.equal(delivery.result, null);
  assert.deepEqual(JSON.parse(JSON.stringify(delivery.error)), { code: 'USER_REJECTED' });
});

test('an expired arm after a stalled final resample performs zero sensitive sends', async () => {
  let releaseArm;
  const stalledArm = new Promise((resolve) => {
    releaseArm = resolve;
  });
  const provider = new DeterministicEip1193Provider();
  const harness = browserHarness({
    provider,
    nextResponses: [response(200, command())],
    armResponse: stalledArm,
  });

  await harness.elements.get('#connect').click();
  await waitFor(
    () => harness.fetchCalls.some(({ path }) => path === '/bridge/arm'),
    'stalled arm request',
  );
  assert.equal(provider.calls.some(({ method }) => method === 'eth_sendTransaction'), false);

  releaseArm(response(409, { error: 'pending command expired' }));
  await waitFor(
    () => /Armement expiré avant envoi/u.test(harness.elements.get('#result').textContent),
    'expired arm rejection',
  );
  assert.equal(provider.calls.some(({ method }) => method === 'eth_sendTransaction'), false);
  assert.equal(harness.fetchCalls.some(({ path }) => path === '/bridge/dispatched'), false);
  assert.equal(harness.fetchCalls.some(({ path }) => path === '/bridge/result'), false);
});

test('browser context events close the loopback bridge without another provider request', async () => {
  const provider = new DeterministicEip1193Provider();
  const harness = browserHarness({ provider, nextResponses: [response(204)] });
  await harness.elements.get('#connect').click();
  await provider.emit('accountsChanged', [OTHER_ACCOUNT]);
  await waitFor(
    () => harness.fetchCalls.some(({ path }) => path === '/bridge/close'),
    'context-change closure',
  );
  const close = harness.fetchCalls.find(({ path }) => path === '/bridge/close');
  assert.deepEqual(JSON.parse(JSON.stringify(close.body)), { code: 'CONTEXT_CHANGED' });
  assert.match(harness.elements.get('#wallet-status').textContent, /Session fermée/u);
  assert.equal(provider.calls.some(({ method }) => method === 'eth_sendTransaction'), false);
});

test('wallet events while /bridge/view is pending cannot race into a sensitive request', async (t) => {
  for (const [eventName, eventValue] of [
    ['accountsChanged', [OTHER_ACCOUNT]],
    ['chainChanged', MAINNET_CHAIN_ID],
    ['disconnect', { code: 4900 }],
  ]) {
    await t.test(eventName, async () => {
      let releaseView;
      const pendingView = new Promise((resolve) => {
        releaseView = resolve;
      });
      const provider = new DeterministicEip1193Provider();
      const harness = browserHarness({
        provider,
        nextResponses: [response(200, command())],
        viewResponse: pendingView,
      });
      await harness.elements.get('#connect').click();
      await waitFor(
        () => harness.fetchCalls.some(({ path }) => path === '/bridge/view'),
        'pending view binding',
      );

      await provider.emit(eventName, eventValue);
      releaseView(response(204));
      await waitFor(
        () => harness.fetchCalls.some(({ path }) => path === '/bridge/close'),
        'context-change close while binding',
      );
      await new Promise((resolve) => setTimeout(resolve, 10));

      assert.equal(
        provider.calls.some(({ method }) => method === 'eth_sendTransaction'),
        false,
      );
      assert.equal(
        harness.fetchCalls.some(({ path }) => path === '/bridge/result'),
        false,
      );
    });
  }
});

test('browser explicitly switches after wallet_addEthereumChain before handshake', async () => {
  const provider = new DeterministicEip1193Provider({
    chainId: MAINNET_CHAIN_ID,
    switchMissingOnce: true,
  });
  const harness = browserHarness({ provider, nextResponses: [response(410)] });
  await harness.elements.get('#connect').click();
  assert.deepEqual(
    provider.calls
      .filter(({ method }) => method === 'wallet_switchEthereumChain'
        || method === 'wallet_addEthereumChain')
      .map(({ method }) => method),
    ['wallet_switchEthereumChain', 'wallet_addEthereumChain', 'wallet_switchEthereumChain'],
  );
  assert.equal(
    harness.fetchCalls.some(({ path }) => path === '/api/handshake'),
    true,
  );
});

test('Sepolia is switch-only and never injects an RPC URL into MetaMask', async () => {
  const provider = new DeterministicEip1193Provider({
    chainId: MAINNET_CHAIN_ID,
    switchMissingOnce: true,
  });
  const harness = browserHarness({
    provider,
    nextResponses: [],
    configResponse: {
      chain_id: SEPOLIA_CHAIN_ID,
      chain_name: 'Sepolia POM-RX burner',
      host_origin: 'http://127.0.0.1:8787',
      native_currency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
      network: 'sepolia',
      required_confirmations: 2,
    },
  });
  await harness.elements.get('#connect').click();
  assert.deepEqual(
    provider.calls
      .filter(({ method }) => method.startsWith('wallet_'))
      .map(({ method }) => method),
    ['wallet_switchEthereumChain'],
  );
  assert.equal(provider.calls.some(({ method }) => method === 'wallet_addEthereumChain'), false);
  assert.match(harness.elements.get('#wallet-status').textContent, /manuellement/u);
  assert.equal(harness.fetchCalls.some(({ path }) => path === '/api/handshake'), false);
});

test('Sepolia handshake reads the exact safe checkpoint selected by Node', async () => {
  const checkpoint = {
    chain_id: SEPOLIA_CHAIN_ID,
    genesis_hash: GENESIS_HASH,
    latest_block_number: LATEST_BLOCK_NUMBER,
    latest_block_hash: LATEST_BLOCK_HASH,
  };
  const harness = browserHarness({
    provider: new DeterministicEip1193Provider({ chainId: SEPOLIA_CHAIN_ID }),
    nextResponses: [response(410, { error: 'SESSION_CLOSED' })],
    configResponse: {
      chain_id: SEPOLIA_CHAIN_ID,
      chain_name: 'Sepolia POM-RX burner',
      host_origin: 'http://127.0.0.1:8787',
      native_currency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
      network: 'sepolia',
      required_confirmations: 2,
    },
    connectionCheckpoint: checkpoint,
  });
  await harness.elements.get('#connect').click();
  const handshake = harness.fetchCalls.find(({ path }) => path === '/api/handshake');
  assert.ok(handshake);
  assert.deepEqual(JSON.parse(JSON.stringify(handshake.body)), {
    chain_id: SEPOLIA_CHAIN_ID,
    account: ACCOUNT,
    genesis_hash: GENESIS_HASH,
    latest_block_number: LATEST_BLOCK_NUMBER,
    latest_block_hash: LATEST_BLOCK_HASH,
  });
  assert.equal(
    harness.provider.calls.some(({ method, params }) => method === 'eth_getBlockByNumber'
      && params[0] === LATEST_BLOCK_NUMBER),
    true,
  );
});

test('a transaction hash returned during a late context change remains observable', async () => {
  const provider = new DeterministicEip1193Provider({
    afterSend(instance) {
      instance.account = OTHER_ACCOUNT;
    },
  });
  const harness = browserHarness({
    provider,
    nextResponses: [response(200, command())],
  });
  await harness.elements.get('#connect').click();
  await waitFor(
    () => harness.fetchCalls.some(({ path }) => path === '/bridge/result'
      || path === '/bridge/late-result'),
    'late transaction outcome',
  );
  assert.equal(
    harness.fetchCalls.some(({ body }) => JSON.stringify(body).includes(TX_HASH)),
    true,
  );
});

test('a post-send wallet context stall cannot suppress the transaction hash', async (t) => {
  for (const method of ['eth_chainId', 'eth_accounts']) {
    await t.test(method, async () => {
      const provider = new DeterministicEip1193Provider({ postSendHangMethod: method });
      const harness = browserHarness({
        provider,
        nextResponses: [response(200, command())],
      });
      await harness.elements.get('#connect').click();
      await waitFor(
        () => harness.fetchCalls.some(({ path }) => path === '/bridge/result'),
        `hash delivery after stalled ${method}`,
      );
      const delivery = harness.fetchCalls.find(({ path }) => path === '/bridge/result').body;
      assert.equal(delivery.outcome, 'result');
      assert.equal(delivery.result, TX_HASH);
      assert.equal(delivery.observed_chain_id, 'unavailable');
      assert.equal(delivery.observed_account, 'unavailable');
      assert.equal(harness.fetchCalls.some(({ path }) => path === '/bridge/dispatched'), true);
      assert.equal(provider.calls.some(({ method: called }) => called === method), true);
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.equal(
        harness.fetchCalls.filter(({ path }) => path === '/bridge/next').length,
        1,
      );
    });
  }
});

test('a missing dispatch acknowledgement cannot strand a wallet hash', async (t) => {
  for (const [label, dispatchedResponse] of [
    ['pending', new Promise(() => {})],
    ['rejected', () => Promise.reject(new Error('dispatch acknowledgement unavailable'))],
  ]) {
    await t.test(label, async () => {
      const harness = browserHarness({
        provider: new DeterministicEip1193Provider(),
        nextResponses: [response(200, command())],
        dispatchedResponse,
      });
      await harness.elements.get('#connect').click();
      await waitFor(
        () => harness.fetchCalls.some(({ path }) => path === '/bridge/result'),
        `wallet hash after ${label} dispatch acknowledgement`,
      );
      const delivery = harness.fetchCalls.find(({ path }) => path === '/bridge/result').body;
      assert.equal(delivery.outcome, 'result');
      assert.equal(delivery.result, TX_HASH);
      assert.equal(
        harness.provider.calls.filter(({ method }) => method === 'eth_sendTransaction').length,
        1,
      );
    });
  }
});

test('a stalled result acknowledgement retains the hash for manual reconciliation', async () => {
  const harness = browserHarness({
    provider: new DeterministicEip1193Provider(),
    nextResponses: [response(200, command())],
    resultResponse: new Promise(() => {}),
  });
  await harness.elements.get('#connect').click();
  await waitFor(
    () => /Hash MetaMask à réconcilier manuellement/u.test(
      harness.elements.get('#result').textContent,
    ),
    'manual hash reconciliation notice',
  );
  assert.match(harness.elements.get('#result').textContent, new RegExp(TX_HASH, 'u'));
  assert.equal(
    harness.provider.calls.filter(({ method }) => method === 'eth_sendTransaction').length,
    1,
  );
});

test('browser rejects duplicated MetaMask EIP-6963 announcements', async () => {
  const provider = new DeterministicEip1193Provider();
  const duplicate = { info: METAMASK_INFO, provider };
  const harness = browserHarness({
    provider,
    nextResponses: [],
    announcements: [duplicate, duplicate],
  });
  await harness.elements.get('#connect').click();
  assert.match(harness.elements.get('#wallet-status').textContent, /dupliquée ou ambiguë/u);
  assert.equal(
    harness.fetchCalls.some(({ path }) => path === '/api/handshake'),
    false,
  );
});

test('browser rejects multiple distinct MetaMask EIP-6963 providers', async () => {
  const first = new DeterministicEip1193Provider();
  const second = new DeterministicEip1193Provider();
  const harness = browserHarness({
    provider: first,
    nextResponses: [],
    announcements: [
      { info: METAMASK_INFO, provider: first },
      {
        info: { ...METAMASK_INFO, uuid: 'fd6f17bb-b290-4d17-9231-020f5f6ebf7b' },
        provider: second,
      },
    ],
  });
  await harness.elements.get('#connect').click();
  assert.match(harness.elements.get('#wallet-status').textContent, /dupliquée ou ambiguë/u);
  assert.equal(first.calls.length, 0);
  assert.equal(second.calls.length, 0);
});

test('browser refuses insecure, service-worker, and dirty-storage boundaries before wallet access', async (t) => {
  for (const boundary of [
    { secureContext: false },
    { serviceWorkerController: true },
    { serviceWorkerRegistration: true },
    { storageLength: 1 },
  ]) {
    await t.test(JSON.stringify(boundary), async () => {
      const provider = new DeterministicEip1193Provider();
      const harness = browserHarness({ provider, nextResponses: [], boundary });
      await harness.elements.get('#connect').click();
      assert.equal(provider.calls.length, 0);
      assert.equal(
        harness.fetchCalls.some(({ path }) => path === '/api/handshake'),
        false,
      );
    });
  }
});

function http(origin, path, {
  method = 'GET',
  cookie = null,
  requestOrigin = null,
  body = null,
} = {}) {
  const url = new URL(path, origin);
  const headers = {};
  if (cookie !== null) headers.cookie = cookie;
  if (requestOrigin !== null) headers.origin = requestOrigin;
  headers['sec-fetch-site'] = 'same-origin';
  headers['sec-fetch-mode'] = 'cors';
  headers['sec-fetch-dest'] = 'empty';
  if (body !== null) {
    headers['content-type'] = 'application/json';
    headers['content-length'] = Buffer.byteLength(body);
  }
  return new Promise((resolve, reject) => {
    const request = requestHttp({
      hostname: url.hostname,
      port: Number(url.port),
      path: `${url.pathname}${url.search}`,
      method,
      headers,
    }, (serverResponse) => {
      const chunks = [];
      serverResponse.on('data', (chunk) => chunks.push(chunk));
      serverResponse.on('end', () => resolve({
        status: serverResponse.statusCode,
        headers: serverResponse.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    request.on('error', reject);
    if (body !== null) request.write(body);
    request.end();
  });
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server.address().port;
}

async function close(server) {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

async function fakeRpc(handler) {
  const calls = [];
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const request = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    calls.push(request);
    const result = await handler(request, calls);
    const payload = JSON.stringify({ jsonrpc: '2.0', id: request.id, result });
    res.writeHead(200, {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(payload),
    });
    res.end(payload);
  });
  const port = await listen(server);
  return Object.freeze({ server, calls, url: `http://127.0.0.1:${port}/` });
}

async function fakeRawRpc(handler) {
  const calls = [];
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const request = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    calls.push(request);
    const response = await handler(request, calls);
    const payload = response.body;
    res.writeHead(response.status ?? 200, {
      ...(response.contentType === null
        ? {}
        : { 'content-type': response.contentType ?? 'application/json' }),
      'content-length': Buffer.byteLength(payload),
    });
    res.end(payload);
  });
  const port = await listen(server);
  return Object.freeze({ server, calls, url: `http://127.0.0.1:${port}/` });
}

async function authenticateOnly(prototype) {
  const info = await prototype.listen();
  const launch = new URL(info.launch_url);
  const bootstrap = await http(info.origin, `${launch.pathname}${launch.search}`);
  assert.equal(bootstrap.status, 303);
  const cookie = bootstrap.headers['set-cookie'][0].split(';')[0];
  return { info, cookie };
}

async function authenticateAndHandshake(prototype, {
  chainId = ANVIL_CHAIN_ID,
  latestBlockNumber = LATEST_BLOCK_NUMBER,
  latestBlockHash = LATEST_BLOCK_HASH,
} = {}) {
  const { info, cookie } = await authenticateOnly(prototype);
  const handshake = await http(info.origin, '/api/handshake', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: JSON.stringify({
      chain_id: chainId,
      account: ACCOUNT,
      genesis_hash: GENESIS_HASH,
      latest_block_number: latestBlockNumber,
      latest_block_hash: latestBlockHash,
    }),
  });
  assert.equal(handshake.status, 200);
  return { info, cookie };
}

async function executeAllowedTransaction(prototype, fixture = {}) {
  const {
    chainId = ANVIL_CHAIN_ID,
    latestBlockNumber = LATEST_BLOCK_NUMBER,
    latestBlockHash = LATEST_BLOCK_HASH,
  } = fixture;
  const { info, cookie } = await authenticateAndHandshake(prototype, fixture);
  const allowedPromise = http(info.origin, '/api/allow', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: '{}',
  });
  let next;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    next = await http(info.origin, '/bridge/next', { cookie });
    if (next.status === 200) break;
    assert.equal(next.status, 204);
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  assert.equal(next.status, 200);
  const bridgeCommand = JSON.parse(next.body);
  const viewBound = await http(info.origin, '/bridge/view', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: JSON.stringify({
      schema_version: bridgeCommand.schema_version,
      session_id: bridgeCommand.session_id,
      sequence: bridgeCommand.sequence,
      request_id: bridgeCommand.request_id,
      chain_id: bridgeCommand.expected_chain_id,
      account: bridgeCommand.expected_account,
      genesis_hash: GENESIS_HASH,
      latest_block_number: latestBlockNumber,
      latest_block_hash: latestBlockHash,
    }),
  });
  assert.equal(viewBound.status, 204);
  const armed = await http(info.origin, '/bridge/arm', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: JSON.stringify({
      schema_version: bridgeCommand.schema_version,
      session_id: bridgeCommand.session_id,
      sequence: bridgeCommand.sequence,
      request_id: bridgeCommand.request_id,
      chain_id: bridgeCommand.expected_chain_id,
      account: bridgeCommand.expected_account,
      genesis_hash: GENESIS_HASH,
      latest_block_number: latestBlockNumber,
      latest_block_hash: latestBlockHash,
    }),
  });
  assert.equal(armed.status, 204);
  const dispatched = await http(info.origin, '/bridge/dispatched', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: JSON.stringify({
      schema_version: bridgeCommand.schema_version,
      session_id: bridgeCommand.session_id,
      sequence: bridgeCommand.sequence,
      request_id: bridgeCommand.request_id,
    }),
  });
  assert.equal(dispatched.status, 204);
  const delivered = await http(info.origin, '/bridge/result', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: JSON.stringify({
      schema_version: bridgeCommand.schema_version,
      session_id: bridgeCommand.session_id,
      sequence: bridgeCommand.sequence,
      request_id: bridgeCommand.request_id,
      observed_chain_id: chainId,
      observed_account: bridgeCommand.expected_account,
      outcome: 'result',
      result: TX_HASH,
      error: null,
    }),
  });
  assert.equal(delivered.status, 204);
  return { allowed: await allowedPromise, info, cookie };
}

function prototypeFor(rpcUrl, overrides = {}) {
  return createWalletGuardPrototypeServer({
    createControlledCallbackTransport: createWalletGuardControlledCallbackProviderTransport,
    createTrustedGateway: createWalletGuardTrustedProviderGateway,
    port: 0,
    rpcUrl,
    commandTimeoutMs: 5_000,
    ...overrides,
  });
}

function chainView() {
  return {
    chain_id: ANVIL_CHAIN_ID,
    genesis_hash: GENESIS_HASH,
    latest_block_number: LATEST_BLOCK_NUMBER,
    latest_block_hash: LATEST_BLOCK_HASH,
  };
}

function baseline() {
  return {
    chain_id: ANVIL_CHAIN_ID,
    block_number: LATEST_BLOCK_NUMBER,
    account_nonce: '0x0',
  };
}

function transaction(overrides = {}) {
  return {
    hash: TX_HASH,
    from: ACCOUNT,
    to: ACCOUNT,
    chainId: ANVIL_CHAIN_ID,
    value: '0x0',
    input: '0x',
    blockNumber: '0x6',
    blockHash: BLOCK_HASH,
    nonce: '0x0',
    ...overrides,
  };
}

function fixedChainRpc(method, params) {
  if (method === 'eth_chainId') return ANVIL_CHAIN_ID;
  if (method === 'eth_blockNumber') return LATEST_BLOCK_NUMBER;
  if (method === 'eth_getTransactionCount') return '0x0';
  if (method === 'eth_getBlockByNumber' && params[0] === '0x0') {
    return { number: '0x0', hash: GENESIS_HASH };
  }
  if (method === 'eth_getBlockByNumber'
      && (params[0] === LATEST_BLOCK_NUMBER || params[0] === 'latest')) {
    return { number: LATEST_BLOCK_NUMBER, hash: LATEST_BLOCK_HASH };
  }
  if (method === 'eth_getBlockByNumber' && params[0] === '0x6') {
    return { number: '0x6', hash: BLOCK_HASH };
  }
  return undefined;
}

function receipt(overrides = {}) {
  return {
    transactionHash: TX_HASH,
    blockHash: BLOCK_HASH,
    blockNumber: '0x6',
    status: '0x1',
    from: ACCOUNT,
    to: ACCOUNT,
    ...overrides,
  };
}

test('default RPC observer polls a real JSON-RPC endpoint and records the matching receipt', async (t) => {
  let receiptCalls = 0;
  const rpc = await fakeRpc(({ method, params }) => {
    const fixed = fixedChainRpc(method, params);
    if (fixed !== undefined) return fixed;
    if (method === 'eth_getTransactionReceipt') {
      receiptCalls += 1;
      return receiptCalls === 1 ? null : receipt();
    }
    if (method === 'eth_getTransactionByHash') return transaction();
    throw new Error(`unexpected RPC method ${method} ${JSON.stringify(params)}`);
  });
  t.after(() => close(rpc.server));
  const prototype = prototypeFor(rpc.url);
  t.after(() => prototype.close());

  const { allowed } = await executeAllowedTransaction(prototype);
  assert.equal(allowed.status, 200);
  const body = JSON.parse(allowed.body);
  assert.equal(body.observation.status, 'MATCH_REFERENCE');
  assert.equal(body.observation.transaction_hash, TX_HASH);
  assert.equal(body.observation.block_hash, BLOCK_HASH);
  assert.equal(body.observation.external_world_proved, false);
  assert.equal(rpc.calls.some(({ method }) => method === 'eth_getTransactionByHash'), true);
});

test('default RPC observer marks a receipt mismatch ambiguous and closes the session', async (t) => {
  const rpc = await fakeRpc(({ method, params }) => {
    const fixed = fixedChainRpc(method, params);
    if (fixed !== undefined) return fixed;
    if (method === 'eth_getTransactionReceipt') return receipt({ to: OTHER_ACCOUNT });
    if (method === 'eth_getTransactionByHash') return transaction();
    throw new Error(`unexpected RPC method ${method} ${JSON.stringify(params)}`);
  });
  t.after(() => close(rpc.server));
  const prototype = prototypeFor(rpc.url);
  t.after(() => prototype.close());

  const { allowed, info, cookie } = await executeAllowedTransaction(prototype);
  assert.equal(allowed.status, 202);
  assert.equal(JSON.parse(allowed.body).observation.status, 'AMBIGUOUS');
  const status = JSON.parse((await http(info.origin, '/api/status', { cookie })).body);
  assert.equal(status.closed, true);
});

test('default RPC observer fails ambiguous when its loopback endpoint is unavailable', async (t) => {
  const reservation = createServer();
  const unavailablePort = await listen(reservation);
  await close(reservation);
  const prototype = prototypeFor(`http://127.0.0.1:${unavailablePort}/`, {
    captureNodeChainView: async () => chainView(),
    captureObservationBaseline: async () => baseline(),
  });
  t.after(() => prototype.close());

  const { allowed, info, cookie } = await executeAllowedTransaction(prototype);
  assert.equal(allowed.status, 202);
  const body = JSON.parse(allowed.body);
  assert.equal(body.observation.status, 'AMBIGUOUS');
  assert.equal(body.observation.external_world_proved, false);
  const status = JSON.parse((await http(info.origin, '/api/status', { cookie })).body);
  assert.equal(status.closed, true);
});

test('default RPC observer rejects a semantically different transaction behind a valid receipt', async () => {
  const rpc = await fakeRpc(({ method, params }) => {
    const fixed = fixedChainRpc(method, params);
    if (fixed !== undefined) return fixed;
    if (method === 'eth_getTransactionByHash') {
      return transaction({ value: '0x1' });
    }
    if (method === 'eth_getTransactionReceipt') return receipt();
    throw new Error(`unexpected RPC method ${method} ${JSON.stringify(params)}`);
  });
  const prototype = prototypeFor(rpc.url);
  try {
    const { allowed, info, cookie } = await executeAllowedTransaction(prototype);
    assert.equal(allowed.status, 202);
    assert.equal(JSON.parse(allowed.body).observation.status, 'AMBIGUOUS');
    const status = JSON.parse((await http(info.origin, '/api/status', { cookie })).body);
    assert.equal(status.closed, true);
  } finally {
    await prototype.close();
    await close(rpc.server);
  }
});

test('Sepolia observer never emits MATCH while the safe head lags the receipt block', async () => {
  const sepoliaProfile = Object.freeze({
    network: 'sepolia',
    chainId: '0xaa36a7',
    chainName: 'Sepolia POM-RX burner',
    rpcTimeoutMs: 10,
    receiptPollMs: 1,
    receiptTimeoutMs: 5,
    requiredConfirmations: 2,
    observerEndpointSeparateConfigured: true,
  });
  const sepoliaReceipt = receipt();
  const rpcRequest = async (_url, _id, method, params) => {
    if (method === 'eth_chainId') return sepoliaProfile.chainId;
    if (method === 'eth_getTransactionReceipt') return sepoliaReceipt;
    if (method === 'eth_blockNumber') return '0x20';
    if (method === 'eth_getBlockByNumber' && params[0] === 'safe') {
      return { number: '0x5', hash: LATEST_BLOCK_HASH };
    }
    if (method === 'eth_getBlockByNumber' && params[0] === '0x6') {
      return { number: '0x6', hash: BLOCK_HASH };
    }
    if (method === 'eth_getTransactionByHash') {
      return transaction({ chainId: sepoliaProfile.chainId });
    }
    throw new Error(`unexpected Sepolia RPC method ${method}`);
  };

  await assert.rejects(
    observeWalletGuardPrototypeTransaction({
      rpcUrl: 'https://observer.example.test/',
      txHash: TX_HASH,
      account: ACCOUNT,
      baseline: {
        chain_id: sepoliaProfile.chainId,
        block_number: LATEST_BLOCK_NUMBER,
        account_nonce: '0x0',
      },
      profile: sepoliaProfile,
      rpcRequest,
    }),
    /receipt does not match/u,
  );
});

test('Sepolia chain binding revalidates the exact anchor after reading safe', async () => {
  const profile = Object.freeze({
    network: 'sepolia',
    chainId: SEPOLIA_CHAIN_ID,
    chainViewTag: 'safe',
    rpcTimeoutMs: 10,
  });
  const changedAnchorHash = `0x${'c'.repeat(64)}`;
  const rpcRequest = async (_url, id, method, params) => {
    if (method === 'eth_chainId') return SEPOLIA_CHAIN_ID;
    if (method === 'eth_getBlockByNumber' && params[0] === '0x0') {
      return { number: '0x0', hash: GENESIS_HASH };
    }
    if (method === 'eth_getBlockByNumber' && id === 103) {
      return { number: '0x20', hash: BLOCK_HASH };
    }
    if (method === 'eth_getBlockByNumber' && id === 104) {
      return { number: '0x21', hash: LATEST_BLOCK_HASH };
    }
    if (method === 'eth_getBlockByNumber' && id === 105) {
      return { number: '0x20', hash: changedAnchorHash };
    }
    throw new Error(`unexpected chain-binding RPC method ${method}`);
  };
  await assert.rejects(captureWalletGuardPrototypeNodeChainView({
    rpcUrl: 'https://observer.example.test/',
    profile,
    rpcRequest,
  }), /anchor changed while binding the safe checkpoint/u);
});

function rpcResultForHandshake({ method, params }) {
  if (method === 'eth_chainId') return ANVIL_CHAIN_ID;
  if (method === 'eth_blockNumber') return LATEST_BLOCK_NUMBER;
  if (method === 'eth_getBlockByNumber' && params[0] === '0x0') {
    return { number: '0x0', hash: GENESIS_HASH };
  }
  if (method === 'eth_getBlockByNumber'
      && (params[0] === LATEST_BLOCK_NUMBER || params[0] === 'latest')) {
    return { number: LATEST_BLOCK_NUMBER, hash: LATEST_BLOCK_HASH };
  }
  throw new Error(`unexpected handshake RPC method ${method}`);
}

async function postHandshake(info, cookie, {
  chainId = ANVIL_CHAIN_ID,
  latestBlockNumber = LATEST_BLOCK_NUMBER,
  latestBlockHash = LATEST_BLOCK_HASH,
} = {}) {
  return http(info.origin, '/api/handshake', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: JSON.stringify({
      chain_id: chainId,
      account: ACCOUNT,
      genesis_hash: GENESIS_HASH,
      latest_block_number: latestBlockNumber,
      latest_block_hash: latestBlockHash,
    }),
  });
}

async function dispatchWithoutResult(prototype) {
  const { info, cookie } = await authenticateAndHandshake(prototype);
  const allowedPromise = http(info.origin, '/api/allow', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: '{}',
  });
  const next = await (async () => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const candidate = await http(info.origin, '/bridge/next', { cookie });
      if (candidate.status === 200) return candidate;
      assert.equal(candidate.status, 204);
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    assert.fail('sensitive command was not delivered');
  })();
  const bridgeCommand = JSON.parse(next.body);
  const view = JSON.stringify({
    schema_version: bridgeCommand.schema_version,
    session_id: bridgeCommand.session_id,
    sequence: bridgeCommand.sequence,
    request_id: bridgeCommand.request_id,
    chain_id: bridgeCommand.expected_chain_id,
    account: bridgeCommand.expected_account,
    genesis_hash: GENESIS_HASH,
    latest_block_number: LATEST_BLOCK_NUMBER,
    latest_block_hash: LATEST_BLOCK_HASH,
  });
  assert.equal((await http(info.origin, '/bridge/view', {
    method: 'POST', cookie, requestOrigin: info.origin, body: view,
  })).status, 204);
  assert.equal((await http(info.origin, '/bridge/arm', {
    method: 'POST', cookie, requestOrigin: info.origin, body: view,
  })).status, 204);
  assert.equal((await http(info.origin, '/bridge/dispatched', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: JSON.stringify({
      schema_version: bridgeCommand.schema_version,
      session_id: bridgeCommand.session_id,
      sequence: bridgeCommand.sequence,
      request_id: bridgeCommand.request_id,
    }),
  })).status, 204);
  return { allowedPromise, bridgeCommand, info, cookie };
}

function publicLookupResult(addresses, options = { all: true }) {
  let resolverCalls = 0;
  const lookup = createWalletGuardPrototypePublicLookup({
    dnsLookup(hostname, resolverOptions, callback) {
      resolverCalls += 1;
      assert.equal(hostname, 'rpc.example.test');
      assert.deepEqual(resolverOptions, { all: true, verbatim: true });
      callback(null, addresses);
    },
  });
  const result = new Promise((resolve, reject) => {
    lookup('rpc.example.test', options, (error, ...values) => {
      if (error) reject(error);
      else resolve(values);
    });
  });
  return { result, resolverCalls: () => resolverCalls };
}

test('public RPC lookup rejects private or mixed DNS before yielding a socket address', async () => {
  for (const addresses of [
    [{ address: '127.0.0.1', family: 4 }],
    [
      { address: '93.184.216.34', family: 4 },
      { address: '169.254.169.254', family: 4 },
    ],
    [{ address: '::1', family: 6 }],
    [{ address: '::ffff:7f00:1', family: 6 }],
    [{ address: '::ffff:a9fe:a9fe', family: 6 }],
    [{ address: '::ffff:0:7f00:1', family: 6 }],
    [{ address: '64:ff9b::7f00:1', family: 6 }],
    [{ address: '64:ff9b:1::7f00:1', family: 6 }],
    [{ address: '2002:7f00:1::1', family: 6 }],
    [{ address: '2001::7f00:1', family: 6 }],
    [{ address: '::7f00:1', family: 6 }],
    [{ address: 'fec0::1', family: 6 }],
  ]) {
    const lookup = publicLookupResult(addresses);
    await assert.rejects(lookup.result, /non-public address/u);
    assert.equal(lookup.resolverCalls(), 1);
  }

  const publicOnly = publicLookupResult([
    { address: '93.184.216.34', family: 4 },
    { address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 },
  ]);
  assert.deepEqual(await publicOnly.result, [[{ address: '93.184.216.34', family: 4 }]]);
  assert.equal(publicOnly.resolverCalls(), 1);
});

test('Sepolia observer credentials and RPC URLs stay entirely server-only', async (t) => {
  const observerRpcUrl = 'https://sepolia-observer.example/v3/DO_NOT_EXPOSE_THIS_TOKEN';
  const directory = await mkdtemp(join(tmpdir(), 'pomrx-wallet-config-journal-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  let prototype = null;
  try {
    prototype = createWalletGuardPrototypeServer({
      createControlledCallbackTransport: createWalletGuardControlledCallbackProviderTransport,
      createTrustedGateway: createWalletGuardTrustedProviderGateway,
      network: 'sepolia',
      rpcUrl: observerRpcUrl,
      walletRpcUrl: null,
      journalPath: join(directory, 'operation.json'),
      port: 0,
      captureNodeChainView: async () => ({
        chain_id: SEPOLIA_CHAIN_ID,
        genesis_hash: GENESIS_HASH,
        latest_block_number: LATEST_BLOCK_NUMBER,
        latest_block_hash: LATEST_BLOCK_HASH,
      }),
    });
    const { info, cookie } = await authenticateOnly(prototype);
    const response = await http(info.origin, '/api/config', { cookie });
    assert.equal(response.status, 200);
    assert.equal(response.body.includes(observerRpcUrl), false);
    assert.equal(response.body.includes('DO_NOT_EXPOSE_THIS_TOKEN'), false);
    assert.equal(response.body.includes('sepolia-observer.example'), false);
    assert.equal(response.body.includes('rpc_url'), false);
    const config = JSON.parse(response.body);
    assert.deepEqual(Object.keys(config).sort(), [
      'chain_id',
      'chain_name',
      'host_origin',
      'native_currency',
      'network',
      'required_confirmations',
    ]);
    assert.equal(config.network, 'sepolia');
    assert.equal(config.chain_id, SEPOLIA_CHAIN_ID);
    assert.equal(Number.isSafeInteger(config.required_confirmations), true);
    assert.ok(config.required_confirmations > 1);
    const checkpoint = await http(info.origin, '/api/checkpoint', { cookie });
    assert.equal(checkpoint.status, 200);
    assert.deepEqual(JSON.parse(checkpoint.body), {
      chain_id: SEPOLIA_CHAIN_ID,
      genesis_hash: GENESIS_HASH,
      latest_block_number: LATEST_BLOCK_NUMBER,
      latest_block_hash: LATEST_BLOCK_HASH,
    });
    const handshake = await postHandshake(info, cookie, { chainId: SEPOLIA_CHAIN_ID });
    assert.equal(handshake.status, 200);
  } finally {
    if (prototype !== null) await prototype.close();
  }
});

test('RPC response Content-Type and duplicate JSON keys fail closed during chain binding', async (t) => {
  const cases = [
    {
      label: 'wrong content type',
      responder(request) {
        return {
          contentType: 'text/plain',
          body: JSON.stringify({
            jsonrpc: '2.0', id: request.id, result: rpcResultForHandshake(request),
          }),
        };
      },
    },
    {
      label: 'duplicate result key',
      responder(request) {
        if (request.method === 'eth_chainId') {
          return {
            contentType: 'application/json',
            body: `{"jsonrpc":"2.0","id":${String(request.id)},"result":"0x1","result":"${ANVIL_CHAIN_ID}"}`,
          };
        }
        return {
          contentType: 'application/json',
          body: JSON.stringify({
            jsonrpc: '2.0', id: request.id, result: rpcResultForHandshake(request),
          }),
        };
      },
    },
    {
      label: 'redirect response',
      responder(request) {
        return {
          status: 302,
          contentType: 'application/json',
          body: JSON.stringify({ jsonrpc: '2.0', id: request.id, result: ANVIL_CHAIN_ID }),
        };
      },
    },
  ];

  for (const { label, responder } of cases) {
    await t.test(label, async () => {
      const rpc = await fakeRawRpc(responder);
      const prototype = prototypeFor(rpc.url);
      try {
        const { info, cookie } = await authenticateOnly(prototype);
        const handshake = await postHandshake(info, cookie);
        assert.equal(handshake.status, 400);
        assert.equal(JSON.parse(handshake.body).error, 'REQUEST_REJECTED');
      } finally {
        await prototype.close();
        await close(rpc.server);
      }
    });
  }
});

test('a pending nonce different from latest refuses dispatch before MetaMask is called', async () => {
  const rpc = await fakeRpc(({ method, params }) => {
    if (method === 'eth_chainId') return ANVIL_CHAIN_ID;
    if (method === 'eth_blockNumber') return LATEST_BLOCK_NUMBER;
    if (method === 'eth_getTransactionCount') {
      if (params[1] === 'latest') return '0x0';
      if (params[1] === 'pending') return '0x1';
    }
    throw new Error(`unexpected nonce-baseline RPC method ${method}`);
  });
  const prototype = prototypeFor(rpc.url, {
    captureNodeChainView: async () => chainView(),
  });
  let allowPromise = null;
  try {
    const { info, cookie } = await authenticateAndHandshake(prototype);
    allowPromise = http(info.origin, '/api/allow', {
      method: 'POST', cookie, requestOrigin: info.origin, body: '{}',
    });
    const outcome = await Promise.race([
      allowPromise,
      new Promise((resolve) => setTimeout(() => resolve('still-pending'), 250)),
    ]);
    assert.notEqual(outcome, 'still-pending');
    assert.ok([400, 409].includes(outcome.status));
    assert.deepEqual(
      rpc.calls
        .filter(({ method }) => method === 'eth_getTransactionCount')
        .map(({ params }) => params[1]),
      ['latest', 'pending'],
    );
    assert.equal((await http(info.origin, '/bridge/next', { cookie })).status, 204);
  } finally {
    await prototype.close();
    if (allowPromise !== null) await allowPromise.catch(() => {});
    await close(rpc.server);
  }
});

test('a nonce change after view binding refuses the dispatch-boundary arm', async () => {
  let baselineCaptures = 0;
  const prototype = prototypeFor('http://127.0.0.1:8545/', {
    captureNodeChainView: async () => chainView(),
    captureObservationBaseline: async () => {
      baselineCaptures += 1;
      return {
        ...baseline(),
        account_nonce: baselineCaptures === 1 ? '0x0' : '0x1',
      };
    },
    observeTransaction: async () => assert.fail('a nonce-drifted command must not be observed'),
  });
  let allowPromise = null;
  try {
    const { info, cookie } = await authenticateAndHandshake(prototype);
    allowPromise = http(info.origin, '/api/allow', {
      method: 'POST', cookie, requestOrigin: info.origin, body: '{}',
    });
    let next;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      next = await http(info.origin, '/bridge/next', { cookie });
      if (next.status === 200) break;
      assert.equal(next.status, 204);
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    assert.equal(next.status, 200);
    const command = JSON.parse(next.body);
    const walletView = JSON.stringify({
      schema_version: command.schema_version,
      session_id: command.session_id,
      sequence: command.sequence,
      request_id: command.request_id,
      chain_id: command.expected_chain_id,
      account: command.expected_account,
      genesis_hash: GENESIS_HASH,
      latest_block_number: LATEST_BLOCK_NUMBER,
      latest_block_hash: LATEST_BLOCK_HASH,
    });
    assert.equal((await http(info.origin, '/bridge/view', {
      method: 'POST', cookie, requestOrigin: info.origin, body: walletView,
    })).status, 204);
    const arm = await http(info.origin, '/bridge/arm', {
      method: 'POST', cookie, requestOrigin: info.origin, body: walletView,
    });
    assert.equal(arm.status, 409);
    assert.match(arm.body, /nonce changed/u);
    assert.equal(baselineCaptures, 2);
    assert.equal((await http(info.origin, '/bridge/dispatched', {
      method: 'POST',
      cookie,
      requestOrigin: info.origin,
      body: JSON.stringify({
        schema_version: command.schema_version,
        session_id: command.session_id,
        sequence: command.sequence,
        request_id: command.request_id,
      }),
    })).status, 409);
    assert.equal((await allowPromise).status, 400);
  } finally {
    await prototype.close();
    if (allowPromise !== null) await allowPromise.catch(() => {});
  }
});

test('a failed dispatch-boundary nonce recapture closes the command before timeout', async () => {
  let baselineCaptures = 0;
  const prototype = prototypeFor('http://127.0.0.1:8545/', {
    captureNodeChainView: async () => chainView(),
    captureObservationBaseline: async () => {
      baselineCaptures += 1;
      if (baselineCaptures === 2) throw new Error('pending nonce appeared');
      return baseline();
    },
    observeTransaction: async () => assert.fail('a preflight-failed command must not be observed'),
  });
  let allowPromise = null;
  try {
    const { info, cookie } = await authenticateAndHandshake(prototype);
    allowPromise = http(info.origin, '/api/allow', {
      method: 'POST', cookie, requestOrigin: info.origin, body: '{}',
    });
    let next;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      next = await http(info.origin, '/bridge/next', { cookie });
      if (next.status === 200) break;
      assert.equal(next.status, 204);
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    assert.equal(next.status, 200);
    const command = JSON.parse(next.body);
    const walletView = JSON.stringify({
      schema_version: command.schema_version,
      session_id: command.session_id,
      sequence: command.sequence,
      request_id: command.request_id,
      chain_id: command.expected_chain_id,
      account: command.expected_account,
      genesis_hash: GENESIS_HASH,
      latest_block_number: LATEST_BLOCK_NUMBER,
      latest_block_hash: LATEST_BLOCK_HASH,
    });
    assert.equal((await http(info.origin, '/bridge/view', {
      method: 'POST', cookie, requestOrigin: info.origin, body: walletView,
    })).status, 204);
    const arm = await http(info.origin, '/bridge/arm', {
      method: 'POST', cookie, requestOrigin: info.origin, body: walletView,
    });
    assert.equal(arm.status, 409);
    assert.match(arm.body, /observer preflight failed/u);
    assert.equal(baselineCaptures, 2);
    assert.equal((await allowPromise).status, 400);
    const status = JSON.parse((await http(info.origin, '/api/status', { cookie })).body);
    assert.equal(status.closed, true);
    assert.equal(status.command_pending, false);
    assert.equal(status.ambiguous, null);
  } finally {
    await prototype.close();
    if (allowPromise !== null) await allowPromise.catch(() => {});
  }
});

test('a durable arm completing after command expiry never acknowledges wallet dispatch', async () => {
  let releaseArm;
  let reportArmStarted;
  const armHold = new Promise((resolve) => { releaseArm = resolve; });
  const armStarted = new Promise((resolve) => { reportArmStarted = resolve; });
  const journal = Object.freeze({
    async initialize() { return Object.freeze({ state: 'READY' }); },
    async arm() {
      reportArmStarted();
      await armHold;
      return Object.freeze({ state: 'ARMED' });
    },
    async close() {},
    inspect() { return Object.freeze({ state: 'READY' }); },
  });
  const prototype = prototypeFor('http://127.0.0.1:8545/', {
    journalPath: '/tmp/pomrx-wallet-slow-arm-test.json',
    commandTimeoutMs: 1_000,
    createOperationJournal: () => journal,
    captureNodeChainView: async () => chainView(),
    captureObservationBaseline: async () => baseline(),
    observeTransaction: async () => assert.fail('an expired arm must never be observed'),
  });
  let allowPromise = null;
  try {
    const { info, cookie } = await authenticateAndHandshake(prototype);
    allowPromise = http(info.origin, '/api/allow', {
      method: 'POST', cookie, requestOrigin: info.origin, body: '{}',
    });
    let next;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      next = await http(info.origin, '/bridge/next', { cookie });
      if (next.status === 200) break;
      assert.equal(next.status, 204);
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    assert.equal(next.status, 200);
    const command = JSON.parse(next.body);
    const walletView = JSON.stringify({
      schema_version: command.schema_version,
      session_id: command.session_id,
      sequence: command.sequence,
      request_id: command.request_id,
      chain_id: command.expected_chain_id,
      account: command.expected_account,
      genesis_hash: GENESIS_HASH,
      latest_block_number: LATEST_BLOCK_NUMBER,
      latest_block_hash: LATEST_BLOCK_HASH,
    });
    assert.equal((await http(info.origin, '/bridge/view', {
      method: 'POST', cookie, requestOrigin: info.origin, body: walletView,
    })).status, 204);
    const armPromise = http(info.origin, '/bridge/arm', {
      method: 'POST', cookie, requestOrigin: info.origin, body: walletView,
    });
    await armStarted;
    const allowed = await allowPromise;
    assert.equal(allowed.status, 202);
    assert.equal(JSON.parse(allowed.body).operation.cause_code, 'TIMEOUT');
    releaseArm();
    const arm = await armPromise;
    assert.equal(arm.status, 409);
    assert.match(arm.body, /expired during durable arm/u);
    const status = JSON.parse((await http(info.origin, '/api/status', { cookie })).body);
    assert.equal(status.closed, true);
    assert.equal(status.command_pending, false);
  } finally {
    releaseArm();
    await prototype.close();
    if (allowPromise !== null) await allowPromise.catch(() => {});
  }
});

test('Sepolia receipt is not MATCH_REFERENCE before the required confirmations', async () => {
  const transactionBlock = '0x20';
  const profile = Object.freeze({
    network: 'sepolia',
    chainId: SEPOLIA_CHAIN_ID,
    chainName: 'Sepolia POM-RX burner',
    rpcTimeoutMs: 10,
    receiptPollMs: 1,
    receiptTimeoutMs: 5,
    requiredConfirmations: 2,
    observerEndpointSeparateConfigured: true,
  });
  const rpcRequest = async (_url, _id, method, params) => {
    if (method === 'eth_chainId') return SEPOLIA_CHAIN_ID;
    if (method === 'eth_getTransactionReceipt') {
      return receipt({ blockNumber: transactionBlock });
    }
    if (method === 'eth_getTransactionByHash') {
      return transaction({ chainId: SEPOLIA_CHAIN_ID, blockNumber: transactionBlock });
    }
    if (method === 'eth_blockNumber') return transactionBlock;
    if (method === 'eth_getBlockByNumber' && params[0] === 'safe') {
      return { number: transactionBlock, hash: BLOCK_HASH };
    }
    if (method === 'eth_getBlockByNumber' && params[0] === transactionBlock) {
      return { number: transactionBlock, hash: BLOCK_HASH };
    }
    throw new Error(`unexpected finality RPC method ${method}`);
  };
  await assert.rejects(observeWalletGuardPrototypeTransaction({
    rpcUrl: 'https://observer.example.test/',
    txHash: TX_HASH,
    account: ACCOUNT,
    baseline: {
      chain_id: SEPOLIA_CHAIN_ID,
      block_number: LATEST_BLOCK_NUMBER,
      account_nonce: '0x0',
    },
    profile,
    rpcRequest,
  }), /receipt does not match/u);
});

test('a receipt whose inclusion block was reorged is never MATCH_REFERENCE', async () => {
  const transactionBlock = '0x6';
  const reorgedBlockHash = `0x${'c'.repeat(64)}`;
  const profile = Object.freeze({
    network: 'sepolia',
    chainId: SEPOLIA_CHAIN_ID,
    chainName: 'Sepolia POM-RX burner',
    rpcTimeoutMs: 10,
    receiptPollMs: 1,
    receiptTimeoutMs: 5,
    requiredConfirmations: 2,
    observerEndpointSeparateConfigured: true,
  });
  const rpcRequest = async (_url, _id, method, params) => {
    if (method === 'eth_chainId') return SEPOLIA_CHAIN_ID;
    if (method === 'eth_getTransactionReceipt') {
      return receipt({ blockNumber: transactionBlock });
    }
    if (method === 'eth_getTransactionByHash') {
      return transaction({
        chainId: SEPOLIA_CHAIN_ID,
        blockNumber: transactionBlock,
      });
    }
    if (method === 'eth_blockNumber') return '0x40';
    if (method === 'eth_getBlockByNumber' && params[0] === 'safe') {
      return { number: '0x40', hash: LATEST_BLOCK_HASH };
    }
    if (method === 'eth_getBlockByNumber' && params[0] === transactionBlock) {
      return { number: transactionBlock, hash: reorgedBlockHash };
    }
    throw new Error(`unexpected reorg RPC method ${method}`);
  };
  await assert.rejects(observeWalletGuardPrototypeTransaction({
    rpcUrl: 'https://observer.example.test/',
    txHash: TX_HASH,
    account: ACCOUNT,
    baseline: {
      chain_id: SEPOLIA_CHAIN_ID,
      block_number: LATEST_BLOCK_NUMBER,
      account_nonce: '0x0',
    },
    profile,
    rpcRequest,
  }), /receipt does not match/u);
});

test('a re-included receipt cannot reuse confirmations from its earlier block', async () => {
  const firstBlock = '0x6';
  const secondBlock = '0x40';
  const secondBlockHash = `0x${'d'.repeat(64)}`;
  let receiptCalls = 0;
  const profile = Object.freeze({
    network: 'sepolia',
    chainId: SEPOLIA_CHAIN_ID,
    chainName: 'Sepolia POM-RX burner',
    rpcTimeoutMs: 10,
    receiptPollMs: 1,
    receiptTimeoutMs: 5,
    requiredConfirmations: 2,
    observerEndpointSeparateConfigured: true,
  });
  const rpcRequest = async (_url, _id, method, params) => {
    if (method === 'eth_chainId') return SEPOLIA_CHAIN_ID;
    if (method === 'eth_getTransactionReceipt') {
      receiptCalls += 1;
      return receiptCalls === 1
        ? receipt({ blockNumber: firstBlock })
        : receipt({ blockNumber: secondBlock, blockHash: secondBlockHash });
    }
    if (method === 'eth_getTransactionByHash') {
      return transaction({
        chainId: SEPOLIA_CHAIN_ID,
        blockNumber: secondBlock,
        blockHash: secondBlockHash,
      });
    }
    if (method === 'eth_blockNumber') return secondBlock;
    if (method === 'eth_getBlockByNumber' && params[0] === 'safe') {
      return { number: secondBlock, hash: secondBlockHash };
    }
    if (method === 'eth_getBlockByNumber' && params[0] === secondBlock) {
      return { number: secondBlock, hash: secondBlockHash };
    }
    throw new Error(`unexpected re-inclusion RPC method ${method}`);
  };
  await assert.rejects(observeWalletGuardPrototypeTransaction({
    rpcUrl: 'https://observer.example.test/',
    txHash: TX_HASH,
    account: ACCOUNT,
    baseline: {
      chain_id: SEPOLIA_CHAIN_ID,
      block_number: LATEST_BLOCK_NUMBER,
      account_nonce: '0x0',
    },
    profile,
    rpcRequest,
  }), /receipt does not match/u);
});

test('an unresolved dispatched operation durably blocks a fresh host after restart', async () => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'pomrx-wallet-journal-'));
  const journalPath = join(temporaryDirectory, 'operations.jsonl');
  const createPrototype = () => createWalletGuardPrototypeServer({
    createControlledCallbackTransport: createWalletGuardControlledCallbackProviderTransport,
    createTrustedGateway: createWalletGuardTrustedProviderGateway,
    network: 'anvil',
    rpcUrl: 'http://127.0.0.1:8545/',
    walletRpcUrl: null,
    journalPath,
    port: 0,
    commandTimeoutMs: 5_000,
    captureNodeChainView: async () => chainView(),
    captureObservationBaseline: async () => baseline(),
    observeTransaction: async () => {
      throw new Error('an unresolved dispatch must not be observed without a hash');
    },
  });
  let first = createPrototype();
  let second = null;
  let secondListening = false;
  try {
    const { allowedPromise } = await dispatchWithoutResult(first);
    await first.close();
    first = null;
    await allowedPromise;

    second = createPrototype();
    await assert.rejects(async () => {
      await second.listen();
      secondListening = true;
    }, /journal|unresolved|recovery|manual/i);
  } finally {
    if (first !== null) await first.close();
    if (second !== null && secondListening) await second.close();
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test('a previously ambiguous operation stays ambiguous after a late matching hash', async () => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'pomrx-wallet-ambiguous-journal-'));
  const journalPath = join(temporaryDirectory, 'operation.json');
  const prototype = createWalletGuardPrototypeServer({
    createControlledCallbackTransport: createWalletGuardControlledCallbackProviderTransport,
    createTrustedGateway: createWalletGuardTrustedProviderGateway,
    journalPath,
    port: 0,
    commandTimeoutMs: 1_000,
    captureNodeChainView: async () => chainView(),
    captureObservationBaseline: async () => baseline(),
    observeTransaction: async ({ txHash, account }) => ({
      status: 'MATCH_REFERENCE',
      transaction_hash: txHash,
      from: account,
      to: account,
      reference_only: true,
      external_world_proved: false,
    }),
  });
  try {
    const {
      allowedPromise, bridgeCommand, info, cookie,
    } = await dispatchWithoutResult(prototype);
    const timedOut = await allowedPromise;
    assert.equal(timedOut.status, 202);
    assert.equal(JSON.parse(timedOut.body).operation.status, 'AMBIGUOUS');

    const late = await http(info.origin, '/bridge/result', {
      method: 'POST',
      cookie,
      requestOrigin: info.origin,
      body: JSON.stringify({
        schema_version: bridgeCommand.schema_version,
        session_id: bridgeCommand.session_id,
        sequence: bridgeCommand.sequence,
        request_id: bridgeCommand.request_id,
        observed_chain_id: bridgeCommand.expected_chain_id,
        observed_account: bridgeCommand.expected_account,
        outcome: 'result',
        result: TX_HASH,
        error: null,
      }),
    });
    assert.equal(late.status, 202);
    assert.equal(JSON.parse(late.body).operation.status, 'AMBIGUOUS');
    const durable = JSON.parse(await readFile(journalPath, 'utf8'));
    assert.equal(durable.state, 'TERMINAL');
    assert.equal(durable.terminal, 'AMBIGUOUS_MATCH_REFERENCE');
  } finally {
    await prototype.close();
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test('hash-retention failure leaves the dispatched journal unresolved and never observes', async () => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'pomrx-wallet-retain-failure-'));
  const journalPath = join(temporaryDirectory, 'operation.json');
  let observationCalls = 0;
  const prototype = prototypeFor('http://127.0.0.1:8545/', {
    journalPath,
    captureNodeChainView: async () => chainView(),
    captureObservationBaseline: async () => baseline(),
    observeTransaction: async () => {
      observationCalls += 1;
      return Object.freeze({ status: 'MATCH_REFERENCE' });
    },
  });
  try {
    const {
      allowedPromise,
      bridgeCommand,
      info,
      cookie,
    } = await dispatchWithoutResult(prototype);
    await chmod(journalPath, 0o644);
    const result = await http(info.origin, '/bridge/result', {
      method: 'POST',
      cookie,
      requestOrigin: info.origin,
      body: JSON.stringify({
        schema_version: bridgeCommand.schema_version,
        session_id: bridgeCommand.session_id,
        sequence: bridgeCommand.sequence,
        request_id: bridgeCommand.request_id,
        observed_chain_id: MAINNET_CHAIN_ID,
        observed_account: OTHER_ACCOUNT,
        outcome: 'result',
        result: TX_HASH,
        error: null,
      }),
    });
    assert.equal(result.status, 400);
    const allowed = await allowedPromise;
    assert.equal(allowed.status, 202);
    const operation = JSON.parse(allowed.body).operation;
    assert.equal(operation.cause_code, 'JOURNAL_FAILURE');
    assert.equal(operation.reconciliation_status, 'JOURNAL_FAILURE');
    assert.equal(operation.transaction_hash, TX_HASH);
    assert.equal(observationCalls, 0);
    const durable = JSON.parse(await readFile(journalPath, 'utf8'));
    assert.equal(durable.state, 'DISPATCHED');
    assert.equal(durable.operation.transaction_hash, null);
    assert.equal(durable.terminal, null);
  } finally {
    await prototype.close();
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test('wallet-error journal failure settles the callback and stays durably unresolved', async () => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'pomrx-wallet-error-journal-failure-'));
  const journalPath = join(temporaryDirectory, 'operation.json');
  let observationCalls = 0;
  const prototype = prototypeFor('http://127.0.0.1:8545/', {
    journalPath,
    captureNodeChainView: async () => chainView(),
    captureObservationBaseline: async () => baseline(),
    observeTransaction: async () => {
      observationCalls += 1;
      return Object.freeze({ status: 'MATCH_REFERENCE' });
    },
  });
  try {
    const {
      allowedPromise,
      bridgeCommand,
      info,
      cookie,
    } = await dispatchWithoutResult(prototype);
    await chmod(journalPath, 0o644);
    const result = await http(info.origin, '/bridge/result', {
      method: 'POST',
      cookie,
      requestOrigin: info.origin,
      body: JSON.stringify({
        schema_version: bridgeCommand.schema_version,
        session_id: bridgeCommand.session_id,
        sequence: bridgeCommand.sequence,
        request_id: bridgeCommand.request_id,
        observed_chain_id: bridgeCommand.expected_chain_id,
        observed_account: bridgeCommand.expected_account,
        outcome: 'error',
        result: null,
        error: { code: 'USER_REJECTED' },
      }),
    });
    assert.equal(result.status, 400);
    const allowed = await allowedPromise;
    assert.equal(allowed.status, 202);
    const operation = JSON.parse(allowed.body).operation;
    assert.equal(operation.cause_code, 'JOURNAL_FAILURE');
    assert.equal(operation.reconciliation_status, 'JOURNAL_FAILURE');
    assert.equal(operation.transaction_hash, null);
    assert.equal(observationCalls, 0);
    const durable = JSON.parse(await readFile(journalPath, 'utf8'));
    assert.equal(durable.state, 'DISPATCHED');
    assert.equal(durable.operation.transaction_hash, null);
    assert.equal(durable.terminal, null);
  } finally {
    await prototype.close();
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
