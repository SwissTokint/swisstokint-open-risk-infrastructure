# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-21T11:52:00+02:00`

Purpose: compact **durable cross-chat continuation state**. The scheduled task may
run in an associated task conversation separate from an interactive chat, so no
future run may depend on conversation history alone. Live GitHub wins over this
file whenever a PR head, CI run, review or merge changes after this checkpoint.

## trusted_main

`6a6ff5c2621e63e007a31b2c55eb2bfde2082d16`

Latest trusted merge: PR #99 — post-PR #98 durable checkpoint reconciliation.

PR #99 source head `899ae6f1cea6f44e32f5bf89ac9b1b221c6aeec0` merged as exact
main SHA `6a6ff5c2621e63e007a31b2c55eb2bfde2082d16`. Its mandatory
exact-merge post-merge assurance is recorded `POST_MERGE_ASSURANCE_PASS` on PR
#99. Canonical push CI run `32469503160`, workflow `.github/workflows/ci.yml`,
run 556 attempt 1, completed `success` on that exact merge SHA, and the
`pom-rx/exact-main-ci` status points to the same run. Decision-time freshness
revalidation remains mandatory for every future exact-main PASS.

The current branch is a separate non-Tier-B documentation checkpoint whose only
purpose is to persist this post-#99 state into the same canonical control plane.
It changes no protocol/runtime/security semantics. Read this reconciliation
branch/PR's own head, CI and review state from live GitHub rather than embedding
a self-referential authoritative branch SHA in this file.

## repository architecture present on trusted main

Trusted main contains the activated bounded strict profile while preserving
historical `pom-rx/0.1`, common exact authorization, a process-local single-use
Gate, shared bounded hostile-object/plain-data capture, process-local Witness
trust lifecycle, a separate filesystem durable claim primitive, reference
execution evidence, reference observation/reconciliation, the merged Wallet
Guard JSON/intent/effect/policy/controller/preflight/Witness-adapter/provider/controlled-host layers,
and the GitHub-backed cross-chat POM-RX control plane.

These are reference/prototype properties. They do not prove production trusted
time, production issuer/key custody, arbitrary-browser/provider integrity,
external execution/effect truth, distributed filesystem/consensus semantics or
real-wallet safety.

## open_prs

### PR #93 — Wallet Guard simulation evidence

- state: `OPEN / NOT_MERGED / MERGEABLE` at the last live revalidation;
- current checkpoint head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- exact-head CI: run `32465835858`, `success`;
- release state: `BLOCKED_FRESH_EXACT_HEAD_INDEPENDENT_REVIEW`;
- the latest distinct Codex review available for release evidence covers a moved
  earlier head, not `c4e40ceb...`; the current branch includes later shared
  plain-data/reflection hardening and regressions but still needs a fresh
  independent review on its actual current head;
- prior release-owner/self reviews are NON-INDEPENDENT and moved-head reviews
  cannot release this head.

Next safe action: obtain a fresh distinct independent skeptical/security review
on the actual PR #93 head after reconciling any material base/overlap drift to
trusted main. Any head move invalidates exact-head CI/review evidence.

### PR #97 — Core durable-claim + single-use-Gate composition

- state: `OPEN / NOT_MERGED / MERGEABLE` at the last live revalidation;
- current checkpoint head: `1f228dab6c5a2c0ac2ac9952d8d52978ba44b780`;
- exact-head CI: run `32464344634`, `success`;
- release state: `BLOCKED_UNRESOLVED_EXACT_HEAD_P1`;
- a fresh independent Codex review covers this exact head and reports a P1 in
  provider account normalization: a provider-controlled `eth_accounts` Array
  Proxy or decorated array can mutate/redirect `Array.prototype.map` after the
  integrity check, substitute the active account, and still reach authorization
  and sensitive forwarding;
- the release-owner exact-head PASS is explicitly NON-INDEPENDENT and does not
  close that P1.

Next safe action: repair provider-controlled account-array capture/rejection in
PR #97 using the shared inert plain-data boundary, add a regression proving zero
hostile trap dispatch, zero authorization and zero sensitive forwarding, reconcile
to current trusted main, rerun exact-head CI and repeat release-owner plus fresh
independent exact-head review.

## recent_merge_and_post_merge

### PR #99 — post-PR #98 durable checkpoint reconciliation

- source head: `899ae6f1cea6f44e32f5bf89ac9b1b221c6aeec0`;
- merge SHA: `6a6ff5c2621e63e007a31b2c55eb2bfde2082d16`;
- exact-main CI: run `32469503160`, `success`;
- `pom-rx/exact-main-ci`: `success`, same run;
- source-head to merge-tree comparison: no changed files;
- post-merge verdict: `POST_MERGE_ASSURANCE_PASS`;
- SpecKit reconciliation: PASS;
- skeptical/falsification: PASS;
- security audit: PASS;
- code quality: PASS;
- optimization: PASS;
- integration/regression: PASS.

PR #99 is therefore a trusted non-runtime/control-plane dependency. It did not
alter the release state of PR #93 or PR #97 and did not establish production or
real-wallet readiness.

## overlap_and_dependency_rule

PR #93 and PR #97 both touch shared regression/package surfaces. If either merges,
the other must be reconciled to the then-current trusted main and all exact-head
gates rerun. Neither may be used as a trusted dependency until its own merge has
a recorded `POST_MERGE_ASSURANCE_PASS`.

The next controlled Wallet Guard end-to-end composition remains blocked on the
trusted completion of the relevant current composition lots; do not start a
dependent Tier-B merge that assumes either open PR is already trusted.

## current_blockers

1. `PR93_FRESH_EXACT_HEAD_INDEPENDENT_REVIEW_REQUIRED`.
2. `PR97_UNRESOLVED_EXACT_HEAD_P1_ACCOUNT_ARRAY_CAPTURE`.
3. `DAGR_SOURCE_DOCUMENT_MISSING`.
4. `PRODUCTION_TRUST_UNPROVED / REAL_WALLET_NOT_AUTHORIZED`.

The prior post-PR #98 checkpoint blocker is resolved by merged PR #99 with exact
post-merge PASS. The current documentation branch merely persists that new
trusted-main fact and is not a new runtime dependency.

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

1. Finish the current scoped post-#99 checkpoint PR only after applicable
   exact-head documentation gates; if merged, immediately run exact-merge
   post-merge assurance before treating it as trusted.
2. Repair PR #97's exact-head account-array P1 without weakening shared Core or
   Wallet Guard boundaries; reconcile it to current trusted main and repeat all
   invalidated exact-head gates.
3. Revalidate PR #93 through a fresh distinct independent exact-head review after
   required main reconciliation.
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
