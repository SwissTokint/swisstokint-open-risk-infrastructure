import assert from 'node:assert/strict';
import test from 'node:test';

import {
  commitWalletGuardMethod,
} from '../../applications/blockchain-digital-assets/wallet-guard/method-commitment.mjs';
import {
  createWalletGuardReferenceProviderGateway,
} from '../../applications/blockchain-digital-assets/wallet-guard/provider.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const RECIPIENT = `0x${'3'.repeat(40)}`;
const ORIGIN = 'https://fixture.wallet-guard.local';
const CHAIN_ID = '0x1';
const hash = (character) => character.repeat(64);

function policy() {
  return {
    schema_version: 'wallet-guard-policy/0.1',
    policy_id: 'wallet-guard-method-continuity/0.1',
    enabled: true,
    kill_switch: false,
    expected_chain_id: CHAIN_ID,
    allowed_origins: [ORIGIN],
    allowed_targets: [],
    allowed_recipients: [RECIPIENT],
    allowed_spenders: [],
    allowed_typed_data_verifying_contracts: [],
    max_native_value: '1000',
    max_token_amount: '1000',
    deny_unlimited_allowance: true,
    deny_operator_approval: true,
    require_simulation_for: [],
  };
}

function sequenceClock() {
  const values = [
    '2026-08-20T01:00:00.000Z',
    '2026-08-20T01:00:01.000Z',
    '2026-08-20T01:00:02.000Z',
  ];
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

test('provider authorization summary matches canonical Wallet Guard RPC method commitment', async () => {
  const summaries = [];
  const provider = Object.freeze({
    captureContext(deliverContext) {
      deliverContext(CHAIN_ID, ACCOUNT);
      return undefined;
    },
    async request(request) {
      if (request.method === 'eth_chainId') return CHAIN_ID;
      if (request.method === 'eth_accounts') return [ACCOUNT];
      return `0x${'a'.repeat(64)}`;
    },
  });

  const gateway = createWalletGuardReferenceProviderGateway({
    captureTrustedOrigin: () => ORIGIN,
    provider,
    policy: policy(),
    trustedClock: sequenceClock(),
    referenceAuthorizationForRequest: (summary) => {
      summaries.push(summary);
      return {
        run_id: 'run-method-continuity-0001',
        agent_ref: 'agent-method-continuity-01',
        subject_ref: 'subject-method-continuity-01',
        preflight_receipt_hash: hash('1'),
        witness_ack_hash: hash('2'),
        source_key_id: `ed25519-${'a'.repeat(32)}`,
        witness_key_id: `ed25519-${'b'.repeat(32)}`,
        verification_profile: 'pom-rx-v0.1/strict-errata-1',
        verifier_version: 'pom-rx-v0.1-strict-verifier/1',
        implementation_artifact_sha256: hash('3'),
        effective_verification_policy_sha256: hash('4'),
        witness_valid_until: '2026-08-20T01:02:00.000Z',
      };
    },
    capabilityLifetimeMs: 30_000,
  });

  const result = await gateway.request({
    method: 'eth_sendTransaction',
    params: [{
      from: ACCOUNT,
      to: RECIPIENT,
      value: '0x1',
      data: '0x',
    }],
  });

  assert.equal(result.forwarded, true);
  assert.equal(summaries.length, 1);
  assert.equal(
    summaries[0].method_hash,
    commitWalletGuardMethod('eth_sendTransaction'),
  );
});
