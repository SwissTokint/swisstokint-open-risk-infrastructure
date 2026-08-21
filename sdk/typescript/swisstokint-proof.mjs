import crypto from 'node:crypto';

export const RECEIPT_SCHEMA_VERSION = 'pom-receipt/0.2';
export const BATCH_SCHEMA_VERSION = 'pom-batch/0.1';
export const ANCHOR_RECORD_SCHEMA_VERSION = 'pom-anchor-record/0.1';

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{15,127}$/;
const SOURCE_KEY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const ADAPTER_ID_PATTERN = /^[a-z0-9][a-z0-9._/-]{2,63}$/;
const PAYLOAD_KEY_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/;
const KINDS = new Set(['signal', 'research', 'governance', 'milestone']);
const MAX_DEPTH = 8;
const MAX_STRING_LENGTH = 2_048;
const MAX_CANONICAL_BYTES = 16 * 1024;

// Canonicalization and SHA-256 commitments are shared trust primitives. Capture
// the intrinsics they dispatch through once at module initialization so a later
// same-realm mutation of array classification/sorting, string normalization,
// object enumeration, JSON serialization, byte counting, or the mutable default
// node:crypto createHash export cannot rewrite an already-defined commitment.
// Public canonical form, validation limits and normal-environment digest values
// remain unchanged. Poisoning before module initialization remains outside this
// reference-runtime guarantee.
const CALL = String.prototype.normalize.call.bind(String.prototype.normalize.call);
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_SORT = Array.prototype.sort.call.bind(Array.prototype.sort);
const BUFFER_BYTE_LENGTH = Buffer.byteLength;
const CRYPTO_CREATE_HASH = crypto.createHash;
const JSON_STRINGIFY = JSON.stringify;
const NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const OBJECT_ENTRIES = Object.entries;
const REGEXP_TEST = RegExp.prototype.test.call.bind(RegExp.prototype.test);
const SET_HAS = Set.prototype.has.call.bind(Set.prototype.has);
const STRING_CHAR_CODE_AT = String.prototype.charCodeAt.call.bind(String.prototype.charCodeAt);
const STRING_NORMALIZE_INTRINSIC = String.prototype.normalize;
const STRING_NORMALIZE = STRING_NORMALIZE_INTRINSIC.call.bind(STRING_NORMALIZE_INTRINSIC);
const STRING_TO_LOWER_CASE = String.prototype.toLowerCase.call.bind(String.prototype.toLowerCase);
const HASH_PROBE = CRYPTO_CREATE_HASH('sha256');
const HASH_UPDATE = HASH_PROBE.update.call.bind(HASH_PROBE.update);
const HASH_DIGEST = HASH_PROBE.digest.call.bind(HASH_PROBE.digest);

function arrayIsArray(value) {
  return ARRAY_IS_ARRAY(value);
}

function sortArray(value, compare) {
  return ARRAY_SORT(value, compare);
}

function objectEntries(value) {
  return OBJECT_ENTRIES(value);
}

function normalizeString(value, form) {
  const liveNormalize = String.prototype.normalize;
  if (liveNormalize !== STRING_NORMALIZE_INTRINSIC) {
    // Preserve the established side effects and exact thrown-error provenance
    // of one post-initialization replacement lookup/invocation, but never consume
    // its return value into a commitment. A replacement that returns normally
    // therefore cannot rewrite or collapse the canonical text computed below.
    CALL(liveNormalize, value, form);
  }
  return STRING_NORMALIZE(value, form);
}

function lowercaseString(value) {
  return STRING_TO_LOWER_CASE(value);
}

function charCodeAt(value, index) {
  return STRING_CHAR_CODE_AT(value, index);
}

function jsonStringify(value) {
  return JSON_STRINGIFY(value);
}

function numberIsSafeInteger(value) {
  return NUMBER_IS_SAFE_INTEGER(value);
}

function regexpTest(pattern, value) {
  return REGEXP_TEST(pattern, value);
}

function setHas(set, value) {
  return SET_HAS(set, value);
}

function bufferByteLength(value, encoding) {
  return BUFFER_BYTE_LENGTH(value, encoding);
}

const sensitivePayloadKeys = new Set([
  'apikey',
  'apisecret',
  'accesskey',
  'accesssecret',
  'accesstoken',
  'refreshtoken',
  'password',
  'secret',
  'privatekey',
  'seedphrase',
  'mnemonic',
  'email',
  'phone',
  'walletaddress',
  'balance',
  'accountbalance',
  'accountid',
  'userid',
  'position',
  'positions',
]);

export class ProofPayloadValidationError extends TypeError {
  constructor(code, message) {
    super(message);
    this.name = 'ProofPayloadValidationError';
    this.code = code;
  }
}

function assert(condition, message) {
  if (!condition) throw new TypeError(message);
}

function payloadAssert(condition, code, message) {
  if (!condition) throw new ProofPayloadValidationError(code, message);
}

function normalizedSensitiveKey(key) {
  const normalized = lowercaseString(normalizeString(key, 'NFKC'));
  let safe = '';
  for (let index = 0; index < normalized.length; index += 1) {
    const codeUnit = charCodeAt(normalized, index);
    if ((codeUnit >= 48 && codeUnit <= 57) || (codeUnit >= 97 && codeUnit <= 122)) {
      safe += normalized[index];
    }
  }
  return safe;
}

function validateSafeValue(value, depth = 0, budget = { remaining: 1_000 }) {
  payloadAssert(depth <= MAX_DEPTH, 'PROOF_E_PAYLOAD_DEPTH', 'Payload exceeds the maximum depth');
  payloadAssert(
    budget.remaining-- > 0,
    'PROOF_E_PAYLOAD_NODES',
    'Payload exceeds the maximum node count',
  );

  if (value === null || typeof value === 'boolean') return;

  if (typeof value === 'string') {
    payloadAssert(
      value.length <= MAX_STRING_LENGTH,
      'PROOF_E_PAYLOAD_STRING',
      'Payload string is too long',
    );
    return;
  }

  if (typeof value === 'number') {
    payloadAssert(
      numberIsSafeInteger(value),
      'PROOF_E_PAYLOAD_NUMBER',
      'Payload numbers must be safe integers',
    );
    return;
  }

  if (arrayIsArray(value)) {
    for (const item of value) validateSafeValue(item, depth + 1, budget);
    return;
  }

  payloadAssert(
    value && typeof value === 'object',
    'PROOF_E_PAYLOAD_TYPE',
    'Payload contains an unsupported value',
  );
  for (const [key, nestedValue] of objectEntries(value)) {
    payloadAssert(
      regexpTest(PAYLOAD_KEY_PATTERN, key),
      'PROOF_E_PAYLOAD_KEY',
      `Unsafe payload key: ${key}`,
    );
    payloadAssert(
      !setHas(sensitivePayloadKeys, normalizedSensitiveKey(key)),
      'PROOF_E_PAYLOAD_SENSITIVE_KEY',
      `Sensitive payload key: ${key}`,
    );
    validateSafeValue(nestedValue, depth + 1, budget);
  }
}

function canonicalizeValue(value) {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return jsonStringify(normalizeString(value, 'NFC'));
  if (arrayIsArray(value)) {
    let canonical = '[';
    for (let index = 0; index < value.length; index += 1) {
      if (index !== 0) canonical += ',';
      canonical += canonicalizeValue(value[index]);
    }
    return `${canonical}]`;
  }

  const entries = objectEntries(value);
  sortArray(entries, ([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  let canonical = '{';
  for (let index = 0; index < entries.length; index += 1) {
    if (index !== 0) canonical += ',';
    const [key, nestedValue] = entries[index];
    canonical += `${jsonStringify(key)}:${canonicalizeValue(nestedValue)}`;
  }
  return `${canonical}}`;
}

export function sha256Hex(value) {
  const hash = CRYPTO_CREATE_HASH('sha256');
  HASH_UPDATE(hash, value, 'utf8');
  return HASH_DIGEST(hash, 'hex');
}

export function canonicalizePayload(payload) {
  payloadAssert(
    payload && typeof payload === 'object' && !arrayIsArray(payload),
    'PROOF_E_PAYLOAD_SHAPE',
    'Payload must be a JSON object',
  );
  validateSafeValue(payload);
  const canonical = canonicalizeValue(payload);
  payloadAssert(
    bufferByteLength(canonical, 'utf8') <= MAX_CANONICAL_BYTES,
    'PROOF_E_PAYLOAD_CANONICAL_BYTES',
    'Canonical payload exceeds 16 KiB',
  );
  return canonical;
}

export function commitPayload(payload) {
  const canonicalPayload = canonicalizePayload(payload);
  return {
    canonicalPayload,
    payloadHash: sha256Hex(canonicalPayload),
  };
}

function assertHash(value, field) {
  assert(typeof value === 'string' && HASH_PATTERN.test(value), `${field} must be a lowercase SHA-256 hash`);
}

function assertIdentifier(value, field, pattern = ID_PATTERN) {
  assert(typeof value === 'string' && pattern.test(value), `${field} has an invalid format`);
}

function normalizeOccurredAt(value) {
  const date = new Date(value);
  assert(typeof value === 'string' && Number.isFinite(date.getTime()), 'occurred_at must be an ISO date-time');
  return date.toISOString();
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

export function validateAnchorRecord(record) {
  assert(record && typeof record === 'object' && !Array.isArray(record), 'Anchor record must be an object');
  const expectedKeys = [
    'schema_version',
    'adapter_id',
    'network',
    'batch_ref',
    'merkle_root',
    'transaction_ref',
    'block_ref',
    'anchored_at',
    'observed_at',
    'status',
    'confirmations',
  ];
  assert(
    JSON.stringify(Object.keys(record).sort()) === JSON.stringify([...expectedKeys].sort()),
    'Anchor record has missing or unknown fields',
  );
  assert(record.schema_version === ANCHOR_RECORD_SCHEMA_VERSION, 'Unsupported anchor record schema version');
  assertIdentifier(record.adapter_id, 'adapter_id', ADAPTER_ID_PATTERN);
  assert(
    typeof record.network === 'string'
      && /^[A-Za-z0-9][A-Za-z0-9._:/-]{1,63}$/.test(record.network),
    'network has an invalid format',
  );
  assert(
    typeof record.batch_ref === 'string' && /^pom-[a-f0-9]{24}$/.test(record.batch_ref),
    'batch_ref has an invalid format',
  );
  assertHash(record.merkle_root, 'merkle_root');
  for (const field of ['transaction_ref', 'block_ref']) {
    assert(
      typeof record[field] === 'string'
        && record[field].length >= 1
        && record[field].length <= 256
        && !/[\u0000-\u001f\u007f]/.test(record[field]),
      `${field} has an invalid format`,
    );
  }
  assert(
    ['observed', 'finalized', 'revoked', 'orphaned'].includes(record.status),
    'Unsupported anchor status',
  );
  assert(
    Number.isSafeInteger(record.confirmations)
      && record.confirmations >= 0
      && record.confirmations <= 1_000_000_000,
    'confirmations must be a non-negative safe integer',
  );
  assert(
    record.status !== 'finalized' || record.confirmations >= 1,
    'A finalized anchor requires at least one confirmation',
  );

  const anchoredAt = normalizeDateTime(record.anchored_at, 'anchored_at');
  const observedAt = normalizeDateTime(record.observed_at, 'observed_at');
  assert(observedAt >= anchoredAt, 'observed_at cannot precede anchored_at');

  return {
    ...record,
    network: record.network.normalize('NFC'),
    transaction_ref: record.transaction_ref.normalize('NFC'),
    block_ref: record.block_ref.normalize('NFC'),
    anchored_at: anchoredAt,
    observed_at: observedAt,
  };
}

export function commitAnchorRecord(record) {
  const normalized = validateAnchorRecord(record);
  const canonicalRecord = canonicalizeValue(normalized);
  return {
    record: normalized,
    canonicalRecord,
    recordHash: sha256Hex(`swisstokint:pom-anchor-record:v1:${canonicalRecord}`),
  };
}

export function validateWireReceipt(receipt) {
  assert(receipt && typeof receipt === 'object' && !Array.isArray(receipt), 'Receipt must be an object');
  const expectedKeys = [
    'schema_version',
    'receipt_id',
    'kind',
    'subject_ref',
    'method_hash',
    'risk_policy_hash',
    'payload_hash',
    'occurred_at',
    'nonce',
    'source_key_id',
  ];
  const receivedKeys = Object.keys(receipt).sort();
  assert(JSON.stringify(receivedKeys) === JSON.stringify([...expectedKeys].sort()), 'Receipt has missing or unknown fields');
  assert(receipt.schema_version === RECEIPT_SCHEMA_VERSION, 'Unsupported receipt schema version');
  assertIdentifier(receipt.receipt_id, 'receipt_id');
  assert(KINDS.has(receipt.kind), 'Unsupported receipt kind');
  assert(typeof receipt.subject_ref === 'string' && receipt.subject_ref.trim().length >= 1 && receipt.subject_ref.length <= 128, 'subject_ref has an invalid length');
  assertHash(receipt.method_hash, 'method_hash');
  assertHash(receipt.risk_policy_hash, 'risk_policy_hash');
  assertHash(receipt.payload_hash, 'payload_hash');
  assertIdentifier(receipt.nonce, 'nonce');
  assertIdentifier(receipt.source_key_id, 'source_key_id', SOURCE_KEY_ID_PATTERN);

  return {
    ...receipt,
    subject_ref: receipt.subject_ref.normalize('NFC'),
    occurred_at: normalizeOccurredAt(receipt.occurred_at),
  };
}

export function createWireReceipt(event, defaults = {}) {
  assert(event && typeof event === 'object' && !Array.isArray(event), 'Event must be an object');
  const { payloadHash } = commitPayload(event.payload);
  return validateWireReceipt({
    schema_version: RECEIPT_SCHEMA_VERSION,
    receipt_id: event.receipt_id ?? crypto.randomUUID(),
    kind: event.kind,
    subject_ref: event.subject_ref,
    method_hash: event.method_hash,
    risk_policy_hash: event.risk_policy_hash,
    payload_hash: payloadHash,
    occurred_at: event.occurred_at ?? new Date().toISOString(),
    nonce: event.nonce ?? crypto.randomUUID(),
    source_key_id: event.source_key_id ?? defaults.sourceKeyId ?? 'proof-sdk-v2',
  });
}

export function prepareCommitment(wireReceipt) {
  const receipt = validateWireReceipt(wireReceipt);
  const publicCommitment = {
    version: 2,
    schema_version: RECEIPT_SCHEMA_VERSION,
    receipt_id: receipt.receipt_id,
    kind: receipt.kind,
    subject_ref: receipt.subject_ref,
    method_hash: receipt.method_hash,
    risk_policy_hash: receipt.risk_policy_hash,
    payload_hash: receipt.payload_hash,
    nonce_hash: sha256Hex(receipt.nonce),
    occurred_at: receipt.occurred_at,
    source_key_id: receipt.source_key_id,
  };
  const commitment = canonicalizeValue(publicCommitment);
  return {
    publicCommitment,
    commitment,
    commitmentHash: sha256Hex(commitment),
  };
}

export function signTransport(rawBody, secret, timestamp = Math.floor(Date.now() / 1_000).toString()) {
  assert(typeof rawBody === 'string', 'rawBody must be a string');
  assert(typeof secret === 'string' && secret.length >= 32, 'Transport secret must contain at least 32 characters');
  assert(/^\d{10}$/.test(timestamp), 'Transport timestamp must contain 10 digits');
  return {
    timestamp,
    signature: crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`, 'utf8').digest('hex'),
  };
}

export function verifyStoredReceipt(record) {
  let commitmentHashValid = false;
  let commitmentFieldsValid = false;
  let signatureValid = false;
  try {
    assert(record && typeof record === 'object', 'Stored receipt must be an object');
    assertHash(record.commitment_hash, 'commitment_hash');
    commitmentHashValid = sha256Hex(record.commitment) === record.commitment_hash;
    const parsedCommitment = JSON.parse(record.commitment);
    const comparableFields = [
      'schema_version',
      'receipt_id',
      'kind',
      'subject_ref',
      'method_hash',
      'risk_policy_hash',
      'payload_hash',
      'nonce_hash',
      'occurred_at',
      'source_key_id',
    ];
    commitmentFieldsValid = comparableFields.every((field) => (
      !(field in record) || record[field] === parsedCommitment[field]
    ));
    const publicKey = crypto.createPublicKey({
      key: Buffer.from(record.server_public_key, 'base64'),
      format: 'der',
      type: 'spki',
    });
    assert(publicKey.asymmetricKeyType === 'ed25519', 'Signing key must be Ed25519');
    signatureValid = crypto.verify(
      null,
      Buffer.from(record.commitment, 'utf8'),
      publicKey,
      Buffer.from(record.server_signature, 'base64'),
    );
    return {
      ok: commitmentHashValid && commitmentFieldsValid && signatureValid,
      commitmentHashValid,
      commitmentFieldsValid,
      signatureValid,
    };
  } catch {
    return {
      ok: false,
      commitmentHashValid,
      commitmentFieldsValid,
      signatureValid,
    };
  }
}

export async function submitReceipt(endpoint, wireReceipt, transportSecret, fetchImpl = fetch) {
  const receipt = validateWireReceipt(wireReceipt);
  const body = JSON.stringify(receipt);
  const transport = signTransport(body, transportSecret);
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Proof-Timestamp': transport.timestamp,
      'X-Proof-Signature': transport.signature,
    },
    body,
  });
  const responseBody = await response.json().catch(() => ({ error: 'Invalid JSON response' }));
  if (!response.ok) {
    throw new Error(`Receipt rejected (${response.status}): ${responseBody.error ?? 'unknown error'}`);
  }
  return responseBody;
}

function hashMerkleLeaf(commitmentHash) {
  assertHash(commitmentHash, 'commitment_hash');
  return sha256Hex(`swisstokint:proof-leaf:v1:${commitmentHash}`);
}

function hashMerkleNode(left, right) {
  assertHash(left, 'left node');
  assertHash(right, 'right node');
  return sha256Hex(`swisstokint:proof-node:v1:${left}:${right}`);
}

export function buildMerkleBatch(receipts) {
  assert(Array.isArray(receipts) && receipts.length > 0, 'A batch requires at least one receipt');
  assert(receipts.length <= 10_000, 'A batch cannot exceed 10,000 receipts');

  const ordered = receipts.map((receipt) => {
    assert(receipt && typeof receipt === 'object', 'Batch receipt must be an object');
    const expectedKeys = ['receipt_id', 'commitment_hash', 'occurred_at'];
    assert(
      JSON.stringify(Object.keys(receipt).sort()) === JSON.stringify(expectedKeys.sort()),
      'Batch receipt has missing or unknown fields',
    );
    assertIdentifier(receipt.receipt_id, 'receipt_id');
    assertHash(receipt.commitment_hash, 'commitment_hash');
    return {
      receipt_id: receipt.receipt_id,
      commitment_hash: receipt.commitment_hash,
      occurred_at: normalizeOccurredAt(receipt.occurred_at),
    };
  }).sort((left, right) => (
    left.occurred_at.localeCompare(right.occurred_at)
    || left.receipt_id.localeCompare(right.receipt_id)
  ));

  assert(new Set(ordered.map((receipt) => receipt.receipt_id)).size === ordered.length, 'Duplicate receipt_id in batch');
  assert(new Set(ordered.map((receipt) => receipt.commitment_hash)).size === ordered.length, 'Duplicate commitment_hash in batch');

  const leafHashes = ordered.map((receipt) => hashMerkleLeaf(receipt.commitment_hash));
  const proofs = ordered.map(() => []);
  let level = leafHashes.map((hash, index) => ({ hash, descendants: [index] }));

  while (level.length > 1) {
    const next = [];
    for (let index = 0; index < level.length; index += 2) {
      const left = level[index];
      const right = level[index + 1] ?? left;

      for (const descendant of left.descendants) {
        proofs[descendant].push({ position: 'right', hash: right.hash });
      }
      if (right !== left) {
        for (const descendant of right.descendants) {
          proofs[descendant].push({ position: 'left', hash: left.hash });
        }
      }

      next.push({
        hash: hashMerkleNode(left.hash, right.hash),
        descendants: right === left
          ? [...left.descendants]
          : [...left.descendants, ...right.descendants],
      });
    }
    level = next;
  }

  const merkleRoot = level[0].hash;
  return {
    schema_version: BATCH_SCHEMA_VERSION,
    tree_algorithm: 'sha256-domain-separated-duplicate-last',
    ordering: 'occurred_at-asc,receipt_id-asc',
    batch_ref: `pom-${merkleRoot.slice(0, 24)}`,
    leaf_count: ordered.length,
    merkle_root: merkleRoot,
    leaves: ordered.map((receipt, index) => ({
      ...receipt,
      leaf_index: index,
      leaf_hash: leafHashes[index],
      proof: proofs[index],
    })),
  };
}

export function verifyMerkleProof(commitmentHash, proof, merkleRoot) {
  try {
    assertHash(commitmentHash, 'commitment_hash');
    assertHash(merkleRoot, 'merkle_root');
    assert(Array.isArray(proof) && proof.length <= 32, 'Invalid Merkle proof');
    let current = hashMerkleLeaf(commitmentHash);
    for (const step of proof) {
      assert(step && (step.position === 'left' || step.position === 'right'), 'Invalid Merkle proof position');
      assertHash(step.hash, 'proof hash');
      current = step.position === 'left'
        ? hashMerkleNode(step.hash, current)
        : hashMerkleNode(current, step.hash);
    }
    return current === merkleRoot;
  } catch {
    return false;
  }
}
