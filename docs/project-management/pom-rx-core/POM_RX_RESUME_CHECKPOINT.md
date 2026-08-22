# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-22T08:15:00+02:00`

Purpose: compact **durable cross-chat continuation state**. Scheduled-task chat
history is not project state. Every run reconstructs state from live GitHub plus
this canonical control plane. Live GitHub wins whenever a PR head, CI run,
review, review thread, mergeability signal or merge changes after this
checkpoint.

## trusted_main

`aeb843012c5693088657eb80fc3f2ae0949723b0`

Latest trusted merge: PR #116 — bounded non-Tier-B documentation/control-plane
reconciliation after PR #115.

- exact source head: `60fa89cae63a70649b32c5b65c67f6d89ed27f1b`;
- exact merge/main SHA: `aeb843012c5693088657eb80fc3f2ae0949723b0`;
- source-head and merge tree: `35e0ad4d90771c7df04493c769874c96f4552cc3`;
- exact-head candidate CI: run `32554051879`, CI 694, `success`;
- final release-owner exact-head gate: review `4999286553`,
  `PASS / NON-INDEPENDENT`;
- distinct exact-head `chatgpt-codex-connector` evidence: issue comment
  `5378169346`, reviewed `60fa89cae6`, no major issues;
- canonical exact-main push CI: run `32556325264`, CI 695 attempt 1,
  `completed / success` on the exact merge SHA;
- decision-time `pom-rx/exact-main-ci`: `success`, targeting CI 695;
- exact-merge SpecKit reconciliation, skeptical/falsification, security,
  code-quality, optimization and integration/regression: PASS for the bounded
  documentation/control-plane scope;
- final exact-merge verdict on PR #116: `POST_MERGE_ASSURANCE_PASS`, recorded in
  issue comment `5378389794`.

PR #116 changed no runtime, protocol, Gate, Witness, verifier, Wallet Guard,
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

## active_control_plane_reconciliation

Trusted main necessarily contains the pre-merge checkpoint embedded by PR #116.
A bounded non-Tier-B reconciliation is therefore prepared from exact trusted main
`aeb843012c5693088657eb80fc3f2ae0949723b0` on branch:

`docs/pom-rx-checkpoint-after-116-20260822`

Owned files are exactly:

- `docs/project-management/pom-rx-core/POM_RX_RESUME_CHECKPOINT.md`;
- `docs/project-management/pom-rx-core/POM_RX_TASKS.yaml`;
- `docs/project-management/pom-rx-core/POM_RX_BLOCKERS.md`;
- `docs/product/POM_RX_CAPABILITY_MAP.md`.

The branch/PR lookup rule is intentionally non-self-referential: **inspect live
GitHub for an open PR whose head branch is exactly the branch above. Create one
only if none exists.** Do not embed that PR's moving exact head in these four
files; read it live after the final owned-file commit. This avoids duplicate PRs
and avoids moving the candidate merely to record its own SHA.

This reconciliation changes no runtime/security semantics. Its frozen final exact
head still requires canonical CI, release-owner five-stage control, a genuinely
distinct exact-head independent review and zero unresolved P0/P1/P2 before merge.
After any merge, exact-merge post-merge assurance is mandatory again.

## open_runtime_prs

### PR #97 — Core durable-claim + single-use-Gate composition

- state: `OPEN / NOT_MERGED / BLOCKED_EXACT_HEAD_SECURITY_P1 /
  FRESH_TRUSTED_MAIN_REPAIR_REQUIRED`;
- exact live head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- historical base: `0564aecd42cf0794894c12842980969ff59c9f73`;
- current trusted main: `aeb843012c5693088657eb80fc3f2ae0949723b0`;
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

Required repair contract: start the smallest fresh runtime repair from
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
- exact live head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- historical base: `818718955c9e4136e9e55754a31be2f1c7b610f8`;
- current trusted main: `aeb843012c5693088657eb80fc3f2ae0949723b0`;
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

## current_blockers

1. `CONTROL_PLANE_POST_PR116_RECONCILIATION_REQUIRED` — the four canonical
   surfaces must reconcile exact trusted merge `aeb843012...` before stale embedded
   pre-merge entries are used as dependency/readiness evidence.
2. `PR97_EXACT_HEAD_P1_PROMISE_DRIFT_BEFORE_ASYNC_LAYERS`.
3. `PR97_FALSE_PASS_GREEN_CI_32487036517`.
4. `PR97_RELEASE_OWNER_BLOCK_EXACT_HEAD_0EFB462`.
5. `PR97_FRESH_TRUSTED_MAIN_REPAIR_REQUIRED_AFTER_PR116`.
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

1. Complete the four-file post-PR116 control-plane reconciliation on branch
   `docs/pom-rx-checkpoint-after-116-20260822`; look up the sole PR for that branch
   live and create one only if absent.
2. Freeze its final exact head, then require canonical exact-head CI,
   release-owner five-stage control, a genuinely distinct exact-head independent
   review and zero unresolved P0/P1/P2 before merge.
3. Keep stale PR #97 head `0efb462...` blocked; do not merge it or treat CI 592 as
   a security repair.
4. After the control-plane reconciliation is safely recorded, start the smallest
   fresh #97 runtime repair from then-current trusted main for Promise-prototype
   drift before outer async assimilation, preserving durable
   claim-before-observer/downstream, fail-closed durable one-winner behavior and
   zero authorization/forwarding for hostile rejected transports.
5. Reconcile #93 only after #97 dependency ordering is trusted unless a separate
   reviewed dependency-order change is recorded.
6. Start no dependent Wallet Guard E2E lot until relevant Tier-B dependencies
   have trusted exact-merge post-merge PASS evidence.
7. Do not begin burner/local-testnet execution without separate explicit human
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
