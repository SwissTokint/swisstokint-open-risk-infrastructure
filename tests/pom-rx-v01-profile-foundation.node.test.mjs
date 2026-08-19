import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  PomRxV01StrictError,
  PROFILE_LIMITATIONS,
  makePomRxV01Diagnostic,
  orderPomRxV01Diagnostics,
} from '../sdk/typescript/internal/pom-rx-v01-diagnostics.mjs';
import {
  bindFreshPomRxPolicyCapability,
  consumeFreshPomRxPolicyBinding,
  withFreshPomRxPolicyCapability,
} from '../sdk/typescript/internal/pom-rx-v01-policy-capability.mjs';
import {
  computePomRxArtifactDigest,
  verifyPomRxArtifactIdentity as verifyPomRxArtifactIdentityProduction,
  verifyPomRxArtifactIdentityTestOnly as verifyPomRxArtifactIdentity,
} from '../sdk/typescript/internal/pom-rx-v01-artifact-identity.mjs';
import {
  buildPomRxV01StrictVerdict,
  validatePomRxV01StrictVerdict,
} from '../sdk/typescript/internal/pom-rx-v01-verdict.mjs';
import {
  POM_RX_V01_STRICT_INVARIANTS,
  createPomRxV01ProfileReadiness,
} from './support/pom-rx-v01-profile-readiness.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const caseFoldingPath = path.join(repositoryRoot, 'fixtures', 'pom-rx', 'support', 'unicode', '17.0.0', 'CaseFolding.txt');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function expectCode(code, callback) {
  assert.throws(callback, (error) => error instanceof PomRxV01StrictError && error.code === code);
}

function runtimeConstraints() {
  return {
    node_version: process.versions.node,
    icu_version: process.versions.icu,
    unicode_version: process.versions.unicode,
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
    platform: process.platform,
    arch: process.arch,
  };
}

const selectedTuple = Object.freeze({
  receipt_schema_version: 'pom-rx/0.1',
  verifier_profile: 'pom-rx-v0.1/strict-errata-1',
  verifier_version: 'pom-rx-v0.1-strict-verifier/1',
  implementation_artifact_sha256: 'a'.repeat(64),
});

function policy(overrides = {}) {
  return {
    policy_schema_version: 'pom-rx-local-verification-policy/1',
    policy_id: 'policy-pom-rx-local-strict-1',
    policy_version: '2026-08-17.1',
    accepted_verifiers: [{ ...selectedTuple, runtime_constraints: runtimeConstraints() }],
    withdrawn_verifiers: [],
    ...overrides,
  };
}

function withTempDirectory(callback) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'pom-rx-v01-foundation-'));
  try {
    return callback(realpathSync.native(directory));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function writePolicy(directory, value) {
  const policyPath = path.join(directory, 'policy.json');
  const bytes = Buffer.from(JSON.stringify(value), 'utf8');
  writeFileSync(policyPath, bytes);
  return { policyPath, bytes };
}

function capabilityConfig(directory, policyBytes, policyPath) {
  const artifactManifestPath = path.join(directory, 'artifact-manifest.json');
  writeFileSync(artifactManifestPath, '{}');
  return {
    policyPath,
    expectedPolicySha256: sha256(policyBytes),
    trustedEvaluationInstant: '2026-08-17T12:00:00.000Z',
    artifactManifestPath,
    expectedArtifactManifestSha256: sha256(Buffer.from('{}')),
  };
}

test('internal readiness is deterministic, incomplete and never authorizing', () => {
  const sourceClosure = [
    { path: 'checker-a.mjs', bytes: Buffer.from('export const a = 1;\n') },
    { path: 'checker-b.mjs', bytes: Buffer.from('export const b = 2;\n') },
  ];
  const first = createPomRxV01ProfileReadiness({
    sourceClosure,
    implementedInvariants: ['POMRX_V01_I_ACTION_CONTINUITY'],
  });
  const second = createPomRxV01ProfileReadiness({
    sourceClosure: [...sourceClosure].reverse(),
    implementedInvariants: ['POMRX_V01_I_ACTION_CONTINUITY'],
  });

  assert.deepEqual(first, second);
  assert.deepEqual(Object.keys(first), [
    'test_result_schema_version',
    'test_build_id',
    'implemented_invariants',
    'missing_invariants',
    'structural_status',
    'structural_prerequisite_satisfied',
    'authorization_eligible',
    'authorization_proved',
    'diagnostic_code',
  ]);
  assert.match(first.test_build_id, /^test-only\/[a-f0-9]{64}$/);
  assert.equal(first.structural_status, 'indeterminate');
  assert.equal(first.structural_prerequisite_satisfied, false);
  assert.equal(first.authorization_eligible, false);
  assert.equal(first.authorization_proved, false);
  assert.equal(first.diagnostic_code, 'POMRX_V01_E_PROFILE_INCOMPLETE');
  assert.deepEqual(first.missing_invariants, POM_RX_V01_STRICT_INVARIANTS.slice(1));

  expectCode('POMRX_V01_E_INTERNAL_VERIFIER_ERROR', () => createPomRxV01ProfileReadiness({
    sourceClosure,
    implementedInvariants: POM_RX_V01_STRICT_INVARIANTS,
  }));
  for (const invalidPath of ['/absolute.mjs', 'C:/absolute.mjs', 'e\u0301.mjs']) {
    expectCode('POMRX_V01_E_INTERNAL_VERIFIER_ERROR', () => createPomRxV01ProfileReadiness({
      sourceClosure: [{ path: invalidPath, bytes: Buffer.alloc(0) }],
      implementedInvariants: [],
    }));
  }
  expectCode('POMRX_V01_E_INTERNAL_VERIFIER_ERROR', () => createPomRxV01ProfileReadiness({
    sourceClosure: [{ path: 'oversized.mjs', bytes: Buffer.alloc((1024 * 1024) + 1) }],
    implementedInvariants: [],
  }));
});

test('typed diagnostics are deterministic, ordered and deduplicated without message matching', () => {
  const action = makePomRxV01Diagnostic({
    defectId: 'POMRX-001-ACTION-PREFLIGHT-EXECUTION',
    diagnosticCode: 'POMRX_V01_E_ACTION_CONTINUITY',
    phase: 'execution',
    receiptIndex: 1,
    field: 'action_commitment',
    message: 'informative text may change',
  });
  const duplicate = { ...action, message: 'different text' };
  const policy = makePomRxV01Diagnostic({
    diagnosticCode: 'POMRX_V01_E_POLICY_INVALID',
    message: 'policy failed',
  });
  const ordered = orderPomRxV01Diagnostics([action, duplicate, policy]);

  assert.deepEqual(ordered.map(({ diagnostic_code: code }) => code), [
    'POMRX_V01_E_ACTION_CONTINUITY',
    'POMRX_V01_E_POLICY_INVALID',
  ]);
  assert.deepEqual(PROFILE_LIMITATIONS, [
    'POMRX_V01_L_OPAQUE_COMMITMENT_CONTENT_UNPROVED',
    'POMRX_V01_L_NATIVE_EXECUTION_UNPROVED',
    'POMRX_V01_L_CROSS_CHAIN_REPLAY_UNPROVED',
    'POMRX_V01_L_SIGNED_WITNESS_UNPROVED',
    'POMRX_V01_L_GATE_AUTHORIZATION_UNPROVED',
    'POMRX_V01_L_MALICIOUS_LOCAL_RUNTIME_UNPROVED',
  ]);
  expectCode('POMRX_V01_E_INTERNAL_VERIFIER_ERROR', () => makePomRxV01Diagnostic({
    diagnosticCode: 'made-up-code',
    message: 'unknown',
  }));
  expectCode('POMRX_V01_E_INTERNAL_VERIFIER_ERROR', () => makePomRxV01Diagnostic({
    defectId: 'POMRX-007-DUPLICATE-RECEIPT-ID',
    diagnosticCode: 'POMRX_V01_E_ACTION_CONTINUITY',
    message: 'mismatched stable mapping',
  }));
  expectCode('POMRX_V01_E_INTERNAL_VERIFIER_ERROR', () => makePomRxV01Diagnostic({
    defectId: 'POMRX-001-SURROGATE-ACK-ACTION-SUBSTITUTION',
    diagnosticCode: 'POMRX_V01_E_ACTION_CONTINUITY',
    message: 'surrogate scenario identifiers are test-runner metadata only',
  }));
  expectCode('POMRX_V01_E_INTERNAL_VERIFIER_ERROR', () => makePomRxV01Diagnostic({
    diagnosticCode: 'POMRX_V01_E_POLICY_INVALID',
    field: 'policy\npath',
    message: 'control characters are forbidden',
  }));
  expectCode('POMRX_V01_E_INTERNAL_VERIFIER_ERROR', () => makePomRxV01Diagnostic({
    diagnosticCode: 'POMRX_V01_E_POLICY_INVALID',
    message: 'x'.repeat(2049),
  }));
});

test('policy capability is branded, exact-pinned, synchronous and single-use', () => withTempDirectory((directory) => {
  const written = writePolicy(directory, policy());
  const config = capabilityConfig(directory, written.bytes, written.policyPath);
  let retained;
  let retainedBinding;

  const binding = withFreshPomRxPolicyCapability(config, (capability) => {
    retained = capability;
    assert.equal(JSON.stringify(capability), '{}');
    retainedBinding = bindFreshPomRxPolicyCapability(capability, selectedTuple, runtimeConstraints());
    assert.equal(JSON.stringify(retainedBinding), '{}');
    return consumeFreshPomRxPolicyBinding(retainedBinding);
  });

  assert.equal(binding.effective_policy_id, 'policy-pom-rx-local-strict-1');
  assert.equal(binding.effective_policy_sha256, sha256(written.bytes));
  assert.equal(binding.expected_artifact_manifest_sha256, config.expectedArtifactManifestSha256);
  expectCode('POMRX_V01_E_POLICY_CAPABILITY_STALE', () => bindFreshPomRxPolicyCapability(retained, selectedTuple, runtimeConstraints()));
  expectCode('POMRX_V01_E_POLICY_CAPABILITY_REQUIRED', () => bindFreshPomRxPolicyCapability({}, selectedTuple, runtimeConstraints()));
  expectCode('POMRX_V01_E_POLICY_CAPABILITY_STALE', () => consumeFreshPomRxPolicyBinding(retainedBinding));
  expectCode('POMRX_V01_E_POLICY_CAPABILITY_REQUIRED', () => consumeFreshPomRxPolicyBinding({}));

  withFreshPomRxPolicyCapability(config, (capability) => {
    const selected = bindFreshPomRxPolicyCapability(capability, selectedTuple, runtimeConstraints());
    consumeFreshPomRxPolicyBinding(selected);
    expectCode('POMRX_V01_E_POLICY_CAPABILITY_STALE', () => consumeFreshPomRxPolicyBinding(selected));
    expectCode('POMRX_V01_E_POLICY_CAPABILITY_STALE', () => bindFreshPomRxPolicyCapability(capability, selectedTuple, runtimeConstraints()));
  });

  expectCode('POMRX_V01_E_POLICY_CAPABILITY_STALE', () => withFreshPomRxPolicyCapability(config, async () => undefined));
}));

test('policy bytes are reread, duplicate keys fail and effective withdrawal overrides allowlisting', () => withTempDirectory((directory) => {
  const written = writePolicy(directory, policy());
  const config = capabilityConfig(directory, written.bytes, written.policyPath);
  withFreshPomRxPolicyCapability(config, (capability) => bindFreshPomRxPolicyCapability(capability, selectedTuple, runtimeConstraints()));

  writeFileSync(written.policyPath, Buffer.from(JSON.stringify({ ...policy(), policy_version: 'changed' })));
  expectCode('POMRX_V01_E_POLICY_INVALID', () => withFreshPomRxPolicyCapability(config, () => undefined));

  const duplicateBytes = Buffer.from('{"policy_schema_version":"pom-rx-local-verification-policy/1","policy_id":"one","policy_id":"two","policy_version":"1","accepted_verifiers":[],"withdrawn_verifiers":[]}');
  writeFileSync(written.policyPath, duplicateBytes);
  expectCode('POMRX_V01_E_POLICY_INVALID', () => withFreshPomRxPolicyCapability({
    ...config,
    expectedPolicySha256: sha256(duplicateBytes),
  }, () => undefined));

  const withdrawn = policy({
    withdrawn_verifiers: [{
      ...selectedTuple,
      effective_at: '2026-08-17T11:59:59.000Z',
      status: 'terminal',
      replacement: null,
      reason_code: 'local-policy-terminal-withdrawal',
    }],
  });
  const withdrawnBytes = Buffer.from(JSON.stringify(withdrawn));
  writeFileSync(written.policyPath, withdrawnBytes);
  expectCode('POMRX_V01_E_VERIFIER_WITHDRAWN', () => withFreshPomRxPolicyCapability({
    ...config,
    expectedPolicySha256: sha256(withdrawnBytes),
  }, (capability) => bindFreshPomRxPolicyCapability(capability, selectedTuple, runtimeConstraints())));
}));

test('conflicting withdrawals for one exact tuple fail policy loading', () => withTempDirectory((directory) => {
  const conflicting = policy({
    withdrawn_verifiers: [
      {
        ...selectedTuple,
        effective_at: '2026-08-17T11:00:00.000Z',
        status: 'terminal',
        replacement: null,
        reason_code: 'first-terminal-withdrawal',
      },
      {
        ...selectedTuple,
        effective_at: '2026-08-17T12:00:00.000Z',
        status: 'terminal',
        replacement: null,
        reason_code: 'second-terminal-withdrawal',
      },
    ],
  });
  const written = writePolicy(directory, conflicting);
  const config = capabilityConfig(directory, written.bytes, written.policyPath);
  expectCode('POMRX_V01_E_POLICY_INVALID', () => withFreshPomRxPolicyCapability(config, () => undefined));
}));

test('withdrawal timing and runtime selection use exact trusted boundaries', () => withTempDirectory((directory) => {
  const value = policy({
    withdrawn_verifiers: [{
      ...selectedTuple,
      effective_at: '2026-08-17T12:00:00.000Z',
      status: 'terminal',
      replacement: null,
      reason_code: 'exact-boundary-withdrawal',
    }],
  });
  const written = writePolicy(directory, value);
  const config = capabilityConfig(directory, written.bytes, written.policyPath);
  const accepted = withFreshPomRxPolicyCapability({
    ...config,
    trustedEvaluationInstant: '2026-08-17T11:59:59.999Z',
  }, (capability) => consumeFreshPomRxPolicyBinding(
    bindFreshPomRxPolicyCapability(capability, selectedTuple, runtimeConstraints()),
  ));
  assert.equal(accepted.effective_policy_version, value.policy_version);

  expectCode('POMRX_V01_E_VERIFIER_WITHDRAWN', () => withFreshPomRxPolicyCapability({
    ...config,
    trustedEvaluationInstant: '2026-08-17T12:00:00.000Z',
  }, (capability) => bindFreshPomRxPolicyCapability(capability, selectedTuple, runtimeConstraints())));
  expectCode('POMRX_V01_E_RUNTIME_ENVIRONMENT_UNSUPPORTED', () => withFreshPomRxPolicyCapability({
    ...config,
    trustedEvaluationInstant: '2026-08-17T11:59:59.999Z',
  }, (capability) => bindFreshPomRxPolicyCapability(capability, selectedTuple, {
    ...runtimeConstraints(),
    arch: 'unsupported-arch',
  })));
}));

function uint64(value) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(value));
  return buffer;
}

function artifactDigest(entries) {
  const hash = createHash('sha256');
  hash.update('pom-rx-verifier-artifact/1\n', 'ascii');
  for (const entry of [...entries].sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0)) {
    const pathBytes = Buffer.from(entry.path, 'utf8');
    hash.update(uint64(pathBytes.length));
    hash.update(pathBytes);
    hash.update(uint64(entry.bytes.length));
    hash.update(entry.bytes);
  }
  return hash.digest('hex');
}

function writeArtifactFixture(directory, overrides = {}) {
  const files = [
    { path: 'internal/a.mjs', bytes: Buffer.from("import './b.mjs';\nimport path from 'node:path';\nexport class Marker { constructor() { this.value = path.sep.length; } }\n") },
    { path: 'internal/b.mjs', bytes: Buffer.from('export const b = 2;\n') },
  ];
  for (const entry of files) {
    const target = path.join(directory, ...entry.path.split('/'));
    const parent = path.dirname(target);
    if (parent !== directory) mkdirSync(parent, { recursive: true });
    writeFileSync(target, entry.bytes);
  }
  const entries = (overrides.entries ?? files.map((entry) => ({
    path: entry.path,
    byte_length: entry.bytes.length,
    sha256: sha256(entry.bytes),
  })));
  const manifest = {
    artifact_manifest_schema_version: 'pom-rx-verifier-artifact-manifest/1',
    artifact_id: 'pom-rx-v01-strict-test-artifact',
    verifier_version: 'pom-rx-v0.1-strict-verifier/1',
    verification_root: 'package-root',
    entries,
    implementation_artifact_sha256: overrides.implementationArtifactSha256 ?? artifactDigest(files),
  };
  const manifestBytes = Buffer.from(JSON.stringify(manifest));
  const manifestPath = path.join(directory, 'artifact-manifest.json');
  writeFileSync(manifestPath, manifestBytes);
  return { files, manifest, manifestBytes, manifestPath };
}

test('artifact identity binds exact path and bytes and fails closed on tampering', () => withTempDirectory((directory) => {
  mkdirSync(path.join(directory, 'internal'));
  const fixture = writeArtifactFixture(directory);
  const expectedArtifactManifestSha256 = sha256(fixture.manifestBytes);
  const metadata = () => ({ reparse: false, streams: ['::$DATA'] });

  if (process.platform === 'win32') {
    expectCode('POMRX_V01_E_IMPLEMENTATION_ARTIFACT_MISMATCH', () => verifyPomRxArtifactIdentityProduction({
      packageRoot: directory,
      artifactManifestPath: fixture.manifestPath,
      expectedArtifactManifestSha256,
      caseFoldingPath,
    }));
  } else {
    const productionResult = verifyPomRxArtifactIdentityProduction({
      packageRoot: directory,
      artifactManifestPath: fixture.manifestPath,
      expectedArtifactManifestSha256,
      caseFoldingPath,
    });
    assert.equal(
      productionResult.implementation_artifact_sha256,
      fixture.manifest.implementation_artifact_sha256,
    );
  }

  const result = verifyPomRxArtifactIdentity({
    packageRoot: directory,
    artifactManifestPath: fixture.manifestPath,
    expectedArtifactManifestSha256,
    caseFoldingPath,
    inspectPathMetadata: metadata,
  });

  assert.equal(result.expected_implementation_artifact_sha256, fixture.manifest.implementation_artifact_sha256);
  assert.equal(result.observed_implementation_artifact_sha256, fixture.manifest.implementation_artifact_sha256);
  assert.equal(result.implementation_artifact_sha256, fixture.manifest.implementation_artifact_sha256);
  assert.equal(computePomRxArtifactDigest(fixture.files), fixture.manifest.implementation_artifact_sha256);

  writeFileSync(path.join(directory, 'internal', 'b.mjs'), 'export const b = 3;\n');
  expectCode('POMRX_V01_E_IMPLEMENTATION_ARTIFACT_MISMATCH', () => verifyPomRxArtifactIdentity({
    packageRoot: directory,
    artifactManifestPath: fixture.manifestPath,
    expectedArtifactManifestSha256,
    caseFoldingPath,
    inspectPathMetadata: metadata,
  }));
}));

test('policy validation has priority over an unavailable trusted instant', () => withTempDirectory((directory) => {
  const missingPolicyPath = path.join(directory, 'missing-policy.json');
  const artifactManifestPath = path.join(directory, 'artifact-manifest.json');
  writeFileSync(artifactManifestPath, '{}');
  expectCode('POMRX_V01_E_POLICY_INVALID', () => withFreshPomRxPolicyCapability({
    policyPath: missingPolicyPath,
    expectedPolicySha256: 'a'.repeat(64),
    trustedEvaluationInstant: 'not-a-canonical-instant',
    artifactManifestPath,
    expectedArtifactManifestSha256: sha256(Buffer.from('{}')),
  }, () => undefined));
}));

test('artifact identity rejects escaped, aliased, undeclared and dynamic local closure', () => withTempDirectory((directory) => {
  mkdirSync(path.join(directory, 'internal'));
  const escaped = writeArtifactFixture(directory, {
    entries: [{ path: '../escape.mjs', byte_length: 0, sha256: sha256(Buffer.alloc(0)) }],
    implementationArtifactSha256: 'b'.repeat(64),
  });
  expectCode('POMRX_V01_E_ARTIFACT_MANIFEST_INVALID', () => verifyPomRxArtifactIdentity({
    packageRoot: directory,
    artifactManifestPath: escaped.manifestPath,
    expectedArtifactManifestSha256: sha256(escaped.manifestBytes),
    caseFoldingPath,
    inspectPathMetadata: () => ({ reparse: false, streams: ['::$DATA'] }),
  }));

  const dynamicDirectory = path.join(directory, 'dynamic');
  mkdirSync(path.join(dynamicDirectory, 'internal'), { recursive: true });
  const dynamic = writeArtifactFixture(dynamicDirectory);
  const aPath = path.join(dynamicDirectory, 'internal', 'a.mjs');
  const dynamicBytes = Buffer.from("export const load = () => import('./b.mjs');\n");
  writeFileSync(aPath, dynamicBytes);
  dynamic.manifest.entries[0].byte_length = dynamicBytes.length;
  dynamic.manifest.entries[0].sha256 = sha256(dynamicBytes);
  dynamic.manifest.implementation_artifact_sha256 = artifactDigest([
    { path: 'internal/a.mjs', bytes: dynamicBytes },
    dynamic.files[1],
  ]);
  const dynamicManifestBytes = Buffer.from(JSON.stringify(dynamic.manifest));
  writeFileSync(dynamic.manifestPath, dynamicManifestBytes);
  expectCode('POMRX_V01_E_ARTIFACT_MANIFEST_INVALID', () => verifyPomRxArtifactIdentity({
    packageRoot: dynamicDirectory,
    artifactManifestPath: dynamic.manifestPath,
    expectedArtifactManifestSha256: sha256(dynamicManifestBytes),
    caseFoldingPath,
    inspectPathMetadata: () => ({ reparse: false, streams: ['::$DATA'] }),
  }));
}));

test('artifact manifest rejects non-NFC paths before filesystem resolution', () => withTempDirectory((directory) => {
  mkdirSync(path.join(directory, 'internal'));
  const nonNfc = 'internal/e\u0301.mjs';
  const fixture = writeArtifactFixture(directory, {
    entries: [{ path: nonNfc, byte_length: 0, sha256: sha256(Buffer.alloc(0)) }],
    implementationArtifactSha256: 'c'.repeat(64),
  });
  expectCode('POMRX_V01_E_ARTIFACT_MANIFEST_INVALID', () => verifyPomRxArtifactIdentity({
    packageRoot: directory,
    artifactManifestPath: fixture.manifestPath,
    expectedArtifactManifestSha256: sha256(fixture.manifestBytes),
    caseFoldingPath,
    inspectPathMetadata: () => ({ reparse: false, streams: ['::$DATA'] }),
  }));
}));

test('artifact closure rejects static omissions and Windows metadata ambiguity', () => withTempDirectory((directory) => {
  mkdirSync(path.join(directory, 'internal'));
  const fixture = writeArtifactFixture(directory);
  const cBytes = Buffer.from('export const c = 3;\n');
  writeFileSync(path.join(directory, 'internal', 'c.mjs'), cBytes);
  const aBytes = Buffer.from("import {\n  c,\n} from './c.mjs';\nexport const a = c;\n");
  writeFileSync(path.join(directory, 'internal', 'a.mjs'), aBytes);
  fixture.manifest.entries[0].byte_length = aBytes.length;
  fixture.manifest.entries[0].sha256 = sha256(aBytes);
  fixture.manifest.implementation_artifact_sha256 = artifactDigest([
    { path: 'internal/a.mjs', bytes: aBytes },
    fixture.files[1],
  ]);
  const manifestBytes = Buffer.from(JSON.stringify(fixture.manifest));
  writeFileSync(fixture.manifestPath, manifestBytes);
  expectCode('POMRX_V01_E_ARTIFACT_MANIFEST_INVALID', () => verifyPomRxArtifactIdentity({
    packageRoot: directory,
    artifactManifestPath: fixture.manifestPath,
    expectedArtifactManifestSha256: sha256(manifestBytes),
    caseFoldingPath,
    inspectPathMetadata: () => ({ reparse: false, streams: ['::$DATA'] }),
  }));

  for (const [caseName, source] of [
    ['same-line-static', "const marker = 1; import './c.mjs';\nexport { marker };\n"],
    ['commented-dynamic', "export const load = () => import/* local */('./c.mjs');\n"],
    ['file-url-static', "import 'file:///unlisted/local/c.mjs';\nexport const marker = 1;\n"],
    ['eval-dynamic', "export const load = () => eval(\"import('./c.mjs')\");\n"],
    ['computed-eval', "export const load = () => globalThis['eval'](\"import('./c.mjs')\");\n"],
    ['split-constructor', "export const load = () => []['con' + 'structor'](\"return import('./c.mjs')\")();\n"],
    ['computed-destructure', "const { ['con' + 'structor']: C } = function () {};\nexport const load = () => C(\"return import('./c.mjs')\")();\n"],
    ['named-constructor-destructure', "const { constructor: C } = function () {};\nexport const load = () => C(\"return import('./c.mjs')\")();\n"],
    ['shorthand-constructor-destructure', "const { constructor } = function () {};\nexport const load = () => constructor(\"return import('./c.mjs')\")();\n"],
    ['reflect-loader', "export const load = () => Reflect.get(globalThis, 'eval')(\"import('./c.mjs')\");\n"],
    ['unicode-escaped-loader', "export const load = () => \\u0065val(\"import('./c.mjs')\");\n"],
    ['commonjs-loader', "import { createRequire } from 'node:module';\nconst require = createRequire(import.meta.url);\nexport const c = require('./c.cjs');\n"],
    ['bare-package', "import dependency from 'unmanifested-package';\nexport { dependency };\n"],
  ]) {
    const bypassDirectory = path.join(directory, caseName);
    mkdirSync(path.join(bypassDirectory, 'internal'), { recursive: true });
    const bypass = writeArtifactFixture(bypassDirectory);
    writeFileSync(path.join(bypassDirectory, 'internal', 'c.mjs'), cBytes);
    const bypassBytes = Buffer.from(source);
    writeFileSync(path.join(bypassDirectory, 'internal', 'a.mjs'), bypassBytes);
    bypass.manifest.entries[0].byte_length = bypassBytes.length;
    bypass.manifest.entries[0].sha256 = sha256(bypassBytes);
    bypass.manifest.implementation_artifact_sha256 = artifactDigest([
      { path: 'internal/a.mjs', bytes: bypassBytes },
      bypass.files[1],
    ]);
    const bypassManifestBytes = Buffer.from(JSON.stringify(bypass.manifest));
    writeFileSync(bypass.manifestPath, bypassManifestBytes);
    expectCode('POMRX_V01_E_ARTIFACT_MANIFEST_INVALID', () => verifyPomRxArtifactIdentity({
      packageRoot: bypassDirectory,
      artifactManifestPath: bypass.manifestPath,
      expectedArtifactManifestSha256: sha256(bypassManifestBytes),
      caseFoldingPath,
      inspectPathMetadata: () => ({ reparse: false, streams: ['::$DATA'] }),
    }));
  }

  const cleanDirectory = path.join(directory, 'metadata');
  mkdirSync(path.join(cleanDirectory, 'internal'), { recursive: true });
  const clean = writeArtifactFixture(cleanDirectory);
  expectCode('POMRX_V01_E_IMPLEMENTATION_ARTIFACT_MISMATCH', () => verifyPomRxArtifactIdentity({
    packageRoot: cleanDirectory,
    artifactManifestPath: clean.manifestPath,
    expectedArtifactManifestSha256: sha256(clean.manifestBytes),
    caseFoldingPath,
    inspectPathMetadata: (_fullPath, relativePath) => ({
      reparse: false,
      streams: relativePath === 'internal/b.mjs' ? ['::$DATA', ':hidden:$DATA'] : ['::$DATA'],
    }),
  }));
}));

test('strict verdict envelope is exact, non-authorizing and excludes internal readiness codes', () => {
  const diagnostic = makePomRxV01Diagnostic({
    diagnosticCode: 'POMRX_V01_E_POLICY_INVALID',
    message: 'policy invalid',
  });
  const verdict = buildPomRxV01StrictVerdict({ diagnostics: [diagnostic] });

  assert.equal(verdict.verdict_schema_version, 'pom-rx-verification-verdict/1');
  assert.equal(verdict.structural_status, 'indeterminate');
  assert.equal(verdict.qualification, 'STRICT_VERIFICATION_INDETERMINATE');
  assert.equal(verdict.authorization_eligible, false);
  assert.equal(verdict.authorization_proved, false);
  assert.equal(verdict.structural_prerequisite_satisfied, false);
  assert.deepEqual(verdict.limitations, PROFILE_LIMITATIONS);
  assert.deepEqual(validatePomRxV01StrictVerdict(verdict), verdict);

  expectCode('POMRX_V01_E_INTERNAL_VERIFIER_ERROR', () => buildPomRxV01StrictVerdict({
    diagnostics: [makePomRxV01Diagnostic({
      diagnosticCode: 'POMRX_V01_E_PROFILE_INCOMPLETE',
      message: 'test-only barrier',
    })],
  }));
  expectCode('POMRX_V01_E_INTERNAL_VERIFIER_ERROR', () => buildPomRxV01StrictVerdict({
    expectedImplementationArtifactSha256: 'a'.repeat(64),
    diagnostics: [diagnostic],
  }));
  expectCode('POMRX_V01_E_INTERNAL_VERIFIER_ERROR', () => buildPomRxV01StrictVerdict({
    verifierProfile: 'garbage-profile',
    verifierVersion: selectedTuple.verifier_version,
    implementationArtifactSha256: 'a'.repeat(64),
    expectedImplementationArtifactSha256: 'a'.repeat(64),
    observedImplementationArtifactSha256: 'a'.repeat(64),
    executionEnvironment: runtimeConstraints(),
    effectivePolicyId: 'policy-pom-rx-local-strict-1',
    effectivePolicyVersion: '2026-08-17.1',
    effectivePolicySha256: 'b'.repeat(64),
    diagnostics: [diagnostic],
  }));

  expectCode('POMRX_V01_E_INTERNAL_VERIFIER_ERROR', () => buildPomRxV01StrictVerdict({
    structuralStatus: 'nonconformant',
    diagnostics: [diagnostic],
  }));
  const structuralDiagnostic = makePomRxV01Diagnostic({
    defectId: 'POMRX-001-ACTION-PREFLIGHT-EXECUTION',
    diagnosticCode: 'POMRX_V01_E_ACTION_CONTINUITY',
    phase: 'execution',
    receiptIndex: 1,
    field: 'action_commitment',
    message: 'action continuity failed',
  });
  const fullyBound = {
    receiptSchemaVersion: 'pom-rx/0.1',
    receiptHashes: ['c'.repeat(64)],
    verifierProfile: selectedTuple.verifier_profile,
    verifierVersion: selectedTuple.verifier_version,
    implementationArtifactSha256: 'a'.repeat(64),
    expectedImplementationArtifactSha256: 'a'.repeat(64),
    observedImplementationArtifactSha256: 'a'.repeat(64),
    executionEnvironment: runtimeConstraints(),
    effectivePolicyId: 'policy-pom-rx-local-strict-1',
    effectivePolicyVersion: '2026-08-17.1',
    effectivePolicySha256: 'b'.repeat(64),
  };
  const nonconformant = buildPomRxV01StrictVerdict({
    ...fullyBound,
    structuralStatus: 'nonconformant',
    diagnostics: [structuralDiagnostic],
  });
  assert.equal(nonconformant.qualification, 'STRICT_STRUCTURAL_NONCONFORMANCE_OBSERVED');
  expectCode('POMRX_V01_E_INTERNAL_VERIFIER_ERROR', () => buildPomRxV01StrictVerdict({
    ...fullyBound,
    structuralStatus: 'nonconformant',
    diagnostics: [structuralDiagnostic, diagnostic],
  }));
  assert.equal(buildPomRxV01StrictVerdict({
    ...fullyBound,
    structuralStatus: 'indeterminate',
    diagnostics: [structuralDiagnostic, diagnostic],
  }).structural_status, 'indeterminate');
});

test('foundation remains internal and does not import or change the legacy verifier', () => {
  const legacySource = readFileSync(path.join(repositoryRoot, 'sdk', 'typescript', 'pom-rx.mjs'), 'utf8');
  assert.doesNotMatch(legacySource, /verifyPomRxChainProfiled|pom-rx-v01-profile-foundation/u);

  for (const relativePath of [
    'sdk/typescript/internal/pom-rx-v01-diagnostics.mjs',
    'sdk/typescript/internal/pom-rx-v01-policy-capability.mjs',
    'sdk/typescript/internal/pom-rx-v01-artifact-identity.mjs',
    'sdk/typescript/internal/pom-rx-v01-verdict.mjs',
  ]) {
    const source = readFileSync(path.join(repositoryRoot, ...relativePath.split('/')), 'utf8');
    assert.doesNotMatch(source, /verifyPomRxChain\s*\(/u, `${relativePath} must not call legacy verification`);
  }

  const packageManifest = JSON.parse(readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8'));
  assert.match(packageManifest.scripts.test, /(?:^|\s)test:pom-rx:profile-foundation(?:\s|$)/u);
});
