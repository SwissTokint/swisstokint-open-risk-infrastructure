#!/usr/bin/env node

import fs from 'node:fs';

import { buildMerkleBatch } from '../sdk/typescript/swisstokint-proof.mjs';

const inputPath = process.argv[2];
if (!inputPath) {
  throw new Error('Usage: node scripts/build-proof-batch.mjs <receipts.json>');
}

const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const batch = buildMerkleBatch(input);
process.stdout.write(`${JSON.stringify(batch, null, 2)}\n`);
