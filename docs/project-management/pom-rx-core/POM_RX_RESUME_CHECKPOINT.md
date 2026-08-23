# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-23T06:10:00+02:00`

Purpose: compact durable cross-chat continuation state. Scheduled-task chat history is not project state. Live GitHub wins whenever PR heads, CI, reviews, review threads, mergeability or merges differ from this file.

## trusted_main

Exact live/trusted `main`: `73f3921984449ffd6025f6c9b99b0220f0bf068b`.

Latest trusted merge: PR #123 — bounded non-Tier-B control-plane reconciliation.

- exact source head: `6cac168b775b26b572336764271b4f25e934a5ea`;
- exact merge/main SHA: `73f3921984449ffd6025f6c9b99b0220f0bf068b`;
- canonical exact-main push CI: run `32614549879`, CI 789 attempt 1, `completed / success`;
- genuinely distinct exact-head evidence: `chatgpt-codex-connector[bot]` comment `5383774814`, reviewed commit `6cac168b77`, no major issues;
- exact-merge assurance: PR #123 comment `5383940027` = `POST_MERGE_ASSURANCE_PASS`.

PR #123 changed only the canonical coordination/product-position documents. It is trusted coordination evidence and changed no runtime, protocol, Gate, Witness, verifier or Wallet Guard/provider semantics.

## control_plane_reconciliation

The canonical files on trusted `main` still name the pre-PR123 trusted state `cff851b92746af09c224451c82d3da9c3bae176a` / PR #122, while live GitHub is now the assured PR #123 merge `73f3921984449ffd6025f6c9b99b0220f0bf068b`. Live GitHub also shows a fresh exact-head independent P1 on PR #120 that is absent from the canonical files.

Current bounded reconciliation branch: `docs/pom-rx-post-pr123-live-reconcile-20260823`.

Owned files in this lot:

- `docs/project-management/pom-rx-core/POM_RX_RESUME_CHECKPOINT.md`;
- `docs/project-management/pom-rx-core/POM_RX_TASKS.yaml`;
- `docs/project-management/pom-rx-core/POM_RX_BLOCKERS.md`;
- `docs/project-management/pom-rx-core/POM_RX_TEAM_ROSTER.md`;
- `docs/product/POM_RX_CAPABILITY_MAP.md`.

No runtime, test, protocol, Gate, Witness, verifier, Wallet Guard/provider, wallet/network, public-site/Vercel or financial-execution semantics are changed by this reconciliation.

## active_runtime_task

### PR #120 — Wallet Guard rejected-Promise transport prerequisite repair

Live GitHub at this checkpoint:

- PR: `#120`, `OPEN / NOT TRUSTED / BLOCKED`;
- branch: `automation/pom-rx-promise-drift-repair-20260822`;
- target base branch: `main`;
- exact live head: `5238b9c289476100c875ed9a88bd7e21a574fa67`;
- current trusted main: `73f3921984449ffd6025f6c9b99b0220f0bf068b`;
- trusted-main reconciliation merge on the PR branch: `e4c8d4b29cdc875d17c170d6e67a0fd7804d849d`, with prior PR #120 head `2d01503c13b9b22ea136f6bbd169bc2032366b9a` as first parent and trusted main `73f392...` as second parent;
- compare current main -> head: `ahead`, ahead 69 / behind 0, merge-base exactly `73f3921984449ffd6025f6c9b99b0220f0bf068b`;
- GitHub mergeability at revalidation: `true` (volatile conflict metadata, not a security verdict);
- canonical exact-head CI: run `32614831929`, CI 792 attempt 1, `completed / success` on exact `5238b9c...`;
- five-stage release-owner review: review `5001566041` = `PASS_NON_INDEPENDENT`, owner findings `0 P0 / 0 P1 / 0 P2`;
- genuinely distinct exact-head `chatgpt-codex-connector` review: **BLOCK / P1** on exact `5238b9c...` via new unresolved thread `PRRT_kwDOTiNyWc6bc4gh`;
- merge: `BLOCKED`.

Fresh P1 `PRRT_kwDOTiNyWc6bc4gh`: a rejected same-realm native Promise with a non-configurable own unsafe data `constructor` such as `constructor: 1` can make the current safety classifier reject the path and then make constructor shadowing throw before the captured rejection reaction is attached. Under `--unhandled-rejections=strict`, the gateway fails closed but the original rejection can remain orphaned and terminate the process. The current canonical regression only covers the safe non-configurable `constructor: Promise` case, so CI 792 is a false-PASS for this newly reviewed variant.

Required runtime repair remains bounded: do not execute hostile constructor/species accessors or Proxy paths; attach/drain the rejected transport without requiring a successful attacker-controlled constructor shadow first; add a CI-wired strict regression for the non-configurable unsafe data-constructor case proving fail-closed behavior with zero reference authorization and zero sensitive forwarding. Any repair moves the head and invalidates CI 792, owner review `5001566041`, and the exact-head Codex review as release evidence.

Six PR #120 P1/P2 threads are currently unresolved attack history:

- `PRRT_kwDOTiNyWc6bZjxp` — P1, unresolved, non-outdated;
- `PRRT_kwDOTiNyWc6bZ6tx` — P1, unresolved, outdated location;
- `PRRT_kwDOTiNyWc6bZ6tz` — P2, unresolved, outdated location;
- `PRRT_kwDOTiNyWc6baFkR` — P1, unresolved, non-outdated;
- `PRRT_kwDOTiNyWc6baIxZ` — P1, unresolved, outdated location;
- `PRRT_kwDOTiNyWc6bc4gh` — P1, unresolved, current exact-head finding.

Do not resolve any of them merely because later repairs exist. Closure requires one frozen repaired head with green canonical CI, the mandatory five-stage owner gate, a fresh genuinely distinct exact-head review and zero unresolved P0/P1/P2.

## blocked_historical_prs

### PR #97

- exact live head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- state: `OPEN / STALE / MUST_NOT_MERGE`;
- GitHub mergeability at revalidation: `false`.

Do not merge, rebase, revive or wholesale-copy it. Reconstruct durable claim-before-observer/downstream composition later from then-current trusted main only after PR #120 receives exact-merge `POST_MERGE_ASSURANCE_PASS`.

### PR #93

- exact live head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- state: `OPEN / STALE / UNTRUSTED / LATER`;
- GitHub mergeability at revalidation: `false`.

Its historical green CI/reviews are not release evidence. Reconcile useful work later from then-current trusted main rather than merging stale history wholesale.

## architecture_and_claim_boundary

Shared canonicalization, hashing, verifier, Witness, exact authorization, Gate, execution-evidence and observation/reconciliation semantics remain Core-owned. Wallet Guard remains an application profile. Trusted main contains a process-local single-use Gate and a separate filesystem durable claim primitive; durable composition is not yet trusted.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded. It is not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.

## next_safe_actions

1. Complete this scoped post-PR123 control-plane reconciliation through its applicable exact-head gates; do not change runtime in this lot.
2. Keep PR #120 unmerged. Assign exactly one writer to repair current P1 `PRRT_kwDOTiNyWc6bc4gh` on the existing bounded repair stream, without widening the claim to hostile accessors/Proxy/attacker-selected species paths.
3. Add the strict non-configurable unsafe data-constructor regression and preserve zero authorization / zero sensitive forwarding on failure.
4. Freeze the moved PR #120 head and require fresh canonical exact-head CI success.
5. Rerun the mandatory five-stage owner gate with concrete rejected-Promise/constructor/species/accessor/Proxy/strict-unhandled/thenable/Array-poisoning hypotheses.
6. Obtain a fresh genuinely distinct read-only `chatgpt-codex-connector` review on that same exact SHA and require zero unresolved P0/P1/P2.
7. Resolve historical PR #120 threads only when that exact-head evidence justifies closure; revalidate unchanged main/base/head/latest CI/reviews/threads/mergeability immediately before merge.
8. Merge under standing authorization only if every applicable gate passes, then immediately record exact-merge-SHA post-merge assurance.
9. Only after PR #120 becomes trusted, reconstruct durable Gate composition as a fresh bounded Core lot; reconcile PR #93 later in dependency order.

## safety_boundary

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction, meaningful funds or uncontrolled malicious-site interaction is authorized. Burner local/testnet E2E remains behind a separate explicit human gate. Public website/Vercel/funding-directory writes are outside this control plane.
