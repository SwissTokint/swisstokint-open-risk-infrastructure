# Proof Batch v0.1 — deterministic Merkle inclusion

Status: implementable draft  
Canonical identifier: `pom-batch/0.1`

## Objective

Proof Batch upgrades an L0 signed receipt to an L1 inclusion proof. Multiple receipt commitment hashes are compressed into one Merkle root that can later be anchored on an EVM L2.

The batch builder and verifier work without a blockchain. No mainnet or testnet transaction is part of v0.1.

## Input order

Receipts are sorted by:

1. normalised `occurred_at`, ascending;
2. `receipt_id`, ascending.

Duplicate receipt identifiers or commitment hashes are rejected. A batch contains between 1 and 10,000 receipts.

## Domain separation

Leaf:

```text
SHA-256("swisstokint:proof-leaf:v1:" + commitment_hash)
```

Parent:

```text
SHA-256("swisstokint:proof-node:v1:" + left_hash + ":" + right_hash)
```

The string is UTF-8 encoded. Hashes are lowercase hexadecimal. Domain prefixes prevent a raw receipt commitment from being interpreted as an internal node.

## Odd levels

When a level contains an odd number of nodes, the final node is duplicated and hashed with itself. The inclusion proof records the duplicated node as a right sibling.

## Proof

Each leaf records an ordered path:

```json
[
  { "position": "right", "hash": "<sibling>" },
  { "position": "left", "hash": "<sibling>" }
]
```

Verification starts from the domain-separated leaf and applies the path until it reaches `merkle_root`.

## Anchor boundary

An L2 anchor transaction should contain or emit:

- `schema_version`;
- `batch_ref`;
- `merkle_root`;
- `leaf_count`;
- optional content-addressed manifest reference.

Chain selection, contract design, signer custody, finality depth and incident procedures remain separate decisions. No receipt should be labelled `anchored` until the transaction is confirmed and independently retrievable.

## Security limits

- Inclusion proves membership in a batch, not truth of the receipt.
- A root anchored after the claimed event does not prove the event occurred at its declared time.
- The batch manifest must remain available.
- The anchor signer must not have trading authority.
- Reorganisation and finality rules must be documented before public L1 claims.
- Verifiers must recompute the root; they must not trust the SwissTokint API result.
