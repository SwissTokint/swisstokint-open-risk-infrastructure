# POM-RX Wallet Guard

Wallet Guard is one POM-RX application profile under Blockchain and digital assets, with a cybersecurity overlap.

Target controlled path:

```text
controlled dApp
  -> trusted request capture
  -> normalized EVM intent
  -> policy / preflight
  -> Witness
  -> exact single-use Gate
  -> test wallet/provider
  -> independent observation
  -> reconciliation
```

## Current reference implementation

The current repository contains a bounded local reference slice for:

- strict JSON-text ingress for controlled EIP-1193/JSON-RPC request fixtures;
- EVM request normalization and exact intent commitments;
- deterministic fail-closed local policy;
- provider-observed chain/account sampling;
- bootstrap-captured origin that is not accepted from request fields;
- repeated context checks around the Core reference single-use Gate;
- a Gate-owned prepared request re-normalized immediately before a controlled provider call;
- per-request synthetic reference authorization metadata with local reuse rejection.

`json-ingress.mjs` exists to close one narrow parser-equivalence gap before a raw JSON request is handed to Wallet Guard semantics. It lexically scans the JSON text before `JSON.parse`, rejects duplicate decoded object keys (including escaped spellings such as `m\u0065thod` versus `method`), forbidden prototype-pollution keys, unpaired Unicode surrogates, non-canonical JSON number syntax, excessive bytes/depth/nodes/string/key sizes and ambiguous top-level shapes. It then emits a frozen `{method, params}` request plus both a raw-text hash and a canonical-request hash.

The raw-text hash is deliberately named `raw_text_sha256`: this module receives a JavaScript string and therefore does **not** prove the exact transport bytes or the correctness of an upstream UTF-8/WebSocket/browser decoder. `transport_bytes_proved=false` stays explicit. The parser also does not perform method-specific EVM authorization; that remains the responsibility of the existing intent/decoder/policy layers.

`DENY` and critical `INDETERMINATE` paths are non-forwarding. The reference
provider integration is exercised only with controlled fake-provider tests.

This is **not** yet the complete Wallet Guard security claim. In particular:

- the reference authorization supplier is synthetic and does not prove a real
  signed Witness acknowledgement;
- the bootstrap origin/provider authorities are trusted installation inputs;
- the caller-facing gateway does not expose the provider, but this alone does
  not prove that a browser/dApp has no second unguarded provider reference;
- strict JSON text parsing does not prove upstream transport-byte decoding;
- simulation/effect evidence, production Witness enrollment/revocation/trusted
  time, independent observation and reconciliation are still separate lots;
- no real wallet, private key, testnet/mainnet transaction, custody path or
  uncontrolled malicious site is part of this reference layer.

The first acceptable simulated demonstration must prove that a dangerous
approval/signature is denied before forwarding while an explicitly allowed
control request can be forwarded once and reconciled. A later burner-wallet
local/testnet E2E requires a separate explicit human gate and must use no
meaningful funds.
