import { lstatSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const manifestPath = resolve(
  process.env.TRUSTED_TEST_MANIFEST ?? '.github/trusted-security-tests.txt',
);
const manifestStats = lstatSync(manifestPath);
if (!manifestStats.isFile() || manifestStats.isSymbolicLink() || manifestStats.size > 128 * 1024) {
  throw new Error('trusted test loader manifest must be a bounded regular file');
}

const trustedTestPaths = readFileSync(manifestPath, 'utf8')
  .replace(/\r\n/gu, '\n')
  .trim()
  .split('\n');
if (trustedTestPaths.length === 0 || trustedTestPaths.length > 128) {
  throw new Error('trusted test loader manifest has invalid cardinality');
}
const trustedTestUrls = new Set();
for (const testPath of trustedTestPaths) {
  if (!/^tests\/[A-Za-z0-9._/-]+\.test\.mjs$/u.test(testPath)) {
    throw new Error(`invalid trusted loader test path: ${testPath}`);
  }
  const testUrl = pathToFileURL(resolve(testPath)).href;
  if (trustedTestUrls.has(testUrl)) {
    throw new Error(`duplicate trusted loader test path: ${testPath}`);
  }
  trustedTestUrls.add(testUrl);
}
const selectedTestPath = process.env.TRUSTED_TEST_PATH;
if (selectedTestPath !== undefined) {
  const selectedTestUrl = pathToFileURL(resolve(selectedTestPath)).href;
  if (!trustedTestPaths.includes(selectedTestPath) || !trustedTestUrls.has(selectedTestUrl)) {
    throw new Error(`selected trusted test is not in the manifest: ${selectedTestPath}`);
  }
  trustedTestUrls.clear();
  trustedTestUrls.add(selectedTestUrl);
}
const verificationModuleUrl = new URL('./trusted-assert-preload.mjs', import.meta.url).href;
const reservedIdentifier = '__pomRxVerifyTrustedPrimordials';
const reservedNamespace = '__pomRxTrustedTestPrimordials';
const primordialBindings = [
  'AggregateError', 'Array', 'ArrayBuffer', 'Atomics', 'BigInt', 'BigInt64Array',
  'BigUint64Array', 'Boolean', 'Buffer', 'DataView', 'Date', 'DOMException', 'Error',
  'EvalError', 'FinalizationRegistry', 'Float32Array', 'Float64Array', 'Function',
  'Int8Array', 'Int16Array', 'Int32Array', 'Intl', 'JSON', 'Map', 'Math', 'Number',
  'Object', 'Promise', 'Proxy', 'RangeError', 'ReferenceError', 'Reflect', 'RegExp',
  'Set', 'SharedArrayBuffer', 'String', 'Symbol', 'SyntaxError', 'TextDecoder',
  'TextEncoder', 'TypeError', 'URIError', 'URL', 'URLSearchParams', 'Uint8Array',
  'Uint8ClampedArray', 'Uint16Array', 'Uint32Array', 'WeakMap', 'WeakRef', 'WeakSet',
  'WebAssembly', 'decodeURI', 'decodeURIComponent', 'encodeURI',
  'encodeURIComponent', 'isFinite', 'isNaN', 'parseFloat', 'parseInt', 'queueMicrotask',
  'setImmediate', 'setInterval', 'setTimeout',
];

export function load(url, context, nextLoad) {
  const loaded = nextLoad(url, context);
  if (!trustedTestUrls.has(url)) return loaded;
  if (loaded.format !== 'module') {
    throw new Error(`trusted test must load as an ES module: ${url}`);
  }

  const source = typeof loaded.source === 'string'
    ? loaded.source
    : Buffer.from(loaded.source).toString('utf8');
  if (source.includes(reservedIdentifier) || source.includes(reservedNamespace)) {
    throw new Error(`trusted test contains the loader-reserved identifier: ${url}`);
  }

  return {
    ...loaded,
    source: [
      `import { trustedTestPrimordials as ${reservedNamespace}, verifyTrustedPrimordials as ${reservedIdentifier} } from ${JSON.stringify(verificationModuleUrl)};`,
      `const { ${primordialBindings.join(', ')} } = ${reservedNamespace};`,
      `${reservedIdentifier}();`,
      source,
    ].join('\n'),
  };
}
