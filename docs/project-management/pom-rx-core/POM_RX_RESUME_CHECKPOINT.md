# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-21T16:27:16+02:00`

Purpose: compact **durable cross-chat continuation state**. The scheduled task may
run in a task conversation separate from any interactive chat, so future runs must
reconstruct state from live GitHub plus this repository. Live GitHub wins whenever
a PR head, CI run, review, thread or merge changes after this checkpoint.

## trusted_main

`62edca5dc665642d95f3e115fd60463fffd68947`

Latest trusted merge: PR #102 — bounded post-PR #101 control-plane reconciliation.

PR #102 source head `dc52051b5691913f34d57c3924a01642b7af10e7`
merged as exact main SHA `62edca5dc665642d95f3e115fd60463fffd68947`.
The reviewed source-head tree and merge tree are identical:
`02a227d1d4e473ec60a022a7fa2ca2454f6d315c`. Canonical exact-main push CI
run `32489395041`, `CI` run 605 attempt 1, completed `success` on this exact
merge SHA, and decision-time `pom-rx/exact-main-ci` was `success` targeting the
same run. PR #102 records `POST_MERGE_ASSURANCE_PASS`: SpecKit reconciliation,
skeptical/falsification, security, code quality, optimization and
integration/regression all PASS for the bounded documentation/control-plane scope.

PR #102 changed no runtime, protocol, Gate, Witness, verifier, Wallet Guard,
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

- state: `OPEN / NOT_MERGED / MERGEABLE_SIGNAL_ONLY / BLOCKED_EXACT_HEAD_SECURITY_P1 / TRUSTED_MAIN_RECONCILIATION_REQUIRED`;
- current exact head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- PR base SHA remains `0564aecd42cf0794894c12842980969ff59c9f73`, while trusted main has moved to `62edca5d...` through coordination-only PR #102;
- live GitHub currently reports `mergeable=true`, but that is only conflict computation and does not waive trusted-main reconciliation or any security/release gate;
- canonical exact-head CI: run `32487036517`, `CI` run 592, completed `success` on this exact head;
- current head is one commit after parent `639b96e7...` and changes only `tests/wallet-guard/provider-result-thenable-boundary.node.test.mjs` (4 additions / 4 deletions). No provider/runtime implementation changed;
- the changed test relaxes the Promise-prototype-drift assertion from requiring zero hostile constructor-getter execution to requiring only zero authorization and zero sensitive forwarding in the constructor-only isolated case;
- a fresh distinct `chatgpt-codex-connector` review covers exact head `0efb462...` and reports P1 `Reject Promise drift before entering async layers`; the relaxed assertion hides the still-reachable parent exploit;
- the independent exact-head reproducer poisons inherited `Promise.prototype.constructor` and `then`; outer awaits in `readProviderSnapshot`, `sampleStableProviderContext`, `sampleTrustedContext` and `request` assimilate rejected promises before the inner validator error reaches the caller, can substitute a stable attacker account, then permit reference authorization and sensitive forwarding;
- release-owner exact-head review on `0efb462...` is `BLOCK / NON-INDEPENDENT` for the same false-PASS/security reason;
- CI green is therefore insufficient and the implementation is unchanged;
- the earlier `37b8e699...` native-Promise bookkeeping-symbol P1 is historical; ordinary native-Promise transport compatibility now passes in the relevant regression and must remain preserved;
- historical P1 threads remain unresolved until a final repaired exact head is independently validated.

Required next repair: first reconcile the eventual runtime repair to current trusted main `62edca5d...`; restore/preserve regression coverage for zero hostile Promise-prototype dispatch and repair the Promise-prototype drift boundary before entering outer async layers whose own Promise assimilation can consult inherited attacker-controlled `constructor`/`then` state. Preserve ordinary native-Promise compatibility, direct non-Promise Proxy/function capture, own Promise-decoration rejection and zero authorization/forwarding on hostile rejected transports. Then rerun exact-head CI, release-owner six-lane review and a fresh distinct independent exact-head review. No unresolved P0/P1/P2 may remain before merge.

### PR #93 — Wallet Guard simulation evidence

- state: `OPEN / NOT_MERGED / MERGEABLE_SIGNAL_ONLY / UNTRUSTED / RECONCILIATION_REQUIRED`;
- current live head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- PR base remains historical `818718955c9e4136e9e55754a31be2f1c7b610f8`;
- live GitHub currently reports `mergeable=true`, but that is not trusted-main reconciliation and is not release evidence;
- last exact-head CI on `c4e40ceb...`: run `32465835858`, `CI` run 541, completed `success`;
- latest distinct Codex release evidence covers a moved head, not `c4e40ceb...`, and cannot release this PR;
- PR #93 overlaps shared regression/package surfaces with #97 and must be reconciled to the then-current trusted main after #97 ordering is settled.

Required next gate: after #97 has either become a trusted exact-merge dependency or been otherwise safely ordered, reconcile #93 to trusted main, rerun exact-head CI and release-owner review, and obtain a fresh distinct exact-head independent skeptical/security review with no unresolved P0/P1/P2. Simulation remains reference evidence only and does not authorize forwarding or prove external state/effect truth.

### Current control-plane reconciliation lot — post-PR #102

The mandatory post-merge continuation update is being persisted on branch
`docs/pom-rx-checkpoint-after-102-20260821`, based on trusted main `62edca5d...`.
Its owned surfaces are exactly `POM_RX_RESUME_CHECKPOINT.md`, `POM_RX_TASKS.yaml`,
`POM_RX_BLOCKERS.md` and `POM_RX_CAPABILITY_MAP.md`. It changes no runtime
semantics. Its own moving head/CI/review state is deliberately not embedded as
authoritative; read live GitHub before release. Any write invalidates earlier
exact-head CI/review evidence.

## recent_merge_and_post_merge

### PR #102 — trusted control-plane checkpoint

- source head: `dc52051b5691913f34d57c3924a01642b7af10e7`;
- merge SHA: `62edca5dc665642d95f3e115fd60463fffd68947`;
- source-head tree and merge tree: identical, `02a227d1d4e473ec60a022a7fa2ca2454f6d315c`;
- exact-main canonical push CI: run `32489395041`, CI run 605 attempt 1, `success` on the merge SHA;
- decision-time `pom-rx/exact-main-ci`: `success`, same run;
- SpecKit reconciliation: PASS;
- skeptical/falsification: PASS;
- security audit: PASS;
- code quality: PASS;
- optimization: PASS / not runtime-performance-material;
- integration/regression: PASS;
- post-merge verdict: `POST_MERGE_ASSURANCE_PASS`.

PR #102 is therefore a trusted coordination-only dependency. It does not make PR
#97 or PR #93 trusted and does not establish production or real-wallet readiness.

## overlap_and_dependency_rule

PR #93 and PR #97 both touch shared regression/package surfaces. If either merges,
the other must be reconciled to the then-current trusted main and all exact-head
gates rerun. Neither may be used as a trusted dependency until its own exact merge
has a recorded `POST_MERGE_ASSURANCE_PASS`.

The next controlled Wallet Guard end-to-end composition remains blocked on the
trusted completion of the relevant current composition lots. Do not merge a
dependent Tier-B lot on the assumption that an open PR is already trusted.

## current_blockers

1. `PR97_EXACT_HEAD_P1_PROMISE_DRIFT_BEFORE_ASYNC_LAYERS` — fresh distinct independent review on exact head `0efb462...` confirms the exploit remains reachable and the relaxed regression hides it.
2. `PR97_FALSE_PASS_GREEN_CI_32487036517` — CI run 592 is green on exact head `0efb462...`, but this head changes only the test and leaves runtime unchanged; green CI does not override the exact-head P1.
3. `PR97_RELEASE_OWNER_BLOCK_EXACT_HEAD_0EFB462` — NON-INDEPENDENT owner gate blocks the same test-only candidate.
4. `PR97_TRUSTED_MAIN_DRIFT_AFTER_PR102` — PR #97 base remains `0564aecd...` while trusted main is `62edca5d...`; live `mergeable=true` is not reconciliation evidence and the eventual repair must reconcile to trusted main before release.
5. `PR97_HISTORICAL_P1_THREADS_PENDING_VALIDATED_RESOLUTION` — do not resolve historical P1 threads until a final repaired exact head is independently validated.
6. `PR93_TRUSTED_MAIN_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED` — historical base remains stale; live `mergeable=true` is not release evidence.
7. `DAGR_SOURCE_DOCUMENT_MISSING`.
8. `PRODUCTION_TRUST_UNPROVED / REAL_WALLET_NOT_AUTHORIZED`.

## merge_authorization_and_review_rules

The user has standing authorization to merge future POM-RX PRs without per-PR
approval only after the full five-stage gate is satisfied, all applicable
technical/security gates pass, exact-head CI is green, and every required
independent review covers that same exact head with no unresolved P0/P1/P2. The
independent-review waiver remains limited to PR #60 unless explicitly broadened
by the user.

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

1. Finish the bounded post-PR #102 control-plane reconciliation and gate it as a non-Tier-B docs lot.
2. Keep PR #97 blocked on exact head `0efb462...`; do not treat green CI or the relaxed security regression as a repair for the exact-head P1.
3. Repair the Promise-prototype drift/outer-async-layer boundary in runtime code on top of current trusted main, restore/preserve a regression covering the independent exploit, preserve ordinary native-Promise compatibility, then rerun exact-head CI and owner review plus fresh distinct independent review.
4. If #97 later reaches every gate, merge under standing authorization and immediately run exact-merge-SHA post-merge assurance before treating it as trusted.
5. After #97 dependency ordering is trusted, reconcile PR #93 to the then-current trusted main and repeat all exact-head gates.
6. Start no dependent Wallet Guard end-to-end lot until relevant Tier-B dependencies have trusted exact-merge post-merge PASS evidence.
7. Do not begin burner/local-testnet execution without separate explicit human execution-phase authorization.

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
