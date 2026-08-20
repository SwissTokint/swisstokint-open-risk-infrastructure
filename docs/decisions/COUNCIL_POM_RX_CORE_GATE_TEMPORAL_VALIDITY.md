# Council note — POM-RX Core reference Gate temporal validity

Status: `REFERENCE_HARDENING / NON_PRODUCTION`

Date: 2026-08-20

## Decision

The local Core reference single-use Gate must enforce the complete exact-authorization time window at every trusted-clock decision point:

```text
issued_at <= trusted_now < expires_at
```

The Gate must also reject a trusted-clock sample that moves backwards relative to any earlier accepted sample in the same Gate instance.

## Why this change is required

The previous reference Gate checked only `trusted_now < expires_at`. A syntactically valid capability could therefore be consumed before its declared `issued_at`, and a backwards-moving clock during or between consumptions could make an already-observed later instant appear earlier again.

Those behaviors weaken the meaning of the exact authorization window even though the clock itself remains a trusted installation dependency.

## Reference behavior

The hardened reference Gate now:

- rejects pre-`issued_at` consumption with `POMRX_GATE_E_CAPABILITY_NOT_YET_VALID` before observer execution;
- rejects `trusted_now >= expires_at` as before;
- maintains one Gate-instance-local last accepted trusted-clock sample;
- rejects backwards movement with `POMRX_GATE_E_TIME_ROLLBACK`;
- allows equal timestamps because the contract requires non-decreasing, not strictly increasing, trusted time;
- repeats the complete active-window check after asynchronous observation immediately before downstream forwarding;
- terminally rejects the capability on any temporal failure, preserving non-forwarding behavior.

## Composition with current Gate hardening

This decision composes with the resolved-observer object-boundary hardening already merged in Core. Temporal checks do not weaken descriptor-only observer-envelope capture, the independent `prepared_execution` depth/node budget, or the rule that only the detached Gate-owned prepared snapshot can reach downstream.

The current observer API still uses `await observeBinding(...)`. Promise/thenable return-channel behavior before resolution remains a separately scoped, explicitly unproved boundary and is not strengthened by this temporal lot.

## Scope boundary

This does **not** prove that the installed clock is externally correct, tamper-resistant, consensus-backed or production-grade. It proves only that the reference Gate treats its installed synchronous clock as a non-decreasing authority and will not widen a capability's declared `[issued_at, expires_at)` window through local temporal semantics.

No private keys, wallet integration, network transaction or funded account is introduced by this change.
