# POM-RX Core — Active Blockers

Updated: `2026-08-23T06:37:00+02:00`

Current trusted main: `097937acf19338bdaab54050d64f18195d9b4a33`

This file lists current blockers only. Historical detail remains in Git history and PR review threads. Live GitHub wins whenever a PR head, CI run, review, thread, mergeability signal or merge changes after this checkpoint.

## Trusted coordination state

PR #124 exact source head `43c331244ac608725aec63d46fa281dc78d39f0d` merged as exact main SHA `097937acf19338bdaab54050d64f18195d9b4a33`.

- canonical source-head CI: `32617450870` / CI 793 attempt 1 = `success`;
- release-owner five-stage review: `5001642141` = `PASS_NON_INDEPENDENT`, owner findings `0 P0 / 0 P1 / 0 P2`;
- distinct exact-head evidence: `chatgpt-codex-connector[bot]` comment `5384176703`, reviewed `43c331244a`, no major issues;
- pre-merge decision: comment `5384202384`;
- canonical exact-main push CI: `32617884521` / CI 794 attempt 1 = `success`;
- exact-main status `pom-rx/exact-main-ci = success` targets run `32617884521`;
- exact-merge assurance: PR #124 comment `5384213312` = `POST_MERGE_ASSURANCE_PASS`;
- reviewed source head -> exact merge comparison adds zero changed files.

PR #124 changed only coordination/product-position documents and does not make open Tier-B work trusted.

## `CONTROL_PLANE_STALE_AFTER_PR124`

PR #124 is merged and post-merge assured at exact main `097937acf19338bdaab54050d64f18195d9b4a33`, while the versioned files it merged necessarily name the pre-merge parent `73f3921984449ffd6025f6c9b99b0220f0bf068b`.

Required closure is the scoped non-Tier-B reconciliation on branch `docs/pom-rx-post-pr124-live-reconcile-20260823`, limited to `POM_RX_RESUME_CHECKPOINT.md`, `POM_RX_TASKS.yaml`, `POM_RX_BLOCKERS.md`, `POM_RX_TEAM_ROSTER.md` and `POM_RX_CAPABILITY_MAP.md`. It changes no runtime, test, protocol, Gate, Witness, verifier, Wallet Guard/provider, wallet/network, public-site/Vercel or financial-execution semantics.

Independent review of the first candidate found P2 `PRRT_kwDOTiNyWc6bdJ1q`: its owned-file manifest omitted `POM_RX_TEAM_ROSTER.md` despite that file being in the diff. The moved current candidate repairs the manifest in RESUME/TASKS/BLOCKERS; prior CI/review evidence is historical until fresh same-head gates complete.

Until this reconciliation passes its applicable exact-head gates and exact-merge assurance, live GitHub remains the dependency/readiness source of truth and PR #120 runtime work must not use stale exact-main fields as release evidence.

## `PR120_RECONCILE_TO_CURRENT_MAIN_AND_REPAIR_FRESH_P1`

PR #120 is **OPEN / NOT TRUSTED / BLOCKED** at exact head `5238b9c289476100c875ed9a88bd7e21a574fa67`.

Current exact state after PR #124 merged:

- current trusted main: `097937acf19338bdaab54050d64f18195d9b4a33`;
- current-main -> PR head compare: `diverged`, ahead 69 / behind 6, merge-base `73f3921984449ffd6025f6c9b99b0220f0bf068b`;
- previous PR-branch reconciliation merge: `e4c8d4b29cdc875d17c170d6e67a0fd7804d849d`;
- exact-head CI `32614831929` / CI 792 attempt 1 = `success`, but historical after main moved and a false-PASS for the fresh P1;
- release-owner review `5001566041` = `PASS_NON_INDEPENDENT`, no longer usable release evidence;
- genuinely distinct exact-head Codex review found P1 `PRRT_kwDOTiNyWc6bc4gh`;
- merge: `BLOCKED`.

Before any runtime repair, reconcile the existing PR #120 stream to exact trusted main `097937acf19338bdaab54050d64f18195d9b4a33`. Any resulting head move invalidates prior CI/review evidence.

## `PR120_EXACT_HEAD_CODEX_P1_NONCONFIGURABLE_UNSAFE_DATA_CONSTRUCTOR`

P1 `PRRT_kwDOTiNyWc6bc4gh`: for a rejected same-realm native Promise with a non-configurable own unsafe data `constructor`, e.g. `constructor: 1`, the safety classifier can reject the constructor path and the current fallback can attempt to shadow `constructor` before attaching the captured rejection reaction. The shadowing `defineProperty` is impossible and throws first. Under `--unhandled-rejections=strict`, the Wallet Guard call fails closed but the original rejected Promise can remain orphaned and terminate the process.

Required repair is bounded: after current-main reconciliation, attach/drain the rejected transport without requiring successful attacker-controlled constructor shadowing first; do not execute hostile constructor/species accessors or Proxy paths; do not silently trust attacker-selected species constructors; add a CI-wired strict regression for the non-configurable unsafe data-constructor case that proves fail-closed behavior with zero reference authorization and zero sensitive forwarding.

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

PR #97 remains `OPEN / STALE / MUST_NOT_MERGE` at exact head `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`. Do not merge, rebase, revive or wholesale-copy it. Durable claim-before-observer/downstream composition remains a future bounded Core lot reconstructed from then-current trusted main only after PR #120 receives exact-merge `POST_MERGE_ASSURANCE_PASS`.

## `CORE_DURABLE_GATE_COMPOSITION_NOT_YET_TRUSTED`

Trusted main contains a process-local single-use Gate and a separate filesystem durable claim primitive. Reviewed durable claim-before-observer/downstream composition is not trusted.

## `PR93_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED_LATER`

PR #93 remains `OPEN / STALE / UNTRUSTED / LATER` at exact head `c4e40ceb286f4e59657767661daed15d2b68e9a7`. Historical green CI/reviews are not release evidence. Keep it ordered after trusted PR #120 and required shared-Core work unless a separately reviewed dependency-order change is recorded.

## `DAGR_SOURCE_DOCUMENT_MISSING`

Normative DAGR/profile work remains source-gated. Do not invent normative text, controls, scores or claims without authorized source material.

## `PRODUCTION_TRUST_UNPROVED`

Production issuer/operator authorization, trusted time, KMS/HSM custody, distributed revocation/consensus, crash recovery, external observer independence, external execution/effect truth and arbitrary browser/provider integrity remain unproved.

## `REAL_WALLET_NOT_AUTHORIZED`

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction or meaningful funds are authorized. Burner local/testnet E2E remains behind a separate explicit human authorization gate.

## Current dependency and merge rule

A dependency becomes trusted only after the mandatory five-stage pre-merge gate, all applicable exact-head technical/security gates, canonical exact-head CI, every required genuinely distinct exact-head independent review, zero unresolved P0/P1/P2, merge, exact-main CI and exact-merge `POST_MERGE_ASSURANCE_PASS`. A moved head invalidates exact-head evidence. The independent-review waiver remains limited to PR #60.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded — not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.
