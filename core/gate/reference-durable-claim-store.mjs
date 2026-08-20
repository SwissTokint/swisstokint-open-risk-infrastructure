import {
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
} from 'node:fs/promises';
import path from 'node:path';

import {
  canonicalizePayload,
  sha256Hex,
} from '../../sdk/typescript/swisstokint-proof.mjs';

export const POM_RX_DURABLE_CLAIM_SCHEMA_VERSION = 'pom-rx-durable-claim/0.1';
export const POM_RX_DURABLE_TERMINAL_SCHEMA_VERSION = 'pom-rx-durable-terminal/0.1';

const CLAIM_COMMIT_DOMAIN = 'swisstokint:pom-rx-durable-claim:v1:';
const TERMINAL_COMMIT_DOMAIN = 'swisstokint:pom-rx-durable-terminal:v1:';
const CAPABILITY_ID_PATTERN = /^cap-[a-f0-9]{32}$/u;
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const MAX_RECORD_BYTES = 16 * 1024;
const BOOTSTRAP_KEYS = Object.freeze(['rootDir']);
const INSPECT_KEYS = Object.freeze(['capabilityId', 'authorizationCommitment']);
const CLAIM_RECORD_KEYS = Object.freeze([
  'schema_version',
  'capability_id',
  'authorization_commitment',
  'claim_commitment',
  'reference_only',
  'single_host_local_filesystem_atomic_claim_proved',
  'distributed_consensus_proved',
  'network_filesystem_atomicity_proved',
  'crash_recovery_proved',
]);
const TERMINAL_RECORD_KEYS = Object.freeze([
  'schema_version',
  'capability_id',
  'authorization_commitment',
  'claim_commitment',
  'terminal_state',
  'terminal_commitment',
  'reference_only',
]);

export class PomRxDurableClaimStoreError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PomRxDurableClaimStoreError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new PomRxDurableClaimStoreError(code, message);
}

function exactOwnData(value, expectedKeys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('POMRX_GATE_E_DURABLE_INVALID', `${label} must be an object`);
  }
  if (Object.getPrototypeOf(value) !== Object.prototype
      || Object.getOwnPropertySymbols(value).length !== 0) {
    fail('POMRX_GATE_E_DURABLE_INVALID', `${label} must be a plain object without symbols`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Object.keys(descriptors).sort();
  const wanted = [...expectedKeys].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail('POMRX_GATE_E_DURABLE_INVALID', `${label} has missing or unknown fields`);
  }
  const output = Object.create(null);
  for (const key of expectedKeys) {
    const descriptor = descriptors[key];
    if (!descriptor || typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
      fail('POMRX_GATE_E_DURABLE_INVALID', `${label} cannot contain accessors`);
    }
    output[key] = descriptor.value;
  }
  return Object.freeze(output);
}

function validateCapabilityId(value) {
  if (typeof value !== 'string' || !CAPABILITY_ID_PATTERN.test(value)) {
    fail('POMRX_GATE_E_DURABLE_INVALID', 'capabilityId has an invalid format');
  }
  return value;
}

function validateAuthorizationCommitment(value) {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    fail('POMRX_GATE_E_DURABLE_INVALID', 'authorizationCommitment must be a lowercase SHA-256 hash');
  }
  return value;
}

function normalizePersistedValidation(label, operation) {
  try {
    return operation();
  } catch (error) {
    if (error instanceof PomRxDurableClaimStoreError
        && error.code === 'POMRX_GATE_E_DURABLE_INVALID') {
      fail('POMRX_GATE_E_DURABLE_CORRUPT', `${label} is structurally invalid`);
    }
    throw error;
  }
}

function makeClaimRecord(capabilityId, authorizationCommitment) {
  const payload = Object.freeze({
    schema_version: POM_RX_DURABLE_CLAIM_SCHEMA_VERSION,
    capability_id: capabilityId,
    authorization_commitment: authorizationCommitment,
  });
  const canonical = canonicalizePayload(payload);
  const claimCommitment = sha256Hex(`${CLAIM_COMMIT_DOMAIN}${canonical}`);
  return Object.freeze({
    ...payload,
    claim_commitment: claimCommitment,
    reference_only: true,
    single_host_local_filesystem_atomic_claim_proved: true,
    distributed_consensus_proved: false,
    network_filesystem_atomicity_proved: false,
    crash_recovery_proved: false,
  });
}

function makeTerminalRecord(claimRecord, terminalState) {
  const payload = Object.freeze({
    schema_version: POM_RX_DURABLE_TERMINAL_SCHEMA_VERSION,
    capability_id: claimRecord.capability_id,
    authorization_commitment: claimRecord.authorization_commitment,
    claim_commitment: claimRecord.claim_commitment,
    terminal_state: terminalState,
  });
  const canonical = canonicalizePayload(payload);
  return Object.freeze({
    ...payload,
    terminal_commitment: sha256Hex(`${TERMINAL_COMMIT_DOMAIN}${canonical}`),
    reference_only: true,
  });
}

function validateClaimRecord(value) {
  return normalizePersistedValidation('durable claim record', () => {
    const record = exactOwnData(value, CLAIM_RECORD_KEYS, 'durable claim record');
    if (record.schema_version !== POM_RX_DURABLE_CLAIM_SCHEMA_VERSION
        || record.reference_only !== true
        || record.single_host_local_filesystem_atomic_claim_proved !== true
        || record.distributed_consensus_proved !== false
        || record.network_filesystem_atomicity_proved !== false
        || record.crash_recovery_proved !== false) {
      fail('POMRX_GATE_E_DURABLE_CORRUPT', 'durable claim record flags/version are invalid');
    }
    validateCapabilityId(record.capability_id);
    validateAuthorizationCommitment(record.authorization_commitment);
    if (typeof record.claim_commitment !== 'string' || !HASH_PATTERN.test(record.claim_commitment)) {
      fail('POMRX_GATE_E_DURABLE_CORRUPT', 'durable claim commitment is invalid');
    }
    const expected = makeClaimRecord(record.capability_id, record.authorization_commitment);
    if (expected.claim_commitment !== record.claim_commitment) {
      fail('POMRX_GATE_E_DURABLE_CORRUPT', 'durable claim commitment does not match record contents');
    }
    return Object.freeze({ ...record });
  });
}

function validateTerminalRecord(value, claimRecord) {
  return normalizePersistedValidation('durable terminal record', () => {
    const record = exactOwnData(value, TERMINAL_RECORD_KEYS, 'durable terminal record');
    if (record.schema_version !== POM_RX_DURABLE_TERMINAL_SCHEMA_VERSION
        || record.reference_only !== true
        || !['CONSUMED_SUCCESS', 'CONSUMED_ERROR'].includes(record.terminal_state)) {
      fail('POMRX_GATE_E_DURABLE_CORRUPT', 'durable terminal record flags/version/state are invalid');
    }
    if (record.capability_id !== claimRecord.capability_id
        || record.authorization_commitment !== claimRecord.authorization_commitment
        || record.claim_commitment !== claimRecord.claim_commitment) {
      fail('POMRX_GATE_E_DURABLE_CORRUPT', 'durable terminal record is not bound to the persisted claim');
    }
    if (typeof record.terminal_commitment !== 'string' || !HASH_PATTERN.test(record.terminal_commitment)) {
      fail('POMRX_GATE_E_DURABLE_CORRUPT', 'durable terminal commitment is invalid');
    }
    const expected = makeTerminalRecord(claimRecord, record.terminal_state);
    if (expected.terminal_commitment !== record.terminal_commitment) {
      fail('POMRX_GATE_E_DURABLE_CORRUPT', 'durable terminal commitment does not match record contents');
    }
    return Object.freeze({ ...record });
  });
}

async function fsyncDirectory(directory) {
  let handle;
  try {
    handle = await open(directory, 'r');
    await handle.sync();
  } catch {
    fail('POMRX_GATE_E_DURABLE_IO', 'durable directory synchronization failed');
  } finally {
    await handle?.close().catch(() => {});
  }
}

async function writeExclusiveDurable(filePath, value) {
  const body = `${canonicalizePayload(value)}\n`;
  if (Buffer.byteLength(body, 'utf8') > MAX_RECORD_BYTES) {
    fail('POMRX_GATE_E_DURABLE_INVALID', 'durable record exceeds the maximum size');
  }

  let handle;
  try {
    handle = await open(filePath, 'wx', 0o600);
    await handle.writeFile(body, 'utf8');
    await handle.sync();
  } catch (error) {
    if (error?.code === 'EEXIST') {
      fail('POMRX_GATE_E_DURABLE_REPLAY', 'durable terminal/claim record already exists');
    }
    if (error instanceof PomRxDurableClaimStoreError) throw error;
    fail('POMRX_GATE_E_DURABLE_IO', 'durable record write failed');
  } finally {
    await handle?.close().catch(() => {});
  }
  await fsyncDirectory(path.dirname(filePath));
}

async function readBoundedJson(filePath) {
  let stat;
  try {
    stat = await lstat(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    fail('POMRX_GATE_E_DURABLE_IO', 'durable record metadata could not be inspected');
  }
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 2 || stat.size > MAX_RECORD_BYTES) {
    fail('POMRX_GATE_E_DURABLE_CORRUPT', 'durable record is not a bounded regular file');
  }
  let text;
  try {
    text = await readFile(filePath, 'utf8');
  } catch {
    fail('POMRX_GATE_E_DURABLE_IO', 'durable record could not be read');
  }
  try {
    return JSON.parse(text);
  } catch {
    fail('POMRX_GATE_E_DURABLE_CORRUPT', 'durable record JSON is invalid');
  }
}

function makeInspection(state, claimRecord = null, terminalRecord = null) {
  return Object.freeze({
    state,
    capability_id: claimRecord?.capability_id ?? null,
    authorization_commitment: claimRecord?.authorization_commitment ?? null,
    claim_commitment: claimRecord?.claim_commitment ?? null,
    terminal_commitment: terminalRecord?.terminal_commitment ?? null,
    reference_only: true,
    single_host_local_filesystem_atomic_claim_proved: claimRecord !== null,
    distributed_consensus_proved: false,
    network_filesystem_atomicity_proved: false,
    crash_recovery_proved: false,
  });
}

export function createReferenceDurableClaimStore(options) {
  const bootstrap = exactOwnData(options, BOOTSTRAP_KEYS, 'durable claim store bootstrap');
  if (typeof bootstrap.rootDir !== 'string'
      || bootstrap.rootDir.length < 2
      || bootstrap.rootDir.length > 4096
      || !path.isAbsolute(bootstrap.rootDir)) {
    fail('POMRX_GATE_E_DURABLE_INVALID', 'rootDir must be a bounded absolute path');
  }

  const configuredRoot = path.resolve(bootstrap.rootDir);
  const handleState = new WeakMap();
  let trustedRootPromise = null;

  async function trustedRoot() {
    if (!trustedRootPromise) {
      trustedRootPromise = (async () => {
        try {
          await mkdir(configuredRoot, { recursive: true, mode: 0o700 });
        } catch {
          fail('POMRX_GATE_E_DURABLE_IO', 'durable claim root could not be created');
        }
        let stat;
        let resolved;
        try {
          stat = await lstat(configuredRoot);
          resolved = await realpath(configuredRoot);
        } catch {
          fail('POMRX_GATE_E_DURABLE_IO', 'durable claim root could not be inspected');
        }
        const currentUid = typeof process.getuid === 'function' ? process.getuid() : null;
        const unsafePermissions = (stat.mode & 0o022) !== 0;
        const wrongOwner = currentUid !== null && stat.uid !== currentUid;
        if (!stat.isDirectory()
            || stat.isSymbolicLink()
            || resolved !== configuredRoot
            || unsafePermissions
            || wrongOwner) {
          fail(
            'POMRX_GATE_E_DURABLE_ROOT_INVALID',
            'durable claim root must be a direct process-owned directory without group/world write access or symlink indirection',
          );
        }
        return resolved;
      })();
    }
    return trustedRootPromise;
  }

  async function inspect(input) {
    const captured = exactOwnData(input, INSPECT_KEYS, 'durable claim inspection');
    const capabilityId = validateCapabilityId(captured.capabilityId);
    const authorizationCommitment = validateAuthorizationCommitment(captured.authorizationCommitment);
    const root = await trustedRoot();
    const claimDirectory = path.join(root, capabilityId);

    let directoryStat;
    try {
      directoryStat = await lstat(claimDirectory);
    } catch (error) {
      if (error?.code === 'ENOENT') return makeInspection('ABSENT');
      fail('POMRX_GATE_E_DURABLE_IO', 'durable claim directory could not be inspected');
    }
    if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) {
      fail('POMRX_GATE_E_DURABLE_CORRUPT', 'durable capability claim path is not a regular directory');
    }

    const rawClaim = await readBoundedJson(path.join(claimDirectory, 'claim.json'));
    if (rawClaim === null) {
      return Object.freeze({
        ...makeInspection('RESERVED_INCOMPLETE'),
        capability_id: capabilityId,
      });
    }
    const claimRecord = validateClaimRecord(rawClaim);
    if (claimRecord.capability_id !== capabilityId
        || claimRecord.authorization_commitment !== authorizationCommitment) {
      fail('POMRX_GATE_E_DURABLE_BINDING_MISMATCH', 'persisted durable claim does not match the expected authorization binding');
    }

    const rawTerminal = await readBoundedJson(path.join(claimDirectory, 'terminal.json'));
    if (rawTerminal === null) return makeInspection('RESERVED', claimRecord);
    const terminalRecord = validateTerminalRecord(rawTerminal, claimRecord);
    return makeInspection(terminalRecord.terminal_state, claimRecord, terminalRecord);
  }

  async function claim(input) {
    const captured = exactOwnData(input, INSPECT_KEYS, 'durable claim request');
    const capabilityId = validateCapabilityId(captured.capabilityId);
    const authorizationCommitment = validateAuthorizationCommitment(captured.authorizationCommitment);
    const root = await trustedRoot();
    const claimDirectory = path.join(root, capabilityId);

    try {
      await mkdir(claimDirectory, { mode: 0o700 });
    } catch (error) {
      if (error?.code === 'EEXIST') {
        fail('POMRX_GATE_E_DURABLE_REPLAY', 'capability already has a durable claim tombstone');
      }
      fail('POMRX_GATE_E_DURABLE_IO', 'durable capability claim could not be reserved');
    }

    // Persist the directory entry before writing metadata. If the process crashes
    // after this point, the tombstone intentionally remains fail-closed and a
    // later claimant cannot re-arm the capability merely because metadata is
    // incomplete.
    await fsyncDirectory(root);

    const claimRecord = makeClaimRecord(capabilityId, authorizationCommitment);
    await writeExclusiveDurable(path.join(claimDirectory, 'claim.json'), claimRecord);

    const handle = Object.freeze(Object.create(null));
    handleState.set(handle, {
      state: 'OPEN',
      claimDirectory,
      claimRecord,
    });
    return Object.freeze({
      handle,
      claim: claimRecord,
    });
  }

  async function complete(handle, outcome) {
    const state = handleState.get(handle);
    if (!state || state.state !== 'OPEN') {
      fail('POMRX_GATE_E_DURABLE_STALE', 'durable claim handle is foreign or no longer open');
    }
    if (outcome !== 'success' && outcome !== 'error') {
      fail('POMRX_GATE_E_DURABLE_INVALID', 'durable claim outcome must be success or error');
    }

    // Synchronous reservation before the first await prevents concurrent local
    // completion attempts from racing the terminal write.
    state.state = 'FINALIZING';
    const terminalState = outcome === 'success' ? 'CONSUMED_SUCCESS' : 'CONSUMED_ERROR';
    const terminalRecord = makeTerminalRecord(state.claimRecord, terminalState);
    try {
      const rawPersistedClaim = await readBoundedJson(path.join(state.claimDirectory, 'claim.json'));
      if (rawPersistedClaim === null) {
        fail('POMRX_GATE_E_DURABLE_CORRUPT', 'persisted claim metadata disappeared before completion');
      }
      const persistedClaim = validateClaimRecord(rawPersistedClaim);
      if (persistedClaim.capability_id !== state.claimRecord.capability_id
          || persistedClaim.authorization_commitment !== state.claimRecord.authorization_commitment
          || persistedClaim.claim_commitment !== state.claimRecord.claim_commitment) {
        fail('POMRX_GATE_E_DURABLE_CORRUPT', 'persisted claim changed before terminal completion');
      }
      await writeExclusiveDurable(path.join(state.claimDirectory, 'terminal.json'), terminalRecord);
      state.state = terminalState;
    } catch (error) {
      state.state = 'FAILED_CLOSED';
      throw error;
    }
    return makeInspection(terminalState, state.claimRecord, terminalRecord);
  }

  return Object.freeze({
    claim,
    complete,
    inspect,
  });
}
