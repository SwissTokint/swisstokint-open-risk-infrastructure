# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-23T09:05:24+02:00`

Purpose: compact durable cross-chat continuation state. Scheduled-task chat history is not project state. Live GitHub wins whenever PR heads, CI, reviews, review threads, mergeability or merges differ from this file.

## trusted_main

Exact live/trusted `main`: `7f4b0f7baf5c0fbed1c75b7b2b5fd0a643974411`.

Latest trusted merge: PR #126 — bounded non-Tier-B reconciliation of the assured PR #125 state and the Wallet Guard rejected-Promise architecture blocker.

- exact source head: `520b231acfcdb896e0ce01ce52fae18f490bf408`;
- pre-merge canonical exact-head CI: `32619624022` / CI 802 attempt 1 = `success`;
- release-owner five-stage review: `5001707331` = `PASS_NON_INDEPENDENT`, owner findings `0 P0 / 0 P1 / 0 P2`;
- genuinely distinct exact-head evidence: `chatgpt-codex-connector[bot]` comment `5384371632`, reviewed `520b231acf`, no major issues;
- historical reconciliation P2 `PRRT_kwDOTiNyWc6bdRTY` was resolved only after that same-head independent validation;
- pre-merge decision: comment `5384577930`;
- exact merge/main SHA: `7f4b0f7baf5c0fbed1c75b7b2b5fd0a643974411`;
- merge parents: `1989bb88ae2eee6ae32328f2df4cc056c0dd27d4` + `520b231acfcdb896e0ce01ce52fae18f490bf408`;
- source-head -> merge comparison: one merge commit and zero changed files;
- canonical exact-main push CI: `32622491799` / CI 803 attempt 1 = `success` on the exact merge SHA;
- exact-main status: `pom-rx/exact-main-ci = success`, targeting run `32622491799` at assurance time;
- exact-merge assurance: PR #126 comment `5384587913` = `POST_MERGE_ASSURANCE_PASS`.

PR #126 changed only canonical coordination/product-position documents. It changed no runtime, protocol, Gate, Witness, verifier or Wallet Guard/provider semantics.

## current_control_plane_reconciliation

The versioned files merged by PR #126 necessarily still named their pre-merge trusted parent `1989bb88...`. This branch/PR is the scoped post-#126 reconciliation from exact trusted main `7f4b0f7b...`.

Owned files are exactly:

- `docs/project-management/pom-rx-core/POM_RX_RESUME_CHECKPOINT.md`;
- `docs/project-management/pom-rx-core/POM_RX_TASKS.yaml`;
- `docs/project-management/pom-rx-core/POM_RX_BLOCKERS.md`;
- `docs/project-management/pom-rx-core/POM_RX_TEAM_ROSTER.md`;
- `docs/product/POM_RX_CAPABILITY_MAP.md`.

No runtime, test, protocol, Gate, Witness, verifier, Wallet Guard/provider, wallet/network, public-site/Vercel or financial-execution semantics change in this reconciliation.

## active_runtime_task

### PR #120 — Wallet Guard rejected-Promise transport prerequisite repair

Live GitHub at this checkpoint:

- PR: `#120`, `OPEN / NOT TRUSTED / BLOCKED`;
- branch: `automation/pom-rx-promise-drift-repair-20260822`;
- exact live head: `5238b9c289476100c875ed9a88bd7e21a574fa67`;
- current trusted main: `7f4b0f7baf5c0fbed1c75b7b2b5fd0a643974411`;
- compare current main -> head: `diverged`, ahead 69 / behind 23, merge-base `73f3921984449ffd6025f6c9b99b0220f0bf068b`;
- GitHub mergeability: `false` at this revalidation; mergeability is volatile conflict metadata only;
- exact-head CI `32614831929` / CI 792 attempt 1 = `success`, but historical after main moved and a false-PASS for the current P1;
- release-owner review `5001566041` = `PASS_NON_INDEPENDENT`, historical and not current release evidence;
- genuinely distinct exact-head Codex finding: unresolved P1 `PRRT_kwDOTiNyWc6bc4gh`;
- six P1/P2 review threads remain unresolved;
- merge: `BLOCKED`.

Current P1 `PRRT_kwDOTiNyWc6bc4gh`: a rejected same-realm native Promise with a non-configurable own unsafe data `constructor`, for example `constructor: 1`, can make constructor shadowing throw before the captured rejection reaction is attached. Under `--unhandled-rejections=strict`, the gateway fails closed but the original rejection can remain orphaned and terminate the process.

### Accepted bounded architecture/security decision

Read-only architecture/security decision is persisted in PR #126 comment `5384571039`.

For the current local prototype, use an explicit narrow **trusted-provider transport contract** rather than another same-realm Promise reorder/shadow trick. Rejection inside the supported contract must still prove all of:

- fail closed;
- zero reference authorization;
- zero sensitive forwarding;
- clean child-process survival under `--unhandled-rejections=strict`;
- no orphaned provider-rejection termination.

Decorated/rebased/Proxy/accessor/non-configurable-unsafe-constructor Promise objects are not silently claimed safe. The existing Wallet Guard trusted bootstrap-provider assumption may justify a narrow controlled-provider contract only when stated explicitly; it does not establish graceful survival against an intentionally hostile provider. A future hostile-provider survival claim requires a separately reviewed isolation boundary such as process/worker/RPC isolation.

Do not add process-global `unhandledRejection`/`uncaughtException` swallowing, do not execute hostile constructor/species accessors or Proxy paths, and do not silently trust attacker-selected species constructors.

ECMAScript 2026 §27.2.5.4 remains the key feasibility constraint: ordinary `Promise.prototype.then` runs `SpeciesConstructor` and `NewPromiseCapability` before `PerformPromiseThen`, so a reorder-only repair is not accepted as proof that a rejection reaction can always be installed first.

Normative reference:

`https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html#sec-promise.prototype.then`

The architecture decision narrows the supported prototype claim; it does **not** resolve the current P1, make PR #120 trusted, or authorize merging its stale head. Runtime writing resumes only after this post-#126 control-plane reconciliation becomes trusted and PR #120 is reconciled to then-current trusted main with one writer.

Six PR #120 P1/P2 threads remain unresolved attack history:

- `PRRT_kwDOTiNyWc6bZjxp` — P1;
- `PRRT_kwDOTiNyWc6bZ6tx` — P1;
- `PRRT_kwDOTiNyWc6bZ6tz` — P2;
- `PRRT_kwDOTiNyWc6baFkR` — P1;
- `PRRT_kwDOTiNyWc6baIxZ` — P1;
- `PRRT_kwDOTiNyWc6bc4gh` — P1 current finding.

Do not resolve them merely because partial repairs exist. Closure requires one frozen repaired/current-main-reconciled exact head with green canonical CI, the mandatory five-stage owner gate, a fresh genuinely distinct exact-head review and zero unresolved P0/P1/P2.

## blocked_historical_prs

PR #97 is live `OPEN / STALE / MUST_NOT_MERGE` at exact head `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`, currently non-mergeable. Reconstruct durable claim-before-observer/downstream composition later from then-current trusted main only after PR #120 receives exact-merge `POST_MERGE_ASSURANCE_PASS`.

PR #93 is live `OPEN / STALE / UNTRUSTED / LATER` at exact head `c4e40ceb286f4e59657767661daed15d2b68e9a7`, currently non-mergeable. Historical green CI/reviews are not release evidence; useful work must be reconciled later from then-current trusted main.

## architecture_and_claim_boundary

Shared canonicalization, hashing, verifier, Witness, exact authorization, Gate, execution-evidence and observation/reconciliation semantics remain Core-owned. Wallet Guard remains an application profile. Trusted main contains a process-local single-use Gate and a separate filesystem durable claim primitive; durable composition is not yet trusted.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded. It is not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.

## next_safe_actions

1. Complete this scoped post-#126 control-plane reconciliation from exact trusted main `7f4b0f7b...` with fresh exact-head CI, the applicable five-stage owner gate and a genuinely distinct exact-head review.
2. Merge it only if decision-time main/head/CI/review/thread state remains unchanged with zero unresolved P0/P1/P2; immediately run exact-merge-SHA post-merge assurance.
3. After that reconciliation becomes trusted, reconcile PR #120 to then-current exact trusted main using exactly one writer; do not merge or wholesale-revive stale branch history.
4. Align the Wallet Guard provider contract/runtime diagnostics/tests to the accepted narrow trusted-provider transport boundary and add the strict unsafe-constructor regression proving fail-closed, zero authorization, zero sensitive forwarding and clean process survival/no orphaned rejection within the supported contract.
5. Freeze the moved PR #120 head and require wholly fresh canonical exact-head CI, the mandatory five-stage owner gate with concrete Promise/species/accessor/Proxy/strict-unhandled/thenable/Array-poisoning hypotheses, and a fresh genuinely distinct exact-head `chatgpt-codex-connector` review.
6. Resolve the six PR #120 P1/P2 threads only when same-SHA evidence justifies closure; merge only with zero unresolved P0/P1/P2 and unchanged decision-time main/head/CI/review state.
7. Immediately run exact-merge-SHA post-merge assurance after any merge.
8. Only after PR #120 becomes trusted, reconstruct durable Gate composition as a fresh bounded Core lot; reconcile PR #93 later in dependency order.

## safety_boundary

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction, meaningful funds or uncontrolled malicious-site interaction is authorized. Burner local/testnet E2E remains behind a separate explicit human gate. Public website/Vercel/funding-directory writes are outside this control plane.
