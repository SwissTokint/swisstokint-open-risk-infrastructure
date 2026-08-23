# POM-RX Core — Active Blockers

Updated: `2026-08-23T05:13:00+02:00`

Current trusted main: `73f3921984449ffd6025f6c9b99b0220f0bf068b`

Live GitHub wins whenever a PR head, CI run, review, thread, mergeability signal or merge changes after this checkpoint.

## Trusted coordination state

PR #123 exact source head `6cac168b775b26b572336764271b4f25e934a5ea` merged as exact main SHA `73f3921984449ffd6025f6c9b99b0220f0bf068b`.

- distinct exact-head review: `chatgpt-codex-connector[bot]` comment `5383774814`, reviewed `6cac168b77`, no major issues;
- canonical exact-main push CI: `32614549879` / CI 789 attempt 1 = `success`;
- exact-merge assurance: PR #123 comment `5383940027` = `POST_MERGE_ASSURANCE_PASS`.

PR #123 is trusted coordination evidence only; it changes no runtime or Wallet Guard security semantics.

## `PR120_FRESH_EXACT_HEAD_RELEASE_GATES_REQUIRED_AFTER_MAIN_RECONCILIATION`

PR #120 is **OPEN / NOT TRUSTED / BLOCKED**.

The feature branch was reconciled to trusted main with merge commit `e4c8d4b29cdc875d17c170d6e67a0fd7804d849d` (parents: prior PR #120 head `2d01503c13b9b22ea136f6bbd169bc2032366b9a` and trusted main `73f3921984449ffd6025f6c9b99b0220f0bf068b`). This checkpoint moves the head again, so read the exact final candidate live after the commit.

CI `32609855025` / 785 on `2d01503c...` was green but is historical after the head moved. The post-reconciliation candidate requires fresh canonical exact-head CI, the complete five-stage release-owner gate, a fresh genuinely distinct exact-head `chatgpt-codex-connector` review, and zero unresolved P0/P1/P2. Any further head move invalidates that evidence.

## `PR120_HISTORICAL_REVIEW_THREADS_REQUIRE_FINAL_EXACT_HEAD_VALIDATION`

The following distinct Codex P1/P2 threads remain unresolved attack history:

- `PRRT_kwDOTiNyWc6bZjxp` — P1 rejected transport could fail validation before a rejection reaction was attached;
- `PRRT_kwDOTiNyWc6bZ6tx` — P1 fallible constructor pinning preceded the rejection reaction;
- `PRRT_kwDOTiNyWc6bZ6tz` — P2 strict rejected-transport regression was absent from canonical `npm test` at that reviewed head;
- `PRRT_kwDOTiNyWc6baFkR` — P1 non-extensible rejected native Promise with nonstandard prototype could reach fallible constructor shadowing;
- `PRRT_kwDOTiNyWc6baIxZ` — P1 Wallet Guard capability-map product-position invariant was removed.

Do not resolve these threads merely because repairs exist. Closure requires the frozen post-reconciliation candidate to prove zero unresolved P0/P1/P2 through fresh CI plus owner and distinct exact-head review evidence.

## `PR97_STALE_HISTORICAL_BRANCH_MUST_NOT_MERGE`

PR #97 remains open at exact head `0efb462f0b4b8cff62d664a51d13ad71306b6bbb` and **MUST NOT MERGE**. Do not rebase, revive or wholesale-copy it. Durable claim-before-observer/downstream composition must be reconstructed as a fresh bounded Core lot from then-current trusted main only after PR #120 receives exact-merge `POST_MERGE_ASSURANCE_PASS`.

## `CORE_DURABLE_GATE_COMPOSITION_NOT_YET_TRUSTED`

Trusted main contains a process-local single-use Gate and a separate filesystem durable claim primitive. Reviewed durable claim-before-observer/downstream composition is not trusted.

## `PR93_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED_LATER`

PR #93 remains open/stale/untrusted at exact head `c4e40ceb286f4e59657767661daed15d2b68e9a7`. Its historical green CI/reviews are not release evidence. Keep it ordered after trusted PR #120 and required shared-Core work unless a separately reviewed dependency-order change is recorded.

## `DAGR_SOURCE_DOCUMENT_MISSING`

Normative DAGR/profile work remains source-gated. Do not invent normative text, controls, scores or claims without authorized source material.

## `PRODUCTION_TRUST_UNPROVED`

Production issuer/operator authorization, trusted time, KMS/HSM custody, distributed revocation/consensus, crash recovery, external observer independence, external execution/effect truth and arbitrary browser/provider integrity remain unproved.

## `REAL_WALLET_NOT_AUTHORIZED`

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction or meaningful funds are authorized. Burner local/testnet E2E remains behind a separate explicit human authorization gate.

## Current dependency and merge rule

A dependency becomes trusted only after the mandatory five-stage pre-merge gate, all applicable exact-head technical/security gates, canonical exact-head CI, every required genuinely distinct exact-head independent review, zero unresolved P0/P1/P2, merge, exact-main CI and exact-merge `POST_MERGE_ASSURANCE_PASS`. A moved head invalidates exact-head evidence. The independent-review waiver remains limited to PR #60.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded — not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.
