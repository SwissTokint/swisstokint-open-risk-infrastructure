# POM-RX Core — Team Roster and Review Routing

Updated: `2026-08-23`.

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

Trusted main is `87ed6ac814f868dc4599cb5d236babdeea8c3cc9`, the exact PR #130 merge.

- source head `ce1f2ca2f9358c11e836f1717dcedd9cb5c0caaa`;
- source-head CI `32635882670` / CI 820 attempt 1 = `success`;
- owner five-stage review `5002253211` = `PASS_NON_INDEPENDENT / 0-0-0`;
- genuinely distinct exact-head evidence `5385715573`, reviewed `ce1f2ca2f9`, no major issues;
- exact-main CI `32638722306` / CI 821 attempt 1 = `success`;
- exact-merge assurance `5385948152` = `POST_MERGE_ASSURANCE_PASS`;
- terminal trusted reconciliation checkpoint `5385949730`.

## Current single-writer lane — fresh Tier-B provider transport

Branch `automation/wg-trusted-provider-transport-20260823` is the active single-writer lane, created directly from trusted main `87ed6ac...`.

Owned file set for this lot:

- `applications/blockchain-digital-assets/wallet-guard/trusted-provider-transport.mjs`;
- `tests/wallet-guard/trusted-provider-transport.node.test.mjs`;
- `package.json`;
- `docs/project-management/pom-rx-core/POM_RX_RESUME_CHECKPOINT.md`;
- `docs/project-management/pom-rx-core/POM_RX_TASKS.yaml`;
- `docs/project-management/pom-rx-core/POM_RX_BLOCKERS.md`;
- `docs/project-management/pom-rx-core/POM_RX_TEAM_ROSTER.md`;
- `docs/product/POM_RX_CAPABILITY_MAP.md`.

No second writer is authorized on those files while this lot remains active. Shared Core canonicalization, hashing, verifier, Witness, exact authorization, Gate, execution-evidence and observation/reconciliation semantics remain outside this application's ownership unless a separately scoped shared-Core task is opened after review.

### Tier-B architecture/security boundary

The local prototype uses an explicit narrow **trusted-provider transport contract**, not a claim of browser-wide or intentionally hostile-provider Promise integrity.

The fresh branch currently introduces an application-owned controlled transport that owns Promise origin and a strict gateway wrapper that accepts only module-provenanced controlled transports. Unowned or Proxy providers must be rejected before their request path executes. Runtime descriptor drift relevant to native Promise origin and inherited top-level Array/Object thenable assimilation is checked immediately before controlled transport creation.

QA/conformance must keep two evidence classes separate:

1. **supported-path conformance and survival:** prove the controlled transport originates only the supported same-realm undecorated native Promise shape, rejects unowned provider origins before request execution, and survives an in-contract rejected context transport under `--unhandled-rejections=strict` with zero reference authorization, zero sensitive forwarding and no orphaned provider rejection;
2. **hostile out-of-contract negative:** retain decorated/rebased/Proxy/accessor/non-configurable-unsafe Promise transports from arbitrary providers as unsupported unless separately reviewed process/worker/RPC isolation is introduced.

The current branch must not represent its in-contract rejection fixture as proof that an already-originated hostile Promise can be drained safely in the same process.

Concrete skeptical hypotheses before release must cover rejected-Promise handling, effective `constructor`/`Symbol.species`, non-configurable unsafe constructor paths, hostile accessors, Proxy/prototype paths, strict unhandled rejection, provider-result thenable assimilation, Array/Object inherited thenable poisoning, zero authorization/forwarding on fail-closed rejection, and any claim gap between the strict transport path and the existing controlled-host path.

All six PR #120 findings remain attack-history inputs: `PRRT_kwDOTiNyWc6bZjxp`, `PRRT_kwDOTiNyWc6bZ6tx`, `PRRT_kwDOTiNyWc6bZ6tz`, `PRRT_kwDOTiNyWc6baFkR`, `PRRT_kwDOTiNyWc6baIxZ`, `PRRT_kwDOTiNyWc6bc4gh`.

Review lanes reject proposals that require process-global `unhandledRejection`/`uncaughtException` swallowing, execution of hostile constructor/species accessors or Proxy paths, silent trust in attacker-selected species, weakened strict tests, or fail-open forwarding.

### Current review routing

The candidate is not frozen yet. Therefore release-owner and independent-release evidence are `PENDING` and no prior PR #120 or moved-head review counts. Once the writer declares a frozen exact head and canonical CI is green:

1. Protocol/Systems + Security/Adversarial + QA/Conformance review the bounded design and tests read-only;
2. Prime/Release Owner records the mandatory five-stage exact-head gate as non-independent evidence;
3. a genuinely distinct exact-head `chatgpt-codex-connector` review is required before merge;
4. any P0/P1/P2 or head move reopens the gate.

## Historical streams

PR #120 is `CLOSED / NOT MERGED / STALE`; do not reopen or wholesale-copy it.

PR #97 remains `OPEN / STALE / MUST_NOT_MERGE` at `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`, now diverged ahead 66 / behind 249 from trusted main. Durable Gate composition is reconstructed later only after the fresh provider prerequisite is trusted.

PR #93 remains `OPEN / STALE / UNTRUSTED / LATER` at `c4e40ceb286f4e59657767661daed15d2b68e9a7`, now diverged ahead 86 / behind 294. Simulation work remains later in dependency order.

## Operational prototype claim boundary

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded. It is not production readiness, audit, certification, real-wallet safety, exchange authorization, deployment authorization or financial-execution proof.
