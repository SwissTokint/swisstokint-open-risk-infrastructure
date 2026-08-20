# POM-RX Witness Core

The Witness Core owns trust decisions around source and Witness identities. It is shared infrastructure and must not contain Wallet Guard-specific EVM semantics.

## Current reference lifecycle

`reference-trust-lifecycle.mjs` adds an in-memory, reference-only trust lifecycle around the existing Ed25519 source-envelope and Witness-acknowledgement primitives:

- explicit enrollment of public Ed25519 identities with `source` or `witness` roles;
- bounded validity windows evaluated against an injected synchronous trusted clock;
- monotonic trusted-time enforcement that fails closed on clock rollback;
- immediate revocation;
- atomic rotation and recovery to one new successor key, only while the predecessor is currently time-active;
- deterministic public trust-state snapshots with a domain-separated state hash and locale-independent key ordering;
- authorization-candidate verification that requires cryptographically valid source/Witness evidence, exact role enrollment, exact enrolled public-key bytes, active trust both at the signed event time and at the current trusted time, `allow` preflight outcome and an unexpired `witnessed` acknowledgement;
- independent chronology enforcement requiring Witness receipt time not to predate source occurrence time;
- `authorization_valid_until` bounded by the earliest of acknowledgement validity, source enrollment validity and Witness enrollment validity so a later Gate cannot safely inherit a longer lifetime from the acknowledgement alone;
- an explicit reference-store ceiling of 32 retained identities, with every administrative mutation staged against an exact prospective map and revision before commit;
- fail-closed prospective snapshot validation: canonical/node/byte-bound exhaustion is reported as `POMRX_WITNESS_TRUST_E_CAPACITY`, and `records` plus `revision` are committed only after the prospective trust snapshot succeeds. Enrollment, revocation, rotation and recovery therefore cannot report failure after partially changing trust state.

The 32-identity ceiling is intentionally conservative for this reference implementation. It leaves headroom under the shared bounded canonical-payload contract even when retained identities carry transition metadata; it is not a production trust-store sizing claim. Retained-history compaction, durable state and production recovery-at-capacity policy remain outside this reference lot.

No private key is stored in the trust lifecycle. Enrollment, revocation, rotation and recovery are operator/bootstrap authority actions in this reference implementation.

## Explicit boundary

This module is not a production trust service. State is process-local and non-durable; operator authorization for trust-store mutations is assumed; there is no HSM/KMS, quorum, remote attestation, distributed revocation propagation or production trusted-time source. A successful reference verification therefore returns `reference_only=true` and `production_trust_proved=false`.

Wallet Guard integration with this lifecycle is a separate lot. Real wallet, testnet/mainnet and funded-wallet execution remain outside this reference scope.
