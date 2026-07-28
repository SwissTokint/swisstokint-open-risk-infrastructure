# Filecoin Evidence Bundle v0.1

Status: pre-grant readiness prototype

Canonical identifier: `pom-filecoin-bundle/0.1`

## Purpose

This profile packages deterministic Proof of Method receipt proofs into a CARv1
archive suitable for upload through Filecoin Onchain Cloud. It proves that the
retrieved bytes still contain the announced manifest and valid Merkle
inclusions. It does not prove that a trading claim is true or profitable.

## Content model

The CAR has exactly one root: a raw-codec CIDv1 block containing canonical JSON.
The manifest records the batch reference, Merkle root, leaf count and one
content CID per receipt-proof block. Each receipt block contains only:

- receipt identifier and event time;
- commitment hash;
- deterministic leaf index and leaf hash;
- Merkle inclusion path;
- batch reference and Merkle root.

Object keys are sorted lexicographically, strings are NFC-normalised and no
insignificant whitespace is emitted. The CAR writes the root first, then receipt
blocks in deterministic batch order. Reversing the same input therefore
produces identical bytes and the same root CID.

The normative manifest and receipt-block shapes are in
`schemas/filecoin-bundle-v0.1.schema.json` and
`schemas/filecoin-receipt-proof-v0.1.schema.json`.

## Identifiers

The CAR root CID identifies the canonical manifest. The Synapse SDK returns a
Filecoin PieceCID for the uploaded bytes. These values serve different layers
and must never be reported as interchangeable:

- root CID: application-level content graph identity;
- PieceCID: Filecoin storage-piece commitment returned by the upload service;
- Merkle root: Proof of Method batch commitment.

A storage record must retain all three.

## Verification

The portable verifier fails closed unless it can:

1. parse one CAR root;
2. recompute the SHA-256 raw CID for the manifest;
3. enforce canonical JSON and the exact manifest fields;
4. resolve every referenced receipt block;
5. recompute every receipt-block CID;
6. reject duplicate identifiers, duplicate CIDs, gaps and unreferenced blocks;
7. recompute the domain-separated leaf hash and Merkle path;
8. match the manifest leaf count and Merkle root.

Corrupting a stored byte causes verification to fail.

## Filecoin Onchain Cloud boundary

The adapter follows the official Synapse flow:

1. `storage.prepare({ dataSize })`;
2. explicit external execution of any required funding or approval transaction;
3. `storage.upload(bytes)` only with `confirm=true`;
4. `storage.download({ pieceCid })`;
5. byte-for-byte comparison with the original CAR.

The adapter never accepts a private key and never executes a funding
transaction. Wallet custody and account preparation remain outside the library.
Calibration and mainnet uploads are not part of this pre-grant prototype.

## Privacy and selective disclosure

The bundle builder accepts only `receipt_id`, `commitment_hash` and
`occurred_at` as source fields. Unknown fields are rejected before CAR
construction. The public archive contains no raw strategy, signal payload,
credential, balance, position, wallet address or personal identifier.

Each receipt proof has its own CID, which supports extraction and independent
verification of a disclosed proof. The current Filecoin retrieval operation
still downloads the complete CAR piece. Provider-level partial retrieval and a
privacy-reviewed disclosure gateway remain future work.

## Limits

- 1 to 10,000 receipt proofs per batch;
- 64 MiB maximum CAR size in the prototype verifier;
- SHA-256, CIDv1 raw codec and CARv1 only;
- no compression or encryption profile;
- no claim of Filecoin durability until a PieceCID is uploaded, retrievable and
  monitored across the declared provider copies.
