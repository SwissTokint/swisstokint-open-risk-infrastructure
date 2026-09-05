import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const preloadUrl = new URL('../scripts/trusted-assert-preload.mjs', import.meta.url).href;
const loaderRegisterUrl = new URL('../scripts/trusted-test-loader-register.mjs', import.meta.url).href;
const reporterUrl = new URL('../scripts/trusted-test-reporter.mjs', import.meta.url).href;

function standaloneTestEnv(overrides = {}) {
  const env = { ...process.env, ...overrides };
  delete env.NODE_TEST_CONTEXT;
  delete env.TRUSTED_TEST_PATH;
  return env;
}

function runAttempt(mutation) {
  return spawnSync(
    process.execPath,
    [
      '--import',
      preloadUrl,
      '--input-type=module',
      '--eval',
      `
        import assert from 'node:assert/strict';
        try { ${mutation} } catch {}
        assert.equal('candidate-regression', 'trusted-value');
      `,
    ],
    {
      encoding: 'utf8',
      timeout: 10_000,
      windowsHide: true,
    },
  );
}

test('trusted preload freezes strict assert and captures primordial identities', async () => {
  await import('../scripts/trusted-assert-preload.mjs');
  assert.equal(Object.isFrozen(assert), true);
  assert.equal(assert.strict, assert);
});

test('candidate initialization cannot replace trusted assertion methods', () => {
  for (const mutation of [
    'assert.equal = () => undefined;',
    "Object.defineProperty(assert, 'equal', { value: () => undefined });",
  ]) {
    const result = runAttempt(mutation);
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.notEqual(
      result.status,
      0,
      `assertion tampering unexpectedly suppressed a wrong assertion: ${mutation}`,
    );
    assert.match(result.stderr, /AssertionError/u);
  }
});

test('candidate initialization cannot poison test-side primordials', () => {
  for (const mutation of [
    'Object.getPrototypeOf = () => null;',
    'Object.isFrozen = () => true;',
    'globalThis.Object = function PoisonedObject() {};',
  ]) {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        preloadUrl,
        '--input-type=module',
        '--eval',
        `
          import { verifyTrustedPrimordials } from ${JSON.stringify(preloadUrl)};
          ${mutation}
          verifyTrustedPrimordials();
        `,
      ],
      { encoding: 'utf8', timeout: 10_000, windowsHide: true },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.notEqual(result.status, 0, `primordial poisoning was not detected: ${mutation}`);
    assert.match(result.stderr, /candidate initialization changed/u);
  }
});

test('candidate cannot terminate successfully before a failing assertion', () => {
  for (const mutation of [
    'process.exit(0);',
    'process.reallyExit(0);',
    "process.execve(process.execPath, [process.execPath, '-e', ''], {});",
  ]) {
    const result = runAttempt(mutation);
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.notEqual(result.status, 0, `early exit suppressed a wrong assertion: ${mutation}`);
    assert.match(result.stderr, /AssertionError/u);
  }
});

test('candidate cannot replace the trusted runner process', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'trusted-execve-manifest-'));
  const manifestPath = join(sandbox, 'manifest.txt');
  writeFileSync(
    manifestPath,
    'tests/fixtures/trusted-runner/process-execve-replacement.test.mjs\n',
    { encoding: 'utf8', mode: 0o600 },
  );
  try {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        loaderRegisterUrl,
        '--import',
        preloadUrl,
        '--test',
        '--experimental-test-isolation=none',
        `--test-reporter=${reporterUrl}`,
        'tests/fixtures/trusted-runner/process-execve-replacement.test.mjs',
      ],
      {
        encoding: 'utf8',
        timeout: 10_000,
        windowsHide: true,
        env: standaloneTestEnv({ TRUSTED_TEST_MANIFEST: manifestPath }),
      },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.doesNotMatch(result.stdout, /trusted-test-suite-pass/u);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('candidate cannot inject inherited child preloads', () => {
  for (const property of ['NODE_OPTIONS', 'NODE_PATH', 'LD_PRELOAD', 'PATH']) {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        preloadUrl,
        '--input-type=module',
        '--eval',
        `process.env[${JSON.stringify(property)}] = '/tmp/candidate-preload';`,
      ],
      { encoding: 'utf8', timeout: 10_000, windowsHide: true },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.notEqual(result.status, 0, `${property} mutation was accepted`);
    assert.match(result.stderr, /child environment mutation is forbidden/u);
  }
});

test('candidate cannot redirect the trusted working directory', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      preloadUrl,
      '--input-type=module',
      '--eval',
      `
        import { chdir, cwd } from 'node:process';
        const expected = process.cwd();
        try { process.chdir(${JSON.stringify(tmpdir())}); } catch {}
        try { chdir(${JSON.stringify(tmpdir())}); } catch {}
        if (process.cwd() !== expected) throw new Error('candidate changed cwd');
        if (cwd() !== expected) throw new Error('candidate changed cwd through node:process');
      `,
    ],
    { encoding: 'utf8', timeout: 10_000, windowsHide: true },
  );
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test('loader rejects primordial poisoning performed by a static candidate import', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'trusted-loader-manifest-'));
  const manifestPath = join(sandbox, 'manifest.txt');
  writeFileSync(
    manifestPath,
    'tests/fixtures/trusted-runner/primordial-poison.test.mjs\n',
    { encoding: 'utf8', mode: 0o600 },
  );
  try {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        loaderRegisterUrl,
        '--import',
        preloadUrl,
        '--test',
        'tests/fixtures/trusted-runner/primordial-poison.test.mjs',
      ],
      {
        encoding: 'utf8',
        timeout: 10_000,
        windowsHide: true,
        env: standaloneTestEnv({ TRUSTED_TEST_MANIFEST: manifestPath }),
      },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      /candidate initialization changed primordial descriptor/u,
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('loader rejects built-in export poisoning performed by a static candidate import', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'trusted-builtin-manifest-'));
  const manifestPath = join(sandbox, 'manifest.txt');
  writeFileSync(
    manifestPath,
    'tests/fixtures/trusted-runner/builtin-export-poison.test.mjs\n',
    { encoding: 'utf8', mode: 0o600 },
  );
  try {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        loaderRegisterUrl,
        '--import',
        preloadUrl,
        '--test',
        '--experimental-test-isolation=none',
        `--test-reporter=${reporterUrl}`,
        'tests/fixtures/trusted-runner/builtin-export-poison.test.mjs',
      ],
      {
        encoding: 'utf8',
        timeout: 10_000,
        windowsHide: true,
        env: standaloneTestEnv({ TRUSTED_TEST_MANIFEST: manifestPath }),
      },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.doesNotMatch(result.stdout, /trusted-test-suite-pass/u);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('captured test facades resist primordial poisoning during candidate calls', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'trusted-runtime-manifest-'));
  const manifestPath = join(sandbox, 'manifest.txt');
  writeFileSync(
    manifestPath,
    'tests/fixtures/trusted-runner/runtime-primordial-poison.test.mjs\n',
    { encoding: 'utf8', mode: 0o600 },
  );
  try {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        loaderRegisterUrl,
        '--import',
        preloadUrl,
        '--test',
        '--experimental-test-isolation=none',
        'tests/fixtures/trusted-runner/runtime-primordial-poison.test.mjs',
      ],
      {
        encoding: 'utf8',
        timeout: 10_000,
        windowsHide: true,
        env: standaloneTestEnv({ TRUSTED_TEST_MANIFEST: manifestPath }),
      },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(`${result.stdout}\n${result.stderr}`, /AssertionError/u);
    assert.doesNotMatch(
      `${result.stdout}\n${result.stderr}`,
      /candidate initialization changed/u,
      'the failing observation must occur after the initialization checkpoint',
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('post-test checkpoint rejects poisoned instance method dispatch', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'trusted-instance-manifest-'));
  const manifestPath = join(sandbox, 'manifest.txt');
  writeFileSync(
    manifestPath,
    'tests/fixtures/trusted-runner/runtime-instance-poison.test.mjs\n',
    { encoding: 'utf8', mode: 0o600 },
  );
  try {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        loaderRegisterUrl,
        '--import',
        preloadUrl,
        '--test',
        '--experimental-test-isolation=none',
        `--test-reporter=${reporterUrl}`,
        'tests/fixtures/trusted-runner/runtime-instance-poison.test.mjs',
      ],
      {
        encoding: 'utf8',
        timeout: 10_000,
        windowsHide: true,
        env: standaloneTestEnv({ TRUSTED_TEST_MANIFEST: manifestPath }),
      },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.doesNotMatch(result.stdout, /trusted-test-suite-pass/u);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('frozen intrinsics reject a poison that restores itself before the checkpoint', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'trusted-self-restoring-manifest-'));
  const manifestPath = join(sandbox, 'manifest.txt');
  writeFileSync(
    manifestPath,
    'tests/fixtures/trusted-runner/self-restoring-instance-poison.test.mjs\n',
    { encoding: 'utf8', mode: 0o600 },
  );
  try {
    const result = spawnSync(
      process.execPath,
      [
        '--frozen-intrinsics',
        '--import',
        loaderRegisterUrl,
        '--import',
        preloadUrl,
        '--test',
        '--experimental-test-isolation=none',
        `--test-reporter=${reporterUrl}`,
        'tests/fixtures/trusted-runner/self-restoring-instance-poison.test.mjs',
      ],
      {
        encoding: 'utf8',
        timeout: 10_000,
        windowsHide: true,
        env: standaloneTestEnv({ TRUSTED_TEST_MANIFEST: manifestPath }),
      },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.doesNotMatch(result.stdout, /trusted-test-suite-pass/u);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('forged V8 summary plus process.exit(0) cannot pass the trusted reporter', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'trusted-reporter-manifest-'));
  const manifestPath = join(sandbox, 'manifest.txt');
  writeFileSync(
    manifestPath,
    'tests/fixtures/trusted-runner/forged-summary.test.mjs\n',
    { encoding: 'utf8', mode: 0o600 },
  );
  try {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        loaderRegisterUrl,
        '--import',
        preloadUrl,
        '--test',
        '--experimental-test-isolation=none',
        `--test-reporter=${reporterUrl}`,
        'tests/fixtures/trusted-runner/forged-summary.test.mjs',
      ],
      {
        encoding: 'utf8',
        timeout: 10_000,
        windowsHide: true,
        env: standaloneTestEnv({ TRUSTED_TEST_MANIFEST: manifestPath }),
      },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('candidate cannot rewrite direct lifecycle events or reset a failing exit', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'trusted-lifecycle-manifest-'));
  const manifestPath = join(sandbox, 'manifest.txt');
  writeFileSync(
    manifestPath,
    'tests/fixtures/trusted-runner/lifecycle-stream-forgery.test.mjs\n',
    { encoding: 'utf8', mode: 0o600 },
  );
  try {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        loaderRegisterUrl,
        '--import',
        preloadUrl,
        '--test',
        '--experimental-test-isolation=none',
        `--test-reporter=${reporterUrl}`,
        'tests/fixtures/trusted-runner/lifecycle-stream-forgery.test.mjs',
      ],
      {
        encoding: 'utf8',
        timeout: 10_000,
        windowsHide: true,
        env: standaloneTestEnv({ TRUSTED_TEST_MANIFEST: manifestPath }),
      },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.doesNotMatch(result.stdout, /trusted-test-suite-pass/u);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('candidate cannot shadow process.emit to suppress lifecycle failure', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'trusted-process-emit-manifest-'));
  const manifestPath = join(sandbox, 'manifest.txt');
  writeFileSync(
    manifestPath,
    'tests/fixtures/trusted-runner/process-emit-shadow.test.mjs\n',
    { encoding: 'utf8', mode: 0o600 },
  );
  try {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        loaderRegisterUrl,
        '--import',
        preloadUrl,
        '--test',
        '--experimental-test-isolation=none',
        `--test-reporter=${reporterUrl}`,
        'tests/fixtures/trusted-runner/process-emit-shadow.test.mjs',
      ],
      {
        encoding: 'utf8',
        timeout: 10_000,
        windowsHide: true,
        env: standaloneTestEnv({ TRUSTED_TEST_MANIFEST: manifestPath }),
      },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.doesNotMatch(result.stdout, /trusted-test-suite-pass/u);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('candidate cannot register a loader that replaces later trusted tests', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'trusted-loader-hook-manifest-'));
  const manifestPath = join(sandbox, 'manifest.txt');
  writeFileSync(
    manifestPath,
    [
      'tests/fixtures/trusted-runner/loader-hook-forgery-bootstrap.test.mjs',
      'tests/fixtures/trusted-runner/loader-hook-forgery-blocked-a.test.mjs',
      'tests/fixtures/trusted-runner/loader-hook-forgery-blocked-b.test.mjs',
      '',
    ].join('\n'),
    { encoding: 'utf8', mode: 0o600 },
  );
  try {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        loaderRegisterUrl,
        '--import',
        preloadUrl,
        '--test',
        '--test-concurrency=1',
        '--experimental-test-isolation=none',
        `--test-reporter=${reporterUrl}`,
        'tests/fixtures/trusted-runner/loader-hook-forgery-bootstrap.test.mjs',
        'tests/fixtures/trusted-runner/loader-hook-forgery-blocked-a.test.mjs',
        'tests/fixtures/trusted-runner/loader-hook-forgery-blocked-b.test.mjs',
      ],
      {
        encoding: 'utf8',
        timeout: 10_000,
        windowsHide: true,
        env: standaloneTestEnv({ TRUSTED_TEST_MANIFEST: manifestPath }),
      },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.doesNotMatch(result.stdout, /trusted-test-suite-pass/u);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('non-isolated runner accepts direct lifecycle evidence on the green path', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'trusted-green-manifest-'));
  const manifestPath = join(sandbox, 'manifest.txt');
  writeFileSync(
    manifestPath,
    'tests/trusted-test-reporter.node.test.mjs\n',
    { encoding: 'utf8', mode: 0o600 },
  );
  try {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        loaderRegisterUrl,
        '--import',
        preloadUrl,
        '--test',
        '--experimental-test-isolation=none',
        `--test-reporter=${reporterUrl}`,
        'tests/trusted-test-reporter.node.test.mjs',
      ],
      {
        encoding: 'utf8',
        timeout: 10_000,
        windowsHide: true,
        env: standaloneTestEnv({ TRUSTED_TEST_MANIFEST: manifestPath }),
      },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /trusted-test-suite-pass files=1/u);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
