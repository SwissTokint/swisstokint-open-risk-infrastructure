import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmod,
  mkdir,
  mkdtemp,
  readdir,
  rename,
  rm,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  createReferenceDurableClaimStore,
} from '../core/gate/reference-durable-claim-store.mjs';

const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_OWN_PROPERTY_NAMES = Object.getOwnPropertyNames;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_PROTOTYPE = Object.prototype;

const h = (character) => character.repeat(64);

async function tempDir(prefix) {
  return mkdtemp(path.join(os.tmpdir(), prefix));
}

function restoreObjectPrototypeThen(descriptor) {
  if (descriptor) {
    OBJECT_DEFINE_PROPERTY(OBJECT_PROTOTYPE, 'then', descriptor);
  } else {
    delete OBJECT_PROTOTYPE.then;
  }
}

function inertClone(value, replacements = null) {
  const clone = OBJECT_CREATE(null);
  const descriptors = OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
  const keys = OBJECT_GET_OWN_PROPERTY_NAMES(descriptors);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    const descriptor = descriptors[key];
    if (replacements && OBJECT_HAS_OWN(replacements, key)) {
      descriptor.value = replacements[key];
    }
    OBJECT_DEFINE_PROPERTY(clone, key, descriptor);
  }
  return OBJECT_FREEZE(clone);
}

test('durable root pathname rebinding cannot reopen an already-consumed capability', async () => {
  const rootDir = await tempDir('pom-rx-durable-root-identity-');
  const movedRoot = `${rootDir}-moved`;
  const input = {
    capabilityId: `cap-${'a'.repeat(32)}`,
    authorizationCommitment: h('b'),
  };

  try {
    const store = createReferenceDurableClaimStore({ rootDir });
    const first = await store.claim(input);
    await store.complete(first.handle, 'success');

    await rename(rootDir, movedRoot);
    await mkdir(rootDir, { mode: 0o700 });

    await assert.rejects(
      store.claim(input),
      (error) => {
        assert.equal(error?.code, 'POMRX_GATE_E_DURABLE_ROOT_INVALID');
        return true;
      },
    );
    await store.close();
  } finally {
    await Promise.all([
      rm(rootDir, { recursive: true, force: true }),
      rm(movedRoot, { recursive: true, force: true }),
    ]);
  }
});

test('inherited Object.prototype.then cannot substitute lstat metadata before root validation', async (t) => {
  if (process.platform === 'win32') {
    t.skip('Unix permission invariant');
    return;
  }

  const rootDir = await tempDir('pom-rx-durable-lstat-thenable-');
  const input = {
    capabilityId: `cap-${'c'.repeat(32)}`,
    authorizationCommitment: h('d'),
  };
  const originalThen = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(OBJECT_PROTOTYPE, 'then');
  let thenCalls = 0;
  let observedError = null;

  await chmod(rootDir, 0o777);
  const store = createReferenceDurableClaimStore({ rootDir });

  try {
    OBJECT_DEFINE_PROPERTY(OBJECT_PROTOTYPE, 'then', {
      configurable: true,
      enumerable: false,
      writable: true,
      value(resolve, reject) {
        thenCalls += 1;
        try {
          if (typeof this?.mode === 'number' && typeof this?.isDirectory === 'function') {
            // Reproduce the predecessor attack: make a genuine Stats object look
            // owner-only, then shadow the inherited hook before resolving it.
            OBJECT_DEFINE_PROPERTY(this, 'then', {
              configurable: true,
              enumerable: false,
              writable: true,
              value: undefined,
            });
            this.mode = (this.mode & ~0o777) | 0o700;
            resolve(this);
            return;
          }
          resolve(inertClone(this));
        } catch (error) {
          reject(error);
        }
      },
    });

    try {
      await store.claim(input);
    } catch (error) {
      observedError = error;
    }
  } finally {
    restoreObjectPrototypeThen(originalThen);
  }

  try {
    assert.equal(thenCalls, 0);
    assert.equal(observedError?.code, 'POMRX_GATE_E_DURABLE_ROOT_INVALID');
  } finally {
    await store.close().catch(() => {});
    await chmod(rootDir, 0o700).catch(() => {});
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('inherited Object.prototype.then cannot swap durable claim handles across concurrent claims', async () => {
  const rootDir = await tempDir('pom-rx-durable-claim-result-thenable-');
  const inputA = {
    capabilityId: `cap-${'e'.repeat(32)}`,
    authorizationCommitment: h('1'),
  };
  const inputB = {
    capabilityId: `cap-${'f'.repeat(32)}`,
    authorizationCommitment: h('2'),
  };
  const originalThen = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(OBJECT_PROTOTYPE, 'then');
  const pendingResults = [];
  let thenCalls = 0;
  let resultA;
  let resultB;
  let store;

  try {
    store = createReferenceDurableClaimStore({ rootDir });

    OBJECT_DEFINE_PROPERTY(OBJECT_PROTOTYPE, 'then', {
      configurable: true,
      enumerable: false,
      writable: true,
      value(resolve, reject) {
        thenCalls += 1;
        try {
          if (this
              && OBJECT_HAS_OWN(this, 'handle')
              && OBJECT_HAS_OWN(this, 'claim')) {
            pendingResults.push({ value: this, resolve });
            if (pendingResults.length === 2) {
              const first = pendingResults[0];
              const second = pendingResults[1];
              first.resolve(inertClone(first.value, { handle: second.value.handle }));
              second.resolve(inertClone(second.value, { handle: first.value.handle }));
            }
            return;
          }
          resolve(inertClone(this));
        } catch (error) {
          reject(error);
        }
      },
    });

    const claimA = store.claim(inputA);
    const claimB = store.claim(inputB);
    try {
      resultA = await claimA;
      resultB = await claimB;
    } finally {
      restoreObjectPrototypeThen(originalThen);
    }

    assert.equal(thenCalls, 0);

    await store.complete(resultA.handle, 'success');
    await store.complete(resultB.handle, 'error');

    assert.equal((await store.inspect(inputA)).state, 'CONSUMED_SUCCESS');
    assert.equal((await store.inspect(inputB)).state, 'CONSUMED_ERROR');
  } finally {
    restoreObjectPrototypeThen(originalThen);
    await store?.close().catch(() => {});
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('persisted records and inspection results are prototype-inert before async resolution', async () => {
  const rootDir = await tempDir('pom-rx-durable-record-thenable-');
  const input = {
    capabilityId: `cap-${'1'.repeat(32)}`,
    authorizationCommitment: h('3'),
  };
  const originalThen = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(OBJECT_PROTOTYPE, 'then');
  const store = createReferenceDurableClaimStore({ rootDir });
  let thenCalls = 0;

  try {
    const claim = await store.claim(input);
    await store.complete(claim.handle, 'error');

    OBJECT_DEFINE_PROPERTY(OBJECT_PROTOTYPE, 'then', {
      configurable: true,
      enumerable: false,
      writable: true,
      value(resolve, reject) {
        thenCalls += 1;
        try {
          if (this && OBJECT_HAS_OWN(this, 'state')) {
            resolve(inertClone(this, { state: 'CONSUMED_SUCCESS' }));
            return;
          }
          if (this && OBJECT_HAS_OWN(this, 'terminal_state')) {
            resolve(inertClone(this, { terminal_state: 'CONSUMED_SUCCESS' }));
            return;
          }
          resolve(inertClone(this));
        } catch (error) {
          reject(error);
        }
      },
    });

    const inspection = await store.inspect(input);
    assert.equal(inspection.state, 'CONSUMED_ERROR');
    assert.equal(thenCalls, 0);
  } finally {
    restoreObjectPrototypeThen(originalThen);
    await store.close().catch(() => {});
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('explicit store close releases pinned Linux root descriptors and rejects reuse', async (t) => {
  if (process.platform !== 'linux') {
    t.skip('Linux /proc/self/fd lifecycle regression');
    return;
  }

  const rootDir = await tempDir('pom-rx-durable-close-fd-');
  const input = {
    capabilityId: `cap-${'4'.repeat(32)}`,
    authorizationCommitment: h('5'),
  };
  const stores = [];

  try {
    const baseline = (await readdir('/proc/self/fd')).length;
    for (let index = 0; index < 24; index += 1) {
      const store = createReferenceDurableClaimStore({ rootDir });
      await store.inspect(input);
      stores.push(store);
    }
    const pinned = (await readdir('/proc/self/fd')).length;
    assert.ok(
      pinned >= baseline + 22,
      `expected pinned descriptor growth, baseline=${baseline}, pinned=${pinned}`,
    );

    await Promise.all(stores.map((store) => store.close()));
    const released = (await readdir('/proc/self/fd')).length;
    assert.ok(
      released <= baseline + 2,
      `expected descriptors to be released, baseline=${baseline}, released=${released}`,
    );

    await stores[0].close();
    await assert.rejects(
      stores[0].inspect(input),
      (error) => {
        assert.equal(error?.code, 'POMRX_GATE_E_DURABLE_CLOSED');
        return true;
      },
    );
  } finally {
    await Promise.all(stores.map((store) => store.close().catch(() => {})));
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('Linux durable bootstrap fails explicitly when procfs fd paths are unavailable', (t) => {
  if (process.platform !== 'linux') {
    t.skip('Linux procfs bootstrap regression');
    return;
  }

  const moduleUrl = new URL(
    '../core/gate/reference-durable-claim-store.mjs',
    import.meta.url,
  ).href;
  const script = `
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import { syncBuiltinESMExports } from 'node:module';
    import { mkdtemp, rm } from 'node:fs/promises';
    import os from 'node:os';
    import path from 'node:path';

    const originalLstat = fs.lstat;
    const originalStat = fs.stat;
    const denyProcFd = (original) => function(filePath, ...args) {
      if (typeof filePath === 'string' && filePath.startsWith('/proc/self/fd/')) {
        const callback = args[args.length - 1];
        const error = new Error('simulated procfs denial');
        error.code = 'EACCES';
        queueMicrotask(() => callback(error));
        return;
      }
      return Reflect.apply(original, this, [filePath, ...args]);
    };
    fs.lstat = denyProcFd(originalLstat);
    fs.stat = denyProcFd(originalStat);
    syncBuiltinESMExports();

    const { createReferenceDurableClaimStore } = await import(
      ${JSON.stringify(moduleUrl)} + '?procfs-denied=' + Date.now()
    );
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-procfs-denied-'));
    try {
      const store = createReferenceDurableClaimStore({ rootDir });
      await assert.rejects(
        store.inspect({
          capabilityId: 'cap-${'6'.repeat(32)}',
          authorizationCommitment: '${h('7')}',
        }),
        (error) => {
          assert.equal(error?.code, 'POMRX_GATE_E_DURABLE_ROOT_INVALID');
          assert.match(error?.message ?? '', /procfs \\/proc\\/self\\/fd/u);
          return true;
        },
      );
      await store.close();
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  `;

  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', script],
    { encoding: 'utf8' },
  );
  assert.equal(
    result.status,
    0,
    `procfs fault-injection child failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
});
