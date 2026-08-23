# POM-RX Core — Active Blockers

Updated: `2026-08-23` — PR #131 independent-review repair cycle.

Current trusted main: `87ed6ac814f868dc4599cb5d236babdeea8c3cc9`.

This file lists current blockers only. Historical detail remains in Git history and review threads. Live GitHub wins whenever a PR head, CI run, review, thread, mergeability signal or merge changes after this checkpoint.

## Trusted coordination state

PR #130 source head `ce1f2ca2f9358c11e836f1717dcedd9cb5c0caaa` merged as exact main SHA `87ed6ac814f868dc4599cb5d236babdeea8c3cc9`.

- source-head CI: `32635882670` / CI 820 attempt 1 = `success`;
- release-owner five-stage: `5002253211 = PASS_NON_INDEPENDENT / 0 P0 / 0 P1 / 0 P2`;
- genuinely distinct exact-head evidence: `5385715573`, reviewed `ce1f2ca2f9`, no major issues;
- exact-main push CI: `32638722306` / CI 821 attempt 1 = `success`;
- exact-merge assurance: `5385948152 = POST_MERGE_ASSURANCE_PASS`;
- terminal checkpoint: `5385949730`.

## `PR131_FRESH_PROVIDER_TRANSPORT_P1_REPAIRS_PENDING_EXACT_HEAD_VALIDATION`

PR #131 is the active fresh Tier-B Wallet Guard/provider prerequisite on `automation/wg-trusted-provider-transport-20260823`, created directly from trusted main `87ed6ac...`. It remains **OPEN / NOT TRUSTED**. Read live GitHub for its exact head because control-plane commits continue to move the branch until the candidate is frozen.

A genuinely distinct Codex review of moved head `d92417f151...` found three P1s. None is release evidence for a later head, and none may be considered closed until a fresh same-head independent review validates the final repair candidate.

### `PRRT_kwDOTiNyWc6bfPvR` — P1 — outdated / repair awaiting same-head validation

The first implementation rejected otherwise native same-realm Promises when Node's test/async-hook runtime attached internal symbol metadata. Commit `364b1d6a741a1d0f587da14407f91644d09c8b18` keeps the native Promise brand, direct `Promise.prototype` and no-own-string-property requirements while tolerating runtime-owned symbols. The historical thread is outdated but unresolved.

### `PRRT_kwDOTiNyWc6bfPvI` — P1 — repaired in code/tests, independent validation pending

The trusted gateway previously read `options.provider` to validate provenance and then forwarded the original bootstrap object to the generic gateway, which read `provider` again. A bootstrap accessor could therefore return the owned provider first and an arbitrary provider second.

Repair `62fdd59002e71c35f55e9881af6acb5198e58204` now:

- rejects Proxy bootstrap objects before traps execute;
- obtains the provider through its own property descriptor without accessor execution;
- requires the bootstrap fields to be own enumerable data properties;
- checks module-private provenance on that exact provider value;
- forwards an accessor-free frozen snapshot containing the exact validated provider.

Regression `8eb166488283cd1232159bd0453d8d41b309a510` requires zero provider-getter execution, zero unowned-provider request execution, zero Proxy bootstrap traps and zero context/sensitive forwarding on rejection.

### `PRRT_kwDOTiNyWc6bfPvO` — P1 — repaired in code/tests, independent validation pending

The previous runtime checks inspected direct `then` properties on `Array.prototype` and `Object.prototype`, but an attacker could insert an intermediate prototype object with an inherited hostile `then` accessor. `Promise.resolve(accounts)` could then assimilate through it.

Repair `62fdd59002e71c35f55e9881af6acb5198e58204` binds the supported prototype relationship `Array.prototype -> Object.prototype -> null` at module initialization and fails closed on parent-chain drift before transport origin. Regression `8eb166488283cd1232159bd0453d8d41b309a510` inserts an intermediate hostile `then` accessor and requires `POMRX_WG_TRANSPORT_E_RUNTIME_INTEGRITY`, zero getter execution and zero context reads.

### Required closure for PR #131

The final exact head must pass all of:

1. canonical exact-head CI including the repaired P1 regressions and strict in-contract rejection child process;
2. mandatory five-stage owner gate with concrete provider-bootstrap TOCTOU, Promise constructor/species/accessor, Proxy/prototype-chain, strict-unhandled, thenable-assimilation, Array poisoning, zero-authorization/forwarding and claim-gap falsification;
3. a fresh genuinely distinct `chatgpt-codex-connector` review on that same exact SHA;
4. zero unresolved P0/P1/P2, including same-head validation before the three PR #131 review threads are resolved;
5. unchanged decision-time main/head/CI/reviews/threads/mergeability;
6. exact-merge post-merge assurance PASS after merge before dependent work trusts it.

A prior CI success or a review on any moved head is historical only. A Codex usage-limit response is transient and is not approval.

## `FRESH_PROVIDER_TRANSPORT_CLAIM_BOUNDARY`

The supported claim remains an explicit narrow **trusted-provider transport contract**. The controlled provider owns supported native Promise origin and the strict gateway accepts only module-provenanced transports. Inside this contract, an in-contract rejected transport must fail closed with zero reference authorization, zero sensitive forwarding, clean child-process survival under `--unhandled-rejections=strict`, and no orphaned rejection termination.

Decorated/rebased/Proxy/accessor/non-configurable-unsafe-constructor Promise objects from arbitrary providers remain excluded. An already-originated excluded rejected Promise is an explicit unsupported negative unless separately reviewed process/worker/RPC isolation is introduced. The in-contract fixture is not same-process survival proof for that hostile object.

The generic `createWalletGuardReferenceProviderGateway()` remains available and is not upgraded into a hostile-provider-wide Promise-integrity claim. The existing `controlled-host.mjs` path is not rebound by this prerequisite; broader Wallet Guard operational readiness therefore does not advance merely because PR #131 passes.

Prohibited shortcuts remain process-global `unhandledRejection`/`uncaughtException` swallowing, execution of hostile constructor/species accessors or Proxy constructor/species traversal, silent trust of attacker-selected species, weakened strict tests, or fail-open authorization/forwarding.

## `PR120_CLOSED_NOT_MERGED_ATTACK_HISTORY`

PR #120 remains `CLOSED / NOT MERGED / STALE` at historical head `5238b9c289476100c875ed9a88bd7e21a574fa67`. Do not reopen, rebase, revive or wholesale-merge it. Its six P1/P2 review threads remain mandatory attack history: `PRRT_kwDOTiNyWc6bZjxp`, `PRRT_kwDOTiNyWc6bZ6tx`, `PRRT_kwDOTiNyWc6bZ6tz`, `PRRT_kwDOTiNyWc6baFkR`, `PRRT_kwDOTiNyWc6baIxZ`, `PRRT_kwDOTiNyWc6bc4gh`.

## `PR97_STALE_HISTORICAL_BRANCH_MUST_NOT_MERGE`

PR #97 remains `OPEN / STALE / MUST_NOT_MERGE` at `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`. Historical green CI/reviews cannot clear its stale branch or unresolved findings. Durable Gate composition is reconstructed later from then-current trusted main only after the fresh provider prerequisite receives exact-merge `POST_MERGE_ASSURANCE_PASS`.

## `CORE_DURABLE_GATE_COMPOSITION_NOT_YET_TRUSTED`

Trusted main contains a process-local single-use Gate and a separate filesystem durable claim primitive. Reviewed durable claim-before-observer/downstream composition is not trusted.

## `PR93_RECONCILIATION_AND_FRESH_REVIEW_REQUIRED_LATER`

PR #93 remains `OPEN / STALE / UNTRUSTED / LATER` at `c4e40ceb286f4e59657767661daed15d2b68e9a7`. Reconstruct useful simulation work later from then-current trusted main rather than merging stale history wholesale.

## `DAGR_SOURCE_DOCUMENT_MISSING`

Normative DAGR/profile work remains source-gated. Do not invent normative text, controls, scores or claims without authorized source material.

## `PRODUCTION_TRUST_UNPROVED`

Production issuer/operator authorization, trusted time, KMS/HSM custody, distributed revocation/consensus, crash recovery, external observer independence, external execution/effect truth and arbitrary browser/provider integrity remain unproved.

## `REAL_WALLET_NOT_AUTHORIZED`

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction or meaningful funds are authorized. Burner local/testnet E2E remains behind a separate explicit human authorization gate.

## Current dependency and merge rule

A dependency becomes trusted only after the mandatory five-stage pre-merge gate, all applicable exact-head technical/security gates, canonical exact-head CI, every required genuinely distinct exact-head independent review, zero unresolved P0/P1/P2, merge, exact-main CI and exact-merge `POST_MERGE_ASSURANCE_PASS`. A moved head invalidates exact-head evidence. The independent-review waiver remains limited to PR #60.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded — not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.
