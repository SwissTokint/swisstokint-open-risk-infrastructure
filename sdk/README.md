# SwissTokint Proof of Method SDKs

The SDKs implement the portable `pom-receipt/0.2` profile in TypeScript and Python.

They:

- canonicalise a safe local event payload;
- calculate `payload_hash` locally;
- create a wire receipt that contains no raw payload;
- reproduce the public commitment and commitment hash;
- authenticate the ingestion request;
- verify stored commitment hashes and Ed25519 signatures.

## TypeScript

Requires Node.js 20 or newer.

```js
import {
  createWireReceipt,
  prepareCommitment,
  submitReceipt,
} from './typescript/swisstokint-proof.mjs';

const event = {
  kind: 'signal',
  subject_ref: 'allmarkets-v2/BTCUSDT/trailing_armed',
  method_hash: '<sha256>',
  risk_policy_hash: '<sha256>',
  payload: {
    event: 'trailing_armed',
    strategy_version: 'AllMarketsV2@7d9928f',
    risk_policy_version: 'risk-v2',
  },
};

const receipt = createWireReceipt(event, { sourceKeyId: 'docker-relay-v2' });
const preview = prepareCommitment(receipt);
console.log(preview.commitmentHash);

await submitReceipt(
  'https://swisstokint.ch/api/proof-of-method/receipts',
  receipt,
  process.env.PROOF_RECEIPT_INGEST_SECRET,
);
```

## Python

Requires Python 3.10 or newer and `cryptography`.

```python
from swisstokint_proof import create_wire_receipt, prepare_commitment

event = {
    "kind": "signal",
    "subject_ref": "allmarkets-v2/BTCUSDT/trailing_armed",
    "method_hash": "<sha256>",
    "risk_policy_hash": "<sha256>",
    "payload": {
        "event": "trailing_armed",
        "strategy_version": "AllMarketsV2@7d9928f",
        "risk_policy_version": "risk-v2",
    },
}

receipt = create_wire_receipt(event, source_key_id="python-bot-v2")
preview = prepare_commitment(receipt)
print(preview["commitment_hash"])
```

The Python module deliberately leaves HTTP transport to the application so each bot can use its established retry, observability and secret-management stack.

## Cross-language conformance

The same fixture is tested in both languages:

```text
npm run test:proof
```

The fixture lives under `schemas/examples`. A release must not change its payload hash or commitment hash without changing the protocol version.

## Portable public verification

Anyone can independently fetch and verify a public receipt:

```text
node scripts/verify-proof-receipt.mjs <receipt-id>
```

The verifier checks the commitment hash, the agreement between the signed commitment and the public receipt fields, and the Ed25519 signature. It does not treat a valid L0 receipt as evidence of profitability.

## Merkle batches

Both SDKs implement `pom-batch/0.1`. The TypeScript CLI builds an offline batch:

```text
node scripts/build-proof-batch.mjs schemas/examples/proof-batch-input-v0.1.json
```

`buildMerkleBatch` / `build_merkle_batch` return the deterministic root and one inclusion proof per receipt. `verifyMerkleProof` / `verify_merkle_proof` recompute the root independently. The current implementation does not submit blockchain transactions.

## Security

- Do not place a trading key in the relay container.
- Pass the transport secret through the runtime secret manager.
- Do not log the raw event if it contains confidential material.
- Treat `subject_ref`, all hashes and timestamps as public.
- Keep the raw evidence locally if later L2 verification is required.
- Never claim that a valid receipt proves profitability.
