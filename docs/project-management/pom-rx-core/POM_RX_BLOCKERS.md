# POM-RX Core — Active Blockers

Updated: `2026-08-22T22:18:49+02:00`

Current trusted main: `e5aead150a2ed5f390593cc2d9d307defdd79bdc`

This file lists **current** blockers only. Historical blockers remain in Git history and PR review threads. Live GitHub wins if a PR head, review, CI run, review thread, mergeability signal or merge changes after this checkpoint.

## Trusted coordination state

PR #119 exact source head `057b225783b24c97568dbcd733ca4c821f889c7a` merged as exact main SHA `e5aead150a2ed5f390593cc2d9d307defdd79bdc`. Canonical exact-main push CI `32575110984` / CI 720 attempt 1 completed `success` on that exact merge SHA. Exact-merge assurance is `POST_MERGE_ASSURANCE_PASS` in PR #119 comment `5380609307`.

PR #119 is trusted coordination evidence only. It changed no runtime/security semantics and does not make PR #120, PR #97 or PR #93 trusted.

## `CONTROL_PLANE_STALE_AFTER_PR119_AND_PR120_P1`

The canonical continuation files on `main` still described trusted main `a22198bf...` and the pre-merge PR #119 transition while live GitHub had advanced to `e5aead...`. Live PR #120 also acquired a fresh exact-head P1 not represented by those stale files.

Required closure is this one scoped non-Tier-B four-file reconciliation on branch `docs/pom-rx-live-state-reconcile-20260822`. It changes no runtime/test/protocol/Gate/Witness/verifier/Wallet Guard/provider/network/wallet/public-site semantics. Complete its exact-head gates before using the stale main control plane as dependency/readiness evidence. It is not a recurring documentation-only checkpoint loop.

## `PR120_EXACT_HEAD_P1_EFFECTIVE_CONSTRUCTOR_SPECIES_PATH`

PR #120 is **OPEN / NOT TRUSTED / NOT MERGEABLE BY POLICY**.

Live state:

- exact head: `30e9c0399804f17cbadbc076eed4d1d48614610d`;
- exact base/trusted main: `e5aead150a2ed5f390593cc2d9d307defdd79bdc`;
- canonical exact-head CI `32596104896` / CI 770: `completed / success`;
- release-owner exact-head verdict: `BLOCK / NON-INDEPENDENT`;
- fresh independent exact-head gate on a future repaired candidate: `PENDING`.

Fresh exact-head owner P1: the rejected native-Promise drain classifier does not yet prove a benign alternate data constructor's `Symbol.species` lookup path before deciding it must shadow `constructor`. A rejected same-realm native Promise can therefore be given a benign non-Proxy alternate data constructor, made non-extensible, and reach a failing own-`constructor` `defineProperty` before the captured rejection reaction is attached. Under `--unhandled-rejections=strict`, the original provider rejection can remain orphaned and terminate Node even though the gateway itself fails closed.

Required bounded repair:

- classify the effective constructor's `Symbol.species` path with captured descriptor/prototype/Proxy intrinsics;
- allow internal draining only when that path is data-only/non-Proxy and species is absent/null/undefined or the captured native `Promise`;
- keep primitive constructors, accessors, Proxies and attacker-selected species constructors outside the internally-drainable claim unless separately proven safe;
- add a CI-wired strict regression for a non-extensible benign alternate data constructor;
- add a prehandled hostile species-accessor boundary regression proving zero accessor execution, zero reference authorization and zero sensitive forwarding;
- preserve the strict transport validator, existing hostile rejected-transport regressions and Wallet Guard product-position test.

CI 770 is a **false PASS for this attack family** and cannot release PR #120. Any repair moves the head and invalidates CI 770 and all exact-head review evidence for release.

## `PR120_HISTORICAL_REVIEW_THREADS_REQUIRE_FINAL_EXACT_HEAD_VALIDATION`

The following distinct Codex P1/P2 threads remain unresolved attack history:

- `PRRT_kwDOTiNyWc6bZjxp` — P1 rejected transport could fail validation before a rejection reaction was attached;
- `PRRT_kwDOTiNyWc6bZ6tx` — P1 fallible constructor pinning preceded the rejection reaction;
- `PRRT_kwDOTiNyWc6bZ6tz` — P2 strict rejected-transport regression was absent from canonical `npm test`;
- `PRRT_kwDOTiNyWc6baFkR` — P1 non-extensible rejected native Promise with nonstandard prototype could reach fallible constructor shadowing;
- `PRRT_kwDOTiNyWc6baIxZ` — P1 Wallet Guard capability-map product-position invariant was removed.

Some repairs are already implemented on moved heads, but none of these threads may be treated as final release evidence until a later exact repaired head receives canonical CI, the mandatory five-stage owner gate and a fresh genuinely distinct exact-head independent review with zero unresolved P0/P1/P2.

## `PR97_STALE_HISTORICAL_BRANCH_MUST_NOT_MERGE`

Historical PR #97 remains open and **must not merge**.

- exact live head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- historical base: `0564aecd42cf0794894c12842980969ff59c9f73`;
- exact-head CI `32487036517` / CI 592: `success` but known false-PASS for the Promise-drift security property.

PR #120 supersedes only the Promise-boundary prerequisite via a fresh trusted-main implementation. Do not merge, rebase, revive or wholesale-copy PR #97. Durable claim-before-observer/downstream composition remains a separate future bounded Tier-B Core lot after PR #120 becomes trusted.

## `CORE_DURABLE_GATE_COMPOSITION_NOT_YET_TRUSTED`

Trusted main contains a process-local single-use Gate and a **separate** filesystem durable claim primitive. Reviewed durable claim-before-observer/downstream composition is not trusted. Reconstruct it from then-current trusted main only after PR #120 receives exact-merge `POST_MERGE_ASSURANCE_PASS`, preserving fail-closed replay and durable one-winner behavior.

## `PR93_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED_LATER`

PR #93 remains open and untrusted.

- exact live head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- historical base: `818718955c9e4136e9e55754a31be2f1c7b610f8`;
- exact-head CI `32465835858` / CI 541: `success` but not release evidence.

Current/non-outdated unresolved P1/P2 history includes exact-value identity, typed-data/generic wrapper normalization, saved-reflection capture and shared proof canonicalization/SHA-256/hash hardening. Keep PR #93 ordered after trusted PR #120 and required shared-Core work unless a separately reviewed dependency-order change is recorded.

## `DAGR_SOURCE_DOCUMENT_MISSING`

Normative DAGR/profile work remains source-gated. Do not invent normative text, controls, scores or claims without authorized source material.

## `PRODUCTION_TRUST_UNPROVED`

Production issuer/operator authorization, trusted time, KMS/HSM custody, distributed revocation/consensus, crash recovery, external observer independence, external execution/effect truth and arbitrary browser/provider integrity remain unproved.

## `REAL_WALLET_NOT_AUTHORIZED`

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction or meaningful funds are authorized. Burner local/testnet E2E also remains behind a separate explicit human authorization gate.

## Current dependency and merge rule

A dependency becomes trusted only after the mandatory five-stage pre-merge gate, all applicable exact-head technical/security gates, canonical exact-head CI, every required genuinely distinct exact-head independent review, zero unresolved P0/P1/P2, merge, exact-main CI and exact-merge `POST_MERGE_ASSURANCE_PASS`. A moved head invalidates exact-head evidence. The independent-review waiver remains limited to PR #60.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded — not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.
