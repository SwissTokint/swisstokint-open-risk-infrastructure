# POM-RX Wallet Guard

Wallet Guard is one POM-RX application profile under Blockchain and digital assets, with a cybersecurity overlap.

Target controlled path:

```text
controlled dApp
  -> trusted request capture
  -> normalized EVM intent
  -> decoded request-effect evidence
  -> policy / preflight
  -> Witness
  -> exact single-use Gate
  -> test wallet/provider
  -> independent observation
  -> reconciliation
```

## Current reference implementation

The current repository contains a bounded local reference slice for:

- EVM request normalization and exact intent commitments;
- deterministic decoded request-effect evidence for recognized native transfer,
  ERC-20 transfer/approval, operator-approval and exact Permit request classes;
- explicit `unknown` effect semantics for unknown calldata, unknown typed data,
  generic signatures and unsupported RPC methods rather than inventing a known
  downstream effect;
- deterministic fail-closed local policy;
- provider-observed chain/account sampling;
- bootstrap-captured origin that is not accepted from request fields;
- repeated context checks around the Core reference single-use Gate;
- a Gate-owned prepared request re-normalized immediately before a controlled provider call;
- per-request synthetic reference authorization metadata with local reuse rejection.

Decoded effect evidence is intentionally about **requested fields under the local
decoding convention**, not target-contract behavior or external-world state. A
recognized selector proves which fields this reference decoder extracted from
the request; it does not prove that the target bytecode implements the expected
ERC-20/ERC-721/ERC-1155 semantics. Likewise, `data=0x` does not prove that a
contract target has no receive/fallback side effects. The evidence therefore
keeps complete semantic projection, target-code semantics, external-state and
external-effect proof flags false.

A Permit signature request can still be represented as an allowance
authorization request without claiming that an allowance was actually changed
on-chain or that every signed typed-data field was projected into effect
fields.

`DENY` and critical `INDETERMINATE` paths are non-forwarding. The reference
provider integration is exercised only with controlled fake-provider tests.

This is **not** yet the complete Wallet Guard security claim. In particular:

- the reference authorization supplier is synthetic and does not prove a real
  signed Witness acknowledgement;
- the bootstrap origin/provider authorities are trusted installation inputs;
- the caller-facing gateway does not expose the provider, but this alone does
  not prove that a browser/dApp has no second unguarded provider reference;
- simulation evidence, production Witness enrollment/revocation/trusted time,
  external execution truth, independent observation and reconciliation are
  still separate lots;
- no real wallet, private key, testnet/mainnet transaction, custody path or
  uncontrolled malicious site is part of this reference layer.

The first acceptable simulated demonstration must prove that a dangerous
approval/signature is denied before forwarding while an explicitly allowed
control request can be forwarded once and reconciled. A later burner-wallet
local/testnet E2E requires a separate explicit human gate and must use no
meaningful funds.
