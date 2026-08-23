# POM-RX capability map

Status: `CURRENT_INFORMATION_ARCHITECTURE / NON_NORMATIVE`

Date: 2026-08-23

Trusted-main checkpoint: `73f3921984449ffd6025f6c9b99b0220f0bf068b`.

This document organizes repository work. It does not change protocol semantics, publish a new POM-RX version, establish production readiness, or by itself activate an authorization/Gate claim. Live GitHub wins whenever volatile PR, CI, review, thread, mergeability or merge state changes after this checkpoint.

## 1. Product rule

POM-RX is the single principal technical product in this repository. Application domains, profiles, adapters, demonstrations and network integrations are subordinate capability contexts, not peer products.

Application blocks are not mutually exclusive; they may overlap, but shared semantics are owned once in Core. A capability block may implement only part of the lifecycle. Missing stages remain explicit and must never be inferred from a structurally valid receipt, simulation result, proof or anchor.

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

## 2. Shared Core

Historical `pom-rx/0.1` compatibility remains frozen. Strict verification, exact policy/runtime/artifact binding, hostile-object/plain-data capture, Witness, exact authorization, the process-local single-use Gate, the filesystem durable claim primitive, execution evidence and observation/reconciliation are shared Core capabilities according to their merged reviewed scope.

Application blocks may add adapters, profiles, fixtures and tests. They must not duplicate or fork Core canonicalization, hashing, verifier, Witness or Gate semantics. Shared reference-data, exact authorization, execution-evidence and observation/reconciliation semantics remain Core-owned.

Strict verification is structurally non-authorizing. A valid receipt, proof, anchor, simulation result or observation record never substitutes for the execution-side Gate.

### Exact authorization and Gate

Trusted main contains the common exact-authorization contract, a process-local single-use Gate and a separate filesystem durable claim-store reference primitive. Reviewed composition of the durable claim primitive with the common Gate is **not** trusted on current main.

Historical PR #97 remains `OPEN / MUST_NOT_MERGE` at `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`. Do not merge, rebase, revive or wholesale-copy that stale branch. Durable claim-before-observer/downstream composition must be reconstructed later from then-current trusted main after PR #120 becomes a trusted dependency.

### Trusted coordination checkpoint

PR #123 source head `6cac168b775b26b572336764271b4f25e934a5ea` merged as exact main `73f3921984449ffd6025f6c9b99b0220f0bf068b`. Canonical exact-main push CI `32614549879` / CI 789 attempt 1 passed on that exact merge SHA. Distinct pre-merge evidence is `chatgpt-codex-connector[bot]` comment `5383774814`, reviewed `6cac168b77`, no major issues. Exact-merge assurance is `POST_MERGE_ASSURANCE_PASS` in PR #123 comment `5383940027`.

PR #123 is coordination-only evidence and changes no runtime or Wallet Guard security semantics.

### Active prerequisite — PR #120

PR #120 is the current Wallet Guard/provider Promise-transport prerequisite repair. The branch `automation/pom-rx-promise-drift-repair-20260822` was reconciled to exact trusted main through merge commit `e4c8d4b29cdc875d17c170d6e67a0fd7804d849d`, preserving the feature/runtime side and taking the trusted main control-plane/product-position side. Subsequent checkpoint/document commits move the final candidate, so the exact release SHA must be read live after those writes.

The bounded repair on the branch uses captured reflection and data-descriptor checks for constructor/species classification, bounded prototype/species traversal with Proxy rejection before hostile reflection dispatch, and internal draining only when effective species is absent, null, undefined or the captured native `Promise`. Primitive constructors, constructor/species accessors, Proxies and attacker-selected species constructors remain outside the internally-drainable claim unless separately proven safe.

Canonical regressions cover the non-extensible benign alternate-constructor/species case, hostile species-accessor zero-execution behavior, rejected-transport strict-unhandled-rejection behavior, provider-result thenable/Proxy boundaries and inherited Array-index substitution.

CI `32609855025` / 785 on pre-reconciliation head `2d01503c...` was green but is historical after the head moved. PR #120 remains untrusted and blocked until one frozen post-reconciliation exact head has fresh canonical CI, the complete five-stage owner gate, a genuinely distinct exact-head `chatgpt-codex-connector` review, and zero unresolved P0/P1/P2. Historical review threads `PRRT_kwDOTiNyWc6bZjxp`, `PRRT_kwDOTiNyWc6bZ6tx`, `PRRT_kwDOTiNyWc6bZ6tz`, `PRRT_kwDOTiNyWc6baFkR`, and `PRRT_kwDOTiNyWc6baIxZ` remain unresolved until that evidence justifies closure.

### Witness

Source-signed preflight material, Witness acknowledgement primitives and the process-local reference lifecycle remain shared Core. Wallet Guard may consume a Core-verified Witness candidate through its application adapter but does not own or fork Witness semantics. Production KMS/HSM, distributed revocation, remote attestation, quorum and trusted-time service semantics remain unproved.

### Execution evidence and observation

The shared bounded reference recorder binds exact authorization commitments to recorder chronology and adapter-reported outcomes/effects. It is not itself an execution path and does not prove external effect truth. Shared observation/reconciliation compares bounded observation evidence against validated exact authorization binding; production observer independence, liveness, finality and external-world truth remain outside the reference claim.

### Governance profile

`POM-RX Governance Profile — DAGR` is a cross-cutting profile under POM-RX. It is not a second product, audit firm, certification system or global security score. Normative DAGR work remains source-gated while `DAGR_SOURCE_DOCUMENT_MISSING` is active.

## 3. Application blocks

### Payments and financial operations

Destination/amount controls, trading-agent preflight, beneficiary policy and exchange/broker adapter evidence are application examples. Existing market-risk work remains supporting research unless a reviewed POM-RX Gate actually enforces the action.

### AI agents

External tool/API calls, bounded spending/transfer authority and model-generated actions requiring policy decisions are application examples. Agent intent, authorization and external effect remain distinct.

### APIs and enterprise systems

Critical configuration changes, privileged API mutations and ERP/infrastructure approval workflows are application examples. Exact target/action binding must precede downstream writes when such a claim is made.

### Cybersecurity

Blocking policy-violating high-impact actions, fail-closed handling of unknown critical operations and incident evidence/reconciliation are application examples. POM-RX is not an antivirus, malware detector, firewall or universal phishing detector.

### Blockchain and digital assets

Wallet Guard, exact authorization for approvals/permits/transfers, smart-account or contract-level Risk Gates, on-chain commitment anchoring and chain-specific observation/reconciliation are application examples.

Wallet Guard's primary product home is Blockchain and digital assets, while its defensive control model also overlaps the Cybersecurity block.

`POM-RX Wallet Guard` is one application profile inside this block. It is not POM-RX as a whole and must not replace shared Core, Witness, Gate, observation or reconciliation semantics.

## 4. Wallet Guard position

```text
controlled dApp
  -> trusted request capture
  -> normalized EVM intent
  -> decoder/effects evidence
  -> local policy
  -> portable POM-RX preflight
  -> Core-verified Witness candidate
  -> single-use exact Gate
  -> controlled fake provider
  -> independent observation
  -> reconciliation
```

PR #93 remains `OPEN / STALE / UNTRUSTED / LATER` at `c4e40ceb286f4e59657767661daed15d2b68e9a7`. Historical green CI/reviews are not release evidence. Even after simulation evidence eventually merges, simulation-to-forwarding atomic binding remains a separate reviewed requirement; a simulation result never authorizes forwarding by itself.

## 5. Integration and adapter block

Filecoin, Stellar and other chain work remains supporting integration/adapter infrastructure unless it directly implements a reviewed execution Gate. Publication, storage, finality/observation or anchoring does not become authorization merely because it is on-chain.

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
compatibility/
  pom-rx-v0.1/
```

## 7. Current maturity

| Block | Trusted-main state | Missing / active |
| --- | --- | --- |
| Shared Core | strict profile, exact authorization, process-local Gate, hostile-object capture, Witness lifecycle, separate durable local claim primitive, execution evidence, observation/reconciliation, exact-main CI observability | PR #120 fresh post-reconciliation gates; durable Gate composition separate/untrusted; production trust/time/distributed semantics/external effect truth missing |
| Wallet Guard | deterministic intent/policy/preflight/Witness-adapter/provider/controlled-host reference path | PR #120 final exact-head gates and thread closure; PR #93 simulation later; simulation-to-forwarding binding separate |
| Governance DAGR | non-normative profile position | authoritative source missing |
| Integrations | Stellar/Filecoin/supporting evidence infrastructure | remain adapters unless a reviewed execution Gate is enforced |

## 8. Merge and safety boundary

Standing authorization applies only after the mandatory five-stage pre-merge gate, all applicable technical/security gates, exact-head CI, every required genuinely distinct exact-head independent review and zero unresolved P0/P1/P2 on the same frozen SHA. A moved head invalidates exact-head evidence. The independent-review waiver remains limited to PR #60. Every non-trivial merge requires exact-main CI plus exact-merge post-merge assurance before it becomes a trusted dependency.

The maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded. It is not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction or meaningful funds are authorized. Burner local/testnet E2E requires a separate explicit human gate. Public website/Vercel/funding-directory writes are outside this control plane.
