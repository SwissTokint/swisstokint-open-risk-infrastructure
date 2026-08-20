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

- EVM request normalization and exact intent commitments;
- deterministic fail-closed local policy;
- provider-observed chain/account sampling;
- bootstrap-captured origin that is not accepted from request fields;
- repeated context checks around the Core reference single-use Gate;
- a Gate-owned prepared request re-normalized immediately before a controlled provider call;
- per-request synthetic reference authorization metadata with local reuse rejection.

`DENY` and critical `INDETERMINATE` paths are non-forwarding. The reference
provider integration is exercised only with controlled fake-provider tests.

A separate reference policy-state controller now provides process-local,
compare-and-swap policy replacement and an idempotent fail-safe kill-switch
transition. Each state has a monotonic revision plus a domain-separated state
commitment, while the existing normalized policy hash remains the exact policy
identity used by evaluation. The controller intentionally does not add a remote
operator channel, durable cross-process state, production authorization or a
provider integration by itself.

This is **not** yet the complete Wallet Guard security claim. In particular:

- the reference authorization supplier is synthetic and does not prove a real
  signed Witness acknowledgement;
- the bootstrap origin/provider authorities are trusted installation inputs;
- the caller-facing gateway does not expose the provider, but this alone does
  not prove that a browser/dApp has no second unguarded provider reference;
- policy-state mutation authority is still a trusted in-process reference
  dependency; durable state and authenticated remote control are not proved;
- simulation/effect evidence, production Witness enrollment/revocation/trusted
  time, independent observation and reconciliation are still separate lots;
- no real wallet, private key, testnet/mainnet transaction, custody path or
  uncontrolled malicious site is part of this reference layer.

The first acceptable simulated demonstration must prove that a dangerous
approval/signature is denied before forwarding while an explicitly allowed
control request is forwarded once and reconciled. A later burner-wallet
local/testnet E2E requires a separate explicit human gate and must use no
meaningful funds.
