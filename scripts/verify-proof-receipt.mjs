#!/usr/bin/env node

import { verifyStoredReceipt } from '../sdk/typescript/swisstokint-proof.mjs';

const target = process.argv[2];
const siteUrl = (process.env.SWISSTOKINT_SITE_URL ?? 'https://swisstokint.ch').replace(/\/+$/, '');

if (!target) {
  throw new Error('Usage: node scripts/verify-proof-receipt.mjs <receipt-id-or-api-url>');
}

const endpoint = /^https?:\/\//i.test(target)
  ? target
  : `${siteUrl}/api/proof-of-method/receipts/${encodeURIComponent(target)}`;

const response = await fetch(endpoint, {
  headers: { Accept: 'application/json' },
  redirect: 'error',
});

if (!response.ok) {
  throw new Error(`Unable to load receipt (${response.status})`);
}

const body = await response.json();
if (!body?.receipt) {
  throw new Error('Response does not contain a proof receipt');
}

const verification = verifyStoredReceipt(body.receipt);
const result = {
  ok: verification.ok,
  receipt_id: body.receipt.receipt_id,
  schema_version: body.receipt.schema_version,
  assurance_level: body.receipt.anchor_status === 'anchored' ? 'L1' : 'L0',
  checks: {
    commitment_hash: verification.commitmentHashValid,
    commitment_fields: verification.commitmentFieldsValid,
    ed25519_signature: verification.signatureValid,
  },
  anchor_status: body.receipt.anchor_status,
  anchor_reference: body.receipt.anchor_reference,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!verification.ok) process.exitCode = 1;
