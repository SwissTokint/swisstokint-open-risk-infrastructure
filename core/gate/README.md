# POM-RX Core — Single-use Gate

This directory owns the common execution-side Gate consumption semantics for POM-RX.

The Gate is the boundary that may call a downstream execution adapter after exact authorization. Application blocks must not fork the common capability lifecycle, temporal-validity, replay or terminal-state rules.

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

A branded reference capability is audience-bound to one Gate instance and reserved synchronously by moving to `VALIDATING` before asynchronous context observation. This prevents concurrent double-use. At reservation and immediately before forwarding, the Gate enforces the complete half-open authorization window `issued_at <= trusted_now < expires_at`. One Gate instance also requires accepted trusted-clock samples to be non-decreasing; backwards movement is rejected with `POMRX_GATE_E_TIME_ROLLBACK`, while equal timestamps remain valid. Every temporal failure is terminal/non-forwarding, every terminal capability state is non-reusable, and a downstream error never rearms a capability automatically.

The Gate is bootstrapped with private `trusted_clock`, `observe_binding` and `execute_downstream` references. Per-call consumers do not supply a downstream callback, trusted timestamp or self-asserted trusted context. The bootstrap object is captured from exact own enumerable data descriptors: accessors, symbol keys, hidden/unknown fields, custom prototypes and Node Proxy wrappers are rejected before callback references are accepted.

The untrusted caller's raw execution attempt is never forwarded. After the trusted asynchronous observer resolves, Core immediately captures the fixed observer envelope from exact own enumerable data descriptors before reading binding fields, then captures `prepared_execution` independently through the shared bounded `core/reference-data` plain-data boundary. This preserves the historical prepared-data depth/node budget while producing a detached frozen Gate-owned snapshot. Accessors, Proxies, custom prototypes, hidden/decorated properties, unsafe keys and out-of-bounds prepared data fail closed. Only this Gate-owned prepared snapshot can reach the downstream adapter.

The generic Core Gate still passes the caller-owned execution attempt to the installed trusted observer because application-specific observation/normalization belongs outside Core. The observer itself remains a trusted bootstrap dependency. In particular, the current API is still an asynchronous return-value API: JavaScript Promise/thenable resolution happens before Core receives the resolved observer record. This module therefore does **not** claim that a malicious observer return channel is side-effect-free before resolution. A stronger guarantee would require a separately reviewed callback/capture protocol rather than `await observeBinding(...)`.

The untrusted-facing Gate handle exposes consumption only. Reference issuance/state inspection live on a separately named local `testAuthority` retained by the trusted harness. This authority is reference-only and must never be represented as a production issuer.

The local reference Gate uses fake/test downstream adapters only. A production Gate remains blocked by production-grade source/Witness trust, trusted production time, production issuer integration and, outside one process, durable atomic consumption. The temporal hardening proves only local enforcement against the installed synchronous clock; it does not prove wall-clock correctness, tamper resistance, distributed time or production trusted-time service semantics. Durable consumption remains a separately reviewed lot.

Design and hardening decisions:

- `docs/decisions/COUNCIL_POM_RX_CORE_EXACT_AUTH_GATE.md`
- `docs/adr/ADR-POMRX-CORE-EXACT-AUTH-GATE.md`
- `docs/decisions/COUNCIL_POM_RX_CORE_REFERENCE_GATE_HARDENING.md`
- `docs/decisions/COUNCIL_POM_RX_CORE_GATE_TEMPORAL_VALIDITY.md`
