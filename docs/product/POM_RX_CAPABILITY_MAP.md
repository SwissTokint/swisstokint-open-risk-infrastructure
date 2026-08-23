# POM-RX capability map

Status: `CURRENT_INFORMATION_ARCHITECTURE / NON_NORMATIVE`

Date: 2026-08-23

This is a **versioned snapshot**, not a self-referential claim about the forever-current GitHub head.

- `snapshot_base_main`: `e45869bf77025566d6be4edac58424f6002ad08e` — live main observed when the continuity-model repair branch was created;
- base state: PR #134 exact merge, exact-main CI `32654441831` / CI 852 = `success`, post-merge assurance `5387352052 = POST_MERGE_ASSURANCE_CONDITIONAL` due the checkpoint self-reference/liveness defect;
- `last_assured_main_before_snapshot`: `ed0cc5936a12fcd420890ee1553690569b2d4ec7` via PR #133 assurance `5387034808 = POST_MERGE_ASSURANCE_PASS`.

Exact live `main`, active PR/head/CI/review/thread state and post-merge verdict are always read from GitHub. After a control-plane merge, the exact resulting main SHA/status/assurance belongs in the merged PR terminal checkpoint; do not create another docs-only reconciliation merely to replace `snapshot_base_main` with that merge SHA.

This document organizes repository work. It does not change protocol semantics, publish a new POM-RX version, establish production readiness, or by itself activate an authorization/Gate claim.

## 1. Product rule

POM-RX is the single principal technical product in this repository. Application domains, profiles, adapters, demonstrations and network integrations are not separate peer products merely because they have implementation work.

Application blocks are not mutually exclusive; they may overlap, but shared semantics are owned once in Core. A capability block may implement only part of the lifecycle. Missing stages remain explicit and must never be inferred from a structurally valid receipt, simulation result, proof or anchor.

The common lifecycle remains:

```text
intent/context
  -> policy/preflight
  -> exact authorization
  -> execution-side Gate
  -> execution evidence
  -> independent observation
  -> reconciliation
  -> portable proof/evidence
```

## 2. Shared Core and cross-cutting layers

### POM-RX Core

Historical `pom-rx/0.1` compatibility remains frozen. Strict verification, exact policy/runtime/artifact binding, hostile-object/plain-data capture, Witness, exact authorization, the process-local single-use Gate, the filesystem durable claim primitive, execution evidence and observation/reconciliation remain shared Core capabilities according to their merged reviewed scope.

Application blocks may add adapters, profiles, fixtures and tests. They must not duplicate or fork Core canonicalization, hashing, verifier, Witness or Gate semantics. Shared reference-data, exact authorization, execution-evidence and observation/reconciliation semantics also remain Core-owned.

Strict verification is structurally non-authorizing. A valid receipt, proof, anchor, simulation result or observation record never substitutes for the execution-side Gate.

### Exact authorization and Gate

The repository contains the common exact-authorization contract, a process-local single-use Gate and a separate filesystem durable claim-store reference primitive. Reviewed composition of the durable claim primitive with the common Gate is **not** yet a trusted dependency.

Historical PR #97 remains `OPEN / STALE / MUST_NOT_MERGE` at `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`; against `snapshot_base_main` it is diverged ahead 66 / behind 267. Durable composition is reconstructed later from then-live trusted main only after the fresh Wallet Guard provider-transport prerequisite becomes trusted.

### Continuity-model repair

PR #134 post-merge assurance found a P2 project-control liveness defect: the old coordination model hard-coded its pre-merge parent as “exact current main” and listed its own branch as the current reconciliation. Every successful docs merge therefore made its files immediately stale and could trigger another docs-only reconciliation forever.

The authoring-time repair branch is `docs/pom-rx-non-self-referential-continuity-20260823-1923`. It is bounded to `POM_RX_AUTOMATION_POLICY.md`, RESUME, TASKS, BLOCKERS, TEAM_ROSTER and this capability map. It changes no runtime, tests, protocol, Gate, Witness, verifier, Wallet Guard/provider, wallet/network, public-site/Vercel or financial-execution semantics.

The stable rule is now: live exact state comes from GitHub plus the latest merged PR terminal checkpoint; versioned files carry snapshot anchors and durable transition rules. Once the latest continuity repair receives exact-merge `POST_MERGE_ASSURANCE_PASS`, no additional docs-only PR is required solely because that repair's own merge SHA differs from `snapshot_base_main`.

### Next application prerequisite — PR #131

PR #131 on `automation/wg-trusted-provider-transport-20260823` remains the next dependency-closing Tier-B workstream, but is not trusted until the continuity repair is closed and #131 is reconciled onto then-live main.

Authoring-time snapshot:

- head `3a75418ef13e7364b70e60a17e5514f1b1a8bfc2`;
- against `snapshot_base_main`: diverged ahead 32 / behind 18, merge-base `87ed6ac814f868dc4599cb5d236babdeea8c3cc9`;
- historical CI `32645853067` / CI 846 attempt 1 = `success`, but not current release evidence;
- seven P1 threads unresolved/outdated: `PRRT_kwDOTiNyWc6bfPvI`, `PRRT_kwDOTiNyWc6bfPvO`, `PRRT_kwDOTiNyWc6bfPvR`, `PRRT_kwDOTiNyWc6bfWeN`, `PRRT_kwDOTiNyWc6bfel5`, `PRRT_kwDOTiNyWc6bfel6`, `PRRT_kwDOTiNyWc6bfel7`.

The branch contains attempted repairs/regressions for provider binding, complete Array prototype-chain checks, Node Promise bookkeeping allowances, pre-import Promise/reflection/provenance poisoning and proxied Promise-constructor traps. None becomes trusted until #131 is reconciled onto then-live main, freezes a new exact head, reruns canonical CI, passes the full owner gate, receives a fresh genuinely distinct exact-head review, closes all P0/P1/P2 on same-head evidence, merges, and receives exact-merge assurance PASS.

#### Accepted provider-transport boundary

The accepted direction is the explicit narrow **trusted-provider transport contract** for the local Node prototype. The controlled provider/adapter must be rejected before origin when provenance or runtime integrity is ambiguous. Inside the supported contract, an in-contract rejected context transport must fail closed with zero reference authorization, zero sensitive forwarding, clean child-process survival under `--unhandled-rejections=strict`, and no orphaned provider-rejection termination.

Decorated/rebased/Proxy/accessor/non-configurable-unsafe Promise objects from arbitrary providers remain excluded. An already-originated excluded rejected Promise is an explicit unsupported negative unless separately reviewed process/worker/RPC isolation is introduced. The in-contract survival regression must not be represented as same-process survival proof for that hostile object.

The generic `createWalletGuardReferenceProviderGateway()` remains available and is not upgraded into a hostile-provider-wide Promise-integrity claim. The existing `controlled-host.mjs` path is not rebound by this prerequisite; broader Wallet Guard operational readiness therefore does not advance merely because PR #131 eventually passes.

The selected direction must not install process-global `unhandledRejection`/`uncaughtException` swallowing, execute hostile constructor/species accessors or Proxy constructor/species paths, silently trust attacker-selected species constructors, weaken strict rejection tests, or convert unknown/failure into authorization/forwarding.

Six closed PR #120 P1/P2 threads remain additional mandatory attack history: `PRRT_kwDOTiNyWc6bZjxp`, `PRRT_kwDOTiNyWc6bZ6tx`, `PRRT_kwDOTiNyWc6bZ6tz`, `PRRT_kwDOTiNyWc6baFkR`, `PRRT_kwDOTiNyWc6baIxZ`, `PRRT_kwDOTiNyWc6bc4gh`. PR #120 remains `CLOSED / NOT MERGED / STALE` and must not be reopened or wholesale-merged.

### Witness

Source-signed preflight material, Witness acknowledgement primitives and the process-local reference lifecycle remain shared Core. Wallet Guard may consume a Core-verified Witness candidate through its application adapter but does not own or fork Witness semantics. Production KMS/HSM, distributed revocation, remote attestation, quorum and trusted-time service semantics remain unproved.

### Execution evidence

The shared bounded reference recorder binds exact authorization commitments to recorder chronology and adapter-reported outcomes/effects. It is not itself an execution path and does not prove external effect truth.

### Observation and reconciliation

The shared reference layer compares bounded observation evidence against validated exact authorization binding and expected status/effect/chronology. Production observer independence, liveness, finality and external-world truth remain outside the reference claim.

### Proof transport and anchoring

Proof Receipt, Merkle batching, content-addressed storage and blockchain/network anchors provide evidence transport, persistence or publication. They do not become the authorization boundary merely because they are on-chain.

### Governance profile

`POM-RX Governance Profile — DAGR` is a cross-cutting profile under POM-RX. It is not a second product, audit firm, certification system or global security score. Normative DAGR work remains source-gated while `DAGR_SOURCE_DOCUMENT_MISSING` is active.

## 3. Application blocks

### Payments and financial operations

Examples include destination/amount controls, trading-agent preflight and execution reconciliation, beneficiary policy and exchange/broker adapter evidence.

### AI agents

Examples include external tool/API calls, bounded spending/transfer authority, model-generated actions requiring policy decisions and separation of agent intent, authorization and external effect.

### APIs and enterprise systems

Examples include critical configuration changes, privileged API mutations, approval workflows for ERP/infrastructure operations and exact target/action binding before writes reach downstream systems.

### Cybersecurity

Examples include blocking policy-violating high-impact actions before forwarding, detecting declared-intent/requested-effect mismatch and fail-closed handling of unknown critical operations. POM-RX is not an antivirus, malware detector, firewall or universal phishing detector.

### Blockchain and digital assets

Examples include Wallet Guard for dangerous wallet RPC requests, smart-account or contract-level Risk Gates, exact authorization for approvals/permits/transfers, on-chain commitment anchoring and chain-specific observation/reconciliation adapters.

Wallet Guard's primary product home is Blockchain and digital assets, while its defensive control model also overlaps the Cybersecurity block.

`POM-RX Wallet Guard` is one application profile inside this block. It is not POM-RX as a whole and must not replace the shared Core, Witness, Gate, observation or reconciliation semantics.

## 4. Wallet Guard position

The intended bounded vertical slice is:

```text
controlled dApp
  -> trusted request capture
  -> normalized EVM intent
  -> local policy / evidence
  -> exact authorization
  -> Core single-use Gate
  -> controlled trusted provider transport
  -> controlled provider result
  -> independent observation
  -> reconciliation
```

The provider-transport prerequisite remains untrusted until the live transition rule above is satisfied. Historical green CI alone does not advance a readiness claim.

Historical PR #93 remains `OPEN / STALE / UNTRUSTED / LATER` at `c4e40ceb286f4e59657767661daed15d2b68e9a7`, diverged from `snapshot_base_main` by ahead 86 / behind 312. Reconstruct useful simulation work later from then-current trusted main instead of merging stale history wholesale.

Even after simulation evidence eventually merges, simulation-to-forwarding atomic binding remains a separate reviewed requirement. A simulation result never authorizes forwarding by itself.

## 5. Integration and adapter block

Filecoin, Stellar and other chain work belongs here unless it directly implements an execution Gate for an application block. Adapters may provide publication, content-addressed storage, finality/observation records and commitment registries. An adapter is supporting infrastructure and is not promoted to a peer POM-RX product solely because it uses a blockchain.

## 6. Target information architecture

Do not mass-move frozen protocol or fixture files for cosmetic organization. New Core work goes into common Core blocks; application-specific code stays in its application owner and references Core instead of copying it.

```text
core/
  strict-verification/
  authorization/
  gate/
  reference-data/
  witness/
  execution/
  observation/

profiles/
  governance-dagr/

applications/
  payments-financial/
  ai-agents/
  enterprise-apis/
  cybersecurity/
  blockchain-digital-assets/
    wallet-guard/

integrations/
  stellar-evidence-registry/
  filecoin/

compatibility/
  pom-rx-v0.1/
```

## 7. Snapshot maturity by block

| Block | Durable state / transition rule | Missing / blocked |
| --- | --- | --- |
| Shared Core | strict profile, exact authorization, process-local Gate, hostile-object capture, Witness lifecycle, durable local claim primitive, execution evidence, observation/reconciliation | continuity-model repair must receive exact-merge PASS; PR #131 then reconciles/freshly gates; durable Gate composition later; production trust/time/distributed semantics/external effect truth missing |
| Exact authorization / Gate | ratified contract plus process-local Gate and separate durable claim primitive | stale PR #97 must not merge; durable composition requires later reconstruction |
| Witness | source/Witness primitives, process-local trust lifecycle | production KMS/HSM, distributed revocation, trusted time/attestation |
| Execution evidence | bounded exact-authorization-bound recorder | actual trusted forwarding/effect composition and external effect truth |
| Observation / reconciliation | bounded reference comparison layer | production observer independence/liveness/finality |
| Wallet Guard | deterministic intent/policy/preflight/Witness-adapter/provider/controlled-host reference pieces trusted only to merged scope | provider transport PR #131 remains untrusted with seven P1 attack inputs and must be reconciled/freshly gated after continuity repair |
| Governance DAGR | non-normative placeholder/profile position | authoritative source missing |
| Integrations | Stellar/Filecoin/supporting evidence infrastructure | remain adapters unless a reviewed execution Gate is actually enforced |

## 8. Merge and safety boundary

Standing authorization applies only after the mandatory five-stage pre-merge gate, all applicable technical/security gates, exact-head CI, every required genuinely distinct exact-head independent review and zero unresolved P0/P1/P2 on the same frozen SHA. A moved head invalidates exact-head evidence. The independent-review waiver remains limited to PR #60. Every non-trivial merge requires exact-main CI/status plus exact-merge post-merge assurance before it becomes a trusted dependency.

The maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: a local, deterministic, synthetic, bounded demonstration. It is not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction or meaningful funds are authorized. Burner local/testnet E2E requires a separate explicit human gate. Public website/Vercel/funding-directory writes are outside this control plane.
