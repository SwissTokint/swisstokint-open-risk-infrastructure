import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { types as utilTypes } from 'node:util';
import test from 'node:test';

import {
  WALLET_GUARD_BRIDGE_SCHEMA_VERSION,
  WalletGuardBridgeEnvelopeError,
  makeWalletGuardBridgeCommand,
  parseWalletGuardBridgeResponse,
  serializeWalletGuardBridgeCommand,
} from '../../applications/blockchain-digital-assets/wallet-guard/bridge-json-envelope.mjs';
import {
  WalletGuardTrustedProviderTransportError,
  createWalletGuardControlledCallbackProviderTransport,
  createWalletGuardTrustedProviderGateway,
} from '../../applications/blockchain-digital-assets/wallet-guard/trusted-provider-transport.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const RECIPIENT = `0x${'2'.repeat(40)}`;
const SESSION_ID = 'a'.repeat(64);
const TX_HASH = `0x${'b'.repeat(64)}`;
const OTHER_TX_HASH = `0x${'c'.repeat(64)}`;
const ORIGIN = 'http://127.0.0.1:8787';

function sendTransaction(to = RECIPIENT) {
  return {
    method: 'eth_sendTransaction',
    params: [{ from: ACCOUNT, to, value: '0x1', data: '0x' }],
  };
}

function response(command, fields = {}) {
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
    ...fields,
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

function expectTransportCode(error, code) {
  assert.ok(error instanceof WalletGuardTrustedProviderTransportError);
  assert.equal(error.code, code);
  return true;
}

function referenceAuthorizationRecord() {
  return {
    run_id: 'run-callback-transport-00000001',
    agent_ref: 'agent-callback-transport-01',
    subject_ref: 'subject-callback-transport-01',
    preflight_receipt_hash: '1'.repeat(64),
    witness_ack_hash: '2'.repeat(64),
    source_key_id: `ed25519-${'a'.repeat(32)}`,
    witness_key_id: `ed25519-${'b'.repeat(32)}`,
    verification_profile: 'pom-rx-v0.1/strict-errata-1',
    verifier_version: 'pom-rx-v0.1-strict-verifier/1',
    implementation_artifact_sha256: '3'.repeat(64),
    effective_verification_policy_sha256: '4'.repeat(64),
    witness_valid_until: '2026-08-24T13:00:00.000Z',
  };
}

test('callback transport originates same-realm Promises and binds a success response', async () => {
  let dispatchedCommand;
  const transport = createTransport((command, deliverRawJson) => {
    dispatchedCommand = command;
    deliverRawJson(response(command));
  });

  const chainTransport = transport.provider.request({ method: 'eth_chainId', params: [] });
  assert.equal(utilTypes.isPromise(chainTransport), true);
  assert.equal(Object.getPrototypeOf(chainTransport), Promise.prototype);
  assert.equal(await chainTransport, '0x7a69');

  const accountsTransport = transport.provider.request({ method: 'eth_accounts', params: [] });
  assert.equal(utilTypes.isPromise(accountsTransport), true);
  assert.deepEqual(await accountsTransport, [ACCOUNT]);

  const sensitiveTransport = transport.provider.request(sendTransaction());
  assert.equal(utilTypes.isPromise(sensitiveTransport), true);
  assert.equal(Object.getPrototypeOf(sensitiveTransport), Promise.prototype);
  assert.equal(await sensitiveTransport, TX_HASH);
  assert.equal(
    dispatchedCommand.request_id,
    `wg-bridge-${dispatchedCommand.session_id.slice(0, 16)}-00000001`,
  );
  assert.equal(dispatchedCommand.sequence, 1);
  assert.equal(dispatchedCommand.expected_chain_id, '0x7a69');
  assert.equal(dispatchedCommand.expected_account, ACCOUNT);
  assert.equal(JSON.parse(serializeWalletGuardBridgeCommand(dispatchedCommand)).request.method, 'eth_sendTransaction');
  assert.equal(transport.control.inspect().in_flight, false);
  assert.equal(transport.control.sensitiveCallCount(), 1);
});

test('one sensitive command may be in flight and every later command gets a fresh identity', async () => {
  const pending = [];
  const transport = createTransport((command, deliverRawJson, reportFailure) => {
    pending.push({ command, deliverRawJson, reportFailure });
  });

  const first = transport.provider.request(sendTransaction());
  await assert.rejects(
    transport.provider.request(sendTransaction()),
    (error) => expectTransportCode(error, 'POMRX_WG_TRANSPORT_E_IN_FLIGHT'),
  );
  assert.equal(pending.length, 1);
  pending[0].deliverRawJson(response(pending[0].command));
  assert.equal(await first, TX_HASH);

  const second = transport.provider.request(sendTransaction());
  assert.equal(pending[1].command.sequence, 2);
  assert.notEqual(pending[1].command.request_id, pending[0].command.request_id);
  pending[0].deliverRawJson(response(pending[0].command, { result: OTHER_TX_HASH }));
  assert.equal(transport.control.inspect().in_flight, true);
  pending[1].deliverRawJson(response(pending[1].command, { result: OTHER_TX_HASH }));
  assert.equal(await second, OTHER_TX_HASH);
  assert.equal(transport.control.sensitiveCallCount(), 2);
});

test('CSPRNG-owned sessions reject a response replayed into a new transport instance', async () => {
  const firstPending = [];
  const secondPending = [];
  const firstTransport = createTransport((command, deliverRawJson) => {
    firstPending.push({ command, deliverRawJson });
  });
  const secondTransport = createTransport((command, deliverRawJson) => {
    secondPending.push({ command, deliverRawJson });
  });

  const first = firstTransport.provider.request(sendTransaction());
  const second = secondTransport.provider.request(sendTransaction());
  assert.notEqual(firstPending[0].command.session_id, secondPending[0].command.session_id);
  secondPending[0].deliverRawJson(response(firstPending[0].command));
  await assert.rejects(
    second,
    (error) => expectTransportCode(error, 'POMRX_WG_TRANSPORT_E_BRIDGE_INTERNAL_ERROR'),
  );
  firstPending[0].deliverRawJson(response(firstPending[0].command));
  assert.equal(await first, TX_HASH);
});

test('wrong observed chain or account destroys the session before any retry', async () => {
  const mutations = [
    { observed_chain_id: '0xaa36a7' },
    { observed_account: `0x${'3'.repeat(40)}` },
  ];
  for (const mutation of mutations) {
    let dispatchCalls = 0;
    const transport = createTransport((command, deliverRawJson) => {
      dispatchCalls += 1;
      deliverRawJson(response(command, mutation));
    });
    await assert.rejects(
      transport.provider.request(sendTransaction()),
      (error) => expectTransportCode(error, 'POMRX_WG_TRANSPORT_E_BRIDGE_INTERNAL_ERROR'),
    );
    assert.equal(transport.control.inspect().destroyed, true);
    await assert.rejects(
      transport.provider.request(sendTransaction()),
      (error) => expectTransportCode(error, 'POMRX_WG_TRANSPORT_E_SESSION_CLOSED'),
    );
    assert.equal(dispatchCalls, 1);
  }
});

test('nested sensitive reentrancy cannot originate a second dispatch', async () => {
  let transport;
  let nested;
  let dispatchCalls = 0;
  transport = createTransport((command, deliverRawJson) => {
    dispatchCalls += 1;
    nested = transport.provider.request(sendTransaction());
    deliverRawJson(response(command));
  });
  assert.equal(await transport.provider.request(sendTransaction()), TX_HASH);
  await assert.rejects(
    nested,
    (error) => expectTransportCode(error, 'POMRX_WG_TRANSPORT_E_IN_FLIGHT'),
  );
  assert.equal(dispatchCalls, 1);
  assert.equal(transport.control.sensitiveCallCount(), 1);
});

test('sensitive capacity is reserved before dispatch and cannot be exceeded', async () => {
  let dispatchCalls = 0;
  const transport = createTransport((command, deliverRawJson) => {
    dispatchCalls += 1;
    deliverRawJson(response(command));
  }, 1);
  assert.equal(await transport.provider.request(sendTransaction()), TX_HASH);
  await assert.rejects(
    transport.provider.request(sendTransaction()),
    (error) => expectTransportCode(error, 'POMRX_WG_TRANSPORT_E_LOG_FULL'),
  );
  assert.equal(dispatchCalls, 1);
  assert.equal(transport.control.sensitiveCallCount(), 1);
  assert.equal(transport.control.inspect().next_sequence, 2);
});

test('a non-undefined dispatcher return fails closed without inspecting a thenable', async () => {
  let thenGetterCalls = 0;
  const thenable = {};
  Object.defineProperty(thenable, 'then', {
    get() {
      thenGetterCalls += 1;
      throw new Error('then getter must not execute');
    },
  });
  const transport = createTransport(() => thenable);

  await assert.rejects(
    transport.provider.request(sendTransaction()),
    (error) => expectTransportCode(error, 'POMRX_WG_TRANSPORT_E_BRIDGE_INTERNAL_ERROR'),
  );
  assert.equal(thenGetterCalls, 0);
  assert.equal(transport.control.sensitiveCallCount(), 1);
  assert.equal(transport.control.inspect().in_flight, false);
});

test('post-import RegExp.prototype.exec poisoning cannot bless an invalid transaction hash', async () => {
  const original = Object.getOwnPropertyDescriptor(RegExp.prototype, 'exec');
  const sourceGetter = Object.getOwnPropertyDescriptor(RegExp.prototype, 'source').get;
  let poisonCalls = 0;
  Object.defineProperty(RegExp.prototype, 'exec', {
    ...original,
    value(input) {
      const source = Reflect.apply(sourceGetter, this, []);
      if (source === '^0x[0-9a-f]{64}$' || source === '^[0-9a-f]{64}$') {
        poisonCalls += 1;
        return ['forged-match'];
      }
      return Reflect.apply(original.value, this, [input]);
    },
  });
  try {
    const transport = createTransport((command, deliverRawJson) => {
      deliverRawJson(response(command, { result: 'NOT_A_HASH' }));
    });
    await assert.rejects(
      transport.provider.request(sendTransaction()),
      (error) => expectTransportCode(error, 'POMRX_WG_TRANSPORT_E_BRIDGE_INTERNAL_ERROR'),
    );
  } finally {
    Object.defineProperty(RegExp.prototype, 'exec', original);
  }
  assert.equal(poisonCalls, 0);
});

test('post-import Array.prototype.toJSON poisoning cannot alter serialized command arrays', () => {
  const command = makeWalletGuardBridgeCommand({
    sessionId: SESSION_ID,
    sequence: 1,
    expectedChainId: '0x7a69',
    expectedAccount: ACCOUNT,
    request: sendTransaction(),
  });
  const original = Object.getOwnPropertyDescriptor(Array.prototype, 'toJSON');
  let poisonCalls = 0;
  let serialized;
  try {
    Object.defineProperty(Array.prototype, 'toJSON', {
      configurable: true,
      value() {
        poisonCalls += 1;
        return ['POISONED'];
      },
    });
    serialized = serializeWalletGuardBridgeCommand(command);
  } finally {
    if (original === undefined) delete Array.prototype.toJSON;
    else Object.defineProperty(Array.prototype, 'toJSON', original);
  }
  assert.equal(poisonCalls, 0);
  assert.deepEqual(JSON.parse(serialized).request.params, sendTransaction().params);
});

test('post-import JSON.parse poisoning cannot fabricate a bound bridge response', async () => {
  const original = Object.getOwnPropertyDescriptor(JSON, 'parse');
  let poisonCalls = 0;
  let transport;
  try {
    transport = createTransport((command, deliverRawJson) => {
      Object.defineProperty(JSON, 'parse', {
        ...original,
        value() {
          poisonCalls += 1;
          return {
            schema_version: command.schema_version,
            session_id: command.session_id,
            sequence: command.sequence,
            request_id: command.request_id,
            observed_chain_id: command.expected_chain_id,
            observed_account: command.expected_account,
            outcome: 'result',
            result: TX_HASH,
            error: null,
          };
        },
      });
      deliverRawJson('{}');
    });
    await assert.rejects(
      transport.provider.request(sendTransaction()),
      (error) => expectTransportCode(error, 'POMRX_WG_TRANSPORT_E_BRIDGE_INTERNAL_ERROR'),
    );
  } finally {
    Object.defineProperty(JSON, 'parse', original);
  }
  assert.equal(poisonCalls, 0);
  assert.equal(transport.control.inspect().destroyed, true);
});

test('post-import Object.entries poisoning cannot fabricate a bound bridge response', async () => {
  const original = Object.getOwnPropertyDescriptor(Object, 'entries');
  let poisonCalls = 0;
  let transport;
  try {
    transport = createTransport((command, deliverRawJson) => {
      Object.defineProperty(Object, 'entries', {
        ...original,
        value(value) {
          poisonCalls += 1;
          if (value && typeof value === 'object') {
            return Reflect.apply(original.value, Object, [{
              schema_version: command.schema_version,
              session_id: command.session_id,
              sequence: command.sequence,
              request_id: command.request_id,
              observed_chain_id: command.expected_chain_id,
              observed_account: command.expected_account,
              outcome: 'result',
              result: TX_HASH,
              error: null,
            }]);
          }
          return Reflect.apply(original.value, Object, [value]);
        },
      });
      deliverRawJson('{}');
    });
    await assert.rejects(
      transport.provider.request(sendTransaction()),
      (error) => expectTransportCode(error, 'POMRX_WG_TRANSPORT_E_BRIDGE_INTERNAL_ERROR'),
    );
  } finally {
    Object.defineProperty(Object, 'entries', original);
  }
  assert.equal(poisonCalls, 0);
  assert.equal(transport.control.inspect().destroyed, true);
});

test('post-import descriptor poisoning cannot substitute the expected bridge identity', async () => {
  const original = Object.getOwnPropertyDescriptor(Object, 'getOwnPropertyDescriptors');
  let poisonCalls = 0;
  let transport;
  try {
    transport = createTransport((command, deliverRawJson) => {
      Object.defineProperty(Object, 'getOwnPropertyDescriptors', {
        ...original,
        value(value) {
          poisonCalls += 1;
          return Reflect.apply(original.value, Object, [value]);
        },
      });
      const otherSession = 'd'.repeat(64);
      deliverRawJson(response(command, {
        session_id: otherSession,
        request_id: `wg-bridge-${otherSession.slice(0, 16)}-00000001`,
      }));
    });
    await assert.rejects(
      transport.provider.request(sendTransaction()),
      (error) => expectTransportCode(error, 'POMRX_WG_TRANSPORT_E_BRIDGE_INTERNAL_ERROR'),
    );
  } finally {
    Object.defineProperty(Object, 'getOwnPropertyDescriptors', original);
  }
  assert.equal(poisonCalls, 0);
  assert.equal(transport.control.inspect().destroyed, true);
});

test('post-import descriptor poisoning cannot rewrite callback request capture', async () => {
  const original = Object.getOwnPropertyDescriptor(Object, 'getOwnPropertyDescriptors');
  let poisonCalls = 0;
  const transport = createTransport((command, deliverRawJson) => {
    deliverRawJson(response(command));
  });
  try {
    Object.defineProperty(Object, 'getOwnPropertyDescriptors', {
      ...original,
      value(value) {
        poisonCalls += 1;
        return Reflect.apply(original.value, Object, [value]);
      },
    });
    assert.equal(await transport.provider.request(sendTransaction()), TX_HASH);
  } finally {
    Object.defineProperty(Object, 'getOwnPropertyDescriptors', original);
  }
  assert.equal(poisonCalls, 0);
  assert.equal(transport.control.sensitiveCallCount(), 1);
});

test('post-import Object.freeze poisoning cannot turn a bounded error into success', async () => {
  const original = Object.getOwnPropertyDescriptor(Object, 'freeze');
  let poisonCalls = 0;
  try {
    const transport = createTransport((command, deliverRawJson) => {
      Object.defineProperty(Object, 'freeze', {
        ...original,
        value() {
          poisonCalls += 1;
          return { outcome: 'result', result: TX_HASH };
        },
      });
      deliverRawJson(response(command, {
        outcome: 'error',
        result: null,
        error: { code: 'USER_REJECTED' },
      }));
    });
    await assert.rejects(
      transport.provider.request(sendTransaction()),
      (error) => expectTransportCode(error, 'POMRX_WG_TRANSPORT_E_BRIDGE_USER_REJECTED'),
    );
  } finally {
    Object.defineProperty(Object, 'freeze', original);
  }
  assert.equal(poisonCalls, 0);
});

test('reentrant delivery is buffered until the dispatcher return contract is validated', async () => {
  const transport = createTransport((command, deliverRawJson, reportFailure) => {
    deliverRawJson(response(command));
    reportFailure('INTERNAL_ERROR');
    deliverRawJson(response(command, { result: OTHER_TX_HASH }));
  });

  await assert.rejects(
    transport.provider.request(sendTransaction()),
    (error) => expectTransportCode(error, 'POMRX_WG_TRANSPORT_E_BRIDGE_INTERNAL_ERROR'),
  );
  assert.equal(transport.control.inspect().destroyed, true);
});

test('bounded bridge errors reject locally and never expose a wallet message', async () => {
  const transport = createTransport((command, deliverRawJson) => {
    deliverRawJson(response(command, {
      outcome: 'error',
      result: null,
      error: { code: 'USER_REJECTED' },
    }));
  });

  await assert.rejects(
    transport.provider.request(sendTransaction()),
    (error) => expectTransportCode(error, 'POMRX_WG_TRANSPORT_E_BRIDGE_USER_REJECTED'),
  );
  assert.equal(transport.control.sensitiveCallCount(), 1);
  await assert.rejects(
    transport.provider.request(sendTransaction()),
    (error) => expectTransportCode(error, 'POMRX_WG_TRANSPORT_E_SESSION_CLOSED'),
  );
});

test('strict response parsing rejects duplicate keys, wrong binding, and non-lowercase hashes', () => {
  const command = makeWalletGuardBridgeCommand({
    sessionId: SESSION_ID,
    sequence: 1,
    expectedChainId: '0x7a69',
    expectedAccount: ACCOUNT,
    request: sendTransaction(),
  });
  const identity = {
    session_id: SESSION_ID,
    sequence: 1,
    request_id: command.request_id,
    expected_chain_id: '0x7a69',
    expected_account: ACCOUNT,
  };
  const duplicate = `{"schema_version":"${WALLET_GUARD_BRIDGE_SCHEMA_VERSION}","session_id":"${SESSION_ID}","sequence":1,"request_id":"${identity.request_id}","outcome":"result","outcome":"error","result":"${TX_HASH}","error":null}`;
  assert.throws(
    () => parseWalletGuardBridgeResponse(duplicate, identity),
    (error) => error instanceof WalletGuardBridgeEnvelopeError
      && error.code === 'POMRX_WG_BRIDGE_E_JSON',
  );

  const base = {
    schema_version: WALLET_GUARD_BRIDGE_SCHEMA_VERSION,
    session_id: SESSION_ID,
    sequence: 1,
    request_id: identity.request_id,
    observed_chain_id: '0x7a69',
    observed_account: ACCOUNT,
    outcome: 'result',
    result: TX_HASH,
    error: null,
  };
  assert.throws(
    () => parseWalletGuardBridgeResponse(JSON.stringify(base), { ...identity, sequence: 2 }),
    (error) => error instanceof WalletGuardBridgeEnvelopeError
      && error.code === 'POMRX_WG_BRIDGE_E_BINDING',
  );
  assert.throws(
    () => parseWalletGuardBridgeResponse(
      JSON.stringify({ ...base, result: TX_HASH.toUpperCase() }),
      identity,
    ),
    (error) => error instanceof WalletGuardBridgeEnvelopeError
      && error.code === 'POMRX_WG_BRIDGE_E_RESULT',
  );
  assert.throws(
    () => parseWalletGuardBridgeResponse(
      JSON.stringify({ ...base, observed_chain_id: '0xaa36a7' }),
      identity,
    ),
    (error) => error instanceof WalletGuardBridgeEnvelopeError
      && error.code === 'POMRX_WG_BRIDGE_E_BINDING',
  );
  assert.throws(
    () => parseWalletGuardBridgeResponse(
      JSON.stringify({ ...base, observed_account: `0x${'3'.repeat(40)}` }),
      identity,
    ),
    (error) => error instanceof WalletGuardBridgeEnvelopeError
      && error.code === 'POMRX_WG_BRIDGE_E_BINDING',
  );
});

test('bridge command boundaries reject Proxy and accessor inputs without execution', () => {
  let proxyTraps = 0;
  const proxy = new Proxy({
    sessionId: SESSION_ID,
    sequence: 1,
    expectedChainId: '0x7a69',
    expectedAccount: ACCOUNT,
    request: sendTransaction(),
  }, {
    get(target, key, receiver) {
      proxyTraps += 1;
      return Reflect.get(target, key, receiver);
    },
    ownKeys(target) {
      proxyTraps += 1;
      return Reflect.ownKeys(target);
    },
  });
  assert.throws(
    () => makeWalletGuardBridgeCommand(proxy),
    (error) => error instanceof WalletGuardBridgeEnvelopeError
      && error.code === 'POMRX_WG_BRIDGE_E_SHAPE',
  );
  assert.equal(proxyTraps, 0);

  let getterCalls = 0;
  const accessor = {
    sessionId: SESSION_ID,
    sequence: 1,
    expectedChainId: '0x7a69',
    expectedAccount: ACCOUNT,
    request: sendTransaction(),
  };
  Object.defineProperty(accessor, 'request', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return sendTransaction();
    },
  });
  assert.throws(
    () => makeWalletGuardBridgeCommand(accessor),
    (error) => error instanceof WalletGuardBridgeEnvelopeError
      && error.code === 'POMRX_WG_BRIDGE_E_SHAPE',
  );
  assert.equal(getterCalls, 0);
});

test('bridge boundary detects post-import util.types.isProxy drift before poison or Proxy traps', () => {
  const original = Object.getOwnPropertyDescriptor(utilTypes, 'isProxy');
  let poisonCalls = 0;
  let proxyTraps = 0;
  Object.defineProperty(utilTypes, 'isProxy', {
    ...original,
    value() {
      poisonCalls += 1;
      return false;
    },
  });
  const proxy = new Proxy({
    sessionId: SESSION_ID,
    sequence: 1,
    expectedChainId: '0x7a69',
    expectedAccount: ACCOUNT,
    request: sendTransaction(),
  }, {
    get(target, key, receiver) {
      proxyTraps += 1;
      return Reflect.get(target, key, receiver);
    },
    ownKeys(target) {
      proxyTraps += 1;
      return Reflect.ownKeys(target);
    },
  });
  try {
    assert.throws(
      () => makeWalletGuardBridgeCommand(proxy),
      (error) => error instanceof WalletGuardBridgeEnvelopeError
        && error.code === 'POMRX_WG_BRIDGE_E_RUNTIME_INTEGRITY',
    );
  } finally {
    Object.defineProperty(utilTypes, 'isProxy', original);
  }
  assert.equal(poisonCalls, 0);
  assert.equal(proxyTraps, 0);
});

test('unsupported methods and dispatcher failures are fail-closed', async () => {
  let dispatchCalls = 0;
  const transport = createTransport(() => {
    dispatchCalls += 1;
    throw new Error('host failure');
  });

  await assert.rejects(
    transport.provider.request({ method: 'wallet_switchEthereumChain', params: [] }),
    (error) => expectTransportCode(error, 'POMRX_WG_TRANSPORT_E_METHOD'),
  );
  assert.equal(dispatchCalls, 0);

  await assert.rejects(
    transport.provider.request(sendTransaction()),
    (error) => expectTransportCode(error, 'POMRX_WG_TRANSPORT_E_BRIDGE_INTERNAL_ERROR'),
  );
  assert.equal(dispatchCalls, 1);
});

test('trusted gateway accepts callback provenance and DENY causes zero sensitive dispatch', async () => {
  let dispatchCalls = 0;
  const transport = createTransport(() => {
    dispatchCalls += 1;
  });
  const gateway = createWalletGuardTrustedProviderGateway({
    captureTrustedOrigin: () => ORIGIN,
    provider: transport.provider,
    policy: {
      schema_version: 'wallet-guard-policy/0.1',
      policy_id: 'wallet-guard-anvil-burner/0.1',
      enabled: true,
      kill_switch: false,
      expected_chain_id: '0x7a69',
      allowed_origins: [ORIGIN],
      allowed_targets: [],
      allowed_recipients: [],
      allowed_spenders: [],
      allowed_typed_data_verifying_contracts: [],
      max_native_value: '1',
      max_token_amount: '0',
      deny_unlimited_allowance: true,
      deny_operator_approval: true,
      require_simulation_for: [],
    },
    trustedClock: () => '2026-08-24T12:00:00.000Z',
    referenceAuthorizationForRequest: () => {
      throw new Error('DENY must not request authorization');
    },
    capabilityLifetimeMs: 30_000,
  });

  const result = await gateway.request(sendTransaction());
  assert.equal(result.decision, 'DENY');
  assert.equal(result.forwarded, false);
  assert.equal(dispatchCalls, 0);
  assert.equal(transport.control.sensitiveCallCount(), 0);
});

test('trusted gateway ALLOW binds context and forwards exactly one callback command', async () => {
  let dispatchCalls = 0;
  const transport = createTransport((command, deliverRawJson) => {
    dispatchCalls += 1;
    assert.equal(command.expected_chain_id, '0x7a69');
    assert.equal(command.expected_account, ACCOUNT);
    deliverRawJson(response(command));
  });
  const gateway = createWalletGuardTrustedProviderGateway({
    captureTrustedOrigin: () => ORIGIN,
    provider: transport.provider,
    policy: {
      schema_version: 'wallet-guard-policy/0.1',
      policy_id: 'wallet-guard-anvil-burner/0.1',
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
    trustedClock: () => '2026-08-24T12:00:00.000Z',
    referenceAuthorizationForRequest: () => referenceAuthorizationRecord(),
    capabilityLifetimeMs: 30_000,
  });

  const result = await gateway.request(sendTransaction(ACCOUNT));
  assert.equal(result.decision, 'ALLOW');
  assert.equal(result.forwarded, true);
  assert.equal(result.provider_result, TX_HASH);
  assert.equal(dispatchCalls, 1);
  assert.equal(transport.control.inspect().context_reads, 12);
  assert.equal(transport.control.sensitiveCallCount(), 1);
});

test('post-dispatch Promise drift destroys the session without returning an owned transport', () => {
  const original = Object.getOwnPropertyDescriptor(Promise.prototype, 'then');
  let poisonCalls = 0;
  const transport = createTransport(() => {
    Object.defineProperty(Promise.prototype, 'then', {
      ...original,
      value() {
        poisonCalls += 1;
        return 'OWNED';
      },
    });
  });
  try {
    assert.throws(
      () => transport.provider.request(sendTransaction()),
      (error) => expectTransportCode(error, 'POMRX_WG_TRANSPORT_E_RUNTIME_INTEGRITY'),
    );
  } finally {
    Object.defineProperty(Promise.prototype, 'then', original);
  }
  assert.equal(poisonCalls, 0);
  assert.equal(transport.control.inspect().destroyed, true);
});

test('strict child observes no orphaned rejection for an invalid dispatcher return', () => {
  const moduleUrl = new URL(
    '../../applications/blockchain-digital-assets/wallet-guard/trusted-provider-transport.mjs',
    import.meta.url,
  ).href;
  const source = `
    const module = await import(${JSON.stringify(moduleUrl)});
    const thenable = {};
    Object.defineProperty(thenable, 'then', { get() { throw new Error('must not run'); } });
    const transport = module.createWalletGuardControlledCallbackProviderTransport({
      chainId: '0x7a69',
      accounts: ['${ACCOUNT}'],
      maxSensitiveCalls: 1,
      dispatchSensitive() { return thenable; },
    });
    let code = null;
    try {
      await transport.provider.request(${JSON.stringify(sendTransaction())});
    } catch (error) {
      code = error?.code ?? null;
    }
    if (code !== 'POMRX_WG_TRANSPORT_E_BRIDGE_INTERNAL_ERROR') {
      throw new Error('unexpected rejection: ' + code);
    }
    await new Promise((resolve) => setImmediate(resolve));
  `;
  const child = spawnSync(
    process.execPath,
    ['--unhandled-rejections=strict', '--input-type=module', '--eval', source],
    { encoding: 'utf8' },
  );
  assert.equal(
    child.status,
    0,
    `strict child failed\nstdout:\n${child.stdout}\nstderr:\n${child.stderr}`,
  );
  assert.equal(child.signal, null);
});

test('strict child leaves no orphan when dispatcher reports failure then poisons Promise', () => {
  const moduleUrl = new URL(
    '../../applications/blockchain-digital-assets/wallet-guard/trusted-provider-transport.mjs',
    import.meta.url,
  ).href;
  const source = `
    const module = await import(${JSON.stringify(moduleUrl)});
    const original = Object.getOwnPropertyDescriptor(Promise.prototype, 'then');
    const transport = module.createWalletGuardControlledCallbackProviderTransport({
      chainId: '0x7a69',
      accounts: ['${ACCOUNT}'],
      maxSensitiveCalls: 1,
      dispatchSensitive(command, deliverRawJson, reportFailure) {
        reportFailure('INTERNAL_ERROR');
        Object.defineProperty(Promise.prototype, 'then', {
          ...original,
          value() { throw new Error('poisoned then executed'); },
        });
      },
    });
    let code = null;
    try {
      transport.provider.request(${JSON.stringify(sendTransaction())});
    } catch (error) {
      code = error?.code ?? null;
    } finally {
      Object.defineProperty(Promise.prototype, 'then', original);
    }
    if (code !== 'POMRX_WG_TRANSPORT_E_RUNTIME_INTEGRITY') {
      throw new Error('unexpected synchronous failure: ' + code);
    }
    if (transport.control.inspect().destroyed !== true) {
      throw new Error('runtime drift did not destroy the session');
    }
    await new Promise((resolve) => setImmediate(resolve));
  `;
  const child = spawnSync(
    process.execPath,
    ['--unhandled-rejections=strict', '--input-type=module', '--eval', source],
    { encoding: 'utf8' },
  );
  assert.equal(
    child.status,
    0,
    `strict child failed\nstdout:\n${child.stdout}\nstderr:\n${child.stderr}`,
  );
  assert.equal(child.signal, null);
});
