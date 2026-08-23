# POM-RX Core — Active Blockers

Updated: `2026-08-23T16:45:00+02:00`

Current trusted main: `87ed6ac814f868dc4599cb5d236babdeea8c3cc9`.

This file lists current blockers only. Historical detail remains in Git history and review threads. Live GitHub wins whenever a PR head, CI run, review, thread, mergeability signal or merge changes after this checkpoint.

## Trusted coordination state

PR #130 source head `ce1f2ca2f9358c11e836f1717dcedd9cb5c0caaa` merged as exact main SHA `87ed6ac814f868dc4599cb5d236babdeea8c3cc9`.

- source-head CI: `32635882670` / CI 820 attempt 1 = `success`;
- release-owner five-stage: `5002253211 = PASS_NON_INDEPENDENT / 0 P0 / 0 P1 / 0 P2`;
- genuinely distinct exact-head evidence: `5385715573`, reviewed `ce1f2ca2f9`, no major issues;
- exact-main push CI: `32638722306` / CI 821 attempt 1 = `success`;
- exact-merge assurance: `5385948152 = POST_MERGE_ASSURANCE_PASS`;
- terminal checkpoint: `5385949730`.

PR #130 is trusted coordination evidence only; it did not establish Wallet Guard provider security or production readiness.

## `CONTROL_PLANE_STALE_AFTER_PR130_AND_PR131_ADVANCE`

The five canonical continuation/product-position files on `main` still described PR #129 as the latest trusted merge and the post-PR129 reconciliation as pending, while live GitHub already has trusted PR #130 and active PR #131. Live GitHub wins.

Required closure is the bounded non-Tier-B branch `docs/pom-rx-post-pr130-live-reconcile-20260823`, limited exactly to RESUME, TASKS, BLOCKERS, TEAM_ROSTER and `docs/product/POM_RX_CAPABILITY_MAP.md`. It changes no runtime, tests, protocol, Gate, Witness, verifier, Wallet Guard/provider, wallet/network, public-site/Vercel or financial-execution semantics.

Until this reconciliation passes exact-head CI, the five-stage owner gate, a genuinely distinct exact-head review, merge and exact-merge assurance, the stale `main` control-plane files are not readiness/dependency evidence.

## `PR131_RELEASE_BLOCKED_AND_WRITER_FROZEN`

PR #131 is `OPEN / MERGEABLE / NOT TRUSTED` at exact live head `3a75418ef13e7364b70e60a17e5514f1b1a8bfc2`, based on trusted main `87ed6ac...`.

- canonical exact-head CI `32645853067` / CI 846 attempt 1 = `success`;
- no release-owner five-stage review exists on exact head `3a75418...`;
- no genuinely distinct exact-head Codex review exists on `3a75418...`;
- seven P1 threads remain unresolved/outdated: `PRRT_kwDOTiNyWc6bfPvI`, `PRRT_kwDOTiNyWc6bfPvO`, `PRRT_kwDOTiNyWc6bfPvR`, `PRRT_kwDOTiNyWc6bfWeN`, `PRRT_kwDOTiNyWc6bfel5`, `PRRT_kwDOTiNyWc6bfel6`, `PRRT_kwDOTiNyWc6bfel7`;
- prior CI/reviews on `a6d9cd...` and earlier heads are historical only;
- the PR body still names prior head `ab3643a...` and CI 845, so metadata must be reconciled without moving the branch.

The PR #131 writer lane is frozen while the present five-file control-plane reconciliation owns those documentation files. After this docs lot merges and receives exact-merge assurance PASS, PR #131 must be reconciled onto the then-current trusted main. That head move invalidates current release evidence and requires wholly fresh exact-head CI, owner gate and genuinely distinct review.

## `PR131_SECURITY_BOUNDARY_REMAINS_NARROW`

The supported claim is an explicit narrow **trusted-provider transport contract**. The controlled route must fail closed before unowned provider transport origin and an in-contract rejected context transport must prove zero reference authorization, zero sensitive forwarding, clean child-process survival under `--unhandled-rejections=strict`, and no orphaned provider-rejection termination.

Decorated/rebased/Proxy/accessor/non-configurable-unsafe Promise objects already returned by arbitrary providers remain out of contract. The in-contract survival fixture is not proof that such an already-originated hostile rejected Promise can be drained safely in the same process. That broader property requires separately reviewed process/worker/RPC isolation.

Prohibited shortcuts remain process-global `unhandledRejection`/`uncaughtException` swallowing, execution of hostile constructor/species accessors or Proxy paths, silent trust of attacker-selected species constructors, weakening strict tests, or converting unknown/failure into authorization/forwarding.

## `PR120_CLOSED_NOT_MERGED_ATTACK_HISTORY`

PR #120 remains `CLOSED / NOT MERGED / STALE` at `5238b9c289476100c875ed9a88bd7e21a574fa67`. Do not reopen, rebase, revive or wholesale-merge it. Its six P1/P2 review threads remain mandatory attack history: `PRRT_kwDOTiNyWc6bZjxp`, `PRRT_kwDOTiNyWc6bZ6tx`, `PRRT_kwDOTiNyWc6bZ6tz`, `PRRT_kwDOTiNyWc6baFkR`, `PRRT_kwDOTiNyWc6baIxZ`, `PRRT_kwDOTiNyWc6bc4gh`.

## `PR97_STALE_HISTORICAL_BRANCH_MUST_NOT_MERGE`

PR #97 remains `OPEN / STALE / MUST_NOT_MERGE` at `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`. Against trusted main `87ed6ac...` it is diverged ahead 66 / behind 249 with merge-base `0564aecd42cf0794894c12842980969ff59c9f73`. Durable Gate composition is reconstructed later from then-current trusted main only after the fresh provider prerequisite receives exact-merge `POST_MERGE_ASSURANCE_PASS`.

## `CORE_DURABLE_GATE_COMPOSITION_NOT_YET_TRUSTED`

Trusted main contains a process-local single-use Gate and a separate filesystem durable claim primitive. Reviewed durable claim-before-observer/downstream composition is not trusted.

## `PR93_RECONCILIATION_AND_FRESH_REVIEW_REQUIRED_LATER`

PR #93 remains `OPEN / STALE / UNTRUSTED / LATER` at `c4e40ceb286f4e59657767661daed15d2b68e9a7`. Against trusted main `87ed6ac...` it is diverged ahead 86 / behind 294 with merge-base `818718955c9e4136e9e55754a31be2f1c7b610f8`. Reconstruct useful simulation work later from trusted main; do not merge stale history wholesale.

## `DAGR_SOURCE_DOCUMENT_MISSING`

Normative DAGR/profile work remains source-gated. Do not invent normative text, controls, scores or claims without authorized source material.

## `PRODUCTION_TRUST_UNPROVED`

Production issuer/operator authorization, trusted time, KMS/HSM custody, distributed revocation/consensus, crash recovery, external observer independence, external execution/effect truth and arbitrary browser/provider integrity remain unproved.

## `REAL_WALLET_NOT_AUTHORIZED`

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction or meaningful funds are authorized. Burner local/testnet E2E remains behind a separate explicit human authorization gate.

## Current dependency and merge rule

A dependency becomes trusted only after the mandatory five-stage pre-merge gate, all applicable exact-head technical/security gates, canonical exact-head CI, every required genuinely distinct exact-head independent review, zero unresolved P0/P1/P2, merge, exact-main CI and exact-merge `POST_MERGE_ASSURANCE_PASS`. A moved head invalidates exact-head evidence. The independent-review waiver remains limited to PR #60.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded — not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.
