import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import {
  POM_RX_REFERENCE_WITNESS_TRUST_MAX_IDENTITIES,
  PomRxWitnessTrustError,
  createReferenceWitnessTrustLifecycle,
} from '../core/witness/reference-trust-lifecycle.mjs';

const TRUSTED_NOW = '2030-01-01T00:00:00.000Z';
const VALID_UNTIL = '2030-02-01T00:00:00.000Z';
const SEARCH_LIMIT = 128;

function makeTrustLifecycle() {
  return createReferenceWitnessTrustLifecycle({
    trustedClock: () => TRUSTED_NOW,
  });
}

function generateEd25519PublicKey() {
  return crypto.generateKeyPairSync('ed25519').publicKey;
}

function assertCapacityError(error) {
  assert.ok(error instanceof PomRxWitnessTrustError);
  assert.equal(error.code, 'POMRX_WITNESS_TRUST_E_CAPACITY');
  return true;
}

test('Witness trust capacity rejection is fail-closed and leaves enrollment state unchanged', () => {
  const lifecycle = makeTrustLifecycle();
  let lastSuccessfulSnapshot = lifecycle.admin.snapshot();
  let firstIdentity = null;
  let capacityReached = false;

  for (let index = 0; index < SEARCH_LIMIT; index += 1) {
    try {
      const enrollment = lifecycle.admin.enrollIdentity({
        publicKey: generateEd25519PublicKey(),
        role: index % 2 === 0 ? 'source' : 'witness',
        validUntil: VALID_UNTIL,
      });
      firstIdentity ??= enrollment.identity;
      lastSuccessfulSnapshot = enrollment.trust;
    } catch (error) {
      assertCapacityError(error);
      capacityReached = true;
      break;
    }
  }

  assert.equal(capacityReached, true, 'bounded trust state must reject before 128 identities');
  assert.equal(lastSuccessfulSnapshot.identities.length, POM_RX_REFERENCE_WITNESS_TRUST_MAX_IDENTITIES);
  assert.ok(firstIdentity);
  assert.deepEqual(
    lifecycle.admin.snapshot(),
    lastSuccessfulSnapshot,
    'a rejected enrollment must not mutate records or revision',
  );
});

test('Witness trust successor capacity rejection is atomic for predecessor and revision', () => {
  const lifecycle = makeTrustLifecycle();
  let firstIdentity = null;
  let fullSnapshot = lifecycle.admin.snapshot();
  let capacityReached = false;

  for (let index = 0; index < SEARCH_LIMIT; index += 1) {
    try {
      const enrollment = lifecycle.admin.enrollIdentity({
        publicKey: generateEd25519PublicKey(),
        role: index % 2 === 0 ? 'source' : 'witness',
        validUntil: VALID_UNTIL,
      });
      firstIdentity ??= enrollment.identity;
      fullSnapshot = enrollment.trust;
    } catch (error) {
      assertCapacityError(error);
      capacityReached = true;
      break;
    }
  }

  assert.equal(capacityReached, true, 'test requires a reached canonical trust-state bound');
  assert.equal(fullSnapshot.identities.length, POM_RX_REFERENCE_WITNESS_TRUST_MAX_IDENTITIES);
  assert.ok(firstIdentity);

  assert.throws(
    () => lifecycle.admin.rotateIdentity({
      predecessorKeyId: firstIdentity.key_id,
      successorPublicKey: generateEd25519PublicKey(),
      validUntil: VALID_UNTIL,
    }),
    assertCapacityError,
  );

  assert.deepEqual(
    lifecycle.admin.snapshot(),
    fullSnapshot,
    'a rejected successor transition must not rotate the predecessor or advance revision',
  );
});

test('transition-heavy recovery history remains canonical through the explicit ceiling', () => {
  const lifecycle = makeTrustLifecycle();
  const enrollment = lifecycle.admin.enrollIdentity({
    publicKey: generateEd25519PublicKey(),
    role: 'witness',
    validUntil: VALID_UNTIL,
  });
  let activeIdentity = enrollment.identity;
  let fullSnapshot = enrollment.trust;

  while (fullSnapshot.identities.length < POM_RX_REFERENCE_WITNESS_TRUST_MAX_IDENTITIES) {
    const recovery = lifecycle.admin.recoverIdentity({
      compromisedKeyId: activeIdentity.key_id,
      successorPublicKey: generateEd25519PublicKey(),
      validUntil: VALID_UNTIL,
      reason: 'operator_recovery',
    });
    activeIdentity = recovery.successor;
    fullSnapshot = recovery.trust;
  }

  assert.equal(fullSnapshot.identities.length, POM_RX_REFERENCE_WITNESS_TRUST_MAX_IDENTITIES);
  assert.equal(
    fullSnapshot.identities.filter((identity) => identity.status === 'recovered').length,
    POM_RX_REFERENCE_WITNESS_TRUST_MAX_IDENTITIES - 1,
  );
  assert.equal(fullSnapshot.identities.filter((identity) => identity.status === 'active').length, 1);

  assert.throws(
    () => lifecycle.admin.recoverIdentity({
      compromisedKeyId: activeIdentity.key_id,
      successorPublicKey: generateEd25519PublicKey(),
      validUntil: VALID_UNTIL,
      reason: 'operator_recovery',
    }),
    assertCapacityError,
  );
  assert.deepEqual(lifecycle.admin.snapshot(), fullSnapshot);

  const revocation = lifecycle.admin.revokeIdentity({
    keyId: activeIdentity.key_id,
    reason: 'compromise',
  });
  assert.equal(revocation.trust.identities.length, POM_RX_REFERENCE_WITNESS_TRUST_MAX_IDENTITIES);
  assert.equal(revocation.identity.status, 'revoked');
});

test('the explicit identity ceiling preserves revocation headroom', () => {
  const lifecycle = makeTrustLifecycle();
  const identities = [];

  for (let index = 0; index < POM_RX_REFERENCE_WITNESS_TRUST_MAX_IDENTITIES; index += 1) {
    const enrollment = lifecycle.admin.enrollIdentity({
      publicKey: generateEd25519PublicKey(),
      role: index % 2 === 0 ? 'source' : 'witness',
      validUntil: VALID_UNTIL,
    });
    identities.push(enrollment.identity);
  }

  let latestSnapshot = lifecycle.admin.snapshot();
  for (const identity of identities) {
    const revocation = lifecycle.admin.revokeIdentity({
      keyId: identity.key_id,
      reason: 'compromise',
    });
    latestSnapshot = revocation.trust;
  }

  assert.equal(latestSnapshot.identities.length, POM_RX_REFERENCE_WITNESS_TRUST_MAX_IDENTITIES);
  assert.equal(latestSnapshot.identities.every((identity) => identity.status === 'revoked'), true);
  assert.equal(latestSnapshot.revision, POM_RX_REFERENCE_WITNESS_TRUST_MAX_IDENTITIES * 2);
  assert.deepEqual(lifecycle.admin.snapshot(), latestSnapshot);
});

test('non-capacity canonical TypeErrors are not mislabeled and leave trust state unchanged', { concurrency: false }, () => {
  const lifecycle = makeTrustLifecycle();
  const before = lifecycle.admin.snapshot();
  const originalNormalize = String.prototype.normalize;

  try {
    String.prototype.normalize = function injectedCanonicalFailure() {
      throw new TypeError('injected canonical semantic failure');
    };

    assert.throws(
      () => lifecycle.admin.enrollIdentity({
        publicKey: generateEd25519PublicKey(),
        role: 'source',
        validUntil: VALID_UNTIL,
      }),
      (error) => {
        assert.ok(error instanceof TypeError);
        assert.equal(error instanceof PomRxWitnessTrustError, false);
        assert.equal(error.message, 'injected canonical semantic failure');
        return true;
      },
    );
  } finally {
    String.prototype.normalize = originalNormalize;
  }

  assert.deepEqual(
    lifecycle.admin.snapshot(),
    before,
    'non-capacity canonical failure must not mutate trust records or revision',
  );
});
