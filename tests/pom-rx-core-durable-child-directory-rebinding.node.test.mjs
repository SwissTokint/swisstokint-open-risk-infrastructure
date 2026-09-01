import assert from 'node:assert/strict';
import {
  copyFile,
  mkdtemp,
  rename,
  rm,
  symlink,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  createReferenceDurableClaimStore,
} from '../core/gate/reference-durable-claim-store.mjs';

const h = (character) => character.repeat(64);

async function tempDir(prefix) {
  return mkdtemp(path.join(os.tmpdir(), prefix));
}

test('claimed child-directory rebinding cannot redirect terminal publication', async (t) => {
  if (process.platform === 'win32') {
    t.skip('directory-symlink rebinding regression is Unix-specific');
    return;
  }

  const rootDir = await tempDir('pom-rx-durable-child-root-');
  const substituteDir = await tempDir('pom-rx-durable-child-substitute-');
  const input = {
    capabilityId: `cap-${'8'.repeat(32)}`,
    authorizationCommitment: h('9'),
  };
  const claimDirectory = path.join(rootDir, input.capabilityId);
  const movedClaimDirectory = path.join(rootDir, `${input.capabilityId}.original`);
  const substituteClaimPath = path.join(substituteDir, 'claim.json');
  const substituteTerminalPath = path.join(substituteDir, 'terminal.json');
  const store = createReferenceDurableClaimStore({ rootDir });
  let originalMoved = false;
  let substituteLinked = false;

  try {
    const claim = await store.claim(input);

    await rename(claimDirectory, movedClaimDirectory);
    originalMoved = true;
    await copyFile(path.join(movedClaimDirectory, 'claim.json'), substituteClaimPath);
    await symlink(substituteDir, claimDirectory, 'dir');
    substituteLinked = true;

    await assert.rejects(
      store.complete(claim.handle, 'error'),
      (error) => {
        assert.equal(error?.code, 'POMRX_GATE_E_DURABLE_CORRUPT');
        return true;
      },
      'completion must fail closed when the claimed child directory identity changes',
    );

    await assert.rejects(
      import('node:fs/promises').then(({ readFile }) => readFile(substituteTerminalPath, 'utf8')),
      (error) => {
        assert.equal(error?.code, 'ENOENT');
        return true;
      },
      'terminal truth must never be published through the replacement child path',
    );

    await rm(claimDirectory, { force: true });
    substituteLinked = false;
    await rename(movedClaimDirectory, claimDirectory);
    originalMoved = false;

    const inspection = await store.inspect(input);
    assert.equal(inspection.state, 'RESERVED');
  } finally {
    if (substituteLinked) {
      await rm(claimDirectory, { force: true }).catch(() => {});
    }
    if (originalMoved) {
      await rename(movedClaimDirectory, claimDirectory).catch(() => {});
    }
    await store.close().catch(() => {});
    await Promise.all([
      rm(rootDir, { recursive: true, force: true }),
      rm(substituteDir, { recursive: true, force: true }),
    ]);
  }
});
