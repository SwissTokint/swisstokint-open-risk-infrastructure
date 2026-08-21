# POM-RX Core — Team Roster and Review Routing

Updated: `2026-08-21T10:40:00+02:00`

## Purpose

This roster defines accountable roles and evidence requirements. It does **not**
claim that a named model, human or agent actually ran merely because a role is
listed.

The repository and GitHub review record are the durable evidence source. A model
or reviewer identity is recorded only when the runtime/review evidence actually
exposes it. Otherwise the route is `UNVERIFIED`, never inferred from a requested
model name.

## Invariants

- One durable repository: `SwissTokint/swisstokint-open-risk-infrastructure`.
- One writer per bounded lot and one owner per file set.
- Maximum three active specialist lanes and two code worktrees.
- Review lanes are read-only unless a separate implementation assignment is
  explicitly created after the review.
- Useful work is committed and pushed to a dedicated branch; no useful result may
  exist only in a local/task-chat scratchpad.
- No direct `main` edits and no force-push.
- A moved head invalidates exact-head CI/review evidence.
- Release-owner/Prime/self-review is never counted as independent evidence.
- A stale independent review remains useful historical input but cannot release a
  different SHA.
- Missing independent review is `INDEPENDENT_REVIEW_PENDING`, never an excuse to
  manufacture another reviewer identity.

## Active role matrix

| Role | Accountability | Mode | Required evidence / routing | Forbidden |
| --- | --- | --- | --- | --- |
| Prime Lead / Integrator | live-GitHub state, dependency order, scope, file ownership, integration and final coordination | accountable; may write only when assigned as the single writer | exact main/head/CI/review reconciliation plus repository-backed continuation checkpoint | claiming independence from own work; direct `main` edits |
| Protocol / Systems Architect | Core/application boundary, schemas, canonicalization, compatibility, ownership and simpler designs | read-only | written architecture verdict tied to the reviewed scope/head where material | implementation ownership in the same review lane; release verdict by assertion |
| Security / Adversarial Skeptic | replay, substitution, TOCTOU, trusted-time, object/intrinsic poisoning, fail-open paths and false security claims | read-only | concrete falsification hypotheses and P0/P1/P2 classification for Tier-B/security lots | implementation writes; generic approval without attack hypotheses |
| Single Implementer | smallest bounded accepted solution | exclusive writer | explicit branch/file ownership, tests and commit/push evidence | second concurrent writer on same files; widening scope to repair unrelated debt |
| QA / Conformance | positive/negative tests, expected-red, compatibility and false-PASS resistance | read-only relative to writer | reproducible test/CI evidence, exact-head binding where release-relevant | approving from plans or unexecuted tests |
| Code Quality / Optimization | TCB size, duplication, deterministic behavior, maintainability and evidence-based performance | read-only | scoped PASS/CONDITIONAL/BLOCK with complexity/boundedness reasoning | micro-optimization that weakens fail-closed behavior |
| Independent Release Gate | independent skeptical/security release evidence | distinct exact-head reviewer | an actually distinct review recorded on the exact candidate SHA with no unresolved P0/P1/P2 | release-owner/self-review; moved-head review; invented reviewer |
| Context / State Ledger | durable cross-chat continuation | coordination | `POM_RX_RESUME_CHECKPOINT.md` plus TASKS/BLOCKERS/CAPABILITY_MAP reconciliation when facts change | creating a parallel project-management system or relying only on chat history |

## Independent-review evidence currently available

The repository has an actual GitHub review lane from
`chatgpt-codex-connector`. A fresh review by that account may satisfy the
independent release gate only when:

1. the review identifies or is anchored to the **actual current PR head**;
2. all findings from that review are resolved or explicitly non-blocking;
3. no P0/P1/P2 remains unresolved;
4. exact-head CI for that same SHA is green;
5. a later commit has not moved the head.

The `SwissTokint` release-owner reviews are valuable architecture/security
counter-reviews but are explicitly **NON-INDEPENDENT** and must not be counted as
the independent lane.

No Claude, Opus, Sonnet, Fable or other external-model approval is part of the
current verified release evidence unless a future GitHub/runtime record actually
proves it. Historical local process observations are not current project-state
facts and are intentionally removed from this active roster.

## Routing by change class

### Tier-B / shared security semantics

Required lanes:

- Prime Lead / Integrator;
- Protocol / Systems Architecture where Core/compatibility semantics are touched;
- Security / Adversarial Skeptic with concrete attack hypotheses;
- one Single Implementer;
- QA / Conformance;
- Code Quality / Optimization where material;
- distinct exact-head Independent Release Gate;
- all repository merge and post-merge gates.

No independent-review waiver is implied. The historical waiver remains limited
to PR #60 unless the user explicitly changes it.

### High-risk application security

Use the same skeptical/security discipline when Wallet Guard controls forwarding,
policy, preflight, Witness, simulation, provider context or replay semantics.
Application code must not fork shared Core behavior.

### Medium / non-normative implementation and CI

One writer plus QA/review proportional to false-PASS risk. Escalate to the
security lane when a test/CI change can convert a red condition into a false
green or change security diagnostics.

### Low / documentation and information architecture

One documentation writer plus exact-fact review. Escalate when documentation
changes normative semantics, human gates, readiness claims or security
boundaries.

## Delivery loop

1. reconstruct live state from GitHub and the canonical control plane;
2. select one bounded READY task;
3. assign one writer and explicit file ownership;
4. run architecture/security/QA lanes justified by risk;
5. freeze the candidate diff and run targeted plus regression evidence;
6. obtain exact-head release-owner and genuinely independent review where
   required;
7. merge only under the authorization and gate rules in
   `POM_RX_AUTOMATION_POLICY.md`;
8. run exact-merge-SHA post-merge assurance;
9. persist the new continuation state to GitHub.

## Current ownership focus

As of this checkpoint the only open feature/security streams are:

- PR #93 — Wallet Guard reference simulation evidence; application-security
  Tier-B, currently moved beyond the head stated in its PR body and therefore
  governed only by live PR-head/CI/review metadata;
- PR #97 — shared Core durable-claim + single-use-Gate composition; Tier-B,
  with current exact-head independent review evidence required after every
  repair.

A separate documentation/control-plane reconciliation lot may update only
non-normative project-state/architecture documents and must not modify either
feature branch's runtime files.

## Operational prototype claim boundary

The maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`:
a local, deterministic, synthetic, offline controlled demonstration with strict
verification, reviewed Witness evidence, exact authorization, fail-closed
single-use Gate, bounded execution evidence, independent observation and
reconciliation.

It is not production readiness, an audit, certification, real-wallet safety,
exchange authorization, deployment authorization or financial-execution proof.
