# POM-RX Core — Active Blockers

Updated: `2026-08-23T13:06:00+02:00`

Current trusted main: `95cafa73139085343fae26526c4dc1ea3f07db6b`.

This file lists current blockers only. Historical detail remains in Git history and PR review threads. Live GitHub wins whenever a PR head, CI run, review, thread, mergeability signal or merge changes after this checkpoint.

## Trusted coordination state

PR #129 source head `17cd468f3e90f9ae3deb544197937482459b885f` merged as exact main SHA `95cafa73139085343fae26526c4dc1ea3f07db6b`.

- canonical source-head CI: `32633365421` / CI 818 attempt 1 = `success`;
- release-owner five-stage review: `5002164482` = `PASS_NON_INDEPENDENT`, owner findings `0 P0 / 0 P1 / 0 P2`;
- genuinely distinct exact-head evidence: `chatgpt-codex-connector[bot]` comment `5385505343`, reviewed `17cd468f3e`, no major issues;
- canonical exact-main push CI: `32633614947` / CI 819 attempt 1 = `success` on exact merge `95cafa...`;
- exact-merge assurance: PR #129 comment `5385521407` = `POST_MERGE_ASSURANCE_PASS`;
- terminal live-state checkpoint: PR #129 comment `5385522627`.

PR #129 changed only canonical coordination/product-position documents. It is trusted coordination evidence, not runtime, provider or production-security evidence.

## `CONTROL_PLANE_STALE_AFTER_PR129_MERGE`

The files merged from PR #129 necessarily recorded their pre-merge parent `abc19e969aa19f3ec08efe67cdf1988731b633ee` as trusted main. Live GitHub is now `95cafa73139085343fae26526c4dc1ea3f07db6b`, so the five canonical continuation/product-position files must be reconciled before they are reused as dependency/readiness evidence.

Required closure is the bounded non-Tier-B branch `docs/pom-rx-post-pr129-live-reconcile-20260823`, limited exactly to:

- `POM_RX_RESUME_CHECKPOINT.md`;
- `POM_RX_TASKS.yaml`;
- `POM_RX_BLOCKERS.md`;
- `POM_RX_TEAM_ROSTER.md`;
- `docs/product/POM_RX_CAPABILITY_MAP.md`.

It changes no runtime, test, protocol, Gate, Witness, verifier, Wallet Guard/provider, wallet/network, public-site/Vercel or financial-execution semantics. Until this reconciliation passes exact-head CI, the five-stage owner gate, a fresh genuinely distinct exact-head review, merge and exact-merge assurance, live GitHub remains the readiness source of truth.

## `PR120_CLOSED_NOT_MERGED_ATTACK_HISTORY`

PR #120 remains **CLOSED / NOT MERGED / STALE** at exact historical head `5238b9c289476100c875ed9a88bd7e21a574fa67`. Do not reopen, rebase, revive or wholesale-merge this branch.

Historical exact-head CI `32614831929` / CI 792 was `success`, but it is not current release evidence and was a false-PASS for the final independent P1. Historical owner review `5001566041` is non-independent and not current release evidence.

Six unresolved P1/P2 review threads remain attack history:

- `PRRT_kwDOTiNyWc6bZjxp` — P1;
- `PRRT_kwDOTiNyWc6bZ6tx` — P1;
- `PRRT_kwDOTiNyWc6bZ6tz` — P2;
- `PRRT_kwDOTiNyWc6baFkR` — P1;
- `PRRT_kwDOTiNyWc6baIxZ` — P1;
- `PRRT_kwDOTiNyWc6bc4gh` — P1 final historical finding: a rejected native Promise with a non-configurable unsafe data `constructor` can fail before rejection drain and leave strict-mode orphaned rejection termination.

Closing the PR does not resolve those findings or make its code trusted.

## `FRESH_PROVIDER_TRANSPORT_REPAIR_BLOCKED_PENDING_RECONCILIATION`

The next Tier-B Wallet Guard/provider prerequisite must start on a **fresh branch from then-current trusted main** only after the present control-plane reconciliation becomes trusted. Useful hardening from PR #120 may be selectively reconstructed only when justified by current architecture/tests; stale history must not be merged wholesale.

The accepted direction remains the explicit narrow **trusted-provider transport contract** recorded in PR #126 comment `5384571039` and independently reconciled through trusted PR #127, then carried through #128 and #129.

Inside the supported contract, the fresh lot must prove:

- fail closed;
- zero reference authorization;
- zero sensitive forwarding;
- clean child-process survival under `--unhandled-rejections=strict`;
- no orphaned provider-rejection termination.

Decorated/rebased/Proxy/accessor/non-configurable-unsafe-constructor Promise objects remain excluded from that supported contract. The supported route must prove **before origin** that its controlled trusted provider/adapter cannot emit an excluded transport, then separately prove strict clean-process survival for an **in-contract** rejected transport.

An already-originated excluded rejected Promise remains an explicit unsupported negative unless a separately reviewed process/worker/RPC isolation boundary is introduced. An in-contract fixture must never be represented as direct same-process survival evidence for that hostile object.

The selected design must not install process-global `unhandledRejection`/`uncaughtException` swallowing, execute hostile constructor/species accessors, traverse hostile Proxy constructor/species paths, silently trust attacker-selected species constructors, weaken strict rejection tests, or convert unknown/failure into authorization/forwarding.

## `PR97_STALE_HISTORICAL_BRANCH_MUST_NOT_MERGE`

PR #97 remains live `OPEN / STALE / MUST_NOT_MERGE` at exact head `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`. Against trusted main `95cafa...` it is `diverged`, ahead 66 / behind 243, merge-base `0564aecd42cf0794894c12842980969ff59c9f73`. Multiple unresolved P1 review threads remain, including exact-head Promise-drift findings. Historical green CI cannot clear those blockers. Do not merge, rebase, revive or wholesale-copy it.

## `CORE_DURABLE_GATE_COMPOSITION_NOT_YET_TRUSTED`

Trusted main contains a process-local single-use Gate and a separate filesystem durable claim primitive. Reviewed durable claim-before-observer/downstream composition is not trusted. Reconstruct it from then-current trusted main only after the fresh provider-transport prerequisite receives exact-merge `POST_MERGE_ASSURANCE_PASS`.

## `PR93_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED_LATER`

PR #93 remains live `OPEN / STALE / UNTRUSTED / LATER` at exact head `c4e40ceb286f4e59657767661daed15d2b68e9a7`. Against trusted main `95cafa...` it is `diverged`, ahead 86 / behind 288, merge-base `818718955c9e4136e9e55754a31be2f1c7b610f8`. Historical green CI/reviews do not clear unresolved P1/P2. Reconstruct useful simulation work later from then-current trusted main rather than merging stale history wholesale.

## `DAGR_SOURCE_DOCUMENT_MISSING`

Normative DAGR/profile work remains source-gated. Do not invent normative text, controls, scores or claims without authorized source material.

## `PRODUCTION_TRUST_UNPROVED`

Production issuer/operator authorization, trusted time, KMS/HSM custody, distributed revocation/consensus, crash recovery, external observer independence, external execution/effect truth and arbitrary browser/provider integrity remain unproved.

## `REAL_WALLET_NOT_AUTHORIZED`

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction or meaningful funds are authorized. Burner local/testnet E2E remains behind a separate explicit human authorization gate.

## Current dependency and merge rule

A dependency becomes trusted only after the mandatory five-stage pre-merge gate, all applicable exact-head technical/security gates, canonical exact-head CI, every required genuinely distinct exact-head independent review, zero unresolved P0/P1/P2, merge, exact-main CI and exact-merge `POST_MERGE_ASSURANCE_PASS`. A moved head invalidates exact-head evidence. The independent-review waiver remains limited to PR #60.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded — not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.
