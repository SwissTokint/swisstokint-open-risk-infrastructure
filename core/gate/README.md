# POM-RX Core — Single-use Gate

This directory owns the common execution-side Gate consumption semantics for POM-RX.

The Gate is the boundary that may call a downstream execution adapter after exact authorization. Application blocks must not fork the common capability lifecycle, expiry, replay or terminal-state rules.

Current status: **Core contract ratified; local reference implementation exists; production Gate unproved**.

Reference state machine:

```text
AVAILABLE
  -> VALIDATING
       -> REJECTED
       -> CONSUMING
            -> CONSUMED_SUCCESS
            -> CONSUMED_ERROR
```

A branded reference capability is audience-bound to one Gate instance and reserved synchronously by moving to `VALIDATING` before asynchronous context observation. This prevents concurrent double-use. The Gate rechecks expiry immediately before forwarding; every terminal state is non-reusable and a downstream error never rearms a capability automatically.

The Gate is bootstrapped with private `trusted_clock`, `observe_binding` and `execute_downstream` references. Per-call consumers do not supply a downstream callback, trusted timestamp or self-asserted trusted context.

The untrusted caller's raw execution attempt is never forwarded. The trusted observer returns the exact observed binding plus a prepared execution value; the Gate defensively snapshots bounded plain data and only that Gate-owned snapshot reaches the downstream adapter. This closes mutation-after-validation/TOCTOU in the local reference harness.

The untrusted-facing Gate handle exposes consumption only. Reference issuance/state inspection live on a separately named local `testAuthority` retained by the trusted harness. This authority is reference-only and must never be represented as a production issuer.

The local reference Gate uses fake/test downstream adapters only. A production Gate remains blocked by source/witness enrollment and revocation, trusted production time, production issuer integration and, outside one process, durable atomic consumption.

Design and hardening decisions:

- `docs/decisions/COUNCIL_POM_RX_CORE_EXACT_AUTH_GATE.md`
- `docs/adr/ADR-POMRX-CORE-EXACT-AUTH-GATE.md`
- `docs/decisions/COUNCIL_POM_RX_CORE_REFERENCE_GATE_HARDENING.md`
