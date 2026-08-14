# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-14T13:25:00+02:00`

## current_main

`2a65bfb555b2eea942c8724819487df06c94242c`

This is the squash merge of PR #35. PR #36 is also merged below it. Fresh fetch and GitHub listing were completed before this checkpoint.

## open_prs

- #24 — signed POM-RX preflight Witness: draft, stale/conflicting and blocked by Core integrity, enrollment, revocation, clock, persistence, Gate and exact-head reviews.
- #31, #26, #25 and #8 — dependency updates outside the active POM-RX delivery slice.
- #15, #16, #17, #19 and #20 — frozen multichain/adaptor drafts outside POM-RX Core priority.

## stale_prs

- PR #24 may be mined as reviewed source material only. It must not be merged wholesale from its stale dirty worktree.
- Older multichain/adaptor work remains frozen. Cleanup means preservation and local worktree removal, not unreviewed development or remote deletion.

## worktrees

- The primary checkout is on `agent/solana-devnet-anchor-adapter` and has nine dirty paths. It is read-only for POM-RX.
- Six other worktrees contain dirty unpublished material: Witness, historical POM-RX v0.1, Risknet, Tezos and Uniswap lots. They require secret scan and preservation to dedicated GitHub branches before cleanup.
- Clean merged POM-RX worktrees for PR #32–#36 are eligible for local removal after reachability and ownership checks.
- Active coordination worktree: `C:\Dev\pom-rx-prime-control-plane-worktree`, branch `codex/pom-rx-prime-control-plane`.

## active_blockers

- Current readiness is `NO_GO`: legacy verification intentionally reproduces seven vulnerable behaviors and one valid control.
- The internal strict-profile foundation, all invariant families and final profile activation are not implemented.
- Witness, exact authorization, transactional single-use Gate, trusted clock, persistence/recovery, source-backed DAGR, independent observation and end-to-end demo runtime are absent.
- DAGR source material must be located and validated before normative profile content is written; otherwise `DAGR_SOURCE_DOCUMENT_MISSING` remains active.
- Windows fixture evidence retains documented P2 limits: direct-child rather than Job Object containment, PowerShell/Add-Type cost, partial symlink privilege evidence and no Windows-native GitHub CI.
- Fresh Windows checkout currently has an open P1: `.gitattributes` materializes with CRLF and the exact-LF immutable-corpus closure test fails. This requires a separate non-protocol PR; the contract must not be weakened.

## agent_roster

Prime Orchestration level 3 is active. Codex is the accountable Lead and sole writer for the coordination lot. Independent read-only Architecture, Security and Conformance agents completed the operational-target review. Future implementation uses one writer, distinct reviewers and an independent release judge.

## model_routing

- CRITICAL/Tier B: Codex Lead + distinct Protocol/Architecture + distinct Security + independent QA; PR-specific human merge gate.
- HIGH: one `gpt-5.6-sol` implementer + independent security/code review + `gpt-5.6-terra` QA.
- MEDIUM/LOW: `gpt-5.6-terra` plus Codex review unless false-PASS risk requires escalation.
- Requested Claude identities remain unavailable/unverified; use documented Codex fallbacks without claiming Claude approval.

## integration_order

1. Version and merge the single-repository Prime control plane.
2. Fix the fresh-Windows exact-LF checkout failure without weakening the immutable fixture contract.
3. Reconcile and obtain explicit semantic ratification of the R3 strict-profile prerequisite ADR; until then runtime remains blocked.
4. Preserve unpublished dirty work on GitHub and remove only clean obsolete local worktrees.
5. Implement the internal strict-profile foundation with no public export and no invariant correction.
6. Implement action, input, outcome/assertion and receipt-ID invariant families in separate PRs.
7. Activate the strict profile only when the entire required matrix passes.
8. Design and implement the local Witness, exact authorization and transactional single-use Gate behind separate Tier-B councils/ADRs.
9. Add source-backed POM-RX Governance Profile — DAGR, synthetic execution, independent observation and reconciliation.
10. Deliver one-command local demo runtime, deterministic artifacts, manifest, checksums and site handoff.

## first_ready_task

Current task: `R0-PRIME-CONTROL-PLANE-MIGRATION`.

Next task after this control-plane merge: `R3-FIXTURE-WINDOWS-FRESH-CHECKOUT-LF`. It must correct the fresh-Windows exact-LF checkout failure without modifying fixture or protocol bytes.

Then `R3-STRICT-PROFILE-RATIFICATION-RECONCILIATION`, documentation-only, must resolve the source ADR's remaining `PROPOSED / HUMAN_REVIEW_REQUIRED` status and obtain explicit semantic ratification.

First code task only after that ratification and cleanup gates: `R3-STRICT-PROFILE-FOUNDATION-INTERNAL-01`, based on a freshly revalidated `origin/main` in a new isolated worktree.

## files_owned

Current writer owns only `docs/project-management/pom-rx-core/**` on `codex/pom-rx-prime-control-plane`. Protocol, verifier, schema, fixture, Witness, Gate, DAGR, site and funding files are read-only in this lot.

## human_gates

- The user granted standing merge authorization for non-Tier-B coordination, documentation, CI and tests after exact-head review and green CI.
- Source-backed DAGR profile work has standing user merge authorization after its council/ADR, exact-head Protocol, Security and QA approval and green CI. `DAGR_SOURCE_DOCUMENT_MISSING` still blocks normative content today.
- Other Tier-B changes retain PR-specific explicit merge authorization after exact-head Protocol, Security and QA approval.
- No force-push, release, deployment, wallet, exchange, testnet/mainnet transaction or funding submission is authorized.

## site_boundary

The SwissTokint site, Vercel, public demo UI, videos and funding dossier remain owned by separate tasks. POM-RX produces only versioned handoff artifacts in this repository and never edits the site or funding directory.

## operational_claim_boundary

Target: `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY` — a local, deterministic, synthetic, offline demonstration with a fail-closed single-use simulated execution path. This target is not production readiness, an audit, certification, real authorization, financial execution or external security proof.
