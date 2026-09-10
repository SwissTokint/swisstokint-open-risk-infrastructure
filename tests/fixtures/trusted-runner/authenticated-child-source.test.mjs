import assert from 'node:assert/strict';
import test from 'node:test';

const encodedSource = process.env.TRUSTED_CHILD_SOURCE_BASE64;
assert.equal(typeof encodedSource, 'string');
assert.match(encodedSource, /^[A-Za-z0-9+/]+={0,2}$/u);
assert.ok(encodedSource.length > 0 && encodedSource.length <= 128 * 1024);

const sourceUrl = `data:text/javascript;base64,${encodedSource}`;

test('authenticated child source reaches its final statement', async () => {
  await import(sourceUrl);
});
