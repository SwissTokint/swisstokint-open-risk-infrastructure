import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

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
  const terminal = await journal.terminate('MATCH_SAFE_REFERENCE');
  assert.equal(terminal.state, 'TERMINAL');
  assert.equal(terminal.terminal, 'MATCH_SAFE_REFERENCE');
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
    network: 'anvil',
    chainId: '0x7a69',
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
