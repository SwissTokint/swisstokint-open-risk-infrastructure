import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { types as utilTypes } from 'node:util';
import test from 'node:test';

import {
  WalletGuardTrustedProviderTransportError,
  createWalletGuardControlledProviderTransport,
  createWalletGuardTrustedProviderGateway,
} from '../../applications/blockchain-digital-assets/wallet-guard/trusted-provider-transport.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const TOKEN = `0x${'2'.repeat(40)}`;
const RECIPIENT = `0x${'3'.repeat(40)}`;
const ORIGIN = 'https://trusted-transport.wallet-guard.local';
const TX_RESULT = `0x${'a'.repeat(64)}`;
const hash = (character) => character.repeat(64);

function policy() {
  return {
    schema_version: 'wallet-guard-policy/0.1',
    policy_id: 'wallet-guard-trusted-transport/0.1',
    enabled: true,
    kill_switch: false,
    expected_chain_id: '0x1',
    allowed_origins: [ORIGIN],
    allowed_targets: [TOKEN],
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

function referenceAuthorizationRecord() {
  return {
    run_id: 'run-trusted-transport-00000001',
    agent_ref: 'agent-trusted-transport-01',
    subject_ref: 'subject-trusted-transport-01',
    preflight_receipt_hash: hash('1'),
    witness_ack_hash: hash('2'),
    source_key_id: `ed25519-${'a'.repeat(32)}`,
    witness_key_id: `ed25519-${'b'.repeat(32)}`,
    verification_profile: 'pom-rx-v0.1/strict-errata-1',
    verifier_version: 'pom-rx-v0.1-strict-verifier/1',
    implementation_artifact_sha256: hash('3'),
    effective_verification_policy_sha256: hash('4'),
    witness_valid_until: '2026-08-23T15:00:00.000Z',
  };
}

function createTransport() {
  return createWalletGuardControlledProviderTransport({
    chainId: '0x1',
    accounts: [ACCOUNT],
    providerResult: TX_RESULT,
    maxSensitiveCalls: 64,
  });
}

function createGateway({ transport = createTransport(), onAuthorization = () => {} } = {}) {
  const gateway = createWalletGuardTrustedProviderGateway({
    captureTrustedOrigin: () => ORIGIN,
    provider: transport.provider,
    policy: policy(),
    trustedClock: () => '2026-08-23T14:30:00.000Z',
    referenceAuthorizationForRequest: () => {
      onAuthorization();
      return referenceAuthorizationRecord();
    },
    capabilityLifetimeMs: 30_000,
  });
  return { gateway, transport };
}

function sendTransaction() {
  return {
    method: 'eth_sendTransaction',
    params: [{
      from: ACCOUNT,
      to: RECIPIENT,
      value: '0x1',
      data: '0x',
    }],
  };
}

function expectTransportCode(error, code) {
  assert.ok(error instanceof WalletGuardTrustedProviderTransportError);
  assert.equal(error.code, code);
  return true;
}

test('controlled provider originates same-realm native Promise transports only', async () => {
  const { provider, control } = createTransport();

  const chainTransport = provider.request({ method: 'eth_chainId', params: [] });
  assert.equal(utilTypes.isPromise(chainTransport), true);
  assert.equal(Object.getPrototypeOf(chainTransport), Promise.prototype);
  assert.deepEqual(Object.getOwnPropertyNames(chainTransport), []);
  assert.equal(await chainTransport, '0x1');

  const accountsTransport = provider.request({ method: 'eth_accounts', params: [] });
  assert.equal(utilTypes.isPromise(accountsTransport), true);
  assert.equal(Object.getPrototypeOf(accountsTransport), Promise.prototype);
  assert.deepEqual(Object.getOwnPropertyNames(accountsTransport), []);
  assert.deepEqual(await accountsTransport, [ACCOUNT]);

  const sensitiveTransport = provider.request(sendTransaction());
  assert.equal(utilTypes.isPromise(sensitiveTransport), true);
  assert.equal(Object.getPrototypeOf(sensitiveTransport), Promise.prototype);
  assert.deepEqual(Object.getOwnPropertyNames(sensitiveTransport), []);
  assert.equal(await sensitiveTransport, TX_RESULT);

  const state = control.inspect();
  assert.equal(state.context_reads, 2);
  assert.equal(state.sensitive_call_count, 1);
});

test('trusted gateway rejects an unowned provider before its request path can originate transport', () => {
  let requestCalls = 0;
  let proxyTrapCalls = 0;
  const rawProvider = new Proxy({
    request() {
      requestCalls += 1;
      return Promise.reject(new Error('must never originate'));
    },
  }, {
    get(target, key, receiver) {
      proxyTrapCalls += 1;
      return Reflect.get(target, key, receiver);
    },
    getPrototypeOf(target) {
      proxyTrapCalls += 1;
      return Reflect.getPrototypeOf(target);
    },
  });

  assert.throws(
    () => createWalletGuardTrustedProviderGateway({ provider: rawProvider }),
    (error) => expectTransportCode(error, 'POMRX_WG_TRANSPORT_E_UNTRUSTED_PROVIDER'),
  );
  assert.equal(requestCalls, 0);
  assert.equal(proxyTrapCalls, 0);
});

test('Promise species/accessor drift is detected synchronously without executing the hostile accessor', () => {
  const { provider, control } = createTransport();
  const original = Object.getOwnPropertyDescriptor(Promise, Symbol.species);
  let getterCalls = 0;

  Object.defineProperty(Promise, Symbol.species, {
    configurable: true,
    enumerable: false,
    get() {
      getterCalls += 1;
      throw new Error('hostile species accessor executed');
    },
  });
  try {
    assert.throws(
      () => provider.request({ method: 'eth_chainId', params: [] }),
      (error) => expectTransportCode(error, 'POMRX_WG_TRANSPORT_E_RUNTIME_INTEGRITY'),
    );
  } finally {
    Object.defineProperty(Promise, Symbol.species, original);
  }

  assert.equal(getterCalls, 0);
  assert.equal(control.inspect().context_reads, 0);
});

test('inherited Array thenable poisoning is rejected before an accounts transport originates', () => {
  const { provider, control } = createTransport();
  const original = Object.getOwnPropertyDescriptor(Array.prototype, 'then');
  let thenCalls = 0;

  Object.defineProperty(Array.prototype, 'then', {
    configurable: true,
    enumerable: false,
    writable: true,
    value() {
      thenCalls += 1;
    },
  });
  try {
    assert.throws(
      () => provider.request({ method: 'eth_accounts', params: [] }),
      (error) => expectTransportCode(error, 'POMRX_WG_TRANSPORT_E_RUNTIME_INTEGRITY'),
    );
  } finally {
    if (original) Object.defineProperty(Array.prototype, 'then', original);
    else delete Array.prototype.then;
  }

  assert.equal(thenCalls, 0);
  assert.equal(control.inspect().context_reads, 0);
});

test('strict in-contract rejected context transport survives cleanly with zero authorization and forwarding', () => {
  const moduleUrl = new URL(
    '../../applications/blockchain-digital-assets/wallet-guard/trusted-provider-transport.mjs',
    import.meta.url,
  ).href;

  const childSource = `
    import {
      createWalletGuardControlledProviderTransport,
      createWalletGuardTrustedProviderGateway,
    } from ${JSON.stringify(moduleUrl)};

    const ACCOUNT = '0x${'1'.repeat(40)}';
    const TOKEN = '0x${'2'.repeat(40)}';
    const RECIPIENT = '0x${'3'.repeat(40)}';
    const ORIGIN = ${JSON.stringify(ORIGIN)};
    const TX_RESULT = '0x${'a'.repeat(64)}';
    let authorizationCalls = 0;

    const transport = createWalletGuardControlledProviderTransport({
      chainId: '0x1',
      accounts: [ACCOUNT],
      providerResult: TX_RESULT,
      maxSensitiveCalls: 64,
    });
    transport.control.rejectNextContextRead('eth_chainId');

    const gateway = createWalletGuardTrustedProviderGateway({
      captureTrustedOrigin: () => ORIGIN,
      provider: transport.provider,
      policy: {
        schema_version: 'wallet-guard-policy/0.1',
        policy_id: 'wallet-guard-trusted-transport/0.1',
        enabled: true,
        kill_switch: false,
        expected_chain_id: '0x1',
        allowed_origins: [ORIGIN],
        allowed_targets: [TOKEN],
        allowed_recipients: [RECIPIENT],
        allowed_spenders: [],
        allowed_typed_data_verifying_contracts: [],
        max_native_value: '1000',
        max_token_amount: '1000000',
        deny_unlimited_allowance: true,
        deny_operator_approval: true,
        require_simulation_for: [],
      },
      trustedClock: () => '2026-08-23T14:30:00.000Z',
      referenceAuthorizationForRequest: () => {
        authorizationCalls += 1;
        throw new Error('authorization must not be reached');
      },
      capabilityLifetimeMs: 30_000,
    });

    let rejected = false;
    try {
      await gateway.request({
        method: 'eth_sendTransaction',
        params: [{ from: ACCOUNT, to: RECIPIENT, value: '0x1', data: '0x' }],
      });
    } catch {
      rejected = true;
    }
    if (!rejected) throw new Error('in-contract rejection unexpectedly allowed');

    await new Promise((resolve) => setImmediate(resolve));
    const state = transport.control.inspect();
    if (authorizationCalls !== 0) throw new Error('reference authorization was reached');
    if (state.sensitive_call_count !== 0) throw new Error('sensitive provider forwarding occurred');
    if (state.context_reads !== 1) throw new Error('unexpected context-read cardinality');
  `;

  const child = spawnSync(
    process.execPath,
    ['--unhandled-rejections=strict', '--input-type=module', '--eval', childSource],
    { encoding: 'utf8' },
  );

  assert.equal(
    child.status,
    0,
    `strict child failed\nstdout:\n${child.stdout}\nstderr:\n${child.stderr}`,
  );
  assert.equal(child.signal, null);
});
