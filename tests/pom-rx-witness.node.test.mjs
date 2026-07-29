import assert from 'node:assert/strict';
import crypto from 'node:crypto';
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
import {
  createPomRxWitnessServer,
} from '../scripts/pom-rx-preflight-witness.mjs';

const hash = (character) => character.repeat(64);
const sourceKeys = crypto.generateKeyPairSync('ed25519');
const witnessKeys = crypto.generateKeyPairSync('ed25519');

function preflightReceipt(overrides = {}) {
  return {
    schema_version: 'pom-rx/0.1',
    receipt_id: 'receipt_witness_20260729',
    run_id: 'run_witness_demo_20260729',
    phase: 'preflight',
    outcome: 'allow',
    agent_ref: 'eip155:84532:erc8004:agent-42',
    subject_ref: 'market:BTC-USD',
    method_hash: hash('a'),
    policy_hash: hash('b'),
    input_commitment: hash('c'),
    action_commitment: hash('d'),
    assertions: [{
      rule_id: 'max-notional',
      rule_hash: hash('e'),
      result: 'pass',
      proof_mode: 'commitment',
      evidence_hash: hash('f'),
    }],
    previous_receipt_hash: null,
    occurred_at: '2026-07-29T06:00:00.000Z',
    source_key_id: pomRxKeyId(sourceKeys.publicKey),
    ...overrides,
  };
}

test('source envelope binds an Ed25519 identity to the exact preflight receipt', () => {
  const receipt = preflightReceipt();
  const envelope = createPomRxSourceEnvelope(receipt, sourceKeys.privateKey);
  const verified = verifyPomRxSourceEnvelope(envelope);

  assert.equal(verified.ok, true);
  assert.equal(verified.receiptHash, commitPomRxReceipt(receipt).receiptHash);
  assert.equal(verified.sourceKeyId, receipt.source_key_id);
});

test('source envelope rejects receipt and signature tampering', () => {
  const envelope = createPomRxSourceEnvelope(preflightReceipt(), sourceKeys.privateKey);
  assert.equal(verifyPomRxSourceEnvelope({
    ...envelope,
    receipt: { ...envelope.receipt, policy_hash: hash('1') },
  }).ok, false);
  assert.equal(verifyPomRxSourceEnvelope({
    ...envelope,
    source_signature: Buffer.from('invalid').toString('base64'),
  }).ok, false);
});

test('witness acknowledgement is signed, bounded and expectation-aware', () => {
  const envelope = createPomRxSourceEnvelope(preflightReceipt(), sourceKeys.privateKey);
  const ack = createPomRxWitnessAck(envelope, witnessKeys.privateKey, {
    receivedAt: '2026-07-29T06:00:01.000Z',
    mode: 'witnessed',
  });
  const verified = verifyPomRxWitnessAck(ack, {
    receiptHash: envelope.receipt_hash,
    runId: envelope.receipt.run_id,
    outcome: 'allow',
    sourceKeyId: envelope.receipt.source_key_id,
    mode: 'witnessed',
    witnessKeyId: pomRxKeyId(witnessKeys.publicKey),
  });

  assert.equal(verified.ok, true);
  assert.equal(verified.payload.received_at, '2026-07-29T06:00:01.000Z');
  assert.equal(verified.payload.valid_until, '2026-07-29T06:00:31.000Z');
  assert.equal(verifyPomRxWitnessAck({ ...ack, outcome: 'deny' }).ok, false);
  assert.equal(verifyPomRxWitnessAck(ack, {
    requireUnexpired: true,
    currentTime: '2026-07-29T06:00:32.000Z',
  }).ok, false);
});

test('witness refuses non-preflight phases', () => {
  const execution = preflightReceipt({
    receipt_id: 'receipt_execution_20260729',
    phase: 'execution',
    outcome: 'accepted',
    previous_receipt_hash: hash('1'),
  });
  const envelope = createPomRxSourceEnvelope(execution, sourceKeys.privateKey);
  assert.throws(
    () => createPomRxWitnessAck(envelope, witnessKeys.privateKey),
    /preflight receipts only/,
  );
});

test('HTTP witness persists once and returns an idempotent acknowledgement', async (context) => {
  const persisted = [];
  const server = createPomRxWitnessServer({
    witnessPrivateKey: witnessKeys.privateKey,
    mode: 'witnessed',
    persistAck: async (ack) => persisted.push(ack),
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();
  const endpoint = `http://127.0.0.1:${port}/v1/preflight`;
  const envelope = createPomRxSourceEnvelope(
    preflightReceipt({ occurred_at: new Date().toISOString() }),
    sourceKeys.privateKey,
  );

  const first = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(envelope),
  });
  const firstAck = await first.json();
  assert.equal(first.status, 201);
  assert.equal(verifyPomRxWitnessAck(firstAck).ok, true);

  const second = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(envelope),
  });
  const secondAck = await second.json();
  assert.equal(second.status, 200);
  assert.deepEqual(secondAck, firstAck);
  assert.equal(persisted.length, 1);
});

test('HTTP witness rejects malformed media, invalid signatures and oversized requests', async (context) => {
  const server = createPomRxWitnessServer({
    witnessPrivateKey: witnessKeys.privateKey,
    mode: 'dry_run',
    maxBodyBytes: 4_096,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();
  const endpoint = `http://127.0.0.1:${port}/v1/preflight`;
  const envelope = createPomRxSourceEnvelope(
    preflightReceipt({ occurred_at: new Date().toISOString() }),
    sourceKeys.privateKey,
  );

  const wrongMedia = await fetch(endpoint, { method: 'POST', body: JSON.stringify(envelope) });
  assert.equal(wrongMedia.status, 415);

  const invalid = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...envelope, source_signature: Buffer.from('invalid').toString('base64') }),
  });
  assert.equal(invalid.status, 422);

  const oversized = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ignored: 'x'.repeat(5_000) }),
  });
  assert.equal(oversized.status, 413);
});

test('HTTP witness rejects stale and excessively future-dated preflights', async (context) => {
  const server = createPomRxWitnessServer({
    witnessPrivateKey: witnessKeys.privateKey,
    mode: 'dry_run',
    maxReceiptAgeMs: 2_000,
    maxFutureSkewMs: 2_000,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();
  const endpoint = `http://127.0.0.1:${port}/v1/preflight`;

  for (const occurredAt of [
    new Date(Date.now() - 10_000).toISOString(),
    new Date(Date.now() + 10_000).toISOString(),
  ]) {
    const envelope = createPomRxSourceEnvelope(
      preflightReceipt({
        receipt_id: `receipt_time_${occurredAt.includes('+') ? 'future' : crypto.randomUUID()}`,
        occurred_at: occurredAt,
      }),
      sourceKeys.privateKey,
    );
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    });
    assert.equal(response.status, 422);
  }
});
