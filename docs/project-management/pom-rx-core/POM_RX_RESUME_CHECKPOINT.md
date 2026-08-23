# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-23T19:26:00+02:00`

Purpose: compact durable cross-chat **versioned snapshot**. Conversation history is not project state. Every run first reads live GitHub. This file deliberately records authoring-time anchors and durable transition rules; it does not claim that an embedded SHA is the exact live `main` forever.

## How to resolve live state

1. Read live GitHub `main`, open PRs, heads, CI, reviews, unresolved threads and recent merges.
2. Read this snapshot plus TASKS/BLOCKERS/TEAM_ROSTER/CAPABILITY_MAP and architecture/gate documents.
3. Live GitHub wins for volatile state.
4. Exact post-merge state is persisted in the merged PR terminal `CONTINUITY_CHECKPOINT`; versioned files use non-self-referential snapshot anchors so their own merge does not make them false.
5. A new control-plane PR is required when a durable project fact changes, not solely because a control-plane PR's own merge SHA cannot have been embedded before merge.

## Snapshot anchors

- `snapshot_base_main`: `e45869bf77025566d6be4edac58424f6002ad08e` — live main observed when this continuity-model repair branch was created.
- `snapshot_base_main_state`: PR #134 exact merge; exact-main CI `32654441831` / CI 852 attempt 1 = `success`; `pom-rx/exact-main-ci = success`; post-merge assurance comment `5387352052 = POST_MERGE_ASSURANCE_CONDITIONAL` because the old checkpoint model self-invalidated after merge.
- `last_assured_main_before_snapshot`: `ed0cc5936a12fcd420890ee1553690569b2d4ec7` — PR #133 exact merge with `5387034808 = POST_MERGE_ASSURANCE_PASS` and terminal checkpoint `5387039387`.
- `continuity_repair_branch_at_authoring`: `docs/pom-rx-non-self-referential-continuity-20260823-1923`.

These are historical-at-authoring facts. After this repair merges, the exact resulting `main`, exact-main CI/status and post-merge verdict must be read from live GitHub and the repair PR terminal checkpoint. Do **not** open another docs-only reconciliation solely to replace `snapshot_base_main` with that merge SHA.

## Continuity-model repair objective

The prior model hard-coded its parent as “Exact live/trusted main” and named its own coordination branch as the “current” reconciliation. Every control-plane merge therefore made the just-merged files immediately stale, creating an unbounded docs-only reconciliation loop and preventing dependency-closing Tier-B work.

This snapshot adopts the non-self-referential rule in `POM_RX_AUTOMATION_POLICY.md`: versioned files state snapshot anchors and durable transition rules; live exact state is read from GitHub and persisted after merges in the relevant PR terminal checkpoint.

## PR #131 durable workstream

PR #131 — `feat(wallet-guard): add trusted provider transport prerequisite` — remains `OPEN / BLOCKED / NOT TRUSTED / RECONCILIATION_REQUIRED` at authoring-time exact head `3a75418ef13e7364b70e60a17e5514f1b1a8bfc2`.

Against `snapshot_base_main=e45869bf77025566d6be4edac58424f6002ad08e`:

- compare = `diverged`, ahead 32 / behind 18;
- merge-base = `87ed6ac814f868dc4599cb5d236babdeea8c3cc9`;
- historical exact-head CI `32645853067` / CI 846 attempt 1 = `success`, but not release evidence after main moved;
- seven P1 threads remain unresolved/outdated: `PRRT_kwDOTiNyWc6bfPvI`, `PRRT_kwDOTiNyWc6bfPvO`, `PRRT_kwDOTiNyWc6bfPvR`, `PRRT_kwDOTiNyWc6bfWeN`, `PRRT_kwDOTiNyWc6bfel5`, `PRRT_kwDOTiNyWc6bfel6`, `PRRT_kwDOTiNyWc6bfel7`.

### Stable transition rule for #131

If the latest continuity-model repair PR has exact-head CI success, full five-stage owner gate, a genuinely distinct exact-head review with zero unresolved P0/P1/P2, merge, exact-main CI/status success and `POST_MERGE_ASSURANCE_PASS`, then PR #131 becomes the next dependency-closing workstream. Reconcile #131 onto the then-live `main` with exactly one writer, preserving current canonical control-plane semantics. Any moved #131 head invalidates old exact-head release evidence and requires fresh CI, owner gate and genuinely distinct exact-head review.

No additional docs-only reconciliation is required merely because the repair PR's own merge changes the exact `main` SHA.

### PR #131 security boundary retained

The accepted claim remains the narrow local **trusted-provider transport contract**. The controlled transport may admit only module-provenanced controlled providers, must fail closed before unowned provider transport origin, and must prove an in-contract rejected context transport survives `--unhandled-rejections=strict` with zero reference authorization, zero sensitive forwarding and no orphaned rejection termination.

Decorated/rebased/Proxy/accessor/non-configurable-unsafe Promise objects already returned by arbitrary providers remain outside the contract. An already-originated excluded rejected Promise remains an explicit unsupported negative unless separately reviewed process/worker/RPC isolation is introduced. The in-contract survival fixture is not same-process survival proof for that hostile object.

Shared canonicalization, hashing, verifier, Witness, exact authorization, Gate, execution-evidence and observation/reconciliation semantics remain Core-owned. The generic reference provider gateway and existing controlled-host path are not upgraded into hostile-provider-wide or broader operational-readiness claims.

## Historical branches at snapshot authoring

- PR #120: `CLOSED / NOT MERGED / STALE`; final historical head `5238b9c289476100c875ed9a88bd7e21a574fa67`; six P1/P2 findings remain attack history. Never revive wholesale.
- PR #97: `OPEN / STALE / MUST_NOT_MERGE`; head `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`; against `snapshot_base_main` diverged ahead 66 / behind 267, merge-base `0564aecd42cf0794894c12842980969ff59c9f73`.
- PR #93: `OPEN / STALE / UNTRUSTED / LATER`; head `c4e40ceb286f4e59657767661daed15d2b68e9a7`; against `snapshot_base_main` diverged ahead 86 / behind 312, merge-base `818718955c9e4136e9e55754a31be2f1c7b610f8`.

## Architecture and claim boundary

POM-RX remains the single principal technical product. Wallet Guard remains an application profile. Shared Core owns canonicalization, hashing, verifier, Witness, exact authorization, Gate, execution evidence and observation/reconciliation semantics. Durable Gate composition remains later and untrusted; simulation reconstruction remains later still.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded. It is not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.

## Next safe action rule

First complete the continuity-model repair under normal exact-head gates and exact-merge assurance. If and only if the latest repair receives `POST_MERGE_ASSURANCE_PASS`, resume PR #131 by reconciling it onto the then-live main and run a wholly fresh exact-head release cycle. Only after #131 itself receives exact-merge assurance PASS may durable Gate composition be reconstructed; PR #93 remains later in dependency order.

## Safety boundary

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction, meaningful funds or uncontrolled malicious-site interaction is authorized. Burner local/testnet E2E remains behind a separate explicit human gate. Public website/Vercel/funding-directory writes are outside this control plane.
