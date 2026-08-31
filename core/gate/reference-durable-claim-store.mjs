import {
  Stats,
  close as closeFdCallback,
  closeSync as closeFdSyncCallback,
  fstat as fstatFdCallback,
  fstatSync as fstatFdSyncCallback,
  fsync as fsyncFdCallback,
  fsyncSync as fsyncFdSyncCallback,
  linkSync as linkSyncCallback,
  lstat as lstatCallback,
  lstatSync as lstatSyncCallback,
  mkdirSync as mkdirSyncCallback,
  open as openFdCallback,
  openSync as openFdSyncCallback,
  readFileSync as readFileSyncCallback,
  realpathSync as realpathSyncCallback,
  stat as statCallback,
  statSync as statSyncCallback,
  unlinkSync as unlinkSyncCallback,
  writeFile as writeFileFdCallback,
  writeFileSync as writeFileFdSyncCallback,
} from 'node:fs';
import {
  createHash,
  randomUUID,
} from 'node:crypto';
import {
  link,
  mkdir,
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

// Durable claim identity, root confinement, serialization and persistence are
// security-critical. Capture exact-object reflection, identifier validation,
// path/hash/JSON dispatch, fd I/O entry points and WeakMap state once at module
// initialization so a later same-realm mutation cannot redirect rootDir, alter
// claim/terminal truth, admit traversal-shaped capability IDs, substitute handle
// state, or fake a successful write/fsync/close through mutable Node prototypes.
// Filesystem metadata and persisted JSON records are copied to prototype-inert
// snapshots before Promise resolution, so inherited thenables cannot substitute
// Stats, claim, terminal or inspection truth. The durable root is pinned by an
// open directory fd. On Linux, every claim/inspect/complete mutation or read that
// decides durable truth executes in a captured synchronous critical section:
// root pathname, fd and procfs identities are checked immediately before the
// operation, no JavaScript scheduling point exists while the root-bound work is
// performed, and the same identities are checked again before control returns to
// untrusted same-realm code. This specifically prevents close/reuse of the raw fd
// number from redirecting /proc/self/fd traversal between asynchronous checks.
// The public close lifecycle drains in-flight store operations before releasing
// the pinned descriptor. Procfs /proc/self/fd accessibility is validated as part
// of root pinning and never silently falls back to an unpinned pathname.
// Poisoning before module initialization remains outside this reference guarantee.
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
const CRYPTO_RANDOM_UUID = randomUUID;
const HASH_PROTOTYPE = REFLECT_APPLY(
  OBJECT_GET_PROTOTYPE_OF,
  Object,
  [REFLECT_APPLY(CRYPTO_CREATE_HASH, undefined, ['sha256'])],
);
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const PROMISE_CONSTRUCTOR = Promise;
const FS_OPEN_FD = openFdCallback;
const FS_WRITE_FILE_FD = writeFileFdCallback;
const FS_FSTAT_FD = fstatFdCallback;
const FS_FSYNC_FD = fsyncFdCallback;
const FS_CLOSE_FD = closeFdCallback;
const FS_LSTAT = lstatCallback;
const FS_STAT = statCallback;
const FS_LINK = link;
const FS_MKDIR = mkdir;
const FS_READ_FILE = readFile;
const FS_REALPATH = realpath;
const FS_UNLINK = unlink;
const FS_OPEN_SYNC = openFdSyncCallback;
const FS_WRITE_FILE_SYNC = writeFileFdSyncCallback;
const FS_FSTAT_SYNC = fstatFdSyncCallback;
const FS_FSYNC_SYNC = fsyncFdSyncCallback;
const FS_CLOSE_SYNC = closeFdSyncCallback;
const FS_LSTAT_SYNC = lstatSyncCallback;
const FS_STAT_SYNC = statSyncCallback;
const FS_LINK_SYNC = linkSyncCallback;
const FS_MKDIR_SYNC = mkdirSyncCallback;
const FS_READ_FILE_SYNC = readFileSyncCallback;
const FS_REALPATH_SYNC = realpathSyncCallback;
const FS_UNLINK_SYNC = unlinkSyncCallback;
const STATS_IS_DIRECTORY = Stats.prototype.isDirectory;
const STATS_IS_FILE = Stats.prototype.isFile;
const STATS_IS_SYMBOLIC_LINK = Stats.prototype.isSymbolicLink;
const PROCESS_PLATFORM = process.platform;

function makeStatSnapshot(stat) {
  const snapshot = createObject(null);
  snapshot.mode = stat.mode;
  snapshot.uid = stat.uid;
  snapshot.size = stat.size;
  snapshot.dev = stat.dev;
  snapshot.ino = stat.ino;
  snapshot.is_directory = REFLECT_APPLY(STATS_IS_DIRECTORY, stat, []);
  snapshot.is_file = REFLECT_APPLY(STATS_IS_FILE, stat, []);
  snapshot.is_symbolic_link = REFLECT_APPLY(STATS_IS_SYMBOLIC_LINK, stat, []);
  return freezeValue(snapshot);
}

function fsLstat(filePath) {
  return new PROMISE_CONSTRUCTOR((resolve, reject) => {
    REFLECT_APPLY(FS_LSTAT, undefined, [filePath, (error, stat) => {
      if (error) {
        reject(error);
        return;
      }
      try {
        resolve(makeStatSnapshot(stat));
      } catch (snapshotError) {
        reject(snapshotError);
      }
    }]);
  });
}

function fsStat(filePath) {
  return new PROMISE_CONSTRUCTOR((resolve, reject) => {
    REFLECT_APPLY(FS_STAT, undefined, [filePath, (error, stat) => {
      if (error) {
        reject(error);
        return;
      }
      try {
        resolve(makeStatSnapshot(stat));
      } catch (snapshotError) {
        reject(snapshotError);
      }
    }]);
  });
}

function fsFstat(fd) {
  return new PROMISE_CONSTRUCTOR((resolve, reject) => {
    REFLECT_APPLY(FS_FSTAT_FD, undefined, [fd, (error, stat) => {
      if (error) {
        reject(error);
        return;
      }
      try {
        resolve(makeStatSnapshot(stat));
      } catch (snapshotError) {
        reject(snapshotError);
      }
    }]);
  });
}

function fsMkdir(filePath, options) {
  return REFLECT_APPLY(FS_MKDIR, undefined, [filePath, options]);
}

function fsReadFile(filePath, options) {
  return REFLECT_APPLY(FS_READ_FILE, undefined, [filePath, options]);
}

function fsRealpath(filePath) {
  return REFLECT_APPLY(FS_REALPATH, undefined, [filePath]);
}

function fsUnlink(filePath) {
  return REFLECT_APPLY(FS_UNLINK, undefined, [filePath]);
}

function fsLstatSyncSnapshot(filePath) {
  return makeStatSnapshot(REFLECT_APPLY(FS_LSTAT_SYNC, undefined, [filePath]));
}

function fsStatSyncSnapshot(filePath) {
  return makeStatSnapshot(REFLECT_APPLY(FS_STAT_SYNC, undefined, [filePath]));
}

function fsFstatSyncSnapshot(fd) {
  return makeStatSnapshot(REFLECT_APPLY(FS_FSTAT_SYNC, undefined, [fd]));
}

function fsRealpathSync(filePath) {
  return REFLECT_APPLY(FS_REALPATH_SYNC, undefined, [filePath]);
}

function fsMkdirSync(filePath, options) {
  return REFLECT_APPLY(FS_MKDIR_SYNC, undefined, [filePath, options]);
}

function fsReadFileSync(filePath, options) {
  return REFLECT_APPLY(FS_READ_FILE_SYNC, undefined, [filePath, options]);
}

function fsUnlinkSync(filePath) {
  return REFLECT_APPLY(FS_UNLINK_SYNC, undefined, [filePath]);
}

function openFdSync(filePath, flags, mode) {
  return REFLECT_APPLY(FS_OPEN_SYNC, undefined, [filePath, flags, mode]);
}

function writeFileFdSync(fd, value, encoding) {
  REFLECT_APPLY(FS_WRITE_FILE_SYNC, undefined, [fd, value, encoding]);
}

function fsyncFdSync(fd) {
  REFLECT_APPLY(FS_FSYNC_SYNC, undefined, [fd]);
}

function closeFdSync(fd) {
  REFLECT_APPLY(FS_CLOSE_SYNC, undefined, [fd]);
}

function statIsDirectory(stat) {
  return stat.is_directory === true;
}

function statIsFile(stat) {
  return stat.is_file === true;
}

function statIsSymbolicLink(stat) {
  return stat.is_symbolic_link === true;
}

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

function openFd(filePath, flags, mode) {
  return new PROMISE_CONSTRUCTOR((resolve, reject) => {
    REFLECT_APPLY(FS_OPEN_FD, undefined, [filePath, flags, mode, (error, fd) => {
      if (error) reject(error);
      else resolve(fd);
    }]);
  });
}

function writeFileFd(fd, value, encoding) {
  return new PROMISE_CONSTRUCTOR((resolve, reject) => {
    REFLECT_APPLY(FS_WRITE_FILE_FD, undefined, [fd, value, encoding, (error) => {
      if (error) reject(error);
      else resolve();
    }]);
  });
}

function fsyncFd(fd) {
  return new PROMISE_CONSTRUCTOR((resolve, reject) => {
    REFLECT_APPLY(FS_FSYNC_FD, undefined, [fd, (error) => {
      if (error) reject(error);
      else resolve();
    }]);
  });
}

function closeFd(fd) {
  return new PROMISE_CONSTRUCTOR((resolve, reject) => {
    REFLECT_APPLY(FS_CLOSE_FD, undefined, [fd, (error) => {
      if (error) reject(error);
      else resolve();
    }]);
  });
}

async function closeFdIgnoringFailure(fd) {
  if (fd === null) return;
  try {
    await closeFd(fd);
  } catch {
    // Best-effort cleanup only. The durable operation itself reports its own
    // write/fsync/close failure before this path is reached.
  }
}

function closeFdSyncIgnoringFailure(fd) {
  if (fd === null) return;
  try {
    closeFdSync(fd);
  } catch {
    // Best-effort synchronous cleanup inside a non-interleavable critical path.
  }
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

function exactOwnData(value, expectedKeys, expectedSortedKeys, label, allowNullPrototype = false) {
  if (!value
      || typeof value !== 'object'
      || isProxy(value)
      || arrayIsArray(value)) {
    fail('POMRX_GATE_E_DURABLE_INVALID', `${label} must be a non-Proxy plain object`);
  }
  const prototype = objectGetPrototypeOf(value);
  if ((prototype !== OBJECT_PROTOTYPE && !(allowNullPrototype && prototype === null))
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

function captureParsedDurableRecord(value) {
  if (!value
      || typeof value !== 'object'
      || arrayIsArray(value)
      || isProxy(value)
      || objectGetPrototypeOf(value) !== OBJECT_PROTOTYPE
      || objectGetOwnPropertySymbols(value).length !== 0) {
    fail('POMRX_GATE_E_DURABLE_CORRUPT', 'durable record JSON must decode to a plain object');
  }
  const descriptors = objectGetOwnPropertyDescriptors(value);
  const keys = objectGetOwnPropertyNames(value);
  const output = createObject(null);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    const descriptor = descriptors[key];
    if (!isOwnEnumerableDataDescriptor(descriptor)) {
      fail('POMRX_GATE_E_DURABLE_CORRUPT', 'durable record JSON contains a non-data property');
    }
    output[key] = descriptor.value;
  }
  return freezeValue(output);
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
      true,
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
    return record;
  });
}

function validateTerminalRecord(value, claimRecord) {
  return normalizePersistedValidation('durable terminal record', () => {
    const record = exactOwnData(
      value,
      TERMINAL_RECORD_KEYS,
      TERMINAL_RECORD_SORTED_KEYS,
      'durable terminal record',
      true,
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
    return record;
  });
}

async function fsyncDirectory(directory) {
  let fd = null;
  try {
    fd = await openFd(directory, 'r', 0o600);
    await fsyncFd(fd);
    await closeFd(fd);
    fd = null;
  } catch {
    fail('POMRX_GATE_E_DURABLE_IO', 'durable directory synchronization failed');
  } finally {
    await closeFdIgnoringFailure(fd);
  }
}

function fsyncDirectorySync(directory) {
  let fd = null;
  try {
    fd = openFdSync(directory, 'r', 0o600);
    fsyncFdSync(fd);
    closeFdSync(fd);
    fd = null;
  } catch {
    fail('POMRX_GATE_E_DURABLE_IO', 'durable directory synchronization failed');
  } finally {
    closeFdSyncIgnoringFailure(fd);
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
    `.${PATH_BASENAME(filePath)}.${process.pid}.${REFLECT_APPLY(CRYPTO_RANDOM_UUID, undefined, [])}.tmp`,
  );
  let fd = null;
  let tempExists = false;
  try {
    fd = await openFd(tempPath, 'wx', 0o600);
    tempExists = true;
    await writeFileFd(fd, body, 'utf8');
    await fsyncFd(fd);
    await closeFd(fd);
    fd = null;

    try {
      await REFLECT_APPLY(FS_LINK, undefined, [tempPath, filePath]);
    } catch (error) {
      if (error?.code === 'EEXIST') {
        fail('POMRX_GATE_E_DURABLE_REPLAY', 'durable terminal/claim record already exists');
      }
      throw error;
    }

    await fsUnlink(tempPath);
    tempExists = false;
    await fsyncDirectory(directory);
  } catch (error) {
    if (error instanceof PomRxDurableClaimStoreError) throw error;
    fail('POMRX_GATE_E_DURABLE_IO', 'durable record publication failed');
  } finally {
    await closeFdIgnoringFailure(fd);
    if (tempExists) {
      try {
        await fsUnlink(tempPath);
      } catch {
        // Best-effort cleanup; the primary durable failure remains authoritative.
      }
    }
  }
}

function writeExclusiveDurableSync(filePath, value) {
  const body = `${canonicalizeFlatRecord(value)}\n`;
  if (bufferByteLength(body, 'utf8') > MAX_RECORD_BYTES) {
    fail('POMRX_GATE_E_DURABLE_INVALID', 'durable record exceeds the maximum size');
  }

  const directory = PATH_DIRNAME(filePath);
  const tempPath = PATH_JOIN(
    directory,
    `.${PATH_BASENAME(filePath)}.${process.pid}.${REFLECT_APPLY(CRYPTO_RANDOM_UUID, undefined, [])}.tmp`,
  );
  let fd = null;
  let tempExists = false;
  try {
    fd = openFdSync(tempPath, 'wx', 0o600);
    tempExists = true;
    writeFileFdSync(fd, body, 'utf8');
    fsyncFdSync(fd);
    closeFdSync(fd);
    fd = null;

    try {
      REFLECT_APPLY(FS_LINK_SYNC, undefined, [tempPath, filePath]);
    } catch (error) {
      if (error?.code === 'EEXIST') {
        fail('POMRX_GATE_E_DURABLE_REPLAY', 'durable terminal/claim record already exists');
      }
      throw error;
    }

    fsUnlinkSync(tempPath);
    tempExists = false;
    fsyncDirectorySync(directory);
  } catch (error) {
    if (error instanceof PomRxDurableClaimStoreError) throw error;
    fail('POMRX_GATE_E_DURABLE_IO', 'durable record publication failed');
  } finally {
    closeFdSyncIgnoringFailure(fd);
    if (tempExists) {
      try {
        fsUnlinkSync(tempPath);
      } catch {
        // Best-effort cleanup; the primary durable failure remains authoritative.
      }
    }
  }
}

async function readBoundedJson(filePath) {
  let stat;
  try {
    stat = await fsLstat(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    fail('POMRX_GATE_E_DURABLE_IO', 'durable record metadata could not be inspected');
  }
  if (!statIsFile(stat) || statIsSymbolicLink(stat) || stat.size < 2 || stat.size > MAX_RECORD_BYTES) {
    fail('POMRX_GATE_E_DURABLE_CORRUPT', 'durable record is not a bounded regular file');
  }
  let text;
  try {
    text = await fsReadFile(filePath, 'utf8');
  } catch {
    fail('POMRX_GATE_E_DURABLE_IO', 'durable record could not be read');
  }
  try {
    return captureParsedDurableRecord(jsonParse(text));
  } catch (error) {
    if (error instanceof PomRxDurableClaimStoreError) throw error;
    fail('POMRX_GATE_E_DURABLE_CORRUPT', 'durable record JSON is invalid');
  }
}

function readBoundedJsonSync(filePath) {
  let stat;
  try {
    stat = fsLstatSyncSnapshot(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    fail('POMRX_GATE_E_DURABLE_IO', 'durable record metadata could not be inspected');
  }
  if (!statIsFile(stat) || statIsSymbolicLink(stat) || stat.size < 2 || stat.size > MAX_RECORD_BYTES) {
    fail('POMRX_GATE_E_DURABLE_CORRUPT', 'durable record is not a bounded regular file');
  }
  let text;
  try {
    text = fsReadFileSync(filePath, 'utf8');
  } catch {
    fail('POMRX_GATE_E_DURABLE_IO', 'durable record could not be read');
  }
  try {
    return captureParsedDurableRecord(jsonParse(text));
  } catch (error) {
    if (error instanceof PomRxDurableClaimStoreError) throw error;
    fail('POMRX_GATE_E_DURABLE_CORRUPT', 'durable record JSON is invalid');
  }
}

function makeInspection(state, claimRecord = null, terminalRecord = null, capabilityId = null) {
  const inspection = createObject(null);
  inspection.state = state;
  inspection.capability_id = claimRecord?.capability_id ?? capabilityId;
  inspection.authorization_commitment = claimRecord?.authorization_commitment ?? null;
  inspection.claim_commitment = claimRecord?.claim_commitment ?? null;
  inspection.terminal_commitment = terminalRecord?.terminal_commitment ?? null;
  inspection.reference_only = true;
  inspection.exclusive_claim_recorded = claimRecord !== null;
  inspection.local_filesystem_atomicity_assumed = true;
  inspection.distributed_consensus_proved = false;
  inspection.network_filesystem_atomicity_proved = false;
  inspection.crash_recovery_proved = false;
  return freezeValue(inspection);
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
  let lifecycleState = 'OPEN';
  let activeOperations = 0;
  let drainResolve = null;
  let closePromise = null;

  function beginOperation() {
    if (lifecycleState !== 'OPEN') {
      fail('POMRX_GATE_E_DURABLE_CLOSED', 'durable claim store is closing or closed');
    }
    activeOperations += 1;
  }

  function endOperation() {
    activeOperations -= 1;
    if (activeOperations === 0 && drainResolve !== null) {
      const resolve = drainResolve;
      drainResolve = null;
      resolve();
    }
  }

  async function runOperation(operation) {
    beginOperation();
    try {
      return await operation();
    } finally {
      endOperation();
    }
  }

  function validateRootIdentity(stat, resolved, currentUid) {
    const unsafePermissions = PROCESS_PLATFORM !== 'win32' && (stat.mode & 0o022) !== 0;
    const wrongOwner = currentUid !== null && stat.uid !== currentUid;
    if (!statIsDirectory(stat)
        || statIsSymbolicLink(stat)
        || resolved !== configuredRoot
        || unsafePermissions
        || wrongOwner) {
      fail(
        'POMRX_GATE_E_DURABLE_ROOT_INVALID',
        'durable claim root must be a direct process-owned directory without group/world write access or symlink indirection',
      );
    }
  }

  async function inspectConfiguredRoot() {
    let stat;
    let resolved;
    try {
      stat = await fsLstat(configuredRoot);
      resolved = await fsRealpath(configuredRoot);
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
    validateRootIdentity(stat, resolved, currentUid);
    const identity = createObject(null);
    identity.dev = stat.dev;
    identity.ino = stat.ino;
    identity.mode = stat.mode;
    identity.uid = stat.uid;
    identity.resolved = resolved;
    return freezeValue(identity);
  }

  function inspectConfiguredRootSync() {
    let stat;
    let resolved;
    try {
      stat = fsLstatSyncSnapshot(configuredRoot);
      resolved = fsRealpathSync(configuredRoot);
    } catch (error) {
      if (error?.code === 'ENOENT') {
        fail(
          'POMRX_GATE_E_DURABLE_ROOT_INVALID',
          'durable claim root must be pre-existing and durably provisioned',
        );
      }
      fail('POMRX_GATE_E_DURABLE_ROOT_INVALID', 'durable claim root identity cannot be synchronously verified');
    }
    const currentUid = PROCESS_GET_UID === null
      ? null
      : REFLECT_APPLY(PROCESS_GET_UID, process, []);
    validateRootIdentity(stat, resolved, currentUid);
    const identity = createObject(null);
    identity.dev = stat.dev;
    identity.ino = stat.ino;
    identity.mode = stat.mode;
    identity.uid = stat.uid;
    identity.resolved = resolved;
    return freezeValue(identity);
  }

  function assertPinnedRootSync(root) {
    let currentPathIdentity;
    let currentFdIdentity;
    let operationIdentity = null;
    try {
      currentPathIdentity = inspectConfiguredRootSync();
      currentFdIdentity = fsFstatSyncSnapshot(root.fd);
      if (PROCESS_PLATFORM === 'linux') {
        operationIdentity = fsStatSyncSnapshot(root.operationRoot);
      }
    } catch (error) {
      if (error instanceof PomRxDurableClaimStoreError
          && error.code === 'POMRX_GATE_E_DURABLE_ROOT_INVALID') {
        throw error;
      }
      fail('POMRX_GATE_E_DURABLE_ROOT_INVALID', 'pinned durable-root descriptor identity cannot be verified');
    }

    const fdMismatch = currentPathIdentity.dev !== root.dev
      || currentPathIdentity.ino !== root.ino
      || currentPathIdentity.mode !== root.mode
      || currentPathIdentity.uid !== root.uid
      || currentFdIdentity.dev !== root.dev
      || currentFdIdentity.ino !== root.ino
      || currentFdIdentity.mode !== root.mode
      || currentFdIdentity.uid !== root.uid
      || !statIsDirectory(currentFdIdentity)
      || statIsSymbolicLink(currentFdIdentity);
    const operationMismatch = operationIdentity !== null
      && (!statIsDirectory(operationIdentity)
        || operationIdentity.dev !== root.dev
        || operationIdentity.ino !== root.ino);
    if (fdMismatch || operationMismatch) {
      fail(
        'POMRX_GATE_E_DURABLE_ROOT_INVALID',
        'durable claim root descriptor/path identity changed after validation',
      );
    }
  }

  function withPinnedRootCritical(root, operation) {
    // No await, Promise creation or caller callback is allowed between these two
    // identity checks. Same-realm async-hooks code therefore cannot close/reuse
    // root.fd and redirect /proc/self/fd/<fd> while root-bound truth is read or
    // mutated. Synchronous Node filesystem entry points are captured at import.
    assertPinnedRootSync(root);
    try {
      return operation(root.operationRoot);
    } finally {
      assertPinnedRootSync(root);
    }
  }

  async function trustedRoot() {
    if (!trustedRootPromise) {
      trustedRootPromise = (async () => {
        const pathIdentity = await inspectConfiguredRoot();
        let fd = null;
        try {
          fd = await openFd(configuredRoot, 'r', 0o600);
          const fdIdentity = await fsFstat(fd);
          if (!statIsDirectory(fdIdentity)
              || statIsSymbolicLink(fdIdentity)
              || fdIdentity.dev !== pathIdentity.dev
              || fdIdentity.ino !== pathIdentity.ino
              || fdIdentity.mode !== pathIdentity.mode
              || fdIdentity.uid !== pathIdentity.uid) {
            fail(
              'POMRX_GATE_E_DURABLE_ROOT_INVALID',
              'durable claim root changed while its identity was being pinned',
            );
          }

          await fsyncDirectory(PATH_DIRNAME(configuredRoot));

          const root = createObject(null);
          root.fd = fd;
          root.dev = pathIdentity.dev;
          root.ino = pathIdentity.ino;
          root.mode = pathIdentity.mode;
          root.uid = pathIdentity.uid;
          root.resolved = pathIdentity.resolved;
          root.operationRoot = configuredRoot;

          if (PROCESS_PLATFORM === 'linux') {
            const operationRoot = `/proc/self/fd/${fd}`;
            let operationIdentity;
            try {
              operationIdentity = await fsStat(operationRoot);
            } catch {
              fail(
                'POMRX_GATE_E_DURABLE_ROOT_INVALID',
                'Linux durable claim store requires accessible procfs /proc/self/fd for pinned-root operations',
              );
            }
            if (!statIsDirectory(operationIdentity)
                || operationIdentity.dev !== pathIdentity.dev
                || operationIdentity.ino !== pathIdentity.ino) {
              fail(
                'POMRX_GATE_E_DURABLE_ROOT_INVALID',
                'Linux procfs fd path does not resolve to the validated durable-root identity',
              );
            }
            root.operationRoot = operationRoot;
          }

          return freezeValue(root);
        } catch (error) {
          await closeFdIgnoringFailure(fd);
          throw error;
        }
      })();
    }

    const root = await trustedRootPromise;
    const currentPathIdentity = await inspectConfiguredRoot();
    const currentFdIdentity = await fsFstat(root.fd);
    if (currentPathIdentity.dev !== root.dev
        || currentPathIdentity.ino !== root.ino
        || currentPathIdentity.mode !== root.mode
        || currentPathIdentity.uid !== root.uid
        || currentFdIdentity.dev !== root.dev
        || currentFdIdentity.ino !== root.ino
        || currentFdIdentity.mode !== root.mode
        || currentFdIdentity.uid !== root.uid
        || !statIsDirectory(currentFdIdentity)
        || statIsSymbolicLink(currentFdIdentity)) {
      fail(
        'POMRX_GATE_E_DURABLE_ROOT_INVALID',
        'durable claim root identity changed after validation',
      );
    }
    return root;
  }

  async function inspectImpl(input) {
    const captured = exactOwnData(
      input,
      INSPECT_KEYS,
      INSPECT_SORTED_KEYS,
      'durable claim inspection',
    );
    const capabilityId = validateCapabilityId(captured.capabilityId);
    const authorizationCommitment = validateAuthorizationCommitment(captured.authorizationCommitment);
    const rootRef = await trustedRoot();

    return withPinnedRootCritical(rootRef, (root) => {
      const claimDirectory = PATH_JOIN(root, capabilityId);
      let directoryStat;
      try {
        directoryStat = fsLstatSyncSnapshot(claimDirectory);
      } catch (error) {
        if (error?.code === 'ENOENT') return makeInspection('ABSENT');
        fail('POMRX_GATE_E_DURABLE_IO', 'durable claim directory could not be inspected');
      }
      if (!statIsDirectory(directoryStat) || statIsSymbolicLink(directoryStat)) {
        fail('POMRX_GATE_E_DURABLE_CORRUPT', 'durable capability claim path is not a regular directory');
      }

      const rawClaim = readBoundedJsonSync(PATH_JOIN(claimDirectory, 'claim.json'));
      if (rawClaim === null) {
        return makeInspection('RESERVED_INCOMPLETE', null, null, capabilityId);
      }
      const claimRecord = validateClaimRecord(rawClaim);
      if (claimRecord.capability_id !== capabilityId
          || claimRecord.authorization_commitment !== authorizationCommitment) {
        fail('POMRX_GATE_E_DURABLE_BINDING_MISMATCH', 'persisted durable claim does not match the expected authorization binding');
      }

      const rawTerminal = readBoundedJsonSync(PATH_JOIN(claimDirectory, 'terminal.json'));
      if (rawTerminal === null) return makeInspection('RESERVED', claimRecord);
      const terminalRecord = validateTerminalRecord(rawTerminal, claimRecord);
      return makeInspection(terminalRecord.terminal_state, claimRecord, terminalRecord);
    });
  }

  async function claimImpl(input) {
    const captured = exactOwnData(
      input,
      INSPECT_KEYS,
      INSPECT_SORTED_KEYS,
      'durable claim request',
    );
    const capabilityId = validateCapabilityId(captured.capabilityId);
    const authorizationCommitment = validateAuthorizationCommitment(captured.authorizationCommitment);
    const rootRef = await trustedRoot();

    return withPinnedRootCritical(rootRef, (root) => {
      const claimDirectory = PATH_JOIN(root, capabilityId);
      try {
        fsMkdirSync(claimDirectory, { mode: 0o700 });
      } catch (error) {
        if (error?.code === 'EEXIST') {
          fail('POMRX_GATE_E_DURABLE_REPLAY', 'capability already has a durable claim tombstone');
        }
        fail('POMRX_GATE_E_DURABLE_IO', 'durable capability claim could not be reserved');
      }

      fsyncDirectorySync(root);
      const claimRecord = makeClaimRecord(capabilityId, authorizationCommitment);
      writeExclusiveDurableSync(PATH_JOIN(claimDirectory, 'claim.json'), claimRecord);

      const handle = freezeValue(createObject(null));
      weakMapSet(handleState, handle, {
        state: 'OPEN',
        claimDirectory,
        claimRecord,
      });
      const result = createObject(null);
      result.handle = handle;
      result.claim = claimRecord;
      return freezeValue(result);
    });
  }

  async function completeImpl(handle, outcome) {
    const state = weakMapGet(handleState, handle);
    if (!state || state.state !== 'OPEN') {
      fail('POMRX_GATE_E_DURABLE_STALE', 'durable claim handle is foreign or no longer open');
    }
    if (outcome !== 'success' && outcome !== 'error') {
      fail('POMRX_GATE_E_DURABLE_INVALID', 'durable claim outcome must be success or error');
    }

    state.state = 'FINALIZING';
    const terminalState = outcome === 'success' ? 'CONSUMED_SUCCESS' : 'CONSUMED_ERROR';
    const terminalRecord = makeTerminalRecord(state.claimRecord, terminalState);
    try {
      const rootRef = await trustedRoot();
      const inspection = withPinnedRootCritical(rootRef, () => {
        const rawPersistedClaim = readBoundedJsonSync(PATH_JOIN(state.claimDirectory, 'claim.json'));
        if (rawPersistedClaim === null) {
          fail('POMRX_GATE_E_DURABLE_CORRUPT', 'persisted claim metadata disappeared before completion');
        }
        const persistedClaim = validateClaimRecord(rawPersistedClaim);
        if (persistedClaim.capability_id !== state.claimRecord.capability_id
            || persistedClaim.authorization_commitment !== state.claimRecord.authorization_commitment
            || persistedClaim.claim_commitment !== state.claimRecord.claim_commitment) {
          fail('POMRX_GATE_E_DURABLE_CORRUPT', 'persisted claim changed before terminal completion');
        }
        writeExclusiveDurableSync(PATH_JOIN(state.claimDirectory, 'terminal.json'), terminalRecord);
        return makeInspection(terminalState, state.claimRecord, terminalRecord);
      });
      state.state = terminalState;
      return inspection;
    } catch (error) {
      state.state = 'FAILED_CLOSED';
      throw error;
    }
  }

  async function inspect(input) {
    return runOperation(() => inspectImpl(input));
  }

  async function claim(input) {
    return runOperation(() => claimImpl(input));
  }

  async function complete(handle, outcome) {
    return runOperation(() => completeImpl(handle, outcome));
  }

  async function close() {
    if (lifecycleState === 'CLOSED') return;
    if (lifecycleState === 'CLOSING') {
      await closePromise;
      return;
    }

    lifecycleState = 'CLOSING';
    closePromise = (async () => {
      if (activeOperations > 0) {
        await new PROMISE_CONSTRUCTOR((resolve) => {
          drainResolve = resolve;
        });
      }

      let root = null;
      if (trustedRootPromise !== null) {
        try {
          root = await trustedRootPromise;
        } catch {
          root = null;
        }
      }
      if (root !== null) {
        try {
          assertPinnedRootSync(root);
          closeFdSync(root.fd);
        } catch (error) {
          if (error instanceof PomRxDurableClaimStoreError
              && error.code === 'POMRX_GATE_E_DURABLE_ROOT_INVALID') {
            throw error;
          }
          fail('POMRX_GATE_E_DURABLE_IO', 'durable claim root descriptor could not be closed');
        }
      }
    })();

    try {
      await closePromise;
    } finally {
      lifecycleState = 'CLOSED';
    }
  }

  return freezeValue({
    claim,
    complete,
    inspect,
    close,
  });
}
