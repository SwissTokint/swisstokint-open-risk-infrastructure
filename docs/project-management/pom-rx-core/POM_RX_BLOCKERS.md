# POM-RX Core — Active Blockers

Updated: `2026-08-23`.

Current trusted main: `87ed6ac814f868dc4599cb5d236babdeea8c3cc9`.

This file lists current blockers only. Historical detail remains in Git history and review threads. Live GitHub wins whenever a PR head, CI run, review, thread, mergeability signal or merge changes after this checkpoint.

## Trusted coordination state

PR #130 source head `ce1f2ca2f9358c11e836f1717dcedd9cb5c0caaa` merged as exact main SHA `87ed6ac814f868dc4599cb5d236babdeea8c3cc9`.

- source-head CI: `32635882670` / CI 820 attempt 1 = `success`;
- release-owner five-stage review: `5002253211` = `PASS_NON_INDEPENDENT / 0 P0 / 0 P1 / 0 P2`;
- genuinely distinct exact-head evidence: `chatgpt-codex-connector[bot]` comment `5385715573`, reviewed `ce1f2ca2f9`, no major issues;
- exact-main push CI: `32638722306` / CI 821 attempt 1 = `success`;
- exact-merge assurance: PR #130 comment `5385948152` = `POST_MERGE_ASSURANCE_PASS`;
- terminal trusted reconciliation checkpoint: PR #130 comment `5385949730`.

The prior five-file control-plane staleness blocker is closed by trusted PR #130.

## `FRESH_PROVIDER_TRANSPORT_TIER_B_IN_PROGRESS`

Fresh branch `automation/wg-trusted-provider-transport-20260823` was created directly from trusted main `87ed6ac...`. It is the current single-writer Tier-B lane and is **IN PROGRESS / NOT FROZEN / NOT RELEASE EVIDENCE**.

The bounded design is the explicit narrow trusted-provider transport contract. Current branch work adds an application-owned controlled provider transport and a `createWalletGuardTrustedProviderGateway()` path that requires module-private provenance before an arbitrary provider request can originate a transport.

Current branch evidence is not yet a release gate. Before the lot can be trusted it must settle whether the existing controlled-host path is rebound to the strict transport, pass canonical exact-head CI, pass the full five-stage owner gate, receive a fresh genuinely distinct exact-head review, clear all P0/P1/P2, merge without head/main drift and receive exact-merge assurance PASS.

Supported-path rejection requirements remain:

- fail closed;
- zero reference authorization;
- zero sensitive forwarding;
- clean child-process survival under `--unhandled-rejections=strict`;
- no orphaned provider-rejection termination.

The current regression set on the branch targets pre-origin rejection of unowned/Proxy providers, same-realm undecorated native transport origin, `Symbol.species` accessor drift without getter execution, inherited Array-then poisoning before transport origin, and strict in-contract rejected-context survival.

Decorated/rebased/Proxy/accessor/non-configurable-unsafe-constructor Promise objects from an arbitrary provider remain excluded. An already-originated excluded rejected Promise remains an explicit unsupported negative unless a separately reviewed process/worker/RPC isolation boundary is introduced. Do not claim that the in-contract strict fixture proves same-process survival of that hostile object.

Prohibited shortcuts remain process-global `unhandledRejection`/`uncaughtException` swallowing, hostile constructor/species accessor execution, hostile Proxy constructor/species traversal, silent trust of attacker-selected species, weakened strict tests, or fail-open authorization/forwarding.

## `PR120_CLOSED_NOT_MERGED_ATTACK_HISTORY`

PR #120 remains `CLOSED / NOT MERGED / STALE` at historical head `5238b9c289476100c875ed9a88bd7e21a574fa67`. Do not reopen, rebase, revive or wholesale-merge it.

Six P1/P2 review threads remain mandatory attack history:

- `PRRT_kwDOTiNyWc6bZjxp` — P1;
- `PRRT_kwDOTiNyWc6bZ6tx` — P1;
- `PRRT_kwDOTiNyWc6bZ6tz` — P2;
- `PRRT_kwDOTiNyWc6baFkR` — P1;
- `PRRT_kwDOTiNyWc6baIxZ` — P1;
- `PRRT_kwDOTiNyWc6bc4gh` — P1 final historical finding.

Closing PR #120 did not resolve those findings or make its code trusted.

## `PR97_STALE_HISTORICAL_BRANCH_MUST_NOT_MERGE`

PR #97 remains `OPEN / STALE / MUST_NOT_MERGE` at exact head `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`. Against trusted main `87ed6ac...` it is diverged, ahead 66 / behind 249, merge-base `0564aecd42cf0794894c12842980969ff59c9f73`. Historical green CI cannot clear unresolved findings. Do not merge/revive it.

## `CORE_DURABLE_GATE_COMPOSITION_NOT_YET_TRUSTED`

Trusted main contains a process-local single-use Gate and a separate filesystem durable claim primitive. Reviewed durable claim-before-observer/downstream composition is not trusted. Reconstruct it from then-current trusted main only after the fresh provider-transport prerequisite receives exact-merge `POST_MERGE_ASSURANCE_PASS`.

## `PR93_RECONCILIATION_AND_FRESH_REVIEW_REQUIRED_LATER`

PR #93 remains `OPEN / STALE / UNTRUSTED / LATER` at exact head `c4e40ceb286f4e59657767661daed15d2b68e9a7`. Against trusted main `87ed6ac...` it is diverged, ahead 86 / behind 294, merge-base `818718955c9e4136e9e55754a31be2f1c7b610f8`. Reconstruct useful simulation work later from trusted main rather than merging stale history wholesale.

## `DAGR_SOURCE_DOCUMENT_MISSING`

Normative DAGR/profile work remains source-gated. Do not invent normative text, controls, scores or claims without authorized source material.

## `PRODUCTION_TRUST_UNPROVED`

Production issuer/operator authorization, trusted time, KMS/HSM custody, distributed revocation/consensus, crash recovery, external observer independence, external execution/effect truth and arbitrary browser/provider integrity remain unproved.

## `REAL_WALLET_NOT_AUTHORIZED`

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction or meaningful funds are authorized. Burner local/testnet E2E remains behind a separate explicit human authorization gate.

## Current dependency and merge rule

A dependency becomes trusted only after the mandatory five-stage pre-merge gate, all applicable exact-head technical/security gates, canonical exact-head CI, every required genuinely distinct exact-head independent review, zero unresolved P0/P1/P2, merge, exact-main CI and exact-merge `POST_MERGE_ASSURANCE_PASS`. A moved head invalidates exact-head evidence. The independent-review waiver remains limited to PR #60.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded — not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.
