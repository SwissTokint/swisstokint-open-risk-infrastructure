# POM-RX Core — Active Blockers

Updated: `2026-08-21T11:30:00+02:00`

Current trusted main: `1abe57f8baea8dd6844cc8ea9e321c05ec01538f`

This file lists **current** blockers only. Historical blockers remain in Git
history and must not be mistaken for current architecture or release state.

## Overall prototype gate

Status: `NO_GO_FOR_PRODUCTION / REFERENCE_DEVELOPMENT_CONTINUES`

Strict verification, exact-authorization/Gate reference semantics, Witness
reference trust, Wallet Guard preflight/provider/controlled-host layers,
execution evidence, observation/reconciliation and exact-main CI observability
are present on trusted main. PR #98 additionally established the durable
GitHub-backed cross-chat control plane and passed exact-merge post-merge
assurance.

The maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`.
It never means production-ready, audited, certified, deployed, arbitrary-browser
safe or authorized for financial execution.

## PR #97 — durable claim + Core Gate composition

Status: `BLOCKED_UNRESOLVED_EXACT_HEAD_P1_AND_MAIN_RECONCILIATION`

Historical exact head: `1f228dab6c5a2c0ac2ac9952d8d52978ba44b780`.

Historical exact-head CI: run `32464344634`, `success`.

GitHub now reports the open PR non-mergeable after trusted `main` advanced to
`1abe57f8...`; therefore the historical branch must not be merged wholesale.

A distinct Codex review actually covers `1f228dab...` and found a P1 in Wallet
Guard provider-context sampling. When `eth_accounts` returns an Array Proxy or
an array with an own `map`, the integrity check runs before normalization first
touches the provider-controlled value. A Proxy `get` trap can mutate
`Array.prototype.map` after the check, return the poisoned method and restore it
during the call, substituting an attacker account while later integrity checks
still observe the baseline. The attack was reproduced with authorization and
sensitive forwarding reached.

Required to unblock:

1. reconcile only the bounded useful PR #97 lot to current trusted main without
   overwriting the PR #98 control plane;
2. reject/capture provider-controlled account arrays through a hardened inert
   boundary before normalization, including Proxy/decorated-array rejection
   without executing caller traps/getters;
3. add a CI-wired regression requiring zero hostile trap/getter dispatch, zero
   authorization and zero sensitive forwarding for the attack;
4. rerun exact-head CI on the reconciled repair;
5. obtain fresh release-owner and distinct independent skeptical/security
   reviews on that same exact head;
6. leave no unresolved P0/P1/P2.

The durable composition remains reference-only. It does not prove hostile
same-OS-user storage integrity, distributed filesystem consensus, crash recovery,
production trusted time/Witness or external execution truth.

## PR #93 — Wallet Guard simulation exact-head gate

Status: `BLOCKED_MAIN_RECONCILIATION_AND_FRESH_EXACT_HEAD_INDEPENDENT_REVIEW`

Historical exact head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`.

Historical exact-head CI: run `32465835858`, `success`.

GitHub now reports the open PR non-mergeable after trusted `main` advanced to
`1abe57f8...`. The latest distinct Codex review available for the simulation
repair covers moved head `03e0201c9fef5ed10a615996d68052613bdd94d6`, where
it found a P1 in nested typed-data capture because the shared capture path still
resolved live reflection while the documentation claimed initialization-time
reflection binding. Later branch commits change the shared snapshot plus
regressions, but no fresh independent review covers a reconciled exact head.

Required to unblock:

1. reconcile the useful bounded simulation lot onto current trusted main rather
   than merging the stale historical branch wholesale;
2. preserve shared Core limits and the current Core/application ownership split;
3. rerun exact-head CI on the reconciled candidate;
4. perform release-owner architecture/falsification/security/code-quality /
   optimization/integration review on that exact head;
5. obtain a fresh distinct independent skeptical/security review on the same
   exact head with no unresolved P0/P1/P2.

No simulation result may be treated as authorization or external effect truth.

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

The following are resolved historical blocker classes or completed lots and must
not be revived merely because older Git history mentions them:

- strict-profile prerequisite/fixture/invariant activation work;
- fresh-Windows exact-LF checkout issue;
- initial Core exact-authorization/process-local Gate reference implementation;
- reference Witness enrollment/revocation/rotation lifecycle;
- shared bounded plain-data snapshot as an existing capability;
- reference execution-evidence recorder;
- reference observation/reconciliation layer;
- Wallet Guard JSON ingress, policy object boundary, policy controller, portable
  preflight evidence and controlled-provider host;
- exact-main CI status publisher introduced by PR #96;
- stale top-level task-register/current-main/control-plane debt addressed by PR
  #98;
- PR #98 itself: source head
  `47bcc2129dc88c97b0d8d42434b42cee82855861`, merge SHA
  `1abe57f8baea8dd6844cc8ea9e321c05ec01538f`, exact-merge CI run
  `32467712934` success, final `POST_MERGE_ASSURANCE_PASS`.

If a regression is found in a merged property it becomes a **new** typed blocker
tied to the exact affected SHA; it is not represented by reviving old text.
