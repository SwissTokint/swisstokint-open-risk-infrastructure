import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import solc from "solc";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const AVALANCHE_CONTRACT_PATH = join(
  ROOT,
  "contracts",
  "avalanche",
  "ProofAvailabilityRegistry.sol",
);
export const AVALANCHE_ARTIFACT_PATH = join(
  ROOT,
  "dist",
  "avalanche",
  "ProofAvailabilityRegistry.json",
);

export async function compileAvalancheRegistry(sourcePath = AVALANCHE_CONTRACT_PATH) {
  const source = await readFile(sourcePath, "utf8");
  const input = {
    language: "Solidity",
    sources: {
      "ProofAvailabilityRegistry.sol": { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "paris",
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"],
        },
      },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (output.errors ?? []).filter(
    (entry) => entry.severity === "error",
  );
  if (errors.length > 0) {
    throw new Error(
      `Solidity compilation failed:\n${errors
        .map((entry) => entry.formattedMessage)
        .join("\n")}`,
    );
  }
  const compiled =
    output.contracts?.["ProofAvailabilityRegistry.sol"]
      ?.ProofAvailabilityRegistry;
  if (!compiled?.evm?.bytecode?.object) {
    throw new Error("Solidity compiler did not return registry bytecode");
  }
  return {
    contract_name: "ProofAvailabilityRegistry",
    compiler_version: solc.version(),
    evm_version: "paris",
    abi: compiled.abi,
    bytecode: `0x${compiled.evm.bytecode.object}`,
    deployed_bytecode: `0x${compiled.evm.deployedBytecode.object}`,
  };
}

async function main() {
  const artifact = await compileAvalancheRegistry();
  await mkdir(dirname(AVALANCHE_ARTIFACT_PATH), { recursive: true });
  await writeFile(
    AVALANCHE_ARTIFACT_PATH,
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );
  process.stdout.write(
    `${JSON.stringify(
      {
        artifact: AVALANCHE_ARTIFACT_PATH,
        compiler_version: artifact.compiler_version,
        evm_version: artifact.evm_version,
        deployed_bytecode_bytes:
          (artifact.deployed_bytecode.length - 2) / 2,
      },
      null,
      2,
    )}\n`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
