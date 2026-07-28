# Aptos Ecosystem Grant Readiness

Status: **pre-application — traction gate not met**

Last programme review: **28 July 2026**

Official route: <https://aptosnetwork.com/grants/ecosystem>

## Decision

SwissTokint should not submit an Aptos Ecosystem Grant application yet.
The official programme currently requires a live product and evidence of user
adoption, market demand or community growth.

The Move package and its first verified Aptos testnet lifecycle are self-funded
readiness evidence. They are not an awarded milestone or reimbursable grant
work.

## Current public evidence

- Aptos CLI 9.4.0 official archive pinned and verified by SHA-256 in CI;
- Aptos Framework pinned to commit
  `eea778c2276e302119d6e469ec3dd0b78fcce039`;
- compilation passes;
- five Move lifecycle and misuse tests pass;
- strict Move lints pass;
- the general repository test and dependency-audit workflow passes.
- the package is published on Aptos testnet;
- local source successfully matches the published bytecode;
- register, verify-true, revoke and verify-false are publicly recorded.

The tests cover registration, exact verification, revocation, duplicate
rejection, malformed input, repeated revocation and cross-account revocation.

## Pre-application gates

- [x] publish the package with a dedicated test-only account;
- [x] publish the transaction version, module address and explorer URL;
- [x] reproduce register, verify, revoke and verify-false on testnet;
- [x] publish a machine-readable deployment record;
- [ ] process at least 100 verifiable test batches;
- [ ] obtain two independent clean-environment reproductions;
- [ ] obtain one Aptos-native pilot or integration confirmation;
- [ ] publish a fixed-window adoption or community-growth measure.

Progress is tracked in
[issue #21](https://github.com/SwissTokint/swisstokint-open-risk-infrastructure/issues/21).

## Future grant scope

Only work performed after a written agreement may enter a future milestone:

1. production registry specification, upgrade policy and migration tests;
2. TypeScript SDK, event indexer and read-only status API;
3. deterministic 1k, 10k and 100k-batch benchmarks;
4. two additional Aptos-native reference integrations;
5. independent security review, remediation and maintenance documentation.

Indicative request after the traction gate: **USD 35,000**, within the
programme's currently stated typical range of USD 5,000 to USD 50,000.

## Scope boundary

The Aptos work package excludes:

- the completed pre-grant prototype;
- work billed to Filecoin, Stellar, Solana, Tezos, Avalanche or Uniswap;
- token issuance or sale;
- asset custody, exchange credentials or trade execution;
- trading-performance, partnership, adoption or award claims without evidence.

Every funded deliverable must have a unique acceptance record and may be
invoiced to only one programme.
