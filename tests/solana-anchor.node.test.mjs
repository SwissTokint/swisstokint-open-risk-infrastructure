import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildSolanaMemo,
  parseSolanaMemo,
  validateSolanaCommitment,
} from "../scripts/solana-devnet-anchor.mjs";

const fixture = {
  schema_version: "pom-solana-commitment/0.1",
  issuer: "4aAc8nXZcAMqn1Z4KyPFjdrYHcCrDbicNyh81boYzrYV",
  batch_ref: "pom-fb2d5a7c2139fa0bfbbf977f",
  merkle_root:
    "fb2d5a7c2139fa0bfbbf977f2b11e0286805bd10625bf4d59bfed1e6b065d454",
  manifest_hash:
    "b216fe65723bfac075faf1a0d876125306bdf4bc35a6836a78bbca99f5fdd4b4",
  evidence_hash:
    "be9294af27690a0e5fcda7fc2221d26b3aa9c7161c90529fe3559e9ab41e0fc2",
};

test("Solana memo commitment is deterministic and round-trips", () => {
  const result = buildSolanaMemo(fixture);
  assert.equal(result.byte_length, 321);
  assert.equal(
    result.memo,
    '{"a":"4aAc8nXZcAMqn1Z4KyPFjdrYHcCrDbicNyh81boYzrYV","b":"pom-fb2d5a7c2139fa0bfbbf977f","e":"be9294af27690a0e5fcda7fc2221d26b3aa9c7161c90529fe3559e9ab41e0fc2","m":"b216fe65723bfac075faf1a0d876125306bdf4bc35a6836a78bbca99f5fdd4b4","r":"fb2d5a7c2139fa0bfbbf977f2b11e0286805bd10625bf4d59bfed1e6b065d454","v":"pom-solana/0.1"}',
  );
  assert.deepEqual(parseSolanaMemo(result.memo), fixture);
});

test("Solana commitment rejects unknown fields and malformed hashes", () => {
  assert.throws(
    () => validateSolanaCommitment({ ...fixture, token_symbol: "SWTK" }),
    /unknown or missing fields/,
  );
  assert.throws(
    () => validateSolanaCommitment({ ...fixture, merkle_root: "ABC" }),
    /lowercase SHA-256/,
  );
});

test("Solana parser rejects non-canonical and version-confused memos", () => {
  const { memo } = buildSolanaMemo(fixture);
  const parsed = JSON.parse(memo);
  assert.throws(
    () => parseSolanaMemo(JSON.stringify({ v: parsed.v, ...parsed })),
    /not canonical/,
  );
  assert.throws(
    () =>
      parseSolanaMemo(
        JSON.stringify({
          ...parsed,
          v: "pom-solana/9.9",
        }),
      ),
    /memo version/,
  );
});
