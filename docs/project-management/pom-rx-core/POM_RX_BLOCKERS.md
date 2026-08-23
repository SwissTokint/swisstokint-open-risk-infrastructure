# POM-RX Core — Active Blockers

Updated: `2026-08-23T19:20:00+02:00`

Current trusted main: `ed0cc5936a12fcd420890ee1553690569b2d4ec7`.

This file lists current blockers only. Historical detail remains in Git history and review threads. Live GitHub wins whenever a PR head, CI run, review, thread, mergeability signal or merge changes after this checkpoint.

## Trusted coordination state

PR #133 source head `156447becff8e8d971bb835fb76eb8dc25dec010` merged as exact main SHA `ed0cc5936a12fcd420890ee1553690569b2d4ec7`.

- source-head CI: `32651116737` / CI 849 attempt 1 = `success`;
- release-owner five-stage: `5002825021 = PASS_NON_INDEPENDENT / 0 P0 / 0 P1 / 0 P2`;
- genuinely distinct exact-head evidence: `5387014025`, reviewed `156447becf`, no major issues;
- exact-main push CI: `32651307731` / CI 850 attempt 1 = `success`;
- exact-main status: `pom-rx/exact-main-ci = success` targeting run `32651307731`;
- exact-merge assurance: `5387034808 = POST_MERGE_ASSURANCE_PASS`;
- terminal checkpoint: `5387039387`.

PR #133 is trusted coordination evidence only; it did not establish Wallet Guard provider security or production readiness.

## `CONTROL_PLANE_STALE_AFTER_PR133_MERGE`

The five canonical continuation/product-position files on `main` necessarily still describe trusted PR #132 and PR #133 as the active reconciliation, while live GitHub already has PR #133 merged/assured and PR #131 diverged from the new trusted main. Live GitHub wins.

Required closure is bounded non-Tier-B branch `docs/pom-rx-post-pr133-live-reconcile-20260823-1909`, limited exactly to RESUME, TASKS, BLOCKERS, TEAM_ROSTER and `docs/product/POM_RX_CAPABILITY_MAP.md`. It changes no runtime, tests, protocol, Gate, Witness, verifier, Wallet Guard/provider, wallet/network, public-site/Vercel or financial-execution semantics.

Until this reconciliation passes exact-head CI, the five-stage owner gate, a genuinely distinct exact-head review, merge and exact-merge assurance, volatile stale values in the `main` control-plane files are not readiness/dependency evidence.

## `PR131_RELEASE_BLOCKED_RECONCILIATION_REQUIRED`

PR #131 is `OPEN / BLOCKED / NOT TRUSTED / RECONCILIATION_REQUIRED` at exact live head `3a75418ef13e7364b70e60a17e5514f1b1a8bfc2`.

Against trusted main `ed0cc5936a12fcd420890ee1553690569b2d4ec7`:

- compare = `diverged`, ahead 32 / behind 12;
- merge-base = `87ed6ac814f868dc4599cb5d236babdeea8c3cc9`;
- GitHub mergeability = `false` at revalidation;
- canonical exact-head CI `32645853067` / CI 846 attempt 1 = `success`, but is historical release evidence after trusted main moved;
- no release-owner five-stage review exists on the eventual post-reconciliation head;
- no genuinely distinct exact-head Codex review exists on the eventual post-reconciliation head;
- seven P1 threads remain unresolved/outdated: `PRRT_kwDOTiNyWc6bfPvI`, `PRRT_kwDOTiNyWc6bfPvO`, `PRRT_kwDOTiNyWc6bfPvR`, `PRRT_kwDOTiNyWc6bfWeN`, `PRRT_kwDOTiNyWc6bfel5`, `PRRT_kwDOTiNyWc6bfel6`, `PRRT_kwDOTiNyWc6bfel7`.

The PR #131 writer lane remains frozen while the present five-file control-plane reconciliation owns the overlapping coordination files. After this docs lot merges and receives exact-merge assurance PASS, PR #131 must be reconciled onto the then-current trusted main. That head move invalidates current release evidence and requires wholly fresh exact-head CI, owner gate and genuinely distinct review.

## `PR131_SECURITY_BOUNDARY_REMAINS_NARROW`

The supported claim is an explicit narrow **trusted-provider transport contract**. The controlled route must fail closed before unowned provider transport origin and an in-contract rejected context transport must prove zero reference authorization, zero sensitive forwarding, clean child-process survival under `--unhandled-rejections=strict`, and no orphaned provider-rejection termination.

Decorated/rebased/Proxy/accessor/non-configurable-unsafe Promise objects already returned by arbitrary providers remain out of contract. The in-contract survival fixture is not proof that such an already-originated hostile rejected Promise can be drained safely in the same process. That broader property requires separately reviewed process/worker/RPC isolation.

Prohibited shortcuts remain process-global `unhandledRejection`/`uncaughtException` swallowing, execution of hostile constructor/species accessors or Proxy paths, silent trust of attacker-selected species constructors, weakening strict tests, or converting unknown/failure into authorization/forwarding.

## `PR120_CLOSED_NOT_MERGED_ATTACK_HISTORY`

PR #120 remains `CLOSED / NOT MERGED / STALE` at `5238b9c289476100c875ed9a88bd7e21a574fa67`. Do not reopen, rebase, revive or wholesale-merge it. Its six P1/P2 review threads remain mandatory attack history: `PRRT_kwDOTiNyWc6bZjxp`, `PRRT_kwDOTiNyWc6bZ6tx`, `PRRT_kwDOTiNyWc6bZ6tz`, `PRRT_kwDOTiNyWc6baFkR`, `PRRT_kwDOTiNyWc6baIxZ`, `PRRT_kwDOTiNyWc6bc4gh`.

## `PR97_STALE_HISTORICAL_BRANCH_MUST_NOT_MERGE`

PR #97 remains `OPEN / STALE / MUST_NOT_MERGE` at `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`. Against trusted main `ed0cc593...` it is diverged ahead 66 / behind 261 with merge-base `0564aecd42cf0794894c12842980969ff59c9f73`. Durable Gate composition is reconstructed later from then-current trusted main only after the fresh provider prerequisite receives exact-merge `POST_MERGE_ASSURANCE_PASS`.

## `CORE_DURABLE_GATE_COMPOSITION_NOT_YET_TRUSTED`

Trusted main contains a process-local single-use Gate and a separate filesystem durable claim primitive. Reviewed durable claim-before-observer/downstream composition is not trusted.

## `PR93_RECONCILIATION_AND_FRESH_REVIEW_REQUIRED_LATER`

PR #93 remains `OPEN / STALE / UNTRUSTED / LATER` at `c4e40ceb286f4e59657767661daed15d2b68e9a7`. Against trusted main `ed0cc593...` it is diverged ahead 86 / behind 306 with merge-base `818718955c9e4136e9e55754a31be2f1c7b610f8`. Reconstruct useful simulation work later from trusted main; do not merge stale history wholesale.

## `DAGR_SOURCE_DOCUMENT_MISSING`

Normative DAGR/profile work remains source-gated. Do not invent normative text, controls, scores or claims without authorized source material.

## `PRODUCTION_TRUST_UNPROVED`

Production issuer/operator authorization, trusted time, KMS/HSM custody, distributed revocation/consensus, crash recovery, external observer independence, external execution/effect truth and arbitrary browser/provider integrity remain unproved.

## `REAL_WALLET_NOT_AUTHORIZED`

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction or meaningful funds are authorized. Burner local/testnet E2E remains behind a separate explicit human authorization gate.

## Current dependency and merge rule

A dependency becomes trusted only after the mandatory five-stage pre-merge gate, all applicable exact-head technical/security gates, canonical exact-head CI, every required genuinely distinct exact-head independent review, zero unresolved P0/P1/P2, merge, exact-main CI and exact-merge `POST_MERGE_ASSURANCE_PASS`. A moved head invalidates exact-head evidence. The independent-review waiver remains limited to PR #60.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded — not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.
