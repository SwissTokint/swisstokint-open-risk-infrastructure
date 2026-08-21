# POM-RX Core — Active Blockers

Updated: `2026-08-21T18:31:00+02:00`

Current trusted main: `bfb3e4b7a062427d5ee53f7b76a280da657f6152`

This file lists **current** blockers only. Historical blockers remain in Git
history and must not be mistaken for current architecture. Live GitHub wins if a
PR head, review, CI run, review thread, mergeability signal or merge changes after
this checkpoint.

## Overall prototype gate

Status: `NO_GO_FOR_PRODUCTION / REFERENCE_DEVELOPMENT_CONTINUES`

Trusted main includes strict verification, exact-authorization/Gate reference
semantics, Witness reference trust, portable Wallet Guard preflight, execution
evidence, observation/reconciliation, controlled provider host, exact-main CI
observability and the GitHub-backed cross-chat control plane. PR #104 is the
latest trusted coordination-only checkpoint merge; it changed no protocol,
authorization or wallet-security semantics.

The maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`.
It never means production-ready, audited, certified, deployed, arbitrary-browser
safe or authorized for financial execution.

## PR #104 — resolved control-plane checkpoint merge

Status: `RESOLVED_POST_MERGE_ASSURANCE_PASS`

PR #104 source head `ff28d200949ae53250ff3beb4268732bf130ec22`
merged as exact main SHA `bfb3e4b7a062427d5ee53f7b76a280da657f6152`.
Source-head and merge trees are identical at
`11a1dec83c380f0515a1eaedbe5685c69e2b6edb`. Canonical exact-main push CI run
`32501713512`, `CI` run 625 attempt 1, completed `success` on that exact merge
SHA; decision-time `pom-rx/exact-main-ci` was `success` targeting the same run.
The mandatory exact-merge report is recorded on PR #104 with
`POST_MERGE_ASSURANCE_PASS`: SpecKit, skeptical/falsification, security, code
quality, optimization and integration/regression all PASS for the bounded
documentation/control-plane scope.

PR #104 is trusted coordination evidence only. It does not make any open Tier-B
PR trusted and does not establish production or real-wallet readiness.

## PR #97 — durable claim + Core Gate composition

Status: `BLOCKED_EXACT_HEAD_PROMISE_DRIFT_P1 / TEST_ONLY_FALSE_PASS_RISK / TRUSTED_MAIN_RECONCILIATION_REQUIRED`

Current exact head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`.
PR base: `0564aecd42cf0794894c12842980969ff59c9f73`.
Current trusted main: `bfb3e4b7a062427d5ee53f7b76a280da657f6152`.
Latest live GitHub reports `mergeable=true`; this is volatile mergeability/conflict
metadata only. It neither establishes reconciliation nor satisfies security review
or a release gate.

Canonical exact-head CI run `32487036517`, `CI` run 592, completed `success`.
Green CI does not clear the current technical/security blocker.

The exact head is one commit ahead of independently blocked parent `639b96e7...`
and changes only `tests/wallet-guard/provider-result-thenable-boundary.node.test.mjs`.
There is no provider/runtime implementation repair. The test was relaxed from
requiring zero hostile Promise-prototype constructor-getter dispatch to permitting
that dispatch when the isolated case itself records zero authorization/forwarding.

A fresh distinct `chatgpt-codex-connector` review covers exact head `0efb462...`
and reports P1 **`Reject Promise drift before entering async layers`**. Its
reproducer poisons inherited `Promise.prototype.constructor` plus `then`; outer
awaits in `readProviderSnapshot`, `sampleStableProviderContext`,
`sampleTrustedContext` and `request` can assimilate rejected provider reads before
the inner transport rejection reaches the caller. The poisoned continuations can
substitute stable attacker-controlled context, after which reference authorization
runs and a sensitive provider call is forwarded.

Release-owner review on exact head `0efb462...` remains **BLOCK /
NON-INDEPENDENT** because weakening a regression without repairing or
independently disproving the exploit creates false-PASS risk.

Review-thread state was re-read from live GitHub. The exact-head P1 thread
`Reject Promise drift before entering async layers` remains unresolved and
non-outdated. Several earlier P1 threads are also deliberately unresolved pending
a final repaired, reconciled, independently validated exact head. Their moved-head
fixes are useful history but are not release evidence.

The earlier finding **`Permit runtime bookkeeping symbols on native promises`** is
historical after later compatibility work: ordinary native-Promise transport under
Node/AsyncHooks bookkeeping symbols passes the relevant regression. The real
security repair must preserve that compatibility.

Required to unblock:

1. start/reconcile the final repaired candidate from the then-current trusted main;
2. repair runtime handling so inherited Promise-prototype drift is detected or avoided before outer async layers can consult attacker-controlled `constructor`/`then` state;
3. restore or replace CI-wired coverage for the independent sensitive-forwarding exploit instead of relying on the relaxed assertion;
4. preserve direct non-Promise object/function hardened capture, own decorated native-Promise rejection and ordinary native-Promise bookkeeping-symbol compatibility;
5. require zero authorization and zero sensitive forwarding for hostile rejected transports;
6. rerun canonical exact-head CI on the repaired head;
7. obtain release-owner six-lane PASS on that exact head;
8. obtain a fresh distinct exact-head skeptical/security review and leave no unresolved P0/P1/P2;
9. resolve historical threads only when the final exact-head evidence actually validates them;
10. after merge run mandatory exact-merge-SHA assurance before treating the composition as trusted.

The durable composition remains reference-only. It does not prove hostile
same-OS-user storage integrity, distributed filesystem consensus, complete crash
recovery, production trusted time/Witness or external execution truth.

## PR #93 — Wallet Guard simulation exact-head/reconciliation gate

Status: `BLOCKED_TRUSTED_MAIN_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW`

Current exact head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`.
Historical PR base: `818718955c9e4136e9e55754a31be2f1c7b610f8`.
Current trusted main: `bfb3e4b7a062427d5ee53f7b76a280da657f6152`.
Latest live GitHub reports `mergeable=true`; this is volatile conflict/mergeability
metadata only and not trusted-main reconciliation, security review or release
evidence.

Last exact-head canonical CI on `c4e40ceb...`: run `32465835858`, `CI` run 541,
`success`. The latest distinct Codex release evidence covers a moved head, not
current `c4e40ceb...`, and cannot release this PR.

Review-thread state was re-read from live GitHub. Unresolved current/non-outdated
P1/P2 threads remain, including exact-value generic signature commitment,
typed-data wrapper normalization, request-commitment/canonicalization/hash and
nested payload capture concerns. Other findings are outdated because the branch
moved, but moved-head repairs do not release the current head. PR #93 also
overlaps shared regression/package surfaces with PR #97.

Required to unblock:

1. finish safe dependency ordering around PR #97 and use only a trusted exact-merge post-merge PASS as dependency evidence;
2. reconcile #93 to the then-current trusted main instead of merging stale historical branch state wholesale;
3. rerun exact-head CI and release-owner architecture/falsification/security/code-quality/optimization/integration review;
4. obtain a fresh distinct exact-head skeptical/security review;
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

Superseded blocker classes include strict-profile prerequisite/fixture foundation,
strict-profile activation, fresh-Windows exact-LF checkout, initial Core exact
authorization/process-local Gate, Witness enrollment/revocation/rotation,
reference plain-data boundary, execution evidence, observation/reconciliation,
Wallet Guard JSON/policy/controller/preflight/provider/controlled-host foundation,
exact-main CI status publication, and control-plane checkpoint PRs #98 through
#104 with their recorded post-merge PASS verdicts.

Older PR #97 event-loop, intrinsic-poisoning, Array/decorated-array, thenable,
Promise-decoration and native-Promise bookkeeping-symbol reports remain useful
review history. Their moved-head repairs are not promoted to trusted merely
because later branch code attempted to address them. The active release blocker
is the exact-current-head Promise-prototype-drift-before-outer-async-layer P1 plus
test-only false-PASS risk and trusted-main reconciliation. Any regression found in
a merged property becomes a new typed blocker tied to the exact affected SHA.
