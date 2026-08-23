# POM-RX Core — Team Roster and Review Routing

Updated: `2026-08-23T06:54:00+02:00`

## Purpose

This roster defines accountable roles and evidence requirements. It does **not** claim that a named model, human or agent actually ran merely because a role is listed. GitHub review/runtime evidence is authoritative for reviewer identity.

## Invariants

- One durable repository: `SwissTokint/swisstokint-open-risk-infrastructure`.
- One writer per bounded lot and one owner per file set.
- Maximum three active specialist lanes and two code worktrees.
- Review lanes are read-only unless a separate implementation assignment is created after review.
- Useful work is committed and pushed to a dedicated branch; no direct `main` edits and no force-push.
- A moved head invalidates exact-head CI/review evidence.
- Release-owner/Prime/self-review is never independent evidence.
- Missing independent review is `INDEPENDENT_REVIEW_PENDING`, never an invented reviewer.

## Active role matrix

| Role | Accountability | Mode | Required evidence | Forbidden |
| --- | --- | --- | --- | --- |
| Prime Lead / Integrator | live GitHub state, dependency order, scope, ownership, integration | accountable / non-independent | exact main/head/CI/review reconciliation + durable checkpoint | claiming independence; direct `main` edits |
| Protocol / Systems Architect | Core/application boundary, schemas, canonicalization, compatibility, simpler design | read-only | architecture verdict tied to reviewed scope/head | writing the same lot |
| Security / Adversarial Skeptic | replay, substitution, TOCTOU, object/intrinsic poisoning, fail-open, overclaim | read-only | concrete Tier-B falsification hypotheses + P0/P1/P2 classification | implementation writes; generic approval |
| Single Implementer | smallest bounded accepted solution | exclusive writer | branch/file ownership, tests, commit/push evidence | second writer or scope widening |
| QA / Conformance | positive/negative tests, expected-red, compatibility, false-PASS resistance | read-only relative to writer | reproducible exact-head evidence | approving unexecuted tests |
| Code Quality / Optimization | TCB size, duplication, deterministic behavior, maintainability, boundedness | read-only | scoped PASS/CONDITIONAL/BLOCK | weakening fail-closed behavior for optimization |
| Independent Release Gate | distinct skeptical/security release evidence | genuinely distinct exact-head reviewer | actual exact-head review with no unresolved P0/P1/P2 | owner/self/moved-head/invented review |
| Context / State Ledger | durable cross-chat continuation | coordination | RESUME + TASKS/BLOCKERS/CAPABILITY reconciliation when facts change | parallel PM system or chat-only continuity |

## Independent-review rule

A fresh `chatgpt-codex-connector` review may satisfy the independent release gate only when it explicitly covers the actual frozen candidate SHA, exact-head CI is green, all findings are resolved/non-blocking, no P0/P1/P2 remains unresolved, and no later commit has moved the head. The independent-review waiver remains limited to PR #60.

## Current trusted coordination state

Trusted main is `1989bb88ae2eee6ae32328f2df4cc056c0dd27d4`, the exact PR #125 merge. Canonical exact-main CI `32618596436` / CI 799 attempt 1 succeeded and exact-merge assurance is `POST_MERGE_ASSURANCE_PASS` in PR #125 comment `5384274893`. The distinct source-head review is `chatgpt-codex-connector[bot]` comment `5384255481` on reviewed commit `c9f00b13cd`.

The bounded non-Tier-B reconciliation branch `docs/pom-rx-post-pr125-live-architecture-reconcile-20260823` has one documentation writer and owns exactly:

- `docs/project-management/pom-rx-core/POM_RX_RESUME_CHECKPOINT.md`;
- `docs/project-management/pom-rx-core/POM_RX_TASKS.yaml`;
- `docs/project-management/pom-rx-core/POM_RX_BLOCKERS.md`;
- `docs/project-management/pom-rx-core/POM_RX_TEAM_ROSTER.md`;
- `docs/product/POM_RX_CAPABILITY_MAP.md`.

No runtime/test/protocol/Gate/Witness/verifier/Wallet Guard/provider semantics belong to this writer lot.

## Active Tier-B focus — PR #120

PR #120 remains the active Wallet Guard/provider prerequisite at exact live head `5238b9c289476100c875ed9a88bd7e21a574fa67`. Against trusted main `1989bb88ae2eee6ae32328f2df4cc056c0dd27d4`, the branch is diverged ahead 69 / behind 15 with merge-base `73f3921984449ffd6025f6c9b99b0220f0bf068b` and was non-mergeable at this revalidation.

Historical exact-head CI `32614831929` / 792 passed and owner review `5001566041` found `0 P0 / 0 P1 / 0 P2`, but neither is release evidence after main moved and the distinct exact-head Codex review found current P1 `PRRT_kwDOTiNyWc6bc4gh`.

### Required read-only architecture/security lane before the next writer

Do not send an implementer to “move `Promise.prototype.then` earlier” as if that were already a valid fix. ECMAScript 2026 §27.2.5.4 resolves `SpeciesConstructor` and creates the result capability before `PerformPromiseThen` attaches reactions. A non-configurable unsafe effective constructor can therefore make ordinary same-realm `then` throw before the rejection reaction exists.

The Protocol / Systems Architect and Security / Adversarial Skeptic lanes must first select and falsify a smaller trust boundary. At minimum compare:

1. rejecting/declassifying decorated native Promise transports at the provider contract boundary before they are relied upon;
2. isolating provider execution so a hostile orphaned rejection cannot terminate the trusted process;
3. narrowing the supported provider transport contract while retaining existing synchronous inert-data support.

They must reject any proposal that requires process-global `unhandledRejection`/`uncaughtException` swallowing, execution of hostile constructor/species accessors or Proxy paths, silent trust in attacker-selected species constructors, or weakening `--unhandled-rejections=strict` tests.

Only after a bounded architecture/security decision may exactly one writer reconcile PR #120 to then-current trusted main and implement the smallest accepted repair plus strict regression. QA must prove fail-closed behavior, zero reference authorization and zero sensitive forwarding, while also proving the process does not terminate from an orphaned provider rejection for the supported contract.

Concrete skeptical hypotheses for the final repaired candidate must cover rejected-Promise draining, effective `constructor`/`Symbol.species`, non-configurable unsafe data constructors, hostile constructor/species accessors, Proxy/prototype paths, strict unhandled rejection, provider-result thenable assimilation, inherited Array-index substitution, and zero reference authorization/sensitive forwarding on fail-closed rejection.

Six PR #120 P1/P2 threads remain unresolved until repaired exact-head evidence justifies closure: `PRRT_kwDOTiNyWc6bZjxp`, `PRRT_kwDOTiNyWc6bZ6tx`, `PRRT_kwDOTiNyWc6bZ6tz`, `PRRT_kwDOTiNyWc6baFkR`, `PRRT_kwDOTiNyWc6baIxZ`, and current finding `PRRT_kwDOTiNyWc6bc4gh`.

## Historical streams

PR #97 remains `OPEN / STALE / MUST_NOT_MERGE` at `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`; reconstruct useful durable-Gate concepts later from then-current trusted main after PR #120 receives post-merge assurance PASS.

PR #93 remains `OPEN / STALE / UNTRUSTED / LATER` at `c4e40ceb286f4e59657767661daed15d2b68e9a7`; reconcile useful simulation work later with fresh dependency and exact-head review evidence.

## Operational prototype claim boundary

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded. It is not production readiness, audit, certification, real-wallet safety, exchange authorization, deployment authorization or financial-execution proof.
