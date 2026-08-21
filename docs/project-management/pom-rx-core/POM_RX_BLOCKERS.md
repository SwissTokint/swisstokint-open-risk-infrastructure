# POM-RX Core — Active Blockers

Updated: `2026-08-21T23:07:54+02:00`

Current trusted main: `cfbfd81f81375da1a75802f193af37119b11e5a2`

This file lists **current** blockers only. Historical blockers remain in Git
history and must not be mistaken for current architecture. Live GitHub wins if a
PR head, review, CI run, review thread, mergeability signal or merge changes after
this checkpoint.

## Control-plane state

PR #108 source head `684ced52d664f3056a6cf2c19e5e793ef198aa1a`
merged as exact main SHA `cfbfd81f81375da1a75802f193af37119b11e5a2`.
Source-head and merge trees are identical at
`800c55bc7535238965f0e67fecbc8e1c2b99023f`. Candidate CI run
`32524074023` / CI 646 succeeded. Canonical exact-main push CI run
`32524385073` / CI 647 attempt 1 succeeded on the exact merge SHA, and the
recorded decision-time `pom-rx/exact-main-ci` status was `success` targeting that
run. PR #108 records `POST_MERGE_ASSURANCE_PASS` for its bounded
documentation/control-plane scope across SpecKit, skeptical/falsification,
security, code quality, optimization and integration/regression. It is trusted
coordination evidence only and changes no runtime/security semantics.

The current post-PR #108 reconciliation is intentionally another bounded
non-Tier-B documentation/control-plane lot on branch
`docs/pom-rx-checkpoint-after-108-20260821`. It exists only because a merged
checkpoint cannot self-describe its future merge SHA. Until this new lot passes
its own exact-head gates and exact-merge post-merge assurance, live GitHub remains
authoritative for all state that moved after PR #108.

## `CONTROL_PLANE_POST_PR108_RECONCILIATION_REQUIRED`

The canonical files merged by PR #108 checkpoint the state that existed before
that merge. Live trusted main is now `cfbfd81f...`, so stale main/PR metadata must
not be used as readiness or dependency evidence until this scoped reconciliation
is trusted. This blocker is coordination-only; it does not invalidate PR #108's
recorded post-merge PASS or change runtime/security semantics.

## `PR97_EXACT_HEAD_P1_PROMISE_DRIFT_BEFORE_ASYNC_LAYERS`

PR #97 remains open and **must not merge**.

- exact head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- historical PR base: `0564aecd42cf0794894c12842980969ff59c9f73`;
- trusted main: `cfbfd81f81375da1a75802f193af37119b11e5a2`;
- live GitHub revalidation in this cycle reports `mergeable=true`; volatile metadata only and never security/release evidence;
- exact-head CI run `32487036517` / CI 592: `success`;
- release-owner exact-head verdict: `BLOCK / NON-INDEPENDENT`;
- fresh distinct exact-head finding: P1 `Reject Promise drift before entering async layers`;
- the exact-head P1 thread remains unresolved and non-outdated.

The exact head is a test-only move from independently blocked parent
`639b96e7...`; the provider/runtime implementation is unchanged. The changed test
relaxes the prototype-drift assertion and therefore cannot establish that the
independent exploit was repaired. With inherited `Promise.prototype.constructor`
and `then` poisoning, outer awaits in `readProviderSnapshot`,
`sampleStableProviderContext`, `sampleTrustedContext` and `request` can assimilate
rejected provider reads before the transport validator's failure reaches the
caller, substitute stable attacker-controlled context, then permit reference
authorization and sensitive forwarding.

Required closure:

- create the smallest runtime repair from the then-current trusted main rather
  than merging/rebasing the stale historical branch wholesale;
- prevent hostile Promise-prototype dispatch before outer async assimilation;
- restore or replace a CI-wired regression that reproduces the independent
  sensitive-forwarding exploit and does not weaken the zero-hostile-dispatch
  property merely to make CI green;
- require the durable capability claim to succeed before any observer or
  downstream work so losing contenders cannot enter security-sensitive paths;
- preserve fail-closed replay, durable one-winner behavior, ordinary
  native-Promise Node/AsyncHooks bookkeeping-symbol compatibility, direct
  non-Promise object/function hardened capture, own native-Promise-decoration
  rejection, and zero authorization/forwarding for hostile rejected transports;
- rerun exact-head CI and release-owner six-lane review;
- obtain a fresh distinct exact-head independent skeptical/security review;
- resolve only review findings whose repair is validated on that same exact head;
- require zero unresolved P0/P1/P2 before merge.

## `PR97_FALSE_PASS_GREEN_CI_32487036517`

CI 592 is green on `0efb462...`, but it is not release evidence for the Promise
drift property because the current head does not repair runtime behavior and the
exact-head independent P1 remains open. Green CI never overrides a concrete
security reproducer.

## `PR97_TRUSTED_MAIN_RECONCILIATION_REQUIRED_AFTER_PR108`

PR #97's historical base `0564aecd...` trails trusted main `cfbfd81f...`.
`mergeable=true/false` is only GitHub conflict metadata and must never be promoted
to proof of architecture reconciliation or security correctness. The repair lot
must start from then-current trusted main after the current control-plane lot is
trusted.

## `PR97_HISTORICAL_P1_THREADS_PENDING_VALIDATED_RESOLUTION`

Several earlier P1 threads remain intentionally unresolved. Moved-head repair
comments are useful history but do not release a later candidate. A final repaired
exact head needs distinct independent validation before those threads can be
resolved without creating false-PASS evidence.

## `PR93_TRUSTED_MAIN_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED`

PR #93 remains open and untrusted.

- exact head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- historical base: `818718955c9e4136e9e55754a31be2f1c7b610f8`;
- trusted main: `cfbfd81f81375da1a75802f193af37119b11e5a2`;
- live GitHub revalidation in this cycle reports `mergeable=true`; volatile metadata only and never release evidence;
- exact-head CI run `32465835858` / CI 541: `success`;
- latest distinct Codex review found in the PR record covers moved head
  `03e0201c9f...`, not current `c4e40ceb...`;
- no fresh release-owner or distinct independent review was found on exact current
  head `c4e40ceb...`;
- unresolved current/non-outdated P1/P2 review threads remain, including exact
  negative-zero identity, typed-data wrapper normalization, generic-signature
  exact-value commitments, shared proof canonicalization/hash classes and nested
  payload capture with saved reflection intrinsics.

Moved-head fixes are not current release evidence. PR #93 overlaps shared
regression/package surfaces with PR #97. Keep it ordered after trusted #97
completion unless a separate reviewed dependency-ordering decision is recorded.
After that, reconcile #93 from then-current trusted main, rerun exact-head CI and
owner review, obtain a fresh distinct exact-head independent skeptical/security
review, and require zero unresolved P0/P1/P2.

## `DAGR_SOURCE_DOCUMENT_MISSING`

Normative DAGR/profile work remains source-gated. Do not invent normative text,
controls, scores or claims without the authorized source material.

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
