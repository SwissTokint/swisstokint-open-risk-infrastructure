# POM-RX Core — Active Blockers

Updated: `2026-08-22T16:07:45+02:00`

Current trusted main: `e5aead150a2ed5f390593cc2d9d307defdd79bdc`

This file lists **current** blockers only. Historical blockers remain in Git
history and PR review threads. Live GitHub wins if a PR head, review, CI run,
review thread, mergeability signal or merge changes after this checkpoint.

## Trusted coordination state

PR #119 exact source head `057b225783b24c97568dbcd733ca4c821f889c7a`
merged as exact main SHA `e5aead150a2ed5f390593cc2d9d307defdd79bdc`.
Its frozen exact-head CI passed, release-owner gate passed non-independently, a
distinct exact-head `chatgpt-codex-connector` review reported no major issues,
and exact-main push CI `32575110984` / CI 720 passed on the merge SHA. Exact-
merge SpecKit, skeptical/falsification, security, code-quality, optimization and
integration/regression assurance is recorded as `POST_MERGE_ASSURANCE_PASS` in PR
#119 issue comment `5380609307`.

PR #119 is terminal control-plane transition evidence. Do not create another
docs-only successor.

## `PR120_EXACT_HEAD_CI_PENDING`

Fresh PR #120 is the active Tier-B Promise-drift boundary repair.

- branch: `automation/pom-rx-promise-drift-repair-20260822`;
- exact trusted base: `e5aead150a2ed5f390593cc2d9d307defdd79bdc`;
- first implementation commit: `f31611139e51cf0f05265c19012e372e06bfc7ae`;
- state: `OPEN / DRAFT / IN_PROGRESS / NOT_TRUSTED`;
- final exact head: read live after the last owned-file commit; it is recorded in
  the PR conversation rather than self-embedded in moving control-plane files;
- canonical exact-head CI: pending until the final head is frozen.

No merge decision may use CI from an earlier PR #120 head.

## `PR120_RELEASE_OWNER_FIVE_STAGE_GATE_PENDING`

The mandatory five-stage pre-merge gate has not yet passed on the final frozen PR
#120 head. Required lanes include SpecKit/architecture reconciliation,
skeptical/falsification, security, code-quality/optimization and integration/
regression. Release-owner/self evidence is non-independent.

## `PR120_DISTINCT_EXACT_HEAD_INDEPENDENT_REVIEW_PENDING`

A fresh genuinely distinct exact-head skeptical/security review is required after
the final PR #120 head is frozen and canonical CI is available. A
`chatgpt-codex-connector` review counts only if it actually reviews that exact SHA
and leaves zero unresolved P0/P1/P2. Any head move invalidates it.

## `PR120_ZERO_UNRESOLVED_P0_P1_P2_NOT_YET_ESTABLISHED`

The active repair must remain blocked until live review threads on the exact
candidate establish zero unresolved P0/P1/P2. Historical thread resolution from
PR #97 is not independent release evidence for PR #120.

The three mandatory falsification hypotheses are:

1. inherited `Promise.prototype.constructor` + `then` poisoning can turn rejected
   context reads into attacker-selected chain/account values and reach reference
   authorization plus sensitive forwarding;
2. own native-Promise `constructor`/`then` accessors can execute during
   assimilation;
3. synchronous Array/Object/callable Proxies can execute `then` or reflection
   traps before the shared inert-data capture boundary.

Closure requires CI-wired negative evidence with zero authorization and zero
sensitive forwarding for hostile rejected context transports, plus compatibility
for ordinary synchronous/native-Promise context and own-symbol Promise metadata.

## `PR97_STALE_HISTORICAL_BRANCH_MUST_NOT_MERGE`

Historical PR #97 remains open and **must not merge**.

- exact live head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- historical base: `0564aecd42cf0794894c12842980969ff59c9f73`;
- exact-head CI `32487036517` / CI 592: `success` but not security evidence;
- release-owner exact-head verdict: `BLOCK / NON-INDEPENDENT`;
- exact-head P1: `Reject Promise drift before entering async layers`.

Its green CI is a false PASS for the security property. PR #120 supersedes the
Promise-boundary repair through a fresh trusted-main implementation; PR #97 must
not be revived, rebased or merged wholesale.

## `CORE_DURABLE_GATE_COMPOSITION_NOT_YET_TRUSTED`

Trusted main still has a process-local single-use Gate and a **separate**
filesystem durable claim primitive. A reviewed durable claim-before-observer/
downstream Gate composition is not trusted yet. PR #120 intentionally closes the
Promise-boundary prerequisite only. Durable composition must be reconstructed as
a separately bounded Tier-B lot after PR #120 is trusted, preserving fail-closed
replay and durable one-winner behavior.

## `PR93_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED_AFTER_PR120`

PR #93 remains open and untrusted.

- exact live head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- historical base: `818718955c9e4136e9e55754a31be2f1c7b610f8`;
- exact-head CI `32465835858` / CI 541: `success` but not release evidence;
- latest release-owner/distinct evidence is stale on moved head `03e0201c9f...`;
- unresolved current/non-outdated P1/P2 classes include exact negative-zero
  identity, typed-data wrapper normalization, generic-signature exact-value
  commitment, nested saved-reflection capture and shared proof
  canonicalization/SHA-256/hash hardening.

Keep PR #93 ordered after trusted PR #120 and the required shared-Core dependency
work unless a separately reviewed dependency decision changes that order.

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

A dependency becomes trusted only after the mandatory five-stage pre-merge gate,
all applicable exact-head technical/security gates, canonical exact-head CI, the
required genuinely distinct exact-head independent review, zero unresolved
P0/P1/P2, merge, exact-main CI and exact-merge
`POST_MERGE_ASSURANCE_PASS`.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`:
local, deterministic, synthetic and bounded — not production readiness, audit,
certification, wallet safety, financial safety or deployment authorization.
