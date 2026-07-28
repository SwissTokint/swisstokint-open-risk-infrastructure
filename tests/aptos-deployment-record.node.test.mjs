import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const record = JSON.parse(
  await readFile(
    new URL(
      "../deployments/aptos-testnet-proof-registry-v0.1.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

const sha256 = (value) =>
  `0x${createHash("sha256").update(value, "utf8").digest("hex")}`;

test("Aptos testnet deployment record is bounded and internally consistent", () => {
  assert.equal(record.schema_version, "swisstokint.aptos-deployment.v0.1");
  assert.equal(record.status, "testnet_verified");
  assert.equal(record.network, "aptos-testnet");
  assert.equal(record.chain_id, 2);
  assert.equal(
    record.module_id,
    `${record.account_address}::proof_registry`,
  );
  assert.equal(record.source.on_chain_source_verified, true);
  assert.match(record.source.commit, /^[0-9a-f]{40}$/u);
  assert.match(record.deployment.transaction_hash, /^0x[0-9a-f]{64}$/u);
  assert.equal(record.deployment.package_size_bytes, 3358);
  assert.equal(record.lifecycle.initialize.success, true);
  assert.equal(record.lifecycle.register.success, true);
  assert.equal(record.lifecycle.verify_after_register, true);
  assert.equal(record.lifecycle.revoke.success, true);
  assert.equal(record.lifecycle.verify_after_revoke, false);
  assert.ok(
    record.deployment.explorer_url.endsWith("?network=testnet"),
  );

  assert.equal(
    record.fixture.batch_id,
    sha256("swisstokint-aptos-testnet-batch-v0.1"),
  );
  assert.equal(
    record.fixture.merkle_root,
    sha256("swisstokint-aptos-testnet-merkle-root-v0.1"),
  );
  assert.equal(
    record.fixture.manifest_hash,
    sha256("swisstokint-aptos-testnet-manifest-v0.1"),
  );
  assert.equal(
    record.fixture.evidence_hash,
    sha256("swisstokint-aptos-testnet-evidence-v0.1"),
  );

  const serialized = JSON.stringify(record).toLowerCase();
  for (const forbidden of [
    "private_key",
    "private-key",
    "mnemonic",
    "seed_phrase",
    "secret",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});
