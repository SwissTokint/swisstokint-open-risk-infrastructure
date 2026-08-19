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
