# Proof of Method protocol — utility blueprint

Status: technical research, 27 July 2026. This is not a token offer, a white paper, investment advice or a solicitation.

## Recommendation

SwissTokint should not begin with a token sale. It should begin with a usable **Proof of Method** service: a portable, privacy-preserving record that proves *when* a risk method, a strategy version, an execution event or a project decision existed, and whether it was independently reviewed.

The first product is valuable without a token. A token is considered only after there are independent verifiers, a scarce verification resource and an operating need for cryptoeconomic bonding.

## The concrete problem

Trading research, signal engines and community project votes are often presented through editable dashboards. A reader cannot reliably tell:

- which version of the method produced an event;
- whether an event was recorded before or after its outcome;
- whether a result was reviewed by a party other than the operator;
- whether a community decision was changed after the vote.

The protocol must prove the integrity of the process, not assert profitability, predict markets or custody user funds.

## Version 1 — no token

### 1. Signed private receipts

The private bot emits a signed event receipt for a strategy event. It contains a strategy-version hash, an event type, timestamp, nonce, risk-policy version and encrypted or hashed payload. It must never contain exchange keys, member balances, source-code secrets or personal data.

### 2. Public commitments

At regular intervals, a Merkle root of receipts is anchored on an EVM chain. A member can later verify that a receipt was included without making the underlying signal public. The same format covers research runs, audit milestones and member-vote receipts.

### 3. Independent attestations

An external reviewer can issue a bounded attestation: format valid, evidence available, reproducibility checked, limitation identified or review revoked. Ethereum Attestation Service (EAS) is a suitable interoperable registry because it supports on-chain and off-chain attestations, schemas, revocation and optional resolver contracts.

### 4. Portable verifier

SwissTokint publishes an open verifier that recomputes the hash path, checks the signature, checks the EAS attestation state and presents only the evidence the contributor agreed to disclose.

## Governance design

Association governance stays outside the token economy:

- eligible contributing members: one member, one vote;
- a vote gets a signed, timestamped, tamper-evident receipt;
- token ownership cannot buy association voting power;
- the initial on-chain component is an attestation registry, not an autonomous treasury.

If executable governance is introduced later, it requires a multisignature controller, an explicit delay before execution and an emergency cancellation policy. A timelock is a standard safeguard because it gives affected users time to react before a privileged change takes effect.

## The only credible future utility for a transferable token

### Verifier bond, not an investment token

Once SwissTokint has a live registry and independent external reviewers, a transferable network asset could be used as a **verifier bond**. A verifier would lock it to obtain the right to issue high-assurance attestations. The bond is subject to a published challenge and dispute procedure; dishonest or unsupported attestations can result in a defined loss of bond after due process.

The token would have three protocol-level functions only:

1. **Bond a verifier identity** — limit Sybil reviewers and make an attestation economically accountable.
2. **Bond a high-assurance claim** — require a refundable commitment for a project, research result or model claim submitted to the open registry.
3. **Pay or reward verification work** — remunerate accepted independent reviews and dispute resolution from fees paid for verification jobs.

The token must not confer equity, revenue share, a claim on SwissTokint funds, a buyback expectation, a yield promise or a vote in the association. It must not be marketed on expected price appreciation.

## Why this is materially better than a generic access token

An access token can normally be replaced by card payment, a subscription or a database role. A verifier bond cannot be replaced so simply when the goal is a permissionless, auditable network of reviewers with an economic cost for misconduct. The proposed asset is therefore conditional on a demonstrated verifier market; if that market does not exist, SwissTokint should not issue a token.

## Funding logic — only after product proof

The correct sequence is:

1. Deliver the no-token registry, signed receipts and member portal.
2. Run a limited reviewer programme using conventional payments; measure independent reviews, disputes, repeat users and verification cost.
3. Publish the protocol specification, security model, privacy model and measured results.
4. Obtain legal classification and AML/sanctions analysis for every target market.
5. Audit the contracts and run a public testnet with no monetary value.
6. Only then evaluate a restricted issuance of a genuinely usable verifier-bond asset, with full disclosure and no performance marketing.

The project can be funded by a token only at the last step, when buyers receive a currently usable protocol function. A pre-sale that promises future access while the protocol is still being built is a high-risk structure and must not be presented as a utility-token shortcut.

## Measurable decision gate before any issuance

Do not proceed unless all are true for a sustained pilot period:

- at least three independent reviewers are completing attestations;
- at least one third party verifies proofs without a SwissTokint dashboard;
- the public verifier is reproducible from open documentation;
- the challenge process has been tested with synthetic disputes;
- the cost, latency and privacy impact of anchoring are documented;
- an external legal review confirms the planned market, distribution and communications;
- an independent security review covers contracts, key management, emergency controls and incident response.

## Technical base to evaluate

- EAS for schema-based, revocable on-chain or off-chain attestations.
- An EVM L2 selected after cost, availability and ecosystem review; EAS documents a Base index endpoint among supported networks.
- ERC-4337 smart accounts only if they simplify user-controlled proofs or gas sponsorship. They must never receive exchange credentials or authority to trade for members.
- A standard OpenZeppelin timelock and multisignature for any future contract administration.

## MVP relay contract

The implementation exposes `POST /api/proof-of-method/receipts`. New integrations use `pom-receipt/0.2`: the private SDK hashes the event payload locally, removes it and sends only a compact commitment. The service therefore receives and stores **no raw v0.2 payload**. The private relay must keep the source event and any sensitive strategy material locally.

Required request headers:

```text
Content-Type: application/json
X-Proof-Timestamp: unix timestamp in seconds
X-Proof-Signature: lowercase HMAC-SHA256 hex of "<timestamp>.<exact raw JSON body>"
```

`X-Proof-Signature` uses `PROOF_RECEIPT_INGEST_SECRET`, has a five-minute replay window and is distinct from the existing signal-ingestion credential. Each wire receipt also contains a cryptographically random `receipt_id` and `nonce`; the server stores only the hash of the nonce and rejects replays.

For every accepted receipt, the server builds a canonical public commitment and signs it with an Ed25519 key. The public verification key is available at `GET /api/proof-of-method/public-key`; a receipt's safe, public fields **and the exact public key that signed it** are available at `GET /api/proof-of-method/receipts/{receipt_id}`.

Generate the server key once in a secure terminal and store only the output in the Vercel secret `PROOF_RECEIPT_SIGNING_PRIVATE_KEY_B64`:

```bash
node -e "const c=require('crypto'); const {privateKey}=c.generateKeyPairSync('ed25519'); console.log(privateKey.export({type:'pkcs8',format:'der'}).toString('base64'))"
```

The corresponding public key is derived by the server and can be distributed safely. Rotate by deploying a newly generated private key with a new `PROOF_RECEIPT_SIGNING_KEY_ID`; never overwrite a key needed to verify historical receipts.

## Docker relay reference

`scripts/proof-receipt-relay.mjs` is a deliberately small sidecar helper for the existing private bot environment. It reads one compact JSON event from stdin, adds a receipt ID and nonce if needed, signs the exact request body and calls the receipt API.

The Docker container needs only these runtime environment variables:

```text
SWISSTOKINT_PROOF_RECEIPT_URL=https://swisstokint.ch/api/proof-of-method/receipts
PROOF_RECEIPT_INGEST_SECRET=<private relay secret>
PROOF_RECEIPT_SOURCE_KEY_ID=docker-relay-v1
```

Example input from a private strategy-event adapter:

```json
{
  "kind": "signal",
  "subject_ref": "allmarkets-v2/BTCUSDT/trailing_armed",
  "method_hash": "<sha256 of the versioned strategy or method>",
  "risk_policy_hash": "<sha256 of the versioned risk policy>",
  "payload": {
    "event": "trailing_armed",
    "strategy_version": "AllMarketsV2@<commit>",
    "risk_policy_version": "risk-v1"
  }
}
```

The adapter must retain the raw event locally. The v0.2 SDK calculates its hash before transmission; the website receives only the resulting `payload_hash`, then stores the commitment, nonce hash and server signature. Do not include price-sensitive source data unless it is intentionally suitable for a local hash commitment; never include keys, balances, wallet data, personal data or source code.

The normative wire schema, security profile and compatibility rules are documented in `docs/PROOF_RECEIPT_V0_2_SPEC.md`. Portable TypeScript and Python implementations are under `sdk/`.

## Regulatory guardrails

FINMA classifies tokens by economic function. It treats a utility token as digital access to an application or service, but the token must be usable for that access at issue; an investment purpose makes it a security in FINMA's analysis. FINMA also treats pre-financing or pre-sale claims to future tokens as securities where they are standardised and suitable for mass trading. The EU's MiCA framework regulates issuance and crypto-asset services and includes disclosure, organisational, IT-security and AML/CTF requirements.

For that reason, no public sale, token price, allocation, yield wording, liquidity promise or treasury speculation is permitted until a qualified legal assessment covers the exact facts and target jurisdictions.

## Primary references consulted

- FINMA, [Guidelines for enquiries regarding the regulatory framework for ICOs](https://www.finma.ch/en/~/media/finma/dokumente/dokumentencenter/myfinma/1bewilligung/fintech/wegleitung-ico.pdf?hash=83EE49D77DA54DD079F314D9EDCBDC3D&sc_lang=en).
- FINMA, [Cryptoassets fact sheet](https://www.finma.ch/en/~/media/finma/dokumente/dokumentencenter/myfinma/faktenblaetter/faktenblatt-kryptobasierte-vermoegenswerte.pdf).
- European Commission, [MiCA overview](https://finance.ec.europa.eu/digital-finance/crypto-assets_en).
- Ethereum Attestation Service, [documentation](https://docs.attest.org/docs/welcome) and [EAS SDK](https://docs.attest.org/docs/developer-tools/eas-sdk).
- Ethereum, [ERC-4337 account abstraction](https://eips.ethereum.org/EIPS/eip-4337).
- OpenZeppelin, [governance and timelock documentation](https://docs.openzeppelin.com/contracts/5.x/api/governance).
