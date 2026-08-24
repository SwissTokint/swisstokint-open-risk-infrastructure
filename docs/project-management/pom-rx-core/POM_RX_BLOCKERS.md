# POM-RX Core — Durable Blockers Snapshot

Updated: `2026-08-24T09:58:00+02:00`

Read live GitHub first. This file is a versioned durable-blocker snapshot; embedded SHAs are historical-at-authoring anchors rather than a forever-current `main` claim.

Snapshot base: `8e8de6ae9744348e6c3eb2d1d0cf2ef3281de970` — PR #135 exact merge, exact-main CI 859 success, `5387715186 = POST_MERGE_ASSURANCE_PASS`, terminal checkpoint `5387722428`.

## `CONTROL_PLANE_CANONICAL_COORDINATION_GUARD_REPAIR_REQUIRED`

After PR #135, the next scheduled run correctly failed closed because policy required single-flight coordination but the repository had no canonical operational lock. The existing task was disabled.

Under explicit human instruction on 2026-08-24, canonical state was bootstrapped at:

- branch `automation/pom-rx-coordination`;
- file `.pom-rx/coordination-lock.json`;
- schema `pom-rx-coordination-lock/1`;
- active window 45 minutes;
- bootstrap commit `8a6fa63770b3244c693000979081bdd2d594058b`;
- first verified acquisition commit `05ae5e9cda05b7a2bf67e6eb039b78fabbfa002e`, holder `manual-repair-20260824T0727Z-gpt56sol`.

A deliberately stale acquisition using the previous FREE blob SHA was rejected by GitHub with HTTP 409.

Earlier PR #136 review produced two material findings which remain **unresolved until fresh same-head independent validation** even though the successor branch repairs them:

- P1 `PRRT_kwDOTiNyWc6bnBYA` — old writer could continue after expiry/reclamation;
- P2 `PRRT_kwDOTiNyWc6bnBYE` — stale capability map could route PR #131 after already-completed #135 rather than the new guard prerequisite.

Successor semantics:

- automation acquires **only FREE** by exact-blob-SHA CAS;
- active unexpired HELD => `SKIPPED_PREVIOUS_RUN_ACTIVE`;
- expired HELD => `SKIPPED_COORDINATION_GUARD_UNAVAILABLE`; **no automatic reclamation**;
- same-holder/unexpired state is re-read immediately before every project mutation;
- expiry/loss/unverifiability => no further project write and no same-run renewal/extension/reacquisition;
- exact current holder may perform coordination-only same-holder release even after expiry;
- abandoned stale HELD lock requires explicit human recovery;
- no issue/label/comment/local/chat/workflow/alternate-branch lock may compete;
- capability map now routes PR #131 only after PR #136 receives exact-merge PASS and canonical lock state is verified FREE.

Automatic stale takeover is intentionally forbidden because a timestamp in the coordination file cannot atomically fence an in-flight write on another GitHub resource.

Closure requires final PR #136 exact-head CI success, five-stage owner gate, fresh genuinely distinct exact-head review validating both repaired findings with zero new P0/P1/P2, decision-time state revalidation, merge, exact-main CI/status, exact-merge `POST_MERGE_ASSURANCE_PASS`, then verified FREE canonical state before the existing scheduled task is re-enabled.

## `PR131_RELEASE_BLOCKED_RECONCILIATION_REQUIRED`

PR #131 remains the next Tier-B dependency-closing workstream only **after** the guard repair above is trusted and the canonical lock is verified FREE. Authoring-time head: `3a75418ef13e7364b70e60a17e5514f1b1a8bfc2`; historical CI `32645853067` / CI 846 was green but is stale for release.

Seven P1 threads remain unresolved/outdated: `PRRT_kwDOTiNyWc6bfPvI`, `PRRT_kwDOTiNyWc6bfPvO`, `PRRT_kwDOTiNyWc6bfPvR`, `PRRT_kwDOTiNyWc6bfWeN`, `PRRT_kwDOTiNyWc6bfel5`, `PRRT_kwDOTiNyWc6bfel6`, `PRRT_kwDOTiNyWc6bfel7`.

After #136 exact-merge PASS, reconcile #131 with exactly one writer onto then-live trusted main. Any head move invalidates old release evidence. Require fresh canonical CI, five-stage owner gate, genuinely distinct exact-head review, zero unresolved P0/P1/P2, merge and exact-merge assurance.

## `PR131_SECURITY_BOUNDARY_REMAINS_NARROW`

Supported claim: explicit narrow trusted-provider transport contract. Fail closed before unowned provider transport origin. An in-contract rejected context transport must prove zero reference authorization, zero sensitive forwarding, clean process survival under `--unhandled-rejections=strict`, and no orphaned provider-rejection termination.

Already-originated decorated/rebased/Proxy/accessor/non-configurable-unsafe Promise objects from arbitrary providers remain out of contract without separately reviewed process/worker/RPC isolation. Do not install global rejection swallowing, execute hostile constructor/species accessors/Proxy paths, trust attacker-selected species constructors, weaken strict tests, or convert failure into authorization/forwarding.

## Historical branches

- PR #120: `CLOSED / NOT MERGED / STALE`; head `5238b9c289476100c875ed9a88bd7e21a574fa67`; six P1/P2 findings remain attack history. Never revive wholesale.
- PR #97: `OPEN / STALE / MUST_NOT_MERGE`; durable Gate composition must be reconstructed later from then-current trusted main.
- PR #93: `OPEN / STALE / UNTRUSTED / LATER`; reconstruct useful simulation work later, never wholesale-merge stale history.

## Other durable blockers

- `CORE_DURABLE_GATE_COMPOSITION_NOT_YET_TRUSTED` — common process-local Gate and filesystem durable claim primitive exist separately; reviewed durable claim-before-observer/downstream composition is not yet trusted.
- `DAGR_SOURCE_DOCUMENT_MISSING` — normative DAGR/profile work remains source-gated.
- `PRODUCTION_TRUST_UNPROVED` — production authorization, trusted time, KMS/HSM custody, distributed revocation/consensus, crash recovery, external observer independence/effect truth and arbitrary browser/provider integrity remain unproved.
- `REAL_WALLET_NOT_AUTHORIZED` — no private key, seed, secret, funded wallet, mainnet transaction or meaningful funds; burner local/testnet E2E requires separate explicit human authorization.

## Dependency and merge rule

A dependency becomes trusted only after the mandatory five-stage pre-merge gate, applicable exact-head technical/security gates, canonical exact-head CI, required genuinely distinct exact-head review, zero unresolved P0/P1/P2, merge, exact-main CI/status and exact-merge `POST_MERGE_ASSURANCE_PASS`. A moved head invalidates exact-head evidence. The independent-review waiver remains limited to PR #60.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded — not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.
