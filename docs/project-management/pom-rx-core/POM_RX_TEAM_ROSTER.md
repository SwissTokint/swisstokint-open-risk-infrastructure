# POM-RX Core — Team Roster and Review Routing

Updated: `2026-08-23T18:09:25+02:00`

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

## Current trusted coordination state

Trusted main is `01f27ef06b71daf3b53efa4c1017946a439b2d7e`, the exact PR #132 merge.

- source head `8c532dee2fb8d9f8295f1c3cbb6ed44cb7e752b0`;
- source-head CI `32646404031` / CI 847 attempt 1 = `success`;
- owner five-stage review `5002648630 = PASS_NON_INDEPENDENT / 0 P0 / 0 P1 / 0 P2`;
- genuinely distinct exact-head evidence `5386619599`, reviewed `8c532dee2f`, no major issues;
- exact-main CI `32647638029` / CI 848 attempt 1 = `success`;
- exact-main status at assurance time `pom-rx/exact-main-ci = success` targeting run `32647638029`;
- exact-merge assurance `5386717914 = POST_MERGE_ASSURANCE_PASS`;
- terminal checkpoint `5386728720`.

## Current single-writer lane — non-Tier-B post-PR132 reconciliation

Branch `docs/pom-rx-post-pr132-live-reconcile-20260823-1809` is the active single-writer lane and owns exactly:

- `docs/project-management/pom-rx-core/POM_RX_RESUME_CHECKPOINT.md`;
- `docs/project-management/pom-rx-core/POM_RX_TASKS.yaml`;
- `docs/project-management/pom-rx-core/POM_RX_BLOCKERS.md`;
- `docs/project-management/pom-rx-core/POM_RX_TEAM_ROSTER.md`;
- `docs/product/POM_RX_CAPABILITY_MAP.md`.

This lot exists because PR #132 is already merged and post-merge assured while the source tree it merged necessarily still records the pre-merge trusted parent and an in-progress reconciliation. It is documentation/control-plane only; no runtime/test/protocol/Gate/Witness/verifier/Wallet Guard/provider semantics belong to this writer lot.

Current exact candidate SHA, CI and review evidence for this reconciliation are volatile and must be read from live GitHub/PR metadata rather than self-referenced in this file.

### Exclusive ownership / PR #131 pause

PR #131 branch `automation/wg-trusted-provider-transport-20260823` is frozen while the present reconciliation owns the five overlapping control-plane files.

Live PR #131 head is `3a75418ef13e7364b70e60a17e5514f1b1a8bfc2`. Against trusted main `01f27ef...`, it is diverged ahead 32 / behind 6 with merge-base `87ed6ac...`; GitHub reports it non-mergeable. CI 846 is green but historical for release after the main move, and seven P1 threads remain unresolved/outdated.

After the reconciliation merges and receives exact-merge `POST_MERGE_ASSURANCE_PASS`, the PR #131 single writer may resume and reconcile onto then-current trusted main. That head move invalidates all previous exact-head release evidence and requires fresh CI, fresh five-stage owner review and a fresh genuinely distinct exact-head review.

## Paused Tier-B security review routing — PR #131

PR #131 implements the narrow local **trusted-provider transport contract**. Shared Core canonicalization, hashing, verifier, Witness, exact authorization, Gate, execution-evidence and observation/reconciliation semantics remain outside the application's ownership.

When the Tier-B lane resumes, read-only specialist routing is:

1. Protocol / Systems Architect — verify Core/application boundary, trusted-provider contract scope, and simpler TCB alternatives;
2. Security / Adversarial Skeptic — falsify provider provenance TOCTOU, pre/post-import Promise/reflection/provenance poisoning, constructor/species/accessor/Proxy/prototype paths, thenable assimilation, strict-unhandled behavior and claim leakage;
3. QA / Conformance — verify CI-wired negative tests, clean strict-process survival, zero reference authorization and zero sensitive forwarding.

The release owner then performs the mandatory five-stage gate as **non-independent** evidence. A genuinely distinct `chatgpt-codex-connector` review on the exact same frozen SHA is still required before merge.

Seven PR #131 P1 threads remain attack inputs and unresolved until same-head independent validation: `PRRT_kwDOTiNyWc6bfPvI`, `PRRT_kwDOTiNyWc6bfPvO`, `PRRT_kwDOTiNyWc6bfPvR`, `PRRT_kwDOTiNyWc6bfWeN`, `PRRT_kwDOTiNyWc6bfel5`, `PRRT_kwDOTiNyWc6bfel6`, `PRRT_kwDOTiNyWc6bfel7`.

The supported path must not install process-global rejection swallowing, execute hostile constructor/species accessors or Proxy paths, silently trust attacker-selected species constructors, weaken strict-rejection tests, or claim same-process survival for an already-originated out-of-contract hostile Promise.

## Historical streams

PR #120 is `CLOSED / NOT MERGED / STALE` at `5238b9c289476100c875ed9a88bd7e21a574fa67`; do not reopen or wholesale-copy it. Its six P1/P2 findings remain attack history.

PR #97 remains `OPEN / STALE / MUST_NOT_MERGE` at `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`, diverged from trusted main by ahead 66 / behind 255. Durable Gate composition is reconstructed later only after the fresh provider prerequisite is trusted.

PR #93 remains `OPEN / STALE / UNTRUSTED / LATER` at `c4e40ceb286f4e59657767661daed15d2b68e9a7`, diverged by ahead 86 / behind 300. Simulation work remains later in dependency order.

## Operational prototype claim boundary

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded. It is not production readiness, audit, certification, real-wallet safety, exchange authorization, deployment authorization or financial-execution proof.
