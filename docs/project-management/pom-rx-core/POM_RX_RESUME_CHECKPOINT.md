# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-22T16:07:45+02:00`

Purpose: compact **durable cross-chat continuation state**. Scheduled-task chat
history is not project state. Every run reconstructs state from live GitHub plus
this canonical control plane. Live GitHub wins whenever a PR head, CI run,
review, review thread, mergeability signal or merge changes after this
checkpoint.

## trusted_main

`e5aead150a2ed5f390593cc2d9d307defdd79bdc`

Latest trusted merge: PR #119 — transition from the terminal documentation
checkpoint to the fresh PR #97-line runtime repair.

- exact source head: `057b225783b24c97568dbcd733ca4c821f889c7a`;
- exact merge/main SHA: `e5aead150a2ed5f390593cc2d9d307defdd79bdc`;
- exact-head CI: CI 719, `success`;
- release-owner exact-head gate: `PASS / NON-INDEPENDENT`;
- distinct exact-head `chatgpt-codex-connector` review: no major issues on the
  frozen candidate;
- canonical exact-main push CI: run `32575110984`, CI 720, `success` on the exact
  merge SHA;
- exact-merge SpecKit, skeptical/falsification, security, code-quality,
  optimization and integration/regression: PASS for the bounded control-plane
  scope;
- final exact-merge verdict: `POST_MERGE_ASSURANCE_PASS`, PR #119 issue comment
  `5380609307`.

PR #119 is terminal coordination evidence. Do **not** create another docs-only
successor. Material continuation is carried by the useful runtime lot below.

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
- state at this checkpoint commit: `OPEN / DRAFT / IN_PROGRESS / NOT_TRUSTED`;
- canonical exact-head CI: `PENDING` after the final owned-file/control-plane
  commit;
- release-owner five-stage gate: `PENDING`;
- distinct exact-head independent skeptical/security review: `PENDING`;
- unresolved current P0/P1/P2 on PR #120: read live before any release decision.

The PR #120 exact final head is intentionally not self-embedded in this moving
file because doing so would create an infinite head-changing loop. The exact
candidate SHA, CI and review state must be recorded in the PR conversation after
the final owned-file commit and read live at the start of the next run.

PR #120 starts from trusted main rather than merging/rebasing/reviving stale PR
#97. Its bounded implementation scope is:

- fail closed if inherited `Promise.prototype.constructor` or `then` drift from
  the module-initialization descriptors before a provider Promise is assimilated;
- pin load-bearing internal async Promises with captured own `constructor`/`then`
  data properties before parent awaits so rejected inner transports cannot be
  converted to attacker-controlled context by inherited Promise poisoning;
- preserve own-decorated native-Promise rejection without attacker getter
  execution;
- preserve ordinary native-Promise own-symbol bookkeeping compatibility;
- preserve hardened synchronous non-Promise/plain-data capture through the
  shared Core primitive;
- require the exploit regression to show **zero reference authorization and zero
  sensitive forwarding** for hostile rejected context transports.

This lot does **not** establish trusted durable Gate composition. The historical
PR #97 durable-claim composition remains a separate untrusted dependency to be
reconstructed/reviewed only after this prerequisite closes.

Skeptical hypotheses mapped to CI-wired evidence:

1. inherited Promise constructor/then poisoning can turn rejected chain/account
   reads into stable attacker context and reach authorization/forwarding;
2. own Promise `constructor`/`then` accessors can dispatch during assimilation;
3. synchronous Array/Object/callable Proxies can dispatch `then`/reflection traps
   before the inert-data boundary.

The negative gates require fail-closed behavior before authorization/forwarding;
compatibility controls require ordinary synchronous/native-Promise context and
own-symbol Promise bookkeeping to remain supported.

## blocked_historical_prs

### PR #97 — stale historical durable Gate candidate

- exact live head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- historical base: `0564aecd42cf0794894c12842980969ff59c9f73`;
- exact-head CI: run `32487036517`, CI 592, `success` but **not** security/release
  evidence;
- release-owner exact-head verdict: `BLOCK / NON-INDEPENDENT`;
- current exact-head P1: `Reject Promise drift before entering async layers`;
- status: `OPEN / MUST_NOT_MERGE / SUPERSEDED_FOR_REPAIR_BY_FRESH_PR120`.

### PR #93 — Wallet Guard simulation evidence

- exact live head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- historical base: `818718955c9e4136e9e55754a31be2f1c7b610f8`;
- exact-head CI: run `32465835858`, CI 541, `success` but not release evidence;
- latest owner/distinct release evidence is stale on moved head `03e0201c9f...`;
- unresolved current/non-outdated P1/P2 classes include negative-zero identity,
  typed-data wrapper normalization, generic-signature exact-value commitment,
  nested payload capture/saved-reflection hardening, and shared proof
  canonicalization/SHA-256/hash hardening;
- status: `OPEN / NOT_MERGED / UNTRUSTED / ORDERED_AFTER_TRUSTED_PR120` unless a
  separately reviewed dependency decision changes that order.

## current_blockers

1. `PR120_EXACT_HEAD_CI_PENDING`.
2. `PR120_RELEASE_OWNER_FIVE_STAGE_GATE_PENDING`.
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
exact SHA. Any head movement invalidates CI/review evidence.

After any merge, require exact-main CI and exact-merge-SHA SpecKit,
skeptical/falsification, security, code-quality, optimization and
integration/regression assurance with one final verdict:
`POST_MERGE_ASSURANCE_PASS`, `POST_MERGE_ASSURANCE_CONDITIONAL` or
`POST_MERGE_ASSURANCE_BLOCK`. A non-PASS merge is not a trusted dependency.

## next_safe_actions

1. Freeze PR #120 after the bounded runtime/test/control-plane owned files are
   complete; record the exact final head in the PR conversation.
2. Run/read canonical exact-head CI on that SHA and repair any failure through the
   same single-writer branch.
3. Run the release-owner five-stage gate and a fresh distinct exact-head
   skeptical/security review; resolve no P0/P1/P2 thread until the repaired exact
   head is independently validated.
4. Merge only if all exact-head gates pass unchanged; then run exact-merge
   post-merge assurance before trusting the dependency.
5. Reconstruct the durable claim-before-observer/downstream composition as a
   separately bounded reviewed lot only after PR #120 is trusted.
6. Reconcile PR #93 only after the trusted prerequisite order permits it.
7. Do not begin burner/local-testnet execution without separate explicit human
   authorization.

## safety_boundary

No private key, seed, secret, funded-wallet credential, real/funded wallet,
mainnet transaction, meaningful funds or uncontrolled malicious-site interaction
is authorized. No public site/Vercel/funding-directory write belongs to this
control plane. Burner local/testnet E2E remains behind a separate explicit human
gate.
