# POM-RX Core — Durable Blockers Snapshot

Updated: `2026-08-23T19:26:00+02:00`

This file records durable blocker rules at authoring time. It does **not** claim that its embedded SHA is the forever-current GitHub `main`. Read live GitHub first. Exact post-merge state and current blocker resolution are persisted in the relevant PR terminal checkpoint.

Snapshot anchors:

- `snapshot_base_main`: `e45869bf77025566d6be4edac58424f6002ad08e`;
- base state: PR #134 exact merge, CI `32654441831` / CI 852 = `success`, but post-merge assurance `5387352052 = POST_MERGE_ASSURANCE_CONDITIONAL`;
- last fully assured main before snapshot: `ed0cc5936a12fcd420890ee1553690569b2d4ec7` via PR #133 assurance `5387034808`.

A control-plane-only merge does not create a new blocker merely because its own merge SHA differs from `snapshot_base_main`. Live GitHub plus the merge PR terminal checkpoint resolve that unavoidable self-reference.

## `CONTROL_PLANE_SELF_REFERENCE_LIVENESS_REPAIR_REQUIRED`

PR #134 post-merge assurance identified a P2 continuity/liveness defect in the old model: each coordination PR hard-coded its parent SHA as exact current main and listed itself as the current reconciliation, so every successful merge made the just-merged files immediately stale and triggered another docs-only reconciliation.

Closure rule: the latest continuity-model repair must amend the automation policy and canonical snapshot surfaces so versioned SHAs are explicitly authoring-time anchors, exact live state is always read from GitHub, exact post-merge state is persisted in the merge PR terminal checkpoint, and no new docs-only PR is required solely to chase the repair PR's own merge SHA. The repair itself still requires normal exact-head CI, five-stage owner gate, genuine distinct exact-head review, merge and exact-merge `POST_MERGE_ASSURANCE_PASS`.

Once live GitHub records that PASS, this requirement is satisfied without rewriting this file only to replace `snapshot_base_main` with the repair merge SHA.

## `PR131_RELEASE_BLOCKED_RECONCILIATION_REQUIRED`

PR #131 remains the next dependency-closing Tier-B workstream, but it is not trusted until the continuity repair above is closed and the PR is reconciled onto the then-live main.

Authoring-time snapshot:

- head `3a75418ef13e7364b70e60a17e5514f1b1a8bfc2`;
- against `snapshot_base_main=e45869bf...`: diverged ahead 32 / behind 18;
- merge-base `87ed6ac814f868dc4599cb5d236babdeea8c3cc9`;
- historical CI `32645853067` / CI 846 attempt 1 = `success`, but not current release evidence;
- seven P1 threads unresolved/outdated: `PRRT_kwDOTiNyWc6bfPvI`, `PRRT_kwDOTiNyWc6bfPvO`, `PRRT_kwDOTiNyWc6bfPvR`, `PRRT_kwDOTiNyWc6bfWeN`, `PRRT_kwDOTiNyWc6bfel5`, `PRRT_kwDOTiNyWc6bfel6`, `PRRT_kwDOTiNyWc6bfel7`.

After the continuity repair receives exact-merge PASS, reconcile PR #131 with exactly one writer onto the then-live main. Any head move invalidates old release evidence. Require wholly fresh canonical exact-head CI, five-stage owner review, genuinely distinct exact-head review, zero unresolved P0/P1/P2, merge and exact-merge assurance.

## `PR131_SECURITY_BOUNDARY_REMAINS_NARROW`

The supported claim is an explicit narrow **trusted-provider transport contract**. The controlled route must fail closed before unowned provider transport origin. An in-contract rejected context transport must prove zero reference authorization, zero sensitive forwarding, clean process survival under `--unhandled-rejections=strict` and no orphaned provider-rejection termination.

Decorated/rebased/Proxy/accessor/non-configurable-unsafe Promise objects already returned by arbitrary providers remain out of contract. The in-contract survival fixture is not proof that such an already-originated hostile rejected Promise can be drained safely in the same process. That broader property requires separately reviewed process/worker/RPC isolation.

Prohibited shortcuts remain process-global `unhandledRejection`/`uncaughtException` swallowing, execution of hostile constructor/species accessors or Proxy paths, silent trust of attacker-selected species constructors, weakening strict tests, or converting unknown/failure into authorization/forwarding.

## `PR120_CLOSED_NOT_MERGED_ATTACK_HISTORY`

PR #120 remains `CLOSED / NOT MERGED / STALE` at `5238b9c289476100c875ed9a88bd7e21a574fa67`. Do not reopen, rebase, revive or wholesale-merge it. Six P1/P2 review threads remain attack history: `PRRT_kwDOTiNyWc6bZjxp`, `PRRT_kwDOTiNyWc6bZ6tx`, `PRRT_kwDOTiNyWc6bZ6tz`, `PRRT_kwDOTiNyWc6baFkR`, `PRRT_kwDOTiNyWc6baIxZ`, `PRRT_kwDOTiNyWc6bc4gh`.

## `PR97_STALE_HISTORICAL_BRANCH_MUST_NOT_MERGE`

PR #97 remains `OPEN / STALE / MUST_NOT_MERGE` at `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`. Against `snapshot_base_main` it is diverged ahead 66 / behind 267 with merge-base `0564aecd42cf0794894c12842980969ff59c9f73`. Durable Gate composition is reconstructed later from then-current trusted main only after the fresh provider prerequisite receives exact-merge `POST_MERGE_ASSURANCE_PASS`.

## `CORE_DURABLE_GATE_COMPOSITION_NOT_YET_TRUSTED`

The repository contains a process-local single-use Gate and a separate filesystem durable claim primitive. Reviewed durable claim-before-observer/downstream composition is not yet a trusted dependency.

## `PR93_RECONCILIATION_AND_FRESH_REVIEW_REQUIRED_LATER`

PR #93 remains `OPEN / STALE / UNTRUSTED / LATER` at `c4e40ceb286f4e59657767661daed15d2b68e9a7`. Against `snapshot_base_main` it is diverged ahead 86 / behind 312 with merge-base `818718955c9e4136e9e55754a31be2f1c7b610f8`. Reconstruct useful simulation work later from then-current trusted main; never merge stale history wholesale.

## `DAGR_SOURCE_DOCUMENT_MISSING`

Normative DAGR/profile work remains source-gated. Do not invent normative text, controls, scores or claims without authorized source material.

## `PRODUCTION_TRUST_UNPROVED`

Production issuer/operator authorization, trusted time, KMS/HSM custody, distributed revocation/consensus, crash recovery, external observer independence, external execution/effect truth and arbitrary browser/provider integrity remain unproved.

## `REAL_WALLET_NOT_AUTHORIZED`

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction or meaningful funds are authorized. Burner local/testnet E2E remains behind a separate explicit human authorization gate.

## Dependency and merge rule

A dependency becomes trusted only after the mandatory five-stage pre-merge gate, all applicable exact-head technical/security gates, canonical exact-head CI, every required genuinely distinct exact-head independent review, zero unresolved P0/P1/P2, merge, exact-main CI/status and exact-merge `POST_MERGE_ASSURANCE_PASS`. A moved head invalidates exact-head evidence. The independent-review waiver remains limited to PR #60.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded — not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.
