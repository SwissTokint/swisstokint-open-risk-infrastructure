#!/usr/bin/env node

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
const secret = process.env.PROOF_RECEIPT_INGEST_SECRET;
const sourceKeyId = process.env.PROOF_RECEIPT_SOURCE_KEY_ID ?? 'docker-relay-v1';
const dryRun = process.env.PROOF_RECEIPT_DRY_RUN === 'true';

if (!dryRun && (!endpoint || !secret)) {
  throw new Error('SWISSTOKINT_PROOF_RECEIPT_URL and PROOF_RECEIPT_INGEST_SECRET are required.');
}

const rawInput = await new Promise((resolve, reject) => {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => resolve(input));
  process.stdin.on('error', reject);
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
