import assert from "node:assert/strict";
import test from "node:test";
import {
  assessRpcAgreement,
  parseAcceptedNotification,
  parseFujiChainId,
} from "../scripts/avalanche-fuji-monitor.mjs";
import { compileAvalancheRegistry } from "../scripts/compile-avalanche-registry.mjs";

const transactionHash = `0x${"ab".repeat(32)}`;
const blockHash = `0x${"cd".repeat(32)}`;

test("accepts only the Avalanche Fuji C-Chain identifier", () => {
  assert.equal(parseFujiChainId("0xa869"), 43113n);
  assert.throws(() => parseFujiChainId("0xa86a"), /refusing non-Fuji/);
  assert.throws(() => parseFujiChainId("43113"), /canonical hexadecimal/);
});

test("parses Avalanche-specific accepted transaction notifications", () => {
  assert.equal(
    parseAcceptedNotification({
      method: "eth_subscription",
      params: { result: transactionHash },
    }),
    transactionHash,
  );
  assert.equal(
    parseAcceptedNotification({
      method: "eth_subscription",
      params: { result: { hash: `0x${"AB".repeat(32)}` } },
    }),
    transactionHash,
  );
  assert.equal(parseAcceptedNotification({ id: 2, result: "sub-id" }), null);
  assert.throws(
    () =>
      parseAcceptedNotification({
        method: "eth_subscription",
        params: { result: "0x1234" },
      }),
    /valid transaction hash/,
  );
});

test("reports RPC divergence instead of hiding it", () => {
  const observation = {
    schema_version: "avalanche-accepted-observation/0.1",
    network: "avalanche:fuji-c-chain",
    chain_id: 43113,
    rpc_endpoint: "https://one.example/rpc",
    observed_at: "2026-07-28T00:00:00.000Z",
    transaction_hash: transactionHash,
    block_hash: blockHash,
    block_number: "123",
    accepted_by_node: true,
    execution_status: "success",
  };
  assert.equal(
    assessRpcAgreement([
      observation,
      { ...observation, rpc_endpoint: "https://two.example/rpc" },
    ]).state,
    "consistent",
  );
  assert.equal(
    assessRpcAgreement([
      observation,
      {
        ...observation,
        rpc_endpoint: "https://two.example/rpc",
        block_hash: `0x${"ef".repeat(32)}`,
      },
    ]).state,
    "degraded",
  );
});

test("compiles the non-custodial Avalanche registry reproducibly", async () => {
  const artifact = await compileAvalancheRegistry();
  assert.equal(artifact.contract_name, "ProofAvailabilityRegistry");
  assert.equal(artifact.evm_version, "paris");
  assert.ok(artifact.bytecode.length > 100);
  assert.ok((artifact.deployed_bytecode.length - 2) / 2 < 24_576);
  const functions = artifact.abi
    .filter((entry) => entry.type === "function")
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(functions, [
    "commitments",
    "register",
    "revoke",
    "verify",
  ]);
});
