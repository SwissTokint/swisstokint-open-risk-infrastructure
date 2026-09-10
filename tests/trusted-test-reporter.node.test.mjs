import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import test from 'node:test';

import { createTrustedTestReporter } from '../scripts/trusted-test-reporter.mjs';

const expectedPath = 'tests/example.test.mjs';

async function collect(reporter, events) {
  async function* source() {
    yield* events;
  }
  const output = [];
  for await (const chunk of reporter(source())) output.push(chunk);
  return output;
}

function passEvent(overrides = {}) {
  return {
    type: 'test:pass',
    data: {
      file: resolve(expectedPath),
      name: 'direct trusted test',
      ...overrides,
    },
  };
}

const finalSummary = Object.freeze({
  type: 'test:summary',
  data: { success: true, counts: { tests: 3, passed: 3, failed: 0, cancelled: 0 } },
});

test('reporter accepts direct lifecycle passes from non-isolated tests', async () => {
  const reporter = createTrustedTestReporter([expectedPath]);
  assert.deepEqual(await collect(reporter, [
    { type: 'test:stdout', data: { message: 'candidate output is not evidence' } },
    passEvent(),
    passEvent(),
    passEvent(),
    finalSummary,
  ]), [
    `trusted-test-file-pass ${expectedPath} tests=3\n`,
    'trusted-test-suite-pass files=1\n',
  ]);
});

test('reporter rejects the file-level false pass produced by process.exit(0)', async () => {
  const reporter = createTrustedTestReporter([expectedPath]);
  await assert.rejects(
    collect(reporter, [
      finalSummary,
    ]),
    /missing direct pass events/u,
  );
});

test('reporter rejects a forged all-pass transcript followed by a real failure', async () => {
  const reporter = createTrustedTestReporter([expectedPath]);
  await assert.rejects(
    collect(reporter, [
      passEvent(),
      { type: 'test:fail', data: { name: 'assert.fail regression' } },
      finalSummary,
    ]),
    /failing lifecycle event/u,
  );
});

test('reporter rejects process-isolated, duplicate, incomplete and unexpected evidence', async () => {
  for (const events of [
    [{ type: 'test:summary', data: { ...finalSummary.data, file: resolve(expectedPath) } }],
    [passEvent({ file: resolve('tests/other.test.mjs') }), finalSummary],
    [passEvent({ file: undefined }), finalSummary],
    [passEvent()],
    [passEvent(), finalSummary, finalSummary],
    [passEvent(), { type: 'test:summary', data: { success: false, counts: {} } }],
    [passEvent(), { type: 'test:summary', data: {
      success: true,
      counts: { tests: 1, passed: 0, failed: 0, cancelled: 0, skipped: 1, todo: 0 },
    } }],
  ]) {
    await assert.rejects(collect(createTrustedTestReporter([expectedPath]), events), Error);
  }
});

test('reporter accepts only the exact reviewed Linux platform skip count', async () => {
  const reviewedPath = 'tests/pom-rx-v01-strict-activation.node.test.mjs';
  const reviewedSummary = {
    type: 'test:summary',
    data: {
      success: true,
      counts: { tests: 2, passed: 1, failed: 0, cancelled: 0, skipped: 1, todo: 0 },
    },
  };
  assert.deepEqual(await collect(createTrustedTestReporter([reviewedPath], { platform: 'linux' }), [
    passEvent({ file: resolve(reviewedPath), name: 'reviewed green test' }),
    passEvent({
      file: resolve(reviewedPath),
      name: 'Windows strict production boundary is explicit fail-closed until native metadata evidence exists',
      skip: true,
    }),
    reviewedSummary,
  ]), [
    `trusted-test-file-pass ${reviewedPath} tests=2\n`,
    'trusted-test-suite-pass files=1\n',
  ]);
  await assert.rejects(
    collect(createTrustedTestReporter([reviewedPath], { platform: 'linux' }), [
      passEvent({ file: resolve(reviewedPath) }),
      {
        type: 'test:summary',
        data: {
          success: true,
          counts: { tests: 2, passed: 0, failed: 0, cancelled: 0, skipped: 2, todo: 0 },
        },
      },
    ]),
    /reviewed pass and platform-skip counts/u,
  );

  const compatibilityPath = 'tests/pom-rx-v01-compat-fixtures.node.test.mjs';
  const compatibilitySummary = {
    type: 'test:summary',
    data: {
      success: true,
      counts: { tests: 3, passed: 1, failed: 0, cancelled: 0, skipped: 2, todo: 0 },
    },
  };
  assert.deepEqual(
    await collect(createTrustedTestReporter([compatibilityPath], { platform: 'linux' }), [
      passEvent({ file: resolve(compatibilityPath), name: 'reviewed compatibility assertion' }),
      passEvent({
        file: resolve(compatibilityPath),
        name: 'Windows native metadata is revalidated after enumeration before a standalone read',
        skip: true,
      }),
      passEvent({
        file: resolve(compatibilityPath),
        name: 'frozen source binding rejects blob, raw-byte, import-URL and four-file drift',
        skip: 'host git integration remains in canonical CI',
      }),
      compatibilitySummary,
    ]),
    [
      `trusted-test-file-pass ${compatibilityPath} tests=3\n`,
      'trusted-test-suite-pass files=1\n',
    ],
  );

  await assert.rejects(
    collect(createTrustedTestReporter([reviewedPath], { platform: 'linux' }), [
      passEvent({ file: resolve(reviewedPath), name: 'reviewed green test' }),
      passEvent({ file: resolve(reviewedPath), name: 'different security assertion', skip: true }),
      reviewedSummary,
    ]),
    /unreviewed skipped test/u,
  );
});
