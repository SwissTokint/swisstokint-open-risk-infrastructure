#!/usr/bin/env node

import fs from 'node:fs';

/**
 * Proof of Method relay
 *
 * Reads one compact JSON event from stdin and sends an authenticated receipt to
 * SwissTokint. Keep this script inside the private Docker environment that
 * owns the strategy event. It must never receive an exchange credential,
 * account balance, wallet seed or raw member data.
 */

import {
  createWireReceipt,
  prepareCommitment,
  submitReceipt,
} from '../sdk/typescript/swisstokint-proof.mjs';

const endpoint = process.env.SWISSTOKINT_PROOF_RECEIPT_URL;
const sourceKeyId = process.env.PROOF_RECEIPT_SOURCE_KEY_ID ?? 'docker-relay-v1';
const dryRun = process.env.PROOF_RECEIPT_DRY_RUN === 'true';
const maxInputBytes = 64 * 1024;

function readIngestSecret() {
  const inlineSecret = process.env.PROOF_RECEIPT_INGEST_SECRET;
  const secretFile = process.env.PROOF_RECEIPT_INGEST_SECRET_FILE;

  if (inlineSecret && secretFile) {
    throw new Error('Set only one ingest-secret source.');
  }

  let value = inlineSecret;
  if (secretFile) {
    const file = fs.statSync(secretFile);
    if (!file.isFile() || file.size > 4096) {
      throw new Error('The ingest-secret file must be a regular file smaller than 4 KiB.');
    }
    value = fs.readFileSync(secretFile, 'utf8').trim();
  }

  if (!value || Buffer.byteLength(value, 'utf8') < 32) {
    throw new Error('The ingest secret must contain at least 32 bytes.');
  }
  return value;
}

let secret;
if (!dryRun) {
  if (!endpoint) {
    throw new Error('SWISSTOKINT_PROOF_RECEIPT_URL is required.');
  }
  const parsedEndpoint = new URL(endpoint);
  if (parsedEndpoint.protocol !== 'https:') {
    throw new Error('The receipt endpoint must use HTTPS.');
  }
  secret = readIngestSecret();
}

const rawInput = await new Promise((resolve, reject) => {
  let input = '';
  let inputBytes = 0;
  let settled = false;
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    if (settled) return;
    inputBytes += Buffer.byteLength(chunk, 'utf8');
    if (inputBytes > maxInputBytes) {
      settled = true;
      process.stdin.pause();
      reject(new Error('Input exceeds the 64 KiB safety limit.'));
      return;
    }
    input += chunk;
  });
  process.stdin.on('end', () => {
    if (!settled) resolve(input);
  });
  process.stdin.on('error', (error) => {
    if (!settled) reject(error);
  });
});

if (!rawInput.trim()) {
  throw new Error('Expected exactly one JSON event on stdin.');
}

let input;
try {
  input = JSON.parse(rawInput);
} catch {
  throw new Error('Input is not valid JSON.');
}

if (!input || typeof input !== 'object' || Array.isArray(input)) {
  throw new Error('Input must be a JSON object.');
}

const requiredText = ['kind', 'subject_ref', 'method_hash', 'risk_policy_hash'];
for (const key of requiredText) {
  if (typeof input[key] !== 'string' || !input[key].trim()) {
    throw new Error(`Missing required string: ${key}.`);
  }
}

if (!input.payload || typeof input.payload !== 'object' || Array.isArray(input.payload)) {
  throw new Error('payload must be a compact JSON object.');
}

const receipt = createWireReceipt({
  ...input,
  method_hash: input.method_hash.toLowerCase(),
  risk_policy_hash: input.risk_policy_hash.toLowerCase(),
}, { sourceKeyId });

// createWireReceipt hashes the safe payload locally and removes it from the
// wire receipt. submitReceipt sends only the compact commitment fields.
if (dryRun) {
  process.stdout.write(`${JSON.stringify({
    dry_run: true,
    wire_receipt: receipt,
    preview: prepareCommitment(receipt),
  })}\n`);
  process.exit(0);
}

const result = await submitReceipt(endpoint, receipt, secret);
process.stdout.write(`${JSON.stringify(result)}\n`);
