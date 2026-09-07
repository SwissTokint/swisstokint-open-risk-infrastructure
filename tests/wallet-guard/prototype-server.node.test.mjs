import assert from 'node:assert/strict';
import { request as requestHttp } from 'node:http';
import test from 'node:test';

import {
  createWalletGuardControlledCallbackProviderTransport,
  createWalletGuardTrustedProviderGateway,
} from '../../applications/blockchain-digital-assets/wallet-guard/trusted-provider-transport.mjs';

const { createWalletGuardPrototypeServer } = await import(
  '../../applications/blockchain-digital-assets/wallet-guard/prototype/server.mjs'
);

const ACCOUNT = `0x${'1'.repeat(40)}`;
const TX_HASH = `0x${'a'.repeat(64)}`;
const GENESIS_HASH = `0x${'d'.repeat(64)}`;
const LATEST_BLOCK_HASH = `0x${'e'.repeat(64)}`;
const LATEST_BLOCK_NUMBER = '0x5';

function nodeChainView() {
  return Object.freeze({
    chain_id: '0x7a69',
    genesis_hash: GENESIS_HASH,
    latest_block_number: LATEST_BLOCK_NUMBER,
    latest_block_hash: LATEST_BLOCK_HASH,
  });
}

function http(origin, path, {
  method = 'GET',
  cookie = null,
  requestOrigin = null,
  body = null,
  host = null,
  contentType = 'application/json',
  fetchMetadata = true,
} = {}) {
  const url = new URL(path, origin);
  const headers = {};
  if (cookie !== null) headers.cookie = cookie;
  if (requestOrigin !== null) headers.origin = requestOrigin;
  if (host !== null) headers.host = host;
  if (fetchMetadata) {
    headers['sec-fetch-site'] = 'same-origin';
    headers['sec-fetch-mode'] = 'cors';
    headers['sec-fetch-dest'] = 'empty';
  }
  if (body !== null) {
    if (contentType !== null) headers['content-type'] = contentType;
    headers['content-length'] = Buffer.byteLength(body);
  }
  return new Promise((resolve, reject) => {
    const request = requestHttp({
      hostname: url.hostname,
      port: Number(url.port),
      path: `${url.pathname}${url.search}`,
      method,
      headers,
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    request.on('error', reject);
    if (body !== null) request.write(body);
    request.end();
  });
}

function parseJson(response) {
  return JSON.parse(response.body);
}

async function authenticate(info) {
  const launch = new URL(info.launch_url);
  const bootstrap = await http(info.origin, `${launch.pathname}${launch.search}`);
  assert.equal(bootstrap.status, 303);
  assert.equal(bootstrap.headers['clear-site-data'], '"cache", "storage"');
  assert.equal(bootstrap.headers['referrer-policy'], 'no-referrer');
  assert.equal(bootstrap.headers['cross-origin-opener-policy'], 'same-origin');
  const cookie = bootstrap.headers['set-cookie'][0].split(';')[0];
  assert.match(cookie, /^wg_session=[0-9a-f]{64}$/u);
  return { cookie, launch };
}

async function handshake(info, cookie) {
  const response = await http(info.origin, '/api/handshake', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: JSON.stringify({
      chain_id: '0x7a69',
      account: ACCOUNT,
      genesis_hash: GENESIS_HASH,
      latest_block_number: LATEST_BLOCK_NUMBER,
      latest_block_hash: LATEST_BLOCK_HASH,
    }),
  });
  assert.equal(response.status, 200);
  return parseJson(response);
}

async function bindView(info, cookie, command) {
  return http(info.origin, '/bridge/view', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: JSON.stringify({
      schema_version: command.schema_version,
      session_id: command.session_id,
      sequence: command.sequence,
      request_id: command.request_id,
      chain_id: command.expected_chain_id,
      account: command.expected_account,
      genesis_hash: GENESIS_HASH,
      latest_block_number: LATEST_BLOCK_NUMBER,
      latest_block_hash: LATEST_BLOCK_HASH,
    }),
  });
}

async function armView(info, cookie, command) {
  return http(info.origin, '/bridge/arm', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: JSON.stringify({
      schema_version: command.schema_version,
      session_id: command.session_id,
      sequence: command.sequence,
      request_id: command.request_id,
      chain_id: command.expected_chain_id,
      account: command.expected_account,
      genesis_hash: GENESIS_HASH,
      latest_block_number: LATEST_BLOCK_NUMBER,
      latest_block_hash: LATEST_BLOCK_HASH,
    }),
  });
}

async function signalDispatched(info, cookie, command) {
  return http(info.origin, '/bridge/dispatched', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: JSON.stringify({
      schema_version: command.schema_version,
      session_id: command.session_id,
      sequence: command.sequence,
      request_id: command.request_id,
    }),
  });
}

async function settleResult(info, cookie, command, receipt) {
  return http(info.origin, '/bridge/settle', {
    method: 'POST', cookie, requestOrigin: info.origin,
    body: JSON.stringify({
      schema_version: command.schema_version,
      session_id: command.session_id,
      sequence: command.sequence,
      request_id: command.request_id,
      receipt,
    }),
  });
}

async function nextCommand(info, cookie) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const response = await http(info.origin, '/bridge/next', { cookie });
    if (response.status === 200) return parseJson(response);
    assert.equal(response.status, 204);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail('sensitive command was not delivered');
}

function resultEnvelope(command, {
  txHash = TX_HASH,
  chainId = command.expected_chain_id,
  account = command.expected_account,
} = {}) {
  return JSON.stringify({
    schema_version: command.schema_version,
    session_id: command.session_id,
    sequence: command.sequence,
    request_id: command.request_id,
    observed_chain_id: chainId,
    observed_account: account,
    outcome: 'result',
    result: txHash,
    error: null,
  });
}

test('loopback prototype authenticates one page and executes DENY then one bound ALLOW', async (t) => {
  const prototype = createWalletGuardPrototypeServer({
    createControlledCallbackTransport: createWalletGuardControlledCallbackProviderTransport,
    createTrustedGateway: createWalletGuardTrustedProviderGateway,
    port: 0,
    commandTimeoutMs: 5_000,
    captureNodeChainView: async () => nodeChainView(),
    observeTransaction: async ({ txHash, account }) => ({
      status: 'MATCH_REFERENCE',
      transaction_hash: txHash,
      from: account,
      to: account,
      reference_only: true,
      external_world_proved: false,
    }),
  });
  const info = await prototype.listen();
  t.after(() => prototype.close());
  const { cookie, launch } = await authenticate(info);

  const reused = await http(info.origin, `${launch.pathname}${launch.search}`);
  assert.equal(reused.status, 403);
  assert.equal((await http(info.origin, '/')).status, 401);
  assert.equal((await http(info.origin, '/api/status', {
    cookie: `${cookie}; wg_session=${'f'.repeat(64)}`,
  })).status, 401);
  const page = await http(info.origin, '/', { cookie });
  assert.equal(page.status, 200);
  assert.equal(page.headers['referrer-policy'], 'no-referrer');
  assert.equal(page.headers['cross-origin-opener-policy'], 'same-origin');
  assert.equal((await http(info.origin, '/?unexpected=1', { cookie })).status, 404);
  const config = parseJson(await http(info.origin, '/api/config', { cookie }));
  assert.deepEqual(config, {
    chain_id: '0x7a69',
    rpc_url: 'http://127.0.0.1:8545/',
    host_origin: info.origin,
  });
  assert.equal((await http(info.origin, '/api/config', {
    cookie,
    fetchMetadata: false,
  })).status, 400);
  assert.equal((await http(info.origin, '/api/status', {
    cookie,
    host: `localhost:${new URL(info.origin).port}`,
  })).status, 403);
  assert.equal((await http(info.origin, '/bridge/next', {
    cookie,
    fetchMetadata: false,
  })).status, 400);

  const wrongOrigin = await http(info.origin, '/api/handshake', {
    method: 'POST',
    cookie,
    requestOrigin: 'http://localhost.invalid',
    body: JSON.stringify({
      chain_id: '0x7a69',
      account: ACCOUNT,
      genesis_hash: GENESIS_HASH,
      latest_block_number: LATEST_BLOCK_NUMBER,
      latest_block_hash: LATEST_BLOCK_HASH,
    }),
  });
  assert.equal(wrongOrigin.status, 400);

  const wrongContentType = await http(info.origin, '/api/handshake', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify({
      chain_id: '0x7a69',
      account: ACCOUNT,
      genesis_hash: GENESIS_HASH,
      latest_block_number: LATEST_BLOCK_NUMBER,
      latest_block_hash: LATEST_BLOCK_HASH,
    }),
  });
  assert.equal(wrongContentType.status, 400);

  const handshake = await http(info.origin, '/api/handshake', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: JSON.stringify({
      chain_id: '0x7a69',
      account: ACCOUNT,
      genesis_hash: GENESIS_HASH,
      latest_block_number: LATEST_BLOCK_NUMBER,
      latest_block_hash: LATEST_BLOCK_HASH,
    }),
  });
  assert.equal(handshake.status, 200);
  assert.deepEqual(parseJson(handshake), {
    connected: true,
    chain_id: '0x7a69',
    account: ACCOUNT,
    chain_view_bound: true,
  });

  const denied = await http(info.origin, '/api/deny', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: '{}',
  });
  assert.equal(denied.status, 200);
  assert.equal(parseJson(denied).result.decision, 'DENY');
  assert.equal(parseJson(denied).result.forwarded, false);
  assert.equal(parseJson(await http(info.origin, '/api/status', { cookie })).sensitive_call_count, 0);

  const unknownActionBody = await http(info.origin, '/api/deny', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: '{"unknown":true}',
  });
  assert.equal(unknownActionBody.status, 400);

  const allowPromise = http(info.origin, '/api/allow', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: '{}',
  });

  let next;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    next = await http(info.origin, '/bridge/next', { cookie });
    if (next.status === 200) break;
    assert.equal(next.status, 204);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(next.status, 200);
  const command = parseJson(next);
  assert.equal(command.expected_chain_id, '0x7a69');
  assert.equal(command.expected_account, ACCOUNT);
  assert.equal(command.request.method, 'eth_sendTransaction');
  assert.deepEqual(command.request.params[0], {
    from: ACCOUNT,
    to: ACCOUNT,
    value: '0x0',
    data: '0x',
  });
  assert.equal((await bindView(info, cookie, command)).status, 204);
  assert.equal((await armView(info, cookie, command)).status, 204);
  assert.equal((await signalDispatched(info, cookie, command)).status, 204);

  const resultEnvelope = JSON.stringify({
    schema_version: command.schema_version,
    session_id: command.session_id,
    sequence: command.sequence,
    request_id: command.request_id,
    observed_chain_id: command.expected_chain_id,
    observed_account: command.expected_account,
    outcome: 'result',
    result: TX_HASH,
    error: null,
  });
  const delivered = await http(info.origin, '/bridge/result', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: resultEnvelope,
  });
  assert.equal(delivered.status, 200);
  const receipt = parseJson(delivered).receipt;
  assert.match(receipt, /^[0-9a-f]{64}$/u);
  assert.equal((await http(info.origin, '/bridge/result', {
    method: 'POST', cookie, requestOrigin: info.origin, body: resultEnvelope,
  })).status, 409);
  assert.equal((await settleResult(info, cookie, command, '0'.repeat(64))).status, 400);
  assert.equal((await settleResult(info, cookie, command, receipt)).status, 204);
  assert.equal((await settleResult(info, cookie, command, receipt)).status, 409);

  const allowed = await allowPromise;
  assert.equal(allowed.status, 200);
  const allowedBody = parseJson(allowed);
  assert.equal(allowedBody.result.decision, 'ALLOW');
  assert.equal(allowedBody.result.forwarded, true);
  assert.equal(allowedBody.result.provider_result, TX_HASH);
  assert.equal(allowedBody.observation.status, 'MATCH_REFERENCE');
  assert.equal(allowedBody.observation.external_world_proved, false);

  const replay = await http(info.origin, '/bridge/result', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: resultEnvelope,
  });
  assert.equal(replay.status, 409);
  const status = parseJson(await http(info.origin, '/api/status', { cookie }));
  assert.equal(status.sensitive_call_count, 1);
  assert.equal(status.command_pending, false);
});

test('unconfirmed retained results close or expire with their hash and no retry', async (t) => {
  for (const terminal of ['close', 'timeout']) {
    await t.test(terminal, async () => {
      let observations = 0;
      const prototype = createWalletGuardPrototypeServer({
        createControlledCallbackTransport: createWalletGuardControlledCallbackProviderTransport,
        createTrustedGateway: createWalletGuardTrustedProviderGateway,
        commandTimeoutMs: 1_000,
        captureNodeChainView: async () => nodeChainView(),
        captureObservationBaseline: async () => ({
          chain_id: '0x7a69', block_number: '0x5', account_nonce: '0x0',
        }),
        observeTransaction: async () => {
          observations += 1;
          return { status: 'MATCH_REFERENCE', reference_only: true };
        },
      });
      t.after(() => prototype.close());
      const info = await prototype.listen();
      const { cookie } = await authenticate(info);
      await handshake(info, cookie);
      const allowedPromise = http(info.origin, '/api/allow', {
        method: 'POST', cookie, requestOrigin: info.origin, body: '{}',
      });
      const command = await nextCommand(info, cookie);
      await bindView(info, cookie, command);
      await armView(info, cookie, command);
      await signalDispatched(info, cookie, command);
      const retained = await http(info.origin, '/bridge/result', {
        method: 'POST', cookie, requestOrigin: info.origin, body: resultEnvelope(command),
      });
      assert.equal(retained.status, 200);
      assert.equal(observations, 0);
      if (terminal === 'close') {
        await http(info.origin, '/bridge/close', {
          method: 'POST', cookie, requestOrigin: info.origin,
          body: JSON.stringify({ code: 'CONTEXT_CHANGED' }),
        });
      }
      const allowed = await allowedPromise;
      assert.equal(allowed.status, 202);
      const operation = parseJson(allowed).operation;
      assert.equal(operation.status, 'AMBIGUOUS');
      assert.equal(operation.transaction_hash, TX_HASH);
      assert.equal(operation.retry_allowed, false);
      assert.equal(observations, 1);
      assert.equal((await settleResult(info, cookie, command, parseJson(retained).receipt)).status, 409);
    });
  }
});

test('delivered MetaMask timeout stays AMBIGUOUS, retains a late hash, and forbids retry', async (t) => {
  const baseline = Object.freeze({
    chain_id: '0x7a69',
    block_number: '0x10',
    account_nonce: '0x2',
  });
  const observations = [];
  const prototype = createWalletGuardPrototypeServer({
    createControlledCallbackTransport: createWalletGuardControlledCallbackProviderTransport,
    createTrustedGateway: createWalletGuardTrustedProviderGateway,
    port: 0,
    commandTimeoutMs: 1_000,
    captureObservationBaseline: async () => baseline,
    captureNodeChainView: async () => nodeChainView(),
    observeTransaction: async (input) => {
      observations.push(input);
      return Object.freeze({
        status: 'MATCH_REFERENCE',
        transaction_hash: input.txHash,
        reference_only: true,
        external_world_proved: false,
      });
    },
  });
  const info = await prototype.listen();
  t.after(() => prototype.close());
  const { cookie } = await authenticate(info);
  await handshake(info, cookie);

  const allowPromise = http(info.origin, '/api/allow', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: '{}',
  });
  const command = await nextCommand(info, cookie);
  const timedOut = await allowPromise;
  assert.equal(timedOut.status, 202);
  const timedOutBody = parseJson(timedOut);
  assert.equal(timedOutBody.operation.status, 'AMBIGUOUS');
  assert.equal(timedOutBody.operation.cause_code, 'TIMEOUT');
  assert.equal(timedOutBody.operation.retry_allowed, false);
  assert.equal(timedOutBody.operation.transaction_hash, null);
  assert.equal(timedOutBody.operation.reconciliation_status, 'AWAITING_LATE_RESULT');

  const lateEnvelope = resultEnvelope(command);
  const late = await http(info.origin, '/bridge/result', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: lateEnvelope,
  });
  assert.equal(late.status, 202);
  const lateBody = parseJson(late);
  assert.equal(lateBody.operation.status, 'AMBIGUOUS');
  assert.equal(lateBody.operation.transaction_hash, TX_HASH);
  assert.equal(lateBody.operation.reconciliation_status, 'OBSERVED');
  assert.equal(lateBody.operation.observation.status, 'MATCH_REFERENCE');
  assert.equal(observations.length, 1);
  assert.equal(observations[0].txHash, TX_HASH);
  assert.equal(observations[0].account, ACCOUNT);
  assert.equal(observations[0].rpcUrl, 'http://127.0.0.1:8545/');
  assert.equal(observations[0].baseline.observer, baseline);
  assert.equal(observations[0].baseline.connection.node.genesis_hash, GENESIS_HASH);

  const retry = await http(info.origin, '/api/allow', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: '{}',
  });
  assert.equal(retry.status, 409);
  const replay = await http(info.origin, '/bridge/result', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: lateEnvelope,
  });
  assert.equal(replay.status, 409);

  const status = parseJson(await http(info.origin, '/api/status', { cookie }));
  assert.equal(status.closed, true);
  assert.equal(status.operation_status, 'AMBIGUOUS');
  assert.equal(status.sensitive_call_count, 1);
  assert.equal(status.ambiguous.transaction_hash, TX_HASH);
  assert.equal(status.ambiguous.retry_allowed, false);
});

test('arm rejects when the pre-send resample outlives the original pending deadline', async (t) => {
  const prototype = createWalletGuardPrototypeServer({
    createControlledCallbackTransport: createWalletGuardControlledCallbackProviderTransport,
    createTrustedGateway: createWalletGuardTrustedProviderGateway,
    port: 0,
    commandTimeoutMs: 1_000,
    captureObservationBaseline: async () => Object.freeze({ marker: 'before-dispatch' }),
    captureNodeChainView: async () => nodeChainView(),
    observeTransaction: async () => assert.fail('observer must not run'),
  });
  const info = await prototype.listen();
  t.after(() => prototype.close());
  const { cookie } = await authenticate(info);
  await handshake(info, cookie);

  const allowPromise = http(info.origin, '/api/allow', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: '{}',
  });
  const command = await nextCommand(info, cookie);
  assert.equal((await bindView(info, cookie, command)).status, 204);

  const timedOut = await allowPromise;
  assert.equal(timedOut.status, 202);
  assert.equal(parseJson(timedOut).operation.cause_code, 'TIMEOUT');
  assert.equal((await armView(info, cookie, command)).status, 409);
  assert.equal((await signalDispatched(info, cookie, command)).status, 409);
});

test('late Node chain-view validation cannot acknowledge an expired pending command', async (t) => {
  let captureCount = 0;
  let markViewCaptureStarted;
  let releaseViewCapture;
  const viewCaptureStarted = new Promise((resolve) => {
    markViewCaptureStarted = resolve;
  });
  const delayedView = new Promise((resolve) => {
    releaseViewCapture = resolve;
  });
  const prototype = createWalletGuardPrototypeServer({
    createControlledCallbackTransport: createWalletGuardControlledCallbackProviderTransport,
    createTrustedGateway: createWalletGuardTrustedProviderGateway,
    port: 0,
    commandTimeoutMs: 1_000,
    captureObservationBaseline: async () => Object.freeze({ marker: 'before-dispatch' }),
    captureNodeChainView: async () => {
      captureCount += 1;
      if (captureCount !== 3) return nodeChainView();
      markViewCaptureStarted();
      return delayedView;
    },
    observeTransaction: async () => assert.fail('observer must not run'),
  });
  const info = await prototype.listen();
  t.after(() => prototype.close());
  const { cookie } = await authenticate(info);
  await handshake(info, cookie);

  const allowPromise = http(info.origin, '/api/allow', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: '{}',
  });
  const command = await nextCommand(info, cookie);
  const viewPromise = bindView(info, cookie, command);
  await viewCaptureStarted;

  const timedOut = await allowPromise;
  assert.equal(timedOut.status, 202);
  assert.equal(parseJson(timedOut).operation.cause_code, 'TIMEOUT');
  releaseViewCapture(nodeChainView());

  const lateView = await viewPromise;
  assert.equal(lateView.status, 409);
  assert.match(lateView.body, /expired during chain-view validation/u);
  const status = parseJson(await http(info.origin, '/api/status', { cookie }));
  assert.equal(status.closed, true);
  assert.equal(status.command_pending, false);
  assert.equal(status.operation_status, 'AMBIGUOUS');
  assert.equal(status.ambiguous.retry_allowed, false);
});

test('post-prompt chain/account mismatch preserves and observes the bound transaction hash', async (t) => {
  const observations = [];
  const prototype = createWalletGuardPrototypeServer({
    createControlledCallbackTransport: createWalletGuardControlledCallbackProviderTransport,
    createTrustedGateway: createWalletGuardTrustedProviderGateway,
    port: 0,
    commandTimeoutMs: 5_000,
    captureObservationBaseline: async () => Object.freeze({ marker: 'before-dispatch' }),
    captureNodeChainView: async () => nodeChainView(),
    observeTransaction: async (input) => {
      observations.push(input);
      return Object.freeze({
        status: 'MATCH_REFERENCE',
        transaction_hash: input.txHash,
        reference_only: true,
        external_world_proved: false,
      });
    },
  });
  const info = await prototype.listen();
  t.after(() => prototype.close());
  const { cookie } = await authenticate(info);
  await handshake(info, cookie);

  const allowPromise = http(info.origin, '/api/allow', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: '{}',
  });
  const command = await nextCommand(info, cookie);
  assert.equal((await bindView(info, cookie, command)).status, 204);
  assert.equal((await armView(info, cookie, command)).status, 204);
  assert.equal((await signalDispatched(info, cookie, command)).status, 204);
  const mismatched = await http(info.origin, '/bridge/result', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: resultEnvelope(command, {
      chainId: '0x1',
      account: `0x${'2'.repeat(40)}`,
    }),
  });
  assert.equal(mismatched.status, 202);
  const operation = parseJson(mismatched).operation;
  assert.equal(operation.status, 'AMBIGUOUS');
  assert.equal(operation.context_matches, false);
  assert.equal(operation.transaction_hash, TX_HASH);
  assert.equal(operation.reconciliation_status, 'OBSERVED');

  const allowed = await allowPromise;
  assert.equal(allowed.status, 202);
  assert.equal(parseJson(allowed).operation.status, 'AMBIGUOUS');
  assert.equal(observations.length, 1);
  assert.equal(observations[0].txHash, TX_HASH);
  assert.equal(observations[0].baseline.observer.marker, 'before-dispatch');
  assert.equal(observations[0].baseline.wallet_before_send.genesis_hash, GENESIS_HASH);
  assert.equal(observations[0].baseline.node_before_send.latest_block_hash, LATEST_BLOCK_HASH);
  assert.equal(parseJson(await http(info.origin, '/api/status', { cookie })).closed, true);
});

test('result without dispatch acknowledgement is observable but never a normal success', async (t) => {
  const observations = [];
  const prototype = createWalletGuardPrototypeServer({
    createControlledCallbackTransport: createWalletGuardControlledCallbackProviderTransport,
    createTrustedGateway: createWalletGuardTrustedProviderGateway,
    port: 0,
    commandTimeoutMs: 5_000,
    captureObservationBaseline: async () => Object.freeze({ marker: 'before-dispatch' }),
    captureNodeChainView: async () => nodeChainView(),
    observeTransaction: async (input) => {
      observations.push(input);
      return Object.freeze({
        status: 'MATCH_REFERENCE',
        transaction_hash: input.txHash,
        reference_only: true,
        external_world_proved: false,
      });
    },
  });
  const info = await prototype.listen();
  t.after(() => prototype.close());
  const { cookie } = await authenticate(info);
  await handshake(info, cookie);

  const allowPromise = http(info.origin, '/api/allow', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: '{}',
  });
  const command = await nextCommand(info, cookie);
  assert.equal((await bindView(info, cookie, command)).status, 204);
  assert.equal((await armView(info, cookie, command)).status, 204);

  const result = await http(info.origin, '/bridge/result', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: resultEnvelope(command),
  });
  assert.equal(result.status, 202);
  const operation = parseJson(result).operation;
  assert.equal(operation.cause_code, 'DISPATCH_ACK_UNAVAILABLE');
  assert.equal(operation.retry_allowed, false);
  assert.equal(operation.transaction_hash, TX_HASH);
  assert.equal(operation.reconciliation_status, 'OBSERVED');
  assert.equal(observations.length, 1);
  assert.equal(observations[0].txHash, TX_HASH);

  const allowed = await allowPromise;
  assert.equal(allowed.status, 202);
  assert.equal(parseJson(allowed).result, undefined);
  assert.equal(parseJson(allowed).operation.cause_code, 'DISPATCH_ACK_UNAVAILABLE');
});

test('missing dispatch signal times out AMBIGUOUS and reconciles one late wallet hash', async (t) => {
  const observations = [];
  const prototype = createWalletGuardPrototypeServer({
    createControlledCallbackTransport: createWalletGuardControlledCallbackProviderTransport,
    createTrustedGateway: createWalletGuardTrustedProviderGateway,
    port: 0,
    commandTimeoutMs: 1_000,
    captureObservationBaseline: async () => Object.freeze({ marker: 'before-dispatch' }),
    captureNodeChainView: async () => nodeChainView(),
    observeTransaction: async (input) => {
      observations.push(input);
      return Object.freeze({
        status: 'MATCH_REFERENCE',
        transaction_hash: input.txHash,
        reference_only: true,
        external_world_proved: false,
      });
    },
  });
  const info = await prototype.listen();
  t.after(() => prototype.close());
  const { cookie } = await authenticate(info);
  await handshake(info, cookie);

  const allowPromise = http(info.origin, '/api/allow', {
    method: 'POST', cookie, requestOrigin: info.origin, body: '{}',
  });
  const command = await nextCommand(info, cookie);
  assert.equal((await bindView(info, cookie, command)).status, 204);
  assert.equal((await armView(info, cookie, command)).status, 204);

  const timedOut = await allowPromise;
  assert.equal(timedOut.status, 202);
  const timedOutOperation = parseJson(timedOut).operation;
  assert.equal(timedOutOperation.status, 'AMBIGUOUS');
  assert.equal(timedOutOperation.cause_code, 'DISPATCH_ACK_TIMEOUT');
  assert.equal(timedOutOperation.retry_allowed, false);
  assert.equal(timedOutOperation.transaction_hash, null);
  assert.equal(timedOutOperation.reconciliation_status, 'AWAITING_LATE_RESULT');

  const statusAfterTimeout = parseJson(await http(info.origin, '/api/status', { cookie }));
  assert.equal(statusAfterTimeout.closed, true);
  assert.equal(statusAfterTimeout.command_pending, false);
  const retry = await http(info.origin, '/api/allow', {
    method: 'POST', cookie, requestOrigin: info.origin, body: '{}',
  });
  assert.equal(retry.status, 409);

  const lateEnvelope = resultEnvelope(command);
  const late = await http(info.origin, '/bridge/result', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: lateEnvelope,
  });
  assert.equal(late.status, 202);
  const lateOperation = parseJson(late).operation;
  assert.equal(lateOperation.cause_code, 'DISPATCH_ACK_TIMEOUT');
  assert.equal(lateOperation.retry_allowed, false);
  assert.equal(lateOperation.transaction_hash, TX_HASH);
  assert.equal(lateOperation.reconciliation_status, 'OBSERVED');
  assert.equal(lateOperation.observation.status, 'MATCH_REFERENCE');
  assert.equal(observations.length, 1);
  assert.equal(observations[0].txHash, TX_HASH);
  assert.equal(observations[0].baseline.observer.marker, 'before-dispatch');

  const replay = await http(info.origin, '/bridge/result', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: lateEnvelope,
  });
  assert.equal(replay.status, 409);
});

test('wallet error without dispatch acknowledgement closes ambiguous without a success', async (t) => {
  const prototype = createWalletGuardPrototypeServer({
    createControlledCallbackTransport: createWalletGuardControlledCallbackProviderTransport,
    createTrustedGateway: createWalletGuardTrustedProviderGateway,
    port: 0,
    commandTimeoutMs: 5_000,
    captureObservationBaseline: async () => Object.freeze({ marker: 'before-dispatch' }),
    captureNodeChainView: async () => nodeChainView(),
    observeTransaction: async () => assert.fail('observer must not run without a hash'),
  });
  const info = await prototype.listen();
  t.after(() => prototype.close());
  const { cookie } = await authenticate(info);
  await handshake(info, cookie);

  const allowPromise = http(info.origin, '/api/allow', {
    method: 'POST', cookie, requestOrigin: info.origin, body: '{}',
  });
  const command = await nextCommand(info, cookie);
  assert.equal((await bindView(info, cookie, command)).status, 204);
  assert.equal((await armView(info, cookie, command)).status, 204);
  const errorResult = await http(info.origin, '/bridge/result', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: JSON.stringify({
      schema_version: command.schema_version,
      session_id: command.session_id,
      sequence: command.sequence,
      request_id: command.request_id,
      observed_chain_id: command.expected_chain_id,
      observed_account: command.expected_account,
      outcome: 'error',
      result: null,
      error: { code: 'USER_REJECTED' },
    }),
  });
  assert.equal(errorResult.status, 202);
  const operation = parseJson(errorResult).operation;
  assert.equal(operation.cause_code, 'DISPATCH_ACK_UNAVAILABLE');
  assert.equal(operation.transaction_hash, null);
  assert.equal(operation.retry_allowed, false);
  assert.equal((await allowPromise).status, 202);
});

test('handshake rejects a MetaMask chain view that differs from the Node RPC view', async (t) => {
  const prototype = createWalletGuardPrototypeServer({
    createControlledCallbackTransport: createWalletGuardControlledCallbackProviderTransport,
    createTrustedGateway: createWalletGuardTrustedProviderGateway,
    port: 0,
    captureNodeChainView: async () => Object.freeze({
      ...nodeChainView(),
      genesis_hash: `0x${'f'.repeat(64)}`,
    }),
    observeTransaction: async () => assert.fail('observer must not run'),
  });
  const info = await prototype.listen();
  t.after(() => prototype.close());
  const { cookie } = await authenticate(info);

  const rejected = await http(info.origin, '/api/handshake', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: JSON.stringify({
      chain_id: '0x7a69',
      account: ACCOUNT,
      genesis_hash: GENESIS_HASH,
      latest_block_number: LATEST_BLOCK_NUMBER,
      latest_block_hash: LATEST_BLOCK_HASH,
    }),
  });
  assert.equal(rejected.status, 400);
  const status = parseJson(await http(info.origin, '/api/status', { cookie }));
  assert.equal(status.connected, false);
  assert.equal(status.chain_view_bound, false);
  assert.equal(status.sensitive_call_count, 0);
});

test('handshake completion respects intervening connection and closure', async (t) => {
  for (const transition of ['connected', 'closed']) {
    await t.test(transition, async (t) => {
      const entered = Promise.withResolvers();
      const resume = Promise.withResolvers();
      let captures = 0;
      let transports = 0;
      const prototype = createWalletGuardPrototypeServer({
        createControlledCallbackTransport(options) {
          transports += 1;
          return createWalletGuardControlledCallbackProviderTransport(options);
        },
        createTrustedGateway: createWalletGuardTrustedProviderGateway,
        captureNodeChainView: async () => {
          captures += 1;
          if (captures === 1) {
            entered.resolve();
            await resume.promise;
          }
          return nodeChainView();
        },
        observeTransaction: async () => assert.fail('no observation during handshake'),
      });
      const info = await prototype.listen();
      t.after(async () => {
        resume.resolve();
        await prototype.close();
      });
      const { cookie } = await authenticate(info);
      const pending = http(info.origin, '/api/handshake', {
        method: 'POST', cookie, requestOrigin: info.origin,
        body: JSON.stringify({
          chain_id: '0x7a69', account: ACCOUNT,
          genesis_hash: GENESIS_HASH,
          latest_block_number: LATEST_BLOCK_NUMBER,
          latest_block_hash: LATEST_BLOCK_HASH,
        }),
      });
      await entered.promise;
      if (transition === 'connected') {
        await handshake(info, cookie);
      } else {
        assert.equal((await http(info.origin, '/bridge/close', {
          method: 'POST', cookie, requestOrigin: info.origin,
          body: JSON.stringify({ code: 'BRIDGE_CLOSED' }),
        })).status, 204);
      }
      resume.resolve();
      assert.equal((await pending).status, 409);
      const status = parseJson(await http(info.origin, '/api/status', { cookie }));
      assert.equal(status.connected, transition === 'connected');
      assert.equal(status.closed, transition === 'closed');
      assert.equal(transports, transition === 'connected' ? 1 : 0);
      assert.equal(status.sensitive_call_count, 0);
      assert.equal(status.command_pending, false);
    });
  }
});

test('closure during baseline capture stops before gateway authorization', async (t) => {
  const entered = Promise.withResolvers();
  const resume = Promise.withResolvers();
  let gatewayCalls = 0;
  const prototype = createWalletGuardPrototypeServer({
    createControlledCallbackTransport: createWalletGuardControlledCallbackProviderTransport,
    createTrustedGateway: () => ({
      request() {
        gatewayCalls += 1;
        assert.fail('closed session must stop before gateway authorization');
      },
    }),
    captureNodeChainView: async () => nodeChainView(),
    captureObservationBaseline: async () => {
      entered.resolve();
      await resume.promise;
      return null;
    },
    observeTransaction: async () => assert.fail('no observation for a closed session'),
  });
  const info = await prototype.listen();
  t.after(async () => {
    resume.resolve();
    await prototype.close();
  });
  const { cookie } = await authenticate(info);
  await handshake(info, cookie);
  const pending = http(info.origin, '/api/allow', {
    method: 'POST', cookie, requestOrigin: info.origin, body: '{}',
  });
  await entered.promise;
  assert.equal((await http(info.origin, '/bridge/close', {
    method: 'POST', cookie, requestOrigin: info.origin,
    body: JSON.stringify({ code: 'BRIDGE_CLOSED' }),
  })).status, 204);
  resume.resolve();
  assert.equal((await pending).status, 409);
  assert.equal(gatewayCalls, 0);
  const status = parseJson(await http(info.origin, '/api/status', { cookie }));
  assert.equal(status.closed, true);
  assert.equal(status.command_pending, false);
  assert.equal(status.sensitive_call_count, 0);
});

test('pre-send view mismatch rejects before a wallet result and closes the session', async (t) => {
  let captureCount = 0;
  const prototype = createWalletGuardPrototypeServer({
    createControlledCallbackTransport: createWalletGuardControlledCallbackProviderTransport,
    createTrustedGateway: createWalletGuardTrustedProviderGateway,
    port: 0,
    commandTimeoutMs: 5_000,
    captureObservationBaseline: async () => Object.freeze({ marker: 'before-dispatch' }),
    captureNodeChainView: async () => {
      captureCount += 1;
      if (captureCount < 3) return nodeChainView();
      return Object.freeze({
        ...nodeChainView(),
        latest_block_hash: `0x${'f'.repeat(64)}`,
      });
    },
    observeTransaction: async () => assert.fail('observer must not run'),
  });
  const info = await prototype.listen();
  t.after(() => prototype.close());
  const { cookie } = await authenticate(info);
  await handshake(info, cookie);

  const allowPromise = http(info.origin, '/api/allow', {
    method: 'POST',
    cookie,
    requestOrigin: info.origin,
    body: '{}',
  });
  const command = await nextCommand(info, cookie);
  const rejected = await bindView(info, cookie, command);
  assert.equal(rejected.status, 409);
  const allowed = await allowPromise;
  assert.equal(allowed.status, 400);
  const status = parseJson(await http(info.origin, '/api/status', { cookie }));
  assert.equal(status.closed, true);
  assert.equal(status.command_pending, false);
  assert.equal(status.observation, null);
});

// Durable composition uses a real private local journal. Hooks only control
// trusted storage completion timing; no wallet or RPC is contacted.
const fs = await import('node:fs/promises');
const { tmpdir } = await import('node:os');
const { join } = await import('node:path');
const { createWalletGuardDurableOperationJournal } = await import(
  '../../applications/blockchain-digital-assets/wallet-guard/prototype/durable-operation-journal.mjs'
);

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function storageLatch() {
  const entered = deferred();
  const released = deferred();
  const hold = async () => { entered.resolve(); await released.promise; };
  hold.release = released.resolve;
  return { entered: entered.promise, release: released.resolve, hold };
}

async function within(promise, ms = 2_500) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('bounded server outcome did not settle')), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function durableHarness(t, { hooks = {}, commandTimeoutMs = 1_000 } = {}) {
  const directory = await fs.mkdtemp(join(tmpdir(), 'wg-server-journal-'));
  const journalPath = join(directory, 'operation.json');
  const journal = createWalletGuardDurableOperationJournal({
    journalPath, network: 'anvil', chainId: '0x7a69',
  });
  await journal.initialize();
  const calls = { arm: 0, markDispatched: 0, retainHash: 0, observations: 0 };
  const wrapped = { ...journal };
  for (const method of ['arm', 'markDispatched', 'retainHash']) {
    wrapped[method] = async (...args) => {
      calls[method] += 1;
      if (hooks[method]) await hooks[method]({ journalPath });
      return journal[method](...args);
    };
  }
  const disk = async () => JSON.parse(await fs.readFile(journalPath, 'utf8'));
  const prototype = createWalletGuardPrototypeServer({
    createControlledCallbackTransport: createWalletGuardControlledCallbackProviderTransport,
    createTrustedGateway: createWalletGuardTrustedProviderGateway,
    operationJournal: wrapped,
    commandTimeoutMs,
    captureNodeChainView: async () => nodeChainView(),
    captureObservationBaseline: async () => ({
      chain_id: '0x7a69', block_number: '0x5', account_nonce: '0x0',
    }),
    observeTransaction: async ({ txHash }) => {
      calls.observations += 1;
      const record = await disk();
      assert.equal(record.state, 'HASH_OBSERVED');
      assert.equal(record.operation.transaction_hash, txHash);
      return { status: 'MATCH_REFERENCE', transaction_hash: txHash, reference_only: true };
    },
  });
  t.after(async () => {
    for (const hook of Object.values(hooks)) hook.release?.();
    await prototype.close();
    await fs.rm(directory, { recursive: true, force: true });
  });
  const info = await prototype.listen();
  const { cookie } = await authenticate(info);
  await handshake(info, cookie);
  const post = (path, body = '{}') => http(info.origin, path, {
    method: 'POST', cookie, requestOrigin: info.origin, body,
  });
  const allowed = post('/api/allow');
  const command = await nextCommand(info, cookie);
  assert.equal((await bindView(info, cookie, command)).status, 204);
  return {
    info, cookie, command, allowed, journal, journalPath, prototype, calls, disk, post,
    status: async () => parseJson(await http(info.origin, '/api/status', { cookie })),
    arm: () => armView(info, cookie, command),
    dispatch: () => signalDispatched(info, cookie, command),
    result: (options) => post('/bridge/result', resultEnvelope(command, options)),
    settle: (receipt) => settleResult(info, cookie, command, receipt),
    closeBridge: () => post('/bridge/close', JSON.stringify({ code: 'CONTEXT_CHANGED' })),
  };
}

test('durable server acknowledgements and observer follow disk facts and one-use settlement', async (t) => {
  const arm = storageLatch();
  const dispatch = storageLatch();
  const hash = storageLatch();
  const h = await durableHarness(t, {
    commandTimeoutMs: 5_000,
    hooks: { arm: arm.hold, markDispatched: dispatch.hold, retainHash: hash.hold },
  });
  t.after(() => { arm.release(); dispatch.release(); hash.release(); });
  let acked = false;
  const arming = h.arm().then((r) => { acked = true; return r; });
  await arm.entered;
  assert.equal(acked, false);
  assert.equal((await h.disk()).state, 'READY');
  assert.equal((await h.arm()).status, 409);
  assert.equal((await h.dispatch()).status, 409);
  arm.release();
  assert.equal((await arming).status, 204);
  assert.equal((await h.disk()).state, 'ARMED');
  const dispatching = h.dispatch();
  await dispatch.entered;
  assert.equal((await h.disk()).state, 'ARMED');
  assert.equal((await h.dispatch()).status, 409);
  dispatch.release();
  assert.equal((await dispatching).status, 204);
  assert.equal((await h.disk()).state, 'DISPATCHED');
  let received = false;
  const retaining = h.result().then((r) => { received = true; return r; });
  await hash.entered;
  assert.equal(received, false);
  assert.equal((await h.disk()).operation.transaction_hash, null);
  assert.equal((await h.result({ txHash: `0x${'b'.repeat(64)}` })).status, 409);
  assert.equal(h.calls.observations, 0);
  hash.release();
  const retained = await retaining;
  assert.equal(retained.status, 200);
  const record = await h.disk();
  assert.equal(record.state, 'HASH_OBSERVED');
  assert.equal(record.operation.request_id, h.command.request_id);
  assert.equal(record.operation.transaction_hash, TX_HASH);
  assert.equal(record.operation.baseline_account_nonce, '0x0');
  assert.equal(h.calls.observations, 0);
  assert.equal((await h.settle('0'.repeat(64))).status, 400);
  const receipt = parseJson(retained).receipt;
  assert.equal((await h.settle(receipt)).status, 204);
  assert.equal((await h.settle(receipt)).status, 409);
  const completed = await h.allowed;
  assert.equal(completed.status, 200);
  assert.equal(parseJson(completed).observation.status, 'MATCH_REFERENCE');
  assert.deepEqual(h.calls, { arm: 1, markDispatched: 1, retainHash: 1, observations: 1 });
  assert.equal((await h.disk()).state, 'HASH_OBSERVED');
  assert.equal((await h.disk()).terminal, null);
});

test('closure and timeout during each durable write never acknowledge a stale phase', async (t) => {
  for (const method of ['arm', 'markDispatched', 'retainHash']) {
    for (const ending of ['close', 'timeout']) {
      await t.test(`${method} / ${ending}`, async (t) => {
        const latch = storageLatch();
        const h = await durableHarness(t, { hooks: { [method]: latch.hold } });
        t.after(latch.release);
        if (method !== 'arm') assert.equal((await h.arm()).status, 204);
        if (method === 'retainHash') assert.equal((await h.dispatch()).status, 204);
        const writing = method === 'arm' ? h.arm()
          : method === 'markDispatched' ? h.dispatch() : h.result();
        await latch.entered;
        if (ending === 'close') assert.equal((await h.closeBridge()).status, 204);
        const allowed = await within(h.allowed);
        assert.equal(allowed.status, 202);
        assert.equal(parseJson(allowed).operation.status, 'AMBIGUOUS');
        assert.equal(h.calls.observations, 0);
        assert.equal((await h.post('/api/allow')).status, 409);
        // Hash retention after closure is queued behind arm/dispatch. A second
        // result cannot replace it while the storage operation remains pending.
        const late = method === 'retainHash' ? null : h.result();
        if (late !== null) {
          for (let n = 0; n < 100; n += 1) {
            if ((await h.status()).ambiguous.transaction_hash !== null) break;
            await new Promise((resolve) => setTimeout(resolve, 5));
          }
          assert.equal((await h.status()).ambiguous.transaction_hash, TX_HASH);
          assert.equal((await h.result()).status, 409);
        }
        latch.release();
        const completed = await writing;
        assert.equal(completed.status, method === 'retainHash' ? 202 : 409);
        if (late !== null) assert.equal((await late).status, 202);
        assert.equal((await h.disk()).state, 'HASH_OBSERVED');
        assert.equal((await h.disk()).operation.transaction_hash, TX_HASH);
        assert.equal(h.calls.retainHash, 1);
        assert.equal(h.calls.observations, 1);
        assert.equal((await h.status()).ambiguous.status, 'AMBIGUOUS');
        assert.equal((await h.status()).ambiguous.observation.status, 'MATCH_REFERENCE');
      });
    }
  }
});

test('storage failure in any fact closes and settles without observation or retry', async (t) => {
  for (const method of ['arm', 'markDispatched', 'retainHash']) {
    await t.test(method, async (t) => {
      const h = await durableHarness(t, {
        hooks: { [method]: ({ journalPath }) => fs.chmod(journalPath, 0o644) },
      });
      if (method !== 'arm') await h.arm();
      if (method === 'retainHash') await h.dispatch();
      const failed = method === 'arm' ? await h.arm()
        : method === 'markDispatched' ? await h.dispatch() : await h.result();
      assert.equal(failed.status, 400);
      assert.equal((await within(h.allowed)).status, 202);
      assert.equal(h.journal.status().lifecycle, 'FAULTED');
      assert.equal(h.calls.observations, 0);
      const status = await h.status();
      assert.equal(status.closed, true);
      assert.equal(status.command_pending, false);
      assert.equal(status.journal_failed, true);
      assert.equal(status.ambiguous.reconciliation_status, 'JOURNAL_WRITE_FAILED');
      if (method === 'retainHash') {
        assert.equal(status.ambiguous.transaction_hash, TX_HASH);
        assert.equal((await h.disk()).state, 'DISPATCHED');
        assert.equal((await h.disk()).operation.transaction_hash, null);
      }
      await fs.chmod(h.journalPath, 0o600);
      assert.equal((await h.post('/api/allow')).status, 409);
      assert.equal((await h.result()).status, 409);
      assert.equal(h.calls.observations, 0);
    });
  }
});

test('result during durable dispatch waits behind it and remains ambiguous', async (t) => {
  const latch = storageLatch();
  const h = await durableHarness(t, { hooks: { markDispatched: latch.hold } });
  t.after(latch.release);
  await h.arm();
  const dispatching = h.dispatch();
  await latch.entered;
  const result = h.result();
  assert.equal((await within(h.allowed)).status, 202);
  assert.equal(h.calls.retainHash, 0);
  assert.equal(h.calls.observations, 0);
  latch.release();
  assert.equal((await dispatching).status, 409);
  assert.equal((await result).status, 202);
  assert.equal((await h.status()).ambiguous.cause_code, 'DISPATCH_ACK_UNAVAILABLE');
  assert.equal((await h.disk()).state, 'HASH_OBSERVED');
  assert.equal(h.calls.retainHash, 1);
  assert.equal(h.calls.observations, 1);
});

test('durable changed-context and missing-ack hashes are retained before ambiguous observation', async (t) => {
  for (const kind of ['context', 'missing_ack']) {
    await t.test(kind, async (t) => {
      const h = await durableHarness(t);
      await h.arm();
      if (kind === 'context') await h.dispatch();
      const result = await h.result(kind === 'context' ? { chainId: '0x1' } : undefined);
      assert.equal(result.status, 202);
      assert.equal((await h.allowed).status, 202);
      assert.equal((await h.disk()).operation.transaction_hash, TX_HASH);
      assert.equal(h.calls.observations, 1);
      assert.equal((await h.status()).ambiguous.status, 'AMBIGUOUS');
    });
  }
});

test('server close drains retained-hash write before journal ownership release', async (t) => {
  const latch = storageLatch();
  const h = await durableHarness(t, { hooks: { retainHash: latch.hold } });
  t.after(latch.release);
  await h.arm();
  await h.dispatch();
  const result = h.result();
  await latch.entered;
  let closed = false;
  const closing = h.prototype.close().then(() => { closed = true; });
  assert.equal((await within(h.allowed)).status, 202);
  assert.equal(closed, false);
  await fs.stat(h.journalPath + '.lock');
  latch.release();
  assert.equal((await result).status, 202);
  await closing;
  assert.equal(h.journal.status().lifecycle, 'CLOSED');
  await assert.rejects(fs.stat(h.journalPath + '.lock'), { code: 'ENOENT' });
  assert.equal((await h.disk()).operation.transaction_hash, TX_HASH);
});

test('failed queued arm prevents late-hash observation even after callback timeout', async (t) => {
  const latch = storageLatch();
  const armHook = async ({ journalPath }) => {
    await latch.hold();
    await fs.chmod(journalPath, 0o644);
  };
  armHook.release = latch.release;
  const h = await durableHarness(t, { hooks: { arm: armHook } });
  const arming = h.arm();
  await latch.entered;
  assert.equal((await within(h.allowed)).status, 202);
  const late = h.result();
  for (let n = 0; n < 100; n += 1) {
    if ((await h.status()).ambiguous.transaction_hash !== null) break;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.equal((await h.status()).ambiguous.transaction_hash, TX_HASH);
  latch.release();
  assert.equal((await arming).status, 400);
  assert.equal((await late).status, 202);
  assert.equal(h.calls.retainHash, 0);
  assert.equal(h.calls.observations, 0);
  assert.equal((await h.disk()).state, 'READY');
  assert.equal((await h.status()).ambiguous.reconciliation_status, 'JOURNAL_WRITE_FAILED');
});

test('durable user rejection requires settlement and records no false hash or terminal success', async (t) => {
  const h = await durableHarness(t);
  await h.arm();
  await h.dispatch();
  const envelope = JSON.parse(resultEnvelope(h.command));
  Object.assign(envelope, { outcome: 'error', result: null, error: { code: 'USER_REJECTED' } });
  const retained = await h.post('/bridge/result', JSON.stringify(envelope));
  assert.equal(retained.status, 200);
  assert.equal((await h.settle(parseJson(retained).receipt)).status, 204);
  assert.equal((await within(h.allowed)).status, 400);
  assert.equal((await h.disk()).state, 'DISPATCHED');
  assert.equal((await h.disk()).operation.transaction_hash, null);
  assert.equal((await h.disk()).terminal, null);
  assert.equal(h.calls.retainHash, 0);
  assert.equal(h.calls.observations, 0);
});

const { spawn } = await import('node:child_process');
const BOOTSTRAP = new URL(
  '../../applications/blockchain-digital-assets/wallet-guard/prototype/bootstrap.mjs',
  import.meta.url,
);

function bootstrapChild(t, env) {
  const configured = { ...process.env, ...env };
  for (const [key, value] of Object.entries(configured)) {
    if (value === undefined) delete configured[key];
  }
  const child = spawn(process.execPath, ['--unhandled-rejections=strict', BOOTSTRAP.pathname], {
    env: configured, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const launched = deferred();
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (data) => {
    stdout += data;
    if (stdout.includes('Open exactly once:')) launched.resolve();
  });
  child.stderr.on('data', (data) => { stderr += data; });
  const exit = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    await exit;
  });
  return { child, launched: launched.promise, exit };
}

test('bootstrap initializes before launch and refuses missing or previously used journal paths', async (t) => {
  const directory = await fs.mkdtemp(join(tmpdir(), 'wg-bootstrap-journal-'));
  const journalPath = join(directory, 'operation.json');
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const missing = bootstrapChild(t, { POMRX_WG_JOURNAL: undefined });
  const missingExit = await within(missing.exit);
  assert.notEqual(missingExit.code, 0);
  assert.equal(missingExit.stdout, '');
  const first = bootstrapChild(t, { POMRX_WG_JOURNAL: journalPath });
  await within(first.launched);
  assert.equal(JSON.parse(await fs.readFile(journalPath, 'utf8')).state, 'READY');
  await fs.stat(journalPath + '.lock');
  first.child.kill('SIGTERM');
  assert.equal((await within(first.exit)).code, 0);
  await assert.rejects(fs.stat(journalPath + '.lock'), { code: 'ENOENT' });
  const repeated = bootstrapChild(t, { POMRX_WG_JOURNAL: journalPath });
  const repeatedExit = await within(repeated.exit);
  assert.notEqual(repeatedExit.code, 0);
  assert.equal(repeatedExit.stdout, '');
  assert.match(repeatedExit.stderr, /POMRX_WG_JOURNAL_RECOVERY_REQUIRED:READY/u);
});

test('bootstrap releases journal ownership after server configuration failure', async (t) => {
  const directory = await fs.mkdtemp(join(tmpdir(), 'wg-bootstrap-failed-'));
  const journalPath = join(directory, 'operation.json');
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const failed = bootstrapChild(t, {
    POMRX_WG_JOURNAL: journalPath,
    POMRX_WG_ANVIL_RPC: 'https://127.0.0.1:8545/',
  });
  const result = await within(failed.exit);
  assert.notEqual(result.code, 0);
  assert.equal(result.stdout, '');
  assert.equal(JSON.parse(await fs.readFile(journalPath, 'utf8')).state, 'READY');
  await assert.rejects(fs.stat(journalPath + '.lock'), { code: 'ENOENT' });
});
