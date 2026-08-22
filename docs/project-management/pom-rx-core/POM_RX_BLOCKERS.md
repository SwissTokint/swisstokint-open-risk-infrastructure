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
merge assurance is `POST_MERGE_ASSURANCE_PASS` in PR #119 comment `5380609307`.
PR #119 is terminal control-plane transition evidence; do not create another
docs-only successor.

## `PR120_P1_ATTACH_REJECTION_REACTION_BEFORE_FALLIBLE_PROMISE_PINNING`

PR #120 is **BLOCKED** on a confirmed Tier-B P1.

Distinct Codex review on moved head
`5885da291d7d6b3e4541e5c00c160ffb481828b8` first opened P1 thread
`PRRT_kwDOTiNyWc6bZjxp`: structurally invalid rejected native Promises could be
rejected before a rejection reaction was attached.

After the first drain repair, a fresh dedicated Codex review on exact moved head
`b7576f8e94b3379c7427a51e4113960f396ac7e8` opened P1 thread
`PRRT_kwDOTiNyWc6bZ6tx`: `drainPromiseTransportBeforeIntegrityFailure()` still
performs a fallible own-`constructor` `defineProperty` before attaching the
captured rejection reaction. A rejected native Promise with benign own metadata
plus `Object.preventExtensions()`, or a non-configurable own constructor, can
therefore still orphan the provider rejection. Under
`node --unhandled-rejections=strict` the caller may catch the Wallet Guard error
but the process still terminates. Release-owner review `5000574562` independently
reproduced the non-extensible metadata primitive on Node 22.16 and reached the
same P1 conclusion; that owner evidence is non-independent but corroborating.

The falsification gap is now CI-visible rather than hidden:

- `tests/wallet-guard/provider-invalid-rejected-transport.node.test.mjs` contains
  strict child cases for ordinary own metadata, non-standard prototype,
  `metadata-nonextensible`, and `constructor-nonconfigurable`;
- `package.json` now includes that file in
  `test:pom-rx:wallet-guard-provider-gate`, which is reached by full `npm test`;
- this repairs Codex P2 thread `PRRT_kwDOTiNyWc6bZ6tz` at the implementation
  level, but that thread stays unresolved until a fresh exact-head reviewer
  validates the wiring;
- pre-checkpoint branch head `6911eaeeb2a0a89ccefceebeb7b6e03b64c97d15`
  contained the CI wiring + expected-red cases. No workflow run was associated
  with that exact SHA at the decision-time recheck; this control-plane write moves
  the head again.

Runtime closure still requires changing the drain strategy so the newly wired
non-extensible/non-configurable cases become green **without deleting or weakening
the tests**, without executing hostile constructor/then accessors merely to mark
a transport handled, and with zero authorization/zero sensitive forwarding.
If a non-shadowable accessor variant cannot be safely drained with the captured
standard intrinsics, the supported claim must be narrowed explicitly and tested;
it may not remain an implicit false-PASS.

## `PR120_FINAL_EXACT_HEAD_GATES_REQUIRED_AFTER_RUNTIME_REPAIR`

After the P1 runtime repair, freeze one exact head and require canonical exact-head
CI, the mandatory five-stage release-owner gate, a fresh genuinely distinct
exact-head Codex skeptical/security review, and zero unresolved P0/P1/P2. Only
then may threads `PRRT_kwDOTiNyWc6bZjxp`, `PRRT_kwDOTiNyWc6bZ6tx` and
`PRRT_kwDOTiNyWc6bZ6tz` be resolved. Any head move invalidates the release
evidence.

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
