# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-22T21:07:34+02:00`

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
- state: `OPEN / NOT_TRUSTED / FOLLOWUP_P1_REPAIR_IMPLEMENTED / CAPABILITY_MAP_FORMAT_REPAIRED / FRESH_EXACT_HEAD_GATES_PENDING`.

The final moving SHA is intentionally **not** embedded in this moving file. Read
PR #120 live after this checkpoint commit and bind all CI/review evidence to that
exact head.

Current follow-up repair commits on the branch include:

- `52225ae28d85afb4d6e4280d560f10098f19c935` — bounded effective-constructor
  prototype-chain drain classification;
- `a7bf527e8766b74e2717d7fd26a45add87a0958c` — strict non-extensible/nonstandard-
  prototype rejection regressions;
- `27becec03b853428464799f610d283fa44f689f2` — restores the capability-map
  product-home sentence but used Markdown emphasis that did not satisfy the
  repository's exact regex invariant;
- `5422739a998827634747d6a4d417fc85501fec2b` — task-state reconciliation;
- `9e403bdbd680fb7faa615b1ff2bf4016bca5c9a1` — blocker reconciliation;
- `1d85ec6089092282d6cf7f097deda510648336ca` — removes the Markdown emphasis so
  the tested sentence is exactly `Wallet Guard's primary product home is
  Blockchain and digital assets, while its defensive control model also overlaps
  the Cybersecurity block.` without weakening the test.

### Exact-head CI diagnosis before the latest formatting repair

Moved candidate `7deba0bbe755b4ff1090d82c17e0370522ed95c1` is **not** a release
candidate anymore.

- live canonical workflow run `32590681329`, CI run number 766: `failure`;
- the failing step was `npm test` and the only diagnosed failing assertion was
  `tests/pom-rx-capability-map.node.test.mjs` expecting the exact unformatted
  product-home sentence;
- PR #120 had `**Blockchain and digital assets**`, so the regex did not match;
- the test itself was not weakened;
- importantly, the Wallet Guard provider/security suite reached and passed the
  strict rejected-transport regressions on this moved head, including decorated,
  non-extensible, non-configurable-constructor, nonstandard-prototype,
  null-prototype/non-extensible, benign alternate-prototype/data-constructor and
  inherited Promise constructor/then poisoning cases;
- therefore CI 766 is historical red evidence of the control-plane formatting
  defect, not release evidence and not evidence that the runtime P1 repair is
  trusted.

Commit `1d85ec6089092282d6cf7f097deda510648336ca` repairs only that exact
capability-map formatting mismatch. This checkpoint commit moves the head again,
so all CI/review evidence on `7deba0...` and `1d85ec...` is historical for release.
Fresh canonical CI and fresh exact-head reviews are mandatory on the resulting
live head.

### Historical exact-head security evidence

Historical candidate `738e807e19fc0b2b4daf53eb4102ae1449f4aae9` is not a release
candidate.

- distinct `chatgpt-codex-connector` review opened P1
  `PRRT_kwDOTiNyWc6baFkR`: a non-extensible rejected same-realm native Promise
  with a nonstandard prototype could reach fallback constructor shadowing before
  a rejection reaction was attached;
- the capability-map defect is tracked as P1 `PRRT_kwDOTiNyWc6baIxZ`;
- prior historical release threads remain
  `PRRT_kwDOTiNyWc6bZjxp` (P1), `PRRT_kwDOTiNyWc6bZ6tx` (P1), and
  `PRRT_kwDOTiNyWc6bZ6tz` (P2).

All five threads remain unresolved until a fresh genuinely distinct exact-head
review validates the final candidate. Moved-head reviews are attack history only.

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

The strict CI-wired rejected-transport suite retains all previous cases and also
covers:

- `Object.setPrototypeOf(rejectedPromise, null)` followed by
  `Object.preventExtensions(rejectedPromise)`;
- a non-extensible rejected native Promise with a benign alternate prototype
  carrying a native data `constructor: Promise`.

Each supported hostile transport case must fail closed with zero reference
authorization, zero account continuation and zero sensitive forwarding. The
accessor boundary regression also requires zero hostile constructor-getter
execution.

### Writer / independent-review routing

The Prime lane is the **single implementation writer** for this current follow-up.
`chatgpt-codex-connector` remains reserved as a **read-only genuinely distinct
exact-head reviewer** for the frozen candidate. Release-owner/assistant review is
non-independent and cannot substitute for that gate.

### Current release blockers

1. `PR120_FRESH_EXACT_HEAD_CANONICAL_CI_REQUIRED_AFTER_HEAD_MOVE`.
2. `PR120_RELEASE_OWNER_FIVE_STAGE_GATE_REQUIRED_ON_FINAL_EXACT_HEAD`.
3. `PR120_NEW_DISTINCT_READ_ONLY_EXACT_HEAD_CODEX_REVIEW_REQUIRED`.
4. `PR120_THREADS_ZJXP_Z6TX_Z6TZ_BAFKR_BAIXZ_MUST_REMAIN_UNRESOLVED_UNTIL_EXACT_HEAD_VALIDATION`.
5. `PR120_ZERO_UNRESOLVED_P0_P1_P2_NOT_YET_ESTABLISHED`.
6. `PR97_STALE_HISTORICAL_BRANCH_MUST_NOT_MERGE`.
7. `PR93_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED_AFTER_TRUSTED_PR120`.
8. `DAGR_SOURCE_DOCUMENT_MISSING`.
9. `PRODUCTION_TRUST_UNPROVED / REAL_WALLET_NOT_AUTHORIZED`.

## blocked_historical_prs

### PR #97 — stale historical durable Gate candidate

Live GitHub currently exposes an old open PR body/head lineage that predates the
fresh trusted-main repair. It remains `OPEN / MUST_NOT_MERGE / SUPERSEDED_FOR_PROMISE_REPAIR_BY_PR120`.
Read its exact live head and CI from GitHub each run; do not use its body as
readiness evidence.

### PR #93 — Wallet Guard simulation evidence

Live GitHub exposes an old open PR lineage with stale moved-head release evidence
and unresolved P1/P2 classes. It remains
`OPEN / NOT_MERGED / UNTRUSTED / ORDERED_AFTER_TRUSTED_PR120` unless a separately
reviewed dependency decision changes that order. Read its exact live head and CI
from GitHub each run rather than relying on historical checkpoint hashes.

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
6. Revalidate unchanged main/base/head/CI/reviews/threads at decision time.
7. Merge only then under standing authorization and immediately run exact-merge
   post-merge assurance before trusting PR #120.
8. Reconstruct durable claim-before-observer/downstream composition only after
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
