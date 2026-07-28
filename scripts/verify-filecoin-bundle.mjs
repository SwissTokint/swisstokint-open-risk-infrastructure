#!/usr/bin/env node

import fs from 'node:fs';

import { verifyFilecoinEvidenceBundle } from '../sdk/typescript/filecoin-evidence-bundle.mjs';

const inputPath = process.argv[2];
if (!inputPath) {
  throw new Error('Usage: node scripts/verify-filecoin-bundle.mjs <bundle.car>');
}

const result = await verifyFilecoinEvidenceBundle(fs.readFileSync(inputPath));
process.stdout.write(`${JSON.stringify({
  ok: result.ok,
  root_cid: result.rootCid,
  batch_ref: result.manifest.batch_ref,
  merkle_root: result.manifest.merkle_root,
  receipt_count: result.proofs.length,
  block_count: result.blockCount,
  byte_length: result.byteLength,
}, null, 2)}\n`);
