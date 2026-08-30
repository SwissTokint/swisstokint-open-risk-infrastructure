import crypto from 'node:crypto';

export const MCP_TOOL_ACTION_SCHEMA_VERSION = 'pom-rx-mcp-tool-action/0.1';
export const MCP_PROTOCOL_VERSION = '2026-07-28';
export const MCP_TOOL_ACTION_COMMIT_DOMAIN = 'swisstokint:pom-rx-mcp-tool-action:v1:';
export const MCP_TOOL_CONTEXT_COMMIT_DOMAIN = 'swisstokint:pom-rx-mcp-tool-context:v1:';
export const MCP_RAW_TEXT_COMMIT_DOMAIN = 'swisstokint:pom-rx-raw-text:v1:';

const MAX_BODY_CHARS = 64 * 1024;
const MAX_DEPTH = 8;
const MAX_NODES = 1_000;
const MAX_ARRAY_LENGTH = 1_000;
const MAX_STRING_LENGTH = 16_384;
const MAX_KEY_LENGTH = 256;
const MAX_TOOL_NAME_LENGTH = 256;
const MAX_SERVER_REF_LENGTH = 256;
const REQUEST_KEYS = Object.freeze(['id', 'jsonrpc', 'method', 'params']);
const PARAM_OPTIONAL_KEYS = Object.freeze([
  '_meta',
  'arguments',
  'inputResponses',
  'requestState',
  'task',
]);
const TOOL_NAME_CONTROL_PATTERN = /[\u0000-\u001f\u007f]/u;
const SERVER_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{2,255}$/u;
const JSON_NUMBER_PATTERN = /^(-?)(0|[1-9][0-9]*)(?:\.([0-9]+))?(?:[eE]([+-]?)([0-9]+))?$/u;

const REFLECT_APPLY = Reflect.apply;
const JSON_PARSE = JSON.parse;
const ARRAY_CONSTRUCTOR = Array;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_SORT = Array.prototype.sort;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_NAMES = Object.getOwnPropertyNames;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_SET_PROTOTYPE_OF = Object.setPrototypeOf;
const OBJECT_IS = Object.is;
const NUMBER_IS_FINITE = Number.isFinite;
const NUMBER_IS_INTEGER = Number.isInteger;
const NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const NUMBER_TO_STRING = Number.prototype.toString;
const STRING_CHAR_CODE_AT = String.prototype.charCodeAt;
const STRING_PAD_START = String.prototype.padStart;
const STRING_SLICE = String.prototype.slice;
const REGEXP_EXEC = RegExp.prototype.exec;
const DATA_VIEW_CONSTRUCTOR = DataView;
const DATA_VIEW_SET_FLOAT64 = DataView.prototype.setFloat64;
const DATA_VIEW_GET_UINT8 = DataView.prototype.getUint8;
const ARRAY_BUFFER_CONSTRUCTOR = ArrayBuffer;
const CRYPTO_CREATE_HASH = crypto.createHash;
const HASH_PROTOTYPE = REFLECT_APPLY(
  OBJECT_GET_PROTOTYPE_OF,
  Object,
  [REFLECT_APPLY(CRYPTO_CREATE_HASH, crypto, ['sha256'])],
);
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;

export class PomRxMcpNormalizationError extends TypeError {
  constructor(code, message) {
    super(message);
    this.name = 'PomRxMcpNormalizationError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new PomRxMcpNormalizationError(code, message);
}

function parseJson(text) {
  return REFLECT_APPLY(JSON_PARSE, JSON, [text]);
}

function isArray(value) {
  return REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value]);
}

function sortArray(value) {
  return REFLECT_APPLY(ARRAY_SORT, value, []);
}

function createDetachedArray(length) {
  const output = new ARRAY_CONSTRUCTOR(length);
  REFLECT_APPLY(OBJECT_SET_PROTOTYPE_OF, Object, [output, null]);
  return output;
}

function createObject() {
  return REFLECT_APPLY(OBJECT_CREATE, Object, [null]);
}

function defineDataProperty(target, key, value) {
  const descriptor = createObject();
  descriptor.value = value;
  descriptor.enumerable = true;
  descriptor.writable = false;
  descriptor.configurable = false;
  REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [target, key, descriptor]);
}

function freezeValue(value) {
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function ownNames(value) {
  return REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_NAMES, Object, [value]);
}

function hasOwn(value, key) {
  return REFLECT_APPLY(OBJECT_HAS_OWN, Object, [value, key]);
}

function objectIs(left, right) {
  return REFLECT_APPLY(OBJECT_IS, Object, [left, right]);
}

function numberIsFinite(value) {
  return REFLECT_APPLY(NUMBER_IS_FINITE, Number, [value]);
}

function numberIsInteger(value) {
  return REFLECT_APPLY(NUMBER_IS_INTEGER, Number, [value]);
}

function numberIsSafeInteger(value) {
  return REFLECT_APPLY(NUMBER_IS_SAFE_INTEGER, Number, [value]);
}

function numberToString(value, radix) {
  return REFLECT_APPLY(NUMBER_TO_STRING, value, [radix]);
}

function charCodeAt(value, index) {
  return REFLECT_APPLY(STRING_CHAR_CODE_AT, value, [index]);
}

function padStart(value, targetLength, fill) {
  return REFLECT_APPLY(STRING_PAD_START, value, [targetLength, fill]);
}

function sliceString(value, start, end) {
  return REFLECT_APPLY(STRING_SLICE, value, [start, end]);
}

function regexpExec(pattern, value) {
  return REFLECT_APPLY(REGEXP_EXEC, pattern, [value]);
}

function regexpMatches(pattern, value) {
  return regexpExec(pattern, value) !== null;
}

function assertUnicodeScalarString(value, label) {
  for (let index = 0; index < value.length; index += 1) {
    const code = charCodeAt(value, index);
    if (code >= 0xd800 && code <= 0xdbff) {
      if (index + 1 >= value.length) {
        fail('POMRX_MCP_E_UNICODE', `${label} contains an unpaired high surrogate`);
      }
      const next = charCodeAt(value, index + 1);
      if (next < 0xdc00 || next > 0xdfff) {
        fail('POMRX_MCP_E_UNICODE', `${label} contains an unpaired high surrogate`);
      }
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      fail('POMRX_MCP_E_UNICODE', `${label} contains an unpaired low surrogate`);
    }
  }
  return value;
}

function validateJsonNumber(value, label) {
  if (!numberIsFinite(value)) {
    fail('POMRX_MCP_E_NUMBER', `${label} must be a finite JSON number`);
  }
  if (objectIs(value, -0)
      || (numberIsInteger(value) && !numberIsSafeInteger(value))) {
    fail(
      'POMRX_MCP_E_NUMBER_ROUNDTRIP',
      `${label} cannot be represented with exact MCP JSON dispatch identity`,
    );
  }
  return value;
}

function parseBoundedDecimalExponent(sign, digits) {
  if (digits === undefined) return 0;
  // The raw body is bounded to 64 KiB, so an exponent magnitude above 100,000
  // cannot be cancelled by the significand into a distinct finite IEEE-754
  // value. Rejecting it is a bounded fail-closed identity rule, not a new
  // canonical commitment format.
  if (digits.length > 6) return null;
  let value = 0;
  for (let index = 0; index < digits.length; index += 1) {
    value = (value * 10) + (charCodeAt(digits, index) - 48);
    if (value > 100_000) return null;
  }
  return sign === '-' ? -value : value;
}

function decimalNumberIdentity(token) {
  const match = regexpExec(JSON_NUMBER_PATTERN, token);
  if (match === null) return null;

  const negative = match[1] === '-';
  const integer = match[2];
  const fraction = match[3] ?? '';
  const explicitExponent = parseBoundedDecimalExponent(match[4], match[5]);
  if (explicitExponent === null) return null;

  const combined = `${integer}${fraction}`;
  let first = 0;
  while (first < combined.length && combined[first] === '0') first += 1;
  if (first === combined.length) return 'zero';

  let last = combined.length;
  while (last > first && combined[last - 1] === '0') last -= 1;
  const trailingZeros = combined.length - last;
  const significantDigits = sliceString(combined, first, last);
  const decimalExponent = explicitExponent - fraction.length + trailingZeros;
  return `${negative ? '-' : '+'}:${significantDigits}:${decimalExponent}`;
}

function assertRawNumberRoundTrip(token) {
  const rawIdentity = decimalNumberIdentity(token);
  if (rawIdentity === null) {
    fail('POMRX_MCP_E_JSON', 'MCP request body contains an invalid JSON number');
  }

  let parsed;
  try {
    parsed = parseJson(token);
  } catch {
    fail('POMRX_MCP_E_JSON', 'MCP request body contains an invalid JSON number');
  }
  if (typeof parsed !== 'number') {
    fail('POMRX_MCP_E_JSON', 'MCP request body contains an invalid JSON number');
  }
  validateJsonNumber(parsed, 'MCP JSON number');

  const parsedIdentity = decimalNumberIdentity(numberToString(parsed));
  if (parsedIdentity === null || parsedIdentity !== rawIdentity) {
    fail(
      'POMRX_MCP_E_NUMBER_ROUNDTRIP',
      'MCP JSON number loses exact decimal identity through ordinary JSON dispatch',
    );
  }
}

function isJsonWhitespace(character) {
  return character === ' ' || character === '\t' || character === '\n' || character === '\r';
}

function assertBoundedUnambiguousJson(text) {
  let index = 0;
  let nodes = 0;

  function skipWhitespace() {
    while (index < text.length && isJsonWhitespace(text[index])) index += 1;
  }

  function syntaxError() {
    fail('POMRX_MCP_E_JSON', 'MCP request body is not valid JSON');
  }

  function consumeNode(depth) {
    if (depth > MAX_DEPTH) {
      fail('POMRX_MCP_E_DEPTH', 'MCP JSON exceeds maximum depth before parsing');
    }
    nodes += 1;
    if (nodes > MAX_NODES) {
      fail('POMRX_MCP_E_NODES', 'MCP JSON exceeds maximum node count before parsing');
    }
  }

  function parseStringToken(label, maxLength) {
    if (text[index] !== '"') syntaxError();
    const start = index;
    index += 1;
    while (index < text.length) {
      const character = text[index];
      if (character === '"') {
        index += 1;
        const token = sliceString(text, start, index);
        let decoded;
        try {
          decoded = parseJson(token);
        } catch {
          syntaxError();
        }
        if (decoded.length > maxLength) {
          fail('POMRX_MCP_E_STRING', `${label} exceeds the reference string/key limit`);
        }
        return assertUnicodeScalarString(decoded, label);
      }
      if (character === '\\') {
        index += 1;
        if (index >= text.length) syntaxError();
        if (text[index] === 'u') {
          index += 5;
          if (index > text.length) syntaxError();
          continue;
        }
        index += 1;
        continue;
      }
      index += 1;
    }
    syntaxError();
  }

  function parsePrimitive() {
    const start = index;
    while (index < text.length) {
      const character = text[index];
      if (character === ',' || character === ']' || character === '}' || isJsonWhitespace(character)) {
        break;
      }
      index += 1;
    }
    if (index === start) syntaxError();
    const token = sliceString(text, start, index);
    const first = token[0];
    if (first === '-' || (first >= '0' && first <= '9')) {
      assertRawNumberRoundTrip(token);
    }
  }

  function parseArray(depth) {
    index += 1;
    skipWhitespace();
    let elementCount = 0;
    if (text[index] === ']') {
      index += 1;
      return;
    }
    while (index < text.length) {
      elementCount += 1;
      if (elementCount > MAX_ARRAY_LENGTH) {
        fail('POMRX_MCP_E_ARRAY', 'MCP JSON array exceeds maximum length before parsing');
      }
      parseValue(depth + 1);
      skipWhitespace();
      if (text[index] === ']') {
        index += 1;
        return;
      }
      if (text[index] !== ',') syntaxError();
      index += 1;
      skipWhitespace();
    }
    syntaxError();
  }

  function parseObject(depth) {
    index += 1;
    skipWhitespace();
    const seen = createObject();
    if (text[index] === '}') {
      index += 1;
      return;
    }
    while (index < text.length) {
      if (text[index] !== '"') syntaxError();
      const key = parseStringToken('MCP JSON object key', MAX_KEY_LENGTH);
      if (hasOwn(seen, key)) {
        fail('POMRX_MCP_E_DUPLICATE_KEY', `MCP JSON contains duplicate object member: ${key}`);
      }
      defineDataProperty(seen, key, true);
      skipWhitespace();
      if (text[index] !== ':') syntaxError();
      index += 1;
      skipWhitespace();
      parseValue(depth + 1);
      skipWhitespace();
      if (text[index] === '}') {
        index += 1;
        return;
      }
      if (text[index] !== ',') syntaxError();
      index += 1;
      skipWhitespace();
    }
    syntaxError();
  }

  function parseValue(depth) {
    skipWhitespace();
    if (index >= text.length) syntaxError();
    consumeNode(depth);
    const character = text[index];
    if (character === '{') {
      parseObject(depth);
      return;
    }
    if (character === '[') {
      parseArray(depth);
      return;
    }
    if (character === '"') {
      parseStringToken('MCP JSON string', MAX_STRING_LENGTH);
      return;
    }
    parsePrimitive();
  }

  parseValue(0);
  skipWhitespace();
  if (index !== text.length) syntaxError();
}

function assertExactKeys(value, requiredKeys, optionalKeys, label) {
  if (!value || typeof value !== 'object' || isArray(value)) {
    fail('POMRX_MCP_E_SHAPE', `${label} must be an object`);
  }
  const actual = ownNames(value);
  const allowed = createObject();
  for (let index = 0; index < requiredKeys.length; index += 1) {
    defineDataProperty(allowed, requiredKeys[index], true);
  }
  for (let index = 0; index < optionalKeys.length; index += 1) {
    defineDataProperty(allowed, optionalKeys[index], true);
  }
  for (let index = 0; index < actual.length; index += 1) {
    if (!hasOwn(allowed, actual[index])) {
      fail('POMRX_MCP_E_UNKNOWN_FIELD', `${label} contains an unknown field: ${actual[index]}`);
    }
  }
  for (let index = 0; index < requiredKeys.length; index += 1) {
    if (!hasOwn(value, requiredKeys[index])) {
      fail('POMRX_MCP_E_MISSING_FIELD', `${label} is missing ${requiredKeys[index]}`);
    }
  }
}

function captureJsonValue(value, label, depth, budget) {
  if (depth > MAX_DEPTH) {
    fail('POMRX_MCP_E_DEPTH', `${label} exceeds maximum depth`);
  }
  if (budget.remaining <= 0) {
    fail('POMRX_MCP_E_NODES', `${label} exceeds maximum node count`);
  }
  budget.remaining -= 1;

  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.length > MAX_STRING_LENGTH) {
      fail('POMRX_MCP_E_STRING', `${label} string is too long`);
    }
    return assertUnicodeScalarString(value, label);
  }
  if (typeof value === 'number') return validateJsonNumber(value, label);
  if (typeof value !== 'object') {
    fail('POMRX_MCP_E_TYPE', `${label} contains an unsupported value`);
  }

  if (isArray(value)) {
    if (value.length > MAX_ARRAY_LENGTH) {
      fail('POMRX_MCP_E_ARRAY', `${label} array is too long`);
    }
    const output = createDetachedArray(value.length);
    for (let index = 0; index < value.length; index += 1) {
      defineDataProperty(
        output,
        index,
        captureJsonValue(value[index], `${label}[${index}]`, depth + 1, budget),
      );
    }
    return freezeValue(output);
  }

  const keys = ownNames(value);
  const output = createObject();
  for (let index = 0; index < keys.length; index += 1) {
    const key = assertUnicodeScalarString(keys[index], `${label} key`);
    if (key.length > MAX_KEY_LENGTH) {
      fail('POMRX_MCP_E_KEY', `${label} contains an overlong key`);
    }
    defineDataProperty(
      output,
      key,
      captureJsonValue(value[key], `${label}.${key}`, depth + 1, budget),
    );
  }
  return freezeValue(output);
}

function captureJson(value, label) {
  return captureJsonValue(value, label, 0, { remaining: MAX_NODES });
}

function hexCodeUnit(value, width) {
  return padStart(numberToString(value, 16), width, '0');
}

function encodeUtf16(value) {
  let output = '';
  for (let index = 0; index < value.length; index += 1) {
    output += hexCodeUnit(charCodeAt(value, index), 4);
  }
  return output;
}

function encodeNumberBits(value) {
  const buffer = new ARRAY_BUFFER_CONSTRUCTOR(8);
  const view = new DATA_VIEW_CONSTRUCTOR(buffer);
  REFLECT_APPLY(DATA_VIEW_SET_FLOAT64, view, [0, value, false]);
  let output = '';
  for (let index = 0; index < 8; index += 1) {
    output += hexCodeUnit(REFLECT_APPLY(DATA_VIEW_GET_UINT8, view, [index]), 2);
  }
  return output;
}

function exactTranscript(value) {
  if (value === null) return 'n;';
  if (typeof value === 'boolean') return value ? 'b1;' : 'b0;';
  if (typeof value === 'number') return `d${encodeNumberBits(value)};`;
  if (typeof value === 'string') return `s${value.length}:${encodeUtf16(value)};`;
  if (isArray(value)) {
    let output = `a${value.length}[`;
    for (let index = 0; index < value.length; index += 1) {
      output += exactTranscript(value[index]);
    }
    return `${output}]`;
  }

  const keys = sortArray(ownNames(value));
  let output = `o${keys.length}{`;
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    output += `${exactTranscript(key)}${exactTranscript(value[key])}`;
  }
  return `${output}}`;
}

function sha256Hex(value) {
  const hash = REFLECT_APPLY(CRYPTO_CREATE_HASH, crypto, ['sha256']);
  REFLECT_APPLY(HASH_UPDATE, hash, [value, 'utf8']);
  return REFLECT_APPLY(HASH_DIGEST, hash, ['hex']);
}

function commit(domain, value) {
  return sha256Hex(`${domain}${exactTranscript(value)}`);
}

function validateToolName(value, label) {
  if (typeof value !== 'string'
      || value.length < 1
      || value.length > MAX_TOOL_NAME_LENGTH
      || regexpMatches(TOOL_NAME_CONTROL_PATTERN, value)) {
    fail('POMRX_MCP_E_TOOL_NAME', `${label} is invalid`);
  }
  return assertUnicodeScalarString(value, label);
}

function validateServerRef(value) {
  if (typeof value !== 'string'
      || value.length > MAX_SERVER_REF_LENGTH
      || !regexpMatches(SERVER_REF_PATTERN, value)) {
    fail('POMRX_MCP_E_SERVER_REF', 'serverRef is invalid');
  }
  return assertUnicodeScalarString(value, 'serverRef');
}

function validateJsonRpcId(value) {
  if (typeof value === 'string') {
    if (value.length < 1 || value.length > 256) {
      fail('POMRX_MCP_E_JSONRPC_ID', 'JSON-RPC id string is invalid');
    }
    return assertUnicodeScalarString(value, 'JSON-RPC id');
  }
  if (typeof value === 'number') return validateJsonNumber(value, 'JSON-RPC id');
  fail('POMRX_MCP_E_JSONRPC_ID', 'JSON-RPC id must be a bounded string or finite exact-dispatch number');
}

function captureParams(params) {
  assertExactKeys(params, ['name'], PARAM_OPTIONAL_KEYS, 'MCP tools/call params');
  validateToolName(params.name, 'MCP params.name');
  if (hasOwn(params, 'arguments')
      && (!params.arguments || typeof params.arguments !== 'object' || isArray(params.arguments))) {
    fail('POMRX_MCP_E_ARGUMENTS', 'MCP tool arguments must be an object when present');
  }
  if (hasOwn(params, 'requestState') && typeof params.requestState !== 'string') {
    fail('POMRX_MCP_E_REQUEST_STATE', 'MCP requestState must be a string when present');
  }
  if (hasOwn(params, 'inputResponses')
      && (!params.inputResponses || typeof params.inputResponses !== 'object' || isArray(params.inputResponses))) {
    fail('POMRX_MCP_E_INPUT_RESPONSES', 'MCP inputResponses must be an object when present');
  }
  if (hasOwn(params, '_meta')
      && (!params._meta || typeof params._meta !== 'object' || isArray(params._meta))) {
    fail('POMRX_MCP_E_META', 'MCP _meta must be an object when present');
  }
  if (hasOwn(params, 'task')
      && (!params.task || typeof params.task !== 'object' || isArray(params.task))) {
    fail('POMRX_MCP_E_TASK', 'MCP task must be an object when present');
  }
  return captureJson(params, 'MCP tools/call params');
}

export function normalizeReferenceMcpToolCall({
  serverRef,
  protocolVersionHeader,
  methodHeader,
  nameHeader,
  bodyText,
}) {
  const normalizedServerRef = validateServerRef(serverRef);
  if (protocolVersionHeader !== MCP_PROTOCOL_VERSION) {
    fail('POMRX_MCP_E_PROTOCOL_VERSION', 'MCP protocol version is unsupported or missing');
  }
  if (methodHeader !== 'tools/call') {
    fail('POMRX_MCP_E_HEADER_METHOD', 'Mcp-Method must be tools/call');
  }
  const normalizedHeaderName = validateToolName(nameHeader, 'Mcp-Name');
  if (typeof bodyText !== 'string' || bodyText.length < 1 || bodyText.length > MAX_BODY_CHARS) {
    fail('POMRX_MCP_E_BODY_SIZE', 'MCP request body is empty or exceeds the reference limit');
  }

  assertBoundedUnambiguousJson(bodyText);

  let parsed;
  try {
    parsed = parseJson(bodyText);
  } catch {
    fail('POMRX_MCP_E_JSON', 'MCP request body is not valid JSON');
  }

  assertExactKeys(parsed, REQUEST_KEYS, [], 'MCP JSON-RPC request');
  if (parsed.jsonrpc !== '2.0') {
    fail('POMRX_MCP_E_JSONRPC_VERSION', 'MCP request must use JSON-RPC 2.0');
  }
  validateJsonRpcId(parsed.id);
  if (parsed.method !== 'tools/call') {
    fail('POMRX_MCP_E_BODY_METHOD', 'MCP request body method must be tools/call');
  }
  if (parsed.method !== methodHeader) {
    fail('POMRX_MCP_E_METHOD_MISMATCH', 'Mcp-Method header disagrees with request body');
  }

  const params = captureParams(parsed.params);
  if (params.name !== normalizedHeaderName) {
    fail('POMRX_MCP_E_NAME_MISMATCH', 'Mcp-Name header disagrees with params.name');
  }

  const action = createObject();
  defineDataProperty(action, 'method', 'tools/call');
  defineDataProperty(action, 'params', params);
  freezeValue(action);

  const context = createObject();
  defineDataProperty(context, 'protocol_version', MCP_PROTOCOL_VERSION);
  defineDataProperty(context, 'server_ref', normalizedServerRef);
  defineDataProperty(context, 'method_header', methodHeader);
  defineDataProperty(context, 'name_header', normalizedHeaderName);
  freezeValue(context);

  const preparedExecution = createObject();
  defineDataProperty(preparedExecution, 'method', 'tools/call');
  defineDataProperty(preparedExecution, 'params', params);
  freezeValue(preparedExecution);

  const result = createObject();
  defineDataProperty(result, 'schema_version', MCP_TOOL_ACTION_SCHEMA_VERSION);
  defineDataProperty(result, 'protocol_version', MCP_PROTOCOL_VERSION);
  defineDataProperty(result, 'server_ref', normalizedServerRef);
  defineDataProperty(result, 'jsonrpc_id', parsed.id);
  defineDataProperty(result, 'method', 'tools/call');
  defineDataProperty(result, 'tool_name', params.name);
  defineDataProperty(result, 'action_commitment', commit(MCP_TOOL_ACTION_COMMIT_DOMAIN, action));
  defineDataProperty(result, 'context_commitment', commit(MCP_TOOL_CONTEXT_COMMIT_DOMAIN, context));
  defineDataProperty(
    result,
    'raw_text_commitment_sha256',
    sha256Hex(`${MCP_RAW_TEXT_COMMIT_DOMAIN}${bodyText}`),
  );
  defineDataProperty(result, 'transport_bytes_proved', false);
  defineDataProperty(result, 'prepared_execution', preparedExecution);
  return freezeValue(result);
}
