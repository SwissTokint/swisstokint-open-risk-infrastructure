# POM-RX Core — Team Roster and Review Routing

Updated: `2026-09-07T10:59:00Z`

## Purpose

This roster defines accountable roles and evidence requirements. It does not claim that a named model, human or agent actually ran merely because a role is listed. GitHub review/runtime evidence is authoritative for reviewer identity and current activity.

This is a **versioned snapshot**. Embedded SHAs/branch names are authoring-time anchors, not claims that they remain the exact live GitHub state after this file's own merge. Read live GitHub first.

Snapshot anchors:

- `snapshot_base_main`: `25895be9364903b21704cff223faec92f10354f1` — PR #163 actual merge;
- `last_assured_main_before_snapshot`: `25895be9364903b21704cff223faec92f10354f1`;
- canonical push/main CI #1300 / run `34113836199`, attempt 1: SUCCESS, all 20 steps;
- latest matching `pom-rx/exact-main-ci`: success `53667615499`, published by `github-actions[bot]`;
- distinct six-part [POST_MERGE_ASSURANCE_PASS](https://github.com/SwissTokint/swisstokint-open-risk-infrastructure/pull/163#issuecomment-5569622009);
- [reviewed open-PR routing](https://github.com/SwissTokint/swisstokint-open-risk-infrastructure/issues/143#issuecomment-5569521081).

## Invariants

- One durable repository: `SwissTokint/swisstokint-open-risk-infrastructure`.
- One writer per bounded lot and one owner per file set.
- Single-flight coordination is mandatory before entering or continuing any writer lane and uses only `POM_RX_COORDINATION_GUARD.md`.
- Canonical lock state lives only at branch `automation/pom-rx-coordination`, file `.pom-rx/coordination-lock.json`, schema `pom-rx-coordination-lock/1`, active window 45 minutes.
- Automation may acquire only `FREE`, using the exact fetched file blob SHA as compare-and-swap token, followed by a same-run re-read verifying `state=HELD`, exact `holder.run_id` and future `expires_at`.
- Active unexpired HELD lock held by another run means `SKIPPED_PREVIOUS_RUN_ACTIVE`; expired HELD is stale/blocking and means `SKIPPED_COORDINATION_GUARD_UNAVAILABLE`. Automation never reclaims an expired lock owned by another run.
- Immediately before every state-changing project action, the writer re-reads the canonical lock and requires valid schema/configuration, `state=HELD`, exact own `holder.run_id` and future `expires_at`.
- Expiry, ownership change, FREE state or unverifiable lock means the invocation performs no further project mutation and never renews, extends or reacquires in the same invocation.
- The exact current holder may perform coordination-only release even after expiry, using current blob SHA to set `FREE`/`holder=null` and re-read verification. An abandoned stale lock owned by another run requires explicit human recovery.
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
| Single Implementer | smallest bounded accepted solution | exclusive writer | verified canonical lock at entry and before each project mutation + branch/file ownership + tests + commit/push evidence | second writer, scope widening, writing after active-window loss/expiry, same-run renewal/reacquisition |
| QA / Conformance | positive/negative tests, expected-red, compatibility, false-PASS resistance | read-only relative to writer | reproducible exact-head evidence | approving unexecuted tests |
| Code Quality / Optimization | TCB size, duplication, deterministic behavior, maintainability, boundedness | read-only | scoped PASS/CONDITIONAL/BLOCK | weakening fail-closed behavior for optimization |
| Independent Release Gate | distinct skeptical/security release evidence | genuinely distinct exact-head reviewer | actual exact-head review with no unresolved P0/P1/P2 | owner/self/moved-head/invented review |
| Context / State Ledger | durable cross-chat continuation | coordination | RESUME + TASKS/BLOCKERS/CAPABILITY snapshot plus live terminal checkpoint | parallel PM system or chat-only continuity |

## Independent-review rule

A fresh `chatgpt-codex-connector` review may satisfy the independent release gate only when it explicitly covers the actual frozen candidate SHA, canonical exact-head CI is green, all findings are resolved/non-blocking, no P0/P1/P2 remains unresolved, and no later commit moved the head. The independent-review waiver remains limited to PR #60.

## Current role routing

The canonical coordination guard is operational; #136 and #131 are merged historical prerequisites. The acquisition/expiry/release rules and role matrix above are unchanged. This snapshot does not assert whether the existing scheduled task is currently enabled.

| Work | Snapshot state | Next bounded action |
| --- | --- | --- |
| #175 trusted security CI | Head `43d7d5bd8bb833334c556bd51415e64aecc80383`; CI1287 green; 42 unresolved discussions, including five latest P1 | Highest assurance priority: assertion isolation, authenticated child completion, isolated-runner coverage, uncertain publication handling and invalidation retry; then historical finding adjudication and independent bootstrap proof. |
| #167 prior provenance proposal | Draft; three P1 remain despite CI1192 green | Retain as alternative predecessor to #175; do not merge both as additive fixes. |
| #150 durable Core Gate | Head `8576e43c7585568a630b3c410fb6043930ab88b4`; CI1191 fails npm test; conflicted | Scoped successor on assured main: Node22 channel lifecycle, trusted owner environment/executable capture and pre-await capacity accounting. Existing fd-ownership and all historical unresolved controls remain required. |
| #157 then #156 | #157 is an OPEN Core specification issue; #156 has one architectural P2 | Under the existing single-Core-writer order, address #157 after #150; accept the shared primitive before migrating MCP from its private commitment implementation. |
| #139 Sepolia Wallet Guard | Draft, conflicted old stack; useful work retained | Reconstruct remaining profile/observer/browser scope against current receipt/context/journal/shutdown boundaries. The separate human wallet gate remains. |
| #160 tokenomics research | CI1070 cancelled; three arithmetic/accounting P1 families and later depletion-reporting P2 | Preserve exact conservation, all 3,600 cases and 365/1,825-day horizons; repair the model and reporting, not only sharding or timeout settings. |
| #162 Stellar action | CI1268 green on old base; action SHA changes but explicit CLI version remains 27.0.0 | Clarify action-only scope, refresh main, verify attested installation/build compatibility and obtain fresh review/CI. |

These are role assignments, not a claim that agents are already running. Prime chooses one bounded writer lot after fresh live-state verification. The Core writer sequence remains #150 then issue #157; MCP #156 waits for the accepted shared primitive. #175 is the highest assurance repair; #167 is its alternative predecessor. No conflicting old stack is merged wholesale.

Actual evidence for the 2026-09-07 integration cycle: root performed integration/coordination as non-independent owner; distinct read-only `/root/integration_skeptic` reviewed #178, #163 and queue facts. Final GitHub Codex reviews and the assurance comments identify their own exact heads. This does not pre-assign future reviewers or invent a continuously running team.

Preserve original P1/fd/replay/crash, callback, receipt/context and expected-red evidence. Scope review and final independent exact-head release review remain separate from the writer. #120/#97/#93 remain historical sources; current state is read from GitHub rather than copied from August24.

## Operational prototype claim boundary

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded. It is not production readiness, audit, certification, real-wallet safety, exchange authorization, deployment authorization or financial-execution proof.
