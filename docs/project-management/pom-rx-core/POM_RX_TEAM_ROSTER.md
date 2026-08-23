# POM-RX Core — Team Roster and Review Routing

Updated: `2026-08-23T04:09:11+02:00`

## Purpose

This roster defines accountable roles and evidence requirements. It does **not** claim that a named model, human or agent actually ran merely because a role is listed.

The repository and GitHub review record are the durable evidence source. A reviewer identity is recorded only when the runtime/review evidence actually exposes it. Otherwise the route is `UNVERIFIED` or `PENDING`, never inferred.

## Invariants

- One durable repository: `SwissTokint/swisstokint-open-risk-infrastructure`.
- One writer per bounded lot and one owner per file set.
- Maximum three active specialist lanes and two code worktrees.
- Review lanes are read-only unless a separate implementation assignment is explicitly created after the review.
- Useful work is committed and pushed to a dedicated branch; no useful result may exist only in a task-chat scratchpad.
- No direct `main` edits and no force-push.
- A moved head invalidates exact-head CI/review evidence.
- Release-owner/Prime/self-review is never counted as independent evidence.
- A stale independent review remains useful historical input but cannot release a different SHA.
- Missing independent review is `INDEPENDENT_REVIEW_PENDING`, never an excuse to manufacture another reviewer identity.

## Active role matrix

| Role | Accountability | Mode | Required evidence / routing | Forbidden |
| --- | --- | --- | --- | --- |
| Prime Lead / Integrator | live-GitHub state, dependency order, scope, file ownership, integration and final coordination | accountable; may write only when assigned as the single writer | exact main/head/CI/review reconciliation plus repository-backed continuation checkpoint | claiming independence from own work; direct `main` edits |
| Protocol / Systems Architect | Core/application boundary, schemas, canonicalization, compatibility, ownership and simpler designs | read-only | written architecture verdict tied to the reviewed scope/head where material | implementation ownership in the same review lane; release verdict by assertion |
| Security / Adversarial Skeptic | replay, substitution, TOCTOU, trusted-time, object/intrinsic poisoning, fail-open paths and false security claims | read-only | concrete falsification hypotheses and P0/P1/P2 classification for Tier-B/security lots | implementation writes; generic approval without attack hypotheses |
| Single Implementer | smallest bounded accepted solution | exclusive writer | explicit branch/file ownership, tests and commit/push evidence | second concurrent writer on same files; widening scope to unrelated debt |
| QA / Conformance | positive/negative tests, expected-red, compatibility and false-PASS resistance | read-only relative to writer | reproducible test/CI evidence, exact-head binding where release-relevant | approving from plans or unexecuted tests |
| Code Quality / Optimization | TCB size, duplication, deterministic behavior, maintainability and evidence-based performance | read-only | scoped PASS/CONDITIONAL/BLOCK with complexity/boundedness reasoning | micro-optimization that weakens fail-closed behavior |
| Independent Release Gate | independent skeptical/security release evidence | distinct exact-head reviewer | an actually distinct review recorded on the exact candidate SHA with no unresolved P0/P1/P2 | release-owner/self-review; moved-head review; invented reviewer |
| Context / State Ledger | durable cross-chat continuation | coordination | `POM_RX_RESUME_CHECKPOINT.md` plus TASKS/BLOCKERS/CAPABILITY_MAP reconciliation when facts change | creating a parallel project-management system or relying only on chat history |

## Independent-review evidence rule

The repository has an actual GitHub review lane from `chatgpt-codex-connector`. A fresh review by that account may satisfy the independent release gate only when:

1. the review identifies or is anchored to the actual current PR head;
2. all findings from that review are resolved or explicitly non-blocking;
3. no P0/P1/P2 remains unresolved;
4. exact-head CI for that same SHA is green;
5. a later commit has not moved the head.

The `SwissTokint` release-owner reviews are valuable architecture/security counter-reviews but are explicitly **NON-INDEPENDENT**. No Claude, Opus, Sonnet, Fable or other model/human approval is part of the current verified release evidence unless a future GitHub/runtime record actually proves it.

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

The independent-review waiver remains limited to PR #60 unless the user explicitly changes it.

### High-risk application security

Use the same skeptical/security discipline when Wallet Guard controls forwarding, policy, preflight, Witness, simulation, provider context or replay semantics. Application code must not fork shared Core behavior.

### Medium / non-normative implementation and CI

One writer plus QA/review proportional to false-PASS risk. Escalate to the security lane when a test/CI change can convert a red condition into a false green or change security diagnostics.

### Low / documentation and information architecture

One documentation writer plus exact-fact review. Escalate when documentation changes normative semantics, human gates, readiness status or security boundaries. Pure typo/formatting fixes may use a recorded exemption where policy allows.

## Delivery loop

1. reconstruct live state from GitHub and the canonical control plane;
2. select one bounded READY task;
3. assign one writer and explicit file ownership;
4. run architecture/security/QA lanes justified by risk;
5. freeze the candidate diff and run targeted plus regression evidence;
6. obtain exact-head release-owner and genuinely independent review where required;
7. merge only under the authorization and gate rules in `POM_RX_AUTOMATION_POLICY.md`;
8. run exact-merge-SHA post-merge assurance;
9. persist the new continuation state to GitHub.

## Current ownership focus

### Current coordination lot

Branch `docs/pom-rx-post-pr122-live-reconcile-20260823` is a bounded non-Tier-B single-writer control-plane reconciliation from exact trusted main `cff851b92746af09c224451c82d3da9c3bae176a`. Its owned files are only:

- `POM_RX_RESUME_CHECKPOINT.md`;
- `POM_RX_TASKS.yaml`;
- `POM_RX_BLOCKERS.md`;
- `POM_RX_TEAM_ROSTER.md`;
- `docs/product/POM_RX_CAPABILITY_MAP.md`.

No runtime/test/protocol/Gate/Witness/verifier/Wallet Guard/provider semantics belong to this writer lot.

### PR #120 — active Tier-B prerequisite

PR #120 is the active Wallet Guard/provider rejected-Promise prerequisite repair at exact live head `2d01503c13b9b22ea136f6bbd169bc2032366b9a`. Current trusted main is `cff851b92746af09c224451c82d3da9c3bae176a`; the branch is diverged from it and must be reconciled before final release evidence. CI 785 on `2d01503c...` is green but historical for release after main moved. Five historical P1/P2 threads remain unresolved.

For the next PR #120 candidate: exactly one writer reconciles/repairs the branch; architecture/security/QA/code-quality lanes are read-only; the release-owner lane is non-independent; a fresh exact-head `chatgpt-codex-connector` review is required before release. Concrete skeptical hypotheses must cover rejected-Promise draining, `constructor`/`Symbol.species`, hostile accessors, Proxy/prototype paths, strict unhandled rejection, provider-result thenable assimilation and zero authorization/sensitive forwarding on failure.

### Historical PR #97

PR #97 remains open at `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`, stale and `MUST_NOT_MERGE`. Its useful durable-Gate concepts must be reconstructed later from then-current trusted main after PR #120 receives post-merge assurance PASS; do not revive or wholesale-copy the stale branch.

### Historical PR #93

PR #93 remains open at `c4e40ceb286f4e59657767661daed15d2b68e9a7`, stale/untrusted/later. Its simulation work requires dependency reconciliation and fresh exact-head review before any release claim.

## Operational prototype claim boundary

The maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: a local, deterministic, synthetic, offline controlled demonstration with strict verification, reviewed Witness evidence, exact authorization, fail-closed single-use Gate, bounded execution evidence, independent observation and reconciliation.

It is not production readiness, an audit, certification, real-wallet safety, exchange authorization, deployment authorization or financial-execution proof.
