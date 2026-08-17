import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  parseStellarTestnetEvidenceJson,
  verifyStellarTestnetEvidence,
} from '../scripts/verify-stellar-testnet-evidence.mjs';

const rawManifest = readFileSync(
  new URL('../deployments/stellar-testnet-v0.1.json', import.meta.url),
  'utf8',
);
const manifest = parseStellarTestnetEvidenceJson(rawManifest);

test('Stellar evidence manifest is structurally consistent and keeps every non-proof claim false', () => {
  const result = verifyStellarTestnetEvidence(manifest);
  assert.equal(result.ok, true);
  assert.equal(result.network, 'stellar:testnet');
  assert.equal(result.claims.audited, false);
  assert.equal(result.claims.grant_awarded, false);
});

test('Stellar evidence verifier rejects claim inflation and contradictory fixture outcomes', () => {
  const inflated = structuredClone(manifest);
  inflated.claims.audited = true;
  assert.throws(() => verifyStellarTestnetEvidence(inflated), /claims\.audited must remain false/);

  const contradicted = structuredClone(manifest);
  contradicted.revocation_fixture.verification_result_after_revocation = true;
  assert.throws(() => verifyStellarTestnetEvidence(contradicted), /rejected revoked verification result/);
});

test('Stellar evidence verifier rejects malformed identifiers and reused lifecycle transactions', () => {
  const malformed = structuredClone(manifest);
  malformed.contract_id = 'CA6V2EUE';
  assert.throws(() => verifyStellarTestnetEvidence(malformed), /contract_id must be a Stellar contract identifier/);

  const reused = structuredClone(manifest);
  reused.revocation_fixture.revocation_transaction = reused.active_fixture.registration_transaction;
  assert.throws(() => verifyStellarTestnetEvidence(reused), /Evidence manifest transaction references must not be reused/);
});

test('Stellar evidence verifier enforces StrKey type and checksum', () => {
  const accountAsContract = structuredClone(manifest);
  accountAsContract.contract_id = manifest.deployer;
  assert.throws(() => verifyStellarTestnetEvidence(accountAsContract), /contract_id must be a Stellar contract identifier/);

  const contractAsAccount = structuredClone(manifest);
  contractAsAccount.deployer = manifest.contract_id;
  assert.throws(() => verifyStellarTestnetEvidence(contractAsAccount), /deployer must be a Stellar public key/);

  const badChecksum = structuredClone(manifest);
  badChecksum.contract_id = `${manifest.contract_id.slice(0, -1)}${manifest.contract_id.endsWith('A') ? 'B' : 'A'}`;
  assert.throws(() => verifyStellarTestnetEvidence(badChecksum), /contract_id must be a Stellar contract identifier/);
});

test('Stellar evidence verifier rejects impossible ISO calendar dates', () => {
  const impossibleDate = structuredClone(manifest);
  impossibleDate.deployed_at = '2026-02-30';
  assert.throws(() => verifyStellarTestnetEvidence(impossibleDate), /deployed_at must be an ISO calendar date/);
});

test('Stellar evidence parser rejects duplicate and escape-equivalent JSON keys', () => {
  const cases = [
    rawManifest.replace('{', '{\n  "network": "stellar:mainnet",'),
    rawManifest.replace('"wasm": {', '"wasm": {\n    "sha256": "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",'),
    rawManifest.replace('{', '{\n  "netw\\u006frk": "stellar:mainnet",'),
  ];

  for (const json of cases) {
    assert.throws(() => parseStellarTestnetEvidenceJson(json), /duplicate JSON object key/);
  }
});
