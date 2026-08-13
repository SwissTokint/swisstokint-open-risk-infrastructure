import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  CASE_FOLDING_SHA256,
  FixtureContractError,
  assertExactKeys,
  assertNoFoldAliases,
  compareUnicodeScalars,
  enumerateRegularFiles,
  fail,
  loadUnicode17CaseFold,
  parseChecksums,
  parseExactJson,
  readRegularFile,
  sha256Bytes,
  validateFixturePath,
} from './pom-rx-v01-fixture-contract.mjs';

const SOURCE_BASELINE = '743b8082bfc925d1681af7a239856a0b4f7e8464';
const SOURCE_FILES = Object.freeze([
  ['sdk/typescript/pom-rx.mjs', 'd6af19d4e049fa1721bbd858f0836d317725baf6', '28bfb41a51126548226472a34b382a05531a9e2b954a61fd959818fe6a9b6047'],
  ['sdk/typescript/swisstokint-proof.mjs', '920191088a93d506889f2985c572ea8fea717266', '1d2cfbc5c494ee0e54a92b763b2f4563ffd9390fa51ec6071b5b044439db08d5'],
  ['tests/pom-rx-integrity-baseline.node.test.mjs', '3c7b45d88867f7e7d2079135f6198465c586a953', '894980913739968195c34d8ed9e37c98a2b2b87c8ee7d64d75f7b92a76616f1e'],
  ['scripts/assert-pom-rx-integrity-baseline-red.mjs', 'e8b7607bb59dc445627618c244fd41d3f7564b6a', '7307866a1301bfed7cc9a2afc238b617d9d0beca96afac47eb05502a2b6984f4'],
]);
const EXPECTED_RUNTIME = Object.freeze({ node: '24.16.0', icu: '78.3', unicode: '17.0', locale: 'fr-CH', platform: 'win32', arch: 'x64' });
const EXPECTED_SCENARIOS = Object.freeze([
  ['valid-control', 'valid-control', false, 3, 'reconciliation:matched'],
  ['POMRX-001-ACTION-PREFLIGHT-EXECUTION', 'known-vulnerable', true, 2, 'execution:accepted'],
  ['POMRX-001-ACTION-EXECUTION-RECONCILIATION', 'known-vulnerable', false, 3, 'reconciliation:matched'],
  ['POMRX-001-INPUT-PREFLIGHT-EXECUTION', 'known-vulnerable', true, 2, 'execution:accepted'],
  ['POMRX-006-EXECUTION-FAIL-ASSERTION', 'known-vulnerable', true, 2, 'execution:accepted'],
  ['POMRX-006-RECONCILIATION-FAIL-ASSERTION', 'known-vulnerable', false, 3, 'reconciliation:matched'],
  ['POMRX-007-DUPLICATE-RECEIPT-ID', 'known-vulnerable', true, 2, 'execution:accepted'],
  ['POMRX-001-SURROGATE-ACK-ACTION-SUBSTITUTION', 'known-vulnerable', true, 2, 'execution:accepted'],
]);
const MANIFEST_KEYS = Object.freeze(['fixture_schema_version', 'receipt_schema_version', 'hash_domain', 'source_repository', 'source_baseline', 'generated_with_node', 'generated_with_icu', 'generated_with_unicode', 'generated_with_locale', 'generated_with_platform', 'generated_with_arch', 'scenarios', 'canaries']);
const SCENARIO_KEYS = Object.freeze(['scenario_id', 'classification', 'allow_partial', 'chain_path', 'canonical_paths', 'expected_legacy_qualification', 'expected_legacy_status', 'expected_legacy_receipt_hashes', 'evidence_defect_id']);
const RECEIPT_KEYS = Object.freeze(['schema_version', 'run_id', 'agent_ref', 'subject_ref', 'method_hash', 'policy_hash', 'input_commitment', 'action_commitment', 'source_key_id', 'receipt_id', 'phase', 'outcome', 'assertions', 'previous_receipt_hash', 'occurred_at']);
const ASSERTION_KEYS = Object.freeze(['rule_id', 'rule_hash', 'result', 'proof_mode', 'evidence_hash']);
const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), '..');

function measureRuntime() {
  return { node: process.versions.node, icu: process.versions.icu, unicode: process.versions.unicode, locale: new Intl.Collator().resolvedOptions().locale, platform: process.platform, arch: process.arch };
}

function assertRuntime() {
  const actual = measureRuntime();
  if (JSON.stringify(actual) !== JSON.stringify(EXPECTED_RUNTIME)) fail('ENVIRONMENT_MISMATCH', 'runtime tuple differs from immutable fixture provenance', { expected: EXPECTED_RUNTIME, actual });
}

function assertPrettyJson(bytes, value, label) {
  const expected = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
  if (!bytes.equals(expected)) fail('JSON_SERIALIZATION_INVALID', `${label} is not exact two-space JSON with one terminal LF`);
}

export function validatePins(bytes) {
  const pins = parseExactJson(bytes, 'pins.json');
  assertExactKeys(pins, ['pin_schema_version', 'pins'], 'pins.json');
  if (pins.pin_schema_version !== 'pom-rx-v0.1-compat-pins/1' || !Array.isArray(pins.pins) || pins.pins.length !== 1) fail('PIN_SCHEMA_INVALID', 'pins.json schema or cardinality differs');
  const pin = pins.pins[0];
  assertExactKeys(pin, ['fixture_version', 'source_baseline', 'fixture_set_sha256'], 'pins[0]');
  if (pin.fixture_version !== 1 || pin.source_baseline !== SOURCE_BASELINE || !/^[0-9a-f]{64}$/u.test(pin.fixture_set_sha256)) fail('PIN_SCHEMA_INVALID', 'version-1 pin fields differ');
  assertPrettyJson(bytes, pins, 'pins.json');
  return pin;
}

function bindFrozenSource() {
  const git = (args, options = {}) => execFileSync('git', args, { cwd: repositoryRoot, encoding: Object.hasOwn(options, 'encoding') ? options.encoding : 'utf8', windowsHide: true });
  for (const [relativePath, expectedBlob, expectedSha] of SOURCE_FILES) {
    if (git(['rev-parse', `${SOURCE_BASELINE}:${relativePath}`]).trim() !== expectedBlob) fail('SOURCE_BINDING_MISMATCH', 'Git blob identity differs', { path: relativePath });
    const rawBlob = git(['cat-file', 'blob', `${SOURCE_BASELINE}:${relativePath}`], { encoding: null });
    if (!Buffer.isBuffer(rawBlob) || sha256Bytes(rawBlob) !== expectedSha) fail('SOURCE_BINDING_MISMATCH', 'raw Git blob bytes or digest differ', { path: relativePath });
  }
  const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'pomrx-v01-verify-source-'));
  const sourceRoot = path.join(temporaryRoot, 'source');
  git(['-c', 'core.autocrlf=false', '-c', 'core.eol=lf', 'worktree', 'add', '--detach', sourceRoot, SOURCE_BASELINE]);
  for (const [relativePath, , expectedSha] of SOURCE_FILES) {
    if (sha256Bytes(readFileSync(path.join(sourceRoot, ...relativePath.split('/')))) !== expectedSha) fail('SOURCE_BINDING_MISMATCH', 'detached source bytes differ', { path: relativePath });
  }
  return { temporaryRoot, sourceRoot, git };
}

function cleanFrozenSource(binding) {
  const expectedPrefix = `${path.resolve(os.tmpdir())}${path.sep}`;
  if (!path.resolve(binding.temporaryRoot).startsWith(expectedPrefix)) fail('SOURCE_CLEANUP_REFUSED', 'temporary worktree is outside the OS temporary root');
  binding.git(['worktree', 'remove', '--force', binding.sourceRoot]);
  rmSync(binding.temporaryRoot, { recursive: true, force: true });
}

export function validateManifest(bytes) {
  const manifest = parseExactJson(bytes, 'manifest.json');
  assertExactKeys(manifest, MANIFEST_KEYS, 'manifest');
  const exactTop = {
    fixture_schema_version: 'pom-rx-v0.1-compat-fixtures/1', receipt_schema_version: 'pom-rx/0.1', hash_domain: 'swisstokint:pom-rx:v1:',
    source_repository: 'https://github.com/SwissTokint/swisstokint-open-risk-infrastructure', source_baseline: SOURCE_BASELINE,
    generated_with_node: '24.16.0', generated_with_icu: '78.3', generated_with_unicode: '17.0', generated_with_locale: 'fr-CH', generated_with_platform: 'win32', generated_with_arch: 'x64',
  };
  for (const [key, value] of Object.entries(exactTop)) if (manifest[key] !== value) fail('MANIFEST_VALUE_INVALID', `manifest ${key} differs`);
  if (!Array.isArray(manifest.scenarios) || manifest.scenarios.length !== 8) fail('SCENARIO_SET_INVALID', 'manifest must contain eight scenarios');
  for (let index = 0; index < EXPECTED_SCENARIOS.length; index += 1) {
    const scenario = manifest.scenarios[index];
    const [id, classification, allowPartial, count, status] = EXPECTED_SCENARIOS[index];
    assertExactKeys(scenario, SCENARIO_KEYS, `scenario[${index}]`);
    if (scenario.scenario_id !== id || scenario.classification !== classification || scenario.allow_partial !== allowPartial || scenario.chain_path !== `chains/${id}.json` || scenario.expected_legacy_qualification !== 'LEGACY_ACCEPTANCE_OBSERVED' || scenario.expected_legacy_status !== status || scenario.evidence_defect_id !== (id === 'valid-control' ? null : id)) fail('SCENARIO_VALUE_INVALID', 'scenario metadata differs', { scenario_id: id });
    if (!Array.isArray(scenario.canonical_paths) || scenario.canonical_paths.length !== count || scenario.canonical_paths.some((candidate, receiptIndex) => candidate !== `canonical/${id}/${receiptIndex}.json`)) fail('SCENARIO_PATH_INVALID', 'canonical path list differs', { scenario_id: id });
    if (!Array.isArray(scenario.expected_legacy_receipt_hashes) || scenario.expected_legacy_receipt_hashes.length !== count || scenario.expected_legacy_receipt_hashes.some((digest) => !/^[0-9a-f]{64}$/u.test(digest))) fail('SCENARIO_HASH_INVALID', 'legacy hash list differs', { scenario_id: id });
    validateFixturePath(scenario.chain_path);
    scenario.canonical_paths.forEach(validateFixturePath);
  }
  if (!Array.isArray(manifest.canaries) || manifest.canaries.length !== 1) fail('CANARY_INVALID', 'manifest must contain one canary');
  const canary = manifest.canaries[0];
  assertExactKeys(canary, ['canary_id', 'input_path', 'expected_path', 'comparator', 'expected_sha256'], 'canary');
  const expectedCanary = { canary_id: 'localecompare-order-v1', input_path: 'canaries/localecompare-order-v1.input.json', expected_path: 'canaries/localecompare-order-v1.expected.json', comparator: 'javascript-string-localeCompare', expected_sha256: '3707fd4c6e3322d3cbc6e1c3c7d68b669d2f409b8b675d1b4d8c70519b95e9d7' };
  if (JSON.stringify(canary) !== JSON.stringify(expectedCanary)) fail('CANARY_INVALID', 'canary metadata differs');
  assertPrettyJson(bytes, manifest, 'manifest.json');
  return manifest;
}

function validateReceiptShape(receipt, label) {
  assertExactKeys(receipt, RECEIPT_KEYS, label);
  if (!Array.isArray(receipt.assertions) || receipt.assertions.length !== 1) fail('RECEIPT_SHAPE_INVALID', `${label} must contain one assertion`);
  assertExactKeys(receipt.assertions[0], ASSERTION_KEYS, `${label}.assertions[0]`);
}

export async function verifyFixtureCorpus({ root = path.join(repositoryRoot, 'fixtures', 'pom-rx', 'v0.1-compat') } = {}) {
  const versionRoot = path.join(root, '1');
  const pin = validatePins(readRegularFile(root, 'pins.json'));
  const checksumBytes = readRegularFile(versionRoot, 'checksums.sha256');
  const expectedPin = sha256Bytes(Buffer.concat([Buffer.from('pom-rx-v0.1-fixture-set/1\n', 'ascii'), checksumBytes]));
  if (pin.fixture_set_sha256 !== expectedPin) fail('PIN_MISMATCH', 'independent version-root pin differs');
  const caseFoldingPath = path.join(repositoryRoot, 'fixtures', 'pom-rx', 'support', 'unicode', '17.0.0', 'CaseFolding.txt');
  const caseFoldingBytes = readRegularFile(path.dirname(caseFoldingPath), path.basename(caseFoldingPath));
  if (sha256Bytes(caseFoldingBytes) !== CASE_FOLDING_SHA256) fail('UNICODE_DATA_DIGEST_MISMATCH', 'CaseFolding.txt digest differs');
  const foldMap = loadUnicode17CaseFold(caseFoldingBytes);
  const checksumEntries = parseChecksums(checksumBytes);
  const actualFiles = enumerateRegularFiles(versionRoot);
  if (actualFiles.length !== 31 || checksumEntries.length !== 30) fail('FILE_SET_INVALID', 'version root requires 30 payloads plus checksums.sha256');
  const expectedFiles = [...checksumEntries.map((entry) => entry.path), 'checksums.sha256'].sort(compareUnicodeScalars);
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) fail('FILE_SET_INVALID', 'version root file set differs from checksums');
  for (const entry of checksumEntries) if (sha256Bytes(readRegularFile(versionRoot, entry.path)) !== entry.digest) fail('CHECKSUM_MISMATCH', 'fixture byte digest differs', { path: entry.path });
  assertNoFoldAliases(actualFiles, foldMap);
  const manifestBytes = readRegularFile(versionRoot, 'manifest.json');
  const manifest = validateManifest(manifestBytes);
  assertRuntime();
  const canaryInputBytes = readRegularFile(versionRoot, manifest.canaries[0].input_path);
  const canaryExpectedBytes = readRegularFile(versionRoot, manifest.canaries[0].expected_path);
  if (sha256Bytes(canaryInputBytes) !== '811d8ff308bf40f503b1d0b27ede1e1cf2ec952b191dd90fbfef8e5601888c9b' || sha256Bytes(canaryExpectedBytes) !== manifest.canaries[0].expected_sha256) fail('CANARY_DIGEST_MISMATCH', 'canary bytes differ');
  const canaryInput = parseExactJson(canaryInputBytes, 'canary input', { terminalLf: false });
  const canaryExpected = parseExactJson(canaryExpectedBytes, 'canary expected', { terminalLf: false });
  if (JSON.stringify([...canaryInput].sort((left, right) => left.localeCompare(right))) !== JSON.stringify(canaryExpected)) fail('CANARY_ORDER_MISMATCH', 'localeCompare canary differs');
  const binding = bindFrozenSource();
  let redReport;
  try {
    const pomRxPath = path.join(binding.sourceRoot, 'sdk', 'typescript', 'pom-rx.mjs');
    const pomRxUrl = pathToFileURL(pomRxPath).href;
    const proofPath = path.join(binding.sourceRoot, 'sdk', 'typescript', 'swisstokint-proof.mjs');
    const before = sha256Bytes(readFileSync(pomRxPath));
    const proofBefore = sha256Bytes(readFileSync(proofPath));
    const frozenBefore = new Map(SOURCE_FILES.map(([relativePath]) => [relativePath, sha256Bytes(readFileSync(path.join(binding.sourceRoot, ...relativePath.split('/'))))]));
    const module = await import(`${pomRxUrl}?fixture-verification=1`);
    for (const scenario of manifest.scenarios) {
      const chainBytes = readRegularFile(versionRoot, scenario.chain_path);
      const receipts = parseExactJson(chainBytes, scenario.chain_path);
      if (!Array.isArray(receipts) || receipts.length !== scenario.canonical_paths.length) fail('CHAIN_SHAPE_INVALID', 'chain cardinality differs', { scenario_id: scenario.scenario_id });
      assertPrettyJson(chainBytes, receipts, scenario.chain_path);
      const recomputedHashes = [];
      receipts.forEach((receipt, receiptIndex) => {
        validateReceiptShape(receipt, `${scenario.scenario_id}[${receiptIndex}]`);
        const committed = module.commitPomRxReceipt(receipt);
        const expectedCanonical = readRegularFile(versionRoot, scenario.canonical_paths[receiptIndex]);
        if (!expectedCanonical.equals(Buffer.from(committed.canonicalReceipt, 'utf8'))) fail('CANONICAL_BYTES_MISMATCH', 'canonical bytes differ', { scenario_id: scenario.scenario_id, receipt_index: receiptIndex });
        recomputedHashes.push(committed.receiptHash);
      });
      if (JSON.stringify(recomputedHashes) !== JSON.stringify(scenario.expected_legacy_receipt_hashes)) fail('RECEIPT_HASH_MISMATCH', 'receipt hashes differ', { scenario_id: scenario.scenario_id });
      const legacy = module.verifyPomRxChain(receipts, { allowPartial: scenario.allow_partial });
      if (JSON.stringify(Object.keys(legacy)) !== JSON.stringify(['ok', 'status', 'receipt_hashes']) || legacy.ok !== true || Object.hasOwn(legacy, 'error') || legacy.status !== scenario.expected_legacy_status || JSON.stringify(legacy.receipt_hashes) !== JSON.stringify(scenario.expected_legacy_receipt_hashes)) fail('LEGACY_RESULT_MISMATCH', 'complete legacy result differs', { scenario_id: scenario.scenario_id });
    }
    const ordinary = readRegularFile(versionRoot, 'chains/POMRX-001-ACTION-PREFLIGHT-EXECUTION.json');
    const surrogate = readRegularFile(versionRoot, 'chains/POMRX-001-SURROGATE-ACK-ACTION-SUBSTITUTION.json');
    if (!ordinary.equals(surrogate)) fail('SURROGATE_BYTES_MISMATCH', 'ordinary and surrogate action chains must be byte-identical');
    if (sha256Bytes(readFileSync(pomRxPath)) !== before) fail('SOURCE_BINDING_MISMATCH', 'source bytes changed during verification');
    if (sha256Bytes(readFileSync(proofPath)) !== proofBefore) fail('SOURCE_BINDING_MISMATCH', 'source dependency bytes changed during verification');
    const redEnvironment = { ...process.env };
    delete redEnvironment.NODE_TEST_CONTEXT;
    const red = spawnSync(process.execPath, [path.join(binding.sourceRoot, 'scripts', 'assert-pom-rx-integrity-baseline-red.mjs')], { cwd: binding.sourceRoot, encoding: 'utf8', windowsHide: true, env: redEnvironment });
    if (red.error !== undefined || red.signal !== null || red.status !== 0) fail('EXPECTED_RED_GATE_INVALID', 'strict expected-red gate did not complete from frozen source', { status: red.status, signal: red.signal, error: red.error?.message ?? null, stderr: red.stderr });
    try { redReport = JSON.parse(red.stdout); } catch { fail('EXPECTED_RED_GATE_INVALID', 'strict expected-red gate did not emit JSON'); }
    for (const [relativePath, beforeDigest] of frozenBefore) {
      if (sha256Bytes(readFileSync(path.join(binding.sourceRoot, ...relativePath.split('/')))) !== beforeDigest) fail('SOURCE_BINDING_MISMATCH', 'frozen source changed during execution', { path: relativePath });
    }
  } finally {
    cleanFrozenSource(binding);
  }
  if (redReport.status !== 'EXPECTED_RED_CONFIRMED' || redReport.totals?.tracked_defects !== 7 || redReport.totals?.vulnerable_failures !== 7 || redReport.totals?.green_controls !== 1) fail('EXPECTED_RED_GATE_INVALID', 'strict expected-red totals differ');
  return { status: 'FULL_CORPUS_VERIFIED', scenarios: 8, regular_files: 31, checksum_entries: 30, runtime: measureRuntime(), source_baseline: SOURCE_BASELINE, fixture_set_sha256: pin.fixture_set_sha256 };
}

async function cli() {
  try {
    const report = await verifyFixtureCorpus();
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    const fixtureError = error instanceof FixtureContractError ? error : new FixtureContractError('INTERNAL_ERROR', error?.message ?? String(error));
    process.stdout.write(`${JSON.stringify({ status: fixtureError.code === 'ENVIRONMENT_MISMATCH' ? 'ENVIRONMENT_MISMATCH' : 'CONTRACT_INVALID', code: fixtureError.code, message: fixtureError.message, details: fixtureError.details }, null, 2)}\n`);
    process.exitCode = fixtureError.code === 'ENVIRONMENT_MISMATCH' ? 3 : 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) await cli();
