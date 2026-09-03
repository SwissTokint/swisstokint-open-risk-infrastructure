import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import test from 'node:test';

import {
  WALLET_GUARD_BRIDGE_SCHEMA_VERSION,
} from '../../applications/blockchain-digital-assets/wallet-guard/bridge-json-envelope.mjs';
import {
  WalletGuardJsonIngressError,
  parseWalletGuardBoundedJsonData,
  parseWalletGuardJsonIngress,
} from '../../applications/blockchain-digital-assets/wallet-guard/json-ingress.mjs';
import {
  WalletGuardTrustedProviderTransportError,
  createWalletGuardControlledCallbackProviderTransport,
  createWalletGuardTrustedProviderGateway,
} from '../../applications/blockchain-digital-assets/wallet-guard/trusted-provider-transport.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const RECIPIENT = `0x${'2'.repeat(40)}`;
const ATTACKER = `0x${'9'.repeat(40)}`;
const TX_HASH = `0x${'b'.repeat(64)}`;
const ORIGIN = 'http://127.0.0.1:8787';

function sendTransaction(to = RECIPIENT) {
  return {
    method: 'eth_sendTransaction',
    params: [{ from: ACCOUNT, to, value: '0x1', data: '0x' }],
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

function createTransport(dispatchSensitive, maxSensitiveCalls = 8) {
  return createWalletGuardControlledCallbackProviderTransport({
    chainId: '0x7a69',
    accounts: [ACCOUNT],
    maxSensitiveCalls,
    dispatchSensitive,
  });
}

function referenceAuthorizationRecord() {
  return {
    run_id: 'run-callback-intrinsic-00000001',
    agent_ref: 'agent-callback-intrinsic-01',
    subject_ref: 'subject-callback-intrinsic-01',
    preflight_receipt_hash: '1'.repeat(64),
    witness_ack_hash: '2'.repeat(64),
    source_key_id: `ed25519-${'a'.repeat(32)}`,
    witness_key_id: `ed25519-${'b'.repeat(32)}`,
    verification_profile: 'pom-rx-v0.1/strict-errata-1',
    verifier_version: 'pom-rx-v0.1-strict-verifier/1',
    implementation_artifact_sha256: '3'.repeat(64),
    effective_verification_policy_sha256: '4'.repeat(64),
    witness_valid_until: '2026-09-02T12:00:00.000Z',
  };
}

function createAllowGateway(transport) {
  return createWalletGuardTrustedProviderGateway({
    captureTrustedOrigin: () => ORIGIN,
    provider: transport.provider,
    policy: {
      schema_version: 'wallet-guard-policy/0.1',
      policy_id: 'wallet-guard-callback-intrinsic/0.1',
      enabled: true,
      kill_switch: false,
      expected_chain_id: '0x7a69',
      allowed_origins: [ORIGIN],
      allowed_targets: [],
      allowed_recipients: [ACCOUNT],
      allowed_spenders: [],
      allowed_typed_data_verifying_contracts: [],
      max_native_value: '1',
      max_token_amount: '0',
      deny_unlimited_allowance: true,
      deny_operator_approval: true,
      require_simulation_for: [],
    },
    trustedClock: () => '2026-09-02T11:00:00.000Z',
    referenceAuthorizationForRequest: () => referenceAuthorizationRecord(),
    capabilityLifetimeMs: 30_000,
  });
}

function restoreDescriptor(target, key, descriptor) {
  if (descriptor === undefined) delete target[key];
  else Object.defineProperty(target, key, descriptor);
}

function expectTransportCode(error, code) {
  return error instanceof WalletGuardTrustedProviderTransportError && error.code === code;
}

function expectGateCode(error, code) {
  return Boolean(error) && typeof error === 'object' && error.code === code;
}

async function waitForBridge(getBridge) {
  for (let attempt = 0; attempt < 50 && getBridge() === null; attempt += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  return getBridge();
}

test('StrictJsonScanner state cannot be redirected by an inherited raw setter', () => {
  const original = Object.getOwnPropertyDescriptor(Object.prototype, 'raw');
  let poisonCalls = 0;
  Object.defineProperty(Object.prototype, 'raw', {
    configurable: true,
    set() {
      poisonCalls += 1;
      Object.defineProperty(this, 'raw', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: '{}',
      });
    },
  });

  try {
    assert.throws(
      () => parseWalletGuardBoundedJsonData('{"result":"first","result":"second"}'),
      (error) => error instanceof WalletGuardJsonIngressError
        && error.code === 'POMRX_WG_JSON_E_DUPLICATE_KEY',
    );
  } finally {
    restoreDescriptor(Object.prototype, 'raw', original);
  }
  assert.equal(poisonCalls, 0);
});

test('parsed JSON arrays are materialized without inherited numeric setters', () => {
  const raw = JSON.stringify(sendTransaction());
  const original = Object.getOwnPropertyDescriptor(Array.prototype, '0');
  let poisonCalls = 0;

  Object.defineProperty(Array.prototype, '0', {
    configurable: true,
    set(value) {
      let replacement = value;
      if (value && typeof value === 'object'
          && value.from === ACCOUNT && value.to === RECIPIENT) {
        poisonCalls += 1;
        replacement = Object.freeze({
          from: ACCOUNT,
          to: ATTACKER,
          value: '0x1',
          data: '0x',
        });
      }
      Object.defineProperty(this, '0', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: replacement,
      });
    },
  });

  let parsed;
  try {
    parsed = parseWalletGuardJsonIngress(raw);
  } finally {
    restoreDescriptor(Array.prototype, '0', original);
  }

  assert.equal(poisonCalls, 0);
  assert.equal(parsed.request.params[0].to, RECIPIENT);
});

test('parsed JSON array index conversion ignores post-import global String replacement', () => {
  const raw = '{"method":"personal_sign","params":["safe","attacker"]}';
  const original = Object.getOwnPropertyDescriptor(globalThis, 'String');
  let poisonCalls = 0;
  let parsed;

  Object.defineProperty(globalThis, 'String', {
    ...original,
    value(value) {
      poisonCalls += 1;
      if (value === 0) return '1';
      if (value === 1) return '0';
      return original.value(value);
    },
  });

  try {
    parsed = parseWalletGuardJsonIngress(raw);
  } finally {
    restoreDescriptor(globalThis, 'String', original);
  }

  assert.equal(poisonCalls, 0);
  assert.deepEqual(parsed.request.params, ['safe', 'attacker']);
});

test('callback sensitive-call logging executes no inherited numeric setter', async () => {
  const original = Object.getOwnPropertyDescriptor(Array.prototype, '0');
  let poisonCalls = 0;

  Object.defineProperty(Array.prototype, '0', {
    configurable: true,
    set(value) {
      if (value && typeof value === 'object'
          && value.schema_version === WALLET_GUARD_BRIDGE_SCHEMA_VERSION
          && value.request?.method === 'eth_sendTransaction') {
        poisonCalls += 1;
      }
      Object.defineProperty(this, '0', {
        configurable: true,
        enumerable: true,
        writable: true,
        value,
      });
    },
  });

  let transport;
  try {
    transport = createTransport((command, deliverRawJson) => {
      deliverRawJson(response(command));
    });
    assert.equal(await transport.provider.request(sendTransaction()), TX_HASH);
  } finally {
    restoreDescriptor(Array.prototype, '0', original);
  }

  assert.equal(poisonCalls, 0);
  const inspected = transport.control.inspect();
  assert.equal(inspected.sensitive_call_count, 1);
  assert.equal(inspected.sensitive_calls[0].request.params[0].to, RECIPIENT);
});

test('callback log index conversion ignores post-import global String replacement', async () => {
  let dispatchCalls = 0;
  const transport = createTransport((command, deliverRawJson) => {
    dispatchCalls += 1;
    deliverRawJson(response(command));
  }, 1);
  const original = Object.getOwnPropertyDescriptor(globalThis, 'String');
  let poisonCalls = 0;
  let forgedSlot = 0;

  Object.defineProperty(globalThis, 'String', {
    ...original,
    value() {
      poisonCalls += 1;
      forgedSlot += 1;
      return `forged-slot-${forgedSlot}`;
    },
  });

  try {
    assert.equal(await transport.provider.request(sendTransaction()), TX_HASH);
    await assert.rejects(
      transport.provider.request(sendTransaction()),
      (error) => expectTransportCode(error, 'POMRX_WG_TRANSPORT_E_LOG_FULL'),
    );
  } finally {
    restoreDescriptor(globalThis, 'String', original);
  }

  assert.equal(poisonCalls, 0);
  assert.equal(dispatchCalls, 1);
  const inspected = transport.control.inspect();
  assert.equal(inspected.sensitive_call_count, 1);
  assert.equal(inspected.sensitive_calls.length, 1);
  assert.equal(inspected.sensitive_calls[0].request.params[0].to, RECIPIENT);
});

test('callback transport rejects chain ids beyond the bridge command bound at construction', () => {
  const oversizedChainId = `0x1${'0'.repeat(64)}`;
  let dispatchCalls = 0;

  assert.throws(
    () => createWalletGuardControlledCallbackProviderTransport({
      chainId: oversizedChainId,
      accounts: [ACCOUNT],
      maxSensitiveCalls: 1,
      dispatchSensitive() {
        dispatchCalls += 1;
      },
    }),
    (error) => expectTransportCode(error, 'POMRX_WG_TRANSPORT_E_INVALID'),
  );
  assert.equal(dispatchCalls, 0);
});

test('post-import builtin synchronization cannot replace the captured CSPRNG callable', () => {
  const original = Object.getOwnPropertyDescriptor(crypto, 'randomBytes');
  let poisonCalls = 0;
  Object.defineProperty(crypto, 'randomBytes', {
    ...original,
    value(size) {
      poisonCalls += 1;
      return Buffer.alloc(size, 0x11);
    },
  });
  syncBuiltinESMExports();

  let first;
  let second;
  try {
    first = createTransport(() => {});
    second = createTransport(() => {});
  } finally {
    restoreDescriptor(crypto, 'randomBytes', original);
    syncBuiltinESMExports();
  }

  assert.equal(poisonCalls, 0);
  assert.notEqual(first.control.inspect().session_id, second.control.inspect().session_id);
});

test('asynchronous callback settlement rechecks Promise runtime before resolving', async () => {
  let bridge = null;
  const transport = createTransport((command, deliverRawJson) => {
    bridge = { command, deliverRawJson };
  });
  const gateway = createAllowGateway(transport);
  const pending = gateway.request(sendTransaction(ACCOUNT));

  await waitForBridge(() => bridge);
  assert.ok(bridge, 'gateway never reached callback dispatch');

  const original = Object.getOwnPropertyDescriptor(Object.prototype, 'then');
  let poisonCalls = 0;
  Object.defineProperty(Object.prototype, 'then', {
    configurable: true,
    writable: true,
    value(resolve) {
      poisonCalls += 1;
      resolve('OWNED');
    },
  });

  let rejection = null;
  let result;
  try {
    bridge.deliverRawJson(response(bridge.command));
    try {
      result = await pending;
    } catch (error) {
      rejection = error;
    }
  } finally {
    restoreDescriptor(Object.prototype, 'then', original);
  }

  assert.equal(result, undefined);
  assert.ok(
    expectGateCode(rejection, 'POMRX_GATE_E_DOWNSTREAM_FAILED'),
    `unexpected settlement: ${String(rejection?.code ?? result)}`,
  );
  assert.equal(poisonCalls, 0);
  assert.equal(transport.control.inspect().destroyed, true);
});

test('runtime drift introduced after callback return cannot substitute outer gateway settlement', async () => {
  let bridge = null;
  const transport = createTransport((command, deliverRawJson) => {
    bridge = { command, deliverRawJson };
  });
  const gateway = createAllowGateway(transport);
  const pending = gateway.request(sendTransaction(ACCOUNT));

  await waitForBridge(() => bridge);
  assert.ok(bridge, 'gateway never reached callback dispatch');

  bridge.deliverRawJson(response(bridge.command));

  const original = Object.getOwnPropertyDescriptor(Object.prototype, 'then');
  let poisonCalls = 0;
  Object.defineProperty(Object.prototype, 'then', {
    configurable: true,
    writable: true,
    value(resolve) {
      poisonCalls += 1;
      restoreDescriptor(Object.prototype, 'then', original);
      resolve({
        decision: 'ALLOW',
        forwarded: true,
        provider_result: 'OWNED',
      });
    },
  });

  let result;
  let rejection = null;
  try {
    try {
      result = await pending;
    } catch (error) {
      rejection = error;
    }
  } finally {
    restoreDescriptor(Object.prototype, 'then', original);
  }

  assert.equal(poisonCalls, 0, 'outer gateway settlement must not consult inherited then');
  assert.equal(rejection, null);
  assert.equal(result?.decision, 'ALLOW');
  assert.equal(result?.forwarded, true);
  assert.equal(result?.provider_result, TX_HASH);
  assert.equal(transport.control.inspect().destroyed, false);
});