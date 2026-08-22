# POM-RX Core — Active Blockers

Updated: `2026-08-22T18:18:00+02:00`

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

## `PR120_FINAL_EXACT_HEAD_CI_REQUIRED_AFTER_CONTROL_PLANE_RECONCILIATION`

Fresh PR #120 is the active Tier-B Promise-drift/provider-boundary prerequisite
repair from exact trusted main `e5aead...`.

Before this same-PR control-plane reconciliation, repaired exact head
`9b52474a2def9df2c75649eda4b81a0ca128658a` passed canonical CI run
`32584166269` / CI 739. The control-plane updates intentionally move the head, so
CI 739 is historical and cannot release the final frozen candidate. Read the
live final PR head after the last owned-file commit and require canonical CI
success on that same SHA.

## `PR120_REJECTED_INVALID_PROMISE_DRAIN_P1_REQUIRES_FRESH_EXACT_HEAD_INDEPENDENT_VALIDATION`

A genuinely distinct `chatgpt-codex-connector` review on moved head
`5885da291d7d6b3e4541e5c00c160ffb481828b8` found P1 on thread
`PRRT_kwDOTiNyWc6bZjxp`: when a provider returned a rejected native Promise with
own string metadata or a non-standard prototype, structural validation could
fail before a rejection reaction was attached. The caller could catch the
expected Wallet Guard validation error while Node later terminated under strict
unhandled-rejection behavior because the provider rejection was orphaned.

The moved-head repair calls the captured-intrinsic drain/pinning boundary before
structural failure and adds `provider-invalid-rejected-transport.node.test.mjs`,
which exercises own-metadata and non-standard-prototype rejected transports in a
child process using `--unhandled-rejections=strict`. Required result remains a
fail-closed Wallet Guard context error, zero authorization, zero continued account
sampling and zero sensitive forwarding.

The historical P1 thread remains unresolved. Do not resolve it until a fresh
genuinely distinct review validates the **final exact candidate head**. The fresh
skeptic must also challenge rejected non-extensible/non-configurable Promise
variants and any path where the drain can fail before attaching a rejection
reaction or dispatch attacker-controlled code.

## `PR120_RELEASE_OWNER_FIVE_STAGE_GATE_REQUIRED_ON_FINAL_EXACT_HEAD`

Owner review on older PR #120 heads is stale after the repair/control-plane
moves. The mandatory five-stage pre-merge gate must be re-run on the final frozen
exact head. Release-owner/self evidence is explicitly non-independent and cannot
substitute for the distinct skeptical/release lane.

## `PR120_ZERO_UNRESOLVED_P0_P1_P2_NOT_YET_ESTABLISHED`

PR #120 remains blocked until exact-head CI, owner review and a genuinely distinct
exact-head skeptical/security review establish zero unresolved P0/P1/P2. The
applicable attack families include:

1. inherited `Promise.prototype.constructor` + `then` substitution before outer
   async rejection is observed;
2. own-decorated and structurally invalid rejected native Promise transport
   handling, including process-level unhandled rejection behavior;
3. synchronous Proxy/callable thenable dispatch before inert capture;
4. post-import intrinsic/Array-prototype weakening of shared plain-data capture;
5. scalar policy-list false-PASS and inherited Array-index substitution through
   the Wallet Guard compatibility bridge;
6. any failure path reaching reference authorization or sensitive forwarding;
7. any accidental claim/import of the still-untrusted durable Gate composition.

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
Promise/provider-boundary prerequisite only. Durable composition must be
reconstructed as a separately bounded Tier-B lot after PR #120 is trusted,
preserving fail-closed replay and durable one-winner behavior.

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
