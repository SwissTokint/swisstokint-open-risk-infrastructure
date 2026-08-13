import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstatSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TextDecoder } from 'node:util';

export const CASE_FOLDING_SHA256 = 'ff8d8fefbf123574205085d6714c36149eb946d717a0c585c27f0f4ef58c4183';
export const VERSION_ROOT_RELATIVE = 'fixtures/pom-rx/v0.1-compat/1';
const windowsStreamHelper = fileURLToPath(new URL('./get-pom-rx-v01-ntfs-streams.ps1', import.meta.url));
const verifiedRootIdentities = new Map();
const verifiedFileIdentities = new Map();

function fileIdentity(status) {
  return `${status.dev}:${status.ino}:${status.size}:${status.mtimeNs}:${status.nlink}`;
}

export class FixtureContractError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'FixtureContractError';
    this.code = code;
    this.details = details;
  }
}

export function fail(code, message, details = {}) {
  throw new FixtureContractError(code, message, details);
}

export function sha256Bytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function decodeUtf8(bytes, label) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    fail('INVALID_UTF8', `${label} is not valid UTF-8`);
  }
}

function scanObjectKeys(text, label) {
  let index = 0;
  const whitespace = () => {
    while (index < text.length && /[\u0009\u000a\u000d\u0020]/u.test(text[index])) index += 1;
  };
  const parseString = () => {
    const start = index;
    index += 1;
    while (index < text.length) {
      if (text[index] === '"') {
        index += 1;
        try {
          return JSON.parse(text.slice(start, index));
        } catch {
          fail('INVALID_JSON', `${label} contains an invalid JSON string`);
        }
      }
      if (text[index] === '\\') index += 1;
      index += 1;
    }
    fail('INVALID_JSON', `${label} contains an unterminated string`);
  };
  const parseValue = () => {
    whitespace();
    if (text[index] === '{') return parseObject();
    if (text[index] === '[') return parseArray();
    if (text[index] === '"') return parseString();
    const start = index;
    while (index < text.length && !/[\s,\]}]/u.test(text[index])) index += 1;
    if (start === index) fail('INVALID_JSON', `${label} contains an invalid value`);
    return undefined;
  };
  const parseArray = () => {
    index += 1;
    whitespace();
    if (text[index] === ']') {
      index += 1;
      return;
    }
    while (index < text.length) {
      parseValue();
      whitespace();
      if (text[index] === ']') {
        index += 1;
        return;
      }
      if (text[index] !== ',') fail('INVALID_JSON', `${label} contains an invalid array`);
      index += 1;
    }
    fail('INVALID_JSON', `${label} contains an unterminated array`);
  };
  const parseObject = () => {
    index += 1;
    const seen = new Set();
    whitespace();
    if (text[index] === '}') {
      index += 1;
      return;
    }
    while (index < text.length) {
      whitespace();
      if (text[index] !== '"') fail('INVALID_JSON', `${label} contains an invalid object key`);
      const key = parseString();
      if (seen.has(key)) fail('DUPLICATE_JSON_KEY', `${label} contains duplicate key ${key}`, { key });
      seen.add(key);
      whitespace();
      if (text[index] !== ':') fail('INVALID_JSON', `${label} contains an invalid object`);
      index += 1;
      parseValue();
      whitespace();
      if (text[index] === '}') {
        index += 1;
        return;
      }
      if (text[index] !== ',') fail('INVALID_JSON', `${label} contains an invalid object`);
      index += 1;
    }
    fail('INVALID_JSON', `${label} contains an unterminated object`);
  };
  whitespace();
  parseValue();
  whitespace();
  if (index !== text.length) fail('INVALID_JSON', `${label} contains trailing JSON data`);
}

export function parseExactJson(bytes, label, { terminalLf = true } = {}) {
  if (!Buffer.isBuffer(bytes)) bytes = Buffer.from(bytes);
  if (bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) fail('BOM_FORBIDDEN', `${label} contains a BOM`);
  if (bytes.includes(0x0d)) fail('CR_FORBIDDEN', `${label} contains a CR byte`);
  if (terminalLf && (bytes.at(-1) !== 0x0a || bytes.at(-2) === 0x0a)) {
    fail('TERMINAL_LF_INVALID', `${label} must end with exactly one LF`);
  }
  if (!terminalLf && bytes.includes(0x0a)) fail('NEWLINE_FORBIDDEN', `${label} must contain no newline`);
  const text = decodeUtf8(bytes, label);
  scanObjectKeys(text, label);
  try {
    return JSON.parse(text);
  } catch {
    fail('INVALID_JSON', `${label} is not valid JSON`);
  }
}

export function assertExactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('OBJECT_REQUIRED', `${label} must be an object`);
  const keys = Object.keys(value);
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    fail('KEY_SET_OR_ORDER_INVALID', `${label} key set or order differs`, { actual: keys, expected });
  }
}

export function compareUnicodeScalars(left, right) {
  const a = Array.from(left, (value) => value.codePointAt(0));
  const b = Array.from(right, (value) => value.codePointAt(0));
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
}

export function validateFixturePath(value) {
  if (typeof value !== 'string' || value.length === 0) fail('PATH_INVALID', 'fixture path must be a non-empty string', { path: value });
  if (/^[A-Za-z]:/u.test(value) || value.startsWith('/') || value.startsWith('\\\\') || value.startsWith('//')) fail('PATH_ABSOLUTE', 'absolute, drive or UNC path forbidden', { path: value });
  if (value.includes('\\') || value.includes(':') || /[\u0000-\u001f\u007f]/u.test(value) || /\p{Surrogate}/u.test(value)) fail('PATH_INVALID', 'fixture path contains forbidden characters', { path: value });
  const segments = value.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) fail('PATH_SEGMENT_INVALID', 'fixture path contains an invalid segment', { path: value });
  if (segments.some((segment) => /[. ]$/u.test(segment) || /^(?:CON|PRN|AUX|NUL|CLOCK\$|CONIN\$|CONOUT\$|COM(?:[1-9]|[¹²³])|LPT(?:[1-9]|[¹²³]))(?:\..*)?$/iu.test(segment))) fail('WINDOWS_DEVICE_PATH', 'Windows device aliases and trailing dot/space segments are forbidden', { path: value });
  return value;
}

export function loadUnicode17CaseFold(bytes) {
  if (sha256Bytes(bytes) !== CASE_FOLDING_SHA256) fail('UNICODE_DATA_DIGEST_MISMATCH', 'CaseFolding.txt digest differs');
  const text = decodeUtf8(bytes, 'CaseFolding.txt');
  const mapping = new Map();
  const seen = new Set();
  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.replace(/#.*$/u, '').trim();
    if (!line) continue;
    const match = /^([0-9A-F]{4,6}); ([CFST]); ([0-9A-F ]+);$/u.exec(line);
    if (!match) fail('UNICODE_DATA_INVALID', 'malformed CaseFolding.txt row', { row: rawLine });
    const [, sourceHex, status, targetHex] = match;
    const identity = `${sourceHex}:${status}`;
    if (seen.has(identity)) fail('UNICODE_DATA_DUPLICATE', 'duplicate CaseFolding.txt row', { identity });
    seen.add(identity);
    if (status !== 'C' && status !== 'F') continue;
    const source = String.fromCodePoint(Number.parseInt(sourceHex, 16));
    const target = targetHex.split(' ').filter(Boolean).map((hex) => String.fromCodePoint(Number.parseInt(hex, 16))).join('');
    mapping.set(source, target);
  }
  return mapping;
}

export function fullCaseFold(value, mapping) {
  return Array.from(value.normalize('NFC'), (character) => mapping.get(character) ?? character).join('');
}

export function assertNoFoldAliases(paths, mapping) {
  const seen = new Map();
  for (const candidate of paths) {
    validateFixturePath(candidate);
    const folded = fullCaseFold(candidate, mapping);
    const prior = seen.get(folded);
    if (prior && prior !== candidate) fail('PATH_ALIAS_COLLISION', 'fixture paths collide after NFC and Unicode full folding', { prior, candidate });
    seen.set(folded, candidate);
  }
}

export function parseChecksums(bytes) {
  if (bytes.at(-1) !== 0x0a || bytes.includes(0x0d)) fail('CHECKSUM_FORMAT_INVALID', 'checksums file must use LF and one terminal LF');
  const text = decodeUtf8(bytes, 'checksums.sha256');
  const lines = text.slice(0, -1).split('\n');
  if (lines.some((line) => line.length === 0)) fail('CHECKSUM_FORMAT_INVALID', 'checksums file contains a blank line');
  const entries = [];
  const seen = new Set();
  for (const line of lines) {
    const match = /^([0-9a-f]{64})  (.+)$/u.exec(line);
    if (!match) fail('CHECKSUM_FORMAT_INVALID', 'malformed checksum line', { line });
    const [, digest, relativePath] = match;
    validateFixturePath(relativePath);
    if (relativePath === 'checksums.sha256') fail('CHECKSUM_SELF_ENTRY', 'checksums.sha256 must not list itself');
    if (seen.has(relativePath)) fail('CHECKSUM_DUPLICATE_PATH', 'duplicate checksum path', { path: relativePath });
    seen.add(relativePath);
    entries.push({ digest, path: relativePath });
  }
  const sorted = [...entries].sort((left, right) => compareUnicodeScalars(left.path, right.path));
  if (entries.some((entry, index) => entry.path !== sorted[index].path)) fail('CHECKSUM_ORDER_INVALID', 'checksum paths are not Unicode-scalar sorted');
  return entries;
}

export function resolveBelow(root, relativePath) {
  validateFixturePath(relativePath);
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, ...relativePath.split('/'));
  if (!resolved.startsWith(`${resolvedRoot}${path.sep}`)) fail('PATH_ESCAPE', 'fixture path escapes root', { path: relativePath });
  return resolved;
}

function assertRealRoot(root) {
  const rootStatus = lstatSync(root, { bigint: true });
  if (!rootStatus.isDirectory() || rootStatus.isSymbolicLink()) fail('NON_REGULAR_ROOT', 'fixture root must be a real directory, not a link or reparse path');
  const rootIdentity = `${rootStatus.dev}:${rootStatus.ino}:${rootStatus.mtimeNs}`;
  if (process.platform === 'win32' && verifiedRootIdentities.get(path.resolve(root)) === rootIdentity) return;
  let current = path.resolve(root);
  const volumeRoot = path.parse(current).root;
  const ancestors = [];
  while (current !== volumeRoot) {
    if (lstatSync(current).isSymbolicLink()) fail('NON_REGULAR_ROOT', 'fixture root ancestors must not redirect through links or reparse paths');
    ancestors.push({ fullPath: current, relativePath: current === path.resolve(root) ? '.' : '<ancestor>' });
    current = path.dirname(current);
  }
  assertWindowsPathMetadata(ancestors, { checkAds: false, reparseCode: 'NON_REGULAR_ROOT' });
  if (process.platform === 'win32') verifiedRootIdentities.set(path.resolve(root), rootIdentity);
}

function assertWindowsPathMetadata(targets, { checkAds = true, reparseCode = 'NON_REGULAR_FILE' } = {}) {
  if (process.platform !== 'win32') return;
  let records;
  try {
    const encodedTargets = Buffer.from(JSON.stringify(targets.map(({ fullPath }) => fullPath)), 'utf8').toString('base64');
    const raw = execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', windowsStreamHelper, '-TargetsBase64', encodedTargets], { encoding: 'utf8', windowsHide: true }).trim();
    records = raw ? JSON.parse(raw) : [];
  } catch (error) {
    fail('ADS_ENUMERATION_FAILED', 'alternate-data-stream enumeration failed closed', { cause: error.message });
  }
  if (!Array.isArray(records) || records.length !== targets.length) fail('ADS_ENUMERATION_FAILED', 'alternate-data-stream result cardinality differs');
  records.forEach((record, index) => {
    if (record.reparse !== false) fail(reparseCode, 'Windows reparse point forbidden', { path: targets[index].relativePath });
    const names = Array.isArray(record.streams) ? record.streams : [record.streams];
    if (checkAds && names.some((name) => name !== '::$DATA')) fail('ALTERNATE_DATA_STREAM', 'alternate data stream forbidden', { path: targets[index].relativePath, streams: names });
  });
}

export function enumerateRegularFiles(root) {
  assertRealRoot(root);
  const output = [];
  const streamTargets = [{ fullPath: path.resolve(root), relativePath: '.' }];
  const walk = (directory, prefix = '') => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      validateFixturePath(relativePath);
      const fullPath = path.join(directory, entry.name);
      const status = lstatSync(fullPath, { bigint: true });
      if (status.isSymbolicLink()) fail('NON_REGULAR_FILE', 'symbolic link forbidden', { path: relativePath });
      if (status.isDirectory()) {
        streamTargets.push({ fullPath, relativePath });
        walk(fullPath, relativePath);
        continue;
      }
      if (!status.isFile() || status.nlink !== 1n || (status.mode & 0o170000n) !== 0o100000n) fail('NON_REGULAR_FILE', 'only single-link regular files allowed', { path: relativePath });
      const followed = statSync(fullPath, { bigint: true });
      if (followed.dev !== status.dev || followed.ino !== status.ino) fail('NON_REGULAR_FILE', 'file identity changed during inspection', { path: relativePath });
      output.push(relativePath);
    }
  };
  walk(root);
  const sorted = output.sort(compareUnicodeScalars);
  for (const relativePath of sorted) streamTargets.push({ fullPath: resolveBelow(root, relativePath), relativePath });
  assertWindowsPathMetadata(streamTargets);
  if (process.platform === 'win32') {
    for (const { fullPath } of streamTargets.slice(1).filter(({ fullPath }) => lstatSync(fullPath, { bigint: true }).isFile())) {
      verifiedFileIdentities.set(fullPath, fileIdentity(lstatSync(fullPath, { bigint: true })));
    }
  }
  return sorted;
}

export function readRegularFile(root, relativePath) {
  assertRealRoot(root);
  const fullPath = resolveBelow(root, relativePath);
  const status = lstatSync(fullPath, { bigint: true });
  if (!status.isFile() || status.isSymbolicLink() || status.nlink !== 1n) fail('NON_REGULAR_FILE', 'only single-link regular files allowed', { path: relativePath });
  if (process.platform !== 'win32' || verifiedFileIdentities.get(fullPath) !== fileIdentity(status)) {
    assertWindowsPathMetadata([{ fullPath, relativePath }]);
  }
  const bytes = readFileSync(fullPath);
  const after = lstatSync(fullPath, { bigint: true });
  if (after.dev !== status.dev || after.ino !== status.ino || after.size !== status.size || after.mtimeNs !== status.mtimeNs) fail('FILE_CHANGED_DURING_READ', 'file identity or bytes changed during read', { path: relativePath });
  return bytes;
}
