# Multichain Anchor Adapter Profile v0.1

Status: draft interoperability profile, 28 July 2026.

## Purpose

Proof Receipt batches are chain-neutral. A chain adapter publishes the batch
root and returns a normalized `pom-anchor-record/0.1` object. The record lets a
portable verifier compare different networks without pretending that their
finality, transaction or authority models are identical.

This profile is the shared boundary for future Solana, Stellar, Tezos,
Avalanche and EVM adapters. It does not implement those adapters and does not
claim that any ecosystem has funded or endorsed the work.

## Required adapter behavior

An adapter MUST:

1. accept only a valid `pom-batch/0.1` batch reference and Merkle root;
2. publish no raw strategy payload, account credential or personal data;
3. return the exact network, transaction and block references it observed;
4. distinguish observed, finalized, revoked and orphaned state;
5. fail closed when network identity, state or finality cannot be established;
6. preserve the chain-specific evidence required for independent replay;
7. emit only the normalized record fields defined by the schema.

An adapter MUST NOT:

- execute trades or receive authority to move assets;
- reuse a success response from another network or transaction;
- report `finalized` with zero confirmations;
- silently convert an orphaned or revoked root into a successful state;
- add vendor-specific fields to the normalized record.

Vendor-specific diagnostics belong in a separate local log or evidence bundle.

## Wire object

The normative schema is
[`schemas/anchor-record-v0.1.schema.json`](../schemas/anchor-record-v0.1.schema.json).

| Field | Meaning |
| --- | --- |
| `schema_version` | Constant `pom-anchor-record/0.1`. |
| `adapter_id` | Versioned adapter identifier such as `solana/devnet-v0`. |
| `network` | Explicit network identifier, never inferred by the verifier. |
| `batch_ref` | Deterministic Proof of Method batch reference. |
| `merkle_root` | Lowercase SHA-256 batch root. |
| `transaction_ref` | Native transaction or operation reference. |
| `block_ref` | Native block, slot or ledger reference. |
| `anchored_at` | Timestamp represented by the adapter for publication. |
| `observed_at` | UTC time at which the adapter observed the state. |
| `status` | `observed`, `finalized`, `revoked` or `orphaned`. |
| `confirmations` | Non-negative network-specific confirmation observation. |

The confirmation count is descriptive, not a cross-chain security score. Each
adapter specification MUST define what `finalized` and the count mean for its
network.

## Canonical commitment

TypeScript and Python SDKs:

1. validate the exact field set;
2. normalize text to NFC and timestamps to UTC millisecond form;
3. canonicalize JSON using the existing Proof of Method rules;
4. calculate:

```text
SHA256("swisstokint:pom-anchor-record:v1:" || canonical_record)
```

This hash can be included in a Filecoin evidence bundle or an external audit
report without replacing the native transaction reference.

## Chain-specific profiles required before production

Every adapter needs a separate profile covering:

- network and program/contract identity;
- write authority and upgrade controls;
- exact finality rule;
- revocation representation;
- reorganization or orphan handling;
- RPC/provider independence;
- transaction cost and retry behavior;
- testnet and mainnet deployment references;
- security review and incident response.

## Funding boundary

This shared profile is pre-existing public infrastructure. A chain-specific
grant may fund only its adapter, tests, deployment, benchmarks and ecosystem
documentation. Filecoin grant #2159 remains limited to content-addressed
storage and retrieval. The same engineering hour, invoice or acceptance
evidence cannot be charged to two programmes.
