# POM-RX Wallet Guard

Wallet Guard is one POM-RX application profile under Blockchain and digital assets, with a cybersecurity overlap.

Target controlled path:

```text
controlled dApp
  -> trusted request capture
  -> normalized EVM intent
  -> policy / preflight
  -> bounded simulation / effect evidence
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
- per-request synthetic reference authorization metadata with local reuse rejection;
- bounded reference simulation evidence that re-normalizes the exact request under the
  trusted intent context before invoking a separately installed simulator callback;
- domain-separated simulation commitments over exact intent/context identity plus
  simulator state/effect commitments;
- local evidence branding so a forged structural simulation object cannot be handed to
  Wallet Guard policy as if it came from the reference simulation harness.

`DENY` and critical `INDETERMINATE` paths are non-forwarding. The reference
provider integration is exercised only with controlled fake-provider tests.

The simulation harness is also reference-only. It treats the installed simulator as a
trusted bootstrap dependency, but it does not trust caller-selected request bytes: the
raw request is snapshotted before the async simulator boundary, re-normalized using the
already trusted origin/chain/account/request-id, and required to reproduce the exact
intent commitment. Simulator identity substitution or malformed callback output is
downgraded to `mismatch`; operational simulator failure becomes `unavailable`. Neither
result can be represented as simulator truth being proved.

This is **not** yet the complete Wallet Guard security claim. In particular:

- the current provider gateway does not yet consume/recheck the new simulation
  commitment before forwarding; that integration is a separate lot;
- the reference simulator does not prove RPC honesty, EVM state truth, chain finality or
  atomic equivalence between simulated state and later execution state;
- the reference authorization supplier is synthetic and does not prove a real
  signed Witness acknowledgement;
- the bootstrap origin/provider/simulator authorities are trusted installation inputs;
- the caller-facing gateway does not expose the provider, but this alone does
  not prove that a browser/dApp has no second unguarded provider reference;
- production Witness enrollment/revocation/trusted time, independent observation and
  reconciliation are still separate or governance-gated lots;
- no real wallet, private key, testnet/mainnet transaction, custody path or
  uncontrolled malicious site is part of this reference layer.

The first acceptable simulated demonstration must prove that a dangerous
approval/signature is denied before forwarding while an explicitly allowed
control request can be forwarded once and reconciled. A later burner-wallet
local/testnet E2E requires a separate explicit human gate and must use no
meaningful funds.