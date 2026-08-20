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

const hash = (character) => character.repeat(64);

function createKeys() {
  return crypto.generateKeyPairSync('ed25519');
}

function preflightReceipt(sourcePublicKey) {
  return {
    schema_version: 'pom-rx/0.1',
    receipt_id: 'receipt_boundary_20260820',
    run_id: 'run_boundary_demo_20260820',
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
    occurred_at: '2026-08-20T05:00:01.000Z',
    source_key_id: pomRxKeyId(sourcePublicKey),
  };
}

function makeEvidence(source, witness) {
  const envelope = createPomRxSourceEnvelope(
    preflightReceipt(source.publicKey),
    source.privateKey,
  );
  const acknowledgement = createPomRxWitnessAck(envelope, witness.privateKey, {
    receivedAt: '2026-08-20T05:00:02.000Z',
    validForMs: 30_000,
    mode: 'witnessed',
  });
  return { envelope, acknowledgement };
}

function enrollPair(lifecycle, source, witness) {
  lifecycle.admin.enrollIdentity({
    publicKey: source.publicKey,
    role: 'source',
    validUntil: '2026-08-20T06:00:00.000Z',
  });
  lifecycle.admin.enrollIdentity({
    publicKey: witness.publicKey,
    role: 'witness',
    validUntil: '2026-08-20T06:00:00.000Z',
  });
}

test('bootstrap captures trustedClock once and ignores later caller mutation', () => {
  let originalCalls = 0;
  let replacementCalls = 0;
  const options = {
    trustedClock() {
      originalCalls += 1;
      return '2026-08-20T05:00:00.000Z';
    },
  };
  const lifecycle = createReferenceWitnessTrustLifecycle(options);
  options.trustedClock = () => {
    replacementCalls += 1;
    return '2030-01-01T00:00:00.000Z';
  };

  const identity = createKeys();
  lifecycle.admin.enrollIdentity({
    publicKey: identity.publicKey,
    role: 'witness',
    validUntil: '2026-08-20T06:00:00.000Z',
  });

  assert.equal(originalCalls, 1);
  assert.equal(replacementCalls, 0);
});

test('bootstrap and admin Proxy wrappers fail before traps execute', () => {
  let traps = 0;
  const handler = {
    get() {
      traps += 1;
      return undefined;
    },
    getPrototypeOf() {
      traps += 1;
      return Object.prototype;
    },
    ownKeys() {
      traps += 1;
      return [];
    },
    getOwnPropertyDescriptor() {
      traps += 1;
      return undefined;
    },
  };

  assert.throws(
    () => createReferenceWitnessTrustLifecycle(new Proxy({
      trustedClock: () => '2026-08-20T05:00:00.000Z',
    }, handler)),
    (error) => error instanceof PomRxWitnessTrustError
      && error.code === 'POMRX_WITNESS_TRUST_E_INVALID',
  );
  assert.equal(traps, 0);

  const lifecycle = createReferenceWitnessTrustLifecycle({
    trustedClock: () => '2026-08-20T05:00:00.000Z',
  });
  const identity = createKeys();
  assert.throws(
    () => lifecycle.admin.enrollIdentity(new Proxy({
      publicKey: identity.publicKey,
      role: 'witness',
      validUntil: '2026-08-20T06:00:00.000Z',
    }, handler)),
    (error) => error instanceof PomRxWitnessTrustError
      && error.code === 'POMRX_WITNESS_TRUST_E_INVALID',
  );
  assert.equal(traps, 0);
});

test('source envelope and acknowledgement Proxy wrappers fail closed before traps execute', () => {
  const source = createKeys();
  const witness = createKeys();
  let clockIndex = 0;
  const clockValues = [
    '2026-08-20T05:00:00.000Z',
    '2026-08-20T05:00:00.100Z',
    '2026-08-20T05:00:03.000Z',
    '2026-08-20T05:00:04.000Z',
  ];
  const lifecycle = createReferenceWitnessTrustLifecycle({
    trustedClock: () => clockValues[Math.min(clockIndex++, clockValues.length - 1)],
  });
  enrollPair(lifecycle, source, witness);
  const { envelope, acknowledgement } = makeEvidence(source, witness);

  let traps = 0;
  const handler = {
    get() {
      traps += 1;
      return undefined;
    },
    getPrototypeOf() {
      traps += 1;
      return Object.prototype;
    },
    ownKeys() {
      traps += 1;
      return [];
    },
    getOwnPropertyDescriptor() {
      traps += 1;
      return undefined;
    },
  };

  const sourceResult = lifecycle.verifier.verifyAuthorizationCandidate(
    new Proxy(envelope, handler),
    acknowledgement,
  );
  assert.equal(sourceResult.ok, false);
  assert.equal(sourceResult.code, 'POMRX_WITNESS_TRUST_E_SOURCE_INVALID');
  assert.equal(traps, 0);

  const ackResult = lifecycle.verifier.verifyAuthorizationCandidate(
    envelope,
    new Proxy(acknowledgement, handler),
  );
  assert.equal(ackResult.ok, false);
  assert.equal(ackResult.code, 'POMRX_WITNESS_TRUST_E_ACK_INVALID');
  assert.equal(traps, 0);
});

test('acknowledgement accessors are rejected without post-verification reads', () => {
  const source = createKeys();
  const witness = createKeys();
  let clockIndex = 0;
  const clockValues = [
    '2026-08-20T05:00:00.000Z',
    '2026-08-20T05:00:00.100Z',
    '2026-08-20T05:00:03.000Z',
  ];
  const lifecycle = createReferenceWitnessTrustLifecycle({
    trustedClock: () => clockValues[Math.min(clockIndex++, clockValues.length - 1)],
  });
  enrollPair(lifecycle, source, witness);
  const { envelope, acknowledgement } = makeEvidence(source, witness);
  const hostile = { ...acknowledgement };
  let reads = 0;
  Object.defineProperty(hostile, 'witness_key_id', {
    enumerable: true,
    configurable: true,
    get() {
      reads += 1;
      return acknowledgement.witness_key_id;
    },
  });

  const result = lifecycle.verifier.verifyAuthorizationCandidate(envelope, hostile);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'POMRX_WITNESS_TRUST_E_ACK_INVALID');
  assert.equal(reads, 0);
});

test('identity validity is half-open and rotation at exact valid_until is rejected', () => {
  const identity = createKeys();
  const successor = createKeys();
  let clockIndex = 0;
  const clockValues = [
    '2026-08-20T05:00:00.000Z',
    '2026-08-20T05:00:01.000Z',
  ];
  const lifecycle = createReferenceWitnessTrustLifecycle({
    trustedClock: () => clockValues[Math.min(clockIndex++, clockValues.length - 1)],
  });
  const enrolled = lifecycle.admin.enrollIdentity({
    publicKey: identity.publicKey,
    role: 'witness',
    validUntil: '2026-08-20T05:00:01.000Z',
  });

  assert.throws(
    () => lifecycle.admin.rotateIdentity({
      predecessorKeyId: enrolled.identity.key_id,
      successorPublicKey: successor.publicKey,
      validUntil: '2026-08-20T06:00:00.000Z',
    }),
    (error) => error instanceof PomRxWitnessTrustError
      && error.code === 'POMRX_WITNESS_TRUST_E_TRANSITION_INVALID',
  );
});
