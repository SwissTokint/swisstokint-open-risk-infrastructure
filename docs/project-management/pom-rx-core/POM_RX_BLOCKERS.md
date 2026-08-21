# POM-RX Core — Active Blockers

Updated: `2026-08-21T11:06:20+02:00`

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

Status: `BLOCKED_FRESH_EXACT_HEAD_INDEPENDENT_REVIEW`

Live head at this checkpoint: `c4e40ceb286f4e59657767661daed15d2b68e9a7`.

Exact-head CI: run `32465835858`, `success`.

The latest distinct Codex review visible before this checkpoint reviewed moved
head `03e0201c9fef5ed10a615996d68052613bdd94d6`, not `c4e40ceb...`. That review
found a P1 in nested typed-data capture because the shared capture path still
resolved live reflection while `SIMULATION.md` claimed initialization-time
reflection binding. The branch subsequently moved seven commits and now changes
`core/reference-data/plain-data-snapshot.mjs` plus dedicated provenance and
Wallet Guard regressions. Those repairs are not merge evidence until a fresh
independent review covers the actual current head.

Required to unblock:

1. preserve green exact-head CI on the actual current head;
2. release-owner architecture/falsification/security/code-quality/optimization
   review on that same head;
3. fresh distinct independent skeptical/security review on that same head;
4. no unresolved P0/P1/P2 after that review;
5. reconciliation to current trusted main if another conflicting lot merges
   first.

No simulation result may be treated as authorization or external effect truth.

## PR #97 — durable claim + Core Gate composition

Status: `BLOCKED_UNRESOLVED_EXACT_HEAD_P1`

Current exact head: `1f228dab6c5a2c0ac2ac9952d8d52978ba44b780`.

Exact-head CI: run `32464344634`, `success`.

A distinct Codex review actually covers this exact head and found a fresh P1 in
Wallet Guard provider-context sampling. When `eth_accounts` returns an Array
Proxy or an array with an own `map`, the current integrity check occurs before
`normalizeAccounts()` first touches that provider-controlled value. A Proxy `get`
trap can mutate `Array.prototype.map` after the check, return the poisoned method
and restore it during the call, substituting an attacker account while the later
integrity checks still observe the baseline. This was reproduced through the
controlled provider path with authorization and sensitive forwarding reached.

Green CI and the release-owner NON-INDEPENDENT PASS on `1f228dab...` do not close
this independent P1.

Required to unblock:

1. reject/capture provider-controlled account arrays through a hardened inert
   boundary before normalization, including Proxy/decorated-array rejection
   without executing caller traps/getters;
2. add a CI-wired regression proving the attack fails before authorization and
   before sensitive provider forwarding;
3. rerun exact-head CI after the repair;
4. obtain fresh release-owner and distinct independent skeptical/security
   reviews on the repaired exact head;
5. leave no unresolved P0/P1/P2;
6. if PR #93 or another overlapping lot merges first, reconcile package/shared
   surfaces to the then-current trusted main and repeat exact-head gates.

The durable composition remains reference-only. It does not prove hostile
same-OS-user storage integrity, distributed filesystem consensus, crash recovery,
production trusted time/Witness or external execution truth.

## PR #98 — control-plane continuity reconciliation

Status: `IN_PROGRESS_REPAIRING_REVIEW_FINDINGS`

The first independent Codex review of exact head
`0a9c56a8f8ddcbb266db55815c387efb7a644527` found four P1 contract regressions
and one P2 stale-state claim. Canonical CI run `32465189485` failed on that head.
The findings are bounded to documentation/control-plane wording: contract-checked
Core ownership text, Wallet Guard ownership text, explicit full five-stage merge
language, explicit post-merge review-family language, and removal of a task
register blocker that the same PR had already resolved.

Repairs are being made only on the PR #98 docs/control-plane branch. Because the
head moved, the old failing CI and independent review are historical input, not
release evidence. PR #98 remains non-Tier-B and must receive green exact-head CI
plus a fresh distinct exact-head independent review with no unresolved P0/P1/P2
before merge.

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
must not be treated as current merely because older Git history mentions them:

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
- stale top-level task-register `current_main` / obsolete active-state debt,
  which PR #98 already reconciles in its current task-register content.

If a regression is found in one of those merged properties it becomes a **new**
typed blocker tied to the exact affected SHA; it is not represented by reviving
the stale August 14 blocker text.
