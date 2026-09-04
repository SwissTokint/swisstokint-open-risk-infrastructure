import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WALLET_GUARD_BRIDGE_SCHEMA_VERSION,
} from '../../applications/blockchain-digital-assets/wallet-guard/bridge-json-envelope.mjs';
import {
  commitWalletGuardIntent,
  normalizeWalletGuardIntent,
} from '../../applications/blockchain-digital-assets/wallet-guard/intent.mjs';
import {
  WALLET_GUARD_BINDING_PROFILE,
} from '../../applications/blockchain-digital-assets/wallet-guard/provider.mjs';
import {
  createWalletGuardControlledCallbackProviderTransport,
  createWalletGuardTrustedProviderGateway,
} from '../../applications/blockchain-digital-assets/wallet-guard/trusted-provider-transport.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const RECIPIENT_A = `0x${'2'.repeat(40)}`;
const RECIPIENT_B = `0x${'3'.repeat(40)}`;
const TX_HASH = `0x${'a'.repeat(64)}`;
const ORIGIN = 'https://observer-boundary.wallet-guard.local';
const CHAIN_ID = '0x1';

function sendTransaction(to) {
  return {
    method: 'eth_sendTransaction',
    params: [{ from: ACCOUNT, to, value: '0x1', data: '0x' }],
  };
}

function policy() {
  return {
    schema_version: 'wallet-guard-policy/0.1',
    policy_id: 'wallet-guard-observer-boundary/0.1',
    enabled: true,
    kill_switch: false,
    expected_chain_id: CHAIN_ID,
    allowed_origins: [ORIGIN],
    allowed_targets: [],
    allowed_recipients: [RECIPIENT_A, RECIPIENT_B],
    allowed_spenders: [],
    allowed_typed_data_verifying_contracts: [],
    max_native_value: '1000',
    max_token_amount: '0',
    deny_unlimited_allowance: true,
    deny_operator_approval: true,
    require_simulation_for: [],
  };
}

function referenceAuthorizationRecord() {
  return {
    run_id: 'run-observer-boundary-00000001',
    agent_ref: 'agent-observer-boundary-0001',
    subject_ref: 'subject-observer-boundary-0001',
    preflight_receipt_hash: '1'.repeat(64),
    witness_ack_hash: '2'.repeat(64),
    source_key_id: `ed25519-${'a'.repeat(32)}`,
    witness_key_id: `ed25519-${'b'.repeat(32)}`,
    verification_profile: 'pom-rx-v0.1/strict-errata-1',
    verifier_version: 'pom-rx-v0.1-strict-verifier/1',
    implementation_artifact_sha256: '3'.repeat(64),
    effective_verification_policy_sha256: '4'.repeat(64),
    witness_valid_until: '2026-09-04T05:30:00.000Z',
  };
}

function response(command) {
  return JSON.stringify({
    schema_version: WALLET_GUARD_BRIDGE_SCHEMA_VERSION,
    session_id: command.session_id,
    sequence: command.sequence,
    request_id: command.request_id,
    observed_chain_id: command.expected_chain_id,
    observed_account: command.expected_account,
    outcome: 'result',
    result: TX_HASH,
    error: null,
  });
}

function makeReplacementObservation(observed) {
  const prepared = observed.prepared_execution;
  const replacementRequest = sendTransaction(RECIPIENT_B);
  const replacementIntent = normalizeWalletGuardIntent({
    requestId: prepared.request_id,
    trustedOrigin: prepared.origin,
    trustedChainId: prepared.chain_id,
    trustedAccount: prepared.account,
    request: replacementRequest,
  });
  const replacementCommitment = commitWalletGuardIntent(replacementIntent).intent_commitment;

  return {
    binding_profile: observed.binding_profile,
    action_commitment: observed.action_commitment,
    context_commitment: observed.context_commitment,
    prepared_execution: {
      schema_version: prepared.schema_version,
      request_id: prepared.request_id,
      origin: prepared.origin,
      chain_id: prepared.chain_id,
      account: prepared.account,
      intent_commitment: replacementCommitment,
      policy_hash: prepared.policy_hash,
      request: replacementRequest,
    },
  };
}

function createGatewayFixture() {
  const dispatchedRecipients = [];
  const transport = createWalletGuardControlledCallbackProviderTransport({
    chainId: CHAIN_ID,
    accounts: [ACCOUNT],
    maxSensitiveCalls: 2,
    dispatchSensitive(command, deliverRawJson) {
      dispatchedRecipients.push(command.request.params[0].to);
      deliverRawJson(response(command));
    },
  });
  const gateway = createWalletGuardTrustedProviderGateway({
    captureTrustedOrigin: () => ORIGIN,
    provider: transport.provider,
    policy: policy(),
    trustedClock: () => '2026-09-04T05:00:00.000Z',
    referenceAuthorizationForRequest: () => referenceAuthorizationRecord(),
    capabilityLifetimeMs: 30_000,
  });
  return { gateway, dispatchedRecipients };
}

test('Gate observation settlement cannot inherit then and substitute a different allowed transaction', async () => {
  const { gateway, dispatchedRecipients } = createGatewayFixture();
  const originalThen = Object.getOwnPropertyDescriptor(Object.prototype, 'then');
  const ownDescriptor = Object.getOwnPropertyDescriptor;
  let observationThenCalls = 0;

  Object.defineProperty(Object.prototype, 'then', {
    configurable: true,
    get() {
      const bindingProfile = ownDescriptor(this, 'binding_profile');
      const preparedExecution = ownDescriptor(this, 'prepared_execution');
      if (bindingProfile?.value === WALLET_GUARD_BINDING_PROFILE && preparedExecution?.value) {
        observationThenCalls += 1;
        const observed = this;
        return (resolve) => {
          const replacement = makeReplacementObservation(observed);
          if (originalThen === undefined) delete Object.prototype.then;
          else Object.defineProperty(Object.prototype, 'then', originalThen);
          resolve(replacement);
        };
      }
      return undefined;
    },
  });

  let result;
  let rejection = null;
  try {
    try {
      result = await gateway.request(sendTransaction(RECIPIENT_A));
    } catch (error) {
      rejection = error;
    }
  } finally {
    if (originalThen === undefined) delete Object.prototype.then;
    else Object.defineProperty(Object.prototype, 'then', originalThen);
  }

  if (rejection !== null) {
    assert.equal(dispatchedRecipients.length, 0, 'a rejected observation must never dispatch');
    assert.equal(
      observationThenCalls,
      0,
      'a fail-closed rejection must still avoid inherited then lookup on the observation',
    );
    return;
  }

  assert.equal(result?.decision, 'ALLOW');
  assert.equal(result?.forwarded, true);
  assert.equal(dispatchedRecipients.length, 1);
  assert.equal(
    dispatchedRecipients[0],
    RECIPIENT_A,
    'authorization for recipient A must never be transformed into recipient B by Promise assimilation',
  );
  assert.equal(
    observationThenCalls,
    0,
    'Gate observation settlement must not consult inherited then',
  );
});

test('reference authorization validation cannot inherit then and reenter before replay reservation', async () => {
  const { gateway, dispatchedRecipients } = createGatewayFixture();
  const originalThen = Object.getOwnPropertyDescriptor(Object.prototype, 'then');
  const ownDescriptor = Object.getOwnPropertyDescriptor;
  let authorizationThenCalls = 0;
  let nestedPromise = null;
  let armed = true;

  Object.defineProperty(Object.prototype, 'then', {
    configurable: true,
    get() {
      const runId = ownDescriptor(this, 'run_id');
      const preflightHash = ownDescriptor(this, 'preflight_receipt_hash');
      if (armed
          && runId?.value === 'run-observer-boundary-00000001'
          && preflightHash?.value === '1'.repeat(64)) {
        armed = false;
        authorizationThenCalls += 1;
        nestedPromise = gateway.request(sendTransaction(RECIPIENT_B));
      }
      return undefined;
    },
  });

  let outcomes;
  try {
    const outerPromise = gateway.request(sendTransaction(RECIPIENT_A));
    const pending = nestedPromise === null
      ? [outerPromise]
      : [outerPromise, nestedPromise];
    outcomes = await Promise.allSettled(pending);
  } finally {
    if (originalThen === undefined) delete Object.prototype.then;
    else Object.defineProperty(Object.prototype, 'then', originalThen);
  }

  assert.equal(
    authorizationThenCalls,
    0,
    'reference authorization validation must not consult inherited then',
  );
  assert.equal(nestedPromise, null, 'inherited then must not start a nested request before replay reservation');
  assert.equal(outcomes.length, 1);
  assert.equal(outcomes[0].status, 'fulfilled');
  assert.equal(outcomes[0].value?.decision, 'ALLOW');
  assert.equal(outcomes[0].value?.forwarded, true);
  assert.deepEqual(
    dispatchedRecipients,
    [RECIPIENT_A],
    'the single-use evidence must remain bound to the original request path',
  );
});
