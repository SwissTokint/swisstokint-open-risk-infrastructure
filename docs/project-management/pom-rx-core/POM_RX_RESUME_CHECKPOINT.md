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

- state: `OPEN / NOT_MERGED / MERGEABLE / BLOCKED_UNRESOLVED_SECURITY_P1`;
- current exact head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- exact base/trusted main: `0564aecd42cf0794894c12842980969ff59c9f73`;
- current canonical exact-head CI: run `32487036517`, `CI` run 592, `in_progress`
  at this checkpoint;
- current head is one commit ahead of independently blocked parent
  `639b96e7a64fa101432b3afcc3c08aebfcc838cf` and changes only
  `tests/wallet-guard/provider-result-thenable-boundary.node.test.mjs` (4
  additions / 4 deletions). No provider/runtime implementation changed;
- the changed test relaxes the Promise-prototype-drift assertion from requiring
  zero hostile constructor-getter execution to requiring only zero authorization
  and zero sensitive forwarding in that isolated case;
- the parent exact-head fresh distinct `chatgpt-codex-connector` review reported
  P1 `Reject Promise drift before entering async layers` and reproduced inherited
  `Promise.prototype.constructor` + `then` poisoning being consulted by outer
  async awaits before the inner transport rejection reaches its caller, yielding
  stable attacker-controlled context, reference authorization and sensitive
  forwarding;
- because current head changes only the test and not the implementation, that
  attack class remains an unresolved release blocker. A green CI result on this
  head cannot by itself clear it;
- release-owner exact-head review on `0efb462...` is `BLOCK / NON-INDEPENDENT`
  for false-PASS risk, and a fresh distinct exact-head Codex review has been
  requested and is pending;
- the earlier `37b8e699...` native-Promise bookkeeping-symbol P1 is historical;
  ordinary native-Promise transport compatibility now passes in the relevant
  regression and must remain preserved;
- historical P1 threads remain unresolved and must not be treated as release
  evidence until a final repaired exact head is independently validated.

Required next repair: do not substitute a weaker test for the parent security
finding. Repair the Promise-prototype drift boundary before entering outer async
layers whose own Promise assimilation can consult inherited attacker-controlled
`constructor`/`then` state. Preserve ordinary native-Promise compatibility,
direct non-Promise Proxy/function capture, own Promise-decoration rejection and
zero authorization/forwarding on hostile rejected transports. Then rerun
exact-head CI, release-owner six-lane review and a fresh distinct independent
exact-head review. No unresolved P0/P1/P2 may remain before merge.

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

1. `PR97_UNRESOLVED_PARENT_P1_PROMISE_DRIFT / FALSE_PASS_RISK` — current exact
   head `0efb462...` changes only the failing regression, not provider/runtime
   implementation. Parent `639b96e7...` has a fresh independent P1 with a
   sensitive-forwarding reproducer. Current release-owner verdict is BLOCK.
2. `PR97_EXACT_HEAD_CI_32487036517_PENDING` — current-head CI is in progress and
   cannot clear the unresolved technical P1 even if it becomes green.
3. `PR97_FRESH_INDEPENDENT_EXACT_HEAD_REVIEW_PENDING` — requested specifically
   for `0efb462...`; moved-head review evidence does not satisfy release.
4. `PR97_HISTORICAL_P1_THREADS_PENDING_VALIDATED_RESOLUTION` — do not resolve
   historical P1 threads until a final repaired exact head is independently
   validated.
5. `PR93_TRUSTED_MAIN_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED`.
6. `DAGR_SOURCE_DOCUMENT_MISSING`.
7. `PRODUCTION_TRUST_UNPROVED / REAL_WALLET_NOT_AUTHORIZED`.

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

1. Keep PR #97 blocked on `0efb462...`; do not accept the relaxed regression as a
   repair for the parent independent P1.
2. Repair the Promise-prototype drift/outer-async-layer boundary in runtime code,
   restore or replace a regression that covers the independent exploit, preserve
   ordinary native-Promise compatibility, then rerun exact-head CI and owner
   review plus fresh distinct independent review.
3. If #97 later reaches every gate, merge under standing authorization and
   immediately run exact-merge-SHA post-merge assurance before treating it as
   trusted.
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
