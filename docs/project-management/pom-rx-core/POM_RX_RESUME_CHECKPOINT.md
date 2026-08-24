# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-24T09:59:00+02:00`

Purpose: compact durable cross-chat **versioned snapshot**. Conversation history is not project state. Every run reads live GitHub first. Embedded SHAs are authoring-time anchors, not claims that they remain forever-current after this snapshot's own merge.

## Snapshot anchors

- `snapshot_base_main`: `8e8de6ae9744348e6c3eb2d1d0cf2ef3281de970` — PR #135 exact merge observed as live trusted main;
- PR #135 source: `8c35b486fdc73299c86388bec5517db31b6830d2`;
- exact-head CI 858 = success; owner `5003048413 = PASS_NON_INDEPENDENT / 0-0-0`; distinct Codex `5387687366 = no major issues`;
- exact-main CI `32657761877` / 859 = success;
- `5387715186 = POST_MERGE_ASSURANCE_PASS`;
- terminal checkpoint `5387722428`.

## Canonical coordination-guard repair — PR #136

After PR #135 became trusted, the next scheduled invocation correctly discovered that the policy required mandatory single-flight coordination but no canonical operational lock mechanism existed. It failed closed as `SKIPPED_COORDINATION_GUARD_UNAVAILABLE`, and the existing hourly task was disabled.

Under explicit human instruction on 2026-08-24 to repair and relaunch the automation, a one-time bootstrap created:

- branch `automation/pom-rx-coordination`;
- file `.pom-rx/coordination-lock.json`;
- schema `pom-rx-coordination-lock/1`;
- active window 45 minutes;
- bootstrap commit `8a6fa63770b3244c693000979081bdd2d594058b`.

The manual repair run acquired FREE state using the exact file blob SHA, then re-read and verified holder `manual-repair-20260824T0727Z-gpt56sol`; acquisition commit `05ae5e9cda05b7a2bf67e6eb039b78fabbfa002e`. A deliberately stale acquisition using the previous FREE blob SHA was rejected HTTP 409.

PR #136 on `docs/pom-rx-canonical-coordination-lock-20260824` is bounded to the canonical guard/policy/checkpoint/tasks/blockers/roster plus `docs/product/POM_RX_CAPABILITY_MAP.md`. It changes no runtime, tests, protocol, Gate, Witness, verifier, Wallet Guard/provider, wallet/network, public-site/Vercel or financial-execution semantics.

### Review findings retained until same-head validation

Dedicated Codex review on an earlier #136 head found:

- P1 `PRRT_kwDOTiNyWc6bnBYA` — automatic expiry/reclamation could let an old writer continue concurrently;
- P2 `PRRT_kwDOTiNyWc6bnBYE` — unchanged capability-map routing could let #131 advance after already-completed #135 instead of waiting for the new guard prerequisite.

The current successor branch repairs both, but the threads remain unresolved until a **fresh genuinely distinct review covers the final exact head**.

### Final guard semantics to validate

- automation acquires **only FREE** using exact-blob-SHA CAS;
- active unexpired HELD => `SKIPPED_PREVIOUS_RUN_ACTIVE`;
- expired HELD remains stale/blocking => `SKIPPED_COORDINATION_GUARD_UNAVAILABLE`; no automatic reclamation;
- before every project mutation, re-read and require valid config, `state=HELD`, exact own `holder.run_id`, and future `expires_at`;
- after expiry/loss/unverifiability, no further project mutation and no same-run renewal/extension/reacquisition;
- exact current holder may perform coordination-only same-holder release even after expiry;
- release uses exact current blob SHA, writes `FREE`/`holder=null` with a unique RELEASE transition, then re-reads verified FREE;
- a crashed holder's stale HELD lock requires explicit human recovery;
- normal lock writes remain only on the coordination branch;
- capability map routes #131 only after #136 exact-merge PASS and verified FREE canonical state.

Automatic stale takeover is deliberately forbidden because the timestamp cannot server-side fence an in-flight mutation on another GitHub resource.

The existing task stays disabled until #136 has final exact-head CI success, full five-stage owner gate, fresh genuinely distinct exact-head review with zero unresolved P0/P1/P2, merge, exact-main CI/status and exact-merge `POST_MERGE_ASSURANCE_PASS`. Canonical state must then be restored to verified FREE before the existing task is re-enabled.

## Next Tier-B workstream — PR #131

PR #131 remains the next dependency-closing Tier-B workstream only after #136 is trusted and the coordination lock is verified FREE.

Authoring-time state:

- head `3a75418ef13e7364b70e60a17e5514f1b1a8bfc2`;
- historical CI `32645853067` / CI 846 = success but stale for release;
- seven P1 threads remain unresolved/outdated: `PRRT_kwDOTiNyWc6bfPvI`, `PRRT_kwDOTiNyWc6bfPvO`, `PRRT_kwDOTiNyWc6bfPvR`, `PRRT_kwDOTiNyWc6bfWeN`, `PRRT_kwDOTiNyWc6bfel5`, `PRRT_kwDOTiNyWc6bfel6`, `PRRT_kwDOTiNyWc6bfel7`.

After #136 exact-merge PASS, use exactly one writer to reconcile #131 onto then-live trusted main. Any head move invalidates old exact-head evidence. Require fresh canonical CI, five-stage owner review, genuinely distinct exact-head review, zero unresolved P0/P1/P2, merge and exact-merge assurance.

The accepted #131 claim remains the narrow local trusted-provider transport contract: fail closed before unowned provider transport origin; in-contract rejection must have zero reference authorization, zero sensitive forwarding, clean `--unhandled-rejections=strict` survival and no orphaned rejection termination. Already-originated decorated/rebased/Proxy/accessor/non-configurable-unsafe Promise objects remain outside that contract without separately reviewed process/worker/RPC isolation.

## Historical branches

- PR #120: `CLOSED / NOT MERGED / STALE`; head `5238b9c289476100c875ed9a88bd7e21a574fa67`; six findings remain attack history; never revive wholesale.
- PR #97: `OPEN / STALE / MUST_NOT_MERGE`; reconstruct durable Gate composition later from then-current trusted main.
- PR #93: `OPEN / STALE / UNTRUSTED / LATER`; reconstruct useful simulation work later; never merge stale history wholesale.

## Architecture, claim and safety boundary

POM-RX remains the single principal technical product. Wallet Guard remains an application profile. Shared Core owns canonicalization, hashing, verifier, Witness, exact authorization, Gate, execution evidence and observation/reconciliation semantics.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded. It is not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction or meaningful funds are authorized. Burner local/testnet E2E remains behind a separate explicit human gate. Public website/Vercel/funding-directory writes remain out of scope.

## Next safe action

Freeze the final #136 head, run fresh canonical exact-head CI, perform the full owner five-stage gate, then obtain fresh genuinely distinct exact-head validation of P1/P2. If and only if zero P0/P1/P2 remains, revalidate decision-time main/head/CI/reviews/threads/mergeability, merge #136 and run exact-merge assurance. Persist terminal state, restore the canonical lock to verified FREE via exact same-holder release, re-enable the **existing** hourly task with this guard protocol, and let a later fresh invocation acquire FREE state before touching #131.
