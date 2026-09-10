import { runTrustedTestChild } from './helpers/trusted-test-child.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

test('trusted child completes assertions after an asynchronous final turn', () => {
  const child = runTrustedTestChild(`
    import assert from 'node:assert/strict';
    let completed = false;
    await new Promise((resolve) => setImmediate(() => { completed = true; resolve(); }));
    assert.equal(completed, true);
  `);
  assert.equal(child.error, undefined);
  assert.equal(child.status, 0);
  assert.equal(child.signal, null);
});

test('trusted child has explicit environment and strict non-frozen execution', () => {
  runTrustedTestChild(`
    import assert from 'node:assert/strict';
    // Node 24 adds its own worker ID after startup, including isolation=none.
    // It is not an inherited launcher input; Node 22 need not add it.
    assert.deepEqual(Object.keys(process.env).filter((key) => key !== 'NODE_TEST_WORKER_ID').sort(), [
      'LANG', 'LC_ALL', 'TRUSTED_CHILD_SOURCE_BASE64',
      'TRUSTED_TEST_MANIFEST', 'TRUSTED_TEST_PATH', 'TZ',
    ].sort());
    assert.equal(process.env.LANG, 'C.UTF-8');
    assert.equal(process.env.TZ, 'UTC');
    assert.equal(process.execArgv.includes('--unhandled-rejections=strict'), true);
    assert.equal(process.execArgv.includes('--frozen-intrinsics'), false);
    assert.equal(Object.isFrozen(Promise.prototype), false);
    assert.equal(process.permission.has('child'), false);
    assert.equal(process.permission.has('fs.write'), false);
  `);
});

test('trusted child reports an ordinary assertion failure to its parent', () => {
  assert.throws(() => runTrustedTestChild(`
    import assert from 'node:assert/strict';
    assert.equal(1, 2, 'ordinary child assertion failure');
  `), /trusted child failed/u);
});

test('trusted child requires an uncontaminated terminal result', () => {
  assert.throws(() => runTrustedTestChild(`
    console.log('ordinary application diagnostic on stdout');
  `), /trusted child failed/u);
});

test('trusted child rejects missing, non-string and oversized source before launch', () => {
  for (const source of [undefined, null, {}, 7]) {
    assert.throws(() => runTrustedTestChild(source), /source must be a string/u);
  }
  assert.throws(() => runTrustedTestChild(''), /source exceeds its byte bounds/u);
  assert.throws(() => runTrustedTestChild(' '.repeat(96 * 1024 + 1)), /source exceeds its byte bounds/u);
  assert.throws(() => runTrustedTestChild('é'.repeat(48 * 1024 + 1)), /source exceeds its byte bounds/u);
});
