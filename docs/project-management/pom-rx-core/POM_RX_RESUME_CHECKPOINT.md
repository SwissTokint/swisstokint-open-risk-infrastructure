# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-23T06:30:00+02:00`

Purpose: compact durable cross-chat continuation state. Scheduled-task chat history is not project state. Live GitHub wins whenever PR heads, CI, reviews, review threads, mergeability or merges differ from this file.

## trusted_main

Exact live/trusted `main`: `097937acf19338bdaab54050d64f18195d9b4a33`.

Latest trusted merge: PR #124 — bounded non-Tier-B control-plane reconciliation after PR #123 and the fresh PR #120 P1.

- exact source head: `43c331244ac608725aec63d46fa281dc78d39f0d`;
- exact merge/main SHA: `097937acf19338bdaab54050d64f18195d9b4a33`;
- pre-merge canonical exact-head CI: run `32617450870`, CI 793 attempt 1, `completed / success`;
- release-owner five-stage review: `5001642141` = `PASS_NON_INDEPENDENT`, owner findings `0 P0 / 0 P1 / 0 P2`;
- genuinely distinct exact-head evidence: `chatgpt-codex-connector[bot]` comment `5384176703`, reviewed commit `43c331244a`, no major issues; comment `5384188219` is a consistent second exact-head result;
- pre-merge decision comment: `5384202384`;
- canonical exact-main push CI: run `32617884521`, CI 794 attempt 1, `completed / success` on exact merge SHA;
- exact-main status: `pom-rx/exact-main-ci = success`, target run `32617884521`;
- exact-merge assurance: PR #124 comment `5384213312` = `POST_MERGE_ASSURANCE_PASS`;
- source-head -> merge comparison: one merge commit, zero changed files.

PR #124 changed only canonical coordination/product-position documents. It changed no runtime, protocol, Gate, Witness, verifier or Wallet Guard/provider semantics.

## current_control_plane_reconciliation

This file update is part of the scoped post-PR124 continuation reconciliation from exact trusted main `097937acf19338bdaab54050d64f18195d9b4a33`. The purpose is only to persist the new assured main and the resulting PR #120 divergence before further Tier-B work.

Branch: `docs/pom-rx-post-pr124-live-reconcile-20260823`.

Owned continuation files for this bounded lot are `POM_RX_RESUME_CHECKPOINT.md`, `POM_RX_TASKS.yaml`, `POM_RX_BLOCKERS.md` and `docs/product/POM_RX_CAPABILITY_MAP.md`. No runtime/test/security semantic change is intended.

## active_runtime_task

### PR #120 — Wallet Guard rejected-Promise transport prerequisite repair

Live GitHub after PR #124 merged:

- PR: `#120`, `OPEN / NOT TRUSTED / BLOCKED`;
- branch: `automation/pom-rx-promise-drift-repair-20260822`;
- exact live head: `5238b9c289476100c875ed9a88bd7e21a574fa67`;
- current trusted main: `097937acf19338bdaab54050d64f18195d9b4a33`;
- compare current main -> head: `diverged`, ahead 69 / behind 6, merge-base `73f3921984449ffd6025f6c9b99b0220f0bf068b`;
- previous branch reconciliation merge: `e4c8d4b29cdc875d17c170d6e67a0fd7804d849d`;
- exact-head CI `32614831929` / CI 792 attempt 1 = `success`, but it is both historical after main moved and a false-PASS for the fresh P1;
- release-owner review `5001566041` = `PASS_NON_INDEPENDENT`, but it is not valid release evidence after the fresh P1 and main movement;
- genuinely distinct exact-head Codex review: `BLOCK / P1` via unresolved thread `PRRT_kwDOTiNyWc6bc4gh`;
- merge: `BLOCKED`.

Fresh P1 `PRRT_kwDOTiNyWc6bc4gh`: a rejected same-realm native Promise with a non-configurable own unsafe data `constructor`, for example `constructor: 1`, can make the safety classifier reject the path and then make constructor shadowing throw before the captured rejection reaction is attached. Under `--unhandled-rejections=strict`, the operation fails closed but the original rejection can remain orphaned and terminate the process.

Required repair remains bounded: first reconcile the PR branch to exact trusted main `097937acf19338bdaab54050d64f18195d9b4a33`; then attach/drain the rejected transport without requiring successful attacker-controlled constructor shadowing first; do not execute hostile constructor/species accessors or Proxy paths; keep attacker-selected species constructors outside the trusted drain claim; add a CI-wired strict regression proving zero reference authorization and zero sensitive forwarding. Every head move invalidates prior exact-head release evidence.

Six PR #120 P1/P2 threads remain unresolved attack history:

- `PRRT_kwDOTiNyWc6bZjxp` — P1;
- `PRRT_kwDOTiNyWc6bZ6tx` — P1;
- `PRRT_kwDOTiNyWc6bZ6tz` — P2;
- `PRRT_kwDOTiNyWc6baFkR` — P1;
- `PRRT_kwDOTiNyWc6baIxZ` — P1;
- `PRRT_kwDOTiNyWc6bc4gh` — P1 current finding.

Do not resolve them merely because partial repairs exist. Closure requires one frozen repaired and current-main-reconciled exact head with green canonical CI, the mandatory five-stage owner gate, a fresh genuinely distinct exact-head review and zero unresolved P0/P1/P2.

## blocked_historical_prs

PR #97 remains `OPEN / STALE / MUST_NOT_MERGE` at `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`. Reconstruct durable claim-before-observer/downstream composition later from then-current trusted main only after PR #120 receives exact-merge `POST_MERGE_ASSURANCE_PASS`.

PR #93 remains `OPEN / STALE / UNTRUSTED / LATER` at `c4e40ceb286f4e59657767661daed15d2b68e9a7`. Historical green CI/reviews are not release evidence; useful work must be reconciled later from then-current trusted main.

## architecture_and_claim_boundary

Shared canonicalization, hashing, verifier, Witness, exact authorization, Gate, execution-evidence and observation/reconciliation semantics remain Core-owned. Wallet Guard remains an application profile. Trusted main contains a process-local single-use Gate and a separate filesystem durable claim primitive; durable composition is not yet trusted.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded. It is not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.

## next_safe_actions

1. Complete this scoped post-PR124 control-plane reconciliation through its applicable exact-head gates; do not change runtime in this lot.
2. After that reconciliation becomes trusted, reconcile PR #120 to exact trusted main `097937acf19338bdaab54050d64f18195d9b4a33` using exactly one writer.
3. Repair current P1 `PRRT_kwDOTiNyWc6bc4gh` without widening the claim to hostile accessors, Proxy paths or attacker-selected species constructors.
4. Add the strict non-configurable unsafe data-constructor regression and preserve zero authorization / zero sensitive forwarding on failure.
5. Freeze the moved PR #120 head, require fresh canonical exact-head CI, rerun the mandatory five-stage owner gate with concrete rejected-Promise/constructor/species/accessor/Proxy/strict-unhandled/thenable/Array-poisoning hypotheses, then obtain a fresh genuinely distinct exact-head `chatgpt-codex-connector` review.
6. Resolve the six historical/current PR #120 threads only when same-SHA evidence justifies closure; merge only with zero unresolved P0/P1/P2 and unchanged decision-time main/head/CI/review state.
7. Immediately run exact-merge-SHA post-merge assurance after any merge.
8. Only after PR #120 becomes trusted, reconstruct durable Gate composition as a fresh bounded Core lot; reconcile PR #93 later in dependency order.

## safety_boundary

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction, meaningful funds or uncontrolled malicious-site interaction is authorized. Burner local/testnet E2E remains behind a separate explicit human gate. Public website/Vercel/funding-directory writes are outside this control plane.
