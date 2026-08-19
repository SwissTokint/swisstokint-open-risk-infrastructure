# ADR — POM-RX Wallet Guard MVP

Status: `PROPOSED / HUMAN_REVIEW_REQUIRED`

Date: 2026-08-19

Council: `docs/decisions/COUNCIL_POM_RX_WALLET_GUARD_MVP.md`

## Context

POM-RX currently provides structural receipt verification and evidence
primitives, but the repository does not yet provide a downstream execution Gate
that can stop a wallet request before the wallet signs or submits it.

The target prototype is defensive: demonstrate that one risky wallet request
originating from a controlled phishing-clone fixture is denied before the
forwarding boundary while one explicitly allowed control request can be
forwarded once and reconciled.

## Decision

Implement the first operational Wallet Guard as a local EVM request gateway
with a strict separation between detection, authorization and execution.

### Boundary A — request capture

An EIP-1193-compatible gateway receives the dApp request before the real wallet
provider. The test harness must also prove that direct access to the underlying
provider is not available through the guarded fixture.

### Boundary B — canonical intent

Every supported request is normalized into one exact immutable intent object.
The object includes method, origin, chain, account, target/spender/recipient,
value, calldata or typed-data commitment and decoder classification.

Normalization must reject unknown fields and ambiguous encodings. Unknown
high-impact request types are fail-closed for the MVP.

### Boundary C — effects

For transaction requests, an adapter derives or simulates expected state/effect
changes in the controlled test environment. For signature requests, the
adapter derives the authority being granted where supported. Failure to derive
required effects is `INDETERMINATE`, not `ALLOW`.

### Boundary D — policy

The policy engine consumes only normalized intent/effects and versioned local
policy. It does not parse UI text and does not trust a dApp's own risk label.
The result is `ALLOW`, `DENY` or `INDETERMINATE` with deterministic diagnostics.

### Boundary E — POM-RX preflight and witness

The normalized action and policy result are committed into the POM-RX preflight
path. A witness acknowledgement is required by the Wallet Guard profile before
a capability can be created. The existing PR #24 implementation may be mined
for signed-envelope/witness logic but cannot be merged wholesale without its
known blockers being resolved.

### Boundary F — single-use Gate

Only the Gate can forward to the underlying wallet provider. The Gate consumes
one short-lived capability bound to the exact request. Consumption is atomic
within the selected test runtime. Any mismatch or replay is denied.

### Boundary G — execution and reconciliation

After an allowed request is forwarded, execution evidence is captured and an
independent observer verifies the resulting test-chain state/receipt. A
reconciliation receipt binds the observed effect back to the exact authorized
action.

## Minimum canonical intent

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

Fields not applicable to a request are explicit `null`; field omission is not
used to create semantic ambiguity.

## Minimum decision vocabulary

```text
ALLOW
DENY
INDETERMINATE
```

Initial deterministic diagnostic families:

```text
WG_ORIGIN_NOT_ALLOWED
WG_CHAIN_NOT_ALLOWED
WG_TARGET_NOT_ALLOWED
WG_SPENDER_NOT_ALLOWED
WG_VALUE_LIMIT_EXCEEDED
WG_UNLIMITED_ALLOWANCE_DENIED
WG_OPERATOR_APPROVAL_DENIED
WG_TYPED_DATA_DOMAIN_MISMATCH
WG_TYPED_DATA_UNKNOWN
WG_CALLDATA_UNKNOWN
WG_SIMULATION_REQUIRED
WG_SIMULATION_FAILED
WG_EFFECT_MISMATCH
WG_KILL_SWITCH_ACTIVE
WG_WITNESS_UNAVAILABLE
WG_AUTHORIZATION_MISMATCH
WG_AUTHORIZATION_EXPIRED
WG_AUTHORIZATION_REPLAY
```

## Controlled attack fixtures

The MVP test suite must include at least:

1. unlimited ERC-20 approval to untrusted spender — denied;
2. `setApprovalForAll(true)` to untrusted operator — denied;
3. Permit/Permit2-style typed data with untrusted spender/domain — denied;
4. transfer/value above configured burner limit — denied;
5. unknown dangerous calldata when simulation is required — denied or
   indeterminate, never allowed;
6. request mutated after preflight — denied;
7. capability replay — denied;
8. origin substitution — denied;
9. chain substitution — denied;
10. account substitution — denied;
11. allowlisted low-value control request — forwarded exactly once and
    reconciled.

## Implementation shape

Proposed modules, subject to exact-head architecture review:

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

The initial provider may be a local gateway/test harness rather than a browser
extension. A browser extension is deferred until the execution boundary and
bypass model are proven with fewer moving parts.

## Relationship to existing POM-RX work

- legacy `verifyPomRxChain()` remains frozen for compatibility;
- draft PR #43 is a non-authorizing strict-profile foundation and may become a
  prerequisite after its human Tier-B merge gate;
- draft PR #24 is source material for Witness semantics, not a production-ready
  authorization service;
- existing Proof Receipt/anchor infrastructure remains evidence transport and is
  not placed on the critical blocking path for the first local MVP;
- the existing market risk engine is not reused as the wallet policy engine
  without an explicit adapter because its current inputs are market snapshots,
  not wallet intents.

## Security properties required for the first burner-wallet E2E

1. `DENY` and critical `INDETERMINATE` never call the underlying provider.
2. A capability can be consumed at most once.
3. Capability/request comparison is exact after canonical normalization.
4. No wallet secret is passed to the POM-RX relay/witness.
5. The fixture cannot bypass the Gate through a second exposed provider path.
6. Simulation/effect failure for configured dangerous requests is fail-closed.
7. Logs and receipts contain commitments, not private keys or seed phrases.
8. The observer is logically distinct from the forwarding decision path.

## Rejected alternatives

### Domain blocklist only

Rejected as the primary boundary. A new phishing domain can exist before it is
known, and a compromised legitimate origin can still produce a dangerous
request.

### UI warning only

Rejected. The target is a measurable pre-forwarding control, not a warning that
the user can click through accidentally.

### Full browser extension first

Deferred. Extension lifecycle, injection and provider-race behavior add attack
surface before the exact Gate semantics are proven.

### Mainnet wallet test first

Rejected. It provides no engineering advantage over a burner local/testnet
proof and exposes unnecessary financial risk.

## Acceptance

The architecture can move to implementation only after independent Protocol /
Systems Architecture and Security review agree that the forwarding boundary is
actually enforceable in the selected harness.

The first implementation release is successful only when a deterministic test
proves that a controlled malicious fixture cannot cause the guarded provider to
produce a signature or transaction while the green control is forwarded once
and reconciled.

No acceptance state in this ADR authorizes a funded mainnet wallet.
