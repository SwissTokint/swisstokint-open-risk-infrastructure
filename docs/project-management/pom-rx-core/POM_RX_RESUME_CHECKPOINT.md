# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-23` — post-PR #130 assurance and fresh Tier-B activation.

Purpose: compact durable cross-chat continuation state. Scheduled-task chat history is not project state. Every run reconstructs state from live GitHub plus this canonical control plane. Live GitHub wins whenever PR heads, CI, reviews, review threads, mergeability or merges differ from this file.

## trusted_main

Exact live/trusted `main`: `87ed6ac814f868dc4599cb5d236babdeea8c3cc9`.

Latest trusted merge: PR #130 — bounded non-Tier-B control-plane reconciliation.

- exact source head: `ce1f2ca2f9358c11e836f1717dcedd9cb5c0caaa`;
- pre-merge canonical exact-head CI: `32635882670` / CI 820 attempt 1 = `success`;
- release-owner five-stage review: `5002253211` = `PASS_NON_INDEPENDENT`, owner findings `0 P0 / 0 P1 / 0 P2`;
- genuinely distinct exact-head evidence: `chatgpt-codex-connector[bot]` comment `5385715573`, reviewed `ce1f2ca2f9`, no major issues;
- pre-merge decision checkpoint: PR #130 comment `5385931941`;
- exact merge/main SHA: `87ed6ac814f868dc4599cb5d236babdeea8c3cc9`;
- merge parents: `95cafa73139085343fae26526c4dc1ea3f07db6b` + `ce1f2ca2f9358c11e836f1717dcedd9cb5c0caaa`;
- source-head -> merge: one merge commit and zero changed files;
- canonical exact-main push CI: `32638722306` / CI 821 attempt 1 = `success` on the exact merge SHA;
- decision-time `pom-rx/exact-main-ci`: `success`, targeting run `32638722306`;
- exact-merge assurance: PR #130 comment `5385948152` = `POST_MERGE_ASSURANCE_PASS`;
- terminal trusted reconciliation checkpoint: PR #130 comment `5385949730`.

PR #130 is trusted coordination evidence only. It did not make historical PR #120 runtime code trusted and did not widen production, real-wallet, mainnet or external-effect claims.

## active_fresh_tier_b_provider_transport

Task: `WALLET-GUARD-TRUSTED-PROVIDER-TRANSPORT-FRESH-REPAIR`.

Fresh branch: `automation/wg-trusted-provider-transport-20260823`, created directly from exact trusted main `87ed6ac814f868dc4599cb5d236babdeea8c3cc9`. This branch is the single-writer lane. It does **not** reopen, rebase, revive or wholesale-copy PR #120.

Current work is **IN_PROGRESS / NOT FROZEN / NOT RELEASE EVIDENCE**. Live GitHub must be read for the exact branch head after this checkpoint commit. No exact-head CI/review may be reused after a head move.

Implemented so far on the fresh branch:

- new application-owned `applications/blockchain-digital-assets/wallet-guard/trusted-provider-transport.mjs`;
- module-private WeakSet provenance distinguishes the controlled transport from arbitrary/unowned providers without exposing a forgeable marker;
- `createWalletGuardTrustedProviderGateway()` rejects an unowned provider before its `request()` path can originate a transport;
- the controlled local transport owns Promise creation and checks the supported Promise/Array thenable runtime immediately before transport origin;
- Promise `constructor`/`then`/`resolve`/`reject`/`Symbol.species` descriptor drift and inherited `Array.prototype.then` / `Object.prototype.then` are fail-closed for this narrow local path without executing hostile accessors;
- controlled context-rejection injection creates an in-contract same-realm native rejected Promise for strict survival testing;
- `tests/wallet-guard/trusted-provider-transport.node.test.mjs` covers owned native transport shape, unowned/Proxy provider pre-origin rejection, hostile `Symbol.species` accessor zero execution, inherited Array-then poisoning fail-closed, and child-process `--unhandled-rejections=strict` rejection survival with zero authorization and zero sensitive forwarding;
- `package.json` wires the new regression into the canonical Wallet Guard provider-gate suite and therefore into `npm test`.

Important current limitation: the historical generic `createWalletGuardReferenceProviderGateway()` remains available and is **not** upgraded into a hostile-provider-wide Promise-integrity claim by this lot. The fresh supported transport claim is limited to the explicit controlled transport + `createWalletGuardTrustedProviderGateway()` path. The existing controlled-host path has not yet been rebound to this strict transport in the work recorded by this checkpoint; that integration/readiness decision must be settled before the candidate is frozen.

### Accepted security boundary

Inside the supported narrow trusted-provider contract, rejection evidence must prove all of:

- fail closed;
- zero reference authorization;
- zero sensitive forwarding;
- clean child-process survival under `--unhandled-rejections=strict`;
- no orphaned provider-rejection termination.

Decorated/rebased/Proxy/accessor/non-configurable-unsafe-constructor Promise objects from an arbitrary provider remain outside the supported contract. The supported path must reject unowned providers **before provider request origin**, then separately prove survival for an **in-contract** controlled rejected transport.

An already-originated excluded rejected Promise remains an explicit unsupported negative unless a separately reviewed process/worker/RPC isolation boundary is introduced. An in-contract survival fixture must never be represented as same-process survival proof for that hostile object.

Do not add process-global `unhandledRejection`/`uncaughtException` swallowing, execute hostile constructor/species accessors or Proxy constructor/species paths, silently trust attacker-selected species constructors, weaken strict rejection tests, or turn unknown/failure into authorization/forwarding.

The six PR #120 attack-history threads remain mandatory falsification inputs: `PRRT_kwDOTiNyWc6bZjxp`, `PRRT_kwDOTiNyWc6bZ6tx`, `PRRT_kwDOTiNyWc6bZ6tz`, `PRRT_kwDOTiNyWc6baFkR`, `PRRT_kwDOTiNyWc6baIxZ`, `PRRT_kwDOTiNyWc6bc4gh`.

## historical_pr_state

PR #120 is `CLOSED / NOT MERGED / STALE` at historical head `5238b9c289476100c875ed9a88bd7e21a574fa67`. Its historical CI/reviews are not release evidence; its six P1/P2 findings remain attack history.

PR #97 is live `OPEN / STALE / MUST_NOT_MERGE` at exact head `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`. Against trusted main `87ed6ac...` it is diverged, ahead 66 / behind 249, merge-base `0564aecd42cf0794894c12842980969ff59c9f73`. Durable Gate composition remains later and must be reconstructed from trusted main only after the fresh provider prerequisite receives post-merge assurance PASS.

PR #93 is live `OPEN / STALE / UNTRUSTED / LATER` at exact head `c4e40ceb286f4e59657767661daed15d2b68e9a7`. Against trusted main `87ed6ac...` it is diverged, ahead 86 / behind 294, merge-base `818718955c9e4136e9e55754a31be2f1c7b610f8`. Historical simulation work is reconstructed later rather than merged wholesale.

## architecture_and_claim_boundary

POM-RX remains the single principal technical product. Shared canonicalization, hashing, verifier, Witness, exact authorization, Gate, execution-evidence and observation/reconciliation semantics remain Core-owned. Wallet Guard remains an application profile. The fresh transport module is application-owned and must not fork shared Core semantics.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded. It is not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.

## next_safe_actions

1. Finish the fresh Tier-B provider-transport prerequisite on branch `automation/wg-trusted-provider-transport-20260823` with one writer only; decide explicitly whether the controlled-host path must be rebound before this lot can claim the supported route is operational.
2. Run the branch candidate through canonical CI. Treat any failing test as a blocker; do not weaken the strict rejection regression or runtime-integrity checks to obtain green.
3. Before freezing the candidate, reconcile TASKS/BLOCKERS/TEAM_ROSTER/CAPABILITY_MAP to the exact live state and preserve the explicit hostile out-of-contract limitation.
4. On the frozen exact head, execute the mandatory five-stage release-owner gate with concrete rejected-Promise, constructor/species, hostile-accessor, Proxy/prototype, strict-unhandled, thenable-assimilation and Array-poisoning hypotheses.
5. Obtain a fresh genuinely distinct `chatgpt-codex-connector` review on that same exact head. Any moved head invalidates CI/review evidence.
6. Merge only with exact-head CI success, owner gate PASS, distinct exact-head review, zero unresolved P0/P1/P2 and unchanged decision-time main/head/thread state; then immediately run exact-merge-SHA post-merge assurance.
7. Only after that assurance is `POST_MERGE_ASSURANCE_PASS` may durable Gate composition be reconstructed from current trusted main. PR #93 remains later.

## safety_boundary

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction, meaningful funds or uncontrolled malicious-site interaction is authorized. Burner local/testnet E2E remains behind a separate explicit human gate. Public website/Vercel/funding-directory writes are outside this control plane.
