import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import {
  createReferenceWitnessTrustLifecycle,
  PomRxWitnessTrustError,
} from '../core/witness/reference-trust-lifecycle.mjs';
import {
  createPomRxSourceEnvelope,
  createPomRxWitnessAck,
  pomRxKeyId,
} from '../sdk/typescript/pom-rx-witness.mjs';
import {
  canonicalizePayload,
} from '../sdk/typescript/swisstokint-proof.mjs';

const hash = (character) => character.repeat(64);
const VALID_UNTIL = '2026-08-19T06:00:00.000Z';

function createKeys() {
  return crypto.generateKeyPairSync('ed25519');
}

function clockSequence(...values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

function preflightReceipt(sourcePublicKey, overrides = {}) {
  return {
    schema_version: 'pom-rx/0.1',
    receipt_id: 'receipt_trust_20260819',
    run_id: 'run_trust_demo_20260819',
    phase: 'preflight',
    outcome: 'allow',
    agent_ref: 'wallet-guard:test-agent',
    subject_ref: 'wallet:reference-test',
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
    occurred_at: '2026-08-19T05:00:01.000Z',
    source_key_id: pomRxKeyId(sourcePublicKey),
    ...overrides,
  };
}

function evidence(source, witness, { receivedAt = '2026-08-19T05:00:02.000Z' } = {}) {
  const envelope = createPomRxSourceEnvelope(
    preflightReceipt(source.publicKey),
    source.privateKey,
  );
  const ack = createPomRxWitnessAck(envelope, witness.privateKey, {
    receivedAt,
    validForMs: 30_000,
    mode: 'witnessed',
  });
  return { envelope, ack };
}

function resignWitnessAck(ack, witnessPrivateKey, overrides = {}) {
  const payload = Object.freeze({
    schema_version: ack.schema_version,
    receipt_hash: ack.receipt_hash,
    receipt_id: ack.receipt_id,
    run_id: ack.run_id,
    outcome: ack.outcome,
    source_key_id: ack.source_key_id,
    received_at: ack.received_at,
    valid_until: ack.valid_until,
    mode: ack.mode,
    witness_key_id: ack.witness_key_id,
    ...overrides,
  });
  return Object.freeze({
    ...payload,
    witness_public_key: ack.witness_public_key,
    witness_signature: crypto.sign(
      null,
      Buffer.from(
        `swisstokint:pom-rx-witness-ack:v1:${canonicalizePayload(payload)}`,
        'utf8',
      ),
      witnessPrivateKey,
    ).toString('base64'),
  });
}

function enrollPair(lifecycle, source, witness, validUntil = VALID_UNTIL) {
  lifecycle.admin.enrollIdentity({
    publicKey: source.publicKey,
    role: 'source',
    validUntil,
  });
  lifecycle.admin.enrollIdentity({
    publicKey: witness.publicKey,
    role: 'witness',
    validUntil,
  });
}

test('enrolled source and witness produce a trusted reference authorization candidate', () => {
  const source = createKeys();
  const witness = createKeys();
  const lifecycle = createReferenceWitnessTrustLifecycle({
    trustedClock: clockSequence(
      '2026-08-19T05:00:00.000Z',
      '2026-08-19T05:00:00.100Z',
      '2026-08-19T05:00:03.000Z',
    ),
  });
  enrollPair(lifecycle, source, witness);

  const { envelope, ack } = evidence(source, witness);
  const result = lifecycle.verifier.verifyAuthorizationCandidate(envelope, ack);

  assert.equal(result.ok, true);
  assert.equal(result.source_key_id, pomRxKeyId(source.publicKey));
  assert.equal(result.witness_key_id, pomRxKeyId(witness.publicKey));
  assert.equal(result.authorization_valid_until, '2026-08-19T05:00:32.000Z');
  assert.equal(result.trust_revision, 2);
  assert.match(result.trust_state_hash, /^[a-f0-9]{64}$/u);
  assert.equal(result.reference_only, true);
  assert.equal(result.production_trust_proved, false);
});

test('cryptographically valid but unenrolled identities fail closed', () => {
  const source = createKeys();
  const witness = createKeys();
  const lifecycle = createReferenceWitnessTrustLifecycle({
    trustedClock: () => '2026-08-19T05:00:03.000Z',
  });
  const { envelope, ack } = evidence(source, witness);

  const result = lifecycle.verifier.verifyAuthorizationCandidate(envelope, ack);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'POMRX_WITNESS_TRUST_E_NOT_ENROLLED');
});

test('role substitution cannot turn a source key into a Witness identity', () => {
  const source = createKeys();
  const witness = createKeys();
  const lifecycle = createReferenceWitnessTrustLifecycle({
    trustedClock: clockSequence(
      '2026-08-19T05:00:00.000Z',
      '2026-08-19T05:00:00.100Z',
      '2026-08-19T05:00:03.000Z',
    ),
  });
  lifecycle.admin.enrollIdentity({
    publicKey: source.publicKey,
    role: 'witness',
    validUntil: VALID_UNTIL,
  });
  lifecycle.admin.enrollIdentity({
    publicKey: witness.publicKey,
    role: 'source',
    validUntil: VALID_UNTIL,
  });

  const { envelope, ack } = evidence(source, witness);
  const result = lifecycle.verifier.verifyAuthorizationCandidate(envelope, ack);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'POMRX_WITNESS_TRUST_E_ROLE_MISMATCH');
});

test('revocation blocks a previously valid acknowledgement at authorization time', () => {
  const source = createKeys();
  const witness = createKeys();
  const lifecycle = createReferenceWitnessTrustLifecycle({
    trustedClock: clockSequence(
      '2026-08-19T05:00:00.000Z',
      '2026-08-19T05:00:00.100Z',
      '2026-08-19T05:00:02.500Z',
      '2026-08-19T05:00:03.000Z',
    ),
  });
  enrollPair(lifecycle, source, witness);
  const { envelope, ack } = evidence(source, witness);

  lifecycle.admin.revokeIdentity({
    keyId: pomRxKeyId(witness.publicKey),
    reason: 'compromise',
  });
  const result = lifecycle.verifier.verifyAuthorizationCandidate(envelope, ack);

  assert.equal(result.ok, false);
  assert.equal(result.code, 'POMRX_WITNESS_TRUST_E_INACTIVE');
});

test('rotation atomically retires the predecessor and authorizes only the successor', () => {
  const source = createKeys();
  const oldWitness = createKeys();
  const newWitness = createKeys();
  const lifecycle = createReferenceWitnessTrustLifecycle({
    trustedClock: clockSequence(
      '2026-08-19T05:00:00.000Z',
      '2026-08-19T05:00:00.100Z',
      '2026-08-19T05:00:02.500Z',
      '2026-08-19T05:00:03.000Z',
      '2026-08-19T05:00:04.000Z',
    ),
  });
  enrollPair(lifecycle, source, oldWitness);
  const oldEvidence = evidence(source, oldWitness);

  const rotated = lifecycle.admin.rotateIdentity({
    predecessorKeyId: pomRxKeyId(oldWitness.publicKey),
    successorPublicKey: newWitness.publicKey,
    validUntil: VALID_UNTIL,
  });
  assert.equal(rotated.predecessor.status, 'rotated');
  assert.equal(rotated.successor.predecessor_key_id, pomRxKeyId(oldWitness.publicKey));
  assert.equal(rotated.successor.role, 'witness');

  const oldResult = lifecycle.verifier.verifyAuthorizationCandidate(
    oldEvidence.envelope,
    oldEvidence.ack,
  );
  assert.equal(oldResult.ok, false);
  assert.equal(oldResult.code, 'POMRX_WITNESS_TRUST_E_INACTIVE');

  const newEvidence = evidence(source, newWitness, {
    receivedAt: '2026-08-19T05:00:03.500Z',
  });
  const newResult = lifecycle.verifier.verifyAuthorizationCandidate(
    newEvidence.envelope,
    newEvidence.ack,
  );
  assert.equal(newResult.ok, true);
  assert.equal(newResult.witness_key_id, pomRxKeyId(newWitness.publicKey));
});

test('recovery atomically retires a compromised identity and creates one successor', () => {
  const source = createKeys();
  const compromisedWitness = createKeys();
  const recoveredWitness = createKeys();
  const lifecycle = createReferenceWitnessTrustLifecycle({
    trustedClock: clockSequence(
      '2026-08-19T05:00:00.000Z',
      '2026-08-19T05:00:00.100Z',
      '2026-08-19T05:00:02.500Z',
      '2026-08-19T05:00:04.000Z',
    ),
  });
  enrollPair(lifecycle, source, compromisedWitness);

  const recovered = lifecycle.admin.recoverIdentity({
    compromisedKeyId: pomRxKeyId(compromisedWitness.publicKey),
    successorPublicKey: recoveredWitness.publicKey,
    validUntil: VALID_UNTIL,
    reason: 'compromise',
  });
  assert.equal(recovered.predecessor.status, 'recovered');
  assert.equal(recovered.predecessor.transition_reason, 'compromise');
  assert.equal(recovered.successor.role, 'witness');

  const replacementEvidence = evidence(source, recoveredWitness, {
    receivedAt: '2026-08-19T05:00:03.000Z',
  });
  assert.equal(
    lifecycle.verifier.verifyAuthorizationCandidate(
      replacementEvidence.envelope,
      replacementEvidence.ack,
    ).ok,
    true,
  );

  assert.throws(
    () => lifecycle.admin.recoverIdentity({
      compromisedKeyId: pomRxKeyId(compromisedWitness.publicKey),
      successorPublicKey: createKeys().publicKey,
      validUntil: VALID_UNTIL,
      reason: 'operator_recovery',
    }),
    (error) => error instanceof PomRxWitnessTrustError
      && error.code === 'POMRX_WITNESS_TRUST_E_TRANSITION_INVALID',
  );
});

test('trusted clock rollback is a fail-closed lifecycle error', () => {
  const source = createKeys();
  const witness = createKeys();
  const lifecycle = createReferenceWitnessTrustLifecycle({
    trustedClock: clockSequence(
      '2026-08-19T05:00:01.000Z',
      '2026-08-19T05:00:00.000Z',
    ),
  });
  lifecycle.admin.enrollIdentity({
    publicKey: source.publicKey,
    role: 'source',
    validUntil: VALID_UNTIL,
  });

  assert.throws(
    () => lifecycle.admin.enrollIdentity({
      publicKey: witness.publicKey,
      role: 'witness',
      validUntil: VALID_UNTIL,
    }),
    (error) => error instanceof PomRxWitnessTrustError
      && error.code === 'POMRX_WITNESS_TRUST_E_TIME_ROLLBACK',
  );
});

test('expired enrollment blocks authorization even while the acknowledgement is unexpired', () => {
  const source = createKeys();
  const witness = createKeys();
  const lifecycle = createReferenceWitnessTrustLifecycle({
    trustedClock: clockSequence(
      '2026-08-19T05:00:00.000Z',
      '2026-08-19T05:00:00.100Z',
      '2026-08-19T05:00:03.000Z',
    ),
  });
  lifecycle.admin.enrollIdentity({
    publicKey: source.publicKey,
    role: 'source',
    validUntil: VALID_UNTIL,
  });
  lifecycle.admin.enrollIdentity({
    publicKey: witness.publicKey,
    role: 'witness',
    validUntil: '2026-08-19T05:00:02.500Z',
  });
  const { envelope, ack } = evidence(source, witness);

  const result = lifecycle.verifier.verifyAuthorizationCandidate(envelope, ack);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'POMRX_WITNESS_TRUST_E_INACTIVE');
});

test('signed acknowledgement chronology is rechecked independently at trust verification', () => {
  const source = createKeys();
  const witness = createKeys();
  const lifecycle = createReferenceWitnessTrustLifecycle({
    trustedClock: clockSequence(
      '2026-08-19T05:00:00.000Z',
      '2026-08-19T05:00:00.100Z',
      '2026-08-19T05:00:03.000Z',
    ),
  });
  enrollPair(lifecycle, source, witness);
  const { envelope, ack } = evidence(source, witness);
  const backwards = resignWitnessAck(ack, witness.privateKey, {
    received_at: '2026-08-19T05:00:00.500Z',
    valid_until: '2026-08-19T05:00:30.500Z',
  });

  const result = lifecycle.verifier.verifyAuthorizationCandidate(envelope, backwards);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'POMRX_WITNESS_TRUST_E_CHRONOLOGY');
});

test('authorization validity is capped by the earliest identity trust expiry', () => {
  const source = createKeys();
  const witness = createKeys();
  const lifecycle = createReferenceWitnessTrustLifecycle({
    trustedClock: clockSequence(
      '2026-08-19T05:00:00.000Z',
      '2026-08-19T05:00:00.100Z',
      '2026-08-19T05:00:03.000Z',
    ),
  });
  lifecycle.admin.enrollIdentity({
    publicKey: source.publicKey,
    role: 'source',
    validUntil: VALID_UNTIL,
  });
  lifecycle.admin.enrollIdentity({
    publicKey: witness.publicKey,
    role: 'witness',
    validUntil: '2026-08-19T05:00:10.000Z',
  });
  const { envelope, ack } = evidence(source, witness);

  const result = lifecycle.verifier.verifyAuthorizationCandidate(envelope, ack);
  assert.equal(result.ok, true);
  assert.equal(result.authorization_valid_until, '2026-08-19T05:00:10.000Z');
});

test('expired predecessor cannot be rotated or recovered as currently trusted', () => {
  const witness = createKeys();
  const lifecycle = createReferenceWitnessTrustLifecycle({
    trustedClock: clockSequence(
      '2026-08-19T05:00:00.000Z',
      '2026-08-19T05:00:03.000Z',
    ),
  });
  lifecycle.admin.enrollIdentity({
    publicKey: witness.publicKey,
    role: 'witness',
    validUntil: '2026-08-19T05:00:02.000Z',
  });

  assert.throws(
    () => lifecycle.admin.rotateIdentity({
      predecessorKeyId: pomRxKeyId(witness.publicKey),
      successorPublicKey: createKeys().publicKey,
      validUntil: VALID_UNTIL,
    }),
    (error) => error instanceof PomRxWitnessTrustError
      && error.code === 'POMRX_WITNESS_TRUST_E_TRANSITION_INVALID',
  );
});

test('trust snapshot ordering and hash are deterministic without locale ordering', () => {
  const source = createKeys();
  const witness = createKeys();
  const first = createReferenceWitnessTrustLifecycle({
    trustedClock: clockSequence(
      '2026-08-19T05:00:00.000Z',
      '2026-08-19T05:00:00.100Z',
    ),
  });
  const second = createReferenceWitnessTrustLifecycle({
    trustedClock: clockSequence(
      '2026-08-19T05:00:00.000Z',
      '2026-08-19T05:00:00.100Z',
    ),
  });
  enrollPair(first, source, witness);
  enrollPair(second, source, witness);

  const left = first.admin.snapshot();
  const right = second.admin.snapshot();
  const ids = left.identities.map((identity) => identity.key_id);
  const lexicallySorted = [...ids].sort((leftId, rightId) => {
    if (leftId < rightId) return -1;
    if (leftId > rightId) return 1;
    return 0;
  });

  assert.deepEqual(ids, lexicallySorted);
  assert.equal(left.trust_state_hash, right.trust_state_hash);
  assert.equal(left.reference_only, true);
  assert.equal(left.production_trust_proved, false);
  assert.equal(left.identities.length, 2);
  for (const identity of left.identities) {
    assert.equal(Object.hasOwn(identity, 'private_key'), false);
    assert.equal(typeof identity.public_key_spki, 'string');
  }
});
