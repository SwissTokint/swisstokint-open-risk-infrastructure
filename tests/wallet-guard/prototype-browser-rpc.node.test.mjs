import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer, request as requestHttp } from 'node:http';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

import {
  createWalletGuardControlledCallbackProviderTransport,
  createWalletGuardTrustedProviderGateway,
} from '../../applications/blockchain-digital-assets/wallet-guard/trusted-provider-transport.mjs';

const { createWalletGuardPrototypeServer } = await import(
  '../../applications/blockchain-digital-assets/wallet-guard/prototype/server.mjs'
);

const BROWSER_BRIDGE_SOURCE = await readFile(new URL(
  '../../applications/blockchain-digital-assets/wallet-guard/prototype/public/browser-bridge.js',
  import.meta.url,
), 'utf8');

const ANVIL_CHAIN_ID = '0x7a69';
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
  announcements = null,
  boundary = {},
  viewResponse = null,
  armResponse = null,
  dispatchedResponse = null,
  resultResponse = null,
  monotonicTime = () => performance.now(),
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
      return response(200, {
        chain_id: ANVIL_CHAIN_ID,
        rpc_url: 'http://127.0.0.1:8545/',
        host_origin: 'http://127.0.0.1:8787',
      });
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
    performance: { now: monotonicTime },
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

test('browser requires a timely successful arm acknowledgement', async () => {
  const arm = Promise.withResolvers();
  let elapsed = 0;
  const provider = new DeterministicEip1193Provider();
  const harness = browserHarness({
    provider,
    nextResponses: [response(200, command())],
    armResponse: arm.promise,
    monotonicTime: () => elapsed,
  });
  await harness.elements.get('#connect').click();
  await waitFor(
    () => harness.fetchCalls.some(({ path }) => path === '/bridge/arm'),
    'arm awaiting acknowledgement',
  );
  elapsed = 1_001;
  arm.resolve(response(204));
  await waitFor(
    () => /Armement expiré avant envoi/u.test(harness.elements.get('#result').textContent),
    'stale arm acknowledgement rejected',
  );
  assert.equal(provider.calls.some(({ method }) => method === 'eth_sendTransaction'), false);
  assert.equal(harness.fetchCalls.some(({ path }) => path === '/bridge/dispatched'), false);
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

async function authenticateAndHandshake(prototype) {
  const info = await prototype.listen();
  const launch = new URL(info.launch_url);
  const bootstrap = await http(info.origin, `${launch.pathname}${launch.search}`);
  assert.equal(bootstrap.status, 303);
  const cookie = bootstrap.headers['set-cookie'][0].split(';')[0];
  const handshake = await http(info.origin, '/api/handshake', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: JSON.stringify({
      chain_id: ANVIL_CHAIN_ID,
      account: ACCOUNT,
      genesis_hash: GENESIS_HASH,
      latest_block_number: LATEST_BLOCK_NUMBER,
      latest_block_hash: LATEST_BLOCK_HASH,
    }),
  });
  assert.equal(handshake.status, 200);
  return { info, cookie };
}

async function executeAllowedTransaction(prototype) {
  const { info, cookie } = await authenticateAndHandshake(prototype);
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
      latest_block_number: LATEST_BLOCK_NUMBER,
      latest_block_hash: LATEST_BLOCK_HASH,
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
      latest_block_number: LATEST_BLOCK_NUMBER,
      latest_block_hash: LATEST_BLOCK_HASH,
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
      observed_chain_id: bridgeCommand.expected_chain_id,
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
  if (method === 'eth_getBlockByNumber' && params[0] === LATEST_BLOCK_NUMBER) {
    return { number: LATEST_BLOCK_NUMBER, hash: LATEST_BLOCK_HASH };
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
    throw new Error(`unexpected RPC method ${method}`);
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
    throw new Error(`unexpected RPC method ${method}`);
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
    throw new Error(`unexpected RPC method ${method}`);
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
