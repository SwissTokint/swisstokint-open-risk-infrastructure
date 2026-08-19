# Council — POM-RX Wallet Guard MVP

Status: `PROPOSED / TIER_B / HUMAN_REVIEW_REQUIRED`

Date: 2026-08-19

Baseline: `4c073e569feef5f677a2de9b670c1c3276a15dea`

## Objective

Define the smallest honest operational vertical slice that can prevent a risky
wallet request from being forwarded for execution when the request violates a
local policy. The first reproducible scenario is a controlled phishing-clone
fixture that attempts a dangerous approval or signature against a burner wallet.

This council does **not** authorize a mainnet deployment, a funded production
wallet, visiting an uncontrolled malicious site, or any claim that POM-RX
currently protects funds.

## Current repository truth

The repository already contains:

- POM-RX v0.1 receipt-chain validation and deterministic commitments;
- an expected-red integrity baseline for known legacy defects;
- immutable v0.1 compatibility fixtures;
- Proof Receipt signing/batching and a hardened relay boundary;
- a candidate strict-profile internal foundation in draft PR #43;
- a signed preflight Witness prototype in stale draft PR #24;
- CI with pinned external actions and production dependency auditing.

The repository does **not** currently contain an execution-side wallet Gate,
an EIP-1193 request interceptor, transaction/signature intent normalization,
wallet-specific policy rules, deterministic transaction-effects simulation, a
single-use exact authorization capability, or an end-to-end wallet protection
demonstration. Therefore the current code must not be represented as blocking
wallet execution or protecting live funds.

## Product decision proposed

Add an optional `POM-RX Wallet Guard` profile as an execution-side integration
of POM-RX, not as a replacement for POM-RX Core and not as a second protocol.

The profile has one job: before a wallet request reaches the execution boundary,
normalize the exact request, evaluate local policy, bind the decision to one
single-use authorization, and fail closed when a critical prerequisite is
missing or indeterminate.

The profile is initially EVM-only because one narrow wallet/request model is
more reviewable than an immediate multichain implementation. Chain-neutral
receipt semantics remain unchanged.

## Proposed vertical slice

```text
Controlled test dApp / browser origin
        |
        v
Wallet RPC Interceptor
        |
        v
Intent Normalizer + Decoder
        |
        v
Deterministic Effects / Simulation Adapter
        |
        v
Local Policy Evaluation
        |
        +---- DENY / INDETERMINATE ----> stop; do not forward
        |
        v
POM-RX Preflight + Witness
        |
        v
Single-use Exact Authorization Gate
        |
        v
Forward exact request to test wallet
        |
        v
Execution evidence -> independent observation -> reconciliation
```

## Requests in the initial EVM scope

The MVP must explicitly classify at least:

- `eth_sendTransaction`;
- ERC-20 `approve` including unlimited allowance;
- ERC-20 `transfer`;
- ERC-721/ERC-1155 `setApprovalForAll`;
- EIP-2612 Permit-like typed-data signatures;
- Permit2-style typed-data signatures;
- generic `eth_signTypedData_v4` with unknown domain or structure;
- generic transaction calldata that cannot be decoded safely.

Unknown or malformed high-impact requests are not silently allowed.

## Policy signals

The first policy version should support deterministic rules for:

- expected chain ID;
- approved origin/domain allowlist for a controlled test;
- approved recipient/spender contract allowlist;
- maximum native/token value for the burner-wallet test;
- deny unlimited allowance unless explicitly permitted;
- deny `setApprovalForAll` unless explicitly permitted;
- deny unknown Permit/Permit2 spender/domain;
- require successful simulation/effect derivation for configured dangerous
  request classes;
- deny material mismatch between declared user intent and simulated effects;
- kill switch.

Origin reputation or visual similarity may be used as an auxiliary signal, but
must never be the sole security boundary.

## Single-use exact authorization

An allow decision is not sufficient by itself. A Gate capability must be bound
to the exact normalized request and at minimum include commitments to:

- wallet/account;
- chain ID;
- browser origin;
- method;
- target/recipient/spender;
- value;
- calldata or typed-data commitment;
- POM-RX preflight receipt hash;
- policy identity/version/hash;
- expiry;
- nonce/capability ID.

Consumption must be atomic and single-use. A modified request, replay, expired
capability, different origin, different chain or different account must fail
closed.

## Test boundary

The first end-to-end demonstration must use a controlled local phishing-clone
fixture plus a burner wallet on a local EVM dev chain or public testnet. It must
not require a wallet containing meaningful funds.

The red test must attempt at least one dangerous approval/signature that would
transfer authority to an untrusted spender. Acceptance requires proof that the
request is stopped before the forwarding boundary and that no transaction or
signature is produced by the test wallet.

A green control must show that an explicitly allowed request is forwarded once,
then independently observed and reconciled against the exact preflight action.

## Prime / SpecKit execution model

The existing Prime Level 3 control plane remains authoritative. Do not create a
second project-management system. Work is split into bounded lots with one
writer per file and independent read-only reviewers.

### Wave 0 — SpecKit / architecture

1. `PRIME-SPEC`: freeze request model, trust boundaries, acceptance tests and
   non-goals.
2. `ARCHITECTURE`: independently review browser/wallet boundary, capability
   consumption and simpler alternatives.
3. `SECURITY`: independently model drainer-style approvals/signatures, replay,
   substitution, simulation failure and bypass paths.

### Wave 1 — core implementation

1. `SENIOR-EVM-WALLET`: interceptor, request normalization and decoders.
2. `SENIOR-POLICY-GATE`: deterministic policy evaluator and single-use Gate.
3. `QA-CONFORMANCE`: adversarial fixture corpus and false-PASS tests.

### Wave 2 — evidence and runtime

1. `SENIOR-SIMULATION-RPC`: deterministic test-chain simulation/effect diff.
2. `CRYPTO-WITNESS`: source enrollment, revocation, clock and exact witness
   binding, mining PR #24 only as reviewed source material.
3. `RELEASE-JUDGE`: end-to-end acceptance on exact head, including denial proof,
   one-time allow proof, observation and reconciliation.

## Security review requirements

Before a real-wallet test is considered:

- strict-profile legacy gaps required by the Wallet Guard path must be closed or
  explicitly made unreachable by a reviewed stronger profile;
- no production path may use the always-non-authorizing PR #43 foundation as an
  authorization claim;
- source/witness enrollment and revocation must be explicit;
- single-use capability consumption must be durable enough for the test scope;
- no wallet seed/private key is accepted by the POM-RX service or committed to
  the repository;
- test secrets and burner-wallet material stay outside source control;
- dangerous-request simulation failure is fail-closed;
- bypass tests cover direct provider access, request mutation after preflight,
  replay, origin/chain/account substitution and unknown calldata/signature
  structures.

## Acceptance levels

### `WALLET_GUARD_SIMULATED_READY`

All blocking logic is proven with deterministic request fixtures and no wallet.

### `WALLET_GUARD_BURNER_E2E_READY`

A controlled local/testnet dApp plus burner wallet proves one denied malicious
request never crosses the forwarding boundary and one allowed request executes
once and reconciles.

### Not authorized by this council

- production readiness;
- protection guarantee;
- audit/certification claim;
- mainnet funded-wallet use;
- uncontrolled malicious-site browsing;
- custody or recovery service.

## Human gates

Human approval is required before:

1. merging this Tier-B architecture decision;
2. merging any Gate/Witness/authorization behavior;
3. connecting a real wallet;
4. performing a testnet transaction/signature with a generated burner account;
5. any mainnet or materially funded wallet test.

The immediate implementation goal after approval is
`WALLET_GUARD_SIMULATED_READY`, then `WALLET_GUARD_BURNER_E2E_READY`.
