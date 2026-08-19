import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WalletGuardProviderError,
  createWalletGuardReferenceProviderGateway,
} from '../../applications/blockchain-digital-assets/wallet-guard/provider.mjs';
import {
  MAX_UINT256_DECIMAL,
} from '../../applications/blockchain-digital-assets/wallet-guard/evm-decoders.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const OTHER_ACCOUNT = `0x${'9'.repeat(40)}`;
const TOKEN = `0x${'2'.repeat(40)}`;
const RECIPIENT = `0x${'3'.repeat(40)}`;
const SPENDER = `0x${'4'.repeat(40)}`;
const OPERATOR = `0x${'5'.repeat(40)}`;
const UNTRUSTED = `0x${'8'.repeat(40)}`;
const ORIGIN = 'https://fixture.wallet-guard.local';
const OTHER_ORIGIN = 'https://attacker.invalid';
const CHAIN_ID = '0x1';
const TX_RESULT = `0x${'a'.repeat(64)}`;
const hash = (character) => character.repeat(64);

function addressWord(address) {
  return `${'0'.repeat(24)}${address.slice(2).toLowerCase()}`;
}

function uintWord(value) {
  return BigInt(value).toString(16).padStart(64, '0');
}

function boolWord(value) {
  return (value ? '1' : '0').padStart(64, '0');
}

function sendTransaction({
  from = ACCOUNT,
  to = RECIPIENT,
  value = '0x0',
  data = '0x',
  ...extra
} = {}) {
  return {
    method: 'eth_sendTransaction',
    params: [{ from, to, value, data, ...extra }],
  };
}

function policy(overrides = {}) {
  return {
    schema_version: 'wallet-guard-policy/0.1',
    policy_id: 'wallet-guard-provider-policy/0.1',
    enabled: true,
    kill_switch: false,
    expected_chain_id: CHAIN_ID,
    allowed_origins: [ORIGIN],
    allowed_targets: [TOKEN],
    allowed_recipients: [RECIPIENT],
    allowed_spenders: [SPENDER, OPERATOR],
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

function referenceAuthorizationRecord(index = 1, overrides = {}) {
  const symbols = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
  const preflightSymbol = symbols[(index * 2) % symbols.length];
  const witnessSymbol = symbols[(index * 2 + 1) % symbols.length];
  return {
    run_id: `run-wallet-guard-${String(index).padStart(8, '0')}`,
    agent_ref: 'agent-wallet-guard-01',
    subject_ref: 'subject-wallet-guard-01',
    preflight_receipt_hash: hash(preflightSymbol),
    witness_ack_hash: hash(witnessSymbol),
    source_key_id: `ed25519-${'a'.repeat(32)}`,
    witness_key_id: `ed25519-${'b'.repeat(32)}`,
    verification_profile: 'pom-rx-v0.1/strict-errata-1',
    verifier_version: 'pom-rx-v0.1-strict-verifier/1',
    implementation_artifact_sha256: hash('3'),
    effective_verification_policy_sha256: hash('4'),
    witness_valid_until: '2026-08-19T17:01:00.000Z',
    ...overrides,
  };
}

function referenceAuthorizationFactory({ reuse = false, onSummary = () => {}, overrides = {} } = {}) {
  let count = 0;
  return (summary) => {
    count += 1;
    onSummary(summary);
    return referenceAuthorizationRecord(reuse ? 1 : count, overrides);
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
  );
}

function createFakeProvider({
  chainId = CHAIN_ID,
  accounts = [ACCOUNT],
  onRead = async () => {},
} = {}) {
  const state = {
    chainId,
    accounts: [...accounts],
    readCount: 0,
    sensitiveCalls: [],
  };

  const provider = Object.freeze({
    async request(request) {
      if (request.method === 'eth_chainId' || request.method === 'eth_accounts') {
        state.readCount += 1;
        await onRead({ method: request.method, readCount: state.readCount, state });
        if (request.method === 'eth_chainId') return state.chainId;
        return [...state.accounts];
      }
      state.sensitiveCalls.push(request);
      return TX_RESULT;
    },
  });

  const controller = Object.freeze({
    setChainId(value) {
      state.chainId = value;
    },
    setAccounts(value) {
      state.accounts = [...value];
    },
    stats() {
      return {
        readCount: state.readCount,
        sensitiveCalls: [...state.sensitiveCalls],
      };
    },
  });

  return { provider, controller };
}

function createGateway({
  fakeProvider = createFakeProvider(),
  captureTrustedOrigin = () => ORIGIN,
  trustedClock = defaultClock(),
  policyValue = policy(),
  referenceFactory = referenceAuthorizationFactory(),
} = {}) {
  const gateway = createWalletGuardReferenceProviderGateway({
    captureTrustedOrigin,
    provider: fakeProvider.provider,
    policy: policyValue,
    trustedClock,
    referenceAuthorizationForRequest: referenceFactory,
    capabilityLifetimeMs: 30_000,
  });
  return { gateway, controller: fakeProvider.controller };
}

function expectProviderCode(error, code) {
  assert.ok(error instanceof WalletGuardProviderError);
  assert.equal(error.code, code);
  return true;
}

test('caller-facing gateway exposes request only and never returns provider or Core Gate handles', () => {
  const { gateway } = createGateway();
  assert.deepEqual(Object.keys(gateway), ['request']);
  assert.equal(Object.hasOwn(gateway, 'provider'), false);
  assert.equal(Object.hasOwn(gateway, 'gate'), false);
  assert.equal(Object.hasOwn(gateway, 'testAuthority'), false);
});

test('allowlisted low-value native request is forwarded exactly once after fresh context rechecks', async () => {
  const { gateway, controller } = createGateway();
  const result = await gateway.request(sendTransaction({ value: '0x64' }));

  assert.equal(result.decision, 'ALLOW');
  assert.equal(result.forwarded, true);
  assert.equal(result.provider_result, TX_RESULT);
  assert.equal(result.reference_authorization_only, true);
  assert.match(result.intent_commitment, /^[a-f0-9]{64}$/u);
  assert.match(result.policy_hash, /^[a-f0-9]{64}$/u);

  const stats = controller.stats();
  assert.equal(stats.sensitiveCalls.length, 1);
  assert.equal(stats.sensitiveCalls[0].method, 'eth_sendTransaction');
  assert.equal(stats.sensitiveCalls[0].params[0].value, '0x64');
});

test('reference evidence supplier receives the exact per-request commitment summary', async () => {
  const summaries = [];
  const { gateway, controller } = createGateway({
    referenceFactory: referenceAuthorizationFactory({
      onSummary: (summary) => summaries.push(summary),
    }),
  });

  await gateway.request(sendTransaction({ value: '0x1' }));
  await gateway.request(sendTransaction({ value: '0x2' }));

  assert.equal(summaries.length, 2);
  assert.notEqual(summaries[0].request_id, summaries[1].request_id);
  assert.notEqual(summaries[0].action_commitment, summaries[1].action_commitment);
  assert.match(summaries[0].context_commitment, /^[a-f0-9]{64}$/u);
  assert.match(summaries[0].policy_hash, /^[a-f0-9]{64}$/u);
  assert.equal(controller.stats().sensitiveCalls.length, 2);
});

test('reusing one synthetic run/preflight/Witness evidence set across allowed requests fails closed', async () => {
  const { gateway, controller } = createGateway({
    referenceFactory: referenceAuthorizationFactory({ reuse: true }),
  });

  const first = await gateway.request(sendTransaction({ value: '0x1' }));
  assert.equal(first.forwarded, true);

  await assert.rejects(
    gateway.request(sendTransaction({ value: '0x2' })),
    (error) => expectProviderCode(error, 'POMRX_WG_PROVIDER_E_REFERENCE_REPLAY'),
  );
  assert.equal(controller.stats().sensitiveCalls.length, 1);
});

test('caller mutation after gateway entry cannot change the request eventually forwarded', async () => {
  let firstReadStarted;
  const started = new Promise((resolve) => { firstReadStarted = resolve; });
  let releaseFirstRead;
  const barrier = new Promise((resolve) => { releaseFirstRead = resolve; });

  const fakeProvider = createFakeProvider({
    onRead: async ({ readCount }) => {
      if (readCount === 1) {
        firstReadStarted();
        await barrier;
      }
    },
  });
  const { gateway, controller } = createGateway({ fakeProvider });
  const raw = sendTransaction({ value: '0x1' });

  const pending = gateway.request(raw);
  await started;
  raw.params[0].value = '0x3e8';
  raw.params[0].to = UNTRUSTED;
  releaseFirstRead();

  const result = await pending;
  assert.equal(result.decision, 'ALLOW');
  assert.equal(controller.stats().sensitiveCalls.length, 1);
  assert.equal(controller.stats().sensitiveCalls[0].params[0].value, '0x1');
  assert.equal(controller.stats().sensitiveCalls[0].params[0].to, RECIPIENT);
});

test('unlimited approval to an untrusted spender is denied before sensitive provider forwarding', async () => {
  const { gateway, controller } = createGateway();
  const approve = `0x095ea7b3${addressWord(UNTRUSTED)}${uintWord(MAX_UINT256_DECIMAL)}`;
  const result = await gateway.request(sendTransaction({ to: TOKEN, data: approve }));

  assert.equal(result.decision, 'DENY');
  assert.equal(result.forwarded, false);
  assert.ok(result.reasons.includes('WG_POLICY_DENY_SPENDER'));
  assert.ok(result.reasons.includes('WG_POLICY_DENY_UNLIMITED_ALLOWANCE'));
  assert.equal(controller.stats().sensitiveCalls.length, 0);
});

test('setApprovalForAll true is denied and unknown calldata remains non-forwarding indeterminate', async () => {
  const { gateway, controller } = createGateway();
  const operatorApproval = `0xa22cb465${addressWord(OPERATOR)}${boolWord(true)}`;
  const denied = await gateway.request(sendTransaction({ to: TOKEN, data: operatorApproval }));
  const unknown = await gateway.request(sendTransaction({ to: TOKEN, data: '0xdeadbeef' }));

  assert.equal(denied.decision, 'DENY');
  assert.equal(denied.forwarded, false);
  assert.ok(denied.reasons.includes('WG_POLICY_DENY_OPERATOR_APPROVAL'));
  assert.equal(unknown.decision, 'INDETERMINATE');
  assert.equal(unknown.forwarded, false);
  assert.equal(controller.stats().sensitiveCalls.length, 0);
});

test('dApp cannot self-assert origin or another active account through request fields', async () => {
  const { gateway, controller } = createGateway();

  await assert.rejects(
    gateway.request(sendTransaction({ origin: OTHER_ORIGIN })),
    /unsupported transaction field/u,
  );
  await assert.rejects(
    gateway.request(sendTransaction({ from: OTHER_ACCOUNT })),
    /active account/u,
  );
  assert.equal(controller.stats().sensitiveCalls.length, 0);
});

test('provider context instability inside one sample fails closed before authorization', async () => {
  const fakeProvider = createFakeProvider({
    onRead: async ({ readCount, state }) => {
      if (readCount === 3) state.chainId = '0x2';
    },
  });
  const { gateway, controller } = createGateway({ fakeProvider });

  await assert.rejects(
    gateway.request(sendTransaction({ value: '0x1' })),
    (error) => expectProviderCode(error, 'POMRX_WG_PROVIDER_E_CONTEXT_UNSTABLE'),
  );
  assert.equal(controller.stats().sensitiveCalls.length, 0);
});

test('provider chain change after preflight but before Gate observation is non-forwarding', async () => {
  const fakeProvider = createFakeProvider({
    onRead: async ({ readCount, state }) => {
      if (readCount === 5) state.chainId = '0x2';
    },
  });
  const { gateway, controller } = createGateway({ fakeProvider });

  await assert.rejects(
    gateway.request(sendTransaction({ value: '0x1' })),
    (error) => error?.code === 'POMRX_GATE_E_OBSERVER_FAILED',
  );
  assert.equal(controller.stats().sensitiveCalls.length, 0);
});

test('provider active account change after preflight but before Gate observation is non-forwarding', async () => {
  const fakeProvider = createFakeProvider({
    onRead: async ({ readCount, state }) => {
      if (readCount === 6) state.accounts = [OTHER_ACCOUNT];
    },
  });
  const { gateway, controller } = createGateway({ fakeProvider });

  await assert.rejects(
    gateway.request(sendTransaction({ value: '0x1' })),
    (error) => error?.code === 'POMRX_GATE_E_OBSERVER_FAILED',
  );
  assert.equal(controller.stats().sensitiveCalls.length, 0);
});

test('trusted origin change after preflight but before Gate observation is non-forwarding', async () => {
  let captures = 0;
  const captureTrustedOrigin = () => {
    captures += 1;
    return captures <= 2 ? ORIGIN : OTHER_ORIGIN;
  };
  const { gateway, controller } = createGateway({ captureTrustedOrigin });

  await assert.rejects(
    gateway.request(sendTransaction({ value: '0x1' })),
    (error) => error?.code === 'POMRX_GATE_E_OBSERVER_FAILED',
  );
  assert.equal(controller.stats().sensitiveCalls.length, 0);
});

test('context change after Gate observation but immediately before forwarding is still blocked', async () => {
  const fakeProvider = createFakeProvider({
    onRead: async ({ readCount, state }) => {
      if (readCount === 9) state.chainId = '0x2';
    },
  });
  const { gateway, controller } = createGateway({ fakeProvider });

  await assert.rejects(
    gateway.request(sendTransaction({ value: '0x1' })),
    (error) => error?.code === 'POMRX_GATE_E_DOWNSTREAM_FAILED',
  );
  assert.equal(controller.stats().sensitiveCalls.length, 0);
});

test('malformed provider responses and duplicate accounts fail closed with provider diagnostics', async () => {
  const malformedChain = createFakeProvider({ chainId: '1' });
  await assert.rejects(
    createGateway({ fakeProvider: malformedChain }).gateway.request(sendTransaction({ value: '0x1' })),
    (error) => expectProviderCode(error, 'POMRX_WG_PROVIDER_E_CONTEXT_INVALID'),
  );
  assert.equal(malformedChain.controller.stats().sensitiveCalls.length, 0);

  const duplicates = createFakeProvider({ accounts: [ACCOUNT, ACCOUNT] });
  await assert.rejects(
    createGateway({ fakeProvider: duplicates }).gateway.request(sendTransaction({ value: '0x1' })),
    (error) => expectProviderCode(error, 'POMRX_WG_PROVIDER_E_CONTEXT_INVALID'),
  );
  assert.equal(duplicates.controller.stats().sensitiveCalls.length, 0);
});

test('capability lifetime cannot outlive the bounded synthetic witness evidence', async () => {
  const { gateway, controller } = createGateway({
    referenceFactory: referenceAuthorizationFactory({
      overrides: { witness_valid_until: '2026-08-19T17:00:10.000Z' },
    }),
  });

  await assert.rejects(
    gateway.request(sendTransaction({ value: '0x1' })),
    (error) => expectProviderCode(error, 'POMRX_WG_PROVIDER_E_TIME_INVALID'),
  );
  assert.equal(controller.stats().sensitiveCalls.length, 0);
});
