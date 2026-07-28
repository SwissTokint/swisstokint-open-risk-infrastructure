# Aptos Proof Commitment Registry

Status: self-funded pre-grant Move prototype. Compilation and unit-test evidence
must be green before it is described as working. Testnet publication is a
separate gate.

The package stores only 32-byte public commitments in the registry owned by
each publishing account. It has no token, custody, payment, exchange credential
or trade-execution path.

## Aptos-native design

- The registry is an account-owned Move resource.
- `Table<vector<u8>, Commitment>` gives first-write-wins batch lookup without a
  global administrator.
- The publishing signer is the only account able to mutate its registry.
- Generic module events make registration and revocation observable.
- The read-only `verify` view checks exact values and revocation state.

## Lifecycle

1. `initialize` creates one registry resource under the publishing account.
2. `register` accepts four exact 32-byte values and rejects reuse of a batch ID.
3. `verify` returns true only for the exact live commitment.
4. `revoke` marks the issuer's batch as revoked; it cannot be reversed.

Unit tests also attempt a cross-account revocation and require it to abort.

## Reproduce

Use Aptos CLI 9.4.0 or the version pinned by CI. The Aptos Framework
dependency is pinned to commit
`eea778c2276e302119d6e469ec3dd0b78fcce039`:

```bash
aptos move compile --dev --package-dir integrations/aptos-proof-registry
aptos move test --dev --package-dir integrations/aptos-proof-registry
aptos move lint --dev --package-dir integrations/aptos-proof-registry --checks strict
```

The `0xcafe` address is test-only and is declared under `dev-addresses`.
Publication must explicitly bind `proof_registry` to the dedicated publishing
account:

```bash
aptos move publish \
  --profile swisstokint-testnet \
  --package-dir integrations/aptos-proof-registry \
  --named-addresses proof_registry=<TESTNET_ACCOUNT_ADDRESS>
```

## Security boundary

- no shared administrator or arbitrary write authority;
- no overwrite or un-revoke path;
- no private strategy, balance, order or credential fields;
- no claims of trading performance;
- no assertion that an on-chain hash proves the truth of off-chain content.

The first public testnet deployment must use a dedicated test-only account,
publish the package address and transaction version, and retain an explicit
testnet-only label.
