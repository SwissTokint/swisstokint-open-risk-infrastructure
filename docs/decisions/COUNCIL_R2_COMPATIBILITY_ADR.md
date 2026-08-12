# Technical Council — R2 POM-RX Compatibility ADR

Status: `COUNCIL_RECOMMENDATION / HUMAN_RATIFICATION_RECORDED / TIER_B_MERGE_GATE_REQUIRED`

Date: 2026-08-12

Repository baseline: `9983f8d6360bbe0023ea6b80256d52e42f694af7`

Participants:

- Lead Integrator: Codex;
- Protocol Architect: independent read-only `gpt-5.6-sol` fallback;
- Cryptography and Security Lead: distinct independent read-only reviewer;
- Senior Core Implementer / QA: independent read-only feasibility reviewer.

Claude Code was not invoked for this council. No Claude, Opus, audit or global
approval is implied.

## PROBLEM

POM-RX v0.1 has public historical receipt bytes and hashes. Its current
TypeScript verifier nevertheless accepts the seven adversarial chains tracked
by PR 27. A correction must improve fail-closed verification without silently
rewriting v0.1 canonical bytes, hashes, receipt schema, hash domain or history.

The current implementation also orders assertion `rule_id` values with
`localeCompare`. That behavior is part of historical reference hashes but is
not suitable as a new cross-runtime normative ordering rule.

## CURRENT_BEHAVIOR

- Receipt schema: `pom-rx/0.1`.
- Receipt domain: `swisstokint:pom-rx:v1:`.
- Current verifier result: unversioned fields with a boolean `ok`, English
  `status` or `error` text, and a `receipt_hashes` array; no verifier-profile
  identity or machine diagnostic code.
- Stable chain fields omit `input_commitment` and `action_commitment`.
- Positive execution and reconciliation outcomes do not require all
  assertions to pass.
- Receipt identifiers are not unique within a chain.
- Corpus measured in the repository: one valid control and seven vulnerable
  vectors. The current runtime accepts all eight. This is not an estimate of
  the number or percentage of receipts outside the repository.
- There is no public Python POM-RX verifier. Python tests cover Proof Receipt.

## SECURITY_IMPACT

Unqualified v0.1 acceptance can be mistaken for action or input continuity,
consistent positive outcomes, or uniqueness that the verifier does not prove.
An unsigned surrogate acknowledgement is not a Witness. Duplicate-ID rejection
within one chain is not complete replay protection. A legacy result must never
be eligible for a Gate or authorization decision.

## COMPATIBILITY_IMPACT

Changing the verifier default can newly reject chains accepted by the public
prototype even if their receipt hashes stay unchanged. Changing assertion
ordering can change the canonical receipt and hash itself.

Measured locally with Node `v24.16.0`, ICU `78.3`, and the resolved default
collator `{ locale: fr-CH, usage: sort, sensitivity: variant,
ignorePunctuation: false, collation: default, numeric: false,
caseFirst: false }`, the permitted rule IDs `a-a`, `a.a`, `a_a` order as
`a_a`, `a-a`, `a.a` with legacy `localeCompare`, and as `a-a`, `a.a`, `a_a`
with ordinal comparison. The same logical receipt produced different hashes:

- legacy: `36021257295b7432ba172f018ec50c02880e2320a8808e40a380bcbba38532d8`;
- ordinal: `9d8397aa9e3267f854edf69a03673ef9456acc29658b6ceb16f610e9761f7592`.

This evidence forbids introducing ordinal ordering under v0.1.

## OPTIONS

### OPTION_A — strict erratum as the v0.1 default

Technically small and immediately fail-closed, but silently changes the
meaning of the existing API and can break previously accepted chains. Rejected
as a standalone approach.

### OPTION_B — optional strict v0.1 mode

Preserves legacy behavior but becomes a downgrade path if callers can omit,
select or fall back to the permissive mode. Rejected as a standalone approach.

### OPTION_C — corrections only in v0.2

Provides the cleanest new schema and hash boundary, but leaves no strict tool
for current v0.1 evidence unless every consumer categorically rejects v0.1.
Rejected as a standalone approach.

### OPTION_D — bounded combination

Freeze v0.1 receipt construction and legacy reproduction, add a separately
versioned strict v0.1 verification profile, and reserve new normative content,
ordering, schema and hash-domain semantics for POM-RX Core v0.2 candidate.

## RECOMMENDATION

The council recommends Option D. The exact recommendation below received
explicit human ratification on 2026-08-12; its separate Tier-B merge gate
remains open:

1. freeze all v0.1 bytes, hashes, schema, domain and canonicalisation;
2. keep the existing `verifyPomRxChain()` behavior and result shape unchanged
   throughout package `0.1.x`, mark it `DEPRECATED_ARCHIVAL_ONLY`, and make it
   ineligible for every active-use or Gate contract;
3. add, no earlier than package `0.1.1`, a separately typed
   `reproducePomRxV01Legacy()` archival API for the exact
   `pom-rx-v0.1/legacy-reproduction-1` profile whose result has no generic `ok`
   field and is always non-authorizing;
4. add a distinct `verifyPomRxChainProfiled()` active-use API which supports
   only the exact `pom-rx-v0.1/strict-errata-1` profile under the ratified
   policy. It MUST recompute and compare receipt commitments using the exact
   frozen v0.1 validation, canonicalisation, ordering and hash algorithm. It
   MUST NOT change, persist, replace or rewrite historical bytes or hashes;
5. require trusted local policy and exact profile selection in the new API.
   Receipt or request data cannot supply or weaken policy. Membership in an
   explicit allow-set of `(receipt_schema_version, verifier_profile,
   verifier_version, implementation_artifact_sha256)` tuples, not wildcards,
   ranges, lexical or semantic-version ordering, decides acceptance. Missing,
   unknown, malformed, withdrawn, unlisted or disallowed tuples fail closed
   without legacy retry;
6. make every standalone legacy and strict verdict explicitly
   `authorization_eligible = false` and `authorization_proved = false`.
   Strict structural conformance may be one prerequisite of a future composite
   Gate decision, never an authorization or `ALLOW` by itself;
7. require each strict defect diagnostic to carry both its immutable PR 27
   `defect_id` and its versioned machine code. Define ordered, deduplicated
   diagnostics and stable base codes for inherited validation failures;
8. reserve deterministic new assertion ordering, content profiles, Witness,
   Gate and native-execution binding for POM-RX Core v0.2 candidate under a new
   schema and hash domain;
9. prohibit automatic downgrade and retrospective v0.1-to-v0.2 authorization.

The exact local policy identifier is `pom-rx-local-verification-policy/1` and
the exact result-envelope identifier is `pom-rx-verification-verdict/1`.

## DISSENT

- A compatibility-purist position prefers Option C. Security dissents unless
  all v0.1 results are categorically non-authorizing.
- A rapid-remediation position prefers Option A. Architecture dissents because
  an unversioned default change silently reinterprets public behavior.
- If legacy results cannot be made unmistakably non-authorizing, fall back to
  Option C and reject all v0.1 for authorization instead of shipping an
  ambiguous dual-mode verifier.

## TEST_PLAN

1. Freeze golden v0.1 canonical bytes and hashes, including punctuation-order
   vectors and declared runtime/ICU/locale provenance.
2. Prove receipt hashes are identical before and after introducing verifier
   profiles.
3. Legacy corpus: reproduce one valid acceptance and seven vulnerable
   acceptances, each explicitly non-authorizing; separately preserve legacy
   structural rejections with a rejection qualification.
4. Strict corpus: accept the valid control 1/1 and reject the seven exact PR 27
   vectors with stable defect-to-diagnostic mappings.
5. Reject absent, unknown, tampered and downgraded profile selection without a
   legacy retry.
6. Test version/domain confusion in both directions and prohibit automatic
   downgrade.
7. Test exact `(defect_id, diagnostic_code)` pairs, stable inherited-validation
   codes, diagnostic order and deduplication independently of English messages.
8. Test that the old API result type and both standalone new verdict types are
   rejected by a Gate, including a consumer that ignores newly added fields.
9. Test trusted policy identity and exact schema/profile/verifier-version/
   artifact-hash tuple membership, including rejection of an unlisted verifier
   version that claims an allowed profile. Test that an effective withdrawal
   overrides allow-set membership, withdrawal effective time, cached-verdict
   invalidation and revalidation.
10. Keep the expected-red gate until each approved strict correction is proven;
   transition cases individually, never by deleting the baseline wholesale.
11. Add replay-state, signed-Witness and one-time Gate tests only in their
   separate human-gated phases.
12. Require cross-runtime v0.2 ordering vectors and an independent verifier
    before publication.

## ROLLBACK

This council and ADR are documentation-only and can be reverted without
changing runtime behavior. A future strict verifier must ship separately. A
withdrawal record binds the exact schema/profile/verifier-version/artifact-hash
tuple, an effective time and a replacement or terminal status. Gate-side policy
rechecks the current allow-set at consumption time; cached verdicts from a
withdrawn tuple are invalidated and revalidated or rejected. If withdrawal
time cannot be evaluated using a trusted clock, consumption is indeterminate
and denied. Historical verdicts remain append-only evidence, but never remain
authorization-eligible after withdrawal. Withdrawal never falls back silently
to legacy. No rollback may rewrite historical receipts or reinterpret v0.2 as
v0.1.

## HUMAN_GATE

Human ratification was received in the Codex task on 2026-08-12 from the
conversation actor identifying as confirmed project contact Mehdi Mauroux, with
the exact instruction:

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

Those hashes identify the reviewed Option D artifacts presented before this
ratification record was appended. New hashes created by recording the decision
are evidence of the record itself; they do not replace the ratified artifact
identity.

This ratifies Option D, the exact profile names, package and API boundary,
trusted-policy contract, diagnostic registry, legacy non-authorization rule,
and separation of v0.1 ordering from the future v0.2 decision. The record is a
conversation-bound human decision whose actor identity was not independently
authenticated, not a cryptographic signature or formal GitHub review.

The distinct Tier-B merge gate remains unsatisfied. Before PR 32 can merge, the
exact reviewed head must remain CI-green and the human must provide:

```text
APPROUVE FUSION PR #32
```

Until that merge, this council does not authorize verifier, schema,
canonicalisation, Witness, Gate or v0.2 implementation or publication. Exact
v0.2 normalization and ordering remain a separate Tier-B ADR.
