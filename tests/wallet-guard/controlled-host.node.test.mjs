import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WalletGuardControlledHostError,
  createWalletGuardControlledReferenceHost,
} from '../../applications/blockchain-digital-assets/wallet-guard/controlled-host.mjs';
import {
  MAX_UINT256_DECIMAL,
} from '../../applications/blockchain-digital-assets/wallet-guard/evm-decoders.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const OTHER_ACCOUNT = `0x${'9'.repeat(40)}`;
const TOKEN = `0x${'2'.repeat(40)}`;
const RECIPIENT = `0x${'3'.repeat(40)}`;
const SPENDER = `0x${'4'.repeat(40)}`;
const UNTRUSTED = `0x${'8'.repeat(40)}`;
const ORIGIN = 'https://fixture.wallet-guard.local';
const OTHER_ORIGIN = 'https://other.wallet-guard.local';
const CHAIN_ID = '0x1';
const TX_RESULT = `0x${'a'.repeat(64)}`;
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

function sequenceClock(...values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

function defaultClock() {
  return sequenceClock(
    '2026-08-19T17:00:00.000Z',
    '2026-08-19T17:00:01.000Z',
    '2026-08-19T17:00:02.000Z',
    '2026-08-19T17:00:03.000Z',
  );
}

function referenceAuthorizationFactory() {
  let count = 0;
  const symbols = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
  return () => {
    count += 1;
    return {
      run_id: `run-controlled-host-${String(count).padStart(8, '0')}`,
      agent_ref: 'agent-wallet-guard-01',
      subject_ref: 'subject-wallet-guard-01',
      preflight_receipt_hash: hash(symbols[(count * 2) % symbols.length]),
      witness_ack_hash: hash(symbols[(count * 2 + 1) % symbols.length]),
      source_key_id: `ed25519-${'a'.repeat(32)}`,
      witness_key_id: `ed25519-${'b'.repeat(32)}`,
      verification_profile: 'pom-rx-v0.1/strict-errata-1',
      verifier_version: 'pom-rx-v0.1-strict-verifier/1',
      implementation_artifact_sha256: hash('3'),
      effective_verification_policy_sha256: hash('4'),
      witness_valid_until: '2026-08-19T17:01:00.000Z',
    };
  };
}

function createHost(overrides = {}) {
  return createWalletGuardControlledReferenceHost({
    trustedOrigin: ORIGIN,
    chainId: CHAIN_ID,
    accounts: [ACCOUNT],
    policy: policy(),
    trustedClock: defaultClock(),
    referenceAuthorizationForRequest: referenceAuthorizationFactory(),
    capabilityLifetimeMs: 30_000,
    providerResult: TX_RESULT,
    ...overrides,
  });
}

function expectHostCode(error, code) {
  assert.ok(error instanceof WalletGuardControlledHostError);
  assert.equal(error.code, code);
  return true;
}

test('controlled page exposes only one frozen guarded EIP-1193 request surface', () => {
  const host = createHost();
  assert.deepEqual(Object.keys(host), ['page', 'testAuthority']);
  assert.deepEqual(Object.keys(host.page), ['ethereum']);
  assert.deepEqual(Object.keys(host.page.ethereum), ['request']);
  assert.equal(typeof host.page.ethereum.request, 'function');
  assert.equal(Object.isFrozen(host), true);
  assert.equal(Object.isFrozen(host.page), true);
  assert.equal(Object.isFrozen(host.page.ethereum), true);

  for (const forbidden of ['provider', 'rawProvider', 'gate', 'testAuthority']) {
    assert.equal(Object.hasOwn(host.page, forbidden), false);
    assert.equal(Object.hasOwn(host.page.ethereum, forbidden), false);
  }
  assert.equal(Object.hasOwn(host.testAuthority, 'request'), false);
  assert.equal(Object.hasOwn(host.testAuthority, 'provider'), false);
});

test('allowed page request reaches the closure-owned provider exactly once', async () => {
  const { page, testAuthority } = createHost();
  const result = await page.ethereum.request(sendTransaction({ value: '0x64' }));

  assert.equal(result.decision, 'ALLOW');
  assert.equal(result.forwarded, true);
  assert.equal(result.provider_result, TX_RESULT);

  const state = testAuthority.inspect();
  assert.equal(state.sensitive_call_count, 1);
  assert.equal(state.sensitive_calls[0].method, 'eth_sendTransaction');
  assert.equal(state.sensitive_calls[0].params[0].value, '0x64');
  assert.ok(state.context_reads >= 12);
});

test('dangerous approval is denied before the closure-owned provider can see it', async () => {
  const { page, testAuthority } = createHost();
  const approve = `0x095ea7b3${addressWord(UNTRUSTED)}${uintWord(MAX_UINT256_DECIMAL)}`;
  const result = await page.ethereum.request(sendTransaction({ to: TOKEN, data: approve }));

  assert.equal(result.decision, 'DENY');
  assert.equal(result.forwarded, false);
  assert.ok(result.reasons.includes('WG_POLICY_DENY_SPENDER'));
  assert.ok(result.reasons.includes('WG_POLICY_DENY_UNLIMITED_ALLOWANCE'));
  assert.equal(testAuthority.inspect().sensitive_call_count, 0);
});

test('changing controlled host origin invalidates later requests instead of opening a bypass', async () => {
  const { page, testAuthority } = createHost();
  testAuthority.setTrustedOrigin(OTHER_ORIGIN);

  const result = await page.ethereum.request(sendTransaction({ value: '0x1' }));
  assert.equal(result.decision, 'DENY');
  assert.equal(result.forwarded, false);
  assert.ok(result.reasons.includes('WG_POLICY_DENY_ORIGIN'));
  assert.equal(testAuthority.inspect().sensitive_call_count, 0);
});

test('changing controlled host chain invalidates later requests instead of opening a bypass', async () => {
  const { page, testAuthority } = createHost();
  testAuthority.setChainId('0x2');

  const result = await page.ethereum.request(sendTransaction({ value: '0x1' }));
  assert.equal(result.decision, 'DENY');
  assert.equal(result.forwarded, false);
  assert.ok(result.reasons.includes('WG_POLICY_DENY_CHAIN'));
  assert.equal(testAuthority.inspect().sensitive_call_count, 0);
});

test('changing active account makes a request for the previous account fail closed', async () => {
  const { page, testAuthority } = createHost();
  testAuthority.setAccounts([OTHER_ACCOUNT]);

  await assert.rejects(
    page.ethereum.request(sendTransaction({ value: '0x1' })),
    /active account/u,
  );
  assert.equal(testAuthority.inspect().sensitive_call_count, 0);
});

test('caller mutation after page request entry cannot alter provider bytes', async () => {
  const { page, testAuthority } = createHost();
  const request = sendTransaction({ value: '0x1' });
  const pending = page.ethereum.request(request);
  request.params[0].value = '0x3e8';
  request.params[0].to = UNTRUSTED;

  const result = await pending;
  assert.equal(result.forwarded, true);
  const forwarded = testAuthority.inspect().sensitive_calls[0];
  assert.equal(forwarded.params[0].value, '0x1');
  assert.equal(forwarded.params[0].to, RECIPIENT);
});

test('frozen page surface cannot be monkey-patched into a raw-provider route', () => {
  const { page } = createHost();
  assert.throws(() => {
    page.ethereum.request = async () => TX_RESULT;
  }, TypeError);
  assert.throws(() => {
    page.ethereum.provider = { request: async () => TX_RESULT };
  }, TypeError);
  assert.deepEqual(Object.keys(page.ethereum), ['request']);
});

test('bootstrap accessors are rejected without executing the accessor body', () => {
  let getterCalls = 0;
  const options = {
    trustedOrigin: ORIGIN,
    chainId: CHAIN_ID,
    accounts: [ACCOUNT],
    policy: policy(),
    trustedClock: defaultClock(),
    referenceAuthorizationForRequest: referenceAuthorizationFactory(),
    capabilityLifetimeMs: 30_000,
    providerResult: TX_RESULT,
  };
  Object.defineProperty(options, 'providerResult', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return TX_RESULT;
    },
  });

  assert.throws(
    () => createWalletGuardControlledReferenceHost(options),
    (error) => expectHostCode(error, 'POMRX_WG_HOST_E_INVALID'),
  );
  assert.equal(getterCalls, 0);
});

test('nested bootstrap accessors are rejected without executing their bodies', () => {
  let accountGetterCalls = 0;
  const accounts = [ACCOUNT];
  Object.defineProperty(accounts, '0', {
    enumerable: true,
    get() {
      accountGetterCalls += 1;
      return OTHER_ACCOUNT;
    },
  });
  assert.throws(
    () => createHost({ accounts }),
    (error) => expectHostCode(error, 'POMRX_WG_HOST_E_ACCOUNTS_INVALID'),
  );
  assert.equal(accountGetterCalls, 0);

  let policyGetterCalls = 0;
  const hostilePolicy = policy();
  Object.defineProperty(hostilePolicy, 'kill_switch', {
    enumerable: true,
    get() {
      policyGetterCalls += 1;
      return false;
    },
  });
  assert.throws(
    () => createHost({ policy: hostilePolicy }),
    (error) => expectHostCode(error, 'POMRX_WG_HOST_E_SNAPSHOT_INVALID'),
  );
  assert.equal(policyGetterCalls, 0);
});

test('malformed controlled host bootstrap context fails closed at construction', () => {
  assert.throws(
    () => createHost({ trustedOrigin: 'https://fixture.wallet-guard.local/path' }),
    (error) => expectHostCode(error, 'POMRX_WG_HOST_E_ORIGIN_INVALID'),
  );
  assert.throws(
    () => createHost({ chainId: '1' }),
    (error) => expectHostCode(error, 'POMRX_WG_HOST_E_CHAIN_INVALID'),
  );
  assert.throws(
    () => createHost({ accounts: [ACCOUNT, ACCOUNT] }),
    (error) => expectHostCode(error, 'POMRX_WG_HOST_E_ACCOUNTS_INVALID'),
  );
  assert.throws(
    () => createHost({ providerResult: '0x1234' }),
    (error) => expectHostCode(error, 'POMRX_WG_HOST_E_INVALID'),
  );
});
