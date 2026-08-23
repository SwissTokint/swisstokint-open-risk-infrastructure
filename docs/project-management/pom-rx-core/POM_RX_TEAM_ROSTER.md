# POM-RX Core — Team Roster and Review Routing

Updated: `2026-08-23T13:06:00+02:00`

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

Trusted main is `95cafa73139085343fae26526c4dc1ea3f07db6b`, the exact PR #129 merge.

- source head `17cd468f3e90f9ae3deb544197937482459b885f`;
- canonical source-head CI `32633365421` / CI 818 attempt 1 = `success`;
- owner five-stage review `5002164482` = `PASS_NON_INDEPENDENT / 0 P0 / 0 P1 / 0 P2`;
- genuinely distinct exact-head evidence `chatgpt-codex-connector[bot]` comment `5385505343`, reviewed `17cd468f3e`, no major issues;
- exact-main CI `32633614947` / CI 819 attempt 1 = `success`;
- exact-merge assurance `5385521407` = `POST_MERGE_ASSURANCE_PASS`;
- terminal checkpoint `5385522627` records trusted/live main `95cafa...`.

PR #129 is trusted coordination evidence only. It did not trust closed PR #120 runtime code or widen production/wallet/mainnet/external-effect claims.

## Current single writer lane — non-Tier-B live-state reconciliation

Branch `docs/pom-rx-post-pr129-live-reconcile-20260823` is the current single documentation/control-plane writer lane and owns exactly:

- `docs/project-management/pom-rx-core/POM_RX_RESUME_CHECKPOINT.md`;
- `docs/project-management/pom-rx-core/POM_RX_TASKS.yaml`;
- `docs/project-management/pom-rx-core/POM_RX_BLOCKERS.md`;
- `docs/project-management/pom-rx-core/POM_RX_TEAM_ROSTER.md`;
- `docs/product/POM_RX_CAPABILITY_MAP.md`.

No runtime/test/protocol/Gate/Witness/verifier/Wallet Guard/provider semantics belong to this writer lot. It exists because PR #129's reviewed source necessarily recorded pre-merge parent `abc19e...`, while live trusted main is `95cafa...`. This reconciliation must remain blocked from merge until its exact-head CI, five-stage owner gate, genuinely distinct exact-head review and zero-finding release decision are complete.

## Closed historical Tier-B line — PR #120

PR #120 is `CLOSED / NOT MERGED / STALE` at historical head `5238b9c289476100c875ed9a88bd7e21a574fa67`. Its six P1/P2 threads remain attack history, including final exact-head P1 `PRRT_kwDOTiNyWc6bc4gh`. Closing the PR does not resolve those findings.

Do not reopen, revive, rebase or wholesale-merge PR #120. The next Wallet Guard/provider transport lot must start as a fresh branch from then-current trusted main after the current five-file reconciliation is trusted.

### Accepted read-only architecture/security boundary for the fresh lot

For the current local prototype, the selected boundary is an explicit narrow **trusted-provider transport contract**. This is intentionally smaller than a hostile-provider/browser-wide Promise-integrity claim.

Inside the supported contract, QA must prove all of:

- fail-closed rejection handling;
- zero reference authorization;
- zero sensitive forwarding;
- clean child-process survival under `--unhandled-rejections=strict`;
- no orphaned provider-rejection termination.

Decorated/rebased/Proxy/accessor/non-configurable-unsafe-constructor Promise objects are excluded from that supported contract. The local contract-narrowing route must therefore prove **before such a transport originates** that the controlled trusted provider/adapter cannot emit an excluded transport on the supported path. QA must then separately prove strict clean-process survival for an **in-contract** rejected transport.

An already-originated excluded rejected Promise is not a positive same-process survival requirement under contract narrowing. If that property is desired, Protocol / Systems Architect and Security / Adversarial Skeptic must first review an isolation boundary such as process/worker/RPC, and QA must reproduce the hostile case across that boundary.

Review lanes reject proposals that require process-global `unhandledRejection`/`uncaughtException` swallowing, execution of hostile constructor/species accessors or Proxy paths, silent trust in attacker-selected species constructors, or weakening strict-rejection tests.

### Next writer boundary after reconciliation

Only after this five-file reconciliation becomes trusted may exactly one writer create a fresh current-main Tier-B branch for the provider transport prerequisite. Useful PR #120 hardening may be reconstructed selectively; stale branch history is not itself evidence.

QA/conformance for the fresh candidate must provide two clearly separated evidence classes:

1. **supported-path conformance and survival:** CI-wired proof that the controlled provider/adapter cannot originate the excluded decorated/non-configurable-unsafe transport on the supported path, plus a strict in-contract rejected-transport regression proving fail-closed behavior, zero reference authorization, zero sensitive forwarding, clean child-process survival and no orphaned provider rejection;
2. **hostile out-of-contract negative:** retain the non-configurable-unsafe Promise as an explicit unsupported/negative case. Do not claim direct same-process clean survival for it unless a separately reviewed isolation boundary is introduced.

Concrete skeptical hypotheses must cover rejected-Promise draining, effective `constructor`/`Symbol.species`, non-configurable unsafe data constructors, hostile constructor/species accessors, Proxy/prototype paths, strict unhandled rejection, provider-result thenable assimilation, inherited Array-index/iterator substitution, and zero reference authorization/sensitive forwarding on fail-closed rejection.

All six PR #120 threads remain in the attack-history matrix: `PRRT_kwDOTiNyWc6bZjxp`, `PRRT_kwDOTiNyWc6bZ6tx`, `PRRT_kwDOTiNyWc6bZ6tz`, `PRRT_kwDOTiNyWc6baFkR`, `PRRT_kwDOTiNyWc6baIxZ`, `PRRT_kwDOTiNyWc6bc4gh`.

## Historical streams

PR #97 remains `OPEN / STALE / MUST_NOT_MERGE` at `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`. Against trusted main `95cafa...` it is diverged ahead 66 / behind 243 with merge-base `0564aecd42cf0794894c12842980969ff59c9f73`, and multiple unresolved P1 threads remain. Reconstruct useful durable-Gate concepts later from then-current trusted main after the fresh provider prerequisite receives post-merge assurance PASS.

PR #93 remains `OPEN / STALE / UNTRUSTED / LATER` at `c4e40ceb286f4e59657767661daed15d2b68e9a7`. Against trusted main `95cafa...` it is diverged ahead 86 / behind 288 with merge-base `818718955c9e4136e9e55754a31be2f1c7b610f8`; unresolved P1/P2 remain. Reconstruct/reconcile useful simulation work later from trusted main.

## Operational prototype claim boundary

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded. It is not production readiness, audit, certification, real-wallet safety, exchange authorization, deployment authorization or financial-execution proof.
