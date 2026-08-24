import {
  ProofPayloadValidationError,
  canonicalizePayload,
  sha256Hex,
} from '../../../sdk/typescript/swisstokint-proof.mjs';

export const WALLET_GUARD_JSON_INGRESS_SCHEMA_VERSION = 'wallet_guard_json_ingress/0.1';

const TRUSTED_REFLECT_APPLY = Reflect.apply;
const TRUSTED_JSON_PARSE = JSON.parse;

const MAX_RAW_BYTES = 64 * 1024;
const MAX_DEPTH = 8;
const MAX_NODES = 1_000;
const MAX_STRING_LENGTH = 2_048;
const MAX_KEY_LENGTH = 64;
const METHOD_PATTERN = /^[A-Za-z0-9_]{1,64}$/u;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const EIP1193_KEYS = Object.freeze(['method', 'params']);
const JSONRPC_KEYS = Object.freeze(['jsonrpc', 'id', 'method', 'params']);

export class WalletGuardJsonIngressError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WalletGuardJsonIngressError';
    this.code = code;
  }
}

export function parseWalletGuardBoundedJsonData(raw) {
  if (typeof raw !== 'string') {
    fail('POMRX_WG_JSON_E_INPUT', 'Wallet Guard JSON ingress requires a string');
  }
  const rawBytes = Buffer.byteLength(raw, 'utf8');
  if (rawBytes < 2 || rawBytes > MAX_RAW_BYTES) {
    fail('POMRX_WG_JSON_E_BOUNDS', 'Wallet Guard JSON ingress exceeds the byte bounds');
  }
  if (raw.charCodeAt(0) === 0xfeff) {
    fail('POMRX_WG_JSON_E_SYNTAX', 'Wallet Guard JSON ingress does not accept a leading BOM');
  }

  new StrictJsonScanner(raw).scan();

  let parsed;
  try {
    parsed = trustedJsonParse(raw);
  } catch {
    fail('POMRX_WG_JSON_E_SYNTAX', 'Wallet Guard JSON ingress is not valid JSON');
  }
  return cloneParsed(parsed);
}

function fail(code, message) {
  throw new WalletGuardJsonIngressError(code, message);
}

function trustedJsonParse(raw) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_JSON_PARSE, null, [raw]);
}

function isWhitespace(character) {
  return character === ' ' || character === '\n' || character === '\r' || character === '\t';
}

function assertUnicodeScalarString(value, label) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      if (index + 1 >= value.length) {
        fail('POMRX_WG_JSON_E_UNICODE', `${label} contains an unpaired high surrogate`);
      }
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) {
        fail('POMRX_WG_JSON_E_UNICODE', `${label} contains an unpaired high surrogate`);
      }
      index += 1;
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) {
      fail('POMRX_WG_JSON_E_UNICODE', `${label} contains an unpaired low surrogate`);
    }
  }
  return value;
}

class StrictJsonScanner {
  constructor(raw) {
    this.raw = raw;
    this.index = 0;
    this.nodes = 0;
  }

  skipWhitespace() {
    while (this.index < this.raw.length && isWhitespace(this.raw[this.index])) {
      this.index += 1;
    }
  }

  countNode() {
    this.nodes += 1;
    if (this.nodes > MAX_NODES) {
      fail('POMRX_WG_JSON_E_BOUNDS', 'JSON exceeds the maximum node count');
    }
  }

  scan() {
    this.skipWhitespace();
    this.scanValue(0);
    this.skipWhitespace();
    if (this.index !== this.raw.length) {
      fail('POMRX_WG_JSON_E_SYNTAX', 'JSON contains trailing data');
    }
  }

  scanValue(depth) {
    if (depth > MAX_DEPTH) {
      fail('POMRX_WG_JSON_E_BOUNDS', 'JSON exceeds the maximum depth');
    }
    if (this.index >= this.raw.length) {
      fail('POMRX_WG_JSON_E_SYNTAX', 'JSON ended before a value was complete');
    }

    this.countNode();
    const character = this.raw[this.index];
    if (character === '{') {
      this.scanObject(depth);
      return;
    }
    if (character === '[') {
      this.scanArray(depth);
      return;
    }
    if (character === '"') {
      const value = this.scanString();
      if (value.length > MAX_STRING_LENGTH) {
        fail('POMRX_WG_JSON_E_BOUNDS', 'JSON string exceeds the maximum length');
      }
      return;
    }
    if (character === 't') {
      this.scanLiteral('true');
      return;
    }
    if (character === 'f') {
      this.scanLiteral('false');
      return;
    }
    if (character === 'n') {
      this.scanLiteral('null');
      return;
    }
    if (character === '-' || (character >= '0' && character <= '9')) {
      this.scanNumber();
      return;
    }
    fail('POMRX_WG_JSON_E_SYNTAX', 'JSON contains an invalid value token');
  }

  scanObject(depth) {
    this.index += 1;
    this.skipWhitespace();
    if (this.raw[this.index] === '}') {
      this.index += 1;
      return;
    }

    const keys = new Set();
    while (this.index < this.raw.length) {
      if (this.raw[this.index] !== '"') {
        fail('POMRX_WG_JSON_E_SYNTAX', 'JSON object key must be a string');
      }
      const key = this.scanString();
      if (key.length === 0 || key.length > MAX_KEY_LENGTH) {
        fail('POMRX_WG_JSON_E_BOUNDS', 'JSON object key has an invalid length');
      }
      if (FORBIDDEN_KEYS.has(key)) {
        fail('POMRX_WG_JSON_E_UNSAFE_KEY', 'JSON contains a forbidden object key');
      }
      if (keys.has(key)) {
        fail('POMRX_WG_JSON_E_DUPLICATE_KEY', `JSON contains duplicate object key: ${key}`);
      }
      keys.add(key);

      this.skipWhitespace();
      if (this.raw[this.index] !== ':') {
        fail('POMRX_WG_JSON_E_SYNTAX', 'JSON object key is missing a colon');
      }
      this.index += 1;
      this.skipWhitespace();
      this.scanValue(depth + 1);
      this.skipWhitespace();

      if (this.raw[this.index] === '}') {
        this.index += 1;
        return;
      }
      if (this.raw[this.index] !== ',') {
        fail('POMRX_WG_JSON_E_SYNTAX', 'JSON object is missing a comma or closing brace');
      }
      this.index += 1;
      this.skipWhitespace();
    }
    fail('POMRX_WG_JSON_E_SYNTAX', 'JSON object is not closed');
  }

  scanArray(depth) {
    this.index += 1;
    this.skipWhitespace();
    if (this.raw[this.index] === ']') {
      this.index += 1;
      return;
    }

    while (this.index < this.raw.length) {
      this.scanValue(depth + 1);
      this.skipWhitespace();
      if (this.raw[this.index] === ']') {
        this.index += 1;
        return;
      }
      if (this.raw[this.index] !== ',') {
        fail('POMRX_WG_JSON_E_SYNTAX', 'JSON array is missing a comma or closing bracket');
      }
      this.index += 1;
      this.skipWhitespace();
    }
    fail('POMRX_WG_JSON_E_SYNTAX', 'JSON array is not closed');
  }

  scanString() {
    const start = this.index;
    this.index += 1;
    while (this.index < this.raw.length) {
      const character = this.raw[this.index];
      if (character === '"') {
        this.index += 1;
        const token = this.raw.slice(start, this.index);
        let decoded;
        try {
          decoded = trustedJsonParse(token);
        } catch {
          fail('POMRX_WG_JSON_E_SYNTAX', 'JSON string escape sequence is invalid');
        }
        if (typeof decoded !== 'string') {
          fail('POMRX_WG_JSON_E_SYNTAX', 'JSON string token is invalid');
        }
        return assertUnicodeScalarString(decoded, 'JSON string');
      }

      if (character === '\\') {
        this.index += 1;
        if (this.index >= this.raw.length) {
          fail('POMRX_WG_JSON_E_SYNTAX', 'JSON string escape is incomplete');
        }
        const escaped = this.raw[this.index];
        if (escaped === 'u') {
          const hex = this.raw.slice(this.index + 1, this.index + 5);
          if (!/^[0-9a-fA-F]{4}$/u.test(hex)) {
            fail('POMRX_WG_JSON_E_SYNTAX', 'JSON unicode escape is invalid');
          }
          this.index += 5;
          continue;
        }
        if (!['"', '\\', '/', 'b', 'f', 'n', 'r', 't'].includes(escaped)) {
          fail('POMRX_WG_JSON_E_SYNTAX', 'JSON string escape is invalid');
        }
        this.index += 1;
        continue;
      }

      if (character.charCodeAt(0) <= 0x1f) {
        fail('POMRX_WG_JSON_E_SYNTAX', 'JSON string contains an unescaped control character');
      }
      this.index += 1;
    }
    fail('POMRX_WG_JSON_E_SYNTAX', 'JSON string is not closed');
  }

  scanLiteral(literal) {
    if (this.raw.slice(this.index, this.index + literal.length) !== literal) {
      fail('POMRX_WG_JSON_E_SYNTAX', 'JSON literal is invalid');
    }
    this.index += literal.length;
  }

  scanNumber() {
    const remainder = this.raw.slice(this.index);
    const match = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/u.exec(remainder);
    if (!match) {
      fail('POMRX_WG_JSON_E_SYNTAX', 'JSON number is invalid');
    }
    const token = match[0];
    if (token === '-0' || token.includes('.') || token.includes('e') || token.includes('E')) {
      fail('POMRX_WG_JSON_E_NUMBER', 'Wallet Guard JSON numbers must use canonical integer syntax');
    }
    this.index += token.length;
  }
}

function cloneParsed(value, depth = 0, budget = { remaining: MAX_NODES }) {
  if (depth > MAX_DEPTH || budget.remaining-- <= 0) {
    fail('POMRX_WG_JSON_E_BOUNDS', 'parsed JSON exceeds reference bounds');
  }
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.length > MAX_STRING_LENGTH) {
      fail('POMRX_WG_JSON_E_BOUNDS', 'parsed JSON string exceeds the maximum length');
    }
    return assertUnicodeScalarString(value, 'parsed JSON string');
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) {
      fail('POMRX_WG_JSON_E_NUMBER', 'Wallet Guard JSON numbers must be canonical safe integers');
    }
    return value;
  }
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => cloneParsed(entry, depth + 1, budget)));
  }
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) {
    fail('POMRX_WG_JSON_E_SHAPE', 'parsed JSON must contain plain objects only');
  }

  const output = Object.create(null);
  for (const [key, entry] of Object.entries(value)) {
    assertUnicodeScalarString(key, 'parsed JSON key');
    if (key.length === 0 || key.length > MAX_KEY_LENGTH || FORBIDDEN_KEYS.has(key)) {
      fail('POMRX_WG_JSON_E_UNSAFE_KEY', 'parsed JSON contains an unsafe object key');
    }
    output[key] = cloneParsed(entry, depth + 1, budget);
  }
  return Object.freeze(output);
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('POMRX_WG_JSON_E_SHAPE', `${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail('POMRX_WG_JSON_E_SHAPE', `${label} has missing or unknown fields`);
  }
}

function validateMethodAndParams(value) {
  if (typeof value.method !== 'string' || !METHOD_PATTERN.test(value.method)) {
    fail('POMRX_WG_JSON_E_METHOD', 'Wallet Guard JSON method is invalid');
  }
  if (!Array.isArray(value.params)) {
    fail('POMRX_WG_JSON_E_PARAMS', 'Wallet Guard JSON params must be an array');
  }
}

function validateJsonRpcId(value) {
  if (typeof value === 'string') {
    if (value.length < 1 || value.length > 128) {
      fail('POMRX_WG_JSON_E_ID', 'JSON-RPC id string has an invalid length');
    }
    return value;
  }
  if (Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0)) return value;
  fail('POMRX_WG_JSON_E_ID', 'JSON-RPC id must be a non-negative safe integer or bounded string');
}

function canonicalRequestHash(request) {
  let canonicalRequest;
  try {
    canonicalRequest = canonicalizePayload(request);
  } catch (error) {
    if (!(error instanceof ProofPayloadValidationError)) throw error;
    fail(
      'POMRX_WG_JSON_E_CANONICAL',
      'Wallet Guard JSON request is outside the shared canonical payload contract',
    );
  }
  return sha256Hex(canonicalRequest);
}

export function parseWalletGuardJsonIngress(raw) {
  const snapshot = parseWalletGuardBoundedJsonData(raw);
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    fail('POMRX_WG_JSON_E_SHAPE', 'Wallet Guard JSON ingress root must be an object');
  }

  let transport;
  let jsonrpcId = null;
  let request;
  if (Object.hasOwn(snapshot, 'jsonrpc')) {
    exactKeys(snapshot, JSONRPC_KEYS, 'JSON-RPC 2.0 request');
    if (snapshot.jsonrpc !== '2.0') {
      fail('POMRX_WG_JSON_E_VERSION', 'JSON-RPC version must be exactly 2.0');
    }
    jsonrpcId = validateJsonRpcId(snapshot.id);
    validateMethodAndParams(snapshot);
    transport = 'jsonrpc2';
    request = Object.freeze({ method: snapshot.method, params: snapshot.params });
  } else {
    exactKeys(snapshot, EIP1193_KEYS, 'EIP-1193 request');
    validateMethodAndParams(snapshot);
    transport = 'eip1193-json';
    request = Object.freeze({ method: snapshot.method, params: snapshot.params });
  }

  return Object.freeze({
    schema_version: WALLET_GUARD_JSON_INGRESS_SCHEMA_VERSION,
    transport,
    jsonrpc_id: jsonrpcId,
    request,
    raw_text_sha256: sha256Hex(raw),
    canonical_request_sha256: canonicalRequestHash(request),
    reference_only: true,
    transport_bytes_proved: false,
  });
}
