# POM-RX Core — Single-use Gate

This directory owns the common execution-side Gate consumption semantics for POM-RX.

The Gate is the boundary that may call a downstream execution adapter after exact authorization. Application blocks must not fork the common capability lifecycle, temporal-validity, replay or terminal-state rules.

Current status: **Core contract ratified; local reference implementation and reference durable composition exist; production Gate unproved**.

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

The local reference Gate uses fake/test downstream adapters only. A production Gate remains blocked by production-grade source/Witness trust, trusted production time, production issuer integration and durable semantics beyond the explicitly documented local-filesystem reference assumptions. The temporal hardening proves only local enforcement against the installed synchronous clock; it does not prove wall-clock correctness, tamper resistance, distributed time or production trusted-time service semantics.

## Reference durable claim store

`reference-durable-claim-store.mjs` adds a deliberately narrow filesystem-backed reference primitive for durable **at-most-once capability claiming** across multiple processes that share one trusted local filesystem directory.

The capability identifier itself is the replay key. Claiming attempts exclusive capability-directory creation, so under the configured local-filesystem semantics the same capability cannot be reclaimed with either the same or a substituted authorization commitment. `mkdir()` returning is **not** treated as proof that the tombstone is durable: an interrupted attempt before the subsequent root-directory fsync is outside the durable-success claim. `claim()` returns success only after the capability-directory entry has been fsynced and the complete `claim.json` record has been published and fsynced. Once that root-directory fsync has succeeded, an incomplete later crash point intentionally remains fail-closed instead of being removed or re-armed automatically.

Claim metadata and the optional success/error terminal marker are published without exposing partially written final record names. Each record is first written and fsynced under a same-directory hidden temporary name, then atomically installed at the exclusive final name via a hard link, the temporary name is removed, and the directory is fsynced before success is reported. Concurrent `inspect()` therefore sees either no final record yet or a complete final record under the stated local-filesystem assumption; it must not classify a healthy in-progress publication as persisted corruption. An incomplete tombstone proves only that the capability path is occupied: it does **not** report a caller-supplied authorization commitment as if that binding had been persisted.

The persisted record separates observations from deployment assumptions. `exclusive_claim_recorded=true` means this store completed its exclusive claim-record write. `local_filesystem_atomicity_assumed=true` remains an explicit assumption: this module cannot determine from a pathname alone whether the underlying mount provides the local atomicity semantics it relies on. `network_filesystem_atomicity_proved`, `distributed_consensus_proved` and `crash_recovery_proved` remain false.

The configured root must be an absolute direct directory path without symlink indirection. On Unix-like platforms exposing ownership/mode bits, the reference store rejects group/world-writable roots and requires ownership by the current process user. Public bootstrap and per-call records are captured from exact own enumerable data descriptors: revoked/live Proxies, accessors, hidden/unknown fields, symbols and custom prototypes are rejected before their values are trusted. Descriptor-kind checks use own fields only, so inherited `Object.prototype.get` / `set` poisoning cannot substitute data while the supported Node built-ins remain trusted.

## Reference durable Gate composition

`reference-durable-single-use-gate.mjs` composes the process-local Gate with the reference durable claim store. The wrapper reserves locally before its first `await`, acquires the durable capability tombstone before the inner Gate can observe or forward, and persists `CONSUMED_SUCCESS` / `CONSUMED_ERROR` before reporting the corresponding successful/failed downstream outcome. A validation or binding rejection after the durable claim intentionally leaves the durable state `RESERVED`: the capability remains fail-closed/non-reusable without pretending an external action executed.

This is still a **reference-only local-filesystem composition**, not a production Gate. It does not prove hostile same-user storage resistance, network-filesystem atomicity, crash recovery, distributed consensus, production issuer/Witness/time correctness, external execution truth or independent effect truth. See `DURABLE-COMPOSITION.md` for ordering and deliberate non-claims.

Design and hardening decisions:

- `docs/decisions/COUNCIL_POM_RX_CORE_EXACT_AUTH_GATE.md`
- `docs/adr/ADR-POMRX-CORE-EXACT-AUTH-GATE.md`
- `docs/decisions/COUNCIL_POM_RX_CORE_REFERENCE_GATE_HARDENING.md`
- `docs/decisions/COUNCIL_POM_RX_CORE_GATE_TEMPORAL_VALIDITY.md`
