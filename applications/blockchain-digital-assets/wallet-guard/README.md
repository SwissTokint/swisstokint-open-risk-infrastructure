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
- per-request synthetic reference authorization metadata with local reuse rejection;
- a reference preflight-evidence builder that binds one locally normalized intent and exact local policy decision to the shared `pom-rx/0.1` receipt format without creating a new Core receipt implementation.

The preflight-evidence builder emits a portable POM-RX preflight receipt only for a determinate Wallet Guard `ALLOW` or `DENY`. `INDETERMINATE` remains explicit and does **not** get collapsed into a legacy `deny` receipt merely to fit the binary preflight outcome vocabulary. The builder also deliberately accepts no caller-supplied simulation `pass`; until the separately reviewed simulation-evidence layer is merged and composed, simulation remains `not_run` at this boundary.

Preflight chronology is sampled from a bootstrap-installed synchronous reference clock rather than request data. The builder rejects backwards clock movement and local reuse of an evidence id or run id. The standalone decision commitment binds evidence/run identity, agent/subject/source metadata, the sampled occurrence time, exact policy identity and the Wallet Guard intent commitment. This still does not prove a production trusted-time source, so the companion evidence states `production_trusted_time_proved=false`.

Every emitted preflight receipt remains reference evidence only. A valid receipt proves neither Witness trust nor execution authorization, so the companion record sets `authorization_eligible=false` and `authorization_proved=false`.

`DENY` and critical `INDETERMINATE` paths are non-forwarding. The reference
provider integration is exercised only with controlled fake-provider tests.

This is **not** yet the complete Wallet Guard security claim. In particular:

- the reference authorization supplier is synthetic and does not prove a real
  signed Witness acknowledgement;
- the bootstrap origin/provider authorities are trusted installation inputs;
- the caller-facing gateway does not expose the provider, but this alone does
  not prove that a browser/dApp has no second unguarded provider reference;
- simulation/effect evidence, production Witness enrollment/revocation/trusted
  time, independent observation and reconciliation are still separate lots;
- no real wallet, private key, testnet/mainnet transaction, custody path or
  uncontrolled malicious site is part of this reference layer.

The first acceptable simulated demonstration must prove that a dangerous
approval/signature is denied before forwarding while an explicitly allowed
control request can be forwarded once and reconciled. A later burner-wallet
local/testnet E2E requires a separate explicit human gate and must use no
meaningful funds.
