# POM-RX capability map

Status: `CURRENT_INFORMATION_ARCHITECTURE / NON_NORMATIVE`

Date: 2026-08-22

Trusted-main checkpoint: `e5aead150a2ed5f390593cc2d9d307defdd79bdc`.

This document organizes repository work. It does not change protocol semantics, publish a new POM-RX version, establish production readiness, or by itself activate an authorization/Gate claim. Live GitHub wins whenever volatile PR, CI, review, thread, mergeability or merge state changes after this checkpoint.

## 1. Product rule

POM-RX is the single principal technical product in this repository. Application domains, profiles, adapters, demonstrations and network integrations must not be presented as separate peer products merely because they have their own implementation work.

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

Application blocks are not mutually exclusive; they may overlap, but shared semantics are owned once in Core. A capability block may implement only part of the lifecycle. Missing stages remain explicit and must never be inferred from a structurally valid receipt, simulation result, proof or anchor.

## 2. Shared Core and cross-cutting layers

### POM-RX Core

Historical `pom-rx/0.1` compatibility remains frozen. The bounded strict profile, exact policy/runtime/artifact binding, reference single-use Gate, hostile-object/plain-data capture, Witness lifecycle, filesystem durable claim primitive, execution evidence and observation/reconciliation remain common Core capabilities on trusted main.

Application blocks may add adapters, profiles and tests. They must not duplicate or fork Core canonicalization, hashing, verifier, Witness or Gate semantics. Shared reference-data, exact authorization, execution-evidence and observation/reconciliation semantics also remain Core-owned.

Strict verification is structurally non-authorizing. A valid receipt, proof, anchor, simulation result or observation record never substitutes for the execution-side Gate.

### Exact authorization and Gate

Trusted main contains the common exact-authorization contract, a process-local single-use Gate and a separate filesystem durable claim-store reference primitive. A reviewed composition of the durable claim primitive with the common Gate is **not** on trusted main at this checkpoint.

Historical PR #97 remains blocked and is not a merge candidate:

- exact live head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- historical base: `0564aecd42cf0794894c12842980969ff59c9f73`;
- historical CI `32487036517` / CI 592: `success` but known false-PASS for the Promise-drift security property;
- state: `OPEN / MUST_NOT_MERGE`.

Do not merge, rebase, revive or wholesale-copy the stale PR #97 branch. Its durable claim-before-observer/downstream composition must be reconstructed later from then-current trusted main as a separate bounded Tier-B Core lot.

### Active prerequisite — PR #120

PR #120 is the fresh trusted-main Wallet Guard/provider Promise-transport prerequisite repair.

- exact base/trusted main: `e5aead150a2ed5f390593cc2d9d307defdd79bdc`;
- exact live head at this checkpoint: `30e9c0399804f17cbadbc076eed4d1d48614610d`;
- canonical exact-head CI `32596104896` / CI 770: `completed / success`;
- release-owner exact-head verdict: `BLOCK / NON-INDEPENDENT`;
- merge: `BLOCKED`.

CI 770 is not release evidence for a fresh owner P1 found on the same exact head. A rejected same-realm native Promise can be made non-extensible and given a benign alternate data `constructor` whose effective `Symbol.species` path would safely fall back to the native Promise. The current classifier does not prove that species path; it can instead attempt fallible own-`constructor` shadowing before attaching the captured rejection reaction. Under strict unhandled-rejection mode, the original provider rejection can remain orphaned and terminate Node even though the gateway itself fails closed.

The next bounded runtime repair must:

- classify the effective constructor's `Symbol.species` lookup path with captured descriptor/prototype/Proxy intrinsics;
- allow internal draining only for a data-only, non-Proxy path whose species is absent/null/undefined or the captured native `Promise`;
- leave primitive constructors, accessors, Proxies and attacker-selected species constructors outside the internally-drainable claim unless separately proven safe;
- add a CI-wired strict regression for a non-extensible benign alternate data constructor;
- add a prehandled hostile species-accessor regression proving zero accessor execution, zero reference authorization and zero sensitive forwarding;
- preserve all existing rejected-transport regressions and product-position tests.

The five historical distinct Codex threads on PR #120 remain unresolved until a future exact repaired head is independently validated: `PRRT_kwDOTiNyWc6bZjxp` (P1), `PRRT_kwDOTiNyWc6bZ6tx` (P1), `PRRT_kwDOTiNyWc6bZ6tz` (P2), `PRRT_kwDOTiNyWc6baFkR` (P1), and `PRRT_kwDOTiNyWc6baIxZ` (P1).

For every hostile rejected context transport inside the bounded supported claim, the security result remains **zero reference authorization and zero sensitive forwarding**. PR #120 intentionally does not import or claim durable Gate composition.

### Witness

Source-signed preflight material, Witness acknowledgement primitives and the process-local reference lifecycle remain merged. Wallet Guard may consume a Core-verified Witness candidate through its application adapter, but does not own or fork Witness semantics. Production KMS/HSM, distributed revocation, remote attestation, quorum and trusted-time service semantics remain unproved.

### Execution evidence

The shared bounded reference recorder binds exact authorization commitments to recorder chronology and adapter-reported outcomes/effects. It is not itself an execution path and does not prove external effect truth.

### Observation and reconciliation

The shared reference layer compares bounded observation evidence against validated exact authorization binding and expected status/effect/chronology. Production observer independence, liveness, finality and external-world truth remain outside the reference claim.

### Exact-main CI assurance surface

Trusted main publishes `pom-rx/exact-main-ci` for canonical push CI on the exact main SHA. Post-merge assurance still requires decision-time freshness revalidation; the status alone is not a production-readiness signal.

### Durable project-control continuity

PR #119 source head `057b225783b24c97568dbcd733ca4c821f889c7a` merged as exact main `e5aead150a2ed5f390593cc2d9d307defdd79bdc`. Canonical exact-main CI `32575110984` / CI 720 attempt 1 passed on the exact merge SHA, and exact-merge assurance is `POST_MERGE_ASSURANCE_PASS` in PR #119 comment `5380609307`.

The canonical main continuation files nevertheless remained at the pre-PR119 checkpoint while live PR #120 acquired the new species-path P1. The branch `docs/pom-rx-live-state-reconcile-20260822` is therefore a one-time, four-file non-Tier-B continuity reconciliation required before stale control-plane entries are used as readiness/dependency evidence. It changes no runtime or security semantics and must itself pass applicable exact-head gates.

### Proof transport and anchoring

Proof Receipt, Merkle batching, content-addressed storage and blockchain/network anchors provide evidence transport, persistence or publication. They do not become the authorization boundary merely because they are on-chain.

### Governance profile

`POM-RX Governance Profile — DAGR` is a cross-cutting profile under POM-RX. It is not a second product, audit firm, certification system or global security score. Normative DAGR work remains source-gated while `DAGR_SOURCE_DOCUMENT_MISSING` is active.

## 3. Application blocks

These block names mirror the public SwissTokint taxonomy. They are contexts for POM-RX research and integration, not claims that every block is operational.

### Block A — Payments and financial operations

Examples include destination/amount controls, trading-agent preflight and execution reconciliation, beneficiary policy and exchange/broker adapter evidence. Existing market-risk work remains supporting research unless a reviewed POM-RX Gate actually enforces the action.

### Block B — AI agents

Examples include external tool/API calls, bounded spending/transfer authority, model-generated actions requiring policy decisions and separation of agent intent, authorization and external effect.

### Block C — APIs and enterprise systems

Examples include critical configuration changes, privileged API mutations, approval workflows for ERP/infrastructure operations and exact target/action binding before writes reach downstream systems.

### Block D — Cybersecurity

Examples include blocking policy-violating high-impact actions before forwarding, detecting declared-intent/requested-effect mismatch, fail-closed handling of unknown critical operations and incident evidence/reconciliation. POM-RX is not an antivirus, malware detector, firewall or universal phishing detector.

### Block E — Blockchain and digital assets

Examples include Wallet Guard for dangerous wallet RPC requests, smart-account or contract-level Risk Gates, exact authorization for approvals/permits/transfers, on-chain commitment anchoring and chain-specific observation/reconciliation adapters.

Wallet Guard's primary product home is Blockchain and digital assets, while its defensive control model also overlaps the Cybersecurity block.

`POM-RX Wallet Guard` is one application profile inside this block. It is not POM-RX as a whole and must not replace the shared Core, Witness, Gate, observation or reconciliation semantics.

## 4. Wallet Guard position

The intended bounded vertical slice is:

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

Trusted main contains JSON/intent/effect/policy/controller/preflight, Core-verified Witness adapter, provider/Gate integration and a controlled in-memory host. PR #120 changes only the prerequisite Promise/provider/inert-data boundary and remains untrusted while its P1 is open.

PR #93 remains open/untrusted at exact head `c4e40ceb286f4e59657767661daed15d2b68e9a7`; historical CI `32465835858` / CI 541 is not release evidence. Current/non-outdated P1/P2 history includes exact-value identity, wrapper normalization, saved-reflection capture and shared proof canonicalization/SHA-256/hash hardening. It remains ordered after trusted PR #120 and required shared-Core work unless a separately reviewed dependency change is recorded.

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

Application folders contain only domain adapters, profiles, fixtures and tests. Shared verifier, canonicalization, hashing, Witness, authorization, Gate, execution-evidence and observation/reconciliation rules remain common POM-RX implementation and are referenced rather than copied.

## 7. Current maturity by block

| Block | Current trusted-main state | Missing / active |
| --- | --- | --- |
| Shared Core | strict profile, exact authorization, process-local Gate, hostile-object capture, Witness lifecycle, durable local claim primitive, execution evidence, observation/reconciliation, exact-main CI observability | PR #120 prerequisite still P1-blocked; durable Gate composition remains separate/untrusted; production trust/time, distributed semantics and external effect truth remain missing |
| Exact authorization / Gate | ratified contract plus process-local Gate and separate durable claim primitive | stale PR #97 must not merge; durable claim-before-observer/downstream composition requires later reconstruction |
| Witness | source/Witness primitives, process-local trust lifecycle, Wallet Guard Core-verification adapter | production KMS/HSM, distributed revocation, trusted time/attestation |
| Execution evidence | bounded exact-authorization-bound recorder | actual trusted forwarding/effect composition and external effect truth |
| Observation / reconciliation | bounded reference comparison layer | production observer independence/liveness/finality |
| Wallet Guard | deterministic intent/policy/preflight/Witness-adapter/provider/controlled-host reference path | PR #120 species-path P1; PR #93 simulation evidence later; simulation-to-forwarding binding remains separate |
| Governance DAGR | non-normative placeholder/profile position | authoritative source missing |
| Integrations | Stellar/Filecoin/supporting evidence infrastructure | remain adapters unless a reviewed execution Gate is actually enforced |

## 8. Merge and safety boundary

Standing authorization is available only after the mandatory five-stage pre-merge gate, all applicable technical/security gates, exact-head CI, every required genuinely distinct exact-head independent review and zero unresolved P0/P1/P2 on the same frozen SHA. A moved head invalidates exact-head evidence. The independent-review waiver remains limited to PR #60. Every non-trivial merge requires exact-main CI plus exact-merge post-merge assurance before it becomes a trusted dependency.

The maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: a local, deterministic, synthetic, bounded demonstration. It is not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction or meaningful funds are authorized. Burner local/testnet E2E requires a separate explicit human gate. Public website/Vercel/funding-directory writes are outside this control plane.
