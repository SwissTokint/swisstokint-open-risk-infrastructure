import { types as utilTypes } from 'node:util';

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
  commitWalletGuardMethod,
} from './method-commitment.mjs';
import {
  WalletGuardPolicyError,
  evaluateWalletGuardPolicy,
} from './policy.mjs';

export const WALLET_GUARD_PREFLIGHT_EVIDENCE_SCHEMA_VERSION =
  'wallet_guard_preflight_evidence/0.1';

const INPUT_COMMIT_DOMAIN = 'swisstokint:pom-rx-wallet-guard-preflight-input:v1:';
const DECISION_COMMIT_DOMAIN = 'swisstokint:pom-rx-wallet-guard-preflight-decision:v1:';
const RULE_COMMIT_DOMAIN = 'swisstokint:pom-rx-wallet-guard-preflight-rule:v1:';
const RULE_EVIDENCE_DOMAIN = 'swisstokint:pom-rx-wallet-guard-preflight-rule-evidence:v1:';

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{15,127}$/u;
const SOURCE_KEY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u;
const BUILD_KEYS = Object.freeze([
  'intent',
  'policy',
  'evidenceId',
  'runId',
  'agentRef',
  'subjectRef',
  'sourceKeyId',
]);
const BOOTSTRAP_KEYS = Object.freeze(['trustedClock']);

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

function isOwnEnumerableDataDescriptor(descriptor) {
  return Boolean(descriptor)
    && Object.hasOwn(descriptor, 'value')
    && Object.hasOwn(descriptor, 'enumerable')
    && descriptor.enumerable === true
    && !Object.hasOwn(descriptor, 'get')
    && !Object.hasOwn(descriptor, 'set');
}

function captureExactDataRecord(value, expectedKeys, label, code = 'POMRX_WG_PREFLIGHT_E_INVALID') {
  if (!value
      || typeof value !== 'object'
      || utilTypes.isProxy(value)
      || Array.isArray(value)) {
    fail(code, `${label} must be a non-Proxy plain object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(code, `${label} must use Object.prototype or a null prototype`);
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    fail(code, `${label} cannot contain symbol keys`);
  }

  const actual = Object.getOwnPropertyNames(value).sort(asciiCompare);
  const expected = [...expectedKeys].sort(asciiCompare);
  if (actual.length !== expected.length
      || actual.some((key, index) => key !== expected[index])) {
    fail(code, `${label} has missing, hidden or unknown fields`);
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const captured = Object.create(null);
  for (const key of expectedKeys) {
    const descriptor = descriptors[key];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail(code, `${label}.${key} must be an enumerable data property`);
    }
    captured[key] = descriptor.value;
  }
  return Object.freeze(captured);
}

function canonicalUtcInstant(value) {
  if (typeof value !== 'string' || !value.endsWith('Z')) {
    fail('POMRX_WG_PREFLIGHT_E_TIME_INVALID', 'trusted clock must return a canonical UTC instant');
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    fail('POMRX_WG_PREFLIGHT_E_TIME_INVALID', 'trusted clock must return a canonical UTC instant');
  }
  return parsed;
}

function sampleTrustedClock(trustedClock, lastSampleMs) {
  let value;
  try {
    value = trustedClock();
  } catch {
    fail('POMRX_WG_PREFLIGHT_E_TIME_INVALID', 'trusted clock failed');
  }
  if (value && typeof value === 'object' && typeof value.then === 'function') {
    fail('POMRX_WG_PREFLIGHT_E_TIME_INVALID', 'trusted clock must be synchronous');
  }
  const parsed = canonicalUtcInstant(value);
  if (lastSampleMs !== null && parsed.getTime() < lastSampleMs) {
    fail('POMRX_WG_PREFLIGHT_E_TIME_ROLLBACK', 'trusted clock moved backwards');
  }
  return parsed;
}

function validateMetadata(input) {
  for (const [field, value] of [
    ['evidenceId', input.evidenceId],
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
  if (typeof input.sourceKeyId !== 'string'
      || !SOURCE_KEY_ID_PATTERN.test(input.sourceKeyId)) {
    fail('POMRX_WG_PREFLIGHT_E_INVALID', 'sourceKeyId has an invalid format');
  }
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
  const canonical = canonicalizePayload(Object.freeze({
    rule_id: ruleId,
    result,
    decision_commitment: decisionCommitment,
  }));
  return Object.freeze({
    rule_id: ruleId,
    rule_hash: ruleHash(ruleId),
    result,
    proof_mode: 'commitment',
    evidence_hash: sha256Hex(`${RULE_EVIDENCE_DOMAIN}${canonical}`),
  });
}

function commitDecision({ input, intent, policyResult, intentCommitment, occurredAt }) {
  const reasons = Object.freeze([...policyResult.reasons].sort(asciiCompare));
  const payload = Object.freeze({
    schema_version: WALLET_GUARD_PREFLIGHT_EVIDENCE_SCHEMA_VERSION,
    evidence_id: input.evidenceId,
    run_id: input.runId,
    request_id: intent.request_id,
    agent_ref: input.agentRef.normalize('NFC'),
    subject_ref: input.subjectRef.normalize('NFC'),
    source_key_id: input.sourceKeyId,
    occurred_at: occurredAt,
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

export function createWalletGuardPreflightEvidenceBuilder(rawOptions) {
  const options = captureExactDataRecord(
    rawOptions,
    BOOTSTRAP_KEYS,
    'preflight evidence bootstrap',
  );
  if (typeof options.trustedClock !== 'function') {
    fail('POMRX_WG_PREFLIGHT_E_INVALID', 'trustedClock must be a function');
  }

  const usedEvidenceIds = new Set();
  const usedRunIds = new Set();
  let lastClockSampleMs = null;

  function build(rawInput) {
    const input = captureExactDataRecord(rawInput, BUILD_KEYS, 'preflight evidence input');
    validateMetadata(input);

    if (usedEvidenceIds.has(input.evidenceId)) {
      fail('POMRX_WG_PREFLIGHT_E_REPLAY', 'evidenceId was already used by this builder');
    }
    if (usedRunIds.has(input.runId)) {
      fail('POMRX_WG_PREFLIGHT_E_REPLAY', 'runId was already used by this builder');
    }

    if (!isLocallyNormalizedWalletGuardIntent(input.intent)) {
      fail(
        'POMRX_WG_PREFLIGHT_E_INTENT',
        'preflight evidence requires the exact locally normalized intent object',
      );
    }

    // This call validates and commits a locally branded intent. Do not broadly
    // translate failures here: an unrelated runtime/intrinsic failure is not an
    // intent-validation result and must preserve its original provenance.
    const committedIntent = commitWalletGuardIntent(input.intent);

    let policyResult;
    try {
      // Simulation evidence is deliberately not accepted at this boundary yet.
      // The current reference preflight evaluates the exact policy with not_run.
      policyResult = evaluateWalletGuardPolicy(
        input.intent,
        input.policy,
        Object.freeze({ status: 'not_run' }),
      );
    } catch (error) {
      if (error instanceof WalletGuardPolicyError) {
        fail('POMRX_WG_PREFLIGHT_E_POLICY', 'Wallet Guard policy evaluation failed');
      }
      throw error;
    }

    const clockSample = sampleTrustedClock(options.trustedClock, lastClockSampleMs);
    const occurredAt = clockSample.toISOString();
    const inputCommitment = sha256Hex(
      `${INPUT_COMMIT_DOMAIN}${committedIntent.canonical_intent}`,
    );
    const actionCommitment = committedIntent.intent_commitment;
    const methodHash = commitWalletGuardMethod(input.intent.rpc_method);
    const committedDecision = commitDecision({
      input,
      intent: input.intent,
      policyResult,
      intentCommitment: actionCommitment,
      occurredAt,
    });

    const common = Object.freeze({
      schema_version: WALLET_GUARD_PREFLIGHT_EVIDENCE_SCHEMA_VERSION,
      evidence_id: input.evidenceId,
      run_id: input.runId,
      request_id: input.intent.request_id,
      agent_ref: input.agentRef.normalize('NFC'),
      subject_ref: input.subjectRef.normalize('NFC'),
      source_key_id: input.sourceKeyId,
      occurred_at: occurredAt,
      wallet_guard_decision: policyResult.decision,
      wallet_guard_reasons: committedDecision.reasons,
      decision_commitment: committedDecision.decision_commitment,
      input_commitment: inputCommitment,
      action_commitment: actionCommitment,
      policy_hash: policyResult.policy_hash,
      policy_id: policyResult.policy_id,
      normalized_input_only: true,
      raw_request_proved: false,
      trusted_clock_sampled: true,
      production_trusted_time_proved: false,
      simulation_evidence_proved: false,
      authorization_eligible: false,
      authorization_proved: false,
      reference_only: true,
    });

    let result;
    if (policyResult.decision === 'INDETERMINATE') {
      result = Object.freeze({
        ...common,
        portable_preflight_produced: false,
        pom_rx_receipt: null,
        pom_rx_receipt_hash: null,
      });
    } else {
      const forwardableResult = policyResult.decision === 'ALLOW' ? 'pass' : 'fail';
      const assertions = Object.freeze([
        makeAssertion('wallet-guard-determinate', 'pass', committedDecision.decision_commitment),
        makeAssertion(
          'wallet-guard-forwardable',
          forwardableResult,
          committedDecision.decision_commitment,
        ),
      ]);

      const receipt = Object.freeze({
        schema_version: POM_RX_SCHEMA_VERSION,
        receipt_id: input.evidenceId,
        run_id: input.runId,
        phase: 'preflight',
        outcome: policyResult.decision === 'ALLOW' ? 'allow' : 'deny',
        agent_ref: common.agent_ref,
        subject_ref: common.subject_ref,
        method_hash: methodHash,
        policy_hash: policyResult.policy_hash,
        input_commitment: inputCommitment,
        action_commitment: actionCommitment,
        assertions,
        previous_receipt_hash: null,
        occurred_at: occurredAt,
        source_key_id: input.sourceKeyId,
      });

      // The receipt is entirely constructed by this module. Do not catch all
      // TypeErrors from the shared receipt path: a programming/runtime failure
      // must not be mislabeled as expected preflight rejection.
      const committedReceipt = commitPomRxReceipt(receipt);
      result = Object.freeze({
        ...common,
        portable_preflight_produced: true,
        pom_rx_receipt: deepFreeze(committedReceipt.receipt),
        pom_rx_receipt_hash: committedReceipt.receiptHash,
      });
    }

    usedEvidenceIds.add(input.evidenceId);
    usedRunIds.add(input.runId);
    lastClockSampleMs = clockSample.getTime();
    return result;
  }

  return Object.freeze({ build });
}
