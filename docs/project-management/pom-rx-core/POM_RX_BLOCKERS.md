# POM-RX Core — Active Blockers

Updated: `2026-08-22T20:30:00+02:00`

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
merge assurance is `POST_MERGE_ASSURANCE_PASS` in PR #119 comment `5380609307`.
PR #119 is terminal control-plane transition evidence; do not create another
docs-only successor.

## `PR120_FOLLOWUP_PROMISE_DRAIN_P1_REPAIRED_PENDING_EXACT_HEAD_VALIDATION`

PR #120 is **OPEN / NOT TRUSTED / NOT MERGEABLE BY POLICY**. The current
follow-up implementation addresses the latest exact-head rejected-Promise P1,
but implementation is not release evidence.

Historical distinct Codex reviews opened:

- P1 `PRRT_kwDOTiNyWc6bZjxp`: structurally invalid rejected native Promises could
  fail validation before any rejection reaction was attached;
- P1 `PRRT_kwDOTiNyWc6bZ6tx`: the first drain repair still performed a fallible
  own-`constructor` mutation before attaching the reaction;
- P2 `PRRT_kwDOTiNyWc6bZ6tz`: the strict rejected-transport regression was not
  reached by canonical `npm test`;
- exact-head P1 `PRRT_kwDOTiNyWc6baFkR` on
  `738e807e19fc0b2b4daf53eb4102ae1449f4aae9`: a rejected same-realm native
  Promise that is both non-extensible and given a nonstandard prototype could
  still reach fallback constructor shadowing before a rejection reaction was
  attached.

Follow-up runtime commit `52225ae28d85afb4d6e4280d560f10098f19c935`
now classifies the effective constructor path by a bounded prototype-chain walk
using captured `getOwnPropertyDescriptor`, captured `getPrototypeOf` and captured
`util.types.isProxy`. The drain accepts only paths whose first effective
`constructor` is data-only `undefined` or the captured native `Promise` with
intact species semantics, or whose lookup terminates at `null`. This allows the
captured native rejection reaction to attach without a preceding mutation for
the supported non-extensible/nonstandard-prototype classes.

Proxy prototypes and constructor accessors are not executed merely to drain.
Unsafe configurable paths may still be shadowed with an own `undefined`
constructor; non-shadowable hostile accessor/Proxy paths remain explicitly
outside the gateway-owned strict-unhandled-rejection drain guarantee.

Strict regression commit `a7bf527e8766b74e2717d7fd26a45add87a0958c`
keeps all previous cases and adds both:

- exact `Object.setPrototypeOf(p, null)` + `Object.preventExtensions(p)` rejected
  transport;
- non-extensible rejected transport with a benign alternate prototype carrying a
  native data `constructor: Promise`.

The strict child still requires zero reference authorization, zero account
continuation, zero sensitive forwarding and zero hostile constructor-getter
execution. The historical/current P1/P2 threads remain unresolved until a fresh
exact-head distinct review validates the final candidate.

## `PR120_CAPABILITY_MAP_P1_REPAIRED_PENDING_EXACT_HEAD_VALIDATION`

Canonical CI run `32586321394` / CI 760 failed on historical head
`738e807e19fc0b2b4daf53eb4102ae1449f4aae9` because the branch capability map
lost the repository-tested Wallet Guard positioning invariant. That red run is
historical evidence and must not be reused as success.

P1 thread `PRRT_kwDOTiNyWc6baIxZ` tracks the same control-plane defect. Commit
`27becec03b853428464799f610d283fa44f689f2` restores the tested statement that
Wallet Guard's primary product home is **Blockchain and digital assets**, while
its defensive control model also overlaps Cybersecurity. The test is not weakened.
The thread remains unresolved pending fresh exact-head CI/review.

## `PR120_CI_WIRING_P2_PENDING_EXACT_HEAD_VALIDATION`

P2 `PRRT_kwDOTiNyWc6bZ6tz` remains historically relevant. `package.json` includes
`tests/wallet-guard/provider-invalid-rejected-transport.node.test.mjs` in
`test:pom-rx:wallet-guard-provider-gate`, which is part of full `npm test`. The
implementation defect is repaired, but closure requires the final frozen head to
show green canonical CI actually executing the suite plus fresh distinct review.

## `PR120_FINAL_EXACT_HEAD_GATES_REQUIRED`

The Prime lane is the **single implementation writer** for the current follow-up
repair. The earlier Codex-writer routing was superseded before any Codex-authored
commit so that `chatgpt-codex-connector` can remain a genuinely distinct,
read-only independent reviewer of the resulting candidate.

PR #120 cannot merge until one frozen exact head has all of the following:

- canonical exact-head CI `success`, including the strict rejected-Promise and
  capability-map tests;
- release-owner mandatory five-stage PASS on that exact head;
- a fresh genuinely distinct **read-only** `chatgpt-codex-connector`
  skeptical/security review on the same exact head;
- zero unresolved P0/P1/P2, including valid closure of
  `PRRT_kwDOTiNyWc6bZjxp`, `PRRT_kwDOTiNyWc6bZ6tx`,
  `PRRT_kwDOTiNyWc6bZ6tz`, `PRRT_kwDOTiNyWc6baFkR` and
  `PRRT_kwDOTiNyWc6baIxZ`.

Any head move invalidates exact-head CI/review evidence. The independent-review
waiver remains PR #60 only.

## `PR97_STALE_HISTORICAL_BRANCH_MUST_NOT_MERGE`

Historical PR #97 remains open and **must not merge**.

- exact live head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- historical base: `0564aecd42cf0794894c12842980969ff59c9f73`;
- exact-head CI 592: `success` but not security evidence;
- release-owner verdict: `BLOCK / NON-INDEPENDENT`.

PR #120 supersedes only the Promise-boundary repair through a fresh trusted-main
implementation; PR #97 must not be revived, rebased or merged wholesale.

## `CORE_DURABLE_GATE_COMPOSITION_NOT_YET_TRUSTED`

Trusted main still has a process-local single-use Gate and a **separate**
filesystem durable claim primitive. Reviewed durable claim-before-observer/
downstream composition is not trusted. Reconstruct it as a separate bounded
Tier-B lot only after PR #120 is trusted.

## `PR93_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED_AFTER_PR120`

PR #93 remains open/untrusted at
`c4e40ceb286f4e59657767661daed15d2b68e9a7`; historical CI 541 is not release
evidence and unresolved P1/P2 classes remain. Keep it ordered after trusted PR
#120 and required shared-Core work unless a separately reviewed dependency
change is recorded.

## `DAGR_SOURCE_DOCUMENT_MISSING`

Normative DAGR/profile work remains source-gated. Do not invent normative text,
controls, scores or claims without authorized source material.

## `PRODUCTION_TRUST_UNPROVED`

Production issuer/operator authorization, trusted time, KMS/HSM custody,
distributed revocation/consensus, crash recovery, external observer independence,
external execution/effect truth and arbitrary browser/provider integrity remain
unproved.

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
