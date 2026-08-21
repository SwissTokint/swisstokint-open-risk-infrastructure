# POM-RX Core — Active Blockers

Updated: `2026-08-21T17:40:00+02:00`

Current trusted main: `2c5370907e6f20c3dcfdc25ac89c0b1fa1b6f4f9`

This file lists **current** blockers only. Historical blockers remain in Git
history and must not be mistaken for current architecture. Live GitHub wins if a
PR head, review, CI run or merge changes after this checkpoint.

## Overall prototype gate

Status: `NO_GO_FOR_PRODUCTION / REFERENCE_DEVELOPMENT_CONTINUES`

Trusted main includes strict verification, exact-authorization/Gate reference
semantics, Witness reference trust, portable Wallet Guard preflight, execution
evidence, observation/reconciliation, controlled provider host, exact-main CI
observability and the GitHub-backed cross-chat control plane. PR #103 is the
latest trusted coordination-only checkpoint merge; it changed no protocol,
authorization or wallet-security semantics.

The maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`.
It never means production-ready, audited, certified, deployed, arbitrary-browser
safe or authorized for financial execution.

## PR #103 — resolved control-plane checkpoint merge

Status: `RESOLVED_POST_MERGE_ASSURANCE_PASS`

PR #103 source head `f422d57fd6bfe6824ac3fc86a761d8d474df62f3`
merged as exact main SHA `2c5370907e6f20c3dcfdc25ac89c0b1fa1b6f4f9`.
Its source-head and merge trees are identical:
`eb27b114e7017798606ca456d32934390eda02d3`. Canonical exact-main push CI run
`32496183065`, `CI` run 613 attempt 1, completed `success` on that exact merge
SHA; decision-time `pom-rx/exact-main-ci` was `success` targeting the same run.
The mandatory exact-merge report is recorded on PR #103 with
`POST_MERGE_ASSURANCE_PASS`: SpecKit, skeptical/falsification, security, code
quality, optimization and integration/regression all PASS for the bounded
documentation/control-plane scope.

PR #103 is therefore trusted coordination evidence. It did not make any open
Tier-B PR trusted and did not establish production or real-wallet readiness.

## PR #97 — durable claim + Core Gate composition

Status: `BLOCKED_EXACT_HEAD_PROMISE_DRIFT_P1 / TEST_ONLY_FALSE_PASS_RISK / TRUSTED_MAIN_RECONCILIATION_REQUIRED`

Current exact head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`.

PR base SHA remains `0564aecd42cf0794894c12842980969ff59c9f73`,
while current trusted main is `2c5370907e6f20c3dcfdc25ac89c0b1fa1b6f4f9`.
Live GitHub final revalidation reports PR #97 `mergeable=true` with
`mergeable_state=clean`. That signal is only GitHub's current
mergeability/conflict computation; it is not trusted-main reconciliation,
security evidence or release evidence. The eventual repaired candidate must still
be reconciled to the then-current trusted main before any release gate can pass.

Canonical exact-head CI run `32487036517`, `CI` run 592, completed `success` on
exact head `0efb462...`. Green CI does not clear the current technical/security
blocker.

Current head is one commit ahead of independently blocked parent
`639b96e7a64fa101432b3afcc3c08aebfcc838cf` and changes only
`tests/wallet-guard/provider-result-thenable-boundary.node.test.mjs` by four
additions and four deletions. There is **no provider/runtime implementation
repair** on this move. The test was changed from requiring the hostile
Promise-prototype constructor getter never execute to allowing getter execution so
long as that isolated case records zero authorization and zero sensitive
forwarding.

A fresh distinct `chatgpt-codex-connector` review covers exact head
`0efb462f0b4b8cff62d664a51d13ad71306b6bbb` and reports P1 **`Reject Promise
drift before entering async layers`**. The reviewer states that the relaxed
assertion hides the still-reachable parent exploit. The exact-head reproducer
poisons inherited `Promise.prototype.constructor` plus `then`; outer awaits in
`readProviderSnapshot`, `sampleStableProviderContext`, `sampleTrustedContext` and
`request` assimilate rejected promises before the inner transport rejection
reaches its caller. The poisoned continuations can substitute stable
attacker-controlled context, after which reference authorization runs and a
sensitive provider call is forwarded.

A release-owner review is also recorded on exact head `0efb462...` as **BLOCK /
NON-INDEPENDENT**, because weakening the regression without repairing or
independently disproving the exploit creates false-PASS risk. The exact-head
independent P1 and owner block therefore override green CI for release purposes.

Multiple historical P1 review threads are deliberately still unresolved. They
include older event-loop, intrinsic-poisoning, Array/provider-result and Promise
transport attack classes. Some individual fixes exist on moved heads, but those
threads must not be closed as release evidence until a final repaired exact head
is reconciled, green and independently validated. The active exact-current P1 is
`Reject Promise drift before entering async layers`.

The earlier `37b8e699...` finding **`Permit runtime bookkeeping symbols on native
promises`** is historical after subsequent moves: ordinary native-Promise
transport under Node/AsyncHooks bookkeeping symbols passes the relevant
compatibility regression. That compatibility must remain preserved by the real
security repair.

The previous hardening still matters and must not be weakened:

- direct non-Promise object/function results must cross the shared hardened inert
  capture boundary before async/thenable assimilation;
- own `constructor`/`then` decoration on native Promise transports must remain
  rejected before attacker-owned dispatch;
- ordinary genuine native Promises with inert runtime bookkeeping symbols must
  remain compatible;
- hostile Promise-prototype drift must not be consulted by outer async layers
  before fail-closed rejection;
- rejected hostile Promise/proxy transports must not reach authorization or
  sensitive forwarding;
- prior Array Proxy/function-Proxy, decorated-Promise, intrinsic-poisoning and
  durable-Gate regressions remain security evidence rather than tests to weaken.

Required to unblock:

1. reconcile the final repair to the then-current trusted main;
2. repair runtime handling so Promise-prototype drift is detected/avoided before
   entering outer async layers whose assimilation can consult inherited attacker
   `constructor`/`then` state;
3. restore or replace CI-wired regression coverage for the independent
   sensitive-forwarding exploit class instead of relying on the relaxed isolated
   assertion;
4. preserve ordinary native-Promise bookkeeping-symbol compatibility plus direct
   non-Promise capture and own native-Promise decoration rejection;
5. require zero authorization and zero sensitive forwarding for hostile rejected
   transports;
6. rerun canonical exact-head CI and require success on the actual repaired head;
7. record a fresh release-owner six-lane PASS on that exact head;
8. obtain a fresh distinct independent skeptical/security review on the same
   exact head and leave no unresolved P0/P1/P2;
9. only then resolve independently validated historical P1 threads and revalidate
   exact head + CI before merge;
10. after any merge run mandatory exact-merge-SHA assurance before treating the
   durable composition as trusted.

The durable composition remains reference-only. It does not prove hostile
same-OS-user storage integrity, distributed filesystem consensus, complete crash
recovery, production trusted time/Witness or external execution truth.

## PR #93 — Wallet Guard simulation exact-head/reconciliation gate

Status: `BLOCKED_TRUSTED_MAIN_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW`

Current live head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`.

Current PR base remains historical
`818718955c9e4136e9e55754a31be2f1c7b610f8`; current trusted main is
`2c5370907e6f20c3dcfdc25ac89c0b1fa1b6f4f9`. Live GitHub final revalidation
reports PR #93 `mergeable=true` with `mergeable_state=clean`. That
mergeability/conflict signal does not satisfy trusted-main reconciliation, does
not refresh moved-head review evidence, and is not a security/release verdict.

Last known exact-head CI on `c4e40ceb...`: run `32465835858`, `CI` run 541,
`success`. The latest distinct Codex release evidence covers a moved head, not
`c4e40ceb...`, and cannot release this PR.

PR #93 has unresolved P1/P2 review history, including current/non-outdated threads
that have not been independently validated on its current head. Those threads
must not be mechanically resolved or treated as fixed through moved-head evidence.
PR #93 also overlaps shared regression/package surfaces with PR #97.

Required to unblock:

1. finish safe dependency ordering around PR #97 and use only a trusted exact-merge
   post-merge PASS as dependency evidence;
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
- PR #99, #100, #101, #102 and #103 checkpoint reconciliations and their recorded
  post-merge PASS verdicts.

The older PR #97 event-loop, intrinsic-poisoning, Array `map`/decorated-array,
raw thenable-assimilation, Promise-decoration and native-Promise bookkeeping-symbol
reports remain valuable review history. Their repairs are not promoted to trusted
merely because later heads contain code intended to address them. The current
technical release blocker is the exact-current-head Promise-prototype-drift-before-
outer-async-layer P1 on `0efb462...`, plus false-PASS risk from that test-only
head; trusted-main reconciliation is additionally required after PR #103. If a
regression is found in any merged property it becomes a **new** typed blocker tied
to the exact affected SHA.
