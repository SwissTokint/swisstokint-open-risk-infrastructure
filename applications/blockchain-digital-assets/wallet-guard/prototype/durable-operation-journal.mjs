import { createHash, randomBytes } from 'node:crypto';
import { lstat, open, readFile, rename, rm } from 'node:fs/promises';
import { dirname, isAbsolute } from 'node:path';

import { parseWalletGuardBoundedJsonData } from '../json-ingress.mjs';

const SCHEMA = 'wallet-guard-operation-journal/0.1';
const CHAIN_ID_PATTERN = /^0x(?:0|[1-9a-f][0-9a-f]*)$/u;
const HEX_32_PATTERN = /^[0-9a-f]{64}$/u;
const ACCOUNT_PATTERN = /^0x[0-9a-f]{40}$/u;
const TX_HASH_PATTERN = /^0x[0-9a-f]{64}$/u;
const STATES = new Set([
  'READY',
  'ARMED',
  'DISPATCHED',
  'HASH_OBSERVED',
  'TERMINAL',
]);

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length
      || actual.some((key, index) => key !== wanted[index])) {
    throw new TypeError(`${label} has missing or unknown fields`);
  }
}

function recordWithoutHash(record) {
  return {
    schema: record.schema,
    revision: record.revision,
    state: record.state,
    network: record.network,
    chain_id: record.chain_id,
    run_id: record.run_id,
    operation: record.operation,
    terminal: record.terminal,
    updated_at: record.updated_at,
    previous_record_sha256: record.previous_record_sha256,
  };
}

function hashRecord(record) {
  return createHash('sha256')
    .update(JSON.stringify(recordWithoutHash(record)), 'utf8')
    .digest('hex');
}

function validateOperation(value) {
  if (value === null) return null;
  exactKeys(value, [
    'session_id',
    'sequence',
    'request_id',
    'account',
    'from',
    'to',
    'value',
    'data',
    'baseline_block_number',
    'baseline_account_nonce',
    'transaction_hash',
  ], 'journal operation');
  if (!HEX_32_PATTERN.test(value.session_id)
      || !Number.isSafeInteger(value.sequence) || value.sequence < 1
      || typeof value.request_id !== 'string' || value.request_id.length > 160
      || !ACCOUNT_PATTERN.test(value.account)
      || value.from !== value.account || value.to !== value.account
      || value.value !== '0x0' || value.data !== '0x'
      || typeof value.baseline_block_number !== 'string'
      || !CHAIN_ID_PATTERN.test(value.baseline_block_number)
      || typeof value.baseline_account_nonce !== 'string'
      || !CHAIN_ID_PATTERN.test(value.baseline_account_nonce)
      || (value.transaction_hash !== null
        && (typeof value.transaction_hash !== 'string'
          || !TX_HASH_PATTERN.test(value.transaction_hash)))) {
    throw new TypeError('journal operation is invalid');
  }
  return Object.freeze({ ...value });
}

function validateRecord(value) {
  exactKeys(value, [
    'schema',
    'revision',
    'state',
    'network',
    'chain_id',
    'run_id',
    'operation',
    'terminal',
    'updated_at',
    'previous_record_sha256',
    'record_sha256',
  ], 'operation journal');
  if (value.schema !== SCHEMA
      || !Number.isSafeInteger(value.revision) || value.revision < 0
      || !STATES.has(value.state)
      || !['anvil', 'sepolia'].includes(value.network)
      || !CHAIN_ID_PATTERN.test(value.chain_id)
      || !HEX_32_PATTERN.test(value.run_id)
      || !Number.isFinite(Date.parse(value.updated_at))
      || (value.previous_record_sha256 !== null
        && !HEX_32_PATTERN.test(value.previous_record_sha256))
      || !HEX_32_PATTERN.test(value.record_sha256)
      || hashRecord(value) !== value.record_sha256) {
    throw new TypeError('operation journal is malformed or has lost integrity');
  }
  const operation = validateOperation(value.operation);
  if ((value.state === 'READY') !== (operation === null)
      || (value.state === 'TERMINAL') !== (value.terminal !== null)
      || (value.terminal !== null
        && (typeof value.terminal !== 'string' || value.terminal.length > 96))) {
    throw new TypeError('operation journal state is inconsistent');
  }
  return Object.freeze({ ...value, operation });
}

async function requireRegularPrivateFile(path) {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) {
    throw new TypeError('operation journal must be a private regular file');
  }
}

async function writeDurably(path, record) {
  const temporary = `${path}.${process.pid}.${randomBytes(12).toString('hex')}.tmp`;
  let handle = null;
  try {
    handle = await open(temporary, 'wx', 0o600);
    await handle.writeFile(`${JSON.stringify(record)}\n`, { encoding: 'utf8' });
    await handle.sync();
    await handle.close();
    handle = null;
    await rename(temporary, path);
    const directory = await open(dirname(path), 'r');
    try {
      await directory.sync();
    } finally {
      await directory.close();
    }
  } finally {
    if (handle !== null) await handle.close().catch(() => {});
    await rm(temporary, { force: true }).catch(() => {});
  }
}

function canonicalOperation(command, baseline) {
  const request = command?.request;
  const transaction = request?.params?.[0];
  const observer = baseline?.observer ?? baseline;
  const operation = {
    session_id: command?.session_id,
    sequence: command?.sequence,
    request_id: command?.request_id,
    account: command?.expected_account,
    from: transaction?.from,
    to: transaction?.to,
    value: transaction?.value,
    data: transaction?.data,
    baseline_block_number: observer?.block_number,
    baseline_account_nonce: observer?.account_nonce,
    transaction_hash: null,
  };
  return validateOperation(operation);
}

export function createWalletGuardDurableOperationJournal({
  journalPath,
  network,
  chainId,
  clock = () => new Date().toISOString(),
} = {}) {
  if (typeof journalPath !== 'string' || !isAbsolute(journalPath)
      || journalPath.length > 4_096
      || !['anvil', 'sepolia'].includes(network)
      || !CHAIN_ID_PATTERN.test(chainId)
      || typeof clock !== 'function') {
    throw new TypeError('durable operation journal configuration is invalid');
  }

  let current = null;
  let transitionInFlight = false;
  let ownershipHandle = null;
  const ownershipPath = `${journalPath}.lock`;

  async function releaseOwnership() {
    if (ownershipHandle === null) return;
    const handle = ownershipHandle;
    ownershipHandle = null;
    await handle.close();
    await rm(ownershipPath, { force: true });
  }

  async function transition(nextState, { operation = current?.operation, terminal = null } = {}) {
    if (current === null) throw new TypeError('operation journal is not initialized');
    if (transitionInFlight) throw new TypeError('operation journal transition already in flight');
    transitionInFlight = true;
    try {
      const next = {
        schema: SCHEMA,
        revision: current.revision + 1,
        state: nextState,
        network,
        chain_id: chainId,
        run_id: current.run_id,
        operation,
        terminal,
        updated_at: clock(),
        previous_record_sha256: current.record_sha256,
      };
      next.record_sha256 = hashRecord(next);
      const validated = validateRecord(next);
      await requireRegularPrivateFile(journalPath);
      await writeDurably(journalPath, validated);
      current = validated;
      return current;
    } finally {
      transitionInFlight = false;
    }
  }

  return Object.freeze({
    async initialize() {
      if (current !== null) throw new TypeError('operation journal is already initialized');
      try {
        ownershipHandle = await open(ownershipPath, 'wx', 0o600);
        await ownershipHandle.sync();
      } catch (error) {
        if (error?.code === 'EEXIST') {
          throw new Error('POMRX_WG_JOURNAL_RECOVERY_REQUIRED:LOCK_PRESENT');
        }
        throw error;
      }
      try {
        await requireRegularPrivateFile(journalPath);
        const raw = await readFile(journalPath, 'utf8');
        const existing = validateRecord(parseWalletGuardBoundedJsonData(raw));
        throw new Error(
          `POMRX_WG_JOURNAL_RECOVERY_REQUIRED:${existing.state}:${existing.record_sha256}`,
        );
      } catch (error) {
        if (error?.code !== 'ENOENT') {
          await releaseOwnership();
          throw error;
        }
      }
      const initial = {
        schema: SCHEMA,
        revision: 0,
        state: 'READY',
        network,
        chain_id: chainId,
        run_id: randomBytes(32).toString('hex'),
        operation: null,
        terminal: null,
        updated_at: clock(),
        previous_record_sha256: null,
      };
      initial.record_sha256 = hashRecord(initial);
      current = validateRecord(initial);
      try {
        await writeDurably(journalPath, current);
        return current;
      } catch (error) {
        current = null;
        await releaseOwnership();
        throw error;
      }
    },
    async arm(command, baseline) {
      if (current?.state !== 'READY') throw new TypeError('journal is not ready to arm');
      return transition('ARMED', { operation: canonicalOperation(command, baseline) });
    },
    async markDispatched() {
      if (current?.state !== 'ARMED') throw new TypeError('journal is not armed');
      return transition('DISPATCHED');
    },
    async retainHash(transactionHash) {
      if (!['ARMED', 'DISPATCHED'].includes(current?.state)
          || typeof transactionHash !== 'string' || !TX_HASH_PATTERN.test(transactionHash)) {
        throw new TypeError('journal cannot retain this transaction hash');
      }
      return transition('HASH_OBSERVED', {
        operation: Object.freeze({
          ...current.operation,
          transaction_hash: transactionHash,
        }),
      });
    },
    async terminate(outcome) {
      if (!['ARMED', 'DISPATCHED', 'HASH_OBSERVED'].includes(current?.state)
          || typeof outcome !== 'string' || outcome.length === 0 || outcome.length > 96) {
        throw new TypeError('journal cannot terminate this operation');
      }
      return transition('TERMINAL', { terminal: outcome });
    },
    inspect() {
      return current;
    },
    async close() {
      await releaseOwnership();
    },
  });
}

export const WALLET_GUARD_OPERATION_JOURNAL_SCHEMA = SCHEMA;
