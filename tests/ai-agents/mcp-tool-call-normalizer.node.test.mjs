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
  assert.match(normalized.raw_text_commitment_sha256, /^[a-f0-9]{64}$/u);
  assert.equal(normalized.transport_bytes_proved, false);
  assert.equal(normalized.prepared_execution.method, 'tools/call');
  assert.equal(normalized.prepared_execution.params.name, 'search');
  assert.equal(normalized.prepared_execution.params.arguments.q, 'otters');
  assert.equal(Object.isFrozen(normalized), true);
  assert.equal(Object.isFrozen(normalized.prepared_execution), true);
  assert.equal(Object.isFrozen(normalized.prepared_execution.params), true);
  assert.equal(Object.isFrozen(normalized.prepared_execution.params.arguments), true);
  assert.equal(Object.getPrototypeOf(normalized.prepared_execution.params), null);
});

test('JSON-RPC request id changes raw-text evidence but not exact action identity', () => {
  const first = normalizeReferenceMcpToolCall(ingress(body({ id: 1 })));
  const second = normalizeReferenceMcpToolCall(ingress(body({ id: 99 })));

  assert.equal(first.action_commitment, second.action_commitment);
  assert.equal(first.context_commitment, second.context_commitment);
  assert.notEqual(first.raw_text_commitment_sha256, second.raw_text_commitment_sha256);
  assert.equal(first.transport_bytes_proved, false);
  assert.equal(second.transport_bytes_proved, false);
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
  assert.notEqual(first.raw_text_commitment_sha256, second.raw_text_commitment_sha256);
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

test('negative zero is rejected because JSON dispatch would collapse it to zero', () => {
  assert.throws(
    () => normalizeReferenceMcpToolCall(ingress(body({ args: '{"n":-0}' }))),
    expectCode('POMRX_MCP_E_NUMBER_ROUNDTRIP'),
  );
});

test('unsafe integers are rejected after JSON parsing instead of committing rounded values', () => {
  assert.throws(
    () => normalizeReferenceMcpToolCall(
      ingress(body({ args: '{"n":9007199254740993}' })),
    ),
    expectCode('POMRX_MCP_E_NUMBER_ROUNDTRIP'),
  );
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

test('duplicate top-level JSON members are rejected before last-value parsing', () => {
  const duplicated = '{"jsonrpc":"2.0","id":1,"method":"resources/read","method":"tools/call","params":{"name":"search","arguments":{}}}';
  assert.throws(
    () => normalizeReferenceMcpToolCall(ingress(duplicated)),
    expectCode('POMRX_MCP_E_DUPLICATE_KEY'),
  );
});

test('escaped-equivalent duplicate nested members are rejected', () => {
  const duplicated = '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search","arguments":{"q":"first","\\u0071":"second"}}}';
  assert.throws(
    () => normalizeReferenceMcpToolCall(ingress(duplicated)),
    expectCode('POMRX_MCP_E_DUPLICATE_KEY'),
  );
});

test('unpaired Unicode surrogates are rejected before semantic capture', () => {
  assert.throws(
    () => normalizeReferenceMcpToolCall(
      ingress(body({ args: '{"q":"\\ud800"}' })),
    ),
    expectCode('POMRX_MCP_E_UNICODE'),
  );
});

test('raw lexical depth bounds apply before JSON.parse graph construction', () => {
  const deepValue = `${'['.repeat(10)}0${']'.repeat(10)}`;
  assert.throws(
    () => normalizeReferenceMcpToolCall(
      ingress(body({ args: `{"deep":${deepValue}}` })),
    ),
    expectCode('POMRX_MCP_E_DEPTH'),
  );
});

test('raw lexical node bounds apply before JSON.parse graph construction', () => {
  const entries = [];
  for (let index = 0; index < 1_000; index += 1) {
    entries.push(`"k${index}":0`);
  }
  assert.throws(
    () => normalizeReferenceMcpToolCall(
      ingress(body({ args: `{${entries.join(',')}}` })),
    ),
    expectCode('POMRX_MCP_E_NODES'),
  );
});

test('captured arrays are detached from post-import Array.prototype toJSON', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(Array.prototype, 'toJSON');
  try {
    Object.defineProperty(Array.prototype, 'toJSON', {
      configurable: true,
      value() {
        return ['substituted'];
      },
      writable: true,
    });
    const normalized = normalizeReferenceMcpToolCall(
      ingress(body({ args: '{"items":["trusted"]}' })),
    );
    const captured = normalized.prepared_execution.params.arguments.items;
    assert.equal(Array.isArray(captured), true);
    assert.equal(Object.getPrototypeOf(captured), null);
    assert.equal(JSON.stringify(captured), '["trusted"]');
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(Array.prototype, 'toJSON', originalDescriptor);
    } else {
      delete Array.prototype.toJSON;
    }
  }
});

test('numeric Array.prototype setter cannot intercept detached capture indices', () => {
  const values = [];
  for (let index = 0; index <= 500; index += 1) values.push(index);
  const request = body({ args: `{"items":${JSON.stringify(values)}}` });
  const originalDescriptor = Object.getOwnPropertyDescriptor(Array.prototype, '500');
  let setterCalls = 0;
  try {
    Object.defineProperty(Array.prototype, '500', {
      configurable: true,
      set() {
        setterCalls += 1;
      },
    });
    const normalized = normalizeReferenceMcpToolCall(ingress(request));
    const captured = normalized.prepared_execution.params.arguments.items;
    assert.equal(setterCalls, 0);
    assert.equal(Object.getPrototypeOf(captured), null);
    assert.equal(captured[500], 500);
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(Array.prototype, '500', originalDescriptor);
    } else {
      delete Array.prototype[500];
    }
  }
});

test('post-import RegExp.prototype.exec poisoning cannot bypass validation', () => {
  const originalExec = RegExp.prototype.exec;
  try {
    RegExp.prototype.exec = function poisonedExec(value) {
      if (String(value).includes('!!!')) return { 0: '!!!', index: 0, input: value };
      return null;
    };
    assert.throws(
      () => normalizeReferenceMcpToolCall(ingress(body(), { serverRef: '!!!' })),
      expectCode('POMRX_MCP_E_SERVER_REF'),
    );
    assert.throws(
      () => normalizeReferenceMcpToolCall(
        ingress(body({ name: 'sea\u0000rch' }), { nameHeader: 'sea\u0000rch' }),
      ),
      expectCode('POMRX_MCP_E_TOOL_NAME'),
    );
  } finally {
    RegExp.prototype.exec = originalExec;
  }
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
