# POM-RX Observation and Reconciliation Core

This shared Core block owns reference semantics for observing an execution through a separately installed observer and reconciling that captured evidence against a validated exact-authorization binding. Application adapters may translate domain-specific provider or system results into this shape, but they must not fork the Core comparison semantics.

## Current reference slice

`reference-observation-reconciliation.mjs` provides a bounded reference harness that:

- snapshots caller-owned reconciliation input and the observation reference before invoking the observer;
- accepts the complete Core exact-authorization binding and recomputes its domain-separated authorization commitment instead of trusting caller-supplied commitment metadata;
- derives the expected binding profile, run, action, context and authorization window from that validated binding;
- requires the observer to report the exact `binding_profile` it used and compares it before a result can be `MATCH`;
- binds reconciliation to an explicit expected execution status (`success`, `error` or deliberately broad `any`) and an optional expected effect commitment;
- treats profile/run/action/context/window/status/effect divergence as `MISMATCH` and unknown execution state as `INDETERMINATE`;
- rejects malformed, future or backwards observation chronology;
- emits deterministic domain-separated observation and reconciliation hashes;
- uses a synchronous monotonic trusted clock and fails closed on rollback.

## Observer output boundary

Observer evidence does **not** cross Core as the JavaScript return value of `observeExecution`. The installed callback has the reference contract:

```text
observeExecution(observationRef, deliverObservation, reportObserverFailure) -> undefined
```

The observer may start asynchronous work, but it must return `undefined` immediately and later call exactly one of the supplied terminal callbacks. `deliverObservation(value)` captures the value as bounded inert plain data **at the callback boundary, before any semantic reads**. Proxy wrappers, accessors, symbols, custom prototypes and unsupported/unbounded structures therefore fail closed at capture.

This sink contract is deliberate. An earlier return-value design awaited `observeExecution(...)`; JavaScript Promise/thenable assimilation can read a returned object's `then` property before Core gets a chance to validate it. A hostile Proxy could therefore execute a `then` getter before the plain-data boundary. Returned values are now rejected as observer protocol misuse and are never treated as evidence. Core deliberately does not inspect returned objects, promises or thenables and does not attach handlers to them, because even rejection-handler plumbing can consult user-controlled Promise properties. A trusted observer that creates asynchronous work therefore owns that work's rejection handling and must report operational failure through `reportObserverFailure`.

Synchronous conflicting terminal reports fail closed. After the invocation has returned, the first terminal callback settles the reference operation and later terminal callbacks have no effect. The installed observer is a trusted bootstrap dependency and is responsible for eventually delivering evidence or reporting failure; this reference harness does not prove observer liveness or impose a timeout.

## Explicit boundary

This is reference-only evidence logic, not proof of the external world. The installed observer is trusted to report what it actually observed; the module does not prove observer independence, host integrity, RPC honesty, chain/finality truth, physical-world effects, secure attestation or production trusted time. The observation hash proves what Core captured, not that the external claim is true.

A `MATCH` verdict means only that the captured observer evidence matches the validated authorization's binding profile, run, action, context and active window plus the explicitly supplied status/effect reconciliation expectations. `expected_execution_status=any` intentionally weakens status matching and is therefore committed into the reconciliation record. No private keys are stored, and this block performs no wallet/provider/network execution or transaction submission.
