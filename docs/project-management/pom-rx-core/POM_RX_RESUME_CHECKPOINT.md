# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-21T10:46:00+02:00`

Purpose: compact **durable cross-chat continuation state**. The scheduled task may
run in an associated task conversation separate from an interactive chat, so no
future run may depend on conversation history alone. Live GitHub wins over this
file if a head/CI/review moved after the timestamp above.

## trusted_main

`818718955c9e4136e9e55754a31be2f1c7b610f8`

Latest merge: PR #96 — exact-main CI status observability repair.

Exact-main status context `pom-rx/exact-main-ci` is `success` and targets the
canonical main CI run. Decision-time freshness rules in
`POM_RX_POST_MERGE_ASSURANCE_GATE.md` still apply; the status is not sufficient
by itself for a new readiness claim.

## repository architecture now present on main

The old August 14 checkpoint is superseded. Current `main` already contains:

- activated `pom-rx-v0.1/strict-errata-1` strict verification while preserving
  the historical verifier;
- common Core exact-authorization contract and process-local reference
  single-use Gate;
- shared bounded hostile-object/plain-data capture;
- source/Witness signing primitives and process-local reference trust lifecycle
  with enrollment, revocation, rotation/recovery and monotonic trusted time;
- a separate filesystem-backed durable claim primitive;
- shared reference execution-evidence recording;
- shared reference observation/reconciliation;
- Wallet Guard strict JSON ingress, normalized EVM intents, effect decoding,
  fail-closed policy, policy controller, portable preflight evidence,
  Core-verified Witness-authorization adapter, provider/Gate integration and a
  controlled in-memory provider host;
- Filecoin/Stellar/supporting integrations that remain evidence/adapter
  infrastructure rather than the execution authorization boundary.

These are reference/prototype properties. They do not prove production trusted
time, production issuer/key custody, arbitrary-browser integrity, external
execution/effect truth or real-wallet safety.

## open_feature_prs

### PR #93 — Wallet Guard simulation evidence

- state: `OPEN / NOT_MERGED / MERGEABLE`;
- live head at checkpoint: `03e0201c9fef5ed10a615996d68052613bdd94d6`;
- CI at checkpoint: run `32464591057`, `in_progress`;
- important: the PR body still labels an older head (`06f8c7b...`), therefore its
  embedded "current exact state" section is stale and must never be used as the
  release source of truth;
- release rule: current live head needs green exact-head CI plus release-owner
  review and a distinct fresh exact-head independent skeptical/security review
  with no unresolved P0/P1/P2;
- prior Codex findings/reviews on moved heads remain historical evidence only.

### PR #97 — Core durable-claim + single-use-Gate composition

- state: `OPEN / NOT_MERGED / MERGEABLE`;
- live head at checkpoint: `1f228dab6c5a2c0ac2ac9952d8d52978ba44b780`;
- exact-head CI at checkpoint: run `32464344634`, `success`;
- earlier heads accumulated real independent P1 findings around event-loop
  yielding, ambient intrinsics, durable-root/path confinement, WeakMap binding,
  prepared-execution capture, mutable Array/iterator surfaces and post-await
  provider/policy integrity. Repairs move the head, so every prior release
  review must be treated as stale unless it explicitly covers `1f228dab...`;
- release rule: require a fresh exact-head release-owner pass and distinct
  independent skeptical/security review with no unresolved P0/P1/P2 before any
  merge decision.

PR #93 and #97 both touch shared regression/package surfaces. If either merges,
the other must be reconciled to the then-current trusted `main` before its own
release gate.

## current_control_plane_lot

Branch: `docs/pom-rx-continuity-reconcile-20260821`

Base: trusted main `818718955c9e4136e9e55754a31be2f1c7b610f8`.

Scope is non-normative project continuity/information architecture only:

- remove stale model/agent claims from the active roster;
- make scheduled-task continuity explicitly repository-backed;
- refresh this checkpoint and current blockers;
- reconcile capability/readme wording with the implementation actually merged
  on main;
- do not change protocol, verifier, Gate, Witness, Wallet Guard runtime, fixture,
  key, wallet, network or financial-execution semantics.

## active_blockers

1. `PR93_EXACT_HEAD_GATE_PENDING` — current simulation head is still moving and
   its current CI/review gate must be completed on the actual head, not the PR
   body's stale head.
2. `PR97_INDEPENDENT_EXACT_HEAD_REVIEW_PENDING` — current durable-Gate head is
   green in CI but must receive fresh exact-head independent validation after
   the latest repairs.
3. `CONTROL_PLANE_TASK_REGISTER_STALE` — `POM_RX_TASKS.yaml` contains useful
   historical evidence but its top-level `current_main` and several old READY /
   blocked task states predate the current architecture. Until that historical
   register is safely reconciled without destroying history, live GitHub plus
   this checkpoint/blocker file are authoritative for current-state selection.
4. `DAGR_SOURCE_DOCUMENT_MISSING` — no normative DAGR content is invented
   without an authorized source.
5. `PRODUCTION_TRUST_UNPROVED` — production issuer/trusted time, durable Witness
   trust/operator authorization, distributed replay/consensus where needed,
   external execution/effect truth and arbitrary-browser/provider integrity
   remain out of the current bounded reference claim.

## agent_and_review_routing

Use `POM_RX_TEAM_ROSTER.md` as the active role contract:

- Prime Lead / Integrator — accountable, non-independent;
- Protocol / Systems Architect — read-only where Core/compatibility boundaries
  are touched;
- Security / Adversarial Skeptic — read-only, concrete falsification hypotheses;
- one Single Implementer — exclusive writer;
- QA / Conformance — independent from writer where applicable;
- Code Quality / Optimization — read-only;
- Independent Release Gate — only actual distinct exact-head review evidence
  counts. A fresh `chatgpt-codex-connector` review can satisfy this lane when it
  covers the exact live head and leaves no unresolved P0/P1/P2.

Do not claim Claude or any other reviewer/model ran unless evidence proves it.

## scheduled_task_continuity

The existing hourly `POM-RX Continuous Build` task has been updated to:

- never create a duplicate POM-RX task;
- reconstruct state from live GitHub and the canonical control plane each run;
- treat moved heads as invalidating stale CI/reviews;
- persist material continuation state back to this repository;
- emit a `CONTINUITY_CHECKPOINT` in task results;
- never treat its associated task conversation as the sole project memory.

This mitigates cross-chat continuity loss. It does not change the ChatGPT product
behavior that a scheduled task can have its own associated task conversation.

## next_safe_actions

1. Complete and review the continuity-control-plane docs lot without touching the
   two feature branches.
2. Revalidate PR #93 after its current CI completes; if the head moved, start
   again from the new exact head.
3. Revalidate PR #97 current review threads and obtain a fresh independent
   exact-head review after the latest repair.
4. Merge a Tier-B lot only when its **current** exact-head technical and
   independent gates are satisfied under the applicable user authorization.
5. Immediately run exact-merge-SHA post-merge assurance after any merge and do
   not use the merged property as trusted dependency evidence until PASS.
6. After the two current lots settle, reconcile the historical
   `POM_RX_TASKS.yaml` register against the merged sequence without deleting its
   historical evidence.

## safety_boundary

No private key, seed, secret, funded wallet, exchange credential, mainnet
transaction, meaningful funds or uncontrolled malicious-site interaction is
authorized by this checkpoint. Burner local/testnet E2E remains behind a
separate explicit human execution gate.

No site/Vercel/funding-directory write belongs to this control plane.

## operational_claim_boundary

Target remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic,
synthetic and bounded. It is not production readiness, an audit, certification,
wallet safety, financial safety or deployment authorization.
