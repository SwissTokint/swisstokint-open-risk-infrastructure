# Technical Council — R3 Strict Profile Prerequisites

Status: `PROPOSED / TIER_B / HUMAN_REVIEW_REQUIRED`

Date: 2026-08-13

Task: `R3-STRICT-PROFILE-PREREQUISITES-ADR`

Baseline: `9b1e9bc416ce8cb26ffa3253865984143a7d0579`

Participants required for final disposition: Protocol Architect, Security Lead,
Core Implementer, Lead Integrator. This draft records an implementer proposal;
it is not evidence that the required independent reviews occurred.

## PROBLEM

The merged Option D compatibility decision requires a separately versioned
`pom-rx-v0.1/strict-errata-1` verifier. The first proposed correction,
`POMRX-INTEGRITY-01-ACTION-CONTINUITY`, cannot safely ship by adding another
comparison to the historical `verifyPomRxChain()` function. Doing that would
change the frozen package `0.1.x` legacy behavior, leave no stable verdict or
artifact identity, and allow an untrusted caller to select security semantics.

Six prerequisites must be settled before runtime implementation:

1. immutable compatibility fixtures and checksums for the exact v0.1 corpus;
2. a complete strict verdict and stable diagnostic contract;
3. exact trusted-policy tuple selection and withdrawal precedence;
4. a deterministic identity for the executable verifier artifact;
5. an additive implementation with no legacy fallback;
6. an honest boundary for the unsigned surrogate scenario, which cannot be
   distinguished from ordinary action substitution from receipt bytes alone.

Two additional activation questions are part of the prerequisite decision:

7. the profiled API must not report `conformant` while any invariant required
   by `pom-rx-v0.1/strict-errata-1` is still absent;
8. the missing execution-to-reconciliation input-continuity evidence ID must
   be ratified before that transition can emit a stable defect mapping.

## CURRENT_BEHAVIOR

- `verifyPomRxChain()` validates and commits each `pom-rx/0.1` receipt, verifies
  lifecycle links and selected shared fields, then returns the historical
  `ok/status/error/receipt_hashes` shape.
- The function accepts seven PR 27 adversarial vectors. The strict expected-red
  gate proves seven vulnerable failures plus one green control and rejects
  import, syntax, runtime and missing-fixture failures as false evidence.
- Assertion ordering uses the historical `localeCompare` behavior. Its bytes,
  hashes and hash domain are frozen for v0.1.
- The old verifier has English error strings but no versioned diagnostic
  objects, trusted policy identity or executable artifact digest.
- The unsigned surrogate acknowledgement is not passed to the verifier. After
  the harness copies its receipt hash into the execution link, the verifier sees
  exactly the same receipt chain as the ordinary preflight-to-execution action
  substitution case.

## SECURITY_IMPACT

Implementing continuity without these prerequisites would permit ambiguous
verifier selection, unverifiable runtime substitution, misleading surrogate
diagnostics, and accidental downgrade to legacy acceptance. A strict success
could then be mistaken for authorization even though it proves only structural
continuity of opaque commitments.

The proposed boundary fails closed: a plain policy object, unknown tuple,
withdrawn tuple, artifact mismatch, unavailable trusted policy time, malformed
input or internal verifier failure cannot produce structural conformance. No
strict error path retries legacy. Every standalone verdict remains
non-authorizing.

The process-local capability brand and artifact closure check prevent accidental
injection and packaging drift within the supported host boundary. They are not
cryptographic authenticity against malicious local code or a compromised host;
that limitation is explicit in every standalone verdict.

## COMPATIBILITY_IMPACT

The proposal is additive. It does not modify receipt schema, receipt fields,
normalization, assertion ordering, canonical bytes, hash domain, receipt hashes
or the historical `verifyPomRxChain()` API/result. Frozen v0.1 fixtures are
recomputed by both paths to prove parity. New strict verdicts cannot be used as
legacy results, and legacy results cannot be promoted to strict results.

## OPTIONS

### OPTION_A

Patch `verifyPomRxChain()` directly and retain its existing result shape.

Rejected. It violates the merged Option D package compatibility boundary,
cannot bind policy or artifact identity, and turns prior acceptance into an
unversioned behavior change.

### OPTION_B

Add the profiled function now, taking a caller-supplied policy object and using
the Git commit or package version as verifier identity.

Rejected. A receipt/API caller is not a trust root. A Git commit does not
identify installed executable bytes; a package version can be republished or
locally modified. Both choices leave downgrade and artifact substitution gaps.

### OPTION_C

Approve an ordered prerequisite slice before any invariant correction:

- freeze a versioned eight-scenario v0.1 compatibility corpus with exact-byte
  SHA-256 checksums and expected historical canonical bytes/hashes;
- define an exact strict verdict schema, diagnostic registry and truth table;
- accept only an opaque policy capability loaded from a locally pinned
  exact-byte policy document, freshly minted and consumed once per invocation;
- identify the verifier by a deterministic manifest over its executable file
  closure and bind exact Node/ICU/Unicode/locale/platform constraints;
- add a separate profiled entry point that never calls or retries the legacy
  export;
- keep that entry point internal and incapable of a conformant verdict until
  the complete strict-profile invariant matrix is implemented and tested;
- retain the surrogate defect ID as conformance-scenario evidence while the
  receipt-only verifier emits the observable underlying continuity defect.

Recommended. It is bounded, implementable without changing historical bytes,
and makes the first invariant correction independently testable and reversible.

## RECOMMENDATION

Select Option C and adopt
`docs/adr/ADR-POMRX-V01-STRICT-PROFILE-PREREQUISITES.md` as the implementation
contract. Execute the work in separate PRs: first fixtures/checksums, then the
profiled verdict/policy/artifact foundation, then one invariant family. Do not
combine Witness, Gate, schema, canonicalisation, DAGR or v0.2 work with these
PRs.

The first runtime invariant remains action continuity, but it becomes READY
only after this ADR and its fixture prerequisite are human-approved and merged.
Its checker remains internal until the complete profile activation gate passes.

## DISSENT

- A minimal-code position may prefer Option A. The compatibility record makes
  the apparent simplicity unsafe because active callers could silently receive
  different semantics under the same API and package line.
- A build-system position may prefer the Git commit as artifact identity. The
  security position rejects it because source identity is not executable-byte
  identity.
- A test-reporting position may want the surrogate defect ID in every verifier
  verdict. The observable-input boundary rejects that claim: unauthenticated
  scenario labels cannot select a security diagnostic. The ID remains available
  in checksum-verified conformance reports without being fabricated by the
  receipt-only verifier.

## TEST_PLAN

1. Freeze and exact-byte checksum the valid control and seven PR 27 vectors,
   their historical canonical receipt bytes and expected receipt hashes.
2. Fail on CRLF conversion, a missing/unmanifested file, duplicate manifest
   path, unsafe path, checksum mismatch, changed canonical byte or changed
   historical receipt hash.
3. Prove the legacy verifier still accepts the measured eight-chain corpus and
   retains its exact result compatibility.
4. Validate every strict verdict key, enum, truth-table row, limitation code,
   diagnostic pair, sort rule and warning projection.
5. Map each current inherited validation family to a typed stable diagnostic;
   prove English messages do not control the code.
6. Reject plain-object policy injection, policy byte/hash mismatch, unknown or
   malformed policy, unlisted tuple, artifact mismatch, effective withdrawal,
   missing trusted evaluation time, stale/reused capability, absent profile and
   downgrade attempts. Re-read and re-pin the current policy per invocation.
7. Recompute the verifier artifact manifest from installed bytes; fail on a
   changed, missing, additional manifested or duplicated executable file,
   undeclared/dynamic local import, symlink, junction/reparse point, path escape,
   alternate data stream, Unicode alias or case-fold collision.
8. Instrument the new entry point to prove it never calls, imports as a
   fallback, or retries `verifyPomRxChain()` on any success or failure path.
9. Before the complete invariant matrix is present, prove the profiled
   development orchestrator returns only `indeterminate` with
   `POMRX_V01_E_PROFILE_INCOMPLETE`, never `conformant`.
10. Reject unapproved Node, ICU, Unicode, locale, platform or architecture
    values and verify a runtime-sensitive frozen-v0.1 canonicalization canary.
11. Exercise every pre-binding nullability row, expected-versus-observed
    artifact mismatch and collision in the exact layer-1-to-3 diagnostic
    priority table.
12. Prove ordinary and surrogate-harness action substitutions yield the same
   receipt-only verifier defect ID/code. Separately prove the checksum-verified
   conformance report retains the surrogate scenario ID.
13. Exercise the strict valid control inside the internal invariant harness and
    reject only the approved action-continuity cases in the first invariant PR;
    keep all other defects visibly expected-red. Do not publish a conformant
    profiled verdict until every required family is present.
14. Run POM-RX Node tests, strict expected-red gate, compatibility tests,
    fixture checksum tests, `npm test`, production audit and `git diff --check`.
    Proof Receipt Python tests remain Proof Receipt evidence, not a Python
    POM-RX verifier claim.

## ROLLBACK

This council and ADR are documentation-only. Reverting them changes no runtime
or historical evidence. Each later implementation slice is independently
revertible. A defective strict verifier tuple is withdrawn by exact schema,
profile, verifier-version and artifact digest. Cached strict results from that
tuple are revalidated or rejected; historical records remain append-only.
Rollback never retries legacy, rewrites v0.1 bytes/hashes, deletes expected-red
evidence, or reinterprets a v0.2 receipt as v0.1.

## HUMAN_GATE

This proposal is not ratified and authorizes no runtime work. Before merging
the Tier-B ADR, the exact head requires distinct Protocol and Security review,
green exact-head CI and explicit human authorization in the form required for
that future PR:

```text
APPROUVE FUSION PR #<number>
```

After that merge, fixtures and runtime changes still require separate scoped
PRs and their own gates. No automatic merge is authorized.
