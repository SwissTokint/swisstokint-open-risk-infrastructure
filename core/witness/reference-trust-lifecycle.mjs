import crypto from 'node:crypto';

import {
  canonicalizePayload,
  sha256Hex,
} from '../../sdk/typescript/swisstokint-proof.mjs';
import {
  pomRxKeyId,
  verifyPomRxSourceEnvelope,
  verifyPomRxWitnessAck,
} from '../../sdk/typescript/pom-rx-witness.mjs';

export const POM_RX_REFERENCE_WITNESS_TRUST_STATE_VERSION =
  'pom-rx-witness-trust-state/0.1';
export const POM_RX_REFERENCE_WITNESS_TRUST_HASH_DOMAIN =
  'swisstokint:pom-rx-witness-trust-state:v1:';

const KEY_ID_PATTERN = /^ed25519-[a-f0-9]{32}$/u;
const MAX_VALIDITY_MS = 366 * 24 * 60 * 60 * 1_000;
const MIN_VALIDITY_MS = 1_000;
const ROLES = new Set(['source', 'witness']);
const REVOCATION_REASONS = new Set(['compromise', 'retired', 'operator', 'policy']);
const RECOVERY_REASONS = new Set(['compromise', 'lost', 'operator_recovery']);

export class PomRxWitnessTrustError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PomRxWitnessTrustError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new PomRxWitnessTrustError(code, message);
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('POMRX_WITNESS_TRUST_E_INVALID', `${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail('POMRX_WITNESS_TRUST_E_INVALID', `${label} has missing or unknown fields`);
  }
}

function canonicalUtcInstant(value, field) {
  if (typeof value !== 'string' || !value.endsWith('Z')) {
    fail('POMRX_WITNESS_TRUST_E_TIME_INVALID', `${field} must be a canonical UTC instant`);
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    fail('POMRX_WITNESS_TRUST_E_TIME_INVALID', `${field} must be a canonical UTC instant`);
  }
  return parsed;
}

function toEd25519PublicKey(key) {
  let keyObject;
  try {
    keyObject = key?.type === 'public' ? key : crypto.createPublicKey(key);
  } catch {
    fail('POMRX_WITNESS_TRUST_E_KEY_INVALID', 'identity key cannot be decoded');
  }
  if (keyObject.asymmetricKeyType !== 'ed25519') {
    fail('POMRX_WITNESS_TRUST_E_KEY_INVALID', 'identity key must be Ed25519');
  }
  return keyObject;
}

function canonicalPublicKeySpki(key) {
  return toEd25519PublicKey(key)
    .export({ format: 'der', type: 'spki' })
    .toString('base64');
}

function validateKeyId(value, field = 'key_id') {
  if (typeof value !== 'string' || !KEY_ID_PATTERN.test(value)) {
    fail('POMRX_WITNESS_TRUST_E_KEY_INVALID', `${field} is invalid`);
  }
  return value;
}

function validateRole(role) {
  if (typeof role !== 'string' || !ROLES.has(role)) {
    fail('POMRX_WITNESS_TRUST_E_INVALID', 'role must be source or witness');
  }
  return role;
}

function frozenRecord(record) {
  return Object.freeze({ ...record });
}

function recordActiveAt(record, instant) {
  const instantMs = instant.getTime();
  const enrolledMs = new Date(record.enrolled_at).getTime();
  const validUntilMs = new Date(record.valid_until).getTime();
  if (instantMs < enrolledMs || instantMs > validUntilMs) return false;
  if (record.transition_at !== null && instantMs >= new Date(record.transition_at).getTime()) {
    return false;
  }
  return true;
}

export function createReferenceWitnessTrustLifecycle(options) {
  exactKeys(options, ['trustedClock'], 'reference Witness trust bootstrap');
  if (typeof options.trustedClock !== 'function') {
    fail('POMRX_WITNESS_TRUST_E_INVALID', 'trustedClock must be a function');
  }

  const records = new Map();
  let revision = 0;
  let lastTrustedTimeMs = null;

  function sampleTrustedClock() {
    let raw;
    try {
      raw = options.trustedClock();
    } catch {
      fail('POMRX_WITNESS_TRUST_E_TIME_INVALID', 'trusted clock failed');
    }
    if (raw && typeof raw === 'object' && typeof raw.then === 'function') {
      fail('POMRX_WITNESS_TRUST_E_TIME_INVALID', 'trusted clock must be synchronous');
    }
    const now = canonicalUtcInstant(raw, 'trusted clock');
    if (lastTrustedTimeMs !== null && now.getTime() < lastTrustedTimeMs) {
      fail('POMRX_WITNESS_TRUST_E_TIME_ROLLBACK', 'trusted clock moved backwards');
    }
    lastTrustedTimeMs = now.getTime();
    return now;
  }

  function validateValidityWindow(now, validUntil) {
    const expiry = canonicalUtcInstant(validUntil, 'valid_until');
    const durationMs = expiry.getTime() - now.getTime();
    if (durationMs < MIN_VALIDITY_MS || durationMs > MAX_VALIDITY_MS) {
      fail(
        'POMRX_WITNESS_TRUST_E_TIME_INVALID',
        'identity validity must be between 1 second and 366 days',
      );
    }
    return expiry;
  }

  function snapshot() {
    const identities = [...records.values()]
      .map((record) => ({ ...record }))
      .sort((left, right) => left.key_id.localeCompare(right.key_id));
    const payload = Object.freeze({
      schema_version: POM_RX_REFERENCE_WITNESS_TRUST_STATE_VERSION,
      revision,
      identities: Object.freeze(identities.map((record) => Object.freeze(record))),
    });
    const canonical = canonicalizePayload(payload);
    return Object.freeze({
      ...payload,
      trust_state_hash: sha256Hex(`${POM_RX_REFERENCE_WITNESS_TRUST_HASH_DOMAIN}${canonical}`),
      reference_only: true,
      production_trust_proved: false,
    });
  }

  function ensureNoSuccessor(predecessorKeyId) {
    const hasSuccessor = [...records.values()].some(
      (record) => record.predecessor_key_id === predecessorKeyId,
    );
    if (hasSuccessor) {
      fail('POMRX_WITNESS_TRUST_E_TRANSITION_INVALID', 'identity already has a successor');
    }
  }

  function enrollIdentity(input) {
    exactKeys(input, ['publicKey', 'role', 'validUntil'], 'identity enrollment');
    const now = sampleTrustedClock();
    const publicKey = toEd25519PublicKey(input.publicKey);
    const keyId = pomRxKeyId(publicKey);
    if (records.has(keyId)) {
      fail('POMRX_WITNESS_TRUST_E_DUPLICATE', 'identity is already enrolled');
    }
    const expiry = validateValidityWindow(now, input.validUntil);
    const record = frozenRecord({
      key_id: keyId,
      role: validateRole(input.role),
      public_key_spki: canonicalPublicKeySpki(publicKey),
      enrolled_at: now.toISOString(),
      valid_until: expiry.toISOString(),
      status: 'active',
      predecessor_key_id: null,
      transition_at: null,
      transition_reason: null,
    });
    records.set(keyId, record);
    revision += 1;
    return Object.freeze({ identity: record, trust: snapshot() });
  }

  function revokeIdentity(input) {
    exactKeys(input, ['keyId', 'reason'], 'identity revocation');
    const now = sampleTrustedClock();
    const keyId = validateKeyId(input.keyId);
    if (!REVOCATION_REASONS.has(input.reason)) {
      fail('POMRX_WITNESS_TRUST_E_INVALID', 'revocation reason is invalid');
    }
    const existing = records.get(keyId);
    if (!existing) fail('POMRX_WITNESS_TRUST_E_NOT_ENROLLED', 'identity is not enrolled');
    if (existing.status !== 'active') {
      fail('POMRX_WITNESS_TRUST_E_TRANSITION_INVALID', 'identity is not active');
    }
    const updated = frozenRecord({
      ...existing,
      status: 'revoked',
      transition_at: now.toISOString(),
      transition_reason: input.reason,
    });
    records.set(keyId, updated);
    revision += 1;
    return Object.freeze({ identity: updated, trust: snapshot() });
  }

  function replaceIdentity(predecessor, successorPublicKey, validUntil, transitionStatus, reason) {
    const now = sampleTrustedClock();
    const predecessorKeyId = validateKeyId(predecessor, 'predecessor_key_id');
    const existing = records.get(predecessorKeyId);
    if (!existing) fail('POMRX_WITNESS_TRUST_E_NOT_ENROLLED', 'predecessor is not enrolled');
    if (existing.status !== 'active' && transitionStatus !== 'recovered') {
      fail('POMRX_WITNESS_TRUST_E_TRANSITION_INVALID', 'predecessor is not active');
    }
    if (transitionStatus === 'recovered' && !['active', 'revoked'].includes(existing.status)) {
      fail('POMRX_WITNESS_TRUST_E_TRANSITION_INVALID', 'predecessor cannot be recovered');
    }
    ensureNoSuccessor(predecessorKeyId);

    const successor = toEd25519PublicKey(successorPublicKey);
    const successorKeyId = pomRxKeyId(successor);
    if (successorKeyId === predecessorKeyId || records.has(successorKeyId)) {
      fail('POMRX_WITNESS_TRUST_E_DUPLICATE', 'successor identity is not new');
    }
    const expiry = validateValidityWindow(now, validUntil);

    const predecessorUpdated = frozenRecord({
      ...existing,
      status: transitionStatus,
      transition_at: now.toISOString(),
      transition_reason: reason,
    });
    const successorRecord = frozenRecord({
      key_id: successorKeyId,
      role: existing.role,
      public_key_spki: canonicalPublicKeySpki(successor),
      enrolled_at: now.toISOString(),
      valid_until: expiry.toISOString(),
      status: 'active',
      predecessor_key_id: predecessorKeyId,
      transition_at: null,
      transition_reason: null,
    });
    records.set(predecessorKeyId, predecessorUpdated);
    records.set(successorKeyId, successorRecord);
    revision += 1;
    return Object.freeze({
      predecessor: predecessorUpdated,
      successor: successorRecord,
      trust: snapshot(),
    });
  }

  function rotateIdentity(input) {
    exactKeys(input, ['predecessorKeyId', 'successorPublicKey', 'validUntil'], 'identity rotation');
    return replaceIdentity(
      input.predecessorKeyId,
      input.successorPublicKey,
      input.validUntil,
      'rotated',
      'key_rotation',
    );
  }

  function recoverIdentity(input) {
    exactKeys(
      input,
      ['compromisedKeyId', 'successorPublicKey', 'validUntil', 'reason'],
      'identity recovery',
    );
    if (!RECOVERY_REASONS.has(input.reason)) {
      fail('POMRX_WITNESS_TRUST_E_INVALID', 'recovery reason is invalid');
    }
    return replaceIdentity(
      input.compromisedKeyId,
      input.successorPublicKey,
      input.validUntil,
      'recovered',
      input.reason,
    );
  }

  function verificationFailure(code, message) {
    return Object.freeze({ ok: false, code, error: message });
  }

  function verifyAuthorizationCandidate(envelope, acknowledgement) {
    try {
      const now = sampleTrustedClock();
      const sourceVerified = verifyPomRxSourceEnvelope(envelope);
      if (!sourceVerified.ok) {
        return verificationFailure(
          'POMRX_WITNESS_TRUST_E_SOURCE_INVALID',
          sourceVerified.error,
        );
      }

      const acknowledgementVerified = verifyPomRxWitnessAck(acknowledgement, {
        receiptHash: sourceVerified.receiptHash,
        receiptId: sourceVerified.receipt.receipt_id,
        runId: sourceVerified.receipt.run_id,
        outcome: sourceVerified.receipt.outcome,
        sourceKeyId: sourceVerified.sourceKeyId,
        witnessKeyId: acknowledgement?.witness_key_id,
        mode: 'witnessed',
        requireUnexpired: true,
        currentTime: now.toISOString(),
      });
      if (!acknowledgementVerified.ok) {
        return verificationFailure(
          'POMRX_WITNESS_TRUST_E_ACK_INVALID',
          acknowledgementVerified.error,
        );
      }
      if (sourceVerified.receipt.outcome !== 'allow') {
        return verificationFailure(
          'POMRX_WITNESS_TRUST_E_NOT_AUTHORIZABLE',
          'preflight outcome is not allow',
        );
      }

      const sourceRecord = records.get(sourceVerified.sourceKeyId);
      const witnessRecord = records.get(acknowledgement.witness_key_id);
      if (!sourceRecord || !witnessRecord) {
        return verificationFailure(
          'POMRX_WITNESS_TRUST_E_NOT_ENROLLED',
          'source or witness identity is not enrolled',
        );
      }
      if (sourceRecord.role !== 'source' || witnessRecord.role !== 'witness') {
        return verificationFailure(
          'POMRX_WITNESS_TRUST_E_ROLE_MISMATCH',
          'source or witness role does not match trust enrollment',
        );
      }
      if (sourceRecord.public_key_spki !== envelope.source_public_key
          || witnessRecord.public_key_spki !== acknowledgement.witness_public_key) {
        return verificationFailure(
          'POMRX_WITNESS_TRUST_E_KEY_MISMATCH',
          'signed public key does not match enrolled key bytes',
        );
      }

      const occurredAt = canonicalUtcInstant(sourceVerified.receipt.occurred_at, 'occurred_at');
      const receivedAt = canonicalUtcInstant(acknowledgement.received_at, 'received_at');
      if (!recordActiveAt(sourceRecord, occurredAt)
          || !recordActiveAt(witnessRecord, receivedAt)
          || sourceRecord.status !== 'active'
          || witnessRecord.status !== 'active'
          || !recordActiveAt(sourceRecord, now)
          || !recordActiveAt(witnessRecord, now)) {
        return verificationFailure(
          'POMRX_WITNESS_TRUST_E_INACTIVE',
          'source or witness identity is inactive at the relevant trusted time',
        );
      }

      const trust = snapshot();
      return Object.freeze({
        ok: true,
        source_key_id: sourceVerified.sourceKeyId,
        witness_key_id: acknowledgement.witness_key_id,
        receipt_hash: sourceVerified.receiptHash,
        acknowledgement_hash: acknowledgementVerified.acknowledgementHash,
        current_time: now.toISOString(),
        trust_revision: trust.revision,
        trust_state_hash: trust.trust_state_hash,
        reference_only: true,
        production_trust_proved: false,
      });
    } catch (error) {
      const code = error instanceof PomRxWitnessTrustError
        ? error.code
        : 'POMRX_WITNESS_TRUST_E_VERIFY_FAILED';
      return verificationFailure(
        code,
        error instanceof Error ? error.message : 'Witness trust verification failed',
      );
    }
  }

  const admin = Object.freeze({
    enrollIdentity,
    revokeIdentity,
    rotateIdentity,
    recoverIdentity,
    snapshot,
  });
  const verifier = Object.freeze({
    verifyAuthorizationCandidate,
    snapshot,
  });
  return Object.freeze({ admin, verifier });
}
