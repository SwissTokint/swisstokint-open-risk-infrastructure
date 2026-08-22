import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const PROVIDER_MODULE_URL = new URL(
  '../../applications/blockchain-digital-assets/wallet-guard/provider.mjs',
  import.meta.url,
).href;

function runRejectedInvalidTransportCase(mode) {
  const childSource = `
const {
  WalletGuardProviderError,
  createWalletGuardReferenceProviderGateway,
} = await import(${JSON.stringify(PROVIDER_MODULE_URL)});

const ACCOUNT = '0x' + '1'.repeat(40);
const RECIPIENT = '0x' + '3'.repeat(40);
const ORIGIN = 'https://invalid-rejected-transport.wallet-guard.local';
const hash = (character) => character.repeat(64);
let authorizationCalls = 0;
let sensitiveCalls = 0;
let accountReads = 0;

const rejectedTransport = Promise.reject(new Error('provider transport rejected'));
if (process.env.POMRX_TRANSPORT_CASE === 'metadata') {
  Object.defineProperty(rejectedTransport, 'metadata', {
    value: 1,
    enumerable: true,
  });
} else if (process.env.POMRX_TRANSPORT_CASE === 'prototype') {
  const alternatePrototype = Object.create(Promise.prototype);
  Object.defineProperty(alternatePrototype, 'constructor', {
    value: Promise,
    writable: true,
    configurable: true,
  });
  Object.setPrototypeOf(rejectedTransport, alternatePrototype);
} else {
  process.exit(10);
}

const provider = Object.freeze({
  request(request) {
    if (request.method === 'eth_chainId') return rejectedTransport;
    if (request.method === 'eth_accounts') {
      accountReads += 1;
      return Promise.resolve([ACCOUNT]);
    }
    sensitiveCalls += 1;
    return '0x' + 'a'.repeat(64);
  },
});

const guarded = createWalletGuardReferenceProviderGateway({
  captureTrustedOrigin: () => ORIGIN,
  provider,
  policy: {
    schema_version: 'wallet-guard-policy/0.1',
    policy_id: 'wallet-guard-invalid-rejected-transport/0.1',
    enabled: true,
    kill_switch: false,
    expected_chain_id: '0x1',
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
  },
  trustedClock: () => '2026-08-21T12:00:00.000Z',
  referenceAuthorizationForRequest: () => {
    authorizationCalls += 1;
    return {
      run_id: 'run-invalid-rejected-transport-0001',
      agent_ref: 'agent-invalid-rejected-transport-01',
      subject_ref: 'subject-invalid-rejected-transport-01',
      preflight_receipt_hash: hash('1'),
      witness_ack_hash: hash('2'),
      source_key_id: 'ed25519-' + 'a'.repeat(32),
      witness_key_id: 'ed25519-' + 'b'.repeat(32),
      verification_profile: 'pom-rx-v0.1/strict-errata-1',
      verifier_version: 'pom-rx-v0.1-strict-verifier/1',
      implementation_artifact_sha256: hash('3'),
      effective_verification_policy_sha256: hash('4'),
      witness_valid_until: '2026-08-21T12:01:00.000Z',
    };
  },
  capabilityLifetimeMs: 30_000,
  assertRuntimeIntegrity: () => {},
});

let observedError;
try {
  await guarded.request({
    method: 'eth_sendTransaction',
    params: [{
      from: ACCOUNT,
      to: RECIPIENT,
      value: '0x0',
      data: '0x',
    }],
  });
} catch (error) {
  observedError = error;
}

await new Promise((resolve) => setImmediate(resolve));

if (!(observedError instanceof WalletGuardProviderError)
    || observedError.code !== 'POMRX_WG_PROVIDER_E_CONTEXT_INVALID') {
  console.error('unexpected error', observedError);
  process.exit(2);
}
if (authorizationCalls !== 0 || sensitiveCalls !== 0 || accountReads !== 0) {
  console.error(JSON.stringify({ authorizationCalls, sensitiveCalls, accountReads }));
  process.exit(3);
}
console.log('POMRX_INVALID_REJECTED_TRANSPORT_DRAINED ' + process.env.POMRX_TRANSPORT_CASE);
`;

  return spawnSync(
    process.execPath,
    ['--unhandled-rejections=strict', '--input-type=module', '--eval', childSource],
    {
      encoding: 'utf8',
      env: { ...process.env, POMRX_TRANSPORT_CASE: mode },
    },
  );
}

test('rejected native Promise with own metadata is drained before structural validation fails', () => {
  const result = runRejectedInvalidTransportCase('metadata');
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /POMRX_INVALID_REJECTED_TRANSPORT_DRAINED metadata/);
});

test('rejected native Promise with nonstandard prototype is drained before structural validation fails', () => {
  const result = runRejectedInvalidTransportCase('prototype');
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /POMRX_INVALID_REJECTED_TRANSPORT_DRAINED prototype/);
});
