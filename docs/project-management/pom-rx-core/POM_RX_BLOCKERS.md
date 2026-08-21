# POM-RX Core — Active Blockers

Updated: `2026-08-21T11:45:00+02:00`

Current trusted main: `1abe57f8baea8dd6844cc8ea9e321c05ec01538f`

This file lists **current** blockers only. Historical blockers remain in Git
history and must not be mistaken for the current architecture. Live GitHub wins
if a PR head, review, CI run or merge changes after this checkpoint.

## Overall prototype gate

Status: `NO_GO_FOR_PRODUCTION / REFERENCE_DEVELOPMENT_CONTINUES`

Trusted main now includes the GitHub-backed cross-chat POM-RX control plane from
PR #98 in addition to strict verification, exact-authorization/Gate reference
semantics, Witness reference trust, portable Wallet Guard preflight, execution
evidence, observation/reconciliation, controlled provider host and exact-main CI
observability. PR #98 is non-runtime coordination work and does not enlarge any
protocol, authorization or wallet-security claim.

The maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`.
It never means production-ready, audited, certified, deployed, arbitrary-browser
safe or authorized for financial execution.

## Post-PR #98 checkpoint reconciliation

Status: `CONTROL_PLANE_POST_98_CHECKPOINT_RECONCILIATION_PENDING`

PR #98 is **not** an open blocker. Its exact source head
`47bcc2129dc88c97b0d8d42434b42cee82855861` merged as
`1abe57f8baea8dd6844cc8ea9e321c05ec01538f`; canonical push CI run
`32467712934` succeeded on that exact merge SHA and the recorded mandatory
post-merge verdict is `POST_MERGE_ASSURANCE_PASS` with SpecKit,
skeptical/falsification, security, code quality, optimization and
integration/regression all PASS.

The only remaining control-plane action is this bounded non-Tier-B documentation
lot that persists the new trusted-main, merge verdict and current PR #93/#97
state into the canonical checkpoint/task/blocker/capability files. It changes no
runtime semantics. It must still pass its applicable exact-head CI/review gates
before merge; its own live head must be read from GitHub rather than embedded as
a self-referential authoritative SHA.

## PR #93 — Wallet Guard simulation exact-head gate

Status: `BLOCKED_FRESH_EXACT_HEAD_INDEPENDENT_REVIEW`

Live head at this checkpoint: `c4e40ceb286f4e59657767661daed15d2b68e9a7`.

Exact-head CI: run `32465835858`, `success`.

The latest distinct Codex review visible before this checkpoint reviewed moved
head `03e0201c9fef5ed10a615996d68052613bdd94d6`, not `c4e40ceb...`. That review
found a P1 in nested typed-data capture because the shared capture path still
resolved live reflection while `SIMULATION.md` claimed initialization-time
reflection binding. The branch subsequently moved and includes shared
`core/reference-data/plain-data-snapshot.mjs` hardening plus regressions. Those
repairs are not merge evidence until a fresh independent review covers the
actual current head.

Required to unblock:

1. preserve green exact-head CI on the actual current head;
2. release-owner architecture/falsification/security/code-quality/optimization
   review on that same head;
3. fresh distinct independent skeptical/security review on that same head;
4. no unresolved P0/P1/P2 after that review;
5. reconcile to the current trusted main before merge where overlap/base drift is
   material, then rerun invalidated exact-head gates.

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
and restore it during the call, substituting an attacker account while later
integrity checks observe the baseline. The attack was reproduced through the
controlled provider path with authorization and sensitive forwarding reached.

Green CI and the release-owner NON-INDEPENDENT PASS on `1f228dab...` do not close
this independent P1.

Required to unblock:

1. reject/capture provider-controlled account arrays through a hardened inert
   boundary before normalization, including Proxy/decorated-array rejection
   without executing caller traps/getters;
2. add a CI-wired regression proving zero hostile trap dispatch and failure before
   authorization and before sensitive provider forwarding;
3. rerun exact-head CI after the repair;
4. obtain fresh release-owner and distinct independent skeptical/security
   reviews on the repaired exact head;
5. leave no unresolved P0/P1/P2;
6. reconcile to current trusted main before merge and repeat any exact-head gates
   invalidated by that reconciliation.

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
- PR #98 pre-merge continuity gates: PR #98 is merged at `1abe57...` and has
  recorded `POST_MERGE_ASSURANCE_PASS`.

If a regression is found in one of those merged properties it becomes a **new**
typed blocker tied to the exact affected SHA; it is not represented by reviving
old blocker text.
