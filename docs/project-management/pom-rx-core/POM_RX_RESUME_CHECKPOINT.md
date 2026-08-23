# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-23` — PR #131 independent-review repair cycle.

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

The genuinely distinct `chatgpt-codex-connector` review of moved head `d92417f151...` produced three P1 findings. That review is attack evidence, not release approval for any later head.

- `PRRT_kwDOTiNyWc6bfPvR` — runtime-owned native Promise async-hook symbols were rejected by the first implementation. Repair landed before this checkpoint in `364b1d6a741a1d0f587da14407f91644d09c8b18`: same-realm native Promise brand/direct prototype/no own string fields remain required while runtime-owned symbols are tolerated. The thread is outdated but remains unresolved until fresh same-head independent validation.
- `PRRT_kwDOTiNyWc6bfPvI` — provider provenance TOCTOU: a bootstrap accessor/Proxy could pass one provider on validation and expose another when the generic gateway re-read `options.provider`. Runtime repair `62fdd59002e71c35f55e9881af6acb5198e58204` rejects Proxy bootstrap objects, requires own data properties, binds the exact validated provider into an accessor-free frozen snapshot, and never executes a provider bootstrap accessor.
- `PRRT_kwDOTiNyWc6bfPvO` — an intermediate object inserted above `Array.prototype` could contribute an inherited hostile `then` getter while the previous own-property checks still passed. Runtime repair `62fdd59002e71c35f55e9881af6acb5198e58204` binds the supported Array/Object prototype chain and fails closed on parent-chain drift before controlled transport origin.

Regression commit `8eb166488283cd1232159bd0453d8d41b309a510` adds CI-wired tests for provider-accessor zero execution, Proxy bootstrap zero traps, exact-provider binding, and intermediate Array-prototype `then` accessor zero execution, while preserving the strict in-contract rejected-transport child-process test.

The same runtime repair also removes obvious ambient Array-method dependence from this new boundary where practical: expected-key validation uses indexed access rather than Array iteration, array-length validation no longer calls live `Array.prototype.includes`, and the internal sensitive-call append uses a captured `Array.prototype.push` intrinsic.

No P1 above is considered closed merely because code/tests exist. The final candidate must receive fresh canonical CI, a fresh five-stage owner gate, and a genuinely distinct review on the exact same frozen head before any thread is resolved or merge considered.

### Supported security boundary

The accepted claim remains the narrow local **trusted-provider transport contract**:

- module-private provenance admits only the controlled transport into `createWalletGuardTrustedProviderGateway()`;
- the supported route rejects an unowned provider before its request path can originate transport;
- the controlled transport owns same-realm native Promise origin;
- supported Promise constructor/prototype/resolve/reject/then/species descriptors and the required Array/Object prototype relationship are checked before origin;
- hostile constructor/species accessors are inspected by descriptor and are not executed;
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

1. Treat the branch head after the final control-plane update as the only candidate; all CI/reviews on moved heads are historical.
2. Require canonical exact-head CI success including the new provider-provenance and full Array-prototype-chain regressions. Do not weaken strict rejection or runtime-integrity tests to obtain green.
3. Run the mandatory five-stage release-owner gate on the exact head with concrete provider-bootstrap TOCTOU, Promise constructor/species/accessor, Proxy/prototype-chain, strict-unhandled, thenable-assimilation, Array poisoning, zero-authorization/forwarding and claim-gap hypotheses.
4. Obtain a fresh genuinely distinct `chatgpt-codex-connector` review on that same exact head. A usage-limit response is transient and is not approval.
5. Resolve `PRRT_kwDOTiNyWc6bfPvI`, `PRRT_kwDOTiNyWc6bfPvO` and the outdated `PRRT_kwDOTiNyWc6bfPvR` only after same-head independent validation confirms the repairs and no new P0/P1/P2 remains.
6. Merge only if main/head/CI/review/thread/mergeability state is unchanged at decision time, then immediately run exact-merge-SHA post-merge assurance before dependent work trusts the lot.

## safety_boundary

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction, meaningful funds or uncontrolled malicious-site interaction is authorized. Burner local/testnet E2E remains behind a separate explicit human gate. Public website/Vercel/funding-directory writes are outside this control plane.
