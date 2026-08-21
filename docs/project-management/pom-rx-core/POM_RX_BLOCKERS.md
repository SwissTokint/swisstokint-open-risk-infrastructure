# POM-RX Core — Active Blockers

Updated: `2026-08-21T13:10:00+02:00`

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

PR #100 is the current bounded non-Tier-B documentation/control-plane
reconciliation. Immediately before the latest live-state update, head
`460abc2369a0796cb9bc10b0573f0a38c3716f7c` had canonical CI run
`32472828209` success. The newly discovered exact-head PR #97 blocker required
another checkpoint commit, so that prior PR #100 exact-head evidence is stale.
PR #100 must pass fresh exact-head documentation gates on its final frozen head
before merge.

## PR #93 — Wallet Guard simulation exact-head gate

Status: `BLOCKED_FRESH_EXACT_HEAD_INDEPENDENT_REVIEW`

Checkpoint head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`.

Exact-head CI: run `32465835858`, `success`.

The latest distinct Codex review available for release evidence covers moved
head `03e0201c9fef5ed10a615996d68052613bdd94d6`, where it found a P1 in
nested typed-data capture using live reflection. The branch moved afterward and
contains later shared plain-data/reflection hardening. That moved-head review is
not release evidence for `c4e40ceb...`.

Required to unblock:

1. reconcile material base/overlap drift to current trusted main;
2. preserve green exact-head CI on the resulting actual current head;
3. obtain release-owner architecture/falsification/security/code-quality/
   optimization review on that same head;
4. obtain a fresh distinct independent skeptical/security review on that same
   head;
5. leave no unresolved P0/P1/P2.

No simulation result may be treated as authorization or external effect truth.

## PR #97 — durable claim + Core Gate composition

Status: `BLOCKED_UNRESOLVED_EXACT_HEAD_P1_THENABLE_ASSIMILATION`

Exact current head: `871cd980cf6c1343336e5d63da78a82a28a8dda3`.

Reconciled trusted main: `6a6ff5c2621e63e007a31b2c55eb2bfde2082d16`.

Exact-head CI: run `32472232474`, `CI` run 563, `success`.

Release-owner exact-head review: all six scoped lanes PASS with zero new
P0/P1/P2, explicitly **NON-INDEPENDENT**.

A fresh distinct Codex review **does cover exact head `871cd980...`** and found a
new P1: `Reject account Proxies before thenable assimilation`. The previous
provider-array `map`/decorated-array attack is repaired, but the hardened inert
capture is still too late for a synchronously returned Proxy result. `providerRead()`
awaits the raw provider result first; Promise/thenable assimilation therefore
reads a result-owned `then` property before the capture boundary. The independent
review reproduced an Array Proxy whose `get('then')` resolves each account read
to an attacker-controlled plain array. All six samples remained stable, reference
authorization ran and the attacker-originated transaction reached sensitive
forwarding.

Green CI and the NON-INDEPENDENT owner PASS do not close this exact-head P1.

Required to unblock:

1. repair the provider-result transport boundary so a raw provider-controlled
   Proxy/thenable cannot execute result-owned dispatch before hardened capture,
   or use an async transport contract that cannot execute such thenable behavior;
2. add a CI-wired adversarial regression reproducing `get('then')` substitution
   and proving rejection before reference authorization and before sensitive
   forwarding;
3. preserve the already repaired Array Proxy/decorated-`map` inert-capture cases;
4. rerun exact-head CI and release-owner review after the repair;
5. obtain a fresh distinct independent skeptical/security review on the resulting
   exact repaired head;
6. leave no unresolved P0/P1/P2 before merge.

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

The old PR #97 `map`/decorated-array P1 is not the current blocker: its attack
class was repaired before exact head `871cd980...`. The current blocker is the
fresh exact-head thenable-assimilation P1 described above.

If a regression is found in any merged property it becomes a **new** typed blocker
tied to the exact affected SHA; old blocker text is never revived as current
state.
