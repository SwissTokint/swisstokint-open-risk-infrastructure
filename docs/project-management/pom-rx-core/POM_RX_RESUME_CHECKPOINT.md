# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-23T07:10:00+02:00`

Purpose: compact durable cross-chat continuation state. Scheduled-task chat history is not project state. Live GitHub wins whenever PR heads, CI, reviews, review threads, mergeability or merges differ from this file.

## trusted_main

Exact live/trusted `main`: `1989bb88ae2eee6ae32328f2df4cc056c0dd27d4`.

Latest trusted merge: PR #125 — bounded non-Tier-B control-plane reconciliation after assured PR #124.

- exact source head: `c9f00b13cdc3aa654004d6fb7c8740b23c936e96`;
- exact merge/main SHA: `1989bb88ae2eee6ae32328f2df4cc056c0dd27d4`;
- pre-merge canonical exact-head CI: run `32618322165`, CI 798 attempt 1, `completed / success`;
- release-owner five-stage review: `5001667406` = `PASS_NON_INDEPENDENT`, owner findings `0 P0 / 0 P1 / 0 P2`;
- genuinely distinct exact-head evidence: `chatgpt-codex-connector[bot]` comment `5384255481`, reviewed commit `c9f00b13cd`, no major issues;
- pre-merge decision comment: `5384262424`;
- canonical exact-main push CI: run `32618596436`, CI 799 attempt 1, `completed / success` on the exact merge SHA;
- exact-main status: `pom-rx/exact-main-ci = success`, target run `32618596436`;
- exact-merge assurance: PR #125 comment `5384274893` = `POST_MERGE_ASSURANCE_PASS`;
- source-head -> merge comparison: one merge commit, zero changed files.

PR #125 changed only canonical coordination/product-position documents. It changed no runtime, protocol, Gate, Witness, verifier or Wallet Guard/provider semantics.

## current_control_plane_reconciliation

PR #126 — `docs(pom-rx): reconcile assured PR125 and Promise transport blocker` — is the scoped non-Tier-B reconciliation from exact trusted main `1989bb88ae2eee6ae32328f2df4cc056c0dd27d4`.

Branch: `docs/pom-rx-post-pr125-live-architecture-reconcile-20260823`.

Owned continuation files for this bounded lot are exactly:

- `docs/project-management/pom-rx-core/POM_RX_RESUME_CHECKPOINT.md`;
- `docs/project-management/pom-rx-core/POM_RX_TASKS.yaml`;
- `docs/project-management/pom-rx-core/POM_RX_BLOCKERS.md`;
- `docs/project-management/pom-rx-core/POM_RX_TEAM_ROSTER.md`;
- `docs/product/POM_RX_CAPABILITY_MAP.md`.

No runtime, test, protocol, Gate, Witness, verifier, Wallet Guard/provider, wallet/network, public-site/Vercel or financial-execution semantics change in this reconciliation.

First candidate `63f59614283b0f2074943b81b7c6b3252720ffc3` had canonical CI `32619459374` / CI 800 attempt 1 = `success`, but the genuinely distinct `chatgpt-codex-connector` review found P2 `PRRT_kwDOTiNyWc6bdRTY`: the canonical task-ledger regression criterion required zero authorization/forwarding but did not also require clean process survival/no orphaned provider-rejection termination. The single documentation writer repaired that acceptance criterion. The head moved, so CI 800 and all review conclusions on `63f596...` are historical for release. The exact current PR #126 head and any fresh gate state are recorded in the live PR conversation after the final checkpoint commit because a versioned file cannot self-embed the SHA of the commit that contains itself without recursively changing that SHA.

## active_runtime_task

### PR #120 — Wallet Guard rejected-Promise transport prerequisite repair

Live GitHub at this checkpoint:

- PR: `#120`, `OPEN / NOT TRUSTED / BLOCKED`;
- branch: `automation/pom-rx-promise-drift-repair-20260822`;
- exact live head: `5238b9c289476100c875ed9a88bd7e21a574fa67`;
- current trusted main: `1989bb88ae2eee6ae32328f2df4cc056c0dd27d4`;
- compare current main -> head: `diverged`, ahead 69 / behind 15, merge-base `73f3921984449ffd6025f6c9b99b0220f0bf068b`;
- GitHub mergeability: `false` at this revalidation; mergeability is volatile conflict metadata only;
- exact-head CI `32614831929` / CI 792 attempt 1 = `success`, but historical after main moved and a false-PASS for the current P1;
- release-owner review `5001566041` = `PASS_NON_INDEPENDENT`, historical and not current release evidence;
- genuinely distinct exact-head Codex finding: unresolved P1 `PRRT_kwDOTiNyWc6bc4gh`;
- merge: `BLOCKED`.

Current P1 `PRRT_kwDOTiNyWc6bc4gh`: a rejected same-realm native Promise with a non-configurable own unsafe data `constructor`, for example `constructor: 1`, can make constructor shadowing throw before the captured rejection reaction is attached. Under `--unhandled-rejections=strict`, the gateway fails closed but the original rejection can remain orphaned and terminate the process.

### Promise drain feasibility finding

Do **not** treat “call the captured `Promise.prototype.then` first” as a proven repair. ECMAScript 2026 §27.2.5.4 specifies that `Promise.prototype.then` performs `SpeciesConstructor(promise, %Promise%)` and `NewPromiseCapability(C)` **before** `PerformPromiseThen`, which is the step that attaches the reactions. Therefore an unsafe/non-configurable effective constructor can make ordinary same-realm `then` fail before a rejection reaction is attached. The normative reference is:

`https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html#sec-promise.prototype.then`

No standards-based same-realm userland drain path that bypasses that constructor/species resolution is currently demonstrated in this repository. This does not prove that no implementation strategy exists; it means the current P1 must be treated as an architecture/trust-boundary blocker rather than repaired by speculative reordering.

The next Tier-B design must choose and review a smaller, truthful boundary. Candidate directions include rejecting/declassifying decorated native Promise transports before they can originate, isolating the provider boundary so an orphaned hostile rejection cannot terminate the trusted process, or narrowing the supported transport contract. Do not add process-global `unhandledRejection`/`uncaughtException` swallowing, do not execute hostile constructor/species accessors or Proxy paths, and do not silently trust attacker-selected species constructors.

Any chosen repair requires a CI-wired `--unhandled-rejections=strict` regression for the non-configurable unsafe data-constructor case proving all of: fail-closed result, zero reference authorization, zero sensitive forwarding, **clean child-process survival**, and no orphaned provider-rejection termination within the supported contract.

Six PR #120 P1/P2 threads remain unresolved attack history:

- `PRRT_kwDOTiNyWc6bZjxp` — P1;
- `PRRT_kwDOTiNyWc6bZ6tx` — P1;
- `PRRT_kwDOTiNyWc6bZ6tz` — P2;
- `PRRT_kwDOTiNyWc6baFkR` — P1;
- `PRRT_kwDOTiNyWc6baIxZ` — P1;
- `PRRT_kwDOTiNyWc6bc4gh` — P1 current finding.

Do not resolve them merely because partial repairs exist. Closure requires one frozen repaired and current-main-reconciled exact head with green canonical CI, the mandatory five-stage owner gate, a fresh genuinely distinct exact-head review and zero unresolved P0/P1/P2.

## blocked_historical_prs

PR #97 is live `OPEN / STALE / MUST_NOT_MERGE` at exact head `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`, currently non-mergeable. Reconstruct durable claim-before-observer/downstream composition later from then-current trusted main only after PR #120 receives exact-merge `POST_MERGE_ASSURANCE_PASS`.

PR #93 is live `OPEN / STALE / UNTRUSTED / LATER` at exact head `c4e40ceb286f4e59657767661daed15d2b68e9a7`, currently non-mergeable. Historical green CI/reviews are not release evidence; useful work must be reconciled later from then-current trusted main.

## architecture_and_claim_boundary

Shared canonicalization, hashing, verifier, Witness, exact authorization, Gate, execution-evidence and observation/reconciliation semantics remain Core-owned. Wallet Guard remains an application profile. Trusted main contains a process-local single-use Gate and a separate filesystem durable claim primitive; durable composition is not yet trusted.

The Wallet Guard README on trusted main already states that bootstrap origin/provider authorities are trusted installation inputs. That existing trust assumption is relevant to the upcoming architecture decision, but it must not be silently widened into a claim that arbitrary/decorated provider Promise transports are safe. If the provider Promise object itself remains inside the trusted bootstrap assumption, that boundary must be explicit and independently reviewed; if hostile provider transport objects remain in scope, isolation or another mechanism must actually prove process survival.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded. It is not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.

## next_safe_actions

1. Freeze the repaired PR #126 candidate after this checkpoint commit, obtain fresh canonical exact-head CI and fresh five-stage owner + genuinely distinct exact-head review, and resolve P2 `PRRT_kwDOTiNyWc6bdRTY` only on same-SHA evidence.
2. Merge PR #126 only if decision-time main/head/CI/reviews/threads remain unchanged with zero unresolved P0/P1/P2, then immediately perform exact-merge-SHA post-merge assurance.
3. After this reconciliation becomes trusted, perform a bounded read-only architecture/security decision for PR #120's rejected-Promise transport boundary before any new runtime write.
4. Do not accept a repair that merely reorders `Promise.prototype.then`; require evidence that the selected boundary prevents an orphaned strict rejection without executing hostile constructor/species/Proxy code or weakening fail-closed behavior.
5. Once a design is selected, reconcile the PR #120 stream to then-current exact trusted main using one writer, implement the smallest repair plus strict regression, and freeze the moved head.
6. Require fresh canonical exact-head CI, the mandatory five-stage owner gate with concrete Promise/species/accessor/Proxy/strict-unhandled/thenable/Array-poisoning hypotheses, and a fresh genuinely distinct exact-head `chatgpt-codex-connector` review.
7. Resolve the six PR #120 P1/P2 threads only when same-SHA evidence justifies closure; merge only with zero unresolved P0/P1/P2 and unchanged decision-time main/head/CI/review state.
8. Immediately run exact-merge-SHA post-merge assurance after any merge.
9. Only after PR #120 becomes trusted, reconstruct durable Gate composition as a fresh bounded Core lot; reconcile PR #93 later in dependency order.

## safety_boundary

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction, meaningful funds or uncontrolled malicious-site interaction is authorized. Burner local/testnet E2E remains behind a separate explicit human gate. Public website/Vercel/funding-directory writes are outside this control plane.
