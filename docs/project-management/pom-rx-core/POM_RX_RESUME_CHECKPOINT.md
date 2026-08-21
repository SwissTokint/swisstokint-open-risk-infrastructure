# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-21T15:13:33+02:00`

Purpose: compact **durable cross-chat continuation state**. The scheduled task may
run in a task conversation separate from any interactive chat, so future runs must
reconstruct state from live GitHub plus this repository. Live GitHub wins whenever
a PR head, CI run, review, thread or merge changes after this checkpoint.

## trusted_main

`0564aecd42cf0794894c12842980969ff59c9f73`

Latest trusted merge: PR #101 — bounded post-PR #100 control-plane checkpoint.

PR #101 source head `009064788008abe8ac1c08532f3d55ef1c19508f`
merged as exact main SHA `0564aecd42cf0794894c12842980969ff59c9f73`.
The reviewed source-head tree and merge tree are identical. Canonical exact-main
push CI run `32482258034`, `CI` run 576 attempt 1, completed `success` on this
exact merge SHA, and decision-time `pom-rx/exact-main-ci` revalidation was
`success` targeting that same run. PR #101 records
`POST_MERGE_ASSURANCE_PASS`: SpecKit reconciliation, skeptical/falsification,
security, code quality, optimization and integration/regression all PASS for the
bounded documentation/control-plane scope.

PR #101 changed no runtime, protocol, Gate, Witness, verifier, Wallet Guard,
provider, wallet, network or financial-execution semantics. It is trusted
coordination evidence only.

## repository architecture present on trusted main

Trusted main contains the activated bounded strict profile while preserving
historical `pom-rx/0.1`, common exact authorization, a process-local single-use
Gate, shared bounded hostile-object/plain-data capture, process-local Witness
trust lifecycle, a separate filesystem durable claim primitive, reference
execution evidence, reference observation/reconciliation, the merged Wallet
Guard JSON/intent/effect/policy/controller/preflight/Witness-adapter/provider/
controlled-host layers, exact-main CI observability, and the GitHub-backed
cross-chat POM-RX control plane.

These remain reference/prototype properties. Production trusted time, production
issuer/key custody, arbitrary-browser/provider integrity, external execution or
effect truth, distributed filesystem/consensus semantics and real-wallet safety
are not proved.

## open_prs

### PR #97 — Core durable-claim + single-use-Gate composition

- state: `OPEN / NOT_MERGED / MERGEABLE / BLOCKED_EXACT_HEAD_P1_AND_RED_CI`;
- current exact head: `639b96e7a64fa101432b3afcc3c08aebfcc838cf`;
- exact base/trusted main: `0564aecd42cf0794894c12842980969ff59c9f73`;
- current canonical exact-head CI: run `32486243945`, `CI` run 586, completed
  `failure` on this exact head;
- the previous exact-head P1 on `37b8e699...` (`Permit runtime bookkeeping
  symbols on native promises`) is historical after the head move. The new head
  permits Node/AsyncHooks own-symbol bookkeeping strongly enough that the
  ordinary native-Promise compatibility regression now passes;
- a fresh distinct `chatgpt-codex-connector` review covers exact current head
  `639b96e7...` and reports P1 `Reject Promise drift before entering async
  layers`;
- the exact failing regression is `post-import Promise prototype constructor
  drift is rejected before getter execution`: the hostile constructor getter is
  observed four times, with `authorizationCalls: 0` and `sensitiveCalls: 0` in
  the canonical failure;
- the independent reproducer is more severe than that isolated assertion: when
  inherited `Promise.prototype.constructor` and `then` are poisoned together,
  internal async-layer awaits in `readProviderSnapshot`,
  `sampleStableProviderContext`, `sampleTrustedContext` and `request` can run the
  hostile inherited Promise surface before the transport validator's rejection
  reaches its caller; the reviewer reproduced stable attacker-controlled context,
  subsequent reference authorization and sensitive forwarding;
- direct non-Promise object/function capture and own native-Promise
  `constructor`/`then` decoration hardening remain prior security requirements and
  must not be weakened;
- no release-owner six-lane review covers current head `639b96e7...`; the latest
  owner PASS is on moved head `f91079676aa8a21c0501bee3951bcd0d40c27083` and is
  stale. Historical P1 threads remain unresolved.

Required next repair: on PR #97, close the Promise-prototype drift boundary before
entering any async layer that can itself perform Promise assimilation. Preserve
ordinary native-Promise compatibility (including inert runtime bookkeeping
symbols), direct Proxy/function capture before assimilation, own
`constructor`/`then` decoration rejection, zero authorization/forwarding on
rejected hostile transports and the documented same-realm threat boundary. Add
or retain CI-wired attack and compatibility regressions, then rerun exact-head CI,
release-owner six-lane review and a fresh distinct independent exact-head review.
No unresolved P0/P1/P2 may remain before merge.

### PR #93 — Wallet Guard simulation evidence

- state: `OPEN / NOT_MERGED / MERGEABLE / UNTRUSTED / RECONCILIATION_REQUIRED`;
- current live head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- current PR base remains historical `818718955c9e4136e9e55754a31be2f1c7b610f8`;
- current live mergeability is `true`, but this is not release evidence and does
  not waive trusted-main reconciliation;
- last exact-head CI on `c4e40ceb...`: run `32465835858`, `CI` run 541,
  completed `success`;
- the latest distinct Codex release evidence covers a moved head, not
  `c4e40ceb...`, and cannot release this PR;
- PR #93 overlaps shared regression/package surfaces with #97 and must be
  reconciled to the then-current trusted main after the #97 ordering is settled.

Required next gate: after #97 has either become a trusted exact-merge dependency
or been otherwise safely ordered, reconcile #93 to trusted main, rerun exact-head
CI and release-owner review, and obtain a fresh distinct exact-head independent
skeptical/security review with no unresolved P0/P1/P2. Simulation remains
reference evidence only and does not authorize forwarding or prove external
state/effect truth.

### Current control-plane reconciliation lot — PR #102

This checkpoint is being persisted through existing bounded non-Tier-B PR #102,
based on trusted main `0564aecd...`. Its owned surfaces are exactly
`POM_RX_RESUME_CHECKPOINT.md`, `POM_RX_TASKS.yaml`, `POM_RX_BLOCKERS.md` and
`POM_RX_CAPABILITY_MAP.md`. It changes no runtime semantics. Its own moving
head/CI/review state is deliberately not embedded as authoritative; read live
GitHub before release. Any write invalidates earlier exact-head CI/review evidence.

## recent_merge_and_post_merge

### PR #101 — trusted control-plane checkpoint

- source head: `009064788008abe8ac1c08532f3d55ef1c19508f`;
- merge SHA: `0564aecd42cf0794894c12842980969ff59c9f73`;
- source-head tree and merge tree: identical;
- exact-main canonical push CI: run `32482258034`, CI run 576 attempt 1,
  `success` on the merge SHA;
- decision-time `pom-rx/exact-main-ci`: `success`, same run;
- SpecKit reconciliation: PASS;
- skeptical/falsification: PASS;
- security audit: PASS;
- code quality: PASS;
- optimization: PASS / not runtime-performance-material;
- integration/regression: PASS;
- post-merge verdict: `POST_MERGE_ASSURANCE_PASS`.

PR #101 is therefore a trusted coordination-only dependency. It does not make PR
#97 or PR #93 trusted and does not establish production or real-wallet readiness.

## overlap_and_dependency_rule

PR #93 and PR #97 both touch shared regression/package surfaces. If either merges,
the other must be reconciled to the then-current trusted main and all exact-head
gates rerun. Neither may be used as a trusted dependency until its own exact
merge has a recorded `POST_MERGE_ASSURANCE_PASS`.

The next controlled Wallet Guard end-to-end composition remains blocked on the
trusted completion of the relevant current composition lots. Do not merge a
dependent Tier-B lot on the assumption that an open PR is already trusted.

## current_blockers

1. `PR97_EXACT_HEAD_P1_PROMISE_DRIFT_BEFORE_ASYNC_LAYERS` — exact head
   `639b96e7...` has a fresh independent P1: post-import Promise prototype drift
   can be consulted by outer async-layer awaits before the inner transport
   rejection reaches its caller; the independent reproducer reaches reference
   authorization and sensitive forwarding with attacker-controlled context.
2. `PR97_EXACT_HEAD_CI_FAILURE_32486243945` — CI run 586 failed on exact head
   `639b96e7...`; all older green CI and owner reviews are stale for release.
3. `PR97_HISTORICAL_P1_THREADS_PENDING_VALIDATED_RESOLUTION` — do not resolve
   historical P1 threads until a final repaired exact head is independently
   validated.
4. `PR93_TRUSTED_MAIN_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED`.
5. `DAGR_SOURCE_DOCUMENT_MISSING`.
6. `PRODUCTION_TRUST_UNPROVED / REAL_WALLET_NOT_AUTHORIZED`.

## merge_authorization_and_review_rules

The user has standing authorization to merge future POM-RX PRs without per-PR
approval only after the full five-stage gate is satisfied, all applicable
technical/security gates pass, exact-head CI is green, and every required
independent review covers that same exact head with no unresolved P0/P1/P2. The
independent-review waiver remains limited to PR #60 unless explicitly broadened.

Release-owner/Prime/self-review is NON-INDEPENDENT. A fresh
`chatgpt-codex-connector` review may satisfy the independent lane only when it
actually covers the exact current candidate SHA and leaves no unresolved
P0/P1/P2. Never reuse a moved-head review as release evidence.

After every merge, run the exact-merge-SHA post-merge sequence: SpecKit
reconciliation, skeptical/falsification, security audit, code-quality review,
optimization review and integration/regression. Record exactly one scoped final
verdict: `POST_MERGE_ASSURANCE_PASS`, `POST_MERGE_ASSURANCE_CONDITIONAL` or
`POST_MERGE_ASSURANCE_BLOCK`. A non-PASS merge is not a trusted dependency and
must be repaired through a new PR, never direct `main`.

## next_safe_actions

1. Repair PR #97 exact head `639b96e7...` at the outer async-layer boundary so
   post-import Promise-prototype constructor/then drift is rejected before any
   attacker-owned inherited Promise dispatch, while preserving ordinary native
   Promise compatibility and the already hardened direct-result boundary.
2. Rerun exact-head CI and release-owner six-lane review after that repair, then
   obtain a fresh distinct independent exact-head skeptical/security review with
   no unresolved P0/P1/P2.
3. If #97 reaches every gate, merge under standing authorization and immediately
   run exact-merge-SHA post-merge assurance before treating it as trusted.
4. After #97 dependency ordering is trusted, reconcile PR #93 to the then-current
   trusted main and repeat all exact-head gates.
5. Start no dependent Wallet Guard end-to-end lot until relevant Tier-B
   dependencies have trusted exact-merge post-merge PASS evidence.
6. Do not begin burner/local-testnet execution without separate explicit human
   execution-phase authorization.

## safety_boundary

No private key, seed, secret, funded-wallet credential, real/funded wallet,
mainnet transaction, meaningful funds or uncontrolled malicious-site interaction
is authorized. No public site/Vercel/funding-directory write belongs to this
control plane. Burner local/testnet E2E remains behind a separate explicit human
gate.

## operational_claim_boundary

Target remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic,
synthetic and bounded. It is not production readiness, an audit, certification,
wallet safety, financial safety or deployment authorization.
