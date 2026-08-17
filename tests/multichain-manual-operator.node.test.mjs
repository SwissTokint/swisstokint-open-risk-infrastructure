import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { CarReader, CarWriter } from '@ipld/car';
import { CID } from 'multiformats/cid';
import * as raw from 'multiformats/codecs/raw';
import { sha256 } from 'multiformats/hashes/sha2';

import {
  assertNetworkActionAllowed,
  buildMultichainOperatorPlan,
  parseMultichainOperatorPlanBytes,
  validateMultichainOperatorPlan,
} from '../sdk/typescript/multichain-manual-operator.mjs';
import {
  buildFilecoinEvidenceBundle,
  canonicalizeEvidenceDocument,
} from '../sdk/typescript/filecoin-evidence-bundle.mjs';
import { canonicalizePayload, sha256Hex } from '../sdk/typescript/swisstokint-proof.mjs';

const batch = JSON.parse(fs.readFileSync(
  new URL('../schemas/examples/proof-batch-v0.1.expected.json', import.meta.url),
  'utf8',
));

const receipts = JSON.parse(fs.readFileSync(
  new URL('../schemas/examples/proof-batch-input-v0.1.json', import.meta.url),
  'utf8',
));

const carBundle = await buildFilecoinEvidenceBundle(receipts);

const expectedPlan = JSON.parse(fs.readFileSync(
  new URL('../schemas/examples/multichain-manual-operator-plan-v0.1.json', import.meta.url),
  'utf8',
));

const planSchema = JSON.parse(fs.readFileSync(
  new URL('../schemas/multichain-manual-operator-plan-v0.1.schema.json', import.meta.url),
  'utf8',
));

const input = {
  batch,
  stellar: {
    contract_id: 'CA6V2EUEGR4HFTRK3K5XOOGENH3Q2ZSHTBMHUG4LB3YOKDOLOETK2C5W',
    source_account: 'GCSBVOYGBBYHW6563MRI67ZK5RPR4KU2OSJVH63TEDLV6LVHK4F4GD4J',
    manifest_hash: 'c908e166de11f7996079d474b4a2db8bd4c42cc2736dd53dc9fe8ebd6ac9ed46',
    evidence_hash: '15788e94945196599585eaa993802a7521172023e541e231623f4fc38e3e4f33',
    fee_cap_atomic: '100000',
  },
  filecoin: {
    car_bytes: carBundle.bytes,
    fee_cap_atomic: '0',
  },
};

function clone(value) {
  return structuredClone(value);
}

async function collectBytes(source) {
  const chunks = [];
  for await (const chunk of source) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function buildPartialCar(fullCarBytes) {
  const reader = await CarReader.fromBytes(fullCarBytes);
  const [root] = await reader.getRoots();
  const fullManifestBlock = await reader.get(root);
  const fullManifest = JSON.parse(new TextDecoder().decode(fullManifestBlock.bytes));
  const firstDescriptor = fullManifest.receipts[0];
  const firstProofBlock = await reader.get(CID.parse(firstDescriptor.cid));
  const partialManifest = {
    ...fullManifest,
    leaf_count: 1,
    receipts: [firstDescriptor],
  };
  const manifestBytes = new TextEncoder().encode(canonicalizeEvidenceDocument(partialManifest));
  const manifestDigest = await sha256.digest(manifestBytes);
  const manifestCid = CID.createV1(raw.code, manifestDigest);
  const { writer, out } = CarWriter.create([manifestCid]);
  const bytesPromise = collectBytes(out);
  await writer.put({ cid: manifestCid, bytes: manifestBytes });
  await writer.put(firstProofBlock);
  await writer.close();
  return bytesPromise;
}

test('builds a deterministic dual-network offline acceptance plan', async () => {
  const first = await buildMultichainOperatorPlan(input);
  const second = await buildMultichainOperatorPlan(clone(input));

  assert.deepEqual(first, second);
  assert.equal(validateMultichainOperatorPlan(first), true);
  assert.equal(first.qualification, 'OFFLINE_ACCEPTANCE_ONLY');
  assert.equal(first.network_actions_allowed, false);
  assert.equal(first.human_gate.status, 'required');
  assert.equal(first.rails.stellar.value_atomic, '0');
  assert.equal(first.rails.filecoin.value_atomic, '0');
  assert.match(first.plan_hash, /^[a-f0-9]{64}$/);
  assert.deepEqual(first, expectedPlan);
});

for (const [name, mutate, expected] of [
  ['wrong Stellar network', plan => { plan.rails.stellar.network = 'stellar:public'; }, /stellar network/i],
  ['wrong Stellar chain id', plan => { plan.rails.stellar.chain_id = 'Public Global Stellar Network ; September 2015'; }, /stellar chain_id/i],
  ['wrong Filecoin network', plan => { plan.rails.filecoin.network = 'filecoin:mainnet'; }, /filecoin network/i],
  ['wrong Filecoin chain id', plan => { plan.rails.filecoin.chain_id = '314'; }, /filecoin chain_id/i],
  ['unauthorized destination', plan => { plan.rails.stellar.destination = 'C'.repeat(56); }, /stellar destination/i],
  ['selected Filecoin provider', plan => { plan.rails.filecoin.provider_selection_status = 'selected'; }, /provider selection/i],
  ['non-zero Stellar value', plan => { plan.rails.stellar.value_atomic = '1'; }, /value_atomic/i],
  ['non-zero value', plan => { plan.rails.filecoin.value_atomic = '1'; }, /value_atomic/i],
  ['excessive fee', plan => { plan.rails.stellar.fee_cap_atomic = '100001'; }, /fee cap/i],
  ['non-zero Filecoin fee', plan => { plan.rails.filecoin.fee_cap_atomic = '1'; }, /fee cap/i],
  ['altered rail intent commitment', plan => { plan.rails.stellar.rail_intent_hash = '0'.repeat(64); }, /rail intent hash/i],
]) {
  test(`rejects ${name}`, async () => {
    const plan = await buildMultichainOperatorPlan(input);
    mutate(plan);
    assert.throws(() => validateMultichainOperatorPlan(plan), expected);
  });
}

test('refuses network action while exact human approval is missing', async () => {
  const plan = await buildMultichainOperatorPlan(input);
  assert.throws(
    () => assertNetworkActionAllowed(plan),
    /exact human approval.*future unsigned envelope/i,
  );
});

test('defensively copies mutable caller input before hashing', async () => {
  const mutable = clone(input);
  const plan = await buildMultichainOperatorPlan(mutable);
  mutable.batch.merkle_root = '0'.repeat(64);
  mutable.stellar.contract_id = 'C'.repeat(56);

  assert.equal(validateMultichainOperatorPlan(plan), true);
  assert.notEqual(plan.batch.merkle_root, mutable.batch.merkle_root);
  assert.notEqual(plan.rails.stellar.destination, mutable.stellar.contract_id);
});

test('rejects a batch whose reference, root, leaves or proofs are inconsistent', async () => {
  const mutated = clone(input);
  mutated.batch.batch_ref = `pom-${'a'.repeat(24)}`;
  await assert.rejects(buildMultichainOperatorPlan(mutated), /batch does not match/i);
});

test('verifies exact CAR bytes and rejects tampered storage evidence', async () => {
  const mutated = clone(input);
  mutated.filecoin.car_bytes[mutated.filecoin.car_bytes.length - 1] ^= 0x01;
  await assert.rejects(buildMultichainOperatorPlan(mutated), /CID hash|Merkle proof|canonical JSON|invalid/i);
});

test('rejects a valid partial CAR that does not cover the complete accepted batch', async () => {
  const mutated = clone(input);
  mutated.filecoin.car_bytes = await buildPartialCar(carBundle.bytes);
  await assert.rejects(buildMultichainOperatorPlan(mutated), /CAR leaf_count does not match/i);
});

test('snapshots accessor-backed CAR bytes exactly once before asynchronous verification', async () => {
  const accessorInput = clone(input);
  const validBytes = Uint8Array.from(carBundle.bytes);
  const tamperedBytes = Uint8Array.from(carBundle.bytes);
  tamperedBytes[tamperedBytes.length - 1] ^= 0x01;
  let reads = 0;
  delete accessorInput.filecoin.car_bytes;
  Object.defineProperty(accessorInput.filecoin, 'car_bytes', {
    enumerable: true,
    get() {
      reads += 1;
      return reads === 1 ? validBytes : tamperedBytes;
    },
  });
  const plan = await buildMultichainOperatorPlan(accessorInput);
  assert.equal(reads, 1);
  assert.equal(plan.rails.filecoin.artifact.car_sha256, 'be9294af27690a0e5fcda7fc2221d26b3aa9c7161c90529fe3559e9ab41e0fc2');
});

test('snapshots the batch before awaiting CAR verification', async () => {
  const mutable = clone(input);
  const pendingPlan = buildMultichainOperatorPlan(mutable);
  mutable.batch.leaf_count = 1;
  const plan = await pendingPlan;
  assert.equal(plan.batch.leaf_count, 3);
  assert.equal(plan.rails.filecoin.artifact.leaf_count, 3);
});

test('validates the Stellar public source StrKey checksum', async () => {
  const mutated = clone(input);
  mutated.stellar.source_account = 'GCSBVO3T7MJJ5SNBSM5KR62MH2R54YUABW7XXGWFGRDOWODJ52QGVNTG';
  await assert.rejects(buildMultichainOperatorPlan(mutated), /checksum/i);
});

test('recomputes the normative Stellar batch_id independently of committed rail fields', async () => {
  const plan = await buildMultichainOperatorPlan(input);
  plan.rails.stellar.intent.batch_id = '0'.repeat(64);
  const stellarWithoutHash = clone(plan.rails.stellar);
  delete stellarWithoutHash.rail_intent_hash;
  plan.rails.stellar.rail_intent_hash = sha256Hex(
    `pom-stellar-testnet-register-intent/0.1\0${canonicalizePayload(stellarWithoutHash)}`,
  );
  const planWithoutHash = clone(plan);
  delete planWithoutHash.plan_hash;
  plan.plan_hash = sha256Hex(
    `pom-multichain-manual-operator-plan/0.1\0${canonicalizePayload(planWithoutHash)}`,
  );
  assert.throws(() => validateMultichainOperatorPlan(plan), /batch_id does not match/i);
});

test('strict raw parser rejects duplicate JSON keys before object validation', () => {
  const raw = fs.readFileSync(
    new URL('../schemas/examples/multichain-manual-operator-plan-v0.1.json', import.meta.url),
  );
  assert.deepEqual(parseMultichainOperatorPlanBytes(raw), expectedPlan);
  const duplicated = Buffer.from(raw.toString('utf8').replace(
    '  "network_actions_allowed": false,',
    '  "network_actions_allowed": true,\n  "network_actions_allowed": false,',
  ));
  assert.throws(() => parseMultichainOperatorPlanBytes(duplicated), /invalid or ambiguous/i);
  assert.throws(() => parseMultichainOperatorPlanBytes(Buffer.alloc(64 * 1024 + 1)), /byte length/i);
});

test('JSON Schema constants and safe-integer bounds match the executable contract', () => {
  assert.equal(planSchema.properties.schema_version.const, expectedPlan.schema_version);
  assert.equal(planSchema.properties.qualification.const, expectedPlan.qualification);
  assert.equal(planSchema.$defs.stellar.properties.destination.const, expectedPlan.rails.stellar.destination);
  assert.equal(planSchema.$defs.stellar.properties.source_account.const, expectedPlan.rails.stellar.source_account);
  assert.equal(planSchema.$defs.filecoin.properties.provider_selection_status.const, 'required');
  assert.equal(planSchema.$defs.batch.properties.leaf_count.maximum, Number.MAX_SAFE_INTEGER);
  assert.equal(planSchema.$defs.filecoin.properties.artifact.properties.byte_length.maximum, Number.MAX_SAFE_INTEGER);
  assert.equal(planSchema.$defs.filecoin.properties.artifact.properties.leaf_count.maximum, Number.MAX_SAFE_INTEGER);
});
