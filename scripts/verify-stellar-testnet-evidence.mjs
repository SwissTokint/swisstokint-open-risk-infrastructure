import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const HASH = /^[a-f0-9]{64}$/;
const BATCH_REF = /^pom-[a-f0-9]{24}$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STRKEY_VERSION = Object.freeze({ account: 6 << 3, contract: 2 << 3 });

function assert(condition, message) {
  if (!condition) throw new TypeError(message);
}

function assertExactKeys(value, keys, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assert(
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()),
    `${label} has missing or unknown fields`,
  );
}

function assertHash(value, label) {
  assert(typeof value === 'string' && HASH.test(value), `${label} must be a lowercase SHA-256 hash`);
}

function assertTransaction(value, label) {
  assert(typeof value === 'string' && HASH.test(value), `${label} must be a lowercase transaction hash`);
}

function decodeBase32(value) {
  const bytes = [];
  let buffer = 0;
  let bits = 0;

  for (const character of value) {
    const digit = BASE32_ALPHABET.indexOf(character);
    if (digit === -1) return null;
    buffer = (buffer << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
      buffer &= (1 << bits) - 1;
    }
  }

  return bits === 0 ? Uint8Array.from(bytes) : null;
}

function crc16Xmodem(bytes) {
  let crc = 0;
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

function isStrKey(value, prefix, version) {
  if (typeof value !== 'string' || value.length !== 56 || !value.startsWith(prefix)) return false;
  const decoded = decodeBase32(value);
  if (!decoded || decoded.length !== 35 || decoded[0] !== version) return false;
  const checksum = crc16Xmodem(decoded.subarray(0, 33));
  return decoded[33] === (checksum & 0xff) && decoded[34] === (checksum >> 8);
}

function isIsoCalendarDate(value) {
  if (typeof value !== 'string') return false;
  const match = DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthLengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= monthLengths[month - 1];
}

function assertNoDuplicateJsonKeys(text) {
  let index = 0;

  function fail(message) {
    throw new TypeError(`${message} at character offset ${index}`);
  }

  function skipWhitespace() {
    while (index < text.length && /\s/.test(text[index])) index += 1;
  }

  function parseString() {
    if (text[index] !== '"') fail('Expected JSON string');
    const start = index;
    index += 1;
    let escaped = false;
    while (index < text.length) {
      const character = text[index];
      index += 1;
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        try {
          return JSON.parse(text.slice(start, index));
        } catch (error) {
          fail(error instanceof Error ? error.message : String(error));
        }
      }
    }
    fail('Unterminated JSON string');
  }

  function parseValue() {
    skipWhitespace();
    if (text[index] === '{') return parseObject();
    if (text[index] === '[') return parseArray();
    if (text[index] === '"') {
      parseString();
      return;
    }
    for (const literal of ['true', 'false', 'null']) {
      if (text.startsWith(literal, index)) {
        index += literal.length;
        return;
      }
    }
    const number = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
    number.lastIndex = index;
    const match = number.exec(text);
    if (!match) fail('Invalid JSON value');
    index = number.lastIndex;
  }

  function parseObject() {
    index += 1;
    skipWhitespace();
    const keys = new Set();
    if (text[index] === '}') {
      index += 1;
      return;
    }
    while (index < text.length) {
      skipWhitespace();
      const key = parseString();
      if (keys.has(key)) throw new TypeError('duplicate JSON object key');
      keys.add(key);
      skipWhitespace();
      if (text[index] !== ':') fail('Expected colon after JSON object key');
      index += 1;
      parseValue();
      skipWhitespace();
      if (text[index] === '}') {
        index += 1;
        return;
      }
      if (text[index] !== ',') fail('Expected comma in JSON object');
      index += 1;
    }
    fail('Unterminated JSON object');
  }

  function parseArray() {
    index += 1;
    skipWhitespace();
    if (text[index] === ']') {
      index += 1;
      return;
    }
    while (index < text.length) {
      parseValue();
      skipWhitespace();
      if (text[index] === ']') {
        index += 1;
        return;
      }
      if (text[index] !== ',') fail('Expected comma in JSON array');
      index += 1;
    }
    fail('Unterminated JSON array');
  }

  skipWhitespace();
  parseValue();
  skipWhitespace();
  if (index !== text.length) fail('Unexpected trailing JSON content');
}

export function parseStellarTestnetEvidenceJson(text) {
  assert(typeof text === 'string', 'Evidence manifest JSON must be text');
  assertNoDuplicateJsonKeys(text);
  return JSON.parse(text);
}

function assertFixture(fixture, label, { active }) {
  const keys = active
    ? ['source_batch_ref', 'batch_id', 'merkle_root', 'manifest_hash', 'evidence_hash', 'registration_transaction', 'verification_result']
    : ['batch_id', 'merkle_root', 'manifest_hash', 'evidence_hash', 'reason_hash', 'registration_transaction', 'revocation_transaction', 'verification_result_after_revocation'];
  assertExactKeys(fixture, keys, label);

  if (active) {
    assert(typeof fixture.source_batch_ref === 'string' && BATCH_REF.test(fixture.source_batch_ref), `${label}.source_batch_ref must be a canonical batch reference`);
  } else {
    assertHash(fixture.reason_hash, `${label}.reason_hash`);
  }

  for (const field of ['batch_id', 'merkle_root', 'manifest_hash', 'evidence_hash']) {
    assertHash(fixture[field], `${label}.${field}`);
  }
  assertTransaction(fixture.registration_transaction, `${label}.registration_transaction`);

  if (active) {
    assert(fixture.verification_result === true, `${label} must record an active verification result`);
  } else {
    assertTransaction(fixture.revocation_transaction, `${label}.revocation_transaction`);
    assert(fixture.verification_result_after_revocation === false, `${label} must record a rejected revoked verification result`);
    assert(fixture.registration_transaction !== fixture.revocation_transaction, `${label} cannot reuse the registration transaction as the revocation transaction`);
  }
}

export function verifyStellarTestnetEvidence(manifest) {
  assertExactKeys(
    manifest,
    ['schema_version', 'network', 'deployed_at', 'contract_id', 'deployer', 'wasm', 'active_fixture', 'revocation_fixture', 'claims'],
    'Stellar testnet evidence manifest',
  );
  assert(manifest.schema_version === 'swisstokint-stellar-deployment/0.1', 'Unsupported Stellar deployment manifest version');
  assert(manifest.network === 'stellar:testnet', 'Evidence manifest must identify Stellar Testnet exactly');
  assert(isIsoCalendarDate(manifest.deployed_at), 'deployed_at must be an ISO calendar date');
  assert(isStrKey(manifest.contract_id, 'C', STRKEY_VERSION.contract), 'contract_id must be a Stellar contract identifier');
  assert(isStrKey(manifest.deployer, 'G', STRKEY_VERSION.account), 'deployer must be a Stellar public key');

  assertExactKeys(manifest.wasm, ['sha256', 'optimized_size_bytes', 'upload_transaction', 'deployment_transaction', 'initialization_transaction'], 'wasm');
  assertHash(manifest.wasm.sha256, 'wasm.sha256');
  assert(Number.isSafeInteger(manifest.wasm.optimized_size_bytes) && manifest.wasm.optimized_size_bytes > 0, 'wasm.optimized_size_bytes must be a positive safe integer');
  for (const field of ['upload_transaction', 'deployment_transaction', 'initialization_transaction']) {
    assertTransaction(manifest.wasm[field], `wasm.${field}`);
  }
  assert(new Set([manifest.wasm.upload_transaction, manifest.wasm.deployment_transaction, manifest.wasm.initialization_transaction]).size === 3, 'WASM lifecycle transactions must be distinct');

  assertFixture(manifest.active_fixture, 'active_fixture', { active: true });
  assertFixture(manifest.revocation_fixture, 'revocation_fixture', { active: false });
  assert(manifest.active_fixture.batch_id !== manifest.revocation_fixture.batch_id, 'Active and revoked fixtures must use different batch identifiers');

  const allTransactions = [
    manifest.wasm.upload_transaction,
    manifest.wasm.deployment_transaction,
    manifest.wasm.initialization_transaction,
    manifest.active_fixture.registration_transaction,
    manifest.revocation_fixture.registration_transaction,
    manifest.revocation_fixture.revocation_transaction,
  ];
  assert(new Set(allTransactions).size === allTransactions.length, 'Evidence manifest transaction references must not be reused across lifecycle steps');

  assertExactKeys(manifest.claims, ['audited', 'production_ready', 'mainnet_deployed', 'grant_awarded'], 'claims');
  for (const [key, value] of Object.entries(manifest.claims)) {
    assert(value === false, `claims.${key} must remain false in the local evidence manifest`);
  }

  return {
    ok: true,
    network: manifest.network,
    contract_id: manifest.contract_id,
    wasm_sha256: manifest.wasm.sha256,
    active_batch_id: manifest.active_fixture.batch_id,
    revoked_batch_id: manifest.revocation_fixture.batch_id,
    claims: { ...manifest.claims },
  };
}

function readManifest(path) {
  try {
    return parseStellarTestnetEvidenceJson(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new TypeError(`Unable to read JSON evidence manifest: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const inputPath = resolve(process.argv[2] ?? 'deployments/stellar-testnet-v0.1.json');
    const result = verifyStellarTestnetEvidence(readManifest(inputPath));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
