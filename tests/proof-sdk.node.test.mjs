import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';

import {
  canonicalizePayload,
  buildMerkleBatch,
  commitPayload,
  createWireReceipt,
  prepareCommitment,
  signTransport,
  verifyMerkleProof,
  verifyStoredReceipt,
} from '../sdk/typescript/swisstokint-proof.mjs';

const event = JSON.parse(fs.readFileSync(
  new URL('../schemas/examples/proof-event-v0.2.json', import.meta.url),
  'utf8',
));
const expected = JSON.parse(fs.readFileSync(
  new URL('../schemas/examples/proof-receipt-v0.2.expected.json', import.meta.url),
  'utf8',
));
const batchInput = JSON.parse(fs.readFileSync(
  new URL('../schemas/examples/proof-batch-input-v0.1.json', import.meta.url),
  'utf8',
));
const expectedBatch = JSON.parse(fs.readFileSync(
  new URL('../schemas/examples/proof-batch-v0.1.expected.json', import.meta.url),
  'utf8',
));

test('Receipt v0.2 matches the cross-language fixture', () => {
  const wireReceipt = createWireReceipt(event);
  const payload = commitPayload(event.payload);
  const prepared = prepareCommitment(wireReceipt);

  assert.deepEqual(wireReceipt, expected.wire_receipt);
  assert.equal(payload.canonicalPayload, expected.canonical_payload);
  assert.equal(prepared.commitment, expected.commitment);
  assert.equal(prepared.commitmentHash, expected.commitment_hash);
});

test('payload validation rejects credentials, balances and floating-point values', () => {
  assert.throws(() => canonicalizePayload({ api_key: 'not-allowed' }), /Sensitive payload key/);
  assert.throws(() => canonicalizePayload({ balance: 100 }), /Sensitive payload key/);
  assert.throws(() => canonicalizePayload({ confidence: 0.75 }), /safe integers/);
});

test('transport HMAC is stable for the exact body and timestamp', () => {
  const body = JSON.stringify(expected.wire_receipt);
  const signed = signTransport(body, 'a'.repeat(64), '1785147330');
  assert.deepEqual(signed, {
    timestamp: '1785147330',
    signature: 'a6397da1d4380f3d2b329fb676e0d1f3f9577ade246114c0be794d3daf9c0bcb',
  });
});

test('stored receipt verification detects signature and commitment tampering', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  const signature = crypto.sign(
    null,
    Buffer.from(expected.commitment, 'utf8'),
    privateKey,
  ).toString('base64');
  const record = {
    commitment: expected.commitment,
    commitment_hash: expected.commitment_hash,
    server_signature: signature,
    server_public_key: publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
  };

  assert.deepEqual(verifyStoredReceipt(record), {
    ok: true,
    commitmentHashValid: true,
    commitmentFieldsValid: true,
    signatureValid: true,
  });
  assert.equal(verifyStoredReceipt({ ...record, commitment: `${record.commitment} ` }).ok, false);
  assert.equal(verifyStoredReceipt({ ...record, server_signature: Buffer.from('invalid').toString('base64') }).ok, false);
});

test('Merkle batch and inclusion proofs match the cross-language fixture', () => {
  const batch = buildMerkleBatch(batchInput);
  assert.deepEqual(batch, expectedBatch);
  for (const leaf of batch.leaves) {
    assert.equal(
      verifyMerkleProof(leaf.commitment_hash, leaf.proof, batch.merkle_root),
      true,
    );
  }
  assert.equal(
    verifyMerkleProof(`${batch.leaves[0].commitment_hash.slice(0, -1)}0`, batch.leaves[0].proof, batch.merkle_root),
    false,
  );
});

test('Merkle batch rejects unknown public fields', () => {
  assert.throws(
    () => buildMerkleBatch([{ ...batchInput[0], private_key: 'must-never-be-published' }]),
    /missing or unknown fields/,
  );
});
