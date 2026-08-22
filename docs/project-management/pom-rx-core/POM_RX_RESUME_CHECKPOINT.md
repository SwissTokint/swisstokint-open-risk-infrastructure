# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-22T17:15:10+02:00`

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
successor. Carry materially changed continuation state with useful runtime work.

## architecture_and_claim_boundary

Trusted main contains the strict reference profile, common exact authorization,
a process-local single-use Gate, the shared bounded hostile-object/plain-data
capture, process-local Witness trust lifecycle, a separate filesystem durable
claim primitive, reference execution evidence, observation/reconciliation, and
Wallet Guard reference layers. Shared canonicalization, hashing, verifier,
Witness, exact authorization, Gate, execution-evidence and observation semantics
remain Core-owned; Wallet Guard remains an application profile.

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
- class: `TIER_B_SHARED_SECURITY_SEMANTICS`;
- state at this checkpoint commit: `OPEN / DRAFT / IN_PROGRESS / NOT_TRUSTED`.

### Repair history and current evidence

- historical candidate `7774febbb308a085536fc139e1261d3e61a904f3`
  failed CI 726 because a rejected provider Promise could remain without a
  rejection reaction when prototype drift was rejected synchronously;
- commit `310bbdb9988df141247f56a2e13f09bd1385effb` attached a captured
  native-Promise rejection reaction without dispatching poisoned inherited
  `constructor`/`then`, then pinned captured own Promise data properties;
- intermediate `3a58736cc581d92936cb460ed7ac0239243fc18d` / CI 728 proved the
  provider-gate attack regression and shared plain-data hardening, but exposed a
  controlled-host compatibility failure because hardened Core snapshot arrays no
  longer use ordinary `Array.prototype`;
- commit `7839526c4843c11c41225b42340defc9b998852d` added the narrow
  application bridge from hardened Core policy snapshots to ordinary frozen
  policy-list arrays; CI 729 completed full `npm test` successfully;
- skeptical false-PASS review then found scalar policy-list values could be
  converted into empty arrays. Commits `830b73f8d7bb29a9f8e5dc163fefee7933f5ae03`
  and `315ba35db28a2ce265968f4c9ae603961de5f209` require actual arrays and add
  CI-wired scalar rejection cases;
- exact head `2f081956dff590359fec5a95dc8eb0c547ac4174` subsequently passed
  canonical CI run `32580380859` / CI 733, including production dependency audit,
  strict-verifier reproducibility, full `npm test`, expected-red integrity checks,
  Stellar tests/build and hardened proof-relay image build;
- release-owner/security review `5000444583` on exact `2f081956...` nevertheless
  found **P1**: the newly reused `copyFrozenArray` bridge allocated `new Array(...)`
  then populated holes through `output[index] = value`, allowing a post-import
  inherited `Array.prototype[0]` setter to substitute a valid own element before
  freeze. This could rewrite policy-list data and provider-observed account data,
  so CI 733 was a false-PASS for that attack family;
- repair commit `f614ecedfb0e161a7436ba16555ac1859df6fa80` captures the Array
  constructor plus `Object.create`/`Object.defineProperty`, creates bridge and
  account/inspection arrays with captured construction, and defines every element
  as an own data property rather than using inherited `[[Set]]`; it also pins the
  historical standard-array prototype comparison to the captured prototype;
- regression commit `0b66e6c12f8ad446083daf41a6831f7575e727a4` adds explicit
  post-import `Array.prototype[0]` substitution attacks against both policy bridge
  data and provider-observed account context;
- commit `bd404401a1a9a6131f0b4a98ce29dd9dc107b53c` wires that regression into
  `test:pom-rx:wallet-guard-controlled-host` and therefore full `npm test`.

Canonical exact-head CI after this checkpoint commit is **PENDING**. All CI and
release-review evidence on `2f081956...` is stale for release because the repair
moved the head. Release-owner five-stage gate and genuinely distinct exact-head
independent skeptical/security review are also **PENDING**.

The PR #120 exact final head is intentionally not self-embedded in this moving
file because doing so would create an infinite head-changing loop. Record the
post-checkpoint frozen candidate SHA, exact-head CI and review state in the PR
conversation and re-read them live before any release decision.

### Bounded scope

PR #120 starts from trusted main rather than merging/rebasing/reviving stale PR
#97. The bounded prerequisite scope is:

- fail closed if inherited `Promise.prototype.constructor` or `then` drift before
  a provider Promise is safely assimilated;
- pin load-bearing internal async Promises with captured own `constructor`/`then`
  data properties before parent awaits;
- preserve own-decorated native-Promise rejection without attacker getter
  execution and preserve ordinary own-symbol bookkeeping compatibility;
- preserve hardened synchronous non-Promise/plain-data capture through shared
  Core;
- preserve controlled-host compatibility without relaxing the hardened Core
  snapshot or historical strict standard-array policy boundary;
- reject scalar policy-list coercion;
- prevent inherited Array index setters from substituting bridged policy or
  provider-account data;
- require hostile rejected context transports to yield **zero reference
  authorization and zero sensitive forwarding**.

This lot does **not** establish trusted durable Gate composition. The historical
PR #97 durable-claim composition remains a separate untrusted dependency to be
reconstructed/reviewed only after this prerequisite closes.

### Skeptical hypotheses mapped to CI-wired evidence

1. inherited Promise constructor/then poisoning can convert rejected chain/account
   reads into stable attacker context and reach authorization/forwarding;
2. own Promise `constructor`/`then` accessors can dispatch during assimilation;
3. synchronous Array/Object/callable Proxies can dispatch `then`/reflection traps
   before the inert-data boundary;
4. hardened Core snapshot-array prototypes can break application composition and
   tempt a fail-open relaxation of the public policy boundary;
5. a representation bridge can coerce invalid scalar list values into valid empty
   arrays and silently reduce policy controls;
6. an inherited Array index setter can rewrite bridge/provider-account elements
   while still leaving a dense ordinary frozen array that later validators accept.

## blocked_historical_prs

### PR #97 — stale historical durable Gate candidate

- exact live head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- historical base: `0564aecd42cf0794894c12842980969ff59c9f73`;
- CI 592: `success` but false-PASS for the Promise-drift property;
- release-owner verdict: `BLOCK / NON-INDEPENDENT`;
- status: `OPEN / MUST_NOT_MERGE / SUPERSEDED_FOR_PROMISE_REPAIR_BY_PR120`.

### PR #93 — Wallet Guard simulation evidence

- exact live head at this checkpoint: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- CI 541: `success` but not release evidence;
- owner/distinct review evidence is stale on an older moved head;
- unresolved P1/P2 classes include negative-zero identity, typed-data wrapper
  normalization, generic-signature exact-value commitment, nested saved-reflection
  capture and shared proof canonicalization/SHA-256/hash hardening;
- status: `OPEN / NOT_MERGED / UNTRUSTED / ORDERED_AFTER_TRUSTED_PR120` unless a
  separately reviewed dependency decision changes that order.

## current_blockers

1. `PR120_EXACT_HEAD_CI_PENDING_AFTER_ARRAY_INDEX_SETTER_P1_REPAIR`.
2. `PR120_RELEASE_OWNER_FIVE_STAGE_GATE_PENDING_ON_REPAIRED_EXACT_HEAD`.
3. `PR120_DISTINCT_EXACT_HEAD_INDEPENDENT_REVIEW_PENDING`.
4. `PR120_ZERO_UNRESOLVED_P0_P1_P2_NOT_YET_ESTABLISHED`.
5. `PR97_STALE_HISTORICAL_BRANCH_MUST_NOT_MERGE`.
6. `PR93_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED_AFTER_PR120`.
7. `DAGR_SOURCE_DOCUMENT_MISSING`.
8. `PRODUCTION_TRUST_UNPROVED / REAL_WALLET_NOT_AUTHORIZED`.

## merge_and_post_merge_rules

Standing authorization permits merge only after the mandatory five-stage
pre-merge gate, all applicable technical/security gates, canonical exact-head CI,
a genuinely distinct exact-head independent review, and zero unresolved P0/P1/P2
on the same frozen SHA. Release-owner/Prime/self-review is non-independent. A
fresh `chatgpt-codex-connector` review counts only when it actually reviews that
exact SHA. Any head movement invalidates exact-head CI/review evidence.

After any merge, require exact-main CI and exact-merge-SHA SpecKit,
skeptical/falsification, security, code-quality, optimization and
integration/regression assurance with one final verdict:
`POST_MERGE_ASSURANCE_PASS`, `POST_MERGE_ASSURANCE_CONDITIONAL` or
`POST_MERGE_ASSURANCE_BLOCK`. A non-PASS merge is not a trusted dependency.

## next_safe_actions

1. Freeze the post-checkpoint PR #120 head and record its exact SHA in the PR
   conversation; do not move it for bookkeeping-only SHA self-reference.
2. Require canonical CI success on that exact SHA, including the original
   Promise-drift exploit, shared plain-data hardening, scalar policy-list negative
   cases, both inherited Array-index-setter regressions and full workflow.
3. Re-run the release-owner five-stage gate on that exact repaired head.
4. Obtain a fresh genuinely distinct exact-head skeptical/security review. A
   failed reviewer assignment or a stale review is not independent evidence.
5. Merge only if every exact-head gate passes unchanged and zero unresolved
   P0/P1/P2 remain; immediately run exact-merge post-merge assurance before
   trusting the dependency.
6. Reconstruct durable claim-before-observer/downstream composition as a separate
   bounded Tier-B lot only after PR #120 becomes trusted.
7. Reconcile PR #93 only after the trusted prerequisite order permits it.

## safety_boundary

No private key, seed, secret, funded-wallet credential, real/funded wallet,
mainnet transaction, meaningful funds or uncontrolled malicious-site interaction
is authorized. No public site/Vercel/funding-directory write belongs to this
control plane. Burner local/testnet E2E remains behind a separate explicit human
gate.
