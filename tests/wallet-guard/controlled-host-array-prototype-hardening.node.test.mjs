import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WalletGuardControlledHostError,
  createWalletGuardControlledReferenceHost,
} from '../../applications/blockchain-digital-assets/wallet-guard/controlled-host.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const RECIPIENT = `0x${'3'.repeat(40)}`;
const ATTACKER = `0x${'9'.repeat(40)}`;
const TOKEN = `0x${'2'.repeat(40)}`;
const SPENDER = `0x${'4'.repeat(40)}`;
const ORIGIN = 'https://controlled.wallet-guard.local';
const TX_RESULT = `0x${'a'.repeat(64)}`;
const hash = (character) => character.repeat(64);

function policy() {
  return {
    schema_version: 'wallet-guard-policy/0.1',
    policy_id: 'wallet-guard-controlled-host/0.1',
    enabled: true,
    kill_switch: false,
    expected_chain_id: '0x1',
    allowed_origins: [ORIGIN],
    allowed_targets: [TOKEN],
    allowed_recipients: [RECIPIENT],
    allowed_spenders: [SPENDER],
    allowed_typed_data_verifying_contracts: [TOKEN],
    max_native_value: '1000',
    max_token_amount: '1000000',
    deny_unlimited_allowance: true,
    deny_operator_approval: true,
    require_simulation_for: [],
  };
}

function authorization() {
  return {
    run_id: 'run-controlled-host-00000001',
    agent_ref: 'agent-controlled-host-01',
    subject_ref: 'subject-controlled-host-01',
    preflight_receipt_hash: hash('1'),
    witness_ack_hash: hash('2'),
    source_key_id: `ed25519-${'a'.repeat(32)}`,
    witness_key_id: `ed25519-${'b'.repeat(32)}`,
    verification_profile: 'pom-rx-v0.1/strict-errata-1',
    verifier_version: 'pom-rx-v0.1-strict-verifier/1',
    implementation_artifact_sha256: hash('3'),
    effective_verification_policy_sha256: hash('4'),
    witness_valid_until: '2026-08-20T20:10:00.000Z',
  };
}

function options() {
  return {
    trustedOrigin: ORIGIN,
    chainId: '0x1',
    accounts: [ACCOUNT],
    policy: policy(),
    trustedClock: () => '2026-08-20T20:00:00.000Z',
    referenceAuthorizationForRequest: () => authorization(),
    capabilityLifetimeMs: 30_000,
    providerResult: TX_RESULT,
  };
}

function nativeTransfer(to = RECIPIENT) {
  return {
    method: 'eth_sendTransaction',
    params: [{ from: ACCOUNT, to, value: '0x0', data: '0x' }],
  };
}

function assertIntrinsicMutation(error) {
  assert.ok(error instanceof WalletGuardControlledHostError);
  assert.equal(error.code, 'POMRX_WG_HOST_E_INTRINSIC_MUTATION');
}

function installNumericSetter() {
  const original = Object.getOwnPropertyDescriptor(Array.prototype, '0');
  const originalLength = Object.getOwnPropertyDescriptor(Array.prototype, 'length');
  let calls = 0;
  Object.defineProperty(Array.prototype, '0', {
    configurable: true,
    get() {
      return ATTACKER;
    },
    set() {
      calls += 1;
      Object.defineProperty(this, '0', {
        value: ATTACKER,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    },
  });
  return {
    calls: () => calls,
    restore() {
      if (original) Object.defineProperty(Array.prototype, '0', original);
      else delete Array.prototype[0];
      // Array.prototype is itself an Array. Defining numeric key "0" grows its
      // own length even when the key is later deleted, so restore that descriptor
      // as part of the adversarial-test cleanup. Otherwise a successful fail-closed
      // check would leave the shared intrinsic observably mutated for later tests.
      Object.defineProperty(Array.prototype, 'length', originalLength);
    },
  };
}

test('controlled host fails closed before policy materialization on post-import numeric setter drift', async () => {
  const attack = installNumericSetter();
  let thrown;
  let setterCalls;
  try {
    try {
      createWalletGuardControlledReferenceHost(options());
    } catch (error) {
      thrown = error;
    }
    setterCalls = attack.calls();
  } finally {
    attack.restore();
  }

  assertIntrinsicMutation(thrown);
  assert.equal(setterCalls, 0);

  const { page } = createWalletGuardControlledReferenceHost(options());
  const result = await page.ethereum.request(nativeTransfer());
  assert.equal(result.decision, 'ALLOW');
  assert.equal(result.forwarded, true);
});

test('controlled host also fails closed if Array.prototype drifts after host construction', async () => {
  const { page, testAuthority } = createWalletGuardControlledReferenceHost(options());
  const attack = installNumericSetter();
  let rejected;
  let setterCalls;
  try {
    try {
      await page.ethereum.request(nativeTransfer(ATTACKER));
    } catch (error) {
      rejected = error;
    }
    setterCalls = attack.calls();
  } finally {
    attack.restore();
  }

  assertIntrinsicMutation(rejected);
  assert.equal(setterCalls, 0);
  const state = testAuthority.inspect();
  assert.equal(state.sensitive_call_count, 0);
  assert.equal(state.context_reads, 0);
});
