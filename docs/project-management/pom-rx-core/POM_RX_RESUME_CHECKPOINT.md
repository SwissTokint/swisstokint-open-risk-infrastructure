# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-23` — PR #131 pre-import Promise primordial repair cycle.

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

A genuinely distinct `chatgpt-codex-connector` review of moved head `d92417f151...` produced three P1 findings. A later genuinely distinct review of exact head `95591a214e113ea0fc4cdb6884d86e60b3893100` found a fourth P1. All of those reviews are attack evidence only after the branch moves and none is release approval for the final candidate.

- `PRRT_kwDOTiNyWc6bfPvR` — native Promise runtime-owned async-hook symbols were rejected. Repair `364b1d6a741a1d0f587da14407f91644d09c8b18` keeps native Promise brand/direct same-realm prototype/no own string fields while tolerating runtime-owned symbol metadata.
- `PRRT_kwDOTiNyWc6bfPvI` — provider provenance TOCTOU through a bootstrap accessor/Proxy. Repair `62fdd59002e71c35f55e9881af6acb5198e58204` rejects Proxy bootstrap objects, requires own data properties, binds the exact provider descriptor value into an accessor-free frozen snapshot, and never executes the provider accessor.
- `PRRT_kwDOTiNyWc6bfPvO` — an intermediate object above `Array.prototype` could contribute an inherited hostile `then` accessor. Repair `62fdd59002e71c35f55e9881af6acb5198e58204` binds the supported `Array.prototype -> Object.prototype -> null` relationship before controlled transport origin.
- `PRRT_kwDOTiNyWc6bfWeN` — **P1 on exact head `95591a214e...`**: import-time capture of `Promise.resolve`/`Promise.reject` could bless methods poisoned before module import. The reviewer reproduced a poisoned `Promise.resolve` that substituted `0x1 -> 0x2` while still returning a native direct-`Promise.prototype` transport. Runtime repair `b1210dce83207f5e1b03ae1065f079edf4a7daa1` now derives a pristine Promise/reflection baseline from a fresh `node:vm` realm, validates the current realm Promise constructor/method descriptors and builtin sources against that trusted primordial, derives the current intrinsic Promise prototype from an async-function Promise probe, and uses the pristine `Promise.resolve`/`Promise.reject` algorithms with the validated current-realm native Promise constructor for controlled transport creation. The poisoned current method is therefore neither blessed nor executed.

Regression commit `8eb166488283cd1232159bd0453d8d41b309a510` covers bootstrap provider-accessor zero execution, Proxy bootstrap zero traps, intermediate Array-prototype `then` getter zero execution and prior strict/runtime-integrity cases. New regression `bd1674b3b95d18601b534a315fe4755ae49b8ff5`, wired into the provider-gate suite by `6dc74bdd09d930ced0459e5c7c2bca786bf92bda`, executes child processes with `Promise.resolve` and `Promise.reject` poisoned **before dynamic import** and requires `POMRX_WG_TRANSPORT_E_RUNTIME_INTEGRITY`, zero poisoned-method execution and clean strict-mode process exit.

No PR #131 P1 is considered closed merely because code/tests exist. The final candidate must receive fresh canonical CI, a fresh five-stage owner gate, and a genuinely distinct review on the exact same frozen head before any thread is resolved or merge considered.

### Supported security boundary

The accepted claim remains the narrow local **trusted-provider transport contract**:

- module-private provenance admits only the controlled transport into `createWalletGuardTrustedProviderGateway()`;
- the supported route rejects an unowned provider before its request path can originate transport;
- the controlled transport owns same-realm native Promise origin;
- the Promise constructor/prototype/resolve/reject/then/species baseline is checked against a fresh-realm trusted primordial and later descriptor drift is checked again immediately before controlled transport origin;
- controlled Promise fulfillment/rejection uses pristine built-in Promise algorithms with the validated current-realm native Promise constructor, rather than trusting mutable current `Promise.resolve`/`Promise.reject` implementations;
- hostile constructor/species accessors and pre-import Promise method wrappers are not executed by the supported transport path;
- the required Array/Object prototype relationship is bound and rechecked before origin;
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

1. Treat the branch head after the final control-plane update as the only candidate; all CI/reviews on moved heads, including CI 830 and Codex review of `95591a...`, are historical for release.
2. Require fresh canonical exact-head CI success including bootstrap TOCTOU, Array-prototype-chain, pre-import `Promise.resolve`/`Promise.reject` poisoning, native transport shape and strict in-contract rejection regressions. Do not weaken strict rejection or runtime-integrity tests to obtain green.
3. Run the mandatory five-stage release-owner gate on that exact head with concrete provider-bootstrap TOCTOU, pre-import and post-import Promise poisoning, constructor/species/accessor, Proxy/prototype-chain, strict-unhandled, thenable-assimilation, Array poisoning, zero-authorization/forwarding and claim-gap hypotheses.
4. Obtain a fresh genuinely distinct `chatgpt-codex-connector` review on that same exact head. A usage-limit response is transient and is not approval.
5. Resolve `PRRT_kwDOTiNyWc6bfPvI`, `PRRT_kwDOTiNyWc6bfPvO`, `PRRT_kwDOTiNyWc6bfPvR` and `PRRT_kwDOTiNyWc6bfWeN` only after same-head independent validation confirms the repairs and no new P0/P1/P2 remains.
6. Merge only if main/head/CI/review/thread/mergeability state is unchanged at decision time, then immediately run exact-merge-SHA post-merge assurance before dependent work trusts the lot.

## safety_boundary

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction, meaningful funds or uncontrolled malicious-site interaction is authorized. Burner local/testnet E2E remains behind a separate explicit human gate. Public website/Vercel/funding-directory writes are outside this control plane.
