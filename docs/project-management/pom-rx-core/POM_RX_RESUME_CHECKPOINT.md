# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-22T06:19:24+02:00`

Purpose: compact **durable cross-chat continuation state**. Scheduled-task chat
history is not project state. Every run reconstructs state from live GitHub plus
this canonical control plane. Live GitHub wins whenever a PR head, CI run,
review, review thread, mergeability signal or merge changes after this
checkpoint.

## trusted_main

`ecc25e3e3f2991482e925fbe307058a91276c0bc`

Latest trusted merge: PR #113 — bounded non-Tier-B documentation/control-plane
reconciliation after PR #112.

- source head: `f28bea5bdddce9413b7bfc882999d8b9fab1196e`;
- exact merge/main SHA: `ecc25e3e3f2991482e925fbe307058a91276c0bc`;
- source-head and merge tree: `0fdaa90c0355cf741ca7af81b485cd6da806b22a`;
- exact-head candidate CI: run `32545840351`, CI 676, `success`;
- final release-owner gate: `PASS / NON-INDEPENDENT`, 0 owner P0/P1/P2;
- distinct exact-head `chatgpt-codex-connector` evidence: issue comment
  `5377337358`, reviewed `f28bea5bdd`, no major issues;
- unresolved release threads at merge: zero;
- canonical exact-main push CI: run `32548199260`, CI 677 attempt 1,
  `completed / success` on exact merge SHA;
- decision-time `pom-rx/exact-main-ci`: `success`, targeting run 677;
- exact-merge SpecKit reconciliation, skeptical/falsification, security, code
  quality, optimization and integration/regression: PASS for the bounded
  documentation/control-plane scope;
- recorded final exact-merge verdict on PR #113: `POST_MERGE_ASSURANCE_PASS`.

PR #113 changed no runtime, protocol, Gate, Witness, verifier, Wallet Guard,
provider, wallet, network, public-site/Vercel or financial-execution semantics.
It is trusted coordination evidence only. It does **not** make PR #97 or PR #93
trusted dependencies.

## repository architecture present on trusted main

Trusted main contains the bounded strict profile while preserving historical
`pom-rx/0.1`, common exact authorization, a process-local single-use Gate, shared
bounded hostile-object/plain-data capture, process-local Witness trust lifecycle,
a separate filesystem durable claim primitive, reference execution evidence,
reference observation/reconciliation, merged Wallet Guard JSON/intent/effect/
policy/controller/preflight/Witness-adapter/provider/controlled-host layers,
exact-main CI observability, and the GitHub-backed cross-chat POM-RX control
plane.

Shared canonicalization, hashing, verifier, Witness, exact authorization, Gate,
execution-evidence and observation/reconciliation semantics remain Core-owned.
Wallet Guard remains an application profile and must not fork those semantics.

These remain reference/prototype properties. Production trusted time,
issuer/key custody, arbitrary-browser/provider integrity, external execution or
effect truth, distributed filesystem/consensus semantics and real-wallet safety
are not proved.

## open_prs

### PR #114 — post-PR113 control-plane reconciliation

- state: `OPEN / NOT_MERGED / FRESH_EXACT_HEAD_GATES_REQUIRED`;
- trusted base/main: `ecc25e3e3f2991482e925fbe307058a91276c0bc`;
- branch: `docs/pom-rx-checkpoint-after-113-20260822`;
- scope: exactly four canonical documentation/control-plane surfaces;
- runtime/security semantics changed: none;
- exact current head: **read live PR #114**. The checkpoint deliberately does not
  self-embed its own moving exact head because committing that value would move it;
- release rule: no merge authorization until the frozen final exact head has
  fresh canonical CI, release-owner five-stage control, a genuinely distinct
  exact-head independent review and zero unresolved P0/P1/P2.

At PR creation the branch head was `b98f9c0e80e25c4203784b99cc99061bba5ac6d5`
and CI 678 (`32551305996`) entered the queue. That head received an independent
P2 asking to preserve the explicit no-authorization/no-forwarding closure for
hostile rejected transports. This lot now restores that invariant across the
canonical surfaces. All creation-head CI/review evidence is historical after the
repair commits; read the final head and its fresh CI/review live.

### PR #97 — Core durable-claim + single-use-Gate composition

- state: `OPEN / NOT_MERGED / BLOCKED_EXACT_HEAD_SECURITY_P1 /
  FRESH_TRUSTED_MAIN_REPAIR_REQUIRED`;
- exact head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- historical base: `0564aecd42cf0794894c12842980969ff59c9f73`;
- current trusted main: `ecc25e3e3f2991482e925fbe307058a91276c0bc`;
- exact-head canonical CI: run `32487036517`, CI 592, `success` but not
  security/release evidence;
- release-owner exact-head verdict: `BLOCK / NON-INDEPENDENT`;
- current exact-head independent P1: `Reject Promise drift before entering async
  layers`;
- current exact-head and applicable historical P1 threads remain unresolved.

The current head is a test-only move from independently blocked parent
`639b96e7...`; provider/runtime behavior was not repaired. Inherited
`Promise.prototype.constructor` plus `then` poisoning can cross outer awaits in
`readProviderSnapshot`, `sampleStableProviderContext`, `sampleTrustedContext` and
`request`, substitute stable attacker-controlled context before the inner
transport rejection reaches its caller, then permit reference authorization and
sensitive forwarding. Green CI 592 does not override that concrete reproducer.

Required repair contract: create the smallest fresh runtime repair from
then-current trusted main, not by merging/rebasing/reviving the stale #97 branch
wholesale. Prevent Promise-prototype drift before outer async assimilation;
restore or replace the CI-wired sensitive-forwarding exploit regression; require
the durable capability claim to succeed before any observer or downstream work;
preserve fail-closed replay, durable one-winner semantics, ordinary native-Promise
Node/AsyncHooks bookkeeping-symbol compatibility, hardened direct non-Promise
capture, own-decorated Promise rejection, and **zero authorization/forwarding for
hostile rejected transports**. Then require exact-head CI, release-owner six-lane
PASS, fresh distinct exact-head independent review and zero unresolved P0/P1/P2
before merge.

### PR #93 — Wallet Guard simulation evidence

- state: `OPEN / NOT_MERGED / UNTRUSTED /
  RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED`;
- exact head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- historical base: `818718955c9e4136e9e55754a31be2f1c7b610f8`;
- current trusted main: `ecc25e3e3f2991482e925fbe307058a91276c0bc`;
- exact-head canonical CI: run `32465835858`, CI 541, `success` but not release
  evidence;
- latest release-owner and distinct review evidence remains on moved head
  `03e0201c9f...`, not current `c4e40ceb...`;
- unresolved current/non-outdated P1/P2 classes include exact negative-zero
  identity, typed-data wrapper normalization, generic-signature exact-value
  commitment, nested payload capture with saved reflection intrinsics, and shared
  proof canonicalization/SHA-256/hash hardening.

PR #93 overlaps shared package/regression surfaces with #97 and remains ordered
after trusted #97 unless a separately reviewed dependency decision changes it.
Simulation remains reference evidence only and does not authorize forwarding or
prove external state/effect truth.

## active_control_plane_lot

PR #114 is the bounded post-PR113 reconciliation from trusted main `ecc25e3...`
on branch `docs/pom-rx-checkpoint-after-113-20260822`.

Owned files are exactly:

- `docs/project-management/pom-rx-core/POM_RX_RESUME_CHECKPOINT.md`;
- `docs/project-management/pom-rx-core/POM_RX_TASKS.yaml`;
- `docs/project-management/pom-rx-core/POM_RX_BLOCKERS.md`;
- `docs/product/POM_RX_CAPABILITY_MAP.md`.

This lot is coordination-only and non-Tier-B. It changes no runtime/security
implementation. Its final exact head must be read live after the last four-file
commit; self-embedding a moving head would move it again. It must pass fresh
exact-head CI, release-owner five-stage control, a genuinely distinct exact-head
review and zero unresolved P0/P1/P2 before merge. After merge, exact-merge
post-merge assurance is mandatory again.

## current_blockers

1. `CONTROL_PLANE_POST_PR113_RECONCILIATION_REQUIRED` — PR #114 must become
   trusted before Tier-B work uses the reconciled coordination state.
2. `PR97_EXACT_HEAD_P1_PROMISE_DRIFT_BEFORE_ASYNC_LAYERS`.
3. `PR97_FALSE_PASS_GREEN_CI_32487036517`.
4. `PR97_RELEASE_OWNER_BLOCK_EXACT_HEAD_0EFB462`.
5. `PR97_FRESH_TRUSTED_MAIN_REPAIR_REQUIRED_AFTER_PR113`.
6. `PR97_HISTORICAL_P1_THREADS_PENDING_VALIDATED_RESOLUTION`.
7. `PR93_TRUSTED_MAIN_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED`.
8. `DAGR_SOURCE_DOCUMENT_MISSING`.
9. `PRODUCTION_TRUST_UNPROVED / REAL_WALLET_NOT_AUTHORIZED`.

## merge_authorization_and_review_rules

Standing authorization permits a POM-RX merge without per-PR confirmation only
after the full five-stage pre-merge gate, every applicable technical/security
gate, exact-head CI, and every required distinct exact-head independent review
pass with no unresolved P0/P1/P2. The five stages remain: review pass 1; control
pass 1; skeptical challenge; exact-head review pass 2; exact-head control pass 2 /
release gate. The independent-review waiver remains limited to PR #60 unless
explicitly broadened.

Release-owner/Prime/self-review is NON-INDEPENDENT. A fresh
`chatgpt-codex-connector` review may satisfy the independent lane only when it
actually covers the exact current candidate SHA and leaves no unresolved
P0/P1/P2. Moved-head review evidence never releases a changed head.

After every non-trivial merge, run exact-merge-SHA SpecKit reconciliation,
skeptical/falsification, security audit, code-quality review, optimization review
and integration/regression. Record exactly one scoped final verdict:
`POST_MERGE_ASSURANCE_PASS`, `POST_MERGE_ASSURANCE_CONDITIONAL` or
`POST_MERGE_ASSURANCE_BLOCK`. A non-PASS merge is not a trusted dependency and
must be repaired through a new PR, never direct `main`.

## next_safe_actions

1. Freeze PR #114's four-file diff and revalidate live main/head/CI/review/thread
   state.
2. Require fresh exact-head canonical CI, release-owner five-stage control and a
   genuinely distinct exact-head independent review with zero unresolved
   P0/P1/P2 before merging PR #114.
3. After its merge, immediately run exact-merge-SHA post-merge assurance before
   using the new merge as trusted coordination evidence.
4. Keep stale PR #97 head `0efb462...` blocked; do not merge it or treat CI 592 as
   a security repair.
5. Once PR #114 is trusted, create the smallest fresh #97 runtime repair from
   then-current trusted main for Promise-prototype drift before outer async
   assimilation, preserving durable claim-before-observer/downstream, fail-closed
   durable one-winner behavior and zero authorization/forwarding for hostile
   rejected transports.
6. Reconcile #93 only after #97 dependency ordering is trusted unless a separate
   reviewed dependency-order change is recorded.
7. Start no dependent Wallet Guard E2E lot until relevant Tier-B dependencies
   have trusted exact-merge post-merge PASS evidence.
8. Do not begin burner/local-testnet execution without separate explicit human
   authorization.

## safety_boundary

No private key, seed, secret, funded-wallet credential, real/funded wallet,
mainnet transaction, meaningful funds or uncontrolled malicious-site interaction
is authorized. No public site/Vercel/funding-directory write belongs to this
control plane. Burner local/testnet E2E remains behind a separate explicit human
gate.

## operational_claim_boundary

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`:
local, deterministic, synthetic and bounded. It is not production readiness, an
audit, certification, wallet safety, financial safety or deployment
authorization.
