# POM-RX Core — Team Roster and Model Routing

Updated: `2026-08-14T13:25:00+02:00`

## Invariants

- Codex remains accountable for final decisions, integration, commits, tests, evidence and human gates.
- Maximum three active sub-agents, two code worktrees and one owner per file.
- The single durable repository is `SwissTokint/swisstokint-open-risk-infrastructure`.
- Useful work is committed and pushed to a dedicated branch before the end of a cycle; no useful diff may exist only locally.
- Dirty or unowned work is preserved before cleanup. No unpublished file is deleted and no force-push is permitted.
- Prime Orchestration level 3 is used for critical, ambiguous and long-horizon delivery; Prime coordinates and never replaces the accountable writer or release judge.
- Requested model names are recorded separately from the actual selectable/runtime-identified model.
- A missing served-model identity is `MODEL_SERVED_UNVERIFIED`, never proof that Opus, Sonnet or Fable ran.
- Claude is read-only by default. No new Claude review starts while `CLAUDE_PROCESS_ATTRIBUTION_UNRESOLVED` is open.

## Roles

| Role | Accountable owner | Requested model | Actual available route | Default effort | Authorized scope | Forbidden |
|---|---|---|---|---|---|---|
| Lead Integrator | Codex root | strongest Codex | `gpt-5.6-sol` | maximum available | council, task selection, Git/worktrees, review, integration and gates | delegating accountability; direct `main` work |
| Protocol Architect | independent read-only owner | Claude Opus 5 | `gpt-5.6-sol` fallback until Claude served identity is verified | xhigh/max | schemas, commitments, canonicalization, compatibility ADRs | implementation ownership in the same review cycle |
| Cryptography & Security Lead | distinct independent read-only owner | Claude Opus 5 | separate `gpt-5.6-sol` fallback until Claude served identity is verified | xhigh/max | signatures, replay, enrollment, revocation, clock, persistence, Gate security | global approval; sharing implementation ownership |
| Senior Core Implementer | exclusive worktree/file owner | Claude Sonnet 5 | `gpt-5.6-sol` high/xhigh or `gpt-5.6-terra` high for bounded lots | high | verifier, SDK, tests and fixtures assigned explicitly | editing another owner's files; direct `main` work |
| QA & Conformance Engineer | independent from implementer | Claude Sonnet 5 | `gpt-5.6-terra` high; `gpt-5.6-sol` for adversarial cryptographic semantics | high | conformance, negative tests, false-PASS detection, CI evidence | implementation ownership in the tested lot |
| Documentation & DX | bounded documentation owner | Claude Fable 5 | `gpt-5.6-terra` medium | medium | non-normative docs, examples and handoff manifests | security/normative decisions and public readiness claims |
| Reverse Engineering Lead | independent read-only owner | strongest reasoning model | `gpt-5.6-sol` fallback | xhigh/max | call graphs, frozen-boundary recovery, observable-input analysis, artifact closure | implementation writes; changing historical behavior |
| Code Quality, Comprehension & Readability | independent read-only owner | strongest implementation-review model | `gpt-5.6-sol` fallback | high/xhigh | API/module separation, deterministic naming, maintainability, false-claim review | implementation ownership in the reviewed lot |
| Problem-to-Solution Implementer | exclusive worktree/file owner | strongest implementation model | `gpt-5.6-sol` fallback | high/xhigh | translate a bounded problem and accepted constraints into the smallest reviewable solution | direct `main`; files outside ownership; bypassing ADR/security gates |
| Prime Orchestrator | Codex root | strongest Codex | `gpt-5.6-sol` | maximum available | decomposition, dependency ordering, context ledger, routing and stop conditions | implementation ownership by multiple agents; replacing exact-head evidence |
| Systems Architecture Reviewer | independent read-only owner | strongest reasoning model | `gpt-5.6-sol` | max | boundaries, data ownership, simpler alternatives, migration and operational slice | implementation writes; release decision |
| Adversarial Security Reviewer | distinct independent read-only owner | strongest security reasoning model | `gpt-5.6-sol` | max | trust boundaries, abuse cases, fail-closed behavior and claim falsification | implementation writes; approving an unreviewed head |
| Release Gate Judge | independent from implementer | strongest evidence reasoning model | `gpt-5.6-sol` or `gpt-5.6-terra` high | high/max | exact-head GO, CONDITIONAL_GO or NO_GO from reproducible evidence | inferring readiness from plans, green component tests or agent assertions |
| Context and State Ledger | Codex root | strongest Codex | `gpt-5.6-sol` | high | compact objective, constraints, decisions, blockers, ownership and next action | creating a second project-management system |

## Complexity routing

### CRITICAL / Tier B

Codex Lead + independent Protocol Architect + distinct Security Lead. Council/ADR and human decision precede implementation. No automatic merge.

### HIGH

Exclusive senior implementer + independent QA + separate architecture/security review. Codex rewrites or integrates only after reviewing every diff.

### MEDIUM

`gpt-5.6-terra` high plus Codex review. Elevate to `gpt-5.6-sol` if diagnostics, fixtures or CI semantics could yield a false PASS.

### LOW

`gpt-5.6-terra` medium plus Codex review. Documentation-only; no normative or security claim.

## Prime level 3 delivery loop

1. Revalidate Git, GitHub, CI, worktrees and the single-flight lock.
2. Select one bounded READY task with exclusive file ownership and measurable acceptance.
3. Run independent architecture, security and conformance analysis only where the task risk justifies it.
4. Assign exactly one writer in one isolated worktree. Review agents remain read-only.
5. Freeze the diff, run targeted and regression tests, then obtain exact-head code, security, adversarial and release-gate verdicts.
6. Commit and push the useful lot before cycle end. Open or update one scoped PR.
7. Merge only after the applicable gate: standing user authorization covers non-Tier-B coordination/docs/tests/CI once exact-head evidence is green. It also covers a source-backed DAGR-profile PR after council/ADR, exact-head Protocol/Security/QA review and green CI. Other Tier-B protocol/security changes retain a PR-specific human gate.
8. Remove only clean obsolete local worktrees after their commits are reachable from GitHub. Preserve dirty or unowned work on a remote branch before cleanup.

Skills routed by need: `prime-orchestration`, `context-engineering`, `architecture-review`, `stack-security-review`, `adversarial-review`, `spec-driven-development`, `test-driven-development`, `root-cause-debugging`, `stack-code-review`, `performance-review`, `ci-repair`, `release-gate`, and `evidence-standard`.

## Operational prototype target

The maximum claim is `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: a local, deterministic, synthetic, offline demonstration with strict verification, a reviewed Witness, exact authorization, a fail-closed single-use Gate, synthetic execution, independent observation, reconciliation, manifest and checksums. It is never a production, audit, certification, wallet, exchange, deployment or financial-execution claim.

Current Prime routing for the next code lot:

| Owner | Scope | Mode | Result |
|---|---|---|---|
| PRIME-ARCHITECTURE | smallest honest operational vertical slice and dependencies | read-only | complete; foundation-first sequence |
| PRIME-SECURITY | abuse cases, Gate/Witness/storage/clock boundaries and false-claim resistance | read-only | complete; current readiness `NO_GO` |
| PRIME-CONFORMANCE | reproducible release gate, CI coverage and evidence transition | read-only | complete; current readiness `NO_GO` |
| CODEX-LEAD | reconcile, import control plane, write, integrate, push and gate | exclusive writer for coordination lot | active |

## Claude runtime gate

- Runtime observed: `Claude Code 2.1.205` at `C:\Users\MehdiMauroux\.local\bin\claude.exe`.
- Twelve `claude` processes were visible during R0. Reconciliation before PR 28 later found zero active Claude processes and no conflicting authorized-worktree lock; no process was terminated.
- Claude authentication is valid, but bounded PR 28 print-mode attempts exited 1 without review output even after the stdin transport was corrected.
- Historical PR28 runtime classification: `AUTHENTICATED_NO_VERDICT_EXIT_1`.
- Current observation at `2026-08-12T15:45:14+02:00`: 12 visible Claude
  processes whose ownership and command lines are unresolved. Current
  classification is `CLAUDE_PROCESS_ATTRIBUTION_UNRESOLVED / DO_NOT_INVOKE`.
- Do not repeat the prior invocation, start a new Claude review, or terminate a
  process without a new attributable runtime signal. Distinct documented
  Architecture, Security and QA fallbacks approved the exact PR 32 source
  artifacts before their authorized merge; never claim Claude approval.
- Every future transcript must record runtime version, requested model, served model if returned, commit, role, scope, duration, exit code and scoped verdict.

## R0 active assignments

| Owner | Scope | Mode | Result |
|---|---|---|---|
| Codex Lead | lock, state reconciliation and canonical artifacts | write only in authorized coordination directory | complete |
| REPO-TRIAGE | PR 24/27/28/29/30, reviews/comments/CI | read-only | complete |
| WORKTREE-REGISTRY | worktrees, operation markers and register discovery | read-only | complete |
| MODEL-ROUTING | roster, model availability and integration gates | read-only | complete |

## R3 strict-profile prerequisite assignments

| Owner | Scope | Mode | Result |
|---|---|---|---|
| REVERSE-ENGINEERING | frozen v0.1 call graph, surrogate observability and executable artifact closure | read-only | complete; identified receipt-only surrogate equivalence and length-framed source closure |
| CODE-QUALITY-READABILITY | module/API boundaries, diagnostic readability, activation safety and false-claim resistance | read-only | complete; final exact-head `APPROVE` on `496fe9a` |
| PROBLEM-TO-SOLUTION | council and prerequisite ADR draft only | exclusive write on two assigned documentation files | complete; no runtime, schema, test or fixture write |
| PROTOCOL-ARCHITECT | independent exact-head Tier-B review | read-only | `APPROVE` on `496fe9a`; gpt-5.6-sol fallback, no Claude identity implied |
| SECURITY-LEAD | independent exact-head Tier-B review | read-only | `APPROVE` on `496fe9a`; GPT-5 Codex fallback, no Claude identity implied |
