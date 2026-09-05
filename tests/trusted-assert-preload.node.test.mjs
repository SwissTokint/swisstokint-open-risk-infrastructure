import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const preloadUrl = new URL('../scripts/trusted-assert-preload.mjs', import.meta.url).href;

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

test('trusted preload freezes the shared strict-assert identity', async () => {
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
