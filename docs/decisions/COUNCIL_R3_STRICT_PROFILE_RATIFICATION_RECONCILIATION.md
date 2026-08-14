# Technical Council — R3 Strict Profile Ratification Reconciliation

Status: `HUMAN_RATIFIED_OPTION_C / TIER_B / PR39_EXACT_HEAD_GATES_REQUIRED`

Date: 2026-08-14

Task: `R3-STRICT-PROFILE-RATIFICATION-RECONCILIATION`

Baseline: `09d87e71e776727422674f37627d10de9276e444`

Participants:

- Lead Integrator: Codex;
- Protocol Architect: GPT-5.6 Codex, read-only fallback because Claude Opus 5 is unavailable;
- Cryptography and Security Lead: GPT-5.6 Codex, distinct read-only fallback because Claude Opus 5 is unavailable;
- Senior Core Implementer: GPT-5.6 Codex, read-only feasibility review; runtime
  implementation remains blocked.

## PROBLEM

Before the source-bound instruction recorded below, PR #33 had merged the exact
strict-profile prerequisite proposal into `main`, while both the ADR and its
original council deliberately retained `PROPOSED / HUMAN_REVIEW_REQUIRED` and
stated that no runtime implementation was authorized. Repository integration
alone was not evidence that the human adopted the new protocol semantics. The
control plane therefore required this reconciliation to record an explicit
source-bound ratification without treating the merge itself as ratification.

The decision is material because it would amend the already ratified R2
compatibility registry by adding
`POMRX-001-INPUT-EXECUTION-RECONCILIATION` and by distinguishing the immutable
surrogate conformance scenario ID from the receipt-only verifier diagnostic.

## CURRENT_BEHAVIOR

- PR #33 source head `496fe9a49459518f6ceedcc3215401b50fe435e1`
  merged as `743b8082bfc925d1681af7a239856a0b4f7e8464`.
- The ADR source Git blob is
  `81fd51733e1eed1baef6d19d457ad3ce0adf0edd`; SHA-256 over the exact LF Git
  blob bytes is
  `aaec7efefe6f6e17ee5dea8c39f36a8dbdfc8563c405118303799999f4fbec7f`.
- The original council source Git blob is
  `ad64e022c36d76d57547f76db5b1597bc8f15081`; SHA-256 over the exact LF Git
  blob bytes is
  `3750bab3d19a5c62b589a7c5a15cd1a505326951dd5864e72251d2ee2e8a93ec`.
- The PR #33 source and merged trees contain the same two blobs.
- PR #35 merged the immutable v0.1 compatibility corpus and checksums as
  `2a65bfb555b2eea942c8724819487df06c94242c`. PR #38 later corrected only the
  fresh-Windows checkout LF materialization of the root `.gitattributes`
  contract; it changed no fixture, receipt, canonical or hash byte.
- The expected-red gate still reports exactly seven known vulnerable chains
  and one valid control. The strict profile foundation and invariants do not
  exist yet.

The SHA-256 values above bind Git blob bytes, not the CRLF working-tree
materialization produced by Windows `core.autocrlf=true`.

## SECURITY_IMPACT

Implicit ratification could have enabled a verifier foundation without explicit
adoption of the single-use trusted-policy capability, executable-byte artifact
identity, exact runtime constraints, no-legacy-fallback rule, diagnostic
precedence, surrogate observability boundary, or incomplete-profile activation
barrier. That would create ambiguous selection and misleading conformance
claims.

The exact source-bound instruction received on 2026-08-14 satisfies the semantic
decision gate. Fail-closed integration remains mandatory: no runtime, public
profiled API, conformant strict verdict, schema, canonicalisation, hash,
Witness, Gate, DAGR, or v0.2 work is authorized until this amended PR #39 is
reviewed, green and merged.

## COMPATIBILITY_IMPACT

This reconciliation is documentation-only. It changes no `pom-rx/0.1`
receipt, canonical byte, hash domain, receipt hash, fixture, historical export,
schema, verifier behavior, Witness, Gate, DAGR profile, or package version.

As ratified, Option C remains additive: the legacy API is unchanged,
strict work stays internal and non-authorizing until the complete activation
matrix passes, and each invariant family remains separately gated.

## OPTIONS

### OPTION_A

Treat the merge of PR #33 as implicit semantic ratification.

Rejected as the basis for ratification. Before the source-bound human
instruction recorded below, the merged documents explicitly said the opposite
and no recorded human instruction named Option C or its two diagnostic-registry
changes. Ratification now rests only on the later exact instruction, never on
the merge.

### OPTION_B

Keep the ADR proposed, record the exact blocker and request a source-bound
human semantic decision.

This was the selected fail-closed disposition before the human instruction. It
is superseded as the current semantic state but remains the correct historical
record of the blocked interval.

### OPTION_C

After explicit source-bound human ratification, append a provenance record and
change the ADR/original council statuses to
`HUMAN_RATIFIED_OPTION_C / TIER_B / IMPLEMENTATION_PRS_SEPARATELY_GATED`.

Selected by the exact human instruction in `HUMAN_GATE`. The reconciliation PR
still requires fresh Protocol, Security and QA reviews, green exact-head CI,
and its own explicit merge authorization before runtime work begins.

## RECOMMENDATION

Execute Option C as selected by the exact source-bound human instruction.
General standing merge authorization and standing DAGR authorization did not
substitute for this protocol-semantic decision. DAGR remains a separately
source-gated POM-RX Governance Profile and is outside this task.

Preserve every Option C technical clause and append bounded provenance. The
received ratification explicitly covers:

1. the complete verdict envelope, truth table, nullability and diagnostics;
2. the fresh, pinned, branded, single-use policy capability and withdrawal
   precedence;
3. deterministic executable-byte artifact identity and runtime canary;
4. separate profiled API, no legacy call/fallback and internal-only
   `PROFILE_INCOMPLETE` result;
5. final activation only after the complete invariant matrix;
6. `POMRX-001-INPUT-EXECUTION-RECONCILIATION`;
7. surrogate scenario/verdict observability separation;
8. standalone verdicts remain non-authorizing and every runtime PR remains
   separately gated.

## DISSENT

A delivery-speed position may infer consent from the merge. Both independent
reviewers reject that inference because the proposal text explicitly retains a
human semantic gate. No other dissent remains in this documentation-only
disposition.

## TEST_PLAN

For this ratification reconciliation lot:

1. parse the control registry;
2. verify the exact PR #33 source/merge blob identities and LF-byte SHA-256;
3. verify PR #35 and PR #38 merge records;
4. run `git diff --check` and the expected-red strict gate;
5. secret-scan the documentation diff;
6. obtain exact-head Protocol, Security and QA reviews and green CI before any
   reconciliation merge.

The full runtime test plan remains unchanged in the ratified prerequisites ADR
and cannot begin until PR #39 is reviewed, green and merged.

## ROLLBACK

Revert this documentation-only record. No runtime or historical artifact is
affected. Never rewrite the v0.1 corpus, alter PR #27 defect evidence, retry
legacy after a strict failure, or infer ratification from repository history.

## HUMAN_GATE

The confirmed human supplied the following exact, source-bound semantic
instruction in the Codex task on 2026-08-14:

```text
RATIFIE OPTION C POM-RX STRICT PROFILE AU HEAD 496fe9a49459518f6ceedcc3215401b50fe435e1, Y COMPRIS POMRX-001-INPUT-EXECUTION-RECONCILIATION ET LA RÈGLE D’OBSERVABILITÉ DU SURROGATE.
```

Decision provenance:

```text
source: Codex task
received_at: exact_time_not_recorded
recorded_at: 2026-08-14T15:28:53+02:00
conversation_actor: Mehdi Mauroux
actor_authentication: conversation-bound; not independently authenticated
ratified_source_head: 496fe9a49459518f6ceedcc3215401b50fe435e1
ratified_adr_git_blob: 81fd51733e1eed1baef6d19d457ad3ce0adf0edd
ratified_adr_git_blob_sha256: aaec7efefe6f6e17ee5dea8c39f36a8dbdfc8563c405118303799999f4fbec7f
ratified_council_git_blob: ad64e022c36d76d57547f76db5b1597bc8f15081
ratified_council_git_blob_sha256: 3750bab3d19a5c62b589a7c5a15cd1a505326951dd5864e72251d2ee2e8a93ec
```

This instruction satisfies only the semantic decision gate. PR #39 and each
future Tier-B implementation PR keep their own exact-head review, CI and merge
gates. PR #39 requires `APPROUVE FUSION PR #39` after its amended exact head is
reviewed and green. This is not a release, deployment, audit, certification, or
authorization for financial execution.
