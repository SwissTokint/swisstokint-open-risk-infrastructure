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

## Reference durable claim store

`reference-durable-claim-store.mjs` adds a deliberately narrow filesystem-backed reference primitive for the first part of that last requirement: durable **at-most-once capability claiming** across multiple processes that share one trusted local filesystem directory.

The capability identifier itself is the replay key. Claiming attempts an exclusive capability-directory creation, so under the configured local-filesystem semantics the same capability cannot be reclaimed with either the same or a substituted authorization commitment. Claim metadata and the optional success/error terminal marker are written exclusively and fsynced. A crash after the exclusive directory claim intentionally leaves a tombstone; incomplete or corrupt persisted state remains fail-closed instead of being removed or re-armed automatically. An incomplete tombstone proves only that the capability path is occupied: it does **not** report a caller-supplied authorization commitment as if that binding had been persisted.

The persisted record distinguishes what the implementation actually observes from what deployment must supply. `exclusive_claim_recorded=true` means this store completed its exclusive claim-record write. `local_filesystem_atomicity_assumed=true` is deliberately an assumption, not a proof: this module cannot determine from a pathname alone whether the underlying mount provides the local atomicity semantics it relies on. `network_filesystem_atomicity_proved`, `distributed_consensus_proved` and `crash_recovery_proved` therefore remain false.

The configured root must be an absolute direct directory path without symlink indirection. On platforms exposing Unix ownership/mode bits, the reference store rejects a root that is group/world writable and requires ownership by the current process user. This narrows accidental shared-directory deployment but does not prove resistance against a hostile process running under the same OS identity, mount substitution, storage corruption or a network/distributed filesystem.

This primitive is **not integrated into the reference Gate yet** and does not claim durable Gate consumption by itself. It proves only the bounded records it persists and the behavior exercised in the controlled reference environment. Distributed consensus, network-filesystem atomicity, crash recovery/lease takeover, hostile same-OS-user resistance, production issuer correctness and external execution all require separate reviewed integration and operational storage semantics before a production Gate claim.

Design and hardening decisions:

- `docs/decisions/COUNCIL_POM_RX_CORE_EXACT_AUTH_GATE.md`
- `docs/adr/ADR-POMRX-CORE-EXACT-AUTH-GATE.md`
- `docs/decisions/COUNCIL_POM_RX_CORE_REFERENCE_GATE_HARDENING.md`
