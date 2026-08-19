import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  createPomRxSourceEnvelope,
  createPomRxWitnessAck,
  pomRxKeyId,
  verifyPomRxSourceEnvelope,
  verifyPomRxWitnessAck,
} from '../sdk/typescript/pom-rx-witness.mjs';
import {
  commitPomRxReceipt,
} from '../sdk/typescript/pom-rx.mjs';

const hash = (character) => character.repeat(64);

function createKeys() {
  return crypto.generateKeyPairSync('ed25519');
}

function preflightReceipt(sourcePublicKey, overrides = {}) {
  return {
    schema_version: 'pom-rx/0.1',
    receipt_id: 'receipt_witness_20260819',
    run_id: 'run_witness_demo_20260819',
    phase: 'preflight',
    outcome: 'allow',
    agent_ref: 'wallet-guard:test-agent',
    subject_ref: 'wallet:burner-test',
    method_hash: hash('a'),
    policy_hash: hash('b'),
    input_commitment: hash('c'),
    action_commitment: hash('d'),
    assertions: [{
      rule_id: 'wallet-guard-policy',
      rule_hash: hash('e'),
      result: 'pass',
      proof_mode: 'commitment',
      evidence_hash: hash('f'),
    }],
    previous_receipt_hash: null,
    occurred_at: '2026-08-19T05:00:00.000Z',
    source_key_id: pomRxKeyId(sourcePublicKey),
    ...overrides,
  };
}

test('source envelope binds one Ed25519 identity to the exact receipt commitment', () => {
  const source = createKeys();
  const receipt = preflightReceipt(source.publicKey);
  const envelope = createPomRxSourceEnvelope(receipt, source.privateKey);
  const verified = verifyPomRxSourceEnvelope(envelope);

  assert.equal(verified.ok, true);
  assert.equal(verified.receiptHash, commitPomRxReceipt(receipt).receiptHash);
  assert.equal(verified.sourceKeyId, receipt.source_key_id);
});

test('source envelope rejects receipt, key and signature substitution', () => {
  const source = createKeys();
  const other = createKeys();
  const envelope = createPomRxSourceEnvelope(preflightReceipt(source.publicKey), source.privateKey);

  assert.equal(verifyPomRxSourceEnvelope({
    ...envelope,
    receipt: { ...envelope.receipt, action_commitment: hash('1') },
  }).ok, false);

  const otherEnvelope = createPomRxSourceEnvelope(preflightReceipt(other.publicKey), other.privateKey);
  assert.equal(verifyPomRxSourceEnvelope({
    ...envelope,
    source_public_key: otherEnvelope.source_public_key,
  }).ok, false);

  const signatureBytes = Buffer.from(envelope.source_signature, 'base64');
  signatureBytes[0] ^= 1;
  assert.equal(verifyPomRxSourceEnvelope({
    ...envelope,
    source_signature: signatureBytes.toString('base64'),
  }).ok, false);
});

test('witness acknowledgement is signed, expectation-bound and time-bounded', () => {
  const source = createKeys();
  const witness = createKeys();
  const envelope = createPomRxSourceEnvelope(preflightReceipt(source.publicKey), source.privateKey);
  const ack = createPomRxWitnessAck(envelope, witness.privateKey, {
    receivedAt: '2026-08-19T05:00:01.000Z',
    validForMs: 30_000,
    mode: 'witnessed',
  });

  const verified = verifyPomRxWitnessAck(ack, {
    receiptHash: envelope.receipt_hash,
    receiptId: envelope.receipt.receipt_id,
    runId: envelope.receipt.run_id,
    sourceKeyId: envelope.receipt.source_key_id,
    witnessKeyId: pomRxKeyId(witness.publicKey),
    mode: 'witnessed',
    requireUnexpired: true,
    currentTime: '2026-08-19T05:00:10.000Z',
  });

  assert.equal(verified.ok, true);
  assert.equal(verified.payload.valid_until, '2026-08-19T05:00:31.000Z');
  assert.equal(verifyPomRxWitnessAck(ack, {
    requireUnexpired: true,
    currentTime: '2026-08-19T05:00:32.000Z',
  }).ok, false);
  assert.equal(verifyPomRxWitnessAck(ack, {
    requireUnexpired: true,
    currentTime: '2026-08-19T04:59:59.000Z',
  }).ok, false);
});

test('authorization callers can reject dry-run acknowledgements and wrong witness identity', () => {
  const source = createKeys();
  const witness = createKeys();
  const otherWitness = createKeys();
  const envelope = createPomRxSourceEnvelope(preflightReceipt(source.publicKey), source.privateKey);
  const dryRunAck = createPomRxWitnessAck(envelope, witness.privateKey, {
    receivedAt: '2026-08-19T05:00:01.000Z',
    mode: 'dry_run',
  });

  assert.equal(verifyPomRxWitnessAck(dryRunAck, { mode: 'witnessed' }).ok, false);
  assert.equal(verifyPomRxWitnessAck(dryRunAck, {
    witnessKeyId: pomRxKeyId(otherWitness.publicKey),
  }).ok, false);
});

test('source and witness signing identities must be distinct', () => {
  const source = createKeys();
  const envelope = createPomRxSourceEnvelope(preflightReceipt(source.publicKey), source.privateKey);

  assert.throws(
    () => createPomRxWitnessAck(envelope, source.privateKey, {
      receivedAt: '2026-08-19T05:00:01.000Z',
    }),
    /must be distinct/,
  );
});

test('witness refuses non-preflight receipts', () => {
  const source = createKeys();
  const witness = createKeys();
  const execution = preflightReceipt(source.publicKey, {
    receipt_id: 'receipt_execution_20260819',
    phase: 'execution',
    outcome: 'accepted',
    previous_receipt_hash: hash('1'),
  });
  const envelope = createPomRxSourceEnvelope(execution, source.privateKey);

  assert.throws(
    () => createPomRxWitnessAck(envelope, witness.privateKey),
    /preflight receipts only/,
  );
});

test('witness acknowledgement tampering fails signature verification', () => {
  const source = createKeys();
  const witness = createKeys();
  const envelope = createPomRxSourceEnvelope(preflightReceipt(source.publicKey), source.privateKey);
  const ack = createPomRxWitnessAck(envelope, witness.privateKey, {
    receivedAt: '2026-08-19T05:00:01.000Z',
  });

  assert.equal(verifyPomRxWitnessAck({ ...ack, outcome: 'deny' }).ok, false);
  assert.equal(verifyPomRxWitnessAck({ ...ack, receipt_hash: hash('9') }).ok, false);
});

test('salvaged schemas remain strict and explicitly non-authorizing in description', () => {
  for (const schemaPath of [
    'schemas/pom-rx-source-envelope-v0.1.schema.json',
    'schemas/pom-rx-witness-ack-v0.1.schema.json',
  ]) {
    const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
    assert.equal(schema.additionalProperties, false);
    assert.match(schema.description, /does not establish|does not establish/i);
  }
});
