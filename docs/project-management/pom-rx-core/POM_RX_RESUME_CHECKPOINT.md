# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-21T23:33:10+02:00`

Purpose: compact **durable cross-chat continuation state**. The scheduled task may
run in a task conversation separate from any interactive chat, so every run must
reconstruct state from live GitHub plus this repository. Live GitHub wins whenever
a PR head, CI run, review, thread, mergeability signal or merge changes after this
checkpoint.

## trusted_main

`5b40135d660366e463f532d4398f179fbff8c006`

Latest trusted merge: PR #109 — bounded post-PR #108 documentation/control-plane
reconciliation.

PR #109 source head `2a4d9567784dc017ca05981a51a0ecc710b0e0ca`
merged as exact main SHA `5b40135d660366e463f532d4398f179fbff8c006`.
The reviewed source-head tree and merge tree are identical:
`7288f47dba73b835c103fb9c1125829d0c4a49f0`. Exact-head candidate CI run
`32527944250`, `CI` run 653, completed `success`. Canonical exact-main push CI run
`32528213464`, `CI` run 654 attempt 1, completed `success` on the exact merge SHA;
the current `pom-rx/exact-main-ci` status is `success` and targets that run.

PR #109 had release-owner `PASS / NON-INDEPENDENT`, a fresh distinct exact-head
`chatgpt-codex-connector` review explicitly covering `2a4d956778` that found no
major issues, and zero review threads. Exact-merge post-merge assurance was
recorded on PR #109 as `POST_MERGE_ASSURANCE_PASS`: SpecKit,
skeptical/falsification, security, code quality, optimization and
integration/regression all PASS for the bounded documentation/control-plane scope.

PR #109 changed no runtime, protocol, Gate, Witness, verifier, Wallet Guard,
provider, wallet, network, public-site/Vercel or financial-execution semantics.
It is trusted coordination evidence only.

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
Wallet Guard remains an application profile under Blockchain and digital assets
and must not fork those semantics.

These remain reference/prototype properties. Production trusted time, production
issuer/key custody, arbitrary-browser/provider integrity, external execution or
effect truth, distributed filesystem/consensus semantics and real-wallet safety
are not proved.

## open_prs

### PR #97 — Core durable-claim + single-use-Gate composition

- state: `OPEN / NOT_MERGED / BLOCKED_EXACT_HEAD_SECURITY_P1 / TRUSTED_MAIN_RECONCILIATION_REQUIRED`;
- exact head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- historical PR base: `0564aecd42cf0794894c12842980969ff59c9f73`;
- current trusted main: `5b40135d660366e463f532d4398f179fbff8c006`;
- live GitHub revalidation in this cycle reports `mergeable=false`; this is volatile conflict metadata only and is not security/release evidence;
- exact-head canonical CI: run `32487036517`, `CI` run 592, `success`;
- exact-head release-owner verdict: `BLOCK / NON-INDEPENDENT`;
- fresh distinct exact-head Codex P1 remains unresolved and non-outdated: `Reject Promise drift before entering async layers`;
- exact head changes only the Promise-drift regression relative to blocked parent `639b96e7...`; provider/runtime implementation is unchanged and the assertion was relaxed;
- the concrete reproducer poisons inherited `Promise.prototype.constructor` plus `then`; outer awaits in `readProviderSnapshot`, `sampleStableProviderContext`, `sampleTrustedContext` and `request` can assimilate rejected provider reads before the inner validator's failure reaches the caller, substitute stable attacker-controlled context, then permit reference authorization and sensitive forwarding;
- multiple earlier P1 threads remain intentionally unresolved until a final repaired exact head receives fresh independent validation.

Required next repair: do **not** merge, rebase or revive the stale #97 branch
wholesale. After PR #110 is trusted, create the smallest runtime repair from
then-current trusted main. Prevent inherited Promise-prototype drift before outer
async assimilation; restore or replace the CI-wired independent
sensitive-forwarding exploit regression; require the durable capability claim to
succeed before any observer or downstream work so losing contenders cannot enter
security-sensitive paths; preserve fail-closed replay and durable one-winner
semantics; preserve ordinary native-Promise Node/AsyncHooks bookkeeping-symbol
compatibility, direct non-Promise object/function hardened capture, own decorated
native-Promise rejection and zero authorization/forwarding for hostile rejected
transports. Then require exact-head CI, release-owner six-lane PASS, fresh distinct
exact-head independent review and zero unresolved P0/P1/P2 before merge.

### PR #93 — Wallet Guard simulation evidence

- state: `OPEN / NOT_MERGED / UNTRUSTED / RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED`;
- exact head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- historical base: `818718955c9e4136e9e55754a31be2f1c7b610f8`;
- current trusted main: `5b40135d660366e463f532d4398f179fbff8c006`;
- live GitHub revalidation in this cycle reports `mergeable=false`; volatile conflict metadata only, not trusted-main reconciliation or release evidence;
- exact-head canonical CI: run `32465835858`, `CI` run 541, `success`;
- latest distinct Codex review submission found in the PR record covers moved head `03e0201c9f...`, not current `c4e40ceb...`;
- no fresh release-owner or distinct independent release review was found on exact current head `c4e40ceb...`;
- unresolved current/non-outdated P1/P2 threads remain, including exact negative-zero identity, typed-data wrapper normalization, exact-value generic-signature commitment, shared proof canonicalization/hash classes and nested payload capture with saved reflection intrinsics; moved-head fixes do not release this head;
- #93 overlaps shared regression/package surfaces with #97 and remains ordered after trusted #97 dependency state unless a separately reviewed dependency decision changes that order.

Required next gate: only after #97 has trusted exact-merge post-merge PASS evidence
(or a separately reviewed safe dependency order is recorded), reconcile #93 from
the then-current trusted main, rerun exact-head CI and release-owner review,
obtain a fresh distinct exact-head independent skeptical/security review, and
leave no unresolved P0/P1/P2. Simulation remains reference evidence only and does
not authorize forwarding or prove external state/effect truth.

### Current control-plane reconciliation lot — PR #110, post-PR #109

Live GitHub is now at trusted main `5b40135d...`, while the canonical state merged
by PR #109 necessarily described its pre-merge main. PR #110 is therefore the
bounded non-Tier-B documentation/control-plane reconciliation on branch
`docs/pom-rx-checkpoint-after-109-20260821`, created from exact trusted main
`5b40135d...`.

Its exclusive owned surfaces are exactly:

- `docs/project-management/pom-rx-core/POM_RX_RESUME_CHECKPOINT.md`;
- `docs/project-management/pom-rx-core/POM_RX_TASKS.yaml`;
- `docs/project-management/pom-rx-core/POM_RX_BLOCKERS.md`;
- `docs/product/POM_RX_CAPABILITY_MAP.md`.

The lot only reconciles PR #109's trusted exact-merge/post-merge state and current
#97/#93 dependency/blocker facts. It must preserve the PR #97 durable
claim-before-observer/downstream ordering, fail-closed replay and one-winner
repair contract; preserve the mandatory five-stage merge rule; preserve shared
Core versus Wallet Guard ownership; and preserve all production/real-wallet
non-claims. It changes no runtime/security implementation.

PR #110's own moving head/CI/review state is deliberately not self-embedded as
authoritative because a commit cannot truthfully contain its own future SHA.
Re-read live GitHub for PR #110's exact current head before any release decision;
any head move invalidates prior exact-head CI/review evidence.

## recent_merge_and_post_merge

### PR #109 — trusted control-plane checkpoint

- source head: `2a4d9567784dc017ca05981a51a0ecc710b0e0ca`;
- merge SHA: `5b40135d660366e463f532d4398f179fbff8c006`;
- source-head tree and merge tree: identical, `7288f47dba73b835c103fb9c1125829d0c4a49f0`;
- exact-head candidate CI: run `32527944250`, CI run 653, `success`;
- exact-main canonical push CI: run `32528213464`, CI run 654 attempt 1, `success`;
- current `pom-rx/exact-main-ci`: `success`, target run 654;
- release-owner pre-merge: `PASS / NON-INDEPENDENT`;
- distinct exact-head Codex review: no major issues on `2a4d956778`;
- unresolved P0/P1/P2 at merge: none;
- SpecKit reconciliation: PASS;
- skeptical/falsification: PASS;
- security audit: PASS for the documentation scope;
- code quality: PASS;
- optimization: PASS / documentation-scoped;
- integration/regression: PASS;
- post-merge verdict: `POST_MERGE_ASSURANCE_PASS`.

PR #109 is therefore trusted coordination-only evidence. It does not make PR #97
or PR #93 trusted and does not establish production or real-wallet readiness.

## overlap_and_dependency_rule

PR #93 and PR #97 both touch shared regression/package surfaces. If either merges,
the other must be reconciled to the then-current trusted main and all exact-head
gates rerun. Neither may be used as a trusted dependency until its own exact merge
has a recorded `POST_MERGE_ASSURANCE_PASS`.

## current_blockers

1. `CONTROL_PLANE_POST_PR109_RECONCILIATION_REQUIRED` — live trusted main is `5b40135d...`; canonical state must be reconciled through PR #110 before stale entries are used as readiness/dependency evidence.
2. `PR97_EXACT_HEAD_P1_PROMISE_DRIFT_BEFORE_ASYNC_LAYERS` — exact-head distinct review on `0efb462...` confirms the sensitive-forwarding exploit class remains reachable.
3. `PR97_FALSE_PASS_GREEN_CI_32487036517` — CI 592 is green but current head is test-only and runtime remains unchanged.
4. `PR97_RELEASE_OWNER_BLOCK_EXACT_HEAD_0EFB462` — owner gate remains `BLOCK / NON-INDEPENDENT`.
5. `PR97_TRUSTED_MAIN_RECONCILIATION_REQUIRED_AFTER_PR109` — historical base `0564aecd...` trails trusted main `5b40135d...`; live mergeability is volatile metadata only.
6. `PR97_HISTORICAL_P1_THREADS_PENDING_VALIDATED_RESOLUTION`.
7. `PR93_TRUSTED_MAIN_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED` — stale base, moved-head review evidence and unresolved current/non-outdated P1/P2 history remain.
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

After every merge, run exact-merge-SHA SpecKit reconciliation,
skeptical/falsification, security audit, code-quality review, optimization review
and integration/regression. Record exactly one scoped final verdict:
`POST_MERGE_ASSURANCE_PASS`, `POST_MERGE_ASSURANCE_CONDITIONAL` or
`POST_MERGE_ASSURANCE_BLOCK`. A non-PASS merge is not a trusted dependency and
must be repaired through a new PR, never direct `main`.

## next_safe_actions

1. Gate PR #110 as the bounded post-PR #109 non-Tier-B docs lot. Do not use it as trusted coordination evidence until its exact merge receives post-merge PASS.
2. Keep PR #97 blocked; do not merge exact head `0efb462...` or treat CI 592 as a security repair.
3. After PR #110 is trusted, create the smallest fresh #97 runtime repair from then-current trusted main for Promise-prototype drift before outer async assimilation while preserving durable claim-before-observer/downstream ordering; do not merge the stale historical branch wholesale.
4. Restore/replace the exact exploit regression, rerun exact-head CI, owner six-lane review and fresh distinct independent skeptical/security review, and resolve only findings validated on that exact head.
5. If repaired #97 passes every gate, merge under standing authorization and immediately run exact-merge-SHA post-merge assurance.
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
