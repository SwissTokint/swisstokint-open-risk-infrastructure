import { pathToFileURL } from "node:url";

export const AVALANCHE_FUJI_CHAIN_ID = 43113n;
export const AVALANCHE_FUJI_RPC =
  "https://api.avax-test.network/ext/bc/C/rpc";
export const AVALANCHE_FUJI_WS =
  "wss://api.avax-test.network/ext/bc/C/ws";
export const AVALANCHE_OBSERVATION_VERSION =
  "avalanche-accepted-observation/0.1";

const transactionHashPattern = /^0x[a-fA-F0-9]{64}$/;
const blockHashPattern = /^0x[a-fA-F0-9]{64}$/;
const quantityPattern = /^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/;

function assertPublicRpcUrl(value, schemes) {
  const url = new URL(value);
  if (!schemes.includes(url.protocol)) {
    throw new Error(`RPC URL must use ${schemes.join(" or ")}`);
  }
  return url;
}

function publicEndpointLabel(value) {
  const url = new URL(value);
  return `${url.protocol}//${url.host}${url.pathname}`;
}

export function parseFujiChainId(value) {
  if (typeof value !== "string" || !quantityPattern.test(value)) {
    throw new Error("eth_chainId must return a canonical hexadecimal quantity");
  }
  const chainId = BigInt(value);
  if (chainId !== AVALANCHE_FUJI_CHAIN_ID) {
    throw new Error(
      `refusing non-Fuji chain id ${chainId}; expected ${AVALANCHE_FUJI_CHAIN_ID}`,
    );
  }
  return chainId;
}

export function parseAcceptedNotification(message) {
  if (
    !message ||
    typeof message !== "object" ||
    message.method !== "eth_subscription"
  ) {
    return null;
  }
  const result = message.params?.result;
  const transactionHash =
    typeof result === "string" ? result : result?.hash;
  if (
    typeof transactionHash !== "string" ||
    !transactionHashPattern.test(transactionHash)
  ) {
    throw new Error(
      "newAcceptedTransactions notification is missing a valid transaction hash",
    );
  }
  return transactionHash.toLowerCase();
}

async function requestJsonRpc(url, method, params = []) {
  assertPublicRpcUrl(url, ["http:", "https:"]);
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`RPC ${method} failed with HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (payload.error) {
    throw new Error(
      `RPC ${method} failed: ${payload.error.message ?? "unknown error"}`,
    );
  }
  return payload.result;
}

export async function probeFujiTransaction(
  transactionHash,
  rpcUrl = AVALANCHE_FUJI_RPC,
) {
  if (
    typeof transactionHash !== "string" ||
    !transactionHashPattern.test(transactionHash)
  ) {
    throw new Error("invalid Avalanche transaction hash");
  }
  const chainId = parseFujiChainId(
    await requestJsonRpc(rpcUrl, "eth_chainId"),
  );
  let receipt = null;
  const receiptDeadline = Date.now() + 15_000;
  while (!receipt && Date.now() < receiptDeadline) {
    receipt = await requestJsonRpc(
      rpcUrl,
      "eth_getTransactionReceipt",
      [transactionHash],
    );
    if (!receipt) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  if (!receipt) {
    throw new Error(
      "accepted transaction receipt was not available within 15 seconds",
    );
  }
  if (
    !blockHashPattern.test(receipt.blockHash ?? "") ||
    !quantityPattern.test(receipt.blockNumber ?? "") ||
    !["0x0", "0x1"].includes(receipt.status)
  ) {
    throw new Error("transaction receipt contains malformed finality fields");
  }

  return {
    schema_version: AVALANCHE_OBSERVATION_VERSION,
    network: "avalanche:fuji-c-chain",
    chain_id: Number(chainId),
    rpc_endpoint: publicEndpointLabel(rpcUrl),
    observed_at: new Date().toISOString(),
    transaction_hash: transactionHash.toLowerCase(),
    block_hash: receipt.blockHash.toLowerCase(),
    block_number: BigInt(receipt.blockNumber).toString(),
    accepted_by_node: true,
    execution_status: receipt.status === "0x1" ? "success" : "reverted",
  };
}

export function assessRpcAgreement(observations) {
  if (!Array.isArray(observations) || observations.length < 1) {
    throw new Error("at least one RPC observation is required");
  }
  const expectedHash = observations[0].transaction_hash;
  const comparable = observations.map((entry) => ({
    transaction_hash: entry.transaction_hash,
    block_hash: entry.block_hash,
    block_number: entry.block_number,
    accepted_by_node: entry.accepted_by_node,
    execution_status: entry.execution_status,
  }));
  const fingerprints = new Set(
    comparable.map((entry) => JSON.stringify(entry)),
  );
  return {
    schema_version: "avalanche-rpc-agreement/0.1",
    network: "avalanche:fuji-c-chain",
    transaction_hash: expectedHash,
    checked_endpoints: observations.length,
    state:
      observations.every((entry) => entry.transaction_hash === expectedHash) &&
      fingerprints.size === 1
        ? "consistent"
        : "degraded",
    observations,
  };
}

export async function observeAcceptedTransactions({
  sampleSize = 1,
  timeoutMs = 30_000,
  wsUrl = AVALANCHE_FUJI_WS,
  rpcUrl = AVALANCHE_FUJI_RPC,
  WebSocketImpl = globalThis.WebSocket,
} = {}) {
  if (!Number.isInteger(sampleSize) || sampleSize < 1 || sampleSize > 20) {
    throw new Error("sampleSize must be an integer between 1 and 20");
  }
  assertPublicRpcUrl(wsUrl, ["ws:", "wss:"]);
  if (typeof WebSocketImpl !== "function") {
    throw new Error("this runtime does not provide a WebSocket implementation");
  }

  return new Promise((resolve, reject) => {
    const socket = new WebSocketImpl(wsUrl);
    const hashes = new Set();
    const observations = [];
    let settled = false;
    let chainVerified = false;
    let subscribed = false;
    let inFlight = 0;
    const timer = setTimeout(
      () => finish(new Error("timed out waiting for accepted Fuji transactions")),
      timeoutMs,
    );

    function finish(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.close();
      } catch {
        // Ignore close errors after the result has been determined.
      }
      if (error) reject(error);
      else resolve(observations);
    }

    socket.addEventListener("open", () => {
      socket.send(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_chainId",
          params: [],
        }),
      );
    });
    socket.addEventListener("error", () => {
      finish(new Error("Avalanche Fuji WebSocket connection failed"));
    });
    socket.addEventListener("message", async (event) => {
      if (settled) return;
      let message;
      try {
        message = JSON.parse(String(event.data));
        if (message.error) {
          throw new Error(message.error.message ?? "WebSocket RPC error");
        }
        if (message.id === 1) {
          parseFujiChainId(message.result);
          chainVerified = true;
          socket.send(
            JSON.stringify({
              jsonrpc: "2.0",
              id: 2,
              method: "eth_subscribe",
              params: ["newAcceptedTransactions", false],
            }),
          );
          return;
        }
        if (message.id === 2) {
          if (!chainVerified || typeof message.result !== "string") {
            throw new Error("Fuji subscription was not established");
          }
          subscribed = true;
          return;
        }
        if (!subscribed) return;
        const transactionHash = parseAcceptedNotification(message);
        if (!transactionHash || hashes.has(transactionHash)) return;
        if (observations.length + inFlight >= sampleSize) return;
        hashes.add(transactionHash);
        inFlight += 1;
        try {
          observations.push(
            await probeFujiTransaction(transactionHash, rpcUrl),
          );
        } finally {
          inFlight -= 1;
        }
        if (observations.length >= sampleSize) finish();
      } catch (error) {
        finish(error);
      }
    });
  });
}

async function main() {
  const [command = "observe", first, second] = process.argv.slice(2);
  if (command === "observe") {
    const sampleSize = first ? Number.parseInt(first, 10) : 1;
    const observations = await observeAcceptedTransactions({
      sampleSize,
      wsUrl: second || process.env.AVALANCHE_FUJI_WS_URL || AVALANCHE_FUJI_WS,
      rpcUrl:
        process.env.AVALANCHE_FUJI_RPC_URL || AVALANCHE_FUJI_RPC,
    });
    process.stdout.write(`${JSON.stringify(observations, null, 2)}\n`);
    return;
  }
  if (command === "rpc-check") {
    const observation = await probeFujiTransaction(
      first,
      second || process.env.AVALANCHE_FUJI_RPC_URL || AVALANCHE_FUJI_RPC,
    );
    process.stdout.write(`${JSON.stringify(observation, null, 2)}\n`);
    return;
  }
  throw new Error(
    "Usage: avalanche-fuji-monitor.mjs observe [sample-size] [ws-url] | rpc-check <transaction-hash> [rpc-url]",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
