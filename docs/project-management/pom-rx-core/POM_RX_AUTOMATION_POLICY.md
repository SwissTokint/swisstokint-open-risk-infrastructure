# POM-RX Prime automation policy

Automation ID: `swisstokint-ex-cution-financements`

Cadence: hourly heartbeat on the existing POM-RX scheduled task. Do not create a
duplicate POM-RX automation.

## Objective

Advance one bounded READY task per useful cycle until the exact-head release gate
can truthfully set `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`.

The target is a local, deterministic, synthetic, offline demonstrator with
strict verification, reviewed Witness, exact authorization, fail-closed
single-use Gate, synthetic execution evidence, independent observation,
reconciliation, manifest and checksums. It is never a production, audit,
certification, deployment, wallet, exchange or financial-execution claim.

POM-RX remains the single principal technical product. Application domains are
organized as capability blocks rather than peer products. The current product
map is `docs/product/POM_RX_CAPABILITY_MAP.md`.

## Durable continuity across scheduled-task chats

The scheduled runner may execute in an associated task conversation that is not
the same conversation as an interactive project chat. Conversation history is
therefore **not** a durable project-state mechanism.

GitHub is the continuity source of truth. Every run must reconstruct state from
the repository and live GitHub metadata rather than assuming that a previous
chat is visible.

At the start of every run, before selecting work:

1. read the live `main` SHA, recent merges, open PRs, actual PR heads, CI,
   reviews and unresolved review threads;
2. read this policy, `POM_RX_RESUME_CHECKPOINT.md`, `POM_RX_TASKS.yaml`,
   `POM_RX_BLOCKERS.md`, `POM_RX_TEAM_ROSTER.md`,
   `POM_RX_SKEPTICAL_REVIEW_GATE.md`, `POM_RX_POST_MERGE_ASSURANCE_GATE.md`,
   `docs/product/POM_RX_CAPABILITY_MAP.md` and `ARCHITECTURE.md`;
3. treat live GitHub as authoritative when a control-plane document is stale;
4. never infer current readiness from an old PR body whose `head_sha` has moved;
5. never infer independent approval from a review on a different SHA.

Before ending a **meaningful** cycle, persist the continuation state in GitHub.
`POM_RX_RESUME_CHECKPOINT.md` is the compact cross-chat checkpoint and must be
reconciled whenever any of these change materially: trusted `main`, open
workstream, merge/post-merge verdict, active P0/P1/P2 blocker, dependency order,
or next safe action. `POM_RX_TASKS.yaml`, `POM_RX_BLOCKERS.md` and the capability
map are reconciled when their facts change. Historical detail remains available
through Git history; stale historical state must not be left masquerading as the
current state.

Do not create another project-management system merely to solve chat continuity.
The task result should also contain a compact `CONTINUITY_CHECKPOINT` matching
the GitHub-backed state so a human can quickly compare the task conversation to
the repository.

## Verified agent and review routing

Roles describe responsibilities, not fictitious running agents. A role counts
as independently exercised only when there is actual evidence of a distinct
review lane.

- **PRIME LEAD / INTEGRATOR** — accountable orchestration, live-GitHub
  reconciliation, dependency ordering, file ownership and final integration.
  This lane is never independent from work it writes or coordinates.
- **PROTOCOL / SYSTEMS ARCHITECT** — read-only review of Core boundaries,
  schemas, canonicalization, compatibility, ownership and simpler alternatives.
- **SECURITY / ADVERSARIAL SKEPTIC** — read-only falsification of replay,
  substitution, TOCTOU, trusted-time, object/intrinsic poisoning, fail-open
  behavior and overclaims. Tier-B/security work requires concrete attack
  hypotheses, not generic approval prose.
- **SINGLE IMPLEMENTER** — exactly one writer for one bounded lot and explicit
  owned file set. No direct `main` edits.
- **QA / CONFORMANCE** — tests, negative cases, expected-red, compatibility and
  false-PASS detection independently from the writer where applicable.
- **CODE QUALITY / OPTIMIZATION** — read-only review of duplication, TCB size,
  deterministic behavior, maintainability and evidence-based performance.
- **INDEPENDENT RELEASE GATE** — only a genuinely distinct exact-head reviewer
  recorded in the review evidence counts. A fresh GitHub review by
  `chatgpt-codex-connector` may satisfy this lane when it actually covers the
  exact current candidate SHA and leaves no unresolved P0/P1/P2. A release-owner,
  assistant, self-review or review of a moved head does not count as independent.

Do not claim that Claude, another model, another human or another agent performed
a review unless the review evidence actually identifies that route. A missing
independent reviewer is `INDEPENDENT_REVIEW_PENDING` or a block, never a reason
to fabricate a lane.

Use one writer. Reviewers remain read-only. Maximum three active specialist
lanes and two code worktrees. Reviews may run sequentially to preserve
independence without increasing parallelism.

## Prime level 3 cycle

1. Acquire the single-flight lock. If an active lock is younger than 45 minutes,
   return `SKIPPED_PREVIOUS_RUN_ACTIVE` and modify nothing.
2. Revalidate live `main`, open/merged PRs, actual heads, reviews, threads and CI.
   Never work from a stale PR-body status sentence when GitHub metadata differs.
3. Reconcile the versioned control plane using the durable-continuity rules
   above. Do not restart an unfocused global audit every hour.
4. Select exactly one bounded READY task with measurable acceptance and exclusive
   file ownership. Prefer the smallest dependency-closing lot.
5. Route only the justified roles from the verified routing section.
6. Use one writer in one isolated branch/worktree; reviewers are read-only.
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
9. Commit and push every useful lot to a dedicated branch before cycle end. Open
   or update one scoped PR. Never force-push.
10. The current standing user authorization permits future POM-RX PR merges
    without per-PR approval only after the full five-stage gate is satisfied and
    every other applicable technical/security gate passes on the exact current
    head. No standing authority waives a `SKEPTIC_BLOCK`, failing CI, unresolved
    P0/P1/P2 or a required independent review. The independent-review waiver
    remains limited to PR #60 unless the user explicitly broadens it.
11. After every non-trivial merge, run the exact-merge-SHA post-merge assurance
    cycle in `POM_RX_POST_MERGE_ASSURANCE_GATE.md` before treating the lot as a
    completed trusted dependency.
12. A merged lot without `POST_MERGE_ASSURANCE_PASS` must not be used as trusted
    evidence for a later readiness, release, deployment or dependent Tier-B
    merge claim. Conditional/block findings are repaired through a new PR; never
    patch `main` directly.
13. Preserve dirty/unowned work before cleanup and remove only clean obsolete
    local worktrees whose commits are reachable on GitHub.
14. Release the lock cleanly and persist the continuity checkpoint when the
    authoritative state changed.

## Post-merge assurance discipline

The post-merge cycle is additive to pre-merge review, not a substitute for it.
It is read-only over the merged `main` state and binds its report to the exact
merge SHA. After every non-trivial merge it explicitly runs SpecKit
reconciliation, skeptical/falsification review, security audit, code-quality
review, optimization review and integration/regression evidence before a scoped
post-merge verdict is recorded.

The canonical exact-main status context is `pom-rx/exact-main-ci`. A PASS still
requires decision-time revalidation of the canonical `.github/workflows/ci.yml`
run/attempt as defined in `POM_RX_POST_MERGE_ASSURANCE_GATE.md`; the status by
itself is not enough because the freshness lookup and status write are separate
operations.

A post-merge finding never justifies silently weakening tests, diagnostics,
security boundaries or public wording. Material findings create a scoped repair
PR. Optimization is evidence-driven: prefer simpler fail-closed code over
micro-optimizations that expand the trusted computing base.

## Product/capability organization

The public-site application domains are the logical development blocks and keep
the same public labels:

1. Payments and financial operations;
2. AI agents;
3. APIs and enterprise systems;
4. Cybersecurity;
5. Blockchain and digital assets.

`POM-RX Wallet Guard` belongs primarily under Blockchain and digital assets and
also overlaps Cybersecurity. It is one POM-RX application profile, not the whole
product. `POM-RX Governance Profile — DAGR` is cross-cutting and subordinate to
POM-RX. Filecoin, Stellar and other network/storage work remains supporting
integration/adapter infrastructure unless a reviewed adapter actually enforces
an execution Gate.

Do not perform a cosmetic mass move of frozen protocol, verifier or fixture
paths. Reorganization is information-architecture first; physical moves require
separate compatibility-preserving PRs with link/hash/path impact review.

Application blocks may own domain adapters, profiles, fixtures and tests. They
must not create competing copies of shared POM-RX canonicalization, hashing,
verifier, Witness, exact authorization, Gate, execution-evidence or
observation/reconciliation semantics.

## Current delivery order

1. keep the single-repository control plane and cross-chat checkpoint current;
2. finish or block the currently open Tier-B lots on their **actual** exact
   heads rather than their stale PR-body head labels;
3. compose the durable claim primitive with the common single-use Gate only
   after its current exact-head security findings are closed and independently
   re-reviewed;
4. complete Wallet Guard simulation evidence without widening shared Core
   semantics, then separately review simulation-to-forwarding composition;
5. compose Core-verified Witness authorization, preflight, policy state and
   controlled-host/provider paths without reintroducing synthetic authorization
   into the stronger fixture claim;
6. produce the first deterministic controlled Wallet Guard demonstration:
   dangerous approval/signature non-forwarding plus one explicitly allowed
   control forwarded exactly once and reconciled;
7. only after a separate explicit human execution gate, consider a burner-wallet
   local/testnet E2E with no meaningful funds;
8. continue other application blocks as separate scoped integrations without
   weakening shared Core semantics;
9. add source-backed DAGR only when its source gate is satisfied;
10. maintain deterministic manifests/checksums and bounded handoff artifacts for
    every readiness claim.

## Absolute boundaries

- one repository only: `SwissTokint/swisstokint-open-risk-infrastructure`;
- no website, Vercel or funding-directory write from this control plane;
- no real production key, funded wallet, exchange credential, funds, live order
  or uncontrolled malicious-site interaction;
- no release or deployment without a separate explicit gate;
- no DAGR content invented without an authorized source;
- no legacy result, internal readiness result or standalone strict verdict may
  be treated as execution authorization;
- no stale historical PR is merged wholesale merely to recover useful code;
  salvage useful parts onto current trusted `main` through a new scoped PR;
- no domain reputation, UI warning, blockchain anchor or simulation result may
  substitute for the execution-side Gate when a claim requires blocking.

## Notification gate

Notify only for a pushed commit, new or materially updated PR, green exact-head
merge gate, post-merge assurance verdict/change, CI/gate change, P0/P1/P2
blocker, skeptical block, critical ADR, corrected invariant,
Witness/Gate/profile/demo readiness, completed handoff or major human blocker.
Otherwise return `DONT_NOTIFY`.
