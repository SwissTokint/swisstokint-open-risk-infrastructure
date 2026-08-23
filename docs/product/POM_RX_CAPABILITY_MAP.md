# POM-RX capability map

Status: `CURRENT_INFORMATION_ARCHITECTURE / NON_NORMATIVE`

Date: 2026-08-23

Trusted-main checkpoint: `73f3921984449ffd6025f6c9b99b0220f0bf068b`.

This document organizes repository work. It does not change protocol semantics,
publish a new POM-RX version, establish production readiness, or by itself
activate an authorization/Gate claim. Live GitHub wins whenever volatile PR,
CI, review, thread, mergeability or merge state changes after this checkpoint.

## 1. Product rule

POM-RX is the single principal technical product in this repository. Application
domains, profiles, adapters, demonstrations and network integrations must not be
presented as separate peer products merely because they have their own
implementation work.

Application blocks are not mutually exclusive; they may overlap, but shared
semantics are owned once in Core. A capability block may implement only part of
the lifecycle. Missing stages remain explicit and must never be inferred from a
structurally valid receipt, simulation result, proof or anchor.

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

Historical `pom-rx/0.1` compatibility remains frozen. Strict verification, exact
policy/runtime/artifact binding, hostile-object/plain-data capture, Witness,
exact authorization, the process-local single-use Gate, the filesystem durable
claim primitive, execution evidence and observation/reconciliation are shared
Core capabilities according to their merged reviewed scope.

Application blocks may add adapters, profiles, fixtures and tests. They must not duplicate
or fork Core canonicalization, hashing, verifier, Witness or Gate semantics.
Shared reference-data, exact authorization, execution-evidence and
observation/reconciliation semantics also remain Core-owned.

Strict verification is structurally non-authorizing. A valid receipt, proof,
anchor, simulation result or observation record never substitutes for the
execution-side Gate.

### Exact authorization and Gate

Trusted main contains the common exact-authorization contract, a process-local
single-use Gate and a separate filesystem durable claim-store reference
primitive. Reviewed composition of the durable claim primitive with the common
Gate is **not** trusted on current main.

Historical PR #97 remains `OPEN / MUST_NOT_MERGE` at exact live head
`0efb462f0b4b8cff62d664a51d13ad71306b6bbb`. Do not merge, rebase, revive or
wholesale-copy that stale branch. Durable claim-before-observer/downstream
composition must be reconstructed later from then-current trusted main after PR
#120 becomes a trusted dependency.

### Trusted coordination checkpoint

PR #123 source head `6cac168b775b26b572336764271b4f25e934a5ea`
merged as exact main `73f3921984449ffd6025f6c9b99b0220f0bf068b`.
Canonical exact-main push CI `32614549879` / CI 789 attempt 1 passed on that exact
merge SHA. Independent pre-merge evidence is `chatgpt-codex-connector[bot]`
comment `5383774814`, reviewed exact source commit `6cac168b77`, no major issues.
Exact-merge assurance is `POST_MERGE_ASSURANCE_PASS` in PR #123 comment
`5383940027`.

PR #123 changed only canonical continuation/product-position documents. It is
trusted coordination evidence, not runtime or Wallet Guard security evidence.

### Current control-plane reconciliation

The files currently on trusted `main` still contain the pre-PR123 continuation
state `cff851b92746af09c224451c82d3da9c3bae176a` / PR #122, while live GitHub is
now the assured PR #123 merge `73f3921984449ffd6025f6c9b99b0220f0bf068b`.
Live PR #120 also gained a fresh exact-head independent P1 after its CI and owner
review. Branch `docs/pom-rx-post-pr123-live-reconcile-20260823` is the scoped
non-Tier-B reconciliation required by the continuity contract before stale
exact-main or blocker fields are reused as dependency/readiness evidence.

This reconciliation changes only the compact checkpoint/task/blocker/team-roster/
capability-map state. It changes no runtime, test, protocol, Gate, Witness,
verifier, Wallet Guard/provider, wallet/network, public-site/Vercel or
financial-execution semantics.

### Active prerequisite — PR #120

PR #120 is the current Wallet Guard/provider Promise-transport prerequisite
repair.

- exact branch: `automation/pom-rx-promise-drift-repair-20260822`;
- exact live head: `5238b9c289476100c875ed9a88bd7e21a574fa67`;
- target branch: `main`;
- current trusted main: `73f3921984449ffd6025f6c9b99b0220f0bf068b`;
- trusted-main reconciliation merge on the branch: `e4c8d4b29cdc875d17c170d6e67a0fd7804d849d`;
- current-main -> head comparison: `ahead`, ahead 69 / behind 0, merge-base
  exactly `73f3921984449ffd6025f6c9b99b0220f0bf068b`;
- GitHub mergeability at revalidation: `true` (volatile conflict metadata only);
- canonical exact-head CI: `32614831929` / CI 792 attempt 1,
  `completed / success`, but false-PASS for the fresh independently reviewed P1;
- release-owner five-stage exact-head review `5001566041`:
  `PASS_NON_INDEPENDENT`, owner findings `0 P0 / 0 P1 / 0 P2`;
- fresh genuinely distinct exact-head `chatgpt-codex-connector` review:
  `BLOCK / P1` via current unresolved thread `PRRT_kwDOTiNyWc6bc4gh`;
- merge: `BLOCKED`.

The bounded repair already present on the branch uses captured reflection and
data-descriptor checks for constructor/species classification, bounded
prototype/species traversal with Proxy rejection before hostile reflection
dispatch, and internal draining only when effective species is absent, null,
undefined or the captured native `Promise`. Primitive constructors,
constructor/species accessors, Proxies and attacker-selected species constructors
remain outside the internally-drainable claim unless separately proven safe.

The fresh exact-head P1 demonstrates that this boundary is still incomplete. A
rejected same-realm native Promise with a non-configurable own unsafe data
`constructor`, such as `constructor: 1`, can make the classifier reject the path
and then make the fallback constructor-shadowing `defineProperty` fail before the
captured rejection reaction is attached. Under strict unhandled-rejection
behavior, the Wallet Guard operation fails closed but the original rejection may
remain orphaned and terminate the process. The current canonical regression
covers the safe non-configurable `constructor: Promise` case, not this unsafe
data-constructor variant.

Required repair is deliberately narrow: attach/drain the rejected transport
without requiring successful attacker-controlled constructor shadowing first;
do not execute hostile constructor/species accessors or Proxy paths; do not trust
attacker-selected species constructors; and add a CI-wired
`--unhandled-rejections=strict` regression proving fail-closed behavior with zero
reference authorization and zero sensitive forwarding for the non-configurable
unsafe data-constructor case.

PR #120 remains **untrusted and blocked from merge**. Any repair moves the head
and invalidates CI 792, owner review `5001566041` and the current Codex review as
release evidence. One frozen repaired exact head must receive fresh canonical CI,
the complete five-stage owner gate, a genuinely distinct exact-head
`chatgpt-codex-connector` review, and zero unresolved P0/P1/P2.

Six review threads remain unresolved until that evidence justifies closure:
`PRRT_kwDOTiNyWc6bZjxp`, `PRRT_kwDOTiNyWc6bZ6tx`,
`PRRT_kwDOTiNyWc6bZ6tz`, `PRRT_kwDOTiNyWc6baFkR`,
`PRRT_kwDOTiNyWc6baIxZ`, and fresh current P1
`PRRT_kwDOTiNyWc6bc4gh`.

### Witness

Source-signed preflight material, Witness acknowledgement primitives and the
process-local reference lifecycle remain shared Core. Wallet Guard may consume a
Core-verified Witness candidate through its application adapter but does not own
or fork Witness semantics. Production KMS/HSM, distributed revocation, remote
attestation, quorum and trusted-time service semantics remain unproved.

### Execution evidence

The shared bounded reference recorder binds exact authorization commitments to
recorder chronology and adapter-reported outcomes/effects. It is not itself an
execution path and does not prove external effect truth.

### Observation and reconciliation

The shared reference layer compares bounded observation evidence against
validated exact authorization binding and expected status/effect/chronology.
Production observer independence, liveness, finality and external-world truth
remain outside the reference claim.

### Proof transport and anchoring

Proof Receipt, Merkle batching, content-addressed storage and blockchain/network
anchors provide evidence transport, persistence or publication. They do not
become the authorization boundary merely because they are on-chain.

### Governance profile

`POM-RX Governance Profile — DAGR` is a cross-cutting profile under POM-RX. It is
not a second product, audit firm, certification system or global security score.
Normative DAGR work remains source-gated while `DAGR_SOURCE_DOCUMENT_MISSING` is
active.

## 3. Application blocks

These block names mirror the public SwissTokint taxonomy. They are contexts for
POM-RX research and integration, not claims that every block is operational.

### Payments and financial operations

Examples include destination/amount controls, trading-agent preflight and
execution reconciliation, beneficiary policy and exchange/broker adapter
evidence. Existing market-risk work remains supporting research unless a
reviewed POM-RX Gate actually enforces the action.

### AI agents

Examples include external tool/API calls, bounded spending/transfer authority,
model-generated actions requiring policy decisions and separation of agent
intent, authorization and external effect.

### APIs and enterprise systems

Examples include critical configuration changes, privileged API mutations,
approval workflows for ERP/infrastructure operations and exact target/action
binding before writes reach downstream systems.

### Cybersecurity

Examples include blocking policy-violating high-impact actions before forwarding,
detecting declared-intent/requested-effect mismatch, fail-closed handling of
unknown critical operations and incident evidence/reconciliation. POM-RX is not
an antivirus, malware detector, firewall or universal phishing detector.

### Blockchain and digital assets

Examples include Wallet Guard for dangerous wallet RPC requests, smart-account
or contract-level Risk Gates, exact authorization for approvals/permits/transfers,
on-chain commitment anchoring and chain-specific observation/reconciliation
adapters.

Wallet Guard's primary product home is Blockchain and digital assets, while its defensive control model also overlaps the Cybersecurity block.

`POM-RX Wallet Guard` is one application profile inside this block. It is not
POM-RX as a whole and must not replace the shared Core, Witness, Gate,
observation or reconciliation semantics.

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

Trusted main contains the reviewed reference pieces already merged. PR #120
changes only the Promise/provider/inert-data prerequisite boundary and remains
untrusted until its repaired exact-head and post-merge gates pass.

PR #93 remains open/untrusted at exact live head
`c4e40ceb286f4e59657767661daed15d2b68e9a7`. Its historical green CI is not
release evidence, and unresolved review history still contains P1/P2 exact-value,
wrapper, reflection and canonicalization/hash classes. It remains ordered after
trusted PR #120 and required shared-Core work unless a separately reviewed
dependency decision changes that order.

Even after simulation evidence eventually merges, simulation-to-forwarding
atomic binding remains a separate reviewed requirement. A simulation result
never authorizes forwarding by itself.

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
| Shared Core | strict profile, exact authorization, process-local Gate, hostile-object capture, Witness lifecycle, durable local claim primitive, execution evidence, observation/reconciliation, exact-main CI observability | PR #120 fresh P1 repair and wholly fresh exact-head gates; durable Gate composition remains separate/untrusted; production trust/time, distributed semantics and external effect truth remain missing |
| Exact authorization / Gate | ratified contract plus process-local Gate and separate durable claim primitive | stale PR #97 must not merge; durable claim-before-observer/downstream composition requires later reconstruction |
| Witness | source/Witness primitives, process-local trust lifecycle, Wallet Guard Core-verification adapter | production KMS/HSM, distributed revocation, trusted time/attestation |
| Execution evidence | bounded exact-authorization-bound recorder | actual trusted forwarding/effect composition and external effect truth |
| Observation / reconciliation | bounded reference comparison layer | production observer independence/liveness/finality |
| Wallet Guard | deterministic intent/policy/preflight/Witness-adapter/provider/controlled-host reference path | PR #120 current P1 `PRRT_kwDOTiNyWc6bc4gh` repair + new exact-head CI/owner/independent gates + six-thread closure; PR #93 simulation evidence later; simulation-to-forwarding binding separate |
| Governance DAGR | non-normative placeholder/profile position | authoritative source missing |
| Integrations | Stellar/Filecoin/supporting evidence infrastructure | remain adapters unless a reviewed execution Gate is actually enforced |

## 8. Merge and safety boundary

Standing authorization applies only after the mandatory five-stage pre-merge
gate, all applicable technical/security gates, exact-head CI, every required
genuinely distinct exact-head independent review and zero unresolved P0/P1/P2 on
the same frozen SHA. A moved head invalidates exact-head evidence. The
independent-review waiver remains limited to PR #60. Every non-trivial merge
requires exact-main CI plus exact-merge post-merge assurance before it becomes a
trusted dependency.

The maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: a
local, deterministic, synthetic, bounded demonstration. It is not production
readiness, audit, certification, wallet safety, financial safety or deployment
authorization.

No private key, seed, secret, funded-wallet credential, real/funded wallet,
mainnet transaction or meaningful funds are authorized. Burner local/testnet E2E
requires a separate explicit human gate. Public website/Vercel/funding-directory
writes are outside this control plane.
