import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  decodeHookPermissions,
  evaluateUrcConformance,
  validateHookPermissions
} from "../sdk/typescript/uniswap-v4-urc-conformance.mjs";

const fixtureUrl = new URL("../schemas/examples/uniswap-v4-urc-conformance-input-v0.1.json", import.meta.url);
const fixture = JSON.parse(await readFile(fixtureUrl, "utf8"));

function clone(value) {
  return structuredClone(value);
}

test("decodes the official 0x2400 hook-address example", () => {
  const permissions = decodeHookPermissions("0x0000000000000000000000000000000000002400");
  assert.equal(permissions.beforeInitialize, true);
  assert.equal(permissions.afterAddLiquidity, true);
  assert.equal(Object.values(permissions).filter(Boolean).length, 2);
});

test("rejects return-delta permission without the parent callback", () => {
  const result = validateHookPermissions(
    "0x0000000000000000000000000000000000000008",
    ["beforeSwapReturnDelta"]
  );
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((entry) => entry.code === "ORPHAN_RETURN_DELTA_PERMISSION"));
});

test("accepts a URC-2 partial fill and URC-3 direct stats provider", () => {
  const result = evaluateUrcConformance(fixture);
  assert.equal(result.valid, true);
  assert.equal(result.swaps[0].totalAmount0, "-100");
  assert.equal(result.swaps[0].totalAmount1, "98");
  assert.equal(result.stats.reserveUtilizationBps.token0, 5000);
});

test("rejects duplicate HookSwap events", () => {
  const input = clone(fixture);
  input.swaps[0].hookSwapEvents.push(clone(input.swaps[0].hookSwapEvents[0]));
  const result = evaluateUrcConformance(input);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((entry) => entry.code === "HOOK_SWAP_EVENT_COUNT"));
});

test("rejects an event that claims an end user instead of the callback sender", () => {
  const input = clone(fixture);
  input.swaps[0].hookSwapEvents[0].sender = "0x2222222222222222222222222222222222222222";
  const result = evaluateUrcConformance(input);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((entry) => entry.code === "CALLBACK_SENDER_MISMATCH"));
});

test("distinguishes the legacy int256 HookSwap topic from current URC-2", () => {
  const input = clone(fixture);
  input.swaps[0].hookSwapEvents[0].eventSignature =
    "HookSwap(bytes32,address,int256,int256,uint24)";
  input.swaps[0].hookSwapEvents[0].topic0 =
    "0x6150bb53cd76c5702d6074239fc7b6c2a5495d339eb122fdc06252f3efdbbc1b";
  const result = evaluateUrcConformance(input);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((entry) => entry.code === "HOOK_SWAP_SIGNATURE_MISMATCH"));
});

test("rejects effective liquidity above reserves and unverifiable provider binding", () => {
  const input = clone(fixture);
  input.stats.providerAddress = "0x3333333333333333333333333333333333333333";
  input.stats.associationEvidence = "self-reported";
  input.stats.effectiveLiquidity.token0 = "1000000000000000000001";
  const result = evaluateUrcConformance(input);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((entry) => entry.code === "EFFECTIVE_LIQUIDITY_EXCEEDS_RESERVES"));
  assert.ok(result.issues.some((entry) => entry.code === "UNVERIFIED_STATS_PROVIDER"));
});

test("produces a stable report commitment", () => {
  const first = evaluateUrcConformance(fixture);
  const second = evaluateUrcConformance(clone(fixture));
  assert.match(first.reportHash, /^0x[0-9a-f]{64}$/);
  assert.equal(first.reportHash, second.reportHash);
});

test("rejects unknown fields before they can change report semantics", () => {
  const input = clone(fixture);
  input.userBalance = "1000000000000000000";
  assert.throws(() => evaluateUrcConformance(input), /userBalance is not allowed/);
});
