import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import test from 'node:test';

import {
  WALLET_GUARD_BRIDGE_SCHEMA_VERSION,
  WalletGuardBridgeEnvelopeError,
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

function createAllowGateway(
  transport,
  referenceAuthorizationForRequest = () => referenceAuthorizationRecord(),
  trustedClock = () => '2026-09-02T11:00:00.000Z',
) {
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
    trustedClock,
    referenceAuthorizationForRequest,
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

test('mutable global Boolean cannot rewrite callback options before Proxy rejection', () => {
  const rawOptions = {
    chainId: '0x7a69',
    accounts: [ACCOUNT],
    maxSensitiveCalls: 1,
    dispatchSensitive() {},
  };
  const OriginalBoolean = globalThis.Boolean;
  let poisonCalls = 0;

  globalThis.Boolean = function poisonedBoolean(value) {
    if (value === rawOptions) {
      poisonCalls += 1;
      rawOptions.accounts = [ATTACKER];
    }
    return OriginalBoolean(value);
  };

  let transport;
  try {
    transport = createWalletGuardControlledCallbackProviderTransport(rawOptions);
  } finally {
    globalThis.Boolean = OriginalBoolean;
  }

  assert.equal(poisonCalls, 0, 'callback option capture must not consult mutable Boolean');
  assert.equal(transport.control.inspect().accounts[0], ACCOUNT);
  assert.equal(transport.control.inspect().sensitive_call_count, 0);
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

test('bridge descriptor integrity checks ignore inherited get and set accessors', async () => {
  const transport = createTransport((command, deliverRawJson) => {
    deliverRawJson(response(command));
  });
  const originalGet = Object.getOwnPropertyDescriptor(Object.prototype, 'get');
  const originalSet = Object.getOwnPropertyDescriptor(Object.prototype, 'set');
  let poisonCalls = 0;

  Object.defineProperty(Object.prototype, 'get', {
    configurable: true,
    get() {
      poisonCalls += 1;
      return undefined;
    },
  });
  Object.defineProperty(Object.prototype, 'set', {
    configurable: true,
    get() {
      poisonCalls += 1;
      return undefined;
    },
  });

  let pending;
  try {
    pending = transport.provider.request(sendTransaction());
  } finally {
    restoreDescriptor(Object.prototype, 'get', originalGet);
    restoreDescriptor(Object.prototype, 'set', originalSet);
  }

  assert.equal(await pending, TX_HASH);
  assert.equal(poisonCalls, 0, 'descriptor integrity checks must read own fields only');
});

test('invalid JSON errors cannot poison Promise runtime through an inherited name setter', async () => {
  const transport = createTransport((_command, deliverRawJson) => {
    deliverRawJson('{');
  });
  const originalName = Object.getOwnPropertyDescriptor(WalletGuardJsonIngressError.prototype, 'name');
  const originalThen = Object.getOwnPropertyDescriptor(Promise.prototype, 'then');
  let setterCalls = 0;
  let pending;

  Object.defineProperty(WalletGuardJsonIngressError.prototype, 'name', {
    configurable: true,
    set() {
      setterCalls += 1;
      Object.defineProperty(Promise.prototype, 'then', {
        configurable: true,
        writable: true,
        value() {},
      });
    },
  });

  try {
    pending = transport.provider.request(sendTransaction());
  } finally {
    restoreDescriptor(WalletGuardJsonIngressError.prototype, 'name', originalName);
    restoreDescriptor(Promise.prototype, 'then', originalThen);
  }

  await assert.rejects(pending);
  assert.equal(setterCalls, 0, 'JSON ingress errors must not invoke inherited name setters');
  assert.equal(transport.control.inspect().destroyed, true);
});

test('malformed bridge response cannot reenter after in-flight reservation is released', async () => {
  let transport;
  let dispatchCalls = 0;
  let nestedPromise = null;
  let armed = true;

  transport = createTransport((command, deliverRawJson) => {
    dispatchCalls += 1;
    if (command.sequence === 1) {
      deliverRawJson('{}');
      return;
    }
    deliverRawJson(response(command));
  }, 2);

  const original = Object.getOwnPropertyDescriptor(
    WalletGuardBridgeEnvelopeError.prototype,
    'name',
  );
  let poisonCalls = 0;
  Object.defineProperty(WalletGuardBridgeEnvelopeError.prototype, 'name', {
    configurable: true,
    set() {
      poisonCalls += 1;
      if (armed) {
        armed = false;
        nestedPromise = transport.provider.request(sendTransaction());
      }
    },
  });

  let outerOutcome;
  try {
    outerOutcome = await Promise.allSettled([
      transport.provider.request(sendTransaction()),
    ]);
    if (nestedPromise !== null) {
      await Promise.allSettled([nestedPromise]);
    }
  } finally {
    restoreDescriptor(WalletGuardBridgeEnvelopeError.prototype, 'name', original);
  }

  assert.equal(poisonCalls, 0, 'bridge validation errors must not execute inherited name setters');
  assert.equal(nestedPromise, null, 'malformed response handling must not originate a nested request');
  assert.equal(dispatchCalls, 1, 'malformed response must never free capacity for a second dispatch');
  assert.equal(outerOutcome.length, 1);
  assert.equal(outerOutcome[0].status, 'rejected');
  const inspected = transport.control.inspect();
  assert.equal(inspected.destroyed, true);
  assert.equal(inspected.in_flight, false);
  assert.equal(inspected.sensitive_call_count, 1);
  assert.equal(inspected.next_sequence, 2);
});

test('destroyed callback sessions fail context capture before requesting new authorization', async () => {
  let authorizationCalls = 0;
  const transport = createTransport((_command, deliverRawJson) => {
    deliverRawJson('{}');
  }, 2);
  const gateway = createAllowGateway(transport, () => {
    authorizationCalls += 1;
    const authorization = referenceAuthorizationRecord();
    if (authorizationCalls === 1) return authorization;
    return {
      ...authorization,
      run_id: 'run-callback-intrinsic-00000002',
      preflight_receipt_hash: '5'.repeat(64),
      witness_ack_hash: '6'.repeat(64),
    };
  });

  await assert.rejects(gateway.request(sendTransaction(ACCOUNT)));
  assert.equal(transport.control.inspect().destroyed, true);
  assert.equal(authorizationCalls, 1);

  await assert.rejects(gateway.request(sendTransaction(ACCOUNT)));
  assert.equal(
    authorizationCalls,
    1,
    'closed sessions must fail their first context sample before consuming authorization',
  );
  assert.equal(transport.control.inspect().sensitive_call_count, 1);
});

test('post-dispatch WeakMap.get drift cannot turn success into a retryable Gate failure', async () => {
  const originalGet = Object.getOwnPropertyDescriptor(WeakMap.prototype, 'get');
  let poisonCalls = 0;
  let dispatchCalls = 0;
  const transport = createTransport((command, deliverRawJson) => {
    dispatchCalls += 1;
    Object.defineProperty(WeakMap.prototype, 'get', {
      ...originalGet,
      value(key) {
        if (key !== null
            && typeof key === 'object'
            && Object.getPrototypeOf(key) === null
            && Object.getOwnPropertyNames(key).length === 0) {
          poisonCalls += 1;
          return undefined;
        }
        return Reflect.apply(originalGet.value, this, [key]);
      },
    });
    deliverRawJson(response(command));
  });
  const gateway = createAllowGateway(transport);

  let result;
  let rejection = null;
  try {
    try {
      result = await gateway.request(sendTransaction(ACCOUNT));
    } catch (error) {
      rejection = error;
    }
  } finally {
    restoreDescriptor(WeakMap.prototype, 'get', originalGet);
  }

  assert.equal(rejection, null, 'confirmed dispatch must not become a retryable Gate failure');
  assert.equal(result?.decision, 'ALLOW');
  assert.equal(result?.forwarded, true);
  assert.equal(result?.provider_result, TX_HASH);
  assert.equal(poisonCalls, 0, 'Gate capability state must use its captured WeakMap getter');
  assert.equal(dispatchCalls, 1);
  assert.equal(transport.control.inspect().destroyed, false);
});

test('post-import Date replacement cannot revive an expired Gate capability', async () => {
  let dispatchCalls = 0;
  let clockReads = 0;
  const transport = createTransport((command, deliverRawJson) => {
    dispatchCalls += 1;
    deliverRawJson(response(command));
  });
  const gateway = createAllowGateway(
    transport,
    () => referenceAuthorizationRecord(),
    () => {
      clockReads += 1;
      return clockReads < 3
        ? '2026-09-02T11:00:00.000Z'
        : '2026-09-02T11:01:00.000Z';
    },
  );
  const OriginalDate = globalThis.Date;
  const originalGetTime = OriginalDate.prototype.getTime;
  const originalToISOString = OriginalDate.prototype.toISOString;
  let poisonCalls = 0;

  class PoisonedDate extends OriginalDate {
    constructor(...args) {
      super(...args);
      poisonCalls += 1;
    }

    getTime() {
      const instant = Reflect.apply(originalToISOString, this, []);
      if (instant === '2026-09-02T11:00:30.000Z') {
        return Reflect.apply(originalGetTime, new OriginalDate('2026-09-02T12:00:00.000Z'), []);
      }
      return Reflect.apply(originalGetTime, this, []);
    }

    toISOString() {
      return Reflect.apply(originalToISOString, this, []);
    }
  }

  globalThis.Date = PoisonedDate;
  let outcome;
  try {
    outcome = await Promise.allSettled([
      gateway.request(sendTransaction(ACCOUNT)),
    ]);
  } finally {
    globalThis.Date = OriginalDate;
  }

  assert.equal(poisonCalls, 0, 'Gate time checks must not consult the replaced Date constructor');
  assert.equal(outcome[0].status, 'rejected');
  assert.ok(expectGateCode(outcome[0].reason, 'POMRX_GATE_E_CAPABILITY_EXPIRED'));
  assert.equal(dispatchCalls, 0, 'expired capability must fail before sensitive dispatch');
});
