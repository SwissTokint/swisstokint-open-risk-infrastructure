# POM-RX Core — Durable Blockers Snapshot

Updated: `2026-09-07T10:59:00Z`

Read live GitHub first. This **versioned snapshot** records durable blockers and authoring-time evidence; it is not a claim that embedded SHAs remain current after its own merge.

- `snapshot_base_main`: `25895be9364903b21704cff223faec92f10354f1` — PR #163 actual merge;
- `last_assured_main_before_snapshot`: `25895be9364903b21704cff223faec92f10354f1`;
- canonical push/main CI #1300 / run `34113836199`, attempt 1: SUCCESS, all 20 steps;
- latest matching `pom-rx/exact-main-ci`: success `53667615499`, published by `github-actions[bot]`;
- distinct six-part [POST_MERGE_ASSURANCE_PASS](https://github.com/SwissTokint/swisstokint-open-risk-infrastructure/pull/163#issuecomment-5569622009);
- [reviewed open-PR routing](https://github.com/SwissTokint/swisstokint-open-risk-infrastructure/issues/143#issuecomment-5569521081).

## Current repair and dependency blockers

| Work | Snapshot state | Next bounded action |
| --- | --- | --- |
| #175 trusted security CI | Head `43d7d5bd8bb833334c556bd51415e64aecc80383`; CI1287 green; 42 unresolved discussions, including five latest P1 | Highest assurance priority: assertion isolation, authenticated child completion, isolated-runner coverage, uncertain publication handling and invalidation retry; then historical finding adjudication and independent bootstrap proof. |
| #167 prior provenance proposal | Draft; three P1 remain despite CI1192 green | Retain as alternative predecessor to #175; do not merge both as additive fixes. |
| #150 durable Core Gate | Head `8576e43c7585568a630b3c410fb6043930ab88b4`; CI1191 fails npm test; conflicted | Scoped successor on assured main: Node22 channel lifecycle, trusted owner environment/executable capture and pre-await capacity accounting. Existing fd-ownership and all historical unresolved controls remain required. |
| #157 then #156 | #157 is an OPEN Core specification issue; #156 has one architectural P2 | Under the existing single-Core-writer order, address #157 after #150; accept the shared primitive before migrating MCP from its private commitment implementation. |
| #139 Sepolia Wallet Guard | Draft, conflicted old stack; useful work retained | Reconstruct remaining profile/observer/browser scope against current receipt/context/journal/shutdown boundaries. The separate human wallet gate remains. |
| #160 tokenomics research | CI1070 cancelled; three arithmetic/accounting P1 families and later depletion-reporting P2 | Preserve exact conservation, all 3,600 cases and 365/1,825-day horizons; repair the model and reporting, not only sharding or timeout settings. |
| #162 Stellar action | CI1268 green on old base; action SHA changes but explicit CLI version remains 27.0.0 | Clarify action-only scope, refresh main, verify attested installation/build compatibility and obtain fresh review/CI. |

The four named #150 repair families do not exhaust or close its unresolved historical findings. The fd-ownership proof and existing P1/replay/crash controls remain gates. #156 cannot privately assume ownership of shared Core commitment semantics. No old green CI or implementation-owner reply alone closes an independent finding.

## Resolved transitions and preserved history

The canonical guard exists and #136/#131/#137/#138 are merged; routing new work back to those historical open states is obsolete. #176/#177/#178 supply the current journal/server/shutdown pieces. #177's original shutdown P2 BLOCK remains historical evidence; #178 resolves it on its assured successor. #163 is merged and assured as the snapshot baseline. None of these transitions accepts the remaining Sepolia stack or a real wallet exercise.

## Trusted-boundary limitations

The provider transport remains a narrow clean-process contract. It does not recover pristine built-ins after hostile pre-import mutation and does not establish arbitrary-provider Promise integrity. Preserve the accepted strict rejection, callback, receipt/context, intrinsic-boundary and expected-red controls; do not turn failure or unknown input into authorization.

Journal records remain nonterminal operation facts. No automatic recovery/reuse, durable completion, power-loss guarantee, future hash after process exit or bounded stalled-filesystem shutdown claim is added.

## Continuing external and product blockers

- `CORE_DURABLE_GATE_COMPOSITION_NOT_YET_TRUSTED` — #150 remains blocked.
- `DAGR_SOURCE_DOCUMENT_MISSING` — normative governance-profile work remains source-gated.
- `PRODUCTION_TRUST_UNPROVED` — production custody, trusted time, distributed revocation/consensus, recovery and external observer/effect truth remain unproved.
- `REAL_WALLET_NOT_AUTHORIZED` — no funded wallet, mainnet or meaningful funds; burner local/testnet requires its separate human gate.
- `TOKEN_NECESSITY` and `ECONOMIC_SURVIVAL` remain OPEN; #160 is bounded research.

## Coordination and merge rule

Use the existing canonical guard per `POM_RX_COORDINATION_GUARD.md`; no automatic expired-holder reclamation or same-run renewal. No competing lock or project-management system. The five-stage gate, genuinely distinct exact-head review, zero unresolved P0/P1/P2, canonical CI and actual-merge assurance remain mandatory. A moved head invalidates evidence. The independent-review waiver remains PR #60 only. Scheduled-task enabled state must be inspected live, not inferred from this snapshot.

POM-RX remains the single principal technical product; Wallet Guard is one application profile. Core owns shared canonicalization, commitment, verifier, Witness, authorization, Gate, execution evidence and observation/reconciliation semantics.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded. No production, audit, certification, deployment, wallet or financial-safety claim follows from these merges. No real/funded wallet, mainnet transaction, secret or meaningful funds are authorized. Burner local/testnet E2E requires a separate explicit human gate. Public-site/Vercel/funding-directory writes remain out of scope.
