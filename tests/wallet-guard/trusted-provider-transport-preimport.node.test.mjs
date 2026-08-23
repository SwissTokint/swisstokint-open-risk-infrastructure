import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const MODULE_URL = new URL(
  '../../applications/blockchain-digital-assets/wallet-guard/trusted-provider-transport.mjs',
  import.meta.url,
).href;
const ACCOUNT = `0x${'1'.repeat(40)}`;
const TX_RESULT = `0x${'a'.repeat(64)}`;

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

  return spawnSync(
    process.execPath,
    ['--unhandled-rejections=strict', '--input-type=module', '--eval', source],
    { encoding: 'utf8' },
  );
}

for (const method of ['resolve', 'reject']) {
  test(`pre-import Promise.${method} poisoning is rejected without executing the poisoned method`, () => {
    const child = runPreImportPoisonCase(method);
    assert.equal(
      child.status,
      0,
      `pre-import ${method} poisoning child failed\nstdout:\n${child.stdout}\nstderr:\n${child.stderr}`,
    );
    assert.equal(child.signal, null);
  });
}
