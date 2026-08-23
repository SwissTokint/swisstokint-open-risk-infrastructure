# POM-RX capability map

Status: `CURRENT_INFORMATION_ARCHITECTURE / NON_NORMATIVE`

Date: 2026-08-23

Trusted-main checkpoint: `87ed6ac814f868dc4599cb5d236babdeea8c3cc9`.

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

Historical PR #97 remains `OPEN / STALE / MUST_NOT_MERGE` at exact head `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`. Durable composition is reconstructed later from then-current trusted main only after the fresh Wallet Guard provider-transport prerequisite becomes trusted. Historical branch CI/review evidence is not current release evidence.

### Trusted coordination checkpoint

PR #130 source head `ce1f2ca2f9358c11e836f1717dcedd9cb5c0caaa` merged as exact main `87ed6ac814f868dc4599cb5d236babdeea8c3cc9`.

- source-head CI `32635882670` / CI 820 attempt 1 passed;
- release-owner five-stage review `5002253211` was `PASS_NON_INDEPENDENT / 0 P0 / 0 P1 / 0 P2`;
- genuinely distinct exact-head evidence is `chatgpt-codex-connector[bot]` comment `5385715573`, reviewed `ce1f2ca2f9`, no major issues;
- exact-main push CI `32638722306` / CI 821 attempt 1 passed;
- exact-merge assurance is PR #130 comment `5385948152 = POST_MERGE_ASSURANCE_PASS`;
- terminal trusted reconciliation checkpoint is PR #130 comment `5385949730`.

PR #130 changed only canonical coordination/product-position documents. It is trusted coordination evidence, not runtime or production-security evidence.

### Active fresh provider-transport prerequisite

PR #131 on branch `automation/wg-trusted-provider-transport-20260823` starts directly from trusted main `87ed6ac...` and is the current Tier-B single-writer lane. Closed PR #120 is not reopened, rebased or copied wholesale.

The accepted direction is an explicit narrow **trusted-provider transport contract** for the local prototype. The fresh branch introduces an application-owned controlled provider transport plus `createWalletGuardTrustedProviderGateway()`.

The supported path uses module-private provider provenance so an arbitrary/unowned provider is rejected before its `request()` path can originate transport. Provider provenance is anchored to fresh-realm trusted WeakSet primordials rather than mutable pre-import `globalThis.WeakSet`. The controlled transport owns native Promise creation. A proxied global Promise constructor is classified before constructor descriptor introspection, and supported Promise state is checked against fresh-realm trusted primordials before origin. Array/Object prototype relationships and transport-value/Promise prototype admission use the fresh-realm trusted prototype reflector, not mutable current `Object.getPrototypeOf`. A same-realm native Promise may carry runtime-owned async-hook symbol metadata; the boundary still requires native Promise brand, direct intrinsic Promise prototype and no caller-controlled own string properties.

Independent review has produced seven P1 attack inputs so far. The first three came from moved head `d92417f151...`, the fourth from exact head `95591a214e113ea0fc4cdb6884d86e60b3893100`, and the latest three from exact head `a6d9cdabbc62469a460e82d5d8adfa4c1252c4e7`. None is release evidence for a later moved head:

- `PRRT_kwDOTiNyWc6bfPvR`: native Node async-hook Promise symbols were incorrectly rejected. Commit `364b1d6a741a1d0f587da14407f91644d09c8b18` repairs that false rejection while retaining native-brand/direct-prototype/no-own-string requirements.
- `PRRT_kwDOTiNyWc6bfPvI`: provider provenance could be checked on one bootstrap provider value and bypassed when the original object was re-read. Commit `62fdd59002e71c35f55e9881af6acb5198e58204` rejects Proxy bootstrap objects, requires own data properties, binds provenance to the exact descriptor value and forwards an accessor-free frozen snapshot. Regression `8eb166488283cd1232159bd0453d8d41b309a510` requires zero provider-accessor execution, zero Proxy traps and zero unowned forwarding.
- `PRRT_kwDOTiNyWc6bfPvO`: an intermediate object between `Array.prototype` and `Object.prototype` could contribute an inherited `then` accessor. Commit `62fdd59002e71c35f55e9881af6acb5198e58204` binds the supported `Array.prototype -> Object.prototype -> null` relationship; regression `8eb166488283cd1232159bd0453d8d41b309a510` requires fail-closed behavior with zero getter execution.
- `PRRT_kwDOTiNyWc6bfWeN`: import-time capture could bless `Promise.resolve`/`Promise.reject` poisoned before module import. The independent reviewer reproduced a `Promise.resolve` wrapper that substituted `0x1 -> 0x2` while returning an otherwise supported native Promise. Repair `b1210dce83207f5e1b03ae1065f079edf4a7daa1` introduces a fresh `node:vm` realm trusted primordial for Promise/reflection evidence, validates current-realm Promise builtin sources/descriptors and the intrinsic Promise prototype derived from an async-function Promise, and creates controlled fulfillment/rejection with pristine Promise algorithms plus the validated current-realm native constructor. Regression `bd1674b3b95d18601b534a315fe4755ae49b8ff5`, wired by `6dc74bdd09d930ced0459e5c7c2bca786bf92bda`, poisons both methods before dynamic import and requires runtime-integrity rejection with zero poisoned-method execution.
- `PRRT_kwDOTiNyWc6bfel5`: current `Object.getPrototypeOf` could be replaced before import so the Array prototype-chain check accepted an attacker-hidden intermediate prototype with inherited `then`. Repair `d103dbc5974521dd2234eacb48ff213b47ad1939` uses the fresh-realm trusted prototype reflector for baseline/runtime chain checks and transport/Promise prototype admission. Regression `5c3a6a5819436782f0405978d959e3d3fa0b9e21` requires fail-closed runtime-integrity rejection with zero inherited getter execution.
- `PRRT_kwDOTiNyWc6bfel6`: a poisoned pre-import global WeakSet whose `has()` always returns true could bless arbitrary unowned providers. Repair `d103dbc5974521dd2234eacb48ff213b47ad1939` uses fresh-realm trusted WeakSet constructor/add/has primordials for the private provenance registry. Regression `5c3a6a5819436782f0405978d959e3d3fa0b9e21` requires `POMRX_WG_TRANSPORT_E_UNTRUSTED_PROVIDER` and zero unowned-provider calls.
- `PRRT_kwDOTiNyWc6bfel7`: a proxied global Promise constructor could execute descriptor traps during module initialization before the later integrity rejection. Repair `d103dbc5974521dd2234eacb48ff213b47ad1939` proxy-classifies the constructor first and conditionally avoids all constructor descriptor inspection. Regression `5c3a6a5819436782f0405978d959e3d3fa0b9e21` requires runtime-integrity rejection with zero constructor descriptor-trap calls.

All seven threads remain unresolved until a fresh genuinely distinct review validates the same final exact head that has green canonical CI. Earlier reviews are attack evidence only. CI 838 and the owner/Codex reviews on `a6d9cd...` became historical when the repair head moved.

Inside this supported contract, rejection handling must prove fail-closed behavior, zero reference authorization, zero sensitive forwarding, clean child-process survival under `--unhandled-rejections=strict`, and no orphaned provider-rejection termination.

Decorated/rebased/Proxy/accessor/non-configurable-unsafe-constructor Promise objects from arbitrary providers remain excluded. An already-originated excluded rejected Promise remains an explicit unsupported negative limitation. The in-contract survival regression must not be represented as proof that the hostile object can be drained safely in the same process. If that future property is desired, it requires separately reviewed process/worker/RPC isolation and a direct hostile-case regression across the isolation boundary.

The fresh-realm primordial mechanism is a bounded local Node prototype control. It is not a browser-wide hostile-runtime attestation claim. The generic historical `createWalletGuardReferenceProviderGateway()` remains available and is not upgraded by this lot into a hostile-provider-wide Promise-integrity claim. The fresh supported claim is limited to the controlled transport + trusted gateway path. The existing `controlled-host.mjs` path is not rebound by this prerequisite; therefore no broader Wallet Guard operational-readiness claim changes in PR #131.

The selected direction must not install process-global `unhandledRejection`/`uncaughtException` swallowing, execute hostile constructor/species accessors, traverse hostile Proxy constructor/species paths, silently trust attacker-selected species constructors, bless mutable pre-import Promise/reflection/provenance wrappers as trusted primordials, weaken strict rejection tests, or convert unknown/failure into authorization/forwarding.

Six PR #120 review threads remain mandatory attack history: `PRRT_kwDOTiNyWc6bZjxp`, `PRRT_kwDOTiNyWc6bZ6tx`, `PRRT_kwDOTiNyWc6bZ6tz`, `PRRT_kwDOTiNyWc6baFkR`, `PRRT_kwDOTiNyWc6baIxZ`, and final P1 `PRRT_kwDOTiNyWc6bc4gh`.

ECMAScript 2026 §27.2.5.4 remains a load-bearing feasibility constraint: ordinary `Promise.prototype.then` performs `SpeciesConstructor` and `NewPromiseCapability` before `PerformPromiseThen`, so a reorder-only repair is not accepted as a universal drain proof for hostile effective constructor/species paths.

Normative reference:

`https://tc39.es/ecma262/2026/multipage/control-abstraction-objects.html#sec-promise.prototype.then`

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

The fresh provider transport prerequisite is **in progress, not yet trusted**. PR #131 currently has seven independent P1 attack inputs with repairs awaiting wholly fresh final exact-head CI, five-stage owner review and genuinely distinct exact-head validation. No moved-head CI or review counts as release evidence, and no P1 thread is closed solely because code/tests were added.

PR #93 remains `OPEN / STALE / UNTRUSTED / LATER` at exact head `c4e40ceb286f4e59657767661daed15d2b68e9a7`. Reconstruct useful simulation work later rather than merging stale history wholesale.

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
| Shared Core | strict profile, exact authorization, process-local Gate, hostile-object capture, Witness lifecycle, durable local claim primitive, execution evidence, observation/reconciliation | fresh provider prerequisite active; durable Gate composition remains later/untrusted; production trust/time, distributed semantics and external effect truth remain missing |
| Exact authorization / Gate | ratified contract plus process-local Gate and separate durable claim primitive | stale PR #97 must not merge; durable composition requires later reconstruction |
| Witness | source/Witness primitives, process-local trust lifecycle | production KMS/HSM, distributed revocation, trusted time/attestation |
| Execution evidence | bounded exact-authorization-bound recorder | actual trusted forwarding/effect composition and external effect truth |
| Observation / reconciliation | bounded reference comparison layer | production observer independence/liveness/finality |
| Wallet Guard | deterministic intent/policy/preflight/Witness-adapter/provider/controlled-host reference pieces already trusted to merged scope | PR #131 fresh strict trusted-provider transport is active but not yet trusted; seven independent P1 attack inputs are repaired but await fresh same-head CI/review validation; controlled-host is not rebound by this prerequisite; PR #120 is attack history; PR #93 simulation work later |
| Governance DAGR | non-normative placeholder/profile position | authoritative source missing |
| Integrations | Stellar/Filecoin/supporting evidence infrastructure | remain adapters unless a reviewed execution Gate is actually enforced |

## 8. Merge and safety boundary

Standing authorization applies only after the mandatory five-stage pre-merge gate, all applicable technical/security gates, exact-head CI, every required genuinely distinct exact-head independent review and zero unresolved P0/P1/P2 on the same frozen SHA. A moved head invalidates exact-head evidence. The independent-review waiver remains limited to PR #60. Every non-trivial merge requires exact-main CI plus exact-merge post-merge assurance before it becomes a trusted dependency.

The maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: a local, deterministic, synthetic, bounded demonstration. It is not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction or meaningful funds are authorized. Burner local/testnet E2E requires a separate explicit human gate. Public website/Vercel/funding-directory writes are outside this control plane.
