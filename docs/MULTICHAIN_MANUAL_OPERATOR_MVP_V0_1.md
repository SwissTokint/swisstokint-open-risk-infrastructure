# Multichain Manual Operator MVP v0.1

## Qualification

`OFFLINE_ACCEPTANCE_ONLY`

This component is a deterministic, synthetic, offline acceptance harness for a
future manual-operator workflow. It is not a wallet, signer, submitter, RPC
client, deployment tool, production service, authorization, audit, or release
gate. It does not permit a Stellar or Filecoin network action.

## Bounded rails

The plan contains exactly two test-network rails:

- Stellar Testnet: a future zero-value `register` call against the allowlisted
  evidence-registry contract.
- Filecoin Calibration: a verified deterministic CAR artifact whose future
  external provider selection remains explicitly required.

The Filecoin rail is an evidence-storage lane, not a second finalized anchor.
The two rails must commit to the same POM batch reference and Merkle root.

## Fail-closed invariants

- exact network and chain identities;
- exact Stellar destination and checksum-valid public source-account allowlists;
- Filecoin provider selection remains required and no provider is embedded;
- `value_atomic = "0"` on both rails;
- Stellar acceptance fee cap no greater than `100000` atomic units;
- Filecoin offline acceptance fee cap exactly `0`;
- `submit = false` on both rails;
- no private key, seed, signature, wallet SDK, RPC, token, balance, or approval
  material in the plan;
- byte verification of the Filecoin CAR before its CID, SHA-256, byte length,
  leaf count, batch reference, and Merkle root enter the plan;
- one defensive snapshot of caller input before any asynchronous verification;
- canonical, domain-separated SHA-256 commitments for both rail intents and the
  whole plan;
- `network_actions_allowed = false` and a mandatory human gate scoped to the
  exact future unsigned envelope.

Unknown fields, duplicate raw JSON keys, altered commitments, mismatched batch
or CAR values, invalid Stellar StrKey checksums, non-zero value, wrong networks,
wrong chain IDs, unapproved Stellar destinations, and excessive fees fail
closed.

## Deterministic derivations

Canonical JSON uses the existing POM proof SDK canonicalizer.

- Stellar `batch_id`:
  `SHA256("pom-stellar-testnet-batch-id/0.1\\0" + batch_ref)`
- Stellar rail intent commitment (`rail_intent_hash`):
  `SHA256("pom-stellar-testnet-register-intent/0.1\\0" + canonical_rail)`
- Filecoin rail intent commitment (`rail_intent_hash`):
  `SHA256("pom-filecoin-calibration-car-intent/0.1\\0" + canonical_rail)`
- Plan commitment:
  `SHA256("pom-multichain-manual-operator-plan/0.1\\0" + canonical_plan)`

The committed rail and plan values exclude their own hash field.
These are hashes of offline intent descriptors, not hashes of serialized
unsigned transaction envelopes. The latter do not exist in this lot.

`manifest_hash` and `evidence_hash` are caller-supplied digests whose exact
source bytes must be defined and verified by the future envelope-builder lot;
this harness validates their syntax and commits them without claiming their
external provenance.

CAR verification is byte-exact only while building the plan, because the CAR
bytes are deliberately not embedded in the serialized plan. Re-validating a
serialized plan proves internal commitment consistency; independent storage
verification must be repeated from the original CAR bytes.

## Required next gates

Before any testnet operation, a separate clean lot must add and independently
review all of the following without weakening this harness:

1. strict POM-RX verifier, ordering/Witness, Gate, and DAGR source profile;
2. an unsigned-envelope builder with nonce or sequence, expiry, anti-replay,
   fee or resource caps, exact destination summary, and reproducible hash;
3. simulation against the exact target network;
4. explicit human approval of the exact unsigned envelope hash;
5. signing and submission outside the agent process using the operator wallet;
6. an independent chain observer and deterministic reconciliation report.

Mainnet, automatic signing, automatic submission, real-value transfer, wallet
custody, and production deployment remain out of scope.

## Verification

Run:

```text
npm run test:multichain-manual-operator
```

The example at
`schemas/examples/multichain-manual-operator-plan-v0.1.json` is synthetic and
must reproduce the exact committed plan hash.
