import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

import { parseWalletGuardBoundedJsonData } from '../json-ingress.mjs';

const SCHEMA = 'wallet-guard-operation-journal/0.2';
const MAX_RECORD_BYTES = 16_384;
const NETWORKS = Object.freeze({ anvil: '0x7a69', sepolia: '0xaa36a7' });
const QUANTITY_PATTERN = /^0x(?:0|[1-9a-f][0-9a-f]{0,63})$/u;
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
  if (typeof value.session_id !== 'string' || !HEX_32_PATTERN.test(value.session_id)
      || !Number.isSafeInteger(value.sequence) || value.sequence < 1
      || typeof value.request_id !== 'string'
      || value.request_id.length === 0 || value.request_id.length > 160
      || typeof value.account !== 'string' || !ACCOUNT_PATTERN.test(value.account)
      || value.from !== value.account || value.to !== value.account
      || value.value !== '0x0' || value.data !== '0x'
      || typeof value.baseline_block_number !== 'string'
      || !QUANTITY_PATTERN.test(value.baseline_block_number)
      || typeof value.baseline_account_nonce !== 'string'
      || !QUANTITY_PATTERN.test(value.baseline_account_nonce)
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
      || NETWORKS[value.network] !== value.chain_id
      || !HEX_32_PATTERN.test(value.run_id)
      || typeof value.updated_at !== 'string' || value.updated_at.length > 64
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
        && (typeof value.terminal !== 'string'
          || value.terminal.length === 0 || value.terminal.length > 96))
      || ((value.state === 'READY') !== (value.revision === 0))
      || ((value.revision === 0) !== (value.previous_record_sha256 === null))
      || (['ARMED', 'DISPATCHED'].includes(value.state)
        && operation?.transaction_hash !== null)
      || (value.state === 'HASH_OBSERVED' && operation?.transaction_hash === null)) {
    throw new TypeError('operation journal state is inconsistent');
  }
  return Object.freeze({ ...value, operation });
}

async function requireRegularPrivateFile(path) {
  const stat = await fs.lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0
      || stat.uid !== process.getuid() || stat.nlink !== 1) {
    throw new TypeError('operation journal must be a private regular file');
  }
  return stat;
}

async function requirePrivateOwnedDirectory(path) {
  const directoryPath = dirname(path);
  const stat = await fs.lstat(directoryPath);
  const effectiveUid = typeof process.getuid === 'function' ? process.getuid() : null;
  if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0
      || (effectiveUid !== null && stat.uid !== effectiveUid)
      || await fs.realpath(directoryPath) !== resolve(directoryPath)) {
    throw new TypeError('operation journal directory must be private, owned, and symlink-free');
  }
}

async function syncDirectory(path) {
  const handle = await fs.open(dirname(path), 'r');
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function readExistingRecord(path) {
  const handle = await fs.open(path,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.uid !== process.getuid() || stat.nlink !== 1
        || (stat.mode & 0o077) !== 0 || stat.size > MAX_RECORD_BYTES) {
      throw new TypeError('existing journal must be a bounded private owned regular file');
    }
    const bytes = Buffer.alloc(MAX_RECORD_BYTES + 1);
    let length = 0;
    while (length < bytes.length) {
      const result = await handle.read(bytes, length, bytes.length - length, length);
      if (result.bytesRead === 0) break;
      length += result.bytesRead;
    }
    if (length > MAX_RECORD_BYTES) throw new TypeError('existing journal is too large');
    const raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, length));
    return validateRecord(parseWalletGuardBoundedJsonData(raw));
  } finally {
    await handle.close();
  }
}

async function writeDurably(path, record) {
  // Validate the exact serialized bytes with the reader's contract before any
  // publication. A successful write must remain readable for manual recovery.
  const serialized = JSON.stringify(record) + '\n';
  if (Buffer.byteLength(serialized, 'utf8') > MAX_RECORD_BYTES) {
    throw new TypeError('operation journal record exceeds the reader byte bound');
  }
  validateRecord(parseWalletGuardBoundedJsonData(serialized));
  const temporary = `${path}.${process.pid}.${randomBytes(12).toString('hex')}.tmp`;
  let handle = null;
  try {
    handle = await fs.open(temporary, 'wx', 0o600);
    await handle.writeFile(serialized, { encoding: 'utf8' });
    await handle.sync();
    await handle.close();
    handle = null;
    await fs.rename(temporary, path);
    await syncDirectory(path);
  } finally {
    if (handle !== null) await handle.close().catch(() => {});
    await fs.rm(temporary, { force: true }).catch(() => {});
  }
}

function canonicalOperation(command, baseline, chainId) {
  const request = command?.request;
  if (request?.method !== 'eth_sendTransaction'
      || !Array.isArray(request.params) || request.params.length !== 1
      || command.expected_chain_id !== chainId) {
    throw new TypeError('journal requires the configured exact transaction command');
  }
  const transaction = request.params[0];
  exactKeys(transaction, ['from', 'to', 'value', 'data'], 'journal transaction');
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
  const validated = validateOperation(operation);
  // Reject invalid Unicode before starting a storage transition.
  parseWalletGuardBoundedJsonData(JSON.stringify(validated));
  return validated;
}

/**
 * Standalone storage primitive for trusted plain commands on a trusted local
 * POSIX filesystem. This records caller-reported facts; it does not authorize,
 * observe, recover or dispatch a wallet operation.
 */
export function createWalletGuardDurableOperationJournal({
  journalPath,
  network,
  chainId,
  clock = () => new Date().toISOString(),
} = {}) {
  if (typeof journalPath !== 'string' || !isAbsolute(journalPath)
      || journalPath !== resolve(journalPath) || journalPath.length > 4_096
      || !Object.hasOwn(NETWORKS, network) || NETWORKS[network] !== chainId
      || typeof clock !== 'function' || typeof process.getuid !== 'function'
      || !Number.isInteger(constants.O_NOFOLLOW)) {
    throw new TypeError('durable operation journal configuration is invalid');
  }

  let current = null;
  let lifecycle = 'NEW';
  let inFlight = null;
  let closing = false;
  let closePromise = null;
  let ownershipHandle = null;
  let ownershipIdentity = null;
  const ownershipPath = journalPath + '.lock';

  async function verifyOwnership() {
    if (ownershipHandle === null || ownershipIdentity === null) {
      throw new Error('operation journal ownership is unavailable');
    }
    const stat = await requireRegularPrivateFile(ownershipPath);
    if (stat.dev !== ownershipIdentity.dev || stat.ino !== ownershipIdentity.ino) {
      throw new Error('operation journal ownership changed; manual recovery required');
    }
  }

  async function releaseOwnership() {
    if (ownershipHandle === null) return;
    const handle = ownershipHandle;
    try {
      await verifyOwnership();
      await fs.rm(ownershipPath);
      await syncDirectory(journalPath);
    } finally {
      ownershipHandle = null;
      ownershipIdentity = null;
      await handle.close();
    }
  }

  function requireWritable(expectedStates) {
    if (closing || lifecycle !== 'OPEN' || inFlight !== null
        || !expectedStates.includes(current?.state)) {
      throw new TypeError('operation journal is not writable in its current state');
    }
  }

  function runExclusive(work) {
    // Install the in-flight promise before any filesystem or clock callback runs.
    inFlight = Promise.resolve().then(work).catch((error) => {
      // A failure can follow rename but precede directory fsync. The last
      // confirmed snapshot is then insufficient to infer the actual disk state.
      lifecycle = 'FAULTED';
      throw error;
    }).finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  function transition(nextState, { operation = current.operation, terminal = null } = {}) {
    return runExclusive(async () => {
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
      await requirePrivateOwnedDirectory(journalPath);
      await verifyOwnership();
      await requireRegularPrivateFile(journalPath);
      await writeDurably(journalPath, validated);
      current = validated;
      return current;
    });
  }

  return Object.freeze({
    async initialize() {
      if (lifecycle !== 'NEW' || closing || inFlight !== null) {
        throw new TypeError('operation journal initialization is unavailable');
      }
      lifecycle = 'INITIALIZING';
      return runExclusive(async () => {
        try {
          await requirePrivateOwnedDirectory(journalPath);
          try {
            ownershipHandle = await fs.open(ownershipPath, 'wx', 0o600);
          } catch (error) {
            if (error?.code === 'EEXIST') {
              throw new Error('POMRX_WG_JOURNAL_RECOVERY_REQUIRED:LOCK_PRESENT');
            }
            throw error;
          }
          ownershipIdentity = await ownershipHandle.stat();
          await ownershipHandle.sync();
          await syncDirectory(journalPath);
          try {
            const existing = await readExistingRecord(journalPath);
            throw new Error('POMRX_WG_JOURNAL_RECOVERY_REQUIRED:'
              + existing.state + ':' + existing.record_sha256);
          } catch (error) {
            if (error?.code !== 'ENOENT') throw error;
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
          const validated = validateRecord(initial);
          await writeDurably(journalPath, validated);
          current = validated;
          lifecycle = 'OPEN';
          return current;
        } catch (error) {
          await releaseOwnership();
          throw error;
        }
      });
    },
    async arm(command, baseline) {
      requireWritable(['READY']);
      const operation = canonicalOperation(command, baseline, chainId);
      return transition('ARMED', { operation });
    },
    async markDispatched() {
      requireWritable(['ARMED']);
      return transition('DISPATCHED');
    },
    async retainHash(transactionHash) {
      requireWritable(['ARMED', 'DISPATCHED']);
      if (typeof transactionHash !== 'string' || !TX_HASH_PATTERN.test(transactionHash)) {
        throw new TypeError('journal cannot retain this transaction hash');
      }
      return transition('HASH_OBSERVED', {
        operation: Object.freeze({ ...current.operation, transaction_hash: transactionHash }),
      });
    },
    async terminate(outcome) {
      requireWritable(['ARMED', 'DISPATCHED', 'HASH_OBSERVED']);
      if (!['AMBIGUOUS', 'WALLET_ERROR', 'MATCH_REFERENCE'].includes(outcome)
          || (outcome === 'MATCH_REFERENCE' && current.state !== 'HASH_OBSERVED')
          || (outcome === 'WALLET_ERROR' && current.state === 'HASH_OBSERVED')) {
        throw new TypeError('journal cannot record this terminal outcome');
      }
      return transition('TERMINAL', { terminal: outcome });
    },
    inspect() {
      // Only the last fsync-confirmed record; consult status() after any failure.
      return current;
    },
    status() {
      return Object.freeze({ lifecycle, closing, transition_in_flight: inFlight !== null });
    },
    close() {
      if (closePromise !== null) return closePromise;
      closing = true;
      closePromise = (async () => {
        try {
          // Rejected work must still finish before releasing its ownership.
          if (inFlight !== null) await inFlight.catch(() => {});
          await releaseOwnership();
        } finally {
          lifecycle = 'CLOSED';
        }
      })();
      return closePromise;
    },
  });
}

export const WALLET_GUARD_OPERATION_JOURNAL_SCHEMA = SCHEMA;
