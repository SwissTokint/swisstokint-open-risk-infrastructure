# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-21T21:18:00+02:00`

Purpose: compact **durable cross-chat continuation state**. The scheduled task may
run in a task conversation separate from any interactive chat, so every run must
reconstruct state from live GitHub plus this repository. Live GitHub wins whenever
a PR head, CI run, review, thread, mergeability signal or merge changes after this
checkpoint.

## trusted_main

`de69d066239891f0f2c08384a9f14167d0e30373`

Latest trusted merge: PR #107 — bounded post-PR #106 control-plane
reconciliation.

PR #107 source head `9558bc0f27e1e15f89f7a39c4e0612236ce8ed1c`
merged as exact main SHA `de69d066239891f0f2c08384a9f14167d0e30373`.
The reviewed source-head tree and merge tree are identical:
`89827f54578550e538f6394b91be0f2a6d89107d`. Exact-head candidate CI run
`32512894709`, `CI` run 638, completed `success` before merge. Canonical
exact-main push CI run `32517285170`, `CI` run 639 attempt 1, completed `success`
on the exact merge SHA. Decision-time `pom-rx/exact-main-ci` is `success` and
targets that exact run.

PR #107 had a release-owner `PASS / NON-INDEPENDENT`, no review threads, and a
fresh distinct `chatgpt-codex-connector` exact-head review on `9558bc0...` stating
that no major issues were found. The first post-merge report was conditional only
while exact-main CI 639 was running; after CI completed successfully the report was
promoted on PR #107 to `POST_MERGE_ASSURANCE_PASS`. SpecKit reconciliation,
skeptical/falsification, security, code quality, optimization and
integration/regression are PASS for the bounded documentation/control-plane
scope.

PR #107 changed no runtime, protocol, Gate, Witness, verifier, Wallet Guard,
provider, wallet, network, public-site/Vercel or financial-execution semantics. It
is trusted coordination evidence only.

## repository architecture present on trusted main

Trusted main contains the activated bounded strict profile while preserving
historical `pom-rx/0.1`, common exact authorization, a process-local single-use
Gate, shared bounded hostile-object/plain-data capture, process-local Witness
trust lifecycle, a separate filesystem durable claim primitive, reference
execution evidence, reference observation/reconciliation, merged Wallet Guard
JSON/intent/effect/policy/controller/preflight/Witness-adapter/provider/
controlled-host layers, exact-main CI observability, and the GitHub-backed
cross-chat POM-RX control plane.

Shared canonicalization, hashing, verifier, Witness, exact authorization, Gate,
execution-evidence and observation/reconciliation semantics remain Core-owned.
Wallet Guard remains an application profile under blockchain/digital-assets and
must not fork those semantics.

These remain reference/prototype properties. Production trusted time, production
issuer/key custody, arbitrary-browser/provider integrity, external execution or
effect truth, distributed filesystem/consensus semantics and real-wallet safety
are not proved.

## open_prs

### PR #97 — Core durable-claim + single-use-Gate composition

- state: `OPEN / NOT_MERGED / LIVE_MERGEABLE_FALSE_SIGNAL_ONLY / BLOCKED_EXACT_HEAD_SECURITY_P1 / TRUSTED_MAIN_RECONCILIATION_REQUIRED`;
- exact head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- PR base SHA: `0564aecd42cf0794894c12842980969ff59c9f73`;
- current trusted main: `de69d066239891f0f2c08384a9f14167d0e30373`;
- latest live GitHub revalidation reports `mergeable=false`; this is volatile conflict/mergeability metadata only and does not establish reconciliation, security correctness or release readiness;
- exact-head canonical CI: run `32487036517`, `CI` run 592, `success`;
- exact-head release-owner verdict: `BLOCK / NON-INDEPENDENT`;
- exact-head distinct Codex finding: P1 `Reject Promise drift before entering async layers`;
- exact head changes only the Promise-drift regression relative to independently blocked parent `639b96e7...`; provider/runtime implementation is unchanged and the assertion was relaxed, creating false-PASS risk;
- the exact-head reproducer poisons inherited `Promise.prototype.constructor` plus `then`; outer awaits in `readProviderSnapshot`, `sampleStableProviderContext`, `sampleTrustedContext` and `request` can assimilate rejected provider reads before the inner transport rejection reaches the caller, substitute stable attacker-controlled context, then permit reference authorization and sensitive forwarding;
- the current exact-head P1 thread remains unresolved and non-outdated. Earlier P1 threads also remain unresolved pending final repaired exact-head independent validation.

Required next repair: do **not** merge or revive the stale #97 branch wholesale.
Create the smallest runtime repair from the then-current trusted main after this
control-plane checkpoint is trusted. Prevent inherited Promise-prototype drift
from being consulted before fail-closed rejection in outer async layers. Restore
or replace the CI-wired regression for the independent sensitive-forwarding
exploit. Preserve ordinary native-Promise Node/AsyncHooks bookkeeping-symbol
compatibility, direct non-Promise object/function hardened capture, own decorated
native-Promise rejection, durable one-winner semantics and zero authorization/
forwarding for hostile rejected transports. Then require exact-head CI,
release-owner six-lane PASS, fresh distinct exact-head independent review and no
unresolved P0/P1/P2 before merge.

### PR #93 — Wallet Guard simulation evidence

- state: `OPEN / NOT_MERGED / LIVE_MERGEABLE_FALSE_SIGNAL_ONLY / UNTRUSTED / RECONCILIATION_REQUIRED`;
- exact head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- historical base: `818718955c9e4136e9e55754a31be2f1c7b610f8`;
- current trusted main: `de69d066239891f0f2c08384a9f14167d0e30373`;
- latest live GitHub revalidation reports `mergeable=false`; this is volatile conflict/mergeability metadata only and is not trusted-main reconciliation, security review or release evidence;
- last exact-head canonical CI: run `32465835858`, `CI` run 541, `success`;
- latest distinct Codex review submission covers moved head `03e0201c9f...`, not current `c4e40ceb...`;
- no fresh release-owner or distinct independent review was found on exact current head `c4e40ceb...`;
- unresolved current/non-outdated P1/P2 review threads remain, including `Capture Object.is before encoding negative zero`, typed-data wrapper normalization, exact-value generic signature commitments, shared proof canonicalization/hash classes and `Capture nested payloads with saved reflection intrinsics`;
- moved-head fixes and reviews are useful history but are not exact-head release evidence;
- #93 overlaps shared regression/package surfaces with #97 and remains ordered after trusted #97 dependency state.

Required next gate: only after #97 has a trusted exact-merge post-merge PASS (or a
separately reviewed safe dependency ordering is established), reconcile #93 to
the then-current trusted main, rerun exact-head CI and release-owner review,
obtain a fresh distinct exact-head independent skeptical/security review, and
leave no unresolved P0/P1/P2. Simulation remains reference evidence only and does
not authorize forwarding or prove external state/effect truth.

### Current control-plane reconciliation lot — post-PR #107

The mandatory continuation update is being persisted on branch
`docs/pom-rx-checkpoint-after-107-20260821`, based on trusted main `de69d066...`.
Its owned surfaces are exactly `POM_RX_RESUME_CHECKPOINT.md`, `POM_RX_TASKS.yaml`,
`POM_RX_BLOCKERS.md` and `POM_RX_CAPABILITY_MAP.md`. It changes no runtime
semantics. Its own moving head/CI/review state is deliberately not embedded as
authoritative; re-read live GitHub before release. Any write invalidates earlier
exact-head CI/review evidence.

## recent_merge_and_post_merge

### PR #107 — trusted control-plane checkpoint

- source head: `9558bc0f27e1e15f89f7a39c4e0612236ce8ed1c`;
- merge SHA: `de69d066239891f0f2c08384a9f14167d0e30373`;
- source-head tree and merge tree: identical, `89827f54578550e538f6394b91be0f2a6d89107d`;
- exact-head candidate CI: run `32512894709`, CI run 638, `success`;
- exact-main canonical push CI: run `32517285170`, CI run 639 attempt 1, `success`;
- decision-time `pom-rx/exact-main-ci`: `success`, target run 639;
- release-owner pre-merge: `PASS / NON-INDEPENDENT`;
- distinct exact-head Codex review: no major issues on `9558bc0...`;
- unresolved review threads: none;
- SpecKit reconciliation: PASS;
- skeptical/falsification: PASS;
- security audit: PASS;
- code quality: PASS;
- optimization: PASS / not runtime-performance-material;
- integration/regression: PASS;
- post-merge verdict: `POST_MERGE_ASSURANCE_PASS`.

PR #107 is therefore trusted coordination-only evidence. It does not make PR #97
or PR #93 trusted and does not establish production or real-wallet readiness.

## overlap_and_dependency_rule

PR #93 and PR #97 both touch shared regression/package surfaces. If either merges,
the other must be reconciled to the then-current trusted main and all exact-head
gates rerun. Neither may be used as a trusted dependency until its own exact merge
has a recorded `POST_MERGE_ASSURANCE_PASS`.

The next controlled Wallet Guard end-to-end composition remains blocked on the
trusted completion of the relevant current composition lots. Do not merge a
dependent Tier-B lot on the assumption that an open PR is already trusted.

## current_blockers

1. `PR97_EXACT_HEAD_P1_PROMISE_DRIFT_BEFORE_ASYNC_LAYERS` — exact-head distinct review on `0efb462...` confirms the sensitive-forwarding exploit class remains reachable.
2. `PR97_FALSE_PASS_GREEN_CI_32487036517` — CI 592 is green but current head is test-only and runtime remains unchanged.
3. `PR97_RELEASE_OWNER_BLOCK_EXACT_HEAD_0EFB462` — owner gate remains BLOCK / NON-INDEPENDENT.
4. `PR97_TRUSTED_MAIN_RECONCILIATION_REQUIRED_AFTER_PR107` — base `0564aecd...` trails trusted main `de69d066...`; live `mergeable=false` is volatile metadata only.
5. `PR97_HISTORICAL_P1_THREADS_PENDING_VALIDATED_RESOLUTION`.
6. `PR93_TRUSTED_MAIN_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED` — stale base, current `mergeable=false` signal only, moved-head review evidence and unresolved current/non-outdated P1/P2 history.
7. `DAGR_SOURCE_DOCUMENT_MISSING`.
8. `PRODUCTION_TRUST_UNPROVED / REAL_WALLET_NOT_AUTHORIZED`.

## merge_authorization_and_review_rules

Standing authorization permits a POM-RX merge without per-PR confirmation only
after the full five-stage pre-merge gate, all applicable technical/security
gates, exact-head CI, and every required distinct exact-head independent review
pass with no unresolved P0/P1/P2. The independent-review waiver remains limited
to PR #60 unless explicitly broadened.

Release-owner/Prime/self-review is NON-INDEPENDENT. A fresh
`chatgpt-codex-connector` review may satisfy the independent lane only when it
actually covers the exact current candidate SHA and leaves no unresolved
P0/P1/P2. Moved-head review evidence never releases a changed head.

After every merge, run exact-merge-SHA SpecKit reconciliation,
skeptical/falsification, security audit, code-quality review, optimization review
and integration/regression. Record exactly one scoped final verdict:
`POST_MERGE_ASSURANCE_PASS`, `POST_MERGE_ASSURANCE_CONDITIONAL` or
`POST_MERGE_ASSURANCE_BLOCK`. A non-PASS merge is not a trusted dependency and
must be repaired through a new PR, never direct `main`.

## next_safe_actions

1. Gate this bounded post-PR #107 control-plane reconciliation as a non-Tier-B docs lot; do not use its future state as trusted until exact-merge post-merge PASS.
2. Keep PR #97 blocked; do not merge exact head `0efb462...` or treat CI 592 as a security repair.
3. After this control-plane checkpoint is trusted, create the smallest fresh #97 runtime repair from then-current trusted main for Promise-prototype drift before outer async assimilation; do not merge the stale historical branch wholesale.
4. Restore/replace the exact exploit regression, rerun exact-head CI, owner six-lane review and fresh distinct independent skeptical/security review, and resolve only findings validated on that exact head.
5. If the repaired #97 passes every gate, merge under standing authorization and immediately run exact-merge-SHA post-merge assurance.
6. Reconcile #93 only after #97 dependency ordering is trusted, then repeat all exact-head gates.
7. Start no dependent Wallet Guard E2E lot until relevant Tier-B dependencies have trusted exact-merge post-merge PASS evidence.
8. Do not begin burner/local-testnet execution without separate explicit human authorization.

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
