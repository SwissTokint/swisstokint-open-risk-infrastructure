import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createPomRxWitnessAck,
  pomRxKeyId,
  verifyPomRxSourceEnvelope,
  verifyPomRxWitnessAck,
} from '../sdk/typescript/pom-rx-witness.mjs';

const DEFAULT_MAX_BODY_BYTES = 64 * 1024;
const DEFAULT_MAX_REQUESTS_PER_MINUTE = 120;
const DEFAULT_MAX_RECEIPT_AGE_MS = 120_000;
const DEFAULT_MAX_FUTURE_SKEW_MS = 30_000;
const DEFAULT_ACK_VALIDITY_MS = 30_000;

class WitnessHttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function jsonResponse(response, statusCode, body) {
  const data = JSON.stringify(body);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'none'",
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(data);
}

async function readJsonBody(request, maxBodyBytes) {
  const contentType = request.headers['content-type'] ?? '';
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    throw new WitnessHttpError(415, 'Content-Type must be application/json');
  }
  const declaredLength = Number(request.headers['content-length']);
  if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
    throw new WitnessHttpError(413, 'Request body exceeds the configured limit');
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      throw new WitnessHttpError(413, 'Request body exceeds the configured limit');
    }
    chunks.push(chunk);
  }
  if (size === 0) throw new WitnessHttpError(400, 'Request body is required');

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new WitnessHttpError(400, 'Request body must be valid JSON');
  }
}

function createRateLimiter(maxRequestsPerMinute) {
  let windowStartedAt = Date.now();
  let count = 0;
  return () => {
    const now = Date.now();
    if (now - windowStartedAt >= 60_000) {
      windowStartedAt = now;
      count = 0;
    }
    count += 1;
    if (count > maxRequestsPerMinute) {
      throw new WitnessHttpError(429, 'Witness request limit exceeded');
    }
  };
}

export function createPomRxWitnessServer({
  witnessPrivateKey,
  mode = 'dry_run',
  existingAcks = new Map(),
  persistAck = async () => {},
  maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
  maxRequestsPerMinute = DEFAULT_MAX_REQUESTS_PER_MINUTE,
  maxReceiptAgeMs = DEFAULT_MAX_RECEIPT_AGE_MS,
  maxFutureSkewMs = DEFAULT_MAX_FUTURE_SKEW_MS,
  ackValidityMs = DEFAULT_ACK_VALIDITY_MS,
} = {}) {
  if (!witnessPrivateKey) throw new TypeError('witnessPrivateKey is required');
  if (!(existingAcks instanceof Map)) throw new TypeError('existingAcks must be a Map');
  if (!Number.isSafeInteger(maxBodyBytes) || maxBodyBytes < 1_024 || maxBodyBytes > 1024 * 1024) {
    throw new TypeError('maxBodyBytes must be between 1 KiB and 1 MiB');
  }
  if (
    !Number.isSafeInteger(maxRequestsPerMinute)
      || maxRequestsPerMinute < 1
      || maxRequestsPerMinute > 10_000
  ) {
    throw new TypeError('maxRequestsPerMinute must be between 1 and 10,000');
  }
  for (const [value, label, maximum] of [
    [maxReceiptAgeMs, 'maxReceiptAgeMs', 3_600_000],
    [maxFutureSkewMs, 'maxFutureSkewMs', 300_000],
    [ackValidityMs, 'ackValidityMs', 300_000],
  ]) {
    if (!Number.isSafeInteger(value) || value < 1_000 || value > maximum) {
      throw new TypeError(`${label} must be between 1 second and ${maximum / 1_000} seconds`);
    }
  }

  const witnessKeyId = pomRxKeyId(witnessPrivateKey);
  const limitRequest = createRateLimiter(maxRequestsPerMinute);
  let ledgerQueue = Promise.resolve();

  async function acknowledge(envelope) {
    const verified = verifyPomRxSourceEnvelope(envelope);
    if (!verified.ok) throw new WitnessHttpError(422, verified.error);
    if (verified.receipt.phase !== 'preflight') {
      throw new WitnessHttpError(422, 'Witness accepts preflight receipts only');
    }
    const now = Date.now();
    const occurredAt = new Date(verified.receipt.occurred_at).getTime();
    if (occurredAt > now + maxFutureSkewMs) {
      throw new WitnessHttpError(422, 'Preflight occurrence time is too far in the future');
    }
    if (occurredAt < now - maxReceiptAgeMs) {
      throw new WitnessHttpError(422, 'Preflight receipt is too old to witness');
    }

    let created = false;
    const result = await (ledgerQueue = ledgerQueue.then(async () => {
      const existing = existingAcks.get(verified.receiptHash);
      if (existing) return existing;

      const receivedAt = new Date(Math.max(now, occurredAt)).toISOString();
      const ack = createPomRxWitnessAck(envelope, witnessPrivateKey, {
        mode,
        receivedAt,
        validForMs: ackValidityMs,
      });
      await persistAck(ack);
      existingAcks.set(verified.receiptHash, ack);
      created = true;
      return ack;
    }));
    return { ack: result, created };
  }

  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? '/', 'http://witness.invalid');
      if (request.method === 'GET' && requestUrl.pathname === '/healthz') {
        jsonResponse(response, 200, {
          ok: true,
          service: 'pom-rx-preflight-witness',
          mode,
          witness_key_id: witnessKeyId,
        });
        return;
      }
      if (request.method !== 'POST' || requestUrl.pathname !== '/v1/preflight') {
        jsonResponse(response, 404, { error: 'Not found' });
        return;
      }

      limitRequest();
      const envelope = await readJsonBody(request, maxBodyBytes);
      const { ack, created } = await acknowledge(envelope);
      jsonResponse(response, created ? 201 : 200, ack);
    } catch (error) {
      const statusCode = error instanceof WitnessHttpError ? error.statusCode : 500;
      jsonResponse(response, statusCode, {
        error: statusCode === 500 ? 'Witness internal error' : error.message,
      });
    }
  });

  server.requestTimeout = 10_000;
  server.headersTimeout = 12_000;
  server.keepAliveTimeout = 5_000;
  server.maxHeadersCount = 64;
  return server;
}

async function loadWitnessPrivateKey(path) {
  if (!path) throw new Error('POM_RX_WITNESS_SIGNING_KEY_FILE is required outside dry-run mode');
  const pem = await fs.readFile(path, 'utf8');
  const key = crypto.createPrivateKey(pem);
  if (key.asymmetricKeyType !== 'ed25519') throw new Error('Witness signing key must be Ed25519');
  return key;
}

async function loadLedger(path, witnessKeyId) {
  const acks = new Map();
  try {
    const data = await fs.readFile(path, 'utf8');
    for (const [index, line] of data.split(/\r?\n/).entries()) {
      if (!line.trim()) continue;
      let ack;
      try {
        ack = JSON.parse(line);
      } catch {
        throw new Error(`Witness ledger line ${index + 1} is not valid JSON`);
      }
      const verified = verifyPomRxWitnessAck(ack, { witnessKeyId, mode: 'witnessed' });
      if (!verified.ok) throw new Error(`Witness ledger line ${index + 1} is invalid: ${verified.error}`);
      if (acks.has(ack.receipt_hash)) throw new Error(`Witness ledger repeats receipt ${ack.receipt_hash}`);
      acks.set(ack.receipt_hash, ack);
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  return acks;
}

async function startFromEnvironment() {
  const dryRunValue = process.env.POM_RX_WITNESS_DRY_RUN ?? 'true';
  if (dryRunValue !== 'true' && dryRunValue !== 'false') {
    throw new Error('POM_RX_WITNESS_DRY_RUN must equal true or false');
  }
  const dryRun = dryRunValue === 'true';
  const mode = dryRun ? 'dry_run' : 'witnessed';
  const host = process.env.POM_RX_WITNESS_HOST ?? '127.0.0.1';
  const port = Number(process.env.POM_RX_WITNESS_PORT ?? '8787');
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error('POM_RX_WITNESS_PORT must be a valid TCP port');
  }

  let witnessPrivateKey;
  let existingAcks = new Map();
  let persistAck = async () => {};
  if (dryRun) {
    ({ privateKey: witnessPrivateKey } = crypto.generateKeyPairSync('ed25519'));
  } else {
    const publicBaseUrl = process.env.POM_RX_WITNESS_PUBLIC_BASE_URL;
    if (!publicBaseUrl || !publicBaseUrl.startsWith('https://')) {
      throw new Error('POM_RX_WITNESS_PUBLIC_BASE_URL must use HTTPS outside dry-run mode');
    }
    witnessPrivateKey = await loadWitnessPrivateKey(process.env.POM_RX_WITNESS_SIGNING_KEY_FILE);
    const ledgerPath = process.env.POM_RX_WITNESS_LEDGER_FILE;
    if (!ledgerPath) throw new Error('POM_RX_WITNESS_LEDGER_FILE is required outside dry-run mode');
    const witnessKeyId = pomRxKeyId(witnessPrivateKey);
    existingAcks = await loadLedger(ledgerPath, witnessKeyId);
    await fs.mkdir(dirname(ledgerPath), { recursive: true, mode: 0o700 });
    persistAck = async (ack) => {
      await fs.appendFile(ledgerPath, `${JSON.stringify(ack)}\n`, {
        encoding: 'utf8',
        mode: 0o600,
      });
    };
  }

  const maxRequestsPerMinute = Number(
    process.env.POM_RX_WITNESS_MAX_REQUESTS_PER_MINUTE
      ?? DEFAULT_MAX_REQUESTS_PER_MINUTE,
  );
  const server = createPomRxWitnessServer({
    witnessPrivateKey,
    mode,
    existingAcks,
    persistAck,
    maxRequestsPerMinute,
  });
  server.listen(port, host, () => {
    process.stdout.write(`${JSON.stringify({
      service: 'pom-rx-preflight-witness',
      mode,
      host,
      port,
      witness_key_id: pomRxKeyId(witnessPrivateKey),
      persisted_acknowledgements: existingAcks.size,
    })}\n`);
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  startFromEnvironment().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'Witness startup failed'}\n`);
    process.exitCode = 1;
  });
}
