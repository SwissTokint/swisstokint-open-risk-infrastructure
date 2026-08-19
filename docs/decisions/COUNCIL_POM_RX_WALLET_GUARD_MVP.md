# Council — POM-RX Wallet Guard MVP

Status: `PROPOSED / TIER_B / HUMAN_REVIEW_REQUIRED`

Date: 2026-08-19

Baseline: `e0479398268d0d0021fa2ddd5bd082d819bd0205`

## Objective

Define the smallest operational vertical slice that can prevent a risky wallet
request from reaching a guarded wallet provider when local policy denies the
exact request.

The first reproducible scenario is a controlled phishing-clone fixture that
attempts a dangerous approval or signature against a burner wallet.

This council does not authorize mainnet, a funded production wallet, an
uncontrolled malicious site, or any claim that POM-RX already protects funds.

## Current repository truth

The repository currently has:

- POM-RX v0.1 structural receipt-chain validation;
- expected-red coverage for known legacy defects;
- immutable v0.1 compatibility fixtures;
- Proof Receipt signing/batching and hardened relay boundaries;
- a merged internal strict-profile foundation that is intentionally
  non-authorizing;
- historical signed-Witness source material in stale PR #24;
- pinned GitHub Actions and production dependency auditing.

It still does not have a wallet request interceptor, execution-side Gate,
wallet-intent policy engine, deterministic effects adapter, single-use exact
authorization or an end-to-end wallet protection demonstration.

## Product decision

Add an optional `POM-RX Wallet Guard` execution-side profile. It remains part of
POM-RX and does not create a second protocol.

The Wallet Guard must:

1. capture the request at a trusted provider boundary;
2. derive trusted origin, chain and account context;
3. normalize and decode the exact request;
4. derive/simulate bounded effects where required;
5. evaluate deterministic local policy;
6. create POM-RX preflight evidence and obtain a signed witness acknowledgement;
7. create one exact short-lived single-use capability;
8. let only the Gate consume that capability and forward the exact request;
9. independently observe and reconcile an allowed execution.

Any critical missing/unknown prerequisite is non-forwarding.

## Initial EVM scope

The first profile must explicitly classify:

- `eth_sendTransaction`;
- ERC-20 `approve` and unlimited approvals;
- ERC-20 `transfer`;
- ERC-721/ERC-1155 `setApprovalForAll`;
- EIP-2612 Permit-like typed data;
- Permit2-style typed data;
- generic `eth_signTypedData_v4`;
- generic calldata that cannot be decoded safely.

Unknown or malformed high-impact requests are never silently allowed.

## Trusted-context rules

- Browser origin comes from the trusted interception context, never a request
  field supplied by the dApp.
- Chain ID and active account are sampled from the guarded provider and rechecked
  at Gate consumption.
- The controlled fixture must not have direct access to a second provider path.
- Simulation is evidence only; it cannot upgrade a denied/unknown request to
  `ALLOW`.

## Initial policy controls

- expected chain ID;
- trusted origin allowlist for the controlled test;
- recipient/spender allowlists;
- native/token value limits for the burner test;
- deny unlimited allowance unless explicitly permitted;
- deny `setApprovalForAll` unless explicitly permitted;
- deny unknown Permit/Permit2 spender/domain;
- require successful effect derivation for configured dangerous request classes;
- deny material intent/effect mismatch;
- kill switch.

Domain reputation or visual similarity may be auxiliary signals, but are never
the sole security boundary.

## Single-use exact authorization

The capability must bind at minimum:

- wallet/account;
- chain ID;
- trusted browser origin;
- RPC method and request class;
- target/recipient/spender;
- value;
- calldata or typed-data commitment;
- preflight receipt hash;
- policy identity/version/hash;
- expiry;
- unique capability ID/nonce.

Mutation, replay, expiry, provider chain/account change or origin substitution
fails closed. Consumption is atomic and single-use for the test runtime.

## Test boundary

The first end-to-end demonstration uses a controlled fixture and a burner wallet
on a local EVM dev chain or public testnet with no meaningful funds.

A red test must prove that a dangerous approval/signature is stopped before the
provider forwarding boundary and produces no transaction/signature.

A green control must prove one explicitly permitted request is forwarded once,
then independently observed and reconciled.

## Draft reconciliation decisions

The open historical drafts are handled as follows:

- PR #43: strict-profile internal foundation was reviewed twice and merged into
  `main` before this council refresh.
- PR #24: conflict/stale; salvage only signed source-envelope and witness-ack
  cryptographic primitives into a fresh current-main PR. Do not carry forward
  its HTTP service/deployment wholesale.
- PR #20 Aptos registry: technically interesting but unrelated to the Wallet
  Guard blocking path; retain branch/history and defer rather than merge stale
  grant/CI material.
- PR #17 Tezos registry: technically interesting but unrelated to the Wallet
  Guard blocking path; retain branch/history and defer rather than merge stale
  workflow/container pins.
- original Wallet Guard PR #44: superseded by this fresh current-main version
  because #43 changed main and the architecture review added trusted-origin and
  provider-state constraints.

## Prime / SpecKit execution waves

### Wave 0 — architecture and salvage

1. merge this refreshed architecture after double review and green CI;
2. salvage the bounded Witness cryptographic primitives from PR #24;
3. keep unrelated multichain drafts preserved but outside the Wallet Guard
   critical path.

### Wave 1 — simulated Wallet Guard

1. `SENIOR-EVM-WALLET`: trusted request capture, intent normalization, decoders;
2. `SENIOR-POLICY-GATE`: deterministic policy and single-use Gate;
3. `QA-CONFORMANCE`: adversarial fixtures and false-PASS tests;
4. `SENIOR-SIMULATION-RPC`: deterministic effects adapter for the controlled
   local chain.

### Wave 2 — evidence and burner E2E

1. `CRYPTO-WITNESS`: enrollment/revocation/trusted-clock/persistence profile;
2. `SENIOR-EVM-WALLET`: controlled burner forwarding harness;
3. `RELEASE-JUDGE`: denied-request no-forward proof, one-time allow proof,
   independent observation and reconciliation.

## Acceptance levels

`WALLET_GUARD_SIMULATED_READY` means deterministic blocking behavior is proven
with fixtures and no wallet.

`WALLET_GUARD_BURNER_E2E_READY` means a controlled local/testnet burner test
proves one malicious request cannot cross the forwarding boundary while one
allowed request executes once and reconciles.

Neither state means production-ready, audited, certified, mainnet-safe or a
protection guarantee.

## Human gates

The user's 2026-08-19 instruction authorizes the draft-cleanup/salvage programme
and merging useful work after two review/control passes and green CI. A separate
human gate remains mandatory before:

1. connecting a real wallet;
2. signing/submitting a testnet request with a generated burner account;
3. any mainnet or materially funded wallet test.
