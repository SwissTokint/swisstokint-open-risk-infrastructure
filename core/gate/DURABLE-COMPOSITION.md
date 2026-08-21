# POM-RX Core — reference durable Gate composition

Status: **reference-only composition; production Gate still unproved**.

`reference-durable-single-use-gate.mjs` composes the existing process-local reference single-use Gate with the existing filesystem-backed reference durable claim store. It does not change the standalone APIs or semantics of either primitive, and it does not create a production authorization issuer.

## Ordering and fail-closed rule

The composed Gate performs the following ordering for one locally issued reference capability:

```text
local wrapper AVAILABLE
  -> synchronous local VALIDATING reservation
  -> durable capability claim/tombstone
  -> inner Core Gate reservation and trusted-time check
  -> trusted binding observation and exact comparison
  -> second trusted-time check
  -> downstream execution
  -> optional durable terminal marker
```

The durable claim is acquired **before** the inner Gate can call its trusted observer or downstream adapter. This makes the capability identifier the at-most-once replay key across processes that share the same trusted local filesystem root. A competing process/store that already owns the same capability tombstone blocks the composed Gate before observer or downstream execution.

The local wrapper also reserves synchronously before its first asynchronous boundary, so two calls in one process cannot race their own durable claim.

If durable claim acquisition fails, the local wrapper becomes terminal `REJECTED` and the inner Gate is never entered. If the durable claim succeeds but a later trusted-time, observer, prepared-data or exact-binding check rejects before forwarding, the local state becomes `REJECTED` while the persisted claim intentionally remains `RESERVED`. The composition does **not** manufacture a `CONSUMED_*` terminal record for an action that never reached downstream. The occupied tombstone still burns that capability globally under the durable-store filesystem assumptions, so a fresh authorization lifecycle is required.

If downstream succeeds, the local Gate reaches `CONSUMED_SUCCESS` and the composition persists a `CONSUMED_SUCCESS` terminal marker before returning the downstream result. If downstream fails, the local Gate reaches `CONSUMED_ERROR`; the composition persists `CONSUMED_ERROR` before rethrowing the Gate's downstream-failure diagnostic.

If terminal-marker persistence itself fails after downstream has already resolved or rejected, the local Gate state still reflects the downstream result and the durable claim remains fail-closed. The caller receives the durability failure rather than a false assurance that the terminal outcome was persisted. The same capability must not be retried; independent observation/reconciliation is required to establish external effect truth.

## Trust boundary

The composed bootstrap accepts exactly:

- `rootDir` — absolute root passed into the reviewed reference durable claim store;
- `trustedClock` — private synchronous trusted-clock reference used by the inner Gate;
- `observeBinding` — private trusted application observation adapter;
- `executeDownstream` — the sole downstream execution adapter.

The public Gate handle exposes only `consume()`. The durable store, root path, observer, clock and downstream callback are not exposed on that handle. Reference issuance plus local/durable inspection remain behind the separately named `testAuthority` and are not production issuer APIs.

The composition creates its durable store internally from `rootDir` rather than accepting a caller-supplied structural store object. Bootstrap capture rejects Proxy, accessor, symbol, hidden/unknown and custom-prototype substitution before callback/root values are accepted. Reflection and local WeakMap dispatch used by this new boundary are captured at module initialization. The composed durable claim store and process-local Gate likewise capture their load-bearing exact-object creation/reflection and WeakMap constructor/dispatch at their own module initialization, so post-import same-realm replacement cannot redirect the durable-root snapshot or rewrite the inner authorization binding. Poisoning before module initialization remains outside the stated guarantee.

## Preserved Core semantics

This lot does not fork application behavior into Core. Capability identity, exact authorization commitment, trusted-time validation, observer binding, prepared-execution capture and single-use terminal behavior continue to come from the shared Core primitives. Wallet Guard and other applications must consume this common boundary rather than reimplementing durable replay semantics.

No historical `pom-rx/0.1` receipt/verifier behavior, strict-verifier limits, Witness semantics, canonicalization rule or application policy is changed by this composition.

## Deliberate non-claims

This reference composition proves only bounded behavior under the already documented assumptions of its two components. It does **not** prove:

- production authorization issuance;
- production source/Witness enrollment, revocation, KMS/HSM or trusted-time service correctness;
- network/distributed filesystem atomicity;
- distributed consensus or multi-host quorum;
- crash recovery or lease takeover;
- resistance to a hostile same-OS-user process or storage/path substitution after validation;
- external execution truth or external effect truth;
- native execution timing;
- independent observation/reconciliation truth;
- simulation-to-forwarding binding;
- browser/wallet interception integrity;
- testnet/mainnet safety or production readiness.

No private key, seed, secret, funded wallet, network transaction, testnet/mainnet execution or meaningful funds are used by this reference lot.
