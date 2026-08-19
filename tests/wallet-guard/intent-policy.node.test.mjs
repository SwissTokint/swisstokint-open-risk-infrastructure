import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_UINT256_DECIMAL,
} from '../../applications/blockchain-digital-assets/wallet-guard/evm-decoders.mjs';
import {
  WalletGuardIntentError,
  commitWalletGuardIntent,
  normalizeWalletGuardIntent,
} from '../../applications/blockchain-digital-assets/wallet-guard/intent.mjs';
import {
  WalletGuardPolicyError,
  evaluateWalletGuardPolicy,
  normalizeWalletGuardPolicy,
} from '../../applications/blockchain-digital-assets/wallet-guard/policy.mjs';

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

function normalize(request, overrides = {}) {
  return normalizeWalletGuardIntent({
    requestId: 'wg-request-0001',
    trustedOrigin: ORIGIN,
    trustedChainId: CHAIN_ID,
    trustedAccount: ACCOUNT,
    request,
    ...overrides,
  });
}

function eip2612Permit(overrides = {}) {
  const base = {
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
  return {
    ...base,
    ...overrides,
    types: overrides.types ?? base.types,
    domain: { ...base.domain, ...(overrides.domain ?? {}) },
    message: { ...base.message, ...(overrides.message ?? {}) },
  };
}

function permit2Single(overrides = {}) {
  const base = {
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
  return {
    ...base,
    ...overrides,
    types: overrides.types ?? base.types,
    domain: { ...base.domain, ...(overrides.domain ?? {}) },
    message: {
      ...base.message,
      ...(overrides.message ?? {}),
      details: {
        ...base.message.details,
        ...(overrides.message?.details ?? {}),
      },
    },
  };
}

function typedDataRequest(typedData, account = ACCOUNT) {
  return {
    method: 'eth_signTypedData_v4',
    params: [account, typedData],
  };
}

function policy(overrides = {}) {
  return {
    schema_version: 'wallet-guard-policy/0.1',
    policy_id: 'wallet-guard-test-policy/0.1',
    enabled: true,
    kill_switch: false,
    expected_chain_id: CHAIN_ID,
    allowed_origins: [ORIGIN],
    allowed_targets: [TOKEN],
    allowed_recipients: [RECIPIENT, TOKEN],
    allowed_spenders: [SPENDER, OPERATOR],
    allowed_typed_data_verifying_contracts: [TOKEN, PERMIT2],
    max_native_value: '1000000000000000',
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

function expectIntentCode(error, code) {
  assert.ok(error instanceof WalletGuardIntentError);
  assert.equal(error.code, code);
  return true;
}

function expectPolicyCode(error, code) {
  assert.ok(error instanceof WalletGuardPolicyError);
  assert.equal(error.code, code);
  return true;
}

test('trusted capture values define origin, chain and account and intent commitment is deterministic', () => {
  const first = normalize(sendTransaction('0x', { to: RECIPIENT, value: '0x1' }));
  const second = normalize(sendTransaction('0x', { to: RECIPIENT, value: '0x1' }));

  assert.equal(first.origin, ORIGIN);
  assert.equal(first.chain_id, CHAIN_ID);
  assert.equal(first.account, ACCOUNT);
  assert.equal(first.request_class, 'native_transfer');
  assert.equal(first.recipient, RECIPIENT);
  assert.equal(first.native_value, '1');
  assert.equal(Object.isFrozen(first), true);
  assert.equal(
    commitWalletGuardIntent(first).intent_commitment,
    commitWalletGuardIntent(second).intent_commitment,
  );
});

test('dApp request cannot self-assert trusted origin or another active account', () => {
  assert.throws(
    () => normalize({
      method: 'eth_sendTransaction',
      params: [{
        from: ACCOUNT,
        to: RECIPIENT,
        origin: 'https://attacker.invalid',
      }],
    }),
    (error) => expectIntentCode(error, 'POMRX_WG_E_REQUEST_INVALID'),
  );
  assert.throws(
    () => normalize(sendTransaction('0x', { from: `0x${'9'.repeat(40)}` })),
    (error) => expectIntentCode(error, 'POMRX_WG_E_ACCOUNT_MISMATCH'),
  );
});

test('ERC-20 approve decodes spender and exact allowance including max uint256', () => {
  const data = `0x095ea7b3${addressWord(SPENDER)}${uintWord(MAX_UINT256_DECIMAL)}`;
  const intent = normalize(sendTransaction(data));

  assert.equal(intent.request_class, 'erc20_approve');
  assert.equal(intent.target, TOKEN);
  assert.equal(intent.spender, SPENDER);
  assert.equal(intent.requested_allowance, MAX_UINT256_DECIMAL);
  assert.equal(intent.simulation_required, true);
});

test('ERC-20 transfer decodes recipient and token amount', () => {
  const data = `0xa9059cbb${addressWord(RECIPIENT)}${uintWord(25)}`;
  const intent = normalize(sendTransaction(data));

  assert.equal(intent.request_class, 'erc20_transfer');
  assert.equal(intent.recipient, RECIPIENT);
  assert.equal(intent.token_amount, '25');
});

test('setApprovalForAll decodes operator and approval flag', () => {
  const data = `0xa22cb465${addressWord(OPERATOR)}${boolWord(true)}`;
  const intent = normalize(sendTransaction(data));

  assert.equal(intent.request_class, 'set_approval_for_all');
  assert.equal(intent.spender, OPERATOR);
  assert.equal(intent.requested_operator_approval, true);
});

test('recognized selector with malformed ABI fails closed instead of becoming unknown', () => {
  assert.throws(
    () => normalize(sendTransaction(`0x095ea7b3${addressWord(SPENDER)}`)),
    (error) => expectIntentCode(error, 'POMRX_WG_E_CALLDATA_MALFORMED'),
  );
});

test('unknown calldata remains explicitly dangerous and simulation-required', () => {
  const intent = normalize(sendTransaction('0xdeadbeef'));
  assert.equal(intent.request_class, 'unknown_calldata');
  assert.equal(intent.simulation_required, true);
});

test('exact EIP-2612 Permit binds owner, domain, spender and allowance', () => {
  const intent = normalize(typedDataRequest(JSON.stringify(eip2612Permit())));

  assert.equal(intent.request_class, 'permit_eip2612');
  assert.equal(intent.target, TOKEN);
  assert.equal(intent.spender, SPENDER);
  assert.equal(intent.typed_data_owner, ACCOUNT);
  assert.equal(intent.requested_allowance, '50');
  assert.equal(intent.typed_data_domain_chain_id, CHAIN_ID);
  assert.equal(intent.typed_data_verifying_contract, TOKEN);
  assert.match(intent.typed_data_sha256, /^[a-f0-9]{64}$/u);
});

test('exact Permit2 PermitSingle binds token, spender, widths and Permit2 domain', () => {
  const intent = normalize(typedDataRequest(permit2Single()));

  assert.equal(intent.request_class, 'permit2_single');
  assert.equal(intent.target, TOKEN);
  assert.equal(intent.spender, SPENDER);
  assert.equal(intent.requested_allowance, '100');
  assert.equal(intent.typed_data_domain_chain_id, CHAIN_ID);
  assert.equal(intent.typed_data_verifying_contract, PERMIT2);
});

test('Permit primaryType spoof with altered schema is downgraded to unknown typed data', () => {
  const spoofed = eip2612Permit({
    types: {
      EIP712Domain: eip2612Permit().types.EIP712Domain,
      Permit: [
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
      ],
    },
  });
  const intent = normalize(typedDataRequest(spoofed));
  assert.equal(intent.request_class, 'unknown_typed_data');
  assert.equal(intent.spender, null);
  assert.equal(intent.requested_allowance, null);
});

test('Permit type field reordering, extras and omissions cannot inherit EIP-2612 semantics', () => {
  const base = eip2612Permit();
  const mutations = [
    {
      ...base,
      types: {
        ...base.types,
        Permit: [base.types.Permit[1], base.types.Permit[0], ...base.types.Permit.slice(2)],
      },
    },
    {
      ...base,
      types: {
        ...base.types,
        Permit: [...base.types.Permit, { name: 'salt', type: 'bytes32' }],
      },
      message: { ...base.message, salt: `0x${'0'.repeat(64)}` },
    },
    {
      ...base,
      types: { ...base.types, Permit: base.types.Permit.slice(0, -1) },
    },
  ];

  for (const mutation of mutations) {
    const intent = normalize(typedDataRequest(mutation));
    assert.equal(intent.request_class, 'unknown_typed_data');
  }
});

test('EIP-2612 Permit owner must equal trusted active account', () => {
  assert.throws(
    () => normalize(typedDataRequest(eip2612Permit({
      message: { owner: `0x${'9'.repeat(40)}` },
    }))),
    (error) => expectIntentCode(error, 'POMRX_WG_E_ACCOUNT_MISMATCH'),
  );
});

test('Permit2 schema mutation is unknown and uint160/uint48 overflows fail closed', () => {
  const base = permit2Single();
  const schemaMutation = {
    ...base,
    types: {
      ...base.types,
      PermitDetails: [
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'expiration', type: 'uint48' },
        { name: 'nonce', type: 'uint48' },
      ],
    },
  };
  assert.equal(
    normalize(typedDataRequest(schemaMutation)).request_class,
    'unknown_typed_data',
  );

  assert.throws(
    () => normalize(typedDataRequest(permit2Single({
      message: { details: { amount: (1n << 160n).toString(10) } },
    }))),
    (error) => expectIntentCode(error, 'POMRX_WG_E_TYPED_DATA_INVALID'),
  );

  assert.throws(
    () => normalize(typedDataRequest(permit2Single({
      message: { details: { expiration: (1n << 48n).toString(10) } },
    }))),
    (error) => expectIntentCode(error, 'POMRX_WG_E_TYPED_DATA_INVALID'),
  );
});

test('generic typed data, PermitBatch and generic signatures remain fail-closed classes', () => {
  const typedIntent = normalize(typedDataRequest({
    types: { Order: [{ name: 'maker', type: 'address' }] },
    primaryType: 'Order',
    domain: { chainId: 1 },
    message: { maker: ACCOUNT },
  }));
  const permitBatch = normalize(typedDataRequest({
    types: { PermitBatch: [{ name: 'spender', type: 'address' }] },
    primaryType: 'PermitBatch',
    domain: { chainId: 1 },
    message: { spender: SPENDER },
  }));
  const signIntent = normalize({
    method: 'personal_sign',
    params: ['0x1234', ACCOUNT],
  });

  assert.equal(typedIntent.request_class, 'unknown_typed_data');
  assert.equal(permitBatch.request_class, 'permit2_batch_unknown');
  assert.equal(signIntent.request_class, 'generic_signature');
});

test('policy denies unlimited approval even when spender and token are allowlisted', () => {
  const intent = normalize(sendTransaction(
    `0x095ea7b3${addressWord(SPENDER)}${uintWord(MAX_UINT256_DECIMAL)}`,
  ));
  const result = evaluateWalletGuardPolicy(intent, policy(), { status: 'pass' });

  assert.equal(result.decision, 'DENY');
  assert.ok(result.reasons.includes('WG_POLICY_DENY_UNLIMITED_ALLOWANCE'));
});

test('policy denies operator approval and untrusted permit spender', () => {
  const operatorIntent = normalize(sendTransaction(
    `0xa22cb465${addressWord(OPERATOR)}${boolWord(true)}`,
  ));
  assert.equal(
    evaluateWalletGuardPolicy(operatorIntent, policy(), { status: 'pass' }).decision,
    'DENY',
  );

  const permitIntent = normalize(typedDataRequest(eip2612Permit({
    message: { spender: `0x${'9'.repeat(40)}` },
  })));
  const result = evaluateWalletGuardPolicy(permitIntent, policy(), { status: 'pass' });
  assert.equal(result.decision, 'DENY');
  assert.ok(result.reasons.includes('WG_POLICY_DENY_SPENDER'));
});

test('unknown dangerous calldata and unavailable required simulation never become ALLOW', () => {
  const unknown = normalize(sendTransaction('0xdeadbeef'));
  const unknownResult = evaluateWalletGuardPolicy(unknown, policy(), { status: 'pass' });
  assert.equal(unknownResult.decision, 'INDETERMINATE');

  const transfer = normalize(sendTransaction(
    `0xa9059cbb${addressWord(RECIPIENT)}${uintWord(25)}`,
  ));
  const unavailable = evaluateWalletGuardPolicy(transfer, policy(), { status: 'unavailable' });
  assert.equal(unavailable.decision, 'INDETERMINATE');
  assert.ok(unavailable.reasons.includes('WG_POLICY_INDETERMINATE_SIMULATION'));
});

test('simulation PASS cannot upgrade an intrinsically untrusted request', () => {
  const unknown = normalize(sendTransaction('0xdeadbeef'));
  assert.equal(evaluateWalletGuardPolicy(unknown, policy(), { status: 'pass' }).decision, 'INDETERMINATE');

  const wrongSpender = normalize(typedDataRequest(eip2612Permit({
    message: { spender: `0x${'9'.repeat(40)}` },
  })));
  assert.equal(evaluateWalletGuardPolicy(wrongSpender, policy(), { status: 'pass' }).decision, 'DENY');
});

test('allowlisted low-value native control is ALLOW while wrong origin and kill switch are DENY', () => {
  const intent = normalize(sendTransaction('0x', { to: RECIPIENT, value: '0x64' }));
  const allowed = evaluateWalletGuardPolicy(intent, policy());
  assert.equal(allowed.decision, 'ALLOW');
  assert.match(allowed.policy_hash, /^[a-f0-9]{64}$/u);

  const wrongOriginIntent = normalize(sendTransaction('0x', { to: RECIPIENT, value: '0x64' }), {
    trustedOrigin: 'https://attacker.invalid',
  });
  assert.equal(evaluateWalletGuardPolicy(wrongOriginIntent, policy()).decision, 'DENY');
  assert.equal(evaluateWalletGuardPolicy(intent, policy({ kill_switch: true })).decision, 'DENY');
});

test('typed-data chain and domain mismatches are denied independently of simulation', () => {
  const wrongChain = normalize(typedDataRequest(eip2612Permit({ domain: { chainId: 10 } })));
  const wrongChainResult = evaluateWalletGuardPolicy(wrongChain, policy(), { status: 'pass' });
  assert.equal(wrongChainResult.decision, 'DENY');
  assert.ok(wrongChainResult.reasons.includes('WG_POLICY_DENY_TYPED_DATA_CHAIN'));

  const otherContract = `0x${'7'.repeat(40)}`;
  const wrongDomain = normalize(typedDataRequest(eip2612Permit({
    domain: { verifyingContract: otherContract },
  })));
  const wrongDomainResult = evaluateWalletGuardPolicy(wrongDomain, policy({
    allowed_targets: [TOKEN, otherContract],
  }), { status: 'pass' });
  assert.equal(wrongDomainResult.decision, 'DENY');
  assert.ok(wrongDomainResult.reasons.includes('WG_POLICY_DENY_TYPED_DATA_DOMAIN'));
});

test('nonzero native value on a token call is independently bounded', () => {
  const transfer = normalize(sendTransaction(
    `0xa9059cbb${addressWord(RECIPIENT)}${uintWord(25)}`,
    { value: '0x100' },
  ));
  const result = evaluateWalletGuardPolicy(
    transfer,
    policy({ max_native_value: '100' }),
    { status: 'pass' },
  );
  assert.equal(result.decision, 'DENY');
  assert.ok(result.reasons.includes('WG_POLICY_DENY_NATIVE_VALUE'));
});

test('policy requires the exact locally normalized intent object, not a forged clone', () => {
  const intent = normalize(sendTransaction('0x', { to: RECIPIENT, value: '0x1' }));
  const clone = { ...intent };

  assert.throws(
    () => evaluateWalletGuardPolicy(clone, policy()),
    (error) => expectPolicyCode(error, 'POMRX_WG_POLICY_E_INVALID'),
  );
  assert.throws(
    () => evaluateWalletGuardPolicy({ ...intent, extra: true }, policy()),
    (error) => expectPolicyCode(error, 'POMRX_WG_POLICY_E_INVALID'),
  );
  assert.equal(evaluateWalletGuardPolicy(intent, policy()).decision, 'ALLOW');
});

test('policy schema is exact, normalized and rejects duplicates/unknown fields', () => {
  const normalized = normalizeWalletGuardPolicy(policy());
  assert.equal(Object.isFrozen(normalized), true);

  assert.throws(
    () => normalizeWalletGuardPolicy({ ...policy(), extra: true }),
    (error) => expectPolicyCode(error, 'POMRX_WG_POLICY_E_INVALID'),
  );
  assert.throws(
    () => normalizeWalletGuardPolicy(policy({ allowed_spenders: [SPENDER, SPENDER.toUpperCase()] })),
    (error) => expectPolicyCode(error, 'POMRX_WG_POLICY_E_INVALID'),
  );
});
