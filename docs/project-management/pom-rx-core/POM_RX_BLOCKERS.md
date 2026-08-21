# POM-RX Core — Active Blockers

Updated: `2026-08-21T11:52:00+02:00`

Current trusted main: `6a6ff5c2621e63e007a31b2c55eb2bfde2082d16`

This file lists **current** blockers only. Historical blockers remain in Git
history and must not be mistaken for the current architecture. Live GitHub wins
if a PR head, review, CI run or merge changes after this checkpoint.

## Overall prototype gate

Status: `NO_GO_FOR_PRODUCTION / REFERENCE_DEVELOPMENT_CONTINUES`

Trusted main includes strict verification, exact-authorization/Gate reference
semantics, Witness reference trust, portable Wallet Guard preflight, execution
evidence, observation/reconciliation, controlled provider host, exact-main CI
observability and the GitHub-backed cross-chat POM-RX control plane. PR #99 only
reconciled durable project-control state after PR #98; it changed no protocol,
authorization or wallet-security semantics.

The maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`.
It never means production-ready, audited, certified, deployed, arbitrary-browser
safe or authorized for financial execution.

## Post-PR #99 checkpoint state

Status: `CHECKPOINT_RECONCILIATION_IN_PROGRESS_NON_TIER_B`

PR #99 is **not** an open runtime blocker. Its exact source head
`899ae6f1cea6f44e32f5bf89ac9b1b221c6aeec0` merged as
`6a6ff5c2621e63e007a31b2c55eb2bfde2082d16`; canonical push CI run
`32469503160` succeeded on that exact merge SHA, `pom-rx/exact-main-ci` points to
the same successful run, source-head/merge-tree comparison shows no file
differences, and the recorded mandatory post-merge verdict is
`POST_MERGE_ASSURANCE_PASS` with SpecKit, skeptical/falsification, security, code
quality, optimization and integration/regression all PASS.

The current bounded non-Tier-B documentation branch merely persists that new
trusted-main/merge verdict into the existing checkpoint/task/blocker/capability
surfaces. It changes no runtime semantics and must still pass its own applicable
exact-head documentation gates before any merge. Its current branch/PR head must
be read from live GitHub instead of being embedded as self-referential evidence.

## PR #93 — Wallet Guard simulation exact-head gate

Status: `BLOCKED_FRESH_EXACT_HEAD_INDEPENDENT_REVIEW`

Checkpoint head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`.

Exact-head CI: run `32465835858`, `success`.

The current branch contains repairs after its last distinct independent review,
so that moved-head review is not release evidence for `c4e40ceb...`. A fresh
distinct skeptical/security review must cover the actual current head. Because
trusted main has advanced through non-runtime control-plane merges, the PR must
also be reconciled to the then-current trusted main before eventual merge where
base/overlap drift is material, with all invalidated exact-head gates repeated.

Required to unblock:

1. reconcile material base/overlap drift to current trusted main;
2. preserve green exact-head CI on the resulting actual current head;
3. release-owner architecture/falsification/security/code-quality/optimization
   review on that same head;
4. fresh distinct independent skeptical/security review on that same head;
5. no unresolved P0/P1/P2 after that review.

No simulation result may be treated as authorization or external effect truth.

## PR #97 — durable claim + Core Gate composition

Status: `BLOCKED_UNRESOLVED_EXACT_HEAD_P1`

Checkpoint head: `1f228dab6c5a2c0ac2ac9952d8d52978ba44b780`.

Exact-head CI: run `32464344634`, `success`.

A distinct Codex review actually covers this exact head and found a P1 in Wallet
Guard provider-context sampling. When `eth_accounts` returns an Array Proxy or a
decorated array with attacker-controlled property dispatch, the current
integrity check occurs before `normalizeAccounts()` first consumes that provider
value. A trap can redirect `Array.prototype.map`, substitute the active account,
restore the visible prototype surface and still reach authorization/sensitive
forwarding.

Green CI and the release-owner NON-INDEPENDENT PASS on `1f228dab...` do not close
this independent P1.

Required to unblock:

1. reject/capture provider-controlled account arrays through the shared hardened
   inert plain-data boundary before normalization, including Proxy/decorated-array
   rejection without hostile trap/getter execution;
2. add a CI-wired regression proving zero hostile trap dispatch and rejection
   before authorization and before sensitive provider forwarding;
3. reconcile the repaired branch to current trusted main;
4. rerun exact-head CI after all repairs/reconciliation;
5. obtain fresh release-owner and distinct independent skeptical/security reviews
   on the resulting exact head;
6. leave no unresolved P0/P1/P2.

The durable composition remains reference-only. It does not prove hostile
same-OS-user storage integrity, distributed filesystem consensus, crash recovery,
production trusted time/Witness or external execution truth.

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

The following blocker classes are already superseded by merged work and must not
be treated as current merely because older Git history mentions them:

- strict-profile prerequisite ratification and immutable fixture foundation;
- the five strict invariant families and strict-profile activation;
- fresh-Windows exact-LF checkout issue;
- initial Core exact-authorization/single-use-Gate reference implementation;
- reference Witness enrollment/revocation/rotation lifecycle;
- shared bounded plain-data snapshot boundary as an existing capability;
- reference execution-evidence recorder;
- reference observation/reconciliation layer;
- Wallet Guard JSON ingress, policy object boundary, policy controller,
  portable preflight evidence and controlled-provider host;
- exact-main CI status publisher introduced by PR #96;
- stale top-level task-register `current_main` / obsolete active-state debt;
- PR #98 pre-merge continuity gates and post-merge checkpoint debt resolved by
  PR #99;
- PR #99 pre-merge gates and exact-merge assurance: merged as `6a6ff5c...` with
  recorded `POST_MERGE_ASSURANCE_PASS`.

If a regression is found in one of those merged properties it becomes a **new**
typed blocker tied to the exact affected SHA; it is not represented by reviving
old blocker text.
