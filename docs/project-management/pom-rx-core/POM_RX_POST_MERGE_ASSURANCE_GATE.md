# POM-RX post-merge assurance gate

Status: `ACTIVE_PROCESS_RULE`

Date: 2026-08-19

## Purpose

Every non-trivial merge into `main` receives a second, read-only assurance cycle
on the exact merge commit. The goal is to detect integration drift, claim drift,
security regressions, avoidable complexity and performance/code-quality debt that
may not be visible from the PR head alone.

This post-merge cycle does not replace the pre-merge five-stage gate. A change
must pass both processes before it can be used as evidence for a readiness,
release, deployment or operational claim.

## Mandatory post-merge sequence

For the exact merged `main` SHA:

1. **SpecKit reconciliation**
   - reconcile specification, ADR/council decision, acceptance criteria, tests,
     implementation and project/task status;
   - identify any behavior present in code but absent from the approved scope;
   - identify any approved requirement that was not actually implemented;
   - downgrade readiness wording when evidence is narrower than the specification.

2. **Skeptical/falsification pass**
   - assume the merged acceptance claim is false and try to invalidate it;
   - challenge bypass, replay, stale state, mutation-after-preflight, alternate
     provider/origin/chain/account paths, self-consistent false evidence and
     unproved external effects where relevant;
   - record `POST_MERGE_SKEPTIC_PASS`, `POST_MERGE_SKEPTIC_CONDITIONAL` or
     `POST_MERGE_SKEPTIC_BLOCK`.

3. **Security audit**
   - re-evaluate trust boundaries, authentication/authorization, secret/key
     handling, input validation, fail-closed behavior, persistence/replay,
     network/filesystem/process boundaries and dependency exposure as applicable;
   - explicitly state which security families are not applicable rather than
     silently skipping them;
   - any new P0/P1 blocks the next readiness/release step and requires a repair PR.

4. **Code-quality review**
   - inspect duplication, unnecessary abstraction, dead code, unclear ownership,
     error handling, deterministic behavior, testability, API boundaries and
     maintainability;
   - prefer the smallest implementation that preserves exact semantics and
     evidence boundaries;
   - do not refactor frozen compatibility code merely for aesthetics.

5. **Optimization review**
   - check algorithmic complexity, boundedness, I/O/network calls, allocations,
     concurrency and repeated work where material;
   - optimization must be evidence-driven; micro-optimizations that enlarge the
     trusted computing base or obscure fail-closed logic are rejected;
   - if performance is not material for the bounded scope, record that explicitly.

6. **Integration/regression evidence**
   - verify the exact merge commit and its parents;
   - use post-merge CI when configured for `push`; otherwise bind the report to
     the exact successful PR-head CI and verify that the merge commit introduces
     no additional tree changes beyond the reviewed head plus the `main` parent;
   - re-check relevant expected-red, compatibility, checksum, dependency-audit,
     secret-scan and build evidence when the merged scope can affect them.

## Exact-main CI observability

The repository publishes a machine-readable commit status for the canonical
`CI` workflow at `.github/workflows/ci.yml` when that workflow enters
`in_progress` or completes on a `push` to `main`.
`.github/workflows/exact-main-ci-status.yml` writes the fixed context
`pom-rx/exact-main-ci` to the upstream run's exact
`github.event.workflow_run.head_sha`. The latest matching run/attempt publishes
`pending` while it is in progress. On completion, `success` is published only
when the upstream conclusion is exactly `success`; every other completed
conclusion is published as `failure`.

The publisher is deliberately privilege-separated from normal CI. The normal
`CI` workflow remains read-only while it checks out and executes repository
code. The status publisher has only `actions: read` and `statuses: write`:
Actions read access is used solely to re-read canonical workflow-run metadata
before a status write. The publisher never checks out repository code, never
downloads upstream artifacts or caches, and does not run PR-controlled scripts.
It accepts only a canonical `CI` run whose workflow path identifies
`.github/workflows/ci.yml`: either GitHub's plain path form or its documented
`.github/workflows/ci.yml@main` run representation is accepted, and no other
path is. The event must also be `push`, the head branch must be `main`, and the
head repository must be this exact repository. This narrow path allow-list
prevents another same-name workflow from publishing the assurance context.
Values from the workflow-run payload are passed through environment variables
and validated before the GitHub APIs are called; they are not interpolated into
executable script source.

### Stale-run and rerun rule

A commit status is a latest-state surface, so a delayed publisher must suppress
an older run whenever a newer canonical run/attempt is already observable at
its freshness check. Before any status write, the publisher queries the
canonical `ci.yml` workflow for `push` runs on `main` with the exact same head
SHA. It requires that the complete matching result set fit in one bounded
100-run page and then selects the maximum `(run_number, run_attempt)` pair.
GitHub defines `run_number` as increasing with each new workflow run and
`run_attempt` as increasing with each rerun attempt. Only an event whose run ID,
run number and attempt still match that selected latest entry may publish. An
event already stale or superseded at that lookup exits without writing. If the
bounded freshness query is empty, malformed, incomplete or exceeds the 100-run
proof budget, publication fails closed.

The freshness lookup and commit-status write are separate GitHub API operations;
there is no atomic compare-and-set across those resources. A newer run can be
created in the observation/write interval. Therefore the commit status by itself
is never sufficient assurance evidence, even though the publisher suppresses
stale events visible before each write. The assurance consumer must independently
re-read the canonical run set at decision time and reject a status whose target
is no longer the latest exact-SHA run/attempt or when any newer queued or
in-progress canonical run is visible. This decision-time revalidation is the
control that closes the residual observation/write race for PASS decisions.

The publisher also listens for `in_progress`, including rerun attempts, so a
new latest attempt replaces any earlier success with `pending` once execution
starts and its publisher writes. A delayed `in_progress` event that has already
become `completed` is ignored because the re-read status no longer matches its
event state. This does not claim knowledge of a future run before GitHub has
created or exposed it.

For post-merge integration evidence, a `pom-rx/exact-main-ci` status is usable
only when it is attached to the exact merge SHA and reports `success`. Its target
must be the corresponding canonical GitHub Actions run, and that target must
still be the latest canonical `(run_number, run_attempt)` for the exact SHA with
no newer queued or in-progress canonical run visible at assurance time. When
creator metadata is available, it must identify the GitHub Actions automation
rather than an unrelated publisher. Absence, `pending`, failure, wrong-SHA
binding, stale target, wrong context or inconsistent target metadata keeps the
integration verdict conditional or blocked as appropriate.

This mechanism is prospective. It does not retroactively turn an older merge
with unobservable push-CI evidence into a PASS. A later reviewed repair merge
may establish a new trusted `main` state only after its own exact-merge status
and the rest of this assurance gate pass.

## Verdict

The report ends with exactly one of:

- `POST_MERGE_ASSURANCE_PASS` — no unresolved finding defeats the bounded merged
  claim;
- `POST_MERGE_ASSURANCE_CONDITIONAL` — bounded merged claim remains usable only
  after named follow-up evidence/repair, and no broader readiness claim may rely
  on it yet;
- `POST_MERGE_ASSURANCE_BLOCK` — a plausible security, correctness, integration,
  specification or false-PASS issue remains unresolved.

A PASS is scoped. It is never equivalent to production readiness, audit,
certification, wallet safety, financial safety or complete security.

## Repair rule

Post-merge assurance is read-only. Findings are never patched directly on
`main`. A material finding creates a new scoped repair branch/PR and goes back
through the normal pre-merge five-stage gate. After that repair merges, the
post-merge assurance cycle runs again on the new merge SHA.

## Development sequencing rule

After each non-trivial merge, the Prime lead performs and records this
post-merge assurance before treating the merged lot as a completed dependency
for the next readiness or release claim. Parallel development may continue only
when it does not rely on a blocked/conditional property.

Tier-B feature work may be prepared in parallel, but a dependent Tier-B merge
must not use a prior lot as trusted evidence until that prior lot has a recorded
`POST_MERGE_ASSURANCE_PASS`.

## Minimum report template

```text
Merge SHA:
Source PR / head SHA:
Scope claim:

SpecKit reconciliation: PASS | CONDITIONAL | BLOCK
Skeptical/falsification: PASS | CONDITIONAL | BLOCK
Security audit: PASS | CONDITIONAL | BLOCK
Code quality: PASS | CONDITIONAL | BLOCK
Optimization: PASS | CONDITIONAL | BLOCK
Integration/regression: PASS | CONDITIONAL | BLOCK

P0/P1 findings:
Non-blocking debt:
Unproved/explicit limitations:
Final verdict: POST_MERGE_ASSURANCE_...
```
