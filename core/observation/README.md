# POM-RX Observation and Reconciliation Core

This shared Core block owns reference semantics for independently observing an execution and reconciling the observed action/context/status/effect against an exact authorization binding. Application adapters may supply domain-specific observation data, but they must not fork these comparison semantics.

## Current reference slice

`reference-observation-reconciliation.mjs` provides a bounded, in-memory reference harness that:

- snapshots caller-owned observation references before the first asynchronous boundary;
- invokes an independently installed observer callback rather than the forwarding adapter;
- requires exact run/action/context commitments and bounded authorization timestamps;
- binds reconciliation to an explicit expected execution status (`success`, `error` or deliberately broad `any`);
- records execution status plus an optional effect commitment;
- rejects malformed/future/backwards observation chronology;
- treats execution outside the authorization window as `MISMATCH`;
- treats a known status different from the explicit expectation as `MISMATCH`;
- treats unknown execution status as `INDETERMINATE`;
- compares an expected effect commitment when one is supplied;
- emits deterministic domain-separated observation and reconciliation hashes;
- uses a synchronous monotonic trusted clock and fails closed on rollback.

## Explicit boundary

This is reference-only evidence logic, not proof of the external world. The installed observer is trusted to report what it actually observed; this module does not prove observer independence, host integrity, chain finality, RPC honesty, physical-world effects or production attestation. It stores no private keys and performs no wallet/provider/network execution.

Wallet Guard and other application profiles can later add application-specific observers that translate controlled provider/chain results into the shared observation shape. A `MATCH` verdict means only that the supplied independently observed evidence matches the exact expected binding, status policy and optional effect commitment under this reference contract. Using `expected_execution_status=any` intentionally weakens status matching and is therefore explicit in the committed reconciliation evidence.
