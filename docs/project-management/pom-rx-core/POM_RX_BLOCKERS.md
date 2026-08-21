# POM-RX Core — Active Blockers

Updated: `2026-08-21T14:20:00+02:00`

Current trusted main: `33986b33b9e8bc40030d940618e5c9df6f8b3fe6`

This file lists **current** blockers only. Historical blockers remain in Git
history and must not be mistaken for the current architecture. Live GitHub wins
if a PR head, review, CI run or merge changes after this checkpoint.

## Overall prototype gate

Status: `NO_GO_FOR_PRODUCTION / REFERENCE_DEVELOPMENT_CONTINUES`

Trusted main includes strict verification, exact-authorization/Gate reference
semantics, Witness reference trust, portable Wallet Guard preflight, execution
evidence, observation/reconciliation, controlled provider host, exact-main CI
observability and the GitHub-backed cross-chat POM-RX control plane. PR #100 only
reconciled durable project-control state after PR #99; it changed no protocol,
authorization or wallet-security semantics.

The maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`.
It never means production-ready, audited, certified, deployed, arbitrary-browser
safe or authorized for financial execution.

## PR #100 — resolved control-plane checkpoint merge

Status: `RESOLVED_POST_MERGE_ASSURANCE_PASS`

PR #100 source head `8924c5357b4299daa74d7e52cb8d20102641d929`
merged as exact main SHA `33986b33b9e8bc40030d940618e5c9df6f8b3fe6`.
Its source-head and merge trees are identical
(`b14b8d23636d71781629fe440d412a84d87bdc0d`). Canonical push CI run
`32480810161`, `CI` run 570 attempt 1, completed `success` on that exact merge
SHA, and decision-time `pom-rx/exact-main-ci` was `success` targeting the same
run. The mandatory exact-merge report is recorded on PR #100 with
`POST_MERGE_ASSURANCE_PASS`: SpecKit, skeptical/falsification, security, code
quality, optimization and integration/regression all PASS for the bounded
documentation/control-plane scope.

PR #100 is therefore trusted coordination evidence. It did not make any open
Tier-B PR trusted and did not establish production or real-wallet readiness.

## PR #93 — Wallet Guard simulation exact-head gate

Status: `BLOCKED_FRESH_EXACT_HEAD_INDEPENDENT_REVIEW_AND_RECONCILIATION`

Checkpoint head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`.

Last known exact-head CI: run `32465835858`, `success`.

The latest distinct Codex review available for release evidence covers moved
head `03e0201c9fef5ed10a615996d68052613bdd94d6`, where it found a P1 in
nested typed-data capture using live reflection. The branch moved afterward and
contains later shared plain-data/reflection hardening. That moved-head review is
not release evidence for `c4e40ceb...`.

Required to unblock:

1. reconcile material base/overlap drift to the then-current trusted main;
2. preserve green exact-head CI on the resulting actual current head;
3. obtain release-owner architecture/falsification/security/code-quality/
   optimization review on that same head;
4. obtain a fresh distinct independent skeptical/security review on that same
   head;
5. leave no unresolved P0/P1/P2.

No simulation result may be treated as authorization or external effect truth.

## PR #97 — durable claim + Core Gate composition

Status: `BLOCKED_UNRESOLVED_P1_THENABLE_ASSIMILATION / MOVED_HEAD_GATES_INVALIDATED`

Current reconciled head: `39186dcc8e2fe7c176495d8a4ad654215dbce637`.

Reconciled trusted main: `33986b33b9e8bc40030d940618e5c9df6f8b3fe6`.

The reconciliation commit has parents prior #97 head `871cd980...` and trusted
main `33986b33...`; it overlays the four canonical control-plane files from
trusted main while preserving the bounded Tier-B implementation diff. Canonical
exact-head CI run `32481196464`, `CI` run 571, was `in_progress` at the last
revalidation. All exact-head CI/release-owner/independent evidence from
`871cd980...` and earlier is stale for release because the head moved.

A fresh distinct Codex review on prior exact head
`871cd980cf6c1343336e5d63da78a82a28a8dda3` found P1
`Reject account Proxies before thenable assimilation`. The previously repaired
provider-array `map`/decorated-array attack remains a separate closed attack
class, but the hardened inert capture still occurs too late for a synchronously
returned Proxy result. `providerRead()` awaits the raw provider result first;
Promise/thenable assimilation therefore reads a result-owned `then` property
before the capture boundary. The independent review reproduced an Array Proxy
whose `get('then')` resolves each account read to an attacker-controlled plain
array; stable sampling, reference authorization and sensitive forwarding were
then reachable.

The trusted-main reconciliation does not repair this P1. Green CI on an older
head and any NON-INDEPENDENT owner PASS do not close it.

Required to unblock:

1. repair the provider-result transport boundary so a raw provider-controlled
   Proxy/thenable cannot execute result-owned dispatch before hardened capture;
   the bounded preferred direction is synchronous no-property-dispatch
   classification of the direct `provider.request()` return, hardened capture of
   non-Promise object results before any async boundary, and awaiting only genuine
   Promise transport values;
2. add a CI-wired adversarial regression reproducing `get('then')` substitution
   and proving zero result-owned trap dispatch, zero reference authorization and
   zero sensitive forwarding;
3. preserve the already repaired Array Proxy/decorated-`map`, intrinsic-poisoning,
   durable one-winner and replay cases;
4. rerun exact-head CI and release-owner six-lane review after the repair;
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
- stale top-level task-register current-main debt;
- PR #98 durable cross-chat control-plane merge and its post-merge PASS;
- PR #99 post-PR #98 checkpoint reconciliation and its post-merge PASS;
- PR #100 post-PR #99 checkpoint reconciliation, merged as `33986b33...` with
  recorded `POST_MERGE_ASSURANCE_PASS`.

The old PR #97 `map`/decorated-array P1 is not the current blocker. The current
blocker is the later thenable-assimilation P1 found on `871cd980...` and still
present after trusted-main reconciliation at `39186dcc...` until repaired.

If a regression is found in any merged property it becomes a **new** typed blocker
tied to the exact affected SHA; old blocker text is never revived as current
state.
