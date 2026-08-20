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
  WalletGuardProviderError,
  createWalletGuardReferenceProviderGateway,
} from '../../applications/blockchain-digital-assets/wallet-guard/provider.mjs';
import {
  WalletGuardWitnessAuthorizationError,
  createWalletGuardWitnessAuthorizationSupplier,
} from '../../applications/blockchain-digital-assets/wallet-guard/witness-authorization.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const RECIPIENT = `0x${'3'.repeat(40)}`;
const ORIGIN = 'https://fixture.wallet-guard.local';
const CHAIN_ID = '0x1';
const TX_RESULT = `0x${'a'.repeat(64)}`;
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

function createTrustFixture() {
  const source = crypto.generateKeyPairSync('ed25519');
  const witness = crypto.generateKeyPairSync('ed25519');
  let now = '2026-08-19T16:59:00.000Z';
  const lifecycle = createReferenceWitnessTrustLifecycle({
    trustedClock: () => now,
  });
  lifecycle.admin.enrollIdentity({
    publicKey: source.publicKey,
    role: 'source',
    validUntil: '2026-08-19T18:00:00.000Z',
  });
  now = '2026-08-19T16:59:00.100Z';
  lifecycle.admin.enrollIdentity({
    publicKey: witness.publicKey,
    role: 'witness',
    validUntil: '2026-08-19T18:00:00.000Z',
  });
  now = '2026-08-19T17:00:00.000Z';
  return {
    source,
    witness,
    lifecycle,
    setNow(value) {
      now = value;
    },
  };
}

function makeEvidence(fixture, summary, {
  index = 1,
  actionCommitment = summary.action_commitment,
  occurredAt = summary.issued_at,
  validForMs = 60_000,
} = {}) {
  const receipt = {
    schema_version: 'pom-rx/0.1',
    receipt_id: `receipt-wg-witness-${String(index).padStart(8, '0')}`,
    run_id: `run-wg-witness-${String(index).padStart(8, '0')}`,
    phase: 'preflight',
    outcome: 'allow',
    agent_ref: 'agent-wallet-guard-01',
    subject_ref: 'subject-wallet-guard-01',
    method_hash: summary.method_hash,
    policy_hash: summary.policy_hash,
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
  return { sourceEnvelope, witnessAcknowledgement };
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

function policy() {
  return {
    schema_version: 'wallet-guard-policy/0.1',
    policy_id: 'wallet-guard-provider-policy/0.1',
    enabled: true,
    kill_switch: false,
    expected_chain_id: CHAIN_ID,
    allowed_origins: [ORIGIN],
    allowed_targets: [],
    allowed_recipients: [RECIPIENT],
    allowed_spenders: [],
    allowed_typed_data_verifying_contracts: [],
    max_native_value: '1000',
    max_token_amount: '1000000',
    deny_unlimited_allowance: true,
    deny_operator_approval: true,
    require_simulation_for: [],
  };
}

function sendTransaction(value = '0x1') {
  return {
    method: 'eth_sendTransaction',
    params: [{ from: ACCOUNT, to: RECIPIENT, value, data: '0x' }],
  };
}

function createFakeProvider() {
  const sensitiveCalls = [];
  const provider = Object.freeze({
    async request(request) {
      if (request.method === 'eth_chainId') return CHAIN_ID;
      if (request.method === 'eth_accounts') return [ACCOUNT];
      sensitiveCalls.push(request);
      return TX_RESULT;
    },
  });
  return { provider, sensitiveCalls };
}

test('verified enrolled source/Witness evidence is reduced to the provider authorization contract', () => {
  const fixture = createTrustFixture();
  const supplier = createSupplier(
    fixture,
    (summary) => makeEvidence(fixture, summary),
  );

  const authorization = supplier(requestSummary());
  assert.equal(authorization.run_id, 'run-wg-witness-00000001');
  assert.equal(authorization.agent_ref, 'agent-wallet-guard-01');
  assert.equal(authorization.subject_ref, 'subject-wallet-guard-01');
  assert.equal(authorization.source_key_id, pomRxKeyId(fixture.source.publicKey));
  assert.equal(authorization.witness_key_id, pomRxKeyId(fixture.witness.publicKey));
  assert.match(authorization.preflight_receipt_hash, /^[a-f0-9]{64}$/u);
  assert.match(authorization.witness_ack_hash, /^[a-f0-9]{64}$/u);
  assert.equal(authorization.witness_valid_until, '2026-08-19T17:01:00.000Z');
  assert.equal(authorization.verification_profile, VERIFICATION_BINDING.verification_profile);
  assert.equal(Object.isFrozen(authorization), true);
});

test('the adapter is a drop-in provider supplier and forwards one allowlisted control request', async () => {
  const fixture = createTrustFixture();
  let evidenceIndex = 0;
  const supplier = createSupplier(fixture, (summary) => {
    evidenceIndex += 1;
    return makeEvidence(fixture, summary, { index: evidenceIndex });
  });
  const fake = createFakeProvider();
  const gateway = createWalletGuardReferenceProviderGateway({
    captureTrustedOrigin: () => ORIGIN,
    provider: fake.provider,
    policy: policy(),
    trustedClock: () => '2026-08-19T17:00:00.000Z',
    referenceAuthorizationForRequest: supplier,
    capabilityLifetimeMs: 30_000,
  });

  const result = await gateway.request(sendTransaction());
  assert.equal(result.decision, 'ALLOW');
  assert.equal(result.forwarded, true);
  assert.equal(result.provider_result, TX_RESULT);
  assert.equal(fake.sensitiveCalls.length, 1);
});

test('a signed Witness receipt for another action cannot authorize this request summary', () => {
  const fixture = createTrustFixture();
  const supplier = createSupplier(
    fixture,
    (summary) => makeEvidence(fixture, summary, { actionCommitment: hash('9') }),
  );

  assert.throws(
    () => supplier(requestSummary()),
    (error) => expectWitnessCode(error, 'POMRX_WG_WITNESS_E_BINDING_MISMATCH'),
  );
});

test('revocation remains fail-closed before the provider can forward', async () => {
  const fixture = createTrustFixture();
  fixture.setNow('2026-08-19T17:00:00.100Z');
  fixture.lifecycle.admin.revokeIdentity({
    keyId: pomRxKeyId(fixture.witness.publicKey),
    reason: 'compromise',
  });
  fixture.setNow('2026-08-19T17:00:00.200Z');

  const supplier = createSupplier(
    fixture,
    (summary) => makeEvidence(fixture, summary),
  );
  const fake = createFakeProvider();
  const gateway = createWalletGuardReferenceProviderGateway({
    captureTrustedOrigin: () => ORIGIN,
    provider: fake.provider,
    policy: policy(),
    trustedClock: () => '2026-08-19T17:00:00.000Z',
    referenceAuthorizationForRequest: supplier,
    capabilityLifetimeMs: 30_000,
  });

  await assert.rejects(
    gateway.request(sendTransaction()),
    (error) => {
      assert.ok(error instanceof WalletGuardProviderError);
      assert.equal(error.code, 'POMRX_WG_PROVIDER_E_REFERENCE_UNAVAILABLE');
      return true;
    },
  );
  assert.equal(fake.sensitiveCalls.length, 0);
});

test('trust-bounded Witness validity cannot be shorter than the requested capability window', () => {
  const fixture = createTrustFixture();
  const supplier = createSupplier(
    fixture,
    (summary) => makeEvidence(fixture, summary, { validForMs: 10_000 }),
  );

  assert.throws(
    () => supplier(requestSummary()),
    (error) => expectWitnessCode(error, 'POMRX_WG_WITNESS_E_TIME_INVALID'),
  );
});

test('preflight chronology cannot be after provider capability issuance', () => {
  const fixture = createTrustFixture();
  fixture.setNow('2026-08-19T17:00:01.000Z');
  const supplier = createSupplier(
    fixture,
    (summary) => makeEvidence(fixture, summary, {
      occurredAt: '2026-08-19T17:00:00.500Z',
    }),
  );

  assert.throws(
    () => supplier(requestSummary()),
    (error) => expectWitnessCode(error, 'POMRX_WG_WITNESS_E_BINDING_MISMATCH'),
  );
});

test('Proxy evidence bundles fail before caller traps or the trust verifier execute', () => {
  let trapCalls = 0;
  let verifierCalls = 0;
  const bundle = new Proxy(
    { sourceEnvelope: {}, witnessAcknowledgement: {} },
    {
      get() {
        trapCalls += 1;
        throw new Error('must not execute');
      },
      ownKeys() {
        trapCalls += 1;
        throw new Error('must not execute');
      },
      getOwnPropertyDescriptor() {
        trapCalls += 1;
        throw new Error('must not execute');
      },
      getPrototypeOf() {
        trapCalls += 1;
        throw new Error('must not execute');
      },
    },
  );
  const supplier = createWalletGuardWitnessAuthorizationSupplier({
    verifyAuthorizationCandidate: () => {
      verifierCalls += 1;
      return {};
    },
    evidenceForRequest: () => bundle,
    verificationBinding: VERIFICATION_BINDING,
  });

  assert.throws(
    () => supplier(requestSummary()),
    (error) => expectWitnessCode(error, 'POMRX_WG_WITNESS_E_EVIDENCE'),
  );
  assert.equal(trapCalls, 0);
  assert.equal(verifierCalls, 0);
});

test('unexpected verifier runtime failures preserve exact error provenance', () => {
  const sentinel = new TypeError('foreign verifier runtime failure');
  const fixture = createTrustFixture();
  const supplier = createWalletGuardWitnessAuthorizationSupplier({
    verifyAuthorizationCandidate: () => {
      throw sentinel;
    },
    evidenceForRequest: (summary) => makeEvidence(fixture, summary),
    verificationBinding: VERIFICATION_BINDING,
  });

  assert.throws(() => supplier(requestSummary()), (error) => error === sentinel);
});

test('bootstrap accessors and Proxies are rejected without executing caller code', () => {
  let getterCalls = 0;
  const accessorOptions = {
    verifyAuthorizationCandidate: () => {},
    evidenceForRequest: () => {},
    verificationBinding: VERIFICATION_BINDING,
  };
  Object.defineProperty(accessorOptions, 'evidenceForRequest', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return () => {};
    },
  });
  assert.throws(
    () => createWalletGuardWitnessAuthorizationSupplier(accessorOptions),
    (error) => expectWitnessCode(error, 'POMRX_WG_WITNESS_E_INVALID'),
  );
  assert.equal(getterCalls, 0);

  let trapCalls = 0;
  const proxyOptions = new Proxy(
    {
      verifyAuthorizationCandidate: () => {},
      evidenceForRequest: () => {},
      verificationBinding: VERIFICATION_BINDING,
    },
    {
      getPrototypeOf() {
        trapCalls += 1;
        throw new Error('must not execute');
      },
      ownKeys() {
        trapCalls += 1;
        throw new Error('must not execute');
      },
    },
  );
  assert.throws(
    () => createWalletGuardWitnessAuthorizationSupplier(proxyOptions),
    (error) => expectWitnessCode(error, 'POMRX_WG_WITNESS_E_INVALID'),
  );
  assert.equal(trapCalls, 0);
});
