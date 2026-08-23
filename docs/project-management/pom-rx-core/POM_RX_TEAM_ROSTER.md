# POM-RX Core — Team Roster and Review Routing

Updated: `2026-08-23T06:30:00+02:00`

## Purpose

This roster defines accountable roles and evidence requirements. It does **not** claim that a named model, human or agent actually ran merely because a role is listed. GitHub review/runtime evidence is authoritative for reviewer identity.

## Invariants

- One durable repository: `SwissTokint/swisstokint-open-risk-infrastructure`.
- One writer per bounded lot and one owner per file set.
- Maximum three active specialist lanes and two code worktrees.
- Review lanes are read-only unless a separate implementation assignment is created after review.
- Useful work is committed and pushed to a dedicated branch; no direct `main` edits and no force-push.
- A moved head invalidates exact-head CI/review evidence.
- Release-owner/Prime/self-review is never independent evidence.
- Missing independent review is `INDEPENDENT_REVIEW_PENDING`, never an invented reviewer.

## Active role matrix

| Role | Accountability | Mode | Required evidence | Forbidden |
| --- | --- | --- | --- | --- |
| Prime Lead / Integrator | live GitHub state, dependency order, scope, ownership, integration | accountable / non-independent | exact main/head/CI/review reconciliation + durable checkpoint | claiming independence; direct `main` edits |
| Protocol / Systems Architect | Core/application boundary, schemas, canonicalization, compatibility, simpler design | read-only | architecture verdict tied to reviewed scope/head | writing the same lot |
| Security / Adversarial Skeptic | replay, substitution, TOCTOU, object/intrinsic poisoning, fail-open, overclaim | read-only | concrete Tier-B falsification hypotheses + P0/P1/P2 classification | implementation writes; generic approval |
| Single Implementer | smallest bounded accepted solution | exclusive writer | branch/file ownership, tests, commit/push evidence | second writer or scope widening |
| QA / Conformance | positive/negative tests, expected-red, compatibility, false-PASS resistance | read-only relative to writer | reproducible exact-head evidence | approving unexecuted tests |
| Code Quality / Optimization | TCB size, duplication, deterministic behavior, maintainability, boundedness | read-only | scoped PASS/CONDITIONAL/BLOCK | weakening fail-closed behavior for optimization |
| Independent Release Gate | distinct skeptical/security release evidence | genuinely distinct exact-head reviewer | actual exact-head review with no unresolved P0/P1/P2 | owner/self/moved-head/invented review |
| Context / State Ledger | durable cross-chat continuation | coordination | RESUME + TASKS/BLOCKERS/CAPABILITY reconciliation when facts change | parallel PM system or chat-only continuity |

## Independent-review rule

A fresh `chatgpt-codex-connector` review may satisfy the independent release gate only when it explicitly covers the actual frozen candidate SHA, exact-head CI is green, all findings are resolved/non-blocking, no P0/P1/P2 remains unresolved, and no later commit has moved the head. The independent-review waiver remains limited to PR #60.

## Current coordination ownership

Trusted main is `097937acf19338bdaab54050d64f18195d9b4a33`, the exact PR #124 merge. Canonical exact-main CI `32617884521` / CI 794 attempt 1 succeeded and exact-merge assurance is `POST_MERGE_ASSURANCE_PASS` in PR #124 comment `5384213312`. The distinct source-head review is `chatgpt-codex-connector[bot]` comment `5384176703` on reviewed commit `43c331244a`.

The bounded non-Tier-B reconciliation branch `docs/pom-rx-post-pr124-live-reconcile-20260823` has one documentation writer and owns only:

- `POM_RX_RESUME_CHECKPOINT.md`;
- `POM_RX_TASKS.yaml`;
- `POM_RX_BLOCKERS.md`;
- `POM_RX_TEAM_ROSTER.md`;
- `docs/product/POM_RX_CAPABILITY_MAP.md`.

No runtime/test/protocol/Gate/Witness/verifier/Wallet Guard/provider semantics belong to this writer lot. Its purpose is to persist the assured PR #124 main state and the resulting PR #120 divergence before stale canonical facts are reused.

## Active Tier-B ownership focus — PR #120

PR #120 remains the active Wallet Guard/provider prerequisite at exact live head `5238b9c289476100c875ed9a88bd7e21a574fa67`. Since trusted main advanced to `097937acf19338bdaab54050d64f18195d9b4a33`, the branch is now diverged: ahead 69 / behind 6 with merge-base `73f3921984449ffd6025f6c9b99b0220f0bf068b`. It must be reconciled to current trusted main before any runtime repair or fresh release evidence.

Historical exact-head CI `32614831929` / 792 passed and owner review `5001566041` found `0 P0 / 0 P1 / 0 P2`, but they are not release evidence after main moved and the distinct exact-head Codex review found current P1 `PRRT_kwDOTiNyWc6bc4gh`.

After the current documentation reconciliation becomes trusted, exactly one writer may reconcile and repair this bounded P1 on the existing PR #120 stream. That writer must not widen the claim to hostile constructor/species accessors, Proxy paths or attacker-selected species constructors. Required QA includes a CI-wired `--unhandled-rejections=strict` regression for the non-configurable unsafe data-constructor case and proof of zero reference authorization / zero sensitive forwarding on failure.

Architecture, security/adversarial, QA/conformance and code-quality lanes remain read-only relative to that writer. The release-owner lane remains non-independent. A moved head requires wholly fresh canonical CI, owner five-stage evidence and genuinely distinct exact-head `chatgpt-codex-connector` review before release.

Concrete skeptical hypotheses for the repaired final candidate must cover rejected-Promise draining, effective `constructor`/`Symbol.species`, non-configurable unsafe data constructors, hostile constructor/species accessors, Proxy/prototype paths, strict unhandled rejection, provider-result thenable assimilation, inherited Array-index substitution, and zero reference authorization/sensitive forwarding on fail-closed rejection.

Six PR #120 P1/P2 threads remain unresolved until repaired exact-head evidence justifies closure: `PRRT_kwDOTiNyWc6bZjxp`, `PRRT_kwDOTiNyWc6bZ6tx`, `PRRT_kwDOTiNyWc6bZ6tz`, `PRRT_kwDOTiNyWc6baFkR`, `PRRT_kwDOTiNyWc6baIxZ`, and fresh current finding `PRRT_kwDOTiNyWc6bc4gh`.

## Historical streams

PR #97 remains `OPEN / STALE / MUST_NOT_MERGE` at `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`. Reconstruct useful durable-Gate concepts later from then-current trusted main after PR #120 receives post-merge assurance PASS; do not revive or wholesale-copy stale history.

PR #93 remains `OPEN / STALE / UNTRUSTED / LATER` at `c4e40ceb286f4e59657767661daed15d2b68e9a7`. Reconcile useful simulation work later with fresh dependency and exact-head review evidence.

## Operational prototype claim boundary

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded. It is not production readiness, audit, certification, real-wallet safety, exchange authorization, deployment authorization or financial-execution proof.
