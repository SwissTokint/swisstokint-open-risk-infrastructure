# SwissTokint Stellar Evidence Registry

Minimal Soroban contract for the SwissTokint Proof of Method protocol.

It stores compact integrity commitments for an off-chain evidence batch:

- a deterministic batch identifier;
- the batch Merkle root;
- the canonical manifest hash;
- the evidence archive hash;
- the authorized issuer and registration ledger;
- an active or revoked status with a hashed revocation reason.

The contract does not custody assets, execute trades, calculate performance, or
store personal data. Evidence remains off-chain and is independently
recomputable.

## Security model

- Initialization requires the future administrator's authorization.
- Only administrator-approved writer addresses can register records.
- Batch identifiers are immutable and cannot be overwritten.
- Only the original issuer or administrator can revoke a record.
- Arbitrary public writes are disabled to prevent storage-exhaustion attacks.
- Records and administrative entries extend their ledger TTL when used.

This is an MVP and has not been independently audited. Testnet deployment does
not imply production readiness.

## Test and build

```shell
cargo test
stellar contract build
```

The compiled contract is produced under
`target/wasm32v1-none/release/swisstokint_evidence_registry.wasm`.
