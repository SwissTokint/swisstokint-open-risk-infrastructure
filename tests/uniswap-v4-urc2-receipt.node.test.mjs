import assert from "node:assert/strict";
import test from "node:test";
import {
  V4_CORE_SWAP_TOPIC0,
  analyzeUrc2Receipt
} from "../sdk/typescript/uniswap-v4-urc2-receipt.mjs";
import {
  LEGACY_HOOK_SWAP_INT256_TOPIC0,
  URC2_HOOK_SWAP_TOPIC0
} from "../sdk/typescript/uniswap-v4-urc-conformance.mjs";

const transactionHash = "0x20512fd600c929294806d98895bc6ef24d7e343eadfc7ab69ed3bebd5d6a12b9";
const blockHash = "0xcd3cfa778beb4a0dcdec6037a050d1575a8cd2b7f330abe5d3a2349c3cdecb18";
const poolId = "0x563a406490261c3f4d9152e5320f28590d7011d7b084d2e58513e9fc0464391b";
const senderTopic = "0x0000000000000000000000004c82d1fbfe28c977cbb58d8c7ff8fcf9f70a2cca";
const hookData =
  "0x000000000000000000000000000000000000000000000000000000000477bdf6" +
  "fffffffffffffffffffffffffffffffffffffffffffffffbefc5cefe1afd2323" +
  "0000000000000000000000000000000000000000000000000000000000000000";
const coreData =
  "0x0000000000000000000000000000000000000000000000000000000000000000" +
  "0000000000000000000000000000000000000000000000000000000000000000" +
  "0000000000000000000000000000000000000000000f42400000000000000000" +
  "0000000000000000000000000000000000000000000000000000000000000000" +
  "0000000000000000000000000000000000000000000000000000000000043764" +
  "0000000000000000000000000000000000000000000000000000000000000000";

function receipt(topic0 = URC2_HOOK_SWAP_TOPIC0, includeCore = true) {
  const logs = [
    {
      address: "0x958a0904940f744f8c6b72c043ceee3ea34ae888",
      topics: [topic0, poolId, senderTopic],
      data: hookData,
      logIndex: "0x6f"
    }
  ];
  if (includeCore) {
    logs.push({
      address: "0x000000000004444c5dc75cb358380d2e3de08a90",
      topics: [V4_CORE_SWAP_TOPIC0, poolId, senderTopic],
      data: coreData,
      logIndex: "0x70"
    });
  }
  return {
    transactionHash,
    blockHash,
    blockNumber: "0x18619c8",
    status: "0x1",
    logs
  };
}

test("normalizes a current URC-2 event and matching zero-delta core leg", () => {
  const result = analyzeUrc2Receipt({ chainId: "0x1", receipt: receipt() });
  assert.equal(result.validCurrentUrc2Evidence, true);
  assert.equal(result.currentUrc2EventCount, 1);
  assert.equal(result.observations[0].hookDelta.amount0, "74956278");
  assert.equal(result.observations[0].hookDelta.amount1, "-74956277232301169885");
  assert.deepEqual(result.observations[0].coreDelta, { amount0: "0", amount1: "0" });
});

test("classifies the observed mainnet int256 topic as legacy, not current URC-2", () => {
  const result = analyzeUrc2Receipt({
    chainId: "0x1",
    receipt: receipt(LEGACY_HOOK_SWAP_INT256_TOPIC0)
  });
  assert.equal(result.validCurrentUrc2Evidence, false);
  assert.equal(result.legacyInt256EventCount, 1);
  assert.ok(result.observations[0].issues.some((entry) => entry.code === "LEGACY_INT256_HOOK_SWAP"));
});

test("fails closed when the matching core Swap leg is absent", () => {
  const result = analyzeUrc2Receipt({ chainId: "0x1", receipt: receipt(URC2_HOOK_SWAP_TOPIC0, false) });
  assert.equal(result.validCurrentUrc2Evidence, false);
  assert.ok(result.observations[0].issues.some((entry) => entry.code === "CORE_SWAP_NOT_FOUND"));
});
