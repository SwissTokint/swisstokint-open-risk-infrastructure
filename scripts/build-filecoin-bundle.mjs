#!/usr/bin/env node

import fs from 'node:fs';

import { buildFilecoinEvidenceBundle } from '../sdk/typescript/filecoin-evidence-bundle.mjs';

const inputPath = process.argv[2];
const outputPath = process.argv[3];
if (!inputPath || !outputPath) {
  throw new Error('Usage: node scripts/build-filecoin-bundle.mjs <receipts.json> <bundle.car>');
}

const receipts = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const bundle = await buildFilecoinEvidenceBundle(receipts);
fs.writeFileSync(outputPath, bundle.bytes, { flag: 'wx' });
process.stdout.write(`${JSON.stringify({
  root_cid: bundle.rootCid,
  batch_ref: bundle.manifest.batch_ref,
  merkle_root: bundle.manifest.merkle_root,
  receipt_count: bundle.manifest.leaf_count,
  byte_length: bundle.bytes.byteLength,
  output: outputPath,
}, null, 2)}\n`);
