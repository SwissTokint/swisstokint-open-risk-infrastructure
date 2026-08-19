# POM-RX Witness Core

The Witness Core owns trust decisions around source and Witness identities. It is shared infrastructure and must not contain Wallet Guard-specific EVM semantics.

## Current reference lifecycle

`reference-trust-lifecycle.mjs` adds an in-memory, reference-only trust lifecycle around the existing Ed25519 source-envelope and Witness-acknowledgement primitives:

- explicit enrollment of public Ed25519 identities with `source` or `witness` roles;
- bounded validity windows evaluated against an injected synchronous trusted clock;
- monotonic trusted-time enforcement that fails closed on clock rollback;
- immediate revocation;
- atomic rotation and recovery to one new successor key;
- deterministic public trust-state snapshots with a domain-separated state hash;
- authorization-candidate verification that requires cryptographically valid source/Witness evidence, exact role enrollment, exact enrolled public-key bytes, active trust both at the signed event time and at the current trusted time, `allow` preflight outcome and an unexpired `witnessed` acknowledgement.

No private key is stored in the trust lifecycle. Enrollment, revocation, rotation and recovery are operator/bootstrap authority actions in this reference implementation.

## Explicit boundary

This module is not a production trust service. State is process-local and non-durable; operator authorization for trust-store mutations is assumed; there is no HSM/KMS, quorum, remote attestation, distributed revocation propagation or production trusted-time source. A successful reference verification therefore returns `reference_only=true` and `production_trust_proved=false`.

Wallet Guard integration with this lifecycle is a separate lot. Real wallet, testnet/mainnet and funded-wallet execution remain outside this reference scope.
