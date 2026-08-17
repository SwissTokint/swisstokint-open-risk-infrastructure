import crypto from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

import {
  buildMerkleBatch,
  canonicalizePayload,
  sha256Hex,
} from './swisstokint-proof.mjs';
import { verifyFilecoinEvidenceBundle } from './filecoin-evidence-bundle.mjs';
import { parseExactJson } from '../../scripts/pom-rx-v01-fixture-contract.mjs';

export const MULTICHAIN_PLAN_SCHEMA_VERSION = 'pom-multichain-manual-operator-plan/0.1';
export const STELLAR_TESTNET_NETWORK = 'stellar:testnet';
export const STELLAR_TESTNET_CHAIN_ID = 'Test SDF Network ; September 2015';
export const STELLAR_TESTNET_CONTRACT_ID = 'CA6V2EUEGR4HFTRK3K5XOOGENH3Q2ZSHTBMHUG4LB3YOKDOLOETK2C5W';
export const STELLAR_TESTNET_SOURCE_ACCOUNT = 'GCSBVOYGBBYHW6563MRI67ZK5RPR4KU2OSJVH63TEDLV6LVHK4F4GD4J';
export const FILECOIN_CALIBRATION_NETWORK = 'filecoin:calibration';
export const FILECOIN_CALIBRATION_CHAIN_ID = '314159';

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const BATCH_REF_PATTERN = /^pom-[a-f0-9]{24}$/;
const STELLAR_ACCOUNT_PATTERN = /^G[A-Z2-7]{55}$/;
const CID_PATTERN = /^b[a-z2-7]{20,127}$/;
const MAX_STELLAR_FEE_ATOMIC = 100_000n;
const MAX_PLAN_JSON_BYTES = 64 * 1024;

function assert(condition, message) {
  if (!condition) throw new TypeError(message);
}

function assertObject(value, field) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${field} must be an object`);
}

function assertExactKeys(value, expected, field) {
  assertObject(value, field);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assert(
    actual.length === wanted.length && actual.every((key, index) => key === wanted[index]),
    `${field} has missing or unknown fields`,
  );
}

function assertHash(value, field) {
  assert(typeof value === 'string' && HASH_PATTERN.test(value), `${field} must be a lowercase SHA-256 hash`);
}

function assertUnsignedIntegerString(value, field) {
  assert(typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value), `${field} must be an unsigned integer string`);
  return BigInt(value);
}

function assertSafePositiveInteger(value, field) {
  assert(Number.isSafeInteger(value) && value > 0, `${field} must be a positive safe integer`);
}

function deepCopy(value) {
  return structuredClone(value);
}

function decodeBase32(value) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let accumulator = 0;
  let bits = 0;
  const bytes = [];
  for (const character of value) {
    const index = alphabet.indexOf(character);
    assert(index >= 0, 'stellar source_account contains invalid base32');
    accumulator = (accumulator << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((accumulator >> bits) & 0xff);
    }
  }
  assert(bits === 0 || (accumulator & ((1 << bits) - 1)) === 0, 'stellar source_account has non-zero base32 padding');
  return Uint8Array.from(bytes);
}

function crc16Xmodem(bytes) {
  let crc = 0;
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

function assertStellarPublicAccount(value) {
  assert(typeof value === 'string' && STELLAR_ACCOUNT_PATTERN.test(value), 'stellar source_account is invalid');
  const decoded = decodeBase32(value);
  assert(decoded.byteLength === 35 && decoded[0] === 6 << 3, 'stellar source_account has the wrong StrKey version');
  const checksum = crc16Xmodem(decoded.subarray(0, 33));
  assert(decoded[33] === (checksum & 0xff) && decoded[34] === (checksum >> 8), 'stellar source_account checksum is invalid');
}

function domainCommit(domain, value) {
  return sha256Hex(`${domain}\0${canonicalizePayload(value)}`);
}

function railCommit(domain, rail) {
  const copy = deepCopy(rail);
  delete copy.rail_intent_hash;
  return domainCommit(domain, copy);
}

function planCommit(plan) {
  const copy = deepCopy(plan);
  delete copy.plan_hash;
  return domainCommit('pom-multichain-manual-operator-plan/0.1', copy);
}

function validateBatchInput(batch) {
  assertObject(batch, 'batch');
  assertExactKeys(batch, [
    'schema_version',
    'tree_algorithm',
    'ordering',
    'batch_ref',
    'leaf_count',
    'merkle_root',
    'leaves',
  ], 'batch input');
  assert(batch.schema_version === 'pom-batch/0.1', 'batch schema_version must be pom-batch/0.1');
  assert(typeof batch.batch_ref === 'string' && BATCH_REF_PATTERN.test(batch.batch_ref), 'batch_ref has an invalid format');
  assertHash(batch.merkle_root, 'batch merkle_root');
  assertSafePositiveInteger(batch.leaf_count, 'batch leaf_count');
  assert(Array.isArray(batch.leaves), 'batch leaves must be an array');
  const rebuilt = buildMerkleBatch(batch.leaves.map((leaf) => ({
    receipt_id: leaf.receipt_id,
    commitment_hash: leaf.commitment_hash,
    occurred_at: leaf.occurred_at,
  })));
  assert(isDeepStrictEqual(batch, rebuilt), 'batch does not match its deterministic leaves and proofs');
}

function validatePlanBatch(batch) {
  assert(batch.schema_version === 'pom-batch/0.1', 'batch schema_version must be pom-batch/0.1');
  assert(typeof batch.batch_ref === 'string' && BATCH_REF_PATTERN.test(batch.batch_ref), 'batch_ref has an invalid format');
  assertHash(batch.merkle_root, 'batch merkle_root');
  assertSafePositiveInteger(batch.leaf_count, 'batch leaf_count');
  assert(batch.batch_ref === `pom-${batch.merkle_root.slice(0, 24)}`, 'batch_ref does not match the merkle_root');
}

function validateStellarRail(rail) {
  assertExactKeys(rail, [
    'network',
    'chain_id',
    'destination',
    'source_account',
    'operation',
    'value_atomic',
    'fee_cap_atomic',
    'submit',
    'intent',
    'rail_intent_hash',
  ], 'stellar rail');
  assert(rail.network === STELLAR_TESTNET_NETWORK, 'stellar network must be stellar:testnet');
  assert(rail.chain_id === STELLAR_TESTNET_CHAIN_ID, 'stellar chain_id must be the exact testnet passphrase');
  assert(rail.destination === STELLAR_TESTNET_CONTRACT_ID, 'stellar destination is not allowlisted');
  assertStellarPublicAccount(rail.source_account);
  assert(rail.source_account === STELLAR_TESTNET_SOURCE_ACCOUNT, 'stellar source_account is not allowlisted');
  assert(rail.operation === 'register', 'stellar operation must be register');
  assert(rail.value_atomic === '0', 'stellar value_atomic must be zero');
  const fee = assertUnsignedIntegerString(rail.fee_cap_atomic, 'stellar fee_cap_atomic');
  assert(fee <= MAX_STELLAR_FEE_ATOMIC, 'stellar fee cap exceeds the offline acceptance maximum');
  assert(rail.submit === false, 'stellar submit must remain false');
  assertExactKeys(rail.intent, [
    'batch_id',
    'merkle_root',
    'manifest_hash',
    'evidence_hash',
  ], 'stellar intent');
  assertHash(rail.intent.batch_id, 'stellar batch_id');
  assertHash(rail.intent.merkle_root, 'stellar merkle_root');
  assertHash(rail.intent.manifest_hash, 'stellar manifest_hash');
  assertHash(rail.intent.evidence_hash, 'stellar evidence_hash');
  assertHash(rail.rail_intent_hash, 'stellar rail_intent_hash');
  assert(
    rail.rail_intent_hash === railCommit('pom-stellar-testnet-register-intent/0.1', rail),
    'stellar rail intent hash does not match the rail intent',
  );
}

function validateFilecoinRail(rail) {
  assertExactKeys(rail, [
    'network',
    'chain_id',
    'provider_selection_status',
    'operation',
    'value_atomic',
    'fee_cap_atomic',
    'submit',
    'artifact',
    'rail_intent_hash',
  ], 'filecoin rail');
  assert(rail.network === FILECOIN_CALIBRATION_NETWORK, 'filecoin network must be filecoin:calibration');
  assert(rail.chain_id === FILECOIN_CALIBRATION_CHAIN_ID, 'filecoin chain_id must be 314159');
  assert(rail.provider_selection_status === 'required', 'filecoin provider selection must remain required');
  assert(rail.operation === 'store-car', 'filecoin operation must be store-car');
  assert(rail.value_atomic === '0', 'filecoin value_atomic must be zero');
  const fee = assertUnsignedIntegerString(rail.fee_cap_atomic, 'filecoin fee_cap_atomic');
  assert(fee === 0n, 'filecoin fee cap must remain zero in offline acceptance');
  assert(rail.submit === false, 'filecoin submit must remain false');
  assertExactKeys(rail.artifact, [
    'car_root_cid',
    'car_sha256',
    'byte_length',
    'leaf_count',
    'batch_ref',
    'merkle_root',
  ], 'filecoin artifact');
  assert(typeof rail.artifact.car_root_cid === 'string' && CID_PATTERN.test(rail.artifact.car_root_cid), 'filecoin car_root_cid is invalid');
  assertHash(rail.artifact.car_sha256, 'filecoin car_sha256');
  assertSafePositiveInteger(rail.artifact.byte_length, 'filecoin byte_length');
  assertSafePositiveInteger(rail.artifact.leaf_count, 'filecoin leaf_count');
  assert(typeof rail.artifact.batch_ref === 'string' && BATCH_REF_PATTERN.test(rail.artifact.batch_ref), 'filecoin batch_ref is invalid');
  assertHash(rail.artifact.merkle_root, 'filecoin merkle_root');
  assertHash(rail.rail_intent_hash, 'filecoin rail_intent_hash');
  assert(
    rail.rail_intent_hash === railCommit('pom-filecoin-calibration-car-intent/0.1', rail),
    'filecoin rail intent hash does not match the rail intent',
  );
}

export async function buildMultichainOperatorPlan(input) {
  assertExactKeys(input, ['batch', 'stellar', 'filecoin'], 'input');
  const callerBatch = input.batch;
  const callerStellar = input.stellar;
  const callerFilecoin = input.filecoin;
  assertExactKeys(callerStellar, [
    'contract_id',
    'source_account',
    'manifest_hash',
    'evidence_hash',
    'fee_cap_atomic',
  ], 'stellar input');
  assertExactKeys(callerFilecoin, [
    'car_bytes',
    'fee_cap_atomic',
  ], 'filecoin input');

  const callerCarBytes = callerFilecoin.car_bytes;
  assert(callerCarBytes instanceof Uint8Array, 'filecoin car_bytes must be a Uint8Array');
  const safeInput = {
    batch: deepCopy(callerBatch),
    stellar: deepCopy(callerStellar),
    filecoin: {
      car_bytes: Uint8Array.from(callerCarBytes),
      fee_cap_atomic: callerFilecoin.fee_cap_atomic,
    },
  };
  validateBatchInput(safeInput.batch);

  assert(safeInput.stellar.contract_id === STELLAR_TESTNET_CONTRACT_ID, 'stellar destination is not allowlisted');
  assertStellarPublicAccount(safeInput.stellar.source_account);
  assert(safeInput.stellar.source_account === STELLAR_TESTNET_SOURCE_ACCOUNT, 'stellar source_account is not allowlisted');
  assertHash(safeInput.stellar.manifest_hash, 'stellar manifest_hash');
  assertHash(safeInput.stellar.evidence_hash, 'stellar evidence_hash');
  const verifiedCar = await verifyFilecoinEvidenceBundle(safeInput.filecoin.car_bytes);

  const safeBatch = {
    schema_version: safeInput.batch.schema_version,
    batch_ref: safeInput.batch.batch_ref,
    merkle_root: safeInput.batch.merkle_root,
    leaf_count: safeInput.batch.leaf_count,
  };
  const stellar = {
    network: STELLAR_TESTNET_NETWORK,
    chain_id: STELLAR_TESTNET_CHAIN_ID,
    destination: safeInput.stellar.contract_id,
    source_account: safeInput.stellar.source_account,
    operation: 'register',
    value_atomic: '0',
    fee_cap_atomic: safeInput.stellar.fee_cap_atomic,
    submit: false,
    intent: {
      batch_id: sha256Hex(`pom-stellar-testnet-batch-id/0.1\0${safeBatch.batch_ref}`),
      merkle_root: safeBatch.merkle_root,
      manifest_hash: safeInput.stellar.manifest_hash,
      evidence_hash: safeInput.stellar.evidence_hash,
    },
  };
  stellar.rail_intent_hash = railCommit('pom-stellar-testnet-register-intent/0.1', stellar);

  const filecoin = {
    network: FILECOIN_CALIBRATION_NETWORK,
    chain_id: FILECOIN_CALIBRATION_CHAIN_ID,
    provider_selection_status: 'required',
    operation: 'store-car',
    value_atomic: '0',
    fee_cap_atomic: safeInput.filecoin.fee_cap_atomic,
    submit: false,
    artifact: {
      car_root_cid: verifiedCar.rootCid,
      car_sha256: crypto.createHash('sha256').update(safeInput.filecoin.car_bytes).digest('hex'),
      byte_length: verifiedCar.byteLength,
      leaf_count: verifiedCar.manifest.leaf_count,
      batch_ref: safeBatch.batch_ref,
      merkle_root: safeBatch.merkle_root,
    },
  };
  assert(verifiedCar.manifest.batch_ref === safeBatch.batch_ref, 'filecoin CAR batch_ref does not match the batch');
  assert(verifiedCar.manifest.merkle_root === safeBatch.merkle_root, 'filecoin CAR merkle_root does not match the batch');
  assert(verifiedCar.manifest.leaf_count === safeBatch.leaf_count, 'filecoin CAR leaf_count does not match the batch');
  filecoin.rail_intent_hash = railCommit('pom-filecoin-calibration-car-intent/0.1', filecoin);

  const plan = {
    schema_version: MULTICHAIN_PLAN_SCHEMA_VERSION,
    qualification: 'OFFLINE_ACCEPTANCE_ONLY',
    network_actions_allowed: false,
    batch: safeBatch,
    human_gate: {
      status: 'required',
      scope: 'exact-future-unsigned-envelope',
      approval_material_present: false,
    },
    rails: { stellar, filecoin },
  };
  plan.plan_hash = planCommit(plan);
  validateMultichainOperatorPlan(plan);
  return deepCopy(plan);
}

export function validateMultichainOperatorPlan(plan) {
  assertExactKeys(plan, [
    'schema_version',
    'qualification',
    'network_actions_allowed',
    'batch',
    'human_gate',
    'rails',
    'plan_hash',
  ], 'plan');
  assert(plan.schema_version === MULTICHAIN_PLAN_SCHEMA_VERSION, 'plan schema_version is invalid');
  assert(plan.qualification === 'OFFLINE_ACCEPTANCE_ONLY', 'plan qualification must remain offline-only');
  assert(plan.network_actions_allowed === false, 'network_actions_allowed must remain false');
  assertExactKeys(plan.batch, ['schema_version', 'batch_ref', 'merkle_root', 'leaf_count'], 'plan batch');
  validatePlanBatch(plan.batch);
  assertExactKeys(plan.human_gate, ['status', 'scope', 'approval_material_present'], 'human_gate');
  assert(plan.human_gate.status === 'required', 'human_gate status must remain required');
  assert(plan.human_gate.scope === 'exact-future-unsigned-envelope', 'human_gate scope is invalid');
  assert(plan.human_gate.approval_material_present === false, 'approval material must not be embedded in an offline plan');
  assertExactKeys(plan.rails, ['stellar', 'filecoin'], 'rails');
  validateStellarRail(plan.rails.stellar);
  validateFilecoinRail(plan.rails.filecoin);
  assert(
    plan.rails.stellar.intent.batch_id === sha256Hex(`pom-stellar-testnet-batch-id/0.1\0${plan.batch.batch_ref}`),
    'stellar batch_id does not match the batch_ref',
  );
  assert(plan.rails.stellar.intent.merkle_root === plan.batch.merkle_root, 'stellar merkle_root does not match the batch');
  assert(plan.rails.filecoin.artifact.merkle_root === plan.batch.merkle_root, 'filecoin merkle_root does not match the batch');
  assert(plan.rails.filecoin.artifact.batch_ref === plan.batch.batch_ref, 'filecoin batch_ref does not match the batch');
  assert(plan.rails.filecoin.artifact.leaf_count === plan.batch.leaf_count, 'filecoin leaf_count does not match the batch');
  assertHash(plan.plan_hash, 'plan_hash');
  assert(plan.plan_hash === planCommit(plan), 'plan_hash does not match the canonical plan');
  return true;
}

export function assertNetworkActionAllowed(plan) {
  validateMultichainOperatorPlan(plan);
  throw new TypeError('Network action is blocked: exact human approval of the future unsigned envelope is required');
}

export function parseMultichainOperatorPlanBytes(bytes) {
  const snapshot = Buffer.from(bytes);
  assert(snapshot.byteLength > 0 && snapshot.byteLength <= MAX_PLAN_JSON_BYTES, 'plan JSON byte length is invalid');
  let plan;
  try {
    plan = parseExactJson(snapshot, 'multichain manual operator plan');
  } catch {
    throw new TypeError('plan JSON is invalid or ambiguous');
  }
  validateMultichainOperatorPlan(plan);
  return deepCopy(plan);
}
