import assert from 'node:assert/strict';
import test from 'node:test';

import {
  POM_RX_EXACT_AUTHORIZATION_SCHEMA_VERSION,
  PomRxReferenceCapabilityError,
  commitExactAuthorizationBinding,
  prepareReferenceExactAuthorizationRecord,
} from '../core/authorization/reference-exact-authorization.mjs';

const hash = (character) => character.repeat(64);
const CAPABILITY_ID = `cap-${'c'.repeat(32)}`;
const WITNESS_VALID_UNTIL = '2026-08-20T03:01:00.000Z';
const EXPECTED_AUTHORIZATION_COMMITMENT = '9b39321ac551fd243e9ef2ed8a1ad804888a1b7229306485680d7a286da97094';

function validInput() {
  return {
    binding_profile: 'pom-rx-wallet-guard/0.1',
    run_id: 'run-reference-0001',
    agent_ref: 'agent-reference-01',
    subject_ref: 'subject-reference-01',
    method_hash: hash('1'),
    policy_hash: hash('2'),
    action_commitment: hash('3'),
    context_commitment: hash('4'),
    preflight_receipt_hash: hash('5'),
    witness_ack_hash: hash('6'),
    source_key_id: `ed25519-${'a'.repeat(32)}`,
    witness_key_id: `ed25519-${'b'.repeat(32)}`,
    verification_profile: 'pom-rx-v0.1/strict-errata-1',
    verifier_version: 'pom-rx-v0.1-strict-verifier/1',
    implementation_artifact_sha256: hash('7'),
    effective_verification_policy_sha256: hash('8'),
    issued_at: '2026-08-20T03:00:00.000Z',
    expires_at: '2026-08-20T03:00:30.000Z',
  };
}

function validBinding() {
  return {
    schema_version: POM_RX_EXACT_AUTHORIZATION_SCHEMA_VERSION,
    capability_id: CAPABILITY_ID,
    ...validInput(),
  };
}

function expectBindingMismatch(error) {
  assert.ok(error instanceof PomRxReferenceCapabilityError);
  assert.equal(error.code, 'POMRX_GATE_E_BINDING_MISMATCH');
  return true;
}

test('plain exact authorization bindings retain deterministic commitment behavior', () => {
  const first = commitExactAuthorizationBinding(validBinding());
  const second = commitExactAuthorizationBinding(validBinding());
  const prepared = prepareReferenceExactAuthorizationRecord(validInput(), {
    capabilityId: CAPABILITY_ID,
    witnessValidUntil: WITNESS_VALID_UNTIL,
  });

  assert.equal(first.authorizationCommitment, EXPECTED_AUTHORIZATION_COMMITMENT);
  assert.equal(second.authorizationCommitment, EXPECTED_AUTHORIZATION_COMMITMENT);
  assert.equal(prepared.evidence.authorization_commitment, EXPECTED_AUTHORIZATION_COMMITMENT);
  assert.equal(first.canonicalBinding, second.canonicalBinding);
});

test('commit boundary rejects accessor-backed binding fields without invoking getters', () => {
  let getterCalls = 0;
  const hostile = validBinding();
  Object.defineProperty(hostile, 'action_commitment', {
    enumerable: true,
    configurable: true,
    get() {
      getterCalls += 1;
      return hash('f');
    },
  });

  assert.throws(
    () => commitExactAuthorizationBinding(hostile),
    expectBindingMismatch,
  );
  assert.equal(getterCalls, 0);
});

test('prepare boundary rejects accessor-backed input fields without invoking getters', () => {
  let getterCalls = 0;
  const hostile = validInput();
  Object.defineProperty(hostile, 'policy_hash', {
    enumerable: true,
    configurable: true,
    get() {
      getterCalls += 1;
      return hash('f');
    },
  });

  assert.throws(
    () => prepareReferenceExactAuthorizationRecord(hostile, {
      capabilityId: CAPABILITY_ID,
      witnessValidUntil: WITNESS_VALID_UNTIL,
    }),
    expectBindingMismatch,
  );
  assert.equal(getterCalls, 0);
});

test('prepare options reject accessors without invoking capability or witness getters', () => {
  let getterCalls = 0;
  const hostileOptions = {
    witnessValidUntil: WITNESS_VALID_UNTIL,
  };
  Object.defineProperty(hostileOptions, 'capabilityId', {
    enumerable: true,
    configurable: true,
    get() {
      getterCalls += 1;
      return CAPABILITY_ID;
    },
  });

  assert.throws(
    () => prepareReferenceExactAuthorizationRecord(validInput(), hostileOptions),
    expectBindingMismatch,
  );
  assert.equal(getterCalls, 0);
});

test('Proxy bindings fail before user-defined Proxy traps can participate in snapshotting', () => {
  let trapCalls = 0;
  const proxy = new Proxy(validBinding(), {
    getPrototypeOf(target) {
      trapCalls += 1;
      return Reflect.getPrototypeOf(target);
    },
    ownKeys(target) {
      trapCalls += 1;
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, property) {
      trapCalls += 1;
      return Reflect.getOwnPropertyDescriptor(target, property);
    },
    get(target, property, receiver) {
      trapCalls += 1;
      return Reflect.get(target, property, receiver);
    },
  });

  assert.throws(() => commitExactAuthorizationBinding(proxy), expectBindingMismatch);
  assert.equal(trapCalls, 0);
});

test('revoked Proxy bindings and prepare options fail with stable binding diagnostics', () => {
  const bindingProxy = Proxy.revocable(validBinding(), {});
  bindingProxy.revoke();
  assert.throws(
    () => commitExactAuthorizationBinding(bindingProxy.proxy),
    expectBindingMismatch,
  );

  const optionsProxy = Proxy.revocable({
    capabilityId: CAPABILITY_ID,
    witnessValidUntil: WITNESS_VALID_UNTIL,
  }, {});
  optionsProxy.revoke();
  assert.throws(
    () => prepareReferenceExactAuthorizationRecord(validInput(), optionsProxy.proxy),
    expectBindingMismatch,
  );
});

test('symbol keys, custom prototypes and hidden expected fields fail closed', () => {
  const withSymbol = validBinding();
  withSymbol[Symbol('hidden')] = 'value';
  assert.throws(() => commitExactAuthorizationBinding(withSymbol), expectBindingMismatch);

  const customPrototype = Object.assign(Object.create({ inherited: true }), validBinding());
  assert.throws(() => commitExactAuthorizationBinding(customPrototype), expectBindingMismatch);

  const hiddenField = validBinding();
  Object.defineProperty(hiddenField, 'run_id', {
    value: hiddenField.run_id,
    enumerable: false,
    configurable: true,
  });
  assert.throws(() => commitExactAuthorizationBinding(hiddenField), expectBindingMismatch);
});

test('inherited descriptor get/set poison cannot rewrite authorization commitment inputs', () => {
  const originalGet = Object.getOwnPropertyDescriptor(Object.prototype, 'get');
  const originalSet = Object.getOwnPropertyDescriptor(Object.prototype, 'set');
  let inheritedGetReads = 0;
  let inheritedSetReads = 0;

  Object.defineProperty(Object.prototype, 'get', {
    configurable: true,
    get() {
      inheritedGetReads += 1;
      this.value = hash('f');
      return undefined;
    },
  });
  Object.defineProperty(Object.prototype, 'set', {
    configurable: true,
    get() {
      inheritedSetReads += 1;
      this.value = hash('e');
      return undefined;
    },
  });

  try {
    const committed = commitExactAuthorizationBinding(validBinding());
    const prepared = prepareReferenceExactAuthorizationRecord(validInput(), {
      capabilityId: CAPABILITY_ID,
      witnessValidUntil: WITNESS_VALID_UNTIL,
    });
    assert.equal(committed.authorizationCommitment, EXPECTED_AUTHORIZATION_COMMITMENT);
    assert.equal(prepared.evidence.authorization_commitment, EXPECTED_AUTHORIZATION_COMMITMENT);
    assert.equal(prepared.binding.action_commitment, hash('3'));
  } finally {
    if (originalGet) Object.defineProperty(Object.prototype, 'get', originalGet);
    else delete Object.prototype.get;
    if (originalSet) Object.defineProperty(Object.prototype, 'set', originalSet);
    else delete Object.prototype.set;
  }

  assert.equal(inheritedGetReads, 0);
  assert.equal(inheritedSetReads, 0);
});

test('prepared binding is a frozen defensive snapshot independent from caller mutation', () => {
  const input = validInput();
  const originalRunId = input.run_id;
  const prepared = prepareReferenceExactAuthorizationRecord(input, {
    capabilityId: CAPABILITY_ID,
    witnessValidUntil: WITNESS_VALID_UNTIL,
  });

  input.run_id = 'run-mutated-000001';
  input.action_commitment = hash('f');

  assert.equal(prepared.binding.run_id, originalRunId);
  assert.equal(prepared.binding.action_commitment, hash('3'));
  assert.equal(Object.getPrototypeOf(prepared.binding), Object.prototype);
  assert.equal(Object.isFrozen(prepared.binding), true);
  assert.equal(Object.isFrozen(prepared.evidence), true);
});

test('null-prototype plain data remains accepted at the boundary', () => {
  const input = Object.assign(Object.create(null), validInput());
  const prepared = prepareReferenceExactAuthorizationRecord(input, {
    capabilityId: CAPABILITY_ID,
    witnessValidUntil: WITNESS_VALID_UNTIL,
  });

  assert.equal(prepared.binding.run_id, 'run-reference-0001');
  assert.equal(Object.getPrototypeOf(prepared.binding), Object.prototype);
  assert.equal(prepared.evidence.authorization_commitment, EXPECTED_AUTHORIZATION_COMMITMENT);
});
