import crypto from 'node:crypto';

import { CarReader, CarWriter } from '@ipld/car';
import { CID } from 'multiformats/cid';
import * as raw from 'multiformats/codecs/raw';
import { sha256 } from 'multiformats/hashes/sha2';

import {
  buildMerkleBatch,
  sha256Hex,
  verifyMerkleProof,
} from './swisstokint-proof.mjs';

export const FILECOIN_BUNDLE_SCHEMA_VERSION = 'pom-filecoin-bundle/0.1';
export const FILECOIN_RECEIPT_PROOF_SCHEMA_VERSION = 'pom-receipt-proof/0.1';

const MAX_BUNDLE_BYTES = 64 * 1024 * 1024;
const FORBIDDEN_KEYS = new Set([
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
]);

function assert(condition, message) {
  if (!condition) throw new TypeError(message);
}

function canonicalize(value) {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    assert(Number.isSafeInteger(value), 'Bundle numbers must be safe integers');
    return String(value);
  }
  if (typeof value === 'string') return JSON.stringify(value.normalize('NFC'));
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  assert(value && typeof value === 'object', 'Bundle contains an unsupported value');
  return `{${Object.entries(value)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, nested]) => `${JSON.stringify(key)}:${canonicalize(nested)}`)
    .join(',')}}`;
}

export function canonicalizeEvidenceDocument(value) {
  return canonicalize(value);
}

function normalizedKey(key) {
  return key.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function assertNoForbiddenKeys(value, path = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenKeys(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    assert(!FORBIDDEN_KEYS.has(normalizedKey(key)), `Forbidden field in public bundle: ${path}.${key}`);
    assertNoForbiddenKeys(nested, `${path}.${key}`);
  }
}

async function rawBlock(value) {
  const bytes = new TextEncoder().encode(canonicalizeEvidenceDocument(value));
  const digest = await sha256.digest(bytes);
  return {
    cid: CID.createV1(raw.code, digest),
    bytes,
  };
}

async function collectBytes(source) {
  const chunks = [];
  let total = 0;
  for await (const chunk of source) {
    chunks.push(chunk);
    total += chunk.length;
    assert(total <= MAX_BUNDLE_BYTES, 'CAR bundle exceeds the 64 MiB prototype limit');
  }
  return Buffer.concat(chunks, total);
}

function receiptProofFromLeaf(batch, leaf) {
  return {
    schema_version: FILECOIN_RECEIPT_PROOF_SCHEMA_VERSION,
    batch_ref: batch.batch_ref,
    merkle_root: batch.merkle_root,
    receipt_id: leaf.receipt_id,
    commitment_hash: leaf.commitment_hash,
    occurred_at: leaf.occurred_at,
    leaf_index: leaf.leaf_index,
    leaf_hash: leaf.leaf_hash,
    proof: leaf.proof,
  };
}

export async function buildFilecoinEvidenceBundle(receipts) {
  const batch = buildMerkleBatch(receipts);
  const receiptBlocks = [];

  for (const leaf of batch.leaves) {
    const value = receiptProofFromLeaf(batch, leaf);
    assertNoForbiddenKeys(value);
    receiptBlocks.push({
      value,
      ...(await rawBlock(value)),
    });
  }

  const manifest = {
    schema_version: FILECOIN_BUNDLE_SCHEMA_VERSION,
    storage_profile: 'filecoin-onchain-cloud/car-v1',
    batch_ref: batch.batch_ref,
    merkle_root: batch.merkle_root,
    leaf_count: batch.leaf_count,
    tree_algorithm: batch.tree_algorithm,
    ordering: batch.ordering,
    receipts: receiptBlocks.map(({ cid, value }) => ({
      receipt_id: value.receipt_id,
      leaf_index: value.leaf_index,
      cid: cid.toString(),
    })),
  };
  assertNoForbiddenKeys(manifest);
  const manifestBlock = await rawBlock(manifest);

  const { writer, out } = CarWriter.create([manifestBlock.cid]);
  const bytesPromise = collectBytes(out);
  await writer.put(manifestBlock);
  for (const block of receiptBlocks) {
    await writer.put(block);
  }
  await writer.close();
  const bytes = await bytesPromise;

  return {
    bytes,
    rootCid: manifestBlock.cid.toString(),
    manifest,
    batch,
  };
}

function parseCanonicalJson(bytes, label) {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const value = JSON.parse(text);
  assert(canonicalizeEvidenceDocument(value) === text, `${label} is not canonical JSON`);
  assertNoForbiddenKeys(value);
  return value;
}

async function assertBlockMatchesCid(block, expectedCid, label) {
  const digest = await sha256.digest(block.bytes);
  const actualCid = CID.createV1(raw.code, digest);
  assert(actualCid.equals(expectedCid), `${label} CID hash does not match its bytes`);
}

function assertExactKeys(value, expected, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assert(
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort()),
    `${label} has missing or unknown fields`,
  );
}

export async function verifyFilecoinEvidenceBundle(bytes) {
  assert(bytes instanceof Uint8Array, 'CAR bundle must be a Uint8Array');
  assert(bytes.byteLength > 0 && bytes.byteLength <= MAX_BUNDLE_BYTES, 'CAR bundle size is invalid');

  const reader = await CarReader.fromBytes(bytes);
  const roots = await reader.getRoots();
  assert(roots.length === 1, 'CAR bundle must contain exactly one root');

  const manifestBlock = await reader.get(roots[0]);
  assert(manifestBlock, 'CAR root block is missing');
  await assertBlockMatchesCid(manifestBlock, roots[0], 'Manifest');
  const manifest = parseCanonicalJson(manifestBlock.bytes, 'Manifest');
  assertExactKeys(manifest, [
    'schema_version',
    'storage_profile',
    'batch_ref',
    'merkle_root',
    'leaf_count',
    'tree_algorithm',
    'ordering',
    'receipts',
  ], 'Manifest');
  assert(manifest.schema_version === FILECOIN_BUNDLE_SCHEMA_VERSION, 'Unsupported bundle schema');
  assert(manifest.storage_profile === 'filecoin-onchain-cloud/car-v1', 'Unsupported storage profile');
  assert(Array.isArray(manifest.receipts), 'Manifest receipts must be an array');
  assert(manifest.receipts.length === manifest.leaf_count, 'Manifest leaf count does not match receipts');
  assert(manifest.leaf_count > 0 && manifest.leaf_count <= 10_000, 'Manifest leaf count is invalid');

  const seenReceiptIds = new Set();
  const seenCids = new Set();
  const proofs = [];

  for (let index = 0; index < manifest.receipts.length; index += 1) {
    const descriptor = manifest.receipts[index];
    assertExactKeys(descriptor, ['receipt_id', 'leaf_index', 'cid'], 'Receipt descriptor');
    assert(descriptor.leaf_index === index, 'Receipt descriptors must be contiguous and ordered');
    assert(!seenReceiptIds.has(descriptor.receipt_id), 'Duplicate receipt_id in manifest');
    assert(!seenCids.has(descriptor.cid), 'Duplicate receipt CID in manifest');
    seenReceiptIds.add(descriptor.receipt_id);
    seenCids.add(descriptor.cid);

    const cid = CID.parse(descriptor.cid);
    const block = await reader.get(cid);
    assert(block, `Receipt proof block is missing: ${descriptor.cid}`);
    await assertBlockMatchesCid(block, cid, 'Receipt proof');
    const proof = parseCanonicalJson(block.bytes, 'Receipt proof');
    assertExactKeys(proof, [
      'schema_version',
      'batch_ref',
      'merkle_root',
      'receipt_id',
      'commitment_hash',
      'occurred_at',
      'leaf_index',
      'leaf_hash',
      'proof',
    ], 'Receipt proof');
    assert(proof.schema_version === FILECOIN_RECEIPT_PROOF_SCHEMA_VERSION, 'Unsupported receipt proof schema');
    assert(proof.batch_ref === manifest.batch_ref, 'Receipt proof batch_ref mismatch');
    assert(proof.merkle_root === manifest.merkle_root, 'Receipt proof Merkle root mismatch');
    assert(proof.receipt_id === descriptor.receipt_id, 'Receipt proof receipt_id mismatch');
    assert(proof.leaf_index === descriptor.leaf_index, 'Receipt proof leaf_index mismatch');
    assert(
      proof.leaf_hash === sha256Hex(`swisstokint:proof-leaf:v1:${proof.commitment_hash}`),
      'Receipt proof leaf hash mismatch',
    );
    assert(
      verifyMerkleProof(proof.commitment_hash, proof.proof, manifest.merkle_root),
      'Receipt Merkle proof is invalid',
    );
    proofs.push(proof);
  }

  let blockCount = 0;
  for await (const ignored of reader.blocks()) {
    void ignored;
    blockCount += 1;
  }
  assert(blockCount === manifest.leaf_count + 1, 'CAR bundle contains unreferenced blocks');

  return {
    ok: true,
    rootCid: roots[0].toString(),
    manifest,
    proofs,
    blockCount,
    byteLength: bytes.byteLength,
  };
}

export async function inspectSynapseUpload(synapse, bytes) {
  assert(synapse?.storage?.prepare instanceof Function, 'Synapse storage.prepare is required');
  assert(bytes instanceof Uint8Array && bytes.byteLength >= 127, 'Synapse upload requires at least 127 bytes');
  return synapse.storage.prepare({ dataSize: BigInt(bytes.byteLength) });
}

export async function uploadAndVerifyWithSynapse(synapse, bytes, options = {}) {
  assert(options.confirm === true, 'confirm=true is required for a Filecoin upload');
  assert(synapse?.storage?.upload instanceof Function, 'Synapse storage.upload is required');
  assert(synapse?.storage?.download instanceof Function, 'Synapse storage.download is required');

  const preparation = await inspectSynapseUpload(synapse, bytes);
  assert(
    !preparation.transaction,
    'Synapse account funding or approval is required; execute that transaction outside this adapter',
  );

  const upload = await synapse.storage.upload(bytes);
  assert(upload?.pieceCid, 'Synapse upload did not return a PieceCID');
  assert(upload.complete === true, 'Synapse upload did not complete all requested copies');
  const downloaded = await synapse.storage.download({ pieceCid: upload.pieceCid });
  assert(downloaded instanceof Uint8Array, 'Synapse download did not return bytes');
  assert(
    downloaded.byteLength === bytes.byteLength
      && crypto.timingSafeEqual(Buffer.from(downloaded), Buffer.from(bytes)),
    'Retrieved Filecoin bundle does not match the uploaded bytes',
  );

  return {
    pieceCid: upload.pieceCid.toString(),
    size: upload.size,
    copies: upload.copies?.length ?? 0,
    verifiedByteLength: downloaded.byteLength,
  };
}
