import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PomRxPlainDataError,
} from '../../core/reference-data/plain-data-snapshot.mjs';
import {
  WalletGuardControlledHostError,
  createWalletGuardControlledReferenceHost,
} from '../../applications/blockchain-digital-assets/wallet-guard/controlled-host.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const OTHER_ACCOUNT = `0x${'9'.repeat(40)}`;
const TOKEN = `0x${'2'.repeat(40)}`;
const RECIPIENT = `0x${'3'.repeat(40)}`;
const SPENDER = `0x${'4'.repeat(40)}`;
const ORIGIN = 'https://controlled.wallet-guard.local';
const OTHER_ORIGIN = 'https://other.wallet-guard.local';
const CHAIN_ID = '0x1';
const TX_RESULT = `0x${'a'.repeat(64)}`;
const MAX_UINT256 = (1n << 256n) - 1n;
const SENSITIVE_CALL_CAPACITY = 64;
const hash = (character) => character.repeat(64);

function addressWord(address) {
  return `${'0'.repeat(24)}${address.slice(2).toLowerCase()}`;
}

function uintWord(value) {
  return BigInt(value).toString(16).padStart(64, '0');
}

function sendTransaction({
  from = ACCOUNT,
  to = RECIPIENT,
  value = '0x0',
  data = '0x',
} = {}) {
  return {
    method: 'eth_sendTransaction',
    params: [{ from, to, value, data }],
  };
}

function approve(spender = SPENDER, amount = MAX_UINT256) {
  return `0x095ea7b3${addressWord(spender)}${uintWord(amount)}`;
}

function policy(overrides = {}) {
  return {
    schema_version: 'wallet-guard-policy/0.1',
    policy_id: 'wallet-guard-controlled-host/0.1',
    enabled: true,
    kill_switch: false,
    expected_chain_id: CHAIN_ID,
    allowed_origins: [ORIGIN],
    allowed_targets: [TOKEN],
    allowed_recipients: [RECIPIENT],
    allowed_spenders: [SPENDER],
    allowed_typed_data_verifying_contracts: [TOKEN],
    max_native_value: '1000',
    max_token_amount: '1000000',
    deny_unlimited_allowance: true,
    deny_operator_approval: true,
    require_simulation_for: [
      'erc20_approve',
      'erc20_transfer',
      'permit_eip2612',
      'permit2_single',
      'set_approval_for_all',
    ],
    ...overrides,
  };
}

function indexedHash(index, offset) {
  return (10_000n + (BigInt(index) * 2n) + BigInt(offset)).toString(16).padStart(64, '0');
}

function referenceAuthorizationRecord(index) {
  return {
    run_id: `run-controlled-host-${String(index).padStart(8, '0')}`,
    agent_ref: 'agent-controlled-host-01',
    subject_ref: 'subject-controlled-host-01',
    preflight_receipt_hash: indexedHash(index, 0),
    witness_ack_hash: indexedHash(index, 1),
    source_key_id: `ed25519-${'a'.repeat(32)}`,
    witness_key_id: `ed25519-${'b'.repeat(32)}`,
    verification_profile: 'pom-rx-v0.1/strict-errata-1',
    verifier_version: 'pom-rx-v0.1-strict-verifier/1',
    implementation_artifact_sha256: hash('3'),
    effective_verification_policy_sha256: hash('4'),
    witness_valid_until: '2026-08-20T20:10:00.000Z',
  };
}

function referenceAuthorizationFactory({ onCall = () => {} } = {}) {
  let counter = 0;
  return () => {
    counter += 1;
    onCall(counter);
    return referenceAuthorizationRecord(counter);
  };
}

function hostOptions(overrides = {}) {
  return {
    trustedOrigin: ORIGIN,
    chainId: CHAIN_ID,
    accounts: [ACCOUNT],
    policy: policy(),
    trustedClock: () => '2026-08-20T20:00:00.000Z',
    referenceAuthorizationForRequest: referenceAuthorizationFactory(),
    capabilityLifetimeMs: 30_000,
    providerResult: TX_RESULT,
    ...overrides,
  };
}

function createHost(overrides = {}) {
  return createWalletGuardControlledReferenceHost(hostOptions(overrides));
}

function expectHostCode(error, code) {
  assert.ok(error instanceof WalletGuardControlledHostError);
  assert.equal(error.code, code);
  return true;
}

function expectPlainDataCode(error, code) {
  assert.ok(error instanceof PomRxPlainDataError);
  assert.equal(error.code, code);
  return true;
}

test('controlled page graph exposes only the frozen guarded ethereum.request surface', () => {
  const { page, testAuthority } = createHost();

  assert.deepEqual(Object.keys(page), ['ethereum']);
  assert.deepEqual(Object.keys(page.ethereum), ['request']);
  assert.equal(typeof page.ethereum.request, 'function');
  assert.equal(Object.hasOwn(page, 'provider'), false);
  assert.equal(Object.hasOwn(page, 'gate'), false);
  assert.equal(Object.hasOwn(page, 'testAuthority'), false);
  assert.equal(Object.hasOwn(page.ethereum, 'provider'), false);
  assert.equal(Object.hasOwn(page.ethereum, 'gate'), false);
  assert.equal(Object.hasOwn(testAuthority, 'request'), false);
  assert.equal(Object.isFrozen(page), true);
  assert.equal(Object.isFrozen(page.ethereum), true);
  assert.equal(Object.isFrozen(testAuthority), true);
  assert.throws(() => {
    page.ethereum.request = async () => 'forged';
  }, TypeError);
});

test('allowlisted native request forwards once through the closure-owned fake provider', async () => {
  const { page, testAuthority } = createHost();
  const result = await page.ethereum.request(sendTransaction({ value: '0x64' }));

  assert.equal(result.decision, 'ALLOW');
  assert.equal(result.forwarded, true);
  assert.equal(result.provider_result, TX_RESULT);

  const state = testAuthority.inspect();
  assert.equal(state.sensitive_call_count, 1);
  assert.equal(state.in_flight_request_count, 0);
  assert.equal(state.sensitive_calls[0].method, 'eth_sendTransaction');
  assert.equal(state.sensitive_calls[0].params[0].value, '0x64');
  assert.ok(state.context_reads > 0);
});

test('dangerous unlimited approval is denied before any sensitive provider call', async () => {
  const { page, testAuthority } = createHost();
  const result = await page.ethereum.request(sendTransaction({
    to: TOKEN,
    data: approve(),
  }));

  assert.equal(result.decision, 'DENY');
  assert.equal(result.forwarded, false);
  assert.equal(testAuthority.inspect().sensitive_call_count, 0);
});

test('trusted origin and chain drift remain non-forwarding', async () => {
  const first = createHost();
  first.testAuthority.setTrustedOrigin(OTHER_ORIGIN);
  const originResult = await first.page.ethereum.request(sendTransaction({ value: '0x1' }));
  assert.equal(originResult.decision, 'DENY');
  assert.equal(originResult.forwarded, false);
  assert.equal(first.testAuthority.inspect().sensitive_call_count, 0);

  const second = createHost();
  second.testAuthority.setChainId('0x2');
  const chainResult = await second.page.ethereum.request(sendTransaction({ value: '0x1' }));
  assert.equal(chainResult.decision, 'DENY');
  assert.equal(chainResult.forwarded, false);
  assert.equal(second.testAuthority.inspect().sensitive_call_count, 0);
});

test('active-account drift rejects the stale caller request and does not forward', async () => {
  const { page, testAuthority } = createHost();
  testAuthority.setAccounts([OTHER_ACCOUNT]);

  await assert.rejects(
    page.ethereum.request(sendTransaction({ from: ACCOUNT, value: '0x1' })),
  );
  assert.equal(testAuthority.inspect().sensitive_call_count, 0);
});

test('caller mutation after entry cannot change the request captured for forwarding', async () => {
  const { page, testAuthority } = createHost();
  const request = sendTransaction({ value: '0x2' });
  const pending = page.ethereum.request(request);
  request.params[0].value = '0x3e8';
  request.params[0].to = TOKEN;

  const result = await pending;
  assert.equal(result.decision, 'ALLOW');
  assert.equal(result.forwarded, true);
  const recorded = testAuthority.inspect().sensitive_calls[0];
  assert.equal(recorded.params[0].value, '0x2');
  assert.equal(recorded.params[0].to, RECIPIENT);
});

test('page request rejects a Proxy without executing any caller trap or forwarding', async () => {
  const { page, testAuthority } = createHost();
  let trapCalls = 0;
  const target = sendTransaction({ value: '0x1' });
  const request = new Proxy(target, {
    getPrototypeOf(inner) {
      trapCalls += 1;
      return Reflect.getPrototypeOf(inner);
    },
    ownKeys(inner) {
      trapCalls += 1;
      return Reflect.ownKeys(inner);
    },
    getOwnPropertyDescriptor(inner, key) {
      trapCalls += 1;
      return Reflect.getOwnPropertyDescriptor(inner, key);
    },
    get(inner, key, receiver) {
      trapCalls += 1;
      return Reflect.get(inner, key, receiver);
    },
  });

  await assert.rejects(
    page.ethereum.request(request),
    (error) => expectPlainDataCode(error, 'POMRX_DATA_E_PROXY'),
  );
  assert.equal(trapCalls, 0);
  assert.equal(testAuthority.inspect().sensitive_call_count, 0);
});

test('page request rejects decorated nested arrays before the historical gateway sees them', async () => {
  const { page, testAuthority } = createHost();
  const request = sendTransaction({ value: '0x1' });
  Object.defineProperty(request.params, 'hidden', {
    enumerable: false,
    value: 'not inert request data',
  });

  await assert.rejects(
    page.ethereum.request(request),
    (error) => expectPlainDataCode(error, 'POMRX_DATA_E_ARRAY'),
  );
  assert.equal(testAuthority.inspect().sensitive_call_count, 0);
});

test('page request rejects symbol decoration before any provider interaction', async () => {
  const { page, testAuthority } = createHost();
  const request = sendTransaction({ value: '0x1' });
  request[Symbol('hidden')] = 'not inert request data';

  await assert.rejects(
    page.ethereum.request(request),
    (error) => expectPlainDataCode(error, 'POMRX_DATA_E_SYMBOL'),
  );
  assert.equal(testAuthority.inspect().sensitive_call_count, 0);
});

test('capacity is reserved before authorization and closes the gateway at the bound', async () => {
  let authorizationCalls = 0;
  const { page, testAuthority } = createHost({
    referenceAuthorizationForRequest: referenceAuthorizationFactory({
      onCall: () => {
        authorizationCalls += 1;
      },
    }),
  });

  for (let index = 0; index < SENSITIVE_CALL_CAPACITY - 1; index += 1) {
    const result = await page.ethereum.request(sendTransaction({ value: '0x1' }));
    assert.equal(result.forwarded, true);
  }

  const lastReserved = page.ethereum.request(sendTransaction({ value: '0x1' }));
  await assert.rejects(
    page.ethereum.request(sendTransaction({ value: '0x1' })),
    (error) => expectHostCode(error, 'POMRX_WG_HOST_E_LOG_FULL'),
  );
  const lastResult = await lastReserved;
  assert.equal(lastResult.forwarded, true);

  const fullState = testAuthority.inspect();
  assert.equal(fullState.sensitive_call_count, SENSITIVE_CALL_CAPACITY);
  assert.equal(fullState.in_flight_request_count, 0);
  assert.equal(authorizationCalls, SENSITIVE_CALL_CAPACITY);

  await assert.rejects(
    page.ethereum.request(sendTransaction({ value: '0x1' })),
    (error) => expectHostCode(error, 'POMRX_WG_HOST_E_LOG_FULL'),
  );
  assert.equal(authorizationCalls, SENSITIVE_CALL_CAPACITY);
  assert.equal(testAuthority.inspect().sensitive_call_count, SENSITIVE_CALL_CAPACITY);
});

test('top-level bootstrap accessors and proxies fail without executing caller traps', () => {
  let getterCalls = 0;
  const accessorOptions = hostOptions();
  Object.defineProperty(accessorOptions, 'trustedOrigin', {
    enumerable: true,
    configurable: true,
    get() {
      getterCalls += 1;
      return ORIGIN;
    },
  });
  assert.throws(
    () => createWalletGuardControlledReferenceHost(accessorOptions),
    (error) => expectHostCode(error, 'POMRX_WG_HOST_E_INVALID'),
  );
  assert.equal(getterCalls, 0);

  let proxyTrapCalls = 0;
  const proxy = new Proxy(hostOptions(), {
    getPrototypeOf(target) {
      proxyTrapCalls += 1;
      return Reflect.getPrototypeOf(target);
    },
    ownKeys(target) {
      proxyTrapCalls += 1;
      return Reflect.ownKeys(target);
    },
  });
  assert.throws(
    () => createWalletGuardControlledReferenceHost(proxy),
    (error) => expectHostCode(error, 'POMRX_WG_HOST_E_INVALID'),
  );
  assert.equal(proxyTrapCalls, 0);
});

test('nested account and policy accessors fail without executing getter bodies', () => {
  let accountGetterCalls = 0;
  const accounts = [ACCOUNT];
  Object.defineProperty(accounts, '0', {
    enumerable: true,
    configurable: true,
    get() {
      accountGetterCalls += 1;
      return ACCOUNT;
    },
  });
  assert.throws(
    () => createHost({ accounts }),
    (error) => expectHostCode(error, 'POMRX_WG_HOST_E_ACCOUNTS_INVALID'),
  );
  assert.equal(accountGetterCalls, 0);

  let policyGetterCalls = 0;
  const policyValue = policy();
  Object.defineProperty(policyValue, 'allowed_origins', {
    enumerable: true,
    configurable: true,
    get() {
      policyGetterCalls += 1;
      return [ORIGIN];
    },
  });
  assert.throws(
    () => createHost({ policy: policyValue }),
    (error) => error instanceof PomRxPlainDataError,
  );
  assert.equal(policyGetterCalls, 0);
});

test('bootstrap validates canonical origin, accounts and deterministic fake result', () => {
  assert.throws(
    () => createHost({ trustedOrigin: `${ORIGIN}/` }),
    (error) => expectHostCode(error, 'POMRX_WG_HOST_E_ORIGIN_INVALID'),
  );
  assert.throws(
    () => createHost({ accounts: [ACCOUNT, ACCOUNT] }),
    (error) => expectHostCode(error, 'POMRX_WG_HOST_E_ACCOUNTS_INVALID'),
  );
  assert.throws(
    () => createHost({ providerResult: `0x${'A'.repeat(64)}` }),
    (error) => expectHostCode(error, 'POMRX_WG_HOST_E_INVALID'),
  );
});

test('post-await Array.prototype.map poisoning cannot substitute an allowlisted recipient', async () => {
  const originalMap = Array.prototype.map;
  const { page, testAuthority } = createHost();
  const pending = page.ethereum.request(sendTransaction({
    to: OTHER_ACCOUNT,
    value: '0x1',
  }));

  try {
    Array.prototype.map = function poisonedMap(callback, thisArg) {
      if (this.length === 1 && this[0] === RECIPIENT) {
        return [OTHER_ACCOUNT];
      }
      return originalMap.call(this, callback, thisArg);
    };
    const result = await pending;
    assert.equal(result.decision, 'DENY');
    assert.equal(result.forwarded, false);
  } finally {
    Array.prototype.map = originalMap;
  }

  assert.equal(testAuthority.inspect().sensitive_call_count, 0);
});
