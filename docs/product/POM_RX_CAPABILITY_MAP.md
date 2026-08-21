# POM-RX capability map

Status: `CURRENT_INFORMATION_ARCHITECTURE / NON_NORMATIVE`

Date: 2026-08-21

Trusted-main checkpoint: `fac194134dfe70767964e5816bcfb68f3b490099`.

This document organizes repository work. It does not change protocol semantics,
publish a new POM-RX version, establish production readiness, or by itself
activate an authorization/Gate claim. Live GitHub wins whenever volatile PR,
CI, review, thread, mergeability or merge state changes after this checkpoint.

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
remain explicit and must never be inferred from a structurally valid receipt.
Application blocks are not mutually exclusive; they may overlap, but shared
semantics are owned once in Core.

## 2. Shared core and cross-cutting layers

### POM-RX Core

Shared receipt semantics, strict verification, continuity invariants, typed
diagnostics and policy/artifact binding remain common Core. Historical
`pom-rx/0.1` compatibility is frozen; stronger behavior is additive through
separately reviewed profiles.

The bounded `pom-rx-v0.1/strict-errata-1` profiled verifier is activated in Core.
Its verdicts remain structurally non-authorizing: strict conformance is a
prerequisite for later authorization, not permission to execute.

Application blocks may add adapters, profiles and tests. They must not duplicate
or fork Core canonicalization, hashing, verifier, Witness or Gate semantics.
Shared exact authorization, execution-evidence commitments and
observation/reconciliation comparison semantics also remain common Core and must
not be forked.

Shared bounded hostile-object/plain-data capture exists under
`core/reference-data/` and is reused by Core and application reference
boundaries. Expected proof-payload validation rejection is positively branded;
unrelated runtime/intrinsic failures are not converted by broad `TypeError` or
message matching.

### Exact authorization and Gate

The common exact-authorization/single-use-Gate contract is ratified in Core. It
defines versioned action/context binding, short-lived capability semantics,
terminal single-use consumption, fail-closed replay behavior and a private
trusted bootstrap boundary.

A process-local reference Gate harness exercises those semantics with
Gate-instance-local capability state, synchronous reservation, complete half-open
`[issued_at, expires_at)` checks, Gate-instance monotonic-clock enforcement and a
trusted prepared-execution snapshot so raw caller-owned data is not forwarded
downstream. This remains reference-only and non-production.

A separate shared durable claim-store reference primitive provides bounded
at-most-once capability claiming for multiple processes sharing one trusted local
filesystem directory. It is not proof of network/distributed filesystem
atomicity, consensus, crash recovery, Gate consumption or external execution.

A reviewed composition of that durable claim primitive into the common Gate is
**not on trusted main at this checkpoint**. PR #97 is the active Tier-B candidate
at exact head `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`. Its PR base remains
`0564aecd42cf0794894c12842980969ff59c9f73`, while current trusted main has moved
to `fac194134dfe70767964e5816bcfb68f3b490099` through coordination-only PR #106.
Latest live GitHub reports `mergeable=false`; this is volatile
mergeability/conflict metadata, does not establish reconciliation by itself, and
does not satisfy security review or any release gate. Canonical exact-head CI run
`32487036517` / CI run 592 completed `success` on exact head `0efb462...`, but
green CI cannot clear the current security blocker.

Current head is one commit after independently blocked parent
`639b96e7a64fa101432b3afcc3c08aebfcc838cf` and changes only the Wallet Guard
Promise-drift regression (4 additions / 4 deletions); provider/runtime
implementation is unchanged. The new test relaxes the isolated requirement from
zero hostile `Promise.prototype.constructor` getter execution to requiring only
zero authorization and zero sensitive forwarding in that isolated scenario.

A fresh distinct `chatgpt-codex-connector` review covers exact head
`0efb462f0b4b8cff62d664a51d13ad71306b6bbb` and reports P1 `Reject Promise
drift before entering async layers`. It explicitly states that the relaxed
assertion hides the still-reachable parent exploit. The exact-head reproducer
poisons inherited `Promise.prototype.constructor` plus `then`; outer awaits in
`readProviderSnapshot`, `sampleStableProviderContext`, `sampleTrustedContext` and
`request` can assimilate rejected promises before the inner transport rejection
reaches the caller, substitute stable attacker-controlled context, then permit
reference authorization and sensitive forwarding. The exact-head release-owner
review is also `BLOCK / NON-INDEPENDENT` for the same false-PASS risk.

Live review-thread revalidation during this run confirms the exact-head
Promise-drift P1 remains unresolved and non-outdated. Several earlier P1 threads
remain unresolved pending final repaired exact-head independent validation; their
moved-head repair comments are historical evidence, not a release verdict.

The earlier `37b8e699...` P1 about runtime bookkeeping symbols on native Promises
is historical after later changes; ordinary native-Promise provider transport
passes the relevant Node/AsyncHooks compatibility regression. The eventual
security repair must preserve that compatibility along with prior direct
non-Promise object/function capture and own native-Promise `constructor`/`then`
decoration rejection.

PR #97 therefore remains **untrusted and blocked for release**. A test-only
relaxation cannot establish the missing runtime property. Required evidence is a
runtime repair created from the then-current trusted main, prevention of inherited
Promise-prototype drift being consulted by outer async assimilation, CI-wired
coverage for the independent exploit class, exact-head green CI, a fresh
release-owner PASS, a fresh distinct exact-head independent skeptical/security
review, and no unresolved P0/P1/P2. No capability-map text may treat durable Gate
composition as merged before exact-merge post-merge assurance PASS.

Production issuance remains unproved because production-grade source/Witness
trust, operator authorization and trusted-time infrastructure are incomplete.

### Witness

Source-signed preflight material and signed Witness acknowledgement primitives
are merged. A process-local reference lifecycle adds public-key enrollment,
bounded validity, revocation, one-successor rotation/recovery, injected monotonic
trusted time and deterministic public trust-state snapshots. Administrative
mutations are staged against the exact prospective trust state before commit and
the reference store is explicitly bounded.

Wallet Guard has a merged application-profile adapter that reduces one
cryptographically verified Core source-envelope/Witness-acknowledgement candidate
into the provider's reference authorization-supplier contract while checking the
exact Wallet Guard method/policy/action binding. This does not create a second
Witness implementation and does not establish production issuer/trusted-time or
strict-verifier-artifact attestation.

Production KMS/HSM, distributed revocation, remote attestation, quorum and
trusted-time service semantics remain unproved. Witness verification alone does
not prove external execution authorization.

### Execution evidence

A bounded reference execution-evidence recorder owns the common commitment shape
between exact authorization/Gate work and later observation. It recomputes the
exact authorization commitment, records recorder-local start/completion
chronology, permits one local record per authorization commitment and commits
bounded adapter-reported effect data for known `success` or `error` outcomes.
Malformed or ambiguous outcome data becomes explicit `unknown` evidence.

This recorder is deliberately **not** an execution path. It has no downstream
callback and its evidence does not prove Gate consumption, native execution time,
external execution or external effect truth. Composition with actual Gate
forwarding and production execution evidence remains separate work.

### Observation and reconciliation

A shared reference observation/reconciliation layer compares captured
observation evidence against a validated exact-authorization binding, including
binding profile, action/context commitments, expected status/effect and
chronology. Its evidence channel uses a one-shot bounded capture callback rather
than treating an observer-returned value as external truth.

Production observer independence, liveness, host/RPC integrity, finality, remote
attestation and external-world truth remain outside the reference claim.

### Exact-main CI assurance surface

Trusted main includes the prospective exact-main CI status publisher introduced
by PR #96. It publishes `pom-rx/exact-main-ci` for canonical push CI on the exact
main SHA. Post-merge assurance still requires decision-time freshness
revalidation; the status alone does not establish PASS.

### Durable project-control continuity

Trusted main includes the GitHub-backed cross-chat control plane from PR #98 and
the checkpoint reconciliations from PR #99 through PR #106. Most recently, PR
#106 source head `f654ee8f7becdc0916e7d94e053d7d5b56910083` merged as exact main SHA
`fac194134dfe70767964e5816bcfb68f3b490099`; source-head and merge trees are
identical at `31fee2a35bff60dc5854d518874a8ed2bac3076e`. Exact-head candidate CI run
`32507298764` / CI run 636 completed `success`. Canonical exact-main push CI run
`32512231029` / CI run 637 attempt 1 completed `success` on that exact merge SHA;
decision-time `pom-rx/exact-main-ci` targeted the same run with `success`, and the
recorded exact-merge verdict is `POST_MERGE_ASSURANCE_PASS` across SpecKit,
skeptical/falsification, security, code quality, optimization and
integration/regression.

PR #106 had release-owner `PASS / NON-INDEPENDENT`, no review threads and a fresh
distinct `chatgpt-codex-connector` review on exact source head `f654ee8...` that
found no major issues. PR #106 was a four-file documentation/control-plane
reconciliation and changed no runtime, protocol, Gate, Witness, verifier, Wallet
Guard or execution semantics. These are coordination/documentation properties,
not production-readiness capabilities.

### Proof transport and anchoring

Proof Receipt, Merkle batching, content-addressed storage and blockchain/network
anchors provide evidence transport, persistence or publication. They do not
become the authorization boundary merely because they are on-chain.

### Governance profile

`POM-RX Governance Profile — DAGR` is a cross-cutting profile under POM-RX. It is
not a second product, audit firm, certification system or global security score.
Normative DAGR work remains source-gated while
`DAGR_SOURCE_DOCUMENT_MISSING` is active.

## 3. Application blocks

These block names mirror the public SwissTokint site taxonomy. They are contexts
for POM-RX research and integration, not claims that every block is operational.

### Block A — Payments and financial operations

Examples include payment destination/amount controls, trading-agent preflight and
execution reconciliation, transfer limits/beneficiary policy and exchange/broker
adapter evidence. The current market-risk engine remains supporting research,
not a complete POM-RX authorization engine.

### Block B — AI agents

Examples include external tool/API calls by autonomous agents, bounded spending
or transfer authority, model-generated actions requiring policy decisions and
separation of agent intent, policy, authorization and external effect. POM-RX
does not prove model reasoning quality merely because an action lifecycle is
evidenced.

### Block C — APIs and enterprise systems

Examples include critical configuration changes, privileged API mutations,
approval workflows for ERP/infrastructure/administrative operations, and exact
target/action binding before writes reach downstream systems.

### Block D — Cybersecurity

Examples include blocking policy-violating high-impact actions before forwarding,
detecting declared-intent/requested-effect mismatch, fail-closed handling of
unknown critical operations and incident evidence/reconciliation. POM-RX is not
an antivirus, malware detector, firewall or universal phishing detector.

### Block E — Blockchain and digital assets

Examples include Wallet Guard for dangerous wallet RPC requests, smart-account
or contract-level Risk Gates, exact authorization for approvals/permits/transfers,
on-chain commitment anchoring, and chain-specific observation/reconciliation
adapters.

`POM-RX Wallet Guard` is one application profile inside this block. It is not
POM-RX as a whole and must not replace the shared Core, Witness, Gate,
observation or reconciliation semantics. Wallet Guard's primary product home is
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
  -> portable POM-RX preflight
  -> Core-verified Witness candidate
  -> single-use exact Gate
  -> controlled fake provider
  -> independent observation
  -> reconciliation
```

Trusted main currently contains strict JSON-text ingress, EVM intent
normalization/decoding, deterministic fail-closed policy, a process-local policy
controller, portable determinate preflight evidence, a Core-verified Witness
authorization adapter, provider/Gate integration and a controlled in-memory host
whose page-facing graph exposes only guarded `ethereum.request`.

The controlled host's stronger Witness adapter is not universally composed into
every fixture. The generic/synthetic reference authorization supplier remains
available for older controlled tests and must not be confused with production
authorization.

Reference simulation evidence is active PR #93 and is **not on trusted main at
this checkpoint**. Its current live head is
`c4e40ceb286f4e59657767661daed15d2b68e9a7`; exact-head CI run
`32465835858` / CI run 541 is green. Its branch base remains historical
`818718955c9e4136e9e55754a31be2f1c7b610f8`, while trusted main is now
`fac1941...`. Latest live GitHub reports `mergeable=false`; this is volatile
mergeability/conflict metadata only. It does not satisfy trusted-main
reconciliation, security review or provide release evidence. The latest distinct
Codex release evidence covers a moved head. Live thread revalidation also shows
unresolved current/non-outdated P1/P2 findings, including exact-value generic
signature commitment, typed-data wrapper normalization and nested/shared
capture/canonicalization classes; moved-head repair comments are not current
exact-head release evidence. PR #93 therefore requires trusted-main reconciliation
plus fresh exact-head release-owner and independent review after PR #97 dependency
ordering is safe. Even after simulation evidence eventually merges,
simulation-to-forwarding atomic binding remains a separate reviewed composition
requirement.

The first success criterion remains a deterministic controlled fixture in which
a dangerous approval/signature is denied before forwarding, while an explicitly
allowed control request is forwarded once and reconciled. That proves only the
bounded guarded path, not universal browser/wallet/dApp/chain protection.

## 5. Integration and adapter block

Existing Filecoin, Stellar and other chain work belongs here unless it directly
implements an execution Gate for an application block. Adapters may provide
timestamp/publication evidence, content-addressed storage, finality/observation
records, commitment registries and independent retrieval/availability checks.
An adapter is supporting infrastructure and is not promoted to a peer POM-RX
product solely because it uses a blockchain.

## 6. Target information architecture

Do not mass-move frozen protocol or fixture files for cosmetic organization. New
Core work goes into common Core blocks; application-specific code stays in its
application owner and references Core instead of copying it.

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

sdk/typescript/
  # frozen/shared compatibility entry points remain here during migration

tests/
  # shared conformance plus profile/application suites
```

Application folders contain only domain adapters, profiles, fixtures and tests.
Shared verifier, canonicalization, hashing, Witness, authorization, Gate,
execution-evidence and observation/reconciliation rules remain common POM-RX
implementation and are referenced rather than copied. Existing frozen fixture
paths and public source pins are not relocated without dedicated compatibility
review.

## 7. Current maturity by block

| Block | Current state on trusted main | What is still missing / active |
| --- | --- | --- |
| Shared Core | strict five-invariant profile activated; historical verifier preserved; exact policy/runtime/artifact binding; process-local reference Gate; bounded hostile-object capture; process-local Witness trust; durable local claim primitive; reference execution evidence; reference observation/reconciliation; exact-main CI status surface | production issuer/trusted time/trust service; production-independent observation; production execution/effect truth |
| Exact authorization / Gate | ratified common contract plus process-local reference single-use Gate and separate durable claim primitive | PR #97 exact head `0efb462...` is a test-only move from parent `639b96e7...`; fresh distinct exact-head review reports P1 `Reject Promise drift before entering async layers`, with sensitive forwarding still reachable because runtime implementation is unchanged. Owner verdict is BLOCK and CI run 592 is SUCCESS. Its base `0564aecd...` trails trusted main `fac1941...`; live `mergeable=false` is volatile mergeability/conflict metadata only and does not establish trusted reconciliation, security correctness or release readiness. Requires a repaired candidate from trusted main, runtime repair, final exact-head green CI, owner PASS, distinct independent PASS and validated P1-thread closure; production issuer/trusted time; distributed/crash semantics where required |
| Witness | signed source/Witness primitives, process-local enrollment/revocation/rotation/recovery and Wallet Guard Core-verification adapter | durable operator-authorized trust service, KMS/HSM, distributed revocation, production trusted time/attestation |
| Execution evidence | bounded reference recorder binds exact authorization to recorder chronology and adapter-reported outcomes/effects | actual Gate-forwarding composition, native execution timing and independently observed external effects |
| Observation / reconciliation | shared bounded one-shot reference observation and reconciliation | production observer independence/liveness, host/RPC attestation, finality and external-world truth |
| Payments and financial operations | market-risk and receipt research exist | exact execution adapters and operational Gate |
| AI agents | protocol framing and agent references exist | concrete bounded autonomous-agent integration |
| APIs and enterprise systems | application domain exists | exact target adapter and controlled demo |
| Cybersecurity | application domain plus Wallet Guard defensive overlap | controlled enforcement demonstrations beyond wallet scope |
| Blockchain and digital assets | anchors, Stellar registry, Filecoin integration, Wallet Guard JSON ingress, EVM intent/effect decoding, fail-closed policy, policy controller, portable preflight, Core-verified Witness adapter, provider/Gate integration and controlled host exist | PR #93 exact head `c4e40ceb...` remains untrusted and historical-base; live `mergeable=false` is volatile mergeability/conflict metadata only and does not waive reconciliation/security/review gates. Unresolved current/non-outdated P1/P2 review history remains; still missing simulation-to-forwarding binding, stronger complete execution/reconciliation demo and later separately authorized burner E2E |
| Governance/DAGR | subordinate profile framing exists | authorized source-backed normative profile work |

## 8. Naming discipline

Allowed examples:

- `POM-RX Core`
- `POM-RX Wallet Guard`
- `POM-RX Governance Profile — DAGR`
- `POM-RX blockchain adapter`
- `POM-RX autonomous-agent integration`

Avoid wording that implies independent peer products such as `Wallet Guard
replaces POM-RX`, `DAGR is a separate POM-RX-equivalent platform`, or that a
Stellar/Filecoin integration is itself the POM-RX security boundary.

The product hierarchy remains:

```text
POM-RX
├── Core and common evidence lifecycle
│   ├── Strict verification
│   ├── Exact authorization
│   ├── Single-use Gate
│   ├── Witness trust lifecycle (reference-only today)
│   ├── Execution evidence (reference-only today)
│   └── Observation and reconciliation (reference-only today)
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
