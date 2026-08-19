export class PomRxV01StrictError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'PomRxV01StrictError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

export const PROFILE_LIMITATIONS = Object.freeze([
  'POMRX_V01_L_OPAQUE_COMMITMENT_CONTENT_UNPROVED',
  'POMRX_V01_L_NATIVE_EXECUTION_UNPROVED',
  'POMRX_V01_L_CROSS_CHAIN_REPLAY_UNPROVED',
  'POMRX_V01_L_SIGNED_WITNESS_UNPROVED',
  'POMRX_V01_L_GATE_AUTHORIZATION_UNPROVED',
  'POMRX_V01_L_MALICIOUS_LOCAL_RUNTIME_UNPROVED',
]);

const ERROR_CODES = new Set([
  'POMRX_V01_E_PROFILE_REQUIRED',
  'POMRX_V01_E_PROFILE_UNSUPPORTED',
  'POMRX_V01_E_DOWNGRADE_FORBIDDEN',
  'POMRX_V01_E_POLICY_CAPABILITY_REQUIRED',
  'POMRX_V01_E_POLICY_CAPABILITY_STALE',
  'POMRX_V01_E_POLICY_INVALID',
  'POMRX_V01_E_POLICY_TIME_UNAVAILABLE',
  'POMRX_V01_E_ARTIFACT_MANIFEST_INVALID',
  'POMRX_V01_E_VERIFIER_NOT_ALLOWED',
  'POMRX_V01_E_VERIFIER_WITHDRAWN',
  'POMRX_V01_E_IMPLEMENTATION_ARTIFACT_MISMATCH',
  'POMRX_V01_E_RUNTIME_ENVIRONMENT_UNSUPPORTED',
  'POMRX_V01_E_SCHEMA_INVALID',
  'POMRX_V01_E_CANONICALIZATION_FAILED',
  'POMRX_V01_E_RECEIPT_HASH_LINK_INVALID',
  'POMRX_V01_E_CHAIN_PHASE_INVALID',
  'POMRX_V01_E_CHAIN_TIMESTAMP_INVALID',
  'POMRX_V01_E_CHAIN_SHARED_FIELD_CHANGED',
  'POMRX_V01_E_PARTIAL_CHAIN_FORBIDDEN',
  'POMRX_V01_E_ACTION_CONTINUITY',
  'POMRX_V01_E_INPUT_CONTINUITY',
  'POMRX_V01_E_EXECUTION_ASSERTION_CONFLICT',
  'POMRX_V01_E_RECONCILIATION_ASSERTION_CONFLICT',
  'POMRX_V01_E_DUPLICATE_RECEIPT_ID',
  'POMRX_V01_E_PROFILE_INCOMPLETE',
  'POMRX_V01_E_INTERNAL_VERIFIER_ERROR',
]);

const WARNING_CODES = new Set(['POMRX_V01_W_LEGACY_NON_AUTHORIZING']);
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/u;
const MAX_DIAGNOSTIC_FIELD_LENGTH = 256;
const MAX_DIAGNOSTIC_MESSAGE_LENGTH = 2048;
const PHASE_ORDER = new Map([['preflight', 0], ['execution', 1], ['reconciliation', 2]]);
const DEFECT_CODE_MAP = new Map([
  ['POMRX-001-ACTION-PREFLIGHT-EXECUTION', 'POMRX_V01_E_ACTION_CONTINUITY'],
  ['POMRX-001-ACTION-EXECUTION-RECONCILIATION', 'POMRX_V01_E_ACTION_CONTINUITY'],
  ['POMRX-001-INPUT-PREFLIGHT-EXECUTION', 'POMRX_V01_E_INPUT_CONTINUITY'],
  ['POMRX-001-INPUT-EXECUTION-RECONCILIATION', 'POMRX_V01_E_INPUT_CONTINUITY'],
  ['POMRX-006-EXECUTION-FAIL-ASSERTION', 'POMRX_V01_E_EXECUTION_ASSERTION_CONFLICT'],
  ['POMRX-006-RECONCILIATION-FAIL-ASSERTION', 'POMRX_V01_E_RECONCILIATION_ASSERTION_CONFLICT'],
  ['POMRX-007-DUPLICATE-RECEIPT-ID', 'POMRX_V01_E_DUPLICATE_RECEIPT_ID'],
]);

function fail(message, details = {}) {
  throw new PomRxV01StrictError('POMRX_V01_E_INTERNAL_VERIFIER_ERROR', message, details);
}

function compareUnicodeScalars(left, right) {
  const a = Array.from(left, (character) => character.codePointAt(0));
  const b = Array.from(right, (character) => character.codePointAt(0));
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
}

function compareNullable(left, right, comparator) {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return comparator(left, right);
}

export function makePomRxV01Diagnostic({
  defectId = null,
  diagnosticCode,
  severity = ERROR_CODES.has(diagnosticCode) ? 'error' : 'warning',
  phase = null,
  receiptIndex = null,
  field = null,
  message,
}) {
  if (!ERROR_CODES.has(diagnosticCode) && !WARNING_CODES.has(diagnosticCode)) {
    fail('Unknown POM-RX v0.1 strict diagnostic code', { diagnosticCode });
  }
  if (!['error', 'warning'].includes(severity)
    || (severity === 'error' && !ERROR_CODES.has(diagnosticCode))
    || (severity === 'warning' && !WARNING_CODES.has(diagnosticCode))) {
    fail('Diagnostic severity does not match its registry class', { diagnosticCode, severity });
  }
  if (defectId !== null && (typeof defectId !== 'string' || !/^POMRX-\d{3}-[A-Z0-9-]+$/u.test(defectId))) {
    fail('Diagnostic defect_id is invalid', { defectId });
  }
  if (defectId !== null && DEFECT_CODE_MAP.get(defectId) !== diagnosticCode) {
    fail('Diagnostic defect_id and code do not match the stable registry', { defectId, diagnosticCode });
  }
  if (phase !== null && !PHASE_ORDER.has(phase)) fail('Diagnostic phase is invalid', { phase });
  if (receiptIndex !== null && (!Number.isSafeInteger(receiptIndex) || receiptIndex < 0)) {
    fail('Diagnostic receipt_index is invalid', { receiptIndex });
  }
  if (field !== null && (typeof field !== 'string' || field.length === 0
    || field.length > MAX_DIAGNOSTIC_FIELD_LENGTH || CONTROL_CHARACTERS.test(field))) {
    fail('Diagnostic field is invalid', { field });
  }
  if (typeof message !== 'string' || message.length === 0
    || message.length > MAX_DIAGNOSTIC_MESSAGE_LENGTH || CONTROL_CHARACTERS.test(message)) {
    fail('Diagnostic message is invalid');
  }

  return Object.freeze({
    defect_id: defectId,
    diagnostic_code: diagnosticCode,
    severity,
    phase,
    receipt_index: receiptIndex,
    field,
    message,
  });
}

export function orderPomRxV01Diagnostics(diagnostics) {
  if (!Array.isArray(diagnostics)) fail('Diagnostics must be an array');
  const normalized = diagnostics.map((diagnostic) => makePomRxV01Diagnostic({
    defectId: diagnostic.defect_id,
    diagnosticCode: diagnostic.diagnostic_code,
    severity: diagnostic.severity,
    phase: diagnostic.phase,
    receiptIndex: diagnostic.receipt_index,
    field: diagnostic.field,
    message: diagnostic.message,
  }));
  normalized.sort((left, right) => {
    const byPhase = compareNullable(left.phase, right.phase, (a, b) => PHASE_ORDER.get(a) - PHASE_ORDER.get(b));
    if (byPhase !== 0) return byPhase;
    const byIndex = compareNullable(left.receipt_index, right.receipt_index, (a, b) => a - b);
    if (byIndex !== 0) return byIndex;
    const byCode = compareUnicodeScalars(left.diagnostic_code, right.diagnostic_code);
    if (byCode !== 0) return byCode;
    const byField = compareNullable(left.field, right.field, compareUnicodeScalars);
    if (byField !== 0) return byField;
    return compareNullable(left.defect_id, right.defect_id, compareUnicodeScalars);
  });

  const seen = new Set();
  return Object.freeze(normalized.filter((diagnostic) => {
    const identity = JSON.stringify([
      diagnostic.phase,
      diagnostic.receipt_index,
      diagnostic.diagnostic_code,
      diagnostic.field,
      diagnostic.defect_id,
    ]);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  }));
}

export function throwPomRxV01Strict(code, message, details = {}) {
  if (!ERROR_CODES.has(code)) fail('Attempted to throw an unregistered strict error', { code });
  throw new PomRxV01StrictError(code, message, details);
}

export function isPomRxV01DiagnosticCode(code) {
  return ERROR_CODES.has(code) || WARNING_CODES.has(code);
}
