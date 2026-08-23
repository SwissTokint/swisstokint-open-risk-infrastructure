# POM-RX Core — Active Blockers

Updated: `2026-08-23T12:10:00+02:00`

Current trusted main: `abc19e969aa19f3ec08efe67cdf1988731b633ee`.

This file lists current blockers only. Historical detail remains in Git history and PR review threads. Live GitHub wins whenever a PR head, CI run, review, thread, mergeability signal or merge changes after this checkpoint.

## Trusted coordination state

PR #128 source head `ab3665f8a1ae22bb46d8c78b7c3d3babac8af6f3` merged as exact main SHA `abc19e969aa19f3ec08efe67cdf1988731b633ee`.

- canonical source-head CI: `32627956172` / CI 816 attempt 1 = `success`;
- release-owner five-stage review: `5001979364` = `PASS_NON_INDEPENDENT`, owner findings `0 P0 / 0 P1 / 0 P2`;
- genuinely distinct exact-head evidence: `chatgpt-codex-connector[bot]` comment `5385047280`, reviewed `ab3665f8a1`, no major issues;
- canonical exact-main push CI: `32630170335` / CI 817 attempt 1 = `success`;
- exact-main status `pom-rx/exact-main-ci = success` targeted that run at assurance time;
- exact-merge assurance: PR #128 comment `5385232787` = `POST_MERGE_ASSURANCE_PASS`;
- reviewed source head -> exact merge comparison adds zero changed files.

PR #128 changed only coordination/product-position documents and does not make later Tier-B work trusted.

## `CONTROL_PLANE_STALE_AFTER_PR128_AND_PR120_CLOSE`

The files merged from PR #128 necessarily describe its pre-merge parent and still state that PR #120 is open. Live GitHub now has trusted main `abc19e969aa19f3ec08efe67cdf1988731b633ee`, and PR #120 is `CLOSED / NOT MERGED` at historical head `5238b9c289476100c875ed9a88bd7e21a574fa67`.

Required closure is the scoped non-Tier-B branch `docs/pom-rx-post-pr128-pr120-close-reconcile-20260823`, limited to exactly:

- `POM_RX_RESUME_CHECKPOINT.md`;
- `POM_RX_TASKS.yaml`;
- `POM_RX_BLOCKERS.md`;
- `POM_RX_TEAM_ROSTER.md`;
- `docs/product/POM_RX_CAPABILITY_MAP.md`.

It changes no runtime, test, protocol, Gate, Witness, verifier, Wallet Guard/provider, wallet/network, public-site/Vercel or financial-execution semantics. Until this reconciliation passes its own exact-head gates, merge and exact-merge assurance, use live GitHub rather than stale versioned readiness fields.

## `PR120_CLOSED_NOT_MERGED_ATTACK_HISTORY`

PR #120 is **CLOSED / NOT MERGED / STALE** at exact historical head `5238b9c289476100c875ed9a88bd7e21a574fa67`. Do not reopen, rebase, revive or wholesale-merge this branch.

Its historical exact-head CI `32614831929` / CI 792 was `success`, but that run is not release evidence and was a false-PASS for the final independent P1. Historical owner review `5001566041` is non-independent and not current release evidence.

Six unresolved P1/P2 review threads remain attack history:

- `PRRT_kwDOTiNyWc6bZjxp` — P1 rejected transport could fail before a rejection reaction was attached;
- `PRRT_kwDOTiNyWc6bZ6tx` — P1 fallible constructor pinning preceded the rejection reaction;
- `PRRT_kwDOTiNyWc6bZ6tz` — P2 strict rejected-transport regression was absent from canonical `npm test` at that reviewed head;
- `PRRT_kwDOTiNyWc6baFkR` — P1 non-extensible rejected native Promise with nonstandard prototype could reach fallible constructor shadowing;
- `PRRT_kwDOTiNyWc6baIxZ` — P1 Wallet Guard capability-map product-position invariant was removed at that reviewed head;
- `PRRT_kwDOTiNyWc6bc4gh` — P1 final historical finding: a rejected native Promise with non-configurable unsafe data `constructor`, e.g. `constructor: 1`, can make constructor shadowing fail before rejection drain, leaving strict-mode orphaned rejection termination.

Closing the PR does not resolve those findings or make its code trusted.

## `FRESH_PROVIDER_TRANSPORT_REPAIR_NOT_STARTED`

The next Tier-B Wallet Guard/provider prerequisite must be a **fresh branch from then-current trusted main** after the present control-plane reconciliation becomes trusted. Useful hardening from PR #120 may be selectively reconstructed only when justified by current architecture/tests; stale history must not be merged wholesale.

The accepted architecture/security direction remains the explicit narrow **trusted-provider transport contract** from PR #126 comment `5384571039`, independently reconciled through trusted PR #127 and preserved by PR #128.

Inside the supported contract, the fresh lot must prove:

- fail closed;
- zero reference authorization;
- zero sensitive forwarding;
- clean process survival under `--unhandled-rejections=strict`;
- no orphaned provider-rejection termination.

Decorated/rebased/Proxy/accessor/non-configurable-unsafe-constructor Promise objects remain excluded from that local supported contract. The fresh route must prove **before origin** that its controlled trusted provider/adapter cannot emit an excluded transport, then separately prove strict clean-process survival for an in-contract rejected transport.

An already-originated excluded rejected Promise remains an explicit unsupported negative unless a separately reviewed process/worker/RPC isolation boundary is introduced. An in-contract fixture must never be presented as direct same-process survival evidence for that hostile object.

The selected design must not install process-global `unhandledRejection`/`uncaughtException` swallowing, execute hostile constructor/species accessors, traverse hostile Proxy constructor/species paths, silently trust attacker-selected species constructors, weaken strict rejection tests, or convert unknown/failure into authorization/forwarding.

ECMAScript 2026 §27.2.5.4 remains the feasibility constraint: ordinary `Promise.prototype.then` runs `SpeciesConstructor` and `NewPromiseCapability` before `PerformPromiseThen`, so reorder-only draining is not accepted as a universal proof.

## `PR97_STALE_HISTORICAL_BRANCH_MUST_NOT_MERGE`

PR #97 remains live `OPEN / STALE / MUST_NOT_MERGE` at exact head `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`. Exact-head CI `32487036517` / CI 592 is `success`, but the non-independent owner gate is `BLOCK` and an exact-head independent P1 about Promise drift before async layers remains unresolved. Do not merge, rebase, revive or wholesale-copy it. Durable claim-before-observer/downstream composition must be reconstructed later from then-current trusted main after the fresh provider-transport prerequisite receives exact-merge `POST_MERGE_ASSURANCE_PASS`.

## `CORE_DURABLE_GATE_COMPOSITION_NOT_YET_TRUSTED`

Trusted main contains a process-local single-use Gate and a separate filesystem durable claim primitive. Reviewed durable claim-before-observer/downstream composition is not trusted.

## `PR93_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED_LATER`

PR #93 remains live `OPEN / STALE / UNTRUSTED / LATER` at exact head `c4e40ceb286f4e59657767661daed15d2b68e9a7`. Exact-head CI `32465835858` / CI 541 is `success`, but multiple P1/P2 review threads remain unresolved and historical green CI/reviews are not sufficient release evidence. Reconstruct/reconcile useful simulation work later from then-current trusted main rather than merging stale history wholesale.

## `DAGR_SOURCE_DOCUMENT_MISSING`

Normative DAGR/profile work remains source-gated. Do not invent normative text, controls, scores or claims without authorized source material.

## `PRODUCTION_TRUST_UNPROVED`

Production issuer/operator authorization, trusted time, KMS/HSM custody, distributed revocation/consensus, crash recovery, external observer independence, external execution/effect truth and arbitrary browser/provider integrity remain unproved.

## `REAL_WALLET_NOT_AUTHORIZED`

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction or meaningful funds are authorized. Burner local/testnet E2E remains behind a separate explicit human authorization gate.

## Current dependency and merge rule

A dependency becomes trusted only after the mandatory five-stage pre-merge gate, all applicable exact-head technical/security gates, canonical exact-head CI, every required genuinely distinct exact-head independent review, zero unresolved P0/P1/P2, merge, exact-main CI and exact-merge `POST_MERGE_ASSURANCE_PASS`. A moved head invalidates exact-head evidence. The independent-review waiver remains limited to PR #60.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded — not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.
