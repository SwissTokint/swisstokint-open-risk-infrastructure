# POM-RX Core — Team Roster and Review Routing

Updated: `2026-08-23T20:12:00+02:00`

## Purpose

This roster defines accountable roles and evidence requirements. It does not claim that a named model, human or agent actually ran merely because a role is listed. GitHub review/runtime evidence is authoritative for reviewer identity and current activity.

This is a **versioned snapshot**. Embedded SHAs/branch names are authoring-time anchors, not claims that they remain the exact live GitHub state after this file's own merge. Read live GitHub first.

Snapshot anchors:

- `snapshot_base_main`: `e45869bf77025566d6be4edac58424f6002ad08e`;
- base state: PR #134 exact merge, exact-main CI 852 success, post-merge assurance `5387352052 = POST_MERGE_ASSURANCE_CONDITIONAL` due the control-plane self-reference/liveness defect;
- `last_assured_main_before_snapshot`: `ed0cc5936a12fcd420890ee1553690569b2d4ec7`, PR #133 assurance `5387034808 = POST_MERGE_ASSURANCE_PASS`.

Exact current main/CI/review/post-merge state is persisted after merge in the relevant PR terminal checkpoint; do not open a new docs-only PR solely to replace `snapshot_base_main` with that repair merge SHA.

## Invariants

- One durable repository: `SwissTokint/swisstokint-open-risk-infrastructure`.
- One writer per bounded lot and one owner per file set.
- Single-flight coordination is mandatory before any state-changing action: an active lock younger than 45 minutes means `SKIPPED_PREVIOUS_RUN_ACTIVE`; failed or unverifiable acquisition means `SKIPPED_COORDINATION_GUARD_UNAVAILABLE`; both paths modify nothing. Any acquired lock is released on the terminal path after durable state persistence.
- Maximum three active specialist lanes and two code worktrees.
- Review lanes are read-only unless a separate implementation assignment is created after review.
- Useful work is committed/pushed to a dedicated branch; no direct `main` edits and no force-push.
- A moved head invalidates exact-head CI/review evidence.
- Release-owner/Prime/self-review is never independent evidence.
- Missing independent review is `INDEPENDENT_REVIEW_PENDING`, never an invented reviewer.
- Live GitHub determines which branch/PR is actually active; this file provides routing rules, not a self-expiring active-branch declaration.

## Role matrix

| Role | Accountability | Mode | Required evidence | Forbidden |
| --- | --- | --- | --- | --- |
| Prime Lead / Integrator | live GitHub state, dependency order, scope, ownership, integration | accountable / non-independent | exact main/head/CI/review reconciliation + durable checkpoint | claiming independence; direct `main` edits |
| Protocol / Systems Architect | Core/application boundary, schemas, canonicalization, compatibility, simpler design | read-only | architecture verdict tied to reviewed scope/head | writing the same lot |
| Security / Adversarial Skeptic | replay, substitution, TOCTOU, object/intrinsic poisoning, fail-open, overclaim | read-only | concrete Tier-B falsification hypotheses + P0/P1/P2 classification | implementation writes; generic approval |
| Single Implementer | smallest bounded accepted solution | exclusive writer | branch/file ownership, tests, commit/push evidence | second writer or scope widening |
| QA / Conformance | positive/negative tests, expected-red, compatibility, false-PASS resistance | read-only relative to writer | reproducible exact-head evidence | approving unexecuted tests |
| Code Quality / Optimization | TCB size, duplication, deterministic behavior, maintainability, boundedness | read-only | scoped PASS/CONDITIONAL/BLOCK | weakening fail-closed behavior for optimization |
| Independent Release Gate | distinct skeptical/security release evidence | genuinely distinct exact-head reviewer | actual exact-head review with no unresolved P0/P1/P2 | owner/self/moved-head/invented review |
| Context / State Ledger | durable cross-chat continuation | coordination | RESUME + TASKS/BLOCKERS/CAPABILITY snapshot plus live terminal checkpoint | parallel PM system or chat-only continuity |

## Independent-review rule

A fresh `chatgpt-codex-connector` review may satisfy the independent release gate only when it explicitly covers the actual frozen candidate SHA, canonical exact-head CI is green, all findings are resolved/non-blocking, no P0/P1/P2 remains unresolved, and no later commit moved the head. The independent-review waiver remains limited to PR #60.

## Continuity-model repair routing

The authoring-time repair branch is `docs/pom-rx-non-self-referential-continuity-20260823-1923`, created from `snapshot_base_main=e45869bf...` after PR #134 post-merge assurance found a P2 liveness defect.

The repair's bounded owned set is:

- `docs/project-management/pom-rx-core/POM_RX_AUTOMATION_POLICY.md`;
- `docs/project-management/pom-rx-core/POM_RX_RESUME_CHECKPOINT.md`;
- `docs/project-management/pom-rx-core/POM_RX_TASKS.yaml`;
- `docs/project-management/pom-rx-core/POM_RX_BLOCKERS.md`;
- `docs/project-management/pom-rx-core/POM_RX_TEAM_ROSTER.md`;
- `docs/product/POM_RX_CAPABILITY_MAP.md`.

This is documentation/control-plane only; no runtime, test, protocol, Gate, Witness, verifier, Wallet Guard/provider, wallet/network, public-site/Vercel or financial-execution semantics belong to this repair lot.

The independent review `5002957358` of predecessor head `8dc1648f65...` found P2 thread `PRRT_kwDOTiNyWc6bg6TG`: single-flight acquisition had been made optional. The repair restores mandatory fail-closed acquisition, skip-on-active/unverifiable guard behavior, and terminal lock release. Because the head moved, CI 853 and all reviews on `8dc1648f65...` are historical for release; the successor head requires wholly fresh exact-head gates and genuinely distinct review before the thread may be resolved.

Stable ownership rule: while a live control-plane repair PR owning these files is open, PR #131's writer lane remains frozen. Once the latest repair PR merges and its exact-merge assurance is `POST_MERGE_ASSURANCE_PASS`, that freeze is lifted **without** requiring another docs-only PR solely to chase the repair merge SHA. Live GitHub terminal evidence resolves the transition.

## Next Tier-B routing — PR #131

Authoring-time snapshot: PR #131 head `3a75418ef13e7364b70e60a17e5514f1b1a8bfc2`; against `snapshot_base_main` it is diverged ahead 32 / behind 18; historical CI 846 is green but stale for release; seven P1 threads remain unresolved/outdated.

When live GitHub shows the continuity repair has exact-merge PASS, PR #131 becomes the next dependency-closing workstream. Use exactly one writer to reconcile it onto then-live main; no stale #120/#97/#93 branch is merged wholesale. A moved #131 head restarts exact-head evidence.

Read-only specialist routing after reconciliation:

1. Protocol / Systems Architect — verify Core/application boundary, narrow trusted-provider contract and simpler TCB alternatives;
2. Security / Adversarial Skeptic — falsify provider provenance TOCTOU, pre/post-import Promise/reflection/provenance poisoning, constructor/species/accessor/Proxy/prototype paths, thenable assimilation, strict-unhandled behavior and claim leakage;
3. QA / Conformance — verify CI-wired negative tests, clean strict-process survival, zero reference authorization and zero sensitive forwarding.

The release owner then performs the five-stage gate as non-independent evidence; a genuinely distinct exact-head review remains mandatory.

Seven PR #131 P1 threads remain attack inputs until same-head independent validation: `PRRT_kwDOTiNyWc6bfPvI`, `PRRT_kwDOTiNyWc6bfPvO`, `PRRT_kwDOTiNyWc6bfPvR`, `PRRT_kwDOTiNyWc6bfWeN`, `PRRT_kwDOTiNyWc6bfel5`, `PRRT_kwDOTiNyWc6bfel6`, `PRRT_kwDOTiNyWc6bfel7`.

The supported path must not install process-global rejection swallowing, execute hostile constructor/species accessors or Proxy paths, silently trust attacker-selected species constructors, weaken strict-rejection tests, or claim same-process survival for an already-originated out-of-contract hostile Promise.

## Historical streams at snapshot authoring

- PR #120: `CLOSED / NOT MERGED / STALE` at `5238b9c289476100c875ed9a88bd7e21a574fa67`; do not reopen or wholesale-copy; six P1/P2 findings remain attack history.
- PR #97: `OPEN / STALE / MUST_NOT_MERGE` at `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`, diverged ahead 66 / behind 267 from `snapshot_base_main`.
- PR #93: `OPEN / STALE / UNTRUSTED / LATER` at `c4e40ceb286f4e59657767661daed15d2b68e9a7`, diverged ahead 86 / behind 312.

## Operational prototype claim boundary

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded. It is not production readiness, audit, certification, real-wallet safety, exchange authorization, deployment authorization or financial-execution proof.
