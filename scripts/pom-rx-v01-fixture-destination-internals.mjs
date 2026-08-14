import { closeSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, rmdirSync, unlinkSync, writeSync } from 'node:fs';
import path from 'node:path';

import { assertRegularRoot, assertWindowsPathMetadata, compareUnicodeScalars, enumerateRegularFiles, sha256Bytes, validateFixturePath } from './pom-rx-v01-fixture-contract.mjs';

export class GeneratorDestinationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'GeneratorDestinationError';
    this.code = code;
    this.details = details;
  }
}

const fail = (code, message, details = {}) => { throw new GeneratorDestinationError(code, message, details); };
const identity = (stats) => ({ dev: stats.dev, ino: stats.ino, mode: stats.mode, type: stats.isDirectory() ? 'directory' : stats.isFile() ? 'file' : 'other', nlink: stats.nlink, size: stats.size, mtimeNs: stats.mtimeNs });
const sameIdentity = (left, right) => left.dev === right.dev && left.ino === right.ino && left.type === right.type;

function validateComponent(value, label) {
  if (typeof value !== 'string' || value.length === 0 || value === '.' || value === '..' || value.includes('/') || value.includes('\\') || path.isAbsolute(value)) {
    fail('GENERATOR_DESTINATION_NAME_INVALID', `${label} must be one relative path component`, { label });
  }
  validateFixturePath(value);
}

function inspectOwned(target, expected, { file = false } = {}) {
  let current;
  try { current = identity(lstatSync(target, { bigint: true })); } catch { fail('GENERATOR_DESTINATION_OWNERSHIP_LOST', 'owned destination is missing', { path: target }); }
  if (!sameIdentity(current, expected) || (file && (current.type !== 'file' || current.nlink !== 1n))) fail('GENERATOR_DESTINATION_OWNERSHIP_LOST', 'destination identity changed', { path: target });
  return current;
}

function writeAll(fd, bytes) {
  let offset = 0;
  while (offset < bytes.length) {
    const written = writeSync(fd, bytes, offset, bytes.length - offset, offset);
    if (written === 0) fail('GENERATOR_DESTINATION_WRITE_FAILED', 'destination write made no forward progress');
    offset += written;
  }
  fsyncSync(fd);
}

function readOwnedBytes(entry) {
  const before = inspectOwned(entry.path, entry, { file: true });
  const bytes = readFileSync(entry.path);
  const after = inspectOwned(entry.path, entry, { file: true });
  if (!sameIdentity(before, after) || before.size !== after.size || before.mtimeNs !== after.mtimeNs) fail('GENERATOR_DESTINATION_OWNERSHIP_LOST', 'destination changed during final byte validation', { path: entry.path });
  return bytes;
}

export function acquireGeneratorDestination({ parentRoot, versionName = '1', pinName = 'pins.json', markerName = '.pomrx-generator-owner' }) {
  validateComponent(versionName, 'versionName');
  validateComponent(pinName, 'pinName');
  validateComponent(markerName, 'markerName');
  if (new Set([versionName, pinName, markerName]).size !== 3) fail('GENERATOR_DESTINATION_NAME_INVALID', 'destination component names must be distinct');
  assertRegularRoot(parentRoot);
  const resolvedParent = path.resolve(parentRoot);
  if (realpathSync.native(resolvedParent).toLowerCase() !== resolvedParent.toLowerCase()) fail('GENERATOR_DESTINATION_PARENT_INVALID', 'destination parent must use its exact real path', { path: parentRoot });
  const parentIdentity = identity(lstatSync(resolvedParent, { bigint: true }));
  const versionRoot = path.join(resolvedParent, versionName);
  const pinPath = path.join(resolvedParent, pinName);
  const markerPath = path.join(versionRoot, markerName);
  const ledger = [];
  let pinFd;
  let pinEntry;
  let markerEntry;
  let state = 'ACTIVE';

  const revalidateParent = () => {
    assertRegularRoot(resolvedParent);
    inspectOwned(resolvedParent, parentIdentity);
  };
  const addDirectory = (target) => {
    const entry = { path: target, type: 'unproven' };
    ledger.push(entry);
    try {
      Object.assign(entry, identity(lstatSync(target, { bigint: true })));
      if (entry.type !== 'directory') fail('GENERATOR_DESTINATION_OWNERSHIP_LOST', 'owned directory is not a directory', { path: target });
      inspectOwned(target, entry);
    } catch (error) {
      if (entry.type === 'unproven') fail('GENERATOR_DESTINATION_CLAIM_FAILED', 'created directory identity could not be proven', { path: target, cause: error.code });
      throw error;
    }
    return entry;
  };
  const createDirectory = (target, conflictCode = 'GENERATOR_DESTINATION_EXISTS') => {
    try { mkdirSync(target); } catch (error) { fail(conflictCode, 'exclusive directory claim failed', { path: target, cause: error.code }); }
    return addDirectory(target);
  };
  const closeEntry = (entry, cleanupErrors) => {
    if (entry?.fd === undefined) return;
    const fd = entry.fd;
    entry.fd = undefined;
    if (pinFd === fd) pinFd = undefined;
    try { closeSync(fd); } catch (error) {
      if (cleanupErrors) cleanupErrors.push(error); else throw error;
    }
  };
  const createFile = (target, { keepOpen = false, conflictCode = 'GENERATOR_DESTINATION_EXISTS' } = {}) => {
    let fd;
    try { fd = openSync(target, 'wx'); } catch (error) { fail(conflictCode, 'exclusive destination file claim failed', { path: target, cause: error.code }); }
    const entry = { path: target, type: 'unproven', fd };
    ledger.push(entry);
    try {
      Object.assign(entry, identity(fstatSync(fd, { bigint: true })));
      if (entry.type !== 'file' || entry.nlink !== 1n) fail('GENERATOR_DESTINATION_OWNERSHIP_LOST', 'claimed file is not a single-link regular file', { path: target });
      inspectOwned(target, entry, { file: true });
      if (!keepOpen) closeEntry(entry);
      return { fd, entry };
    } catch (error) {
      try { closeEntry(entry); } catch {}
      if (entry.type === 'unproven') fail('GENERATOR_DESTINATION_CLAIM_FAILED', 'created file identity could not be proven', { path: target, cause: error.code });
      throw error;
    }
  };
  const rollbackInternal = (primaryError) => {
    state = 'ROLLING_BACK';
    const cleanupErrors = [];
    for (const entry of ledger) closeEntry(entry, cleanupErrors);
    let metadataSafe = true;
    try {
      const existingTargets = ledger.flatMap((entry) => {
        try { lstatSync(entry.path); return [{ fullPath: entry.path, relativePath: path.relative(resolvedParent, entry.path) || '.' }]; } catch { return []; }
      });
      if (existingTargets.length > 0) assertWindowsPathMetadata(existingTargets, { reparseCode: 'GENERATOR_DESTINATION_REPARSE_REFUSED' });
    } catch (error) { cleanupErrors.push(error); metadataSafe = false; }
    for (const entry of metadataSafe ? [...ledger].reverse() : []) {
      try {
        if (entry.type === 'unproven') throw new Error(`unproven destination claim preserved: ${entry.path}`);
        inspectOwned(entry.path, entry, { file: entry.type === 'file' });
        if (entry.type === 'file') unlinkSync(entry.path); else rmdirSync(entry.path);
      } catch (error) { cleanupErrors.push(error); }
    }
    state = cleanupErrors.length === 0 ? 'ROLLED_BACK' : 'ROLLBACK_INCOMPLETE';
    if (cleanupErrors.length > 0) fail('GENERATOR_ROLLBACK_INCOMPLETE', 'destination rollback preserved unproven or foreign objects', { primary: primaryError?.message, cleanup: cleanupErrors.map((error) => error?.message ?? String(error)) });
    throw primaryError;
  };

  try {
    revalidateParent();
    createDirectory(versionRoot);
    markerEntry = createFile(markerPath).entry;
    const pinClaim = createFile(pinPath, { keepOpen: true });
    pinFd = pinClaim.fd;
    pinEntry = pinClaim.entry;
    revalidateParent();
  } catch (error) {
    if (ledger.length > 0) return rollbackInternal(error);
    throw error;
  }

  const requireActive = () => { if (state !== 'ACTIVE') fail('GENERATOR_DESTINATION_STATE_INVALID', 'destination lease is not active', { state }); };
  const revalidate = () => {
    revalidateParent();
    for (const entry of ledger) inspectOwned(entry.path, entry, { file: entry.type === 'file' });
    try {
      assertWindowsPathMetadata(ledger.map((entry) => ({ fullPath: entry.path, relativePath: path.relative(resolvedParent, entry.path) || '.' })), { reparseCode: 'GENERATOR_DESTINATION_REPARSE_REFUSED' });
    } catch (error) {
      fail(error.code === 'ALTERNATE_DATA_STREAM' ? 'GENERATOR_DESTINATION_REPARSE_REFUSED' : error.code ?? 'GENERATOR_DESTINATION_REPARSE_REFUSED', 'destination reparse or alternate stream detected', { cause: error.message });
    }
  };
  const verifyVersionClosure = () => {
    revalidate();
    const expectedEntries = ledger.filter((entry) => entry.type === 'file' && entry.path.startsWith(`${versionRoot}${path.sep}`));
    const expectedPaths = expectedEntries.map((entry) => path.relative(versionRoot, entry.path).replaceAll('\\', '/')).sort(compareUnicodeScalars);
    const actualPaths = enumerateRegularFiles(versionRoot);
    if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) fail('GENERATOR_DESTINATION_FILE_SET_INVALID', 'final destination file set differs from owned files', { expected: expectedPaths, actual: actualPaths });
    for (const entry of expectedEntries) {
      const bytes = readOwnedBytes(entry);
      if (entry.expectedSize !== bytes.length || entry.sha256 !== sha256Bytes(bytes)) fail('GENERATOR_DESTINATION_BYTES_CHANGED', 'owned destination bytes changed before commit', { path: entry.path });
    }
  };
  const ensureDirectory = (relativePath) => {
    requireActive();
    if (!relativePath || relativePath === '.') return versionRoot;
    validateFixturePath(`${relativePath.replaceAll('\\', '/')}/placeholder`);
    let current = versionRoot;
    for (const segment of relativePath.replaceAll('\\', '/').split('/')) {
      current = path.join(current, segment);
      const existing = ledger.find((entry) => entry.path === current);
      if (existing) { inspectOwned(current, existing); continue; }
      revalidate();
      createDirectory(current);
    }
    return current;
  };
  const writeExclusive = (relativePath, bytes) => {
    requireActive();
    const portablePath = relativePath.replaceAll('\\', '/');
    validateFixturePath(portablePath);
    ensureDirectory(path.posix.dirname(portablePath));
    revalidate();
    const target = path.join(versionRoot, ...portablePath.split('/'));
    const { fd, entry } = createFile(target, { keepOpen: true, conflictCode: 'GENERATOR_DESTINATION_WRITE_CONFLICT' });
    try {
      writeAll(fd, bytes);
      inspectOwned(target, identity(fstatSync(fd, { bigint: true })), { file: true });
      entry.expectedSize = bytes.length;
      entry.sha256 = sha256Bytes(bytes);
    } finally { closeEntry(entry); }
    inspectOwned(target, entry, { file: true });
  };
  const removeMarker = () => {
    requireActive();
    revalidate();
    inspectOwned(markerPath, markerEntry, { file: true });
    unlinkSync(markerPath);
    ledger.splice(ledger.indexOf(markerEntry), 1);
    markerEntry = undefined;
  };
  const publishPinExclusive = (bytes) => {
    requireActive();
    if (markerEntry) fail('GENERATOR_DESTINATION_STATE_INVALID', 'ownership marker must be removed before publishing the pin');
    verifyVersionClosure();
    writeAll(pinFd, bytes);
    const fdIdentity = identity(fstatSync(pinFd, { bigint: true }));
    if (!sameIdentity(fdIdentity, pinEntry) || fdIdentity.nlink !== 1n) fail('GENERATOR_DESTINATION_OWNERSHIP_LOST', 'pin identity changed during publication');
    inspectOwned(pinPath, pinEntry, { file: true });
    pinEntry.expectedSize = bytes.length;
    pinEntry.sha256 = sha256Bytes(bytes);
    state = 'PIN_PUBLISHED';
  };
  const commit = () => {
    if (state !== 'PIN_PUBLISHED') fail('GENERATOR_DESTINATION_STATE_INVALID', 'pin must be published before commit', { state });
    verifyVersionClosure();
    const pinBytes = readOwnedBytes(pinEntry);
    if (pinEntry.expectedSize !== pinBytes.length || pinEntry.sha256 !== sha256Bytes(pinBytes)) fail('GENERATOR_DESTINATION_BYTES_CHANGED', 'pin bytes changed before commit', { path: pinPath });
    closeEntry(pinEntry);
    state = 'COMMITTED';
  };
  const rollback = (primaryError) => {
    if (state === 'COMMITTED' || state === 'ROLLED_BACK' || state === 'ROLLBACK_INCOMPLETE' || state === 'ROLLING_BACK') fail('GENERATOR_DESTINATION_STATE_INVALID', 'destination cannot be rolled back from its current state', { state });
    return rollbackInternal(primaryError);
  };

  return Object.freeze({ versionRoot, pinPath, ensureDirectory, writeExclusive, removeMarker, publishPinExclusive, revalidate, commit, rollback, get state() { return state; } });
}
