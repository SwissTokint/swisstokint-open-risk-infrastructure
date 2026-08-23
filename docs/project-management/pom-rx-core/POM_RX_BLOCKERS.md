# POM-RX Core — Active Blockers

Updated: `2026-08-23T04:09:11+02:00`

Current trusted main: `cff851b92746af09c224451c82d3da9c3bae176a`

This file lists current blockers only. Historical detail remains in Git history and PR review threads. Live GitHub wins whenever a PR head, CI run, review, thread, mergeability signal or merge changes after this checkpoint.

## Trusted coordination state

PR #122 exact source head `19a1f2edb617d5025e274c3a3076f0ba78cdf841` merged as exact main SHA `cff851b92746af09c224451c82d3da9c3bae176a`.

- independent exact-head evidence: `chatgpt-codex-connector[bot]` comment `5383609128`, reviewed `19a1f2edb6`, no major issues;
- canonical exact-main push CI: `32610793817` / CI 787 attempt 1, `success`;
- exact-merge assurance: PR #122 comment `5383628489` = `POST_MERGE_ASSURANCE_PASS`;
- terminal checkpoint: PR #122 comment `5383629556`.

PR #122 changed only coordination/product-position documents and does not make open Tier-B work trusted.

## `CONTROL_PLANE_STALE_AFTER_PR122`

The files merged by PR #122 necessarily recorded its pre-merge parent `06de789768c2cb0d5738161997c6bf104930a174`, while live GitHub is now the post-merge-assured exact main `cff851b92746af09c224451c82d3da9c3bae176a`.

Required closure is this scoped non-Tier-B reconciliation on branch `docs/pom-rx-post-pr122-live-reconcile-20260823`, limited to the compact checkpoint/task/blocker/team-roster/capability-map state. It changes no runtime, test, protocol, Gate, Witness, verifier, Wallet Guard/provider, wallet/network, public-site/Vercel or financial-execution semantics.

Until this reconciliation passes its applicable exact-head gates and exact-merge assurance, live GitHub remains the dependency/readiness source of truth.

## `PR120_RECONCILE_TO_CURRENT_TRUSTED_MAIN_BEFORE_RELEASE_GATES`

PR #120 is **OPEN / NOT TRUSTED / BLOCKED**.

Live state at this checkpoint:

- exact head: `2d01503c13b9b22ea136f6bbd169bc2032366b9a`;
- target branch: `main`;
- PR metadata base SHA: `06de789768c2cb0d5738161997c6bf104930a174`;
- current trusted main: `cff851b92746af09c224451c82d3da9c3bae176a`;
- current-main -> head compare: `diverged`, ahead 66 / behind 5, merge-base `06de789768c2cb0d5738161997c6bf104930a174`;
- GitHub mergeability at revalidation: `false` (volatile conflict metadata only);
- exact-head CI `32609855025` / CI 785 attempt 1 = `success`, but this is historical release evidence after trusted main moved;
- five-stage release-owner exact-head gate after reconciliation: `PENDING / NON-INDEPENDENT`;
- genuinely distinct exact-head `chatgpt-codex-connector` gate after reconciliation: `PENDING`;
- merge: `BLOCKED`.

The bounded rejected-Promise/effective-`Symbol.species` repair and strict regressions are present on the branch. Before release, reconcile it to exact trusted main, freeze the new head, rerun canonical CI, then rerun all exact-head review gates. Any head move invalidates older release evidence.

## `PR120_HISTORICAL_REVIEW_THREADS_REQUIRE_FINAL_EXACT_HEAD_VALIDATION`

The following distinct Codex P1/P2 threads remain unresolved attack history:

- `PRRT_kwDOTiNyWc6bZjxp` — P1 rejected transport could fail validation before a rejection reaction was attached;
- `PRRT_kwDOTiNyWc6bZ6tx` — P1 fallible constructor pinning preceded the rejection reaction;
- `PRRT_kwDOTiNyWc6bZ6tz` — P2 strict rejected-transport regression was absent from canonical `npm test` at that reviewed head;
- `PRRT_kwDOTiNyWc6baFkR` — P1 non-extensible rejected native Promise with nonstandard prototype could reach fallible constructor shadowing;
- `PRRT_kwDOTiNyWc6baIxZ` — P1 Wallet Guard capability-map product-position invariant was removed.

Do not resolve these threads merely because repairs exist. Closure requires one frozen current-main-reconciled candidate with green exact-head CI, the mandatory five-stage owner gate, a fresh genuinely distinct exact-head review and zero unresolved P0/P1/P2.

## `PR97_STALE_HISTORICAL_BRANCH_MUST_NOT_MERGE`

Historical PR #97 remains open and **must not merge**.

- exact live head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- review history still contains multiple unresolved P1 classes.

Do not merge, rebase, revive or wholesale-copy PR #97. Durable claim-before-observer/downstream composition remains a separate future bounded Core lot reconstructed from then-current trusted main only after PR #120 receives exact-merge `POST_MERGE_ASSURANCE_PASS`.

## `CORE_DURABLE_GATE_COMPOSITION_NOT_YET_TRUSTED`

Trusted main contains a process-local single-use Gate and a separate filesystem durable claim primitive. Reviewed durable claim-before-observer/downstream composition is not trusted.

## `PR93_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED_LATER`

PR #93 remains open, stale and untrusted.

- exact live head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- unresolved review history still includes P1/P2 exact-value, wrapper, reflection and canonicalization/hash classes.

Its historical green CI is not release evidence. Keep PR #93 ordered after trusted PR #120 and required shared-Core work unless a separately reviewed dependency-order change is recorded.

## `DAGR_SOURCE_DOCUMENT_MISSING`

Normative DAGR/profile work remains source-gated. Do not invent normative text, controls, scores or claims without authorized source material.

## `PRODUCTION_TRUST_UNPROVED`

Production issuer/operator authorization, trusted time, KMS/HSM custody, distributed revocation/consensus, crash recovery, external observer independence, external execution/effect truth and arbitrary browser/provider integrity remain unproved.

## `REAL_WALLET_NOT_AUTHORIZED`

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction or meaningful funds are authorized. Burner local/testnet E2E remains behind a separate explicit human authorization gate.

## Current dependency and merge rule

A dependency becomes trusted only after the mandatory five-stage pre-merge gate, all applicable exact-head technical/security gates, canonical exact-head CI, every required genuinely distinct exact-head independent review, zero unresolved P0/P1/P2, merge, exact-main CI and exact-merge `POST_MERGE_ASSURANCE_PASS`. A moved head invalidates exact-head evidence. The independent-review waiver remains limited to PR #60.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded — not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.
