# POM-RX Core — Durable Blockers Snapshot

Updated: `2026-08-24T09:33:00+02:00`

This file records durable blocker rules at authoring time. It does **not** claim that its embedded SHA is the forever-current GitHub `main`. Read live GitHub first. Exact post-merge state and current blocker resolution are persisted in the relevant PR terminal checkpoint.

Snapshot anchors:

- `snapshot_base_main`: `8e8de6ae9744348e6c3eb2d1d0cf2ef3281de970`;
- base state: PR #135 exact merge, exact-main CI `32657761877` / CI 859 = `success`, post-merge assurance `5387715186 = POST_MERGE_ASSURANCE_PASS`;
- PR #135 terminal checkpoint: `5387722428`.

A control-plane-only merge does not create a new blocker merely because its own merge SHA differs from `snapshot_base_main`. Live GitHub plus the merge PR terminal checkpoint resolve that unavoidable self-reference.

## `CONTROL_PLANE_CANONICAL_COORDINATION_GUARD_REPAIR_REQUIRED`

PR #135 restored the **requirement** for fail-closed single-flight coordination, but the next scheduled invocation correctly exposed an operational bootstrap gap: no canonical lock branch/file or acquisition/release protocol had been defined for the automation runtime. The run returned `SKIPPED_COORDINATION_GUARD_UNAVAILABLE` and the existing scheduled task was disabled to prevent repeated unsafe invocations.

Under explicit human instruction on 2026-08-24, the one-time canonical mechanism was bootstrapped:

- branch `automation/pom-rx-coordination`;
- file `.pom-rx/coordination-lock.json`;
- schema `pom-rx-coordination-lock/1`;
- 45-minute lease;
- bootstrap commit `8a6fa63770b3244c693000979081bdd2d594058b`.

The repair run acquired the lease using the exact fetched blob SHA and re-read the lock to verify holder `manual-repair-20260824T0727Z-gpt56sol`, acquisition commit `05ae5e9cda05b7a2bf67e6eb039b78fabbfa002e`. A stale contender using the previous blob SHA was rejected by GitHub with HTTP 409, providing direct evidence that the contents blob SHA acts as the required compare-and-swap token.

Closure requirements:

- merge a scoped control-plane repair that defines `POM_RX_COORDINATION_GUARD.md` and binds automation policy/roster/tasks/checkpoint to exactly this mechanism;
- canonical exact-head CI success;
- full five-stage release-owner gate;
- genuinely distinct exact-head review with zero unresolved P0/P1/P2;
- merge, exact-main CI/status and exact-merge `POST_MERGE_ASSURANCE_PASS`;
- release the repair run's lease only after durable terminal state is persisted, and verify `state=FREE` by re-reading the canonical lock;
- only then re-enable the **existing** POM-RX scheduled task with the canonical guard protocol in its prompt.

Until those conditions hold, automated writer work remains blocked.

## `CONTROL_PLANE_SINGLE_FLIGHT_GUARD_MUST_REMAIN_MANDATORY`

The fail-closed semantics from PR #135 remain mandatory and are now bound to the canonical mechanism above:

- acquire the canonical lease before any state-changing project action;
- active unexpired lease => `SKIPPED_PREVIOUS_RUN_ACTIVE`, modify nothing;
- malformed/unreadable/unverifiable guard or failed acquisition without a now-active competing lease => `SKIPPED_COORDINATION_GUARD_UNAVAILABLE`, modify nothing;
- acquisition must use the exact fetched file blob SHA as compare-and-swap token and must be followed by a same-run holder re-read;
- normal lock writes occur only on `automation/pom-rx-coordination`, never `main` or a feature/control-plane PR head;
- no issue, label, comment, workflow artifact, local file, chat state or alternate branch may be used as a competing lock;
- release must verify same holder, CAS to `FREE`, then re-read and verify `state=FREE`.

## `PR131_RELEASE_BLOCKED_RECONCILIATION_REQUIRED`

PR #131 remains the next dependency-closing Tier-B workstream, but it is not trusted until the canonical coordination-guard repair above is closed and the PR is reconciled onto the then-live trusted main.

Authoring-time snapshot:

- head `3a75418ef13e7364b70e60a17e5514f1b1a8bfc2`;
- historical CI `32645853067` / CI 846 = `success`, but not current release evidence;
- seven P1 threads unresolved/outdated: `PRRT_kwDOTiNyWc6bfPvI`, `PRRT_kwDOTiNyWc6bfPvO`, `PRRT_kwDOTiNyWc6bfPvR`, `PRRT_kwDOTiNyWc6bfWeN`, `PRRT_kwDOTiNyWc6bfel5`, `PRRT_kwDOTiNyWc6bfel6`, `PRRT_kwDOTiNyWc6bfel7`.

After the coordination repair receives exact-merge PASS and the automation guard is operational, reconcile PR #131 with exactly one writer onto the then-live main. Any head move invalidates old release evidence. Require wholly fresh canonical exact-head CI, five-stage owner review, genuinely distinct exact-head review, zero unresolved P0/P1/P2, merge and exact-merge assurance.

## `PR131_SECURITY_BOUNDARY_REMAINS_NARROW`

The supported claim is an explicit narrow **trusted-provider transport contract**. The controlled route must fail closed before unowned provider transport origin. An in-contract rejected context transport must prove zero reference authorization, zero sensitive forwarding, clean process survival under `--unhandled-rejections=strict` and no orphaned provider-rejection termination.

Decorated/rebased/Proxy/accessor/non-configurable-unsafe Promise objects already returned by arbitrary providers remain out of contract. The in-contract survival fixture is not proof that such an already-originated hostile rejected Promise can be drained safely in the same process. That broader property requires separately reviewed process/worker/RPC isolation.

Prohibited shortcuts remain process-global `unhandledRejection`/`uncaughtException` swallowing, execution of hostile constructor/species accessors or Proxy paths, silent trust of attacker-selected species constructors, weakening strict tests, or converting unknown/failure into authorization/forwarding.

## `PR120_CLOSED_NOT_MERGED_ATTACK_HISTORY`

PR #120 remains `CLOSED / NOT MERGED / STALE` at `5238b9c289476100c875ed9a88bd7e21a574fa67`. Do not reopen, rebase, revive or wholesale-merge it. Six P1/P2 review threads remain attack history: `PRRT_kwDOTiNyWc6bZjxp`, `PRRT_kwDOTiNyWc6bZ6tx`, `PRRT_kwDOTiNyWc6bZ6tz`, `PRRT_kwDOTiNyWc6baFkR`, `PRRT_kwDOTiNyWc6baIxZ`, `PRRT_kwDOTiNyWc6bc4gh`.

## `PR97_STALE_HISTORICAL_BRANCH_MUST_NOT_MERGE`

PR #97 remains `OPEN / STALE / MUST_NOT_MERGE`. Durable Gate composition is reconstructed later from then-current trusted main only after the fresh provider prerequisite receives exact-merge `POST_MERGE_ASSURANCE_PASS`.

## `CORE_DURABLE_GATE_COMPOSITION_NOT_YET_TRUSTED`

The repository contains a process-local single-use Gate and a separate filesystem durable claim primitive. Reviewed durable claim-before-observer/downstream composition is not yet a trusted dependency.

## `PR93_RECONCILIATION_AND_FRESH_REVIEW_REQUIRED_LATER`

PR #93 remains `OPEN / STALE / UNTRUSTED / LATER`. Reconstruct useful simulation work later from then-current trusted main; never merge stale history wholesale.

## `DAGR_SOURCE_DOCUMENT_MISSING`

Normative DAGR/profile work remains source-gated. Do not invent normative text, controls, scores or claims without authorized source material.

## `PRODUCTION_TRUST_UNPROVED`

Production issuer/operator authorization, trusted time, KMS/HSM custody, distributed revocation/consensus, crash recovery, external observer independence, external execution/effect truth and arbitrary browser/provider integrity remain unproved.

## `REAL_WALLET_NOT_AUTHORIZED`

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction or meaningful funds are authorized. Burner local/testnet E2E remains behind a separate explicit human authorization gate.

## Dependency and merge rule

A dependency becomes trusted only after the mandatory five-stage pre-merge gate, all applicable exact-head technical/security gates, canonical exact-head CI, every required genuinely distinct exact-head independent review, zero unresolved P0/P1/P2, merge, exact-main CI/status and exact-merge `POST_MERGE_ASSURANCE_PASS`. A moved head invalidates exact-head evidence. The independent-review waiver remains limited to PR #60.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded — not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.
