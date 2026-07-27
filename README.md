# SwissTokint Proof of Method

Open infrastructure for proving which method and risk policy governed an
autonomous financial action without publishing the private strategy.

This repository contains two interoperable building blocks:

1. a deterministic risk-rule engine whose results can be replayed and reviewed;
2. Proof Receipt v0.2, a signed commitment format with matching TypeScript and
   Python SDKs, deterministic Merkle batching and a minimal Docker relay.

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

## Repository map

| Path | Purpose |
| --- | --- |
| `docs/PROOF_OF_METHOD_PROTOCOL.md` | Protocol thesis, safeguards and staged roadmap |
| `docs/PROOF_RECEIPT_V0_2_SPEC.md` | Receipt wire format and verification rules |
| `docs/PROOF_BATCH_V0_1_SPEC.md` | Deterministic Merkle batch format |
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
- [ ] Anchor batch roots on an EVM testnet.
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

## Licence

MIT. See [LICENSE](LICENSE).
