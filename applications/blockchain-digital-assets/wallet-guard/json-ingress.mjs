import {
  ProofPayloadValidationError,
  canonicalizePayload,
  sha256Hex,
} from '../../../sdk/typescript/swisstokint-proof.mjs';

export const WALLET_GUARD_JSON_INGRESS_SCHEMA_VERSION = 'wallet_guard_json_ingress/0.1';

const TRUSTED_REFLECT_APPLY = Reflect.apply;
const TRUSTED_ARRAY_INCLUDES = Array.prototype.includes;
const TRUSTED_ARRAY_IS_ARRAY = Array.isArray;
const TRUSTED_BUFFER_BYTE_LENGTH = Buffer.byteLength;
const TRUSTED_JSON_PARSE = JSON.parse;
const TRUSTED_NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const TRUSTED_OBJECT_CREATE = Object.create;
const TRUSTED_OBJECT_ENTRIES = Object.entries;
const TRUSTED_OBJECT_FREEZE = Object.freeze;
const TRUSTED_OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const TRUSTED_OBJECT_HAS_OWN = Object.hasOwn;
const TRUSTED_OBJECT_IS = Object.is;
const TRUSTED_OBJECT_KEYS = Object.keys;
const TRUSTED_OBJECT_PROTOTYPE = Object.prototype;
const TRUSTED_REGEXP_EXEC = RegExp.prototype.exec;
const TRUSTED_REGEXP_TEST = RegExp.prototype.test;
const TRUSTED_SET = Set;
const TRUSTED_SET_ADD = Set.prototype.add;
const TRUSTED_SET_HAS = Set.prototype.has;
const TRUSTED_STRING_CHAR_CODE_AT = String.prototype.charCodeAt;
const TRUSTED_STRING_INCLUDES = String.prototype.includes;
const TRUSTED_STRING_SLICE = String.prototype.slice;

const MAX_RAW_BYTES = 64 * 1024;
const MAX_DEPTH = 8;
const MAX_NODES = 1_000;
const MAX_STRING_LENGTH = 2_048;
const MAX_KEY_LENGTH = 64;
const METHOD_PATTERN = /^[A-Za-z0-9_]{1,64}$/u;
const FORBIDDEN_KEYS = new TRUSTED_SET(['__proto__', 'constructor', 'prototype']);
const EIP1193_KEYS = TRUSTED_OBJECT_FREEZE(['method', 'params']);
const JSONRPC_KEYS = TRUSTED_OBJECT_FREEZE(['jsonrpc', 'id', 'method', 'params']);

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
  const rawBytes = TRUSTED_BUFFER_BYTE_LENGTH(raw, 'utf8');
  if (rawBytes < 2 || rawBytes > MAX_RAW_BYTES) {
    fail('POMRX_WG_JSON_E_BOUNDS', 'Wallet Guard JSON ingress exceeds the byte bounds');
  }
  if (trustedStringCharCodeAt(raw, 0) === 0xfeff) {
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

function trustedArrayIncludes(value, entry) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_ARRAY_INCLUDES, value, [entry]);
}

function trustedRegExpExec(pattern, value) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_REGEXP_EXEC, pattern, [value]);
}

function trustedRegExpTest(pattern, value) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_REGEXP_TEST, pattern, [value]);
}

function trustedSetAdd(set, value) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_SET_ADD, set, [value]);
}

function trustedSetHas(set, value) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_SET_HAS, set, [value]);
}

function trustedStringCharCodeAt(value, index) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_STRING_CHAR_CODE_AT, value, [index]);
}

function trustedStringIncludes(value, entry) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_STRING_INCLUDES, value, [entry]);
}

function trustedStringSlice(value, start, end) {
  return TRUSTED_REFLECT_APPLY(TRUSTED_STRING_SLICE, value, [start, end]);
}

function isWhitespace(character) {
  return character === ' ' || character === '\n' || character === '\r' || character === '\t';
}

function assertUnicodeScalarString(value, label) {
  for (let index = 0; index < value.length; index += 1) {
    const code = trustedStringCharCodeAt(value, index);
    if (code >= 0xd800 && code <= 0xdbff) {
      if (index + 1 >= value.length) {
        fail('POMRX_WG_JSON_E_UNICODE', `${label} contains an unpaired high surrogate`);
      }
      const next = trustedStringCharCodeAt(value, index + 1);
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

    const keys = new TRUSTED_SET();
    while (this.index < this.raw.length) {
      if (this.raw[this.index] !== '"') {
        fail('POMRX_WG_JSON_E_SYNTAX', 'JSON object key must be a string');
      }
      const key = this.scanString();
      if (key.length === 0 || key.length > MAX_KEY_LENGTH) {
        fail('POMRX_WG_JSON_E_BOUNDS', 'JSON object key has an invalid length');
      }
      if (trustedSetHas(FORBIDDEN_KEYS, key)) {
        fail('POMRX_WG_JSON_E_UNSAFE_KEY', 'JSON contains a forbidden object key');
      }
      if (trustedSetHas(keys, key)) {
        fail('POMRX_WG_JSON_E_DUPLICATE_KEY', `JSON contains duplicate object key: ${key}`);
      }
      trustedSetAdd(keys, key);

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
        const token = trustedStringSlice(this.raw, start, this.index);
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
          const hex = trustedStringSlice(this.raw, this.index + 1, this.index + 5);
          if (!trustedRegExpTest(/^[0-9a-fA-F]{4}$/u, hex)) {
            fail('POMRX_WG_JSON_E_SYNTAX', 'JSON unicode escape is invalid');
          }
          this.index += 5;
          continue;
        }
        if (!trustedArrayIncludes(['"', '\\', '/', 'b', 'f', 'n', 'r', 't'], escaped)) {
          fail('POMRX_WG_JSON_E_SYNTAX', 'JSON string escape is invalid');
        }
        this.index += 1;
        continue;
      }

      if (trustedStringCharCodeAt(character, 0) <= 0x1f) {
        fail('POMRX_WG_JSON_E_SYNTAX', 'JSON string contains an unescaped control character');
      }
      this.index += 1;
    }
    fail('POMRX_WG_JSON_E_SYNTAX', 'JSON string is not closed');
  }

  scanLiteral(literal) {
    if (trustedStringSlice(this.raw, this.index, this.index + literal.length) !== literal) {
      fail('POMRX_WG_JSON_E_SYNTAX', 'JSON literal is invalid');
    }
    this.index += literal.length;
  }

  scanNumber() {
    const remainder = trustedStringSlice(this.raw, this.index);
    const match = trustedRegExpExec(
      /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/u,
      remainder,
    );
    if (!match) {
      fail('POMRX_WG_JSON_E_SYNTAX', 'JSON number is invalid');
    }
    const token = match[0];
    if (token === '-0' || trustedStringIncludes(token, '.')
        || trustedStringIncludes(token, 'e') || trustedStringIncludes(token, 'E')) {
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
    if (!TRUSTED_NUMBER_IS_SAFE_INTEGER(value) || TRUSTED_OBJECT_IS(value, -0)) {
      fail('POMRX_WG_JSON_E_NUMBER', 'Wallet Guard JSON numbers must be canonical safe integers');
    }
    return value;
  }
  if (TRUSTED_ARRAY_IS_ARRAY(value)) {
    const output = [];
    for (let index = 0; index < value.length; index += 1) {
      output[index] = cloneParsed(value[index], depth + 1, budget);
    }
    return TRUSTED_OBJECT_FREEZE(output);
  }
  if (!value || typeof value !== 'object'
      || TRUSTED_OBJECT_GET_PROTOTYPE_OF(value) !== TRUSTED_OBJECT_PROTOTYPE) {
    fail('POMRX_WG_JSON_E_SHAPE', 'parsed JSON must contain plain objects only');
  }

  const output = TRUSTED_OBJECT_CREATE(null);
  const entries = TRUSTED_OBJECT_ENTRIES(value);
  for (let index = 0; index < entries.length; index += 1) {
    const pair = entries[index];
    const key = pair[0];
    const entry = pair[1];
    assertUnicodeScalarString(key, 'parsed JSON key');
    if (key.length === 0 || key.length > MAX_KEY_LENGTH || trustedSetHas(FORBIDDEN_KEYS, key)) {
      fail('POMRX_WG_JSON_E_UNSAFE_KEY', 'parsed JSON contains an unsafe object key');
    }
    output[key] = cloneParsed(entry, depth + 1, budget);
  }
  return TRUSTED_OBJECT_FREEZE(output);
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || TRUSTED_ARRAY_IS_ARRAY(value)) {
    fail('POMRX_WG_JSON_E_SHAPE', `${label} must be an object`);
  }
  const actual = TRUSTED_OBJECT_KEYS(value);
  if (actual.length !== expected.length) {
    fail('POMRX_WG_JSON_E_SHAPE', `${label} has missing or unknown fields`);
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (!trustedArrayIncludes(actual, expected[index])) {
      fail('POMRX_WG_JSON_E_SHAPE', `${label} has missing or unknown fields`);
    }
  }
}

function validateMethodAndParams(value) {
  if (typeof value.method !== 'string' || !trustedRegExpTest(METHOD_PATTERN, value.method)) {
    fail('POMRX_WG_JSON_E_METHOD', 'Wallet Guard JSON method is invalid');
  }
  if (!TRUSTED_ARRAY_IS_ARRAY(value.params)) {
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
  if (TRUSTED_NUMBER_IS_SAFE_INTEGER(value) && value >= 0 && !TRUSTED_OBJECT_IS(value, -0)) {
    return value;
  }
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
  if (!snapshot || typeof snapshot !== 'object' || TRUSTED_ARRAY_IS_ARRAY(snapshot)) {
    fail('POMRX_WG_JSON_E_SHAPE', 'Wallet Guard JSON ingress root must be an object');
  }

  let transport;
  let jsonrpcId = null;
  let request;
  if (TRUSTED_OBJECT_HAS_OWN(snapshot, 'jsonrpc')) {
    exactKeys(snapshot, JSONRPC_KEYS, 'JSON-RPC 2.0 request');
    if (snapshot.jsonrpc !== '2.0') {
      fail('POMRX_WG_JSON_E_VERSION', 'JSON-RPC version must be exactly 2.0');
    }
    jsonrpcId = validateJsonRpcId(snapshot.id);
    validateMethodAndParams(snapshot);
    transport = 'jsonrpc2';
    request = TRUSTED_OBJECT_FREEZE({ method: snapshot.method, params: snapshot.params });
  } else {
    exactKeys(snapshot, EIP1193_KEYS, 'EIP-1193 request');
    validateMethodAndParams(snapshot);
    transport = 'eip1193-json';
    request = TRUSTED_OBJECT_FREEZE({ method: snapshot.method, params: snapshot.params });
  }

  return TRUSTED_OBJECT_FREEZE({
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
