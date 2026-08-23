# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-23` — PR #131 exact-head Codex P1 follow-up cycle.

Purpose: compact durable cross-chat continuation state. Scheduled-task chat history is not project state. Every run reconstructs state from live GitHub plus this canonical control plane. Live GitHub wins whenever PR heads, CI, reviews, review threads, mergeability or merges differ from this file.

## trusted_main

Exact live/trusted `main`: `87ed6ac814f868dc4599cb5d236babdeea8c3cc9`.

Latest trusted merge: PR #130 — bounded non-Tier-B control-plane reconciliation.

- source head: `ce1f2ca2f9358c11e836f1717dcedd9cb5c0caaa`;
- source-head CI: `32635882670` / CI 820 attempt 1 = `success`;
- release-owner five-stage: `5002253211 = PASS_NON_INDEPENDENT / 0 P0 / 0 P1 / 0 P2`;
- genuinely distinct exact-head evidence: `chatgpt-codex-connector[bot]` comment `5385715573`, reviewed `ce1f2ca2f9`, no major issues;
- exact merge/main: `87ed6ac814f868dc4599cb5d236babdeea8c3cc9`;
- exact-main CI: `32638722306` / CI 821 attempt 1 = `success`;
- exact-merge assurance: PR #130 comment `5385948152 = POST_MERGE_ASSURANCE_PASS`;
- terminal checkpoint: PR #130 comment `5385949730`.

PR #130 is trusted coordination evidence only. It did not trust historical PR #120 runtime code or widen production, real-wallet, mainnet or external-effect claims.

## active_pr131

PR #131 — `feat(wallet-guard): add trusted provider transport prerequisite` — is the fresh Tier-B provider prerequisite on branch `automation/wg-trusted-provider-transport-20260823`, created directly from trusted main `87ed6ac...` with one writer. Do not reopen, rebase, revive or wholesale-copy PR #120.

The PR is **OPEN / NOT TRUSTED / REPAIRING INDEPENDENT P1 FINDINGS**. Read live GitHub for the exact current head because this checkpoint itself moves the branch. Any head move invalidates prior exact-head CI/review evidence.

### Current independent findings and repairs

Distinct `chatgpt-codex-connector` reviews produced four earlier P1 findings on moved heads and three new P1 findings on exact head `a6d9cdabbc62469a460e82d5d8adfa4c1252c4e7`. All seven threads remain unresolved until a fresh genuinely distinct review validates the final repaired same head. CI 838 and the release-owner review on `a6d9cd...` became historical immediately when the repair commits moved the branch.

Earlier repaired findings:

- `PRRT_kwDOTiNyWc6bfPvR` — native Promise runtime-owned async-hook symbols were rejected. Repair `364b1d6a741a1d0f587da14407f91644d09c8b18` keeps native Promise brand/direct same-realm prototype/no own string fields while tolerating runtime-owned symbol metadata.
- `PRRT_kwDOTiNyWc6bfPvI` — provider provenance TOCTOU through a bootstrap accessor/Proxy. Repair `62fdd59002e71c35f55e9881af6acb5198e58204` rejects Proxy bootstrap objects, requires own data properties, binds the exact provider descriptor value into an accessor-free frozen snapshot, and never executes the provider accessor.
- `PRRT_kwDOTiNyWc6bfPvO` — an intermediate object above `Array.prototype` could contribute an inherited hostile `then` accessor. Repair `62fdd59002e71c35f55e9881af6acb5198e58204` binds the supported `Array.prototype -> Object.prototype -> null` relationship before controlled transport origin.
- `PRRT_kwDOTiNyWc6bfWeN` — import-time capture of `Promise.resolve`/`Promise.reject` could bless methods poisoned before module import. Repair `b1210dce83207f5e1b03ae1065f079edf4a7daa1` derives a pristine Promise/reflection baseline from a fresh `node:vm` realm and uses pristine Promise algorithms with the validated current-realm native Promise constructor. Regression `bd1674b3b95d18601b534a315fe4755ae49b8ff5`, wired by `6dc74bdd09d930ced0459e5c7c2bca786bf92bda`, poisons both methods before import and requires fail-closed runtime-integrity rejection with zero poisoned-method execution.

Fresh exact-head `a6d9cd...` P1 findings and current repairs:

- `PRRT_kwDOTiNyWc6bfel5` — **P1**: pre-import poisoning of current-realm `Object.getPrototypeOf` could lie about `Array.prototype`, hide a real intermediate prototype carrying an inherited `then` getter, and let pristine Promise assimilation execute that getter. Runtime repair `d103dbc5974521dd2234eacb48ff213b47ad1939` binds and rechecks Array/Object prototype relationships with the fresh-realm trusted `getPrototypeOf` rather than the current mutable reflector; `snapshotTransportValue()` and native Promise prototype admission use that trusted reflector too. Regression commit `5c3a6a5819436782f0405978d959e3d3fa0b9e21` poisons current `Object.getPrototypeOf`, installs an inherited Array `then` getter, and requires fail-closed runtime-integrity rejection with zero getter execution under strict rejection mode.
- `PRRT_kwDOTiNyWc6bfel6` — **P1**: replacing `globalThis.WeakSet` before import with a class whose `has()` always returns true could bless arbitrary unowned providers. Runtime repair `d103dbc5974521dd2234eacb48ff213b47ad1939` constructs and operates the module-private provenance registry with fresh-realm trusted `WeakSet` constructor/add/has primordials. Regression `5c3a6a5819436782f0405978d959e3d3fa0b9e21` replaces the global WeakSet before import and requires `POMRX_WG_TRANSPORT_E_UNTRUSTED_PROVIDER` with zero unowned-provider calls.
- `PRRT_kwDOTiNyWc6bfel7` — **P1**: a proxied global Promise constructor could execute `getOwnPropertyDescriptor` traps before the runtime-integrity rejection. Runtime repair `d103dbc5974521dd2234eacb48ff213b47ad1939` applies the trap-free Node proxy detector to the captured constructor before reading constructor descriptors and short-circuits the unsupported runtime path before any constructor introspection. Regression `5c3a6a5819436782f0405978d959e3d3fa0b9e21` installs a Promise constructor Proxy before import and requires runtime-integrity failure with zero descriptor-trap calls.

No PR #131 P1 is considered closed merely because code/tests exist. The final candidate must receive fresh canonical CI, a fresh five-stage owner gate, and a genuinely distinct review on the exact same frozen head before any thread is resolved or merge considered.

### Supported security boundary

The accepted claim remains the narrow local **trusted-provider transport contract**:

- module-private provenance admits only the controlled transport into `createWalletGuardTrustedProviderGateway()`;
- the provider registry uses fresh-realm WeakSet primordials rather than mutable pre-import `globalThis.WeakSet`;
- the supported route rejects an unowned provider before its request path can originate transport;
- the controlled transport owns same-realm native Promise origin;
- the Promise constructor is Proxy-classified before constructor descriptor inspection, and unsupported proxied constructors fail closed without executing constructor descriptor traps;
- the Promise constructor/prototype/resolve/reject/then/species baseline is checked against a fresh-realm trusted primordial and later descriptor drift is checked again immediately before controlled transport origin;
- controlled Promise fulfillment/rejection uses pristine built-in Promise algorithms with the validated current-realm native Promise constructor, rather than trusting mutable current `Promise.resolve`/`Promise.reject` implementations;
- Array/Object prototype relationships and transport-value/Promise prototype admission use the fresh-realm trusted prototype reflector, so a pre-import replacement of current `Object.getPrototypeOf` cannot hide inherited thenable state;
- hostile constructor/species accessors and pre-import Promise method wrappers are not executed by the supported transport path;
- an in-contract rejected context transport must fail closed with zero reference authorization, zero sensitive forwarding, clean child-process survival under `--unhandled-rejections=strict`, and no orphaned rejection termination.

Decorated/rebased/Proxy/accessor/non-configurable-unsafe-constructor Promise objects from arbitrary providers remain outside this contract. An already-originated excluded rejected Promise remains an explicit unsupported negative unless separately reviewed process/worker/RPC isolation is introduced. The in-contract survival fixture must never be represented as same-process survival proof for that hostile object.

The generic `createWalletGuardReferenceProviderGateway()` remains available and is not upgraded into a hostile-provider-wide Promise-integrity claim. The existing `controlled-host.mjs` path is not rebound by this prerequisite; therefore this PR does not by itself advance broader Wallet Guard operational readiness.

Prohibited shortcuts remain process-global `unhandledRejection`/`uncaughtException` swallowing, execution of hostile constructor/species accessors or Proxy constructor/species traversal, silent trust of attacker-selected species, weakened strict tests, or fail-open authorization/forwarding.

All six closed PR #120 P1/P2 threads remain historical falsification inputs: `PRRT_kwDOTiNyWc6bZjxp`, `PRRT_kwDOTiNyWc6bZ6tx`, `PRRT_kwDOTiNyWc6bZ6tz`, `PRRT_kwDOTiNyWc6baFkR`, `PRRT_kwDOTiNyWc6baIxZ`, `PRRT_kwDOTiNyWc6bc4gh`.

## historical_pr_state

- PR #120: `CLOSED / NOT MERGED / STALE`; final historical head `5238b9c289476100c875ed9a88bd7e21a574fa67`; six findings retained as attack history.
- PR #97: `OPEN / STALE / MUST_NOT_MERGE`; live head `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`; reconstruct durable Gate composition later from then-current trusted main only after the fresh provider prerequisite receives post-merge assurance PASS.
- PR #93: `OPEN / STALE / UNTRUSTED / LATER`; live head `c4e40ceb286f4e59657767661daed15d2b68e9a7`; reconstruct useful simulation work later from then-current trusted main.

## architecture_and_claim_boundary

POM-RX remains the single principal technical product. Shared canonicalization, hashing, verifier, Witness, exact authorization, Gate, execution-evidence and observation/reconciliation semantics remain Core-owned. Wallet Guard remains an application profile. This lot adds an application-owned transport boundary only.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded. It is not production readiness, audit, certification, wallet safety, financial safety or deployment authorization.

## next_safe_actions

1. Treat the branch head after the final control-plane update as the only candidate; CI 838 and every review on `a6d9cd...` or earlier moved heads are historical for release.
2. Require fresh canonical exact-head CI success including all provider-bootstrap TOCTOU, Array-prototype-chain, pre-import `Promise.resolve`/`Promise.reject`, pre-import `Object.getPrototypeOf`, pre-import WeakSet, Promise-constructor Proxy, native transport shape and strict in-contract rejection regressions. Do not weaken strict rejection or runtime-integrity tests to obtain green.
3. Run the mandatory five-stage release-owner gate on that exact head with concrete provider-bootstrap TOCTOU, pre-import and post-import Promise/reflection/provenance poisoning, constructor/species/accessor, Proxy/prototype-chain, strict-unhandled, thenable-assimilation, Array poisoning, zero-authorization/forwarding and claim-gap hypotheses.
4. Obtain a fresh genuinely distinct `chatgpt-codex-connector` review on that same exact head. A usage-limit response is transient and is not approval.
5. Resolve all seven PR #131 P1 threads — `PRRT_kwDOTiNyWc6bfPvI`, `PRRT_kwDOTiNyWc6bfPvO`, `PRRT_kwDOTiNyWc6bfPvR`, `PRRT_kwDOTiNyWc6bfWeN`, `PRRT_kwDOTiNyWc6bfel5`, `PRRT_kwDOTiNyWc6bfel6`, `PRRT_kwDOTiNyWc6bfel7` — only after same-head independent validation confirms the repairs and no new P0/P1/P2 remains.
6. Merge only if main/head/CI/review/thread/mergeability state is unchanged at decision time, then immediately run exact-merge-SHA post-merge assurance before dependent work trusts the lot.

## safety_boundary

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction, meaningful funds or uncontrolled malicious-site interaction is authorized. Burner local/testnet E2E remains behind a separate explicit human gate. Public website/Vercel/funding-directory writes are outside this control plane.
