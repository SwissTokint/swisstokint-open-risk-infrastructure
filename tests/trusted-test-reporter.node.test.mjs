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
