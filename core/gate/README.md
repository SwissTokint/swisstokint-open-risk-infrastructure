# POM-RX Core — Single-use Gate

This directory owns the common execution-side Gate consumption semantics for POM-RX.

The Gate is the boundary that may call a downstream execution adapter after exact authorization. Application blocks must not fork the common capability lifecycle, expiry, replay or terminal-state rules.

Current status: **contract proposed, local reference implementation next**.

Candidate state machine:

```text
AVAILABLE
  -> VALIDATING
       -> REJECTED
       -> CONSUMING
            -> CONSUMED_SUCCESS
            -> CONSUMED_ERROR
```

A branded capability is reserved synchronously by moving to `VALIDATING` before asynchronous context observation. This prevents concurrent double-use. The Gate rechecks expiry immediately before forwarding; every terminal state is non-reusable and a downstream error never rearms a capability automatically.

The Gate is bootstrapped with private `trusted_clock`, `observe_binding` and `execute_downstream` references. Per-call consumers do not supply a downstream callback, trusted timestamp or self-asserted trusted context.

The local reference Gate will use a fake downstream adapter only. A production Gate remains blocked by the production exact-authorization issuer prerequisites and, outside one process, durable atomic consumption.

Authoritative candidate design:

- `docs/decisions/COUNCIL_POM_RX_CORE_EXACT_AUTH_GATE.md`
- `docs/adr/ADR-POMRX-CORE-EXACT-AUTH-GATE.md`
