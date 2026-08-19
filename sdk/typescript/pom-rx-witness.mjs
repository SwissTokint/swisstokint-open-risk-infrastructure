import crypto from 'node:crypto';

import {
  canonicalizePayload,
  sha256Hex,
} from './swisstokint-proof.mjs';
import {
  commitPomRxReceipt,
} from './pom-rx.mjs';

export const POM_RX_SOURCE_ENVELOPE_VERSION = 'pom-rx-source-envelope/0.1';
export const POM_RX_WITNESS_ACK_VERSION = 'pom-rx-witness-ack/0.1';

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const KEY_ID_PATTERN = /^ed25519-[a-f0-9]{32}$/u;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/u;

function assert(condition, message) {
  if (!condition) throw new TypeError(message);
}

function assertExactKeys(record, expected, label) {
  assert(record && typeof record === 'object' && !Array.isArray(record), `${label} must be an object`);
  assert(
    JSON.stringify(Object.keys(record).sort()) === JSON.stringify([...expected].sort()),
    `${label} has missing or unknown fields`,
  );
}

function assertHash(value, field) {
  assert(typeof value === 'string' && HASH_PATTERN.test(value), `${field} must be a lowercase SHA-256 hash`);
}

function normalizeDateTime(value, field) {
  assert(
    typeof value === 'string' && /(Z|[+-]\d{2}:\d{2})$/u.test(value),
    `${field} must include an offset`,
  );
  const date = new Date(value);
  assert(Number.isFinite(date.getTime()), `${field} must be an ISO date-time`);
  return date.toISOString();
}

function toEd25519PublicKey(key) {
  const keyObject = key?.type === 'public' ? key : crypto.createPublicKey(key);
  assert(keyObject.asymmetricKeyType === 'ed25519', 'Key must be Ed25519');
  return keyObject;
}

function decodePublicKey(value) {
  assert(
    typeof value === 'string'
      && value.length >= 40
      && value.length <= 256
      && BASE64_PATTERN.test(value),
    'Public key must be bounded base64',
  );
  const bytes = Buffer.from(value, 'base64');
  assert(bytes.toString('base64') === value, 'Public key must use canonical base64');
  const key = crypto.createPublicKey({ key: bytes, format: 'der', type: 'spki' });
  assert(key.asymmetricKeyType === 'ed25519', 'Public key must be Ed25519');
  return key;
}

function decodeSignature(value, label) {
  assert(
    typeof value === 'string'
      && value.length >= 80
      && value.length <= 128
      && BASE64_PATTERN.test(value),
    `${label} must be bounded base64`,
  );
  const bytes = Buffer.from(value, 'base64');
  assert(bytes.toString('base64') === value, `${label} must use canonical base64`);
  assert(bytes.length === 64, `${label} must be an Ed25519 signature`);
  return bytes;
}

function exportPublicKey(key) {
  return toEd25519PublicKey(key)
    .export({ format: 'der', type: 'spki' })
    .toString('base64');
}

export function pomRxKeyId(key) {
  const der = toEd25519PublicKey(key).export({ format: 'der', type: 'spki' });
  return `ed25519-${crypto.createHash('sha256').update(der).digest('hex').slice(0, 32)}`;
}

function sourceSignatureMessage(receiptHash) {
  return `swisstokint:pom-rx-source:v1:${receiptHash}`;
}

function witnessSignatureMessage(payload) {
  return `swisstokint:pom-rx-witness-ack:v1:${canonicalizePayload(payload)}`;
}

export function createPomRxSourceEnvelope(receipt, sourcePrivateKey) {
  const committed = commitPomRxReceipt(receipt);
  const sourcePublicKey = toEd25519PublicKey(sourcePrivateKey);
  const sourceKeyId = pomRxKeyId(sourcePublicKey);
  assert(
    committed.receipt.source_key_id === sourceKeyId,
    'Receipt source_key_id does not match the source signing key',
  );

  return Object.freeze({
    schema_version: POM_RX_SOURCE_ENVELOPE_VERSION,
    receipt: committed.receipt,
    receipt_hash: committed.receiptHash,
    source_public_key: exportPublicKey(sourcePublicKey),
    source_signature: crypto.sign(
      null,
      Buffer.from(sourceSignatureMessage(committed.receiptHash), 'utf8'),
      sourcePrivateKey,
    ).toString('base64'),
  });
}

export function verifyPomRxSourceEnvelope(envelope) {
  try {
    assertExactKeys(
      envelope,
      ['schema_version', 'receipt', 'receipt_hash', 'source_public_key', 'source_signature'],
      'POM-RX source envelope',
    );
    assert(envelope.schema_version === POM_RX_SOURCE_ENVELOPE_VERSION, 'Unsupported POM-RX source envelope version');
    assertHash(envelope.receipt_hash, 'receipt_hash');

    const committed = commitPomRxReceipt(envelope.receipt);
    assert(committed.receiptHash === envelope.receipt_hash, 'Source envelope receipt hash does not match');

    const publicKey = decodePublicKey(envelope.source_public_key);
    const sourceKeyId = pomRxKeyId(publicKey);
    assert(committed.receipt.source_key_id === sourceKeyId, 'Source public key does not match receipt source_key_id');

    const signatureValid = crypto.verify(
      null,
      Buffer.from(sourceSignatureMessage(envelope.receipt_hash), 'utf8'),
      publicKey,
      decodeSignature(envelope.source_signature, 'Source signature'),
    );
    assert(signatureValid, 'Source signature is invalid');

    return Object.freeze({
      ok: true,
      receipt: committed.receipt,
      receiptHash: committed.receiptHash,
      sourceKeyId,
    });
  } catch (error) {
    return Object.freeze({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown source-envelope verification error',
    });
  }
}

export function createPomRxWitnessAck(
  envelope,
  witnessPrivateKey,
  {
    receivedAt = new Date().toISOString(),
    mode = 'witnessed',
    validForMs = 30_000,
  } = {},
) {
  const verified = verifyPomRxSourceEnvelope(envelope);
  assert(verified.ok, verified.error);
  assert(verified.receipt.phase === 'preflight', 'Witness accepts preflight receipts only');
  assert(mode === 'witnessed' || mode === 'dry_run', 'Unsupported witness acknowledgement mode');
  assert(
    Number.isSafeInteger(validForMs) && validForMs >= 1_000 && validForMs <= 300_000,
    'validForMs must be between 1 second and 5 minutes',
  );

  const normalizedReceivedAt = normalizeDateTime(receivedAt, 'received_at');
  const receivedAtMs = new Date(normalizedReceivedAt).getTime();
  assert(
    receivedAtMs >= new Date(verified.receipt.occurred_at).getTime(),
    'Witness cannot receive a preflight before its source occurrence time',
  );

  const witnessPublicKey = toEd25519PublicKey(witnessPrivateKey);
  const witnessKeyId = pomRxKeyId(witnessPublicKey);
  assert(witnessKeyId !== verified.sourceKeyId, 'Source and witness signing keys must be distinct');

  const payload = Object.freeze({
    schema_version: POM_RX_WITNESS_ACK_VERSION,
    receipt_hash: verified.receiptHash,
    receipt_id: verified.receipt.receipt_id,
    run_id: verified.receipt.run_id,
    outcome: verified.receipt.outcome,
    source_key_id: verified.sourceKeyId,
    received_at: normalizedReceivedAt,
    valid_until: new Date(receivedAtMs + validForMs).toISOString(),
    mode,
    witness_key_id: witnessKeyId,
  });

  return Object.freeze({
    ...payload,
    witness_public_key: exportPublicKey(witnessPublicKey),
    witness_signature: crypto.sign(
      null,
      Buffer.from(witnessSignatureMessage(payload), 'utf8'),
      witnessPrivateKey,
    ).toString('base64'),
  });
}

export function verifyPomRxWitnessAck(ack, expected = {}) {
  try {
    assertExactKeys(
      ack,
      [
        'schema_version',
        'receipt_hash',
        'receipt_id',
        'run_id',
        'outcome',
        'source_key_id',
        'received_at',
        'valid_until',
        'mode',
        'witness_key_id',
        'witness_public_key',
        'witness_signature',
      ],
      'POM-RX witness acknowledgement',
    );
    assert(ack.schema_version === POM_RX_WITNESS_ACK_VERSION, 'Unsupported witness acknowledgement version');
    assertHash(ack.receipt_hash, 'receipt_hash');
    assert(typeof ack.receipt_id === 'string' && ack.receipt_id.length >= 16, 'receipt_id is invalid');
    assert(typeof ack.run_id === 'string' && ack.run_id.length >= 16, 'run_id is invalid');
    assert(ack.outcome === 'allow' || ack.outcome === 'deny', 'Witness outcome must be allow or deny');
    assert(KEY_ID_PATTERN.test(ack.source_key_id), 'source_key_id is invalid');
    assert(ack.mode === 'witnessed' || ack.mode === 'dry_run', 'Unsupported witness acknowledgement mode');
    assert(KEY_ID_PATTERN.test(ack.witness_key_id), 'witness_key_id is invalid');
    assert(ack.source_key_id !== ack.witness_key_id, 'Source and witness signing keys must be distinct');

    const receivedAt = normalizeDateTime(ack.received_at, 'received_at');
    const validUntil = normalizeDateTime(ack.valid_until, 'valid_until');
    const validityMs = new Date(validUntil).getTime() - new Date(receivedAt).getTime();
    assert(validityMs >= 1_000 && validityMs <= 300_000, 'Witness acknowledgement validity must be between 1 second and 5 minutes');

    const publicKey = decodePublicKey(ack.witness_public_key);
    assert(pomRxKeyId(publicKey) === ack.witness_key_id, 'Witness public key does not match witness_key_id');

    const payload = Object.freeze({
      schema_version: ack.schema_version,
      receipt_hash: ack.receipt_hash,
      receipt_id: ack.receipt_id,
      run_id: ack.run_id,
      outcome: ack.outcome,
      source_key_id: ack.source_key_id,
      received_at: receivedAt,
      valid_until: validUntil,
      mode: ack.mode,
      witness_key_id: ack.witness_key_id,
    });

    const signatureValid = crypto.verify(
      null,
      Buffer.from(witnessSignatureMessage(payload), 'utf8'),
      publicKey,
      decodeSignature(ack.witness_signature, 'Witness signature'),
    );
    assert(signatureValid, 'Witness signature is invalid');

    const expectedFields = {
      receiptHash: 'receipt_hash',
      receiptId: 'receipt_id',
      runId: 'run_id',
      outcome: 'outcome',
      sourceKeyId: 'source_key_id',
      mode: 'mode',
      witnessKeyId: 'witness_key_id',
    };
    for (const [expectedKey, ackKey] of Object.entries(expectedFields)) {
      if (expected[expectedKey] !== undefined) {
        assert(ack[ackKey] === expected[expectedKey], `Witness ${ackKey} does not match expectation`);
      }
    }

    if (expected.requireUnexpired === true) {
      const currentTime = normalizeDateTime(expected.currentTime ?? new Date().toISOString(), 'currentTime');
      assert(currentTime >= receivedAt, 'Witness acknowledgement is not yet valid');
      assert(currentTime <= validUntil, 'Witness acknowledgement has expired');
    }

    return Object.freeze({
      ok: true,
      payload,
      acknowledgementHash: sha256Hex(witnessSignatureMessage(payload)),
    });
  } catch (error) {
    return Object.freeze({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown witness-acknowledgement verification error',
    });
  }
}
