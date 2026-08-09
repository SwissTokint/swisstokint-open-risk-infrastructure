import {
  canonicalizePayload,
  sha256Hex,
} from './swisstokint-proof.mjs';

export const POM_RX_SCHEMA_VERSION = 'pom-rx/0.1';

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{15,127}$/;
const RULE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const SOURCE_KEY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const PHASES = ['preflight', 'execution', 'reconciliation'];
const PHASE_OUTCOMES = {
  preflight: new Set(['allow', 'deny']),
  execution: new Set(['accepted', 'rejected', 'unresolved']),
  reconciliation: new Set(['matched', 'mismatched', 'unresolved']),
};
const PROOF_MODES = new Set(['commitment', 'public', 'zk']);
const ASSERTION_RESULTS = new Set(['pass', 'fail', 'not_evaluated']);

function assert(condition, message) {
  if (!condition) throw new TypeError(message);
}

function assertExactKeys(record, expected, label) {
  assert(record && typeof record === 'object' && !Array.isArray(record), `${label} must be an object`);
  assert(
    JSON.stringify(Object.keys(record).sort()) === JSON.stringify([...expected].sort()),
    `${label} has missing or unknown fields`,
  );
}

function assertHash(value, field) {
  assert(typeof value === 'string' && HASH_PATTERN.test(value), `${field} must be a lowercase SHA-256 hash`);
}

function assertIdentifier(value, field, pattern = ID_PATTERN) {
  assert(typeof value === 'string' && pattern.test(value), `${field} has an invalid format`);
}

function normalizeDateTime(value, field) {
  assert(
    typeof value === 'string' && /(Z|[+-]\d{2}:\d{2})$/.test(value),
    `${field} must include an offset`,
  );
  const date = new Date(value);
  assert(Number.isFinite(date.getTime()), `${field} must be an ISO date-time`);
  return date.toISOString();
}

function validateAssertion(assertion) {
  assertExactKeys(
    assertion,
    ['rule_id', 'rule_hash', 'result', 'proof_mode', 'evidence_hash'],
    'Risk assertion',
  );
  assertIdentifier(assertion.rule_id, 'rule_id', RULE_ID_PATTERN);
  assertHash(assertion.rule_hash, 'rule_hash');
  assert(ASSERTION_RESULTS.has(assertion.result), 'Unsupported assertion result');
  assert(PROOF_MODES.has(assertion.proof_mode), 'Unsupported proof_mode');
  assertHash(assertion.evidence_hash, 'evidence_hash');
  return { ...assertion };
}

export function validatePomRxReceipt(receipt) {
  assertExactKeys(
    receipt,
    [
      'schema_version',
      'receipt_id',
      'run_id',
      'phase',
      'outcome',
      'agent_ref',
      'subject_ref',
      'method_hash',
      'policy_hash',
      'input_commitment',
      'action_commitment',
      'assertions',
      'previous_receipt_hash',
      'occurred_at',
      'source_key_id',
    ],
    'POM-RX receipt',
  );

  assert(receipt.schema_version === POM_RX_SCHEMA_VERSION, 'Unsupported POM-RX schema version');
  assertIdentifier(receipt.receipt_id, 'receipt_id');
  assertIdentifier(receipt.run_id, 'run_id');
  assert(PHASES.includes(receipt.phase), 'Unsupported POM-RX phase');
  assert(PHASE_OUTCOMES[receipt.phase].has(receipt.outcome), 'Outcome is invalid for this POM-RX phase');

  for (const field of ['agent_ref', 'subject_ref']) {
    assert(
      typeof receipt[field] === 'string'
        && receipt[field].trim().length >= 1
        && receipt[field].length <= 256
        && !/[\u0000-\u001f\u007f]/.test(receipt[field]),
      `${field} has an invalid format`,
    );
  }

  for (const field of ['method_hash', 'policy_hash', 'input_commitment', 'action_commitment']) {
    assertHash(receipt[field], field);
  }

  assert(
    Array.isArray(receipt.assertions) && receipt.assertions.length >= 1 && receipt.assertions.length <= 64,
    'assertions must contain between 1 and 64 entries',
  );
  const assertions = receipt.assertions.map(validateAssertion);
  assert(
    new Set(assertions.map(({ rule_id: ruleId }) => ruleId)).size === assertions.length,
    'assertions cannot repeat a rule_id',
  );
  assertions.sort((left, right) => left.rule_id.localeCompare(right.rule_id));

  if (receipt.phase === 'preflight') {
    assert(receipt.previous_receipt_hash === null, 'A preflight receipt cannot have a previous receipt');
    if (receipt.outcome === 'allow') {
      assert(assertions.every(({ result }) => result === 'pass'), 'An allow preflight requires every assertion to pass');
    } else {
      assert(assertions.some(({ result }) => result === 'fail'), 'A deny preflight requires at least one failed assertion');
    }
  } else {
    assertHash(receipt.previous_receipt_hash, 'previous_receipt_hash');
  }

  assertIdentifier(receipt.source_key_id, 'source_key_id', SOURCE_KEY_ID_PATTERN);

  return {
    ...receipt,
    agent_ref: receipt.agent_ref.normalize('NFC'),
    subject_ref: receipt.subject_ref.normalize('NFC'),
    assertions,
    occurred_at: normalizeDateTime(receipt.occurred_at, 'occurred_at'),
  };
}

export function commitPomRxReceipt(receipt) {
  const normalized = validatePomRxReceipt(receipt);
  const canonicalReceipt = canonicalizePayload(normalized);
  return {
    receipt: normalized,
    canonicalReceipt,
    receiptHash: sha256Hex(`swisstokint:pom-rx:v1:${canonicalReceipt}`),
  };
}

function assertPomRxChain(receipts, allowPartial) {
  assert(Array.isArray(receipts) && receipts.length >= 1, 'A POM-RX chain requires at least one receipt');
  assert(receipts.length <= PHASES.length, 'A POM-RX chain cannot exceed three receipts');

  const committed = receipts.map(commitPomRxReceipt);
  const [first] = committed;
  assert(first.receipt.phase === 'preflight', 'A POM-RX chain must start with preflight');

  const sharedFields = ['run_id', 'agent_ref', 'subject_ref', 'method_hash', 'policy_hash'];
  for (let index = 1; index < committed.length; index += 1) {
    const previous = committed[index - 1];
    const current = committed[index];
    assert(
      PHASES.indexOf(current.receipt.phase) === PHASES.indexOf(previous.receipt.phase) + 1,
      'POM-RX phases must be contiguous and ordered',
    );
    assert(
      current.receipt.previous_receipt_hash === previous.receiptHash,
      'POM-RX previous_receipt_hash does not match',
    );
    assert(
      current.receipt.occurred_at >= previous.receipt.occurred_at,
      'POM-RX receipt time cannot move backwards',
    );
    for (const field of sharedFields) {
      assert(current.receipt[field] === first.receipt[field], `${field} changed within the POM-RX chain`);
    }
  }

  if (first.receipt.outcome === 'deny') {
    assert(committed.length === 1, 'A denied preflight cannot be followed by execution');
    return committed;
  }

  if (!allowPartial) {
    assert(committed.length >= 2, 'An allowed preflight requires an execution receipt');
  }

  const execution = committed.find(({ receipt }) => receipt.phase === 'execution');
  const reconciliation = committed.find(({ receipt }) => receipt.phase === 'reconciliation');
  if (execution?.receipt.outcome === 'accepted' && !allowPartial) {
    assert(reconciliation, 'An accepted execution requires reconciliation');
  }
  if (execution?.receipt.outcome === 'rejected') {
    assert(!reconciliation, 'A rejected execution cannot be marked as reconciled');
  }

  return committed;
}

export function verifyPomRxChain(receipts, { allowPartial = false } = {}) {
  try {
    const committed = assertPomRxChain(receipts, allowPartial);
    const last = committed.at(-1).receipt;
    return {
      ok: true,
      status: `${last.phase}:${last.outcome}`,
      receipt_hashes: committed.map(({ receiptHash }) => receiptHash),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown POM-RX verification error',
      receipt_hashes: [],
    };
  }
}
