# POM-RX MCP exact tool-call normalization

Status: **reference integration foundation; not an authorization or production MCP gateway**.

Issue: #148

This directory begins the MCP application profile for POM-RX. It targets the MCP `2026-07-28` Streamable HTTP request shape and deliberately starts with a narrow property: take one raw decoded-text `tools/call` request, verify the standard routing headers against the body, reject ambiguous or structurally out-of-bounds JSON before full parsing, capture the effective tool-call parameters into inert immutable data, and derive domain-separated commitments over the action and trusted routing context.

## Why parse once

The security invariant is not “the JSON text was logged”. It is:

```text
raw decoded request text
  -> bounded/duplicate-free lexical scan
  -> POM-RX-owned parse/capture
  -> exact action commitment
  -> immutable prepared_execution
  -> future Gate authorization/consumption
  -> downstream dispatch of prepared_execution only
```

A downstream adapter must **not** reparse the original raw body after authorization. Re-parsing would create a second interpretation boundary and could break authorization-to-dispatch continuity.

## Current normalized inputs

The reference normalizer receives:

- trusted target `serverRef` supplied by the integration bootstrap;
- `MCP-Protocol-Version` value already extracted by the HTTP boundary;
- `Mcp-Method` value;
- `Mcp-Name` value;
- the decoded JSON request body as text.

For the current MCP revision it requires:

- protocol version `2026-07-28`;
- method `tools/call`;
- `Mcp-Method` to match the body method;
- `Mcp-Name` to match `params.name`;
- JSON-RPC `2.0` with a bounded request id;
- no duplicate JSON object members at any depth, including escaped-equivalent key spellings;
- lexical depth/node/array/string/key limits before `JSON.parse` builds the full graph;
- Unicode scalar strings/keys (unpaired surrogates rejected);
- finite numbers that survive ordinary JSON dispatch identity: `-0` and unsafe integers are rejected;
- a bounded JSON-only parameter tree.

The action commitment covers the complete captured `tools/call` params, including `arguments` and, when present, `_meta`, `task`, `inputResponses`, and `requestState`. The request id is deliberately excluded from action identity because it is transport correlation.

A separate `raw_text_commitment_sha256` binds the decoded request text supplied to this boundary. It is **not** a transport-byte hash. The output therefore carries `transport_bytes_proved=false`; an HTTP integration that needs byte-level evidence must capture and bind the original body bytes before text decoding.

The current application-local exact-value transcript preserves well-formed JavaScript string code units and accepted IEEE-754 number identity while making object property insertion order irrelevant. Captured arrays are real Array exotics with a detached/null prototype and own data elements, so later `Array.prototype` mutation cannot rewrite the prepared snapshot under the stated same-realm assumptions.

The exact transcript/hash implementation is temporary integration scaffolding. Core issue #157 owns the shared exact-value commitment contract; this MCP lot must migrate to that reviewed Core primitive before its architectural P2 can close.

## Current non-goals / non-proofs

This first lot does **not** prove:

- POM-RX authorization or Gate consumption;
- durable single-use execution;
- that an MCP server actually dispatched the captured call;
- independent observation or effect reconciliation;
- transport-byte identity from the decoded `bodyText` value;
- prompt-injection prevention or model reasoning quality;
- OAuth / MCP authorization correctness;
- `Mcp-Param-*` schema-derived mirrored-header validation;
- task/MRTR business semantics or `requestState` integrity;
- external server identity merely from self-reported MCP client/server metadata;
- production readiness.

`requestState` is captured and committed as untrusted request data; this normalizer does not authenticate it. A server that lets it influence authorization or business logic still needs the MCP-defined integrity verification boundary.

## Next integration lots

1. exact-head review and adversarial normalization tests;
2. Core #157 shared exact-value commitment and migration away from the local transcript;
3. tool-definition-aware `Mcp-Param-*` mirror validation;
4. composition with the accepted shared POM-RX durable Gate rather than a private MCP Gate fork;
5. execution evidence plus independently sourced observation/reconciliation;
6. harmless local MCP demo;
7. benchmark against raw tool call, logging-only and policy-gateway-only baselines.
