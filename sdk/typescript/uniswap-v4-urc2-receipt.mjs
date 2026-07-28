import { createHash } from "node:crypto";
import {
  LEGACY_HOOK_SWAP_INT256_TOPIC0,
  URC2_HOOK_SWAP_TOPIC0,
  decodeHookPermissions
} from "./uniswap-v4-urc-conformance.mjs";

export const V4_CORE_SWAP_TOPIC0 = "0x40e9cecb9f5f1f1c5b9c97dec2917b7ee92e57ba5563708daca94dd84ad7112f";

const HASH = /^0x[0-9a-fA-F]{64}$/;
const ADDRESS_TOPIC = /^0x[0-9a-fA-F]{64}$/;
const HEX_DATA = /^0x(?:[0-9a-fA-F]{64})+$/;
const INT128_MIN = -(1n << 127n);
const INT128_MAX = (1n << 127n) - 1n;
const TWO_256 = 1n << 256n;

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashObject(value) {
  return `0x${createHash("sha256").update(stableJson(value)).digest("hex")}`;
}

function logIndex(log) {
  if (typeof log.logIndex !== "string" || !/^0x[0-9a-fA-F]+$/.test(log.logIndex)) {
    throw new TypeError("logIndex must be hexadecimal");
  }
  return Number(BigInt(log.logIndex));
}

function words(data) {
  if (typeof data !== "string" || !HEX_DATA.test(data)) {
    throw new TypeError("event data must contain complete ABI words");
  }
  return data.slice(2).match(/.{64}/g);
}

function signedWord(word) {
  const value = BigInt(`0x${word}`);
  return value >= (1n << 255n) ? value - TWO_256 : value;
}

function addressFromTopic(topic) {
  if (typeof topic !== "string" || !ADDRESS_TOPIC.test(topic)) {
    throw new TypeError("sender topic must be a complete ABI word");
  }
  return `0x${topic.slice(-40)}`.toLowerCase();
}

function normalizeLog(log) {
  if (log === null || typeof log !== "object" || Array.isArray(log)) {
    throw new TypeError("receipt log must be an object");
  }
  if (!Array.isArray(log.topics) || log.topics.length < 3) {
    throw new TypeError("selected swap log must have three indexed topics");
  }
  if (!HASH.test(log.topics[0]) || !HASH.test(log.topics[1])) {
    throw new TypeError("event and pool topics must be bytes32");
  }
  if (typeof log.address !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(log.address)) {
    throw new TypeError("emitter must be an EVM address");
  }
  return {
    address: log.address.toLowerCase(),
    topics: log.topics.map((topic) => topic.toLowerCase()),
    data: log.data.toLowerCase(),
    logIndex: log.logIndex.toLowerCase()
  };
}

function decodeHookSwap(log) {
  const normalized = normalizeLog(log);
  const eventWords = words(normalized.data);
  if (eventWords.length !== 3) throw new TypeError("HookSwap must contain three data words");
  const amount0 = signedWord(eventWords[0]);
  const amount1 = signedWord(eventWords[1]);
  const swapFee = BigInt(`0x${eventWords[2]}`);
  if (swapFee > (1n << 24n) - 1n) throw new RangeError("HookSwap fee does not fit uint24");
  return {
    log: normalized,
    poolId: normalized.topics[1],
    sender: addressFromTopic(normalized.topics[2]),
    amount0,
    amount1,
    swapFee
  };
}

function decodeCoreSwap(log) {
  const normalized = normalizeLog(log);
  const eventWords = words(normalized.data);
  if (eventWords.length !== 6) throw new TypeError("core Swap must contain six data words");
  return {
    log: normalized,
    poolId: normalized.topics[1],
    sender: addressFromTopic(normalized.topics[2]),
    amount0: signedWord(eventWords[0]),
    amount1: signedWord(eventWords[1])
  };
}

export function analyzeUrc2Receipt({ chainId, receipt }) {
  if (typeof chainId !== "string" || !/^0x[0-9a-fA-F]+$/.test(chainId)) {
    throw new TypeError("chainId must be hexadecimal");
  }
  if (receipt === null || typeof receipt !== "object" || Array.isArray(receipt)) {
    throw new TypeError("receipt must be an object");
  }
  if (!HASH.test(receipt.transactionHash) || !HASH.test(receipt.blockHash)) {
    throw new TypeError("receipt transactionHash and blockHash must be bytes32");
  }
  if (!Array.isArray(receipt.logs)) throw new TypeError("receipt.logs must be an array");

  const relevantTopics = new Set([URC2_HOOK_SWAP_TOPIC0, LEGACY_HOOK_SWAP_INT256_TOPIC0]);
  const hookLogs = receipt.logs.filter((log) => relevantTopics.has(log.topics?.[0]?.toLowerCase()));
  const coreLogs = receipt.logs
    .filter((log) => log.topics?.[0]?.toLowerCase() === V4_CORE_SWAP_TOPIC0)
    .map(decodeCoreSwap);
  const issues = [];

  if (receipt.status !== "0x1") {
    issues.push({ code: "UNSUCCESSFUL_RECEIPT", message: "Only successful receipts can evidence an observed swap" });
  }
  if (hookLogs.length === 0) {
    issues.push({ code: "NO_HOOK_SWAP", message: "No current or legacy HookSwap topic was observed" });
  }

  const observations = hookLogs.map((rawHookLog) => {
    const hookEvent = decodeHookSwap(rawHookLog);
    const eventIndex = logIndex(hookEvent.log);
    const matchingCore = coreLogs
      .filter((core) => core.poolId === hookEvent.poolId && core.sender === hookEvent.sender)
      .sort((left, right) => {
        const leftDistance = Math.abs(logIndex(left.log) - eventIndex);
        const rightDistance = Math.abs(logIndex(right.log) - eventIndex);
        return leftDistance - rightDistance;
      });
    const observationIssues = [];
    if (matchingCore.length === 0) {
      observationIssues.push({
        code: "CORE_SWAP_NOT_FOUND",
        message: "No core Swap with the same pool ID and callback sender was found in the receipt"
      });
    }
    if (matchingCore.length > 1) {
      observationIssues.push({
        code: "AMBIGUOUS_CORE_SWAP",
        message: "Multiple core Swap logs match the hook event"
      });
    }
    const core = matchingCore.length === 1 ? matchingCore[0] : null;
    const currentTopic = hookEvent.log.topics[0] === URC2_HOOK_SWAP_TOPIC0;
    if (!currentTopic) {
      observationIssues.push({
        code: "LEGACY_INT256_HOOK_SWAP",
        message: "The event uses int256 amounts and is not the current URC-2 int128 signature"
      });
    }
    if (
      currentTopic &&
      (hookEvent.amount0 < INT128_MIN ||
        hookEvent.amount0 > INT128_MAX ||
        hookEvent.amount1 < INT128_MIN ||
        hookEvent.amount1 > INT128_MAX)
    ) {
      observationIssues.push({
        code: "HOOK_SWAP_INT128_RANGE",
        message: "A current URC-2 event amount falls outside int128"
      });
    }

    const normalized = {
      hookAddress: hookEvent.log.address,
      hookLogIndex: hookEvent.log.logIndex,
      coreLogIndex: core?.log.logIndex ?? null,
      poolId: hookEvent.poolId,
      callbackSender: hookEvent.sender,
      signatureProfile: currentTopic ? "urc2-current-int128" : "legacy-int256",
      hookDelta: {
        amount0: hookEvent.amount0.toString(),
        amount1: hookEvent.amount1.toString()
      },
      coreDelta: core
        ? { amount0: core.amount0.toString(), amount1: core.amount1.toString() }
        : null,
      totalDelta: core
        ? {
            amount0: (hookEvent.amount0 + core.amount0).toString(),
            amount1: (hookEvent.amount1 + core.amount1).toString()
          }
        : null,
      swapFee: hookEvent.swapFee.toString(),
      permissions: decodeHookPermissions(hookEvent.log.address),
      issues: observationIssues
    };
    return {
      ...normalized,
      evidenceHash: hashObject({ hookLog: hookEvent.log, coreLog: core?.log ?? null })
    };
  });

  const reportCore = {
    schema: "swisstokint-uniswap-v4-urc2-receipt-report-v0.1",
    chainId: BigInt(chainId).toString(),
    transactionHash: receipt.transactionHash.toLowerCase(),
    blockNumber: BigInt(receipt.blockNumber).toString(),
    blockHash: receipt.blockHash.toLowerCase(),
    receiptStatus: receipt.status,
    receiptLogCount: receipt.logs.length,
    currentUrc2EventCount: observations.filter(
      (observation) => observation.signatureProfile === "urc2-current-int128"
    ).length,
    legacyInt256EventCount: observations.filter(
      (observation) => observation.signatureProfile === "legacy-int256"
    ).length,
    observations,
    issues
  };
  return {
    ...reportCore,
    validCurrentUrc2Evidence:
      issues.length === 0 &&
      observations.length > 0 &&
      observations.every((observation) => observation.issues.length === 0),
    reportHash: hashObject(reportCore)
  };
}

export async function fetchAndAnalyzeUrc2Receipt(rpcUrl, transactionHash) {
  if (typeof rpcUrl !== "string" || !/^https:\/\//.test(rpcUrl)) {
    throw new TypeError("UNISWAP_RPC_URL must be an HTTPS endpoint");
  }
  if (typeof transactionHash !== "string" || !HASH.test(transactionHash)) {
    throw new TypeError("transaction hash must be bytes32");
  }
  let requestId = 0;
  const rpc = async (method, params) => {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++requestId, method, params }),
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
    const payload = await response.json();
    if (payload.error) throw new Error(`RPC ${method}: ${payload.error.message}`);
    return payload.result;
  };
  const [chainId, receipt] = await Promise.all([
    rpc("eth_chainId", []),
    rpc("eth_getTransactionReceipt", [transactionHash])
  ]);
  if (!receipt) throw new Error("transaction receipt not found");
  return analyzeUrc2Receipt({ chainId, receipt });
}
