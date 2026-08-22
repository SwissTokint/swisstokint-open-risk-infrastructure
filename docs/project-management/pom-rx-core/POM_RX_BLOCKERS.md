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

## `PR120_P1_NONEXTENSIBLE_DECORATED_REJECTED_PROMISE_CAN_ORPHAN_REJECTION_BEFORE_DRAIN`

PR #120 remains **BLOCKED**.

The genuinely distinct Codex review on moved head
`5885da291d7d6b3e4541e5c00c160ffb481828b8` found P1 thread
`PRRT_kwDOTiNyWc6bZjxp`: structurally invalid rejected native Promises must be
drained before the gateway returns its validation failure or Node can terminate
on an orphaned rejection.

The first repair correctly added a drain before structural failure and strict-
unhandled-rejection tests for an extensible Promise with own metadata and an
extensible non-standard prototype. Pre-control-plane repair head
`9b52474a2def9df2c75649eda4b81a0ca128658a` passed CI run `32584166269` /
CI 739.

Release-owner/adversarial review `5000574562` on exact moved head
`b7576f8e94b3379c7427a51e4113960f396ac7e8` then found a remaining P1 variant:
`drainPromiseTransportBeforeIntegrityFailure()` attempts to define an own
`constructor` before it attaches the captured rejection reaction. A rejected
same-realm native Promise with benign own metadata followed by
`Object.preventExtensions()` makes that `defineProperty` fail before the
reaction exists. The caller can catch the Wallet Guard context error, while
`node --unhandled-rejections=strict` still exits on the orphaned provider
rejection. A direct Node 22.16 reproducer confirmed the primitive and exit 1.

Required closure:

- add a CI-wired strict-unhandled-rejection regression for the non-extensible
  own-metadata rejected Promise;
- change the drain order/strategy so every structurally invalid transport class
  the gateway claims to drain receives a safe rejection reaction before failure;
- make an explicit safe design/evidence decision for own non-configurable or
  otherwise non-shadowable `constructor`/`then` cases without executing hostile
  accessors;
- preserve zero reference authorization and zero sensitive forwarding;
- rerun exact-head CI, release-owner five-stage review and a **new** genuinely
  distinct exact-head skeptical/security review after the runtime repair;
- resolve `PRRT_kwDOTiNyWc6bZjxp` only after that fresh exact-head independent
  validation establishes zero unresolved P0/P1/P2.

This control-plane reconciliation moves the head, so review `5000574562`, CI 739
and Codex request comment `5381422260` are historical only as release evidence.
The P1 itself remains active until runtime code and regression evidence change.

## `PR120_FINAL_EXACT_HEAD_GATES_REQUIRED_AFTER_RUNTIME_REPAIR`

After repairing the P1 above, freeze the resulting exact head and require:

1. canonical exact-head CI success with all Promise-drift, invalid rejected-
   transport, plain-data, scalar-list and Array-index substitution regressions;
2. mandatory five-stage release-owner PASS on that same head;
3. a fresh genuinely distinct exact-head `chatgpt-codex-connector` skeptical/
   security review;
4. zero unresolved P0/P1/P2, including validated resolution of
   `PRRT_kwDOTiNyWc6bZjxp`.

Any head move invalidates that evidence.

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
