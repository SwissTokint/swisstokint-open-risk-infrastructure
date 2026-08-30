import {
  createHash,
  randomUUID,
} from 'node:crypto';
import {
  link,
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  unlink,
} from 'node:fs/promises';
import path from 'node:path';
import { types as utilTypes } from 'node:util';

export const POM_RX_DURABLE_CLAIM_SCHEMA_VERSION = 'pom-rx-durable-claim/0.1';
export const POM_RX_DURABLE_TERMINAL_SCHEMA_VERSION = 'pom-rx-durable-terminal/0.1';

const CLAIM_COMMIT_DOMAIN = 'swisstokint:pom-rx-durable-claim:v1:';
const TERMINAL_COMMIT_DOMAIN = 'swisstokint:pom-rx-durable-terminal:v1:';
const CAPABILITY_ID_PATTERN = /^cap-[a-f0-9]{32}$/u;
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const MAX_RECORD_BYTES = 16 * 1024;
const BOOTSTRAP_KEYS = Object.freeze(['rootDir']);
const BOOTSTRAP_SORTED_KEYS = Object.freeze(['rootDir']);
const INSPECT_KEYS = Object.freeze(['capabilityId', 'authorizationCommitment']);
const INSPECT_SORTED_KEYS = Object.freeze(['authorizationCommitment', 'capabilityId']);
const CLAIM_RECORD_KEYS = Object.freeze([
  'schema_version',
  'capability_id',
  'authorization_commitment',
  'claim_commitment',
  'reference_only',
  'exclusive_claim_recorded',
  'local_filesystem_atomicity_assumed',
  'distributed_consensus_proved',
  'network_filesystem_atomicity_proved',
  'crash_recovery_proved',
]);
const CLAIM_RECORD_SORTED_KEYS = Object.freeze([
  'authorization_commitment',
  'capability_id',
  'claim_commitment',
  'crash_recovery_proved',
  'distributed_consensus_proved',
  'exclusive_claim_recorded',
  'local_filesystem_atomicity_assumed',
  'network_filesystem_atomicity_proved',
  'reference_only',
  'schema_version',
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
const TERMINAL_RECORD_SORTED_KEYS = Object.freeze([
  'authorization_commitment',
  'capability_id',
  'claim_commitment',
  'reference_only',
  'schema_version',
  'terminal_commitment',
  'terminal_state',
]);

// Durable claim identity, root confinement, serialization and handle provenance
// are security-critical. Capture exact-object reflection, identifier validation,
// path/hash/JSON dispatch and WeakMap state once at module initialization so a
// later same-realm mutation cannot redirect rootDir, alter claim/terminal truth,
// admit traversal-shaped capability IDs, or substitute claim-handle state.
// Security-sensitive iteration over module-owned key sets is index-based, with
// explicit pre-sorted companions. Poisoning before module initialization remains
// outside this reference guarantee.
const REFLECT_APPLY = Reflect.apply;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_SORT = Array.prototype.sort;
const BUFFER_CONSTRUCTOR = Buffer;
const BUFFER_BYTE_LENGTH = Buffer.byteLength;
const JSON_OBJECT = JSON;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const OBJECT_CREATE = Object.create;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_OWN_PROPERTY_NAMES = Object.getOwnPropertyNames;
const OBJECT_GET_OWN_PROPERTY_SYMBOLS = Object.getOwnPropertySymbols;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_PROTOTYPE = Object.prototype;
const PATH_BASENAME = path.basename;
const PATH_DIRNAME = path.dirname;
const PATH_IS_ABSOLUTE = path.isAbsolute;
const PATH_JOIN = path.join;
const PATH_RESOLVE = path.resolve;
const PROCESS_GET_UID = typeof process.getuid === 'function' ? process.getuid : null;
const REGEXP_TEST = RegExp.prototype.test;
const UTIL_TYPES_IS_PROXY = utilTypes.isProxy;
const WEAK_MAP_CONSTRUCTOR = WeakMap;
const WEAK_MAP_GET = WeakMap.prototype.get;
const WEAK_MAP_SET = WeakMap.prototype.set;
const CRYPTO_CREATE_HASH = createHash;
const HASH_PROTOTYPE = REFLECT_APPLY(
  OBJECT_GET_PROTOTYPE_OF,
  Object,
  [REFLECT_APPLY(CRYPTO_CREATE_HASH, undefined, ['sha256'])],
);
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;

function arrayIsArray(value) {
  return REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value]);
}

function sortArray(value) {
  return REFLECT_APPLY(ARRAY_SORT, value, []);
}

function bufferByteLength(value, encoding) {
  return REFLECT_APPLY(BUFFER_BYTE_LENGTH, BUFFER_CONSTRUCTOR, [value, encoding]);
}

function createObject(prototype) {
  return REFLECT_APPLY(OBJECT_CREATE, Object, [prototype]);
}

function freezeValue(value) {
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function jsonParse(value) {
  return REFLECT_APPLY(JSON_PARSE, JSON_OBJECT, [value]);
}

function jsonStringify(value) {
  return REFLECT_APPLY(JSON_STRINGIFY, JSON_OBJECT, [value]);
}

function objectGetOwnPropertyDescriptors(value) {
  return REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
}

function objectGetOwnPropertyNames(value) {
  return REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_NAMES, Object, [value]);
}

function objectGetOwnPropertySymbols(value) {
  return REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_SYMBOLS, Object, [value]);
}

function objectGetPrototypeOf(value) {
  return REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]);
}

function objectHasOwn(value, key) {
  return REFLECT_APPLY(OBJECT_HAS_OWN, Object, [value, key]);
}

function isProxy(value) {
  return REFLECT_APPLY(UTIL_TYPES_IS_PROXY, utilTypes, [value]);
}

function regexpTest(pattern, value) {
  return REFLECT_APPLY(REGEXP_TEST, pattern, [value]);
}

function weakMapGet(map, key) {
  return REFLECT_APPLY(WEAK_MAP_GET, map, [key]);
}

function weakMapSet(map, key, value) {
  REFLECT_APPLY(WEAK_MAP_SET, map, [key, value]);
}

function sha256Hex(value) {
  const hash = REFLECT_APPLY(CRYPTO_CREATE_HASH, undefined, ['sha256']);
  REFLECT_APPLY(HASH_UPDATE, hash, [value, 'utf8']);
  return REFLECT_APPLY(HASH_DIGEST, hash, ['hex']);
}

function sameSortedKeys(actual, wanted) {
  if (actual.length !== wanted.length) return false;
  for (let index = 0; index < actual.length; index += 1) {
    if (actual[index] !== wanted[index]) return false;
  }
  return true;
}

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

function isOwnEnumerableDataDescriptor(descriptor) {
  return Boolean(descriptor)
    && objectHasOwn(descriptor, 'value')
    && objectHasOwn(descriptor, 'enumerable')
    && descriptor.enumerable === true
    && !objectHasOwn(descriptor, 'get')
    && !objectHasOwn(descriptor, 'set');
}

function exactOwnData(value, expectedKeys, expectedSortedKeys, label) {
  if (!value
      || typeof value !== 'object'
      || isProxy(value)
      || arrayIsArray(value)) {
    fail('POMRX_GATE_E_DURABLE_INVALID', `${label} must be a non-Proxy plain object`);
  }
  if (objectGetPrototypeOf(value) !== OBJECT_PROTOTYPE
      || objectGetOwnPropertySymbols(value).length !== 0) {
    fail('POMRX_GATE_E_DURABLE_INVALID', `${label} must be a plain object without symbols`);
  }

  const actual = sortArray(objectGetOwnPropertyNames(value));
  if (!sameSortedKeys(actual, expectedSortedKeys)) {
    fail('POMRX_GATE_E_DURABLE_INVALID', `${label} has missing, hidden or unknown fields`);
  }

  const descriptors = objectGetOwnPropertyDescriptors(value);
  const output = createObject(null);
  for (let index = 0; index < expectedKeys.length; index += 1) {
    const key = expectedKeys[index];
    const descriptor = descriptors[key];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail('POMRX_GATE_E_DURABLE_INVALID', `${label}.${key} must be an enumerable data property`);
    }
    output[key] = descriptor.value;
  }
  return freezeValue(output);
}

function canonicalizeFlatRecord(value) {
  const descriptors = objectGetOwnPropertyDescriptors(value);
  const keys = sortArray(objectGetOwnPropertyNames(descriptors));
  let output = '{';
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    const descriptor = descriptors[key];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail('POMRX_GATE_E_DURABLE_INVALID', 'durable record contains a non-data property');
    }
    const fieldValue = descriptor.value;
    if (typeof fieldValue !== 'string' && typeof fieldValue !== 'boolean') {
      fail('POMRX_GATE_E_DURABLE_INVALID', 'durable record contains an unsupported field type');
    }
    if (index > 0) output += ',';
    output += `${jsonStringify(key)}:${jsonStringify(fieldValue)}`;
  }
  return `${output}}`;
}

function validateCapabilityId(value) {
  if (typeof value !== 'string' || !regexpTest(CAPABILITY_ID_PATTERN, value)) {
    fail('POMRX_GATE_E_DURABLE_INVALID', 'capabilityId has an invalid format');
  }
  return value;
}

function validateAuthorizationCommitment(value) {
  if (typeof value !== 'string' || !regexpTest(HASH_PATTERN, value)) {
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
  const payload = freezeValue({
    schema_version: POM_RX_DURABLE_CLAIM_SCHEMA_VERSION,
    capability_id: capabilityId,
    authorization_commitment: authorizationCommitment,
  });
  const canonical = canonicalizeFlatRecord(payload);
  const claimCommitment = sha256Hex(`${CLAIM_COMMIT_DOMAIN}${canonical}`);
  return freezeValue({
    ...payload,
    claim_commitment: claimCommitment,
    reference_only: true,
    exclusive_claim_recorded: true,
    local_filesystem_atomicity_assumed: true,
    distributed_consensus_proved: false,
    network_filesystem_atomicity_proved: false,
    crash_recovery_proved: false,
  });
}

function makeTerminalRecord(claimRecord, terminalState) {
  const payload = freezeValue({
    schema_version: POM_RX_DURABLE_TERMINAL_SCHEMA_VERSION,
    capability_id: claimRecord.capability_id,
    authorization_commitment: claimRecord.authorization_commitment,
    claim_commitment: claimRecord.claim_commitment,
    terminal_state: terminalState,
  });
  const canonical = canonicalizeFlatRecord(payload);
  return freezeValue({
    ...payload,
    terminal_commitment: sha256Hex(`${TERMINAL_COMMIT_DOMAIN}${canonical}`),
    reference_only: true,
  });
}

function validateClaimRecord(value) {
  return normalizePersistedValidation('durable claim record', () => {
    const record = exactOwnData(
      value,
      CLAIM_RECORD_KEYS,
      CLAIM_RECORD_SORTED_KEYS,
      'durable claim record',
    );
    if (record.schema_version !== POM_RX_DURABLE_CLAIM_SCHEMA_VERSION
        || record.reference_only !== true
        || record.exclusive_claim_recorded !== true
        || record.local_filesystem_atomicity_assumed !== true
        || record.distributed_consensus_proved !== false
        || record.network_filesystem_atomicity_proved !== false
        || record.crash_recovery_proved !== false) {
      fail('POMRX_GATE_E_DURABLE_CORRUPT', 'durable claim record flags/version are invalid');
    }
    validateCapabilityId(record.capability_id);
    validateAuthorizationCommitment(record.authorization_commitment);
    if (typeof record.claim_commitment !== 'string' || !regexpTest(HASH_PATTERN, record.claim_commitment)) {
      fail('POMRX_GATE_E_DURABLE_CORRUPT', 'durable claim commitment is invalid');
    }
    const expected = makeClaimRecord(record.capability_id, record.authorization_commitment);
    if (expected.claim_commitment !== record.claim_commitment) {
      fail('POMRX_GATE_E_DURABLE_CORRUPT', 'durable claim commitment does not match record contents');
    }
    return freezeValue({ ...record });
  });
}

function validateTerminalRecord(value, claimRecord) {
  return normalizePersistedValidation('durable terminal record', () => {
    const record = exactOwnData(
      value,
      TERMINAL_RECORD_KEYS,
      TERMINAL_RECORD_SORTED_KEYS,
      'durable terminal record',
    );
    if (record.schema_version !== POM_RX_DURABLE_TERMINAL_SCHEMA_VERSION
        || record.reference_only !== true
        || (record.terminal_state !== 'CONSUMED_SUCCESS'
          && record.terminal_state !== 'CONSUMED_ERROR')) {
      fail('POMRX_GATE_E_DURABLE_CORRUPT', 'durable terminal record flags/version/state are invalid');
    }
    if (record.capability_id !== claimRecord.capability_id
        || record.authorization_commitment !== claimRecord.authorization_commitment
        || record.claim_commitment !== claimRecord.claim_commitment) {
      fail('POMRX_GATE_E_DURABLE_CORRUPT', 'durable terminal record is not bound to the persisted claim');
    }
    if (typeof record.terminal_commitment !== 'string' || !regexpTest(HASH_PATTERN, record.terminal_commitment)) {
      fail('POMRX_GATE_E_DURABLE_CORRUPT', 'durable terminal commitment is invalid');
    }
    const expected = makeTerminalRecord(claimRecord, record.terminal_state);
    if (expected.terminal_commitment !== record.terminal_commitment) {
      fail('POMRX_GATE_E_DURABLE_CORRUPT', 'durable terminal commitment does not match record contents');
    }
    return freezeValue({ ...record });
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
  const body = `${canonicalizeFlatRecord(value)}\n`;
  if (bufferByteLength(body, 'utf8') > MAX_RECORD_BYTES) {
    fail('POMRX_GATE_E_DURABLE_INVALID', 'durable record exceeds the maximum size');
  }

  const directory = PATH_DIRNAME(filePath);
  const tempPath = PATH_JOIN(
    directory,
    `.${PATH_BASENAME(filePath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  let handle;
  let tempExists = false;
  try {
    // Never expose the final record name until the complete payload has been
    // written and fsynced. A same-directory hard link installs the immutable
    // inode atomically without overwriting an existing final record.
    handle = await open(tempPath, 'wx', 0o600);
    tempExists = true;
    await handle.writeFile(body, 'utf8');
    await handle.sync();
    await handle.close();
    handle = null;

    try {
      await link(tempPath, filePath);
    } catch (error) {
      if (error?.code === 'EEXIST') {
        fail('POMRX_GATE_E_DURABLE_REPLAY', 'durable terminal/claim record already exists');
      }
      throw error;
    }

    await unlink(tempPath);
    tempExists = false;
    await fsyncDirectory(directory);
  } catch (error) {
    if (error instanceof PomRxDurableClaimStoreError) throw error;
    fail('POMRX_GATE_E_DURABLE_IO', 'durable record publication failed');
  } finally {
    await handle?.close().catch(() => {});
    if (tempExists) await unlink(tempPath).catch(() => {});
  }
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
    return jsonParse(text);
  } catch {
    fail('POMRX_GATE_E_DURABLE_CORRUPT', 'durable record JSON is invalid');
  }
}

function makeInspection(state, claimRecord = null, terminalRecord = null) {
  return freezeValue({
    state,
    capability_id: claimRecord?.capability_id ?? null,
    authorization_commitment: claimRecord?.authorization_commitment ?? null,
    claim_commitment: claimRecord?.claim_commitment ?? null,
    terminal_commitment: terminalRecord?.terminal_commitment ?? null,
    reference_only: true,
    exclusive_claim_recorded: claimRecord !== null,
    local_filesystem_atomicity_assumed: true,
    distributed_consensus_proved: false,
    network_filesystem_atomicity_proved: false,
    crash_recovery_proved: false,
  });
}

export function createReferenceDurableClaimStore(options) {
  const bootstrap = exactOwnData(
    options,
    BOOTSTRAP_KEYS,
    BOOTSTRAP_SORTED_KEYS,
    'durable claim store bootstrap',
  );
  if (typeof bootstrap.rootDir !== 'string'
      || bootstrap.rootDir.length < 2
      || bootstrap.rootDir.length > 4096
      || !PATH_IS_ABSOLUTE(bootstrap.rootDir)) {
    fail('POMRX_GATE_E_DURABLE_INVALID', 'rootDir must be a bounded absolute path');
  }

  const configuredRoot = PATH_RESOLVE(bootstrap.rootDir);
  const handleState = new WEAK_MAP_CONSTRUCTOR();
  let trustedRootPromise = null;

  async function trustedRoot() {
    if (!trustedRootPromise) {
      trustedRootPromise = (async () => {
        let stat;
        let resolved;
        try {
          stat = await lstat(configuredRoot);
          resolved = await realpath(configuredRoot);
        } catch (error) {
          if (error?.code === 'ENOENT') {
            fail(
              'POMRX_GATE_E_DURABLE_ROOT_INVALID',
              'durable claim root must be pre-existing and durably provisioned',
            );
          }
          fail('POMRX_GATE_E_DURABLE_IO', 'durable claim root could not be inspected');
        }
        const currentUid = PROCESS_GET_UID === null
          ? null
          : REFLECT_APPLY(PROCESS_GET_UID, process, []);
        const unsafePermissions = process.platform !== 'win32' && (stat.mode & 0o022) !== 0;
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

        // The store never creates its own root. The deployment must provision it
        // durably before bootstrap. Synchronizing the direct parent here also
        // persists the already-present root directory entry under the supported
        // local-filesystem model before any capability claim can report success.
        await fsyncDirectory(PATH_DIRNAME(configuredRoot));
        return resolved;
      })();
    }
    return trustedRootPromise;
  }

  async function inspect(input) {
    const captured = exactOwnData(
      input,
      INSPECT_KEYS,
      INSPECT_SORTED_KEYS,
      'durable claim inspection',
    );
    const capabilityId = validateCapabilityId(captured.capabilityId);
    const authorizationCommitment = validateAuthorizationCommitment(captured.authorizationCommitment);
    const root = await trustedRoot();
    const claimDirectory = PATH_JOIN(root, capabilityId);

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

    const rawClaim = await readBoundedJson(PATH_JOIN(claimDirectory, 'claim.json'));
    if (rawClaim === null) {
      return freezeValue({
        ...makeInspection('RESERVED_INCOMPLETE'),
        capability_id: capabilityId,
      });
    }
    const claimRecord = validateClaimRecord(rawClaim);
    if (claimRecord.capability_id !== capabilityId
        || claimRecord.authorization_commitment !== authorizationCommitment) {
      fail('POMRX_GATE_E_DURABLE_BINDING_MISMATCH', 'persisted durable claim does not match the expected authorization binding');
    }

    const rawTerminal = await readBoundedJson(PATH_JOIN(claimDirectory, 'terminal.json'));
    if (rawTerminal === null) return makeInspection('RESERVED', claimRecord);
    const terminalRecord = validateTerminalRecord(rawTerminal, claimRecord);
    return makeInspection(terminalRecord.terminal_state, claimRecord, terminalRecord);
  }

  async function claim(input) {
    const captured = exactOwnData(
      input,
      INSPECT_KEYS,
      INSPECT_SORTED_KEYS,
      'durable claim request',
    );
    const capabilityId = validateCapabilityId(captured.capabilityId);
    const authorizationCommitment = validateAuthorizationCommitment(captured.authorizationCommitment);
    const root = await trustedRoot();
    const claimDirectory = PATH_JOIN(root, capabilityId);

    try {
      await mkdir(claimDirectory, { mode: 0o700 });
    } catch (error) {
      if (error?.code === 'EEXIST') {
        fail('POMRX_GATE_E_DURABLE_REPLAY', 'capability already has a durable claim tombstone');
      }
      fail('POMRX_GATE_E_DURABLE_IO', 'durable capability claim could not be reserved');
    }

    // mkdir() alone is not a durability claim. Only after this root-directory
    // fsync succeeds is the new capability-directory entry treated as a durable
    // fail-closed tombstone by a successful claim() operation.
    await fsyncDirectory(root);

    const claimRecord = makeClaimRecord(capabilityId, authorizationCommitment);
    await writeExclusiveDurable(PATH_JOIN(claimDirectory, 'claim.json'), claimRecord);

    const handle = freezeValue(createObject(null));
    weakMapSet(handleState, handle, {
      state: 'OPEN',
      claimDirectory,
      claimRecord,
    });
    return freezeValue({
      handle,
      claim: claimRecord,
    });
  }

  async function complete(handle, outcome) {
    const state = weakMapGet(handleState, handle);
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
      const rawPersistedClaim = await readBoundedJson(PATH_JOIN(state.claimDirectory, 'claim.json'));
      if (rawPersistedClaim === null) {
        fail('POMRX_GATE_E_DURABLE_CORRUPT', 'persisted claim metadata disappeared before completion');
      }
      const persistedClaim = validateClaimRecord(rawPersistedClaim);
      if (persistedClaim.capability_id !== state.claimRecord.capability_id
          || persistedClaim.authorization_commitment !== state.claimRecord.authorization_commitment
          || persistedClaim.claim_commitment !== state.claimRecord.claim_commitment) {
        fail('POMRX_GATE_E_DURABLE_CORRUPT', 'persisted claim changed before terminal completion');
      }
      await writeExclusiveDurable(PATH_JOIN(state.claimDirectory, 'terminal.json'), terminalRecord);
      state.state = terminalState;
    } catch (error) {
      state.state = 'FAILED_CLOSED';
      throw error;
    }
    return makeInspection(terminalState, state.claimRecord, terminalRecord);
  }

  return freezeValue({
    claim,
    complete,
    inspect,
  });
}
