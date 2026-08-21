import { types as utilTypes } from 'node:util';

import {
  canonicalizePayload,
  sha256Hex,
} from '../../../sdk/typescript/swisstokint-proof.mjs';
import {
  captureReferencePlainDataOutcome,
} from '../../../core/reference-data/plain-data-snapshot.mjs';
import {
  commitWalletGuardIntent,
  isLocallyNormalizedWalletGuardIntent,
  normalizeWalletGuardIntentForReplay,
} from './intent.mjs';

export const WALLET_GUARD_SIMULATION_SCHEMA_VERSION =
  'wallet_guard_simulation/0.1';
export const WALLET_GUARD_SIMULATION_COMMIT_DOMAIN =
  'swisstokint:pom-rx-wallet-guard-simulation:v1:';
export const WALLET_GUARD_SIMULATION_REQUEST_COMMIT_DOMAIN =
  'swisstokint:pom-rx-wallet-guard-simulation-request:v1:';

const TYPED_DATA_JSON_COMMIT_DOMAIN =
  'swisstokint:pom-rx-wallet-guard-simulation-typed-data-json-utf16:v2:';
const TYPED_DATA_JSON_COMMITMENT_SCHEMA =
  'wallet_guard_typed_data_json_commitment/0.2';
const TYPED_DATA_OBJECT_COMMIT_DOMAIN =
  'swisstokint:pom-rx-wallet-guard-simulation-typed-data-object-exact:v2:';
const TYPED_DATA_OBJECT_COMMITMENT_SCHEMA =
  'wallet_guard_typed_data_object_commitment/0.2';
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const CALLBACK_STATUSES = new Set(['pass', 'fail', 'unavailable']);
const EVIDENCE_STATUSES = new Set(['pass', 'fail', 'unavailable', 'mismatch']);
const RUN_KEYS = Object.freeze(['intent', 'request']);
const REQUEST_KEYS = Object.freeze(['method', 'params']);
const BOOTSTRAP_KEYS = Object.freeze(['simulateRequest']);
const CALLBACK_RESULT_KEYS = Object.freeze([
  'status',
  'request_id',
  'request_commitment',
  'intent_commitment',
  'origin',
  'chain_id',
  'account',
  'state_commitment',
  'effect_commitment',
]);
const EVIDENCE_KEYS = Object.freeze([
  'schema_version',
  'request_id',
  'request_commitment',
  'intent_commitment',
  'origin',
  'chain_id',
  'account',
  'status',
  'state_commitment',
  'effect_commitment',
  'simulation_commitment',
  'reference_only',
  'simulator_callback_trusted_bootstrap_assumed',
  'simulator_truth_proved',
  'external_state_proved',
  'external_effect_proved',
  'simulation_to_forwarding_bound',
  'simulator_callback_return_channel_proved',
]);
const HEX_NIBBLES = '0123456789abcdef';

// Provenance, status registries, object freezing, exact-text hashing, exact
// request-wrapper reflection and hash validation are load-bearing security
// state. Capture their intrinsics once so later same-realm prototype/global
// mutation cannot forge local evidence, substitute its originating intent,
// widen status vocabulary, make minted evidence mutable, collapse distinct
// UTF-16 request text through UTF-8 replacement, collapse exact -0 request
// identity, alter exact typed-data array classification/key ordering, bypass the
// non-Proxy/plain/dense wrapper boundary, or inject failures into the hash-shape
// decision itself. As elsewhere in the reference runtime, poisoning before
// module initialization remains outside this scoped guarantee.
const REFLECT_APPLY = Reflect.apply;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PROTOTYPE = Array.prototype;
const ARRAY_SORT = Array.prototype.sort;
const OBJECT_CREATE = Object.create;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_IS = Object.is;
const OBJECT_PROTOTYPE = Object.prototype;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_GET_OWN_PROPERTY_NAMES = Object.getOwnPropertyNames;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_OWN_PROPERTY_SYMBOLS = Object.getOwnPropertySymbols;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const REGEXP_TEST = RegExp.prototype.test;
const STRING_CHAR_CODE_AT = String.prototype.charCodeAt;
const SET_HAS = Set.prototype.has;
const UTIL_TYPES_IS_PROXY = utilTypes.isProxy;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const WEAK_MAP_SET = WeakMap.prototype.set;
const WEAK_MAP_GET = WeakMap.prototype.get;

function arrayIsArray(value) {
  return REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value]);
}

function sortArray(array, compare) {
  return REFLECT_APPLY(ARRAY_SORT, array, [compare]);
}

function createObject(prototype) {
  return REFLECT_APPLY(OBJECT_CREATE, Object, [prototype]);
}

function freezeValue(value) {
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function objectIs(left, right) {
  return REFLECT_APPLY(OBJECT_IS, Object, [left, right]);
}

function objectHasOwn(value, key) {
  return REFLECT_APPLY(OBJECT_HAS_OWN, Object, [value, key]);
}

function objectGetOwnPropertyDescriptor(value, key) {
  return REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [value, key]);
}

function objectGetOwnPropertyNames(value) {
  return REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_NAMES, Object, [value]);
}

function objectGetOwnPropertyDescriptors(value) {
  return REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
}

function objectGetOwnPropertySymbols(value) {
  return REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_SYMBOLS, Object, [value]);
}

function objectGetPrototypeOf(value) {
  return REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]);
}

function isProxy(value) {
  return REFLECT_APPLY(UTIL_TYPES_IS_PROXY, utilTypes, [value]);
}

function deepFreezeCapturedPlainData(value) {
  if (!value || typeof value !== 'object') return value;

  // Values reaching this helper have already crossed the bounded shared plain-
  // data capture boundary, so the graph is acyclic, data-only and limited to at
  // most 1,000 nodes/depth 8. The shared helper currently freezes with the live
  // global intrinsic; re-walk the captured copy and apply our module-saved
  // intrinsic to every nested object before any asynchronous simulator callback
  // can observe it.
  const descriptors = objectGetOwnPropertyDescriptors(value);
  for (const key of objectGetOwnPropertyNames(value)) {
    const descriptor = descriptors[key];
    if (descriptor && objectHasOwn(descriptor, 'value')) {
      deepFreezeCapturedPlainData(descriptor.value);
    }
  }
  return freezeValue(value);
}

function regexpTest(pattern, value) {
  return REFLECT_APPLY(REGEXP_TEST, pattern, [value]);
}

function setHas(set, value) {
  return REFLECT_APPLY(SET_HAS, set, [value]);
}

function weakSetAdd(set, value) {
  REFLECT_APPLY(WEAK_SET_ADD, set, [value]);
}

function weakSetHas(set, value) {
  return REFLECT_APPLY(WEAK_SET_HAS, set, [value]);
}

function weakMapSet(map, key, value) {
  REFLECT_APPLY(WEAK_MAP_SET, map, [key, value]);
}

function weakMapGet(map, key) {
  return REFLECT_APPLY(WEAK_MAP_GET, map, [key]);
}

function utf16CodeUnitTranscript(value) {
  let transcript = `${value.length}:`;
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = REFLECT_APPLY(STRING_CHAR_CODE_AT, value, [index]);
    transcript += HEX_NIBBLES[(codeUnit >>> 12) & 0x0f];
    transcript += HEX_NIBBLES[(codeUnit >>> 8) & 0x0f];
    transcript += HEX_NIBBLES[(codeUnit >>> 4) & 0x0f];
    transcript += HEX_NIBBLES[codeUnit & 0x0f];
  }
  return transcript;
}

function exactPlainDataTranscript(value) {
  if (value === null) return 'null;';
  if (typeof value === 'boolean') return value ? 'bool:1;' : 'bool:0;';
  if (typeof value === 'number') {
    return objectIs(value, -0) ? 'int:-0;' : `int:${value};`;
  }
  if (typeof value === 'string') {
    return `str:${utf16CodeUnitTranscript(value)};`;
  }
  if (arrayIsArray(value)) {
    let transcript = `array:${value.length}:[`;
    for (let index = 0; index < value.length; index += 1) {
      transcript += exactPlainDataTranscript(value[index]);
    }
    return `${transcript}];`;
  }

  // This helper is reached only after the typed-data value has crossed the
  // shared inert plain-data capture boundary and the proof canonicalizer has
  // validated the same object. Sorting object names removes irrelevant property
  // insertion order while string values retain their exact UTF-16 code units.
  const keys = objectGetOwnPropertyNames(value);
  sortArray(keys, asciiCompare);
  let transcript = `object:${keys.length}:{`;
  for (const key of keys) {
    transcript += `key:${utf16CodeUnitTranscript(key)};`;
    transcript += exactPlainDataTranscript(value[key]);
  }
  return `${transcript}};`;
}

export class WalletGuardSimulationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WalletGuardSimulationError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new WalletGuardSimulationError(code, message);
}

function asciiCompare(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function sortedExactNamesMatch(actualNames, expectedKeys, includeArrayLength = false) {
  const expectedLength = expectedKeys.length + (includeArrayLength ? 1 : 0);
  if (actualNames.length !== expectedLength) return false;

  const expectedNames = [];
  let offset = 0;
  if (includeArrayLength) {
    expectedNames[0] = 'length';
    offset = 1;
  }
  for (let index = 0; index < expectedKeys.length; index += 1) {
    expectedNames[index + offset] = expectedKeys[index];
  }

  sortArray(actualNames, asciiCompare);
  sortArray(expectedNames, asciiCompare);
  for (let index = 0; index < expectedNames.length; index += 1) {
    if (actualNames[index] !== expectedNames[index]) return false;
  }
  return true;
}

function isOwnEnumerableDataDescriptor(descriptor) {
  return Boolean(descriptor)
    && objectHasOwn(descriptor, 'value')
    && objectHasOwn(descriptor, 'enumerable')
    && descriptor.enumerable === true
    && !objectHasOwn(descriptor, 'get')
    && !objectHasOwn(descriptor, 'set');
}

function captureExactDataRecord(value, expectedKeys, label, code) {
  if (!value
      || typeof value !== 'object'
      || isProxy(value)
      || arrayIsArray(value)) {
    fail(code, `${label} must be a non-Proxy plain object`);
  }
  const prototype = objectGetPrototypeOf(value);
  if (prototype !== OBJECT_PROTOTYPE && prototype !== null) {
    fail(code, `${label} must use Object.prototype or a null prototype`);
  }
  if (objectGetOwnPropertySymbols(value).length !== 0) {
    fail(code, `${label} cannot contain symbol keys`);
  }

  const actual = objectGetOwnPropertyNames(value);
  if (!sortedExactNamesMatch(actual, expectedKeys)) {
    fail(code, `${label} has missing, hidden or unknown fields`);
  }

  const descriptors = objectGetOwnPropertyDescriptors(value);
  const snapshot = createObject(null);
  for (const key of expectedKeys) {
    const descriptor = descriptors[key];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail(code, `${label}.${key} must be an enumerable data property`);
    }
    snapshot[key] = descriptor.value;
  }
  return freezeValue(snapshot);
}

function hasOwnEnumerableTypedDataMethod(value) {
  if (!value
      || typeof value !== 'object'
      || isProxy(value)
      || arrayIsArray(value)) {
    return false;
  }
  const descriptor = objectGetOwnPropertyDescriptor(value, 'method');
  return isOwnEnumerableDataDescriptor(descriptor)
    && descriptor.value === 'eth_signTypedData_v4';
}

function captureExactDenseArray(value, expectedLength, label, code) {
  if (!value
      || typeof value !== 'object'
      || isProxy(value)
      || !arrayIsArray(value)) {
    fail(code, `${label} must be a non-Proxy array`);
  }
  if (objectGetPrototypeOf(value) !== ARRAY_PROTOTYPE) {
    fail(code, `${label} must use Array.prototype`);
  }
  if (objectGetOwnPropertySymbols(value).length !== 0) {
    fail(code, `${label} cannot contain symbol keys`);
  }

  const lengthDescriptor = objectGetOwnPropertyDescriptor(value, 'length');
  if (!lengthDescriptor
      || !objectHasOwn(lengthDescriptor, 'value')
      || lengthDescriptor.value !== expectedLength
      || objectHasOwn(lengthDescriptor, 'get')
      || objectHasOwn(lengthDescriptor, 'set')) {
    fail(code, `${label} must contain exactly ${expectedLength} elements`);
  }

  const elementNames = [];
  for (let index = 0; index < expectedLength; index += 1) {
    elementNames[index] = String(index);
  }
  const actualNames = objectGetOwnPropertyNames(value);
  if (!sortedExactNamesMatch(actualNames, elementNames, true)) {
    fail(code, `${label} must be dense and undecorated`);
  }

  const descriptors = objectGetOwnPropertyDescriptors(value);
  const snapshot = [];
  for (let index = 0; index < expectedLength; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail(code, `${label}[${index}] must be an enumerable data property`);
    }
    snapshot[index] = descriptor.value;
  }
  return freezeValue(snapshot);
}

function captureSimulationRequestSnapshot(rawRequest) {
  const label = 'Wallet Guard simulation request';
  const code = 'POMRX_WG_SIM_E_REQUEST_INVALID';

  // Dispatch must not be able to demote a Proxy into the generic shared capture
  // path if a later same-realm mutation poisons that helper's live reflection.
  // Use this module's saved isProxy intrinsic before any method inspection so a
  // top-level request Proxy is rejected without executing its traps.
  if (rawRequest && typeof rawRequest === 'object' && isProxy(rawRequest)) {
    fail(code, `${label} must be a non-Proxy plain object`);
  }

  // Preserve the historical generic shared capture path for every RPC method
  // except an exact own enumerable eth_signTypedData_v4 method. Typed data is
  // special because Wallet Guard's decoder budgets the typed-data payload itself,
  // not the surrounding EIP-1193 method/account/params wrapper.
  if (!hasOwnEnumerableTypedDataMethod(rawRequest)) {
    const capture = captureReferencePlainDataOutcome(rawRequest, label);
    if (!capture.ok) {
      fail(code, 'simulation request is not bounded inert plain data');
    }
    return deepFreezeCapturedPlainData(capture.value);
  }

  const requestRecord = captureExactDataRecord(
    rawRequest,
    REQUEST_KEYS,
    label,
    code,
  );
  const params = captureExactDenseArray(
    requestRecord.params,
    2,
    `${label}.params`,
    code,
  );
  const accountCapture = captureReferencePlainDataOutcome(
    params[0],
    `${label} account`,
  );
  const typedDataCapture = captureReferencePlainDataOutcome(
    params[1],
    `${label} typed data`,
  );
  if (!accountCapture.ok || !typedDataCapture.ok) {
    fail(code, 'simulation request is not bounded inert plain data');
  }

  // Wrapper structure is bounded independently while the typed-data payload gets
  // the same full node/depth/string budget it receives during Wallet Guard
  // decoding. Re-apply the module-saved freeze recursively to shared-capture
  // outputs before any asynchronous simulator callback can retain or mutate them.
  const capturedAccount = deepFreezeCapturedPlainData(accountCapture.value);
  const capturedTypedData = deepFreezeCapturedPlainData(typedDataCapture.value);
  const requestSnapshot = createObject(null);
  requestSnapshot.method = requestRecord.method;
  requestSnapshot.params = freezeValue([
    capturedAccount,
    capturedTypedData,
  ]);
  return freezeValue(requestSnapshot);
}

function requireLocalIntent(intent) {
  // Provenance is checked before structural validation so arbitrary caller
  // objects cannot participate in reflection while being rejected as non-local.
  if (!isLocallyNormalizedWalletGuardIntent(intent)) {
    fail(
      'POMRX_WG_SIM_E_INTENT_INVALID',
      'simulation requires the exact locally normalized Wallet Guard intent object',
    );
  }
  return commitWalletGuardIntent(intent);
}

function typedDataRequestCommitmentMarker(typedData) {
  if (typeof typedData === 'string') {
    // sha256Hex consumes UTF-8. Hashing an arbitrary JavaScript string directly
    // would therefore collapse distinct unpaired UTF-16 surrogates to the same
    // replacement byte sequence. Commit an ASCII transcript of exact UTF-16 code
    // units instead. The request snapshot already bounds this string to 16 KiB.
    const exactTextCommitment = sha256Hex(
      `${TYPED_DATA_JSON_COMMIT_DOMAIN}${utf16CodeUnitTranscript(typedData)}`,
    );
    return freezeValue({
      schema_version: TYPED_DATA_JSON_COMMITMENT_SCHEMA,
      exact_utf16_sha256: exactTextCommitment,
    });
  }

  if (typedData && typeof typedData === 'object' && !arrayIsArray(typedData)) {
    // Replay has already accepted this independently captured typed-data object.
    // Keep the existing proof-canonicalizer call as the bounded shape/byte
    // validation contract, but do not hash its NFC-normalized text: EIP-712
    // strings are byte-sensitive and canonically equivalent Unicode spellings
    // must remain distinct request identities. Hash an unambiguous ASCII
    // transcript of the captured inert value tree instead. Object keys are
    // sorted so insertion order remains semantically irrelevant; string values
    // preserve exact UTF-16 code units. The digest marker still keeps the outer
    // RPC request below the generic 16 KiB canonicalization limit.
    canonicalizePayload(typedData);
    const exactTypedDataCommitment = sha256Hex(
      `${TYPED_DATA_OBJECT_COMMIT_DOMAIN}${exactPlainDataTranscript(typedData)}`,
    );
    return freezeValue({
      schema_version: TYPED_DATA_OBJECT_COMMITMENT_SCHEMA,
      exact_typed_data_sha256: exactTypedDataCommitment,
    });
  }

  return null;
}

function requestCommitmentProjection(requestSnapshot) {
  if (requestSnapshot.method !== 'eth_signTypedData_v4'
      || !arrayIsArray(requestSnapshot.params)
      || requestSnapshot.params.length !== 2) {
    return requestSnapshot;
  }

  const marker = typedDataRequestCommitmentMarker(requestSnapshot.params[1]);
  if (marker === null) return requestSnapshot;

  // Only the request-commitment projection is compacted. The exact captured and
  // replayed request remains the simulator input and is never replaced by this
  // marker object.
  return freezeValue({
    method: requestSnapshot.method,
    params: freezeValue([
      requestSnapshot.params[0],
      marker,
    ]),
  });
}

function commitRequestSnapshot(requestSnapshot) {
  // The request is already bounded inert plain data and has successfully replayed
  // through Wallet Guard normalization before this point. Any later failure in
  // the shared canonicalizer is therefore a runtime/contract failure, not a new
  // simulation diagnostic. Preserve that exact provenance instead of translating
  // by exported error class. Typed-data requests use a domain-separated digest
  // projection so Wallet Guard's accepted representation does not require
  // widening the shared canonicalizer's generic string or 16 KiB total limits.
  const canonicalRequest = canonicalizePayload(
    requestCommitmentProjection(requestSnapshot),
  );
  return freezeValue({
    canonical_request: canonicalRequest,
    request_commitment: sha256Hex(
      `${WALLET_GUARD_SIMULATION_REQUEST_COMMIT_DOMAIN}${canonicalRequest}`,
    ),
  });
}

function replayIntentAgainstRequest(intent, requestSnapshot) {
  const committedIntent = requireLocalIntent(intent);
  // Replay uses the intent module's no-translation path. Expected and foreign
  // decoder errors keep their exact provenance; only a successful replay whose
  // normalized semantic commitment differs becomes a local binding mismatch.
  const replayed = normalizeWalletGuardIntentForReplay({
    requestId: intent.request_id,
    trustedOrigin: intent.origin,
    trustedChainId: intent.chain_id,
    trustedAccount: intent.account,
    request: requestSnapshot,
  });

  const replayedCommitment = commitWalletGuardIntent(replayed).intent_commitment;
  if (replayedCommitment !== committedIntent.intent_commitment) {
    fail(
      'POMRX_WG_SIM_E_BINDING_MISMATCH',
      'simulation request does not match the committed Wallet Guard intent',
    );
  }
  return committedIntent.intent_commitment;
}

function isLowercaseSha256(value) {
  return typeof value === 'string' && regexpTest(HASH_PATTERN, value);
}

function evidencePayload(identity, status, stateCommitment, effectCommitment) {
  return freezeValue({
    schema_version: WALLET_GUARD_SIMULATION_SCHEMA_VERSION,
    request_id: identity.request_id,
    request_commitment: identity.request_commitment,
    intent_commitment: identity.intent_commitment,
    origin: identity.origin,
    chain_id: identity.chain_id,
    account: identity.account,
    status,
    state_commitment: stateCommitment,
    effect_commitment: effectCommitment,
  });
}

function makeEvidence(identity, status, stateCommitment = null, effectCommitment = null) {
  if (!setHas(EVIDENCE_STATUSES, status)) {
    fail('POMRX_WG_SIM_E_INTERNAL', 'internal simulation status is invalid');
  }
  const payload = evidencePayload(identity, status, stateCommitment, effectCommitment);
  const canonical = canonicalizePayload(payload);
  return freezeValue({
    ...payload,
    simulation_commitment: sha256Hex(
      `${WALLET_GUARD_SIMULATION_COMMIT_DOMAIN}${canonical}`,
    ),
    reference_only: true,
    simulator_callback_trusted_bootstrap_assumed: true,
    simulator_truth_proved: false,
    external_state_proved: false,
    external_effect_proved: false,
    simulation_to_forwarding_bound: false,
    simulator_callback_return_channel_proved: false,
  });
}

function identityMatches(result, identity) {
  return result.request_id === identity.request_id
    && result.request_commitment === identity.request_commitment
    && result.intent_commitment === identity.intent_commitment
    && result.origin === identity.origin
    && result.chain_id === identity.chain_id
    && result.account === identity.account;
}

function evidenceMatchesIntent(evidence, intent) {
  const committedIntent = requireLocalIntent(intent);
  return evidence.request_id === intent.request_id
    && evidence.intent_commitment === committedIntent.intent_commitment
    && evidence.origin === intent.origin
    && evidence.chain_id === intent.chain_id
    && evidence.account === intent.account;
}

function normalizeResolvedCallbackResult(rawResult, identity, makeLocalEvidence) {
  const capture = captureReferencePlainDataOutcome(
    rawResult,
    'simulation callback result',
  );
  if (!capture.ok) {
    return makeLocalEvidence(identity, 'mismatch');
  }
  const result = capture.value;

  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return makeLocalEvidence(identity, 'mismatch');
  }
  const actual = Object.getOwnPropertyNames(result).sort(asciiCompare);
  const expected = [...CALLBACK_RESULT_KEYS].sort(asciiCompare);
  if (actual.length !== expected.length
      || actual.some((key, index) => key !== expected[index])) {
    return makeLocalEvidence(identity, 'mismatch');
  }
  if (typeof result.status !== 'string' || !setHas(CALLBACK_STATUSES, result.status)) {
    return makeLocalEvidence(identity, 'mismatch');
  }
  if (!identityMatches(result, identity)) {
    return makeLocalEvidence(identity, 'mismatch');
  }

  if (result.status === 'unavailable') {
    if (result.state_commitment !== null || result.effect_commitment !== null) {
      return makeLocalEvidence(identity, 'mismatch');
    }
    return makeLocalEvidence(identity, 'unavailable');
  }

  if (!isLowercaseSha256(result.state_commitment)
      || !isLowercaseSha256(result.effect_commitment)) {
    return makeLocalEvidence(identity, 'mismatch');
  }
  return makeLocalEvidence(
    identity,
    result.status,
    result.state_commitment,
    result.effect_commitment,
  );
}

function validateLocalEvidence(evidence) {
  const actual = Object.getOwnPropertyNames(evidence).sort(asciiCompare);
  const expected = [...EVIDENCE_KEYS].sort(asciiCompare);
  if (actual.length !== expected.length
      || actual.some((key, index) => key !== expected[index])) {
    fail('POMRX_WG_SIM_E_INVALID', 'local simulation evidence has an invalid shape');
  }
  if (evidence.schema_version !== WALLET_GUARD_SIMULATION_SCHEMA_VERSION
      || typeof evidence.status !== 'string'
      || !setHas(EVIDENCE_STATUSES, evidence.status)
      || evidence.reference_only !== true
      || evidence.simulator_callback_trusted_bootstrap_assumed !== true
      || evidence.simulator_truth_proved !== false
      || evidence.external_state_proved !== false
      || evidence.external_effect_proved !== false
      || evidence.simulation_to_forwarding_bound !== false
      || evidence.simulator_callback_return_channel_proved !== false
      || !isLowercaseSha256(evidence.request_commitment)
      || !isLowercaseSha256(evidence.intent_commitment)
      || !isLowercaseSha256(evidence.simulation_commitment)) {
    fail('POMRX_WG_SIM_E_INVALID', 'local simulation evidence metadata is invalid');
  }
  if (evidence.status === 'pass' || evidence.status === 'fail') {
    if (!isLowercaseSha256(evidence.state_commitment)
        || !isLowercaseSha256(evidence.effect_commitment)) {
      fail('POMRX_WG_SIM_E_INVALID', 'known simulation evidence commitments are invalid');
    }
  } else if (evidence.state_commitment !== null || evidence.effect_commitment !== null) {
    fail(
      'POMRX_WG_SIM_E_INVALID',
      'unavailable/mismatch simulation evidence cannot carry state/effect commitments',
    );
  }

  const payload = evidencePayload(
    evidence,
    evidence.status,
    evidence.state_commitment,
    evidence.effect_commitment,
  );
  const canonical = canonicalizePayload(payload);
  const expectedCommitment = sha256Hex(
    `${WALLET_GUARD_SIMULATION_COMMIT_DOMAIN}${canonical}`,
  );
  if (expectedCommitment !== evidence.simulation_commitment) {
    fail('POMRX_WG_SIM_E_INVALID', 'simulation commitment does not match local evidence');
  }
  return evidence;
}

export function createWalletGuardReferenceSimulationHarness(rawOptions) {
  const options = captureExactDataRecord(
    rawOptions,
    BOOTSTRAP_KEYS,
    'Wallet Guard simulation bootstrap',
    'POMRX_WG_SIM_E_INVALID',
  );
  if (typeof options.simulateRequest !== 'function') {
    fail('POMRX_WG_SIM_E_INVALID', 'simulateRequest must be a function');
  }
  const simulateRequest = options.simulateRequest;
  const localEvidenceBrand = new WeakSet();
  const localEvidenceIntent = new WeakMap();

  function makeLocalEvidence(
    sourceIntent,
    identity,
    status,
    stateCommitment = null,
    effectCommitment = null,
  ) {
    const evidence = makeEvidence(identity, status, stateCommitment, effectCommitment);
    weakSetAdd(localEvidenceBrand, evidence);
    weakMapSet(localEvidenceIntent, evidence, sourceIntent);
    return evidence;
  }

  function isLocalEvidence(evidence) {
    return Boolean(
      evidence
      && typeof evidence === 'object'
      && weakSetHas(localEvidenceBrand, evidence),
    );
  }

  function toPolicySimulation(intent, evidence) {
    // Audience/provenance is checked before any structural evidence read.
    if (!isLocalEvidence(evidence)) {
      fail(
        'POMRX_WG_SIM_E_INVALID',
        'policy simulation requires evidence produced by this exact simulation harness',
      );
    }
    requireLocalIntent(intent);
    validateLocalEvidence(evidence);
    if (weakMapGet(localEvidenceIntent, evidence) !== intent) {
      fail(
        'POMRX_WG_SIM_E_BINDING_MISMATCH',
        'simulation evidence was not produced for this exact normalized intent object',
      );
    }
    if (!evidenceMatchesIntent(evidence, intent)) {
      fail(
        'POMRX_WG_SIM_E_BINDING_MISMATCH',
        'simulation evidence does not match the policy-evaluated intent',
      );
    }
    return freezeValue({ status: evidence.status });
  }

  async function simulate(rawInput) {
    const runInput = captureExactDataRecord(
      rawInput,
      RUN_KEYS,
      'Wallet Guard simulation input',
      'POMRX_WG_SIM_E_REQUEST_INVALID',
    );
    const localIntent = runInput.intent;
    requireLocalIntent(localIntent);

    const requestSnapshot = captureSimulationRequestSnapshot(runInput.request);
    const intentCommitment = replayIntentAgainstRequest(localIntent, requestSnapshot);
    const requestCommitment = commitRequestSnapshot(requestSnapshot).request_commitment;
    const identity = freezeValue({
      request_id: localIntent.request_id,
      request_commitment: requestCommitment,
      intent_commitment: intentCommitment,
      origin: localIntent.origin,
      chain_id: localIntent.chain_id,
      account: localIntent.account,
    });
    const simulatorInput = freezeValue({
      schema_version: WALLET_GUARD_SIMULATION_SCHEMA_VERSION,
      ...identity,
      request: requestSnapshot,
    });

    // simulateRequest is an installed trusted async reference dependency. The
    // JS Promise/thenable return channel is therefore explicitly outside the
    // evidence guarantee until the resolved value reaches the bounded capture
    // below. Generic callback failures preserve their original provenance;
    // ordinary simulator unavailability must be returned explicitly as status
    // `unavailable` with null state/effect commitments.
    const rawResult = await simulateRequest(simulatorInput);
    const mintLocalEvidence = (
      evidenceIdentity,
      status,
      stateCommitment = null,
      effectCommitment = null,
    ) => makeLocalEvidence(
      localIntent,
      evidenceIdentity,
      status,
      stateCommitment,
      effectCommitment,
    );
    return normalizeResolvedCallbackResult(rawResult, identity, mintLocalEvidence);
  }

  return freezeValue({
    simulate,
    isLocalEvidence,
    toPolicySimulation,
  });
}
