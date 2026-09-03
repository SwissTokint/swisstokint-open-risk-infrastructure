import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

// This regression runs in an isolated child because it intentionally patches
// node:fs before the durable store module is imported. If the authoritative fd
// still lives in this process, the historical close/reuse attack must execute and
// fail closed. If the implementation isolates authoritative descriptors in a
// separate process, the parent-side attack must be unable to observe/substitute
// them and durable truth must remain bound to the real root.
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
      await cp(
        path.join(realRoot, capabilityId),
        path.join(substituteRoot, capabilityId),
        { recursive: true },
      );

      armed = true;
      let completion = null;
      let completionError = null;
      try {
        completion = await store.complete(claimed.handle, 'success');
      } catch (error) {
        completionError = error;
      }

      if (substituted) {
        assert.ok(completionError, 'shared-table fd substitution must fail closed');
        assert.equal(completionError?.code, 'POMRX_GATE_E_DURABLE_ROOT_INVALID');
        await assert.rejects(
          access(path.join(substituteRoot, capabilityId, 'terminal.json')),
        );
        await assert.rejects(
          access(path.join(realRoot, capabilityId, 'terminal.json')),
        );
      } else {
        assert.equal(completionError, null, 'isolated fd owner must not be affected by parent fs poisoning');
        assert.equal(completion?.state, 'CONSUMED_SUCCESS');
        await access(path.join(realRoot, capabilityId, 'terminal.json'));
        await assert.rejects(
          access(path.join(substituteRoot, capabilityId, 'terminal.json')),
        );
      }
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

// Identity is not ownership. If an authoritative descriptor remains observable in
// the caller process, reopening the exact same directory on that descriptor number
// must never make lifecycle cleanup close the foreign descriptor. An isolated
// owner is stronger: no authoritative root fd is present in the caller table.
test('same-inode root fd reuse is not closed as store-owned', (t) => {
  if (process.platform !== 'linux') {
    t.skip('Linux /proc/self/fd same-inode ownership regression');
    return;
  }

  const moduleUrl = new URL(
    '../core/gate/reference-durable-claim-store.mjs',
    import.meta.url,
  ).href;

  const script = `
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import { mkdtemp, rm } from 'node:fs/promises';
    import os from 'node:os';
    import path from 'node:path';

    const { createReferenceDurableClaimStore } = await import(
      ${JSON.stringify(moduleUrl)} + '?same-inode-root=' + Date.now()
    );

    function findPinnedDirectoryFd(target) {
      const expected = fs.realpathSync(target);
      const candidates = fs.readdirSync('/proc/self/fd')
        .filter((entry) => /^[0-9]+$/u.test(entry))
        .map(Number)
        .sort((a, b) => a - b);
      for (const fd of candidates) {
        try {
          const link = fs.readlinkSync('/proc/self/fd/' + fd);
          if (path.resolve(link) === expected) return fd;
        } catch {
          // Descriptor disappeared while enumerating.
        }
      }
      return null;
    }

    const root = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-same-inode-root-'));
    const input = {
      capabilityId: 'cap-${'a'.repeat(32)}',
      authorizationCommitment: '${'b'.repeat(64)}',
    };
    const store = createReferenceDurableClaimStore({ rootDir: root });
    let foreignFd = null;

    try {
      await store.inspect(input);
      const ownedFd = findPinnedDirectoryFd(root);
      if (ownedFd === null) {
        await store.close();
        assert.equal(
          findPinnedDirectoryFd(root),
          null,
          'isolated owner must not leak an authoritative root fd into the caller table',
        );
      } else {
        fs.closeSync(ownedFd);
        foreignFd = fs.openSync(root, 'r');
        assert.equal(foreignFd, ownedFd, 'foreign root must reuse the store descriptor number');

        await store.close();

        assert.doesNotThrow(
          () => fs.fstatSync(foreignFd),
          'store.close() must not close a same-inode descriptor now owned by another subsystem',
        );
      }
    } finally {
      if (foreignFd !== null) {
        try { fs.closeSync(foreignFd); } catch {}
      }
      await store.close().catch(() => {});
      await rm(root, { recursive: true, force: true });
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
    `same-inode root ownership child failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
});

test('same-inode claim-directory fd reuse is not closed as store-owned', (t) => {
  if (process.platform !== 'linux') {
    t.skip('Linux /proc/self/fd same-inode ownership regression');
    return;
  }

  const moduleUrl = new URL(
    '../core/gate/reference-durable-claim-store.mjs',
    import.meta.url,
  ).href;

  const script = `
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import { mkdtemp, rm } from 'node:fs/promises';
    import os from 'node:os';
    import path from 'node:path';

    const { createReferenceDurableClaimStore } = await import(
      ${JSON.stringify(moduleUrl)} + '?same-inode-child=' + Date.now()
    );

    function findPinnedDirectoryFd(target) {
      const expected = fs.realpathSync(target);
      const candidates = fs.readdirSync('/proc/self/fd')
        .filter((entry) => /^[0-9]+$/u.test(entry))
        .map(Number)
        .sort((a, b) => a - b);
      for (const fd of candidates) {
        try {
          const link = fs.readlinkSync('/proc/self/fd/' + fd);
          if (path.resolve(link) === expected) return fd;
        } catch {
          // Descriptor disappeared while enumerating.
        }
      }
      return null;
    }

    const root = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-same-inode-child-'));
    const capabilityId = 'cap-${'c'.repeat(32)}';
    const input = {
      capabilityId,
      authorizationCommitment: '${'d'.repeat(64)}',
    };
    const store = createReferenceDurableClaimStore({ rootDir: root });
    let foreignFd = null;

    try {
      const claimed = await store.claim(input);
      const claimDirectory = path.join(root, capabilityId);
      const ownedFd = findPinnedDirectoryFd(claimDirectory);
      if (ownedFd === null) {
        await store.abandon(claimed.handle);
        assert.equal(
          findPinnedDirectoryFd(claimDirectory),
          null,
          'isolated owner must not leak an authoritative claim fd into the caller table',
        );
      } else {
        fs.closeSync(ownedFd);
        foreignFd = fs.openSync(claimDirectory, 'r');
        assert.equal(foreignFd, ownedFd, 'foreign claim-directory fd must reuse the store descriptor number');

        await store.abandon(claimed.handle);

        assert.doesNotThrow(
          () => fs.fstatSync(foreignFd),
          'claim release must not close a same-inode descriptor now owned by another subsystem',
        );
      }
    } finally {
      if (foreignFd !== null) {
        try { fs.closeSync(foreignFd); } catch {}
      }
      await store.close().catch(() => {});
      await rm(root, { recursive: true, force: true });
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
    `same-inode claim ownership child failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
});
