# Stellar testnet evidence-manifest verifier

Status: local, offline verifier for the checked-in evidence manifest. It is a
reproducibility aid for the Stellar evidence-registry prototype and a funding
packet input. It does not send a request, use a wallet, handle a key or submit
a transaction.

## What it verifies

`scripts/verify-stellar-testnet-evidence.mjs` checks the internal consistency
of `deployments/stellar-testnet-v0.1.json`:

- exact manifest keys and the `stellar:testnet` identifier;
- Stellar contract/deployer identifier type, version byte and StrKey checksum,
  SHA-256 fields and distinct lifecycle transaction references;
- strict JSON object-key uniqueness, including nested and escape-equivalent
  duplicate keys, plus real ISO calendar dates;
- separate active and revoked fixtures, including their opposite expected
  verification outcomes;
- explicit false values for audit, mainnet, grant and readiness claims.

Run it without any network access:

```powershell
node scripts/verify-stellar-testnet-evidence.mjs
```

The command returns a compact JSON summary only after every local invariant
passes. It fails closed on a duplicate JSON key, unknown field, wrong StrKey
type or checksum, impossible calendar date, reused transaction reference,
contradictory fixture result or any affirmative claim.

## What it does not verify

The manifest is a checked-in record, not an independent observation. This
offline verifier does **not** query a Stellar RPC endpoint, inspect ledger
state, prove that a transaction was accepted, prove the current contract state,
or establish that an external person reproduced the result. Those checks must
be performed separately against public testnet records and documented with a
time-bounded observation.

It also does not establish strategy correctness, financial performance, token
necessity, grant eligibility, an audit or an award.

## Funding-packet use

Include the command output together with the source manifest and the Soroban
unit-test output as local reproducibility material. Keep the following Stellar
SCF packet gates open until independently completed: the recorded public demo,
both approved founder/capacity records, integration intent, treasury receiving
policy and action-time human review. Running this verifier neither closes those
gates nor authorises submission.
