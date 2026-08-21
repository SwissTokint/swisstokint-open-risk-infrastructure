# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-21T11:06:20+02:00`

Purpose: compact **durable cross-chat continuation state**. The scheduled task may
run in an associated task conversation separate from an interactive chat, so no
future run may depend on conversation history alone. Live GitHub wins over this
file whenever a PR head, CI run, review or merge changes after this checkpoint.

## trusted_main

`818718955c9e4136e9e55754a31be2f1c7b610f8`

Latest trusted merge: PR #96 — exact-main CI status observability repair.

PR #96 exact-merge post-merge assurance is recorded PASS. Trusted main contains
the prospective `pom-rx/exact-main-ci` status surface, but every later merge still
requires decision-time freshness validation of the canonical push CI under
`POM_RX_POST_MERGE_ASSURANCE_GATE.md`.

## repository architecture present on trusted main

Trusted main already contains the activated bounded strict profile while
preserving historical `pom-rx/0.1`, common exact authorization, a process-local
single-use Gate, shared bounded hostile-object/plain-data capture, process-local
Witness trust lifecycle, a separate filesystem durable claim primitive,
reference execution evidence, reference observation/reconciliation, and the
merged Wallet Guard JSON/intent/effect/policy/controller/preflight/Witness-adapter/provider/controlled-host layers.

These are reference/prototype properties. They do not prove production trusted
time, production issuer/key custody, arbitrary-browser/provider integrity,
external execution/effect truth, distributed filesystem/consensus semantics or
real-wallet safety.

## open_prs

### PR #93 — Wallet Guard simulation evidence

- state: `OPEN / NOT_MERGED / MERGEABLE`;
- live head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- exact-head CI: run `32465835858`, `success`;
- release state: `BLOCKED_FRESH_EXACT_HEAD_INDEPENDENT_REVIEW`;
- the latest independent Codex review visible before this checkpoint covers moved
  head `03e0201c9fef5ed10a615996d68052613bdd94d6`, where it found a P1 in nested
  typed-data capture using live reflection. The branch is seven commits ahead and
  now changes the shared plain-data snapshot plus regressions, but no fresh
  independent review on `c4e40ceb...` is yet release evidence;
- prior release-owner reviews are NON-INDEPENDENT and moved-head reviews cannot
  release this head.

Next safe action: request/revalidate a fresh distinct independent skeptical /
security review on exact head `c4e40ceb...`; if the head moves again, invalidate
current exact-head evidence and repeat.

### PR #97 — Core durable-claim + single-use-Gate composition

- state: `OPEN / NOT_MERGED / MERGEABLE`;
- exact current head: `1f228dab6c5a2c0ac2ac9952d8d52978ba44b780`;
- exact-head CI: run `32464344634`, `success`;
- release state: `BLOCKED_UNRESOLVED_EXACT_HEAD_P1`;
- a fresh independent Codex review actually covers this exact head and reports a
  P1 in provider account normalization: an `eth_accounts` Array Proxy or array
  with an own `map` can mutate `Array.prototype.map` after the runtime-integrity
  check and before normalization, substitute the active account, and still reach
  authorization/sensitive forwarding;
- the release-owner exact-head PASS is explicitly NON-INDEPENDENT and does not
  close that P1.

Next safe action: repair provider-controlled account-array capture/rejection
inside PR #97, add a zero-trap/zero-authorization/zero-sensitive-forwarding
regression, rerun exact-head CI, then repeat release-owner and fresh independent
exact-head review.

### PR #98 — durable control-plane continuity reconciliation

- state: `OPEN / NOT_MERGED / MERGEABLE`;
- branch: `docs/pom-rx-continuity-reconcile-20260821`;
- base: trusted main `818718955c9e4136e9e55754a31be2f1c7b610f8`;
- scope: non-normative docs/control-plane only; no protocol, verifier, Gate,
  Witness, Wallet Guard runtime, fixture, key, wallet, network or financial
  execution semantic changes;
- independent Codex review on former head
  `0a9c56a8f8ddcbb266db55815c387efb7a644527` found four P1 documentation
  contract regressions plus one P2 stale-register claim; canonical CI run
  `32465189485` failed on that old head;
- the current branch repairs those findings by preserving contract-checked Core
  and Wallet Guard ownership phrases, restoring explicit `full five-stage gate`
  wording, restoring the mandatory SpecKit/skeptical/security/code-quality /
  optimization post-merge families, and removing the already-resolved
  task-register blocker;
- because these repairs moved the branch, old CI/review evidence is stale. Read
  the exact live PR #98 head from GitHub before any release decision.

Next safe action: obtain green CI and a fresh independent Codex review on the
actual repaired PR #98 head. Merge only if the full five-stage gate and every
applicable exact-head requirement pass, then immediately run exact-merge-SHA
post-merge assurance.

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
3. `PR98_REPAIRED_HEAD_CI_AND_FRESH_INDEPENDENT_REVIEW_REQUIRED`.
4. `DAGR_SOURCE_DOCUMENT_MISSING`.
5. `PRODUCTION_TRUST_UNPROVED / REAL_WALLET_NOT_AUTHORIZED`.

The old `CONTROL_PLANE_TASK_REGISTER_STALE` blocker is resolved inside PR #98:
`POM_RX_TASKS.yaml` has been reconciled to trusted main `818718...`, the current
three open workstreams and current blocker states while preserving historical
August 14 detail in Git history.

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

1. Finish PR #98 exact-head CI and fresh independent review because the stale
   control plane is itself a continuity hazard and #98 is a bounded non-Tier-B
   dependency-closing lot.
2. In parallel only where file ownership does not conflict, repair PR #97's
   current exact-head P1.
3. Revalidate PR #93's moved repaired head through fresh independent review.
4. After any merge, immediately run and persist exact-merge post-merge assurance
   before trusting that property downstream.
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
