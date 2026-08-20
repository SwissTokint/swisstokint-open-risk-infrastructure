import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_UINT256_DECIMAL,
} from '../../applications/blockchain-digital-assets/wallet-guard/evm-decoders.mjs';
import {
  commitWalletGuardIntent,
  normalizeWalletGuardIntent,
} from '../../applications/blockchain-digital-assets/wallet-guard/intent.mjs';
import {
  WALLET_GUARD_DECODED_EFFECT_SCHEMA_VERSION,
  WalletGuardDecodedEffectError,
  deriveWalletGuardDecodedEffectEvidence,
} from '../../applications/blockchain-digital-assets/wallet-guard/decoded-effect-evidence.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const TOKEN = `0x${'2'.repeat(40)}`;
const RECIPIENT = `0x${'3'.repeat(40)}`;
const SPENDER = `0x${'4'.repeat(40)}`;
const OPERATOR = `0x${'5'.repeat(40)}`;
const PERMIT2 = `0x${'6'.repeat(40)}`;
const ORIGIN = 'https://fixture.wallet-guard.local';
const CHAIN_ID = '0x1';

function addressWord(address) {
  return `${'0'.repeat(24)}${address.slice(2).toLowerCase()}`;
}

function uintWord(value) {
  return BigInt(value).toString(16).padStart(64, '0');
}

function boolWord(value) {
  return (value ? '1' : '0').padStart(64, '0');
}

function sendTransaction(data = '0x', overrides = {}) {
  return {
    method: 'eth_sendTransaction',
    params: [{
      from: ACCOUNT,
      to: TOKEN,
      value: '0x0',
      data,
      ...overrides,
    }],
  };
}

function normalize(request, requestId = 'wg-effect-request-0001') {
  return normalizeWalletGuardIntent({
    requestId,
    trustedOrigin: ORIGIN,
    trustedChainId: CHAIN_ID,
    trustedAccount: ACCOUNT,
    request,
  });
}

function typedDataRequest(typedData) {
  return {
    method: 'eth_signTypedData_v4',
    params: [ACCOUNT, typedData],
  };
}

function eip2612Permit() {
  return {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    primaryType: 'Permit',
    domain: {
      name: 'Token',
      version: '1',
      chainId: 1,
      verifyingContract: TOKEN,
    },
    message: {
      owner: ACCOUNT,
      spender: SPENDER,
      value: '50',
      nonce: '7',
      deadline: '2000000000',
    },
  };
}

function permit2Single() {
  return {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      PermitDetails: [
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint160' },
        { name: 'expiration', type: 'uint48' },
        { name: 'nonce', type: 'uint48' },
      ],
      PermitSingle: [
        { name: 'details', type: 'PermitDetails' },
        { name: 'spender', type: 'address' },
        { name: 'sigDeadline', type: 'uint256' },
      ],
    },
    primaryType: 'PermitSingle',
    domain: {
      name: 'Permit2',
      chainId: 1,
      verifyingContract: PERMIT2,
    },
    message: {
      details: {
        token: TOKEN,
        amount: '100',
        expiration: '2000000000',
        nonce: '3',
      },
      spender: SPENDER,
      sigDeadline: '2000000100',
    },
  };
}

function expectEffectCode(error, code) {
  assert.ok(error instanceof WalletGuardDecodedEffectError);
  assert.equal(error.code, code);
  return true;
}

test('native transfer emits known request semantics bound to the exact local intent', () => {
  const intent = normalize(sendTransaction('0x', { to: RECIPIENT, value: '0x64' }));
  const evidence = deriveWalletGuardDecodedEffectEvidence(intent);

  assert.equal(evidence.schema_version, WALLET_GUARD_DECODED_EFFECT_SCHEMA_VERSION);
  assert.equal(evidence.intent_commitment, commitWalletGuardIntent(intent).intent_commitment);
  assert.equal(evidence.semantic_status, 'known');
  assert.equal(evidence.semantic_class, 'native_transfer_request');
  assert.equal(evidence.target, RECIPIENT);
  assert.equal(evidence.recipient, RECIPIENT);
  assert.equal(evidence.native_value, '100');
  assert.equal(evidence.decoded_request_semantics_proved, true);
  assert.equal(evidence.external_state_proved, false);
  assert.equal(evidence.external_effect_proved, false);
  assert.equal(evidence.reference_only, true);
  assert.match(evidence.effect_commitment, /^[a-f0-9]{64}$/u);
  assert.equal(Object.isFrozen(evidence), true);
});

test('ERC-20 transfer preserves both decoded token amount and independent native value', () => {
  const data = `0xa9059cbb${addressWord(RECIPIENT)}${uintWord(250)}`;
  const intent = normalize(sendTransaction(data, { value: '0x7' }));
  const evidence = deriveWalletGuardDecodedEffectEvidence(intent);

  assert.equal(evidence.semantic_class, 'erc20_transfer_request');
  assert.equal(evidence.target, TOKEN);
  assert.equal(evidence.recipient, RECIPIENT);
  assert.equal(evidence.token_amount, '250');
  assert.equal(evidence.native_value, '7');
  assert.equal(evidence.simulation_required, true);
});

test('ERC-20 approval evidence preserves exact spender and max allowance without upgrading execution truth', () => {
  const data = `0x095ea7b3${addressWord(SPENDER)}${uintWord(MAX_UINT256_DECIMAL)}`;
  const intent = normalize(sendTransaction(data));
  const evidence = deriveWalletGuardDecodedEffectEvidence(intent);

  assert.equal(evidence.semantic_class, 'erc20_allowance_request');
  assert.equal(evidence.spender, SPENDER);
  assert.equal(evidence.requested_allowance, MAX_UINT256_DECIMAL);
  assert.equal(evidence.decoded_request_semantics_proved, true);
  assert.equal(evidence.external_effect_proved, false);
});

test('operator approval true and false remain exact requested semantics', () => {
  const enabledData = `0xa22cb465${addressWord(OPERATOR)}${boolWord(true)}`;
  const disabledData = `0xa22cb465${addressWord(OPERATOR)}${boolWord(false)}`;
  const enabled = deriveWalletGuardDecodedEffectEvidence(normalize(sendTransaction(enabledData), 'wg-effect-request-0002'));
  const disabled = deriveWalletGuardDecodedEffectEvidence(normalize(sendTransaction(disabledData), 'wg-effect-request-0003'));

  assert.equal(enabled.semantic_class, 'operator_approval_request');
  assert.equal(enabled.requested_operator_approval, true);
  assert.equal(disabled.semantic_class, 'operator_approval_request');
  assert.equal(disabled.requested_operator_approval, false);
  assert.notEqual(enabled.effect_commitment, disabled.effect_commitment);
});

test('EIP-2612 Permit is represented as requested signature authorization, not executed allowance state', () => {
  const intent = normalize(typedDataRequest(eip2612Permit()), 'wg-effect-request-0004');
  const evidence = deriveWalletGuardDecodedEffectEvidence(intent);

  assert.equal(evidence.request_class, 'permit_eip2612');
  assert.equal(evidence.semantic_class, 'permit_authorization_request');
  assert.equal(evidence.target, TOKEN);
  assert.equal(evidence.typed_data_verifying_contract, TOKEN);
  assert.equal(evidence.typed_data_owner, ACCOUNT);
  assert.equal(evidence.spender, SPENDER);
  assert.equal(evidence.requested_allowance, '50');
  assert.equal(evidence.external_effect_proved, false);
});

test('Permit2 preserves token target separately from Permit2 verifying contract', () => {
  const intent = normalize(typedDataRequest(permit2Single()), 'wg-effect-request-0005');
  const evidence = deriveWalletGuardDecodedEffectEvidence(intent);

  assert.equal(evidence.request_class, 'permit2_single');
  assert.equal(evidence.semantic_class, 'permit_authorization_request');
  assert.equal(evidence.target, TOKEN);
  assert.equal(evidence.typed_data_verifying_contract, PERMIT2);
  assert.equal(evidence.spender, SPENDER);
  assert.equal(evidence.requested_allowance, '100');
});

test('unknown calldata remains explicit unknown semantics and retains opaque calldata identity', () => {
  const intent = normalize(sendTransaction('0xdeadbeef'), 'wg-effect-request-0006');
  const evidence = deriveWalletGuardDecodedEffectEvidence(intent);

  assert.equal(evidence.request_class, 'unknown_calldata');
  assert.equal(evidence.semantic_status, 'unknown');
  assert.equal(evidence.semantic_class, 'unknown_request_semantics');
  assert.equal(evidence.decoded_request_semantics_proved, false);
  assert.match(evidence.calldata_sha256, /^[a-f0-9]{64}$/u);
  assert.equal(evidence.external_effect_proved, false);
});

test('unknown typed data cannot inherit Permit semantics merely from a verifying contract', () => {
  const unknown = {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      Action: [{ name: 'spender', type: 'address' }],
    },
    primaryType: 'Action',
    domain: {
      name: 'Unknown',
      chainId: 1,
      verifyingContract: TOKEN,
    },
    message: { spender: SPENDER },
  };
  const intent = normalize(typedDataRequest(unknown), 'wg-effect-request-0007');
  const evidence = deriveWalletGuardDecodedEffectEvidence(intent);

  assert.equal(evidence.request_class, 'unknown_typed_data');
  assert.equal(evidence.semantic_status, 'unknown');
  assert.equal(evidence.typed_data_verifying_contract, TOKEN);
  assert.equal(evidence.spender, null);
  assert.equal(evidence.requested_allowance, null);
  assert.equal(evidence.decoded_request_semantics_proved, false);
});

test('generic signatures and unsupported RPC calls stay unknown and non-effect-proving', () => {
  const signature = deriveWalletGuardDecodedEffectEvidence(normalize({
    method: 'personal_sign',
    params: ['0x1234', ACCOUNT],
  }, 'wg-effect-request-0008'));
  const unsupported = deriveWalletGuardDecodedEffectEvidence(normalize({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: '0x2' }],
  }, 'wg-effect-request-0009'));

  assert.equal(signature.request_class, 'generic_signature');
  assert.equal(signature.semantic_status, 'unknown');
  assert.equal(unsupported.request_class, 'unsupported_rpc');
  assert.equal(unsupported.semantic_status, 'unknown');
  assert.equal(signature.external_effect_proved, false);
  assert.equal(unsupported.external_effect_proved, false);
});

test('same exact intent produces deterministic canonical effect commitment', () => {
  const firstIntent = normalize(sendTransaction('0x', { to: RECIPIENT, value: '0x1' }), 'wg-effect-request-0010');
  const secondIntent = normalize(sendTransaction('0x', { to: RECIPIENT, value: '0x1' }), 'wg-effect-request-0010');
  const first = deriveWalletGuardDecodedEffectEvidence(firstIntent);
  const second = deriveWalletGuardDecodedEffectEvidence(secondIntent);

  assert.equal(first.canonical_effect, second.canonical_effect);
  assert.equal(first.effect_commitment, second.effect_commitment);
});

test('structural intent clones cannot mint locally decoded effect evidence', () => {
  const intent = normalize(sendTransaction('0x', { to: RECIPIENT, value: '0x1' }), 'wg-effect-request-0011');
  const clone = Object.freeze({ ...intent });

  assert.throws(
    () => deriveWalletGuardDecodedEffectEvidence(clone),
    (error) => expectEffectCode(error, 'POMRX_WG_EFFECT_E_LOCAL_INTENT_REQUIRED'),
  );
});
