# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-22T03:26:20+02:00`

Purpose: compact **durable cross-chat continuation state**. Scheduled-task chat
history is not project state. Every run reconstructs state from live GitHub plus
this canonical control plane. Live GitHub wins whenever a PR head, CI run,
review, thread, mergeability signal or merge changes after this checkpoint.

## trusted_main

`89816f2bfcc97a77cd4cbc67cd3b2968800938fa`

Latest trusted merge: PR #111 — bounded post-PR #110
documentation/control-plane reconciliation.

PR #111 source head `bea88015019e3ea2cf28abf8cdc0eea7006f611c`
merged as exact main SHA `89816f2bfcc97a77cd4cbc67cd3b2968800938fa`.
The reviewed source-head tree and merge tree are identical:
`e49008df989865b2b56b10e738d6b16571715daa`.

Release evidence for PR #111:

- exact-head candidate CI: run `32539681161`, `CI` run 668, `success`;
- final release-owner gate: `PASS / NON-INDEPENDENT`, exact head `bea8801501...`,
  0 P0/P1/P2;
- a fresh distinct `chatgpt-codex-connector` review covered the exact candidate
  and reported no major issues;
- unresolved review threads at release: zero;
- canonical exact-main push CI: run `32542680297`, `CI` run 669 attempt 1,
  `success` on exact merge SHA `89816f2b...`;
- decision-time `pom-rx/exact-main-ci`: `success`, targeting run 669;
- exact-merge post-merge assurance was upgraded from its initial CI-pending
  conditional verdict to `POST_MERGE_ASSURANCE_PASS` after run 669 completed;
- SpecKit, skeptical/falsification, security, code quality, optimization and
  integration/regression are all PASS for the bounded documentation/control-plane
  scope.

PR #111 changed no runtime, protocol, Gate, Witness, verifier, Wallet Guard,
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
Wallet Guard remains an application profile under Blockchain and digital assets
and must not fork those semantics.

These remain reference/prototype properties. Production trusted time, production
issuer/key custody, arbitrary-browser/provider integrity, external execution or
effect truth, distributed filesystem/consensus semantics and real-wallet safety
are not proved.

## open_prs

### PR #112 — post-PR111 control-plane reconciliation

- state: `OPEN / NOT_MERGED / HEAD_MOVING / FRESH_EXACT_HEAD_GATES_REQUIRED`;
- base/trusted main: `89816f2bfcc97a77cd4cbc67cd3b2968800938fa`;
- branch: `docs/pom-rx-checkpoint-after-111-20260822`;
- scope: exactly four canonical documentation/control-plane surfaces;
- runtime/security semantics changed: none;
- exact current head: **read live PR #112**. The checkpoint deliberately does not
  self-embed its own moving head because committing that value would create a new
  head; the final exact-head SHA, CI and review state must be recorded in the PR
  conversation and revalidated live before merge;
- current release state: no merge authorization until the frozen final exact head
  has fresh canonical CI, release-owner five-stage control, fresh distinct
  exact-head independent review and zero unresolved P0/P1/P2.

This PR reconciles the unavoidable post-merge lag left by PR #111. It must remain
coordination-only and cannot be used to weaken any Tier-B blocker.

### PR #97 — Core durable-claim + single-use-Gate composition

- state: `OPEN / NOT_MERGED / BLOCKED_EXACT_HEAD_SECURITY_P1 /
  FRESH_TRUSTED_MAIN_REPAIR_REQUIRED`;
- exact head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- historical base: `0564aecd42cf0794894c12842980969ff59c9f73`;
- current trusted main: `89816f2bfcc97a77cd4cbc67cd3b2968800938fa`;
- live GitHub revalidation reports `mergeable=true`; this is volatile conflict
  metadata only and never security/release evidence;
- exact-head canonical CI: run `32487036517`, `CI` run 592, `success` but not
  security evidence;
- release-owner exact-head verdict: `BLOCK / NON-INDEPENDENT`;
- unresolved current exact-head Codex P1: `Reject Promise drift before entering
  async layers`;
- multiple earlier P1 threads remain intentionally unresolved pending validation
  of a final repaired exact head.

The current exact head is a test-only move from independently blocked parent
`639b96e7...`; runtime behavior remains vulnerable. Inherited
`Promise.prototype.constructor` plus `then` poisoning can cross outer awaits in
`readProviderSnapshot`, `sampleStableProviderContext`,
`sampleTrustedContext` and `request`, substitute stable attacker-controlled
context before the inner transport rejection reaches its caller, then permit
reference authorization and sensitive forwarding.

Required repair contract: create the smallest fresh runtime repair from
then-current trusted main, not by merging/rebasing/reviving the stale #97 branch
wholesale. Prevent Promise-prototype drift before outer async assimilation;
restore or replace the CI-wired sensitive-forwarding exploit regression; require
the durable capability claim to succeed before any observer or downstream work
so losing contenders cannot enter security-sensitive paths; preserve fail-closed
replay and durable one-winner semantics; preserve ordinary native-Promise
Node/AsyncHooks bookkeeping-symbol compatibility, hardened direct non-Promise
capture, own-decorated native-Promise rejection and zero authorization/forwarding
for hostile rejected transports. Then require exact-head CI, release-owner
six-lane PASS, fresh distinct exact-head independent skeptical/security review
and zero unresolved P0/P1/P2 before merge.

### PR #93 — Wallet Guard simulation evidence

- state: `OPEN / NOT_MERGED / UNTRUSTED /
  RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED`;
- exact head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- historical base: `818718955c9e4136e9e55754a31be2f1c7b610f8`;
- current trusted main: `89816f2bfcc97a77cd4cbc67cd3b2968800938fa`;
- live GitHub revalidation reports `mergeable=true`; volatile conflict metadata
  only;
- exact-head canonical CI: run `32465835858`, `CI` run 541, `success` but not
  release evidence;
- latest distinct review evidence is on moved head `03e0201c9f...`, not current
  `c4e40ceb...`;
- unresolved current/non-outdated P1/P2 findings remain, including exact
  negative-zero identity, typed-data wrapper normalization, generic-signature
  exact-value commitment, shared proof canonicalization/hash classes, and nested
  payload capture with saved reflection intrinsics;
- the shared proof class includes recorded post-initialization canonicalization
  and SHA-256/hash hardening findings and remains unresolved until a repaired
  exact head is independently validated;
- #93 overlaps shared package/regression surfaces with #97 and remains ordered
  after trusted #97 dependency state unless a separately reviewed dependency
  decision changes that order.

Required next gate: only after #97 has trusted exact-merge post-merge PASS evidence
(or a separately reviewed safe dependency order is recorded), reconcile #93 from
then-current trusted main, rerun exact-head CI and release-owner review, obtain a
fresh distinct exact-head independent skeptical/security review, and leave no
unresolved P0/P1/P2. Simulation remains reference evidence only and does not
authorize forwarding or prove external state/effect truth.

## current control-plane reconciliation lot

PR #112 is the bounded post-PR #111 reconciliation on branch
`docs/pom-rx-checkpoint-after-111-20260822`. The canonical files merged by PR #111
necessarily described the pre-merge state; PR #112 brings the durable control
plane to trusted main `89816f2b...`. Live GitHub remains authoritative over its
moving exact head, CI, review, thread and merge state.

Owned surfaces are exactly:

- `docs/project-management/pom-rx-core/POM_RX_RESUME_CHECKPOINT.md`;
- `docs/project-management/pom-rx-core/POM_RX_TASKS.yaml`;
- `docs/project-management/pom-rx-core/POM_RX_BLOCKERS.md`;
- `docs/product/POM_RX_CAPABILITY_MAP.md`.

This lot is coordination-only and non-Tier-B. It changes no runtime/security
implementation. It preserves the #97 repair contract, the mandatory five-stage
merge gate, PR-60-only independent-review waiver, shared Core versus Wallet Guard
ownership, every production/real-wallet non-claim, and the unresolved #93 shared
proof canonicalization/hash repair class.

## current_blockers

1. `CONTROL_PLANE_POST_PR111_RECONCILIATION_REQUIRED` — PR #112 must become
   trusted before its embedded state is used as dependency/readiness evidence.
2. `PR97_EXACT_HEAD_P1_PROMISE_DRIFT_BEFORE_ASYNC_LAYERS`.
3. `PR97_FALSE_PASS_GREEN_CI_32487036517`.
4. `PR97_RELEASE_OWNER_BLOCK_EXACT_HEAD_0EFB462`.
5. `PR97_FRESH_TRUSTED_MAIN_REPAIR_REQUIRED_AFTER_PR111`.
6. `PR97_HISTORICAL_P1_THREADS_PENDING_VALIDATED_RESOLUTION`.
7. `PR93_TRUSTED_MAIN_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED`.
8. `DAGR_SOURCE_DOCUMENT_MISSING`.
9. `PRODUCTION_TRUST_UNPROVED / REAL_WALLET_NOT_AUTHORIZED`.

## merge_authorization_and_review_rules

Standing authorization permits a POM-RX merge without per-PR confirmation only
after the full five-stage pre-merge gate, all applicable technical/security
gates, exact-head CI, and every required distinct exact-head independent review
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

1. Freeze PR #112's four-file diff and revalidate live main/head/CI/review/thread
   state.
2. Require fresh exact-head canonical CI, release-owner five-stage control and a
   genuinely distinct exact-head independent review with zero unresolved
   P0/P1/P2 before merging PR #112.
3. After its merge, immediately run exact-merge-SHA post-merge assurance before
   using it as trusted coordination evidence.
4. Keep stale PR #97 head `0efb462...` blocked; do not merge it or treat CI 592
   as a security repair.
5. Once PR #112 is trusted, create the smallest fresh #97 runtime repair from
   then-current trusted main for Promise-prototype drift before outer async
   assimilation, while preserving durable claim before observer/downstream and
   fail-closed durable one-winner semantics.
6. Restore/replace the exact exploit regression, rerun exact-head CI, owner
   six-lane review and fresh distinct independent review, and resolve only
   findings validated on that exact head.
7. If repaired #97 passes every gate, merge under standing authorization and
   immediately run exact-merge-SHA post-merge assurance.
8. Reconcile #93 only after #97 dependency ordering is trusted, preserving the
   shared proof canonicalization/hash repair class until a repaired exact head is
   independently validated, then repeat all exact-head gates.
9. Start no dependent Wallet Guard E2E lot until relevant Tier-B dependencies
   have trusted exact-merge post-merge PASS evidence.
10. Do not begin burner/local-testnet execution without separate explicit human
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
