# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-23T12:10:00+02:00`

Purpose: compact durable cross-chat continuation state. Scheduled-task chat history is not project state. Every run reconstructs state from live GitHub plus this canonical control plane. Live GitHub wins whenever PR heads, CI, reviews, review threads, mergeability or merges differ from this file.

## trusted_main

Exact live/trusted `main`: `abc19e969aa19f3ec08efe67cdf1988731b633ee`.

Latest trusted merge: PR #128 — bounded non-Tier-B control-plane reconciliation.

- exact source head: `ab3665f8a1ae22bb46d8c78b7c3d3babac8af6f3`;
- pre-merge canonical exact-head CI: `32627956172` / CI 816 attempt 1 = `success`;
- release-owner five-stage review: `5001979364` = `PASS_NON_INDEPENDENT`, owner findings `0 P0 / 0 P1 / 0 P2`;
- genuinely distinct exact-head evidence: `chatgpt-codex-connector[bot]` comment `5385047280`, reviewed `ab3665f8a1`, no major issues;
- exact merge/main SHA: `abc19e969aa19f3ec08efe67cdf1988731b633ee`;
- merge parents: `ef05bd371aa2f71ed07f79d7c36f3c22d780963e` + `ab3665f8a1ae22bb46d8c78b7c3d3babac8af6f3`;
- source-head -> merge comparison: one merge commit and zero additional file changes;
- canonical exact-main push CI: `32630170335` / CI 817 attempt 1 = `success` on the exact merge SHA;
- exact-main status: `pom-rx/exact-main-ci = success`, targeting CI 817 at assurance time;
- exact-merge assurance: PR #128 comment `5385232787` = `POST_MERGE_ASSURANCE_PASS`.

PR #128 changed only canonical coordination/product-position documents. It changed no runtime, protocol, Gate, Witness, verifier or Wallet Guard/provider semantics.

## current_control_plane_reconciliation

Live GitHub materially changed after the versioned PR #128 source head was frozen: PR #128 merged and passed exact-merge assurance, and PR #120 was subsequently closed without merge. The five canonical coordination/product-position files on `main` therefore still describe a pre-merge/pre-closure state and must not be used as readiness evidence until reconciled.

Current bounded reconciliation branch: `docs/pom-rx-post-pr128-pr120-close-reconcile-20260823`.

Owned files are exactly:

- `docs/project-management/pom-rx-core/POM_RX_RESUME_CHECKPOINT.md`;
- `docs/project-management/pom-rx-core/POM_RX_TASKS.yaml`;
- `docs/project-management/pom-rx-core/POM_RX_BLOCKERS.md`;
- `docs/project-management/pom-rx-core/POM_RX_TEAM_ROSTER.md`;
- `docs/product/POM_RX_CAPABILITY_MAP.md`.

This lot changes no runtime, test, protocol, Gate, Witness, verifier, Wallet Guard/provider, wallet/network, public-site/Vercel or financial-execution semantics. Until the reconciliation itself passes exact-head CI, the five-stage owner gate, a fresh genuinely distinct exact-head review, merge and exact-merge assurance, live GitHub remains the readiness source of truth.

## closed_historical_pr120

### PR #120 — Wallet Guard rejected-Promise transport repair line

Live GitHub at this checkpoint:

- PR: `#120`, `CLOSED / NOT MERGED / STALE`;
- historical branch: `automation/pom-rx-promise-drift-repair-20260822`;
- final historical head: `5238b9c289476100c875ed9a88bd7e21a574fa67`;
- `merged=false`, `merge_commit_sha=null`;
- historical exact-head CI `32614831929` / CI 792 attempt 1 = `success`, but it is not current release evidence and was a false-PASS for the final independent P1;
- historical release-owner review `5001566041` = `PASS_NON_INDEPENDENT`, not current release evidence;
- current independent attack finding on the historical head: P1 `PRRT_kwDOTiNyWc6bc4gh`;
- six P1/P2 review threads remain unresolved attack history.

Do not reopen, rebase, revive or wholesale-merge PR #120. Useful hardening and tests from that branch may be selectively reconstructed only in a fresh Tier-B branch from then-current trusted `main`, with ownership and evidence re-established from scratch.

### Accepted bounded provider-transport architecture/security decision

The read-only architecture/security decision from PR #126 comment `5384571039`, independently reconciled through trusted PR #127 and preserved by PR #128, remains the intended boundary for a fresh repair lot.

For the current local prototype, use an explicit narrow **trusted-provider transport contract** rather than another same-realm Promise reorder/shadow trick.

Inside the supported contract, rejection handling must prove all of:

- fail closed;
- zero reference authorization;
- zero sensitive forwarding;
- clean child-process survival under `--unhandled-rejections=strict`;
- no orphaned provider-rejection termination.

Decorated/rebased/Proxy/accessor/non-configurable-unsafe-constructor Promise objects remain outside that supported contract. The contract-narrowing route must prove **before origin** that the controlled trusted provider/adapter cannot emit an excluded transport on the supported path, then separately prove strict clean-process survival for an **in-contract** rejected transport.

An already-originated excluded rejected Promise is not a positive same-process survival requirement under contract narrowing. If that property is desired, a separately reviewed process/worker/RPC isolation boundary is required and the hostile case must be reproduced across that boundary.

Do not add process-global `unhandledRejection`/`uncaughtException` swallowing, do not execute hostile constructor/species accessors or Proxy paths, and do not silently trust attacker-selected species constructors.

ECMAScript 2026 §27.2.5.4 remains the feasibility constraint: ordinary `Promise.prototype.then` runs `SpeciesConstructor` and `NewPromiseCapability` before `PerformPromiseThen`, so reorder-only draining is not accepted as a universal repair.

Six PR #120 P1/P2 threads remain attack history and must be carried into the fresh Tier-B skeptical review matrix:

- `PRRT_kwDOTiNyWc6bZjxp` — P1;
- `PRRT_kwDOTiNyWc6bZ6tx` — P1;
- `PRRT_kwDOTiNyWc6bZ6tz` — P2;
- `PRRT_kwDOTiNyWc6baFkR` — P1;
- `PRRT_kwDOTiNyWc6baIxZ` — P1;
- `PRRT_kwDOTiNyWc6bc4gh` — P1 final historical finding.

Closing PR #120 does not resolve these findings or turn its code into trusted evidence.

## open_historical_prs

PR #97 remains `OPEN / STALE / MUST_NOT_MERGE` at exact live head `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`. Its exact-head CI `32487036517` / CI 592 is `success`, but current non-independent owner evidence is `BLOCK` and the exact-head Codex P1 about Promise drift before async layers remains unresolved. Do not merge/revive it; reconstruct durable claim-before-observer/downstream composition later from then-current trusted main only after the fresh provider-transport prerequisite receives exact-merge `POST_MERGE_ASSURANCE_PASS`.

PR #93 remains `OPEN / STALE / UNTRUSTED / LATER` at exact live head `c4e40ceb286f4e59657767661daed15d2b68e9a7`. Its exact-head CI `32465835858` / CI 541 is `success`, but multiple P1/P2 review threads remain unresolved and prior reviews are not sufficient current release evidence. Useful simulation work must be reconstructed/reconciled later from then-current trusted main rather than merging stale history wholesale.

## architecture_and_claim_boundary

Shared canonicalization, hashing, verifier, Witness, exact authorization, Gate, execution-evidence and observation/reconciliation semantics remain Core-owned. Wallet Guard remains an application profile. Trusted main contains a process-local single-use Gate and a separate filesystem durable claim primitive; reviewed durable composition is not yet trusted.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded. It is not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.

## next_safe_actions

1. Complete this scoped five-file non-Tier-B reconciliation from exact trusted main `abc19e969aa19f3ec08efe67cdf1988731b633ee`; no runtime changes belong in this lot.
2. Freeze its exact head, require canonical exact-head CI success, complete the five-stage owner gate, and obtain a fresh genuinely distinct `chatgpt-codex-connector` review on that same SHA with zero unresolved P0/P1/P2.
3. Merge only if decision-time main/head/CI/review/thread state remains unchanged, then immediately run exact-merge-SHA post-merge assurance.
4. Only after this reconciliation becomes trusted, create a **fresh** Tier-B Wallet Guard/provider transport repair branch from then-current trusted main. Do not reopen or wholesale-copy PR #120.
5. In that fresh lot, selectively reconstruct only the accepted useful hardening needed for the narrow trusted-provider contract, add CI-wired pre-origin provider conformance, a separate strict in-contract rejected-transport survival regression, zero authorization/forwarding evidence, and preserve the already-originated hostile Promise as an explicit unsupported negative unless reviewed isolation is introduced.
6. Freeze the Tier-B head and rerun the complete five-stage owner gate with concrete Promise/species/accessor/Proxy/strict-unhandled/thenable/Array-poisoning hypotheses plus a fresh genuinely distinct exact-head Codex review.
7. Only after that fresh provider prerequisite receives exact-merge `POST_MERGE_ASSURANCE_PASS` may durable Gate composition be reconstructed from current main; PR #93 remains later in dependency order.

## safety_boundary

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction, meaningful funds or uncontrolled malicious-site interaction is authorized. Burner local/testnet E2E remains behind a separate explicit human gate. Public website/Vercel/funding-directory writes are outside this control plane.
