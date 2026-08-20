import assert from 'node:assert/strict';
import {
  mkdtemp,
  readdir,
  rm,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  createReferenceDurableClaimStore,
} from '../core/gate/reference-durable-claim-store.mjs';

const AUTHORIZATION = '7'.repeat(64);

async function withTempDir(run) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-durable-publish-'));
  try {
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function inputFor(index) {
  return {
    capabilityId: `cap-${index.toString(16).padStart(32, '0')}`,
    authorizationCommitment: AUTHORIZATION,
  };
}

function assertClaimPublicationState(state) {
  assert.ok(
    ['ABSENT', 'RESERVED_INCOMPLETE', 'RESERVED'].includes(state),
    `unexpected claim-publication state: ${state}`,
  );
}

function assertTerminalPublicationState(state) {
  assert.ok(
    ['RESERVED', 'CONSUMED_SUCCESS'].includes(state),
    `unexpected terminal-publication state: ${state}`,
  );
}

test('concurrent inspect never observes a partially published claim or terminal record', async () => {
  await withTempDir(async (rootDir) => {
    for (let index = 1; index <= 32; index += 1) {
      const writer = createReferenceDurableClaimStore({ rootDir });
      const observer = createReferenceDurableClaimStore({ rootDir });
      const input = inputFor(index);

      let claimDone = false;
      const claimPromise = writer.claim(input).finally(() => {
        claimDone = true;
      });
      while (!claimDone) {
        const inspection = await observer.inspect(input);
        assertClaimPublicationState(inspection.state);
      }
      const claimed = await claimPromise;
      assert.equal((await observer.inspect(input)).state, 'RESERVED');

      let completionDone = false;
      const completionPromise = writer.complete(claimed.handle, 'success').finally(() => {
        completionDone = true;
      });
      while (!completionDone) {
        const inspection = await observer.inspect(input);
        assertTerminalPublicationState(inspection.state);
      }
      const completed = await completionPromise;
      assert.equal(completed.state, 'CONSUMED_SUCCESS');
      assert.equal((await observer.inspect(input)).state, 'CONSUMED_SUCCESS');

      const entries = await readdir(path.join(rootDir, input.capabilityId));
      assert.equal(entries.some((entry) => entry.endsWith('.tmp')), false);
    }
  });
});
