# POM-RX Prime automation policy

Automation ID: `swisstokint-ex-cution-financements`

Cadence: hourly heartbeat on the existing POM-RX task. Do not create a duplicate
automation.

## Objective

Advance one bounded READY task per useful cycle until the exact-head release gate
can truthfully set `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`.

The target is a local, deterministic, synthetic, offline demonstrator with
strict verification, reviewed Witness, exact authorization, fail-closed
single-use Gate, synthetic execution, independent observation, reconciliation,
manifest and checksums. It is never a production, audit, certification,
deployment, wallet, exchange or financial-execution claim.

POM-RX remains the single principal technical product. Application domains are
organized as capability blocks rather than peer products. The current product
map is `docs/product/POM_RX_CAPABILITY_MAP.md`.

## Prime level 3 cycle

1. Acquire the single-flight lock. If an active lock is younger than 45 minutes,
   return `SKIPPED_PREVIOUS_RUN_ACTIVE` and modify nothing.
2. Fetch/prune and revalidate main, status, worktrees, open/merged PRs, reviews,
   comments and CI. Never work in a dirty checkout owned by another lot.
3. Reconcile this versioned control plane. Do not restart a global audit.
4. Select exactly one READY task with measurable acceptance and exclusive file
   ownership.
5. Route only the justified specialists: Prime lead, architecture, security,
   skeptical/falsification review, spec/TDD implementer, QA/conformance, code
   review, performance or CI repair, and independent release gate.
6. Use one writer in one isolated worktree; reviewers are read-only. Maximum
   three active subagents and two code worktrees. Reviews may run sequentially
   to preserve independence without increasing parallelism.
7. Apply the mandatory five-stage merge gate defined in
   `POM_RX_SKEPTICAL_REVIEW_GATE.md`:
   - review pass 1;
   - control pass 1;
   - skeptical challenge;
   - exact-head review pass 2;
   - exact-head control pass 2 / release gate.
8. Control passes include targeted tests plus relevant regression,
   compatibility, expected-red, checksum, secret-scan, dependency-audit and
   `git diff --check` evidence where applicable. A changed head invalidates the
   exact-head second review/control.
9. Commit and push every useful lot to a dedicated branch before cycle end.
   Open or update one scoped PR. Never force-push.
10. Standing user authorization permits non-Tier-B coordination/docs/tests/CI
    merges after the full five-stage gate is satisfied. Tier-B changes retain a
    PR-specific explicit human gate unless the user has explicitly granted a
    broader standing authorization for the named scope. No standing authority
    can waive a `SKEPTIC_BLOCK`, failing CI or unresolved P0/P1.
11. Remove only clean obsolete local worktrees whose commits are reachable on
    GitHub. Preserve dirty/unowned work on a dedicated remote branch first.
12. Release lock cleanly and record the cycle report.

## Product/capability organization

The public-site application domains are the logical development blocks:

1. payments and financial operations;
2. autonomous and AI agents;
3. enterprise APIs and systems;
4. cybersecurity and critical-action control;
5. blockchain and digital assets.

`POM-RX Wallet Guard` belongs under blockchain/digital assets. It is one POM-RX
application profile, not the whole product. `POM-RX Governance Profile — DAGR`
is cross-cutting and subordinate to POM-RX, not a peer product. Filecoin,
Stellar and other network/storage work remains supporting integration/adapter
infrastructure unless a specific reviewed adapter actually enforces an
execution Gate.

Do not perform a cosmetic mass move of frozen protocol, verifier or fixture
paths. Reorganization is information-architecture first; physical moves require
separate compatibility-preserving PRs with link/hash/path impact review.

## Delivery order

1. maintain the single-repository control plane and preservation discipline;
2. complete strict-profile invariant families in scoped PRs;
3. complete strict-profile activation only after the full invariant matrix;
4. implement the Wallet Guard simulated vertical slice: trusted request capture,
   normalization/decoding, local policy and fail-closed single-use Gate;
5. extend Witness semantics with enrollment, revocation, trusted-clock and
   durability requirements appropriate to the bounded test scope;
6. add simulation/effect evidence, independent observation and reconciliation;
7. reach `WALLET_GUARD_SIMULATED_READY` with controlled attack fixtures;
8. only after a separate human gate, run a burner-wallet local/testnet E2E with
   no meaningful funds and reach `WALLET_GUARD_BURNER_E2E_READY` if evidence is
   exact;
9. continue other application blocks as separate scoped integrations without
   weakening shared Core semantics;
10. add source-backed POM-RX Governance Profile — DAGR when its source gate is
    satisfied;
11. produce deterministic manifests/checksums, two-clean-checkout reproduction
    and site handoff artifacts for each bounded operational claim.

## Absolute boundaries

- one repository only: `SwissTokint/swisstokint-open-risk-infrastructure`;
- no website, Vercel or funding-directory write from this control plane;
- no real production key, funded wallet, exchange credential, funds, live order
  or uncontrolled malicious-site interaction;
- no local Docker startup unless a later explicit operator decision changes that
  workstation boundary;
- no release or deployment without a separate explicit gate;
- no DAGR content invented without an authorized source; current historical
  control state records `DAGR_SOURCE_DOCUMENT_MISSING` until resolved;
- no legacy result, internal readiness result or standalone strict verdict may
  be treated as execution authorization;
- no stale historical PR is merged wholesale merely to recover useful code;
  salvage useful parts onto current main through a new scoped PR;
- no domain reputation, UI warning, blockchain anchor or simulation result may
  substitute for the execution-side Gate when a claim requires blocking.

## Notification gate

Notify only for a pushed commit, new or materially updated PR, green exact-head
merge gate, CI/gate change, P0/P1 blocker, skeptical block, critical ADR,
corrected invariant, Witness/Gate/profile/demo readiness, completed site handoff
or major human blocker. Otherwise return `DONT_NOTIFY`.
