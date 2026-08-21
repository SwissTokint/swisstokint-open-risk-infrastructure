# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-21T14:20:00+02:00`

Purpose: compact **durable cross-chat continuation state**. The scheduled task may
run in an associated task conversation separate from an interactive chat, so no
future run may depend on conversation history alone. Live GitHub wins over this
file whenever a PR head, CI run, review or merge changes after this checkpoint.

## trusted_main

`33986b33b9e8bc40030d940618e5c9df6f8b3fe6`

Latest trusted merge: PR #100 — post-PR #99 durable checkpoint reconciliation.

PR #100 source head `8924c5357b4299daa74d7e52cb8d20102641d929`
merged as exact main SHA `33986b33b9e8bc40030d940618e5c9df6f8b3fe6`.
Canonical push CI run `32480810161`, workflow `.github/workflows/ci.yml`, CI run
570 attempt 1, completed `success` on that exact merge SHA. Decision-time
revalidation showed `pom-rx/exact-main-ci = success` targeting the same run. The
mandatory exact-merge report is recorded on PR #100 with final verdict
`POST_MERGE_ASSURANCE_PASS`: SpecKit reconciliation, skeptical/falsification,
security, code quality, optimization and integration/regression all PASS for the
bounded documentation/control-plane scope.

PR #100 changed no runtime, protocol, Gate, Witness, verifier, Wallet Guard,
provider, wallet, network or financial-execution semantics. Its merge tree is
identical to the exact reviewed source-head tree.

## repository architecture present on trusted main

Trusted main contains the activated bounded strict profile while preserving
historical `pom-rx/0.1`, common exact authorization, a process-local single-use
Gate, shared bounded hostile-object/plain-data capture, process-local Witness
trust lifecycle, a separate filesystem durable claim primitive, reference
execution evidence, reference observation/reconciliation, the merged Wallet
Guard JSON/intent/effect/policy/controller/preflight/Witness-adapter/provider/controlled-host layers,
exact-main CI observability, and the GitHub-backed cross-chat POM-RX control
plane.

These are reference/prototype properties. They do not prove production trusted
time, production issuer/key custody, arbitrary-browser/provider integrity,
external execution/effect truth, distributed filesystem/consensus semantics or
real-wallet safety.

## open_prs

### PR #97 — Core durable-claim + single-use-Gate composition

- state: `OPEN / NOT_MERGED / MERGEABLE / BLOCKED_UNRESOLVED_P1` at the last live
  revalidation;
- current checkpoint head: `39186dcc8e2fe7c176495d8a4ad654215dbce637`;
- reconciled base/trusted main: `33986b33b9e8bc40030d940618e5c9df6f8b3fe6`;
- reconciliation commit `39186dcc...` has parents prior #97 head `871cd980...`
  and trusted main `33986b33...`; it overlays the four canonical control-plane
  files from trusted main and preserves the bounded Tier-B implementation diff;
- canonical exact-head CI run `32481196464`, `CI` run 571, was `in_progress` at
  the last revalidation. Because the head moved, every older exact-head CI,
  release-owner and independent-review result is stale for release;
- the last distinct independent review on prior exact head
  `871cd980cf6c1343336e5d63da78a82a28a8dda3` found P1
  `Reject account Proxies before thenable assimilation`;
- attack: `providerRead()` awaits a raw synchronously returned provider object
  before hardened inert capture. Promise/thenable assimilation can therefore
  execute a result-owned `get('then')` trap, substitute an attacker-controlled
  account array, remain stable across sampling, reach reference authorization and
  reach sensitive forwarding;
- release state: `BLOCKED_UNRESOLVED_P1_THENABLE_ASSIMILATION`.

Required next repair: synchronously classify the direct `provider.request()`
return without property dispatch, safely snapshot any non-Promise object result
through the shared hardened plain-data boundary before crossing an async boundary,
and only await genuine Promise transport values. Add a CI-wired exact attack
regression whose `eth_accounts` Array Proxy has a `get('then')` trap attempting to
resolve to the attacker account; require zero result-owned trap execution, zero
reference-authorization calls and zero sensitive forwarding. Preserve prior
Proxy/decorated-array, intrinsic-poisoning, replay and durable-Gate regressions.
Then freeze the repaired head and rerun exact-head CI, release-owner six-lane
review and a fresh distinct independent skeptical/security review. No unresolved
P0/P1/P2 may remain before merge.

### PR #93 — Wallet Guard simulation evidence

- state: `OPEN / NOT_MERGED` and untrusted;
- current checkpoint head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- last known exact-head CI on that head: run `32465835858`, `success`;
- release state: `BLOCKED_FRESH_EXACT_HEAD_INDEPENDENT_REVIEW_AND_RECONCILIATION`;
- the latest distinct Codex review available for release evidence covers moved
  head `03e0201c9fef5ed10a615996d68052613bdd94d6`, not the current checkpoint
  head. Moved-head reviews and release-owner/self reviews cannot release #93;
- #93 overlaps shared regression/package surfaces with #97. It must be reconciled
  to the then-current trusted main after the relevant composition work before any
  merge decision.

Next safe action for #93 remains fresh trusted-main reconciliation followed by
exact-head CI, release-owner review and a distinct exact-head independent review
with no unresolved P0/P1/P2. Simulation remains reference evidence only and does
not itself authorize forwarding or prove external effects.

### Control-plane continuation PR after #100

This checkpoint update is intentionally being persisted through a new bounded
non-Tier-B documentation branch based on trusted main `33986b33...`; live GitHub
must be consulted for its final PR number/head/CI/review state because embedding
its own moving head in this file would be self-invalidating. Its owned surfaces
remain exactly the existing canonical checkpoint/task/blocker/capability files.
It changes no runtime semantics.

## recent_merge_and_post_merge

### PR #100 — post-PR #99 durable checkpoint reconciliation

- source head: `8924c5357b4299daa74d7e52cb8d20102641d929`;
- merge SHA: `33986b33b9e8bc40030d940618e5c9df6f8b3fe6`;
- source-head tree and merge tree: identical,
  `b14b8d23636d71781629fe440d412a84d87bdc0d`;
- exact-main canonical push CI: run `32480810161`, CI run 570 attempt 1,
  `success` on the merge SHA;
- `pom-rx/exact-main-ci`: `success`, targeting run `32480810161` at decision time;
- SpecKit reconciliation: PASS;
- skeptical/falsification: PASS;
- security audit: PASS;
- code quality: PASS;
- optimization: PASS / not runtime-performance-material;
- integration/regression: PASS;
- post-merge verdict: `POST_MERGE_ASSURANCE_PASS`.

PR #100 is therefore a trusted coordination-only dependency. It did not make PR
#97 or PR #93 trusted and did not establish production or real-wallet readiness.

## overlap_and_dependency_rule

PR #93 and PR #97 both touch shared regression/package surfaces. If either merges,
the other must be reconciled to the then-current trusted main and all exact-head
gates rerun. Neither may be used as a trusted dependency until its own merge has
a recorded `POST_MERGE_ASSURANCE_PASS`.

The next controlled Wallet Guard end-to-end composition remains blocked on the
trusted completion of the relevant current composition lots; do not start a
dependent Tier-B merge that assumes either open PR is already trusted.

## current_blockers

1. `PR97_UNRESOLVED_P1_THENABLE_ASSIMILATION` — current reconciled head
   `39186dcc...` still contains the independent P1 found on prior exact head
   `871cd980...`; the reconciliation does not repair it.
2. `PR97_MOVED_HEAD_GATES_INVALIDATED` — current exact-head CI run `32481196464`
   was still in progress at the last revalidation; older owner/independent review
   evidence cannot release the moved head.
3. `PR93_FRESH_EXACT_HEAD_INDEPENDENT_REVIEW_AND_RECONCILIATION_REQUIRED`.
4. `DAGR_SOURCE_DOCUMENT_MISSING`.
5. `PRODUCTION_TRUST_UNPROVED / REAL_WALLET_NOT_AUTHORIZED`.

## merge_authorization_and_review_rules

The user has standing authorization to merge future POM-RX PRs without asking
for per-PR approval only after the **full five-stage gate is satisfied**, all
applicable technical/security gates pass, exact-head CI is green, and every
required independent review covers that same exact head with no unresolved
P0/P1/P2. The independent-review waiver remains limited to PR #60 unless the
user explicitly broadens it.

Release-owner/Prime/self-review is NON-INDEPENDENT. A fresh
`chatgpt-codex-connector` review may satisfy the independent lane only when it
actually covers the exact current candidate SHA and leaves no unresolved
P0/P1/P2. Never invent reviewer identity or reuse a moved-head review as release
evidence.

After every merge, run the exact-merge-SHA post-merge sequence: SpecKit
reconciliation, skeptical/falsification, security audit, code-quality review,
optimization review and integration/regression. Record exactly one scoped final
verdict: `POST_MERGE_ASSURANCE_PASS`, `POST_MERGE_ASSURANCE_CONDITIONAL` or
`POST_MERGE_ASSURANCE_BLOCK`. A non-PASS merge is not a trusted dependency and
is repaired through a new PR, never direct `main`.

## next_safe_actions

1. Repair PR #97's provider-result thenable-assimilation P1 on top of trusted main
   `33986b33...`; add the exact adversarial regression and repeat every invalidated
   exact-head gate.
2. If #97 reaches exact-head CI PASS, release-owner PASS and fresh distinct
   independent exact-head PASS with no unresolved P0/P1/P2, merge under standing
   authorization and immediately run exact-merge-SHA post-merge assurance.
3. Reconcile PR #93 to the then-current trusted main only after the shared
   composition dependency ordering is safe, then obtain fresh exact-head gates.
4. Start no dependent Wallet Guard end-to-end lot until the relevant Tier-B
   dependencies have trusted exact-merge post-merge PASS evidence.
5. Do not begin burner/local-testnet execution without a separate explicit human
   execution-phase authorization.

## safety_boundary

No private key, seed, secret, funded-wallet credential, real/funded wallet,
mainnet transaction, meaningful funds or uncontrolled malicious-site interaction
is authorized. No site/Vercel/funding-directory write belongs to this control
plane. Burner local/testnet E2E remains behind a separate explicit human gate.

## operational_claim_boundary

Target remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic,
synthetic and bounded. It is not production readiness, an audit, certification,
wallet safety, financial safety or deployment authorization.
