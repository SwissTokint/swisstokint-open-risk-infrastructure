# POM-RX Prime automation policy

Automation ID: `swisstokint-ex-cution-financements`

Cadence: hourly heartbeat on the existing POM-RX scheduled task. Do not create a duplicate POM-RX automation.

## Objective

Advance one bounded READY task per useful cycle until the exact-head release gate can truthfully set `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`.

The target is a local, deterministic, synthetic, offline demonstrator with strict verification, reviewed Witness, exact authorization, fail-closed single-use Gate, synthetic execution evidence, independent observation, reconciliation, manifest and checksums. It is never a production, audit, certification, deployment, wallet, exchange or financial-execution claim.

POM-RX remains the single principal technical product. Application domains are capability blocks rather than peer products. The current product map is `docs/product/POM_RX_CAPABILITY_MAP.md`. Wallet Guard is one POM-RX application profile, primarily under Blockchain and digital assets and overlapping Cybersecurity.

## Durable continuity across scheduled-task chats

Conversation history is not durable project state. GitHub is the continuity source of truth. Every run reconstructs state from the repository and live GitHub metadata.

At the start of every run, before selecting work:

1. read the live `main` SHA, recent merges, open PRs, actual PR heads, CI, reviews and unresolved review threads;
2. read this policy, `POM_RX_COORDINATION_GUARD.md`, `POM_RX_RESUME_CHECKPOINT.md`, `POM_RX_TASKS.yaml`, `POM_RX_BLOCKERS.md`, `POM_RX_TEAM_ROSTER.md`, `POM_RX_SKEPTICAL_REVIEW_GATE.md`, `POM_RX_POST_MERGE_ASSURANCE_GATE.md`, `docs/product/POM_RX_CAPABILITY_MAP.md` and `ARCHITECTURE.md`;
3. treat live GitHub as authoritative whenever a versioned snapshot is older than live metadata;
4. never infer current readiness from an old PR body or snapshot whose candidate head moved;
5. never infer independent approval from a review on a different SHA.

Before ending a meaningful cycle, persist the durable continuation state in GitHub. The exact live `main` SHA, exact candidate/merge SHA, CI, review state, post-merge verdict and next safe action are written to the active/merged PR as a terminal `CONTINUITY_CHECKPOINT`. `POM_RX_RESUME_CHECKPOINT.md` remains the compact cross-chat **versioned snapshot** and is reconciled when durable project facts change: open workstream, merge/post-merge verdict, active P0/P1/P2 blocker, dependency order, claim boundary or next safe action. TASKS, BLOCKERS, TEAM_ROSTER and the capability map are reconciled when their durable facts change.

### Non-self-referential checkpoint rule

A Git commit cannot contain its own future merge SHA. Therefore versioned control-plane files must never masquerade a pre-merge parent SHA as the exact live `main` after their own merge, and must never describe their own coordination PR as a perpetually "current" workstream.

Use two separate evidence classes:

- **live exact state** — read from GitHub every run and persisted after merge in the merge PR terminal checkpoint, including exact live `main`, exact-main CI/status, post-merge verdict, open PR heads/reviews/threads and next safe action;
- **versioned snapshot state** — records `snapshot_base_main`, `last_assured_main_before_snapshot`, durable blockers/dependency rules and the workstream transition rule. These are explicitly historical-at-authoring anchors, not claims that the embedded SHA is the current GitHub head forever.

A control-plane-only merge does **not** require another control-plane-only reconciliation solely because its own merge SHA differs from `snapshot_base_main`. That unavoidable self-merge delta is resolved by live GitHub plus the merge PR terminal checkpoint. A new scoped control-plane PR is required only when a versioned statement would otherwise be materially false about a durable project fact, such as the active workstream, blocker state, dependency order, security/claim boundary or next safe action.

This rule is not a waiver of live-state verification: live GitHub always wins, and exact post-merge state must still be persisted before the run ends. It prevents an infinite reconciliation loop while keeping one canonical repository control plane. Do not create another project-management system merely to solve chat continuity.

## Verified agent and review routing

Roles describe responsibilities, not fictitious running agents. A role counts as independently exercised only when there is actual evidence of a distinct review lane.

- **PRIME LEAD / INTEGRATOR** — accountable orchestration, live-GitHub reconciliation, dependency ordering, file ownership and final integration. Never independent from work it writes or coordinates.
- **PROTOCOL / SYSTEMS ARCHITECT** — read-only review of Core boundaries, schemas, canonicalization, compatibility, ownership and simpler alternatives.
- **SECURITY / ADVERSARIAL SKEPTIC** — read-only falsification of replay, substitution, TOCTOU, trusted-time, object/intrinsic poisoning, fail-open behavior and overclaims. Tier-B work requires concrete attack hypotheses.
- **SINGLE IMPLEMENTER** — exactly one writer for one bounded lot and explicit owned file set. No direct `main` edits.
- **QA / CONFORMANCE** — independent-from-writer tests, negative cases, expected-red, compatibility and false-PASS detection.
- **CODE QUALITY / OPTIMIZATION** — read-only duplication, TCB size, deterministic behavior, maintainability and evidence-based performance review.
- **INDEPENDENT RELEASE GATE** — only a genuinely distinct exact-head reviewer recorded in GitHub evidence counts. A fresh `chatgpt-codex-connector` review may satisfy this lane only when it actually covers the exact frozen candidate SHA and leaves no unresolved P0/P1/P2. Release-owner, assistant, self-review or a moved-head review is not independent.

Do not claim that Claude, another model, another human or another agent performed a review unless the evidence identifies that route. Missing independence is `INDEPENDENT_REVIEW_PENDING`/BLOCK, never an invented lane.

Use one writer. Reviewers remain read-only. Maximum three active specialist lanes and two code worktrees. Single-flight coordination is mandatory: two overlapping automation invocations must never both enter or continue a writer lane concurrently.

## Canonical single-flight coordination guard

The operational single-flight mechanism is defined exclusively in `docs/project-management/pom-rx-core/POM_RX_COORDINATION_GUARD.md`.

Canonical state is stored only at:

- branch `automation/pom-rx-coordination`;
- file `.pom-rx/coordination-lock.json`;
- schema `pom-rx-coordination-lock/1`;
- active-window duration 45 minutes.

Acquisition uses the GitHub contents blob SHA as a compare-and-swap token. Automation may acquire **only `state=FREE`**. A run may enter a writer lane only after it has successfully updated that exact FREE blob SHA and then re-read the file to verify `state=HELD`, exact own `holder.run_id` and a future `expires_at`.

A `HELD` lock with a future expiry means `SKIPPED_PREVIOUS_RUN_ACTIVE`. A `HELD` lock whose expiry has passed is **stale but still blocking**: automation must return `SKIPPED_COORDINATION_GUARD_UNAVAILABLE` and must not overwrite or reclaim it. This is deliberate because the coordination file cannot atomically fence separate GitHub PR/ref/comment/merge mutations at an expiry boundary.

Immediately before every state-changing project action, the invocation must re-read the canonical lock and require valid schema/configuration, `state=HELD`, exact own `holder.run_id`, and future `expires_at`. After its active window expires it performs no more project writes and must not renew, extend or reacquire in the same invocation.

The exact current holder may still perform the narrowly scoped coordination-only release after expiry, because other automation is forbidden from reclaiming the stale lock. Release uses the exact current blob SHA, sets `FREE`/`holder=null` with a unique RELEASE transition, and must be re-read as FREE. A crashed holder's stale lock requires explicit human recovery; automation never clears another holder.

Lock writes occur only on the coordination branch. Normal acquisition/release must not move `main`, a feature PR, or a control-plane PR. No issue, label, comment, workflow artifact, local file, chat state or alternate branch may serve as a competing lock.

The coordination branch/file may be bootstrapped only under explicit human instruction when the canonical guard is absent. After bootstrap, automation must never recreate, rename, replace or fork the mechanism. Future changes require a scoped reviewed control-plane PR.

## Prime level 3 cycle

1. Acquire and verify the canonical single-flight coordination lock **before entering a writer lane**, exactly as defined in `POM_RX_COORDINATION_GUARD.md`. Acquisition is mandatory, never best-effort. Active unexpired HELD => `SKIPPED_PREVIOUS_RUN_ACTIVE`; expired/malformed/unreadable/unverifiable HELD or failed acquisition => `SKIPPED_COORDINATION_GUARD_UNAVAILABLE`. Those paths modify no project state and do not reclaim the lock.
2. Revalidate live `main`, open/merged PRs, actual heads, reviews, threads and CI.
3. Reconcile versioned snapshot facts using the non-self-referential continuity rule above. Do not restart an unfocused global audit every hour and do not generate an endless docs-only loop merely to chase a merge SHA.
4. Select exactly one bounded READY task with measurable acceptance and exclusive file ownership. Prefer the smallest dependency-closing lot.
5. Route only justified specialist roles; one writer, reviewers read-only.
6. Before **every** project mutation after acquisition, revalidate the canonical lock. Require same holder and future expiry. Loss/expiry/unverifiability immediately ends project-writing authority; do not renew, extend or reacquire in the same invocation.
7. Apply the mandatory five-stage merge gate defined in `POM_RX_SKEPTICAL_REVIEW_GATE.md`: Review pass 1, Control pass 1, Skeptical challenge, Review pass 2 on the exact frozen head, Control pass 2 / release gate.
8. Control passes include targeted tests plus relevant regression, compatibility, expected-red, checksum, secret-scan, dependency-audit and `git diff --check` evidence where applicable. A changed head invalidates exact-head evidence.
9. Commit and push every useful lot to a dedicated branch. Never force-push and never edit `main` directly.
10. Standing authorization permits POM-RX merges without per-PR approval only after the **full five-stage gate is satisfied**, all applicable technical/security gates pass on the exact current head, canonical exact-head CI is green, required independent exact-head review is present, and zero P0/P1/P2 remains unresolved. The independent-review waiver remains limited to PR #60.
11. After every non-trivial merge, run the exact-merge-SHA post-merge assurance in `POM_RX_POST_MERGE_ASSURANCE_GATE.md` before treating the lot as trusted.
12. A merged lot without `POST_MERGE_ASSURANCE_PASS` **must not be used as trusted evidence** for later readiness, release, deployment or dependent Tier-B work. Conditional/block findings are repaired through a new PR, never patched directly on `main`.
13. Persist the exact live terminal state in the merge/active PR checkpoint and reconcile versioned durable facts only when required by the snapshot rule.
14. Release the canonical lock on every terminal path where this invocation is still the exact holder. Project-writing authority still requires future expiry, but coordination-only same-holder release is allowed after expiry. Re-fetch exact blob SHA, verify same holder, CAS to `FREE`/`holder=null`, then re-read FREE. Never release another holder. A release failure or stale lock left by a crashed holder is a coordination blocker; clearing another holder requires explicit human recovery.

## Post-merge assurance discipline

Post-merge assurance is read-only over the exact merged `main` state and is additive to pre-merge review. After every non-trivial merge it runs, in scope, **SpecKit reconciliation, skeptical/falsification review, security audit, code-quality review, optimization review and integration/regression evidence** before a PASS/CONDITIONAL/BLOCK verdict is recorded.

The canonical exact-main status context is `pom-rx/exact-main-ci`. PASS still requires decision-time revalidation of the canonical `.github/workflows/ci.yml` run/attempt as defined in `POM_RX_POST_MERGE_ASSURANCE_GATE.md`; the status alone is insufficient because observation and status publication are separate operations.

A post-merge finding never justifies silently weakening tests, diagnostics, security boundaries or public wording. Material findings create a scoped repair PR. Prefer simpler fail-closed code and smaller trusted computing bases over speculative optimization.

## Product/capability organization

Public application blocks retain these labels:

1. Payments and financial operations;
2. AI agents;
3. APIs and enterprise systems;
4. Cybersecurity;
5. Blockchain and digital assets.

`POM-RX Wallet Guard` belongs primarily under Blockchain and digital assets and also overlaps Cybersecurity. It remains an application profile, not the whole product. `POM-RX Governance Profile — DAGR` is cross-cutting and subordinate to POM-RX. Filecoin, Stellar and other network/storage work remains supporting integration/adapter infrastructure unless a reviewed adapter actually enforces an execution Gate.

Do not mass-move frozen protocol or fixture paths for cosmetic reorganization. Application blocks may own adapters, profiles, fixtures and tests, but must not create competing copies of shared POM-RX canonicalization, hashing, verifier, Witness, exact authorization, Gate, execution-evidence or observation/reconciliation semantics.

## Delivery order

1. keep one repository control plane using the non-self-referential checkpoint rule and the canonical single-flight coordination guard;
2. finish or block currently open Tier-B lots on their actual exact heads;
3. close the fresh Wallet Guard trusted-provider transport prerequisite before durable Gate composition or stale simulation work is reconstructed;
4. compose the durable claim primitive with the common Gate only after its prerequisite is trusted;
5. reconstruct Wallet Guard simulation evidence without widening Core and separately review simulation-to-forwarding composition;
6. compose Core-verified Witness authorization, preflight, policy state and controlled-host/provider paths;
7. produce the first deterministic controlled Wallet Guard demonstration;
8. only after a separate explicit human execution gate, consider burner-wallet local/testnet E2E with no meaningful funds;
9. add source-backed DAGR only when its source gate is satisfied;
10. maintain deterministic manifests/checksums and bounded handoff artifacts for every readiness claim.

## Absolute boundaries

- one repository only: `SwissTokint/swisstokint-open-risk-infrastructure`;
- no website, Vercel or funding-directory write from this control plane;
- no real production key, funded wallet, exchange credential, funds, live order or uncontrolled malicious-site interaction;
- no release or deployment without a separate explicit gate;
- no DAGR content invented without an authorized source;
- no legacy result, internal readiness result or standalone strict verdict may be treated as execution authorization;
- **no stale historical PR is merged wholesale** merely to recover useful code; salvage useful parts onto current trusted `main` through a new scoped PR;
- **no domain reputation, UI warning, blockchain anchor or simulation result may substitute for the execution-side Gate** when a claim requires blocking.

## Notification gate

Notify only for a pushed commit, new/materially updated PR, green exact-head merge gate, post-merge assurance verdict/change, CI/gate change, P0/P1/P2 blocker, skeptical block, critical ADR, corrected invariant, Witness/Gate/profile/demo readiness, completed handoff or major human blocker. Otherwise return `DONT_NOTIFY`.
