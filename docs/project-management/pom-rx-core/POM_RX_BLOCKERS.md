# POM-RX Core — Active Blockers

Updated: `2026-08-22T12:22:00+02:00`

Current trusted main: `a22198bf8065cb7af2f4f7821edaba9c5f749704`

This file lists **current** blockers only. Historical blockers remain in Git
history and PR review threads. Live GitHub wins if a PR head, review, CI run,
review thread, mergeability signal or merge changes after this checkpoint.

## Trusted coordination state

PR #118 exact source head `dacc2efde7cf5c0f283a1eb8e2a1458e94aa04ab`
merged as exact main SHA `a22198bf8065cb7af2f4f7821edaba9c5f749704`.
Source-head and merge trees are identical at
`4eb5d22f763d158f95c86501368de3d68af89104`; the source-head to merge comparison
is one merge commit with `files: []`.

Release/post-merge evidence for PR #118:

- exact-head candidate CI `32559785310` / CI 704: `success`;
- final release-owner exact-head gate: review `4999506623`,
  `PASS / NON-INDEPENDENT`;
- distinct exact-head `chatgpt-codex-connector` issue comment `5379054811`:
  reviewed `dacc2efde7`, no major issues;
- no unresolved P0/P1/P2 remained in the bounded merge scope at merge decision;
- canonical exact-main push CI `32561596467` / CI 705 attempt 1:
  `completed / success` on exact merge SHA;
- decision-time `pom-rx/exact-main-ci`: `success`, targeting that canonical run;
- exact-merge SpecKit, skeptical/falsification, security, code quality,
  optimization and integration/regression: PASS for the bounded docs/control-
  plane scope;
- final exact-merge verdict: `POST_MERGE_ASSURANCE_PASS`, PR #118 issue comment
  `5379219612`.

PR #118 is terminal trusted coordination evidence only. It changed no
runtime/security semantics and does not make PR #97 or PR #93 trusted. Its
terminal rule is authoritative: do not create another documentation-only
checkpoint merely to record PR #118 as done.

## `PR119_EXACT_HEAD_P2_TERMINAL_RULE_REPAIR_REQUIRES_FRESH_REVIEW`

PR #119 is the current non-Tier-B transition vehicle from exact trusted main
`a22198bf...`. Its earlier exact head
`1bdb53bad6f0b88046358f4ec7912c86a0469a7c` had:

- canonical CI `32564477324` / CI 710: `success`;
- release-owner review `4999836109`: `PASS / NON-INDEPENDENT`;
- fresh distinct `chatgpt-codex-connector` review on that same SHA;
- one unresolved exact-head P2 thread `PRRT_kwDOTiNyWc6bX2ey`:
  `Honor PR #118's terminal rule instead of creating PR #119`.

The P2 is valid. The repair moves the head and changes the control-plane model:
PR #119 is no longer treated as another permanent post-merge checkpoint task.
Instead, it carries PR #118's terminal facts only while advancing the next useful
work item: the fresh trusted-main PR #97-line Promise-drift runtime repair. After
successful PR #119 merge plus exact-merge `POST_MERGE_ASSURANCE_PASS`, no
post-PR119 documentation-only successor is permitted.

All CI/review evidence on `1bdb53bad...` is stale after the repair. Do not merge
PR #119 until its repaired exact head has fresh canonical CI success, a fresh
release-owner five-stage PASS, a genuinely distinct exact-head independent review
with no unresolved P0/P1/P2, and the existing P2 thread is resolved only after
that exact-head validation.

## `PR97_EXACT_HEAD_P1_PROMISE_DRIFT_BEFORE_ASYNC_LAYERS`

Historical PR #97 remains open and **must not merge**.

- exact live head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- historical base: `0564aecd42cf0794894c12842980969ff59c9f73`;
- current trusted main: `a22198bf8065cb7af2f4f7821edaba9c5f749704`;
- exact-head CI `32487036517` / CI 592: `success` but not security evidence;
- release-owner exact-head verdict: `BLOCK / NON-INDEPENDENT`;
- current exact-head distinct finding: P1 `Reject Promise drift before entering
  async layers`;
- current exact-head and applicable historical P1 threads remain unresolved.

The exact head is a test-only move from independently blocked parent
`639b96e7...`; provider/runtime implementation is not repaired and the regression
was relaxed. With inherited `Promise.prototype.constructor` plus `then`
poisoning, outer awaits in `readProviderSnapshot`, `sampleStableProviderContext`,
`sampleTrustedContext` and `request` can assimilate rejected provider reads before
the transport validator failure reaches its caller, substitute stable attacker-
controlled context, then permit reference authorization and sensitive forwarding.

Required closure is a **fresh** bounded branch/PR from then-current trusted main,
not a merge/rebase/revival of stale PR #97:

- prevent hostile Promise-prototype dispatch before outer async assimilation;
- restore or replace a CI-wired regression reproducing the independent sensitive-
  forwarding exploit without weakening hostile-dispatch expectations merely to
  make CI green;
- require durable capability claim success before any observer or downstream work
  so losing contenders cannot enter security-sensitive paths;
- preserve fail-closed replay and durable one-winner behavior;
- preserve ordinary native-Promise Node/AsyncHooks bookkeeping-symbol
  compatibility;
- preserve hardened direct non-Promise object/function capture and own native-
  Promise-decoration rejection;
- require **zero authorization and zero sensitive forwarding for hostile rejected
  transports**;
- rerun exact-head CI and release-owner six-lane review;
- obtain a fresh distinct exact-head independent skeptical/security review;
- require zero unresolved P0/P1/P2 before merge.

## `PR97_FALSE_PASS_GREEN_CI_32487036517`

CI 592 is green on `0efb462...`, but it is not release evidence for the Promise
drift property because runtime behavior remains vulnerable and the exact-head
independent P1 is unresolved. Green CI never overrides a concrete security
reproducer.

## `PR97_RELEASE_OWNER_BLOCK_EXACT_HEAD_0EFB462`

The release-owner exact-head verdict remains `BLOCK / NON-INDEPENDENT`. The stale
head is not eligible for standing merge authorization.

## `PR97_FRESH_TRUSTED_MAIN_REPAIR_REQUIRED_AFTER_PR118`

PR #97's historical base `0564aecd...` trails trusted main `a22198bf...`.
Mergeability is volatile conflict metadata only and is never proof of architecture
reconciliation or security correctness. Once PR #119's transition repair is
trusted, start the smallest fresh runtime branch from then-current trusted main.

## `PR97_HISTORICAL_P1_THREADS_PENDING_VALIDATED_RESOLUTION`

Earlier unresolved P1 threads remain useful attack history but do not release a
later SHA. A final repaired exact head needs distinct independent validation
before applicable historical threads can be resolved without creating false-PASS
evidence.

## `PR93_TRUSTED_MAIN_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED`

PR #93 remains open and untrusted.

- exact live head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- historical base: `818718955c9e4136e9e55754a31be2f1c7b610f8`;
- current trusted main: `a22198bf8065cb7af2f4f7821edaba9c5f749704`;
- exact-head CI `32465835858` / CI 541: `success` but not release evidence;
- latest release-owner and distinct review evidence found in the PR record covers
  moved head `03e0201c9f...`, not current `c4e40ceb...`;
- unresolved current/non-outdated P1/P2 classes include exact negative-zero
  identity, typed-data wrapper normalization, generic-signature exact-value
  commitment, nested payload capture with saved reflection intrinsics, and shared
  proof canonicalization/SHA-256/hash hardening.

Moved-head fixes are not current release evidence. PR #93 overlaps shared
regression/package surfaces with the PR #97-line work. Keep it ordered after a
trusted fresh PR #97-line repair unless a separate reviewed dependency-ordering
decision is recorded. Then reconcile #93 from then-current trusted main, rerun
exact-head CI and owner review, obtain a fresh distinct exact-head independent
skeptical/security review, and require zero unresolved P0/P1/P2.

## `DAGR_SOURCE_DOCUMENT_MISSING`

Normative DAGR/profile work remains source-gated. Do not invent normative text,
controls, scores or claims without authorized source material.

## `PRODUCTION_TRUST_UNPROVED`

Reference components do not prove production issuer/operator authorization,
trusted time, KMS/HSM custody, distributed revocation/consensus, crash recovery,
external observer independence, external execution/effect truth or arbitrary
browser/provider integrity. No production-readiness claim may rely on the current
reference harness alone.

## `REAL_WALLET_NOT_AUTHORIZED`

No private key, seed, secret, funded-wallet credential, real/funded wallet,
mainnet transaction or meaningful funds are authorized. Burner local/testnet E2E
also remains behind a separate explicit human authorization gate.

## Current dependency rule

PR #97 and PR #93 are not trusted dependencies merely because their branches,
mergeability signals or CI exist. A dependency is trusted only after the full
five-stage pre-merge gate and all applicable exact-head gates pass, the PR merges,
and the exact merge receives `POST_MERGE_ASSURANCE_PASS`.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`:
local, deterministic, synthetic and bounded — not production readiness, audit,
certification, wallet safety, financial safety or deployment authorization.
