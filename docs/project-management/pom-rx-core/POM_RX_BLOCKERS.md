# POM-RX Core — Active Blockers

Updated: `2026-08-23T03:27:11+02:00`

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

## `CONTROL_PLANE_STALE_AFTER_PR121_AND_PR120_CI785`

The canonical control-plane files currently on `main` still describe pre-PR121
trusted main `e5aead150a2ed5f390593cc2d9d307defdd79bdc` and an earlier PR #120 head.
Live GitHub is authoritative: main is `06de789768c2cb0d5738161997c6bf104930a174`
and PR #120 is now at exact head `2d01503c13b9b22ea136f6bbd169bc2032366b9a`
with canonical CI `32609855025` / CI 785 attempt 1 `success`.

Required closure is the scoped non-Tier-B four-file reconciliation on branch
`docs/pom-rx-live-state-reconcile-20260823`. It changes no runtime, test,
protocol, Gate, Witness, verifier, Wallet Guard/provider, network, wallet,
public-site/Vercel or financial-execution semantics. This is a material-drift
reconciliation required by the continuity contract, not a recurring docs-only
successor merely to restate PR #121.

Until that reconciliation itself passes applicable exact-head gates and receives
exact-merge post-merge assurance, live GitHub remains the dependency/readiness
source of truth and stale main entries must not be used as evidence.

## `PR120_EXACT_HEAD_RELEASE_GATES_PENDING`

PR #120 is **OPEN / NOT TRUSTED / NOT MERGEABLE BY POLICY**.

Live state at this checkpoint:

- exact head: `2d01503c13b9b22ea136f6bbd169bc2032366b9a`;
- exact base/main: `06de789768c2cb0d5738161997c6bf104930a174`;
- canonical exact-head CI: run `32609855025`, CI 785 attempt 1,
  `completed / success`;
- release-owner five-stage exact-head gate: `PENDING / NON-INDEPENDENT`;
- genuinely distinct exact-head `chatgpt-codex-connector` gate: `PENDING`;
- merge: `BLOCKED`.

The bounded rejected-Promise/species-path repair and its strict regressions are
present. Earlier CI `32607345516` / CI 781 failed only because the capability-map
Wallet Guard product-position sentence was line-wrapped across the tested phrase;
commit `7803fc18337aecfbe4dd4c9870fe413ffced094c` repaired only that layout without
weakening the invariant or runtime/security behavior. CI 785 is green on the
current exact head.

A green CI is necessary but not sufficient release evidence. Before PR #120 can
merge, one frozen exact SHA must receive the mandatory five-stage owner gate, a
fresh genuinely distinct exact-head skeptical/security review, zero unresolved
P0/P1/P2, and decision-time revalidation of unchanged main/base/head/latest CI
run+attempt/reviews/threads/mergeability. Any head move invalidates exact-head
release evidence.

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

Some covered conditions have repairs on later heads, but none of these threads
may be treated as final release evidence until the frozen PR #120 candidate is
independently reviewed and leaves zero unresolved P0/P1/P2. Do not resolve them
early.

## `PR97_STALE_HISTORICAL_BRANCH_MUST_NOT_MERGE`

Historical PR #97 remains open and **must not merge**.

- exact live head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- historical base: `0564aecd42cf0794894c12842980969ff59c9f73`.

Do not merge, rebase, revive or wholesale-copy PR #97. Durable
claim-before-observer/downstream composition remains a separate future bounded
Core lot reconstructed from then-current trusted main only after PR #120 receives
exact-merge `POST_MERGE_ASSURANCE_PASS`.

## `CORE_DURABLE_GATE_COMPOSITION_NOT_YET_TRUSTED`

Trusted main contains a process-local single-use Gate and a **separate**
filesystem durable claim primitive. Reviewed durable claim-before-observer/
downstream composition is not trusted. Reconstruct it from then-current trusted
main only after PR #120 passes post-merge assurance.

## `PR93_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED_LATER`

PR #93 remains open and untrusted.

- exact live head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
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
