import assert from 'node:assert/strict';
import { lstat, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  PomRxDurableClaimStoreError,
  createReferenceDurableClaimStore,
} from '../core/gate/reference-durable-claim-store.mjs';

const CAPABILITY = `cap-${'d'.repeat(32)}`;
const AUTHORIZATION = '3'.repeat(64);

function expectCode(error, code) {
  assert.ok(error instanceof PomRxDurableClaimStoreError);
  assert.equal(error.code, code);
  return true;
}

test('durable claim root must be pre-existing and is never auto-created by the store', async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-durable-root-'));
  const missingRoot = path.join(parent, 'not-provisioned');
  try {
    const durableStore = createReferenceDurableClaimStore({ rootDir: missingRoot });
    await assert.rejects(
      durableStore.claim({
        capabilityId: CAPABILITY,
        authorizationCommitment: AUTHORIZATION,
      }),
      (error) => expectCode(error, 'POMRX_GATE_E_DURABLE_ROOT_INVALID'),
    );
    await assert.rejects(
      lstat(missingRoot),
      (error) => error?.code === 'ENOENT',
    );
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});
