import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MCP_PROTOCOL_VERSION,
  PomRxMcpNormalizationError,
  normalizeReferenceMcpToolCall,
} from '../../applications/ai-agents/mcp/reference-tool-call-normalizer.mjs';

function ingress(bodyText, overrides = {}) {
  return {
    serverRef: 'mcp-server/reference-test',
    protocolVersionHeader: MCP_PROTOCOL_VERSION,
    methodHeader: 'tools/call',
    nameHeader: 'search',
    bodyText,
    ...overrides,
  };
}

function body({
  id = 1,
  name = 'search',
  args = '{"q":"otters"}',
  extraParams = '',
} = {}) {
  return `{"jsonrpc":"2.0","id":${JSON.stringify(id)},"method":"tools/call","params":{"name":${JSON.stringify(name)},"arguments":${args}${extraParams}}}`;
}

function expectCode(code) {
  return (error) => {
    assert.ok(error instanceof PomRxMcpNormalizationError);
    assert.equal(error.code, code);
    return true;
  };
}

test('normalizes an exact MCP tools/call into immutable prepared execution', () => {
  const normalized = normalizeReferenceMcpToolCall(ingress(body()));

  assert.equal(normalized.protocol_version, MCP_PROTOCOL_VERSION);
  assert.equal(normalized.method, 'tools/call');
  assert.equal(normalized.tool_name, 'search');
  assert.match(normalized.action_commitment, /^[a-f0-9]{64}$/u);
  assert.match(normalized.context_commitment, /^[a-f0-9]{64}$/u);
  assert.match(normalized.wire_request_sha256, /^[a-f0-9]{64}$/u);
  assert.equal(normalized.prepared_execution.method, 'tools/call');
  assert.equal(normalized.prepared_execution.params.name, 'search');
  assert.equal(normalized.prepared_execution.params.arguments.q, 'otters');
  assert.equal(Object.isFrozen(normalized), true);
  assert.equal(Object.isFrozen(normalized.prepared_execution), true);
  assert.equal(Object.isFrozen(normalized.prepared_execution.params), true);
  assert.equal(Object.isFrozen(normalized.prepared_execution.params.arguments), true);
  assert.equal(Object.getPrototypeOf(normalized.prepared_execution.params), null);
});

test('JSON-RPC request id changes wire evidence but not exact action identity', () => {
  const first = normalizeReferenceMcpToolCall(ingress(body({ id: 1 })));
  const second = normalizeReferenceMcpToolCall(ingress(body({ id: 99 })));

  assert.equal(first.action_commitment, second.action_commitment);
  assert.equal(first.context_commitment, second.context_commitment);
  assert.notEqual(first.wire_request_sha256, second.wire_request_sha256);
});

test('argument mutation changes action commitment and prepared execution', () => {
  const first = normalizeReferenceMcpToolCall(ingress(body({ args: '{"q":"otters"}' })));
  const second = normalizeReferenceMcpToolCall(ingress(body({ args: '{"q":"seals"}' })));

  assert.notEqual(first.action_commitment, second.action_commitment);
  assert.equal(first.prepared_execution.params.arguments.q, 'otters');
  assert.equal(second.prepared_execution.params.arguments.q, 'seals');
});

test('object insertion order does not change semantic action commitment', () => {
  const first = normalizeReferenceMcpToolCall(ingress(body({ args: '{"a":1,"b":2}' })));
  const second = normalizeReferenceMcpToolCall(ingress(body({ args: '{"b":2,"a":1}' })));

  assert.equal(first.action_commitment, second.action_commitment);
  assert.notEqual(first.wire_request_sha256, second.wire_request_sha256);
});

test('exact transcript preserves composed versus decomposed Unicode strings', () => {
  const composed = normalizeReferenceMcpToolCall(
    ingress(body({ args: '{"q":"é"}' })),
  );
  const decomposed = normalizeReferenceMcpToolCall(
    ingress(body({ args: '{"q":"é"}' })),
  );

  assert.notEqual(composed.action_commitment, decomposed.action_commitment);
});

test('exact transcript distinguishes negative zero from positive zero', () => {
  const negative = normalizeReferenceMcpToolCall(ingress(body({ args: '{"n":-0}' })));
  const positive = normalizeReferenceMcpToolCall(ingress(body({ args: '{"n":0}' })));

  assert.equal(Object.is(negative.prepared_execution.params.arguments.n, -0), true);
  assert.equal(Object.is(positive.prepared_execution.params.arguments.n, 0), true);
  assert.notEqual(negative.action_commitment, positive.action_commitment);
});

test('Mcp-Name mismatch fails before producing a prepared execution', () => {
  assert.throws(
    () => normalizeReferenceMcpToolCall(ingress(body(), { nameHeader: 'delete-all' })),
    expectCode('POMRX_MCP_E_NAME_MISMATCH'),
  );
});

test('Mcp-Method mismatch fails closed', () => {
  assert.throws(
    () => normalizeReferenceMcpToolCall(ingress(body(), { methodHeader: 'resources/read' })),
    expectCode('POMRX_MCP_E_HEADER_METHOD'),
  );
});

test('unsupported protocol revision fails closed', () => {
  assert.throws(
    () => normalizeReferenceMcpToolCall(
      ingress(body(), { protocolVersionHeader: '2025-11-25' }),
    ),
    expectCode('POMRX_MCP_E_PROTOCOL_VERSION'),
  );
});

test('MRTR and task fields are included in exact action identity when present', () => {
  const base = normalizeReferenceMcpToolCall(ingress(body()));
  const extended = normalizeReferenceMcpToolCall(ingress(body({
    extraParams: ',"requestState":"opaque-state","inputResponses":{"confirm":{"action":"accept"}},"task":{"ttl":60}',
  })));

  assert.notEqual(base.action_commitment, extended.action_commitment);
  assert.equal(extended.prepared_execution.params.requestState, 'opaque-state');
  assert.equal(extended.prepared_execution.params.task.ttl, 60);
});

test('metadata mutation is committed rather than silently ignored', () => {
  const first = normalizeReferenceMcpToolCall(ingress(body({
    extraParams: ',"_meta":{"traceparent":"00-aaa-bbb-01"}',
  })));
  const second = normalizeReferenceMcpToolCall(ingress(body({
    extraParams: ',"_meta":{"traceparent":"00-ccc-ddd-01"}',
  })));

  assert.notEqual(first.action_commitment, second.action_commitment);
});

test('unknown request and params fields are rejected instead of being dropped', () => {
  const unknownRequest = '{"jsonrpc":"2.0","id":1,"method":"tools/call","unexpected":true,"params":{"name":"search","arguments":{}}}';
  assert.throws(
    () => normalizeReferenceMcpToolCall(ingress(unknownRequest)),
    expectCode('POMRX_MCP_E_UNKNOWN_FIELD'),
  );

  const unknownParam = '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search","arguments":{},"unexpected":true}}';
  assert.throws(
    () => normalizeReferenceMcpToolCall(ingress(unknownParam)),
    expectCode('POMRX_MCP_E_UNKNOWN_FIELD'),
  );
});

test('post-import JSON.parse poisoning cannot replace the captured MCP parser', () => {
  const originalParse = JSON.parse;
  try {
    JSON.parse = () => ({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'search', arguments: { q: 'substituted' } },
    });
    const normalized = normalizeReferenceMcpToolCall(ingress(body()));
    assert.equal(normalized.prepared_execution.params.arguments.q, 'otters');
  } finally {
    JSON.parse = originalParse;
  }
});
