# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-22T19:05:00+02:00`

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
- first implementation commit: `f31611139e51cf0f05265c19012e372e06bfc7ae`;
- runtime drain repair commit: `9e7a151b4eb8da0e7595e8ebee540319273a7fab`;
- bounded non-shadowable-accessor regression commit:
  `d0c4175f12086bbbb2f4ccceb7cd947203e3f6fc`;
- class: `TIER_B_SHARED_SECURITY_SEMANTICS`;
- state: `OPEN / NOT_TRUSTED / RUNTIME_REPAIR_IMPLEMENTED / FINAL_EXACT_HEAD_GATES_PENDING`.

The final moving SHA is intentionally **not** embedded in this moving file. Read
PR #120 live after this checkpoint commit and bind all CI/review evidence to that
exact head.

### Review history that still governs release

- `2f081956dff590359fec5a95dc8eb0c547ac4174`: CI 733 passed but owner review
  found P1 inherited `Array.prototype[0]` setter substitution through the
  compatibility bridge; moved-head repairs replaced inherited `[[Set]]` writes
  with captured construction + own data-property definitions and CI-wired policy/
  account substitution attacks;
- `5885da291d7d6b3e4541e5c00c160ffb481828b8`: CI 737 passed and a genuinely
  distinct `chatgpt-codex-connector` review opened P1 thread
  `PRRT_kwDOTiNyWc6bZjxp`: structurally invalid rejected native Promise
  transports could fail validation before any rejection reaction was attached;
- `b7576f8e94b3379c7427a51e4113960f396ac7e8`: fresh dedicated Codex review
  opened P1 thread `PRRT_kwDOTiNyWc6bZ6tx`: the first drain fix still performed a
  fallible own-`constructor` `defineProperty` before attaching the rejection
  reaction, leaving non-extensible metadata and non-configurable data-constructor
  cases vulnerable to orphaned strict unhandled rejection;
- the same review opened P2 thread `PRRT_kwDOTiNyWc6bZ6tz`: the rejected-
  transport test file was not reached by canonical `npm test`;
- pre-repair exact head `b243a95094cfeeb31a7de94c5df0c93f6d711938`
  had canonical CI `32585329838` / CI 754 `failure`, with exactly the newly wired
  `metadata-nonextensible` and `constructor-nonconfigurable` strict child cases
  failing as expected. This converted the prior false-PASS into explicit red
  evidence before production repair.

All moved-head CI/review evidence above is historical only for release.

### Runtime repair now implemented

Commit `9e7a151b4eb8da0e7595e8ebee540319273a7fab` changes
`provider.mjs` so a claimed rejected transport no longer requires a fallible
mutation before its rejection reaction when its effective constructor path is
already safe:

- captured reflection inspects own/prototype constructor descriptors without
  reading attacker accessors;
- `Promise[Symbol.species]` descriptor is captured at module initialization and
  included in Promise runtime integrity because native `then` performs species
  construction before `PerformPromiseThen`;
- safe data-only constructor/species paths use the captured
  `Promise.prototype.then` reaction directly, which covers the CI-wired
  non-extensible metadata case and non-configurable own data constructor equal to
  the captured Promise constructor;
- unsafe-but-configurable constructor paths are shadowed with own `undefined`
  before the captured `then`, avoiding getter dispatch;
- post-drain constructor/then pinning was removed because invalid transports are
  rejected immediately and do not need to be reused.

The canonical regression file remains wired into
`test:pom-rx:wallet-guard-provider-gate` and full `npm test`.

### Explicit bounded non-claim

A native rejected Promise carrying a **non-configurable own constructor accessor**
cannot be safely shadowed with standard ECMAScript intrinsics, while invoking
native `Promise.prototype.then` would read that accessor through species
construction. PR #120 therefore does **not** claim gateway-owned internal draining
for that arbitrary decorated transport class and does not execute the hostile
accessor merely to suppress rejection.

Commit `d0c4175f12086bbbb2f4ccceb7cd947203e3f6fc` adds a strict child regression
that first gives the deliberately unsupported provider transport its own
rejection handling, then proves Wallet Guard fails closed with zero constructor
getter execution, zero reference authorization and zero sensitive forwarding.
This is an explicit unsupported-transport boundary, not a silent false-PASS.

### Current release blockers

1. `PR120_FINAL_EXACT_HEAD_CANONICAL_CI_REQUIRED`.
2. `PR120_RELEASE_OWNER_FIVE_STAGE_GATE_REQUIRED`.
3. `PR120_NEW_DISTINCT_EXACT_HEAD_CODEX_REVIEW_REQUIRED`.
4. `PR120_THREADS_ZJXP_Z6TX_Z6TZ_MUST_REMAIN_UNRESOLVED_UNTIL_EXACT_HEAD_VALIDATION`.
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

1. Re-read live PR #120 head after this checkpoint write and freeze that exact
   candidate.
2. Require canonical exact-head CI success with the strict rejected-transport
   suite actually executed; do not weaken/delete the non-extensible or
   non-configurable cases.
3. Run the release-owner mandatory five-stage gate on the same exact head,
   including SpecKit/architecture, skeptical attack hypotheses, security,
   code-quality/optimization and integration/regression evidence.
4. Request a **new genuinely distinct exact-head `chatgpt-codex-connector`
   skeptical/security review** only for that frozen SHA.
5. Resolve threads `PRRT_kwDOTiNyWc6bZjxp`, `PRRT_kwDOTiNyWc6bZ6tx` and
   `PRRT_kwDOTiNyWc6bZ6tz` only if the fresh exact-head evidence validates their
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
