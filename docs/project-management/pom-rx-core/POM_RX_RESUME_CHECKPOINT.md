# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-23T03:19:41+02:00`

Purpose: compact **durable cross-chat continuation state**. Scheduled-task chat history is not project state. Every run reconstructs state from live GitHub plus this canonical control plane. Live GitHub wins whenever a PR head, CI run, review, review thread, mergeability signal or merge changes after this checkpoint.

## trusted_main

`06de789768c2cb0d5738161997c6bf104930a174`

Latest trusted merge: PR #121 — bounded non-Tier-B live-state reconciliation.

- exact source head: `05f8964d148266ec7a3435c8959b2c998242294a`;
- exact merge/main SHA: `06de789768c2cb0d5738161997c6bf104930a174`;
- canonical exact-main push CI: run `32598869337`, CI 772 attempt 1, `completed / success`;
- exact-merge assurance: `POST_MERGE_ASSURANCE_PASS`, PR #121 comment `5382634292`.

PR #121 is coordination-only evidence. It changed no runtime, protocol, Gate, Witness, verifier or Wallet Guard/provider semantics.

## control_plane_reconciliation

The canonical main checkpoint still names pre-PR121 trusted main `e5aead150a2ed5f390593cc2d9d307defdd79bdc`, while live GitHub is at `06de789768c2cb0d5738161997c6bf104930a174` and PR #120 has moved substantially since that checkpoint. Per continuity policy, live GitHub wins and this scoped non-Tier-B reconciliation must become trusted before stale main entries are used as dependency/readiness evidence.

Reconciliation branch: `docs/pom-rx-live-state-reconcile-20260823`.

Owned files:

- `docs/project-management/pom-rx-core/POM_RX_RESUME_CHECKPOINT.md`;
- `docs/project-management/pom-rx-core/POM_RX_TASKS.yaml`;
- `docs/project-management/pom-rx-core/POM_RX_BLOCKERS.md`;
- `docs/product/POM_RX_CAPABILITY_MAP.md`.

No runtime, test, protocol, Gate, Witness, verifier, Wallet Guard/provider, wallet, network, public-site/Vercel or financial-execution semantics are changed by this reconciliation.

## active_runtime_task

### PR #120 — Wallet Guard rejected-Promise transport prerequisite repair

Live GitHub at this checkpoint:

- PR: `#120`, `OPEN / MERGEABLE / NOT TRUSTED`;
- branch: `automation/pom-rx-promise-drift-repair-20260822`;
- exact base/main: `06de789768c2cb0d5738161997c6bf104930a174`;
- exact live head: `2d01503c13b9b22ea136f6bbd169bc2032366b9a`;
- canonical exact-head CI: run `32609855025`, CI 785, `completed / success`;
- five-stage release-owner exact-head gate: `PENDING / NON-INDEPENDENT` on this SHA;
- genuinely distinct exact-head `chatgpt-codex-connector` release review: `PENDING` on this SHA;
- merge: `BLOCKED`.

The species-path repair and strict regressions are present on the branch. CI 781 on earlier head `6745422b1e43616dd4f4242d35a9680fefc0cfa5` failed only on the capability-map product-position line-wrap invariant; commit `7803fc18337aecfbe4dd4c9870fe413ffced094c` repaired only that documentation layout without weakening the invariant. Current exact-head CI 785 is green.

Historical distinct Codex P1/P2 threads remain unresolved attack history until one final exact head receives the complete exact-head release evidence:

- `PRRT_kwDOTiNyWc6bZjxp` — P1, unresolved, non-outdated;
- `PRRT_kwDOTiNyWc6bZ6tx` — P1, unresolved, outdated location;
- `PRRT_kwDOTiNyWc6bZ6tz` — P2, unresolved, outdated location;
- `PRRT_kwDOTiNyWc6baFkR` — P1, unresolved, non-outdated;
- `PRRT_kwDOTiNyWc6baIxZ` — P1, unresolved, outdated location.

Do not resolve them merely because repairs exist. Closure requires green exact-head CI, the mandatory five-stage owner gate, a fresh genuinely distinct exact-head review, and zero unresolved P0/P1/P2 on the same frozen SHA.

## blocked_historical_prs

### PR #97

- live head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- state: `OPEN / MUST_NOT_MERGE / STALE`.

Do not merge, rebase, revive or wholesale-copy it. Reconstruct durable claim-before-observer/downstream composition later from then-current trusted main after PR #120 has exact-merge `POST_MERGE_ASSURANCE_PASS`.

### PR #93

- live head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- state: `OPEN / UNTRUSTED / STALE`.

Its historical green CI is not release evidence. Reconcile useful work later from then-current trusted main rather than merging stale history wholesale.

## architecture_and_claim_boundary

Shared canonicalization, hashing, verifier, Witness, exact authorization, Gate, execution-evidence and observation/reconciliation semantics remain Core-owned. Wallet Guard remains an application profile. Trusted main contains a process-local single-use Gate and a separate filesystem durable claim primitive; durable composition is not yet trusted.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded. It is not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.

## next_safe_actions

1. Complete this scoped control-plane reconciliation through its own exact-head CI/review gates; do not change runtime in this lot.
2. After the reconciliation is trusted, reconcile PR #120 to the new trusted main if needed. Any head move invalidates CI 785 and requires fresh exact-head evidence.
3. Freeze PR #120; require canonical exact-head CI success, then run the mandatory five-stage owner gate with concrete species/accessor/Proxy/strict-unhandled-rejection falsification hypotheses.
4. Request a fresh read-only `chatgpt-codex-connector` review on that same exact SHA. It must actually review that SHA and leave zero unresolved P0/P1/P2.
5. Resolve the five historical PR #120 threads only when that exact-head evidence justifies closure.
6. Revalidate unchanged main/base/head/latest CI run+attempt/reviews/threads/mergeability immediately before merge; then merge under standing authorization only if every applicable gate passes.
7. Immediately run and record exact-merge-SHA post-merge assurance before PR #120 becomes a trusted dependency.
8. Only then reconstruct durable Gate composition as a fresh bounded Core lot; reconcile PR #93 later in dependency order.

## safety_boundary

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction, meaningful funds or uncontrolled malicious-site interaction is authorized. Burner local/testnet E2E remains behind a separate explicit human gate. Public website/Vercel/funding-directory writes are outside this control plane.
