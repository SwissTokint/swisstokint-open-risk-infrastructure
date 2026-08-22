# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-22T12:20:00+02:00`

Purpose: compact **durable cross-chat continuation state**. Scheduled-task chat
history is not project state. Every run reconstructs state from live GitHub plus
this canonical control plane. Live GitHub wins whenever a PR head, CI run,
review, review thread, mergeability signal or merge changes after this
checkpoint.

## trusted_main

`a22198bf8065cb7af2f4f7821edaba9c5f749704`

Latest trusted merge: PR #118 — bounded non-Tier-B documentation/control-plane
reconciliation after PR #117.

- exact source head: `dacc2efde7cf5c0f283a1eb8e2a1458e94aa04ab`;
- exact merge/main SHA: `a22198bf8065cb7af2f4f7821edaba9c5f749704`;
- source-head and merge tree: `4eb5d22f763d158f95c86501368de3d68af89104`;
- source-head to merge comparison: one merge commit and `files: []`;
- exact-head candidate CI: run `32559785310`, CI 704, `success`;
- final release-owner exact-head gate: review `4999506623`,
  `PASS / NON-INDEPENDENT`;
- distinct exact-head `chatgpt-codex-connector` evidence: issue comment
  `5379054811`, reviewed `dacc2efde7`, no major issues;
- exact-head P2 threads were resolved only after exact-head validation; no
  unresolved P0/P1/P2 remained in the bounded merge scope;
- canonical exact-main push CI: run `32561596467`, CI 705 attempt 1,
  `completed / success` on the exact merge SHA;
- decision-time `pom-rx/exact-main-ci`: `success`, targeting that canonical run;
- exact-merge SpecKit reconciliation, skeptical/falsification, security,
  code-quality, optimization and integration/regression: PASS for the bounded
  documentation/control-plane scope;
- final exact-merge verdict: `POST_MERGE_ASSURANCE_PASS`, PR #118 issue comment
  `5379219612`.

PR #118 is terminal trusted coordination evidence. It changed no runtime,
protocol, Gate, Witness, verifier, Wallet Guard, provider, wallet, network,
public-site/Vercel or financial-execution semantics and does not make PR #97 or
PR #93 trusted.

Its terminal rule now governs continuation: do **not** create another
post-merge documentation-only checkpoint merely to record that PR #118 is done.
Carry the terminal fact together with useful follow-on work.

## repository architecture present on trusted main

Trusted main contains the bounded strict profile while preserving historical
`pom-rx/0.1`, common exact authorization, a process-local single-use Gate, shared
bounded hostile-object/plain-data capture, process-local Witness trust lifecycle,
a separate filesystem durable claim primitive, reference execution evidence,
reference observation/reconciliation, merged Wallet Guard JSON/intent/effect/
policy/controller/preflight/Witness-adapter/provider/controlled-host layers,
exact-main CI observability, and the GitHub-backed cross-chat POM-RX control
plane.

Shared canonicalization, hashing, verifier, Witness, exact authorization, Gate,
execution-evidence and observation/reconciliation semantics remain Core-owned.
Wallet Guard remains an application profile and must not fork those semantics.

These remain reference/prototype properties. Production trusted time,
issuer/key custody, arbitrary-browser/provider integrity, external execution or
effect truth, distributed filesystem/consensus semantics and real-wallet safety
are not proved.

## current_transition_and_useful_follow_on

PR #119 exists because live GitHub had advanced to trusted PR #118 while the four
canonical continuation files on `main` necessarily still contained the pre-merge
checkpoint. The distinct exact-head Codex review of PR #119 head
`1bdb53bad6f0b88046358f4ec7912c86a0469a7c` raised P2:
`Honor PR #118's terminal rule instead of creating PR #119`.

That finding is accepted as a control-plane design correction. PR #119 is **not**
being promoted into another permanent post-merge checkpoint workstream. The
repaired scope carries PR #118's terminal facts only while simultaneously
advancing the next useful task: the fresh trusted-main repair of the PR #97
Promise-drift security boundary.

Current transition vehicle:

- PR: `#119`;
- branch: `docs/pom-rx-checkpoint-after-118-20260822`;
- base: exact trusted main `a22198bf8065cb7af2f4f7821edaba9c5f749704`;
- class: `NON_TIER_B_DOCUMENTATION_CONTROL_PLANE`;
- old reviewed head: `1bdb53bad6f0b88046358f4ec7912c86a0469a7c`;
- old exact-head CI: `32564477324` / CI 710, `success`;
- old release-owner gate: review `4999836109`, `PASS / NON-INDEPENDENT`;
- old distinct exact-head review: `chatgpt-codex-connector`, with unresolved P2
  thread `PRRT_kwDOTiNyWc6bX2ey`;
- all evidence on `1bdb53bad...` is stale after this repair moves the head.

The repaired final PR #119 head is intentionally not self-embedded in these
moving files. Read the live PR head, CI, reviews and threads after the final
owned-file commit. PR #119 may merge only if that exact repaired head receives
canonical CI success, release-owner five-stage PASS, a fresh genuinely distinct
exact-head independent review and zero unresolved P0/P1/P2.

If PR #119 merges and its exact merge receives `POST_MERGE_ASSURANCE_PASS`, do
**not** open a post-PR119 documentation-only successor. Immediately start the
fresh PR #97-line runtime repair from the then-current trusted `main`; let that
useful work carry any later materially changed continuation state.

## active_runtime_task

### Fresh PR #97-line repair — Core durable claim + Gate Promise boundary

Historical PR #97 remains open and **must not merge**:

- exact live head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- historical base: `0564aecd42cf0794894c12842980969ff59c9f73`;
- current trusted main: `a22198bf8065cb7af2f4f7821edaba9c5f749704`;
- exact-head canonical CI: run `32487036517`, CI 592, `success` but not
  security/release evidence;
- release-owner exact-head verdict: `BLOCK / NON-INDEPENDENT`;
- current exact-head independent P1: `Reject Promise drift before entering async
  layers`;
- current exact-head and applicable historical P1 threads remain unresolved.

The historical head is a test-only move from independently blocked parent
`639b96e7...`; provider/runtime behavior was not repaired. Inherited
`Promise.prototype.constructor` plus `then` poisoning can cross outer awaits in
`readProviderSnapshot`, `sampleStableProviderContext`, `sampleTrustedContext` and
`request`, substitute stable attacker-controlled context before the inner
transport rejection reaches its caller, then permit reference authorization and
sensitive forwarding. Green CI 592 does not override that concrete reproducer.

Fresh repair contract after PR #119 is trusted:

- create a new bounded branch/PR from the then-current trusted `main`; do not
  merge, rebase, revive or wholesale-copy stale PR #97;
- prevent Promise-prototype drift before outer async assimilation;
- restore or replace a CI-wired exploit regression that proves the sensitive-
  forwarding failure without weakening hostile-dispatch expectations;
- require durable capability claim success before any observer or downstream
  work so losing contenders cannot enter security-sensitive paths;
- preserve fail-closed replay and durable one-winner semantics;
- preserve ordinary native-Promise Node/AsyncHooks bookkeeping-symbol
  compatibility;
- preserve hardened direct non-Promise capture and own-decorated Promise
  rejection;
- require **zero authorization and zero sensitive forwarding for hostile rejected
  transports**;
- keep shared semantics in Core and Wallet Guard as an application profile;
- require exact-head CI, release-owner six-lane PASS, a fresh distinct exact-head
  independent skeptical/security review and zero unresolved P0/P1/P2 before merge.

## blocked_later_runtime_pr

### PR #93 — Wallet Guard simulation evidence

- state: `OPEN / NOT_MERGED / UNTRUSTED /
  RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED`;
- exact live head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- historical base: `818718955c9e4136e9e55754a31be2f1c7b610f8`;
- current trusted main: `a22198bf8065cb7af2f4f7821edaba9c5f749704`;
- exact-head canonical CI: run `32465835858`, CI 541, `success` but not release
  evidence;
- latest release-owner and distinct review evidence remains on moved head
  `03e0201c9f...`, not current `c4e40ceb...`;
- unresolved current/non-outdated P1/P2 classes include exact negative-zero
  identity, typed-data wrapper normalization, generic-signature exact-value
  commitment, nested payload capture with saved reflection intrinsics, and shared
  proof canonicalization/SHA-256/hash hardening.

PR #93 overlaps shared package/regression surfaces with the PR #97-line work and
remains ordered after a trusted fresh repair unless a separately reviewed
dependency decision changes it. Simulation remains reference evidence only and
does not authorize forwarding or prove external state/effect truth.

## current_blockers

1. `PR119_EXACT_HEAD_P2_TERMINAL_RULE_REPAIR_REQUIRES_FRESH_REVIEW` — moved-head
   repair of Codex P2 `Honor PR #118's terminal rule instead of creating PR #119`;
   stale CI/review on `1bdb53bad...` cannot release the repaired head.
2. `PR97_EXACT_HEAD_P1_PROMISE_DRIFT_BEFORE_ASYNC_LAYERS`.
3. `PR97_FALSE_PASS_GREEN_CI_32487036517`.
4. `PR97_RELEASE_OWNER_BLOCK_EXACT_HEAD_0EFB462`.
5. `PR97_FRESH_TRUSTED_MAIN_REPAIR_REQUIRED_AFTER_PR118`.
6. `PR97_HISTORICAL_P1_THREADS_PENDING_VALIDATED_RESOLUTION`.
7. `PR93_TRUSTED_MAIN_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED`.
8. `DAGR_SOURCE_DOCUMENT_MISSING`.
9. `PRODUCTION_TRUST_UNPROVED / REAL_WALLET_NOT_AUTHORIZED`.

## merge_authorization_and_review_rules

Standing authorization permits a POM-RX merge without per-PR confirmation only
after the full five-stage pre-merge gate, every applicable technical/security
gate, exact-head CI, and every required distinct exact-head independent review
pass with no unresolved P0/P1/P2. The five stages remain: review pass 1; control
pass 1; skeptical challenge; exact-head review pass 2; exact-head control pass 2 /
release gate. The independent-review waiver remains limited to PR #60 unless
explicitly broadened.

Release-owner/Prime/self-review is NON-INDEPENDENT. A fresh
`chatgpt-codex-connector` review may satisfy the independent lane only when it
actually covers the exact current candidate SHA and leaves no unresolved
P0/P1/P2. Moved-head review evidence never releases a changed head.

After every non-trivial merge, run exact-merge-SHA SpecKit reconciliation,
skeptical/falsification, security audit, code-quality review, optimization review
and integration/regression. Record exactly one scoped final verdict:
`POST_MERGE_ASSURANCE_PASS`, `POST_MERGE_ASSURANCE_CONDITIONAL` or
`POST_MERGE_ASSURANCE_BLOCK`. A non-PASS merge is not a trusted dependency and
must be repaired through a new PR, never direct `main`.

## next_safe_actions

1. Finish the four-file PR #119 repair that converts the self-recreating
   checkpoint into a transition carrying PR #118 terminal state plus activation
   of the fresh PR #97-line repair.
2. Freeze the repaired exact head and require fresh canonical exact-head CI,
   release-owner five-stage control, fresh distinct exact-head independent review
   and zero unresolved P0/P1/P2 on that same SHA.
3. Resolve the existing P2 thread only after exact-head independent validation of
   the repair, then revalidate unchanged base/head/CI/reviews/threads before any
   merge.
4. After a merge, require exact-main CI and exact-merge
   `POST_MERGE_ASSURANCE_PASS`; do **not** create another documentation-only
   checkpoint for PR #119.
5. Start the smallest fresh PR #97-line runtime repair from then-current trusted
   main, preserving durable claim-before-observer/downstream and zero
   authorization/forwarding for hostile rejected transports.
6. Reconcile #93 only after the fresh PR #97-line dependency is trusted unless a
   separate reviewed dependency-order change is recorded.
7. Start no dependent Wallet Guard E2E lot until relevant Tier-B dependencies
   have trusted exact-merge post-merge PASS evidence.
8. Do not begin burner/local-testnet execution without separate explicit human
   authorization.

## safety_boundary

No private key, seed, secret, funded-wallet credential, real/funded wallet,
mainnet transaction, meaningful funds or uncontrolled malicious-site interaction
is authorized. No public site/Vercel/funding-directory write belongs to this
control plane. Burner local/testnet E2E remains behind a separate explicit human
gate.

## operational_claim_boundary

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`:
local, deterministic, synthetic and bounded. It is not production readiness, an
audit, certification, wallet safety, financial safety or deployment
authorization.
