# POM-RX Core — Active Blockers

Updated: `2026-08-22T03:26:20+02:00`

Current trusted main: `89816f2bfcc97a77cd4cbc67cd3b2968800938fa`

This file lists **current** blockers only. Historical blockers remain in Git
history and must not be mistaken for current architecture. Live GitHub wins if a
PR head, review, CI run, review thread, mergeability signal or merge changes after
this checkpoint.

## Control-plane state

PR #111 source head `bea88015019e3ea2cf28abf8cdc0eea7006f611c`
merged as exact main SHA `89816f2bfcc97a77cd4cbc67cd3b2968800938fa`.
Source-head and merge trees are identical at
`e49008df989865b2b56b10e738d6b16571715daa`.

PR #111 release evidence:

- candidate CI run `32539681161` / CI 668: `success`;
- final release-owner gate: `PASS / NON-INDEPENDENT`, 0 P0/P1/P2;
- fresh distinct `chatgpt-codex-connector` exact-head review: no major issues;
- unresolved release threads: zero;
- canonical exact-main push CI run `32542680297` / CI 669 attempt 1: `success` on
  exact merge SHA;
- decision-time `pom-rx/exact-main-ci`: `success`, target run 669;
- recorded final exact-merge verdict: `POST_MERGE_ASSURANCE_PASS` across SpecKit,
  skeptical/falsification, security, code quality, optimization and
  integration/regression for the bounded documentation/control-plane scope.

PR #111 is trusted coordination evidence only. It changed no runtime/security
semantics and does not make PR #97 or PR #93 trusted.

The current post-PR #111 reconciliation is PR #112 on branch
`docs/pom-rx-checkpoint-after-111-20260822`, intentionally another bounded
non-Tier-B documentation/control-plane lot. A merged checkpoint cannot
self-describe its future merge SHA, so live GitHub remains authoritative for
PR #112's moving exact head, CI and review state until this scoped reconciliation
passes its own exact-head gates and exact-merge post-merge assurance.

## `CONTROL_PLANE_POST_PR111_RECONCILIATION_REQUIRED`

The canonical files merged by PR #111 checkpointed the state that existed before
that merge. Live trusted main is now `89816f2b...`; stale main/PR metadata must not
be used as readiness or dependency evidence until PR #112 is trusted. This is
coordination-only and does not invalidate PR #111's recorded post-merge PASS or
change runtime/security semantics.

PR #112 owns exactly four established continuation surfaces:

- `POM_RX_RESUME_CHECKPOINT.md`;
- `POM_RX_TASKS.yaml`;
- `POM_RX_BLOCKERS.md`;
- `docs/product/POM_RX_CAPABILITY_MAP.md`.

Do not merge PR #112 until the final exact head receives fresh canonical CI,
release-owner five-stage control, a genuinely distinct exact-head independent
review and zero unresolved P0/P1/P2. Any head move invalidates exact-head
release evidence.

## `PR97_EXACT_HEAD_P1_PROMISE_DRIFT_BEFORE_ASYNC_LAYERS`

PR #97 remains open and **must not merge**.

- exact head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- historical base: `0564aecd42cf0794894c12842980969ff59c9f73`;
- trusted main: `89816f2bfcc97a77cd4cbc67cd3b2968800938fa`;
- live GitHub at this checkpoint reports `mergeable=true`; volatile metadata only
  and never security/release evidence;
- exact-head CI run `32487036517` / CI 592: `success` but not security evidence;
- release-owner exact-head verdict: `BLOCK / NON-INDEPENDENT`;
- current exact-head distinct finding: P1 `Reject Promise drift before entering
  async layers`;
- the exact-head P1 thread remains unresolved and non-outdated;
- several earlier P1 threads remain unresolved pending a final repaired exact
  head and fresh independent validation.

The exact head is a test-only move from independently blocked parent
`639b96e7...`; provider/runtime implementation is unchanged and the regression
was relaxed. With inherited `Promise.prototype.constructor` plus `then`
poisoning, outer awaits in `readProviderSnapshot`,
`sampleStableProviderContext`, `sampleTrustedContext` and `request` can
assimilate rejected provider reads before the transport validator's failure
reaches its caller, substitute stable attacker-controlled context, then permit
reference authorization and sensitive forwarding.

Required closure:

- create the smallest runtime repair from then-current trusted main rather than
  merging/rebasing/reviving the stale historical branch wholesale;
- prevent hostile Promise-prototype dispatch before outer async assimilation;
- restore or replace a CI-wired regression reproducing the independent
  sensitive-forwarding exploit, without weakening zero-hostile-dispatch merely
  to make CI green;
- require the durable capability claim to succeed before any observer or
  downstream work so losing contenders cannot enter security-sensitive paths;
- preserve fail-closed replay, durable one-winner behavior, ordinary
  native-Promise Node/AsyncHooks bookkeeping-symbol compatibility, hardened
  direct non-Promise object/function capture, own native-Promise-decoration
  rejection, and zero authorization/forwarding for hostile rejected transports;
- rerun exact-head CI and release-owner six-lane review;
- obtain a fresh distinct exact-head independent skeptical/security review;
- resolve only findings whose repair is validated on that same exact head;
- require zero unresolved P0/P1/P2 before merge.

## `PR97_FALSE_PASS_GREEN_CI_32487036517`

CI 592 is green on `0efb462...`, but it is not release evidence for the Promise
drift property because runtime behavior remains unchanged and the current exact-
head independent P1 is unresolved. Green CI never overrides a concrete security
reproducer.

## `PR97_RELEASE_OWNER_BLOCK_EXACT_HEAD_0EFB462`

The release-owner exact-head verdict remains `BLOCK / NON-INDEPENDENT`. The
current stale head is not eligible for standing merge authorization.

## `PR97_FRESH_TRUSTED_MAIN_REPAIR_REQUIRED_AFTER_PR111`

PR #97's historical base `0564aecd...` trails trusted main `89816f2b...`.
`mergeable=true/false` is only GitHub conflict metadata and must never be promoted
to proof of architecture reconciliation or security correctness. After the
current post-PR111 control-plane checkpoint is trusted, the repair lot must start
fresh from then-current trusted main.

## `PR97_HISTORICAL_P1_THREADS_PENDING_VALIDATED_RESOLUTION`

Earlier unresolved P1 threads remain useful attack history but do not release a
later SHA. A final repaired exact head needs distinct independent validation
before applicable historical threads can be resolved without creating false-PASS
evidence.

## `PR93_TRUSTED_MAIN_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED`

PR #93 remains open and untrusted.

- exact head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- historical base: `818718955c9e4136e9e55754a31be2f1c7b610f8`;
- trusted main: `89816f2bfcc97a77cd4cbc67cd3b2968800938fa`;
- live GitHub at this checkpoint reports `mergeable=true`; volatile metadata only;
- exact-head CI run `32465835858` / CI 541: `success` but not release evidence;
- latest distinct review evidence found in the PR record covers moved head
  `03e0201c9f...`, not current `c4e40ceb...`;
- no fresh release-owner or distinct independent release review was found on the
  exact current head;
- unresolved current/non-outdated P1/P2 findings remain, including exact
  negative-zero identity, typed-data wrapper normalization, generic-signature
  exact-value commitment, **shared proof canonicalization/hash classes**, and
  nested payload capture with saved reflection intrinsics;
- the shared proof class includes recorded post-initialization canonicalization
  and SHA-256/hash hardening findings; moved-head repair comments are not a
  validated current-head resolution.

Moved-head fixes are not current release evidence. PR #93 overlaps shared
regression/package surfaces with PR #97. Keep it ordered after trusted #97
completion unless a separate reviewed dependency-ordering decision is recorded.
After that, reconcile #93 from then-current trusted main, rerun exact-head CI and
owner review, obtain a fresh distinct exact-head independent skeptical/security
review, and require zero unresolved P0/P1/P2.

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
