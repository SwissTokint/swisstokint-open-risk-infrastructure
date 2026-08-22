# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-22T20:32:00+02:00`

Purpose: compact **durable cross-chat continuation state**. Scheduled-task chat
history is not project state. Every run reconstructs state from live GitHub plus
this canonical control plane. Live GitHub wins whenever a PR head, CI run,
review, review thread, mergeability signal or merge changes after this
checkpoint.

## trusted_main

`e5aead150a2ed5f390593cc2d9d307defdd79bdc`

Latest trusted merge: PR #119 — terminal coordination transition into useful
runtime work.

- exact source head: `057b225783b24c97568dbcd733ca4c821f889c7a`;
- exact merge/main SHA: `e5aead150a2ed5f390593cc2d9d307defdd79bdc`;
- exact-head CI 719: `success`;
- release-owner exact-head gate: `PASS / NON-INDEPENDENT`;
- distinct exact-head `chatgpt-codex-connector` review: no major issues;
- canonical exact-main push CI: run `32575110984`, CI 720, `success`;
- exact-merge post-merge assurance: `POST_MERGE_ASSURANCE_PASS`, PR #119 issue
  comment `5380609307`.

PR #119 is terminal coordination evidence. Do **not** create another docs-only
successor merely to restate completion. Carry materially changed continuation
state with useful runtime work.

## architecture_and_claim_boundary

Trusted main contains the strict reference profile, common exact authorization,
a process-local single-use Gate, shared bounded hostile-object/plain-data capture,
process-local Witness trust lifecycle, a separate filesystem durable claim
primitive, reference execution evidence, observation/reconciliation, and Wallet
Guard reference layers. Shared canonicalization, hashing, verifier, Witness,
exact authorization, Gate, execution-evidence and observation semantics remain
Core-owned; Wallet Guard remains an application profile.

A reviewed composition of the durable claim primitive with the common Gate is
**not** on trusted main. Production trusted time/key custody, distributed replay,
arbitrary browser/provider integrity and real external execution/effect truth
remain unproved. Maximum claim remains
`POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`.

## active_runtime_task

### PR #120 — fresh Wallet Guard Promise-drift boundary repair

- PR: `#120`;
- branch: `automation/pom-rx-promise-drift-repair-20260822`;
- exact base/trusted main: `e5aead150a2ed5f390593cc2d9d307defdd79bdc`;
- class: `TIER_B_SHARED_SECURITY_SEMANTICS`;
- state: `OPEN / NOT_TRUSTED / FOLLOWUP_P1_REPAIR_IMPLEMENTED / FRESH_EXACT_HEAD_GATES_PENDING`.

The final moving SHA is intentionally **not** embedded in this moving file. Read
PR #120 live after this checkpoint commit and bind all CI/review evidence to that
exact head.

Current follow-up repair commits on the branch:

- `52225ae28d85afb4d6e4280d560f10098f19c935` — bounded effective-constructor
  prototype-chain drain classification;
- `a7bf527e8766b74e2717d7fd26a45add87a0958c` — strict non-extensible/nonstandard-
  prototype rejection regressions;
- `27becec03b853428464799f610d283fa44f689f2` — capability-map repair and product-
  home invariant restoration;
- `5422739a998827634747d6a4d417fc85501fec2b` — task-state reconciliation;
- `9e403bdbd680fb7faa615b1ff2bf4016bca5c9a1` — blocker reconciliation.

### Historical exact-head evidence that triggered this follow-up

Historical candidate `738e807e19fc0b2b4daf53eb4102ae1449f4aae9` is **not** a release
candidate anymore.

- canonical run `32586321394`, CI 760: `failure`;
- CI 760 failed `tests/pom-rx-capability-map.node.test.mjs` because the branch had
  lost the tested Wallet Guard primary-product-home sentence;
- exact-head distinct `chatgpt-codex-connector` review opened P1
  `PRRT_kwDOTiNyWc6baFkR`: a non-extensible rejected same-realm native Promise
  with a nonstandard prototype could reach fallback constructor shadowing before
  a rejection reaction was attached;
- the capability-map defect is tracked as P1 `PRRT_kwDOTiNyWc6baIxZ`;
- prior historical release threads remain
  `PRRT_kwDOTiNyWc6bZjxp` (P1), `PRRT_kwDOTiNyWc6bZ6tx` (P1), and
  `PRRT_kwDOTiNyWc6bZ6tz` (P2).

Any CI/release-owner approval on `738e...` is historical only and must not be
reused after the head move.

### Follow-up runtime repair now implemented

The follow-up drain classifier walks the effective `constructor` lookup path with
captured `Object.getOwnPropertyDescriptor`, captured `Object.getPrototypeOf` and
captured `util.types.isProxy`, bounded to a finite chain length. It attaches the
captured native `Promise.prototype.then` rejection reaction without a preceding
mutation when constructor lookup is provably data-only safe:

- the first effective constructor is `undefined`;
- the first effective constructor is the captured native `Promise` and captured
  species integrity still holds; or
- constructor lookup terminates at `null`.

Prototype Proxies are rejected from the internal-drain classifier before their
property traps can be consulted, and constructor accessors are not invoked merely
to mark a rejection handled. Unsafe configurable paths may still be shadowed with
an own `undefined` constructor. Non-shadowable hostile accessor/Proxy paths remain
explicitly outside the gateway-owned internal-drain guarantee.

The strict CI-wired rejected-transport suite retains all previous cases and now
also covers:

- `Object.setPrototypeOf(rejectedPromise, null)` followed by
  `Object.preventExtensions(rejectedPromise)`;
- a non-extensible rejected native Promise with a benign alternate prototype
  carrying a native data `constructor: Promise`.

Each supported hostile transport case must fail closed with zero reference
authorization, zero account continuation and zero sensitive forwarding. The
accessor boundary regression also requires zero hostile constructor-getter
execution.

### Capability-map repair

The branch again states the repository-tested non-normative positioning invariant:
Wallet Guard's primary product home is **Blockchain and digital assets**, while
its defensive control model also overlaps the Cybersecurity block. The canonical
capability-map test was not weakened.

### Writer / independent-review routing

The Prime lane is the **single implementation writer** for this current follow-up.
A Codex-writer instruction was explicitly superseded before any Codex-authored
commit or reaction. `chatgpt-codex-connector` is therefore reserved as a
**read-only genuinely distinct exact-head reviewer** for the frozen candidate.
Release-owner/assistant review remains non-independent.

### Current release blockers

1. `PR120_FRESH_EXACT_HEAD_CANONICAL_CI_REQUIRED`.
2. `PR120_RELEASE_OWNER_FIVE_STAGE_GATE_REQUIRED`.
3. `PR120_NEW_DISTINCT_READ_ONLY_EXACT_HEAD_CODEX_REVIEW_REQUIRED`.
4. `PR120_THREADS_ZJXP_Z6TX_Z6TZ_BAFKR_BAIXZ_MUST_REMAIN_UNRESOLVED_UNTIL_EXACT_HEAD_VALIDATION`.
5. `PR120_ZERO_UNRESOLVED_P0_P1_P2_NOT_YET_ESTABLISHED`.
6. `PR97_STALE_HISTORICAL_BRANCH_MUST_NOT_MERGE`.
7. `PR93_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED_AFTER_TRUSTED_PR120`.
8. `DAGR_SOURCE_DOCUMENT_MISSING`.
9. `PRODUCTION_TRUST_UNPROVED / REAL_WALLET_NOT_AUTHORIZED`.

## blocked_historical_prs

### PR #97 — stale historical durable Gate candidate

- exact live head at this checkpoint family: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- CI 592: `success` but false-PASS for the Promise-drift property;
- status: `OPEN / MUST_NOT_MERGE / SUPERSEDED_FOR_PROMISE_REPAIR_BY_PR120`.

### PR #93 — Wallet Guard simulation evidence

- exact live head at this checkpoint family:
  `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- CI 541: `success` but not release evidence;
- unresolved P1/P2 classes remain;
- status: `OPEN / NOT_MERGED / UNTRUSTED / ORDERED_AFTER_TRUSTED_PR120` unless a
  separately reviewed dependency decision changes that order.

## next_safe_actions

1. Read live PR #120 after this checkpoint commit and freeze the resulting exact
   head.
2. Require fresh canonical exact-head CI success with both
   `provider-invalid-rejected-transport.node.test.mjs` and
   `pom-rx-capability-map.node.test.mjs` actually executed.
3. Run the release-owner mandatory five-stage gate on the **same exact head**,
   covering SpecKit/architecture, concrete skeptical attack hypotheses, security,
   code-quality/optimization and integration/regression evidence.
4. Request a **new genuinely distinct read-only exact-head
   `chatgpt-codex-connector` skeptical/security review** for that frozen SHA.
5. Resolve `PRRT_kwDOTiNyWc6bZjxp`, `PRRT_kwDOTiNyWc6bZ6tx`,
   `PRRT_kwDOTiNyWc6bZ6tz`, `PRRT_kwDOTiNyWc6baFkR` and
   `PRRT_kwDOTiNyWc6baIxZ` only if fresh exact-head CI/review validates their
   repairs and leaves zero P0/P1/P2.
6. Merge only then under standing authorization and immediately run exact-merge
   post-merge assurance before trusting PR #120.
7. Reconstruct durable claim-before-observer/downstream composition only after
   PR #120 is trusted; reconcile PR #93 afterwards unless ordering is separately
   reviewed.

## merge_and_post_merge_rules

Standing authorization permits merge only after the mandatory five-stage
pre-merge gate, all applicable technical/security gates, canonical exact-head CI,
a genuinely distinct exact-head independent review, and zero unresolved P0/P1/P2
on the same frozen SHA. Any head move invalidates exact-head evidence. Every
non-trivial merge then requires exact-main CI and exact-merge-SHA SpecKit,
skeptical/falsification, security, code-quality, optimization and
integration/regression assurance with a final PASS/CONDITIONAL/BLOCK verdict.

## safety_boundary

No private key, seed, secret, funded-wallet credential, real/funded wallet,
mainnet transaction, meaningful funds or uncontrolled malicious-site interaction
is authorized. No public site/Vercel/funding-directory write belongs to this
control plane. Burner local/testnet E2E remains behind a separate explicit human
gate.
