# Avalanche Fuji Accepted-Transaction Monitor v0.1

Status: contract skeleton, deterministic compiler and read-only Fuji monitor
implemented; one live Fuji accepted transaction observed and independently
rechecked; SwissTokint contract deployment still pending.

## Avalanche-specific reason for this adapter

This adapter is not a generic EVM rebrand. AvalancheGo exposes the WebSocket
subscription `newAcceptedTransactions`, which emits transactions when the node
accepts them as finalized. The monitor verifies that it is connected to Fuji
C-Chain ID `43113`, subscribes to that native stream, then retrieves each
receipt over JSON-RPC.

The active Fuji public node accepts the subscription's `fullTx` option as a
boolean. The implementation follows the live node response and keeps this
wire-level choice covered by the read-only reproduction command.

The first public-good use case is monitoring Proof of Method commitments:

1. register hash-only evidence commitments in a minimal C-Chain contract;
2. observe the transaction through Avalanche's accepted-transaction stream;
3. retrieve the receipt from independent RPC endpoints;
4. report agreement or a degraded state without hiding divergence;
5. later relay the same commitment to an Avalanche L1 through ICM.

The ICM extension is a separate, later phase. It is not claimed by this MVP.

## Live read-only network proof

On 28 July 2026 the monitor observed Fuji transaction
`0xe9e1f67bd58899cda644e1719b419ec8d862f459aab6b6a7a2fc8bbfe5d6911f`
through `newAcceptedTransactions`, then retrieved the same successful receipt
at block `57403012` over the public HTTP endpoint.

The normalized observation is committed at
`deployments/avalanche-fuji-readonly-observation-v0.1.json`. This proves the
read-only Avalanche-native observation path. It does not claim that the
SwissTokint registry has been deployed.

## Contract boundary

`ProofAvailabilityRegistry` stores:

- a deterministic batch identifier;
- Merkle root;
- canonical manifest hash;
- evidence archive hash;
- issuer, timestamp and revocation state.

It has no administrator, upgrade key, payment path, token, custody function or
trade execution. Only the original issuer can revoke its own commitment.

## Fail-closed monitor rules

The monitor:

- accepts only Fuji C-Chain ID `43113`;
- validates canonical transaction and block hashes;
- retries briefly for the HTTP receipt after the WebSocket acceptance event,
  then rejects missing or malformed receipts;
- records successful and reverted accepted transactions separately;
- strips credentials and query parameters from endpoint labels;
- reports cross-RPC disagreement as `degraded`;
- never requests, accepts or logs a private key.

`accepted_by_node: true` describes the Avalanche node's accepted-transaction
notification. It is not a claim of application-level success; the receipt
status remains explicit.

## Reproduce locally

```bash
npm ci
npm run avalanche:compile
npm test
npm audit --audit-level=high
```

Observe one live Fuji accepted transaction without a wallet:

```bash
npm run avalanche:observe -- 1
```

Recheck a specific transaction:

```bash
npm run avalanche:check -- 0x<transaction-hash>
```

## Funding boundary

The self-funded work proves technical ability before application. A Team1 Mini
Grant would fund a Fuji deployment, event decoder, multi-endpoint failure
testing, a public reproduction dashboard and one independent Avalanche builder
review. A future invitation-only phase could add ICM replication across
Avalanche L1s, but is not part of the first request.

No Filecoin storage engineering, Stellar registry, Solana program, token sale,
investment return, custody or managed trading service is included.
