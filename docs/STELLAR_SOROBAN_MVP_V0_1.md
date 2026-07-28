# Stellar Soroban Evidence Registry MVP v0.1

Status: compiled, unit-tested and deployed to Stellar Testnet; not audited and
not production-ready.

## Purpose

The registry gives a Stellar application a compact, machine-readable way to
verify that a SwissTokint Proof of Method evidence batch existed in a specific
form. It anchors integrity commitments, not trading performance.

The contract stores four 32-byte values:

1. deterministic batch identifier;
2. Merkle root of the proof receipts;
3. canonical manifest hash;
4. evidence archive hash.

It also records the authorized issuer, registration ledger, lifecycle status
and an optional hashed revocation reason. Raw strategy data, user data, API
credentials and order payloads remain off-chain.

## Public interface

| Function | Purpose | Authorization |
|---|---|---|
| `initialize(admin_address)` | Set the one-time administrator and first writer | proposed admin signature |
| `set_writer(writer, authorized)` | Add or remove an allowed issuer | administrator signature |
| `register(writer, batch_id, merkle_root, manifest_hash, evidence_hash)` | Add an immutable active commitment | allowed writer signature |
| `get(batch_id)` | Read one record | public |
| `verify(batch_id, merkle_root, manifest_hash, evidence_hash)` | Compare a candidate proof with an active record | public |
| `revoke(caller, batch_id, reason_hash)` | Mark a record revoked without erasing history | original issuer or administrator signature |

The compiled specification also exposes typed
`registry_initialized`, `writer_updated`, `anchor_registered` and
`anchor_revoked` events for indexers.

## Security properties in the MVP

- One-time initialization prevents administrative replacement.
- Soroban address authorization is required for every privileged operation.
- A writer allow-list prevents public storage-exhaustion writes.
- A batch identifier cannot be overwritten.
- Revocation is explicit, durable and separately reason-committed.
- Verification returns false for missing, mismatched or revoked records.
- Persistent and instance storage TTLs are extended under bounded rules.
- No asset custody, token issuance, trade execution or performance claim exists
  in this contract.

## Verification evidence

Environment used on 28 July 2026:

- Rust `1.97.1`;
- Stellar CLI `27.0.0`;
- Soroban SDK `26.1.1`.

Local unit tests:

```text
running 3 tests
test rejects_unauthorized_writers ... ok
test rejects_duplicate_batch_ids ... ok
test registers_verifies_and_revokes_a_record ... ok
test result: ok. 3 passed; 0 failed
```

Optimized build:

```text
WASM size: 7,390 bytes
WASM hash: c93cd79be735c208dc997cc942fd7219fdc16fb0445e84c30d066d431e2acb8d
exported functions: get, initialize, register, revoke, set_writer, verify
```

Reproduce:

```bash
cd integrations/stellar-evidence-registry
rustup target add wasm32v1-none
cargo test
stellar contract build
stellar contract info hash \
  --wasm target/wasm32v1-none/release/swisstokint_evidence_registry.wasm
```

CI installs the official attested Stellar CLI release at the exact source
revision used for `v27.0.0`, runs the unit tests and rebuilds the optimized
contract on every pull request.

## Remaining work before a production claim

1. Deploy to Stellar Testnet with a dedicated non-custodial test identity.
2. Publish one deterministic register, verify and revoke trace.
3. Add property tests for authorization, storage expiry and malformed inputs.
4. Measure ledger and RPC costs at 1k, 10k and 100k commitments.
5. Add an independent verifier/indexer and TypeScript bindings.
6. Obtain an external smart-contract review before Mainnet.

The MVP is grant-readiness evidence. It must not be represented as audited,
production-ready or a completed Stellar Community Fund milestone.

## Public Testnet evidence

- Contract:
  [`CA6V2EUEGR4HFTRK3K5XOOGENH3Q2ZSHTBMHUG4LB3YOKDOLOETK2C5W`](https://lab.stellar.org/r/testnet/contract/CA6V2EUEGR4HFTRK3K5XOOGENH3Q2ZSHTBMHUG4LB3YOKDOLOETK2C5W)
- WASM upload:
  [`1ec9906006041e8c552c7a2ca8726b1bf4c0d28965bd18a840e33fe159f4aec0`](https://stellar.expert/explorer/testnet/tx/1ec9906006041e8c552c7a2ca8726b1bf4c0d28965bd18a840e33fe159f4aec0)
- Contract deployment:
  [`6e2d93990a1935169c6aa43f75ef1ba0c4dc7e24b04fe55e3440eb73de5bc458`](https://stellar.expert/explorer/testnet/tx/6e2d93990a1935169c6aa43f75ef1ba0c4dc7e24b04fe55e3440eb73de5bc458)
- Initialization:
  [`8620f9d753e87fda140ae06dd739b33b917cc49670eacfd2f0392d876a1d2904`](https://stellar.expert/explorer/testnet/tx/8620f9d753e87fda140ae06dd739b33b917cc49670eacfd2f0392d876a1d2904)
- Active evidence record:
  [`b06abef3418b92f0b7d8778da659f3a8fe5819674184d70b64a70a49e76f02d9`](https://stellar.expert/explorer/testnet/tx/b06abef3418b92f0b7d8778da659f3a8fe5819674184d70b64a70a49e76f02d9)
- Revocation test record:
  registration
  [`8d39f23c77ff424111ce1ff8e255e999635774ec76f162fcc01f04b87bdd6a72`](https://stellar.expert/explorer/testnet/tx/8d39f23c77ff424111ce1ff8e255e999635774ec76f162fcc01f04b87bdd6a72)
  and revocation
  [`c7b9e2c74e21442c5b6edc13ba9c65b1ca6e8402ceb78f155d5c7877a69908ee`](https://stellar.expert/explorer/testnet/tx/c7b9e2c74e21442c5b6edc13ba9c65b1ca6e8402ceb78f155d5c7877a69908ee)

The active fixture returns `true`. The same verification call for the revoked
fixture returns `false`. The complete machine-readable record is in
`deployments/stellar-testnet-v0.1.json`.
