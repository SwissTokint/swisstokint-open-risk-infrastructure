import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import {
  createReferenceWitnessTrustLifecycle,
} from '../../core/witness/reference-trust-lifecycle.mjs';
import {
  createPomRxSourceEnvelope,
  createPomRxWitnessAck,
  pomRxKeyId,
} from '../../sdk/typescript/pom-rx-witness.mjs';
import {
  WalletGuardWitnessAuthorizationError,
  createWalletGuardWitnessAuthorizationSupplier,
} from '../../applications/blockchain-digital-assets/wallet-guard/witness-authorization.mjs';

const hash = (character) => character.repeat(64);
const VERIFICATION_BINDING = Object.freeze({
  verification_profile: 'pom-rx-v0.1/strict-errata-1',
  verifier_version: 'pom-rx-v0.1-strict-verifier/1',
  implementation_artifact_sha256: hash('3'),
  effective_verification_policy_sha256: hash('4'),
});

function requestSummary(overrides = {}) {
  return {
    request_id: 'wg-reference-request-00000001',
    method_hash: hash('a'),
    policy_hash: hash('b'),
    action_commitment: hash('c'),
    context_commitment: hash('d'),
    issued_at: '2026-08-19T17:00:00.000Z',
    expires_at: '2026-08-19T17:00:30.000Z',
    ...overrides,
  };
}

function createTrustFixture({
  sourceValidUntil = '2026-08-19T18:00:00.000Z',
  witnessValidUntil = '2026-08-19T18:00:00.000Z',
} = {}) {
  const source = crypto.generateKeyPairSync('ed25519');
  const witness = crypto.generateKeyPairSync('ed25519');
  let now = '2026-08-19T16:59:00.000Z';
  const lifecycle = createReferenceWitnessTrustLifecycle({
    trustedClock: () => now,
  });
  lifecycle.admin.enrollIdentity({
    publicKey: source.publicKey,
    role: 'source',
    validUntil: sourceValidUntil,
  });
  now = '2026-08-19T16:59:00.100Z';
  lifecycle.admin.enrollIdentity({
    publicKey: witness.publicKey,
    role: 'witness',
    validUntil: witnessValidUntil,
  });
  now = '2026-08-19T17:00:00.000Z';
  return Object.freeze({
    source,
    witness,
    lifecycle,
  });
}

function makeEvidence(fixture, summary, {
  index = 1,
  methodHash = summary.method_hash,
  policyHash = summary.policy_hash,
  actionCommitment = summary.action_commitment,
  occurredAt = summary.issued_at,
  validForMs = 60_000,
} = {}) {
  const receipt = {
    schema_version: 'pom-rx/0.1',
    receipt_id: `receipt-wg-hardening-${String(index).padStart(8, '0')}`,
    run_id: `run-wg-hardening-${String(index).padStart(8, '0')}`,
    phase: 'preflight',
    outcome: 'allow',
    agent_ref: 'agent-wallet-guard-01',
    subject_ref: 'subject-wallet-guard-01',
    method_hash: methodHash,
    policy_hash: policyHash,
    input_commitment: hash('e'),
    action_commitment: actionCommitment,
    assertions: [{
      rule_id: 'wallet-guard-policy',
      rule_hash: hash('f'),
      result: 'pass',
      proof_mode: 'commitment',
      evidence_hash: hash('1'),
    }],
    previous_receipt_hash: null,
    occurred_at: occurredAt,
    source_key_id: pomRxKeyId(fixture.source.publicKey),
  };
  const sourceEnvelope = createPomRxSourceEnvelope(receipt, fixture.source.privateKey);
  const witnessAcknowledgement = createPomRxWitnessAck(
    sourceEnvelope,
    fixture.witness.privateKey,
    {
      receivedAt: occurredAt,
      validForMs,
      mode: 'witnessed',
    },
  );
  return Object.freeze({ sourceEnvelope, witnessAcknowledgement });
}

function createSupplier(fixture, evidenceForRequest) {
  return createWalletGuardWitnessAuthorizationSupplier({
    verifyAuthorizationCandidate:
      fixture.lifecycle.verifier.verifyAuthorizationCandidate,
    evidenceForRequest,
    verificationBinding: VERIFICATION_BINDING,
  });
}

function expectWitnessCode(error, code) {
  assert.ok(error instanceof WalletGuardWitnessAuthorizationError);
  assert.equal(error.code, code);
  return true;
}

function expectPlainDataCode(error, code) {
  assert.ok(error instanceof Error);
  assert.equal(error.code, code);
  return true;
}

function verifiedResultFor(fixture, evidence) {
  const verified = fixture.lifecycle.verifier.verifyAuthorizationCandidate(
    evidence.sourceEnvelope,
    evidence.witnessAcknowledgement,
  );
  assert.equal(verified.ok, true);
  return verified;
}

function zeroTrapProxy(target, onTrap) {
  return new Proxy(target, {
    get() {
      onTrap();
      throw new Error('must not execute Proxy get trap');
    },
    ownKeys() {
      onTrap();
      throw new Error('must not execute Proxy ownKeys trap');
    },
    getOwnPropertyDescriptor() {
      onTrap();
      throw new Error('must not execute Proxy descriptor trap');
    },
    getPrototypeOf() {
      onTrap();
      throw new Error('must not execute Proxy prototype trap');
    },
  });
}

test('signed method or policy substitution cannot be reduced to provider authorization', () => {
  for (const evidenceOverrides of [
    { methodHash: hash('9') },
    { policyHash: hash('8') },
  ]) {
    const fixture = createTrustFixture();
    const supplier = createSupplier(
      fixture,
      (summary) => makeEvidence(fixture, summary, evidenceOverrides),
    );
    assert.throws(
      () => supplier(requestSummary()),
      (error) => expectWitnessCode(error, 'POMRX_WG_WITNESS_E_BINDING_MISMATCH'),
    );
  }
});

test('source or Witness enrollment expiry bounds the provider capability even when the ack lives longer', () => {
  for (const validity of [
    { sourceValidUntil: '2026-08-19T17:00:20.000Z' },
    { witnessValidUntil: '2026-08-19T17:00:20.000Z' },
  ]) {
    const fixture = createTrustFixture(validity);
    const supplier = createSupplier(
      fixture,
      (summary) => makeEvidence(fixture, summary, { validForMs: 60_000 }),
    );
    assert.throws(
      () => supplier(requestSummary()),
      (error) => expectWitnessCode(error, 'POMRX_WG_WITNESS_E_TIME_INVALID'),
    );
  }
});

test('a successful verifier result cannot be mixed with another receipt or Witness identity', () => {
  const summary = requestSummary();
  const fixture = createTrustFixture();
  const evidence = makeEvidence(fixture, summary);
  const verified = verifiedResultFor(fixture, evidence);
  const variants = [
    { ...verified, receipt_hash: hash('9') },
    {
      ...verified,
      witness_key_id: 'ed25519-00000000000000000000000000000000',
    },
  ];

  for (const variant of variants) {
    const supplier = createWalletGuardWitnessAuthorizationSupplier({
      verifyAuthorizationCandidate: () => variant,
      evidenceForRequest: () => evidence,
      verificationBinding: VERIFICATION_BINDING,
    });
    assert.throws(
      () => supplier(summary),
      (error) => expectWitnessCode(error, 'POMRX_WG_WITNESS_E_BINDING_MISMATCH'),
    );
  }
});

test('Core verification time must stay inside the requested capability interval', () => {
  const summary = requestSummary();
  const fixture = createTrustFixture();
  const evidence = makeEvidence(fixture, summary);
  const verified = verifiedResultFor(fixture, evidence);

  for (const currentTime of [
    '2026-08-19T16:59:59.999Z',
    summary.expires_at,
  ]) {
    const supplier = createWalletGuardWitnessAuthorizationSupplier({
      verifyAuthorizationCandidate: () => ({
        ...verified,
        current_time: currentTime,
      }),
      evidenceForRequest: () => evidence,
      verificationBinding: VERIFICATION_BINDING,
    });
    assert.throws(
      () => supplier(summary),
      (error) => expectWitnessCode(error, 'POMRX_WG_WITNESS_E_TIME_INVALID'),
    );
  }
});

test('Proxy source-envelope or Witness-ack children fail before caller traps or verifier execution', () => {
  for (const child of ['sourceEnvelope', 'witnessAcknowledgement']) {
    const summary = requestSummary();
    const fixture = createTrustFixture();
    const evidence = makeEvidence(fixture, summary);
    let trapCalls = 0;
    let verifierCalls = 0;
    const proxiedChild = zeroTrapProxy(evidence[child], () => {
      trapCalls += 1;
    });
    const bundle = {
      sourceEnvelope: evidence.sourceEnvelope,
      witnessAcknowledgement: evidence.witnessAcknowledgement,
      [child]: proxiedChild,
    };
    const supplier = createWalletGuardWitnessAuthorizationSupplier({
      verifyAuthorizationCandidate: () => {
        verifierCalls += 1;
        return {};
      },
      evidenceForRequest: () => bundle,
      verificationBinding: VERIFICATION_BINDING,
    });

    assert.throws(
      () => supplier(summary),
      (error) => expectPlainDataCode(error, 'POMRX_DATA_E_PROXY'),
    );
    assert.equal(trapCalls, 0);
    assert.equal(verifierCalls, 0);
  }
});

test('Proxy verifier results fail before caller traps after exactly one verifier call', () => {
  const summary = requestSummary();
  const fixture = createTrustFixture();
  const evidence = makeEvidence(fixture, summary);
  const verified = verifiedResultFor(fixture, evidence);
  let trapCalls = 0;
  let verifierCalls = 0;
  const proxiedResult = zeroTrapProxy(verified, () => {
    trapCalls += 1;
  });
  const supplier = createWalletGuardWitnessAuthorizationSupplier({
    verifyAuthorizationCandidate: () => {
      verifierCalls += 1;
      return proxiedResult;
    },
    evidenceForRequest: () => evidence,
    verificationBinding: VERIFICATION_BINDING,
  });

  assert.throws(
    () => supplier(summary),
    (error) => expectPlainDataCode(error, 'POMRX_DATA_E_PROXY'),
  );
  assert.equal(trapCalls, 0);
  assert.equal(verifierCalls, 1);
});

test('verifier-result accessors fail without invoking getters', () => {
  const summary = requestSummary();
  const fixture = createTrustFixture();
  const evidence = makeEvidence(fixture, summary);
  const verified = { ...verifiedResultFor(fixture, evidence) };
  let getterCalls = 0;
  Object.defineProperty(verified, 'receipt_hash', {
    enumerable: true,
    configurable: true,
    get() {
      getterCalls += 1;
      return hash('9');
    },
  });
  const supplier = createWalletGuardWitnessAuthorizationSupplier({
    verifyAuthorizationCandidate: () => verified,
    evidenceForRequest: () => evidence,
    verificationBinding: VERIFICATION_BINDING,
  });

  assert.throws(
    () => supplier(summary),
    (error) => expectPlainDataCode(error, 'POMRX_DATA_E_ACCESSOR'),
  );
  assert.equal(getterCalls, 0);
});

test('Proxy request summaries fail before traps or evidence callbacks', () => {
  let trapCalls = 0;
  let evidenceCalls = 0;
  const supplier = createWalletGuardWitnessAuthorizationSupplier({
    verifyAuthorizationCandidate: () => ({}),
    evidenceForRequest: () => {
      evidenceCalls += 1;
      return {};
    },
    verificationBinding: VERIFICATION_BINDING,
  });
  const proxiedSummary = zeroTrapProxy(requestSummary(), () => {
    trapCalls += 1;
  });

  assert.throws(
    () => supplier(proxiedSummary),
    (error) => expectPlainDataCode(error, 'POMRX_DATA_E_PROXY'),
  );
  assert.equal(trapCalls, 0);
  assert.equal(evidenceCalls, 0);
});

test('Proxy verification bindings fail at bootstrap without caller traps', () => {
  let trapCalls = 0;
  const proxiedBinding = zeroTrapProxy(VERIFICATION_BINDING, () => {
    trapCalls += 1;
  });

  assert.throws(
    () => createWalletGuardWitnessAuthorizationSupplier({
      verifyAuthorizationCandidate: () => ({}),
      evidenceForRequest: () => ({}),
      verificationBinding: proxiedBinding,
    }),
    (error) => expectPlainDataCode(error, 'POMRX_DATA_E_PROXY'),
  );
  assert.equal(trapCalls, 0);
});

test('stale success for a longer acknowledgement cannot authorize a shorter exact acknowledgement', () => {
  const summary = requestSummary();
  const fixture = createTrustFixture();
  const longEvidence = makeEvidence(fixture, summary, { validForMs: 60_000 });
  const shortEvidence = makeEvidence(fixture, summary, { validForMs: 10_000 });
  const staleLongResult = verifiedResultFor(fixture, longEvidence);

  const supplier = createWalletGuardWitnessAuthorizationSupplier({
    verifyAuthorizationCandidate: () => staleLongResult,
    evidenceForRequest: () => shortEvidence,
    verificationBinding: VERIFICATION_BINDING,
  });

  assert.throws(
    () => supplier(summary),
    (error) => expectWitnessCode(error, 'POMRX_WG_WITNESS_E_BINDING_MISMATCH'),
  );
});

test('Core authorization validity cannot exceed the exact signed acknowledgement validity', () => {
  const summary = requestSummary({
    expires_at: '2026-08-19T17:00:05.000Z',
  });
  const fixture = createTrustFixture();
  const evidence = makeEvidence(fixture, summary, { validForMs: 10_000 });
  const verified = verifiedResultFor(fixture, evidence);
  const inflated = {
    ...verified,
    authorization_valid_until: '2026-08-19T17:01:00.000Z',
  };

  const supplier = createWalletGuardWitnessAuthorizationSupplier({
    verifyAuthorizationCandidate: () => inflated,
    evidenceForRequest: () => evidence,
    verificationBinding: VERIFICATION_BINDING,
  });

  assert.throws(
    () => supplier(summary),
    (error) => expectWitnessCode(error, 'POMRX_WG_WITNESS_E_BINDING_MISMATCH'),
  );
});
