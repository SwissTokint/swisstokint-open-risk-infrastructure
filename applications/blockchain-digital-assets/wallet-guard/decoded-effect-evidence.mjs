import {
  canonicalizePayload,
  sha256Hex,
} from '../../../sdk/typescript/swisstokint-proof.mjs';
import {
  commitWalletGuardIntent,
  isLocallyNormalizedWalletGuardIntent,
} from './intent.mjs';

export const WALLET_GUARD_DECODED_EFFECT_SCHEMA_VERSION = 'wallet_guard_decoded_effect/0.1';
export const WALLET_GUARD_DECODED_EFFECT_COMMIT_DOMAIN = 'swisstokint:pom-rx-wallet-guard-decoded-effect:v1:';

const KNOWN_CLASSES = new Map([
  ['native_transfer', 'native_transfer_request'],
  ['erc20_transfer', 'erc20_transfer_request'],
  ['erc20_approve', 'erc20_allowance_request'],
  ['set_approval_for_all', 'operator_approval_request'],
  ['permit_eip2612', 'permit_authorization_request'],
  ['permit2_single', 'permit_authorization_request'],
]);

const COMPLETE_PROJECTION_CLASSES = new Set([
  'native_transfer',
  'erc20_transfer',
  'erc20_approve',
  'set_approval_for_all',
]);

export class WalletGuardDecodedEffectError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WalletGuardDecodedEffectError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new WalletGuardDecodedEffectError(code, message);
}

function allNull(intent, fields) {
  return fields.every((field) => intent[field] === null);
}

function assertSemanticConsistency(intent, semanticClass) {
  switch (intent.request_class) {
    case 'native_transfer':
      if (intent.target === null || intent.recipient !== intent.target
          || intent.calldata_sha256 === null || intent.typed_data_sha256 !== null
          || !allNull(intent, [
            'spender',
            'requested_allowance',
            'token_amount',
            'requested_operator_approval',
            'typed_data_owner',
            'typed_data_domain_chain_id',
            'typed_data_verifying_contract',
          ])) {
        fail('POMRX_WG_EFFECT_E_INTENT_INCONSISTENT', 'native transfer intent is internally inconsistent');
      }
      break;
    case 'erc20_transfer':
      if (intent.target === null || intent.recipient === null || intent.token_amount === null
          || intent.calldata_sha256 === null || intent.typed_data_sha256 !== null
          || !allNull(intent, [
            'spender',
            'requested_allowance',
            'requested_operator_approval',
            'typed_data_owner',
            'typed_data_domain_chain_id',
            'typed_data_verifying_contract',
          ])) {
        fail('POMRX_WG_EFFECT_E_INTENT_INCONSISTENT', 'ERC-20 transfer intent is internally inconsistent');
      }
      break;
    case 'erc20_approve':
      if (intent.target === null || intent.spender === null || intent.requested_allowance === null
          || intent.calldata_sha256 === null || intent.typed_data_sha256 !== null
          || !allNull(intent, [
            'recipient',
            'token_amount',
            'requested_operator_approval',
            'typed_data_owner',
            'typed_data_domain_chain_id',
            'typed_data_verifying_contract',
          ])) {
        fail('POMRX_WG_EFFECT_E_INTENT_INCONSISTENT', 'ERC-20 approval intent is internally inconsistent');
      }
      break;
    case 'set_approval_for_all':
      if (intent.target === null || intent.spender === null
          || typeof intent.requested_operator_approval !== 'boolean'
          || intent.calldata_sha256 === null || intent.typed_data_sha256 !== null
          || !allNull(intent, [
            'recipient',
            'requested_allowance',
            'token_amount',
            'typed_data_owner',
            'typed_data_domain_chain_id',
            'typed_data_verifying_contract',
          ])) {
        fail('POMRX_WG_EFFECT_E_INTENT_INCONSISTENT', 'operator approval intent is internally inconsistent');
      }
      break;
    case 'permit_eip2612':
      if (intent.target === null || intent.spender === null || intent.requested_allowance === null
          || intent.typed_data_owner !== intent.account
          || intent.typed_data_sha256 === null || intent.calldata_sha256 !== null
          || intent.typed_data_domain_chain_id === null
          || intent.typed_data_verifying_contract !== intent.target
          || !allNull(intent, ['recipient', 'token_amount', 'requested_operator_approval'])) {
        fail('POMRX_WG_EFFECT_E_INTENT_INCONSISTENT', 'EIP-2612 Permit intent is internally inconsistent');
      }
      break;
    case 'permit2_single':
      if (intent.target === null || intent.spender === null || intent.requested_allowance === null
          || intent.typed_data_sha256 === null || intent.calldata_sha256 !== null
          || intent.typed_data_domain_chain_id === null
          || intent.typed_data_verifying_contract === null
          || intent.typed_data_owner !== null
          || !allNull(intent, ['recipient', 'token_amount', 'requested_operator_approval'])) {
        fail('POMRX_WG_EFFECT_E_INTENT_INCONSISTENT', 'Permit2 intent is internally inconsistent');
      }
      break;
    default:
      if (semanticClass !== 'unknown_request_semantics') {
        fail('POMRX_WG_EFFECT_E_INTENT_INCONSISTENT', 'unknown intent class received known semantics');
      }
  }
}

export function deriveWalletGuardDecodedEffectEvidence(intent) {
  if (!isLocallyNormalizedWalletGuardIntent(intent)) {
    fail(
      'POMRX_WG_EFFECT_E_LOCAL_INTENT_REQUIRED',
      'decoded effect evidence requires the exact locally normalized Wallet Guard intent object',
    );
  }

  const committed = commitWalletGuardIntent(intent);
  const semanticClass = KNOWN_CLASSES.get(intent.request_class) ?? 'unknown_request_semantics';
  const semanticStatus = semanticClass === 'unknown_request_semantics' ? 'unknown' : 'known';
  assertSemanticConsistency(intent, semanticClass);

  const payload = Object.freeze({
    schema_version: WALLET_GUARD_DECODED_EFFECT_SCHEMA_VERSION,
    request_id: intent.request_id,
    intent_commitment: committed.intent_commitment,
    origin: intent.origin,
    chain_id: intent.chain_id,
    account: intent.account,
    rpc_method: intent.rpc_method,
    request_class: intent.request_class,
    semantic_status: semanticStatus,
    semantic_class: semanticClass,
    target: intent.target,
    spender: intent.spender,
    recipient: intent.recipient,
    native_value: intent.native_value,
    requested_allowance: intent.requested_allowance,
    token_amount: intent.token_amount,
    requested_operator_approval: intent.requested_operator_approval,
    typed_data_owner: intent.typed_data_owner,
    typed_data_domain_chain_id: intent.typed_data_domain_chain_id,
    typed_data_verifying_contract: intent.typed_data_verifying_contract,
    calldata_sha256: intent.calldata_sha256,
    typed_data_sha256: intent.typed_data_sha256,
    simulation_required: intent.simulation_required,
    recognized_effect_fields_proved: semanticStatus === 'known',
    complete_semantic_projection_proved: COMPLETE_PROJECTION_CLASSES.has(intent.request_class),
    normalized_intent_bound: true,
    external_state_proved: false,
    external_effect_proved: false,
    reference_only: true,
  });

  const canonical_effect = canonicalizePayload(payload);
  const effect_commitment = sha256Hex(
    `${WALLET_GUARD_DECODED_EFFECT_COMMIT_DOMAIN}${canonical_effect}`,
  );

  return Object.freeze({
    ...payload,
    canonical_effect,
    effect_commitment,
  });
}
