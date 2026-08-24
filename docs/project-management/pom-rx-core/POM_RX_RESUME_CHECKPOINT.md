# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-24T09:31:00+02:00`

Purpose: compact durable cross-chat **versioned snapshot**. Conversation history is not project state. Every run first reads live GitHub. Embedded SHAs are authoring-time anchors, not claims that they remain the forever-current GitHub state after this snapshot's own merge.

## How to resolve live state

1. Read live GitHub `main`, open PRs, heads, CI, reviews, unresolved threads and recent merges.
2. Read `POM_RX_AUTOMATION_POLICY.md`, `POM_RX_COORDINATION_GUARD.md`, this snapshot, TASKS/BLOCKERS/TEAM_ROSTER/CAPABILITY_MAP and the architecture/review gates.
3. Live GitHub wins for volatile state.
4. Exact post-merge state is persisted in the merged PR terminal `CONTINUITY_CHECKPOINT`.
5. A new control-plane PR is required when a durable project fact changes, not solely because a control-plane PR's own merge SHA cannot have been embedded before merge.

## Snapshot anchors

- `snapshot_base_main`: `8e8de6ae9744348e6c3eb2d1d0cf2ef3281de970` — PR #135 exact merge and live trusted main observed at authoring time.
- PR #135 source head: `8c35b486fdc73299c86388bec5517db31b6830d2`.
- PR #135 exact-head CI: `32657444020` / CI 858 = `success`.
- PR #135 release-owner review: `5003048413 = PASS_NON_INDEPENDENT / 0 P0 / 0 P1 / 0 P2`.
- PR #135 genuinely distinct exact-head Codex evidence: comment `5387687366`, no major issues on `8c35b486fd...`.
- PR #135 exact-main CI: `32657761877` / CI 859 = `success`.
- PR #135 post-merge assurance: `5387715186 = POST_MERGE_ASSURANCE_PASS`.
- PR #135 terminal checkpoint: `5387722428`.

## Coordination-guard bootstrap repair

After PR #135 became trusted, the next scheduled invocation correctly discovered an operational bootstrap gap: policy required a mandatory single-flight lock, but the repository defined no canonical lock location or acquisition/release protocol accessible to the automation runtime. The run failed closed as `SKIPPED_COORDINATION_GUARD_UNAVAILABLE` and the existing scheduled task was disabled to avoid repeated unsafe invocations.

Under explicit human instruction on 2026-08-24 to repair and relaunch the automation, a one-time bootstrap created the canonical coordination state:

- branch: `automation/pom-rx-coordination`;
- file: `.pom-rx/coordination-lock.json`;
- schema: `pom-rx-coordination-lock/1`;
- lease: 45 minutes;
- bootstrap commit: `8a6fa63770b3244c693000979081bdd2d594058b`.

The manual repair run then acquired the lock through the exact file blob SHA and re-read the state to verify holder `manual-repair-20260824T0727Z-gpt56sol`; acquisition commit `05ae5e9cda05b7a2bf67e6eb039b78fabbfa002e`. A deliberately stale compare-and-swap attempt using the previous blob SHA was rejected by GitHub with HTTP 409, demonstrating that a contender cannot overwrite the same observed lock state after another acquisition has changed the blob SHA.

The scoped control-plane repair branch is `docs/pom-rx-canonical-coordination-lock-20260824`, created from `snapshot_base_main`. It adds `POM_RX_COORDINATION_GUARD.md` and binds the automation policy to that single canonical mechanism. Normal lock writes occur only on the coordination branch; they do not move `main` or a feature/control-plane PR head.

The lock protocol is fail-closed:

- active unexpired lease => `SKIPPED_PREVIOUS_RUN_ACTIVE`, modify no project state;
- malformed/unreadable/unverifiable guard or failed acquisition without a now-active competing lease => `SKIPPED_COORDINATION_GUARD_UNAVAILABLE`, modify no project state;
- acquisition uses the exact fetched blob SHA as a compare-and-swap token and is followed by same-run holder verification;
- release requires same-holder verification, compare-and-swap update to `FREE`, and a final re-read verifying `state=FREE`;
- no issue, label, comment, local file, chat state, workflow artifact or alternate branch may become a competing lock.

The scheduled task remains disabled until this repair itself passes exact-head CI, the five-stage owner gate, a genuinely distinct exact-head review, merge, exact-main CI and `POST_MERGE_ASSURANCE_PASS`. The repair run must then release and verify the coordination lock before the existing task is re-enabled.

## Next Tier-B workstream — PR #131

PR #131 — `feat(wallet-guard): add trusted provider transport prerequisite` — remains the next dependency-closing Tier-B workstream after the coordination guard repair is trusted.

Authoring-time live state:

- exact head: `3a75418ef13e7364b70e60a17e5514f1b1a8bfc2`;
- branch remains based on historical trusted main `87ed6ac814f868dc4599cb5d236babdeea8c3cc9` and must be reconciled onto the then-live trusted main before release evidence is valid;
- historical exact-head CI `32645853067` / CI 846 = `success` but is stale for release;
- seven P1 threads remain unresolved/outdated: `PRRT_kwDOTiNyWc6bfPvI`, `PRRT_kwDOTiNyWc6bfPvO`, `PRRT_kwDOTiNyWc6bfPvR`, `PRRT_kwDOTiNyWc6bfWeN`, `PRRT_kwDOTiNyWc6bfel5`, `PRRT_kwDOTiNyWc6bfel6`, `PRRT_kwDOTiNyWc6bfel7`.

### Stable transition rule for #131

If the coordination-guard repair receives full pre-merge gates, merge, exact-main CI/status success and `POST_MERGE_ASSURANCE_PASS`, then PR #131 becomes `READY_TO_RECONCILE`. Use exactly one writer to reconcile it onto the then-live trusted `main`. Any moved #131 head invalidates old exact-head release evidence and requires fresh canonical CI, five-stage owner review and genuinely distinct exact-head review.

No additional docs-only reconciliation is required merely because the guard-repair PR's own merge changes the exact `main` SHA.

### PR #131 security boundary retained

The accepted claim remains the narrow local **trusted-provider transport contract**. The controlled transport may admit only module-provenanced controlled providers, must fail closed before unowned provider transport origin, and must prove an in-contract rejected context transport survives `--unhandled-rejections=strict` with zero reference authorization, zero sensitive forwarding and no orphaned rejection termination.

Decorated/rebased/Proxy/accessor/non-configurable-unsafe Promise objects already returned by arbitrary providers remain outside the contract. An already-originated excluded rejected Promise remains an explicit unsupported negative unless separately reviewed process/worker/RPC isolation is introduced.

Shared canonicalization, hashing, verifier, Witness, exact authorization, Gate, execution-evidence and observation/reconciliation semantics remain Core-owned.

## Historical branches

- PR #120: `CLOSED / NOT MERGED / STALE`; final historical head `5238b9c289476100c875ed9a88bd7e21a574fa67`; six P1/P2 findings remain attack history. Never revive wholesale.
- PR #97: `OPEN / STALE / MUST_NOT_MERGE`; live search still reports it open and historical. Reconstruct useful durable Gate composition later from then-current trusted main after PR #131 becomes trusted.
- PR #93: `OPEN / STALE / UNTRUSTED / LATER`; reconstruct useful simulation work later from then-current trusted main; never merge stale history wholesale.

## Architecture and claim boundary

POM-RX remains the single principal technical product. Wallet Guard remains an application profile. Shared Core owns canonicalization, hashing, verifier, Witness, exact authorization, Gate, execution evidence and observation/reconciliation semantics.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded. It is not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.

## Next safe action rule

Freeze the canonical coordination-guard repair candidate, require canonical exact-head CI success, run the mandatory five-stage owner gate and obtain a genuinely distinct exact-head review. Merge only with zero unresolved P0/P1/P2 and unchanged decision-time state. Immediately run exact-merge post-merge assurance. If and only if the repair receives `POST_MERGE_ASSURANCE_PASS`, release and verify the canonical lease, re-enable the existing hourly POM-RX task with the guard protocol in its prompt, and resume PR #131 reconciliation on a later invocation.

## Safety boundary

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction, meaningful funds or uncontrolled malicious-site interaction is authorized. Burner local/testnet E2E remains behind a separate explicit human gate. Public website/Vercel/funding-directory writes are outside this control plane.
