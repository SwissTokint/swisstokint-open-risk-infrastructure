# POM-RX Core — Active Blockers

Updated: `2026-08-23T06:54:00+02:00`

Current trusted main: `1989bb88ae2eee6ae32328f2df4cc056c0dd27d4`

This file lists current blockers only. Historical detail remains in Git history and PR review threads. Live GitHub wins whenever a PR head, CI run, review, thread, mergeability signal or merge changes after this checkpoint.

## Trusted coordination state

PR #125 exact source head `c9f00b13cdc3aa654004d6fb7c8740b23c936e96` merged as exact main SHA `1989bb88ae2eee6ae32328f2df4cc056c0dd27d4`.

- canonical source-head CI: `32618322165` / CI 798 attempt 1 = `success`;
- release-owner five-stage review: `5001667406` = `PASS_NON_INDEPENDENT`, owner findings `0 P0 / 0 P1 / 0 P2`;
- distinct exact-head evidence: `chatgpt-codex-connector[bot]` comment `5384255481`, reviewed `c9f00b13cd`, no major issues;
- pre-merge decision: comment `5384262424`;
- canonical exact-main push CI: `32618596436` / CI 799 attempt 1 = `success`;
- exact-main status `pom-rx/exact-main-ci = success` targets run `32618596436`;
- exact-merge assurance: PR #125 comment `5384274893` = `POST_MERGE_ASSURANCE_PASS`;
- reviewed source head -> exact merge comparison adds zero changed files.

PR #125 changed only coordination/product-position documents and does not make open Tier-B work trusted.

## `CONTROL_PLANE_STALE_AFTER_PR125`

The versioned files merged by PR #125 necessarily still name the prior PR #124 checkpoint. Live GitHub is now assured exact main `1989bb88ae2eee6ae32328f2df4cc056c0dd27d4`.

Required closure is the scoped non-Tier-B reconciliation on branch `docs/pom-rx-post-pr125-live-architecture-reconcile-20260823`, limited to exactly:

- `POM_RX_RESUME_CHECKPOINT.md`;
- `POM_RX_TASKS.yaml`;
- `POM_RX_BLOCKERS.md`;
- `POM_RX_TEAM_ROSTER.md`;
- `docs/product/POM_RX_CAPABILITY_MAP.md`.

It changes no runtime, test, protocol, Gate, Witness, verifier, Wallet Guard/provider, wallet/network, public-site/Vercel or financial-execution semantics.

## `PR120_RECONCILE_TO_CURRENT_MAIN`

PR #120 is **OPEN / NOT TRUSTED / BLOCKED** at exact head `5238b9c289476100c875ed9a88bd7e21a574fa67`.

Current live state:

- trusted main: `1989bb88ae2eee6ae32328f2df4cc056c0dd27d4`;
- main -> PR head compare: `diverged`, ahead 69 / behind 15, merge-base `73f3921984449ffd6025f6c9b99b0220f0bf068b`;
- GitHub mergeability: `false` at this revalidation; this is volatile conflict metadata only;
- exact-head CI `32614831929` / CI 792 attempt 1 = `success`, but historical after main moved and a false-PASS for the current P1;
- release-owner review `5001566041` = `PASS_NON_INDEPENDENT`, historical and unusable for current release;
- genuinely distinct Codex review found current P1 `PRRT_kwDOTiNyWc6bc4gh`;
- merge: `BLOCKED`.

Do not write more runtime on this stale base. After the current control-plane reconciliation becomes trusted and a bounded architecture decision is recorded, reconcile the existing PR #120 stream to then-current trusted main with exactly one writer. Any head move invalidates prior exact-head CI/review evidence.

## `PR120_P1_NONCONFIGURABLE_UNSAFE_DATA_CONSTRUCTOR`

P1 `PRRT_kwDOTiNyWc6bc4gh`: for a rejected same-realm native Promise with a non-configurable own unsafe data `constructor`, e.g. `constructor: 1`, current fallback shadowing can throw before a captured rejection reaction is attached. Under `--unhandled-rejections=strict`, Wallet Guard fails closed but the original rejected Promise can remain orphaned and terminate the process.

Zero reference authorization and zero sensitive forwarding are already required failure properties; they do not by themselves close the process-termination problem.

## `PR120_STANDARD_THEN_DRAIN_NOT_PROVEN`

A speculative “attach `Promise.prototype.then` before constructor shadowing” reorder is **not** an accepted repair.

ECMAScript 2026 §27.2.5.4 specifies this order for `Promise.prototype.then`:

1. `SpeciesConstructor(promise, %Promise%)`;
2. `NewPromiseCapability(C)`;
3. `PerformPromiseThen(...)`.

The reaction is attached only in `PerformPromiseThen`, so a hostile effective constructor/species path can throw before the reaction is installed. Normative reference:

`https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html#sec-promise.prototype.then`

No standards-based same-realm userland drain path bypassing this ordering is currently demonstrated in the repository. This is a design blocker, not a justification for weaker exception handling.

The next architecture/security decision must prefer a smaller truthful boundary. Candidate directions may include preventing decorated native Promise transports from entering this gateway contract, isolating the provider execution boundary so an orphaned hostile rejection cannot terminate the trusted process, or narrowing the supported transport contract. The selected design must not:

- install process-global `unhandledRejection` or `uncaughtException` swallowing;
- execute hostile constructor/species accessors;
- traverse/execute Proxy constructor/species paths;
- silently trust attacker-selected species constructors;
- weaken `--unhandled-rejections=strict` regression coverage;
- convert an unknown/failure state into authorization or forwarding.

## `PR120_REVIEW_THREADS_REQUIRE_REPAIRED_FINAL_EXACT_HEAD_VALIDATION`

Six distinct P1/P2 threads remain unresolved attack history:

- `PRRT_kwDOTiNyWc6bZjxp` — P1 rejected transport could fail before a rejection reaction was attached;
- `PRRT_kwDOTiNyWc6bZ6tx` — P1 fallible constructor pinning preceded the rejection reaction;
- `PRRT_kwDOTiNyWc6bZ6tz` — P2 strict rejected-transport regression was absent from canonical `npm test` at that reviewed head;
- `PRRT_kwDOTiNyWc6baFkR` — P1 non-extensible rejected native Promise with nonstandard prototype could reach fallible constructor shadowing;
- `PRRT_kwDOTiNyWc6baIxZ` — P1 Wallet Guard capability-map product-position invariant was removed at that reviewed head;
- `PRRT_kwDOTiNyWc6bc4gh` — P1 current unsafe non-configurable data constructor can reach impossible shadowing before drain reaction.

Do not resolve these merely because partial repairs exist. Closure requires one frozen repaired/current-main-reconciled candidate with green exact-head CI, the mandatory five-stage owner gate, a fresh genuinely distinct exact-head review and zero unresolved P0/P1/P2.

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
