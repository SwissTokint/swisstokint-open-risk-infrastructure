# POM-RX Core — Single-use Gate

This directory owns the common execution-side Gate consumption semantics for POM-RX.

The Gate is the boundary that may call a downstream execution adapter after exact authorization. Application blocks must not fork the common capability lifecycle, expiry, replay or terminal-state rules.

Current status: **contract proposed, local reference implementation next**.

Candidate state machine:

```text
AVAILABLE
  -> REJECTED
  -> CONSUMING
       -> CONSUMED_SUCCESS
       -> CONSUMED_ERROR
```

Reservation must occur before the first downstream call or asynchronous boundary. Every terminal state is non-reusable. A downstream error never rearms a capability automatically.

The local reference Gate will use a fake downstream adapter only. A production Gate remains blocked by the production exact-authorization issuer prerequisites and, outside one process, durable atomic consumption.

Authoritative candidate design:

- `docs/decisions/COUNCIL_POM_RX_CORE_EXACT_AUTH_GATE.md`
- `docs/adr/ADR-POMRX-CORE-EXACT-AUTH-GATE.md`
