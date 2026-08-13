import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  compareUnicodeScalars,
  enumerateRegularFiles,
  sha256Bytes,
} from './pom-rx-v01-fixture-contract.mjs';

const SOURCE_BASELINE = '743b8082bfc925d1681af7a239856a0b4f7e8464';
const SOURCE_FILES = Object.freeze([
  ['sdk/typescript/pom-rx.mjs', 'd6af19d4e049fa1721bbd858f0836d317725baf6', '28bfb41a51126548226472a34b382a05531a9e2b954a61fd959818fe6a9b6047'],
  ['sdk/typescript/swisstokint-proof.mjs', '920191088a93d506889f2985c572ea8fea717266', '1d2cfbc5c494ee0e54a92b763b2f4563ffd9390fa51ec6071b5b044439db08d5'],
  ['tests/pom-rx-integrity-baseline.node.test.mjs', '3c7b45d88867f7e7d2079135f6198465c586a953', '894980913739968195c34d8ed9e37c98a2b2b87c8ee7d64d75f7b92a76616f1e'],
  ['scripts/assert-pom-rx-integrity-baseline-red.mjs', 'e8b7607bb59dc445627618c244fd41d3f7564b6a', '7307866a1301bfed7cc9a2afc238b617d9d0beca96afac47eb05502a2b6984f4'],
]);
const EXPECTED_RUNTIME = Object.freeze({
  node: '24.16.0', icu: '78.3', unicode: '17.0', locale: 'fr-CH', platform: 'win32', arch: 'x64',
});
const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), '..');
const versionRoot = path.join(repositoryRoot, 'fixtures', 'pom-rx', 'v0.1-compat', '1');
const pinsPath = path.join(repositoryRoot, 'fixtures', 'pom-rx', 'v0.1-compat', 'pins.json');

function runGit(args, options = {}) {
  return execFileSync('git', args, { cwd: repositoryRoot, encoding: options.encoding ?? 'utf8', windowsHide: true });
}

function measureRuntime() {
  return {
    node: process.versions.node,
    icu: process.versions.icu,
    unicode: process.versions.unicode,
    locale: new Intl.Collator().resolvedOptions().locale,
    platform: process.platform,
    arch: process.arch,
  };
}

function assertRuntime() {
  assert.deepEqual(measureRuntime(), EXPECTED_RUNTIME, 'fixture generation requires the exact reviewed runtime tuple');
}

function bindFrozenSource() {
  for (const [relativePath, expectedBlob, expectedSha] of SOURCE_FILES) {
    const blob = runGit(['rev-parse', `${SOURCE_BASELINE}:${relativePath}`]).trim();
    assert.equal(blob, expectedBlob, `Git blob mismatch for ${relativePath}`);
    const bytes = runGit(['cat-file', 'blob', `${SOURCE_BASELINE}:${relativePath}`], { encoding: null });
    assert.equal(sha256Bytes(bytes), expectedSha, `raw Git blob digest mismatch for ${relativePath}`);
  }
  const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'pomrx-v01-source-'));
  const sourceRoot = path.join(temporaryRoot, 'source');
  runGit(['-c', 'core.autocrlf=false', '-c', 'core.eol=lf', 'worktree', 'add', '--detach', sourceRoot, SOURCE_BASELINE]);
  for (const [relativePath, , expectedSha] of SOURCE_FILES) {
    assert.equal(sha256Bytes(readFileSync(path.join(sourceRoot, ...relativePath.split('/')))), expectedSha, `detached source bytes mismatch for ${relativePath}`);
  }
  return { temporaryRoot, sourceRoot };
}

function cleanFrozenSource(binding) {
  const expectedPrefix = `${path.resolve(os.tmpdir())}${path.sep}`;
  assert.ok(path.resolve(binding.temporaryRoot).startsWith(expectedPrefix), 'refusing to clean a non-temporary source worktree');
  runGit(['worktree', 'remove', '--force', binding.sourceRoot]);
  rmSync(binding.temporaryRoot, { recursive: true, force: true });
}

const hash = (character) => character.repeat(64);
const shared = Object.freeze({
  schema_version: 'pom-rx/0.1',
  run_id: 'run_pomrx_integrity_20260808',
  agent_ref: 'eip155:84532:erc8004:agent-42',
  subject_ref: 'market:BTC-USD',
  method_hash: hash('a'),
  policy_hash: hash('b'),
  input_commitment: hash('c'),
  action_commitment: hash('d'),
  source_key_id: 'pom-rx-integrity-key',
});

function assertion(ruleId, result = 'pass') {
  return { rule_id: ruleId, rule_hash: hash('e'), result, proof_mode: 'commitment', evidence_hash: hash('f') };
}

function makePreflight(overrides = {}) {
  return { ...shared, receipt_id: 'receipt_preflight_integrity_20260808', phase: 'preflight', outcome: 'allow', assertions: [assertion('preflight-policy')], previous_receipt_hash: null, occurred_at: '2026-08-08T10:00:00.000Z', ...overrides };
}

function makeExecution(previousReceiptHash, overrides = {}) {
  return { ...shared, receipt_id: 'receipt_execution_integrity_20260808', phase: 'execution', outcome: 'accepted', assertions: [assertion('execution-accepted')], previous_receipt_hash: previousReceiptHash, occurred_at: '2026-08-08T10:00:01.000Z', ...overrides };
}

function makeReconciliation(previousReceiptHash, overrides = {}) {
  return { ...shared, receipt_id: 'receipt_reconciliation_integrity_20260808', phase: 'reconciliation', outcome: 'matched', assertions: [assertion('reconciliation-match')], previous_receipt_hash: previousReceiptHash, occurred_at: '2026-08-08T10:00:02.000Z', ...overrides };
}

function pretty(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function write(relativePath, bytes) {
  const destination = path.join(versionRoot, ...relativePath.split('/'));
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, bytes);
}

function buildScenarioDefinitions(commitPomRxReceipt) {
  const p = () => makePreflight();
  const e = (preflight, overrides) => makeExecution(commitPomRxReceipt(preflight).receiptHash, overrides);
  const r = (execution, overrides) => makeReconciliation(commitPomRxReceipt(execution).receiptHash, overrides);
  const controlP = p(); const controlE = e(controlP); const controlR = r(controlE);
  const actionP = p(); const actionE = e(actionP, { action_commitment: hash('1') });
  const actionReconP = p(); const actionReconE = e(actionReconP); const actionReconR = r(actionReconE, { action_commitment: hash('1') });
  const inputP = p(); const inputE = e(inputP, { input_commitment: hash('2') });
  const executionFailP = p(); const executionFailE = e(executionFailP, { assertions: [assertion('execution-accepted', 'fail')] });
  const reconciliationFailP = p(); const reconciliationFailE = e(reconciliationFailP); const reconciliationFailR = r(reconciliationFailE, { assertions: [assertion('reconciliation-match', 'fail')] });
  const duplicateP = p(); const duplicateE = e(duplicateP, { receipt_id: duplicateP.receipt_id });
  return [
    ['valid-control', 'valid-control', false, [controlP, controlE, controlR]],
    ['POMRX-001-ACTION-PREFLIGHT-EXECUTION', 'known-vulnerable', true, [actionP, actionE]],
    ['POMRX-001-ACTION-EXECUTION-RECONCILIATION', 'known-vulnerable', false, [actionReconP, actionReconE, actionReconR]],
    ['POMRX-001-INPUT-PREFLIGHT-EXECUTION', 'known-vulnerable', true, [inputP, inputE]],
    ['POMRX-006-EXECUTION-FAIL-ASSERTION', 'known-vulnerable', true, [executionFailP, executionFailE]],
    ['POMRX-006-RECONCILIATION-FAIL-ASSERTION', 'known-vulnerable', false, [reconciliationFailP, reconciliationFailE, reconciliationFailR]],
    ['POMRX-007-DUPLICATE-RECEIPT-ID', 'known-vulnerable', true, [duplicateP, duplicateE]],
    ['POMRX-001-SURROGATE-ACK-ACTION-SUBSTITUTION', 'known-vulnerable', true, [actionP, actionE]],
  ];
}

async function main() {
  assertRuntime();
  assert.equal(existsSync(versionRoot), false, 'fixture generator only writes to an absent version root');
  assert.equal(existsSync(pinsPath), false, 'fixture generator refuses to overwrite pins.json');
  const binding = bindFrozenSource();
  try {
    const pomRxPath = path.join(binding.sourceRoot, 'sdk', 'typescript', 'pom-rx.mjs');
    const proofPath = path.join(binding.sourceRoot, 'sdk', 'typescript', 'swisstokint-proof.mjs');
    const pomRxUrl = pathToFileURL(pomRxPath).href;
    const sourceBefore = sha256Bytes(readFileSync(pomRxPath));
    const proofBefore = sha256Bytes(readFileSync(proofPath));
    assert.equal(sourceBefore, SOURCE_FILES[0][2]);
    const module = await import(`${pomRxUrl}?fixture-generation=1`);
    mkdirSync(versionRoot, { recursive: true });
    const scenarios = [];
    for (const [scenarioId, classification, allowPartial, receipts] of buildScenarioDefinitions(module.commitPomRxReceipt)) {
      const chainPath = `chains/${scenarioId}.json`;
      write(chainPath, pretty(receipts));
      const canonicalPaths = [];
      const expectedHashes = [];
      receipts.forEach((receipt, receiptIndex) => {
        const committed = module.commitPomRxReceipt(receipt);
        const canonicalPath = `canonical/${scenarioId}/${receiptIndex}.json`;
        write(canonicalPath, Buffer.from(committed.canonicalReceipt, 'utf8'));
        canonicalPaths.push(canonicalPath);
        expectedHashes.push(committed.receiptHash);
      });
      const legacy = module.verifyPomRxChain(receipts, { allowPartial });
      assert.deepEqual(Object.keys(legacy), ['ok', 'status', 'receipt_hashes']);
      assert.equal(legacy.ok, true);
      assert.deepEqual(legacy.receipt_hashes, expectedHashes);
      scenarios.push({
        scenario_id: scenarioId,
        classification,
        allow_partial: allowPartial,
        chain_path: chainPath,
        canonical_paths: canonicalPaths,
        expected_legacy_qualification: 'LEGACY_ACCEPTANCE_OBSERVED',
        expected_legacy_status: legacy.status,
        expected_legacy_receipt_hashes: expectedHashes,
        evidence_defect_id: scenarioId === 'valid-control' ? null : scenarioId,
      });
    }
    write('canaries/localecompare-order-v1.input.json', Buffer.from('["a-a","a.a","a_a"]', 'utf8'));
    write('canaries/localecompare-order-v1.expected.json', Buffer.from('["a_a","a-a","a.a"]', 'utf8'));
    const manifest = {
      fixture_schema_version: 'pom-rx-v0.1-compat-fixtures/1',
      receipt_schema_version: 'pom-rx/0.1',
      hash_domain: 'swisstokint:pom-rx:v1:',
      source_repository: 'https://github.com/SwissTokint/swisstokint-open-risk-infrastructure',
      source_baseline: SOURCE_BASELINE,
      generated_with_node: EXPECTED_RUNTIME.node,
      generated_with_icu: EXPECTED_RUNTIME.icu,
      generated_with_unicode: EXPECTED_RUNTIME.unicode,
      generated_with_locale: EXPECTED_RUNTIME.locale,
      generated_with_platform: EXPECTED_RUNTIME.platform,
      generated_with_arch: EXPECTED_RUNTIME.arch,
      scenarios,
      canaries: [{
        canary_id: 'localecompare-order-v1',
        input_path: 'canaries/localecompare-order-v1.input.json',
        expected_path: 'canaries/localecompare-order-v1.expected.json',
        comparator: 'javascript-string-localeCompare',
        expected_sha256: '3707fd4c6e3322d3cbc6e1c3c7d68b669d2f409b8b675d1b4d8c70519b95e9d7',
      }],
    };
    write('manifest.json', pretty(manifest));
    const files = enumerateRegularFiles(versionRoot).sort(compareUnicodeScalars);
    assert.equal(files.length, 30, 'version root must contain 30 files before checksums.sha256');
    const checksumBytes = Buffer.from(`${files.map((relativePath) => `${sha256Bytes(readFileSync(path.join(versionRoot, ...relativePath.split('/'))))}  ${relativePath}`).join('\n')}\n`, 'ascii');
    writeFileSync(path.join(versionRoot, 'checksums.sha256'), checksumBytes);
    const fixtureSetSha256 = sha256Bytes(Buffer.concat([Buffer.from('pom-rx-v0.1-fixture-set/1\n', 'ascii'), checksumBytes]));
    mkdirSync(path.dirname(pinsPath), { recursive: true });
    writeFileSync(pinsPath, pretty({
      pin_schema_version: 'pom-rx-v0.1-compat-pins/1',
      pins: [{ fixture_version: 1, source_baseline: SOURCE_BASELINE, fixture_set_sha256: fixtureSetSha256 }],
    }));
    assert.equal(sha256Bytes(readFileSync(pomRxPath)), sourceBefore, 'source module changed during generation');
    assert.equal(sha256Bytes(readFileSync(proofPath)), proofBefore, 'source dependency changed during generation');
    console.log(JSON.stringify({ status: 'FIXTURE_CORPUS_GENERATED', scenarios: scenarios.length, regular_files: 31, fixture_set_sha256: fixtureSetSha256 }, null, 2));
  } catch (error) {
    if (existsSync(versionRoot)) rmSync(versionRoot, { recursive: true, force: true });
    if (existsSync(pinsPath)) rmSync(pinsPath, { force: true });
    throw error;
  } finally {
    cleanFrozenSource(binding);
  }
}

await main();
