# POM-RX Core — Active Blockers

Updated: `2026-08-21T14:45:00+02:00`

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

Status: `REPAIR_IMPLEMENTED / BLOCKED_FRESH_INDEPENDENT_EXACT_HEAD_VALIDATION`

Current exact head: `8195c55970be8230f58a5c237430e7371f400dd7`.

Exact trusted base/main: `0564aecd42cf0794894c12842980969ff59c9f73`.

Canonical exact-head CI run `32482359072`, `CI` run 577, completed `success` on
this exact SHA. A release-owner six-lane exact-head review is PASS with zero owner
P0/P1/P2 and is explicitly **NON-INDEPENDENT**.

The latest distinct independent finding was P1 `Reject account Proxies before
thenable assimilation` on moved head
`871cd980cf6c1343336e5d63da78a82a28a8dda3`. That attack is now implemented as
repaired on current head `8195c559...`: `providerRead()` obtains the direct
`provider.request()` result synchronously, uses a module-initialization-captured
native `node:util` `types.isPromise` classifier without reading result-owned
properties, and sends every direct non-Promise object through the shared hardened
`captureReferencePlainData()` boundary before crossing an async/thenable
assimilation boundary.

CI-wired regression `tests/wallet-guard/provider-result-thenable-boundary.node.test.mjs`
reproduces a synchronous `eth_accounts` Array Proxy with attacker-controlled
`get('then')` substitution and requires zero `then` traps, zero other Proxy traps,
zero reference-authorization calls and zero sensitive forwarding before
fail-closed `POMRX_WG_PROVIDER_E_CONTEXT_INVALID`. A companion case preserves
ordinary synchronous plain-array provider compatibility. Genuine native Promise
transport remains supported. Upstream thenable assimilation already performed
inside a genuine native Promise implementation before fulfillment reaches the
gateway remains an explicit non-claim.

A fresh `@codex review` request is recorded specifically for exact head
`8195c559...`; at this checkpoint there is still no distinct independent review
of that exact SHA. Historical P1 threads remain intentionally unresolved until
that validation occurs. They therefore remain a release gate, even though the
corresponding repairs are implemented and green in CI.

Required to unblock:

1. keep exact head `8195c559...` frozen while awaiting the fresh distinct
   independent skeptical/security review;
2. require that review to cover the repaired thenable boundary and the full
   durable-Gate composition and leave no unresolved P0/P1/P2;
3. if clean, resolve only the historical P1 threads independently validated by
   that exact-head review, then immediately revalidate that the head and exact
   successful CI are unchanged;
4. if a new P0/P1/P2 appears, repair the smallest attack class, add a CI-wired
   regression and rerun all exact-head gates;
5. merge only after every gate passes; after merge run mandatory exact-merge-SHA
   assurance before treating the composition as trusted.

The durable composition remains reference-only. It does not prove hostile
same-OS-user storage integrity, distributed filesystem consensus, complete crash
recovery, production trusted time/Witness or external execution truth.

## PR #93 — Wallet Guard simulation exact-head/reconciliation gate

Status: `BLOCKED_TRUSTED_MAIN_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW`

Current live head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`.

Current PR base remains historical
`818718955c9e4136e9e55754a31be2f1c7b610f8`; live mergeability at this
checkpoint is `false`.

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

The old PR #97 Array `map`/decorated-array and thenable-assimilation reports remain
valuable review history. Their repaired code is not promoted to trusted until a
fresh independent review validates the exact current head and the corresponding
threads are resolved. If any regression is found in a merged property it becomes
a **new** typed blocker tied to the exact affected SHA.
