# SwissTokint Proof of Method

This repository is one public technical research stream of Association
SwissTokint. It contains work on POM-RX v0.1, pre-execution control,
verifiable evidence and selected distributed-infrastructure experiments. It
does not define the full scope of the Association.

POM-RX v0.1 structurally checks a supplied receipt chain describing a declared
preflight, execution acknowledgement and reconciliation path. The activated
strict profile adds bounded structural checks while remaining explicitly
non-authorizing. Financial environments are test beds; Filecoin, Stellar and
other chains are anchoring or integration experiments.

This research is non-custodial: it does not execute for third parties or
receive exchange keys, and makes no token-sale or financial-performance claim.

Open infrastructure for deterministic receipt commitments and inspectable
risk-rule evaluation without publishing the private strategy.

The repository currently contains four interoperable research building blocks:

1. a deterministic risk-rule engine whose results can be replayed and reviewed;
2. Proof Receipt v0.2, a signed commitment format with matching TypeScript and
   Python SDKs, deterministic Merkle batching and a minimal Docker relay;
3. POM-RX Core plus application profiles for bounded pre-execution control,
   exact authorization/Gate research, Witness evidence, execution evidence and
   observation/reconciliation;
4. distributed evidence/anchor experiments including Filecoin CAR storage and
   Stellar evidence-registry work.

The protocol is designed for trading bots, financial agents and other high-impact
automation, but this repository does not execute trades, hold assets or receive
exchange credentials.

## Why it exists

An autonomous agent can claim that it followed a method, respected a risk
policy or produced an event at a particular time. A dashboard alone does not
make that claim portable or independently verifiable. Proof of Method creates a
small evidence object that another party can verify without access to the
strategy, account or proprietary event payload.

The current prototype provides, in bounded reference form:

- canonical, cross-language payload hashing;
- signed receipt commitments;
- sensitive-field rejection before transmission;
- deterministic, domain-separated Merkle batches;
- inclusion proof generation and verification;
- a dry-run capable Docker relay;
- shared test fixtures for TypeScript and Python;
- deterministic, inspectable market-risk rules;
- activated POM-RX strict structural verification that remains non-authorizing;
- common exact-authorization and process-local single-use-Gate reference
  semantics;
- reference Witness trust, execution-evidence and observation/reconciliation
  layers;
- a Wallet Guard application profile with controlled EVM intent/policy/provider
  research;
- deterministic CARv1 evidence bundles with content-addressed receipt proofs;
- a fail-closed Synapse adapter boundary for prepare, upload and byte-for-byte
  retrieval verification.

## Repository map

| Path | Purpose |
| --- | --- |
| `ARCHITECTURE.md` | Product hierarchy and Core/application ownership rules |
| `core/` | Shared strict verification, authorization, Gate, reference-data, Witness, execution and observation semantics |
| `profiles/` | Cross-cutting profiles such as governance/DAGR framing |
| `applications/` | Domain-specific application blocks; Wallet Guard lives under Blockchain and digital assets |
| `integrations/` | Supporting Filecoin, Stellar and other evidence/anchor integrations |
| `compatibility/pom-rx-v0.1/` | Historical compatibility boundary |
| `docs/product/POM_RX_CAPABILITY_MAP.md` | Current non-normative POM-RX capability/information architecture |
| `docs/project-management/pom-rx-core/` | Versioned automation, review, blocker and cross-chat continuation control plane |
| `docs/PROOF_OF_METHOD_PROTOCOL.md` | Protocol thesis, safeguards and staged roadmap |
| `docs/PROOF_RECEIPT_V0_2_SPEC.md` | Receipt wire format and verification rules |
| `docs/PROOF_BATCH_V0_1_SPEC.md` | Deterministic Merkle batch format |
| `docs/POM_RX_PROTOCOL_V0_1.md` | Historical POM-RX v0.1 receipt protocol |
| `docs/FILECOIN_EVIDENCE_BUNDLE_V0_1.md` | CAR, CID and Synapse integration profile |
| `docs/MULTICHAIN_ANCHOR_ADAPTER_PROFILE_V0_1.md` | Normalized output and fail-closed rules for chain adapters |
| `docs/STELLAR_SOROBAN_MVP_V0_1.md` | Soroban evidence-registry scope, ABI and verification evidence |
| `docs/grants/FILECOIN_OPEN_GRANT_2159_READINESS.md` | Public grant-readiness evidence and remaining gaps |
| `schemas/` | JSON Schemas and cross-language fixtures |
| `sdk/typescript/` | TypeScript/Node shared and compatibility implementation |
| `sdk/python/` | Python reference implementation |
| `scripts/` | Relay, batch builder and portable verifier tooling |
| `examples/proof-relay/` | Minimal container deployment example |
| `src/` | Deterministic market-risk rule engine |
| `tests/` | Cross-language, POM-RX Core and application conformance/adversarial suites |

Shared canonicalization, hashing, verifier, Witness, exact-authorization, Gate,
execution-evidence and observation/reconciliation semantics remain common. An
application profile may add domain normalization, policy and adapters, but must
not fork those shared security semantics.

## Verify the prototype

Requirements: Node.js 22+, npm and Python 3.11+.

```bash
npm install
npm test
```

The proof fixtures intentionally use the same inputs in both SDKs. A passing
test run demonstrates that both languages derive the same receipt commitments,
Merkle root and inclusion proofs for the covered fixtures. It is not a production
security certification.

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

## POM-RX risk execution receipts

POM-RX v0.1 is the domain-specific research layer above generic Proof of
Method receipts. The historical verifier structurally checks a supplied receipt
chain describing a declared preflight, execution acknowledgement and
reconciliation path, without publishing strategy inputs, numeric limits or
credentials.

```js
import {
  commitPomRxReceipt,
  verifyPomRxChain,
} from './sdk/typescript/pom-rx.mjs';
```

The historical `verifyPomRxChain()` compatibility path is intentionally
preserved. Stronger bounded strict-profile verification and common
authorization/Gate reference work are additive rather than silent changes to the
historical API.

See [`docs/POM_RX_PROTOCOL_V0_1.md`](docs/POM_RX_PROTOCOL_V0_1.md) for the
historical scope and `docs/product/POM_RX_CAPABILITY_MAP.md` for the current
repository organization and explicit missing production properties.

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

## Security boundary

The public prototype is deliberately narrow:

- no custody of assets;
- no member exchange credentials;
- no order execution;
- no raw strategy payload sent to SwissTokint;
- no trading on behalf of another person;
- no token sale, token issuance or financial-performance claim.

Current POM-RX/Wallet Guard work is reference-only. It does not prove production
trusted time, production issuer/key custody, arbitrary-browser or extension
integrity, external EVM state/effect truth, complete crash recovery or real-wallet
safety. See [SECURITY.md](SECURITY.md) and [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md)
before integrating any relay or reference control.

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
