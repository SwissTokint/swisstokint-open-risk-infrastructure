# ADR — POM-RX Core Exact Authorization and Single-Use Gate

Status: `PROPOSED / TIER_B / HUMAN_REVIEW_REQUIRED`

Date: 2026-08-19

Baseline: `8b8630c124bbf37d2919aa008e4f7f587f5c92f2`

Council: `docs/decisions/COUNCIL_POM_RX_CORE_EXACT_AUTH_GATE.md`

## Context

POM-RX now has an activated bounded strict structural verifier, but that verifier intentionally cannot authorize execution. Witness signature primitives also exist without a complete enrollment/revocation/trusted-time service boundary. The next Core dependency is therefore an exact authorization and Gate contract that is common across application blocks without pretending the production issuer already exists.

## Decision

Adopt a two-part Core boundary:

1. **Exact authorization binding** — an exact, short-lived binding between one POM-RX preflight/witness evidence set and one application action/context commitment.
2. **Single-use Gate consumption** — a terminal state machine that reserves a capability before downstream execution and never automatically rearms it.

The first implementation is a local reference runtime only. Production authorization remains blocked on witness trust-lifecycle hardening.

## Exact binding schema

The canonical candidate record uses exact keys:

```text
schema_version = pom-rx-exact-authorization/0.1
capability_id
run_id
agent_ref
subject_ref
method_hash
policy_hash
action_commitment
context_commitment
preflight_receipt_hash
witness_ack_hash
issued_at
expires_at
```

Hashes are lowercase SHA-256. Identifiers and timestamps are bounded and canonicalized before use. Unknown fields fail closed.

`action_commitment` represents the exact normalized action. `context_commitment` represents trusted execution context observed by the application boundary. POM-RX Core compares these commitments exactly and does not infer chain-specific semantics.

## Application responsibility

Each application block owns its domain normalization but not Gate semantics.

For Wallet Guard, `context_commitment` must commit trusted boundary observations required by `ADR-POMRX-WALLET-GUARD-MVP.md`, including origin, active chain, active account, RPC method and the normalized request identity/effects required by the Wallet Guard contract.

The Gate must receive the freshly recomputed commitment from the trusted adapter, not from dApp-supplied metadata.

## Production issuer prerequisites

A usable production capability may be minted only after all of the following are proved:

- exact strict preflight structural verification under the selected verifier/policy tuple;
- preflight outcome `allow`;
- enrolled source key;
- enrolled distinct witness key;
- `witnessed` acknowledgement, never `dry_run`;
- exact preflight/run binding;
- trusted evaluation time before witness/capability expiry;
- revocation checks at the same trusted instant;
- exact action/context/policy binding.

Because enrollment, revocation and trusted-time infrastructure are not yet complete, this ADR authorizes only a local reference capability for conformance testing, not production issuance.

## Local capability model

The reference capability is process-local, branded through module-private state and non-serializable. A plain object, JSON clone or deserialized record cannot impersonate a usable capability.

The reference issuer must be explicitly named test/reference and excluded from public production exports. It exists only to exercise Gate semantics before the production issuer trust boundary is ready.

## Gate state machine

```text
AVAILABLE
  -> REJECTED
  -> CONSUMING
       -> CONSUMED_SUCCESS
       -> CONSUMED_ERROR
```

The Gate atomically changes state before invoking or awaiting the downstream adapter.

Any terminal state is permanently non-reusable. In particular, downstream failure does not restore `AVAILABLE`; a retry requires a new authorization lifecycle.

A mismatch or expired capability may transition to `REJECTED`. This intentionally prefers fail-closed safety over preserving availability.

## Exact consumption inputs

A Gate consumption attempt supplies:

```text
capability
trusted_evaluation_instant
action_commitment
context_commitment
preflight_receipt_hash
policy_hash
witness_ack_hash
execute_once callback
```

The capability itself already binds these values. The Gate compares them with exact equality after strict validation.

`execute_once` is reachable only after reservation. No rejected path may invoke it.

## Concurrency rule

The selected local runtime must reserve consumption synchronously before the first asynchronous boundary. Two concurrent calls using the same capability therefore cannot both reach the downstream adapter.

If a future deployment uses multiple processes or hosts, process-local state is insufficient. Durable atomic consumption becomes a separately reviewed dependency.

## Time rule

The Gate uses only a trusted host evaluation instant. Request timestamps, receipt timestamps and dApp fields cannot extend expiry.

Canonical UTC instants are required. Expired or malformed time is fail-closed.

## Failure vocabulary

The reference Gate must distinguish at least:

```text
POMRX_GATE_E_CAPABILITY_REQUIRED
POMRX_GATE_E_CAPABILITY_STALE
POMRX_GATE_E_CAPABILITY_EXPIRED
POMRX_GATE_E_BINDING_MISMATCH
POMRX_GATE_E_TIME_INVALID
POMRX_GATE_E_DOWNSTREAM_FAILED
```

Diagnostic detail must not leak private wallet secrets or raw policy values.

## Security assertions

Before `CORE_GATE_REFERENCE_READY`:

- plain-object injection fails;
- malformed binding fails;
- action/context/preflight/policy/witness mutations fail;
- expiry fails;
- success replay fails;
- error replay fails;
- concurrent double-use reaches downstream at most once;
- exact valid control reaches downstream exactly once;
- downstream error is terminal;
- the reference capability cannot be represented as production authorization;
- no application receives a second downstream-provider reference in the accepted harness.

## Non-goals

This ADR does not establish:

- source/witness enrollment or revocation;
- a trusted clock service;
- multi-process durable replay storage;
- wallet intent normalization;
- transaction simulation;
- browser interception;
- native execution proof;
- independent observation;
- real wallet/testnet/mainnet authorization;
- production safety, audit or certification.

## Compatibility

Historical `verifyPomRxChain()` remains unchanged. The strict profiled verifier remains structurally non-authorizing. Exact authorization/Gate code lives under Core and application blocks reference it rather than forking it.

## Implementation lots

### Lot A — reference binding and capability

- exact schema validator;
- deterministic action/context commitment contract;
- process-local branded test/reference capability;
- no production issuer export.

### Lot B — local single-use Gate

- terminal state machine;
- synchronous reservation before async execution;
- exact binding/expiry checks;
- adversarial replay/concurrency tests;
- fake downstream adapter only.

### Lot C — production issuer prerequisites

- source/witness enrollment;
- revocation;
- trusted evaluation time;
- key rotation/compromise handling;
- exact policy/witness integration.

### Lot D — Wallet Guard adapter

Only after Lots A-C are adequate for the claimed scope may Wallet Guard integrate the common Gate with EVM trusted-context normalization and a controlled provider.

## Human gate

This ADR may be implemented in draft branches, but no Gate/authorization behavior is merged as an accepted Core contract without explicit Tier-B human approval after SpecKit, skeptical, security, code-quality, optimization and exact-head CI review.
