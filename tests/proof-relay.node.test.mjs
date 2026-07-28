import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const relay = fileURLToPath(new URL('../scripts/proof-receipt-relay.mjs', import.meta.url));
const fixture = fs.readFileSync(
  new URL('../schemas/examples/proof-event-v0.2.json', import.meta.url),
  'utf8',
);

function runRelay(input, environment = {}) {
  return spawnSync(process.execPath, [relay], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PROOF_RECEIPT_DRY_RUN: 'true',
      ...environment,
    },
    input,
  });
}

test('relay dry-run emits a compact receipt without the raw payload', () => {
  const result = runRelay(fixture);
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.dry_run, true);
  assert.equal('payload' in output.wire_receipt, false);
  assert.match(output.wire_receipt.payload_hash, /^[a-f0-9]{64}$/);
});

test('relay rejects oversized stdin before parsing JSON', () => {
  const result = runRelay(`{"padding":"${'x'.repeat(70 * 1024)}"}`);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /64 KiB safety limit/);
});

test('relay rejects ambiguous secret sources', () => {
  const secretDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'swisstokint-relay-'));
  const secretPath = path.join(secretDirectory, 'ingest');
  try {
    fs.writeFileSync(secretPath, 'f'.repeat(64), { encoding: 'utf8', mode: 0o600 });
    const result = runRelay(fixture, {
      PROOF_RECEIPT_DRY_RUN: 'false',
      SWISSTOKINT_PROOF_RECEIPT_URL: 'https://example.invalid/receipts',
      PROOF_RECEIPT_INGEST_SECRET: 'e'.repeat(64),
      PROOF_RECEIPT_INGEST_SECRET_FILE: secretPath,
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /only one ingest-secret source/);
  } finally {
    fs.rmSync(secretDirectory, { recursive: true, force: true });
  }
});

test('relay requires HTTPS before reading an ingest secret', () => {
  const result = runRelay(fixture, {
    PROOF_RECEIPT_DRY_RUN: 'false',
    SWISSTOKINT_PROOF_RECEIPT_URL: 'http://example.invalid/receipts',
    PROOF_RECEIPT_INGEST_SECRET: 'e'.repeat(64),
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must use HTTPS/);
});
