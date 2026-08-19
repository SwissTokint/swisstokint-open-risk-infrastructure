# Council — POM-RX Core Reference Gate Hardening

Status: `PROPOSED / TIER_B / HUMAN_REVIEW_REQUIRED`

Date: 2026-08-19

Baseline: `a12657ce079bc13fdf86b07d811a7c405b7bf95c`

Parent contract: `docs/adr/ADR-POMRX-CORE-EXACT-AUTH-GATE.md`

## Why this amendment exists

Implementation review of the first local reference Gate found a mutation-after-validation gap in the initial draft implementation: the trusted observer validated commitments derived from an untrusted `execution_attempt`, but the Gate later forwarded that original caller-owned object to the downstream adapter. Because observation may be asynchronous, caller mutation could make downstream bytes differ from the action/context that had just been validated.

Green CI did not waive this finding. The skeptical/security gate classified it as a blocking exact-execution TOCTOU issue for the reference claim.

## Decision

For the local reference Gate only, harden the parent contract as follows:

1. **Gate-instance-local capability audience**
   - capability lifecycle state lives in a `WeakMap` private to one Gate instance;
   - a capability created for one reference Gate is invalid at another Gate;
   - lifecycle transition functions are not exported from the authorization module.

2. **Separated trusted test authority**
   - the untrusted-facing Gate handle exposes consumption only;
   - reference issuance and state inspection live on a separately named `testAuthority` handle retained by the trusted local harness;
   - this test authority is not production authorization and is not evidence that issuer trust prerequisites are complete.

3. **Prepared execution snapshot**
   - `observe_binding(execution_attempt)` returns the exact observed `binding_profile`, `action_commitment`, `context_commitment`, plus `prepared_execution`;
   - `prepared_execution` is produced by the trusted adapter from the action/context it observed;
   - the Gate defensively clones that prepared value into bounded plain data before comparison/forwarding;
   - accessors, symbols, non-plain objects, unsafe keys, excessive depth/node count, non-safe numbers and oversized strings fail closed.

4. **No raw caller object reaches downstream**
   - the original `execution_attempt` is input to trusted observation only;
   - `execute_downstream` receives only the Gate-owned prepared snapshot;
   - caller mutation after validation therefore cannot change the value forwarded by the Gate.

5. **Existing single-use semantics remain unchanged**
   - synchronous `AVAILABLE -> VALIDATING` reservation occurs before the first asynchronous boundary;
   - expiry is checked after reservation and again immediately before forwarding;
   - `REJECTED`, `CONSUMED_SUCCESS` and `CONSUMED_ERROR` remain terminal;
   - downstream error never rearms the capability.

## Acceptance additions

Before `CORE_GATE_REFERENCE_READY`, tests must additionally prove:

- mutating the original caller attempt after validation does not change downstream input;
- downstream input is a different, frozen prepared snapshot rather than the caller object;
- a capability issued for Gate A cannot be consumed by Gate B;
- the authorization module exposes no global capability registry or public lifecycle transition functions;
- the untrusted Gate handle exposes no issuer/state-inspection method;
- malformed or unsafe prepared execution fails before downstream invocation.

## Scope boundary

This amendment still authorizes only a deterministic local reference harness with fake/test downstreams. It does not establish source/witness enrollment, revocation, production trusted time, a production issuer, durable multi-process replay protection, application-specific normalization correctness, wallet safety, testnet/mainnet execution, audit or certification.

The amendment becomes accepted only if PR #58 passes SpecKit, skeptical/falsification, security, code-quality, optimization and exact-head CI review and then receives explicit Tier-B human merge authorization.
