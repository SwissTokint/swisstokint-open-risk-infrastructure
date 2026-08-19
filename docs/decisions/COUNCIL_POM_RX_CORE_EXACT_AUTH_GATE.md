# Council — POM-RX Core Exact Authorization and Single-Use Gate

Status: `PROPOSED / TIER_B / HUMAN_REVIEW_REQUIRED`

Date: 2026-08-19

Baseline: `8b8630c124bbf37d2919aa008e4f7f587f5c92f2`

## Decision objective

Define the smallest common POM-RX Core contract that can later turn a bounded, witnessed preflight into one exact, short-lived execution authority and make an execution-side Gate consume that authority at most once.

This council does **not** authorize a live wallet, payment, exchange, API mutation, testnet transaction or mainnet transaction. It defines common semantics so application blocks such as Wallet Guard do not invent incompatible authorization or replay rules.

## Current evidence boundary

The merged strict verifier can now produce bounded structural verdicts for `pom-rx-v0.1/strict-errata-1`, but every strict verdict remains non-authorizing. Signed source/witness primitives also exist, but enrollment, revocation, trusted time and durable witness-service semantics remain incomplete.

Therefore the Core may specify and test the Gate state machine now, but a production authorization issuer remains blocked until the witness trust lifecycle is separately proved.

## Shared Core rule

Exact authorization and Gate consumption belong to POM-RX Core. Application blocks may define domain-specific intent/context commitments and downstream adapters, but they must not fork or duplicate:

- capability lifecycle;
- expiration semantics;
- replay semantics;
- exact commitment comparison;
- Gate state transitions;
- authorization-result vocabulary;
- fail-closed behavior.

## Exact authorization binding

The generic Core capability binds an application action and its trusted execution context through commitments rather than chain-specific fields.

Minimum binding:

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

`action_commitment` binds the exact normalized requested action. `context_commitment` binds trusted execution context that the application must re-sample immediately before forwarding. For Wallet Guard this context must include, at minimum, trusted origin, active chain, active account, RPC method and the normalized request identity required by its ADR.

The Core does not interpret EVM origin/account/spender/recipient semantics. The Wallet Guard application owns that normalization and then supplies the resulting commitments to the common Gate.

## Issuance boundary

No capability may be treated as authorization merely because it has the correct JSON shape or hashes.

A future production issuer must prove all of the following before minting a usable capability:

1. strict preflight structural verification succeeds under the exact selected verifier/policy tuple;
2. the preflight outcome is `allow`;
3. a distinct enrolled source key and enrolled witness key are accepted under active trust policy;
4. the witness acknowledgement is `witnessed`, never `dry_run`;
5. the witness acknowledgement binds the same preflight receipt hash/run and is unexpired at a trusted evaluation instant;
6. source or witness revocation effective at that instant fails closed;
7. action/context/policy commitments match the intended execution binding exactly.

Until enrollment, revocation and trusted-time evidence exist, production issuance remains `UNPROVED`.

## Capability representation

For the first local reference runtime, the usable capability must be process-local, branded and non-serializable. A plain parsed object cannot impersonate it.

A future cross-process capability format is a separate design problem and must not be inferred from the local reference model.

## Gate state machine

The Gate owns the only reference to the downstream execution adapter in the accepted harness.

Terminal state machine:

```text
AVAILABLE
  -> REJECTED   # expired, mismatched, invalid or other failed consumption attempt
  -> CONSUMING  # exact validation succeeded and downstream execution is reserved
       -> CONSUMED_SUCCESS
       -> CONSUMED_ERROR
```

Rules:

- the transition out of `AVAILABLE` occurs atomically before any downstream call or `await`;
- `REJECTED`, `CONSUMED_SUCCESS` and `CONSUMED_ERROR` are terminal;
- an execution error never rearms a capability automatically;
- retry requires a new preflight/witness/authorization cycle;
- replay, concurrent reuse, expiry, action mutation or context mutation never call downstream execution;
- a failed consumption attempt may sacrifice availability to preserve fail-closed single-use semantics; availability is not a safety requirement.

## Trusted time

Capability expiry must be evaluated against a trusted evaluation instant supplied by the Gate host boundary. Receipt time or dApp/request time cannot extend capability life.

For the local reference runtime this can be an explicitly injected trusted instant. Production time-source trust remains a separate deployment requirement.

## Exact comparison

The Gate compares normalized lowercase SHA-256 commitments and exact identifiers. No wildcard, range, fuzzy matching, case-insensitive semantic matching or fallback is permitted.

The application must recompute `context_commitment` from freshly observed trusted context immediately before consumption. Caller-supplied origin, chain, account or equivalent application context is not authoritative.

## Downstream ownership

Only the Gate may hold/call the downstream provider or mutation adapter in the accepted test harness. The dApp/application caller receives no second direct reference.

This property must be demonstrable in the local reference harness before any Wallet Guard readiness claim.

## Reference implementation boundary

The first implementation lot may provide:

- strict validation of the exact authorization binding;
- deterministic commitment helpers;
- a process-local branded **test/reference** capability;
- the terminal single-use Gate state machine;
- concurrency/replay/mutation/expiry adversarial tests;
- a fake downstream adapter proving zero calls on rejected paths and one call on the allowed control path.

It must not claim production authorization because the production issuer trust prerequisites are still incomplete.

## Adversarial acceptance matrix

The reference Gate must prove at least:

1. plain-object capability injection — rejected;
2. malformed capability — rejected;
3. expired capability — rejected without downstream call;
4. action commitment mutation — rejected without downstream call;
5. context commitment mutation — rejected without downstream call;
6. preflight/policy/witness binding mutation — rejected;
7. replay after success — rejected;
8. replay after downstream error — rejected;
9. concurrent double consumption — only one reservation may reach downstream;
10. exact valid control — downstream called exactly once;
11. downstream error — capability remains terminal, no automatic retry;
12. test/reference issuer is not exposed as production authorization.

## Security blockers before production authorization

The following remain mandatory and separate:

- source/witness enrollment;
- source/witness revocation;
- trusted clock/time boundary;
- durable or multi-process replay/consumption storage if the Gate leaves one process;
- key rotation/compromise recovery;
- deployment/host integrity;
- application-specific context normalization and fresh observation;
- native execution evidence and reconciliation.

## Readiness labels

`CORE_GATE_REFERENCE_READY` means only that the local reference state machine and adversarial tests pass with a fake downstream adapter.

`CORE_EXACT_AUTHORIZATION_READY` additionally requires the production issuer trust prerequisites above. The reference Gate alone cannot earn this label.

Neither label means production readiness, wallet safety, financial safety, audit or certification.

## Proposed implementation sequence

1. SpecKit + architecture/security review of this council/ADR.
2. Reference exact-binding validator and branded test capability.
3. Single-use local Gate state machine and adversarial tests.
4. Witness enrollment/revocation/trusted-time hardening.
5. Production issuer integration.
6. Wallet Guard application adapter and simulated E2E.
7. Burner-wallet local/testnet E2E only after a separate human gate.

## Human gates

Human approval is required before:

- merging this Core Gate contract;
- activating a production issuer;
- exposing a production authorization capability;
- connecting a real wallet/provider or performing a testnet/mainnet transaction;
- changing Gate state transitions or replay semantics after ratification.
