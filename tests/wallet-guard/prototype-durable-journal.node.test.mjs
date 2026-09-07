import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import { chmod, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import {
  createWalletGuardDurableOperationJournal,
} from '../../applications/blockchain-digital-assets/wallet-guard/prototype/durable-operation-journal.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const SESSION = '2'.repeat(64);
const TX_HASH = `0x${'a'.repeat(64)}`;

function command() {
  return Object.freeze({
    session_id: SESSION,
    sequence: 1,
    expected_chain_id: '0xaa36a7',
    request_id: 'wg-journal-test-00000001',
    expected_account: ACCOUNT,
    request: Object.freeze({
      method: 'eth_sendTransaction',
      params: Object.freeze([Object.freeze({
        from: ACCOUNT,
        to: ACCOUNT,
        value: '0x0',
        data: '0x',
      })]),
    }),
  });
}

test('durable operation journal records arm, dispatch, hash and terminal outcome', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'pomrx-wg-journal-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const journalPath = join(directory, 'operation.json');
  let tick = 0;
  const journal = createWalletGuardDurableOperationJournal({
    journalPath,
    network: 'sepolia',
    chainId: '0xaa36a7',
    clock: () => `2026-08-24T14:00:0${tick += 1}.000Z`,
  });

  assert.equal((await journal.initialize()).state, 'READY');
  assert.equal((await stat(journalPath)).mode & 0o077, 0);
  assert.equal((await journal.arm(command(), {
    observer: { block_number: '0x10', account_nonce: '0x2' },
  })).state, 'ARMED');
  assert.equal((await journal.markDispatched()).state, 'DISPATCHED');
  assert.equal((await journal.retainHash(TX_HASH)).operation.transaction_hash, TX_HASH);
  const terminal = await journal.terminate('MATCH_REFERENCE');
  assert.equal(terminal.state, 'TERMINAL');
  assert.equal(terminal.terminal, 'MATCH_REFERENCE');
  assert.equal(JSON.parse(await readFile(journalPath, 'utf8')).record_sha256,
    terminal.record_sha256);
  await journal.close();
});

test('an existing journal requires explicit recovery and cannot be silently reused', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'pomrx-wg-journal-restart-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const journalPath = join(directory, 'operation.json');
  const options = {
    journalPath,
    network: 'sepolia',
    chainId: '0xaa36a7',
  };
  const first = createWalletGuardDurableOperationJournal(options);
  await first.initialize();
  await first.arm(command(), {
    observer: { block_number: '0x10', account_nonce: '0x2' },
  });
  await first.close();

  const restarted = createWalletGuardDurableOperationJournal(options);
  await assert.rejects(
    restarted.initialize(),
    /POMRX_WG_JOURNAL_RECOVERY_REQUIRED:ARMED:[0-9a-f]{64}/u,
  );
});

test('journal only accepts the exact zero-value burner self-transfer', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'pomrx-wg-journal-intent-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const journal = createWalletGuardDurableOperationJournal({
    journalPath: join(directory, 'operation.json'),
    network: 'sepolia',
    chainId: '0xaa36a7',
  });
  await journal.initialize();
  const changed = {
    ...command(),
    request: {
      method: 'eth_sendTransaction',
      params: [{ from: ACCOUNT, to: `0x${'2'.repeat(40)}`, value: '0x0', data: '0x' }],
    },
  };
  await assert.rejects(
    journal.arm(changed, { block_number: '0x10', account_nonce: '0x2' }),
    /journal operation is invalid/u,
  );
  assert.equal(journal.inspect().state, 'READY');
  await journal.close();
});

test('only one process can own a journal path at a time', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'pomrx-wg-journal-owner-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const options = {
    journalPath: join(directory, 'operation.json'),
    network: 'sepolia',
    chainId: '0xaa36a7',
  };
  const first = createWalletGuardDurableOperationJournal(options);
  const second = createWalletGuardDurableOperationJournal(options);
  await first.initialize();
  await assert.rejects(
    second.initialize(),
    /POMRX_WG_JOURNAL_RECOVERY_REQUIRED:LOCK_PRESENT/u,
  );
  await first.close();
});

test('journal refuses a parent directory accessible to another user', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'pomrx-wg-journal-public-parent-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await chmod(directory, 0o755);
  const journal = createWalletGuardDurableOperationJournal({
    journalPath: join(directory, 'operation.json'),
    network: 'sepolia',
    chainId: '0xaa36a7',
  });
  await assert.rejects(
    journal.initialize(),
    /directory must be private, owned, and symlink-free/u,
  );
});

const BASELINE = Object.freeze({ block_number: '0x10', account_nonce: '0x2' });
const pendingReleases = new WeakMap();

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'pomrx-wg-journal-lifecycle-'));
  const journalPath = join(directory, 'operation.json');
  const options = { journalPath, network: 'sepolia', chainId: '0xaa36a7' };
  const journal = createWalletGuardDurableOperationJournal(options);
  pendingReleases.set(t, []);
  t.after(async () => {
    for (const release of pendingReleases.get(t)) release();
    t.mock.restoreAll();
    await journal.close();
    await rm(directory, { recursive: true, force: true });
  });
  return { directory, journalPath, options, journal };
}

function holdPublication(t, journalPath) {
  const entered = deferred();
  const release = deferred();
  const rename = fs.rename;
  t.mock.method(fs, 'rename', async (from, to) => {
    if (to === journalPath) {
      entered.resolve();
      await release.promise;
    }
    return rename(from, to);
  });
  pendingReleases.get(t).push(release.resolve);
  return { entered, release };
}

test('same-instance concurrent initialization cannot replace or release its owner', async (t) => {
  const { journal, journalPath, options } = await fixture(t);
  const held = holdPublication(t, journalPath);
  const first = journal.initialize();
  await held.entered.promise;
  await assert.rejects(journal.initialize(), /initialization is unavailable/u);
  const other = createWalletGuardDurableOperationJournal(options);
  await assert.rejects(other.initialize(), /LOCK_PRESENT/u);
  assert.equal((await stat(journalPath + '.lock')).isFile(), true);
  held.release.resolve();
  await first;
  assert.equal(journal.status().lifecycle, 'OPEN');
});

test('close waits for initialization publication and permanently closes the instance', async (t) => {
  const { journal, journalPath } = await fixture(t);
  const held = holdPublication(t, journalPath);
  const initializing = journal.initialize();
  await held.entered.promise;
  let closed = false;
  const closing = journal.close().then(() => { closed = true; });
  await assert.rejects(journal.arm(command(), BASELINE), /not writable/u);
  assert.equal(closed, false);
  assert.equal((await stat(journalPath + '.lock')).isFile(), true);
  held.release.resolve();
  await initializing;
  await closing;
  assert.equal(journal.status().lifecycle, 'CLOSED');
  assert.equal(JSON.parse(await readFile(journalPath, 'utf8')).state, 'READY');
  await assert.rejects(journal.initialize(), /initialization is unavailable/u);
});

test('close retains ownership until an in-flight hash is durably recorded', async (t) => {
  const { journal, journalPath } = await fixture(t);
  await journal.initialize();
  await journal.arm(command(), BASELINE);
  await journal.markDispatched();
  const held = holdPublication(t, journalPath);
  const retaining = journal.retainHash(TX_HASH);
  await held.entered.promise;
  let closed = false;
  const closing = journal.close().then(() => { closed = true; });
  await assert.rejects(journal.terminate('AMBIGUOUS'), /not writable/u);
  assert.equal(closed, false);
  assert.equal((await stat(journalPath + '.lock')).isFile(), true);
  held.release.resolve();
  await retaining;
  await closing;
  const disk = JSON.parse(await readFile(journalPath, 'utf8'));
  assert.equal(disk.state, 'HASH_OBSERVED');
  assert.equal(disk.operation.transaction_hash, TX_HASH);
  await assert.rejects(stat(journalPath + '.lock'), { code: 'ENOENT' });
  await assert.rejects(journal.terminate('AMBIGUOUS'), /not writable/u);
});

test('a concurrent transition cannot overwrite an in-flight arm record', async (t) => {
  const { journal, journalPath } = await fixture(t);
  await journal.initialize();
  const held = holdPublication(t, journalPath);
  const arming = journal.arm(command(), BASELINE);
  await held.entered.promise;
  await assert.rejects(journal.arm(command(), BASELINE), /not writable/u);
  await assert.rejects(journal.markDispatched(), /not writable/u);
  held.release.resolve();
  await arming;
  assert.equal(journal.inspect().revision, 1);
  assert.equal(journal.inspect().state, 'ARMED');
});

test('hash-write failure is fatal even if the filesystem becomes writable again', async (t) => {
  const { journal, journalPath } = await fixture(t);
  await journal.initialize();
  await journal.arm(command(), BASELINE);
  await journal.markDispatched();
  const before = await readFile(journalPath, 'utf8');
  t.mock.method(fs, 'rename', async () => {
    throw Object.assign(new Error('synthetic storage exhaustion'), { code: 'ENOSPC' });
  });
  await assert.rejects(journal.retainHash(TX_HASH), { code: 'ENOSPC' });
  t.mock.restoreAll();
  assert.equal(await readFile(journalPath, 'utf8'), before);
  assert.equal(journal.inspect().state, 'DISPATCHED');
  assert.equal(journal.status().lifecycle, 'FAULTED');
  await assert.rejects(journal.terminate('AMBIGUOUS'), /not writable/u);
  await assert.rejects(journal.retainHash(TX_HASH), /not writable/u);
  assert.equal(await readFile(journalPath, 'utf8'), before);
});

test('post-rename directory-sync failure cannot be retried from the stale memory record', async (t) => {
  const { journal, journalPath, directory } = await fixture(t);
  await journal.initialize();
  await journal.arm(command(), BASELINE);
  await journal.markDispatched();
  const open = fs.open;
  t.mock.method(fs, 'open', async (path, ...args) => {
    const handle = await open(path, ...args);
    if (path === directory) {
      handle.sync = async () => {
        throw Object.assign(new Error('synthetic directory fsync failure'), { code: 'EIO' });
      };
    }
    return handle;
  });
  await assert.rejects(journal.retainHash(TX_HASH), { code: 'EIO' });
  t.mock.restoreAll();
  const disk = JSON.parse(await readFile(journalPath, 'utf8'));
  assert.equal(disk.state, 'HASH_OBSERVED');
  assert.equal(disk.operation.transaction_hash, TX_HASH);
  assert.equal(journal.inspect().state, 'DISPATCHED');
  assert.equal(journal.status().lifecycle, 'FAULTED');
  await assert.rejects(journal.terminate('AMBIGUOUS'), /not writable/u);
  await assert.rejects(journal.markDispatched(), /not writable/u);
  assert.equal(JSON.parse(await readFile(journalPath, 'utf8')).record_sha256, disk.record_sha256);
});

test('close before initialization cannot later acquire journal ownership', async (t) => {
  const { journal, journalPath } = await fixture(t);
  await journal.close();
  await journal.close();
  await assert.rejects(journal.initialize(), /initialization is unavailable/u);
  await assert.rejects(stat(journalPath + '.lock'), { code: 'ENOENT' });
});

test('network, method, chain, parameters and transaction shape must match the recorded intent', async (t) => {
  const { journal, options } = await fixture(t);
  assert.throws(() => createWalletGuardDurableOperationJournal({
    ...options, chainId: '0x7a69',
  }), /configuration is invalid/u);
  await journal.initialize();
  const good = command();
  const changed = [
    { ...good, expected_chain_id: '0x7a69' },
    { ...good, request: { ...good.request, method: 'eth_sign' } },
    { ...good, request: { ...good.request, params: [...good.request.params, {}] } },
    { ...good, request: { ...good.request, params: [{ ...good.request.params[0], gas: '0x5208' }] } },
    { ...good, request_id: '' },
  ];
  for (const altered of changed) {
    await assert.rejects(journal.arm(altered, BASELINE), TypeError);
    assert.equal(journal.inspect().state, 'READY');
    assert.equal(journal.status().lifecycle, 'OPEN');
  }
  await journal.arm(good, BASELINE);
  await assert.rejects(journal.terminate('MATCH_REFERENCE'), /terminal outcome/u);
  await journal.retainHash(TX_HASH);
  await assert.rejects(journal.terminate('WALLET_ERROR'), /terminal outcome/u);
  await journal.terminate('AMBIGUOUS');
  assert.equal(journal.inspect().operation.transaction_hash, TX_HASH);
  await assert.rejects(journal.terminate('MATCH_REFERENCE'), /not writable/u);
  await assert.rejects(journal.retainHash(TX_HASH), /not writable/u);
});

for (const state of ['READY', 'DISPATCHED', 'HASH_OBSERVED', 'TERMINAL']) {
  test('restart blocks an existing ' + state + ' record without changing it', async (t) => {
    const { journal, journalPath, options } = await fixture(t);
    await journal.initialize();
    if (state !== 'READY') {
      await journal.arm(command(), BASELINE);
      await journal.markDispatched();
    }
    if (['HASH_OBSERVED', 'TERMINAL'].includes(state)) await journal.retainHash(TX_HASH);
    if (state === 'TERMINAL') await journal.terminate('AMBIGUOUS');
    await journal.close();
    const before = await readFile(journalPath, 'utf8');
    const next = createWalletGuardDurableOperationJournal(options);
    await assert.rejects(next.initialize(), new RegExp('RECOVERY_REQUIRED:' + state, 'u'));
    await next.close();
    assert.equal(await readFile(journalPath, 'utf8'), before);
  });
}

for (const kind of ['oversized', 'malformed', 'symlink', 'hardlink']) {
  test('existing ' + kind + ' storage is refused without replacement', async (t) => {
    const { journal, journalPath, directory } = await fixture(t);
    const target = join(directory, 'original.json');
    if (kind === 'symlink' || kind === 'hardlink') {
      await fs.writeFile(target, 'original', { mode: 0o600 });
      if (kind === 'symlink') await fs.symlink(target, journalPath);
      else await fs.link(target, journalPath);
    } else {
      await fs.writeFile(journalPath, kind === 'oversized' ? 'x'.repeat(20_000) : '{',
        { mode: 0o600 });
    }
    const before = await readFile(journalPath, 'utf8');
    await assert.rejects(journal.initialize());
    assert.equal(await readFile(journalPath, 'utf8'), before);
    assert.equal(journal.status().lifecycle, 'FAULTED');
    await assert.rejects(stat(journalPath + '.lock'), { code: 'ENOENT' });
  });
}

test('a stale ownership marker requires recovery even without a journal record', async (t) => {
  const { journal, journalPath } = await fixture(t);
  await fs.writeFile(journalPath + '.lock', 'existing owner', { mode: 0o600 });
  await assert.rejects(journal.initialize(), /RECOVERY_REQUIRED:LOCK_PRESENT/u);
  await journal.close();
  assert.equal(await readFile(journalPath + '.lock', 'utf8'), 'existing owner');
  await assert.rejects(stat(journalPath), { code: 'ENOENT' });
});

test('a separate owner process exiting without close leaves a non-reusable armed journal', async (t) => {
  const { journal, journalPath } = await fixture(t);
  const moduleUrl = new URL(
    '../../applications/blockchain-digital-assets/wallet-guard/prototype/durable-operation-journal.mjs',
    import.meta.url,
  ).href;
  const script = [
    'const { createWalletGuardDurableOperationJournal } = await import(process.argv[1]);',
    'const journal = createWalletGuardDurableOperationJournal({',
    'journalPath: process.argv[2], network: "sepolia", chainId: "0xaa36a7" });',
    'await journal.initialize();',
    'await journal.arm(JSON.parse(process.argv[3]), JSON.parse(process.argv[4]));',
    'process.exit(0);',
  ].join('\n');
  await promisify(execFile)(process.execPath, [
    '--input-type=module', '-e', script, moduleUrl, journalPath,
    JSON.stringify(command()), JSON.stringify(BASELINE),
  ], { timeout: 10_000 });
  const before = await readFile(journalPath, 'utf8');
  assert.equal(JSON.parse(before).state, 'ARMED');
  await assert.rejects(journal.initialize(), /RECOVERY_REQUIRED:LOCK_PRESENT/u);
  await journal.close();
  assert.equal(await readFile(journalPath, 'utf8'), before);
  assert.equal((await stat(journalPath + '.lock')).isFile(), true);
});

test('clock output must be immutable timestamp data before any record is published', async (t) => {
  const { options, journalPath } = await fixture(t);
  const invalidClock = createWalletGuardDurableOperationJournal({
    ...options, clock: () => new Date('2026-09-07T00:00:00Z'),
  });
  await assert.rejects(invalidClock.initialize(), /malformed/u);
  await invalidClock.close();
  await assert.rejects(stat(journalPath), { code: 'ENOENT' });
  await assert.rejects(stat(journalPath + '.lock'), { code: 'ENOENT' });
});

test('clock data cannot publish a record exceeding the bounded reader contract', async (t) => {
  const { options, journalPath } = await fixture(t);
  const oversizedClock = createWalletGuardDurableOperationJournal({
    ...options, clock: () => ' '.repeat(17_000) + '2026-09-07',
  });
  await assert.rejects(oversizedClock.initialize(), /malformed/u);
  await oversizedClock.close();
  await assert.rejects(stat(journalPath), { code: 'ENOENT' });
});

test('baseline quantities are bounded before they can enter a durable record', async (t) => {
  const { journal, journalPath } = await fixture(t);
  await journal.initialize();
  const before = await readFile(journalPath, 'utf8');
  for (const key of ['block_number', 'account_nonce']) {
    await assert.rejects(journal.arm(command(), {
      ...BASELINE, [key]: '0x' + 'f'.repeat(65),
    }), /operation is invalid/u);
    assert.equal(await readFile(journalPath, 'utf8'), before);
    assert.equal(journal.status().lifecycle, 'OPEN');
  }
  await journal.arm(command(), { block_number: '0x' + 'f'.repeat(64), account_nonce: '0x0' });
  assert.equal(journal.inspect().state, 'ARMED');
});

test('invalid Unicode request identifiers cannot publish an unreadable journal', async (t) => {
  const { journal, journalPath } = await fixture(t);
  await journal.initialize();
  const before = await readFile(journalPath, 'utf8');
  for (const code of [0xd800, 0xdc00]) {
    await assert.rejects(journal.arm({
      ...command(), request_id: String.fromCharCode(code),
    }, BASELINE));
    assert.equal(await readFile(journalPath, 'utf8'), before);
    assert.equal(journal.status().lifecycle, 'OPEN');
  }
});

test('accepted Unicode and maximum quantities remain readable by the recovery reader', async (t) => {
  const { journal, journalPath, options } = await fixture(t);
  await journal.initialize();
  await journal.arm({ ...command(), request_id: 'é'.repeat(158) + '😀' }, {
    block_number: '0x' + 'f'.repeat(64), account_nonce: '0x' + 'f'.repeat(64),
  });
  await journal.retainHash(TX_HASH);
  await journal.terminate('AMBIGUOUS');
  await journal.close();
  const before = await readFile(journalPath, 'utf8');
  const next = createWalletGuardDurableOperationJournal(options);
  await assert.rejects(next.initialize(), /RECOVERY_REQUIRED:TERMINAL:[0-9a-f]{64}/u);
  await next.close();
  assert.equal(await readFile(journalPath, 'utf8'), before);
});
