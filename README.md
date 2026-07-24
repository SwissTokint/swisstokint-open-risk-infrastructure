# SwissTokint Open Risk Infrastructure

An early open-source foundation for reproducible digital-market risk checks.

## What this repository is

This project provides a small, deterministic rule-evaluation core. A caller supplies a normalized market snapshot and a set of documented rules. The engine returns inspectable results that can be stored, replayed and reviewed.

The first public scope is deliberately narrow:

- no custody of assets;
- no exchange credentials;
- no order execution;
- no trading on behalf of anyone;
- no token sale, token issuance or financial-performance claim.

It is research and infrastructure code, not financial advice.

## First milestone

The prototype demonstrates three transparent rule types:

1. price moves beyond a configured percentage threshold;
2. spread exceeds a configured basis-point threshold;
3. volume is below a configured minimum.

Every result includes the rule identifier, its inputs, severity and a human-readable explanation. This makes a future dashboard or simulator explainable rather than opaque.

## Run locally

```bash
npm install
npm test
```

## Roadmap

- [ ] Publish the normalized event schema and data-quality policy.
- [ ] Add replayable scenario fixtures and report exports.
- [ ] Add a documented threat model and dependency policy.
- [ ] Add public examples for Ethereum-relevant data sources.
- [ ] Invite independent technical review.

## Governance and funding boundary

SwissTokint's association-led public-good work is kept separate from any future commercial company, hosted product, bot or token initiative. Grant-funded outputs will remain openly available where required by the applicable grant agreement.

## Licence

MIT. See [LICENSE](LICENSE).
