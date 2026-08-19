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
2. **Single-use Gate consumption** — a terminal state machine that privately owns trusted context observation, trusted time and downstream execution, reserves a capability before asynchronous work, and never automatically rearms it.

The first implementation is a local reference runtime only. Production authorization remains blocked on witness trust-lifecycle hardening.

## Exact binding schema

The canonical candidate record uses exact keys:

```text
schema_version = pom-rx-exact-authorization/0.1
capability_id
binding_profile
run_id
agent_ref
subject_ref
method_hash
policy_hash
action_commitment
context_commitment
preflight_receipt_hash
witness_ack_hash
source_key_id
witness_key_id
verification_profile
verifier_version
implementation_artifact_sha256
effective_verification_policy_sha256
issued_at
expires_at
```

Hashes are lowercase SHA-256. Identifiers and timestamps are bounded and canonicalized before use. Unknown fields fail closed.

`binding_profile` identifies the exact application normalization contract. It is part of the authorization binding so the same bytes cannot be silently reinterpreted under another application's semantics.

`action_commitment` represents the exact normalized action. `context_commitment` represents trusted execution context observed by the application boundary. POM-RX Core compares these commitments exactly and does not infer chain-specific semantics.

The strict verification profile/version, implementation artifact digest and effective verification-policy digest are bound so authorization cannot discard which strict verifier/policy tuple established the structural prerequisite.

## Commitment domains

Application action/context commitments use explicit domain separation defined by the corresponding versioned `binding_profile`.

The verified witness acknowledgement commitment is:

```text
SHA-256(
  UTF8("swisstokint:pom-rx-witness-ack-record:v1:") ||
  UTF8(canonical_witness_ack)
)
```

The derived exact authorization commitment is:

```text
SHA-256(
  UTF8("swisstokint:pom-rx-exact-authorization:v1:") ||
  UTF8(canonical_exact_authorization_binding)
)
```

The exact deterministic canonicalizer used by these helpers is part of the implementation closure and must not depend on platform locale, pretty-printing or object insertion order.

## Application responsibility

Each application block owns its domain normalization but not Gate semantics.

For Wallet Guard, `binding_profile`, action commitment and context commitment must cover the trusted boundary observations required by `ADR-POMRX-WALLET-GUARD-MVP.md`, including origin, active chain, active account, RPC method and the normalized request identity/effects required by the Wallet Guard contract.

The application does not pass self-asserted trusted context into each Gate call. Instead, a trusted application adapter is installed at Gate bootstrap and freshly observes the current binding before forwarding.

## Production issuer prerequisites

A usable production capability may be minted only after all of the following are proved:

- exact strict preflight structural verification under the selected verifier/policy/artifact tuple;
- preflight outcome `allow`;
- enrolled source key;
- enrolled distinct witness key;
- `witnessed` acknowledgement, never `dry_run`;
- exact preflight/run/source/witness binding;
- trusted evaluation time before witness/capability expiry;
- revocation checks at the same trusted instant;
- exact action/context/policy binding;
- capability expiry no later than the witness validity bound.

Because enrollment, revocation and trusted-time infrastructure are not yet complete, this ADR authorizes only a local reference capability for conformance testing, not production issuance.

## Capability identifier and lifetime

The local reference capability identifier is generated at the trusted issuer boundary from 128 bits of cryptographically secure randomness and encoded as `cap-<32 lowercase hex>`.

The first Core profile permits a lifetime from one second through five minutes. Application profiles may tighten the maximum but may not widen it without a newly reviewed profile.

`expires_at` must be later than `issued_at` and must not exceed the witness validity window that justified issuance.

## Local capability model

The reference capability is process-local, branded through module-private state and non-serializable. A plain object, JSON clone or reconstructed record cannot impersonate a usable capability.

The untrusted application/dApp never receives the capability object. The reference issuer must be explicitly named test/reference and excluded from public production exports. It exists only to exercise Gate semantics before the production issuer trust boundary is ready.

## Gate bootstrap

The Gate is created at a trusted host boundary with private references to:

```text
trusted_clock
observe_binding
execute_downstream
```

`trusted_clock` returns the trusted host instant. It is not supplied per consumption attempt.

`observe_binding` is an application-owned trusted adapter. Given the execution attempt, it derives the current `binding_profile`, exact action commitment and freshly observed context commitment from trusted environment state.

`execute_downstream` is the only downstream provider/mutation adapter reference in the accepted harness.

The caller receives only the Gate handle. The consumption API therefore does **not** accept an `execute_once` callback, caller-supplied trusted timestamp, origin, chain/account value or caller-supplied trusted context commitment.

## Gate state machine

```text
AVAILABLE
  -> VALIDATING
       -> REJECTED
       -> CONSUMING
            -> CONSUMED_SUCCESS
            -> CONSUMED_ERROR
```

A branded capability moves from `AVAILABLE` to `VALIDATING` synchronously before the first asynchronous boundary. This is the reservation point: concurrent calls cannot both validate/use the same capability.

After reservation:

- the Gate samples `trusted_clock` and rejects expired/malformed time;
- the trusted observer may perform asynchronous context sampling;
- observer failure or malformed observation ends in terminal `REJECTED`;
- exact `binding_profile`, action and context commitments are compared;
- the Gate samples trusted time again immediately before forwarding and rejects if expiry occurred while observing;
- only then does state move to `CONSUMING` and `execute_downstream` become reachable.

Any terminal state is permanently non-reusable. In particular, downstream failure ends in `CONSUMED_ERROR`; a retry requires a new authorization lifecycle.

A mismatch or expired capability intentionally sacrifices availability. The local capability is internal to the trusted pipeline, so fail-closed terminal rejection is preferred over retry semantics.

## Consumption input

The external Gate method accepts only:

```text
capability
execution_attempt
```

The exact shape of `execution_attempt` belongs to the application adapter. It is not itself trusted. `observe_binding`, held privately by the Gate, derives the trusted binding from it plus the trusted environment.

The Gate does not ask the caller to repeat `preflight_receipt_hash`, `policy_hash`, `witness_ack_hash`, trusted time or downstream callback. Those properties are already bound inside the branded capability or private bootstrap.

## Concurrency rule

Reservation occurs synchronously before asynchronous observation. A second call on the same capability sees a non-`AVAILABLE` state and fails without observer or downstream execution.

If a future deployment uses multiple processes or hosts, process-local state is insufficient. Durable atomic reservation/consumption becomes a separately reviewed dependency.

## Time rule

The Gate uses only its private trusted clock. Request timestamps, receipt timestamps and dApp fields cannot extend expiry.

Canonical UTC instants are required. Expired or malformed time is fail-closed. A second pre-forward expiry check is mandatory after asynchronous context observation.

## Failure vocabulary

The reference Gate must distinguish at least:

```text
POMRX_GATE_E_CAPABILITY_REQUIRED
POMRX_GATE_E_CAPABILITY_STALE
POMRX_GATE_E_CAPABILITY_EXPIRED
POMRX_GATE_E_BINDING_MISMATCH
POMRX_GATE_E_OBSERVER_FAILED
POMRX_GATE_E_TIME_INVALID
POMRX_GATE_E_DOWNSTREAM_FAILED
```

Diagnostic detail must not leak private wallet secrets or raw policy values.

## Security assertions

Before `CORE_GATE_REFERENCE_READY`:

- plain-object injection fails;
- cloned/reconstructed capability fails;
- malformed binding fails;
- expiry at reservation fails;
- expiry during async observation fails before forwarding;
- action/context/profile mutation fails;
- preflight/policy/witness/verifier binding mutation cannot create a usable branded capability;
- success replay fails;
- error replay fails;
- concurrent double-use reaches observer/downstream at most according to the terminal reservation contract and reaches downstream at most once;
- exact valid control reaches downstream exactly once;
- downstream error is terminal;
- caller cannot inject a downstream callback or trusted timestamp/context;
- the accepted harness exposes no second downstream-provider reference;
- the reference capability cannot be represented as production authorization.

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
- deterministic domain-separated commitment helpers;
- process-local branded test/reference capability;
- no production issuer export.

### Lot B — local single-use Gate

- private trusted clock/observer/downstream bootstrap;
- terminal reservation state machine;
- asynchronous observation with second expiry check;
- adversarial replay/concurrency/mutation tests;
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
