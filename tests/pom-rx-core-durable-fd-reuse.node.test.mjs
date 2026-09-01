import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

// This regression must run in an isolated child because it intentionally patches
// node:fs before the durable store module is imported. The predecessor captured
// async fstat and could be tricked after one successful identity observation:
// close the private root fd, reopen a prepared substitute root on the same fd
// number, then restore the real root before the final fstat. Terminal truth was
// written through /proc/self/fd/<fd> to the substitute while complete() returned
// CONSUMED_SUCCESS. The fixed store must fail before any root-bound read/write can
// execute on the substituted descriptor.
test('descriptor reuse cannot redirect durable terminal persistence', (t) => {
  if (process.platform !== 'linux') {
    t.skip('Linux /proc/self/fd descriptor-reuse regression');
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
    import {
      access,
      cp,
      mkdtemp,
      rm,
    } from 'node:fs/promises';
    import os from 'node:os';
    import path from 'node:path';

    const originalFstat = fs.fstat;
    const originalCloseSync = fs.closeSync;
    const originalOpenSync = fs.openSync;
    let armed = false;
    let substituted = false;
    let restored = false;
    let attackedFd = null;
    let realRoot = null;
    let substituteRoot = null;

    fs.fstat = function attackedFstat(fd, ...args) {
      const callback = args[args.length - 1];
      const options = args.length === 2 ? args[0] : undefined;

      if (!armed) {
        return options === undefined
          ? Reflect.apply(originalFstat, this, [fd, callback])
          : Reflect.apply(originalFstat, this, [fd, options, callback]);
      }

      if (!substituted) {
        const onStat = (error, stat) => {
          if (error) {
            callback(error);
            return;
          }
          attackedFd = fd;
          Reflect.apply(originalCloseSync, fs, [fd]);
          const replacementFd = Reflect.apply(originalOpenSync, fs, [substituteRoot, 'r']);
          assert.equal(replacementFd, fd, 'substitute root must reuse the pinned descriptor number');
          substituted = true;
          callback(null, stat);
        };
        return options === undefined
          ? Reflect.apply(originalFstat, this, [fd, onStat])
          : Reflect.apply(originalFstat, this, [fd, options, onStat]);
      }

      if (!restored && fd === attackedFd) {
        Reflect.apply(originalCloseSync, fs, [fd]);
        const restoredFd = Reflect.apply(originalOpenSync, fs, [realRoot, 'r']);
        assert.equal(restoredFd, fd, 'real root must be restored on the same descriptor number');
        restored = true;
      }

      return options === undefined
        ? Reflect.apply(originalFstat, this, [fd, callback])
        : Reflect.apply(originalFstat, this, [fd, options, callback]);
    };
    syncBuiltinESMExports();

    const { createReferenceDurableClaimStore } = await import(
      ${JSON.stringify(moduleUrl)} + '?fd-reuse=' + Date.now()
    );

    realRoot = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-fd-real-'));
    substituteRoot = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-fd-substitute-'));
    const capabilityId = 'cap-${'8'.repeat(32)}';
    const input = {
      capabilityId,
      authorizationCommitment: '${'9'.repeat(64)}',
    };
    const store = createReferenceDurableClaimStore({ rootDir: realRoot });

    try {
      const claimed = await store.claim(input);
      // Prepare the exact persisted claim under the substitute so the predecessor
      // can read a valid claim and publish only its terminal there after fd reuse.
      await cp(
        path.join(realRoot, capabilityId),
        path.join(substituteRoot, capabilityId),
        { recursive: true },
      );

      armed = true;
      await assert.rejects(
        store.complete(claimed.handle, 'success'),
        (error) => {
          assert.equal(error?.code, 'POMRX_GATE_E_DURABLE_ROOT_INVALID');
          return true;
        },
      );
      assert.equal(substituted, true, 'the descriptor substitution attack must actually execute');

      await assert.rejects(
        access(path.join(substituteRoot, capabilityId, 'terminal.json')),
      );
      await assert.rejects(
        access(path.join(realRoot, capabilityId, 'terminal.json')),
      );
    } finally {
      await store.close().catch(() => {});
      await Promise.all([
        rm(realRoot, { recursive: true, force: true }),
        rm(substituteRoot, { recursive: true, force: true }),
      ]);
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
    `descriptor-reuse child failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
});
