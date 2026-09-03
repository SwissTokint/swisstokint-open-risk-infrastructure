import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canonicalizePayload,
  sha256Hex,
} from '../../sdk/typescript/swisstokint-proof.mjs';
import {
  createWalletGuardControlledReferenceHost,
} from '../../applications/blockchain-digital-assets/wallet-guard/controlled-host.mjs';
import {
  WALLET_GUARD_INTENT_COMMIT_DOMAIN,
  WalletGuardIntentError,
  commitWalletGuardIntent,
  normalizeWalletGuardIntent,
} from '../../applications/blockchain-digital-assets/wallet-guard/intent.mjs';
import {
  WalletGuardProviderError,
  createWalletGuardReferenceProviderGateway,
} from '../../applications/blockchain-digital-assets/wallet-guard/provider.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const RECIPIENT = `0x${'3'.repeat(40)}`;
const DENIED_RECIPIENT = `0x${'7'.repeat(40)}`;
const ATTACKER = `0x${'8'.repeat(40)}`;
const ORIGIN = 'https://late-boundary.wallet-guard.local';
const CHAIN_ID = '0x1';
const TX_RESULT = `0x${'a'.repeat(64)}`;

function indexedHash(index, offset) {
  return (40_000n + (BigInt(index) * 4n) + BigInt(offset))
    .toString(16)
    .padStart(64, '0');
}

function referenceAuthorizationFactory(prefix = 'late-boundary') {
  let counter = 0;
  return () => {
    counter += 1;
    return {
      run_id: `run-${prefix}-${String(counter).padStart(8, '0')}`,
      agent_ref: `agent-${prefix}-0001`,
      subject_ref: `subject-${prefix}-0001`,
      preflight_receipt_hash: indexedHash(counter, 0),
      witness_ack_hash: indexedHash(counter, 1),
      source_key_id: `ed25519-${'a'.repeat(32)}`,
      witness_key_id: `ed25519-${'b'.repeat(32)}`,
      verification_profile: 'pom-rx-v0.1/strict-errata-1',
      verifier_version: 'pom-rx-v0.1-strict-verifier/1',
      implementation_artifact_sha256: indexedHash(counter, 2),
      effective_verification_policy_sha256: indexedHash(counter, 3),
      witness_valid_until: '2026-09-02T18:30:00.000Z',
    };
  };
}

function policy(overrides = {}) {
  return {
    schema_version: 'wallet-guard-policy/0.1',
    policy_id: 'wallet-guard-late-boundary/0.1',
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
    ...overrides,
  };
}

function sendTransaction({ from = ACCOUNT, to = RECIPIENT, value = '0x1' } = {}) {
  return {
    method: 'eth_sendTransaction',
    params: [{
      from,
      to,
      value,
      data: '0x',
    }],
  };
}

function createMutableGateway({
  account = ACCOUNT,
  authorizationFactory = referenceAuthorizationFactory(),
  onAuthorizationSummary = null,
  onContextCapture = null,
} = {}) {
  const state = {
    account,
    contextReads: 0,
    sensitiveCalls: [],
  };
  const provider = Object.freeze({
    captureContext(deliverContext) {
      state.contextReads += 1;
      const capturedAccount = state.account;
      deliverContext(CHAIN_ID, capturedAccount);
      if (onContextCapture) {
        onContextCapture({
          read: state.contextReads,
          capturedAccount,
          state,
        });
      }
    },
    async request(request) {
      state.sensitiveCalls.push(request);
      return TX_RESULT;
    },
  });
  const gateway = createWalletGuardReferenceProviderGateway({
    captureTrustedOrigin: () => ORIGIN,
    provider,
    policy: policy(),
    trustedClock: () => '2026-09-02T18:00:00.000Z',
    referenceAuthorizationForRequest: (summary) => {
      if (onAuthorizationSummary) onAuthorizationSummary(summary);
      return authorizationFactory(summary);
    },
    capabilityLifetimeMs: 30_000,
  });
  return { gateway, state };
}

function normalizeControlIntent() {
  return normalizeWalletGuardIntent({
    requestId: 'wg-late-boundary-0001',
    trustedOrigin: ORIGIN,
    trustedChainId: CHAIN_ID,
    trustedAccount: ACCOUNT,
    request: sendTransaction(),
  });
}

test('fixed-schema intent commitment remains byte-compatible with the historical canonical form', () => {
  const intent = normalizeControlIntent();
  const expectedCanonical = canonicalizePayload(intent);
  const expectedCommitment = sha256Hex(
    `${WALLET_GUARD_INTENT_COMMIT_DOMAIN}${expectedCanonical}`,
  );
  const committed = commitWalletGuardIntent(intent);

  assert.equal(committed.canonical_intent, expectedCanonical);
  assert.equal(committed.intent_commitment, expectedCommitment);
});

test('post-import Object.entries drift cannot forge a validated intent commitment', () => {
  const intent = normalizeControlIntent();
  const expected = commitWalletGuardIntent(intent);
  const originalEntries = Object.entries;
  let actual = null;
  let rejected = null;

  Object.entries = function poisonedEntries(value) {
    if (value === intent) {
      return originalEntries({
        ...intent,
        recipient: DENIED_RECIPIENT,
        target: DENIED_RECIPIENT,
      });
    }
    return originalEntries(value);
  };

  try {
    try {
      actual = commitWalletGuardIntent(intent);
    } catch (error) {
      rejected = error;
    }
  } finally {
    Object.entries = originalEntries;
  }

  if (rejected) {
    assert.ok(rejected instanceof WalletGuardIntentError);
    assert.equal(rejected.code, 'POMRX_WG_E_REQUEST_INVALID');
    assert.equal(actual, null);
    return;
  }

  assert.equal(actual.canonical_intent, expected.canonical_intent);
  assert.equal(actual.intent_commitment, expected.intent_commitment);
});

test('Array.prototype.map drift cannot retain caller transaction aliases into sensitive forwarding', async () => {
  const { gateway, state } = createMutableGateway({
    authorizationFactory: referenceAuthorizationFactory('map-alias'),
  });
  const request = sendTransaction();
  const callerTransaction = request.params[0];
  const originalMap = Array.prototype.map;

  Array.prototype.map = function poisonedMap(callback, thisArg) {
    if (this.length === 1 && this[0] === '0') {
      return [callerTransaction];
    }
    return Reflect.apply(originalMap, this, [callback, thisArg]);
  };

  try {
    const pending = gateway.request(request);
    callerTransaction.to = DENIED_RECIPIENT;
    const result = await pending;
    assert.equal(result.forwarded, true);
  } finally {
    Array.prototype.map = originalMap;
  }

  assert.equal(state.sensitiveCalls.length, 1);
  assert.equal(state.sensitiveCalls[0].params[0].to, RECIPIENT);
  assert.equal(callerTransaction.to, DENIED_RECIPIENT);
});

test('controlled host ignores a post-import replacement of the global Array constructor for trusted accounts', async () => {
  const OriginalArray = globalThis.Array;
  function PoisonedArray(...args) {
    const result = Reflect.construct(OriginalArray, args, OriginalArray);
    if (args.length === 1 && args[0] === 1) {
      Object.defineProperty(result, '0', {
        configurable: true,
        enumerable: true,
        get() {
          return ATTACKER;
        },
        set() {},
      });
    }
    return result;
  }
  PoisonedArray.prototype = OriginalArray.prototype;
  Object.setPrototypeOf(PoisonedArray, OriginalArray);

  let host;
  globalThis.Array = PoisonedArray;
  try {
    host = createWalletGuardControlledReferenceHost({
      trustedOrigin: ORIGIN,
      chainId: CHAIN_ID,
      accounts: [ACCOUNT],
      policy: policy(),
      trustedClock: () => '2026-09-02T18:00:00.000Z',
      referenceAuthorizationForRequest: referenceAuthorizationFactory('array-ctor'),
      capabilityLifetimeMs: 30_000,
      providerResult: TX_RESULT,
    });
  } finally {
    globalThis.Array = OriginalArray;
  }

  await assert.rejects(
    host.page.ethereum.request(sendTransaction({ from: ATTACKER })),
  );
  const state = host.testAuthority.inspect();
  assert.equal(state.accounts[0], ACCOUNT);
  assert.equal(state.sensitive_call_count, 0);
});

test('context drift immediately after the last pre-forward sample is caught by the final resample', async () => {
  const { gateway, state } = createMutableGateway({
    authorizationFactory: referenceAuthorizationFactory('final-context'),
    onContextCapture({ read, state: mutableState }) {
      if (read === 6) {
        mutableState.account = ATTACKER;
      }
    },
  });

  await assert.rejects(
    gateway.request(sendTransaction()),
    (error) => {
      assert.equal(error?.name, 'PomRxGateError');
      assert.equal(error?.code, 'POMRX_GATE_E_DOWNSTREAM_FAILED');
      assert.equal(error?.message, 'Downstream execution failed');
      return true;
    },
  );

  assert.equal(state.account, ATTACKER);
  assert.equal(state.sensitiveCalls.length, 0);
  assert.ok(state.contextReads >= 7);
});

test('reentrant capability issuance cannot reuse the same replay evidence twice', async () => {
  const fixedAuthorization = referenceAuthorizationFactory('reentrant-replay')();
  let gateway;
  let state;
  let armed = false;
  let reentryStarted = false;
  let nestedPromise = null;

  const originalFreeze = Object.freeze;
  const originalGetPrototypeOf = Object.getPrototypeOf;
  const originalOwnKeys = Reflect.ownKeys;

  Object.freeze = function poisonedFreeze(value) {
    if (armed
        && !reentryStarted
        && value
        && typeof value === 'object'
        && Reflect.apply(originalGetPrototypeOf, Object, [value]) === null
        && Reflect.apply(originalOwnKeys, Reflect, [value]).length === 0) {
      reentryStarted = true;
      nestedPromise = gateway.request(sendTransaction());
    }
    return Reflect.apply(originalFreeze, Object, [value]);
  };

  try {
    ({ gateway, state } = createMutableGateway({
      authorizationFactory: () => {
        armed = true;
        return fixedAuthorization;
      },
    }));

    const outerPromise = gateway.request(sendTransaction());
    assert.equal(reentryStarted, true);
    assert.ok(nestedPromise);

    const [outer, nested] = await Promise.allSettled([outerPromise, nestedPromise]);
    assert.equal(outer.status, 'fulfilled');
    assert.equal(outer.value.forwarded, true);
    assert.equal(nested.status, 'rejected');
    assert.ok(nested.reason instanceof WalletGuardProviderError);
    assert.equal(nested.reason.code, 'POMRX_WG_PROVIDER_E_REFERENCE_REPLAY');
  } finally {
    Object.freeze = originalFreeze;
  }

  assert.equal(state.sensitiveCalls.length, 1);
});

async function captureReferenceSummary({ poisonContextEntries = false } = {}) {
  let capturedSummary = null;
  const { gateway } = createMutableGateway({
    authorizationFactory: referenceAuthorizationFactory(
      poisonContextEntries ? 'context-poison' : 'context-control',
    ),
    onAuthorizationSummary(summary) {
      capturedSummary = summary;
    },
  });

  const originalEntries = Object.entries;
  if (poisonContextEntries) {
    Object.entries = function poisonedEntries(value) {
      if (value
          && typeof value === 'object'
          && value.schema_version === 'wallet_guard_context/0.1') {
        return originalEntries({ ...value, account: ATTACKER });
      }
      return originalEntries(value);
    };
  }

  try {
    const result = await gateway.request(sendTransaction());
    assert.equal(result.forwarded, true);
  } finally {
    Object.entries = originalEntries;
  }
  assert.ok(capturedSummary);
  return capturedSummary;
}

test('context and method commitments ignore post-import Object.entries drift', async () => {
  const control = await captureReferenceSummary();
  const poisoned = await captureReferenceSummary({ poisonContextEntries: true });

  assert.equal(poisoned.method_hash, control.method_hash);
  assert.equal(poisoned.context_commitment, control.context_commitment);
  assert.equal(poisoned.action_commitment, control.action_commitment);
});
