# Proof of Method threat model

Status: draft v0.1, 27 July 2026.

## Assets to protect

- confidentiality of strategy inputs, account data and credentials;
- integrity and chronology of published receipt commitments;
- authenticity of the receipt signer;
- deterministic agreement between independent implementations;
- availability of proof material required for later verification.

## Trust boundaries

1. **Private agent boundary.** The bot or agent owns the raw event and computes
   the payload hash locally.
2. **Relay boundary.** The relay validates a strict event shape, rejects known
   sensitive fields and sends only commitment fields.
3. **Receipt service boundary.** A service may timestamp, sign and persist a
   receipt, but verifiers must recompute the commitment and verify the
   signature.
4. **Batch boundary.** A publisher may aggregate receipt hashes, but every
   verifier must recompute the Merkle path and root.
5. **Future chain/storage boundary.** An anchor or content-addressed store
   proves publication of bytes or a root; it does not prove that the underlying
   method was sound or profitable.

## In-scope threats

| Threat | Current control | Remaining limitation |
| --- | --- | --- |
| Payload or receipt tampering | SHA-256 commitments and Ed25519 signature verification | Key compromise can still produce valid signatures |
| Cross-language ambiguity | Canonical JSON rules and shared fixtures | Schema evolution requires explicit versioning |
| Secret leakage through payload | Local key-name rejection and compact wire receipt | Semantic secrets under innocent names cannot be detected reliably |
| Forged batch membership | Domain-separated leaf/node hashing and inclusion verification | Root publication is not yet anchored to a public chain |
| Replay of authenticated ingest | Timestamp-bound HMAC transport | Production service must enforce a short window and nonce/idempotency policy |
| Malicious receipt service | Portable verifier and public signing key | Service can censor or delay receipts until independent anchoring exists |
| False claims about strategy quality | Receipt proves integrity and chronology only | Independent review and a challenge process are future work |

## Explicit non-goals

The protocol does not prove profitability, regulatory compliance, market-data
accuracy, correct exchange execution or the absence of risk. It must never be
presented as an investment guarantee.

## Required production hardening

- independent cryptographic and application-security review;
- hardware-backed or managed signing keys with rotation and revocation;
- rate limiting, replay protection, audit logging and incident response;
- public batch-root anchoring and redundant content-addressed storage;
- a formal disclosure policy and privacy review;
- adversarial tests for canonicalization, parser differentials and Merkle edge
  cases;
- explicit legal review before any verifier-bond or token mechanism.
