# POM-RX Core — reference durable Gate composition

Status: **reference-only composition; production Gate still unproved**.

`reference-durable-single-use-gate.mjs` composes the existing process-local reference single-use Gate with the filesystem-backed reference durable claim store. It preserves the standalone authorization semantics of both primitives and does not create a production authorization issuer.

## Ordering and fail-closed rule

The composed Gate performs this ordering for one locally issued reference capability:

```text
local wrapper AVAILABLE
  -> synchronous local VALIDATING reservation
  -> durable capability claim/tombstone
  -> inner Core Gate reservation and trusted-time check
  -> trusted binding observation and exact comparison
  -> second trusted-time check
  -> downstream execution
  -> durable terminal marker
```

The durable claim is acquired **before** the inner Gate can call its trusted observer or downstream adapter. Under the documented trusted local-filesystem assumptions, the capability identifier is therefore an at-most-once replay key across processes sharing the same root. A competing process/store that already owns the capability tombstone blocks the composed Gate before observer or downstream execution.

The wrapper also reserves synchronously before its first asynchronous boundary, so two calls in one process cannot race their own durable claim.

If durable claim acquisition fails, the local wrapper becomes terminal `REJECTED` and the inner Gate is never entered. If the durable claim succeeds but a later trusted-time, observer, prepared-data or exact-binding check rejects before forwarding, the local state becomes `REJECTED` while the persisted claim intentionally remains `RESERVED`. The composition does **not** manufacture a `CONSUMED_*` terminal record for an action that never reached downstream. The occupied tombstone still makes that capability non-reusable under the reference store assumptions; a fresh authorization lifecycle is required.

If downstream succeeds, the local Gate reaches `CONSUMED_SUCCESS` and the composition persists `CONSUMED_SUCCESS` before returning the downstream result. If downstream fails, the local Gate reaches `CONSUMED_ERROR`; the composition persists `CONSUMED_ERROR` before propagating the Gate's downstream-failure diagnostic.

If terminal-marker persistence itself fails after downstream has already resolved or rejected, the durable claim remains fail-closed and the same capability must not be retried. This composition does not infer external effect truth from local terminal state; independent observation/reconciliation remains required.

## Durable-root identity, Linux procfs and lifecycle

The reference store pins the validated durable root with an open directory descriptor and revalidates the configured pathname identity before operations. It must not silently fall back to a pathname after that identity has been pinned.

On Linux, pinned-root traversal uses `/proc/self/fd/<fd>`. **Accessible procfs fd paths are therefore an explicit platform requirement for this reference implementation.** Root bootstrap verifies that the fd-following path resolves to the same device/inode as the validated durable root. If `/proc/self/fd` is unavailable or inaccessible (for example in a hardened chroot/container), bootstrap fails closed with `POMRX_GATE_E_DURABLE_ROOT_INVALID` before claim/inspection work begins.

The root descriptor has explicit ownership. `createReferenceDurableClaimStore()` exposes an idempotent asynchronous `close()` lifecycle. Once close begins, new store operations are rejected; already-started store operations drain before the pinned descriptor is closed. The composed durable harness exposes its own idempotent `close()`, stops accepting new consumes/issuance, drains already-started consumes, then closes the internal durable store. Callers that create stores or composed harnesses with bounded lifetimes must close them when the lifetime ends. A closed instance is not reusable.

A nonterminal local outcome does not require retaining a pinned child-directory descriptor. When the inner Gate ends as `REJECTED` or `CONSUMED_UNKNOWN`, the store releases the verified process-local claim fd while leaving the durable tombstone `RESERVED`; no success/error terminal truth is fabricated and replay remains blocked. Root cleanup separates stable descriptor ownership (`dev`/`ino`) from mutable policy metadata: metadata drift may still make `close()` fail closed, but a descriptor whose stable ownership is verified is released rather than leaked. Conversely, a reused foreign numeric fd is never closed.

`close()` is also non-reentrant with respect to its own active consume context. A trusted callback that calls and awaits `close()` from inside the consume it would need to drain receives `POMRX_GATE_E_REENTRANT_CLOSE` instead of creating a self-dependent wait. External close calls still drain already-started consumes normally.

## Trust boundary

The composed bootstrap accepts exactly:

- `rootDir` — root passed into the reference durable claim store;
- `trustedClock` — private synchronous clock reference used by the inner Gate;
- `observeBinding` — private trusted application observation adapter;
- `executeDownstream` — the sole downstream execution adapter.

The public Gate handle exposes only `consume()`. The top-level composed harness additionally exposes only lifecycle `close()` beside the existing `gate` and `testAuthority` surfaces. The durable store object, root path, observer, clock and downstream callback are not exposed. Reference issuance plus local/durable inspection remain behind `testAuthority` and are not production issuer APIs.

The composition creates its durable store internally rather than accepting a caller-supplied structural store object. Bootstrap capture rejects Proxy, accessor, symbol, hidden/unknown and custom-prototype substitution before callback/root values are accepted. Reflection and WeakMap dispatch used by this boundary are captured at module initialization. Poisoning before module initialization or compromise of the runtime itself remain outside the stated guarantee.

Persisted claim/terminal JSON and public durable inspection records are converted to prototype-inert snapshots before they cross asynchronous return boundaries. This prevents an inherited `Object.prototype.then` from rewriting persisted or reported terminal truth during Promise assimilation.

## Preserved Core semantics

Capability identity, exact authorization commitment, trusted-time validation, observer binding, prepared-execution capture and single-use terminal behavior continue to come from shared Core primitives. Applications must consume this common boundary rather than reimplement durable replay semantics.

This lot does not change historical `pom-rx/0.1` receipt/verifier behavior, strict-verifier limits, Witness semantics, canonicalization rules or application policy.

## Deliberate non-claims

This reference composition does **not** prove:

- production authorization issuance;
- production source/Witness enrollment, revocation, KMS/HSM or trusted-time service correctness;
- network/distributed filesystem atomicity;
- distributed consensus or multi-host quorum;
- crash recovery or lease takeover;
- resistance to a hostile same-OS-user process or storage/path substitution beyond the documented root assumptions;
- external execution truth or external effect truth;
- native execution timing;
- independent observation/reconciliation truth;
- simulation-to-forwarding binding;
- browser/wallet interception integrity;
- testnet/mainnet safety or production readiness.

No private key, seed, secret, funded wallet, network transaction, testnet/mainnet execution or meaningful funds are used by this reference lot.

## Asynchronous downstream result ambiguity

A synchronous throw before `executeDownstream` returns a result channel is locally classifiable as `CONSUMED_ERROR`. Once a result channel exists, an asynchronous rejection does not prove whether the external effect failed or result delivery became ambiguous. The reference Gate burns the capability as local `CONSUMED_UNKNOWN` and leaves the durable claim `RESERVED` without a success/error terminal. Independent observation/reconciliation owns later external-effect classification.