# Proof of Method Receipt v0.2

Status: implementable draft  
Date: 27 July 2026  
Canonical identifier: `pom-receipt/0.2`

## 1. Purpose

Receipt v0.2 records a minimal, signed commitment for an event produced by a bot or autonomous agent. It is designed to prove integrity and chronology without sending the raw event payload, trading credentials, balances, positions, personal data or source code to SwissTokint.

The receipt is an evidence primitive. It is not a trading signal, a performance certificate or an authorisation to execute an order.

## 2. Privacy boundary

The source environment performs these operations locally:

1. validates that the event payload is safe to commit;
2. normalises and canonicalises the payload;
3. calculates `payload_hash`;
4. removes the raw payload from the wire receipt;
5. signs the exact HTTP body with the transport HMAC.

SwissTokint receives only the wire fields defined by `schemas/proof-receipt-v0.2.schema.json`.

## 3. Wire receipt

| Field | Meaning |
|---|---|
| `schema_version` | Always `pom-receipt/0.2` |
| `receipt_id` | Globally unique source-generated identifier |
| `kind` | `signal`, `research`, `governance` or `milestone` |
| `subject_ref` | Non-secret reference understood by the producer |
| `method_hash` | SHA-256 commitment to the versioned method |
| `risk_policy_hash` | SHA-256 commitment to the governing risk policy |
| `payload_hash` | SHA-256 of the locally canonicalised payload |
| `occurred_at` | UTC or offset-aware event time |
| `nonce` | Unique anti-replay value, never reused |
| `source_key_id` | Identifier of the source transport credential |

Hashes are lowercase, 64-character hexadecimal SHA-256 values.

## 4. Safe payload profile

The SDK accepts a deliberately narrow JSON profile:

- object keys use `A-Z`, `a-z`, `0-9`, `_`, `.`, or `-`;
- keys are 1 to 64 characters;
- strings are NFC-normalised and at most 2,048 characters;
- numbers are safe integers only;
- booleans and `null` are supported;
- arrays and objects are supported up to depth 8;
- the canonical payload is at most 16 KiB;
- keys associated with credentials, identities, balances or account data are rejected.

This restriction makes hashes reproducible across the TypeScript and Python SDKs and reduces accidental data exposure. Producers needing richer evidence should hash a local evidence file and put only that file hash in the safe payload.

## 5. Canonical payload

The SDK:

1. NFC-normalises strings;
2. sorts ASCII object keys lexicographically;
3. emits JSON with no insignificant whitespace;
4. uses JSON lowercase literals for booleans and null;
5. accepts only safe integers.

`payload_hash = SHA-256(UTF-8(canonical_payload))`

This profile is intentionally smaller than general JSON Canonicalization Scheme support.

## 6. Public commitment

After validating the wire receipt, the server replaces the nonce with its hash and signs this canonical object:

```json
{
  "version": 2,
  "schema_version": "pom-receipt/0.2",
  "receipt_id": "...",
  "kind": "signal",
  "subject_ref": "...",
  "method_hash": "...",
  "risk_policy_hash": "...",
  "payload_hash": "...",
  "nonce_hash": "...",
  "occurred_at": "...",
  "source_key_id": "..."
}
```

`commitment_hash = SHA-256(UTF-8(canonical_commitment))`

The server signs the exact canonical commitment with Ed25519 and stores the public key alongside the historical receipt so that key rotation does not invalidate old proofs.

## 7. Transport authentication

The source sends:

```text
X-Proof-Timestamp: unix timestamp in seconds
X-Proof-Signature: HMAC-SHA256(secret, "<timestamp>.<exact request body>")
```

The server accepts a five-minute clock window. The nonce and receipt identifier provide persistent replay protection. The source must never log the HMAC secret or include it in the receipt.

HMAC authenticates the relay-to-service channel. It does not create a public source signature. A future profile may add EIP-712 or Ed25519 source signatures when independent source identity becomes necessary.

## 8. Verification

A verifier must independently:

1. parse the stored commitment;
2. recompute `commitment_hash`;
3. verify the Ed25519 signature against the public key stored with the receipt;
4. compare `method_hash`, `risk_policy_hash` and `payload_hash` with locally retained evidence;
5. check the anchor and attestation state when L1 or L2 assurance is claimed.

Passing L0 verification proves the integrity of the recorded commitment. It does not prove that the local payload was true or that the method was profitable.

## 9. Compatibility

The ingestion endpoint continues to accept legacy v0.1 receipts during migration. New SDKs emit v0.2 only. Legacy receipts keep their original canonical representation so historical signatures remain valid.

## 10. Security requirements

- Never send exchange credentials, private keys, balances, positions or direct personal identifiers.
- Never reuse a nonce.
- Keep event time synchronised and monitor rejected timestamps.
- Rotate transport and signing credentials separately.
- Retain historical public signing keys.
- Reject unknown fields.
- Treat all human-readable references as public.
- Run the relay with no authority to place or modify trades.
