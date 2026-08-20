import {
  canonicalizePayload,
  sha256Hex,
} from '../../../sdk/typescript/swisstokint-proof.mjs';
import {
  POM_RX_SCHEMA_VERSION,
  commitPomRxReceipt,
} from '../../../sdk/typescript/pom-rx.mjs';
import {
  commitWalletGuardIntent,
  isLocallyNormalizedWalletGuardIntent,
} from './intent.mjs';
import {
  evaluateWalletGuardPolicy,
} from './policy.mjs';

export const WALLET_GUARD_PREFLIGHT_EVIDENCE_SCHEMA_VERSION = 'wallet_guard_preflight_evidence/0.1';

const INPUT_COMMIT_DOMAIN = 'swisstokint:pom-rx-wallet-guard-preflight-input:v1:';
const METHOD_COMMIT_DOMAIN = 'swisstokint:pom-rx-wallet-guard-preflight-method:v1:';
const DECISION_COMMIT_DOMAIN = 'swisstokint:pom-rx-wallet-guard-preflight-decision:v1:';
const RULE_COMMIT_DOMAIN = 'swisstokint:pom-rx-wallet-guard-preflight-rule:v1:';
const RULE_EVIDENCE_DOMAIN = 'swisstokint:pom-rx-wallet-guard-preflight-rule-evidence:v1:';

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{15,127}$/u;
const SOURCE_KEY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u;
const INPUT_KEYS = Object.freeze([
  'intent',
  'policy',
  'receiptId',
  'runId',
  'agentRef',
  'subjectRef',
  'occurredAt',
  'sourceKeyId',
]);
const MAX_DEPTH = 8;
const MAX_NODES = 1_000;
const MAX_STRING = 16_384;
const MAX_KEY = 64;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export class WalletGuardPreflightEvidenceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WalletGuardPreflightEvidenceError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new WalletGuardPreflightEvidenceError(code, message);
}

function asciiCompare(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function captureExactInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('POMRX_WG_PREFLIGHT_E_INVALID', 'preflight evidence input must be an object');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail('POMRX_WG_PREFLIGHT_E_INVALID', 'preflight evidence input must be a plain object');
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    fail('POMRX_WG_PREFLIGHT_E_INVALID', 'preflight evidence input cannot contain symbol keys');
  }

  const keys = Object.keys(value).sort(asciiCompare);
  const expected = [...INPUT_KEYS].sort(asciiCompare);
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    fail('POMRX_WG_PREFLIGHT_E_INVALID', 'preflight evidence input has missing or unknown fields');
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const captured = Object.create(null);
  for (const key of INPUT_KEYS) {
    const descriptor = descriptors[key];
    if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
      fail('POMRX_WG_PREFLIGHT_E_INVALID', `preflight evidence input ${key} cannot be an accessor`);
    }
    captured[key] = descriptor.value;
  }
  return Object.freeze(captured);
}

function clonePlainData(value, depth = 0, budget = { remaining: MAX_NODES }) {
  if (depth > MAX_DEPTH || budget.remaining-- <= 0) {
    fail('POMRX_WG_PREFLIGHT_E_POLICY', 'policy exceeds preflight reference bounds');
  }
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.length > MAX_STRING) {
      fail('POMRX_WG_PREFLIGHT_E_POLICY', 'policy string exceeds preflight reference bounds');
    }
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      fail('POMRX_WG_PREFLIGHT_E_POLICY', 'policy numbers must be safe integers');
    }
    return value;
  }
  if (Array.isArray(value)) {
    const keys = Object.keys(value);
    if (keys.length !== value.length || keys.some((key, index) => key !== String(index))) {
      fail('POMRX_WG_PREFLIGHT_E_POLICY', 'policy arrays must be dense');
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const output = keys.map((key) => {
      const descriptor = descriptors[key];
      if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
        fail('POMRX_WG_PREFLIGHT_E_POLICY', 'policy arrays cannot contain accessors');
      }
      return clonePlainData(descriptor.value, depth + 1, budget);
    });
    return Object.freeze(output);
  }
  if (!value || typeof value !== 'object') {
    fail('POMRX_WG_PREFLIGHT_E_POLICY', 'policy contains an unsupported value');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail('POMRX_WG_PREFLIGHT_E_POLICY', 'policy must contain plain objects only');
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    fail('POMRX_WG_PREFLIGHT_E_POLICY', 'policy cannot contain symbol keys');
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const output = Object.create(null);
  for (const key of Object.keys(value)) {
    if (key.length === 0 || key.length > MAX_KEY || FORBIDDEN_KEYS.has(key)) {
      fail('POMRX_WG_PREFLIGHT_E_POLICY', 'policy contains an unsafe key');
    }
    const descriptor = descriptors[key];
    if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
      fail('POMRX_WG_PREFLIGHT_E_POLICY', 'policy cannot contain accessors');
    }
    output[key] = clonePlainData(descriptor.value, depth + 1, budget);
  }
  return Object.freeze(output);
}

function canonicalUtcInstant(value) {
  if (typeof value !== 'string' || !value.endsWith('Z')) {
    fail('POMRX_WG_PREFLIGHT_E_INVALID', 'occurredAt must be a canonical UTC instant');
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    fail('POMRX_WG_PREFLIGHT_E_INVALID', 'occurredAt must be a canonical UTC instant');
  }
  return value;
}

function validateMetadata(input) {
  for (const [field, value] of [
    ['receiptId', input.receiptId],
    ['runId', input.runId],
  ]) {
    if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
      fail('POMRX_WG_PREFLIGHT_E_INVALID', `${field} has an invalid format`);
    }
  }
  for (const [field, value] of [
    ['agentRef', input.agentRef],
    ['subjectRef', input.subjectRef],
  ]) {
    if (typeof value !== 'string'
        || value.trim().length < 1
        || value.length > 256
        || /[\u0000-\u001f\u007f]/u.test(value)) {
      fail('POMRX_WG_PREFLIGHT_E_INVALID', `${field} has an invalid format`);
    }
  }
  if (typeof input.sourceKeyId !== 'string' || !SOURCE_KEY_ID_PATTERN.test(input.sourceKeyId)) {
    fail('POMRX_WG_PREFLIGHT_E_INVALID', 'sourceKeyId has an invalid format');
  }
  canonicalUtcInstant(input.occurredAt);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function ruleHash(ruleId) {
  return sha256Hex(`${RULE_COMMIT_DOMAIN}${ruleId}`);
}

function makeAssertion(ruleId, result, decisionCommitment) {
  const evidence = canonicalizePayload(Object.freeze({
    rule_id: ruleId,
    result,
    decision_commitment: decisionCommitment,
  }));
  return Object.freeze({
    rule_id: ruleId,
    rule_hash: ruleHash(ruleId),
    result,
    proof_mode: 'commitment',
    evidence_hash: sha256Hex(`${RULE_EVIDENCE_DOMAIN}${evidence}`),
  });
}

function commitDecision(intent, policyResult, intentCommitment) {
  const reasons = Object.freeze([...policyResult.reasons].sort(asciiCompare));
  const payload = Object.freeze({
    schema_version: WALLET_GUARD_PREFLIGHT_EVIDENCE_SCHEMA_VERSION,
    request_id: intent.request_id,
    decision: policyResult.decision,
    reasons,
    policy_id: policyResult.policy_id,
    policy_hash: policyResult.policy_hash,
    intent_commitment: intentCommitment,
  });
  const canonical = canonicalizePayload(payload);
  return Object.freeze({
    reasons,
    decision_commitment: sha256Hex(`${DECISION_COMMIT_DOMAIN}${canonical}`),
  });
}

export function buildWalletGuardPreflightEvidence(rawInput) {
  const input = captureExactInput(rawInput);
  validateMetadata(input);

  if (!isLocallyNormalizedWalletGuardIntent(input.intent)) {
    fail('POMRX_WG_PREFLIGHT_E_INTENT', 'preflight evidence requires the exact locally normalized intent object');
  }

  let committedIntent;
  try {
    committedIntent = commitWalletGuardIntent(input.intent);
  } catch {
    fail('POMRX_WG_PREFLIGHT_E_INTENT', 'Wallet Guard intent commitment failed');
  }

  const policy = clonePlainData(input.policy);
  let policyResult;
  try {
    // Simulation evidence is deliberately not accepted at this boundary yet.
    // Until the separately reviewed simulation-evidence layer is merged and
    // composed here, preflight always evaluates simulation as not_run.
    policyResult = evaluateWalletGuardPolicy(input.intent, policy, { status: 'not_run' });
  } catch {
    fail('POMRX_WG_PREFLIGHT_E_POLICY', 'Wallet Guard policy evaluation failed');
  }

  const inputCommitment = sha256Hex(
    `${INPUT_COMMIT_DOMAIN}${committedIntent.canonical_intent}`,
  );
  const actionCommitment = committedIntent.intent_commitment;
  const methodHash = sha256Hex(`${METHOD_COMMIT_DOMAIN}${input.intent.rpc_method}`);
  const committedDecision = commitDecision(input.intent, policyResult, actionCommitment);

  const common = {
    schema_version: WALLET_GUARD_PREFLIGHT_EVIDENCE_SCHEMA_VERSION,
    wallet_guard_decision: policyResult.decision,
    wallet_guard_reasons: committedDecision.reasons,
    decision_commitment: committedDecision.decision_commitment,
    input_commitment: inputCommitment,
    action_commitment: actionCommitment,
    policy_hash: policyResult.policy_hash,
    policy_id: policyResult.policy_id,
    simulation_evidence_proved: false,
    authorization_eligible: false,
    authorization_proved: false,
    reference_only: true,
  };

  if (policyResult.decision === 'INDETERMINATE') {
    return Object.freeze({
      ...common,
      portable_preflight_produced: false,
      pom_rx_receipt: null,
      pom_rx_receipt_hash: null,
    });
  }

  const forwardableResult = policyResult.decision === 'ALLOW' ? 'pass' : 'fail';
  const assertions = Object.freeze([
    makeAssertion('wallet-guard-determinate', 'pass', committedDecision.decision_commitment),
    makeAssertion('wallet-guard-forwardable', forwardableResult, committedDecision.decision_commitment),
  ]);

  const receipt = {
    schema_version: POM_RX_SCHEMA_VERSION,
    receipt_id: input.receiptId,
    run_id: input.runId,
    phase: 'preflight',
    outcome: policyResult.decision === 'ALLOW' ? 'allow' : 'deny',
    agent_ref: input.agentRef.normalize('NFC'),
    subject_ref: input.subjectRef.normalize('NFC'),
    method_hash: methodHash,
    policy_hash: policyResult.policy_hash,
    input_commitment: inputCommitment,
    action_commitment: actionCommitment,
    assertions,
    previous_receipt_hash: null,
    occurred_at: input.occurredAt,
    source_key_id: input.sourceKeyId,
  };

  let committedReceipt;
  try {
    committedReceipt = commitPomRxReceipt(receipt);
  } catch {
    fail('POMRX_WG_PREFLIGHT_E_RECEIPT', 'portable POM-RX preflight receipt construction failed');
  }

  return Object.freeze({
    ...common,
    portable_preflight_produced: true,
    pom_rx_receipt: deepFreeze(committedReceipt.receipt),
    pom_rx_receipt_hash: committedReceipt.receiptHash,
  });
}
