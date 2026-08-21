# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-21T14:45:00+02:00`

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

- state: `OPEN / NOT_MERGED / MERGEABLE / REPAIR_IMPLEMENTED_AWAITING_FRESH_INDEPENDENT_EXACT_HEAD_VALIDATION`;
- current exact head: `8195c55970be8230f58a5c237430e7371f400dd7`;
- exact base/trusted main: `0564aecd42cf0794894c12842980969ff59c9f73`;
- canonical exact-head CI: run `32482359072`, `CI` run 577, completed `success` on
  this exact head;
- release-owner six-lane review: PASS on this exact head and explicitly
  **NON-INDEPENDENT**, with zero owner P0/P1/P2;
- latest distinct independent security finding remains the prior-head P1 from
  `871cd980cf6c1343336e5d63da78a82a28a8dda3`, `Reject account Proxies before
  thenable assimilation`;
- that attack class is implemented as repaired on `8195c559...`: `providerRead()`
  obtains the direct provider result synchronously, classifies it with the
  module-initialization-captured native `node:util` `types.isPromise` without
  reading result-owned properties, and sends every directly returned non-Promise
  object through shared `captureReferencePlainData()` before any async/thenable
  assimilation boundary;
- CI-wired regression `tests/wallet-guard/provider-result-thenable-boundary.node.test.mjs`
  gives a synchronous `eth_accounts` Array Proxy an attacker-controlled
  `get('then')` substitution and requires zero `then` traps, zero other Proxy
  traps, zero reference-authorization calls and zero sensitive forwarding;
- a genuine native Promise transport remains supported, while upstream thenable
  assimilation already performed internally before native-Promise fulfillment is
  an explicit non-claim;
- a fresh `@codex review` request is recorded for exact head `8195c559...`, but no
  distinct independent review of that exact SHA was present at this checkpoint;
- historical P1 threads remain intentionally unresolved until a fresh distinct
  exact-head review validates the repairs. They are not evidence that the fixed
  code is still known-broken, but they remain a release blocker until verified.

Required next gate: keep the head frozen, obtain a fresh distinct independent
skeptical/security review on `8195c559...`, leave no unresolved P0/P1/P2, then
resolve only the independently validated historical threads. Revalidate exact
head + green CI immediately before any merge. If the independent reviewer finds a
new issue, repair in this PR and repeat every exact-head gate.

### PR #93 — Wallet Guard simulation evidence

- state: `OPEN / NOT_MERGED / UNTRUSTED / RECONCILIATION_REQUIRED`;
- current live head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- current PR base remains historical `818718955c9e4136e9e55754a31be2f1c7b610f8`;
- current mergeability at this checkpoint: `false`;
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

### Current control-plane reconciliation lot

This checkpoint is being persisted through a bounded non-Tier-B documentation PR
based on trusted main `0564aecd...`. Its owned surfaces are exactly
`POM_RX_RESUME_CHECKPOINT.md`, `POM_RX_TASKS.yaml`, `POM_RX_BLOCKERS.md` and
`POM_RX_CAPABILITY_MAP.md`. It changes no runtime semantics. Its own current
head/CI/review state is deliberately not embedded as authoritative because any
write to these files moves that head; read the live PR before release.

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

1. `PR97_FRESH_INDEPENDENT_EXACT_HEAD_VALIDATION_PENDING` — repair is implemented
   and exact-head CI/owner review are green on `8195c559...`, but no fresh
   distinct independent review of this exact head was present at the checkpoint.
2. `PR97_HISTORICAL_P1_THREADS_PENDING_VALIDATED_RESOLUTION` — do not resolve
   historical P1 threads until the exact repaired head is independently validated.
3. `PR93_TRUSTED_MAIN_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED`.
4. `DAGR_SOURCE_DOCUMENT_MISSING`.
5. `PRODUCTION_TRUST_UNPROVED / REAL_WALLET_NOT_AUTHORIZED`.

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

1. Keep PR #97 exact head `8195c559...` frozen while awaiting the requested fresh
   independent review. If it is clean, resolve the independently validated P1
   threads, revalidate head/CI and merge under standing authorization; immediately
   run exact-merge-SHA post-merge assurance.
2. If the independent reviewer finds a new P0/P1/P2 on #97, repair the smallest
   exact attack class, add a CI-wired regression and rerun every moved-head gate.
3. After #97 has trusted post-merge PASS evidence, reconcile PR #93 to the new
   trusted main and obtain fresh exact-head CI, release-owner and distinct
   independent review.
4. Start no dependent Wallet Guard end-to-end lot until the relevant Tier-B
   dependencies have trusted exact-merge post-merge PASS evidence.
5. Do not begin burner/local-testnet execution without separate explicit human
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
