# POM-RX Core — Active Blockers

Updated: `2026-08-21T10:46:00+02:00`

Current trusted main: `818718955c9e4136e9e55754a31be2f1c7b610f8`

This file lists **current** blockers only. Historical August 14 blockers remain in
Git history and must not be mistaken for the current architecture.

## Overall prototype gate

Status: `NO_GO_FOR_PRODUCTION / REFERENCE_DEVELOPMENT_CONTINUES`

The repository has advanced well beyond the old strict-profile-foundation
checkpoint: strict verification, exact-authorization/Gate reference semantics,
Witness reference trust, portable Wallet Guard preflight, execution evidence,
observation/reconciliation, controlled provider host and exact-main CI
observability are present on trusted main.

The remaining blockers are about exact-head release evidence and unproved
production/runtime boundaries, not absence of the entire Core.

The maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`.
It never means production-ready, audited, certified, deployed, arbitrary-browser
safe or authorized for financial execution.

## PR #93 — Wallet Guard simulation exact-head gate

Status: `BLOCKED_EXACT_HEAD_MOVED_AND_REVIEW_GATE_OPEN`

Checkpoint head: `03e0201c9fef5ed10a615996d68052613bdd94d6`.

Checkpoint CI: run `32464591057`, `in_progress`.

The PR body's embedded "current exact state" still names an older head
`06f8c7b...`; that prose is not release evidence. Live GitHub head/CI/review
metadata is authoritative.

The branch has accumulated legitimate independent findings across moved heads,
including exact Unicode/value identity, deep freeze, wrapper/payload budget
alignment, post-import intrinsic poisoning and canonical/hash provenance.
Repairs are useful only when the final current head is independently reviewed.

Required to unblock:

1. exact-head CI `success` on the actual current head;
2. release-owner architecture/falsification/security/code-quality/optimization
   review on that same head;
3. fresh distinct independent skeptical/security review on that same head;
4. no unresolved P0/P1/P2 after that review;
5. reconciliation to current trusted main if another conflicting lot merges
   first.

No simulation result may be treated as authorization or external effect truth.

## PR #97 — durable claim + Core Gate composition

Status: `BLOCKED_FRESH_INDEPENDENT_EXACT_HEAD_REVIEW_REQUIRED`

Checkpoint head: `1f228dab6c5a2c0ac2ac9952d8d52978ba44b780`.

Checkpoint exact-head CI: run `32464344634`, `success`.

Earlier independent reviews found real P1 classes over moved heads: event-loop
starvation, mutable `Object.create`/WeakMap behavior, prepared-execution snapshot
substitution, mutable Array/iterator surfaces, policy materialization, post-await
runtime drift and provider-result normalization timing. The current head contains
later repairs, but a green CI run does not erase the independent-review gate.

Required to unblock:

1. fresh release-owner pass on the current exact head;
2. fresh distinct independent skeptical/security review on the current exact
   head;
3. no unresolved P0/P1/P2;
4. if PR #93 or another overlapping lot merges first, reconcile package/shared
   surfaces to the then-current trusted main and repeat exact-head gates.

The durable composition remains reference-only. It does not prove hostile
same-OS-user storage integrity, distributed filesystem consensus, crash recovery,
production trusted time/Witness or external execution truth.

## Control-plane task register drift

Status: `ACTIVE_RECONCILIATION_DEBT`

`POM_RX_TASKS.yaml` preserves valuable historical task/review evidence but its
top-level `current_main` and multiple old task states predate the current merged
Core/application implementation. It must not be used as the sole current-state
selector until reconciled.

Current-state authority order while this debt is open:

1. live GitHub `main`, PR heads, CI, review threads and merge metadata;
2. `POM_RX_RESUME_CHECKPOINT.md` for the latest compact cross-chat checkpoint;
3. this blocker file and current capability map;
4. historical task entries for provenance only.

Reconciliation must preserve history rather than deleting old evidence or
rewriting past verdicts as if they were current.

## DAGR source gate

Status: `DAGR_SOURCE_DOCUMENT_MISSING`

No normative `POM-RX Governance Profile — DAGR` content may be invented from
memory, task-chat context or model inference. Source-backed normative work stays
blocked until an authorized source is located and validated.

## Production trust and real-wallet gate

Status: `PRODUCTION_TRUST_UNPROVED / REAL_WALLET_NOT_AUTHORIZED`

Still unproved or outside the current reference claim:

- production exact-authorization issuer and operator authorization;
- production trusted-time service;
- durable production Witness trust/KMS/HSM and distributed revocation;
- distributed replay/consensus semantics if the deployment needs them;
- arbitrary browser/extension/provider integrity;
- external EVM state/effect truth and simulation-to-forwarding atomicity;
- production-independent observer integrity/liveness/finality;
- crash-recovery semantics for the complete authorization/Gate lifecycle;
- real/funded wallet safety.

No private key, seed, secret, funded wallet, meaningful funds or mainnet
transaction is authorized. A burner local/testnet E2E remains behind a separate
explicit human execution gate.

## Resolved historical blockers — do not reopen from stale documents

The following old blocker classes are already superseded by merged work and
must not be treated as current merely because older task/control files still
mention them:

- strict-profile prerequisite ratification and immutable fixture foundation;
- the five strict invariant families and strict-profile activation;
- fresh-Windows exact-LF checkout issue;
- initial Core exact-authorization/single-use-Gate reference implementation;
- reference Witness enrollment/revocation/rotation lifecycle;
- shared bounded plain-data snapshot boundary;
- reference execution-evidence recorder;
- reference observation/reconciliation layer;
- Wallet Guard JSON ingress, policy object boundary, policy controller,
  portable preflight evidence and controlled-provider host;
- exact-main CI status publisher introduced by PR #96.

If a regression is found in one of those merged properties it becomes a **new**
typed blocker tied to the exact affected SHA; it is not represented by reviving
the stale August 14 blocker text.
