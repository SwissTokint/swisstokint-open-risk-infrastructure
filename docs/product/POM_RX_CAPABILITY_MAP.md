# POM-RX capability map

Status: `CURRENT_INFORMATION_ARCHITECTURE / NON_NORMATIVE`

Date: 2026-08-24

This is a **versioned snapshot**, not a self-referential claim about the forever-current GitHub head.

- `snapshot_base_main`: `8e8de6ae9744348e6c3eb2d1d0cf2ef3281de970` — PR #135 exact merge observed as live trusted main at authoring time;
- base state: PR #135 source `8c35b486fdc73299c86388bec5517db31b6830d2`, exact-head CI 858 success, distinct exact-head review clean, exact-main CI `32657761877` / CI 859 success;
- PR #135 post-merge assurance: `5387715186 = POST_MERGE_ASSURANCE_PASS`;
- PR #135 terminal checkpoint: `5387722428`.

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

Historical PR #97 remains `OPEN / STALE / MUST_NOT_MERGE` at `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`. Durable composition is reconstructed later from then-live trusted main only after the fresh Wallet Guard provider-transport prerequisite becomes trusted.

### Repository continuity and canonical coordination guard

PR #135 closed the earlier control-plane self-reference/liveness defect and received exact-merge `POST_MERGE_ASSURANCE_PASS`. Its non-self-referential rule remains: live exact state comes from GitHub plus merged-PR terminal checkpoints; versioned files carry historical-at-authoring anchors and durable transition rules. No new docs-only PR is required solely because a control-plane merge creates a new exact `main` SHA.

The next scheduled invocation exposed a different operational prerequisite: the policy required mandatory single-flight coordination but no canonical lock location/acquisition/release mechanism existed. It correctly failed closed as `SKIPPED_COORDINATION_GUARD_UNAVAILABLE`, and the existing hourly task was disabled.

Under explicit human instruction, the canonical coordination state was bootstrapped at branch `automation/pom-rx-coordination`, file `.pom-rx/coordination-lock.json`, schema `pom-rx-coordination-lock/1`. PR #136 (`docs/pom-rx-canonical-coordination-lock-20260824`) is the bounded control-plane repair that documents and gates this mechanism.

The accepted guard model is intentionally conservative:

- automation acquires only `FREE` by exact-blob-SHA compare-and-swap;
- active unexpired `HELD` skips as previous run active;
- expired `HELD` remains stale/blocking and is **not** automatically reclaimed;
- same-holder/unexpired state is re-read before every project mutation;
- after expiry the holder loses project-writing authority, but the exact holder may perform coordination-only release;
- a crashed holder's stale lock requires explicit human recovery;
- normal lock writes stay on the coordination branch and never move `main` or a feature/control-plane PR head.

This avoids claiming that a timestamp can atomically fence an in-flight write on another GitHub resource. PR #136 must pass exact-head CI, the five-stage owner gate, a genuinely distinct exact-head review, merge, exact-main CI/status and exact-merge `POST_MERGE_ASSURANCE_PASS`, after which canonical lock state must be verified FREE before the existing scheduled task is re-enabled.

### Next application prerequisite — PR #131

PR #131 on `automation/wg-trusted-provider-transport-20260823` remains the next dependency-closing Tier-B workstream, but it is **blocked until PR #136 is trusted and the canonical coordination guard is operational/verified FREE**. It is not enough that PR #135 already passed.

Authoring-time snapshot:

- head `3a75418ef13e7364b70e60a17e5514f1b1a8bfc2`;
- historical CI `32645853067` / CI 846 = `success`, but not current release evidence;
- seven P1 threads unresolved/outdated: `PRRT_kwDOTiNyWc6bfPvI`, `PRRT_kwDOTiNyWc6bfPvO`, `PRRT_kwDOTiNyWc6bfPvR`, `PRRT_kwDOTiNyWc6bfWeN`, `PRRT_kwDOTiNyWc6bfel5`, `PRRT_kwDOTiNyWc6bfel6`, `PRRT_kwDOTiNyWc6bfel7`.

The branch contains attempted repairs/regressions for provider binding, complete Array prototype-chain checks, Node Promise bookkeeping allowances, pre-import Promise/reflection/provenance poisoning and proxied Promise-constructor traps. None becomes trusted until #131 is reconciled onto then-live main after #136 is trusted, freezes a new exact head, reruns canonical CI, passes the full owner gate, receives a fresh genuinely distinct exact-head review, closes all P0/P1/P2 on same-head evidence, merges, and receives exact-merge assurance PASS.

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

Historical PR #93 remains `OPEN / STALE / UNTRUSTED / LATER` at `c4e40ceb286f4e59657767661daed15d2b68e9a7`. Reconstruct useful simulation work later from then-current trusted main instead of merging stale history wholesale.

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
| Shared Core | strict profile, exact authorization, process-local Gate, hostile-object capture, Witness lifecycle, durable local claim primitive, execution evidence, observation/reconciliation; PR #135 continuity model trusted | canonical coordination guard PR #136 must receive exact-merge PASS and restore verified FREE state; PR #131 then reconciles/freshly gates; durable Gate composition later; production trust/time/distributed semantics/external effect truth missing |
| Exact authorization / Gate | ratified contract plus process-local Gate and separate durable claim primitive | stale PR #97 must not merge; durable composition requires later reconstruction |
| Witness | source/Witness primitives, process-local trust lifecycle | production KMS/HSM, distributed revocation, trusted time/attestation |
| Execution evidence | bounded exact-authorization-bound recorder | actual trusted forwarding/effect composition and external effect truth |
| Observation / reconciliation | bounded reference comparison layer | production observer independence/liveness/finality |
| Wallet Guard | deterministic intent/policy/preflight/Witness-adapter/provider/controlled-host reference pieces trusted only to merged scope | #136 coordination prerequisite first; then provider transport PR #131 remains untrusted with seven P1 attack inputs and must be reconciled/freshly gated |
| Governance DAGR | non-normative placeholder/profile position | authoritative source missing |
| Integrations | Stellar/Filecoin/supporting evidence infrastructure | remain adapters unless a reviewed execution Gate is actually enforced |

## 8. Merge and safety boundary

Standing authorization applies only after the mandatory five-stage pre-merge gate, all applicable technical/security gates, exact-head CI, every required genuinely distinct exact-head independent review and zero unresolved P0/P1/P2 on the same frozen SHA. A moved head invalidates exact-head evidence. The independent-review waiver remains limited to PR #60. Every non-trivial merge requires exact-main CI/status plus exact-merge post-merge assurance before it becomes a trusted dependency.

The maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: a local, deterministic, synthetic, bounded demonstration. It is not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction or meaningful funds are authorized. Burner local/testnet E2E requires a separate explicit human gate. Public website/Vercel/funding-directory writes are outside this control plane.
