import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const MODULE_URL = new URL(
  '../../applications/blockchain-digital-assets/wallet-guard/trusted-provider-transport.mjs',
  import.meta.url,
).href;
const ACCOUNT = `0x${'1'.repeat(40)}`;
const TX_RESULT = `0x${'a'.repeat(64)}`;

function runStrictChild(source) {
  return spawnSync(
    process.execPath,
    ['--unhandled-rejections=strict', '--input-type=module', '--eval', source],
    { encoding: 'utf8' },
  );
}

function assertStrictChildPassed(child, label) {
  assert.equal(
    child.status,
    0,
    `${label} child failed\nstdout:\n${child.stdout}\nstderr:\n${child.stderr}`,
  );
  assert.equal(child.signal, null);
}

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
  `;

  assertStrictChildPassed(
    runStrictChild(source),
    'pre-import Object.getPrototypeOf poisoning',
  );
});

test('pre-import WeakSet poisoning cannot bless an unowned provider', () => {
  const source = `
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
  `;

  assertStrictChildPassed(
    runStrictChild(source),
    'pre-import Promise constructor Proxy',
  );
});
