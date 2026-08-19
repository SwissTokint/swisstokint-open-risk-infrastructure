import { createHash } from 'node:crypto';

import { throwPomRxV01Strict } from '../../sdk/typescript/internal/pom-rx-v01-diagnostics.mjs';

export const POM_RX_V01_STRICT_INVARIANTS = Object.freeze([
  'POMRX_V01_I_ACTION_CONTINUITY',
  'POMRX_V01_I_INPUT_CONTINUITY',
  'POMRX_V01_I_EXECUTION_ASSERTION_CONSISTENCY',
  'POMRX_V01_I_RECONCILIATION_ASSERTION_CONSISTENCY',
  'POMRX_V01_I_RECEIPT_ID_UNIQUENESS',
]);
const MAX_SOURCE_ENTRY_BYTES = 1024 * 1024;
const MAX_SOURCE_CLOSURE_BYTES = 4 * 1024 * 1024;

function uint64(value) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(value));
  return buffer;
}

function compareUnicodeScalars(left, right) {
  const a = Array.from(left, (character) => character.codePointAt(0));
  const b = Array.from(right, (character) => character.codePointAt(0));
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
}

function computeSourceClosureSha256(sourceClosure) {
  if (!Array.isArray(sourceClosure) || sourceClosure.length === 0) {
    throwPomRxV01Strict('POMRX_V01_E_INTERNAL_VERIFIER_ERROR', 'Readiness source closure must be non-empty');
  }
  let closureBytes = 0;
  const normalized = sourceClosure.map((entry) => {
    if (!entry || Object.keys(entry).sort().join(',') !== 'bytes,path'
      || typeof entry.path !== 'string' || entry.path.length === 0
      || entry.path.startsWith('/') || entry.path.startsWith('//') || /^[A-Za-z]:/u.test(entry.path)
      || /[\\\u0000-\u001f\u007f]/u.test(entry.path)
      || entry.path !== entry.path.normalize('NFC')
      || entry.path.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')) {
      throwPomRxV01Strict('POMRX_V01_E_INTERNAL_VERIFIER_ERROR', 'Readiness source closure entry is invalid');
    }
    const byteLength = ArrayBuffer.isView(entry.bytes)
      ? entry.bytes.byteLength
      : entry.bytes instanceof ArrayBuffer ? entry.bytes.byteLength : -1;
    if (!Number.isSafeInteger(byteLength) || byteLength < 0 || byteLength > MAX_SOURCE_ENTRY_BYTES
      || closureBytes + byteLength > MAX_SOURCE_CLOSURE_BYTES) {
      throwPomRxV01Strict('POMRX_V01_E_INTERNAL_VERIFIER_ERROR', 'Readiness source closure bytes exceed the test-only limit');
    }
    closureBytes += byteLength;
    const bytes = Buffer.from(entry.bytes);
    return { path: entry.path, bytes };
  }).sort((left, right) => compareUnicodeScalars(left.path, right.path));
  if (new Set(normalized.map(({ path: entryPath }) => entryPath)).size !== normalized.length) {
    throwPomRxV01Strict('POMRX_V01_E_INTERNAL_VERIFIER_ERROR', 'Readiness source closure paths must be unique');
  }

  const hash = createHash('sha256');
  hash.update('pom-rx-internal-readiness-source/1\n', 'ascii');
  for (const entry of normalized) {
    const pathBytes = Buffer.from(entry.path, 'utf8');
    hash.update(uint64(pathBytes.length));
    hash.update(pathBytes);
    hash.update(uint64(entry.bytes.length));
    hash.update(entry.bytes);
  }
  return hash.digest('hex');
}

export function createPomRxV01ProfileReadiness({ sourceClosure, implementedInvariants }) {
  if (!Array.isArray(implementedInvariants)
    || new Set(implementedInvariants).size !== implementedInvariants.length
    || implementedInvariants.some((identifier) => !POM_RX_V01_STRICT_INVARIANTS.includes(identifier))) {
    throwPomRxV01Strict('POMRX_V01_E_INTERNAL_VERIFIER_ERROR', 'Implemented invariant list is invalid');
  }
  const implemented = POM_RX_V01_STRICT_INVARIANTS.filter((identifier) => implementedInvariants.includes(identifier));
  const missing = POM_RX_V01_STRICT_INVARIANTS.filter((identifier) => !implementedInvariants.includes(identifier));
  if (missing.length === 0) {
    throwPomRxV01Strict(
      'POMRX_V01_E_INTERNAL_VERIFIER_ERROR',
      'The test-only readiness harness cannot represent an activated strict profile',
    );
  }

  return Object.freeze({
    test_result_schema_version: 'pom-rx-internal-readiness-test/1',
    test_build_id: `test-only/${computeSourceClosureSha256(sourceClosure)}`,
    implemented_invariants: Object.freeze(implemented),
    missing_invariants: Object.freeze(missing),
    structural_status: 'indeterminate',
    structural_prerequisite_satisfied: false,
    authorization_eligible: false,
    authorization_proved: false,
    diagnostic_code: 'POMRX_V01_E_PROFILE_INCOMPLETE',
  });
}
