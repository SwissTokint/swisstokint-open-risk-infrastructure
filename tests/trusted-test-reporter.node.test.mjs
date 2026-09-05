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

function fileSummary(overrides = {}) {
  return {
    type: 'test:summary',
    data: {
      file: resolve(expectedPath),
      success: true,
      counts: { tests: 3, passed: 3, failed: 0, cancelled: 0, skipped: 0, todo: 0 },
      ...overrides,
    },
  };
}

const finalSummary = Object.freeze({
  type: 'test:summary',
  data: { success: true, counts: { tests: 3, passed: 3, failed: 0, cancelled: 0 } },
});

test('reporter accepts one successful authenticated summary per trusted file', async () => {
  const reporter = createTrustedTestReporter([expectedPath]);
  assert.deepEqual(await collect(reporter, [
    { type: 'test:stdout', data: { message: 'candidate output is not evidence' } },
    fileSummary(),
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
      { type: 'test:pass', data: { name: expectedPath, file: resolve(expectedPath) } },
      finalSummary,
    ]),
    /missing authenticated summaries/u,
  );
});

test('reporter rejects incomplete, duplicate and unexpected file summaries', async () => {
  for (const events of [
    [fileSummary({ success: false }), finalSummary],
    [fileSummary({ counts: { tests: 0, failed: 0, cancelled: 0 } }), finalSummary],
    [fileSummary({ counts: { tests: 3, passed: 2, failed: 0, cancelled: 0, skipped: 1, todo: 0 } }), finalSummary],
    [fileSummary({ counts: { tests: 3, passed: 2, failed: 0, cancelled: 0, skipped: 0, todo: 1 } }), finalSummary],
    [fileSummary(), fileSummary(), finalSummary],
    [fileSummary({ file: resolve('tests/other.test.mjs') }), finalSummary],
    [fileSummary()],
  ]) {
    await assert.rejects(collect(createTrustedTestReporter([expectedPath]), events), Error);
  }
});
