import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer, request as requestHttp } from 'node:http';

import {
  parseWalletGuardBoundedJsonData,
} from '../json-ingress.mjs';
import {
  parseWalletGuardBridgeResponse,
  serializeWalletGuardBridgeCommand,
} from '../bridge-json-envelope.mjs';

const LOOPBACK_HOST = '127.0.0.1';
const ANVIL_CHAIN_ID = '0x7a69';
const MAX_BODY_BYTES = 64 * 1024;
const ACCOUNT_PATTERN = /^0x[0-9a-f]{40}$/u;
const TX_HASH_PATTERN = /^0x[0-9a-f]{64}$/u;
const BLOCK_HASH_PATTERN = TX_HASH_PATTERN;
const TOKEN = `0x${'2'.repeat(40)}`;
const SPENDER = `0x${'3'.repeat(40)}`;
const MAX_UINT256 = 'f'.repeat(64);
const APPROVE_MAX_DATA = `0x095ea7b3${'0'.repeat(24)}${SPENDER.slice(2)}${MAX_UINT256}`;
const PUBLIC_DIR = new URL('./public/', import.meta.url);

function randomHex32() {
  return randomBytes(32).toString('hex');
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length
      || actual.some((key, index) => key !== wanted[index])) {
    throw new TypeError(`${label} has missing or unknown fields`);
  }
}

function send(res, status, body = '', contentType = 'text/plain; charset=utf-8', extra = {}) {
  res.writeHead(status, {
    'cache-control': 'no-store',
    'content-security-policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': 'same-origin',
    'content-type': contentType,
    'referrer-policy': 'no-referrer',
    'x-frame-options': 'DENY',
    'x-content-type-options': 'nosniff',
    ...extra,
  });
  res.end(body);
}

function sendJson(res, status, value) {
  send(res, status, JSON.stringify(value), 'application/json; charset=utf-8');
}

async function readStrictBody(req) {
  if (req.headers['content-type'] !== 'application/json') {
    throw new TypeError('content-type must be exactly application/json');
  }
  if (req.headers['transfer-encoding'] !== undefined) {
    throw new TypeError('transfer-encoding is not accepted');
  }
  const rawLength = req.headers['content-length'];
  if (typeof rawLength !== 'string' || !/^(?:0|[1-9][0-9]*)$/u.test(rawLength)) {
    throw new TypeError('one canonical content-length is required');
  }
  const length = Number(rawLength);
  if (!Number.isSafeInteger(length) || length < 2 || length > MAX_BODY_BYTES) {
    throw new TypeError('request body length is outside bounds');
  }
  const chunks = [];
  let received = 0;
  for await (const chunk of req) {
    received += chunk.length;
    if (received > length || received > MAX_BODY_BYTES) {
      throw new TypeError('request body exceeds declared bounds');
    }
    chunks.push(chunk);
  }
  if (received !== length) throw new TypeError('request body is truncated');
  return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
}

function hasSessionCookie(req, token) {
  const raw = req.headers.cookie;
  if (typeof raw !== 'string' || raw.length > 4_096) return false;
  const matches = raw.split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith('wg_session='));
  return matches.length === 1 && matches[0] === `wg_session=${token}`;
}

function assertSameOriginPost(req, origin) {
  if (req.headers.origin !== origin) throw new TypeError('origin mismatch');
  if (req.headers['sec-fetch-site'] !== 'same-origin') {
    throw new TypeError('cross-site request rejected');
  }
}

function assertSameOriginBridgeFetch(req) {
  if (req.headers['sec-fetch-site'] !== 'same-origin'
      || req.headers['sec-fetch-mode'] !== 'cors'
      || req.headers['sec-fetch-dest'] !== 'empty') {
    throw new TypeError('bridge fetch metadata rejected');
  }
}

function policyFor(account, origin) {
  return {
    schema_version: 'wallet-guard-policy/0.1',
    policy_id: 'wallet-guard-anvil-burner/0.1',
    enabled: true,
    kill_switch: false,
    expected_chain_id: ANVIL_CHAIN_ID,
    allowed_origins: [origin],
    allowed_targets: [],
    allowed_recipients: [account],
    allowed_spenders: [],
    allowed_typed_data_verifying_contracts: [],
    max_native_value: '0',
    max_token_amount: '0',
    deny_unlimited_allowance: true,
    deny_operator_approval: true,
    require_simulation_for: [],
  };
}

function referenceAuthorizationSupplier() {
  let sequence = 0;
  return (summary) => {
    sequence += 1;
    const validUntil = new Date(Date.parse(summary.issued_at) + 60_000).toISOString();
    return {
      run_id: `run-anvil-prototype-${String(sequence).padStart(8, '0')}`,
      agent_ref: 'agent-anvil-prototype-01',
      subject_ref: 'subject-anvil-burner-01',
      preflight_receipt_hash: sequence.toString(16).padStart(64, '0'),
      witness_ack_hash: (sequence + 1_000).toString(16).padStart(64, '0'),
      source_key_id: `ed25519-${'a'.repeat(32)}`,
      witness_key_id: `ed25519-${'b'.repeat(32)}`,
      verification_profile: 'pom-rx-v0.1/strict-errata-1',
      verifier_version: 'pom-rx-v0.1-strict-verifier/1',
      implementation_artifact_sha256: '3'.repeat(64),
      effective_verification_policy_sha256: '4'.repeat(64),
      witness_valid_until: validUntil,
    };
  };
}

function denyRequest(account) {
  return {
    method: 'eth_sendTransaction',
    params: [{
      from: account,
      to: TOKEN,
      value: '0x0',
      data: APPROVE_MAX_DATA,
    }],
  };
}

function allowRequest(account) {
  return {
    method: 'eth_sendTransaction',
    params: [{
      from: account,
      to: account,
      value: '0x0',
      data: '0x',
    }],
  };
}

function canonicalLoopbackRpcUrl(rpcUrl) {
  const url = new URL(rpcUrl);
  if (url.protocol !== 'http:' || url.hostname !== LOOPBACK_HOST || url.username
      || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new TypeError('prototype RPC must be an exact loopback HTTP root');
  }
  const port = Number(url.port || 80);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new TypeError('prototype RPC port is invalid');
  }
  return `http://${LOOPBACK_HOST}:${String(port)}/`;
}

function rpcCall(rpcUrl, id, method, params) {
  const url = new URL(canonicalLoopbackRpcUrl(rpcUrl));
  const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params });
  return new Promise((resolve, reject) => {
    const request = requestHttp({
      hostname: LOOPBACK_HOST,
      port: Number(url.port || 80),
      path: '/',
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload),
      },
      timeout: 2_000,
    }, (response) => {
      const chunks = [];
      let length = 0;
      response.on('data', (chunk) => {
        length += chunk.length;
        if (length > MAX_BODY_BYTES) response.destroy(new Error('RPC response too large'));
        else chunks.push(chunk);
      });
      response.on('end', () => {
        try {
          if (response.statusCode !== 200) throw new Error('RPC status is not 200');
          const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if (!parsed || parsed.jsonrpc !== '2.0' || parsed.id !== id
              || Object.hasOwn(parsed, 'error') || !Object.hasOwn(parsed, 'result')) {
            throw new Error('RPC response is invalid');
          }
          resolve(parsed.result);
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on('timeout', () => request.destroy(new Error('RPC timeout')));
    request.on('error', reject);
    request.end(payload);
  });
}

function canonicalQuantity(value, label) {
  if (typeof value !== 'string' || !/^0x(?:0|[1-9a-f][0-9a-f]*)$/u.test(value)) {
    throw new Error(`${label} is not a canonical quantity`);
  }
  return BigInt(value);
}

function validateChainView(value, label) {
  exactKeys(
    value,
    ['chain_id', 'genesis_hash', 'latest_block_number', 'latest_block_hash'],
    label,
  );
  if (value.chain_id !== ANVIL_CHAIN_ID
      || typeof value.genesis_hash !== 'string'
      || !BLOCK_HASH_PATTERN.test(value.genesis_hash)
      || typeof value.latest_block_hash !== 'string'
      || !BLOCK_HASH_PATTERN.test(value.latest_block_hash)) {
    throw new TypeError(`${label} is invalid`);
  }
  canonicalQuantity(value.latest_block_number, `${label} latest block number`);
  return Object.freeze({
    chain_id: value.chain_id,
    genesis_hash: value.genesis_hash,
    latest_block_number: value.latest_block_number,
    latest_block_hash: value.latest_block_hash,
  });
}

function sameChainView(left, right) {
  return left.chain_id === right.chain_id
    && left.genesis_hash === right.genesis_hash
    && left.latest_block_number === right.latest_block_number
    && left.latest_block_hash === right.latest_block_hash;
}

async function defaultCaptureNodeChainView({ rpcUrl }) {
  const chainId = await rpcCall(rpcUrl, 101, 'eth_chainId', []);
  const genesis = await rpcCall(rpcUrl, 102, 'eth_getBlockByNumber', ['0x0', false]);
  const latestBlockNumber = await rpcCall(rpcUrl, 103, 'eth_blockNumber', []);
  const latest = await rpcCall(
    rpcUrl,
    104,
    'eth_getBlockByNumber',
    [latestBlockNumber, false],
  );
  if (!genesis || genesis.number !== '0x0'
      || !latest || latest.number !== latestBlockNumber) {
    throw new Error('observer chain view is incoherent');
  }
  return validateChainView({
    chain_id: chainId,
    genesis_hash: genesis.hash,
    latest_block_number: latestBlockNumber,
    latest_block_hash: latest.hash,
  }, 'observer chain view');
}

async function defaultCaptureObservationBaseline({ rpcUrl, account }) {
  const chainId = await rpcCall(rpcUrl, 1, 'eth_chainId', []);
  if (chainId !== ANVIL_CHAIN_ID) throw new Error('observer chain mismatch before forwarding');
  const blockNumber = await rpcCall(rpcUrl, 2, 'eth_blockNumber', []);
  const accountNonce = await rpcCall(rpcUrl, 3, 'eth_getTransactionCount', [account, 'latest']);
  canonicalQuantity(blockNumber, 'observer baseline block');
  canonicalQuantity(accountNonce, 'observer baseline nonce');
  return Object.freeze({ chain_id: chainId, block_number: blockNumber, account_nonce: accountNonce });
}

async function defaultObserveTransaction({ rpcUrl, txHash, account, baseline }) {
  const observerBaseline = baseline?.observer ?? baseline;
  if (!observerBaseline || observerBaseline.chain_id !== ANVIL_CHAIN_ID) {
    throw new Error('observer baseline is unavailable');
  }
  const chainId = await rpcCall(rpcUrl, 1, 'eth_chainId', []);
  if (chainId !== ANVIL_CHAIN_ID) throw new Error('observer chain mismatch');
  let receipt = null;
  let transaction = null;
  for (let attempt = 0; attempt < 40 && receipt === null; attempt += 1) {
    receipt = await rpcCall(rpcUrl, attempt + 2, 'eth_getTransactionReceipt', [txHash]);
    if (receipt === null) await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (receipt !== null) {
    transaction = await rpcCall(rpcUrl, 50, 'eth_getTransactionByHash', [txHash]);
  }
  if (!receipt || receipt.transactionHash?.toLowerCase() !== txHash
      || receipt.status !== '0x1'
      || typeof receipt.blockHash !== 'string'
      || !TX_HASH_PATTERN.test(receipt.blockHash)
      || receipt.from?.toLowerCase() !== account
      || receipt.to?.toLowerCase() !== account
      || !transaction
      || transaction.hash?.toLowerCase() !== txHash
      || transaction.from?.toLowerCase() !== account
      || transaction.to?.toLowerCase() !== account
      || transaction.chainId !== ANVIL_CHAIN_ID
      || transaction.value !== '0x0'
      || !['0x', '0x0'].includes(transaction.input)
      || transaction.blockNumber !== receipt.blockNumber
      || transaction.blockHash !== receipt.blockHash
      || canonicalQuantity(transaction.blockNumber, 'observed transaction block')
        <= canonicalQuantity(observerBaseline.block_number, 'observer baseline block')
      || canonicalQuantity(transaction.nonce, 'observed transaction nonce')
        !== canonicalQuantity(observerBaseline.account_nonce, 'observer baseline nonce')) {
    throw new Error('Anvil receipt does not match the expected self-transfer');
  }
  return Object.freeze({
    status: 'MATCH_REFERENCE',
    chain_id: chainId,
    transaction_hash: txHash,
    block_hash: receipt.blockHash,
    block_number: receipt.blockNumber,
    receipt_status: receipt.status,
    from: receipt.from.toLowerCase(),
    to: receipt.to.toLowerCase(),
    reference_only: true,
    external_world_proved: false,
  });
}

const BRIDGE_RESPONSE_KEYS = Object.freeze([
  'schema_version',
  'session_id',
  'sequence',
  'request_id',
  'observed_chain_id',
  'observed_account',
  'outcome',
  'result',
  'error',
]);

function bridgeExpectedIdentity(command) {
  return {
    session_id: command.session_id,
    sequence: command.sequence,
    request_id: command.request_id,
    expected_chain_id: command.expected_chain_id,
    expected_account: command.expected_account,
  };
}

function extractBoundTransactionCandidate(raw, command) {
  const input = parseWalletGuardBoundedJsonData(raw);
  exactKeys(input, BRIDGE_RESPONSE_KEYS, 'bridge result candidate');
  if (input.schema_version !== command.schema_version
      || input.session_id !== command.session_id
      || input.sequence !== command.sequence
      || input.request_id !== command.request_id
      || input.outcome !== 'result'
      || typeof input.result !== 'string'
      || !TX_HASH_PATTERN.test(input.result)
      || input.error !== null
      || typeof input.observed_chain_id !== 'string'
      || typeof input.observed_account !== 'string') {
    throw new TypeError('late bridge result candidate is not bound to the command');
  }
  return Object.freeze({
    transaction_hash: input.result,
    observed_chain_id: input.observed_chain_id,
    observed_account: input.observed_account,
    context_matches: input.observed_chain_id === command.expected_chain_id
      && input.observed_account === command.expected_account,
  });
}

function parseBoundWalletView(raw, command) {
  const input = parseWalletGuardBoundedJsonData(raw);
  exactKeys(input, [
    'schema_version',
    'session_id',
    'sequence',
    'request_id',
    'chain_id',
    'account',
    'genesis_hash',
    'latest_block_number',
    'latest_block_hash',
  ], 'wallet chain view');
  if (input.schema_version !== command.schema_version
      || input.session_id !== command.session_id
      || input.sequence !== command.sequence
      || input.request_id !== command.request_id
      || input.chain_id !== command.expected_chain_id
      || input.account !== command.expected_account) {
    throw new TypeError('wallet chain view is not bound to the pending command');
  }
  return Object.freeze({
    account: input.account,
    ...validateChainView({
      chain_id: input.chain_id,
      genesis_hash: input.genesis_hash,
      latest_block_number: input.latest_block_number,
      latest_block_hash: input.latest_block_hash,
    }, 'wallet chain view'),
  });
}

function parseBoundCommandIdentity(raw, command, label) {
  const input = parseWalletGuardBoundedJsonData(raw);
  exactKeys(input, [
    'schema_version',
    'session_id',
    'sequence',
    'request_id',
  ], label);
  if (input.schema_version !== command.schema_version
      || input.session_id !== command.session_id
      || input.sequence !== command.sequence
      || input.request_id !== command.request_id) {
    throw new TypeError(`${label} is not bound to the pending command`);
  }
  return input;
}

export function createWalletGuardPrototypeServer({
  createControlledCallbackTransport,
  createTrustedGateway,
  port = 0,
  rpcUrl = 'http://127.0.0.1:8545/',
  commandTimeoutMs = 90_000,
  observeTransaction = defaultObserveTransaction,
  captureObservationBaseline = null,
  captureNodeChainView = defaultCaptureNodeChainView,
} = {}) {
  if (typeof createControlledCallbackTransport !== 'function'
      || typeof createTrustedGateway !== 'function'
      || !Number.isSafeInteger(port) || port < 0 || port > 65_535
      || !Number.isSafeInteger(commandTimeoutMs)
      || commandTimeoutMs < 1_000 || commandTimeoutMs > 300_000
      || typeof observeTransaction !== 'function'
      || (captureObservationBaseline !== null && typeof captureObservationBaseline !== 'function')
      || typeof captureNodeChainView !== 'function') {
    throw new TypeError('prototype server bootstrap is invalid');
  }
  const canonicalRpcUrl = canonicalLoopbackRpcUrl(rpcUrl);
  const captureBaseline = captureObservationBaseline
    ?? (observeTransaction === defaultObserveTransaction
      ? defaultCaptureObservationBaseline
      : async () => null);
  const captureValidatedNodeChainView = async (account) => validateChainView(
    await captureNodeChainView({ rpcUrl: canonicalRpcUrl, account }),
    'captured Node chain view',
  );

  const state = {
    token: randomHex32(),
    bootstrapUsed: false,
    origin: null,
    connected: false,
    closed: false,
    account: null,
    transport: null,
    gateway: null,
    pending: null,
    lastSensitivePending: null,
    ambiguous: null,
    operationInFlight: false,
    activeObservationBaseline: null,
    connectionChainViewBaseline: null,
    lastObservation: null,
  };

  function ambiguousView() {
    if (state.ambiguous === null) return null;
    return {
      status: state.ambiguous.status,
      cause_code: state.ambiguous.cause_code,
      retry_allowed: state.ambiguous.retry_allowed,
      session_id: state.ambiguous.session_id,
      sequence: state.ambiguous.sequence,
      request_id: state.ambiguous.request_id,
      transaction_hash: state.ambiguous.transaction_hash,
      observed_chain_id: state.ambiguous.observed_chain_id,
      observed_account: state.ambiguous.observed_account,
      context_matches: state.ambiguous.context_matches,
      reconciliation_status: state.ambiguous.reconciliation_status,
      observation: state.ambiguous.observation,
    };
  }

  function reconcileAmbiguousCandidate(candidate) {
    const ambiguous = state.ambiguous;
    if (ambiguous === null || ambiguous.transaction_hash !== null) {
      throw new TypeError('ambiguous command already has a transaction candidate');
    }
    ambiguous.transaction_hash = candidate.transaction_hash;
    ambiguous.observed_chain_id = candidate.observed_chain_id;
    ambiguous.observed_account = candidate.observed_account;
    ambiguous.context_matches = candidate.context_matches;
    ambiguous.reconciliation_status = 'OBSERVING';
    ambiguous.reconciliationPromise = (async () => {
      try {
        const observation = await observeTransaction({
          rpcUrl: canonicalRpcUrl,
          txHash: candidate.transaction_hash,
          account: state.account,
          baseline: ambiguous.baseline,
        });
        ambiguous.observation = observation;
        ambiguous.reconciliation_status = 'OBSERVED';
        state.lastObservation = observation;
      } catch (error) {
        const observation = Object.freeze({
          status: 'AMBIGUOUS',
          detail: error instanceof Error ? error.message : 'observer failed',
          transaction_hash: candidate.transaction_hash,
          reference_only: true,
          external_world_proved: false,
        });
        ambiguous.observation = observation;
        ambiguous.reconciliation_status = 'OBSERVATION_FAILED';
        state.lastObservation = observation;
      }
    })();
    return ambiguous.reconciliationPromise;
  }

  function markAmbiguous(pending, causeCode, candidate = null) {
    if (state.ambiguous === null) {
      state.ambiguous = {
        status: 'AMBIGUOUS',
        cause_code: causeCode,
        retry_allowed: false,
        session_id: pending.command.session_id,
        sequence: pending.command.sequence,
        request_id: pending.command.request_id,
        transaction_hash: null,
        observed_chain_id: null,
        observed_account: null,
        context_matches: null,
        reconciliation_status: 'AWAITING_LATE_RESULT',
        observation: null,
        command: pending.command,
        baseline: pending.observationBaseline,
        reconciliationPromise: null,
      };
    }
    state.closed = true;
    if (candidate !== null) reconcileAmbiguousCandidate(candidate);
    return state.ambiguous;
  }

  const dispatcher = (command, deliverRawJson, reportFailure) => {
    if (state.closed || state.pending !== null) {
      reportFailure('BRIDGE_CLOSED');
      return undefined;
    }
    let serialized;
    try {
      serialized = serializeWalletGuardBridgeCommand(command);
    } catch {
      state.closed = true;
      reportFailure('INTERNAL_ERROR');
      return undefined;
    }
    const pending = {
      command,
      serialized,
      deliverRawJson,
      reportFailure,
      delivered: false,
      viewBound: false,
      armed: false,
      dispatched: false,
      observationBaseline: state.activeObservationBaseline,
      timer: null,
    };
    pending.timer = setTimeout(() => {
      if (state.pending !== pending) return;
      state.pending = null;
      state.closed = true;
      if (pending.delivered) markAmbiguous(pending, 'TIMEOUT');
      reportFailure('TIMEOUT');
    }, commandTimeoutMs);
    state.pending = pending;
    state.lastSensitivePending = pending;
    return undefined;
  };

  const server = createServer(async (req, res) => {
    try {
      if (req.socket.remoteAddress !== LOOPBACK_HOST || state.origin === null) {
        if (state.origin !== null || req.socket.remoteAddress !== LOOPBACK_HOST) {
          send(res, 403, 'loopback only');
          return;
        }
      }
      const expectedHost = `${LOOPBACK_HOST}:${server.address().port}`;
      if (req.headers.host !== expectedHost) {
        send(res, 403, 'host mismatch');
        return;
      }
      const origin = `http://${expectedHost}`;
      state.origin = origin;
      const url = new URL(req.url, origin);

      if (req.method === 'GET' && url.pathname === '/' && url.searchParams.has('bootstrap')) {
        if (state.bootstrapUsed || url.searchParams.size !== 1
            || url.searchParams.get('bootstrap') !== state.token) {
          send(res, 403, 'bootstrap rejected');
          return;
        }
        state.bootstrapUsed = true;
        send(res, 303, '', 'text/plain; charset=utf-8', {
          location: '/',
          'clear-site-data': '"cache", "storage"',
          'set-cookie': `wg_session=${state.token}; HttpOnly; SameSite=Strict; Path=/; Priority=High`,
        });
        return;
      }

      if (!state.bootstrapUsed || !hasSessionCookie(req, state.token)) {
        send(res, 401, 'session required');
        return;
      }

      if (url.search !== '') {
        send(res, 404, 'not found');
        return;
      }

      if (req.method === 'GET' && url.pathname === '/') {
        const body = await readFile(new URL('index.html', PUBLIC_DIR));
        send(res, 200, body, 'text/html; charset=utf-8', {
          'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
        });
        return;
      }
      if (req.method === 'GET' && url.pathname === '/browser-bridge.js') {
        send(res, 200, await readFile(new URL('browser-bridge.js', PUBLIC_DIR)), 'text/javascript; charset=utf-8');
        return;
      }
      if (req.method === 'GET' && url.pathname === '/style.css') {
        send(res, 200, await readFile(new URL('style.css', PUBLIC_DIR)), 'text/css; charset=utf-8');
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/status') {
        sendJson(res, 200, {
          connected: state.connected,
          closed: state.closed,
          account: state.account,
          chain_id: state.connected ? ANVIL_CHAIN_ID : null,
          chain_view_bound: state.connectionChainViewBaseline !== null,
          command_pending: state.pending !== null,
          sensitive_call_count: state.transport?.control.sensitiveCallCount() ?? 0,
          observation: state.lastObservation,
          operation_status: state.ambiguous === null ? null : 'AMBIGUOUS',
          ambiguous: ambiguousView(),
        });
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/config') {
        assertSameOriginBridgeFetch(req);
        sendJson(res, 200, {
          chain_id: ANVIL_CHAIN_ID,
          rpc_url: canonicalRpcUrl,
          host_origin: origin,
        });
        return;
      }

      if (req.method === 'GET' && url.pathname === '/bridge/next') {
        assertSameOriginBridgeFetch(req);
        if (state.closed) {
          sendJson(res, 410, { error: 'SESSION_CLOSED' });
          return;
        }
        if (state.pending === null || state.pending.delivered) {
          send(res, 204);
          return;
        }
        state.pending.delivered = true;
        send(res, 200, state.pending.serialized, 'application/json; charset=utf-8');
        return;
      }

      if (req.method !== 'POST') {
        send(res, 404, 'not found');
        return;
      }
      assertSameOriginPost(req, origin);

      if (url.pathname === '/api/handshake') {
        if (state.connected || state.closed) throw new TypeError('handshake already completed');
        const input = parseWalletGuardBoundedJsonData(await readStrictBody(req));
        exactKeys(input, [
          'chain_id',
          'account',
          'genesis_hash',
          'latest_block_number',
          'latest_block_hash',
        ], 'wallet handshake');
        if (input.chain_id !== ANVIL_CHAIN_ID
            || typeof input.account !== 'string'
            || !ACCOUNT_PATTERN.test(input.account)) {
          throw new TypeError('wallet handshake context is invalid');
        }
        const walletChainView = validateChainView({
          chain_id: input.chain_id,
          genesis_hash: input.genesis_hash,
          latest_block_number: input.latest_block_number,
          latest_block_hash: input.latest_block_hash,
        }, 'wallet handshake chain view');
        const nodeChainView = await captureValidatedNodeChainView(input.account);
        if (!sameChainView(walletChainView, nodeChainView)) {
          throw new TypeError('MetaMask and Node chain views do not match');
        }
        state.connectionChainViewBaseline = Object.freeze({
          wallet: walletChainView,
          node: nodeChainView,
        });
        state.account = input.account;
        state.transport = createControlledCallbackTransport({
          chainId: ANVIL_CHAIN_ID,
          accounts: [state.account],
          maxSensitiveCalls: 1,
          dispatchSensitive: dispatcher,
        });
        state.gateway = createTrustedGateway({
          captureTrustedOrigin: () => origin,
          provider: state.transport.provider,
          policy: policyFor(state.account, origin),
          trustedClock: () => new Date().toISOString(),
          referenceAuthorizationForRequest: referenceAuthorizationSupplier(),
          capabilityLifetimeMs: 30_000,
        });
        state.connected = true;
        sendJson(res, 200, {
          connected: true,
          chain_id: ANVIL_CHAIN_ID,
          account: state.account,
          chain_view_bound: true,
        });
        return;
      }

      if (url.pathname === '/bridge/view') {
        if (state.pending === null || !state.pending.delivered || state.pending.viewBound) {
          send(res, 409, 'no unbound delivered command');
          return;
        }
        const pending = state.pending;
        const walletView = parseBoundWalletView(await readStrictBody(req), pending.command);
        const nodeView = await captureValidatedNodeChainView(state.account);
        if (state.pending !== pending || state.closed) {
          send(res, 409, 'pending command expired during chain-view validation');
          return;
        }
        const connectionNodeView = state.connectionChainViewBaseline?.node;
        if (connectionNodeView === undefined
            || walletView.genesis_hash !== connectionNodeView.genesis_hash
            || nodeView.genesis_hash !== connectionNodeView.genesis_hash
            || !sameChainView(walletView, nodeView)) {
          state.pending = null;
          clearTimeout(pending.timer);
          state.closed = true;
          pending.reportFailure('CONTEXT_CHANGED');
          send(res, 409, 'wallet and Node chain views diverged');
          return;
        }
        pending.observationBaseline = Object.freeze({
          ...pending.observationBaseline,
          wallet_before_send: walletView,
          node_before_send: nodeView,
        });
        pending.viewBound = true;
        send(res, 204);
        return;
      }

      if (url.pathname === '/bridge/arm') {
        if (state.pending === null || !state.pending.delivered
            || !state.pending.viewBound || state.pending.armed) {
          send(res, 409, 'no live view-bound command to arm');
          return;
        }
        const pending = state.pending;
        const walletView = parseBoundWalletView(await readStrictBody(req), pending.command);
        if (state.pending !== pending || state.closed) {
          send(res, 409, 'pending command expired before arm');
          return;
        }
        const boundView = pending.observationBaseline?.wallet_before_send;
        if (boundView === undefined
            || walletView.account !== boundView.account
            || !sameChainView(walletView, boundView)) {
          state.pending = null;
          clearTimeout(pending.timer);
          state.closed = true;
          pending.reportFailure('CONTEXT_CHANGED');
          send(res, 409, 'armed wallet view differs from the bound view');
          return;
        }
        clearTimeout(pending.timer);
        pending.timer = null;
        pending.armed = true;
        send(res, 204);
        return;
      }

      if (url.pathname === '/bridge/dispatched') {
        if (state.pending === null || !state.pending.armed
            || state.pending.dispatched || state.closed) {
          send(res, 409, 'no armed command awaiting dispatch');
          return;
        }
        const pending = state.pending;
        parseBoundCommandIdentity(
          await readStrictBody(req),
          pending.command,
          'wallet dispatch signal',
        );
        if (state.pending !== pending || state.closed || pending.dispatched) {
          send(res, 409, 'armed command is no longer dispatchable');
          return;
        }
        pending.dispatched = true;
        pending.timer = setTimeout(() => {
          if (state.pending !== pending) return;
          state.pending = null;
          state.closed = true;
          markAmbiguous(pending, 'TIMEOUT');
          pending.reportFailure('TIMEOUT');
        }, commandTimeoutMs);
        send(res, 204);
        return;
      }

      if (url.pathname === '/bridge/result') {
        const raw = await readStrictBody(req);
        if (state.pending === null || !state.pending.delivered) {
          if (state.ambiguous === null
              || state.ambiguous.reconciliation_status !== 'AWAITING_LATE_RESULT') {
            send(res, 409, 'no delivered command');
            return;
          }
          const candidate = extractBoundTransactionCandidate(raw, state.ambiguous.command);
          await reconcileAmbiguousCandidate(candidate);
          sendJson(res, 202, { operation: ambiguousView() });
          return;
        }
        const pending = state.pending;
        if (!pending.dispatched) {
          if (!pending.armed) {
            send(res, 409, 'wallet result requires an armed command');
            return;
          }
          state.pending = null;
          clearTimeout(pending.timer);
          let candidate = null;
          try {
            const parsed = parseWalletGuardBridgeResponse(
              raw,
              bridgeExpectedIdentity(pending.command),
            );
            if (parsed.outcome === 'result') {
              candidate = extractBoundTransactionCandidate(raw, pending.command);
            }
          } catch {
            try {
              candidate = extractBoundTransactionCandidate(raw, pending.command);
            } catch {
              // A missing dispatch acknowledgement can never become a normal
              // success, even when no exact transaction candidate survives.
            }
          }
          markAmbiguous(pending, 'DISPATCH_ACK_UNAVAILABLE', candidate);
          pending.reportFailure('BRIDGE_CLOSED');
          if (state.ambiguous.reconciliationPromise !== null) {
            await state.ambiguous.reconciliationPromise;
          }
          sendJson(res, 202, { operation: ambiguousView() });
          return;
        }
        state.pending = null;
        clearTimeout(pending.timer);
        let parsed = null;
        let candidate = null;
        try {
          parsed = parseWalletGuardBridgeResponse(raw, bridgeExpectedIdentity(pending.command));
        } catch {
          try {
            candidate = extractBoundTransactionCandidate(raw, pending.command);
          } catch {
            // A delivered wallet request remains ambiguous when its response is
            // malformed or reports a changed wallet context.
          }
          markAmbiguous(pending, 'UNTRUSTED_LATE_CONTEXT', candidate);
        }
        if (!pending.viewBound) {
          if (candidate === null) {
            try {
              candidate = extractBoundTransactionCandidate(raw, pending.command);
            } catch {
              // The missing pre-send view makes any delivered outcome ambiguous.
            }
          }
          markAmbiguous(pending, 'VIEW_BINDING_MISSING', candidate);
          pending.reportFailure('CONTEXT_CHANGED');
          if (state.ambiguous.reconciliationPromise !== null) {
            await state.ambiguous.reconciliationPromise;
          }
          sendJson(res, 202, { operation: ambiguousView() });
          return;
        }
        if (parsed?.outcome === 'error' && parsed.error_code !== 'USER_REJECTED') {
          markAmbiguous(pending, parsed.error_code);
        }
        pending.deliverRawJson(raw);
        if (parsed?.outcome === 'error' || state.transport.control.inspect().destroyed) {
          state.closed = true;
        }
        if (state.ambiguous !== null && state.ambiguous.reconciliationPromise !== null) {
          await state.ambiguous.reconciliationPromise;
        }
        if (state.ambiguous !== null) {
          sendJson(res, 202, { operation: ambiguousView() });
        } else {
          send(res, 204);
        }
        return;
      }

      if (url.pathname === '/bridge/close') {
        const input = parseWalletGuardBoundedJsonData(await readStrictBody(req));
        exactKeys(input, ['code'], 'bridge close');
        if (input.code !== 'CONTEXT_CHANGED' && input.code !== 'BRIDGE_CLOSED') {
          throw new TypeError('bridge close code is unsupported');
        }
        if (state.pending !== null) {
          const pending = state.pending;
          state.pending = null;
          clearTimeout(pending.timer);
          if (pending.delivered) markAmbiguous(pending, input.code);
          pending.reportFailure(input.code);
        }
        state.closed = true;
        send(res, 204);
        return;
      }

      if (url.pathname === '/api/deny' || url.pathname === '/api/allow') {
        const input = parseWalletGuardBoundedJsonData(await readStrictBody(req));
        exactKeys(input, [], 'prototype action');
        if (!state.connected || state.closed || state.operationInFlight) {
          send(res, 409, 'prototype session unavailable');
          return;
        }
        state.operationInFlight = true;
        try {
          const isAllow = url.pathname === '/api/allow';
          let baseline = null;
          if (isAllow) {
            const observer = await captureBaseline({
              rpcUrl: canonicalRpcUrl,
              account: state.account,
            });
            const nodeBeforeDispatch = await captureValidatedNodeChainView(state.account);
            if (state.connectionChainViewBaseline === null
                || nodeBeforeDispatch.genesis_hash
                  !== state.connectionChainViewBaseline.node.genesis_hash) {
              throw new TypeError('Node chain view drifted after handshake');
            }
            baseline = Object.freeze({
              observer,
              connection: state.connectionChainViewBaseline,
              node_before_dispatch: nodeBeforeDispatch,
            });
          }
          state.activeObservationBaseline = baseline;
          let result;
          try {
            result = await state.gateway.request(
              isAllow ? allowRequest(state.account) : denyRequest(state.account),
            );
          } catch (error) {
            if (state.ambiguous === null) throw error;
            if (state.ambiguous.reconciliationPromise !== null) {
              await state.ambiguous.reconciliationPromise;
            }
            sendJson(res, 202, {
              operation: ambiguousView(),
              observation: state.lastObservation,
            });
            return;
          }
          let observation = null;
          let responseStatus = 200;
          if (result.forwarded) {
            try {
              observation = await observeTransaction({
                rpcUrl: canonicalRpcUrl,
                txHash: result.provider_result,
                account: state.account,
                baseline: state.lastSensitivePending?.observationBaseline ?? baseline,
              });
            } catch (error) {
              observation = {
                status: 'AMBIGUOUS',
                detail: error instanceof Error ? error.message : 'observer failed',
                transaction_hash: result.provider_result,
                reference_only: true,
                external_world_proved: false,
              };
              const ambiguous = markAmbiguous(
                state.lastSensitivePending,
                'OBSERVATION_FAILED',
              );
              ambiguous.transaction_hash = result.provider_result;
              ambiguous.observed_chain_id = ANVIL_CHAIN_ID;
              ambiguous.observed_account = state.account;
              ambiguous.context_matches = true;
              ambiguous.reconciliation_status = 'OBSERVATION_FAILED';
              ambiguous.observation = observation;
              responseStatus = 202;
            }
            state.lastObservation = observation;
          }
          sendJson(res, responseStatus, {
            result,
            observation,
            operation: state.ambiguous === null ? null : ambiguousView(),
          });
        } finally {
          state.activeObservationBaseline = null;
          state.operationInFlight = false;
        }
        return;
      }

      send(res, 404, 'not found');
    } catch (error) {
      sendJson(res, 400, {
        error: 'REQUEST_REJECTED',
        detail: error instanceof Error ? error.message : 'request rejected',
      });
    }
  });
  server.requestTimeout = 5_000;
  server.headersTimeout = 5_000;

  return Object.freeze({
    async listen() {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, LOOPBACK_HOST, resolve);
      });
      const address = server.address();
      const origin = `http://${LOOPBACK_HOST}:${address.port}`;
      state.origin = origin;
      return Object.freeze({
        origin,
        launch_url: `${origin}/?bootstrap=${state.token}`,
      });
    },
    async close() {
      state.closed = true;
      if (state.pending !== null) {
        const pending = state.pending;
        state.pending = null;
        clearTimeout(pending.timer);
        if (pending.delivered) markAmbiguous(pending, 'BRIDGE_CLOSED');
        pending.reportFailure('BRIDGE_CLOSED');
      }
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    },
  });
}
