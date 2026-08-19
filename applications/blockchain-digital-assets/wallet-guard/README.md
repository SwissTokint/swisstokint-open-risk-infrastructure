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
- a controlled in-memory host fixture whose page-facing object graph exposes only
  the guarded `ethereum.request` surface while keeping the fake raw provider in
  an unreachable closure.

`DENY` and critical `INDETERMINATE` paths are non-forwarding. The reference
provider integration is exercised only with controlled fake-provider tests.

The controlled-host fixture closes the **second-provider bypass inside that
specific returned page surface**: neither the page object nor its `ethereum`
object contains the raw provider, Core Gate, capability issuer or test authority.
That is a useful installation invariant for the simulated demo, not a claim
about arbitrary browser extensions or hostile host code.

This is **not** yet the complete Wallet Guard security claim. In particular:

- the reference authorization supplier is synthetic and does not prove a real
  signed Witness acknowledgement;
- the controlled host itself is trusted bootstrap code; a compromised browser,
  extension, injected script with an independently retained provider, or another
  provider installation outside this fixture remains out of scope;
- simulation/effect evidence, production Witness enrollment/revocation/trusted
  time, independent observation and reconciliation are still separate lots;
- no real wallet, private key, testnet/mainnet transaction, custody path or
  uncontrolled malicious site is part of this reference layer.

The first acceptable simulated demonstration must prove that a dangerous
approval/signature is denied before forwarding while an explicitly allowed
control request can be forwarded once and reconciled. A later burner-wallet
local/testnet E2E requires a separate explicit human gate and must use no
meaningful funds.
