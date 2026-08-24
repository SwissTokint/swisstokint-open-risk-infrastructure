# POM-RX Core — Team Roster and Review Routing

Updated: `2026-08-24T09:37:00+02:00`

## Purpose

This roster defines accountable roles and evidence requirements. It does not claim that a named model, human or agent actually ran merely because a role is listed. GitHub review/runtime evidence is authoritative for reviewer identity and current activity.

This is a **versioned snapshot**. Embedded SHAs/branch names are authoring-time anchors, not claims that they remain the exact live GitHub state after this file's own merge. Read live GitHub first.

Snapshot anchors:

- `snapshot_base_main`: `8e8de6ae9744348e6c3eb2d1d0cf2ef3281de970`;
- base state: PR #135 exact merge, exact-main CI 859 success, post-merge assurance `5387715186 = POST_MERGE_ASSURANCE_PASS`;
- terminal checkpoint: `5387722428`.

## Invariants

- One durable repository: `SwissTokint/swisstokint-open-risk-infrastructure`.
- One writer per bounded lot and one owner per file set.
- Single-flight coordination is mandatory before entering or continuing any writer lane and uses only `POM_RX_COORDINATION_GUARD.md`.
- Canonical lock state lives only at branch `automation/pom-rx-coordination`, file `.pom-rx/coordination-lock.json`, schema `pom-rx-coordination-lock/1`, lease 45 minutes.
- Acquisition uses the exact fetched file blob SHA as compare-and-swap token and requires a same-run re-read verifying `state=HELD`, exact `holder.run_id` and future `expires_at` before writer entry.
- **Immediately before every state-changing project action**, the writer must re-read the canonical lock and again require valid schema/configuration, `state=HELD`, exact own `holder.run_id` and future `expires_at`.
- Expiry, ownership change, FREE state or unverifiable lock means the invocation performs no further project mutation. It may not renew, extend or reacquire the lease inside the same invocation; a later invocation resumes from live GitHub state.
- Active unexpired lock held by another run means `SKIPPED_PREVIOUS_RUN_ACTIVE`; failed, malformed, unreadable or unverifiable acquisition means `SKIPPED_COORDINATION_GUARD_UNAVAILABLE`; both paths modify no project state.
- Release is allowed only while the same holder still owns an unexpired lease; it updates to `FREE` with the exact fetched blob SHA and re-reads to require `state=FREE`. An expired/displaced former holder never releases another run's lease.
- No issue, label, comment, workflow artifact, local file, chat state or alternate branch may be used as a competing lock.
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
| Single Implementer | smallest bounded accepted solution | exclusive writer | verified canonical lease at entry and before each project mutation + branch/file ownership + tests + commit/push evidence | second writer, scope widening, writing after lease loss/expiry, renewal/reacquisition in same invocation |
| QA / Conformance | positive/negative tests, expected-red, compatibility, false-PASS resistance | read-only relative to writer | reproducible exact-head evidence | approving unexecuted tests |
| Code Quality / Optimization | TCB size, duplication, deterministic behavior, maintainability, boundedness | read-only | scoped PASS/CONDITIONAL/BLOCK | weakening fail-closed behavior for optimization |
| Independent Release Gate | distinct skeptical/security release evidence | genuinely distinct exact-head reviewer | actual exact-head review with no unresolved P0/P1/P2 | owner/self/moved-head/invented review |
| Context / State Ledger | durable cross-chat continuation | coordination | RESUME + TASKS/BLOCKERS/CAPABILITY snapshot plus live terminal checkpoint | parallel PM system or chat-only continuity |

## Independent-review rule

A fresh `chatgpt-codex-connector` review may satisfy the independent release gate only when it explicitly covers the actual frozen candidate SHA, canonical exact-head CI is green, all findings are resolved/non-blocking, no P0/P1/P2 remains unresolved, and no later commit moved the head. The independent-review waiver remains limited to PR #60.

## Coordination-guard bootstrap repair routing

After PR #135 merged and passed post-merge assurance, the next automation invocation correctly stopped because the policy required a single-flight lock but no canonical operational mechanism existed. The existing hourly task was disabled rather than allowing repeated writer attempts without verified mutual exclusion.

Under explicit human direction on 2026-08-24, the one-time canonical coordination branch/file was bootstrapped and a manual repair run acquired it by blob-SHA compare-and-swap. A stale compare-and-swap attempt using the previous blob SHA was rejected by GitHub with HTTP 409. The release-owner skeptical pass then identified the stale-owner race that exists if a run waits past its 45-minute lease; the repair therefore also requires same-holder/unexpired lock verification before **every** project mutation and forbids same-run renewal/reacquisition after expiry.

The scoped repair branch is `docs/pom-rx-canonical-coordination-lock-20260824` and owns only:

- `docs/project-management/pom-rx-core/POM_RX_COORDINATION_GUARD.md`;
- `docs/project-management/pom-rx-core/POM_RX_AUTOMATION_POLICY.md`;
- `docs/project-management/pom-rx-core/POM_RX_RESUME_CHECKPOINT.md`;
- `docs/project-management/pom-rx-core/POM_RX_TASKS.yaml`;
- `docs/project-management/pom-rx-core/POM_RX_BLOCKERS.md`;
- `docs/project-management/pom-rx-core/POM_RX_TEAM_ROSTER.md`.

This lot is documentation/control-plane only. It changes no runtime, tests, protocol, Gate, Witness, verifier, Wallet Guard/provider, wallet/network, public-site/Vercel or financial-execution semantics.

The scheduled task remains disabled until the repair has exact-head CI success, the five-stage owner gate, a genuinely distinct exact-head review, merge, exact-main CI/status and exact-merge `POST_MERGE_ASSURANCE_PASS`. On the normal terminal path the repair invocation releases and verifies its still-live canonical lease before the **existing** task is re-enabled. If its lease expires while waiting for CI/review, it becomes read-only; a later invocation must acquire a fresh lease to perform the remaining writes.

## Next Tier-B routing — PR #131

Authoring-time snapshot: PR #131 head `3a75418ef13e7364b70e60a17e5514f1b1a8bfc2`; historical CI 846 is green but stale for release; seven P1 threads remain unresolved/outdated.

When live GitHub shows the canonical coordination-guard repair has exact-merge PASS and the existing automation can acquire/release the canonical lease, PR #131 becomes the next dependency-closing workstream. Use exactly one writer to reconcile it onto then-live main; no stale #120/#97/#93 branch is merged wholesale. A moved #131 head restarts exact-head evidence.

Read-only specialist routing after reconciliation:

1. Protocol / Systems Architect — verify Core/application boundary, narrow trusted-provider contract and simpler TCB alternatives;
2. Security / Adversarial Skeptic — falsify provider provenance TOCTOU, pre/post-import Promise/reflection/provenance poisoning, constructor/species/accessor/Proxy/prototype paths, thenable assimilation, strict-unhandled behavior and claim leakage;
3. QA / Conformance — verify CI-wired negative tests, clean strict-process survival, zero reference authorization and zero sensitive forwarding.

The release owner then performs the five-stage gate as non-independent evidence; a genuinely distinct exact-head review remains mandatory.

Seven PR #131 P1 threads remain attack inputs until same-head independent validation: `PRRT_kwDOTiNyWc6bfPvI`, `PRRT_kwDOTiNyWc6bfPvO`, `PRRT_kwDOTiNyWc6bfPvR`, `PRRT_kwDOTiNyWc6bfWeN`, `PRRT_kwDOTiNyWc6bfel5`, `PRRT_kwDOTiNyWc6bfel6`, `PRRT_kwDOTiNyWc6bfel7`.

The supported path must not install process-global rejection swallowing, execute hostile constructor/species accessors or Proxy paths, silently trust attacker-selected species constructors, weaken strict-rejection tests, or claim same-process survival for an already-originated out-of-contract hostile Promise.

## Historical streams

- PR #120: `CLOSED / NOT MERGED / STALE` at `5238b9c289476100c875ed9a88bd7e21a574fa67`; do not reopen or wholesale-copy; six P1/P2 findings remain attack history.
- PR #97: `OPEN / STALE / MUST_NOT_MERGE`; reconstruct useful durable Gate composition later from then-current trusted main.
- PR #93: `OPEN / STALE / UNTRUSTED / LATER`; reconstruct useful simulation work later from then-current trusted main.

## Operational prototype claim boundary

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded. It is not production readiness, audit, certification, real-wallet safety, exchange authorization, deployment authorization or financial-execution proof.
