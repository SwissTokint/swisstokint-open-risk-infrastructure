import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MCP_PROTOCOL_VERSION,
  PomRxMcpNormalizationError,
  normalizeReferenceMcpToolCall,
} from '../../applications/ai-agents/mcp/reference-tool-call-normalizer.mjs';

function ingress(numberToken) {
  return {
    serverRef: 'mcp-server/reference-test',
    protocolVersionHeader: MCP_PROTOCOL_VERSION,
    methodHeader: 'tools/call',
    nameHeader: 'search',
    bodyText: `{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search","arguments":{"n":${numberToken}}}}`,
  };
}

function expectRoundTripFailure(error) {
  assert.ok(error instanceof PomRxMcpNormalizationError);
  assert.equal(error.code, 'POMRX_MCP_E_NUMBER_ROUNDTRIP');
  return true;
}

test('underflowing finite decimal token cannot collapse to zero before commitment', () => {
  assert.throws(
    () => normalizeReferenceMcpToolCall(ingress('1e-400')),
    expectRoundTripFailure,
  );
});

test('precision-losing finite decimal token cannot collapse to one before commitment', () => {
  assert.throws(
    () => normalizeReferenceMcpToolCall(ingress('1.0000000000000001')),
    expectRoundTripFailure,
  );
});

test('decimal spellings with the same exact representable value remain accepted', () => {
  const integer = normalizeReferenceMcpToolCall(ingress('1'));
  const decimal = normalizeReferenceMcpToolCall(ingress('1.0'));
  const exponent = normalizeReferenceMcpToolCall(ingress('1e0'));

  assert.equal(integer.prepared_execution.params.arguments.n, 1);
  assert.equal(decimal.prepared_execution.params.arguments.n, 1);
  assert.equal(exponent.prepared_execution.params.arguments.n, 1);
  assert.equal(integer.action_commitment, decimal.action_commitment);
  assert.equal(integer.action_commitment, exponent.action_commitment);
});
