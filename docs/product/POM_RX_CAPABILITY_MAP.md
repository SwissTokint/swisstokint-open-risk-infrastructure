# POM-RX capability map

Status: `CURRENT_INFORMATION_ARCHITECTURE / NON_NORMATIVE`

Date: 2026-08-22

Trusted-main checkpoint: `e5aead150a2ed5f390593cc2d9d307defdd79bdc`.

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

## 2. Shared Core and cross-cutting layers

### POM-RX Core

Historical `pom-rx/0.1` compatibility remains frozen. The bounded
`pom-rx-v0.1/strict-errata-1` profile, exact policy/runtime/artifact binding,
reference single-use Gate, hostile-object/plain-data capture, Witness lifecycle,
filesystem durable claim primitive, execution evidence and
observation/reconciliation remain common Core capabilities on trusted main.

Application blocks may add adapters, profiles and tests. They must not duplicate
or fork Core canonicalization, hashing, verifier, Witness or Gate semantics.
Shared reference-data, exact authorization, execution-evidence and
observation/reconciliation semantics also remain Core-owned.

Strict verification is structurally non-authorizing. A valid receipt, proof,
anchor, simulation result or observation record never substitutes for the
execution-side Gate.

### Exact authorization and Gate

Trusted main contains the common exact-authorization contract, process-local
single-use Gate and a separate filesystem durable claim-store reference
primitive. A reviewed composition of the durable claim primitive with the common
Gate is **not** on trusted main at this checkpoint.

Historical PR #97 remains blocked and is not a merge candidate at live head
`0efb462f0b4b8cff62d664a51d13ad71306b6bbb`; its historical CI 592 is not
security/release evidence and it must not be revived or merged wholesale.

Fresh PR #120 is the active prerequisite repair from exact trusted main:

- branch: `automation/pom-rx-promise-drift-repair-20260822`;
- first implementation commit: `f31611139e51cf0f05265c19012e372e06bfc7ae`;
- runtime drain repair commit: `9e7a151b4eb8da0e7595e8ebee540319273a7fab`;
- bounded non-shadowable accessor regression commit:
  `d0c4175f12086bbbb2f4ccceb7cd947203e3f6fc`;
- class: `TIER_B_SHARED_SECURITY_SEMANTICS`;
- current state: `OPEN / NOT_TRUSTED / RUNTIME_REPAIR_IMPLEMENTED / FINAL_EXACT_HEAD_GATES_PENDING`;
- exact live head and volatile CI/review state must be read from GitHub; this
  moving file intentionally does not self-embed its own final SHA.

The bounded PR #120 contract is to close inherited
`Promise.prototype.constructor` + `then` substitution before reference
authorization or sensitive forwarding while preserving hardened synchronous
plain-data capture and the strict Wallet Guard application boundary.

A genuinely distinct Codex review on moved head
`5885da291d7d6b3e4541e5c00c160ffb481828b8` opened P1 thread
`PRRT_kwDOTiNyWc6bZjxp` for structurally invalid rejected native Promise
transports that could be rejected before a rejection reaction was attached. A
later dedicated Codex review on moved head
`b7576f8e94b3379c7427a51e4113960f396ac7e8` opened P1 thread
`PRRT_kwDOTiNyWc6bZ6tx` because the first drain repair still performed a fallible
own-`constructor` mutation before attaching the rejection reaction. The same
review opened P2 thread `PRRT_kwDOTiNyWc6bZ6tz` because the rejected-transport
regression was not reached by canonical `npm test`.

The P2 implementation defect is repaired: `package.json` includes
`provider-invalid-rejected-transport.node.test.mjs` in the Wallet Guard provider-
gate test script, and that script is already part of full `npm test`.

The P1 implementation is now repaired for the **claimed bounded transport
classes**. `provider.mjs` captures the Promise species descriptor, identifies
safe data-only constructor/species paths with captured reflection, attaches the
captured rejection reaction directly when that path is safe, and shadows an
unsafe-but-configurable constructor path with own `undefined` before the captured
`then` call. Therefore the CI-wired `metadata-nonextensible` and
`constructor-nonconfigurable` data-property cases no longer require a fallible
mutation before the rejection reaction.

The claim is deliberately narrower than “all arbitrarily decorated rejected
Promises can be internally drained.” A native Promise with a **non-configurable
own constructor accessor** cannot be shadowed without a failed mutation, while
native `Promise.prototype.then` would read that accessor through species
construction. PR #120 does not execute that attacker accessor merely to suppress
an unhandled rejection and does not claim gateway-owned draining for that
unsupported class. A strict child regression pre-handles the provider rejection,
then proves Wallet Guard fails closed with zero accessor calls, zero reference
authorization and zero sensitive forwarding.

PR #120 remains untrusted until one final frozen head has canonical CI success,
a release-owner five-stage PASS, a fresh genuinely distinct exact-head Codex
skeptical/security review, and zero unresolved P0/P1/P2. Threads
`PRRT_kwDOTiNyWc6bZjxp`, `PRRT_kwDOTiNyWc6bZ6tx` and
`PRRT_kwDOTiNyWc6bZ6tz` remain unresolved until that evidence exists.

For every hostile rejected context transport inside the bounded supported claim,
the security result remains **zero reference authorization and zero sensitive
forwarding**.

PR #120 intentionally does **not** import or claim the historical durable Gate
composition. Once PR #120 is trusted, durable claim-before-observer/downstream
composition must be reconstructed as its own bounded Tier-B Core lot, preserving
fail-closed replay and durable one-winner behavior.

### Witness

Source-signed preflight material, Witness acknowledgement primitives and the
process-local reference lifecycle remain merged. Wallet Guard may consume a
Core-verified Witness candidate through its application adapter, but does not own
or fork Witness semantics.

Production KMS/HSM, distributed revocation, remote attestation, quorum and
trusted-time service semantics remain unproved. Witness verification alone does
not prove external execution authorization.

### Execution evidence

The shared bounded reference recorder binds exact authorization commitments to
recorder chronology and adapter-reported outcomes/effects. It is not itself an
execution path and does not prove external effect truth.

### Observation and reconciliation

The shared reference layer compares bounded observation evidence against validated
exact authorization binding and expected status/effect/chronology. Production
observer independence, liveness, finality and external-world truth remain outside
the reference claim.

### Exact-main CI assurance surface

Trusted main publishes `pom-rx/exact-main-ci` for canonical push CI on the exact
main SHA. Post-merge assurance still requires decision-time freshness
revalidation; the status alone is not a production-readiness signal.

### Durable project-control continuity

PR #119 source head `057b225783b24c97568dbcd733ca4c821f889c7a` merged as exact main
`e5aead150a2ed5f390593cc2d9d307defdd79bdc`; exact-main CI 720 passed and
exact-merge assurance is `POST_MERGE_ASSURANCE_PASS` in PR #119 comment
`5380609307`. PR #119 is terminal coordination evidence: do not create another
docs-only successor merely to restate completion.

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

These block names mirror the public SwissTokint taxonomy. They are contexts for
POM-RX research and integration, not claims that every block is operational.

### Block A — Payments and financial operations

Examples include destination/amount controls, trading-agent preflight and
execution reconciliation, beneficiary policy and exchange/broker adapter
evidence. Existing market-risk work remains supporting research unless a reviewed
POM-RX Gate actually enforces the action.

### Block B — AI agents

Examples include external tool/API calls, bounded spending/transfer authority,
model-generated actions requiring policy decisions and separation of agent
intent, authorization and external effect. POM-RX does not prove model reasoning
quality merely because an action lifecycle is evidenced.

### Block C — APIs and enterprise systems

Examples include critical configuration changes, privileged API mutations,
approval workflows for ERP/infrastructure operations and exact target/action
binding before writes reach downstream systems.

### Block D — Cybersecurity

Examples include blocking policy-violating high-impact actions before forwarding,
detecting declared-intent/requested-effect mismatch, fail-closed handling of
unknown critical operations and incident evidence/reconciliation. POM-RX is not
an antivirus, malware detector, firewall or universal phishing detector.

### Block E — Blockchain and digital assets

Examples include Wallet Guard for dangerous wallet RPC requests, smart-account or
contract-level Risk Gates, exact authorization for approvals/permits/transfers,
on-chain commitment anchoring and chain-specific observation/reconciliation
adapters.

`POM-RX Wallet Guard` is one application profile inside this block. It is not
POM-RX as a whole and must not replace the shared Core, Witness, Gate, observation
or reconciliation semantics.

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

Trusted main contains JSON/intent/effect/policy/controller/preflight,
Core-verified Witness adapter, provider/Gate integration and a controlled
in-memory host. PR #120 changes the provider Promise/inert-data boundary only; it
is not trusted until all exact-head gates pass and the merge receives exact-merge
post-merge PASS. Reference simulation evidence remains active PR #93 and is **not
on trusted main**.

PR #93 remains open/untrusted at
`c4e40ceb286f4e59657767661daed15d2b68e9a7`, with historical CI 541 not release
evidence and unresolved P1/P2 classes. It remains ordered after trusted PR #120
and required shared-Core dependency work unless a separately reviewed dependency
change is recorded.

## 5. Integration and adapter block

Filecoin, Stellar and other chain work belongs here unless it directly implements
an execution Gate for an application block. Adapters may provide publication,
content-addressed storage, finality/observation records and commitment registries.
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
```

Application folders contain only domain adapters, profiles, fixtures and tests.
Shared verifier, canonicalization, hashing, Witness, authorization, Gate,
execution-evidence and observation/reconciliation rules remain common POM-RX
implementation and are referenced rather than copied.

## 7. Current maturity by block

| Block | Current trusted-main state | Missing / active |
| --- | --- | --- |
| Shared Core | strict profile, exact authorization, process-local Gate, hostile-object capture, Witness lifecycle, durable local claim primitive, execution evidence, observation/reconciliation, exact-main CI observability | PR #120 Promise/provider-boundary runtime repair implemented but exact-head CI/review gates pending; durable Gate composition still requires later bounded reviewed work; production trust/time, distributed semantics and external effect truth remain missing |
| Exact authorization / Gate | ratified contract plus process-local Gate and separate durable claim primitive | stale PR #97 blocked; PR #120 prerequisite awaiting exact-head release evidence; durable claim-before-observer/downstream composition remains untrusted |
| Witness | source/Witness primitives, process-local trust lifecycle, Wallet Guard Core-verification adapter | production KMS/HSM, distributed revocation, trusted time/attestation |
| Execution evidence | bounded exact-authorization-bound recorder | actual trusted forwarding/effect composition and external effect truth |
| Observation / reconciliation | bounded reference comparison layer | production observer independence/liveness/finality |
| Wallet Guard | deterministic intent/policy/preflight/Witness-adapter/provider/controlled-host reference path | PR #120 runtime repair + strict drain regressions pending final exact-head gates; non-shadowable accessor drain claim explicitly bounded; PR #93 simulation evidence remains blocked; simulation-to-forwarding binding remains separate |
| Governance DAGR | non-normative placeholder/profile position | authoritative source missing |
| Integrations | Stellar/Filecoin/supporting evidence infrastructure | remain adapters unless a reviewed execution Gate is actually enforced |

## 8. Claim and safety boundary

The maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`:
a local, deterministic, synthetic, bounded demonstration. It is not production
readiness, audit, certification, wallet safety, financial safety or deployment
authorization.

No private key, seed, secret, funded-wallet credential, real/funded wallet,
mainnet transaction or meaningful funds are authorized. Burner local/testnet E2E
requires a separate explicit human gate. Public website/Vercel/funding-directory
writes are outside this control plane.
