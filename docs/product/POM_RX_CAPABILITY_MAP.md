# POM-RX capability map

Status: `CURRENT_INFORMATION_ARCHITECTURE / NON_NORMATIVE`

Date: 2026-08-20

This document organizes repository work. It does not change protocol semantics,
publish a new POM-RX version, establish production readiness, or by itself
activate an authorization/Gate claim.

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

Application blocks are not mutually exclusive. A use case may span two blocks,
but it has one primary implementation owner so shared semantics are not copied
into multiple competing implementations.

## 2. Shared core and cross-cutting layers

### POM-RX Core

Shared receipt semantics, strict verification, continuity invariants, typed
diagnostics and policy/artifact binding. Historical `pom-rx/0.1` compatibility
remains frozen; stronger behavior is additive through separately reviewed
profiles.

The bounded `pom-rx-v0.1/strict-errata-1` profiled verifier is now activated in
Core. Its verdicts remain structurally non-authorizing: strict conformance is a
prerequisite for later authorization, not permission to execute.

Application blocks may add adapters, profiles and tests. They must not duplicate
or fork Core canonicalization, hashing, verifier, Witness or Gate semantics.
Exact authorization is also common Core behavior and must not be forked into
application-specific implementations.

### Exact authorization and Gate

The common exact-authorization/single-use-Gate contract is ratified in Core. It
defines versioned action/context binding, short-lived capability semantics,
terminal single-use consumption, fail-closed replay behavior and a private
trusted bootstrap boundary.

A local reference Gate harness now exercises those semantics with Gate-instance-
local capability state, synchronous reservation, double expiry checks and a
trusted prepared-execution snapshot so the raw caller-owned attempt is never
forwarded downstream. This remains reference-only and non-production.

Production issuance is still unproved because production-grade source/Witness
enrollment, revocation and trusted-time semantics are not complete. The current
process-local Witness lifecycle proves bounded reference behavior only. Durable
multi-process consumption is also required if the Gate later leaves one process.

### Witness

Source-signed preflight material and signed Witness acknowledgement primitives
are merged. A process-local reference lifecycle now adds explicit public-key
enrollment, bounded validity, revocation, one-successor rotation/recovery,
injected monotonic trusted time and deterministic public trust-state snapshots.
Administrative mutations are staged against the exact prospective trust state
before commit and the reference store is explicitly bounded.

These reference controls do not establish production trust: state is non-durable,
operator authorization is assumed, and production KMS/HSM, distributed
revocation propagation, remote attestation, quorum and trusted-time service
semantics remain unproved. Witness verification also does not by itself prove
external execution authorization.

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

These block names mirror the public SwissTokint site taxonomy. They are contexts
in which POM-RX controls can be researched and integrated; they are not claims
that every block is deployed or operational.

### Block A — Payments and financial operations

Examples:

- payment destination and amount controls;
- trading-agent preflight and execution reconciliation;
- transfer limits and beneficiary policy;
- exchange/broker adapter evidence.

The current market-risk engine is supporting research, not a complete POM-RX
authorization engine.

### Block B — AI agents

This block includes autonomous-agent use cases while retaining the site's public
label `AI agents`.

Examples:

- external tool/API calls made by an autonomous agent;
- agent spending or transfer authority;
- model-generated actions that require a bounded policy decision;
- separation between agent intent, policy, authorization and external effect.

POM-RX must not imply that model reasoning quality is proved merely because the
resulting action lifecycle is evidenced.

### Block C — APIs and enterprise systems

Examples:

- critical configuration changes;
- privileged API mutations;
- approval workflows for ERP, infrastructure or administrative operations;
- exact target/action binding before a write reaches the downstream system.

### Block D — Cybersecurity

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
observation or reconciliation semantics. Its primary product home is
Blockchain and digital assets, while its defensive control model also overlaps
the Cybersecurity block.

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

Do not mass-move frozen protocol or fixture files merely for cosmetic organization.
The product-oriented repository layout is now established incrementally. New
Core work goes into the common Core blocks; application-specific code stays in
its application owner and references Core instead of copying it.

```text
core/
  strict-verification/
  authorization/
  gate/
  reference-data/
  witness/

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

sdk/typescript/
  # frozen/shared compatibility entry points remain here during migration

tests/
  # shared conformance plus profile/application suites
```

Application folders contain only domain adapters, profiles, fixtures and tests.
Shared verifier, canonicalization, hashing, Witness, authorization and Gate
rules remain in the common POM-RX implementation and are referenced rather than
copied.

Existing frozen fixture paths, historical verifier paths and public source pins
must not be relocated until a dedicated migration PR proves byte/hash and public
link compatibility.

## 7. Current maturity by block

| Block | Current state | What is still missing |
| --- | --- | --- |
| Shared Core | strict five-invariant profile activated; historical verifier preserved; exact policy/runtime/artifact binding, local reference Gate, bounded plain-data capture and process-local Witness trust lifecycle exist | production exact-authorization issuer, production trust service/Gate lifecycle, native execution evidence, independent observation |
| Exact authorization / Gate | ratified Core contract; Gate-local reference harness exercises single-use, replay/concurrency, expiry and prepared-execution isolation | production-grade Witness trust service, production trusted time, production issuer, durable multi-process consumption if needed |
| Witness | signed source/Witness primitives plus process-local reference enrollment, revocation, monotonic trusted clock, bounded trust snapshots and key rotation/recovery exist | durable trust service, operator authorization, KMS/HSM, distributed revocation, production trusted time/attestation and recovery-at-capacity policy |
| Payments and financial operations | market-risk and receipt research exist | exact execution adapters and operational Gate |
| AI agents | protocol framing and agent references exist | concrete bounded autonomous-agent integration |
| APIs and enterprise systems | application domain only | exact target adapter and controlled demo |
| Cybersecurity | application domain and Wallet Guard threat framing | controlled enforcement demonstrations beyond wallet scope |
| Blockchain and digital assets | anchors, Stellar evidence registry, Filecoin integration and Wallet Guard architecture exist | Wallet Guard implementation, trusted-context normalization, common Gate adapter integration, E2E burner proof |
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
│   ├── Strict verification
│   ├── Exact authorization
│   ├── Single-use Gate
│   └── Witness trust lifecycle (reference-only today)
├── Cross-cutting profiles
│   └── Governance / DAGR
├── Application blocks
│   ├── Payments and financial operations
│   ├── AI agents
│   ├── APIs and enterprise systems
│   ├── Cybersecurity
│   └── Blockchain and digital assets
│       └── Wallet Guard
└── Supporting integrations and evidence adapters
```