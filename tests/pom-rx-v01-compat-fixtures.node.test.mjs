import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, linkSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CASE_FOLDING_SHA256,
  FixtureContractError,
  assertExactKeys,
  assertNoFoldAliases,
  compareUnicodeScalars,
  enumerateRegularFiles,
  fullCaseFold,
  loadUnicode17CaseFold,
  parseChecksums,
  parseExactJson,
  sha256Bytes,
  validateFixturePath,
} from '../scripts/pom-rx-v01-fixture-contract.mjs';
import { validateManifest, validatePins, verifyFixtureCorpus } from '../scripts/verify-pom-rx-v01-compat-fixtures.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const versionRoot = path.join(repositoryRoot, 'fixtures', 'pom-rx', 'v0.1-compat', '1');
const supportRoot = path.join(repositoryRoot, 'fixtures', 'pom-rx', 'support', 'unicode', '17.0.0');
const manifestBytes = readFileSync(path.join(versionRoot, 'manifest.json'));
const checksumBytes = readFileSync(path.join(versionRoot, 'checksums.sha256'));
const pinBytes = readFileSync(path.join(repositoryRoot, 'fixtures', 'pom-rx', 'v0.1-compat', 'pins.json'));
const runtimeIsExact = process.versions.node === '24.16.0' && process.versions.icu === '78.3' && process.versions.unicode === '17.0' && new Intl.Collator().resolvedOptions().locale === 'fr-CH' && process.platform === 'win32' && process.arch === 'x64';

function expectCode(code, fn) {
  assert.throws(fn, (error) => error instanceof FixtureContractError && error.code === code, `expected ${code}`);
}

test('immutable corpus has the exact scenario, file, checksum and parent-pin closure', () => {
  assert.equal(readFileSync(path.join(repositoryRoot, '.gitattributes'), 'utf8'), '/fixtures/pom-rx/v0.1-compat/1/** -text\n/fixtures/pom-rx/v0.1-compat/pins.json -text\n/fixtures/pom-rx/support/unicode/17.0.0/CaseFolding.txt -text\n');
  const manifest = parseExactJson(manifestBytes, 'manifest.json');
  assertExactKeys(manifest, ['fixture_schema_version', 'receipt_schema_version', 'hash_domain', 'source_repository', 'source_baseline', 'generated_with_node', 'generated_with_icu', 'generated_with_unicode', 'generated_with_locale', 'generated_with_platform', 'generated_with_arch', 'scenarios', 'canaries'], 'manifest');
  assert.equal(manifest.scenarios.length, 8);
  assert.equal(manifest.fixture_schema_version, 'pom-rx-v0.1-compat-fixtures/1');
  assert.equal(manifest.receipt_schema_version, 'pom-rx/0.1');
  assert.equal(manifest.hash_domain, 'swisstokint:pom-rx:v1:');
  assert.equal(manifest.source_baseline, '743b8082bfc925d1681af7a239856a0b4f7e8464');
  assert.equal(manifest.scenarios.filter(({ classification }) => classification === 'valid-control').length, 1);
  assert.equal(manifest.scenarios.filter(({ classification }) => classification === 'known-vulnerable').length, 7);
  assert.equal(manifest.scenarios.filter(({ allow_partial }) => allow_partial).length, 5);
  assert.equal(manifest.scenarios.flatMap(({ expected_legacy_receipt_hashes }) => expected_legacy_receipt_hashes).length, 19);
  assert.equal(manifest.canaries.length, 1);
  const entries = parseChecksums(checksumBytes);
  assert.equal(entries.length, 30);
  assert.equal(enumerateRegularFiles(versionRoot).length, 31);
  for (const { digest, path: relativePath } of entries) assert.equal(sha256Bytes(readFileSync(path.join(versionRoot, ...relativePath.split('/')))), digest);
  const pins = parseExactJson(pinBytes, 'pins.json');
  assertExactKeys(pins, ['pin_schema_version', 'pins'], 'pins');
  assert.equal(pins.pins.length, 1);
  assert.equal(pins.pins[0].fixture_set_sha256, sha256Bytes(Buffer.concat([Buffer.from('pom-rx-v0.1-fixture-set/1\n', 'ascii'), checksumBytes])));
});

test('known independent chain and canary byte identities reproduce', () => {
  const expectedChains = new Map([
    ['valid-control', ['fb2320257ae59e2fbcf868e98949cd12444cdd234f3d63cc28b73324f8f6aa9e', 3436]],
    ['POMRX-001-ACTION-PREFLIGHT-EXECUTION', ['40d566d368426bf3e2d25ba395fc2f25b7442a84f19cacb76aa9f47969e959d5', 2262]],
    ['POMRX-001-ACTION-EXECUTION-RECONCILIATION', ['24ca01fa2f6975d8813422ea6522b28a070fa1d39750c63a8ab880ae9567e923', 3436]],
    ['POMRX-001-INPUT-PREFLIGHT-EXECUTION', ['c88403a91721672dac71a20a25b9e6d2e9aa6e16d81b731c14f4d7b5c1fcfb50', 2262]],
    ['POMRX-006-EXECUTION-FAIL-ASSERTION', ['f1a0960cf9cec02de2fe8e71cd89ca8c279d5a6987c5556a52dae902c403ca0e', 2262]],
    ['POMRX-006-RECONCILIATION-FAIL-ASSERTION', ['0c06237d4d1d3435f0309af9d30f685bd27cb19d70317a1eca1385044e4f5890', 3436]],
    ['POMRX-007-DUPLICATE-RECEIPT-ID', ['8af530d43c6a0aa24b1ade611f4eedc64d2c93ad46594ced7220cc20e1ffcd27', 2262]],
    ['POMRX-001-SURROGATE-ACK-ACTION-SUBSTITUTION', ['40d566d368426bf3e2d25ba395fc2f25b7442a84f19cacb76aa9f47969e959d5', 2262]],
  ]);
  for (const [scenario, [digest, length]] of expectedChains) {
    const bytes = readFileSync(path.join(versionRoot, 'chains', `${scenario}.json`));
    assert.equal(bytes.length, length);
    assert.equal(sha256Bytes(bytes), digest);
  }
  const ordinary = readFileSync(path.join(versionRoot, 'chains', 'POMRX-001-ACTION-PREFLIGHT-EXECUTION.json'));
  const surrogate = readFileSync(path.join(versionRoot, 'chains', 'POMRX-001-SURROGATE-ACK-ACTION-SUBSTITUTION.json'));
  assert.deepEqual(ordinary, surrogate);
  assert.equal(sha256Bytes(readFileSync(path.join(versionRoot, 'canaries', 'localecompare-order-v1.input.json'))), '811d8ff308bf40f503b1d0b27ede1e1cf2ec952b191dd90fbfef8e5601888c9b');
  assert.equal(sha256Bytes(readFileSync(path.join(versionRoot, 'canaries', 'localecompare-order-v1.expected.json'))), '3707fd4c6e3322d3cbc6e1c3c7d68b669d2f409b8b675d1b4d8c70519b95e9d7');
});

test('strict JSON parsing rejects byte and duplicate-key ambiguity before semantic parsing', () => {
  expectCode('BOM_FORBIDDEN', () => parseExactJson(Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d, 0x0a]), 'mutation'));
  expectCode('CR_FORBIDDEN', () => parseExactJson(Buffer.from('{}\r\n'), 'mutation'));
  expectCode('TERMINAL_LF_INVALID', () => parseExactJson(Buffer.from('{}'), 'mutation'));
  expectCode('DUPLICATE_JSON_KEY', () => parseExactJson(Buffer.from('{"pins":[],"pins":[]}\n'), 'mutation'));
  expectCode('DUPLICATE_JSON_KEY', () => parseExactJson(Buffer.from('{"pins":[],"\\u0070ins":[]}\n'), 'mutation'));
  expectCode('INVALID_UTF8', () => parseExactJson(Buffer.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xff, 0x22, 0x7d, 0x0a]), 'mutation'));
  expectCode('KEY_SET_OR_ORDER_INVALID', () => assertExactKeys({ b: 1, a: 2 }, ['a', 'b'], 'mutation'));
  for (const nested of [
    '{"scenarios":[{"scenario_id":"a","\\u0073cenario_id":"b"}]}\n',
    '{"canaries":[{"canary_id":"a","canary_id":"b"}]}\n',
    '[{"receipt_id":"a","\\u0072eceipt_id":"b"}]\n',
    '[{"assertions":[{"rule_id":"a","rule_id":"b"}]}]\n',
    '{"pins":[{"fixture_version":1,"\\u0066ixture_version":1}]}\n',
  ]) expectCode('DUPLICATE_JSON_KEY', () => parseExactJson(Buffer.from(nested), 'nested mutation'));
});

test('manifest and pin schemas reject nested key, type, null, order and cardinality mutations', () => {
  const manifest = JSON.parse(manifestBytes);
  const pins = JSON.parse(pinBytes);
  const cases = [
    ['KEY_SET_OR_ORDER_INVALID', () => validateManifest(Buffer.from(`${JSON.stringify({ unknown: true, ...manifest }, null, 2)}\n`))],
    ['KEY_SET_OR_ORDER_INVALID', () => { const value = structuredClone(manifest); delete value.scenarios[0].scenario_id; return validateManifest(Buffer.from(`${JSON.stringify(value, null, 2)}\n`)); }],
    ['SCENARIO_VALUE_INVALID', () => { const value = structuredClone(manifest); value.scenarios[0].allow_partial = null; return validateManifest(Buffer.from(`${JSON.stringify(value, null, 2)}\n`)); }],
    ['MANIFEST_VALUE_INVALID', () => { const value = structuredClone(manifest); value.generated_with_node = 24; return validateManifest(Buffer.from(`${JSON.stringify(value, null, 2)}\n`)); }],
    ['SCENARIO_VALUE_INVALID', () => { const value = structuredClone(manifest); value.scenarios.reverse(); return validateManifest(Buffer.from(`${JSON.stringify(value, null, 2)}\n`)); }],
    ['CANARY_INVALID', () => { const value = structuredClone(manifest); value.canaries = []; return validateManifest(Buffer.from(`${JSON.stringify(value, null, 2)}\n`)); }],
    ['KEY_SET_OR_ORDER_INVALID', () => validatePins(Buffer.from(`${JSON.stringify({ pins: pins.pins, pin_schema_version: pins.pin_schema_version }, null, 2)}\n`))],
    ['PIN_SCHEMA_INVALID', () => { const value = structuredClone(pins); value.pins[0].fixture_version = null; return validatePins(Buffer.from(`${JSON.stringify(value, null, 2)}\n`)); }],
    ['KEY_SET_OR_ORDER_INVALID', () => { const value = structuredClone(pins); value.pins[0].unknown = true; return validatePins(Buffer.from(`${JSON.stringify(value, null, 2)}\n`)); }],
  ];
  for (const [code, mutation] of cases) expectCode(code, mutation);
});

test('complete verifier rejects missing, extra, byte-drift and independently pinned root mutations', async () => {
  const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'pomrx-v01-mutations-'));
  const makeCopy = (name) => {
    const root = path.join(temporaryRoot, name);
    cpSync(path.join(repositoryRoot, 'fixtures', 'pom-rx', 'v0.1-compat'), root, { recursive: true });
    return root;
  };
  const expectAsyncCode = async (code, action) => {
    await assert.rejects(action, (error) => error instanceof FixtureContractError && error.code === code, `expected ${code}`);
  };
  const repinAfter = (root, relativePath, mutate) => {
    const target = path.join(root, '1', ...relativePath.split('/'));
    mutate(target);
    const sumsPath = path.join(root, '1', 'checksums.sha256');
    const oldSums = readFileSync(sumsPath, 'utf8');
    const expression = new RegExp(`^[0-9a-f]{64}  ${relativePath.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}$`, 'mu');
    const newSums = oldSums.replace(expression, `${sha256Bytes(readFileSync(target))}  ${relativePath}`);
    writeFileSync(sumsPath, newSums);
    const pins = JSON.parse(readFileSync(path.join(root, 'pins.json')));
    pins.pins[0].fixture_set_sha256 = sha256Bytes(Buffer.concat([Buffer.from('pom-rx-v0.1-fixture-set/1\n', 'ascii'), Buffer.from(newSums)]));
    writeFileSync(path.join(root, 'pins.json'), `${JSON.stringify(pins, null, 2)}\n`);
  };
  try {
    const extra = makeCopy('extra');
    writeFileSync(path.join(extra, '1', 'extra.json'), '{}\n');
    await expectAsyncCode('FILE_SET_INVALID', () => verifyFixtureCorpus({ root: extra }));

    const missing = makeCopy('missing');
    rmSync(path.join(missing, '1', 'manifest.json'));
    await expectAsyncCode('FILE_SET_INVALID', () => verifyFixtureCorpus({ root: missing }));

    const linkedPin = makeCopy('linked-pin');
    const externalPin = path.join(temporaryRoot, 'external-pins.json');
    writeFileSync(externalPin, readFileSync(path.join(linkedPin, 'pins.json')));
    rmSync(path.join(linkedPin, 'pins.json'));
    linkSync(externalPin, path.join(linkedPin, 'pins.json'));
    await expectAsyncCode('NON_REGULAR_FILE', () => verifyFixtureCorpus({ root: linkedPin }));

    const drift = makeCopy('drift');
    writeFileSync(path.join(drift, '1', 'manifest.json'), Buffer.concat([readFileSync(path.join(drift, '1', 'manifest.json')), Buffer.from(' ')]));
    await expectAsyncCode('CHECKSUM_MISMATCH', () => verifyFixtureCorpus({ root: drift }));

    const selfConsistent = makeCopy('self-consistent');
    const changedManifest = path.join(selfConsistent, '1', 'manifest.json');
    const changed = readFileSync(changedManifest).toString('utf8').replace('pom-rx-v0.1-compat-fixtures/1', 'pom-rx-v0.1-compat-fixtures/9');
    writeFileSync(changedManifest, changed);
    const sumsPath = path.join(selfConsistent, '1', 'checksums.sha256');
    const newDigest = sha256Bytes(readFileSync(changedManifest));
    writeFileSync(sumsPath, readFileSync(sumsPath, 'utf8').replace(/^[0-9a-f]{64}  manifest\.json$/m, `${newDigest}  manifest.json`));
    await expectAsyncCode('PIN_MISMATCH', () => verifyFixtureCorpus({ root: selfConsistent }));

    if (runtimeIsExact) {
      const canonical = makeCopy('canonical');
      repinAfter(canonical, 'canonical/valid-control/0.json', (target) => writeFileSync(target, Buffer.concat([readFileSync(target), Buffer.from(' ')])));
      await expectAsyncCode('CANONICAL_BYTES_MISMATCH', () => verifyFixtureCorpus({ root: canonical }));

      const expectedHash = makeCopy('expected-hash');
      repinAfter(expectedHash, 'manifest.json', (target) => writeFileSync(target, readFileSync(target, 'utf8').replace('be040c9939baeb3795499928ddc86ede2695c04b8ba2a178c21ce9b3e4d13f60', '0'.repeat(64))));
      await expectAsyncCode('RECEIPT_HASH_MISMATCH', () => verifyFixtureCorpus({ root: expectedHash }));

      const canary = makeCopy('canary');
      repinAfter(canary, 'canaries/localecompare-order-v1.expected.json', (target) => writeFileSync(target, '["a-a","a_a","a.a"]'));
      await expectAsyncCode('CANARY_DIGEST_MISMATCH', () => verifyFixtureCorpus({ root: canary }));
    }

    const runtime = makeCopy('runtime');
    repinAfter(runtime, 'manifest.json', (target) => writeFileSync(target, readFileSync(target, 'utf8').replace('"generated_with_node": "24.16.0"', '"generated_with_node": "24.15.0"')));
    await expectAsyncCode('MANIFEST_VALUE_INVALID', () => verifyFixtureCorpus({ root: runtime }));
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('portable path validation rejects Windows, POSIX, traversal and Unicode hazards', () => {
  for (const candidate of ['', '/a', 'C:a', 'C:/a', '\\\\server\\share', '//server/share', 'a\\b', 'a:b', 'a//b', 'a/./b', 'a/../b', 'CON', 'NUL.txt', 'CONIN$', 'CONOUT$.json', 'CLOCK$', 'dir/COM1.json', 'dir/COM¹.json', 'dir/LPT².txt', 'dir/name.', 'dir/name ', `a/${String.fromCharCode(0)}b`, `a/${String.fromCharCode(0x7f)}b`, `a/${String.fromCharCode(0xd800)}b`]) {
    assert.throws(() => validateFixturePath(candidate), FixtureContractError, candidate);
  }
  assert.equal(validateFixturePath('canonical/a/0.json'), 'canonical/a/0.json');
  assert.deepEqual(['a\u{10000}', 'a\ue000', 'a', 'aa'].sort(compareUnicodeScalars), ['a', 'aa', 'a\ue000', 'a\u{10000}']);
});

test('Unicode 17 full folding selects C and F mappings and rejects aliases', () => {
  const bytes = readFileSync(path.join(supportRoot, 'CaseFolding.txt'));
  assert.equal(sha256Bytes(bytes), CASE_FOLDING_SHA256);
  const mapping = loadUnicode17CaseFold(bytes);
  assert.equal(fullCaseFold('Straße', mapping), fullCaseFold('STRASSE', mapping));
  assert.equal(fullCaseFold('K', mapping), fullCaseFold('K', mapping));
  assert.equal(fullCaseFold('ς', mapping), fullCaseFold('σ', mapping));
  assert.equal(fullCaseFold('é', mapping), fullCaseFold('e\u0301', mapping));
  expectCode('PATH_ALIAS_COLLISION', () => assertNoFoldAliases(['Straße/file.json', 'STRASSE/file.json'], mapping));
  const mutated = Buffer.from(bytes); mutated[100] ^= 1;
  expectCode('UNICODE_DATA_DIGEST_MISMATCH', () => loadUnicode17CaseFold(mutated));
});

test('checksum grammar rejects self, uppercase, duplicate and reordered entries', () => {
  expectCode('CHECKSUM_FORMAT_INVALID', () => parseChecksums(Buffer.from(`${'A'.repeat(64)}  a\n`)));
  expectCode('CHECKSUM_SELF_ENTRY', () => parseChecksums(Buffer.from(`${'0'.repeat(64)}  checksums.sha256\n`)));
  expectCode('CHECKSUM_DUPLICATE_PATH', () => parseChecksums(Buffer.from(`${'0'.repeat(64)}  a\n${'1'.repeat(64)}  a\n`)));
  expectCode('CHECKSUM_ORDER_INVALID', () => parseChecksums(Buffer.from(`${'0'.repeat(64)}  b\n${'1'.repeat(64)}  a\n`)));
});

test('real CLI is fail-closed outside the exact immutable runtime tuple', () => {
  if (runtimeIsExact) {
    const run = spawnSync(process.execPath, [path.join(repositoryRoot, 'scripts', 'verify-pom-rx-v01-compat-fixtures.mjs')], { cwd: repositoryRoot, encoding: 'utf8', windowsHide: true });
    assert.equal(run.error, undefined);
    assert.equal(run.signal, null);
    assert.equal(run.status, 0, run.stdout + run.stderr);
    const report = JSON.parse(run.stdout.slice(run.stdout.indexOf('{')));
    assert.equal(report.status, 'FULL_CORPUS_VERIFIED');
    assert.equal(report.scenarios, 8);
    assert.equal(report.regular_files, 31);
    assert.equal(report.checksum_entries, 30);
    assert.equal(report.source_baseline, '743b8082bfc925d1681af7a239856a0b4f7e8464');
    return;
  }
  const run = spawnSync(process.execPath, [path.join(repositoryRoot, 'scripts', 'verify-pom-rx-v01-compat-fixtures.mjs')], { cwd: repositoryRoot, encoding: 'utf8', windowsHide: true });
  assert.equal(run.error, undefined);
  assert.equal(run.signal, null);
  assert.equal(run.status, 3);
  const report = JSON.parse(run.stdout);
  assert.equal(report.status, 'ENVIRONMENT_MISMATCH');
  assert.equal(report.code, 'ENVIRONMENT_MISMATCH');
});
