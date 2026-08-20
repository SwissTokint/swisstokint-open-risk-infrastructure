import { types as utilTypes } from 'node:util';

import {
  ProofPayloadValidationError,
  canonicalizePayload,
  sha256Hex,
} from '../../../sdk/typescript/swisstokint-proof.mjs';
import {
  PomRxPlainDataError,
  captureReferencePlainData,
} from '../../../core/reference-data/plain-data-snapshot.mjs';
import {
  WalletGuardIntentError,
  commitWalletGuardIntent,
  isLocallyNormalizedWalletGuardIntent,
  normalizeWalletGuardIntent,
} from './intent.mjs';

export const WALLET_GUARD_SIMULATION_SCHEMA_VERSION =
  'wallet_guard_simulation/0.1';
export const WALLET_GUARD_SIMULATION_COMMIT_DOMAIN =
  'swisstokint:pom-rx-wallet-guard-simulation:v1:';
export const WALLET_GUARD_SIMULATION_REQUEST_COMMIT_DOMAIN =
  'swisstokint:pom-rx-wallet-guard-simulation-request:v1:';

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const CALLBACK_STATUSES = new Set(['pass', 'fail', 'unavailable']);
const EVIDENCE_STATUSES = new Set(['pass', 'fail', 'unavailable', 'mismatch']);
const RUN_KEYS = Object.freeze(['intent', 'request']);
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

// Provenance and status registries are load-bearing security state. Capture
// their collection intrinsics once so later same-realm prototype poisoning
// cannot forge local evidence, substitute its originating intent, or widen the
// accepted status vocabulary. As elsewhere in the reference runtime, poisoning
// before module initialization remains outside this scoped guarantee.
const REFLECT_APPLY = Reflect.apply;
const SET_HAS = Set.prototype.has;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const WEAK_MAP_SET = WeakMap.prototype.set;
const WEAK_MAP_GET = WeakMap.prototype.get;

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

function isOwnEnumerableDataDescriptor(descriptor) {
  return Boolean(descriptor)
    && Object.hasOwn(descriptor, 'value')
    && Object.hasOwn(descriptor, 'enumerable')
    && descriptor.enumerable === true
    && !Object.hasOwn(descriptor, 'get')
    && !Object.hasOwn(descriptor, 'set');
}

function captureExactDataRecord(value, expectedKeys, label, code) {
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
  const snapshot = Object.create(null);
  for (const key of expectedKeys) {
    const descriptor = descriptors[key];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail(code, `${label}.${key} must be an enumerable data property`);
    }
    snapshot[key] = descriptor.value;
  }
  return Object.freeze(snapshot);
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

function commitRequestSnapshot(requestSnapshot) {
  let canonicalRequest;
  try {
    canonicalRequest = canonicalizePayload(requestSnapshot);
  } catch (error) {
    if (error instanceof ProofPayloadValidationError) {
      fail(
        'POMRX_WG_SIM_E_REQUEST_INVALID',
        'simulation request is outside the shared canonical commitment contract',
      );
    }
    throw error;
  }
  return Object.freeze({
    canonical_request: canonicalRequest,
    request_commitment: sha256Hex(
      `${WALLET_GUARD_SIMULATION_REQUEST_COMMIT_DOMAIN}${canonicalRequest}`,
    ),
  });
}

function replayIntentAgainstRequest(intent, requestSnapshot) {
  const committedIntent = requireLocalIntent(intent);
  let replayed;
  try {
    replayed = normalizeWalletGuardIntent({
      requestId: intent.request_id,
      trustedOrigin: intent.origin,
      trustedChainId: intent.chain_id,
      trustedAccount: intent.account,
      request: requestSnapshot,
    });
  } catch (error) {
    if (error instanceof WalletGuardIntentError) {
      fail(
        'POMRX_WG_SIM_E_BINDING_MISMATCH',
        'simulation request does not normalize under the committed intent context',
      );
    }
    throw error;
  }

  const replayedCommitment = commitWalletGuardIntent(replayed).intent_commitment;
  if (replayedCommitment !== committedIntent.intent_commitment) {
    fail(
      'POMRX_WG_SIM_E_BINDING_MISMATCH',
      'simulation request does not match the committed Wallet Guard intent',
    );
  }
  return committedIntent.intent_commitment;
}

function assertHash(value, field) {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    fail('POMRX_WG_SIM_E_CALLBACK_INVALID', `${field} must be a lowercase SHA-256 hash`);
  }
  return value;
}

function evidencePayload(identity, status, stateCommitment, effectCommitment) {
  return Object.freeze({
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
  return Object.freeze({
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
  let result;
  try {
    result = captureReferencePlainData(rawResult, 'simulation callback result');
  } catch (error) {
    if (error instanceof PomRxPlainDataError) {
      return makeLocalEvidence(identity, 'mismatch');
    }
    throw error;
  }

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

  try {
    const stateCommitment = assertHash(result.state_commitment, 'state_commitment');
    const effectCommitment = assertHash(result.effect_commitment, 'effect_commitment');
    return makeLocalEvidence(identity, result.status, stateCommitment, effectCommitment);
  } catch (error) {
    if (error instanceof WalletGuardSimulationError) {
      return makeLocalEvidence(identity, 'mismatch');
    }
    throw error;
  }
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
      || !HASH_PATTERN.test(evidence.request_commitment)
      || !HASH_PATTERN.test(evidence.intent_commitment)
      || !HASH_PATTERN.test(evidence.simulation_commitment)) {
    fail('POMRX_WG_SIM_E_INVALID', 'local simulation evidence metadata is invalid');
  }
  if (evidence.status === 'pass' || evidence.status === 'fail') {
    if (!HASH_PATTERN.test(evidence.state_commitment)
        || !HASH_PATTERN.test(evidence.effect_commitment)) {
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
    return Object.freeze({ status: evidence.status });
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

    let requestSnapshot;
    try {
      requestSnapshot = captureReferencePlainData(
        runInput.request,
        'Wallet Guard simulation request',
      );
    } catch (error) {
      if (error instanceof PomRxPlainDataError) {
        fail('POMRX_WG_SIM_E_REQUEST_INVALID', 'simulation request is not bounded inert plain data');
      }
      throw error;
    }

    const intentCommitment = replayIntentAgainstRequest(localIntent, requestSnapshot);
    const requestCommitment = commitRequestSnapshot(requestSnapshot).request_commitment;
    const identity = Object.freeze({
      request_id: localIntent.request_id,
      request_commitment: requestCommitment,
      intent_commitment: intentCommitment,
      origin: localIntent.origin,
      chain_id: localIntent.chain_id,
      account: localIntent.account,
    });
    const simulatorInput = Object.freeze({
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

  return Object.freeze({
    simulate,
    isLocalEvidence,
    toPolicySimulation,
  });
}
