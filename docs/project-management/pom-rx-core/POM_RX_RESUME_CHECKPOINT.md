# POM-RX Prime Delivery Checkpoint

Updated: `2026-09-07T10:59:00Z`

This is a compact **versioned snapshot**. GitHub live main/PR/CI/review/thread metadata and merged-PR terminal checkpoints are authoritative. Embedded SHAs are historical-at-authoring anchors, not forever-current main claims. Reconcile durable workstream/blocker/dependency changes; do not create another docs-only merge merely to chase this snapshot's eventual merge SHA.

## Snapshot anchors

- `snapshot_base_main`: `25895be9364903b21704cff223faec92f10354f1` — PR #163 actual merge;
- `last_assured_main_before_snapshot`: `25895be9364903b21704cff223faec92f10354f1`;
- canonical push/main CI #1300 / run `34113836199`, attempt 1: SUCCESS, all 20 steps;
- latest matching `pom-rx/exact-main-ci`: success `53667615499`, published by `github-actions[bot]`;
- distinct six-part [POST_MERGE_ASSURANCE_PASS](https://github.com/SwissTokint/swisstokint-open-risk-infrastructure/pull/163#issuecomment-5569622009);
- [reviewed open-PR routing](https://github.com/SwissTokint/swisstokint-open-risk-infrastructure/issues/143#issuecomment-5569521081).

## Durable transitions

- #136 canonical coordination repair merged as `1cfd3f80638d2fdc67e5088ff1f6ab97f81e300e`; #131 provider prerequisite merged as `5ac3649a4c8fb172bb351c6be3e1541a5dcc1fb5`. They are historical prerequisites, not the next open writer tasks.
- #137 and #138 merged. Their scoped Wallet Guard work is retained in main.
- #176 and #177 separately integrated the journal primitive and server operation facts. #177's original merge `f64a9b951bd989fe6e8501f041449932fa970b26` correctly received a shutdown P2 BLOCK.
- #178 repaired that P2 and passed actual-merge assurance at `2bb90192fc191642501400cd3d1ccd27bcaeb858`, CI1298/run34112025197, [assurance5569395678](https://github.com/SwissTokint/swisstokint-open-risk-infrastructure/pull/178#issuecomment-5569395678). This prospectively resolves the BLOCK; it does not rewrite the earlier verdict.
- #163 refreshed only development declarations and passed the exact-merge assurance above. No runtime Node upgrade was made.
- The retained journal contract records nonterminal ARMED/DISPATCHED/HASH_OBSERVED facts. No automatic recovery/reuse, durable completion, future late-hash retention after exit or bounded shutdown under indefinitely stalled storage is proved. Bootstrap remains Anvil; #139's Sepolia composition is not accepted by implication.

## Reviewed remaining queue

| Work | Snapshot state | Next bounded action |
| --- | --- | --- |
| #175 trusted security CI | Head `43d7d5bd8bb833334c556bd51415e64aecc80383`; CI1287 green; 42 unresolved discussions, including five latest P1 | Highest assurance priority: assertion isolation, authenticated child completion, isolated-runner coverage, uncertain publication handling and invalidation retry; then historical finding adjudication and independent bootstrap proof. |
| #167 prior provenance proposal | Draft; three P1 remain despite CI1192 green | Retain as alternative predecessor to #175; do not merge both as additive fixes. |
| #150 durable Core Gate | Head `8576e43c7585568a630b3c410fb6043930ab88b4`; CI1191 fails npm test; conflicted | Scoped successor on assured main: Node22 channel lifecycle, trusted owner environment/executable capture and pre-await capacity accounting. Existing fd-ownership and all historical unresolved controls remain required. |
| #157 then #156 | #157 is an OPEN Core specification issue; #156 has one architectural P2 | Under the existing single-Core-writer order, address #157 after #150; accept the shared primitive before migrating MCP from its private commitment implementation. |
| #139 Sepolia Wallet Guard | Draft, conflicted old stack; useful work retained | Reconstruct remaining profile/observer/browser scope against current receipt/context/journal/shutdown boundaries. The separate human wallet gate remains. |
| #160 tokenomics research | CI1070 cancelled; three arithmetic/accounting P1 families and later depletion-reporting P2 | Preserve exact conservation, all 3,600 cases and 365/1,825-day horizons; repair the model and reporting, not only sharding or timeout settings. |
| #162 Stellar action | CI1268 green on old base; action SHA changes but explicit CLI version remains 27.0.0 | Clarify action-only scope, refresh main, verify attested installation/build compatibility and obtain fresh review/CI. |

Green historical PR runs are not fresh integration authority. The current canonical PR workflow still uses GitHub's merge candidate: inspect actual checkout logs and commit parents/tree; do not relabel run head metadata as literal-head execution. #175 must preserve that lane while establishing a separate trusted source-head gate; its own bootstrap needs independent proof.

## Canonical coordination and review

Use only `automation/pom-rx-coordination:.pom-rx/coordination-lock.json`, schema `pom-rx-coordination-lock/1`, 45-minute window, per `POM_RX_COORDINATION_GUARD.md`. Acquire only FREE by exact-blob CAS and verify own unexpired holder. Revalidate immediately before every project mutation. Expired HELD is blocking and never automatically reclaimed; no same-invocation renewal. The exact holder may release after expiry using fresh CAS, then verify FREE.

One writer, at most three specialist lanes and two code worktrees. A role name is not evidence that an agent ran. Every applicable five-stage exact-head gate and zero unresolved P0/P1/P2 remain required, followed by exact-merge assurance. The independent-review waiver remains PR #60 only. No policy, guard, regression or expected-red rule changes in this snapshot. Scheduled-task enabled state was not inspected or changed by this update; verify it through the existing automation rather than infer it from old PR bodies.

## Historical sources

#120, #97 and #93 remain historical source material, not active merge authority. Read their live state if needed; never wholesale-merge stale history. The superseded August24 routing and finding records remain in Git history and original PR discussions.

## Next safe action

In a fresh invocation, acquire the canonical guard, re-read exact main and the latest terminal checkpoint, then select one bounded open repair. #175 is the highest assurance priority and remains REWORK; #150 owns the next Core repair, followed by #157 before MCP migration. Preserve #139 for scoped reconstruction. A new head restarts exact-head review/CI evidence; uncertainty is not PASS.

## Architecture and claim boundary

POM-RX remains the single principal technical product; Wallet Guard is one application profile. Core owns shared canonicalization, commitment, verifier, Witness, authorization, Gate, execution evidence and observation/reconciliation semantics.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded. No production, audit, certification, deployment, wallet or financial-safety claim follows from these merges. No real/funded wallet, mainnet transaction, secret or meaningful funds are authorized. Burner local/testnet E2E requires a separate explicit human gate. Public-site/Vercel/funding-directory writes remain out of scope.
