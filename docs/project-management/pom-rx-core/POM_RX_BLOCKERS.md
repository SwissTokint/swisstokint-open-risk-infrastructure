# POM-RX Core — Active Blockers

Updated: `2026-08-22T06:17:24+02:00`

Current trusted main: `ecc25e3e3f2991482e925fbe307058a91276c0bc`

This file lists **current** blockers only. Historical blockers remain in Git
history and PR review threads. Live GitHub wins if a PR head, review, CI run,
review thread, mergeability signal or merge changes after this checkpoint.

## Trusted coordination state

PR #113 source head `f28bea5bdddce9413b7bfc882999d8b9fab1196e`
merged as exact main SHA `ecc25e3e3f2991482e925fbe307058a91276c0bc`.
Source-head and merge trees are identical at
`0fdaa90c0355cf741ca7af81b485cd6da806b22a`.

Release/post-merge evidence for PR #113:

- exact-head candidate CI `32545840351` / CI 676: `success`;
- final release-owner five-stage gate: `PASS / NON-INDEPENDENT`, 0 owner
  P0/P1/P2;
- distinct exact-head `chatgpt-codex-connector` evidence in issue comment
  `5377337358`: reviewed `f28bea5bdd`, no major issues;
- unresolved release threads at merge: zero;
- canonical exact-main push CI `32548199260` / CI 677 attempt 1:
  `completed / success` on exact merge SHA;
- decision-time `pom-rx/exact-main-ci`: `success`, target run 677;
- exact-merge SpecKit, skeptical/falsification, security, code quality,
  optimization and integration/regression: PASS for the bounded docs/control-
  plane scope;
- final exact-merge verdict: `POST_MERGE_ASSURANCE_PASS`.

PR #113 is trusted coordination evidence only. It changed no runtime/security
semantics and does not make PR #97 or PR #93 trusted.

## `CONTROL_PLANE_POST_PR113_RECONCILIATION_REQUIRED`

PR #114 on branch `docs/pom-rx-checkpoint-after-113-20260822` is the smallest
bounded non-Tier-B reconciliation from trusted main `ecc25e3...`. It exists
because the four canonical files merged by PR #113 necessarily described the
pre-merge state.

Owned surfaces are exactly:

- `POM_RX_RESUME_CHECKPOINT.md`;
- `POM_RX_TASKS.yaml`;
- `POM_RX_BLOCKERS.md`;
- `docs/product/POM_RX_CAPABILITY_MAP.md`.

At PR creation the head was `b98f9c0e80e25c4203784b99cc99061bba5ac6d5`
and CI 678 (`32551305996`) entered the queue. Later checkpoint reconciliation
commits moved the head, so creation-time exact-head evidence is stale by rule.
Read PR #114 live for the final exact head and its fresh CI/review evidence.

No Tier-B dependency/readiness claim should rely on stale embedded pre-PR113
state. PR #114 must pass fresh exact-head CI, release-owner five-stage control, a
genuinely distinct exact-head independent review and zero unresolved P0/P1/P2
before merge. Any head move invalidates exact-head release evidence. After merge,
exact-merge post-merge assurance is mandatory before the new merge becomes
trusted coordination evidence.

## `PR97_EXACT_HEAD_P1_PROMISE_DRIFT_BEFORE_ASYNC_LAYERS`

PR #97 remains open and **must not merge**.

- exact head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- historical base: `0564aecd42cf0794894c12842980969ff59c9f73`;
- trusted main: `ecc25e3e3f2991482e925fbe307058a91276c0bc`;
- exact-head CI `32487036517` / CI 592: `success` but not security evidence;
- release-owner exact-head verdict: `BLOCK / NON-INDEPENDENT`;
- current exact-head distinct finding: P1 `Reject Promise drift before entering
  async layers`;
- the current exact-head P1 and applicable historical P1 threads remain
  unresolved.

The exact head is a test-only move from independently blocked parent
`639b96e7...`; provider/runtime implementation is not repaired and the regression
was relaxed. With inherited `Promise.prototype.constructor` plus `then`
poisoning, outer awaits in `readProviderSnapshot`, `sampleStableProviderContext`,
`sampleTrustedContext` and `request` can assimilate rejected provider reads before
the transport validator failure reaches its caller, substitute stable attacker-
controlled context, then permit reference authorization and sensitive forwarding.

Required closure:

- start the smallest runtime repair from then-current trusted main rather than
  merging/rebasing/reviving the stale historical branch wholesale;
- prevent hostile Promise-prototype dispatch before outer async assimilation;
- restore or replace a CI-wired regression reproducing the independent sensitive-
  forwarding exploit without weakening hostile-dispatch expectations merely to
  make CI green;
- require durable capability claim success before any observer or downstream work
  so losing contenders cannot enter security-sensitive paths;
- preserve fail-closed replay, durable one-winner behavior, ordinary native-
  Promise Node/AsyncHooks bookkeeping-symbol compatibility, hardened direct non-
  Promise object/function capture and own native-Promise-decoration rejection;
- rerun exact-head CI and release-owner six-lane review;
- obtain a fresh distinct exact-head independent skeptical/security review;
- resolve only findings whose repair is validated on that same exact head;
- require zero unresolved P0/P1/P2 before merge.

## `PR97_FALSE_PASS_GREEN_CI_32487036517`

CI 592 is green on `0efb462...`, but it is not release evidence for the Promise
drift property because runtime behavior remains vulnerable and the exact-head
independent P1 is unresolved. Green CI never overrides a concrete security
reproducer.

## `PR97_RELEASE_OWNER_BLOCK_EXACT_HEAD_0EFB462`

The release-owner exact-head verdict remains `BLOCK / NON-INDEPENDENT`. The stale
head is not eligible for standing merge authorization.

## `PR97_FRESH_TRUSTED_MAIN_REPAIR_REQUIRED_AFTER_PR113`

PR #97's historical base `0564aecd...` trails trusted main `ecc25e3...`.
Mergeability is volatile conflict metadata only and is never proof of architecture
reconciliation or security correctness. After PR #114 is trusted, the repair
must start fresh from then-current trusted main.

## `PR97_HISTORICAL_P1_THREADS_PENDING_VALIDATED_RESOLUTION`

Earlier unresolved P1 threads remain useful attack history but do not release a
later SHA. A final repaired exact head needs distinct independent validation
before applicable historical threads can be resolved without creating false-PASS
evidence.

## `PR93_TRUSTED_MAIN_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED`

PR #93 remains open and untrusted.

- exact head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- historical base: `818718955c9e4136e9e55754a31be2f1c7b610f8`;
- trusted main: `ecc25e3e3f2991482e925fbe307058a91276c0bc`;
- exact-head CI `32465835858` / CI 541: `success` but not release evidence;
- latest release-owner and distinct review evidence found in the PR record covers
  moved head `03e0201c9f...`, not current `c4e40ceb...`;
- unresolved current/non-outdated P1/P2 classes include exact negative-zero
  identity, typed-data wrapper normalization, generic-signature exact-value
  commitment, nested payload capture with saved reflection intrinsics, and shared
  proof canonicalization/SHA-256/hash hardening.

Moved-head fixes are not current release evidence. PR #93 overlaps shared
regression/package surfaces with PR #97. Keep it ordered after trusted #97 unless
a separate reviewed dependency-ordering decision is recorded. Then reconcile
#93 from then-current trusted main, rerun exact-head CI and owner review, obtain a
fresh distinct exact-head independent skeptical/security review, and require zero
unresolved P0/P1/P2.

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
