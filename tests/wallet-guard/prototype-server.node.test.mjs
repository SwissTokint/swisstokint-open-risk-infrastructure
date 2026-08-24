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
  assert.equal(delivered.status, 204);

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
