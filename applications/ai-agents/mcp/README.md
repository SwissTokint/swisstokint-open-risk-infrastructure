# POM-RX MCP exact tool-call normalization

Status: **reference integration foundation; not an authorization or production MCP gateway**.

Issue: #148

This directory begins the MCP application profile for POM-RX. It targets the MCP `2026-07-28` Streamable HTTP request shape and deliberately starts with a narrow property: take one raw `tools/call` request, verify the standard routing headers against the body, parse it once inside the POM-RX boundary, capture the effective tool-call parameters into inert immutable data, and derive domain-separated commitments over the action and trusted routing context.

## Why parse once

The security invariant is not “the JSON text was logged”. It is:

```text
raw MCP request
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
- the raw JSON request body as text.

For the current MCP revision it requires:

- protocol version `2026-07-28`;
- method `tools/call`;
- `Mcp-Method` to match the body method;
- `Mcp-Name` to match `params.name`;
- JSON-RPC `2.0` with a bounded request id;
- a bounded JSON-only parameter tree.

The action commitment covers the complete captured `tools/call` params, including `arguments` and, when present, `_meta`, `task`, `inputResponses`, and `requestState`. The request id is deliberately excluded from action identity because it is transport correlation, while the raw wire hash still commits to the complete request text. The context commitment binds the protocol revision, target server reference and standard routing-header values.

The exact-value transcript preserves JavaScript string code units and IEEE-754 number identity, including `-0`; object property insertion order does not change the commitment. This is intentionally stricter than using the Proof Receipt canonicalizer, whose portability semantics are a different contract and must not silently define execution identity.

## Current non-goals / non-proofs

This first lot does **not** prove:

- POM-RX authorization or Gate consumption;
- durable single-use execution;
- that an MCP server actually dispatched the captured call;
- independent observation or effect reconciliation;
- prompt-injection prevention or model reasoning quality;
- OAuth / MCP authorization correctness;
- `Mcp-Param-*` schema-derived mirrored-header validation;
- task/MRTR business semantics or `requestState` integrity;
- external server identity merely from self-reported MCP client/server metadata;
- production readiness.

`requestState` is captured and committed as untrusted request data; this normalizer does not authenticate it. A server that lets it influence authorization or business logic still needs the MCP-defined integrity verification boundary.

## Next integration lots

1. exact-head review and adversarial normalization tests;
2. tool-definition-aware `Mcp-Param-*` mirror validation;
3. composition with the accepted shared POM-RX durable Gate rather than a private MCP Gate fork;
4. execution evidence plus independently sourced observation/reconciliation;
5. harmless local MCP demo;
6. benchmark against raw tool call, logging-only and policy-gateway-only baselines.
