# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-23T13:06:00+02:00`

Purpose: compact durable cross-chat continuation state. Scheduled-task chat history is not project state. Every run reconstructs state from live GitHub plus this canonical control plane. Live GitHub wins whenever PR heads, CI, reviews, review threads, mergeability or merges differ from this file.

## trusted_main

Exact live/trusted `main`: `95cafa73139085343fae26526c4dc1ea3f07db6b`.

Latest trusted merge: PR #129 — bounded non-Tier-B control-plane reconciliation.

- exact source head: `17cd468f3e90f9ae3deb544197937482459b885f`;
- pre-merge canonical exact-head CI: `32633365421` / CI 818 attempt 1 = `success`;
- release-owner five-stage review: `5002164482` = `PASS_NON_INDEPENDENT`, owner findings `0 P0 / 0 P1 / 0 P2`;
- genuinely distinct exact-head evidence: `chatgpt-codex-connector[bot]` comment `5385505343`, reviewed `17cd468f3e`, no major issues;
- exact merge/main SHA: `95cafa73139085343fae26526c4dc1ea3f07db6b`;
- merge parents: `abc19e969aa19f3ec08efe67cdf1988731b633ee` + `17cd468f3e90f9ae3deb544197937482459b885f`;
- canonical exact-main push CI: `32633614947` / CI 819 attempt 1 = `success` on the exact merge SHA;
- exact-merge assurance: PR #129 comment `5385521407` = `POST_MERGE_ASSURANCE_PASS`;
- terminal GitHub continuity checkpoint: PR #129 comment `5385522627`.

PR #129 changed only the five canonical coordination/product-position documents and is trusted coordination evidence only. It did not make closed PR #120 runtime code trusted and did not advance production, real-wallet, mainnet or external-effect claims.

## current_control_plane_reconciliation

The source tree merged by PR #129 necessarily records its pre-merge parent `abc19e...` as trusted main. Live GitHub is now `95cafa...`, so the canonical continuation files are materially stale for dependency/readiness use until this reconciliation is trusted.

Current bounded reconciliation branch: `docs/pom-rx-post-pr129-live-reconcile-20260823`.

Owned files are exactly:

- `docs/project-management/pom-rx-core/POM_RX_RESUME_CHECKPOINT.md`;
- `docs/project-management/pom-rx-core/POM_RX_TASKS.yaml`;
- `docs/project-management/pom-rx-core/POM_RX_BLOCKERS.md`;
- `docs/project-management/pom-rx-core/POM_RX_TEAM_ROSTER.md`;
- `docs/product/POM_RX_CAPABILITY_MAP.md`.

This is non-Tier-B documentation/control-plane work only. It changes no runtime, tests, protocol, Gate, Witness, verifier, Wallet Guard/provider, wallet/network, public-site/Vercel or financial-execution semantics.

## closed_historical_pr120

PR #120 is `CLOSED / NOT MERGED / STALE` at historical head `5238b9c289476100c875ed9a88bd7e21a574fa67`. Its historical CI `32614831929` / CI 792 and owner review `5001566041` are not current release evidence.

Do not reopen, revive, rebase or wholesale-merge PR #120. Six P1/P2 threads remain attack history and must inform the next fresh Tier-B falsification matrix:

- `PRRT_kwDOTiNyWc6bZjxp` — P1;
- `PRRT_kwDOTiNyWc6bZ6tx` — P1;
- `PRRT_kwDOTiNyWc6bZ6tz` — P2;
- `PRRT_kwDOTiNyWc6baFkR` — P1;
- `PRRT_kwDOTiNyWc6baIxZ` — P1;
- `PRRT_kwDOTiNyWc6bc4gh` — P1 final historical finding.

Closing PR #120 does not resolve these findings and does not make its branch trusted evidence.

### Accepted provider-transport architecture/security boundary

For the current local prototype, the accepted direction remains the explicit narrow **trusted-provider transport contract** recorded in PR #126 comment `5384571039`, independently reconciled through trusted PR #127 and carried through #128/#129.

Inside the supported contract, rejection handling must prove all of:

- fail closed;
- zero reference authorization;
- zero sensitive forwarding;
- clean child-process survival under `--unhandled-rejections=strict`;
- no orphaned provider-rejection termination.

Decorated/rebased/Proxy/accessor/non-configurable-unsafe-constructor Promise objects remain outside the supported contract. The fresh route must prove **before origin** that its controlled trusted provider/adapter cannot emit those excluded transports, then separately prove strict clean-process survival for an **in-contract** rejected transport.

An already-originated excluded rejected Promise remains an explicit unsupported negative unless a separately reviewed process/worker/RPC isolation boundary is introduced. An in-contract survival fixture must never be represented as same-process survival proof for that hostile object.

Do not add process-global `unhandledRejection`/`uncaughtException` swallowing, do not execute hostile constructor/species accessors or Proxy constructor/species paths, and do not silently trust attacker-selected species constructors.

## open_historical_prs

PR #97 is live `OPEN / STALE / MUST_NOT_MERGE` at exact head `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`. Against trusted main `95cafa...` it is `diverged`, ahead 66 / behind 243, merge-base `0564aecd42cf0794894c12842980969ff59c9f73`. Multiple unresolved P1 threads remain, including exact-head Promise-drift findings. Do not merge/revive it; durable Gate composition is reconstructed later from then-current trusted main only after the fresh provider-transport prerequisite is trusted.

PR #93 is live `OPEN / STALE / UNTRUSTED / LATER` at exact head `c4e40ceb286f4e59657767661daed15d2b68e9a7`. Against trusted main `95cafa...` it is `diverged`, ahead 86 / behind 288, merge-base `818718955c9e4136e9e55754a31be2f1c7b610f8`. Historical green CI/reviews do not clear its unresolved P1/P2 findings. Reconstruct useful simulation work later from then-current trusted main.

## architecture_and_claim_boundary

POM-RX remains the single principal technical product. Shared canonicalization, hashing, verifier, Witness, exact authorization, Gate, execution-evidence and observation/reconciliation semantics remain Core-owned. Wallet Guard remains an application profile. Trusted main contains a process-local single-use Gate and a separate filesystem durable claim primitive; reviewed durable composition is not yet trusted.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded. It is not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.

## next_safe_actions

1. Complete this scoped five-file non-Tier-B reconciliation from exact trusted main `95cafa73139085343fae26526c4dc1ea3f07db6b`.
2. Freeze its exact head, require canonical exact-head CI success, complete the five-stage owner gate, and obtain a fresh genuinely distinct `chatgpt-codex-connector` review on that same SHA with zero unresolved P0/P1/P2.
3. Merge only if decision-time main/head/CI/review/thread state remains unchanged, then immediately run exact-merge-SHA post-merge assurance.
4. Only after this reconciliation becomes trusted, create a fresh Tier-B Wallet Guard/provider transport branch from then-current trusted main. Do not reopen or wholesale-copy PR #120.
5. In the fresh Tier-B lot, use one writer and add CI-wired pre-origin supported-provider conformance plus a separate strict in-contract rejected-transport survival regression proving fail-closed behavior, zero authorization, zero sensitive forwarding, clean process survival and no orphaned rejection.
6. Preserve the already-originated hostile Promise as an explicit unsupported negative unless reviewed isolation is introduced. Re-run the complete five-stage owner gate with concrete Promise/species/accessor/Proxy/strict-unhandled/thenable/Array-poisoning hypotheses and require a fresh genuinely distinct exact-head review.
7. Only after that provider prerequisite receives exact-merge `POST_MERGE_ASSURANCE_PASS` may durable Gate composition be reconstructed from current trusted main; PR #93 remains later in dependency order.

## safety_boundary

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction, meaningful funds or uncontrolled malicious-site interaction is authorized. Burner local/testnet E2E remains behind a separate explicit human gate. Public website/Vercel/funding-directory writes are outside this control plane.
