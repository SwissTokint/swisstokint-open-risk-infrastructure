import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Import this base-owned helper before any candidate dependency. Keep the
// executable and callable captures private; ESM built-in exports are live.
const nativeSpawnSync = spawnSync;
const executable = process.execPath;
const NativeBuffer = Buffer;
const bufferFrom = Buffer.from;
const bufferByteLength = Buffer.byteLength;
const bufferToString = Buffer.prototype.toString;
const nativeApply = Reflect.apply;
const assertEqual = assert.equal;
const assertOk = assert.ok;
const freeze = Object.freeze;
const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));
const childTestPath = 'tests/fixtures/trusted-runner/authenticated-child-source.test.mjs';
const manifestPath = fileURLToPath(new URL('../../.github/trusted-child-tests.txt', import.meta.url));
const expectedOutput = `trusted-test-file-pass ${childTestPath} tests=1\n`
  + 'trusted-test-suite-pass files=1\n';
const childArguments = freeze([
  '--unhandled-rejections=strict',
  '--permission',
  `--allow-fs-read=${repositoryRoot}`,
  '--no-addons',
  '--import',
  new URL('../../scripts/trusted-test-loader-register.mjs', import.meta.url).href,
  '--import',
  new URL('../../scripts/trusted-assert-preload.mjs', import.meta.url).href,
  '--test',
  '--experimental-test-isolation=none',
  `--test-reporter=${new URL('../../scripts/trusted-test-reporter.mjs', import.meta.url).href}`,
  childTestPath,
]);

export function runTrustedTestChild(source) {
  assertEqual(typeof source, 'string', 'trusted child source must be a string');
  const sourceBytes = nativeApply(bufferByteLength, NativeBuffer, [source, 'utf8']);
  assertOk(sourceBytes > 0 && sourceBytes <= 96 * 1024, 'trusted child source exceeds its byte bounds');
  const encoded = nativeApply(bufferToString, nativeApply(bufferFrom, NativeBuffer, [source, 'utf8']), ['base64']);
  const child = nativeSpawnSync(executable, childArguments, {
    __proto__: null,
    cwd: repositoryRoot,
    encoding: 'utf8',
    // Never inherit startup settings or write to the protected parent env.
    env: {
      __proto__: null,
      LANG: 'C.UTF-8',
      LC_ALL: 'C.UTF-8',
      TZ: 'UTC',
      TRUSTED_CHILD_SOURCE_BASE64: encoded,
      TRUSTED_TEST_MANIFEST: manifestPath,
      TRUSTED_TEST_PATH: childTestPath,
    },
    timeout: 10_000,
    maxBuffer: 1024 * 1024,
    killSignal: 'SIGKILL',
    shell: false,
    windowsHide: true,
  });
  const diagnostic = `trusted child failed\nstdout:\n${child.stdout}\nstderr:\n${child.stderr}`;
  assertEqual(child.error, undefined, diagnostic);
  assertEqual(child.signal, null, diagnostic);
  assertEqual(child.status, 0, diagnostic);
  // These records are required in addition to the preloaded lifecycle guard.
  // Marker text on its own is not authentication of a child process.
  assertEqual(child.stdout, expectedOutput, diagnostic);
  return child;
}
