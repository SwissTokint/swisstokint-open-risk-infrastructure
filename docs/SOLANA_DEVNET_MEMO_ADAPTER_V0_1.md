# Solana Devnet Memo Anchor Adapter v0.1

Status: deterministic adapter and offline tests complete; Devnet publication
pending faucet funding; no grant award or production claim.

## Why this pre-grant adapter is intentionally small

The adapter proves the full chain-neutral boundary without pretending that a
custom Solana program already exists. It places one canonical, signed
commitment in the official Solana Memo program and retrieves the finalized
transaction through RPC.

This is self-funded application-readiness work. A future Solana Foundation
scope can fund the high-throughput PDA registry, Ed25519 batch verification,
benchmarks, indexer and independent review. Those future deliverables do not
overlap with Filecoin storage or the Stellar Soroban registry.

## On-chain commitment

The canonical memo is 321 UTF-8 bytes:

```json
{"a":"4aAc8nXZcAMqn1Z4KyPFjdrYHcCrDbicNyh81boYzrYV","b":"pom-fb2d5a7c2139fa0bfbbf977f","e":"be9294af27690a0e5fcda7fc2221d26b3aa9c7161c90529fe3559e9ab41e0fc2","m":"b216fe65723bfac075faf1a0d876125306bdf4bc35a6836a78bbca99f5fdd4b4","r":"fb2d5a7c2139fa0bfbbf977f2b11e0286805bd10625bf4d59bfed1e6b065d454","v":"pom-solana/0.1"}
```

| Key | Meaning |
|---|---|
| `a` | expected Solana transaction signer |
| `b` | deterministic Proof of Method batch reference |
| `e` | SHA-256 of the evidence archive |
| `m` | SHA-256 of the canonical manifest |
| `r` | Merkle root of the proof receipts |
| `v` | versioned Solana memo profile |

## Fail-closed verification rules

The verifier:

- accepts only the six declared input fields;
- rejects malformed lowercase SHA-256 values and non-base58 issuers;
- requires byte-for-byte canonical JSON;
- requires exactly one Solana Memo instruction;
- requires a successful finalized transaction;
- requires the transaction signer to match the committed issuer;
- requires the entire memo to match the expected local commitment;
- returns a normalized `pom-anchor-record/0.1` only after all checks pass.

`confirmations: 1` in the normalized output means one independently observed
Solana `finalized` checkpoint. It is not presented as a literal descendant-slot
count.

## Local key boundary

The Devnet identity is stored outside the repository at:

```text
~/.config/solana/swisstokint-devnet.json
```

The key generator refuses to overwrite an existing identity. The key is used
only for Devnet fees and never for Mainnet assets, treasury, exchange access or
trading authority.

## Reproduce

```bash
npm ci
npm run solana:dry-run -- schemas/examples/solana-anchor-input-v0.1.json
npm test
```

Create a dedicated Devnet identity once:

```bash
npm run solana:keygen
```

Fund the displayed public address using the official Devnet faucet, then:

```bash
npm run solana:publish -- schemas/examples/solana-anchor-input-v0.1.json
npm run solana:verify -- \
  <transaction-signature> \
  schemas/examples/solana-anchor-input-v0.1.json
```

## Security and scope boundary

The memo contains hashes and a public signer only. It contains no personal
data, credential, wallet secret, account balance, order, position, strategy or
performance figure. The adapter cannot custody funds, execute a trade, issue a
token or promise a return.

This Memo-based prototype is not the final funded architecture. A custom
program must add deterministic PDAs, explicit lifecycle state, compute/cost
benchmarks, verified builds and an external security review before a Mainnet
claim.
