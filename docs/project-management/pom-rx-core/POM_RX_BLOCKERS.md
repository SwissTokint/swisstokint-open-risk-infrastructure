# POM-RX Core — Active Blockers

Updated: `2026-08-23T09:16:00+02:00`

Current trusted main: `7f4b0f7baf5c0fbed1c75b7b2b5fd0a643974411`

This file lists current blockers only. Historical detail remains in Git history and PR review threads. Live GitHub wins whenever a PR head, CI run, review, thread, mergeability signal or merge changes after this checkpoint.

## Trusted coordination state

PR #126 exact source head `520b231acfcdb896e0ce01ce52fae18f490bf408` merged as exact main SHA `7f4b0f7baf5c0fbed1c75b7b2b5fd0a643974411`.

- canonical source-head CI: `32619624022` / CI 802 attempt 1 = `success`;
- release-owner five-stage review: `5001707331` = `PASS_NON_INDEPENDENT`, owner findings `0 P0 / 0 P1 / 0 P2`;
- distinct exact-head evidence: `chatgpt-codex-connector[bot]` comment `5384371632`, reviewed `520b231acf`, no major issues;
- historical reconciliation P2 `PRRT_kwDOTiNyWc6bdRTY` was resolved only after same-head validation;
- pre-merge decision: comment `5384577930`;
- canonical exact-main push CI: `32622491799` / CI 803 attempt 1 = `success`;
- exact-main status `pom-rx/exact-main-ci = success` targeted run `32622491799` at assurance time;
- exact-merge assurance: PR #126 comment `5384587913` = `POST_MERGE_ASSURANCE_PASS`;
- reviewed source head -> exact merge comparison adds zero changed files.

PR #126 changed only coordination/product-position documents and does not make open Tier-B work trusted.

## `CONTROL_PLANE_STALE_AFTER_PR126`

The versioned files merged by PR #126 necessarily still name the pre-merge trusted parent `1989bb88ae2eee6ae32328f2df4cc056c0dd27d4`, while live GitHub is now assured exact main `7f4b0f7baf5c0fbed1c75b7b2b5fd0a643974411`.

Required closure is scoped PR #127 on branch `docs/pom-rx-post-pr126-live-reconcile-20260823`, limited to exactly:

- `POM_RX_RESUME_CHECKPOINT.md`;
- `POM_RX_TASKS.yaml`;
- `POM_RX_BLOCKERS.md`;
- `POM_RX_TEAM_ROSTER.md`;
- `docs/product/POM_RX_CAPABILITY_MAP.md`.

It changes no runtime, test, protocol, Gate, Witness, verifier, Wallet Guard/provider, wallet/network, public-site/Vercel or financial-execution semantics.

The first PR #127 candidate `d23b71284a2e5a13a071ece7d96e079b000df517` passed CI `32624912179` / CI 804 and owner review `5001873024`, but distinct Codex review found P2 `PRRT_kwDOTiNyWc6bdxPp`: the docs required positive clean-process survival for an already-originated non-configurable-unsafe Promise while simultaneously placing that object outside the supported trusted-provider contract. The repaired moved head must receive wholly fresh gates; CI 804 and reviews on `d23b712...` are historical for release.

## `PR120_RECONCILE_TO_CURRENT_MAIN`

PR #120 is **OPEN / NOT TRUSTED / BLOCKED** at exact head `5238b9c289476100c875ed9a88bd7e21a574fa67`.

Current live state:

- trusted main: `7f4b0f7baf5c0fbed1c75b7b2b5fd0a643974411`;
- main -> PR head compare: `diverged`, ahead 69 / behind 23, merge-base `73f3921984449ffd6025f6c9b99b0220f0bf068b`;
- GitHub mergeability: `false` at this revalidation;
- exact-head CI `32614831929` / CI 792 attempt 1 = `success`, but historical after main moved and a false-PASS for the current P1;
- release-owner review `5001566041` = `PASS_NON_INDEPENDENT`, historical and unusable for current release;
- genuinely distinct Codex review found current P1 `PRRT_kwDOTiNyWc6bc4gh`;
- merge: `BLOCKED`.

Do not merge the stale branch or treat its historical green CI as release evidence. After PR #127 becomes trusted, one writer must reconcile PR #120 to then-current exact trusted main before any runtime repair is evaluated. Any head move invalidates old exact-head CI/review evidence.

## `PR120_P1_NONCONFIGURABLE_UNSAFE_DATA_CONSTRUCTOR`

P1 `PRRT_kwDOTiNyWc6bc4gh`: for a rejected same-realm native Promise with a non-configurable own unsafe data `constructor`, e.g. `constructor: 1`, current fallback shadowing can throw before a captured rejection reaction is attached. Under `--unhandled-rejections=strict`, Wallet Guard fails closed but the original rejected Promise can remain orphaned and terminate the process.

Under the accepted contract-narrowing direction this exact already-originated hostile Promise is **outside** the supported local-provider transport contract. That does not erase the finding. It changes the required proof: the supported controlled-provider path must be shown unable to originate the excluded transport before the gateway relies on it, while an in-contract rejected transport separately proves strict clean-process survival. If the product instead wants to survive the already-originated hostile object, a separately reviewed isolation boundary is required.

An in-contract survival test must never be presented as if it reproduces or closes direct same-process survival for the excluded hostile Promise.

## `PR120_ARCHITECTURE_DECISION_ACCEPTED_BUT_NOT_IMPLEMENTED`

Read-only architecture/security decision is persisted in PR #126 comment `5384571039`.

For the current local prototype, the selected direction is an explicit narrow **trusted-provider transport contract**, not another same-realm Promise reorder/shadow trick.

Inside the supported contract, rejection handling must prove:

- fail closed;
- zero reference authorization;
- zero sensitive forwarding;
- clean process survival under `--unhandled-rejections=strict`;
- no orphaned provider-rejection termination.

Decorated/rebased/Proxy/accessor/non-configurable-unsafe-constructor Promise objects are excluded from that supported contract. The contract-narrowing route therefore requires **pre-origin conformance evidence** that the controlled trusted provider/adapter cannot emit those excluded transports on the supported path. It does not require direct positive same-process survival after such an object has already been returned.

A future claim of graceful survival against an intentionally hostile provider or an already-originated excluded rejected Promise requires a separately reviewed isolation boundary such as process/worker/RPC isolation.

The selected design must not:

- install process-global `unhandledRejection` or `uncaughtException` swallowing;
- execute hostile constructor/species accessors;
- traverse/execute Proxy constructor/species paths;
- silently trust attacker-selected species constructors;
- weaken `--unhandled-rejections=strict` regression coverage;
- convert an unknown/failure state into authorization or forwarding.

ECMAScript 2026 §27.2.5.4 remains the key constraint: ordinary `Promise.prototype.then` runs `SpeciesConstructor` and `NewPromiseCapability` before `PerformPromiseThen`, so reorder-only draining is not accepted as a universal proof.

Normative reference:

`https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html#sec-promise.prototype.then`

The architecture decision does not by itself close the current P1 or make PR #120 trusted.

## `PR120_REVIEW_THREADS_REQUIRE_REPAIRED_FINAL_EXACT_HEAD_VALIDATION`

Six distinct P1/P2 threads remain unresolved attack history:

- `PRRT_kwDOTiNyWc6bZjxp` — P1 rejected transport could fail before a rejection reaction was attached;
- `PRRT_kwDOTiNyWc6bZ6tx` — P1 fallible constructor pinning preceded the rejection reaction;
- `PRRT_kwDOTiNyWc6bZ6tz` — P2 strict rejected-transport regression was absent from canonical `npm test` at that reviewed head;
- `PRRT_kwDOTiNyWc6baFkR` — P1 non-extensible rejected native Promise with nonstandard prototype could reach fallible constructor shadowing;
- `PRRT_kwDOTiNyWc6baIxZ` — P1 Wallet Guard capability-map product-position invariant was removed at that reviewed head;
- `PRRT_kwDOTiNyWc6bc4gh` — P1 current unsafe non-configurable data constructor can reach impossible shadowing before drain reaction.

Do not resolve these merely because partial repairs or claim narrowing exist. Closure requires one frozen current-main-reconciled candidate with green exact-head CI, the mandatory five-stage owner gate, a fresh genuinely distinct exact-head review and zero unresolved P0/P1/P2. For `PRRT_kwDOTiNyWc6bc4gh`, the exact-head reviewer must explicitly validate either (a) the supported-path pre-origin contract proof plus separate in-contract strict survival and the hostile case as a truthful unsupported limitation, or (b) a real isolation repair. A different in-contract test cannot stand in for the hostile object.

## `PR97_STALE_HISTORICAL_BRANCH_MUST_NOT_MERGE`

PR #97 remains live `OPEN / STALE / MUST_NOT_MERGE` at exact head `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`, currently non-mergeable. Do not merge, rebase, revive or wholesale-copy it. Durable claim-before-observer/downstream composition remains a future bounded Core lot reconstructed from then-current trusted main only after PR #120 receives exact-merge `POST_MERGE_ASSURANCE_PASS`.

## `CORE_DURABLE_GATE_COMPOSITION_NOT_YET_TRUSTED`

Trusted main contains a process-local single-use Gate and a separate filesystem durable claim primitive. Reviewed durable claim-before-observer/downstream composition is not trusted.

## `PR93_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED_LATER`

PR #93 remains live `OPEN / STALE / UNTRUSTED / LATER` at exact head `c4e40ceb286f4e59657767661daed15d2b68e9a7`, currently non-mergeable. Historical green CI/reviews are not release evidence. Keep it ordered after trusted PR #120 and required shared-Core work unless a separately reviewed dependency-order change is recorded.

## `DAGR_SOURCE_DOCUMENT_MISSING`

Normative DAGR/profile work remains source-gated. Do not invent normative text, controls, scores or claims without authorized source material.

## `PRODUCTION_TRUST_UNPROVED`

Production issuer/operator authorization, trusted time, KMS/HSM custody, distributed revocation/consensus, crash recovery, external observer independence, external execution/effect truth and arbitrary browser/provider integrity remain unproved.

## `REAL_WALLET_NOT_AUTHORIZED`

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction or meaningful funds are authorized. Burner local/testnet E2E remains behind a separate explicit human authorization gate.

## Current dependency and merge rule

A dependency becomes trusted only after the mandatory five-stage pre-merge gate, all applicable exact-head technical/security gates, canonical exact-head CI, every required genuinely distinct exact-head independent review, zero unresolved P0/P1/P2, merge, exact-main CI and exact-merge `POST_MERGE_ASSURANCE_PASS`. A moved head invalidates exact-head evidence. The independent-review waiver remains limited to PR #60.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded — not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.
