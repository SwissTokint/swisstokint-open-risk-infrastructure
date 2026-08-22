# POM-RX capability map

Status: `CURRENT_INFORMATION_ARCHITECTURE / NON_NORMATIVE`

Date: 2026-08-22

Trusted-main checkpoint: `ecc25e3e3f2991482e925fbe307058a91276c0bc`.

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

PR #97 is the blocked historical Tier-B candidate:

- exact head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- historical base: `0564aecd42cf0794894c12842980969ff59c9f73`;
- current trusted main: `ecc25e3e3f2991482e925fbe307058a91276c0bc`;
- CI `32487036517` / CI 592: `success` but not security evidence;
- release-owner verdict: `BLOCK / NON-INDEPENDENT`;
- current exact-head P1: `Reject Promise drift before entering async layers`.

Inherited `Promise.prototype.constructor` plus `then` poisoning can cross outer
async awaits before a transport rejection reaches its caller, substitute stable
attacker-controlled context, then permit reference authorization and sensitive
forwarding. The green CI result does not override the reproducer.

The eventual repair must start from then-current trusted main rather than
reviving or merging the stale branch wholesale. It must prevent Promise-prototype
drift before outer async assimilation, restore/replace the exact exploit
regression, require the durable capability claim to succeed before observer or
downstream work, preserve fail-closed replay and durable one-winner behavior,
retain ordinary native-Promise Node/AsyncHooks bookkeeping-symbol compatibility,
and pass exact-head CI, release-owner review, fresh distinct exact-head
independent skeptical/security review and zero unresolved P0/P1/P2.

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

PR #113 source head `f28bea5bdddce9413b7bfc882999d8b9fab1196e`
merged as exact main SHA `ecc25e3e3f2991482e925fbe307058a91276c0bc`.
Source-head and merge trees are identical at
`0fdaa90c0355cf741ca7af81b485cd6da806b22a`.

Its exact-head CI `32545840351` / CI 676 passed. Distinct exact-head
`chatgpt-codex-connector` evidence reported no major issues, the release-owner
five-stage gate passed, exact-main push CI `32548199260` / CI 677 attempt 1
completed successfully on the merge SHA, and decision-time
`pom-rx/exact-main-ci` is `success` targeting that run. Exact-merge SpecKit,
skeptical/falsification, security, code-quality, optimization and
integration/regression checks are recorded as `POST_MERGE_ASSURANCE_PASS` for the
bounded documentation/control-plane scope.

PR #113 changed no runtime/security semantics. PR #114 on branch
`docs/pom-rx-checkpoint-after-113-20260822` is the current four-file non-Tier-B
reconciliation because a merged checkpoint cannot self-describe its own future
merge SHA. At PR creation the head was `b98f9c0e80e25c4203784b99cc99061bba5ac6d5`
and CI 678 (`32551305996`) entered the queue; subsequent reconciliation commits
moved that head, so creation-time exact-head evidence is stale. Read PR #114 live
for its final exact head, CI, reviews and threads. Until it passes its own
exact-head gates and post-merge assurance, live GitHub remains authoritative for
volatile state.

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
or reconciliation semantics. Wallet Guard's primary product home is
Blockchain and digital assets, while its defensive control model also overlaps
the Cybersecurity block.

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
in-memory host. Reference simulation evidence remains active PR #93 and is **not
on trusted main**.

PR #93 current live state at this checkpoint:

- exact head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- historical base: `818718955c9e4136e9e55754a31be2f1c7b610f8`;
- current trusted main: `ecc25e3e3f2991482e925fbe307058a91276c0bc`;
- CI `32465835858` / CI 541: `success` but not release evidence;
- latest release-owner/distinct review evidence is on moved head `03e0201c9f...`;
- unresolved current/non-outdated P1/P2 classes include exact negative-zero
  identity, typed-data wrapper normalization, generic-signature exact-value
  commitment, nested payload capture with saved reflection intrinsics, and shared
  proof canonicalization/SHA-256/hash hardening.

PR #93 remains ordered after trusted #97 unless a separately reviewed dependency
change is recorded. Even after simulation evidence eventually merges,
simulation-to-forwarding atomic binding remains a separate reviewed requirement.
The first success criterion remains a deterministic controlled fixture in which
a dangerous approval/signature is denied before forwarding while one explicitly
allowed control request is forwarded exactly once and reconciled. That does not
prove universal browser/wallet/dApp/chain protection.

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
implementation and are referenced rather than copied. Existing frozen fixture
paths and public source pins are not relocated without dedicated compatibility
review.

## 7. Current maturity by block

| Block | Current trusted-main state | Missing / active |
| --- | --- | --- |
| Shared Core | strict profile, exact authorization, process-local Gate, hostile-object capture, Witness lifecycle, durable local claim primitive, execution evidence, observation/reconciliation, exact-main CI observability | production trust/time, distributed semantics, production-independent observation and external effect truth |
| Exact authorization / Gate | ratified contract plus process-local Gate and separate durable claim primitive | PR #97 blocked by exact-head Promise-drift P1; fresh repair from trusted main required |
| Witness | source/Witness primitives, process-local trust lifecycle, Wallet Guard Core-verification adapter | production KMS/HSM, distributed revocation, trusted time/attestation |
| Execution evidence | bounded exact-authorization-bound recorder | actual trusted forwarding/effect composition and external effect truth |
| Observation / reconciliation | bounded reference comparison layer | production observer independence/liveness/finality |
| Wallet Guard | deterministic intent/policy/preflight/Witness-adapter/provider/controlled-host reference path | PR #93 simulation evidence blocked by dependency + exact-head P1/P2 review classes; simulation-to-forwarding binding remains separate |
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
