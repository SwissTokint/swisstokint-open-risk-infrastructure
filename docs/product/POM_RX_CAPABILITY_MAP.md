# POM-RX capability map

Status: `CURRENT_INFORMATION_ARCHITECTURE / NON_NORMATIVE`

Date: 2026-08-23

Trusted-main checkpoint: `01f27ef06b71daf3b53efa4c1017946a439b2d7e`.

This document organizes repository work. It does not change protocol semantics, publish a new POM-RX version, establish production readiness, or by itself activate an authorization/Gate claim. Live GitHub wins whenever volatile PR, CI, review, thread, mergeability or merge state changes after this checkpoint.

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

Trusted main contains the common exact-authorization contract, a process-local single-use Gate and a separate filesystem durable claim-store reference primitive. Reviewed composition of the durable claim primitive with the common Gate is **not** trusted on current main.

Historical PR #97 remains `OPEN / STALE / MUST_NOT_MERGE` at `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`; against trusted main it is diverged ahead 66 / behind 255. Durable composition is reconstructed later from then-current trusted main only after the fresh Wallet Guard provider-transport prerequisite becomes trusted.

### Trusted coordination checkpoint

PR #132 source head `8c532dee2fb8d9f8295f1c3cbb6ed44cb7e752b0` merged as exact main `01f27ef06b71daf3b53efa4c1017946a439b2d7e`.

- source-head CI `32646404031` / CI 847 attempt 1 passed;
- release-owner five-stage review `5002648630` was `PASS_NON_INDEPENDENT / 0 P0 / 0 P1 / 0 P2`;
- genuinely distinct exact-head evidence is `chatgpt-codex-connector[bot]` comment `5386619599`, reviewed `8c532dee2f`, no major issues;
- exact-main push CI `32647638029` / CI 848 attempt 1 passed;
- exact-main status at assurance time was `pom-rx/exact-main-ci = success` targeting run `32647638029`;
- exact-merge assurance is PR #132 comment `5386717914 = POST_MERGE_ASSURANCE_PASS`;
- terminal trusted checkpoint is PR #132 comment `5386728720`.

PR #132 is trusted coordination evidence only. It is not runtime or production-security evidence.

### Current control-plane reconciliation

The source tree merged by PR #132 necessarily still records its pre-merge trusted parent and PR #132 as in progress. Branch `docs/pom-rx-post-pr132-live-reconcile-20260823-1809` is therefore the active bounded non-Tier-B writer lane and owns only RESUME, TASKS, BLOCKERS, TEAM_ROSTER and this capability map.

The Tier-B PR #131 writer is frozen while this five-file reconciliation is active. No runtime, test, protocol, Gate, Witness, verifier, Wallet Guard/provider, wallet/network, public-site/Vercel or financial-execution semantics change in this reconciliation.

### Active but untrusted provider-transport prerequisite

PR #131 on `automation/wg-trusted-provider-transport-20260823` remains `OPEN / BLOCKED / NOT TRUSTED / RECONCILIATION_REQUIRED` at exact head `3a75418ef13e7364b70e60a17e5514f1b1a8bfc2`.

Against trusted main `01f27ef...`, compare is `diverged`, ahead 32 / behind 6, merge-base `87ed6ac814f868dc4599cb5d236babdeea8c3cc9`, and GitHub reports it non-mergeable. Canonical CI `32645853067` / CI 846 attempt 1 is green but is historical release evidence after the trusted-main move. Seven P1 threads remain unresolved/outdated: `PRRT_kwDOTiNyWc6bfPvI`, `PRRT_kwDOTiNyWc6bfPvO`, `PRRT_kwDOTiNyWc6bfPvR`, `PRRT_kwDOTiNyWc6bfWeN`, `PRRT_kwDOTiNyWc6bfel5`, `PRRT_kwDOTiNyWc6bfel6`, `PRRT_kwDOTiNyWc6bfel7`.

The branch contains attempted repairs/regressions for these findings, including provider-binding, complete Array prototype-chain checks, Node Promise bookkeeping allowances, fresh-realm Promise/reflection/provenance primordials and the `3a75418...` TCB reduction. None is trusted until the branch is reconciled onto then-current trusted main, reruns exact-head CI, passes the full owner gate, receives a fresh genuinely distinct exact-head review, closes all P0/P1/P2 on same-head evidence, merges, and receives exact-merge assurance PASS.

#### Accepted provider-transport boundary

The accepted direction is the explicit narrow **trusted-provider transport contract** for the local Node prototype. The controlled provider/adapter must be rejected before origin when provenance or runtime integrity is ambiguous. Inside the supported contract, an in-contract rejected context transport must fail closed with zero reference authorization, zero sensitive forwarding, clean child-process survival under `--unhandled-rejections=strict`, and no orphaned provider-rejection termination.

The independent attack history for PR #131 covers provider-provenance TOCTOU, inherited Array thenable assimilation, runtime-owned Promise symbols, pre-import Promise method poisoning, pre-import `Object.getPrototypeOf` poisoning, pre-import WeakSet poisoning, and proxied Promise-constructor descriptor traps. Earlier reviews on moved heads are falsification history, not current release evidence.

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

The fresh provider transport prerequisite remains **in progress but frozen for control-plane reconciliation, and is not trusted**. PR #131's historical green CI alone does not advance a readiness claim.

Historical PR #93 remains `OPEN / STALE / UNTRUSTED / LATER` at `c4e40ceb286f4e59657767661daed15d2b68e9a7`, diverged from trusted main by ahead 86 / behind 300. Reconstruct useful simulation work later from then-current trusted main instead of merging stale history wholesale.

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

## 7. Current maturity by block

| Block | Current trusted-main state | Missing / active |
| --- | --- | --- |
| Shared Core | strict profile, exact authorization, process-local Gate, hostile-object capture, Witness lifecycle, durable local claim primitive, execution evidence, observation/reconciliation | post-PR132 five-file reconciliation active; PR #131 provider prerequisite paused/reconciliation-required; durable Gate composition later/untrusted; production trust/time, distributed semantics and external effect truth missing |
| Exact authorization / Gate | ratified contract plus process-local Gate and separate durable claim primitive | stale PR #97 must not merge; durable composition requires later reconstruction |
| Witness | source/Witness primitives, process-local trust lifecycle | production KMS/HSM, distributed revocation, trusted time/attestation |
| Execution evidence | bounded exact-authorization-bound recorder | actual trusted forwarding/effect composition and external effect truth |
| Observation / reconciliation | bounded reference comparison layer | production observer independence/liveness/finality |
| Wallet Guard | deterministic intent/policy/preflight/Witness-adapter/provider/controlled-host reference pieces trusted only to merged scope | PR #131 provider transport remains untrusted; head `3a75418...`, historical CI 846 green, seven P1 threads unresolved, reconcile after docs lot then run a wholly fresh exact-head release cycle |
| Governance DAGR | non-normative placeholder/profile position | authoritative source missing |
| Integrations | Stellar/Filecoin/supporting evidence infrastructure | remain adapters unless a reviewed execution Gate is actually enforced |

## 8. Merge and safety boundary

Standing authorization applies only after the mandatory five-stage pre-merge gate, all applicable technical/security gates, exact-head CI, every required genuinely distinct exact-head independent review and zero unresolved P0/P1/P2 on the same frozen SHA. A moved head invalidates exact-head evidence. The independent-review waiver remains limited to PR #60. Every non-trivial merge requires exact-main CI plus exact-merge post-merge assurance before it becomes a trusted dependency.

The maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: a local, deterministic, synthetic, bounded demonstration. It is not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction or meaningful funds are authorized. Burner local/testnet E2E requires a separate explicit human gate. Public website/Vercel/funding-directory writes are outside this control plane.
