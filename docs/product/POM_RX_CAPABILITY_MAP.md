# POM-RX capability map

Status: `CURRENT_INFORMATION_ARCHITECTURE / NON_NORMATIVE`

Date: 2026-08-23

Trusted-main checkpoint: `abc19e969aa19f3ec08efe67cdf1988731b633ee`.

This document organizes repository work. It does not change protocol semantics, publish a new POM-RX version, establish production readiness, or by itself activate an authorization/Gate claim. Live GitHub wins whenever volatile PR, CI, review, thread, mergeability or merge state changes after this checkpoint.

## 1. Product rule

POM-RX is the single principal technical product in this repository. Application domains, profiles, adapters, demonstrations and network integrations must not be presented as separate peer products merely because they have their own implementation work.

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

Historical `pom-rx/0.1` compatibility remains frozen. Strict verification, exact policy/runtime/artifact binding, hostile-object/plain-data capture, Witness, exact authorization, the process-local single-use Gate, the filesystem durable claim primitive, execution evidence and observation/reconciliation are shared Core capabilities according to their merged reviewed scope.

Application blocks may add adapters, profiles, fixtures and tests. They must not duplicate or fork Core canonicalization, hashing, verifier, Witness or Gate semantics. Shared reference-data, exact authorization, execution-evidence and observation/reconciliation semantics also remain Core-owned.

Strict verification is structurally non-authorizing. A valid receipt, proof, anchor, simulation result or observation record never substitutes for the execution-side Gate.

### Exact authorization and Gate

Trusted main contains the common exact-authorization contract, a process-local single-use Gate and a separate filesystem durable claim-store reference primitive. Reviewed composition of the durable claim primitive with the common Gate is **not** trusted on current main.

Historical PR #97 remains `OPEN / STALE / MUST_NOT_MERGE` at exact head `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`. Its exact-head CI `32487036517` / CI 592 is green, but its non-independent owner gate is BLOCK and an exact-head Codex P1 remains unresolved. Do not merge, rebase, revive or wholesale-copy that stale branch. Durable claim-before-observer/downstream composition must be reconstructed later from then-current trusted main after the fresh Wallet Guard provider-transport prerequisite becomes trusted.

### Trusted coordination checkpoint

PR #128 source head `ab3665f8a1ae22bb46d8c78b7c3d3babac8af6f3` merged as exact main `abc19e969aa19f3ec08efe67cdf1988731b633ee`.

- canonical source-head CI `32627956172` / CI 816 attempt 1 passed;
- release-owner five-stage review `5001979364` was `PASS_NON_INDEPENDENT` with owner findings `0 P0 / 0 P1 / 0 P2`;
- genuinely distinct pre-merge evidence is `chatgpt-codex-connector[bot]` comment `5385047280`, reviewed exact source commit `ab3665f8a1`, no major issues;
- canonical exact-main push CI `32630170335` / CI 817 attempt 1 passed on exact merge `abc19e...`;
- `pom-rx/exact-main-ci` reported `success` targeting that run at assurance time;
- exact-merge assurance is `POST_MERGE_ASSURANCE_PASS` in PR #128 comment `5385232787`;
- source-head -> exact merge comparison contains one merge commit and zero additional changed files.

PR #128 changed only canonical continuation/product-position documents. It is trusted coordination evidence, not runtime or Wallet Guard security evidence.

### Current control-plane reconciliation

After PR #128's source head was frozen, live GitHub changed materially: PR #128 merged and passed exact-merge assurance, and PR #120 was closed without merge. Branch `docs/pom-rx-post-pr128-pr120-close-reconcile-20260823` is the scoped non-Tier-B reconciliation from exact trusted main `abc19e969aa19f3ec08efe67cdf1988731b633ee`. It owns only RESUME, TASKS, BLOCKERS, TEAM_ROSTER and this capability map.

No runtime, test, protocol, Gate, Witness, verifier, Wallet Guard/provider, wallet/network, public-site/Vercel or financial-execution semantics change in this reconciliation. Live GitHub remains authoritative until this lot itself passes exact-head CI, five-stage owner review, genuinely distinct exact-head review, merge and exact-merge assurance.

### Closed historical provider prerequisite — PR #120

PR #120 is `CLOSED / NOT MERGED / STALE` at historical head `5238b9c289476100c875ed9a88bd7e21a574fa67`. Do not reopen, rebase, revive or wholesale-merge it. Its useful hardening may be selectively reconstructed only in a fresh Tier-B branch from then-current trusted main.

Historical CI `32614831929` / CI 792 was green but is not release evidence and was a false-PASS for the final independent P1. Six unresolved review threads remain attack history: `PRRT_kwDOTiNyWc6bZjxp`, `PRRT_kwDOTiNyWc6bZ6tx`, `PRRT_kwDOTiNyWc6bZ6tz`, `PRRT_kwDOTiNyWc6baFkR`, `PRRT_kwDOTiNyWc6baIxZ`, and final P1 `PRRT_kwDOTiNyWc6bc4gh`.

#### Accepted provider-transport boundary for the fresh repair

Read-only architecture/security decision `5384571039`, independently reconciled through trusted PR #127 and preserved by PR #128, selects an explicit narrow **trusted-provider transport contract** for the current local prototype rather than another same-realm reorder/shadow trick.

Inside the supported contract, rejection handling must prove fail-closed behavior, zero reference authorization, zero sensitive forwarding, clean child-process survival under `--unhandled-rejections=strict`, and no orphaned provider-rejection termination.

Decorated/rebased/Proxy/accessor/non-configurable-unsafe-constructor Promise objects are excluded from that supported contract. The existing Wallet Guard trusted bootstrap-provider assumption may support this narrow controlled-provider contract only if the supported path is bound to a controlled provider/adapter that is proven **before origin** unable to emit those excluded transports. It does not prove graceful survival after an intentionally hostile provider has already returned such a rejected Promise.

The fresh contract-narrowing route therefore requires two distinct evidence classes:

1. **supported-path evidence:** CI-wired conformance showing that the controlled trusted provider/adapter cannot originate excluded decorated/non-configurable-unsafe Promise transports on the supported path, plus a strict **in-contract** rejected-transport regression proving fail-closed behavior, zero reference authorization, zero sensitive forwarding, clean child-process survival and no orphaned provider rejection;
2. **hostile out-of-contract evidence:** retain the already-originated unsafe/non-configurable rejected Promise as an explicit unsupported negative limitation. Do not present the in-contract survival test as reproducing or surviving that hostile object.

If the product later claims clean survival after an excluded hostile Promise has already originated, it first requires a separately reviewed process/worker/RPC isolation boundary and a direct hostile-case regression across that isolation boundary.

The selected direction must not install process-global `unhandledRejection`/`uncaughtException` swallowing, execute hostile constructor/species accessors, traverse hostile Proxy constructor/species paths, silently trust attacker-selected species constructors, weaken strict rejection tests, or convert unknown/failure state into authorization/forwarding.

ECMAScript 2026 §27.2.5.4 remains a load-bearing feasibility constraint: ordinary `Promise.prototype.then` performs `SpeciesConstructor` and `NewPromiseCapability` before `PerformPromiseThen`, so a reorder-only repair is not accepted as a universal drain proof for hostile effective constructor/species paths.

Normative reference:

`https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html#sec-promise.prototype.then`

Closing PR #120 does not resolve its findings or make its branch trusted. The next provider-transport lot must be fresh from current trusted main and receive wholly fresh exact-head evidence.

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

These block names mirror the public SwissTokint taxonomy. They are contexts for POM-RX research and integration, not claims that every block is operational.

### Payments and financial operations

Examples include destination/amount controls, trading-agent preflight and execution reconciliation, beneficiary policy and exchange/broker adapter evidence. Existing market-risk work remains supporting research unless a reviewed POM-RX Gate actually enforces the action.

### AI agents

Examples include external tool/API calls, bounded spending/transfer authority, model-generated actions requiring policy decisions and separation of agent intent, authorization and external effect.

### APIs and enterprise systems

Examples include critical configuration changes, privileged API mutations, approval workflows for ERP/infrastructure operations and exact target/action binding before writes reach downstream systems.

### Cybersecurity

Examples include blocking policy-violating high-impact actions before forwarding, detecting declared-intent/requested-effect mismatch, fail-closed handling of unknown critical operations and incident evidence/reconciliation. POM-RX is not an antivirus, malware detector, firewall or universal phishing detector.

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
  -> decoder/effects evidence
  -> local policy
  -> portable POM-RX preflight
  -> Core-verified Witness candidate
  -> single-use exact Gate
  -> controlled fake provider
  -> independent observation
  -> reconciliation
```

Trusted main contains reviewed reference pieces already merged. The next provider Promise/transport prerequisite is **not yet trusted or started as a fresh lot**. Closed PR #120 is attack history and selective source material only.

PR #93 remains `OPEN / STALE / UNTRUSTED / LATER` at exact head `c4e40ceb286f4e59657767661daed15d2b68e9a7`. Exact-head CI `32465835858` / CI 541 is green, but multiple P1/P2 threads remain unresolved and prior reviews do not make the stale branch releasable. Reconstruct/reconcile useful simulation work later from then-current trusted main.

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
| Shared Core | strict profile, exact authorization, process-local Gate, hostile-object capture, Witness lifecycle, durable local claim primitive, execution evidence, observation/reconciliation, exact-main CI observability | current five-file live-state reconciliation; fresh provider-transport prerequisite after that; durable Gate composition remains separate/untrusted; production trust/time, distributed semantics and external effect truth remain missing |
| Exact authorization / Gate | ratified contract plus process-local Gate and separate durable claim primitive | stale PR #97 must not merge; durable claim-before-observer/downstream composition requires later reconstruction |
| Witness | source/Witness primitives, process-local trust lifecycle, Wallet Guard Core-verification adapter | production KMS/HSM, distributed revocation, trusted time/attestation |
| Execution evidence | bounded exact-authorization-bound recorder | actual trusted forwarding/effect composition and external effect truth |
| Observation / reconciliation | bounded reference comparison layer | production observer independence/liveness/finality |
| Wallet Guard | deterministic intent/policy/preflight/Witness-adapter/provider/controlled-host reference path already trusted to merged scope | fresh trusted-provider supported-path binding + in-contract strict rejection survival + explicit hostile out-of-contract limitation or separately reviewed isolation + wholly fresh exact-head CI/owner/independent gates; PR #120 remains closed attack history; PR #93 simulation evidence later; simulation-to-forwarding binding separate |
| Governance DAGR | non-normative placeholder/profile position | authoritative source missing |
| Integrations | Stellar/Filecoin/supporting evidence infrastructure | remain adapters unless a reviewed execution Gate is actually enforced |

## 8. Merge and safety boundary

Standing authorization applies only after the mandatory five-stage pre-merge gate, all applicable technical/security gates, exact-head CI, every required genuinely distinct exact-head independent review and zero unresolved P0/P1/P2 on the same frozen SHA. A moved head invalidates exact-head evidence. The independent-review waiver remains limited to PR #60. Every non-trivial merge requires exact-main CI plus exact-merge post-merge assurance before it becomes a trusted dependency.

The maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: a local, deterministic, synthetic, bounded demonstration. It is not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction or meaningful funds are authorized. Burner local/testnet E2E requires a separate explicit human gate. Public website/Vercel/funding-directory writes are outside this control plane.
