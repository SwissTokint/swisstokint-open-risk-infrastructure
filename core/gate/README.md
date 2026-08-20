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

The Gate is bootstrapped with private `trusted_clock`, `observe_binding` and `execute_downstream` references. Per-call consumers do not supply a downstream callback, trusted timestamp or self-asserted trusted context. The bootstrap object is captured from exact own enumerable data descriptors: accessors, symbol keys, hidden/unknown fields, custom prototypes and Node Proxy wrappers are rejected before callback references are accepted.

The untrusted caller's raw execution attempt is never forwarded. After the trusted asynchronous observer resolves, Core immediately captures the complete observer record through the shared bounded `core/reference-data` plain-data boundary before reading binding fields. The captured record and nested prepared execution are detached and frozen; accessors, Proxies, custom prototypes, hidden/decorated properties, unsafe keys and out-of-bounds data fail closed. Only this Gate-owned prepared snapshot can reach the downstream adapter. This closes the resolved-record mutation/accessor/Proxy TOCTOU surface without duplicating a second plain-data implementation inside Gate.

The generic Core Gate still passes the caller-owned execution attempt to the installed trusted observer because application-specific observation/normalization belongs outside Core. The observer itself remains a trusted bootstrap dependency. In particular, the current API is still an asynchronous return-value API: JavaScript Promise/thenable resolution happens before Core receives the resolved observer record. This module therefore does **not** claim that a malicious observer return channel is side-effect-free before resolution. A stronger guarantee would require a separately reviewed callback/capture protocol rather than `await observeBinding(...)`.

The untrusted-facing Gate handle exposes consumption only. Reference issuance/state inspection live on a separately named local `testAuthority` retained by the trusted harness. This authority is reference-only and must never be represented as a production issuer.

The local reference Gate uses fake/test downstream adapters only. A production Gate remains blocked by production-grade source/Witness trust, trusted production time, production issuer integration and, outside one process, durable atomic consumption. Not-before/monotonic-clock hardening and durable consumption remain separately reviewed lots rather than being implied by this object-boundary hardening.

Design and hardening decisions:

- `docs/decisions/COUNCIL_POM_RX_CORE_EXACT_AUTH_GATE.md`
- `docs/adr/ADR-POMRX-CORE-EXACT-AUTH-GATE.md`
- `docs/decisions/COUNCIL_POM_RX_CORE_REFERENCE_GATE_HARDENING.md`
