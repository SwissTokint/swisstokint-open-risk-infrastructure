# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-21T11:50:00+02:00`

Purpose: compact **durable cross-chat continuation state**. The scheduled task may
run in an associated task conversation separate from an interactive chat, so no
future run may depend on conversation history alone. Live GitHub wins over this
file whenever a PR head, CI run, review or merge changes after this checkpoint.

## trusted_main

`1abe57f8baea8dd6844cc8ea9e321c05ec01538f`

Latest trusted merge: PR #98 — durable cross-chat control-plane continuity
reconciliation.

PR #98 source head `47bcc2129dc88c97b0d8d42434b42cee82855861` merged as exact
main SHA `1abe57f8baea8dd6844cc8ea9e321c05ec01538f`. Its mandatory
exact-merge post-merge assurance is recorded `POST_MERGE_ASSURANCE_PASS` on the
PR. Canonical push CI run `32467712934`, workflow `.github/workflows/ci.yml`,
run 552 attempt 1, completed `success` on that exact merge SHA, and the
`pom-rx/exact-main-ci` status points to the same run. Decision-time freshness
revalidation remains mandatory for every future exact-main PASS.

The current checkpoint reconciliation is PR #99, a separate non-Tier-B
documentation lot. It does not change protocol/runtime/security semantics and
exists only to persist the post-#98 live state that could not be self-recorded
before #98 merged. Read PR #99's own live head/CI/review state from GitHub; do not
infer it from a self-referential SHA embedded in this file.

## repository architecture present on trusted main

Trusted main already contains the activated bounded strict profile while
preserving historical `pom-rx/0.1`, common exact authorization, a process-local
single-use Gate, shared bounded hostile-object/plain-data capture, process-local
Witness trust lifecycle, a separate filesystem durable claim primitive,
reference execution evidence, reference observation/reconciliation, the merged
Wallet Guard JSON/intent/effect/policy/controller/preflight/Witness-adapter/provider/controlled-host layers,
and the GitHub-backed POM-RX cross-chat control plane.

These are reference/prototype properties. They do not prove production trusted
time, production issuer/key custody, arbitrary-browser/provider integrity,
external execution/effect truth, distributed filesystem/consensus semantics or
real-wallet safety.

## open_prs

### PR #99 — post-PR #98 durable checkpoint reconciliation

- state: `OPEN / NOT_MERGED`;
- branch: `docs/pom-rx-checkpoint-after-98-20260821`;
- base: trusted main `1abe57f8baea8dd6844cc8ea9e321c05ec01538f`;
- tier: non-Tier-B documentation/control-plane only;
- self-head rule: always obtain current head, CI and reviews from live GitHub
  because recording the branch's own head in this file would move it;
- release state at this versioned checkpoint: `AWAITING_EXACT_HEAD_GATES`.

Next safe action: freeze the PR #99 candidate, run exact-head CI and the applicable
release-owner/independent documentation review. Merge only when the full
five-stage and exact-head requirements are satisfied, then immediately record the
exact-merge post-merge assurance.

### PR #93 — Wallet Guard simulation evidence

- state: `OPEN / NOT_MERGED / MERGEABLE`;
- live head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- exact-head CI: run `32465835858`, `success`;
- release state: `BLOCKED_FRESH_EXACT_HEAD_INDEPENDENT_REVIEW`;
- the latest independent Codex review visible before this checkpoint covers moved
  head `03e0201c9fef5ed10a615996d68052613bdd94d6`, where it found a P1 in nested
  typed-data capture using live reflection. The branch moved afterward and now
  includes shared plain-data snapshot hardening plus regressions, but there is no
  distinct independent review on `c4e40ceb...` that can release the current head;
- prior release-owner reviews are NON-INDEPENDENT and moved-head reviews cannot
  release this head.

Next safe action: obtain a fresh distinct independent skeptical/security review
on exact head `c4e40ceb...`; if the head moves again, invalidate current
exact-head CI/review evidence and repeat.

### PR #97 — Core durable-claim + single-use-Gate composition

- state: `OPEN / NOT_MERGED / MERGEABLE`;
- exact current head: `1f228dab6c5a2c0ac2ac9952d8d52978ba44b780`;
- exact-head CI: run `32464344634`, `success`;
- release state: `BLOCKED_UNRESOLVED_EXACT_HEAD_P1`;
- a fresh independent Codex review actually covers this exact head and reports a
  P1 in provider account normalization: an `eth_accounts` Array Proxy or array
  with an own `map` can mutate `Array.prototype.map` after the integrity check
  and before normalization, substitute the active account, and still reach
  authorization/sensitive forwarding;
- the release-owner exact-head PASS is explicitly NON-INDEPENDENT and does not
  close that P1.

Next safe action: repair provider-controlled account-array capture/rejection
inside PR #97, add a zero-trap/zero-authorization/zero-sensitive-forwarding
regression, rerun exact-head CI, then repeat release-owner and fresh independent
exact-head review.

## recent_merge_and_post_merge

### PR #98 — control-plane continuity reconciliation

- source head: `47bcc2129dc88c97b0d8d42434b42cee82855861`;
- merge SHA: `1abe57f8baea8dd6844cc8ea9e321c05ec01538f`;
- exact-main CI: run `32467712934`, `success`;
- post-merge verdict: `POST_MERGE_ASSURANCE_PASS`;
- SpecKit reconciliation: PASS;
- skeptical/falsification: PASS;
- security audit: PASS;
- code quality: PASS;
- optimization: PASS;
- integration/regression: PASS.

PR #98 is therefore a trusted non-runtime dependency. PR #99 only persists that
fact into the canonical checkpoint/task/blocker/capability files and must itself
go through the applicable exact-head documentation gates before merge.

## overlap_and_dependency_rule

PR #93 and PR #97 both touch shared regression/package surfaces. If either merges,
the other must be reconciled to the then-current trusted main and all exact-head
gates rerun. Neither may be used as a trusted dependency until its own merge has
a recorded `POST_MERGE_ASSURANCE_PASS`.

The next controlled Wallet Guard end-to-end composition remains blocked on the
trusted completion of the relevant current composition lots; do not start a
dependent Tier-B merge that assumes either open PR is already trusted.

## current_blockers

1. `CONTROL_PLANE_POST_98_CHECKPOINT_RECONCILIATION_PENDING` — PR #99.
2. `PR93_FRESH_EXACT_HEAD_INDEPENDENT_REVIEW_REQUIRED`.
3. `PR97_UNRESOLVED_EXACT_HEAD_P1_ACCOUNT_ARRAY_CAPTURE`.
4. `DAGR_SOURCE_DOCUMENT_MISSING`.
5. `PRODUCTION_TRUST_UNPROVED / REAL_WALLET_NOT_AUTHORIZED`.

The previous `CONTROL_PLANE_TASK_REGISTER_STALE` blocker and PR #98 pre-merge
gates are resolved. PR #98 itself has exact-merge post-merge PASS; only the
versioned checkpoint after that merge is pending in PR #99.

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

1. Finish PR #99 and merge it only after applicable exact-head CI/review gates
   pass; immediately record its exact-merge post-merge assurance.
2. Repair PR #97's current exact-head account-array P1 without weakening shared
   Core or Wallet Guard boundaries, then repeat exact-head gates.
3. Revalidate PR #93's repaired moved head through a fresh distinct independent
   exact-head review.
4. After either Tier-B merge, immediately run and persist exact-merge post-merge
   assurance before trusting that property downstream.
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
