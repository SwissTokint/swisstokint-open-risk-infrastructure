# POM-RX Core — Active Blockers

Updated: `2026-08-21T15:13:33+02:00`

Current trusted main: `0564aecd42cf0794894c12842980969ff59c9f73`

This file lists **current** blockers only. Historical blockers remain in Git
history and must not be mistaken for current architecture. Live GitHub wins if a
PR head, review, CI run or merge changes after this checkpoint.

## Overall prototype gate

Status: `NO_GO_FOR_PRODUCTION / REFERENCE_DEVELOPMENT_CONTINUES`

Trusted main includes strict verification, exact-authorization/Gate reference
semantics, Witness reference trust, portable Wallet Guard preflight, execution
evidence, observation/reconciliation, controlled provider host, exact-main CI
observability and the GitHub-backed cross-chat control plane. PR #101 is a
trusted coordination-only checkpoint merge; it changed no protocol,
authorization or wallet-security semantics.

The maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`.
It never means production-ready, audited, certified, deployed, arbitrary-browser
safe or authorized for financial execution.

## PR #101 — resolved control-plane checkpoint merge

Status: `RESOLVED_POST_MERGE_ASSURANCE_PASS`

PR #101 source head `009064788008abe8ac1c08532f3d55ef1c19508f`
merged as exact main SHA `0564aecd42cf0794894c12842980969ff59c9f73`.
Its source-head and merge trees are identical. Canonical exact-main push CI run
`32482258034`, `CI` run 576 attempt 1, completed `success` on that exact merge
SHA; decision-time `pom-rx/exact-main-ci` was `success` targeting the same run.
The mandatory exact-merge report is recorded on PR #101 with
`POST_MERGE_ASSURANCE_PASS`: SpecKit, skeptical/falsification, security, code
quality, optimization and integration/regression all PASS for the bounded
documentation/control-plane scope.

PR #101 is therefore trusted coordination evidence. It did not make any open
Tier-B PR trusted and did not establish production or real-wallet readiness.

## PR #97 — durable claim + Core Gate composition

Status: `BLOCKED_EXACT_HEAD_P1_PROMISE_DRIFT_BEFORE_ASYNC_LAYERS / EXACT_HEAD_CI_FAILURE`

Current exact head: `639b96e7a64fa101432b3afcc3c08aebfcc838cf`.

Exact trusted base/main: `0564aecd42cf0794894c12842980969ff59c9f73`.

Canonical exact-head CI run `32486243945`, `CI` run 586, completed `failure` on
this exact SHA. The exact failing regression is
`post-import Promise prototype constructor drift is rejected before getter execution`:
the hostile constructor getter is observed four times, while that isolated test
still records `authorizationCalls: 0` and `sensitiveCalls: 0`.

The previous exact-head P1 on `37b8e699...`, **`Permit runtime bookkeeping
symbols on native promises`**, is now historical after the head moved. Current
head permits Node/AsyncHooks bookkeeping symbols sufficiently for the ordinary
native-Promise provider compatibility regression to pass. That repair is not a
release verdict because the new exact head has a different current P1.

A fresh distinct `chatgpt-codex-connector` review covers exact head
`639b96e7...` and reports P1 **`Reject Promise drift before entering async
layers`**. The current inner transport validator can reject an undecorated native
Promise when the captured `Promise.prototype.constructor` surface has drifted,
but the call stack around it is itself async. Fresh stack/reproducer evidence
shows outer awaits in `readProviderSnapshot`, `sampleStableProviderContext`,
`sampleTrustedContext` and `request` can consult poisoned inherited Promise
properties before the inner rejection reaches its caller. With inherited
`constructor` and `then` poisoned together, the independent reviewer reproduced
stable attacker-controlled context followed by reference authorization and a
sensitive provider forward. This is therefore a release-blocking security defect,
not only a brittle test expectation.

The previous hardening still matters and must not be weakened by the repair:

- direct non-Promise object/function results must cross the shared hardened inert
  capture boundary before async/thenable assimilation;
- result-owned `constructor` or `then` decoration on a native Promise must remain
  rejected before attacker-owned dispatch;
- ordinary genuine native Promise transports with inert Node/runtime bookkeeping
  symbols must remain compatible;
- rejected hostile Promise/proxy transports must not reach authorization or
  sensitive forwarding;
- raw Array Proxy/function-Proxy, decorated-Promise and same-realm intrinsic-drift
  regressions remain security evidence, not tests to delete.

The last release-owner six-lane PASS covered moved head
`f91079676aa8a21c0501bee3951bcd0d40c27083`, not the current head. It is stale.
All earlier green exact-head CI and independent/owner reviews are historical only.
Historical P1 threads remain unresolved and are not release evidence for the
current candidate.

Required to unblock:

1. close the Promise-prototype drift boundary before entering any outer async
   layer whose own Promise assimilation can consult attacker-controlled inherited
   `constructor`/`then` state;
2. preserve ordinary native-Promise compatibility, including inert runtime
   bookkeeping symbols, plus direct non-Promise capture and own Promise-decoration
   rejection;
3. retain/add CI-wired negative tests proving hostile Promise prototype drift,
   decorated native Promises and raw Proxy/thenable results fail before
   authorization/forwarding, plus positive ordinary-native-Promise compatibility;
4. rerun canonical exact-head CI after the repair and require success;
5. run a fresh release-owner SpecKit/falsification/security/code-quality/
   optimization/integration review on that exact head;
6. obtain a fresh distinct independent skeptical/security review on the same
   exact head and leave no unresolved P0/P1/P2;
7. only then resolve independently validated historical P1 threads and revalidate
   exact head + CI before merge;
8. after any merge run mandatory exact-merge-SHA assurance before treating the
   durable composition as trusted.

The durable composition remains reference-only. It does not prove hostile
same-OS-user storage integrity, distributed filesystem consensus, complete crash
recovery, production trusted time/Witness or external execution truth.

## PR #93 — Wallet Guard simulation exact-head/reconciliation gate

Status: `BLOCKED_TRUSTED_MAIN_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW`

Current live head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`.

Current PR base remains historical
`818718955c9e4136e9e55754a31be2f1c7b610f8`; live GitHub currently reports the
PR mergeable. That mergeability signal is **not** release evidence and does not
remove the trusted-main reconciliation requirement.

Last known exact-head CI on `c4e40ceb...`: run `32465835858`, `CI` run 541,
`success`. The latest distinct Codex release evidence covers a moved head, not
`c4e40ceb...`, and cannot release this PR.

PR #93 overlaps shared regression/package surfaces with PR #97. Required to
unblock:

1. finish safe dependency ordering around PR #97 and use only a trusted
   exact-merge post-merge PASS as dependency evidence;
2. reconcile #93 to the then-current trusted main instead of merging stale
   historical branch state wholesale;
3. rerun exact-head CI and release-owner architecture/falsification/security/
   code-quality/optimization/integration review on the resulting actual head;
4. obtain a fresh distinct independent skeptical/security review on that same
   exact head;
5. leave no unresolved P0/P1/P2.

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
- distributed replay/consensus semantics if deployment needs them;
- arbitrary browser/extension/provider integrity;
- external EVM state/effect truth and simulation-to-forwarding atomicity;
- production-independent observer integrity/liveness/finality;
- crash-recovery semantics for the complete authorization/Gate lifecycle;
- real/funded wallet safety.

No private key, seed, secret, funded wallet, meaningful funds or mainnet
transaction is authorized. Burner local/testnet E2E remains behind a separate
explicit human execution gate.

## Resolved historical blockers — do not reopen from stale documents

The following blocker classes are superseded by merged work and must not be
revived merely because older Git history mentions them:

- strict-profile prerequisite ratification and immutable fixture foundation;
- the strict invariant families and strict-profile activation;
- fresh-Windows exact-LF checkout issue;
- initial Core exact-authorization/single-use-Gate reference implementation;
- reference Witness enrollment/revocation/rotation lifecycle;
- shared bounded plain-data snapshot boundary as an existing capability;
- reference execution-evidence recorder;
- reference observation/reconciliation layer;
- Wallet Guard JSON ingress, policy object boundary, policy controller, portable
  preflight evidence and controlled-provider host;
- exact-main CI status publisher introduced by PR #96;
- PR #98 cross-chat control-plane merge and post-merge PASS;
- PR #99, #100 and #101 checkpoint reconciliations and their recorded post-merge
  PASS verdicts.

The older PR #97 event-loop, intrinsic-poisoning, Array `map`/decorated-array,
raw thenable-assimilation, Promise-decoration and native-Promise bookkeeping-symbol
reports remain valuable review history. Their repairs are not promoted to trusted
merely because later heads contain code intended to address them. The current
exact-head blocker is the Promise-prototype-drift-before-outer-async-layer P1 plus
red CI on `639b96e7...`. If a regression is found in any merged property it
becomes a **new** typed blocker tied to the exact affected SHA.
