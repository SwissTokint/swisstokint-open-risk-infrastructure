# POM-RX capability map

Status: `CURRENT_PRODUCT_INFORMATION_ARCHITECTURE`

Date: 2026-08-19

## 1. Product rule

POM-RX is the single principal technical product in this repository.
Application domains, profiles, adapters, demonstrations and network integrations
must not be presented as separate peer products merely because they have their
own implementation work.

The common POM-RX lifecycle remains the shared spine:

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

A capability block may implement only part of this lifecycle. Missing stages
must remain explicit and must never be inferred from a structurally valid
receipt.

## 2. Shared core and cross-cutting layers

### POM-RX Core

Shared receipt semantics, strict verification, continuity invariants, typed
diagnostics and policy/artifact binding. Historical `pom-rx/0.1` compatibility
remains frozen; stronger behavior is additive through separately reviewed
profiles.

### Witness and authorization

Source-signed preflight material, witness acknowledgement, enrollment,
revocation, clock, exact authorization and single-use capability consumption.
The merged Witness cryptographic primitives establish bounded signature
semantics only; they do not by themselves establish enrollment, trusted time or
execution authorization.

### Observation and reconciliation

Execution evidence and an observer logically distinct from the forwarding
decision are compared with the exact authorized action. A reconciliation pass
must not be treated as proof of the external world beyond the evidence actually
observed.

### Proof transport and anchoring

Proof Receipt, Merkle batching, content-addressed storage and blockchain/network
anchors provide evidence transport, persistence or publication. They do not
become the authorization boundary merely because they are on-chain.

### Governance profile

`POM-RX Governance Profile — DAGR` is a cross-cutting profile under POM-RX. It is
not a second product, audit firm, certification system or global security score.

## 3. Application blocks

These blocks mirror the public SwissTokint application domains. They are
contexts in which POM-RX controls can be researched and integrated; they are not
claims that every block is deployed or operational.

### Block A — Payments and financial operations

Examples:

- payment destination and amount controls;
- trading-agent preflight and execution reconciliation;
- transfer limits and beneficiary policy;
- exchange/broker adapter evidence.

The current market-risk engine is supporting research, not a complete POM-RX
authorization engine.

### Block B — Autonomous and AI agents

Examples:

- external tool/API calls made by an autonomous agent;
- agent spending or transfer authority;
- model-generated actions that require a bounded policy decision;
- separation between agent intent, policy, authorization and external effect.

POM-RX must not imply that model reasoning quality is proved merely because the
resulting action lifecycle is evidenced.

### Block C — Enterprise APIs and systems

Examples:

- critical configuration changes;
- privileged API mutations;
- approval workflows for ERP, infrastructure or administrative operations;
- exact target/action binding before a write reaches the downstream system.

### Block D — Cybersecurity and critical-action control

Examples:

- blocking a policy-violating high-impact action before forwarding;
- detecting a mismatch between declared intent and requested effect;
- fail-closed handling of unknown or ambiguous critical operations;
- incident evidence and post-action reconciliation.

POM-RX is not an antivirus, malware detector, firewall or universal phishing
detector. Security integrations must identify the exact execution boundary they
control.

### Block E — Blockchain and digital assets

Examples:

- Wallet Guard for dangerous wallet RPC requests;
- smart-account or contract-level Risk Gates;
- exact authorization for token approvals, permits and transfers;
- on-chain proof/commitment anchoring;
- chain-specific observation and reconciliation adapters.

`POM-RX Wallet Guard` is one application profile inside this block. It is not
POM-RX as a whole and must not replace the shared Core, Witness, Gate,
observation or reconciliation semantics.

## 4. Wallet Guard position

The Wallet Guard vertical slice is intentionally narrow:

```text
controlled dApp
  -> trusted request capture
  -> normalized EVM intent
  -> decoder/effects evidence
  -> local policy
  -> POM-RX preflight + Witness
  -> single-use exact Gate
  -> test wallet/provider
  -> independent observation
  -> reconciliation
```

Its first success criterion is a deterministic controlled fixture in which a
dangerous approval/signature is denied before forwarding, while an explicitly
allowed control request is forwarded once and reconciled.

That demonstration proves only the bounded guarded path. It does not prove that
all browsers, wallets, dApps or chains are protected.

## 5. Integration and adapter block

Existing Filecoin, Stellar and other chain work belongs here unless it directly
implements an execution Gate for an application block.

Adapters may provide:

- timestamp/publication evidence;
- content-addressed storage;
- chain finality/observation records;
- commitment registries;
- independent retrieval or availability checks.

An adapter is supporting infrastructure. It must not be promoted to a peer POM-RX
product solely because it uses a blockchain.

## 6. Target information architecture

Do not mass-move frozen protocol or fixture files merely for cosmetic
organization. The target information architecture should be introduced
incrementally through compatibility-preserving PRs:

```text
docs/product/
  POM_RX_PRODUCT_CHARTER.md
  POM_RX_CAPABILITY_MAP.md

docs/profiles/
  wallet-guard/
  governance-dagr/

docs/applications/
  financial-operations/
  autonomous-agents/
  enterprise-apis/
  cybersecurity/
  blockchain-digital-assets/

sdk/typescript/
  # shared POM-RX and Proof Receipt implementation
  wallet-guard/

integrations/
  # network/storage/anchor adapters

tests/
  # shared conformance plus profile-specific suites
```

Existing frozen fixture paths, historical verifier paths and public source pins
must not be relocated until a dedicated migration PR proves byte/hash and public
link compatibility.

## 7. Current maturity by block

| Block | Current state | What is still missing |
| --- | --- | --- |
| Shared Core | strict-profile foundation merged; historical verifier preserved | complete strict invariant matrix and activation |
| Witness | signed source/witness primitives merged | enrollment, revocation, trusted clock, durable service boundary |
| Financial operations | market-risk and receipt research exist | exact execution adapters and operational Gate |
| Autonomous/AI agents | protocol framing and agent references exist | concrete bounded agent integration |
| Enterprise APIs | application domain only | exact target adapter and controlled demo |
| Cybersecurity | application domain and Wallet Guard threat framing | controlled enforcement demonstrations beyond wallet scope |
| Blockchain/digital assets | anchors, Stellar evidence registry and Wallet Guard architecture exist | Wallet Guard implementation, exact Gate, E2E burner proof |
| Governance/DAGR | candidate subordinate profile framing exists | authorized source-backed normative profile work |

## 8. Naming discipline

Allowed examples:

- `POM-RX Core`
- `POM-RX Wallet Guard`
- `POM-RX Governance Profile — DAGR`
- `POM-RX blockchain adapter`
- `POM-RX autonomous-agent integration`

Avoid wording that implies independent peer products such as:

- `Wallet Guard replaces POM-RX`;
- `DAGR is a separate POM-RX-equivalent platform`;
- `the Stellar/Filecoin integration is the POM-RX security boundary`.

The product hierarchy is therefore:

```text
POM-RX
├── Core and common evidence lifecycle
├── Cross-cutting profiles
│   └── Governance / DAGR
├── Application blocks
│   ├── Financial operations
│   ├── Autonomous / AI agents
│   ├── Enterprise APIs
│   ├── Cybersecurity
│   └── Blockchain / digital assets
│       └── Wallet Guard
└── Supporting integrations and evidence adapters
```
