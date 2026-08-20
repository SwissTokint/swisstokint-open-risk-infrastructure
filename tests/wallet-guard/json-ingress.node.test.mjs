import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WALLET_GUARD_JSON_INGRESS_SCHEMA_VERSION,
  WalletGuardJsonIngressError,
  parseWalletGuardJsonIngress,
} from '../../applications/blockchain-digital-assets/wallet-guard/json-ingress.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const RECIPIENT = `0x${'2'.repeat(40)}`;

function expectCode(error, code) {
  assert.ok(error instanceof WalletGuardJsonIngressError);
  assert.equal(error.code, code);
  return true;
}

function eip1193Raw(value = '0x1') {
  return JSON.stringify({
    method: 'eth_sendTransaction',
    params: [{
      from: ACCOUNT,
      to: RECIPIENT,
      value,
      data: '0x',
    }],
  });
}

test('strict EIP-1193 JSON ingress returns a frozen request and deterministic commitments', () => {
  const raw = eip1193Raw();
  const first = parseWalletGuardJsonIngress(raw);
  const second = parseWalletGuardJsonIngress(raw);

  assert.equal(first.schema_version, WALLET_GUARD_JSON_INGRESS_SCHEMA_VERSION);
  assert.equal(first.transport, 'eip1193-json');
  assert.equal(first.jsonrpc_id, null);
  assert.equal(first.request.method, 'eth_sendTransaction');
  assert.equal(first.request.params[0].value, '0x1');
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.request), true);
  assert.equal(Object.isFrozen(first.request.params), true);
  assert.equal(Object.isFrozen(first.request.params[0]), true);
  assert.match(first.raw_text_sha256, /^[a-f0-9]{64}$/u);
  assert.match(first.canonical_request_sha256, /^[a-f0-9]{64}$/u);
  assert.equal(first.raw_text_sha256, second.raw_text_sha256);
  assert.equal(first.canonical_request_sha256, second.canonical_request_sha256);
  assert.equal(first.reference_only, true);
  assert.equal(first.transport_bytes_proved, false);
});

test('JSON-RPC 2.0 envelope is reduced to the same canonical EIP-1193 request', () => {
  const request = JSON.parse(eip1193Raw());
  const raw = JSON.stringify({ jsonrpc: '2.0', id: 'wg-0001', ...request });
  const jsonRpc = parseWalletGuardJsonIngress(raw);
  const eip1193 = parseWalletGuardJsonIngress(JSON.stringify(request));

  assert.equal(jsonRpc.transport, 'jsonrpc2');
  assert.equal(jsonRpc.jsonrpc_id, 'wg-0001');
  assert.deepEqual(jsonRpc.request, eip1193.request);
  assert.equal(jsonRpc.canonical_request_sha256, eip1193.canonical_request_sha256);
  assert.notEqual(jsonRpc.raw_text_sha256, eip1193.raw_text_sha256);
});

test('duplicate top-level keys are rejected before JSON.parse last-key-wins semantics', () => {
  const raw = '{"method":"eth_chainId","method":"eth_accounts","params":[]}';
  assert.throws(
    () => parseWalletGuardJsonIngress(raw),
    (error) => expectCode(error, 'POMRX_WG_JSON_E_DUPLICATE_KEY'),
  );
});

test('escaped and literal spellings of the same key are duplicate-equivalent', () => {
  const raw = '{"m\\u0065thod":"eth_chainId","method":"eth_accounts","params":[]}';
  assert.throws(
    () => parseWalletGuardJsonIngress(raw),
    (error) => expectCode(error, 'POMRX_WG_JSON_E_DUPLICATE_KEY'),
  );
});

test('nested duplicate keys are rejected inside transaction and typed-data-like objects', () => {
  const nestedTx = `{"method":"eth_sendTransaction","params":[{"from":"${ACCOUNT}","to":"${RECIPIENT}","value":"0x1","value":"0x2"}]}`;
  assert.throws(
    () => parseWalletGuardJsonIngress(nestedTx),
    (error) => expectCode(error, 'POMRX_WG_JSON_E_DUPLICATE_KEY'),
  );

  const typed = '{"method":"eth_signTypedData_v4","params":["0x1111111111111111111111111111111111111111",{"domain":{"chainId":1,"chainId":2},"types":{},"primaryType":"X","message":{}}]}';
  assert.throws(
    () => parseWalletGuardJsonIngress(typed),
    (error) => expectCode(error, 'POMRX_WG_JSON_E_DUPLICATE_KEY'),
  );
});

test('prototype-pollution keys are rejected at any object depth', () => {
  for (const key of ['__proto__', 'constructor', 'prototype']) {
    const raw = `{"method":"eth_sign","params":[{"${key}":"x"}]}`;
    assert.throws(
      () => parseWalletGuardJsonIngress(raw),
      (error) => expectCode(error, 'POMRX_WG_JSON_E_UNSAFE_KEY'),
    );
  }
});

test('unknown top-level fields and malformed JSON-RPC envelopes fail closed', () => {
  assert.throws(
    () => parseWalletGuardJsonIngress('{"method":"eth_chainId","params":[],"origin":"https://attacker.invalid"}'),
    (error) => expectCode(error, 'POMRX_WG_JSON_E_SHAPE'),
  );
  assert.throws(
    () => parseWalletGuardJsonIngress('{"jsonrpc":"1.0","id":1,"method":"eth_chainId","params":[]}'),
    (error) => expectCode(error, 'POMRX_WG_JSON_E_VERSION'),
  );
  assert.throws(
    () => parseWalletGuardJsonIngress('{"jsonrpc":"2.0","method":"eth_chainId","params":[]}'),
    (error) => expectCode(error, 'POMRX_WG_JSON_E_SHAPE'),
  );
  assert.throws(
    () => parseWalletGuardJsonIngress('{"jsonrpc":"2.0","id":null,"method":"eth_chainId","params":[]}'),
    (error) => expectCode(error, 'POMRX_WG_JSON_E_ID'),
  );
});

test('method and params shape are validated without attempting application semantics', () => {
  assert.throws(
    () => parseWalletGuardJsonIngress('{"method":"eth-sendTransaction","params":[]}'),
    (error) => expectCode(error, 'POMRX_WG_JSON_E_METHOD'),
  );
  assert.throws(
    () => parseWalletGuardJsonIngress('{"method":"eth_chainId","params":{}}'),
    (error) => expectCode(error, 'POMRX_WG_JSON_E_PARAMS'),
  );

  const unsupported = parseWalletGuardJsonIngress('{"method":"wallet_futureMethod","params":["opaque"]}');
  assert.equal(unsupported.request.method, 'wallet_futureMethod');
  assert.deepEqual(unsupported.request.params, ['opaque']);
});

test('syntax edge cases do not fall through to native parser ambiguity', () => {
  for (const raw of [
    '{"method":"eth_chainId","params":[],}',
    '{"method":"eth_chainId" "params":[]}',
    '{"method":"eth_chainId","params":[01]}',
    '{"method":"eth_chainId","params":[+1]}',
    '{"method":"eth_chainId","params":["\\x41"]}',
    '\ufeff{"method":"eth_chainId","params":[]}',
    '{"method":"eth_chainId","params":[]} trailing',
  ]) {
    assert.throws(() => parseWalletGuardJsonIngress(raw), WalletGuardJsonIngressError);
  }
});

test('unsafe or non-deterministic JSON numbers are rejected', () => {
  for (const numeric of ['9007199254740992', '1.5', '1e3']) {
    const raw = `{"method":"eth_chainId","params":[${numeric}]}`;
    assert.throws(
      () => parseWalletGuardJsonIngress(raw),
      (error) => expectCode(error, 'POMRX_WG_JSON_E_NUMBER'),
    );
  }
});

test('JSON-RPC numeric ids must be non-negative safe integers', () => {
  assert.equal(
    parseWalletGuardJsonIngress('{"jsonrpc":"2.0","id":0,"method":"eth_chainId","params":[]}').jsonrpc_id,
    0,
  );
  for (const id of ['-1', '9007199254740992']) {
    assert.throws(
      () => parseWalletGuardJsonIngress(`{"jsonrpc":"2.0","id":${id},"method":"eth_chainId","params":[]}`),
      WalletGuardJsonIngressError,
    );
  }
});

test('byte, depth, node and string bounds are enforced', () => {
  const huge = `{"method":"eth_sign","params":["${'a'.repeat(70 * 1024)}"]}`;
  assert.throws(
    () => parseWalletGuardJsonIngress(huge),
    (error) => expectCode(error, 'POMRX_WG_JSON_E_BOUNDS'),
  );

  let deep = '0';
  for (let index = 0; index < 20; index += 1) deep = `[${deep}]`;
  assert.throws(
    () => parseWalletGuardJsonIngress(`{"method":"eth_sign","params":[${deep}]}`),
    (error) => expectCode(error, 'POMRX_WG_JSON_E_BOUNDS'),
  );

  const nodes = Array.from({ length: 2100 }, () => 0).join(',');
  assert.throws(
    () => parseWalletGuardJsonIngress(`{"method":"eth_sign","params":[${nodes}]}`),
    (error) => expectCode(error, 'POMRX_WG_JSON_E_BOUNDS'),
  );

  const longString = 'a'.repeat(17_000);
  assert.throws(
    () => parseWalletGuardJsonIngress(`{"method":"eth_sign","params":["${longString}"]}`),
    (error) => expectCode(error, 'POMRX_WG_JSON_E_BOUNDS'),
  );
});

test('whitespace changes raw-text hash but not canonical request commitment', () => {
  const compact = '{"method":"eth_chainId","params":[]}';
  const spaced = '{  "method" : "eth_chainId" , "params" : [ ] }';
  const left = parseWalletGuardJsonIngress(compact);
  const right = parseWalletGuardJsonIngress(spaced);
  assert.notEqual(left.raw_text_sha256, right.raw_text_sha256);
  assert.equal(left.canonical_request_sha256, right.canonical_request_sha256);
});
