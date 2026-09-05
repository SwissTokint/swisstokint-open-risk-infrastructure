import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const MODULE_URL = new URL(
  '../../applications/blockchain-digital-assets/wallet-guard/trusted-provider-transport.mjs',
  import.meta.url,
).href;
const ACCOUNT = `0x${'1'.repeat(40)}`;
const TX_RESULT = `0x${'a'.repeat(64)}`;
const CHILD_TEST_PATH = 'tests/fixtures/trusted-runner/authenticated-child-source.test.mjs';
const REPOSITORY_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const CHILD_MANIFEST_PATH = fileURLToPath(
  new URL('../../.github/trusted-child-tests.txt', import.meta.url),
);
const LOADER_REGISTER_URL = new URL(
  '../../scripts/trusted-test-loader-register.mjs',
  import.meta.url,
).href;
const PRELOAD_URL = new URL('../../scripts/trusted-assert-preload.mjs', import.meta.url).href;
const REPORTER_URL = new URL('../../scripts/trusted-test-reporter.mjs', import.meta.url).href;

function trustedChildEnvironment(source) {
  const environment = {
    ...process.env,
    TRUSTED_CHILD_SOURCE_BASE64: Buffer.from(source, 'utf8').toString('base64'),
    TRUSTED_TEST_MANIFEST: CHILD_MANIFEST_PATH,
    TRUSTED_TEST_PATH: CHILD_TEST_PATH,
  };
  delete environment.NODE_TEST_CONTEXT;
  return environment;
}

function runStrictChild(source) {
  return spawnSync(
    process.execPath,
    [
      '--unhandled-rejections=strict',
      '--permission',
      `--allow-fs-read=${REPOSITORY_ROOT}`,
      '--no-addons',
      '--import',
      LOADER_REGISTER_URL,
      '--import',
      PRELOAD_URL,
      '--test',
      '--experimental-test-isolation=none',
      `--test-reporter=${REPORTER_URL}`,
      CHILD_TEST_PATH,
    ],
    {
      cwd: REPOSITORY_ROOT,
      encoding: 'utf8',
      env: trustedChildEnvironment(source),
      timeout: 10_000,
      windowsHide: true,
    },
  );
}

function assertStrictChildPassed(child, label) {
  assert.equal(
    child.status,
    0,
    `${label} child failed\nstdout:\n${child.stdout}\nstderr:\n${child.stderr}`,
  );
  assert.equal(child.signal, null);
  assert.match(child.stdout, /trusted-test-suite-pass files=1/u);
}

test('trusted child lifecycle rejects candidate process.exit(0)', () => {
  const child = runStrictChild(`
    process.exit(0);
    throw new Error('trusted child source continued after the forbidden exit');
  `);
  assert.equal(child.error, undefined);
  assert.equal(child.signal, null);
  assert.notEqual(child.status, 0, `${child.stdout}\n${child.stderr}`);
  assert.doesNotMatch(child.stdout, /trusted-test-suite-pass/u);
});

function runPreImportPoisonCase(method) {
  const source = `
    const method = ${JSON.stringify(method)};
    const originalDescriptor = Object.getOwnPropertyDescriptor(Promise, method);
    const original = originalDescriptor.value;
    let poisonCalls = 0;

    const poisoned = method === 'resolve'
      ? function resolve(value) {
          poisonCalls += 1;
          const substituted = value === '0x1' ? '0x2' : value;
          return Reflect.apply(original, Promise, [substituted]);
        }
      : function reject(reason) {
          poisonCalls += 1;
          return Reflect.apply(original, Promise, [reason]);
        };

    Object.defineProperty(Promise, method, {
      ...originalDescriptor,
      value: poisoned,
    });

    const module = await import(${JSON.stringify(MODULE_URL)});
    let observedCode = null;
    try {
      module.createWalletGuardControlledProviderTransport({
        chainId: '0x1',
        accounts: [${JSON.stringify(ACCOUNT)}],
        providerResult: ${JSON.stringify(TX_RESULT)},
        maxSensitiveCalls: 4,
      });
    } catch (error) {
      observedCode = error?.code ?? null;
    }

    if (observedCode !== 'POMRX_WG_TRANSPORT_E_RUNTIME_INTEGRITY') {
      throw new Error('pre-import Promise.' + method + ' poisoning did not fail closed: ' + observedCode);
    }
    if (poisonCalls !== 0) {
      throw new Error('poisoned Promise.' + method + ' executed ' + String(poisonCalls) + ' time(s)');
    }
    Object.defineProperty(Promise, method, originalDescriptor);
  `;

  return runStrictChild(source);
}

for (const method of ['resolve', 'reject']) {
  test(`pre-import Promise.${method} poisoning is rejected without executing the poisoned method`, () => {
    assertStrictChildPassed(
      runPreImportPoisonCase(method),
      `pre-import Promise.${method} poisoning`,
    );
  });
}

test('pre-import Object.getPrototypeOf poisoning cannot hide an inherited Array thenable', () => {
  const source = `
    const originalGetPrototypeOf = Object.getPrototypeOf;
    const originalSetPrototypeOf = Object.setPrototypeOf;
    const originalArrayPrototypeParent = originalGetPrototypeOf(Array.prototype);
    let thenGetterCalls = 0;
    const intermediate = {};
    Object.defineProperty(intermediate, 'then', {
      configurable: true,
      get() {
        thenGetterCalls += 1;
        return undefined;
      },
    });
    originalSetPrototypeOf(Array.prototype, intermediate);

    Object.getPrototypeOf = function getPrototypeOf(value) {
      if (value === Array.prototype) return Object.prototype;
      return Reflect.apply(originalGetPrototypeOf, Object, [value]);
    };

    const module = await import(${JSON.stringify(MODULE_URL)});
    let observedCode = null;
    try {
      module.createWalletGuardControlledProviderTransport({
        chainId: '0x1',
        accounts: [${JSON.stringify(ACCOUNT)}],
        providerResult: ${JSON.stringify(TX_RESULT)},
        maxSensitiveCalls: 4,
      });
    } catch (error) {
      observedCode = error?.code ?? null;
    }

    if (observedCode !== 'POMRX_WG_TRANSPORT_E_RUNTIME_INTEGRITY') {
      throw new Error('poisoned Object.getPrototypeOf did not fail closed: ' + observedCode);
    }
    if (thenGetterCalls !== 0) {
      throw new Error('inherited Array then getter executed ' + String(thenGetterCalls) + ' time(s)');
    }
    Object.getPrototypeOf = originalGetPrototypeOf;
    originalSetPrototypeOf(Array.prototype, originalArrayPrototypeParent);
  `;

  assertStrictChildPassed(
    runStrictChild(source),
    'pre-import Object.getPrototypeOf poisoning',
  );
});

test('pre-import WeakSet poisoning cannot bless an unowned provider', () => {
  const source = `
    const OriginalWeakSet = globalThis.WeakSet;
    class PoisonedWeakSet {
      add() { return this; }
      has() { return true; }
    }
    globalThis.WeakSet = PoisonedWeakSet;

    const module = await import(${JSON.stringify(MODULE_URL)});
    let providerCalls = 0;
    const unownedProvider = {
      request() {
        providerCalls += 1;
        return Promise.resolve('0x1');
      },
    };

    let observedCode = null;
    try {
      module.createWalletGuardTrustedProviderGateway({
        captureTrustedOrigin: () => 'https://example.invalid',
        provider: unownedProvider,
        policy: {},
        trustedClock: () => '2026-08-23T12:00:00.000Z',
        referenceAuthorizationForRequest: () => null,
        capabilityLifetimeMs: 1000,
      });
    } catch (error) {
      observedCode = error?.code ?? null;
    }

    if (observedCode !== 'POMRX_WG_TRANSPORT_E_UNTRUSTED_PROVIDER') {
      throw new Error('poisoned WeakSet did not preserve provider provenance: ' + observedCode);
    }
    if (providerCalls !== 0) {
      throw new Error('unowned provider executed ' + String(providerCalls) + ' time(s)');
    }
    globalThis.WeakSet = OriginalWeakSet;
  `;

  assertStrictChildPassed(
    runStrictChild(source),
    'pre-import WeakSet poisoning',
  );
});

test('pre-import Promise constructor Proxy is rejected without executing descriptor traps', () => {
  const source = `
    const OriginalPromise = globalThis.Promise;
    let descriptorTrapCalls = 0;
    globalThis.Promise = new Proxy(OriginalPromise, {
      getOwnPropertyDescriptor(target, property) {
        descriptorTrapCalls += 1;
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
    });

    const module = await import(${JSON.stringify(MODULE_URL)});
    let observedCode = null;
    try {
      module.createWalletGuardControlledProviderTransport({
        chainId: '0x1',
        accounts: [${JSON.stringify(ACCOUNT)}],
        providerResult: ${JSON.stringify(TX_RESULT)},
        maxSensitiveCalls: 4,
      });
    } catch (error) {
      observedCode = error?.code ?? null;
    }

    if (observedCode !== 'POMRX_WG_TRANSPORT_E_RUNTIME_INTEGRITY') {
      throw new Error('proxied Promise constructor did not fail closed: ' + observedCode);
    }
    if (descriptorTrapCalls !== 0) {
      throw new Error('Promise constructor descriptor trap executed ' + String(descriptorTrapCalls) + ' time(s)');
    }
    globalThis.Promise = OriginalPromise;
  `;

  assertStrictChildPassed(
    runStrictChild(source),
    'pre-import Promise constructor Proxy',
  );
});


test('post-import node:util.types.isProxy drift fails closed without executing the replacement', () => {
  const source = `
    import { types as utilTypes } from 'node:util';
    const module = await import(${JSON.stringify(MODULE_URL)});
    const originalDescriptor = Object.getOwnPropertyDescriptor(utilTypes, 'isProxy');
    let poisonCalls = 0;
    Object.defineProperty(utilTypes, 'isProxy', {
      ...originalDescriptor,
      value() {
        poisonCalls += 1;
        return false;
      },
    });

    let observedCode = null;
    try {
      module.createWalletGuardControlledProviderTransport({
        chainId: '0x1',
        accounts: [${JSON.stringify(ACCOUNT)}],
        providerResult: ${JSON.stringify(TX_RESULT)},
        maxSensitiveCalls: 4,
      });
    } catch (error) {
      observedCode = error?.code ?? null;
    } finally {
      Object.defineProperty(utilTypes, 'isProxy', originalDescriptor);
    }

    if (observedCode !== 'POMRX_WG_TRANSPORT_E_RUNTIME_INTEGRITY') {
      throw new Error('post-import isProxy drift did not fail closed: ' + observedCode);
    }
    if (poisonCalls !== 0) {
      throw new Error('replacement isProxy executed ' + String(poisonCalls) + ' time(s)');
    }
  `;

  assertStrictChildPassed(
    runStrictChild(source),
    'post-import node:util.types.isProxy drift',
  );
});

test('post-import node:util.types.isPromise drift fails closed without execution or orphaned rejection', () => {
  const source = `
    import { types as utilTypes } from 'node:util';
    const module = await import(${JSON.stringify(MODULE_URL)});
    const originalDescriptor = Object.getOwnPropertyDescriptor(utilTypes, 'isPromise');
    let poisonCalls = 0;
    Object.defineProperty(utilTypes, 'isPromise', {
      ...originalDescriptor,
      value() {
        poisonCalls += 1;
        throw new Error('replacement isPromise executed');
      },
    });

    let observedCode = null;
    try {
      module.createWalletGuardControlledProviderTransport({
        chainId: '0x1',
        accounts: [${JSON.stringify(ACCOUNT)}],
        providerResult: ${JSON.stringify(TX_RESULT)},
        maxSensitiveCalls: 4,
      });
    } catch (error) {
      observedCode = error?.code ?? null;
    } finally {
      Object.defineProperty(utilTypes, 'isPromise', originalDescriptor);
    }

    if (observedCode !== 'POMRX_WG_TRANSPORT_E_RUNTIME_INTEGRITY') {
      throw new Error('post-import isPromise drift did not fail closed: ' + observedCode);
    }
    if (poisonCalls !== 0) {
      throw new Error('replacement isPromise executed ' + String(poisonCalls) + ' time(s)');
    }
  `;

  assertStrictChildPassed(
    runStrictChild(source),
    'post-import node:util.types.isPromise drift',
  );
});
