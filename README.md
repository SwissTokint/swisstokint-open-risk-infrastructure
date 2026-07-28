# SwissTokint Proof of Method

Open infrastructure for proving which method and risk policy governed an
autonomous financial action without publishing the private strategy.

This repository contains three interoperable building blocks:

1. a deterministic risk-rule engine whose results can be replayed and reviewed;
2. Proof Receipt v0.2, a signed commitment format with matching TypeScript and
   Python SDKs, deterministic Merkle batching and a minimal Docker relay;
3. a pre-grant Filecoin readiness prototype that packages receipt proofs into a
   deterministic CAR, derives a stable root CID and verifies every block and
   Merkle path after retrieval.
4. a normalized multichain anchor record profile that future network adapters
   must emit without hiding chain-specific finality or failure state.

The protocol is designed for trading bots and financial agents, but it does not
execute trades, hold assets or receive exchange credentials.

## Why it exists

An autonomous agent can claim that it followed a method, respected a risk
policy or produced an event at a particular time. A dashboard alone does not
make that claim portable or independently verifiable. Proof of Method creates a
small evidence object that another party can verify without access to the
strategy, account or proprietary event payload.

The current prototype provides:

- canonical, cross-language payload hashing;
- signed receipt commitments;
- sensitive-field rejection before transmission;
- deterministic, domain-separated Merkle batches;
- inclusion proof generation and verification;
- a dry-run capable Docker relay;
- shared test fixtures for TypeScript and Python;
- deterministic, inspectable market-risk rules.
- deterministic CARv1 evidence bundles with content-addressed receipt proofs;
- a fail-closed Synapse adapter boundary for prepare, upload and byte-for-byte
  retrieval verification.

## Repository map

| Path | Purpose |
| --- | --- |
| `docs/PROOF_OF_METHOD_PROTOCOL.md` | Protocol thesis, safeguards and staged roadmap |
| `docs/PROOF_RECEIPT_V0_2_SPEC.md` | Receipt wire format and verification rules |
| `docs/PROOF_BATCH_V0_1_SPEC.md` | Deterministic Merkle batch format |
| `docs/FILECOIN_EVIDENCE_BUNDLE_V0_1.md` | CAR, CID and Synapse integration profile |
| `docs/MULTICHAIN_ANCHOR_ADAPTER_PROFILE_V0_1.md` | Normalized output and fail-closed rules for chain adapters |
| `docs/STELLAR_SOROBAN_MVP_V0_1.md` | Soroban evidence-registry scope, ABI and verification evidence |
| `docs/AVALANCHE_FUJI_ACCEPTED_MONITOR_V0_1.md` | Avalanche-native accepted-transaction monitor and registry skeleton |
| `docs/grants/FILECOIN_OPEN_GRANT_2159_READINESS.md` | Public grant-readiness evidence and remaining gaps |
| `integrations/stellar-evidence-registry/` | Tested Soroban registry for proof-batch commitments |
| `schemas/` | JSON Schemas and cross-language fixtures |
| `sdk/typescript/` | TypeScript/Node reference implementation |
| `sdk/python/` | Python reference implementation |
| `scripts/` | Relay, batch builder and portable verifier |
| `examples/proof-relay/` | Minimal container deployment |
| `src/` | Deterministic risk-rule engine |
| `tests/` | Cross-language proof tests |

## Verify the prototype

Requirements: Node.js 22+, npm and Python 3.11+.

```bash
npm install
npm test
```

The proof fixtures intentionally use the same inputs in both SDKs. A passing
test run demonstrates that both languages derive the same receipt commitments,
Merkle root and inclusion proofs.

Build and verify the deterministic Filecoin CAR prototype:

```bash
node scripts/build-filecoin-bundle.mjs \
  schemas/examples/proof-batch-input-v0.1.json \
  proof-batch.car
node scripts/verify-filecoin-bundle.mjs proof-batch.car
```

The fixture always derives root CID
`bafkreid35libc4fqwf7wjssalgjd7vfdff6cu7akwek4enqmx4u3fxl53e`.
That CID identifies the CAR manifest. A Filecoin PieceCID returned by Synapse
identifies the uploaded storage piece and is a separate value.

To inspect a receipt without sending anything:

```bash
$env:PROOF_RECEIPT_DRY_RUN='true'
Get-Content schemas/examples/proof-event-v0.2.json |
  node scripts/proof-receipt-relay.mjs
```

On non-PowerShell shells:

```bash
PROOF_RECEIPT_DRY_RUN=true \
  node scripts/proof-receipt-relay.mjs \
  < schemas/examples/proof-event-v0.2.json
```

Test and build the Soroban evidence registry:

```bash
cd integrations/stellar-evidence-registry
cargo test
stellar contract build
```

The v0.1 optimized WASM is 7,390 bytes and hashes to
`c93cd79be735c208dc997cc942fd7219fdc16fb0445e84c30d066d431e2acb8d`.
It is deployed on Stellar Testnet as
[`CA6V2EUEGR4HFTRK3K5XOOGENH3Q2ZSHTBMHUG4LB3YOKDOLOETK2C5W`](https://lab.stellar.org/r/testnet/contract/CA6V2EUEGR4HFTRK3K5XOOGENH3Q2ZSHTBMHUG4LB3YOKDOLOETK2C5W).

Compile the non-custodial Avalanche registry and observe Fuji's
Avalanche-specific accepted-transaction stream:

```bash
npm run avalanche:compile
npm run avalanche:observe -- 1
```

The observation path is read-only and requires no wallet or private key.
A reproducible Fuji observation is recorded in
`deployments/avalanche-fuji-readonly-observation-v0.1.json`; the registry
contract itself is not yet deployed.

## Security boundary

The public prototype is deliberately narrow:

- no custody of assets;
- no member exchange credentials;
- no order execution;
- no raw strategy payload sent to SwissTokint;
- no trading on behalf of another person;
- no token sale, token issuance or financial-performance claim.

See [SECURITY.md](SECURITY.md) and
[docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) before integrating the relay.

## Roadmap

- [x] Publish Proof Receipt v0.2 and deterministic cross-language fixtures.
- [x] Add portable Merkle batching and inclusion proofs.
- [x] Publish a minimal Docker relay with local sensitive-field rejection.
- [x] Publish a bounded, deterministic CAR/CID readiness prototype.
- [x] Add a fail-closed Synapse upload and retrieval adapter boundary.
- [ ] Complete a Calibration testnet upload after the grant agreement permits
      funded work and a dedicated test wallet is approved.
- [ ] Publish repeatable 1k, 10k and 100k receipt benchmarks.
- [ ] Add retrieval-state monitoring across independent providers.
- [ ] Anchor batch roots on an EVM testnet.
- [x] Publish a chain-neutral anchor-record schema and cross-language fixture.
- [ ] Implement and independently reproduce a Solana devnet adapter.
- [x] Build and unit-test a Soroban evidence-registry MVP.
- [x] Deploy the Soroban registry to Stellar Testnet and publish a reproducible
      active/revoked verification trace.
- [ ] Add TypeScript bindings, an independent indexer and cost benchmarks.
- [ ] Implement and independently reproduce a Tezos Ghostnet adapter.
- [x] Build an Avalanche Fuji registry skeleton and accepted-transaction monitor.
- [ ] Deploy and independently reproduce the Avalanche adapter on Fuji.
- [ ] Add an ERC-8004 validation adapter.
- [ ] Add content-addressed batch storage and retrieval.
- [ ] Commission an independent cryptographic and application-security review.
- [ ] Run pilots with independent bot or agent teams.

## Token boundary

The protocol launches without a transferable token. Ordinary usage can be paid
in stablecoins or conventional currency. A future SWTK verifier bond is
considered only after independent demand, a live challenge process, security
reviews and legal analysis demonstrate that a portable slashable bond is
necessary. It would not confer equity, revenue share, association governance or
a performance claim.

## Governance and funding boundary

SwissTokint's open public-good work is kept separate from any future commercial
hosted product, trading service or token initiative. Grant-funded outputs remain
freely available under the applicable open-source grant agreement.

## Filecoin grant status

Open Grant proposal
[`filecoin-project/devgrants#2159`](https://github.com/filecoin-project/devgrants/issues/2159)
was submitted on 27 July 2026. It is under review and is not an award. The CAR
prototype in this repository is self-funded pre-grant readiness work; it is not
reported as a completed or reimbursable grant milestone. Live Filecoin storage,
benchmarking at the proposed scale and third-party reproduction remain within
the proposed post-agreement work plan.

## Licence

Code is dual-licensed under either Apache License 2.0 or MIT, at your option.
See [LICENSE](LICENSE), [LICENSE-APACHE](LICENSE-APACHE) and
[LICENSE-MIT](LICENSE-MIT). Documentation is available under
[CC BY-SA 4.0](LICENSE-DOCS).
