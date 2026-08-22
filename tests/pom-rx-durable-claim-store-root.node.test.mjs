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

test('post-import node:path mutation cannot redirect configured or claim roots', async () => {
  const configuredRoot = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-durable-path-configured-'));
  const substitutedRoot = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-durable-path-substituted-'));
  const originalResolve = path.resolve;
  const originalJoin = path.join;
  let store;

  try {
    path.resolve = function poisonedResolve() {
      return substitutedRoot;
    };
    store = createReferenceDurableClaimStore({ rootDir: configuredRoot });
  } finally {
    path.resolve = originalResolve;
  }

  try {
    path.join = function poisonedJoin(first, ...rest) {
      if (first === configuredRoot) return originalJoin(substitutedRoot, ...rest);
      return originalJoin(first, ...rest);
    };
    await store.claim({
      capabilityId: CAPABILITY,
      authorizationCommitment: AUTHORIZATION,
    });
  } finally {
    path.join = originalJoin;
  }

  try {
    const input = {
      capabilityId: CAPABILITY,
      authorizationCommitment: AUTHORIZATION,
    };
    assert.equal(
      (await createReferenceDurableClaimStore({ rootDir: configuredRoot }).inspect(input)).state,
      'RESERVED',
    );
    assert.equal(
      (await createReferenceDurableClaimStore({ rootDir: substitutedRoot }).inspect(input)).state,
      'ABSENT',
    );
  } finally {
    await Promise.all([
      rm(configuredRoot, { recursive: true, force: true }),
      rm(substitutedRoot, { recursive: true, force: true }),
    ]);
  }
});

test('post-import RegExp poisoning cannot admit traversal-shaped durable capability ids', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-durable-regexp-'));
  const parentDir = path.dirname(rootDir);
  const outsideName = `${path.basename(rootDir)}-escaped`;
  const outsidePath = path.join(parentDir, outsideName);
  const traversalCapability = `../${outsideName}`;
  const originalTest = RegExp.prototype.test;
  const store = createReferenceDurableClaimStore({ rootDir });
  let pending;

  try {
    RegExp.prototype.test = () => true;
    pending = store.claim({
      capabilityId: traversalCapability,
      authorizationCommitment: 'not-a-sha256',
    });
  } finally {
    RegExp.prototype.test = originalTest;
  }

  try {
    await assert.rejects(
      pending,
      (error) => expectCode(error, 'POMRX_GATE_E_DURABLE_INVALID'),
    );
    await assert.rejects(
      lstat(outsidePath),
      (error) => error?.code === 'ENOENT',
    );
  } finally {
    await Promise.all([
      rm(rootDir, { recursive: true, force: true }),
      rm(outsidePath, { recursive: true, force: true }),
    ]);
  }
});
