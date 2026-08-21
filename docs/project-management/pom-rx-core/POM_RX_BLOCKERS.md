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

Status: `BLOCKED_EXACT_HEAD_P1_NATIVE_PROMISE_SYMBOL_COMPATIBILITY / EXACT_HEAD_CI_FAILURE`

Current exact head: `37b8e6998f0867f97ef1efcf3dacab50f4097748`.

Exact trusted base/main: `0564aecd42cf0794894c12842980969ff59c9f73`.

Canonical exact-head CI run `32485543302`, `CI` run 584, completed `failure` on
this exact SHA. The failing global suite rejects ordinary genuine native Promise
provider context transport as `POMRX_WG_PROVIDER_E_CONTEXT_INVALID`.

A fresh distinct `chatgpt-codex-connector` review covers this exact head and
reports P1 **`Permit runtime bookkeeping symbols on native promises`**. The
current `validateNativePromiseTransport()` correctly uses captured reflection and
checks the Promise prototype/constructor surface, but it also rejects every own
symbol on a native Promise. Under Node's `node --test` runner and promise hooks,
ordinary native Promises receive runtime bookkeeping symbols such as async and
trigger IDs. Those symbols are not the result-owned `constructor`/`then` surface
consulted by Promise assimilation, so the current all-symbol rejection converts a
legitimate transport into a false reject and makes canonical CI red.

The previous hardening still matters and must not be weakened by the repair:

- direct non-Promise object/function results must cross the shared hardened inert
  capture boundary before async/thenable assimilation;
- result-owned `constructor` or `then` decoration on a native Promise must remain
  rejected before attacker-owned dispatch;
- post-import drift of the load-bearing Promise prototype constructor/thenable
  surface must remain fail-closed under the documented same-realm threat model;
- the raw Array Proxy/function-Proxy and decorated-Promise regressions remain
  security evidence, not compatibility tests to delete.

The last release-owner six-lane PASS covered moved head
`f91079676aa8a21c0501bee3951bcd0d40c27083`, not the current head. It is stale.
All earlier green exact-head CI and independent/owner reviews are historical only.
Historical P1 threads remain unresolved and are not release evidence for the
current candidate.

Required to unblock:

1. make the smallest native-Promise transport correction that permits inert
   runtime bookkeeping symbols while preserving rejection of dangerous
   `constructor`/`then` decoration and Promise-prototype drift;
2. retain or add CI-wired negative tests proving the decorated/native-Promise,
   Proxy/thenable and post-import drift attacks remain fail-closed, plus a positive
   compatibility test proving ordinary instrumented native Promises work;
3. rerun canonical exact-head CI after the repair and require success;
4. run a fresh release-owner SpecKit/falsification/security/code-quality/
   optimization/integration review on that exact head;
5. obtain a fresh distinct independent skeptical/security review on the same
   exact head and leave no unresolved P0/P1/P2;
6. only then resolve independently validated historical P1 threads and revalidate
   exact head + CI before merge;
7. after any merge run mandatory exact-merge-SHA assurance before treating the
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
raw thenable-assimilation and Promise-decoration reports remain valuable review
history. Their repairs are not promoted to trusted merely because later heads
contain code intended to address them. The current exact-head blocker is the
native-Promise bookkeeping-symbol false rejection plus red CI on `37b8e699...`.
If a regression is found in any merged property it becomes a **new** typed blocker
tied to the exact affected SHA.
