# ADR — POM-RX Wallet Guard MVP

Status: `PROPOSED / HUMAN_REVIEW_REQUIRED`

Date: 2026-08-19

Baseline: `e0479398268d0d0021fa2ddd5bd082d819bd0205`

Council: `docs/decisions/COUNCIL_POM_RX_WALLET_GUARD_MVP.md`

## Context

POM-RX now contains the merged strict-profile internal foundation, but that
foundation is deliberately non-authorizing. The repository still does not have
an execution-side Gate that can stop a wallet request before a wallet signs or
submits it.

The target prototype is defensive: a controlled phishing-clone fixture attempts
a dangerous approval or signature against a burner wallet. The guarded path must
stop that request before forwarding while allowing one explicitly permitted
control request exactly once and reconciling its observed result.

## Decision

Build the first Wallet Guard as a local EVM request gateway with strict
separation between capture, normalization, effects, policy, preflight/witness,
single-use authorization, forwarding and reconciliation.

### Boundary A — trusted request capture

An EIP-1193-compatible gateway receives the dApp request before the underlying
wallet provider. The controlled fixture must never receive another reference to
the underlying provider.

Browser origin is captured from the trusted interception context. It is never
accepted from dApp-supplied request fields or metadata.

Chain ID and active account are sampled from the guarded provider by the trusted
boundary. They are not accepted as authoritative from the dApp payload.

### Boundary B — canonical intent

Every supported request is normalized into one immutable intent object. The
minimum identity includes:

```text
wallet_guard_intent/0.1
request_id
origin
chain_id
account
rpc_method
request_class
target
spender
recipient
native_value
calldata_sha256
typed_data_sha256
requested_allowance
requested_operator_approval
simulation_required
```

Fields that do not apply are explicit `null`. Unknown fields, malformed values,
ambiguous encodings and high-impact request types that cannot be classified are
fail-closed.

### Boundary C — effects and simulation

For transaction requests, the adapter derives or simulates expected effects in
the controlled environment. For signature requests, the adapter derives the
authority being granted when supported.

Simulation is evidence only. It may cause `DENY` or `INDETERMINATE`; it must
never upgrade a denied, unknown or malformed request to `ALLOW`.

### Boundary D — local policy

The policy engine consumes normalized intent/effects and a versioned local
policy. It does not trust UI text or a dApp-provided risk label.

The only decision vocabulary is:

```text
ALLOW
DENY
INDETERMINATE
```

Critical `INDETERMINATE` is non-forwarding.

Initial deterministic policy controls include expected chain, trusted origin,
recipient/spender allowlists, burner value limits, unlimited-allowance denial,
operator-approval denial, Permit/Permit2 domain/spender checks, required
simulation for dangerous request classes, effect mismatch and a kill switch.

### Boundary E — POM-RX preflight and witness

The exact normalized action and policy result are committed into POM-RX. A
signed witness acknowledgement is required before an execution capability can
be created.

Historical PR #24 is source material only. Its signing primitives may be
salvaged, but its HTTP service, persistence and deployment model are not adopted
wholesale because enrollment, revocation, trusted clock, transactional
persistence and Gate integration were incomplete.

### Boundary F — single-use exact authorization Gate

Only the Gate can call the underlying provider. A short-lived capability is
bound to the exact request, account, chain, origin, method, target/spender/value,
calldata or typed-data commitment, preflight receipt hash, policy identity,
expiry and unique capability ID.

Before consumption, the Gate re-samples provider chain/account and compares them
with the capability. Any mutation, replay, expiry, origin substitution,
chain/account change or request mismatch is denied.

Consumption must be atomic and single-use in the selected test runtime.

### Boundary G — execution evidence and reconciliation

After an allowed request is forwarded, execution evidence is captured and a
logically distinct observer checks the resulting test-chain state or receipt.
Reconciliation binds the observed effect to the exact authorized action.

## Initial EVM request scope

The MVP must explicitly classify at least:

- `eth_sendTransaction`;
- ERC-20 `approve`, including unlimited allowance;
- ERC-20 `transfer`;
- ERC-721/ERC-1155 `setApprovalForAll`;
- EIP-2612 Permit-like typed data;
- Permit2-style typed data;
- generic `eth_signTypedData_v4`;
- generic calldata that cannot be decoded safely.

Generic signatures whose authority/effects cannot be normalized remain
fail-closed.

## Required adversarial fixtures

1. unlimited ERC-20 approval to an untrusted spender — denied;
2. `setApprovalForAll(true)` to an untrusted operator — denied;
3. Permit/Permit2 with untrusted spender/domain — denied;
4. transfer/value above burner limit — denied;
5. unknown dangerous calldata — denied or indeterminate, never allowed;
6. mutation after preflight — denied;
7. capability replay — denied;
8. dApp-supplied fake origin metadata — ignored and denied when trusted origin differs;
9. chain substitution or provider chain change — denied;
10. account substitution or provider account change — denied;
11. direct underlying-provider bypass attempt — impossible in the accepted harness;
12. one allowlisted low-value control request — forwarded once and reconciled.

## Implementation shape

```text
sdk/typescript/wallet-guard/
  intent.mjs
  evm-decoders.mjs
  policy.mjs
  capability.mjs
  gate.mjs
  provider.mjs
  simulation.mjs
  reconciliation.mjs

tests/wallet-guard/
  fixtures/
  intent.node.test.mjs
  policy.node.test.mjs
  gate.node.test.mjs
  adversarial.node.test.mjs
  e2e-burner.node.test.mjs

examples/wallet-guard-controlled-dapp/
```

A browser extension is deferred. The first accepted runtime is a local gateway
or harness where the forwarding boundary can be proven with fewer moving parts.

## Relationship to existing work

- legacy `verifyPomRxChain()` remains frozen for v0.1 compatibility;
- the merged strict-profile internal foundation is a prerequisite scaffold but
  remains non-authorizing;
- Witness cryptographic primitives may be salvaged from PR #24 into a separate
  current-main PR;
- Proof Receipt and anchor infrastructure remain evidence transport, not the
  critical blocking path for the local MVP;
- the market risk engine is not reused as the wallet policy engine because its
  input model is unrelated to wallet intents.

## Security properties required before burner-wallet E2E

1. `DENY` and critical `INDETERMINATE` never call the underlying provider.
2. Browser origin is trusted-boundary observed, never request supplied.
3. Chain/account are provider-observed and rechecked at Gate consumption.
4. A capability can be consumed at most once.
5. Capability/request comparison is exact after canonical normalization.
6. The controlled fixture has no second provider reference.
7. Simulation failure for configured dangerous classes is fail-closed.
8. No wallet seed/private key is accepted by the POM-RX witness/relay.
9. Logs and receipts contain commitments rather than wallet secrets.
10. The observer is logically distinct from the forwarding decision path.

## Rejected alternatives

A domain blocklist alone is insufficient because new phishing domains can be
unknown and legitimate domains can be compromised. UI warnings alone are also
insufficient because the objective is measurable prevention before forwarding.
A full browser extension and funded mainnet wallet are deferred because neither
improves the first proof and both add unnecessary attack surface.

## Acceptance

Architecture acceptance authorizes implementation only. It does not claim that
POM-RX currently protects funds.

`WALLET_GUARD_SIMULATED_READY` requires deterministic fixtures proving all
blocking paths without a wallet.

`WALLET_GUARD_BURNER_E2E_READY` requires a controlled local/testnet fixture where
one malicious request produces no signature/transaction and one allowed request
is forwarded once and reconciled.

No state in this ADR authorizes a funded mainnet wallet or uncontrolled malicious
site test.
