import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import * as compatibilityFilecoin from '../sdk/typescript/filecoin-evidence-bundle.mjs';
import * as canonicalFilecoin from '../integrations/filecoin/evidence-bundle.mjs';
import {
  buildFilecoinEvidenceBundle,
  inspectSynapseUpload,
  uploadAndVerifyWithSynapse,
  verifyFilecoinEvidenceBundle,
} from '../integrations/filecoin/evidence-bundle.mjs';

const receipts = JSON.parse(fs.readFileSync(
  new URL('../schemas/examples/proof-batch-input-v0.1.json', import.meta.url),
  'utf8',
));

test('legacy SDK Filecoin entry point remains an exact compatibility re-export', () => {
  const canonicalExports = Object.keys(canonicalFilecoin).sort();
  assert.deepEqual(Object.keys(compatibilityFilecoin).sort(), canonicalExports);
  for (const exportName of canonicalExports) {
    assert.equal(compatibilityFilecoin[exportName], canonicalFilecoin[exportName], exportName);
  }
});

test('Filecoin CAR bundle is deterministic and independently verifiable', async () => {
  const first = await buildFilecoinEvidenceBundle(receipts);
  const second = await buildFilecoinEvidenceBundle([...receipts].reverse());

  assert.equal(first.rootCid, second.rootCid);
  assert.deepEqual(first.bytes, second.bytes);
  assert.equal(
    first.rootCid,
    'bafkreid35libc4fqwf7wjssalgjd7vfdff6cu7akwek4enqmx4u3fxl53e',
  );

  const verification = await verifyFilecoinEvidenceBundle(first.bytes);
  assert.equal(verification.ok, true);
  assert.equal(verification.rootCid, first.rootCid);
  assert.equal(verification.proofs.length, receipts.length);
  assert.equal(verification.blockCount, receipts.length + 1);
});

test('Filecoin CAR verifier rejects tampered bytes', async () => {
  const bundle = await buildFilecoinEvidenceBundle(receipts);
  const tampered = Buffer.from(bundle.bytes);
  tampered[tampered.length - 1] ^= 0x01;
  await assert.rejects(
    verifyFilecoinEvidenceBundle(tampered),
    /CID hash does not match|Merkle proof|canonical JSON|Unexpected end|invalid/i,
  );
});

test('Filecoin bundle input excludes unknown data before publication', async () => {
  await assert.rejects(
    buildFilecoinEvidenceBundle([{
      ...receipts[0],
      private_key: 'must-never-be-published',
    }]),
    /missing or unknown|unknown fields/i,
  );
});

test('Synapse adapter is dry by default and verifies retrieval bytes', async () => {
  const bundle = await buildFilecoinEvidenceBundle(receipts);
  const fakeSynapse = {
    storage: {
      async prepare({ dataSize }) {
        assert.equal(dataSize, BigInt(bundle.bytes.byteLength));
        return { costs: { ready: true }, transaction: null };
      },
      async upload(bytes) {
        return {
          pieceCid: 'baga6ea4seaq-test-piece',
          size: bytes.byteLength,
          complete: true,
          copies: [{ provider: 'test-a' }, { provider: 'test-b' }],
        };
      },
      async download() {
        return bundle.bytes;
      },
    },
  };

  const preparation = await inspectSynapseUpload(fakeSynapse, bundle.bytes);
  assert.equal(preparation.costs.ready, true);
  await assert.rejects(
    uploadAndVerifyWithSynapse(fakeSynapse, bundle.bytes),
    /confirm=true/,
  );

  const stored = await uploadAndVerifyWithSynapse(
    fakeSynapse,
    bundle.bytes,
    { confirm: true },
  );
  assert.equal(stored.copies, 2);
  assert.equal(stored.verifiedByteLength, bundle.bytes.byteLength);
});

test('Synapse adapter refuses to hide required funding transactions', async () => {
  const bundle = await buildFilecoinEvidenceBundle(receipts);
  const fakeSynapse = {
    storage: {
      async prepare() {
        return { transaction: { execute() {} } };
      },
      async upload() {
        throw new Error('must not be called');
      },
      async download() {
        throw new Error('must not be called');
      },
    },
  };

  await assert.rejects(
    uploadAndVerifyWithSynapse(fakeSynapse, bundle.bytes, { confirm: true }),
    /funding or approval is required/,
  );
});
