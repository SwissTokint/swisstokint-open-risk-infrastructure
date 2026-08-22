# POM-RX Core — Active Blockers

Updated: `2026-08-22T08:15:00+02:00`

Current trusted main: `aeb843012c5693088657eb80fc3f2ae0949723b0`

This file lists **current** blockers only. Historical blockers remain in Git
history and PR review threads. Live GitHub wins if a PR head, review, CI run,
review thread, mergeability signal or merge changes after this checkpoint.

## Trusted coordination state

PR #116 exact source head `60fa89cae63a70649b32c5b65c67f6d89ed27f1b`
merged as exact main SHA `aeb843012c5693088657eb80fc3f2ae0949723b0`.
Source-head and merge trees are identical at
`35e0ad4d90771c7df04493c769874c96f4552cc3`.

Release/post-merge evidence for PR #116:

- exact-head candidate CI `32554051879` / CI 694: `success`;
- final release-owner exact-head gate: review `4999286553`,
  `PASS / NON-INDEPENDENT`;
- distinct exact-head `chatgpt-codex-connector` issue comment `5378169346`:
  reviewed `60fa89cae6`, no major issues;
- canonical exact-main push CI `32556325264` / CI 695 attempt 1:
  `completed / success` on exact merge SHA;
- decision-time `pom-rx/exact-main-ci`: `success`, target CI 695;
- exact-merge SpecKit, skeptical/falsification, security, code quality,
  optimization and integration/regression: PASS for the bounded docs/control-
  plane scope;
- final exact-merge verdict: `POST_MERGE_ASSURANCE_PASS`, issue comment
  `5378389794`.

PR #116 is trusted coordination evidence only. It changed no runtime/security
semantics and does not make PR #97 or PR #93 trusted.

## `CONTROL_PLANE_POST_PR116_RECONCILIATION_REQUIRED`

The four canonical files merged by PR #116 necessarily describe the pre-merge
state. A smallest bounded non-Tier-B reconciliation now exists from exact trusted
main `aeb843012...` on branch:

`docs/pom-rx-checkpoint-after-116-20260822`

Owned surfaces are exactly:

- `POM_RX_RESUME_CHECKPOINT.md`;
- `POM_RX_TASKS.yaml`;
- `POM_RX_BLOCKERS.md`;
- `docs/product/POM_RX_CAPABILITY_MAP.md`.

To avoid duplicate pull requests, these canonical files do not self-embed a
future PR number or moving candidate head. Inspect live GitHub for an open PR
whose exact head branch is the branch above and create one only if none exists.
Read its final exact head, CI, reviews and threads live after the final owned-file
commit.

No Tier-B dependency/readiness claim may rely on stale embedded pre-PR116 state.
The reconciliation remains coordination-only and must pass fresh exact-head CI,
release-owner five-stage control, a genuinely distinct exact-head independent
review and zero unresolved P0/P1/P2 before merge. Any head move invalidates
exact-head release evidence. After merge, exact-merge post-merge assurance is
mandatory before the merge becomes trusted coordination evidence.

## `PR97_EXACT_HEAD_P1_PROMISE_DRIFT_BEFORE_ASYNC_LAYERS`

PR #97 remains open and **must not merge**.

- exact live head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- historical base: `0564aecd42cf0794894c12842980969ff59c9f73`;
- current trusted main: `aeb843012c5693088657eb80fc3f2ae0949723b0`;
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
  Promise object/function capture, own native-Promise-decoration rejection, and
  **zero authorization/forwarding for hostile rejected transports**;
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

## `PR97_FRESH_TRUSTED_MAIN_REPAIR_REQUIRED_AFTER_PR116`

PR #97's historical base `0564aecd...` trails trusted main `aeb843012...`.
Mergeability is volatile conflict metadata only and is never proof of architecture
reconciliation or security correctness. After the post-PR116 control-plane
reconciliation is safely recorded, the repair must start fresh from then-current
trusted main.

## `PR97_HISTORICAL_P1_THREADS_PENDING_VALIDATED_RESOLUTION`

Earlier unresolved P1 threads remain useful attack history but do not release a
later SHA. A final repaired exact head needs distinct independent validation
before applicable historical threads can be resolved without creating false-PASS
evidence.

## `PR93_TRUSTED_MAIN_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED`

PR #93 remains open and untrusted.

- exact live head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- historical base: `818718955c9e4136e9e55754a31be2f1c7b610f8`;
- current trusted main: `aeb843012c5693088657eb80fc3f2ae0949723b0`;
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
