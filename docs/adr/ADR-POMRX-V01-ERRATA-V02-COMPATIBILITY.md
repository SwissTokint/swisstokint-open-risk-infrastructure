# ADR — POM-RX v0.1 Errata and v0.2 Compatibility

Status: `HUMAN_RATIFIED / TIER_B / MERGE_GATE_REQUIRED`

Date: 2026-08-12

Baseline: `9983f8d6360bbe0023ea6b80256d52e42f694af7`

Council: `docs/decisions/COUNCIL_R2_COMPATIBILITY_ADR.md`

## Decision summary

The technical council selects **Option D — bounded combination**. Human
ratification was explicitly recorded on 2026-08-12. Repository integration and
runtime implementation remain blocked by the separate Tier-B merge gate for
this exact ADR head.

POM-RX v0.1 receipt construction remains frozen. A new explicitly versioned
strict verification profile may reject known unsafe chains without changing
their bytes or hashes. Historical legacy verification remains available only
as qualified, non-authorizing reproduction. POM-RX Core v0.2 candidate receives
a new schema and hash domain for new normative semantics.

No runtime, schema, hash, canonicalisation, Witness or Gate change is authorized
by this ADR.

## Context

POM-RX v0.1 validates and hashes each receipt independently, then validates a
three-phase chain. Its current TypeScript verifier does not enforce action or
input commitment continuity, positive execution/reconciliation outcome
consistency, or receipt-ID uniqueness within the chain. PR 27 merged a strict
expected-red baseline that reproduces these known defects without fixing them.

The repository corpus contains eight synthetic vectors:

| Class | Current legacy runtime | Proposed strict profile |
|---|---:|---:|
| Valid control | accept 1/1 | accept 1/1 |
| Seven exact PR 27 adversarial vectors | accept 7/7 | reject 7/7 |
| Total measured corpus | accept 8/8 | accept 1/8, reject 7/8 |

These counts describe only the repository corpus. The quantity and disposition
of v0.1 receipts outside it are unknown and must not be inferred.

## Immutable v0.1 boundary

The following remain byte-for-byte immutable:

- `schema_version = pom-rx/0.1`;
- the receipt field set and historical field normalization;
- assertion ordering produced by the historical reference implementation;
- canonical receipt bytes;
- `SHA-256("swisstokint:pom-rx:v1:" || canonical_receipt)`;
- individual receipt hashes and previous-hash links;
- published or retained test vectors.

A verifier MUST recompute and compare receipt commitments using the exact
frozen v0.1 validation, canonicalisation, assertion ordering and hash
algorithm. This verification does not change, persist, replace or rewrite
historical canonical bytes or hashes, and it does not migrate or repair a
v0.1 receipt. A different ordering or hash domain is forbidden under v0.1.

## Verification profiles

### `pom-rx-v0.1/legacy-reproduction-1`

Purpose: reproduce historical reference behavior for evidence analysis.

Successful historical reproduction uses:

- `qualification = LEGACY_ACCEPTANCE_OBSERVED`;
- `legacy_reproduction_observed = true`;
- `authorization_eligible = false`;
- `authorization_proved = false`;
- `assurance = historical-structural-reproduction`;
- stable warning `POMRX_V01_W_LEGACY_NON_AUTHORIZING`.

A reproduced legacy structural rejection instead uses
`qualification = LEGACY_REJECTION_OBSERVED`. Failure to complete reproduction
uses `qualification = LEGACY_REPRODUCTION_INDETERMINATE` and
`legacy_reproduction_observed = false`. Both a reproduced acceptance and a
reproduced structural rejection set `legacy_reproduction_observed = true`.
The archival result type has no generic `ok` field. These three qualifications
are exact enums.

Legacy acceptance is never `ALLOW`, never an authorization and never eligible
for a Witness/Gate decision. A Gate must reject it.

### `pom-rx-v0.1/strict-errata-1`

Purpose: fail-closed structural verification of frozen v0.1 receipts.

The profile enforces:

- `action_commitment` continuity across every adjacent phase;
- `input_commitment` continuity across every adjacent phase;
- all assertions pass for `execution:accepted`;
- all assertions pass for `reconciliation:matched`;
- unique `receipt_id` values within one chain.

This profile proves only the structural consistency and opaque commitment
continuity that it checks. It does not prove action or input preimages, native
execution, trusted preflight time, source honesty, cross-chain replay
prevention, signed Witness lifecycle or Gate consumption.

Every standalone strict result has `authorization_eligible = false` and
`authorization_proved = false`.
`structural_prerequisite_satisfied = true` if and only if verification
completed with `structural_status = conformant` and zero error diagnostics; it
is `false` for every nonconformant or indeterminate result. This is only one
possible input to a later composite authorization process and is never `ALLOW`
by itself.

## API and selection policy

The current package version is `0.1.0`. The ratified migration contract is:

1. Throughout package `0.1.x`, the existing
   `verifyPomRxChain(receipts, { allowPartial })` behavior, accepted inputs and
   `ok/status/error/receipt_hashes` result shape remain unchanged for historical
   compatibility. Starting no earlier than package `0.1.1`, it is documented
   and annotated `DEPRECATED_ARCHIVAL_ONLY`. It is not a Gate type and no new
   active-use code may consume it. Removal requires package major `1.0.0` or
   later and a separate migration notice.
2. Package `0.1.1` may add `reproducePomRxV01Legacy()` as a separately typed
   archival API with the legacy qualifications above and no `ok` field.
3. Package `0.1.1` may add a distinct active-use entry point:

```text
verifyPomRxChainProfiled(receipts, {
  allowPartial,
  verificationProfile
}, trustedPolicy)
```

The two new APIs MUST NOT call or fall back to the existing export. They may
share frozen internal v0.1 validation and commitment functions after parity is
proven.

The active-use entry point supports exactly
`pom-rx-v0.1/strict-errata-1` under policy
`pom-rx-local-verification-policy/1`. Policy comes from trusted local verifier
configuration, never a receipt, fixture, remote request or untrusted caller
field. The policy contains an explicit `accepted_verifiers` set of exact
`(receipt_schema_version, verifier_profile, verifier_version,
implementation_artifact_sha256)` tuples and exact `withdrawn_verifiers`
records targeting the same tuple. Wildcards, ranges, lexical, semantic-version
and lowest-version comparison are forbidden. Missing, unknown, malformed,
withdrawn or absent from the exact allow-set fails closed. An unlisted verifier
version cannot inherit authorization merely by claiming an allowed profile.
An effective withdrawal record overrides allow-set membership. The
implementation never retries legacy.

The effective policy identity and version are bound into every verdict.
External use later requires an authenticated policy and verdict; that later
trust layer does not weaken these deterministic local semantics.

The profiled verdict envelope is versioned as
`pom-rx-verification-verdict/1` and binds at minimum:

```text
verdict_schema_version
receipt_schema_version
receipt_hashes
verifier_profile
verifier_version
implementation_artifact_sha256
effective_policy_id
effective_policy_version
qualification
assurance
authorization_eligible
authorization_proved
structural_status
structural_prerequisite_satisfied
diagnostics
warnings
limitations
```

`structural_status` is exactly `conformant`, `nonconformant` or
`indeterminate`. Strict qualifications are exactly
`STRICT_STRUCTURAL_CONFORMANCE_OBSERVED`,
`STRICT_STRUCTURAL_NONCONFORMANCE_OBSERVED` or
`STRICT_VERIFICATION_INDETERMINATE`. Warnings and errors may coexist.
Diagnostic `severity` is exactly `error` or `warning`. `diagnostics` contains
both error and warning objects. `warnings` is the ordered, deduplicated list of
warning `diagnostic_code` values derived from `diagnostics`; it is empty when
there are no warnings. A conformant result has zero error diagnostics but may
carry warnings; a nonconformant result has at least one error; an indeterminate
result has at least one error explaining why verification did not complete.
Diagnostics are sorted by phase index, receipt index, diagnostic code and field,
then deduplicated by that tuple plus `defect_id`. `phase`, `receipt_index` and
`field` are nullable for profile or internal failures. For sorting, non-null
phase/index/field values precede `null`; phases use lifecycle order, numeric
indices use ascending order, and strings use Unicode scalar-value order.

Each diagnostic object contains:

```text
defect_id
diagnostic_code
severity
phase
receipt_index
field
message
```

`defect_id` is the exact PR 27 identifier for the seven tracked defects and is
`null` for inherited validation or profile failures. English `message` is not
stable. The v0.1 receipt cannot retroactively commit to a verifier profile.

### Gate type boundary

The current result type, the legacy archival result type and the standalone
strict result type are all non-Gate types. A future Gate MUST reject any input
that lacks an authenticated exact `receipt_schema_version`,
`verifier_profile`, `verifier_version`, `implementation_artifact_sha256`,
`effective_policy_id`, `effective_policy_version` and a separately produced
composite `authorization_eligible === true`. It MUST recheck the exact current
schema/profile/version/artifact tuple and policy allow-set at consumption time.
Structural strict success may be referenced as a prerequisite, but cannot be
promoted to authorization by copying fields or ignoring missing fields.

## Stable diagnostic registry

PR 27 defect IDs remain immutable evidence identifiers. A future strict
implementation maps them to machine-readable codes:

| Defect ID | Strict diagnostic code |
|---|---|
| `POMRX-001-ACTION-PREFLIGHT-EXECUTION` | `POMRX_V01_E_ACTION_CONTINUITY` |
| `POMRX-001-ACTION-EXECUTION-RECONCILIATION` | `POMRX_V01_E_ACTION_CONTINUITY` |
| `POMRX-001-INPUT-PREFLIGHT-EXECUTION` | `POMRX_V01_E_INPUT_CONTINUITY` |
| `POMRX-006-EXECUTION-FAIL-ASSERTION` | `POMRX_V01_E_EXECUTION_ASSERTION_CONFLICT` |
| `POMRX-006-RECONCILIATION-FAIL-ASSERTION` | `POMRX_V01_E_RECONCILIATION_ASSERTION_CONFLICT` |
| `POMRX-007-DUPLICATE-RECEIPT-ID` | `POMRX_V01_E_DUPLICATE_RECEIPT_ID` |
| `POMRX-001-SURROGATE-ACK-ACTION-SUBSTITUTION` | `POMRX_V01_E_ACTION_CONTINUITY` |

The surrogate case remains explicitly unsigned and is not a cryptographic
Witness diagnostic. Every emitted defect diagnostic carries the exact
`(defect_id, diagnostic_code)` pair from this table. English messages may
evolve; codes and defect mappings do not change without a versioned migration.

Profile-level codes include:

- `POMRX_V01_E_PROFILE_REQUIRED`;
- `POMRX_V01_E_PROFILE_UNSUPPORTED`;
- `POMRX_V01_E_DOWNGRADE_FORBIDDEN`;
- `POMRX_V01_W_LEGACY_NON_AUTHORIZING`;
- `POMRX_V01_E_REPLAY_CHECK_UNAVAILABLE` when a later profile requires durable
  replay state that is absent.

`POMRX_V01_E_REPLAY_CHECK_UNAVAILABLE` is reserved and MUST NOT be emitted by
`pom-rx-v0.1/strict-errata-1`, which does not claim durable replay checking. A
later human-ratified profile may activate it.

Inherited v0.1 validation failures in the profiled envelope use these stable
base families:

- `POMRX_V01_E_SCHEMA_INVALID`;
- `POMRX_V01_E_CANONICALIZATION_FAILED`;
- `POMRX_V01_E_RECEIPT_HASH_LINK_INVALID`;
- `POMRX_V01_E_CHAIN_PHASE_INVALID`;
- `POMRX_V01_E_CHAIN_TIMESTAMP_INVALID`;
- `POMRX_V01_E_CHAIN_SHARED_FIELD_CHANGED`;
- `POMRX_V01_E_PARTIAL_CHAIN_FORBIDDEN`;
- `POMRX_V01_E_INTERNAL_VERIFIER_ERROR`.

The implementation ADR for the verdict envelope must map each current English
failure to one of these families before the profiled API ships. An unexpected
internal error returns `indeterminate`; it is never a structural success.

## Previously accepted and newly rejected chains

The strict profile newly rejects these exact measured classes:

1. action substitution from preflight to execution;
2. action substitution from execution to reconciliation;
3. input substitution from preflight to execution;
4. accepted execution with a failed assertion;
5. matched reconciliation with a failed assertion;
6. duplicate receipt ID within one chain;
7. action substitution after an unsigned surrogate receipt-hash
   acknowledgement.

The valid synthetic control remains accepted. Additional classes, including
input substitution at the second transition and cross-chain replay, require
separate vectors and must not be claimed as covered.

## Canonical ordering

Historical v0.1 assertion sorting uses `localeCompare`. It remains frozen for
legacy receipt reproduction even though runtime/locale dependence limits
cross-runtime portability.

The measured punctuation vector `a-a`, `a.a`, `a_a` changes order and hash
between legacy and ordinal comparison. Therefore strict v0.1 verification does
not alter ordering or hashes.

POM-RX Core v0.2 candidate shall specify deterministic ordering only under a
new schema and hash domain. The exact normalization and byte/code-point order
remain a separate Tier-B decision backed by cross-runtime vectors. No v0.2
ordering is approved here.

## v0.2 candidate boundary

POM-RX Core v0.2 candidate may define:

- a new schema and hash domain;
- normative action and input commitment profiles;
- domain-separated salted input commitments;
- exact action/native-payload binding;
- unique and replay-scoped identifiers;
- signed Witness and Gate binding;
- deterministic assertion ordering;
- stable diagnostics and explicit observation/reconciliation semantics.

It is not released, production-ready, audited or compatible merely because
this ADR exists.

## Migration and no-downgrade rules

- A v0.1 chain remains v0.1 historical evidence.
- Revalidation creates a new timestamped verdict and never overwrites an old
  result.
- A cross-version record may reference a v0.1 hash only as provenance.
- A v0.1 hash cannot manufacture prior v0.2 authorization.
- A v0.2 chain must be newly issued under its own schema/domain before the
  sensitive action.
- Automatic v0.2-to-v0.1 downgrade and lowest-version negotiation are
  forbidden.
- Cache keys include receipt schema/domain, verifier profile/version and policy
  version. A legacy success is never reused as strict success.
- If a policy requires v0.2, v0.1 is rejected before authorization evaluation.
- A verifier withdrawal record binds its exact schema/profile/verifier-version/
  artifact-hash tuple, `effective_at`, and replacement or terminal status. At
  consumption time a Gate rechecks the current allow-set and withdrawal
  records. Cached verdicts from a withdrawn tuple are invalidated and
  revalidated or rejected; their historical records remain append-only. If
  `effective_at` cannot be evaluated against a trusted clock, consumption is
  indeterminate and denied. Trusted-clock design remains part of the separate
  Gate/Witness Tier-B work.

## Replay boundary

Intra-chain `receipt_id` uniqueness is not complete replay protection.
Cross-chain replay and one-time Gate consumption require durable transactional
state keyed by versioned scope, action, authorization and Witness/Gate
identifiers. A verifier profile that requires this state returns
`POMRX_V01_E_REPLAY_CHECK_UNAVAILABLE` when it is absent; it does not fall back
to stateless or legacy acceptance.

## Compatibility test plan

1. Checksum frozen v0.1 canonical bytes and hashes.
2. Verify legacy and strict profiles recompute identical frozen v0.1 canonical
   bytes and receipt commitments without persisting rewritten artifacts.
3. Reproduce one valid and seven vulnerable legacy acceptances with explicit
   non-authorizing verdicts; separately test legacy structural rejection and
   indeterminate qualifications.
4. Accept the valid strict control and reject exactly the seven named vectors
   with stable codes.
5. Add action/input continuity vectors for every phase transition.
6. Test absent, unknown, malformed, tampered, disallowed and withdrawn verifier
   selection, exact schema/profile/version/artifact allow-set membership, an
   unlisted version claiming an allowed profile, withdrawal precedence over
   allow membership, and no legacy retry.
7. Test v0.1/v0.2 schema and hash-domain confusion in both directions.
8. Test exact `(defect_id, diagnostic_code)` pairs, inherited base codes,
   complete success/failure envelopes, ordering and deduplication separately
   from human messages. Cover nullable diagnostic fields, warning projection,
   success with zero errors, and the exact status/qualification/prerequisite
   truth table.
9. Record runtime, Node, ICU and locale provenance for legacy ordering vectors;
   test v0.2 candidate ordering across supported runtimes.
10. Keep Proof Receipt Python tests correctly separated from POM-RX verifier
    claims.
11. Prove old `verifyPomRxChain()` input/result compatibility through package
    `0.1.x`, and prove neither new API invokes or falls back to it.
12. Prove every old, legacy and standalone strict result is rejected as Gate
    authorization, including consumers that ignore newly added fields.
13. Test verifier-tuple withdrawal effective time, cached-verdict invalidation,
    current-policy revalidation and fail-closed handling of an unavailable or
    untrusted clock.
14. Require independent implementation parity before any v0.2 publication.

## Implementation sequence

After human ratification and after this ADR is merged through its separate
Tier-B gate only:

1. publish immutable compatibility fixtures and checksums;
2. define the result envelope and diagnostic registry;
3. add the profiled verifier entry point in a separate PR without changing
   commitment construction;
4. transition expected-red cases one invariant family at a time;
5. dual-run legacy and strict only on synthetic/public evidence and report
   absolute counts, not inferred percentages;
6. require strict for any future local Gate research demonstration;
7. address v0.2 schema/domain/order, Witness and Gate in separate Tier-B ADRs
   and PRs.

## Rollback

This ADR is documentation-only. Reverting it changes no receipt or runtime.

A future strict implementation must be version-pinned. If defective, publish a
withdrawal record with exact schema/profile/verifier-version/artifact-hash
tuple, effective time and replacement or terminal status. Gate-side policy
invalidates cached verdicts from that tuple and requires revalidation or
rejection at consumption. If the withdrawal time cannot be evaluated with a
trusted clock, consumption is denied. Historical verdicts remain append-only
evidence but cannot remain authorization-eligible. Never fall back
automatically to legacy, rewrite v0.1 bytes or hashes, delete historical
verdicts, or reinterpret v0.2 receipts as v0.1.

## Security and claim boundaries

- The seven PR 27 defects remain open until implementation and correction tests
  land.
- Continuity of opaque commitments does not prove their content.
- A receipt hash or unsigned surrogate is not a signed Witness.
- Duplicate-ID rejection is not full replay prevention.
- Strict structural verification is not native execution proof,
  authorization, audit, certification or production security.
- No Gate, external action, wallet, exchange, funds or transaction is involved.

## Consequences

Positive:

- historical v0.1 evidence remains reproducible;
- known defects can receive explicit fail-closed verification;
- new normative semantics remain isolated under v0.2 candidate;
- downgrade and Gate boundaries become testable.

Costs and residual risks:

- dual profiles require precise result and policy semantics;
- the installed v0.1 corpus is not inventoried;
- legacy ordering remains environment-sensitive;
- there is no independent POM-RX verifier;
- native payload binding, signed Witness lifecycle, durable replay state and
  one-time Gate consumption remain unimplemented.

## Human decision

The conversation actor identifying as confirmed project contact Mehdi Mauroux
supplied this exact instruction in the Codex task on 2026-08-12:

```text
APPROUVE OPTION D POM-RX
```

Immutable ratification provenance:

```text
source: Codex task
received_at: exact_time_not_recorded
recorded_at: 2026-08-12T15:55:32+02:00
conversation_actor: Mehdi Mauroux
actor_authentication: conversation-bound; not independently authenticated
ratified_pr: 32
ratified_head: 4c7a313ebe71e0d677ad1f528ee3a8018130c5db
ratified_council_sha256: 5DC3D2429571E0652CBAC9136DC2B2EAF1C30E40CB7CFF7838156519D85F2EF7
ratified_adr_sha256: 2D456EE9A6862DE68944B490EB770A76FD398467931BF4C35094840268F45064
```

The hashes above bind the decision to the reviewed Option D text at the
pre-record head. The new document hashes produced by appending this section are
evidence that the decision was recorded; they are not the artifacts originally
ratified.

The human decision ratifies:

- Option D;
- the two profile names and legacy non-authorization rule;
- the package `0.1.1` additive API boundary and `1.0.0` removal floor;
- the trusted-policy exact verifier-tuple allow-set and withdrawal contract;
- the diagnostic registry and no-downgrade rules;
- the separation of frozen v0.1 ordering from a future, separately approved
  v0.2 ordering decision;
- the migration, replay and rollback boundaries.

This conversation-bound record has no independently authenticated actor
identity and is not a cryptographic signature or a formal GitHub review. It
satisfies the Option D decision gate only. It does not satisfy the distinct
Tier-B merge gate and does not authorize implementation while this ADR remains
outside `main`.

Before PR 32 can merge, its exact head must retain scoped Architecture,
Security and QA approval, successful CI with real non-empty steps, and the
human must provide:

```text
APPROUVE FUSION PR #32
```

Until that merge, no verifier, schema, canonicalisation, Witness, Gate or v0.2
implementation or publication is authorized.
