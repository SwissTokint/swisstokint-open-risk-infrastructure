# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-23T10:15:00+02:00`

Purpose: compact durable cross-chat continuation state. Scheduled-task chat history is not project state. Live GitHub wins whenever PR heads, CI, reviews, review threads, mergeability or merges differ from this file.

## trusted_main

Exact live/trusted `main`: `ef05bd371aa2f71ed07f79d7c36f3c22d780963e`.

Latest trusted merge: PR #127 — bounded non-Tier-B reconciliation of the assured PR #126 state and the accepted Wallet Guard provider-transport architecture boundary.

- exact source head: `df491ec5c73f74dabc49fc6372d239fddb997a59`;
- pre-merge canonical exact-head CI: `32625199525` / CI 809 attempt 1 = `success`;
- release-owner five-stage review: `5001882172` = `PASS_NON_INDEPENDENT`, owner findings `0 P0 / 0 P1 / 0 P2`;
- genuinely distinct exact-head evidence: `chatgpt-codex-connector[bot]` comment `5384821148`, reviewed `df491ec5c7`, no major issues;
- historical PR #127 P2 threads `PRRT_kwDOTiNyWc6bdxPp` and `PRRT_kwDOTiNyWc6bdyZ8` were resolved only after repaired same-head CI and independent validation;
- pre-merge decision: comment `5384996506`;
- exact merge/main SHA: `ef05bd371aa2f71ed07f79d7c36f3c22d780963e`;
- merge parents: `7f4b0f7baf5c0fbed1c75b7b2b5fd0a643974411` + `df491ec5c73f74dabc49fc6372d239fddb997a59`;
- source-head -> merge comparison: one merge commit and zero changed files;
- canonical exact-main push CI: `32627602883` / CI 810 attempt 1 = `success` on the exact merge SHA;
- exact-main status: `pom-rx/exact-main-ci = success`, targeting run `32627602883` at assurance time;
- exact-merge assurance: PR #127 comment `5385007479` = `POST_MERGE_ASSURANCE_PASS`.

PR #127 changed only canonical coordination/product-position documents. It changed no runtime, protocol, Gate, Witness, verifier or Wallet Guard/provider semantics.

## current_control_plane_reconciliation

PR #128 / branch `docs/pom-rx-post-pr127-live-reconcile-20260823` is the scoped post-#127 reconciliation from exact trusted main `ef05bd371aa2f71ed07f79d7c36f3c22d780963e`.

The bounded owned control-plane set remains exactly:

- `docs/project-management/pom-rx-core/POM_RX_RESUME_CHECKPOINT.md`;
- `docs/project-management/pom-rx-core/POM_RX_TASKS.yaml`;
- `docs/project-management/pom-rx-core/POM_RX_BLOCKERS.md`;
- `docs/project-management/pom-rx-core/POM_RX_TEAM_ROSTER.md`;
- `docs/product/POM_RX_CAPABILITY_MAP.md`.

This checkpoint commit persists the new trusted-main/post-merge state first. TASKS/BLOCKERS/TEAM_ROSTER/CAPABILITY_MAP still require reconciliation on this same branch before the lot can be considered complete. No runtime, test, protocol, Gate, Witness, verifier, Wallet Guard/provider, wallet/network, public-site/Vercel or financial-execution semantics are authorized in this reconciliation.

## active_runtime_task

### PR #120 — Wallet Guard rejected-Promise transport prerequisite repair

Live GitHub at this checkpoint:

- PR: `#120`, `OPEN / NOT TRUSTED / BLOCKED`;
- branch: `automation/pom-rx-promise-drift-repair-20260822`;
- exact live head: `5238b9c289476100c875ed9a88bd7e21a574fa67`;
- current trusted main: `ef05bd371aa2f71ed07f79d7c36f3c22d780963e`;
- compare current main -> head: `diverged`, ahead 69 / behind 34, merge-base `73f3921984449ffd6025f6c9b99b0220f0bf068b`;
- GitHub mergeability: `false` at this revalidation;
- historical exact-head CI `32614831929` / CI 792 attempt 1 = `success`, but it is not current release evidence after main moved and is a false-PASS for the current P1;
- historical release-owner review `5001566041` = `PASS_NON_INDEPENDENT`, not current release evidence;
- genuinely distinct exact-head Codex finding: unresolved P1 `PRRT_kwDOTiNyWc6bc4gh`;
- six P1/P2 review threads remain unresolved;
- merge: `BLOCKED`.

P1 `PRRT_kwDOTiNyWc6bc4gh` remains the current attack finding: a rejected same-realm native Promise with a non-configurable own unsafe data `constructor`, for example `constructor: 1`, can make constructor shadowing throw before the captured rejection reaction is attached. Under `--unhandled-rejections=strict`, the gateway fails closed but the original rejection can remain orphaned and terminate the process.

### Accepted bounded architecture/security decision

Read-only architecture/security decision remains PR #126 comment `5384571039` and was reconciled/independently reviewed through trusted PR #127.

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

Six PR #120 P1/P2 threads remain unresolved attack history:

- `PRRT_kwDOTiNyWc6bZjxp` — P1;
- `PRRT_kwDOTiNyWc6bZ6tx` — P1;
- `PRRT_kwDOTiNyWc6bZ6tz` — P2;
- `PRRT_kwDOTiNyWc6baFkR` — P1;
- `PRRT_kwDOTiNyWc6baIxZ` — P1;
- `PRRT_kwDOTiNyWc6bc4gh` — P1 current finding.

Do not resolve them merely because partial repairs or claim narrowing exist. Closure requires one frozen current-main-reconciled candidate with green canonical CI, the mandatory five-stage owner gate, a fresh genuinely distinct exact-head review and zero unresolved P0/P1/P2.

## blocked_historical_prs

PR #97 remains `OPEN / STALE / MUST_NOT_MERGE` at exact head `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`. Do not merge/revive it; reconstruct durable claim-before-observer/downstream composition later from then-current trusted main only after PR #120 receives exact-merge `POST_MERGE_ASSURANCE_PASS`.

PR #93 remains `OPEN / STALE / UNTRUSTED / LATER` at exact head `c4e40ceb286f4e59657767661daed15d2b68e9a7`. Historical green CI/reviews are not release evidence; useful work must be reconciled later from then-current trusted main.

## architecture_and_claim_boundary

Shared canonicalization, hashing, verifier, Witness, exact authorization, Gate, execution-evidence and observation/reconciliation semantics remain Core-owned. Wallet Guard remains an application profile. Trusted main contains a process-local single-use Gate and a separate filesystem durable claim primitive; durable composition is not yet trusted.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded. It is not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.

## next_safe_actions

1. Complete the post-PR127 control-plane reconciliation on this same branch by reconciling TASKS, BLOCKERS, TEAM_ROSTER and CAPABILITY_MAP to exact trusted main `ef05bd371aa2f71ed07f79d7c36f3c22d780963e` and current PR #120 divergence.
2. Freeze the completed PR #128 candidate and obtain canonical exact-head CI, five-stage owner review and a fresh genuinely distinct exact-head review with zero unresolved P0/P1/P2.
3. Merge PR #128 only if decision-time main/head/CI/review/thread state remains unchanged, then immediately run exact-merge-SHA post-merge assurance.
4. Only after that reconciliation becomes trusted, use exactly one writer to reconcile PR #120 to then-current trusted main and implement the smallest supported-provider contract/runtime-diagnostic/test alignment.
5. Require CI-wired pre-origin conformance for the controlled supported provider path plus a separate strict in-contract rejected-transport survival regression; keep the already-originated hostile Promise as an explicit unsupported negative unless reviewed isolation is introduced.
6. Freeze the moved PR #120 head and require wholly fresh canonical exact-head CI, the mandatory five-stage owner gate with concrete Promise/species/accessor/Proxy/strict-unhandled/thenable/Array-poisoning hypotheses, and a fresh genuinely distinct exact-head `chatgpt-codex-connector` review.
7. Resolve the six PR #120 P1/P2 threads only when same-SHA evidence justifies closure; merge only with zero unresolved P0/P1/P2 and unchanged decision-time main/head/CI/review state.
8. Immediately run exact-merge-SHA post-merge assurance after any merge.
9. Only after PR #120 becomes trusted, reconstruct durable Gate composition as a fresh bounded Core lot; reconcile PR #93 later in dependency order.

## safety_boundary

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction, meaningful funds or uncontrolled malicious-site interaction is authorized. Burner local/testnet E2E remains behind a separate explicit human gate. Public website/Vercel/funding-directory writes are outside this control plane.
