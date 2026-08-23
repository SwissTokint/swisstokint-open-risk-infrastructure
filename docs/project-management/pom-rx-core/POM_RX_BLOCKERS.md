# POM-RX Core — Active Blockers

Updated: `2026-08-23T06:10:00+02:00`

Current trusted main: `73f3921984449ffd6025f6c9b99b0220f0bf068b`

This file lists current blockers only. Historical detail remains in Git history and PR review threads. Live GitHub wins whenever a PR head, CI run, review, thread, mergeability signal or merge changes after this checkpoint.

## Trusted coordination state

PR #123 exact source head `6cac168b775b26b572336764271b4f25e934a5ea` merged as exact main SHA `73f3921984449ffd6025f6c9b99b0220f0bf068b`.

- distinct exact-head evidence: `chatgpt-codex-connector[bot]` comment `5383774814`, reviewed `6cac168b77`, no major issues;
- canonical exact-main push CI: `32614549879` / CI 789 attempt 1 = `success`;
- exact-merge assurance: PR #123 comment `5383940027` = `POST_MERGE_ASSURANCE_PASS`.

PR #123 changed only coordination/product-position documents and does not make open Tier-B work trusted.

## `CONTROL_PLANE_STALE_AFTER_PR123_AND_PR120_FRESH_P1`

Trusted `main` still contains canonical continuation files that name the pre-PR123 trusted state `cff851b92746af09c224451c82d3da9c3bae176a` / PR #122 and do not contain the fresh exact-head independent P1 now present on PR #120.

Required closure is the scoped non-Tier-B reconciliation on branch `docs/pom-rx-post-pr123-live-reconcile-20260823`, limited to `POM_RX_RESUME_CHECKPOINT.md`, `POM_RX_TASKS.yaml`, `POM_RX_BLOCKERS.md`, `POM_RX_TEAM_ROSTER.md` and `POM_RX_CAPABILITY_MAP.md`. It changes no runtime, test, protocol, Gate, Witness, verifier, Wallet Guard/provider, wallet/network, public-site/Vercel or financial-execution semantics.

Until this reconciliation passes its applicable exact-head gates and exact-merge assurance, live GitHub remains the dependency/readiness source of truth.

## `PR120_EXACT_HEAD_CODEX_P1_NONCONFIGURABLE_UNSAFE_DATA_CONSTRUCTOR`

PR #120 is **OPEN / NOT TRUSTED / BLOCKED** at exact head `5238b9c289476100c875ed9a88bd7e21a574fa67`.

Current exact state:

- current trusted main: `73f3921984449ffd6025f6c9b99b0220f0bf068b`;
- PR branch reconciliation merge: `e4c8d4b29cdc875d17c170d6e67a0fd7804d849d`;
- current-main -> head compare: `ahead`, ahead 69 / behind 0, merge-base exactly `73f3921984449ffd6025f6c9b99b0220f0bf068b`;
- GitHub mergeability at revalidation: `true` (volatile conflict metadata only);
- exact-head canonical CI: `32614831929` / CI 792 attempt 1 = `success`;
- release-owner five-stage review `5001566041` = `PASS_NON_INDEPENDENT`, owner findings `0 P0 / 0 P1 / 0 P2`;
- fresh genuinely distinct exact-head `chatgpt-codex-connector` review found current P1 `PRRT_kwDOTiNyWc6bc4gh`;
- merge: `BLOCKED`.

P1 `PRRT_kwDOTiNyWc6bc4gh`: for a rejected same-realm native Promise with a non-configurable own unsafe data `constructor`, e.g. `constructor: 1`, the safety classifier rejects the constructor path and the current fallback attempts to shadow `constructor` before attaching the captured rejection reaction. The shadowing `defineProperty` is impossible and throws first. Under `--unhandled-rejections=strict`, the Wallet Guard call fails closed but the original rejected Promise can remain orphaned and terminate the process.

CI 792 is therefore a **false-PASS for this fresh attack family**. The existing non-configurable-constructor regression uses the safe captured `Promise` value and does not falsify `constructor: 1`.

Required repair is bounded: attach/drain the rejected transport without requiring successful attacker-controlled constructor shadowing first; do not execute hostile constructor/species accessors or Proxy paths; do not silently trust attacker-selected species constructors; add a CI-wired strict regression for the non-configurable unsafe data-constructor case that proves fail-closed behavior with zero reference authorization and zero sensitive forwarding. Any repair moves the head and invalidates CI 792 and all exact-head review evidence for release.

## `PR120_HISTORICAL_REVIEW_THREADS_REQUIRE_REPAIRED_FINAL_EXACT_HEAD_VALIDATION`

Six distinct Codex P1/P2 threads are unresolved attack history:

- `PRRT_kwDOTiNyWc6bZjxp` — P1 rejected transport could fail validation before a rejection reaction was attached;
- `PRRT_kwDOTiNyWc6bZ6tx` — P1 fallible constructor pinning preceded the rejection reaction;
- `PRRT_kwDOTiNyWc6bZ6tz` — P2 strict rejected-transport regression was absent from canonical `npm test` at that reviewed head;
- `PRRT_kwDOTiNyWc6baFkR` — P1 non-extensible rejected native Promise with nonstandard prototype could reach fallible constructor shadowing;
- `PRRT_kwDOTiNyWc6baIxZ` — P1 Wallet Guard capability-map product-position invariant was removed at that reviewed head;
- `PRRT_kwDOTiNyWc6bc4gh` — P1 current exact-head non-configurable unsafe data constructor can reach impossible shadowing before drain reaction.

Do not resolve these threads merely because partial repairs exist. Closure requires one frozen repaired candidate with green exact-head CI, the mandatory five-stage owner gate, a fresh genuinely distinct exact-head review and zero unresolved P0/P1/P2.

## `PR97_STALE_HISTORICAL_BRANCH_MUST_NOT_MERGE`

Historical PR #97 remains open and **must not merge**.

- exact live head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- GitHub mergeability at revalidation: `false`;
- review history still contains unresolved P1 classes.

Do not merge, rebase, revive or wholesale-copy PR #97. Durable claim-before-observer/downstream composition remains a separate future bounded Core lot reconstructed from then-current trusted main only after PR #120 receives exact-merge `POST_MERGE_ASSURANCE_PASS`.

## `CORE_DURABLE_GATE_COMPOSITION_NOT_YET_TRUSTED`

Trusted main contains a process-local single-use Gate and a separate filesystem durable claim primitive. Reviewed durable claim-before-observer/downstream composition is not trusted.

## `PR93_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED_LATER`

PR #93 remains open, stale and untrusted.

- exact live head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- GitHub mergeability at revalidation: `false`;
- unresolved review history still contains P1/P2 exact-value, wrapper, reflection and canonicalization/hash classes.

Its historical green CI is not release evidence. Keep PR #93 ordered after trusted PR #120 and required shared-Core work unless a separately reviewed dependency-order change is recorded.

## `DAGR_SOURCE_DOCUMENT_MISSING`

Normative DAGR/profile work remains source-gated. Do not invent normative text, controls, scores or claims without authorized source material.

## `PRODUCTION_TRUST_UNPROVED`

Production issuer/operator authorization, trusted time, KMS/HSM custody, distributed revocation/consensus, crash recovery, external observer independence, external execution/effect truth and arbitrary browser/provider integrity remain unproved.

## `REAL_WALLET_NOT_AUTHORIZED`

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction or meaningful funds are authorized. Burner local/testnet E2E remains behind a separate explicit human authorization gate.

## Current dependency and merge rule

A dependency becomes trusted only after the mandatory five-stage pre-merge gate, all applicable exact-head technical/security gates, canonical exact-head CI, every required genuinely distinct exact-head independent review, zero unresolved P0/P1/P2, merge, exact-main CI and exact-merge `POST_MERGE_ASSURANCE_PASS`. A moved head invalidates exact-head evidence. The independent-review waiver remains limited to PR #60.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded — not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.
