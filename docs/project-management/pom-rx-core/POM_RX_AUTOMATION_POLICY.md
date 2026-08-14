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

## Prime level 3 cycle

1. Acquire the single-flight lock. If an active lock is younger than 45 minutes,
   return `SKIPPED_PREVIOUS_RUN_ACTIVE` and modify nothing.
2. Fetch/prune and revalidate main, status, worktrees, open/merged PRs, reviews,
   comments and CI. Never work in a dirty checkout owned by another lot.
3. Reconcile this versioned control plane. Do not restart a global audit.
4. Select exactly one READY task with measurable acceptance and exclusive file
   ownership.
5. Route only the justified specialists: Prime lead, architecture, security,
   adversarial review, spec/TDD implementer, QA/conformance, code review,
   performance or CI repair, and independent release gate.
6. Use one writer in one isolated worktree; reviewers are read-only. Maximum
   three subagents and two code worktrees.
7. Freeze and review the diff, run targeted tests plus relevant regression,
   compatibility, expected-red, checksum, audit and `git diff --check` gates.
8. Commit and push every useful lot to a dedicated branch before cycle end.
   Open or update one scoped PR. Never force-push.
9. Standing user authorization permits non-Tier-B coordination/docs/tests/CI
   merges after exact-head review and green CI. Tier-B changes retain a
   PR-specific explicit human gate, except a source-backed DAGR profile for
   which the user granted standing merge authorization after council/ADR,
   exact-head Protocol/Security/QA review and green CI.
10. Remove only clean obsolete local worktrees whose commits are reachable on
    GitHub. Preserve dirty/unowned work on a dedicated remote branch first.
11. Release lock cleanly and record the cycle report.

## Delivery order

1. single-repository control plane and safe preservation cleanup;
2. fresh-Windows exact-LF checkout correction without weakening fixture verification;
3. explicit semantic ratification/reconciliation of the R3 strict-profile ADR;
4. internal strict-profile foundation;
5. invariant families, one scoped PR each;
6. complete strict-profile activation;
7. Witness council/ADR and local implementation;
8. exact authorization and transactional single-use Gate council/ADR and local
   implementation;
9. source-backed POM-RX Governance Profile — DAGR;
10. synthetic execution, independent observation and reconciliation;
11. local demo runtime, deterministic manifests/checksums, two-clean-checkout
   reproduction and site handoff artifact.

## Absolute boundaries

- one repository only: `SwissTokint/swisstokint-open-risk-infrastructure`;
- no website, Vercel or funding-directory write;
- no real key, wallet, exchange, funds, order or network transaction;
- no local Docker startup;
- no release or deployment;
- no DAGR content invented without an authorized source; current state is
  `DAGR_SOURCE_DOCUMENT_MISSING`;
- no legacy result, internal readiness result or standalone strict verdict may
  be treated as execution authorization;
- no merge of stale PR #24 as a whole.

## Notification gate

Notify only for a pushed commit, new or materially updated PR, green exact-head
merge gate, CI/gate change, P0/P1 blocker, critical ADR, corrected invariant,
Witness/Gate/DAGR/demo readiness, completed site handoff or major human blocker.
Otherwise return `DONT_NOTIFY`.
