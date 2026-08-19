import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { TextDecoder } from 'node:util';

import { throwPomRxV01Strict } from './pom-rx-v01-diagnostics.mjs';
import {
  POM_RX_V01_POLICY_LIMITS,
  parsePomRxV01ExactJson,
  sha256PomRxV01Bytes,
} from './pom-rx-v01-policy-capability.mjs';

const CASE_FOLDING_SHA256 = 'ff8d8fefbf123574205085d6714c36149eb946d717a0c585c27f0f4ef58c4183';
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const MAX_ARTIFACT_ENTRY_BYTES = 16 * 1024 * 1024;
const MAX_ARTIFACT_CLOSURE_BYTES = 64 * 1024 * 1024;

function invalid(message, details = {}) {
  throwPomRxV01Strict('POMRX_V01_E_ARTIFACT_MANIFEST_INVALID', message, details);
}

function mismatch(message, details = {}) {
  throwPomRxV01Strict('POMRX_V01_E_IMPLEMENTATION_ARTIFACT_MISMATCH', message, details);
}

function assertExactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) invalid(`${label} has missing or unknown fields`);
}

function compareUnicodeScalars(left, right) {
  const a = Array.from(left, (character) => character.codePointAt(0));
  const b = Array.from(right, (character) => character.codePointAt(0));
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
}

function validateArtifactPath(value) {
  if (typeof value !== 'string' || value.length === 0
    || value.startsWith('/') || value.startsWith('//') || /^[A-Za-z]:/u.test(value)
    || value.includes('\\') || value.includes(':') || /[\u0000-\u001f\u007f]/u.test(value)) {
    invalid('Artifact entry path is invalid', { path: value });
  }
  const segments = value.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    invalid('Artifact entry path contains an invalid segment', { path: value });
  }
  if (segments.some((segment) => /[. ]$/u.test(segment)
    || /^(?:CON|PRN|AUX|NUL|CLOCK\$|CONIN\$|CONOUT\$|COM(?:[1-9]|[¹²³])|LPT(?:[1-9]|[¹²³]))(?:\..*)?$/iu.test(segment))) {
    invalid('Artifact entry path is unsafe on Windows', { path: value });
  }
  if (value !== value.normalize('NFC')) invalid('Artifact entry path must already be NFC-normalized', { path: value });
  return value;
}

function resolveBelow(root, relativePath) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, ...relativePath.split('/'));
  if (!resolved.startsWith(`${resolvedRoot}${path.sep}`)) invalid('Artifact entry escapes package root', { path: relativePath });
  return resolved;
}

function normalizedNativePath(value) {
  const resolved = path.resolve(value);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function assertCanonicalNativePath(value, label, details = {}) {
  let native;
  try {
    native = realpathSync.native(value);
  } catch {
    mismatch(`${label} cannot be resolved`, details);
  }
  if (normalizedNativePath(native) !== normalizedNativePath(value)) {
    mismatch(`${label} resolves through an alias or reparse path`, details);
  }
}

function uint64(value) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(value));
  return buffer;
}

export function computePomRxArtifactDigest(entries) {
  if (!Array.isArray(entries) || entries.length === 0) invalid('Artifact closure must contain at least one entry');
  const normalized = entries.map((entry) => {
    if (!entry || Object.keys(entry).sort().join(',') !== 'bytes,path') invalid('Artifact digest entry is invalid');
    const entryPath = validateArtifactPath(entry.path);
    const byteLength = ArrayBuffer.isView(entry.bytes) ? entry.bytes.byteLength : entry.bytes?.byteLength;
    if (!Number.isSafeInteger(byteLength) || byteLength < 0) invalid('Artifact digest bytes are invalid');
    return { path: entryPath, bytes: Buffer.from(entry.bytes) };
  }).sort((left, right) => compareUnicodeScalars(left.path, right.path));
  if (new Set(normalized.map(({ path: entryPath }) => entryPath)).size !== normalized.length) invalid('Artifact digest paths repeat');

  const hash = createHash('sha256');
  hash.update('pom-rx-verifier-artifact/1\n', 'ascii');
  for (const entry of normalized) {
    const pathBytes = Buffer.from(entry.path, 'utf8');
    hash.update(uint64(pathBytes.length));
    hash.update(pathBytes);
    hash.update(uint64(entry.bytes.length));
    hash.update(entry.bytes);
  }
  return hash.digest('hex');
}

function loadCaseFolding(caseFoldingPath) {
  let bytes;
  try {
    bytes = readFileSync(caseFoldingPath);
  } catch {
    invalid('Unicode 17 case-folding registry cannot be read');
  }
  if (sha256PomRxV01Bytes(bytes) !== CASE_FOLDING_SHA256) invalid('Unicode 17 case-folding registry digest differs');
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    invalid('Unicode 17 case-folding registry is not UTF-8');
  }
  const mapping = new Map();
  const seen = new Set();
  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.replace(/#.*$/u, '').trim();
    if (!line) continue;
    const match = /^([0-9A-F]{4,6}); ([CFST]); ([0-9A-F ]+);$/u.exec(line);
    if (!match) invalid('Unicode 17 case-folding registry row is malformed');
    const [, sourceHex, status, targetHex] = match;
    const identity = `${sourceHex}:${status}`;
    if (seen.has(identity)) invalid('Unicode 17 case-folding registry row repeats');
    seen.add(identity);
    if (!['C', 'F'].includes(status)) continue;
    mapping.set(
      String.fromCodePoint(Number.parseInt(sourceHex, 16)),
      targetHex.split(' ').filter(Boolean).map((hex) => String.fromCodePoint(Number.parseInt(hex, 16))).join(''),
    );
  }
  return mapping;
}

function fullCaseFold(value, mapping) {
  return Array.from(value.normalize('NFC'), (character) => mapping.get(character) ?? character).join('');
}

function validateManifest(manifest, caseFoldingPath) {
  assertExactKeys(manifest, [
    'artifact_manifest_schema_version',
    'artifact_id',
    'verifier_version',
    'verification_root',
    'entries',
    'implementation_artifact_sha256',
  ], 'artifact manifest');
  if (manifest.artifact_manifest_schema_version !== 'pom-rx-verifier-artifact-manifest/1'
    || manifest.verification_root !== 'package-root'
    || typeof manifest.artifact_id !== 'string' || manifest.artifact_id.length === 0
    || typeof manifest.verifier_version !== 'string' || manifest.verifier_version.length === 0
    || !HASH_PATTERN.test(manifest.implementation_artifact_sha256)
    || !Array.isArray(manifest.entries) || manifest.entries.length === 0) {
    invalid('Artifact manifest identity fields are invalid');
  }
  const entries = manifest.entries.map((entry) => {
    assertExactKeys(entry, ['path', 'byte_length', 'sha256'], 'artifact manifest entry');
    const entryPath = validateArtifactPath(entry.path);
    if (!Number.isSafeInteger(entry.byte_length) || entry.byte_length < 0 || !HASH_PATTERN.test(entry.sha256)) {
      invalid('Artifact manifest entry metadata is invalid', { path: entry.path });
    }
    return Object.freeze({ path: entryPath, byte_length: entry.byte_length, sha256: entry.sha256 });
  });
  const sorted = [...entries].sort((left, right) => compareUnicodeScalars(left.path, right.path));
  if (entries.some((entry, index) => entry.path !== sorted[index].path)) invalid('Artifact manifest entries are not Unicode-scalar sorted');
  const caseFold = loadCaseFolding(caseFoldingPath);
  const aliases = new Map();
  for (const entry of entries) {
    const folded = fullCaseFold(entry.path, caseFold);
    if (aliases.has(folded)) invalid('Artifact manifest paths collide after Unicode full case folding');
    aliases.set(folded, entry.path);
  }
  return Object.freeze({ ...manifest, entries: Object.freeze(entries) });
}

function inspectMetadata(fullPath, relativePath, inspectPathMetadata) {
  if (process.platform !== 'win32' && typeof inspectPathMetadata !== 'function') return;
  if (typeof inspectPathMetadata !== 'function') mismatch('Windows artifact metadata inspection is unavailable');
  let metadata;
  try {
    metadata = inspectPathMetadata(fullPath, relativePath);
  } catch {
    mismatch('Artifact path metadata inspection failed', { path: relativePath });
  }
  if (!metadata || metadata.reparse !== false || !Array.isArray(metadata.streams)
    || metadata.streams.some((stream) => stream !== '::$DATA')) {
    mismatch('Artifact path is a reparse point or has an alternate data stream', { path: relativePath });
  }
}

const REGEX_PREFIX_IDENTIFIERS = new Set([
  'await', 'case', 'delete', 'do', 'else', 'in', 'instanceof', 'new',
  'of', 'return', 'throw', 'typeof', 'void', 'yield',
]);
const ALLOWED_NODE_BUILTINS = new Set(['node:crypto', 'node:fs', 'node:path', 'node:util']);
const FORBIDDEN_CODE_LOADING_IDENTIFIERS = new Set([
  'Function', '_compile', '_load', 'createRequire', 'dlopen',
  'eval', 'getBuiltinModule', 'register', 'registerHooks', 'require',
]);
const FORBIDDEN_GLOBAL_IDENTIFIERS = new Set(['Reflect', 'global', 'globalThis']);

function canStartRegex(tokens) {
  const previous = tokens.at(-1);
  if (!previous) return true;
  if (previous.type === 'identifier') return REGEX_PREFIX_IDENTIFIERS.has(previous.value);
  if (['number', 'regex', 'string'].includes(previous.type)) return false;
  return ![')', ']', '}', '++', '--'].includes(previous.value);
}

function tokenizeModuleSource(source, relativePath) {
  const tokens = [];
  const malformed = (message) => invalid(message, { path: relativePath });

  function scanQuoted(index, quote) {
    let cursor = index + 1;
    let escaped = false;
    let value = '';
    while (cursor < source.length) {
      const character = source[cursor];
      if (character === quote) return { cursor: cursor + 1, escaped, value };
      if (character === '\\') {
        escaped = true;
        cursor += 2;
        continue;
      }
      if (character === '\r' || character === '\n' || character === '\u2028' || character === '\u2029') {
        malformed('Executable artifact contains an unterminated string literal');
      }
      value += character;
      cursor += 1;
    }
    malformed('Executable artifact contains an unterminated string literal');
  }

  function scanRegularExpression(index) {
    let cursor = index + 1;
    let inClass = false;
    while (cursor < source.length) {
      const character = source[cursor];
      if (character === '\\') {
        cursor += 2;
        continue;
      }
      if (character === '[') inClass = true;
      else if (character === ']') inClass = false;
      else if (character === '/' && !inClass) {
        cursor += 1;
        while (cursor < source.length && /[A-Za-z]/u.test(source[cursor])) cursor += 1;
        return cursor;
      } else if (character === '\r' || character === '\n' || character === '\u2028' || character === '\u2029') {
        malformed('Executable artifact contains an unterminated regular expression');
      }
      cursor += 1;
    }
    malformed('Executable artifact contains an unterminated regular expression');
  }

  function scanTemplate(index) {
    let cursor = index + 1;
    while (cursor < source.length) {
      const character = source[cursor];
      if (character === '\\') {
        cursor += 2;
        continue;
      }
      if (character === '`') return cursor + 1;
      if (character === '$' && source[cursor + 1] === '{') {
        tokens.push({ type: 'punctuator', value: '${' });
        cursor = scanCode(cursor + 2, true);
        continue;
      }
      cursor += 1;
    }
    malformed('Executable artifact contains an unterminated template literal');
  }

  function scanCode(start, stopAtTemplateBrace = false) {
    let cursor = start;
    let braceDepth = 0;
    while (cursor < source.length) {
      const character = source[cursor];
      if (/\s/u.test(character)) {
        cursor += 1;
        continue;
      }
      if (character === '/' && source[cursor + 1] === '/') {
        cursor += 2;
        while (cursor < source.length && !['\r', '\n', '\u2028', '\u2029'].includes(source[cursor])) cursor += 1;
        continue;
      }
      if (character === '/' && source[cursor + 1] === '*') {
        const end = source.indexOf('*/', cursor + 2);
        if (end === -1) malformed('Executable artifact contains an unterminated block comment');
        cursor = end + 2;
        continue;
      }
      if (character === "'" || character === '"') {
        const quoted = scanQuoted(cursor, character);
        tokens.push({ type: 'string', value: quoted.value, escaped: quoted.escaped });
        cursor = quoted.cursor;
        continue;
      }
      if (character === '`') {
        cursor = scanTemplate(cursor);
        continue;
      }
      if (character === '\\') {
        malformed('Unicode-escaped identifiers are forbidden in strict verifier source');
      }
      if (/[A-Za-z_$]/u.test(character)) {
        let end = cursor + 1;
        while (end < source.length && /[A-Za-z0-9_$]/u.test(source[end])) end += 1;
        tokens.push({ type: 'identifier', value: source.slice(cursor, end) });
        cursor = end;
        continue;
      }
      if (/[0-9]/u.test(character)) {
        let end = cursor + 1;
        while (end < source.length && /[A-Za-z0-9_.]/u.test(source[end])) end += 1;
        tokens.push({ type: 'number', value: source.slice(cursor, end) });
        cursor = end;
        continue;
      }
      if (character === '/' && canStartRegex(tokens)) {
        cursor = scanRegularExpression(cursor);
        tokens.push({ type: 'regex', value: '/' });
        continue;
      }
      if (character === '{') {
        braceDepth += 1;
        tokens.push({ type: 'punctuator', value: character });
        cursor += 1;
        continue;
      }
      if (character === '}') {
        if (stopAtTemplateBrace && braceDepth === 0) return cursor + 1;
        braceDepth -= 1;
        if (braceDepth < 0) malformed('Executable artifact contains an unmatched closing brace');
        tokens.push({ type: 'punctuator', value: character });
        cursor += 1;
        continue;
      }
      const pair = source.slice(cursor, cursor + 2);
      if (['++', '--', '?.'].includes(pair)) {
        tokens.push({ type: 'punctuator', value: pair });
        cursor += 2;
        continue;
      }
      tokens.push({ type: 'punctuator', value: character });
      cursor += 1;
    }
    if (stopAtTemplateBrace) malformed('Executable artifact contains an unterminated template expression');
    return cursor;
  }

  scanCode(0);
  return tokens;
}

function staticLocalDependencies(relativePath, bytes) {
  if (!relativePath.endsWith('.mjs') && !relativePath.endsWith('.js')) return [];
  let source;
  try {
    source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    invalid('Executable artifact source is not UTF-8', { path: relativePath });
  }
  const tokens = tokenizeModuleSource(source, relativePath);
  const dependencies = new Set();
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const previous = tokens[index - 1];
    const computedMember = token.value === '[' && previous
      && (['identifier', 'number', 'regex', 'string'].includes(previous.type)
        || [')', ']', '}'].includes(previous.value));
    if (token.value === '[') {
      let depth = 1;
      let cursor = index + 1;
      let containsString = false;
      for (; cursor < tokens.length && depth > 0; cursor += 1) {
        if (tokens[cursor].value === '[') depth += 1;
        else if (tokens[cursor].value === ']') depth -= 1;
        else if (tokens[cursor].type === 'string') containsString = true;
      }
      if (depth !== 0) invalid('Computed member access is unterminated in strict verifier source', { path: relativePath });
      const computedProperty = tokens[cursor]?.value === ':';
      if (containsString && (computedMember || computedProperty)) {
        invalid('String-computed member access is forbidden in strict verifier source', { path: relativePath });
      }
    }
    const constructorReference = token.type === 'identifier' && token.value === 'constructor'
      && !(tokens[index - 1]?.value === '{' && tokens[index + 1]?.value === '(');
    const computedForbiddenName = token.type === 'string' && tokens[index - 1]?.value === '['
      && (token.escaped || FORBIDDEN_CODE_LOADING_IDENTIFIERS.has(token.value) || token.value === 'constructor');
    if ((token.type === 'identifier' && (FORBIDDEN_CODE_LOADING_IDENTIFIERS.has(token.value)
      || FORBIDDEN_GLOBAL_IDENTIFIERS.has(token.value))) || constructorReference || computedForbiddenName) {
      invalid('Dynamic code-loading surfaces are forbidden in the strict verifier artifact closure', {
        path: relativePath,
        identifier: token.value,
      });
    }
    if (token.type !== 'identifier' || !['import', 'export'].includes(token.value)) continue;
    if (tokens[index - 1]?.value === '.' || tokens[index - 1]?.value === '?.') continue;
    const next = tokens[index + 1];
    if (token.value === 'import' && next?.value === '.') continue;
    if (token.value === 'import' && next?.value === '(') {
      invalid('Dynamic imports are forbidden in the strict verifier artifact closure', { path: relativePath });
    }
    let specifier = token.value === 'import' && next?.type === 'string' ? next : null;
    for (let cursor = index + 1; !specifier && cursor < tokens.length && tokens[cursor].value !== ';'; cursor += 1) {
      if (tokens[cursor].type === 'identifier' && tokens[cursor].value === 'from'
        && tokens[cursor + 1]?.type === 'string') {
        specifier = tokens[cursor + 1];
      }
    }
    if (!specifier) continue;
    if (specifier.escaped) invalid('Escaped module specifiers are forbidden in the strict verifier artifact closure', { path: relativePath });
    if (!specifier.value.startsWith('.')) {
      if (!ALLOWED_NODE_BUILTINS.has(specifier.value)) {
        invalid('Only pinned relative modules and the minimal Node builtin allow-set may be imported', {
          path: relativePath,
          specifier: specifier.value,
        });
      }
      continue;
    }
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(relativePath), specifier.value));
    dependencies.add(validateArtifactPath(resolved));
  }
  return [...dependencies];
}

function verifyPomRxArtifactIdentityInternal({
  packageRoot,
  artifactManifestPath,
  expectedArtifactManifestSha256,
  caseFoldingPath,
  inspectPathMetadata,
}) {
  if (typeof packageRoot !== 'string' || !path.isAbsolute(packageRoot)
    || typeof artifactManifestPath !== 'string' || !path.isAbsolute(artifactManifestPath)
    || typeof caseFoldingPath !== 'string' || !path.isAbsolute(caseFoldingPath)
    || !HASH_PATTERN.test(expectedArtifactManifestSha256)) {
    invalid('Artifact host bootstrap is invalid');
  }
  let rootStatus;
  try {
    rootStatus = lstatSync(packageRoot, { bigint: true });
  } catch {
    mismatch('Package root cannot be inspected');
  }
  if (!rootStatus.isDirectory() || rootStatus.isSymbolicLink()) mismatch('Package root is not a regular directory');
  assertCanonicalNativePath(packageRoot, 'Package root');
  inspectMetadata(packageRoot, '.', inspectPathMetadata);

  let manifestBytes;
  try {
    const manifestStatus = lstatSync(artifactManifestPath, { bigint: true });
    if (!manifestStatus.isFile() || manifestStatus.isSymbolicLink() || manifestStatus.nlink !== 1n) {
      invalid('Artifact manifest is not a single-link regular file');
    }
    inspectMetadata(artifactManifestPath, '<artifact-manifest>', inspectPathMetadata);
    manifestBytes = readFileSync(artifactManifestPath);
  } catch {
    invalid('Artifact manifest cannot be read');
  }
  if (sha256PomRxV01Bytes(manifestBytes) !== expectedArtifactManifestSha256) invalid('Artifact manifest digest differs from its host pin');
  const parsed = parsePomRxV01ExactJson(manifestBytes, 'artifact manifest', {
    errorCode: 'POMRX_V01_E_ARTIFACT_MANIFEST_INVALID',
    maxBytes: POM_RX_V01_POLICY_LIMITS.max_artifact_manifest_bytes,
  });
  const manifest = validateManifest(parsed, caseFoldingPath);
  const entryPaths = new Set(manifest.entries.map(({ path: entryPath }) => entryPath));
  const observedEntries = [];
  let observedClosureBytes = 0;
  for (const entry of manifest.entries) {
    const fullPath = resolveBelow(packageRoot, entry.path);
    let before;
    try {
      before = lstatSync(fullPath, { bigint: true });
    } catch {
      mismatch('Declared artifact entry is missing', { path: entry.path });
    }
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n) mismatch('Declared artifact entry is not a single-link regular file', { path: entry.path });
    assertCanonicalNativePath(fullPath, 'Declared artifact entry', { path: entry.path });
    if (before.size > BigInt(MAX_ARTIFACT_ENTRY_BYTES)
      || before.size !== BigInt(entry.byte_length)
      || observedClosureBytes + entry.byte_length > MAX_ARTIFACT_CLOSURE_BYTES) {
      mismatch('Declared artifact entry size is outside the bounded closure', { path: entry.path });
    }
    observedClosureBytes += entry.byte_length;
    inspectMetadata(fullPath, entry.path, inspectPathMetadata);
    let bytes;
    try {
      bytes = readFileSync(fullPath);
    } catch {
      mismatch('Declared artifact entry cannot be read', { path: entry.path });
    }
    const after = lstatSync(fullPath, { bigint: true });
    if (after.dev !== before.dev || after.ino !== before.ino || after.size !== before.size || after.mtimeNs !== before.mtimeNs) {
      mismatch('Declared artifact entry changed during measurement', { path: entry.path });
    }
    if (bytes.length !== entry.byte_length || sha256PomRxV01Bytes(bytes) !== entry.sha256) {
      mismatch('Declared artifact entry bytes differ', { path: entry.path });
    }
    for (const dependency of staticLocalDependencies(entry.path, bytes)) {
      if (!entryPaths.has(dependency)) invalid('Static local dependency is missing from the artifact closure', { path: entry.path, dependency });
    }
    observedEntries.push({ path: entry.path, bytes });
  }
  const observed = computePomRxArtifactDigest(observedEntries);
  if (observed !== manifest.implementation_artifact_sha256) mismatch('Observed artifact digest differs from the manifest');
  return Object.freeze({
    artifact_id: manifest.artifact_id,
    verifier_version: manifest.verifier_version,
    expected_implementation_artifact_sha256: manifest.implementation_artifact_sha256,
    observed_implementation_artifact_sha256: observed,
    implementation_artifact_sha256: observed,
  });
}

export function verifyPomRxArtifactIdentity(options) {
  if (!options || Object.hasOwn(options, 'inspectPathMetadata')) {
    invalid('Production artifact verification does not accept an injected metadata inspector');
  }
  throwPomRxV01Strict(
    'POMRX_V01_E_PROFILE_INCOMPLETE',
    'Production artifact identity verification remains disabled until strict profile activation',
  );
}

export function verifyPomRxArtifactIdentityTestOnly(options) {
  if (!options || typeof options.inspectPathMetadata !== 'function') {
    invalid('Test-only artifact verification requires an explicit metadata inspector');
  }
  return verifyPomRxArtifactIdentityInternal(options);
}
