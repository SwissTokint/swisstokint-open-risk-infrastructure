import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const preload = './scripts/trusted-promise-data-preload.cjs';
const transport = './applications/blockchain-digital-assets/wallet-guard/trusted-provider-transport.mjs';
const options = {
  chainId: '0x1', accounts: [`0x${'1'.repeat(40)}`],
  providerResult: `0x${'a'.repeat(64)}`, maxSensitiveCalls: 1,
};
const setup = `
  import assert from 'node:assert/strict';
  import { types } from 'node:util';
  const { createWalletGuardControlledProviderTransport: createTransport } = await import(${JSON.stringify(transport)});
  const options = ${JSON.stringify(options)};
`;
const happyPath = `
  const { provider, control } = createTransport(options);
  for (const [method, expected] of [['eth_chainId', '0x1'], ['eth_accounts', options.accounts]]) {
    const result = provider.request({ method, params: [] });
    assert.equal(types.isPromise(result), true);
    assert.equal(Object.getPrototypeOf(result), Promise.prototype);
    assert.deepEqual(Object.getOwnPropertyNames(result), []);
    assert.deepEqual(await result, expected);
  }
  assert.equal(control.inspect().sensitive_call_count, 0);
`;

function child(args, source) {
  const environment = { ...process.env };
  for (const key of ['NODE_OPTIONS', 'NODE_PATH', 'NODE_TEST_CONTEXT']) delete environment[key];
  return spawnSync(process.execPath, [...args, '--input-type=module', '--eval', source], {
    cwd: root, env: environment, encoding: 'utf8', timeout: 10_000, maxBuffer: 1024 * 1024,
  });
}

function passed(result) {
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

for (const [profile, args] of [
  ['ordinary', []],
  ['prepared', ['--require', preload]],
  ['prepared and frozen', ['--require', preload, '--frozen-intrinsics']],
]) {
  test(`${profile} runtime preserves same-realm native context Promises`, () => {
    passed(child(args, `${setup}${happyPath}`));
  });
}

test('preparation preserves two immutable data properties through Node freezing', () => {
  passed(child(['--require', preload, '--frozen-intrinsics'], `
    import assert from 'node:assert/strict';
    for (const name of ['constructor', 'then']) {
      const descriptor = Object.getOwnPropertyDescriptor(Promise.prototype, name);
      assert.equal(Object.hasOwn(descriptor, 'value'), true);
      assert.equal(Object.hasOwn(descriptor, 'get'), false);
      assert.equal(Object.hasOwn(descriptor, 'set'), false);
      assert.equal(descriptor.writable, false);
      assert.equal(descriptor.configurable, false);
      assert.equal(descriptor.enumerable, false);
    }
    assert.equal(Object.isFrozen(Promise), true);
    assert.equal(Object.isFrozen(Promise.prototype), true);
    assert.equal(Object.getOwnPropertyDescriptor(Promise.prototype, 'constructor').value, Promise);
    assert.equal(Object.getOwnPropertyDescriptor(Promise, Symbol.species).set, undefined);
  `));
});

test('unprepared Node freezing remains an unsupported accessor profile', () => {
  passed(child(['--frozen-intrinsics'], `${setup}
    assert.throws(() => createTransport(options), { code: 'POMRX_WG_TRANSPORT_E_RUNTIME_INTEGRITY' });
  `));
});

test('an import after freezing cannot repair the unsupported accessor profile', () => {
  passed(child(['--frozen-intrinsics'], `
    import assert from 'node:assert/strict';
    await assert.rejects(import(${JSON.stringify(preload)}), /requires native data properties before Node freezing/u);
  `));
});

test('freezing only Promise statics is outside the three supported profiles', () => {
  passed(child([], `Object.freeze(Promise); ${setup}
    assert.throws(() => createTransport(options), { code: 'POMRX_WG_TRANSPORT_E_RUNTIME_INTEGRITY' });
  `));
});

test('preparation after transport initialization remains descriptor drift', () => {
  passed(child([], `${setup}${happyPath}
    await import(${JSON.stringify(preload)});
    assert.throws(() => createTransport(options), { code: 'POMRX_WG_TRANSPORT_E_RUNTIME_INTEGRITY' });
  `));
});

test('prepared frozen runtime executes the unchanged ordinary server integration', () => {
  const environment = { ...process.env };
  for (const key of ['NODE_OPTIONS', 'NODE_PATH', 'NODE_TEST_CONTEXT']) delete environment[key];
  const result = spawnSync(process.execPath, [
    '--require', preload, '--frozen-intrinsics', '--test', '--test-reporter=tap',
    '--test-name-pattern=^loopback prototype authenticates one page and executes DENY then one bound ALLOW$',
    'tests/wallet-guard/prototype-server.node.test.mjs',
  ], { cwd: root, env: environment, encoding: 'utf8', timeout: 20_000, maxBuffer: 1024 * 1024 });
  passed(result);
  assert.match(result.stdout, /# pass 1\b/u);
  assert.match(result.stdout, /# fail 0\b/u);
});
