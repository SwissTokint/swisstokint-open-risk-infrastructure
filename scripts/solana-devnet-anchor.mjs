import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  appendTransactionMessageInstruction,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createTransactionMessage,
  generateKeyPairSigner,
  getBase64EncodedWireTransaction,
  lamports,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  writeKeyPairSigner,
} from "@solana/kit";
import { getAddMemoInstruction } from "@solana-program/memo";
import { canonicalizePayload } from "../sdk/typescript/swisstokint-proof.mjs";

export const SOLANA_COMMITMENT_SCHEMA_VERSION = "pom-solana-commitment/0.1";
export const SOLANA_MEMO_SCHEMA_VERSION = "pom-solana/0.1";
export const SOLANA_MEMO_PROGRAM = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
export const SOLANA_DEVNET_RPC = "https://api.devnet.solana.com";
export const SOLANA_DEVNET_AIRDROP_LAMPORTS = 100_000_000n;
export const SOLANA_MEMO_MAX_BYTES = 566;
export const DEFAULT_SOLANA_DEVNET_KEYPAIR = join(
  homedir(),
  ".config",
  "solana",
  "swisstokint-devnet.json",
);

const commitmentKeys = [
  "schema_version",
  "issuer",
  "batch_ref",
  "merkle_root",
  "manifest_hash",
  "evidence_hash",
];
const memoKeys = ["a", "b", "e", "m", "r", "v"];
const sha256Pattern = /^[a-f0-9]{64}$/;
const batchRefPattern = /^pom-[a-f0-9]{24}$/;
const signaturePattern = /^[1-9A-HJ-NP-Za-km-z]{64,96}$/;
const addressPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function assertPlainRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function assertExactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${label} contains unknown or missing fields`);
  }
}

function assertSha256(value, field) {
  if (typeof value !== "string" || !sha256Pattern.test(value)) {
    throw new Error(`${field} must be a lowercase SHA-256 hex digest`);
  }
}

export function validateSolanaCommitment(input) {
  assertPlainRecord(input, "commitment");
  assertExactKeys(input, commitmentKeys, "commitment");
  if (input.schema_version !== SOLANA_COMMITMENT_SCHEMA_VERSION) {
    throw new Error(`schema_version must equal ${SOLANA_COMMITMENT_SCHEMA_VERSION}`);
  }
  if (typeof input.issuer !== "string" || !addressPattern.test(input.issuer)) {
    throw new Error("issuer must be a base58 Solana address");
  }
  if (typeof input.batch_ref !== "string" || !batchRefPattern.test(input.batch_ref)) {
    throw new Error("batch_ref must match pom- followed by 24 lowercase hex characters");
  }
  assertSha256(input.merkle_root, "merkle_root");
  assertSha256(input.manifest_hash, "manifest_hash");
  assertSha256(input.evidence_hash, "evidence_hash");
  return input;
}

export function buildSolanaMemo(input) {
  const value = validateSolanaCommitment(input);
  const memoRecord = {
    a: value.issuer,
    b: value.batch_ref,
    e: value.evidence_hash,
    m: value.manifest_hash,
    r: value.merkle_root,
    v: SOLANA_MEMO_SCHEMA_VERSION,
  };
  const memo = canonicalizePayload(memoRecord);
  const byteLength = Buffer.byteLength(memo, "utf8");
  if (byteLength > SOLANA_MEMO_MAX_BYTES) {
    throw new Error(`memo exceeds ${SOLANA_MEMO_MAX_BYTES} bytes`);
  }
  return { memo, byte_length: byteLength };
}

export function parseSolanaMemo(memo) {
  if (typeof memo !== "string") {
    throw new Error("memo must be a string");
  }
  if (Buffer.byteLength(memo, "utf8") > SOLANA_MEMO_MAX_BYTES) {
    throw new Error(`memo exceeds ${SOLANA_MEMO_MAX_BYTES} bytes`);
  }
  let parsed;
  try {
    parsed = JSON.parse(memo);
  } catch {
    throw new Error("memo must be valid JSON");
  }
  assertPlainRecord(parsed, "memo");
  assertExactKeys(parsed, memoKeys, "memo");
  if (canonicalizePayload(parsed) !== memo) {
    throw new Error("memo JSON is not canonical");
  }
  const commitment = {
    schema_version: SOLANA_COMMITMENT_SCHEMA_VERSION,
    issuer: parsed.a,
    batch_ref: parsed.b,
    merkle_root: parsed.r,
    manifest_hash: parsed.m,
    evidence_hash: parsed.e,
  };
  if (parsed.v !== SOLANA_MEMO_SCHEMA_VERSION) {
    throw new Error(`memo version must equal ${SOLANA_MEMO_SCHEMA_VERSION}`);
  }
  validateSolanaCommitment(commitment);
  return commitment;
}

async function waitForFinalizedSignature(rpc, signature, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await rpc
      .getSignatureStatuses([signature], { searchTransactionHistory: true })
      .send();
    const status = response.value[0];
    if (status?.err) {
      throw new Error(`Solana transaction failed: ${JSON.stringify(status.err)}`);
    }
    if (status?.confirmationStatus === "finalized") {
      return status;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }
  throw new Error(`Solana transaction was not finalized within ${timeoutMs} ms`);
}

function findMemoInstruction(transaction) {
  const instructions = transaction?.transaction?.message?.instructions;
  if (!Array.isArray(instructions)) {
    throw new Error("transaction does not contain parsed instructions");
  }
  const memos = instructions.filter(
    (instruction) =>
      instruction?.program === "spl-memo" ||
      instruction?.programId === SOLANA_MEMO_PROGRAM,
  );
  if (memos.length !== 1) {
    throw new Error(`expected exactly one Memo instruction, found ${memos.length}`);
  }
  const memo = memos[0].parsed;
  if (typeof memo !== "string") {
    throw new Error("Memo instruction is not parsed as text");
  }
  return memo;
}

function findRequiredSigner(transaction) {
  const accountKeys = transaction?.transaction?.message?.accountKeys;
  if (!Array.isArray(accountKeys)) {
    throw new Error("transaction does not contain parsed account keys");
  }
  const signers = accountKeys
    .filter((account) => account?.signer === true)
    .map((account) =>
      typeof account.pubkey === "string" ? account.pubkey : String(account.pubkey),
    );
  if (signers.length < 1) {
    throw new Error("transaction does not contain a signer");
  }
  return signers[0];
}

export async function fetchAndVerifySolanaAnchor(
  signature,
  expectedInput,
  rpcUrl = SOLANA_DEVNET_RPC,
) {
  if (typeof signature !== "string" || !signaturePattern.test(signature)) {
    throw new Error("invalid Solana transaction signature");
  }
  const expected = buildSolanaMemo(expectedInput);
  const rpc = createSolanaRpc(rpcUrl);
  const transaction = await rpc
    .getTransaction(signature, {
      commitment: "finalized",
      encoding: "jsonParsed",
      maxSupportedTransactionVersion: 0,
    })
    .send();
  if (!transaction) {
    throw new Error("finalized transaction was not found");
  }
  if (transaction.meta?.err) {
    throw new Error(`transaction failed: ${JSON.stringify(transaction.meta.err)}`);
  }
  const memo = findMemoInstruction(transaction);
  const commitment = parseSolanaMemo(memo);
  if (memo !== expected.memo) {
    throw new Error("on-chain memo does not match the expected commitment");
  }
  const signer = findRequiredSigner(transaction);
  if (signer !== commitment.issuer) {
    throw new Error("transaction signer does not match the committed issuer");
  }
  const blockTime = transaction.blockTime;
  if (typeof blockTime !== "bigint") {
    throw new Error("finalized transaction is missing block time");
  }
  const anchoredAt = new Date(Number(blockTime) * 1000).toISOString();
  return {
    commitment,
    anchor_record: {
      schema_version: "pom-anchor-record/0.1",
      adapter_id: "solana/devnet-memo-v0",
      network: "solana:devnet",
      batch_ref: commitment.batch_ref,
      merkle_root: commitment.merkle_root,
      transaction_ref: signature,
      block_ref: `slot:${transaction.slot}`,
      anchored_at: anchoredAt,
      observed_at: new Date().toISOString(),
      status: "finalized",
      confirmations: 1,
    },
    explorer_url: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    issuer: signer,
    memo,
  };
}

export async function publishSolanaDevnetAnchor(
  input,
  keypairPath = DEFAULT_SOLANA_DEVNET_KEYPAIR,
  rpcUrl = SOLANA_DEVNET_RPC,
) {
  const { memo, byte_length: byteLength } = buildSolanaMemo(input);
  const rpc = createSolanaRpc(rpcUrl);
  const payer = await loadSolanaKeypair(keypairPath);
  if (input.issuer !== payer.address) {
    throw new Error(
      `commitment issuer ${input.issuer} does not match devnet payer ${payer.address}`,
    );
  }
  const { value: balance } = await rpc.getBalance(payer.address).send();
  let airdropSignature = null;
  if (balance < 100_000n) {
    try {
      airdropSignature = await rpc
        .requestAirdrop(
          payer.address,
          lamports(SOLANA_DEVNET_AIRDROP_LAMPORTS),
        )
        .send();
      await waitForFinalizedSignature(rpc, airdropSignature);
    } catch {
      throw new Error(
        `Devnet payer ${payer.address} needs test SOL. Fund it at https://faucet.solana.com and retry; no real SOL is required.`,
      );
    }
  }

  const { value: latestBlockhash } = await rpc
    .getLatestBlockhash({ commitment: "finalized" })
    .send();
  const memoInstruction = getAddMemoInstruction({ memo });
  const transactionMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (message) => setTransactionMessageFeePayerSigner(payer, message),
    (message) =>
      setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message),
    (message) => appendTransactionMessageInstruction(memoInstruction, message),
  );
  const transaction = await signTransactionMessageWithSigners(transactionMessage);
  const signature = await rpc
    .sendTransaction(getBase64EncodedWireTransaction(transaction), {
      encoding: "base64",
      preflightCommitment: "confirmed",
      skipPreflight: false,
    })
    .send();
  await waitForFinalizedSignature(rpc, signature);

  const verification = await fetchAndVerifySolanaAnchor(signature, input, rpcUrl);
  return {
    ...verification,
    payer: payer.address,
    airdrop_signature: airdropSignature,
    memo_byte_length: byteLength,
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function loadSolanaKeypair(path) {
  let bytes;
  try {
    bytes = JSON.parse(await readFile(path, "utf8"));
  } catch {
    throw new Error(
      `Solana devnet keypair not found at ${path}. Run the keygen command first.`,
    );
  }
  if (
    !Array.isArray(bytes) ||
    bytes.length !== 64 ||
    bytes.some((value) => !Number.isInteger(value) || value < 0 || value > 255)
  ) {
    throw new Error("Solana keypair file must contain exactly 64 byte values");
  }
  return createKeyPairSignerFromBytes(new Uint8Array(bytes));
}

export async function createSolanaDevnetKeypair(
  path = DEFAULT_SOLANA_DEVNET_KEYPAIR,
) {
  try {
    await readFile(path);
    throw new Error(`refusing to overwrite existing Solana keypair at ${path}`);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
  const signer = await generateKeyPairSigner(true);
  await writeKeyPairSigner(signer, path);
  return { address: signer.address, path };
}

async function main() {
  const [command = "dry-run", first, second] = process.argv.slice(2);
  if (command === "keygen") {
    const result = await createSolanaDevnetKeypair(
      first || DEFAULT_SOLANA_DEVNET_KEYPAIR,
    );
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  if (command === "dry-run") {
    const input = await readJson(first);
    process.stdout.write(`${JSON.stringify(buildSolanaMemo(input), null, 2)}\n`);
    return;
  }
  if (command === "publish") {
    const input = await readJson(first);
    const result = await publishSolanaDevnetAnchor(
      input,
      second || DEFAULT_SOLANA_DEVNET_KEYPAIR,
      process.argv[5] || SOLANA_DEVNET_RPC,
    );
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  if (command === "verify") {
    const input = await readJson(second);
    const result = await fetchAndVerifySolanaAnchor(
      first,
      input,
      process.argv[5] || SOLANA_DEVNET_RPC,
    );
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  throw new Error(
    "Usage: solana-devnet-anchor.mjs keygen [keypair.json] | dry-run <input.json> | publish <input.json> [keypair.json] [rpc] | verify <signature> <input.json> [rpc]",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
