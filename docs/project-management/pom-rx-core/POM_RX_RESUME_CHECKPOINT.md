# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-21T11:30:00+02:00`

Purpose: compact **durable cross-chat continuation state**. The scheduled task may
run in an associated task conversation separate from an interactive chat, so no
future run may depend on conversation history alone. Live GitHub wins over this
file whenever a PR head, CI run, review or merge changes after this checkpoint.

## trusted_main

`1abe57f8baea8dd6844cc8ea9e321c05ec01538f`

Latest trusted merge: PR #98 — durable cross-chat POM-RX control-plane
continuity reconciliation.

PR #98 source head was
`47bcc2129dc88c97b0d8d42434b42cee82855861`; merge SHA is
`1abe57f8baea8dd6844cc8ea9e321c05ec01538f`. Its source-head and merge trees are
identical (`a5ba1c663b1f21794200f5f4c32720db26136fbc`). Canonical exact-merge push
CI run `32467712934` (`.github/workflows/ci.yml`, run 552 attempt 1, event
`push`) completed `success` on the exact merge SHA, and
`pom-rx/exact-main-ci` reported `success` targeting that same run after
decision-time freshness revalidation. The mandatory exact-merge review families
— SpecKit reconciliation, skeptical/falsification, security audit, code quality,
optimization and integration/regression — are recorded on PR #98 with final
verdict `POST_MERGE_ASSURANCE_PASS`.

Trusted main therefore includes the GitHub-backed continuity policy, reconciled
active task/blocker model and exact-main CI observability surface. Every later
merge still requires its own exact-merge-SHA post-merge assurance.

## repository architecture present on trusted main

Trusted main contains the activated bounded strict profile while preserving
historical `pom-rx/0.1`, common exact authorization, a process-local single-use
Gate, shared bounded hostile-object/plain-data capture, process-local Witness
trust lifecycle, a separate filesystem durable claim primitive, reference
execution evidence, reference observation/reconciliation, and the merged Wallet
Guard JSON/intent/effect/policy/controller/preflight/Witness-adapter/provider /
controlled-host layers.

These are reference/prototype properties. They do not prove production trusted
time, production issuer/key custody, arbitrary-browser/provider integrity,
external execution/effect truth, distributed filesystem/consensus semantics or
real-wallet safety.

## open_prs

### PR #93 — Wallet Guard simulation evidence

- state: `OPEN / NOT_MERGED`; GitHub currently reports it non-mergeable against
  the newly advanced `main`, so it must be reconciled rather than merged stale;
- live head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- recorded exact-head CI before the main advance: run `32465835858`, `success`;
- release state: `BLOCKED_RECONCILE_CURRENT_MAIN_AND_FRESH_EXACT_HEAD_REVIEW`;
- the latest distinct Codex review available for the simulation repair still
  covers moved head `03e0201c9fef5ed10a615996d68052613bdd94d6`, where it found a
  P1 in nested typed-data capture. The current branch includes later shared
  snapshot/regression changes, but those are not release evidence without a
  fresh exact-head independent review;
- prior release-owner reviews are NON-INDEPENDENT and moved-head reviews cannot
  release a reconciled head.

Next safe action for this workstream: reconcile only the useful simulation lot
against trusted main `1abe57f8...`, preserving current Core/control-plane state,
then rerun exact-head CI and obtain release-owner plus fresh distinct independent
skeptical/security review on the new exact head.

### PR #97 — Core durable-claim + single-use-Gate composition

- state: `OPEN / NOT_MERGED`; GitHub currently reports it non-mergeable against
  the newly advanced `main`, so stale-branch merge is forbidden;
- exact current head: `1f228dab6c5a2c0ac2ac9952d8d52978ba44b780`;
- recorded exact-head CI before the main advance: run `32464344634`, `success`;
- release state: `BLOCKED_UNRESOLVED_EXACT_HEAD_P1_AND_MAIN_RECONCILIATION`;
- the fresh independent Codex review on exact head `1f228dab...` reports a P1 in
  provider account normalization: an `eth_accounts` Array Proxy or decorated
  array can mutate/dispatch through `map` after the integrity check, substitute
  the active account and still reach authorization/sensitive forwarding;
- the release-owner exact-head PASS is NON-INDEPENDENT and does not close that
  P1. Historical P1 threads on older heads also remain review history, not proof
  for a future reconciled head.

Next safe action: repair provider-controlled account-array capture/rejection,
reconcile the bounded useful lot to current trusted main without overwriting the
merged control plane, add a zero-trap/zero-authorization/zero-sensitive-forwarding
regression, then rerun exact-head CI and repeat release-owner plus fresh
independent review.

## overlap_and_dependency_rule

PR #93 and PR #97 both touch shared regression/package/reference-data surfaces.
Do not merge either historical branch wholesale. Reconcile each useful bounded
lot onto current trusted main independently. If one later merges, the other must
again reconcile to the then-current trusted main and rerun all exact-head gates.
Neither becomes a trusted dependency until its own exact merge has a recorded
`POST_MERGE_ASSURANCE_PASS`.

The controlled Wallet Guard end-to-end composition remains blocked on trusted
completion of the relevant simulation and Gate-composition lots.

## current_blockers

1. `PR93_RECONCILE_CURRENT_MAIN_AND_FRESH_EXACT_HEAD_INDEPENDENT_REVIEW`.
2. `PR97_UNRESOLVED_ACCOUNT_ARRAY_P1_AND_CURRENT_MAIN_RECONCILIATION`.
3. `DAGR_SOURCE_DOCUMENT_MISSING`.
4. `PRODUCTION_TRUST_UNPROVED / REAL_WALLET_NOT_AUTHORIZED`.

The former PR #98 control-plane blocker is closed. PR #98 is merged at
`1abe57f8...` with `POST_MERGE_ASSURANCE_PASS`.

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

1. Treat PR #98 / main `1abe57f8...` as trusted after its exact-merge PASS.
2. Repair and reconcile PR #97's active independent P1 as the next smallest
   dependency-closing Tier-B lot; do not reuse its stale pre-main-advance release
   evidence after the head/base changes.
3. Reconcile PR #93 to current trusted main and obtain fresh exact-head
   independent review before considering merge.
4. Do not start the dependent Wallet Guard end-to-end composition until the
   prerequisite lots have exact-merge post-merge PASS evidence.
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
