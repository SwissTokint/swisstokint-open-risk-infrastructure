# POM-RX Core — Active Blockers

Updated: `2026-08-23`

Current trusted main: `06de789768c2cb0d5738161997c6bf104930a174`

This file lists **current** blockers only. Historical detail remains in Git history
and PR review threads. Live GitHub wins whenever a PR head, CI run, review,
review thread, mergeability signal or merge changes after this checkpoint.

## Trusted coordination state

PR #121 exact source head `05f8964d148266ec7a3435c8959b2c998242294a`
merged as exact main SHA `06de789768c2cb0d5738161997c6bf104930a174`.
Canonical exact-main push CI `32598869337` / CI 772 attempt 1 completed
`success` on that exact merge SHA. Exact-merge assurance is
`POST_MERGE_ASSURANCE_PASS` in PR #121 comment `5382634292`.

PR #121 changed only the canonical continuation/product-position documents. It
is trusted coordination evidence and did not make open Tier-B PR #120, stale PR
#97 or PR #93 trusted.

## `PR120_FINAL_EXACT_HEAD_GATES_PENDING`

PR #120 remains **OPEN / NOT TRUSTED / NOT MERGEABLE BY POLICY** until its final
reconciled repaired head completes all exact-head gates.

Prior blocked exact head `30e9c0399804f17cbadbc076eed4d1d48614610d`
had canonical CI `32596104896` / CI 770 `success`, but that CI was a known false
PASS for the fresh effective-constructor `Symbol.species` P1.

The bounded repair is now implemented on the PR #120 branch:

- `ebaf1c71c903a266ebedad60aa5be4f775f67a84` extends the captured-reflection
  classifier through the effective constructor's species path, rejects non-data
  descriptors and Proxies, and allows internal drain only for absent/null/
  undefined species or the captured native Promise;
- `e9f7a70668ce0a7314dbcd0a40f90f402389f6e6` adds the strict regression for a
  non-extensible rejected native Promise with a benign alternate data constructor
  plus the prehandled hostile species-accessor regression requiring zero accessor
  execution, zero reference authorization and zero sensitive forwarding.

Primitive constructors, constructor/species accessors, Proxy paths and
attacker-selected species constructors remain outside the gateway-owned internal
drain guarantee unless separately proven safe. The implementation must not be
broadened merely to make hostile classes pass.

The exact PR #120 head after the final canonical checkpoint commit must be read
live from GitHub. Required closure on that same frozen SHA:

1. canonical exact-head CI `success`;
2. mandatory five-stage release-owner gate with a Tier-B skeptical/falsification
   pass — owner/self review remains non-independent;
3. a fresh genuinely distinct read-only `chatgpt-codex-connector` exact-head
   review;
4. zero unresolved P0/P1/P2;
5. decision-time revalidation of unchanged trusted main, base/head, latest CI
   run/attempt, reviews, threads and mergeability.

Any head move invalidates prior exact-head evidence.

## `PR120_HISTORICAL_REVIEW_THREADS_REQUIRE_FINAL_EXACT_HEAD_VALIDATION`

The following distinct Codex P1/P2 threads remain unresolved attack history:

- `PRRT_kwDOTiNyWc6bZjxp` — P1 rejected transport could fail validation before a
  rejection reaction was attached;
- `PRRT_kwDOTiNyWc6bZ6tx` — P1 fallible constructor pinning preceded the
  rejection reaction;
- `PRRT_kwDOTiNyWc6bZ6tz` — P2 strict rejected-transport regression was absent
  from canonical `npm test` at that reviewed head;
- `PRRT_kwDOTiNyWc6baFkR` — P1 non-extensible rejected native Promise with
  nonstandard prototype could reach fallible constructor shadowing;
- `PRRT_kwDOTiNyWc6baIxZ` — P1 Wallet Guard capability-map product-position
  invariant was removed.

Some conditions have implementation repairs on later heads, but none of these
threads is release evidence until the final exact repaired head receives green
canonical CI and fresh distinct exact-head review. Do not resolve them early.

## `PR97_STALE_HISTORICAL_BRANCH_MUST_NOT_MERGE`

Historical PR #97 remains open and **must not merge**.

- exact live head at the latest reconstruction:
  `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- historical base: `0564aecd42cf0794894c12842980969ff59c9f73`.

PR #120 supersedes only the Promise-boundary prerequisite via fresh work. Do not
merge, rebase, revive or wholesale-copy PR #97. Durable claim-before-observer/
downstream composition remains a separate future bounded Core lot after PR #120
is trusted with exact-merge `POST_MERGE_ASSURANCE_PASS`.

## `CORE_DURABLE_GATE_COMPOSITION_NOT_YET_TRUSTED`

Trusted main contains a process-local single-use Gate and a **separate**
filesystem durable claim primitive. Reviewed durable claim-before-observer/
downstream composition is not trusted. Reconstruct it from then-current trusted
main only after PR #120 passes post-merge assurance.

## `PR93_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED_LATER`

PR #93 remains open and untrusted.

- exact live head at the latest reconstruction:
  `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- historical base: `818718955c9e4136e9e55754a31be2f1c7b610f8`.

Its historical green CI is not release evidence. Keep PR #93 ordered after
trusted PR #120 and required shared-Core work unless a separately reviewed
dependency-order change is recorded.

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

## Current dependency and merge rule

A dependency becomes trusted only after the mandatory five-stage pre-merge gate,
all applicable exact-head technical/security gates, canonical exact-head CI,
every required genuinely distinct exact-head independent review, zero unresolved
P0/P1/P2, merge, exact-main CI and exact-merge
`POST_MERGE_ASSURANCE_PASS`. A moved head invalidates exact-head evidence. The
independent-review waiver remains limited to PR #60.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`:
local, deterministic, synthetic and bounded — not production readiness, audit,
certification, wallet safety, financial safety or deployment authorization.
