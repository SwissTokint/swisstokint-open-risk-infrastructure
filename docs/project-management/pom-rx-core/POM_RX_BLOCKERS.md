# POM-RX Core — Active Blockers

Updated: `2026-08-22T19:03:00+02:00`

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

## `PR120_RUNTIME_DRAIN_REPAIR_PENDING_EXACT_HEAD_VALIDATION`

The previously confirmed Tier-B rejected-Promise drain P1 is now **implemented
but not trusted** on PR #120.

Distinct Codex review on moved head
`5885da291d7d6b3e4541e5c00c160ffb481828b8` opened P1 thread
`PRRT_kwDOTiNyWc6bZjxp`: structurally invalid rejected native Promises could be
rejected before a rejection reaction was attached. A later exact-head Codex
review on moved head `b7576f8e94b3379c7427a51e4113960f396ac7e8`
opened P1 thread `PRRT_kwDOTiNyWc6bZ6tx`: the first drain repair still performed
a fallible own-`constructor` `defineProperty` before attaching the captured
rejection reaction. A non-extensible rejected Promise with benign metadata or a
rejected Promise carrying a non-configurable own data constructor could still
become an orphan under `--unhandled-rejections=strict`.

Runtime repair commit `9e7a151b4eb8da0e7595e8ebee540319273a7fab`
changes that ordering for the claimed transport classes. The drain now:

- inspects captured own/prototype descriptors rather than reading attacker-owned
  constructor/then accessors;
- uses a captured `Promise.prototype.then` rejection reaction immediately when
  the effective constructor path is already data-only and safe;
- captures and validates `Promise[Symbol.species]` because native `then` species
  construction is part of the drain path;
- shadows an unsafe-but-configurable constructor path with an own `undefined`
  constructor before the captured `then` call, avoiding inherited/own getter
  dispatch;
- no longer performs post-drain constructor/then pinning on a transport that is
  about to be rejected anyway.

The CI-wired strict regressions remain present and unweakened:

- ordinary own metadata;
- non-standard prototype;
- `metadata-nonextensible`;
- `constructor-nonconfigurable`.

Commit `d0c4175f12086bbbb2f4ccceb7cd947203e3f6fc` also records the explicit bounded
non-claim for a **non-configurable own constructor accessor**. Standard ECMAScript
provides no public `PerformPromiseThen` primitive that bypasses the native
`then` species-constructor read. If such an accessor cannot be shadowed without
executing attacker code, PR #120 does not claim the gateway can internally mark
that arbitrary decorated rejected Promise as handled. A strict child regression
pre-handles that deliberately unsupported provider transport, then proves Wallet
Guard rejects it without executing the accessor, without reference authorization
and without sensitive forwarding. This is a fail-closed unsupported transport
class, not a broadened drain claim.

The historical Codex P1 threads remain unresolved until a **fresh distinct
exact-head review** validates the final candidate. Implementation is not release
evidence.

## `PR120_CI_WIRING_P2_PENDING_EXACT_HEAD_VALIDATION`

Codex P2 thread `PRRT_kwDOTiNyWc6bZ6tz` found that the rejected-transport
regression was not reached by canonical `npm test`. `package.json` now includes
`tests/wallet-guard/provider-invalid-rejected-transport.node.test.mjs` in
`test:pom-rx:wallet-guard-provider-gate`, which is part of full `npm test`.
The implementation defect is repaired, but the thread remains unresolved until
the final frozen head has green canonical CI and a fresh distinct review confirms
the wiring.

## `PR120_FINAL_EXACT_HEAD_GATES_REQUIRED`

PR #120 remains **OPEN / NOT TRUSTED / NOT MERGEABLE BY POLICY** until one frozen
exact head has all of the following:

- canonical exact-head CI `success` with the strict rejected-Promise regressions
  actually executed;
- release-owner mandatory five-stage PASS on that exact head;
- a fresh genuinely distinct `chatgpt-codex-connector` skeptical/security review
  on the same exact head;
- zero unresolved P0/P1/P2, including valid closure of threads
  `PRRT_kwDOTiNyWc6bZjxp`, `PRRT_kwDOTiNyWc6bZ6tx` and
  `PRRT_kwDOTiNyWc6bZ6tz`.

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
